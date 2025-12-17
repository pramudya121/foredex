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
const CACHE_TTL = 30000; // 30 seconds

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
  const [balances, setBalances] = useState<Map<string, TokenBalance>>(() => getEmptyBalances());
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);
  const addressRef = useRef(address);

  // Update ref when address changes
  useEffect(() => {
    addressRef.current = address;
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

    try {
      const provider = rpcProvider.getProvider();
      
      // If RPC unavailable, just use empty balances
      if (!provider || !rpcProvider.isAvailable()) {
        setBalances(newBalances);
        return;
      }

      // Fetch balances for each token
      for (const token of TOKEN_LIST) {
        // Skip if address changed during fetch
        if (addressRef.current !== currentAddress) {
          return;
        }

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
            newBalances.set(token.address.toLowerCase(), {
              token,
              balance: ethers.formatUnits(balance, token.decimals),
              balanceRaw: balance,
            });
          }
        } catch {
          // Keep default zero balance on error
        }
      }

      // Update cache only if address didn't change
      if (addressRef.current === currentAddress) {
        balanceCache.set(cacheKey, { balances: newBalances, timestamp: Date.now() });
        setBalances(newBalances);
      }
    } catch {
      // On error, use empty balances
      if (addressRef.current === currentAddress) {
        setBalances(newBalances);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Fetch when address changes
  useEffect(() => {
    fetchBalances();
  }, [address, fetchBalances]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (addressRef.current) {
        fetchBalances();
      }
    }, 60000);
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