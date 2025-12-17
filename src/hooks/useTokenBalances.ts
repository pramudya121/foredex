import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { TOKEN_LIST, TokenInfo, NEXUS_TESTNET } from '@/config/contracts';
import { ERC20_ABI } from '@/config/abis';

export interface TokenBalance {
  token: TokenInfo;
  balance: string;
  balanceRaw: bigint;
}

// Global cache for balances to reduce RPC calls
const balanceCache = new Map<string, { balances: Map<string, TokenBalance>; timestamp: number }>();
const CACHE_TTL = 15000; // 15 seconds

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

// Create a direct provider for balance fetching (bypass rpcProvider for simpler flow)
function createDirectProvider(): ethers.JsonRpcProvider {
  const network = { chainId: NEXUS_TESTNET.chainId, name: NEXUS_TESTNET.name };
  return new ethers.JsonRpcProvider(
    NEXUS_TESTNET.rpcUrl,
    network,
    { staticNetwork: ethers.Network.from(network), batchMaxCount: 1 }
  );
}

export function useTokenBalances(address: string | null) {
  const [balances, setBalances] = useState<Map<string, TokenBalance>>(() => {
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

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  const fetchBalances = useCallback(async () => {
    const currentAddress = addressRef.current;
    
    if (!currentAddress) {
      setBalances(getEmptyBalances());
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) return;

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
      // Use direct provider for balance fetching
      const provider = createDirectProvider();

      // Fetch all balances in parallel with individual error handling
      const balancePromises = TOKEN_LIST.map(async (token) => {
        try {
          let balance: bigint;
          
          if (token.address === '0x0000000000000000000000000000000000000000') {
            // Native token (NEX)
            balance = await provider.getBalance(currentAddress);
          } else {
            // ERC20 token
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            balance = await contract.balanceOf(currentAddress);
          }

          return {
            address: token.address.toLowerCase(),
            data: {
              token,
              balance: ethers.formatUnits(balance, token.decimals),
              balanceRaw: balance,
            }
          };
        } catch {
          return null;
        }
      });

      const results = await Promise.allSettled(balancePromises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          fetchedAny = true;
          newBalances.set(result.value.address, result.value.data);
        }
      });

      if (addressRef.current === currentAddress) {
        if (fetchedAny) {
          balanceCache.set(cacheKey, { balances: newBalances, timestamp: Date.now() });
          setBalances(newBalances);
        } else if (cached) {
          setBalances(cached.balances);
        }
      }
    } catch {
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

  // Auto-refresh every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (addressRef.current) {
        fetchBalances();
      }
    }, 20000);
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