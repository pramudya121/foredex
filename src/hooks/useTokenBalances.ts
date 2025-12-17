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

// Cache for balances to reduce RPC calls
const balanceCache = new Map<string, { balances: Map<string, TokenBalance>; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export function useTokenBalances(address: string | null) {
  const [balances, setBalances] = useState<Map<string, TokenBalance>>(new Map());
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchBalances = useCallback(async () => {
    if (!address || isFetchingRef.current) {
      if (!address) setBalances(new Map());
      return;
    }

    // Check cache first
    const cacheKey = address.toLowerCase();
    const cached = balanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setBalances(cached.balances);
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    const newBalances = new Map<string, TokenBalance>();

    try {
      const provider = rpcProvider.getProvider();
      
      if (!provider || !rpcProvider.isAvailable()) {
        // Return zero balances when RPC unavailable
        TOKEN_LIST.forEach((token) => {
          newBalances.set(token.address.toLowerCase(), {
            token,
            balance: '0',
            balanceRaw: BigInt(0),
          });
        });
        setBalances(newBalances);
        return;
      }

      // Fetch balances sequentially with delays to avoid rate limiting
      for (const token of TOKEN_LIST) {
        try {
          let balance: bigint | null = null;
          
          if (token.address === '0x0000000000000000000000000000000000000000') {
            // Native token (NEX)
            balance = await rpcProvider.call(
              () => provider.getBalance(address),
              `balance_native_${address}`
            );
          } else {
            // ERC20 token
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            balance = await rpcProvider.call(
              () => contract.balanceOf(address),
              `balance_${token.address}_${address}`
            );
          }

          newBalances.set(token.address.toLowerCase(), {
            token,
            balance: balance ? ethers.formatUnits(balance, token.decimals) : '0',
            balanceRaw: balance || BigInt(0),
          });
        } catch {
          newBalances.set(token.address.toLowerCase(), {
            token,
            balance: '0',
            balanceRaw: BigInt(0),
          });
        }
      }

      // Update cache
      balanceCache.set(cacheKey, { balances: newBalances, timestamp: Date.now() });
    } catch {
      // Set empty balances on error
      TOKEN_LIST.forEach((token) => {
        newBalances.set(token.address.toLowerCase(), {
          token,
          balance: '0',
          balanceRaw: BigInt(0),
        });
      });
    } finally {
      setBalances(newBalances);
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [address]);

  useEffect(() => {
    fetchBalances();
    // Refresh balances every 60 seconds instead of 30
    const interval = setInterval(fetchBalances, 60000);
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
