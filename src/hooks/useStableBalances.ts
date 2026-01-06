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
const BALANCE_CACHE_TTL = 60000; // 60 seconds (increased)
const pendingRequests = new Map<string, Promise<string>>();

export function useStableBalances(address: string | null) {
  const [balances, setBalances] = useState<Map<string, string>>(() => {
    // Initialize from cache
    const initial = new Map<string, string>();
    if (address) {
      Object.entries(globalBalanceCache).forEach(([key, value]) => {
        if (key.startsWith(address.toLowerCase())) {
          const tokenAddr = key.split('-')[1];
          initial.set(tokenAddr, value.balance);
        }
      });
    }
    return initial;
  });
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
    
    // Check cache first - return immediately if valid
    const cached = globalBalanceCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL) {
      return cached.balance;
    }

    // Check if already fetching
    if (pendingRequests.has(cacheKey)) {
      try {
        return await pendingRequests.get(cacheKey)!;
      } catch {
        return cached?.balance || '0';
      }
    }

    const provider = rpcProvider.getProvider();
    if (!provider) {
      return cached?.balance || '0';
    }

    const fetchPromise = (async () => {
      try {
        let balance: string;
        
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
          const result = await rpcProvider.call(
            () => provider.getBalance(walletAddress),
            `balance_native_${walletAddress}`,
            { retries: 2, timeout: 10000 }
          );
          balance = result ? ethers.formatEther(result) : (cached?.balance || '0');
        } else {
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const result = await rpcProvider.call(
            () => contract.balanceOf(walletAddress),
            `balance_${tokenAddress}_${walletAddress}`,
            { retries: 2, timeout: 10000 }
          );
          balance = result ? ethers.formatUnits(result, decimals) : (cached?.balance || '0');
        }

        // Only update cache if we got a real value
        if (balance !== '0' || !cached) {
          globalBalanceCache[cacheKey] = {
            balance,
            timestamp: Date.now(),
          };
        }

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
  // Initialize from cache immediately
  const getCachedBalance = (token: TokenInfo | null): string => {
    if (!address || !token) return '0';
    const isNative = token.address === '0x0000000000000000000000000000000000000000';
    const cacheKey = `balance_${isNative ? 'native' : token.address}_${address}`;
    const cached = globalBalanceCache[cacheKey];
    return cached?.balance || '0';
  };

  const [balanceA, setBalanceA] = useState(() => getCachedBalance(tokenA));
  const [balanceB, setBalanceB] = useState(() => getCachedBalance(tokenB));
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const fetchCountRef = useRef(0);

  const fetchBalances = useCallback(async (force = false) => {
    // If no wallet, show 0 balance
    if (!address) {
      setBalanceA('0');
      setBalanceB('0');
      setLoading(false);
      return;
    }

    const currentFetch = ++fetchCountRef.current;
    
    // Show cached values immediately while fetching
    const cachedA = getCachedBalance(tokenA);
    const cachedB = getCachedBalance(tokenB);
    if (cachedA !== '0') setBalanceA(cachedA);
    if (cachedB !== '0') setBalanceB(cachedB);
    
    setLoading(true);

    const fetchTokenBalance = async (token: TokenInfo | null): Promise<string> => {
      if (!token) return '0';
      
      const provider = rpcProvider.getProvider();
      if (!provider) {
        // Return cached value if no provider
        return getCachedBalance(token);
      }

      try {
        const isNative = token.address === '0x0000000000000000000000000000000000000000';
        const cacheKey = `balance_${isNative ? 'native' : token.address}_${address}`;
        
        // Skip cache check if forcing refresh
        if (!force) {
          const cached = globalBalanceCache[cacheKey];
          if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL) {
            return cached.balance;
          }
        }
        
        let balance: string = '0';
        if (isNative) {
          const result = await rpcProvider.call(
            () => provider.getBalance(address),
            cacheKey,
            { timeout: 10000, retries: 2 }
          );
          balance = result ? ethers.formatEther(result) : getCachedBalance(token);
        } else {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const result = await rpcProvider.call(
            () => contract.balanceOf(address),
            cacheKey,
            { timeout: 10000, retries: 2 }
          );
          balance = result ? ethers.formatUnits(result, token.decimals) : getCachedBalance(token);
        }

        // Update cache only if we got a real value
        if (balance !== '0') {
          globalBalanceCache[cacheKey] = {
            balance,
            timestamp: Date.now(),
          };
        }

        return balance;
      } catch {
        // Return cached value on error
        return getCachedBalance(token);
      }
    };

    try {
      // Fetch both balances in parallel
      const [balA, balB] = await Promise.all([
        fetchTokenBalance(tokenA),
        fetchTokenBalance(tokenB),
      ]);
      
      if (!mountedRef.current || currentFetch !== fetchCountRef.current) return;
      setBalanceA(balA);
      setBalanceB(balB);
    } finally {
      if (mountedRef.current && currentFetch === fetchCountRef.current) {
        setLoading(false);
      }
    }
  }, [address, tokenA, tokenB]);

  // Fetch when dependencies change
  useEffect(() => {
    mountedRef.current = true;
    fetchBalances();
    
    return () => {
      mountedRef.current = false;
    };
  }, [address, tokenA?.address, tokenB?.address]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (address) {
        fetchBalances();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [address, fetchBalances]);

  // Force refresh after transaction
  const forceRefresh = useCallback(async () => {
    // Clear cache for these tokens
    if (tokenA) {
      const cacheKeyA = `balance_${tokenA.address === '0x0000000000000000000000000000000000000000' ? 'native' : tokenA.address}_${address}`;
      delete globalBalanceCache[cacheKeyA];
    }
    if (tokenB) {
      const cacheKeyB = `balance_${tokenB.address === '0x0000000000000000000000000000000000000000' ? 'native' : tokenB.address}_${address}`;
      delete globalBalanceCache[cacheKeyB];
    }
    
    // Wait a bit for blockchain to update
    await new Promise(r => setTimeout(r, 2000));
    await fetchBalances(true);
  }, [address, tokenA, tokenB, fetchBalances]);

  return {
    balanceA,
    balanceB,
    loading,
    refetch: () => fetchBalances(true),
    forceRefresh,
  };
}
