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
const CACHE_TTL = 30000; // 30 seconds - increased for stability
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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

// Create a direct provider with better error handling
function createDirectProvider(): ethers.JsonRpcProvider {
  const network = { chainId: NEXUS_TESTNET.chainId, name: NEXUS_TESTNET.name };
  return new ethers.JsonRpcProvider(
    NEXUS_TESTNET.rpcUrl,
    network,
    { staticNetwork: ethers.Network.from(network), batchMaxCount: 1 }
  );
}

// Retry helper with exponential backoff
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isThrottled = error?.message?.includes('429') || 
                          error?.code === 429 ||
                          error?.message?.includes('Too Many Requests');
      
      if (i < retries - 1) {
        // Exponential backoff: longer delay for throttled requests
        const backoffDelay = isThrottled ? delay * Math.pow(2, i + 1) : delay * (i + 1);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  return null;
}

// Fetch single token balance with retry
async function fetchTokenBalance(
  provider: ethers.JsonRpcProvider,
  token: TokenInfo,
  address: string
): Promise<TokenBalance | null> {
  const result = await fetchWithRetry(async () => {
    let balance: bigint;
    
    if (token.address === '0x0000000000000000000000000000000000000000') {
      balance = await provider.getBalance(address);
    } else {
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      balance = await contract.balanceOf(address);
    }

    return {
      token,
      balance: ethers.formatUnits(balance, token.decimals),
      balanceRaw: balance,
    };
  });

  return result;
}

export function useTokenBalances(address: string | null) {
  const [balances, setBalances] = useState<Map<string, TokenBalance>>(() => {
    if (address) {
      const cached = balanceCache.get(address.toLowerCase());
      if (cached && Date.now() - cached.timestamp < CACHE_TTL * 3) {
        return cached.balances;
      }
    }
    return getEmptyBalances();
  });
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);
  const addressRef = useRef(address);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  const fetchBalances = useCallback(async (force = false) => {
    const currentAddress = addressRef.current;
    
    if (!currentAddress) {
      setBalances(getEmptyBalances());
      setLoading(false);
      return;
    }

    // Prevent rapid refetching
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 5000) {
      return;
    }

    if (isFetchingRef.current) return;

    // Check cache first
    const cacheKey = currentAddress.toLowerCase();
    const cached = balanceCache.get(cacheKey);
    if (!force && cached && now - cached.timestamp < CACHE_TTL) {
      setBalances(cached.balances);
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    lastFetchRef.current = now;
    setLoading(true);

    // Start with cached balances if available (optimistic)
    const newBalances = cached ? new Map(cached.balances) : getEmptyBalances();
    let fetchedAny = false;

    try {
      const provider = createDirectProvider();

      // Batch tokens into groups to avoid overwhelming RPC
      const batchSize = 4;
      const tokenBatches: TokenInfo[][] = [];
      for (let i = 0; i < TOKEN_LIST.length; i += batchSize) {
        tokenBatches.push(TOKEN_LIST.slice(i, i + batchSize));
      }

      for (const batch of tokenBatches) {
        // Add small delay between batches to avoid throttling
        if (tokenBatches.indexOf(batch) > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        const results = await Promise.all(
          batch.map(token => fetchTokenBalance(provider, token, currentAddress))
        );

        results.forEach((result) => {
          if (result) {
            fetchedAny = true;
            newBalances.set(result.token.address.toLowerCase(), result);
          }
        });

        // Update state incrementally for better UX
        if (addressRef.current === currentAddress && fetchedAny) {
          setBalances(new Map(newBalances));
        }
      }

      if (addressRef.current === currentAddress && fetchedAny) {
        balanceCache.set(cacheKey, { balances: newBalances, timestamp: Date.now() });
        setBalances(newBalances);
      }
    } catch (error) {
      console.warn('Balance fetch error:', error);
      // Keep showing cached data on error
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
      fetchBalances(true);
    } else {
      setBalances(getEmptyBalances());
    }
  }, [address, fetchBalances]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (addressRef.current) {
        fetchBalances(false);
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

  return { balances, loading, refetch: () => fetchBalances(true), getBalance, getBalanceRaw };
}