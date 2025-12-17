import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { TOKEN_LIST, TokenInfo } from '@/config/contracts';
import { ERC20_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';

export interface TokenBalance {
  token: TokenInfo;
  balance: string;
  balanceRaw: bigint;
}

// Global cache for balances to reduce RPC calls
const balanceCache = new Map<string, { balances: Map<string, TokenBalance>; timestamp: number }>();
const CACHE_TTL = 20000; // 20 seconds

// Initialize empty balances for all tokens
function getEmptyBalances(): Map<string, TokenBalance> {
  const map = new Map<string, TokenBalance>();
  TOKEN_LIST.forEach((token) => {
    map.set(token.address.toLowerCase(), {
      token,
      balance: '0',
      balanceRaw: BigInt(0),
    });
  });
  return map;
}

export function useTokenBalances(address: string | null) {
  const [balances, setBalances] = useState<Map<string, TokenBalance>>(() => {
    // Try to use cached data on init
    if (address) {
      const cached = balanceCache.get(address.toLowerCase());
      if (cached && Date.now() - cached.timestamp < CACHE_TTL * 2) {
        return cached.balances;
      }
    }
    return getEmptyBalances();
  });
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);
  const addressRef = useRef(address);
  const retryCountRef = useRef(0);

  // Update ref when address changes
  useEffect(() => {
    addressRef.current = address;
    retryCountRef.current = 0;
  }, [address]);

  const fetchBalances = useCallback(async () => {
    const currentAddress = addressRef.current;
    
    // If no address, reset to empty balances
    if (!currentAddress) {
      setBalances(getEmptyBalances());
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    // Check cache first
    const cacheKey = currentAddress.toLowerCase();
    const cached = balanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setBalances(cached.balances);
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);

    const newBalances = getEmptyBalances();
    let fetchedAny = false;

    try {
      const provider = rpcProvider.getProvider();
      
      // If RPC unavailable, return cached or empty but schedule retry
      if (!provider || !rpcProvider.isAvailable()) {
        if (cached) {
          setBalances(cached.balances);
        }
        // Schedule retry after cooldown
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          setTimeout(() => {
            isFetchingRef.current = false;
            fetchBalances();
          }, 5000);
        }
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Fetch balances for each token in parallel batches
      const tokenBatches = [];
      for (let i = 0; i < TOKEN_LIST.length; i += 3) {
        tokenBatches.push(TOKEN_LIST.slice(i, i + 3));
      }

      for (const batch of tokenBatches) {
        // Skip if address changed during fetch
        if (addressRef.current !== currentAddress) {
          isFetchingRef.current = false;
          return;
        }

        const batchPromises = batch.map(async (token) => {
          try {
            let balance: bigint | null = null;
            
            if (token.address === '0x0000000000000000000000000000000000000000') {
              // Native token (NEX)
              balance = await rpcProvider.call(
                () => provider.getBalance(currentAddress),
                `balance_native_${currentAddress}`
              );
            } else {
              // ERC20 token
              const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
              balance = await rpcProvider.call(
                () => contract.balanceOf(currentAddress),
                `balance_${token.address}_${currentAddress}`
              );
            }

            if (balance !== null) {
              fetchedAny = true;
              return {
                address: token.address.toLowerCase(),
                data: {
                  token,
                  balance: ethers.formatUnits(balance, token.decimals),
                  balanceRaw: balance,
                }
              };
            }
            return null;
          } catch {
            return null;
          }
        });

        const results = await Promise.all(batchPromises);
        results.forEach(result => {
          if (result) {
            newBalances.set(result.address, result.data);
          }
        });
      }

      // Update cache only if address didn't change and we got data
      if (addressRef.current === currentAddress) {
        if (fetchedAny) {
          balanceCache.set(cacheKey, { balances: newBalances, timestamp: Date.now() });
          setBalances(newBalances);
          retryCountRef.current = 0;
        } else if (cached) {
          // Use cached data if fetch failed
          setBalances(cached.balances);
        }
      }
    } catch {
      // On error, use cached balances if available
      if (cached && addressRef.current === currentAddress) {
        setBalances(cached.balances);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Fetch when address changes
  useEffect(() => {
    if (address) {
      fetchBalances();
    } else {
      setBalances(getEmptyBalances());
    }
  }, [address, fetchBalances]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (addressRef.current) {
        fetchBalances();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  const getBalance = useCallback((tokenAddress: string): string => {
    const balance = balances.get(tokenAddress.toLowerCase());
    return balance?.balance || '0';
  }, [balances]);

  const getBalanceRaw = useCallback((tokenAddress: string): bigint => {
    const balance = balances.get(tokenAddress.toLowerCase());
    return balance?.balanceRaw || BigInt(0);
  }, [balances]);

  return { balances, loading, refetch: fetchBalances, getBalance, getBalanceRaw };
}