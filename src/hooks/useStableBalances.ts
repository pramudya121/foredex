import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { TokenInfo } from '@/config/contracts';
import { ERC20_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';

interface BalanceCache {
  [key: string]: {
    balance: string;
    timestamp: number;
  };
}

// Global balance cache shared across all hook instances
const globalBalanceCache: BalanceCache = {};
const BALANCE_CACHE_TTL = 30000; // 30 seconds
const pendingRequests = new Map<string, Promise<string>>();

export function useStableBalances(address: string | null) {
  const [balances, setBalances] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const isNativeToken = (token: TokenInfo | null) =>
    token?.address === '0x0000000000000000000000000000000000000000';

  const getCacheKey = (walletAddress: string, tokenAddress: string) =>
    `${walletAddress.toLowerCase()}-${tokenAddress.toLowerCase()}`;

  const fetchSingleBalance = useCallback(async (
    tokenAddress: string,
    decimals: number,
    walletAddress: string
  ): Promise<string> => {
    const cacheKey = getCacheKey(walletAddress, tokenAddress);
    
    // Check cache first
    const cached = globalBalanceCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL) {
      return cached.balance;
    }

    // Check if already fetching
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey)!;
    }

    const provider = rpcProvider.getProvider();
    if (!provider || !rpcProvider.isAvailable()) {
      return cached?.balance || '0';
    }

    const fetchPromise = (async () => {
      try {
        let balance: string;
        
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
          // Native token
          const result = await rpcProvider.call(
            () => provider.getBalance(walletAddress),
            `balance_native_${walletAddress}`
          );
          balance = result ? ethers.formatEther(result) : '0';
        } else {
          // ERC20 token
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const result = await rpcProvider.call(
            () => contract.balanceOf(walletAddress),
            `balance_${tokenAddress}_${walletAddress}`
          );
          balance = result ? ethers.formatUnits(result, decimals) : '0';
        }

        // Update cache
        globalBalanceCache[cacheKey] = {
          balance,
          timestamp: Date.now(),
        };

        return balance;
      } catch {
        return cached?.balance || '0';
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }, []);

  const getBalance = useCallback(async (token: TokenInfo | null): Promise<string> => {
    if (!address || !token) return '0';
    
    const tokenAddress = isNativeToken(token) 
      ? '0x0000000000000000000000000000000000000000' 
      : token.address;
    
    return fetchSingleBalance(tokenAddress, token.decimals, address);
  }, [address, fetchSingleBalance]);

  const getBalanceSync = useCallback((token: TokenInfo | null): string => {
    if (!address || !token) return '0';
    
    const tokenAddress = isNativeToken(token)
      ? '0x0000000000000000000000000000000000000000'
      : token.address;
    
    const cacheKey = getCacheKey(address, tokenAddress);
    const cached = globalBalanceCache[cacheKey];
    
    return cached?.balance || '0';
  }, [address]);

  const fetchBalancesForTokens = useCallback(async (tokens: (TokenInfo | null)[]) => {
    if (!address || fetchingRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);
    
    const newBalances = new Map<string, string>();
    
    try {
      // Fetch balances sequentially with delay to avoid rate limiting
      for (const token of tokens) {
        if (!token || !mountedRef.current) continue;
        
        const balance = await getBalance(token);
        const key = token.address.toLowerCase();
        newBalances.set(key, balance);
        
        // Small delay between requests
        await new Promise(r => setTimeout(r, 100));
      }
      
      if (mountedRef.current) {
        setBalances(newBalances);
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [address, getBalance]);

  const refreshBalance = useCallback(async (token: TokenInfo | null) => {
    if (!address || !token) return;
    
    const tokenAddress = isNativeToken(token)
      ? '0x0000000000000000000000000000000000000000'
      : token.address;
    
    // Clear cache for this token
    const cacheKey = getCacheKey(address, tokenAddress);
    delete globalBalanceCache[cacheKey];
    
    // Fetch fresh
    const balance = await fetchSingleBalance(tokenAddress, token.decimals, address);
    
    if (mountedRef.current) {
      setBalances(prev => {
        const next = new Map(prev);
        next.set(tokenAddress.toLowerCase(), balance);
        return next;
      });
    }
  }, [address, fetchSingleBalance]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    balances,
    loading,
    getBalance,
    getBalanceSync,
    fetchBalancesForTokens,
    refreshBalance,
  };
}

// Simplified hook for SwapCard/LiquidityPanel that auto-fetches for specific tokens
export function useTokenPairBalances(
  address: string | null,
  tokenA: TokenInfo | null,
  tokenB: TokenInfo | null
) {
  const [balanceA, setBalanceA] = useState('0');
  const [balanceB, setBalanceB] = useState('0');
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const lastFetchRef = useRef<string>('');

  const fetchBalances = useCallback(async () => {
    if (!address) {
      setBalanceA('0');
      setBalanceB('0');
      return;
    }

    // Create a key for this fetch to detect stale updates
    const fetchKey = `${address}-${tokenA?.address}-${tokenB?.address}`;
    if (fetchKey === lastFetchRef.current) return;
    lastFetchRef.current = fetchKey;

    setLoading(true);
    const provider = rpcProvider.getProvider();
    
    if (!provider || !rpcProvider.isAvailable()) {
      setLoading(false);
      return;
    }

    try {
      // Fetch token A balance
      if (tokenA) {
        const isNative = tokenA.address === '0x0000000000000000000000000000000000000000';
        const cacheKey = `balance_${isNative ? 'native' : tokenA.address}_${address}`;
        
        let balA: string = '0';
        if (isNative) {
          const result = await rpcProvider.call(
            () => provider.getBalance(address),
            cacheKey
          );
          balA = result ? ethers.formatEther(result) : '0';
        } else {
          const contract = new ethers.Contract(tokenA.address, ERC20_ABI, provider);
          const result = await rpcProvider.call(
            () => contract.balanceOf(address),
            cacheKey
          );
          balA = result ? ethers.formatUnits(result, tokenA.decimals) : '0';
        }
        
        if (mountedRef.current && lastFetchRef.current === fetchKey) {
          setBalanceA(balA);
        }
      }

      // Small delay between requests
      await new Promise(r => setTimeout(r, 200));

      // Fetch token B balance
      if (tokenB) {
        const isNative = tokenB.address === '0x0000000000000000000000000000000000000000';
        const cacheKey = `balance_${isNative ? 'native' : tokenB.address}_${address}`;
        
        let balB: string = '0';
        if (isNative) {
          const result = await rpcProvider.call(
            () => provider.getBalance(address),
            cacheKey
          );
          balB = result ? ethers.formatEther(result) : '0';
        } else {
          const contract = new ethers.Contract(tokenB.address, ERC20_ABI, provider);
          const result = await rpcProvider.call(
            () => contract.balanceOf(address),
            cacheKey
          );
          balB = result ? ethers.formatUnits(result, tokenB.decimals) : '0';
        }
        
        if (mountedRef.current && lastFetchRef.current === fetchKey) {
          setBalanceB(balB);
        }
      }
    } catch (error) {
      // Silent fail - keep existing balances
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [address, tokenA, tokenB]);

  useEffect(() => {
    mountedRef.current = true;
    fetchBalances();
    
    // Refresh every 45 seconds
    const interval = setInterval(fetchBalances, 45000);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchBalances]);

  return {
    balanceA,
    balanceB,
    loading,
    refetch: fetchBalances,
  };
}
