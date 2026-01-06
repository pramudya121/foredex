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
const BALANCE_CACHE_TTL = 30000; // 30 seconds - shorter for faster updates
const pendingRequests = new Map<string, Promise<string>>();

// Consistent cache key format
const getCacheKey = (walletAddress: string, tokenAddress: string): string => {
  const isNative = tokenAddress === '0x0000000000000000000000000000000000000000';
  return `bal_${walletAddress.toLowerCase()}_${isNative ? 'native' : tokenAddress.toLowerCase()}`;
};

// Get cached balance immediately
const getCachedBalance = (walletAddress: string | null, tokenAddress: string): string => {
  if (!walletAddress) return '0';
  const cacheKey = getCacheKey(walletAddress, tokenAddress);
  const cached = globalBalanceCache[cacheKey];
  return cached?.balance || '0';
};

// Clear cache for a token
export const clearBalanceCache = (walletAddress: string, tokenAddress: string) => {
  const cacheKey = getCacheKey(walletAddress, tokenAddress);
  delete globalBalanceCache[cacheKey];
};

// Clear all cache
export const clearAllBalanceCache = () => {
  Object.keys(globalBalanceCache).forEach(key => delete globalBalanceCache[key]);
};

export function useStableBalances(address: string | null) {
  const [balances, setBalances] = useState<Map<string, string>>(() => {
    const initial = new Map<string, string>();
    if (address) {
      Object.entries(globalBalanceCache).forEach(([key, value]) => {
        if (key.includes(address.toLowerCase())) {
          initial.set(key, value.balance);
        }
      });
    }
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const isNativeToken = (token: TokenInfo | null) =>
    token?.address === '0x0000000000000000000000000000000000000000';

  const fetchSingleBalance = useCallback(async (
    tokenAddress: string,
    decimals: number,
    walletAddress: string,
    force = false
  ): Promise<string> => {
    const cacheKey = getCacheKey(walletAddress, tokenAddress);
    
    // Check cache first - return immediately if valid and not forcing
    if (!force) {
      const cached = globalBalanceCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL) {
        return cached.balance;
      }
    }

    // Check if already fetching
    if (pendingRequests.has(cacheKey)) {
      try {
        return await pendingRequests.get(cacheKey)!;
      } catch {
        const cached = globalBalanceCache[cacheKey];
        return cached?.balance || '0';
      }
    }

    const provider = rpcProvider.getProvider();
    if (!provider) {
      const cached = globalBalanceCache[cacheKey];
      return cached?.balance || '0';
    }

    const fetchPromise = (async () => {
      try {
        let balance: string;
        const isNative = tokenAddress === '0x0000000000000000000000000000000000000000';
        
        if (isNative) {
          const result = await rpcProvider.call(
            () => provider.getBalance(walletAddress),
            cacheKey,
            { retries: 3, timeout: 15000 }
          );
          balance = result ? ethers.formatEther(result) : '0';
        } else {
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const result = await rpcProvider.call(
            () => contract.balanceOf(walletAddress),
            cacheKey,
            { retries: 3, timeout: 15000 }
          );
          balance = result ? ethers.formatUnits(result, decimals) : '0';
        }

        // Update cache
        globalBalanceCache[cacheKey] = {
          balance,
          timestamp: Date.now(),
        };

        return balance;
      } catch (err) {
        console.warn('Balance fetch error:', err);
        const cached = globalBalanceCache[cacheKey];
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
    
    return getCachedBalance(address, tokenAddress);
  }, [address]);

  const fetchBalancesForTokens = useCallback(async (tokens: (TokenInfo | null)[]) => {
    if (!address || fetchingRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    const newBalances = new Map<string, string>();
    
    try {
      // Fetch all balances in parallel
      const promises = tokens.map(async (token) => {
        if (!token) return null;
        const balance = await getBalance(token);
        return { address: token.address.toLowerCase(), balance };
      });

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result) {
          newBalances.set(result.address, result.balance);
        }
      });
      
      if (mountedRef.current) {
        setBalances(newBalances);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError('Failed to load balances');
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
    clearBalanceCache(address, tokenAddress);
    
    // Fetch fresh
    const balance = await fetchSingleBalance(tokenAddress, token.decimals, address, true);
    
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
    error,
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
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchCountRef = useRef(0);
  const lastFetchRef = useRef(0);

  // Initialize from cache immediately
  useEffect(() => {
    if (tokenA) {
      const tokenAddr = tokenA.address === '0x0000000000000000000000000000000000000000' 
        ? '0x0000000000000000000000000000000000000000' 
        : tokenA.address;
      const cached = getCachedBalance(address, tokenAddr);
      if (cached !== '0') setBalanceA(cached);
    }
    if (tokenB) {
      const tokenAddr = tokenB.address === '0x0000000000000000000000000000000000000000' 
        ? '0x0000000000000000000000000000000000000000' 
        : tokenB.address;
      const cached = getCachedBalance(address, tokenAddr);
      if (cached !== '0') setBalanceB(cached);
    }
  }, [address, tokenA?.address, tokenB?.address]);

  const fetchBalances = useCallback(async (force = false) => {
    if (!address) {
      setBalanceA('0');
      setBalanceB('0');
      setLoading(false);
      return;
    }

    // Debounce rapid calls
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 500) {
      return;
    }
    lastFetchRef.current = now;

    const currentFetch = ++fetchCountRef.current;
    setLoading(true);
    setError(null);

    const fetchTokenBalance = async (token: TokenInfo | null): Promise<string> => {
      if (!token) return '0';
      
      const provider = rpcProvider.getProvider();
      if (!provider) {
        const tokenAddr = token.address === '0x0000000000000000000000000000000000000000' 
          ? '0x0000000000000000000000000000000000000000' 
          : token.address;
        return getCachedBalance(address, tokenAddr);
      }

      try {
        const isNative = token.address === '0x0000000000000000000000000000000000000000';
        const tokenAddr = isNative ? '0x0000000000000000000000000000000000000000' : token.address;
        const cacheKey = getCacheKey(address, tokenAddr);
        
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
            { timeout: 15000, retries: 3 }
          );
          balance = result ? ethers.formatEther(result) : getCachedBalance(address, tokenAddr);
        } else {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const result = await rpcProvider.call(
            () => contract.balanceOf(address),
            cacheKey,
            { timeout: 15000, retries: 3 }
          );
          balance = result ? ethers.formatUnits(result, token.decimals) : getCachedBalance(address, tokenAddr);
        }

        // Update cache
        if (balance !== '0') {
          globalBalanceCache[cacheKey] = {
            balance,
            timestamp: Date.now(),
          };
        }

        return balance;
      } catch (err) {
        console.warn('Balance fetch error:', err);
        const tokenAddr = token.address === '0x0000000000000000000000000000000000000000' 
          ? '0x0000000000000000000000000000000000000000' 
          : token.address;
        return getCachedBalance(address, tokenAddr);
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
    } catch (err) {
      if (mountedRef.current && currentFetch === fetchCountRef.current) {
        setError('Failed to load balances');
      }
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

  // Auto-refresh every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (address) {
        fetchBalances();
      }
    }, 20000);
    
    return () => clearInterval(interval);
  }, [address, fetchBalances]);

  // Force refresh after transaction
  const forceRefresh = useCallback(async () => {
    // Clear cache for these tokens
    if (address) {
      if (tokenA) {
        const tokenAddrA = tokenA.address === '0x0000000000000000000000000000000000000000' 
          ? '0x0000000000000000000000000000000000000000' 
          : tokenA.address;
        clearBalanceCache(address, tokenAddrA);
      }
      if (tokenB) {
        const tokenAddrB = tokenB.address === '0x0000000000000000000000000000000000000000' 
          ? '0x0000000000000000000000000000000000000000' 
          : tokenB.address;
        clearBalanceCache(address, tokenAddrB);
      }
    }
    
    // Wait a bit for blockchain to update
    await new Promise(r => setTimeout(r, 1500));
    await fetchBalances(true);
  }, [address, tokenA, tokenB, fetchBalances]);

  return {
    balanceA,
    balanceB,
    loading,
    error,
    refetch: () => fetchBalances(true),
    forceRefresh,
  };
}
