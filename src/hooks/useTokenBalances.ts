import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { TOKEN_LIST, TokenInfo, CONTRACTS } from '@/config/contracts';
import { MULTICALL_ABI, ERC20_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';

export interface TokenBalance {
  token: TokenInfo;
  balance: string;
  balanceRaw: bigint;
}

// Global cache for balances to reduce RPC calls
const balanceCache = new Map<string, { balances: Map<string, TokenBalance>; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds
const MAX_RETRIES = 2;

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

// Encode balanceOf call data
function encodeBalanceOfCall(userAddress: string): string {
  const iface = new ethers.Interface(ERC20_ABI);
  return iface.encodeFunctionData('balanceOf', [userAddress]);
}

// Decode balanceOf result
function decodeBalanceOfResult(data: string): bigint {
  try {
    const iface = new ethers.Interface(ERC20_ABI);
    const result = iface.decodeFunctionResult('balanceOf', data);
    return result[0];
  } catch {
    return BigInt(0);
  }
}

// Fetch all balances using multicall for efficiency
async function fetchBalancesWithMulticall(
  userAddress: string
): Promise<Map<string, TokenBalance>> {
  const provider = rpcProvider.getProvider();
  if (!provider) {
    return getEmptyBalances();
  }

  const newBalances = getEmptyBalances();
  
  try {
    // Get native balance first (not via multicall)
    const nativeToken = TOKEN_LIST.find(t => t.address === '0x0000000000000000000000000000000000000000');
    if (nativeToken) {
      try {
        const nativeBalance = await provider.getBalance(userAddress);
        newBalances.set(nativeToken.address.toLowerCase(), {
          token: nativeToken,
          balance: ethers.formatUnits(nativeBalance, nativeToken.decimals),
          balanceRaw: nativeBalance,
        });
      } catch {
        // Keep default 0 balance
      }
    }

    // Get ERC20 tokens via multicall
    const erc20Tokens = TOKEN_LIST.filter(t => t.address !== '0x0000000000000000000000000000000000000000');
    
    if (erc20Tokens.length === 0) {
      return newBalances;
    }

    const multicall = new ethers.Contract(CONTRACTS.MULTICALL, MULTICALL_ABI, provider);
    
    // Prepare multicall calls
    const calls = erc20Tokens.map(token => ({
      target: token.address,
      callData: encodeBalanceOfCall(userAddress),
    }));

    // Execute multicall with staticCall (read-only, not a transaction)
    const [, returnData] = await multicall.aggregate.staticCall(calls);
    
    // Decode results
    (returnData as string[]).forEach((data, index) => {
      const token = erc20Tokens[index];
      try {
        const balance = decodeBalanceOfResult(data);
        newBalances.set(token.address.toLowerCase(), {
          token,
          balance: ethers.formatUnits(balance, token.decimals),
          balanceRaw: balance,
        });
      } catch {
        // Keep default 0 balance on decode error
      }
    });
  } catch (error) {
    console.warn('Multicall balance fetch failed, using fallback:', error);
    // Fallback to individual calls if multicall fails
    return await fetchBalancesFallback(userAddress);
  }

  return newBalances;
}

// Fallback to individual calls if multicall not available
async function fetchBalancesFallback(userAddress: string): Promise<Map<string, TokenBalance>> {
  const provider = rpcProvider.getProvider();
  if (!provider) {
    return getEmptyBalances();
  }

  const newBalances = getEmptyBalances();

  // Batch tokens into groups
  const batchSize = 4;
  for (let i = 0; i < TOKEN_LIST.length; i += batchSize) {
    const batch = TOKEN_LIST.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (token) => {
      try {
        let balance: bigint;
        if (token.address === '0x0000000000000000000000000000000000000000') {
          balance = await provider.getBalance(userAddress);
        } else {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          balance = await contract.balanceOf(userAddress);
        }
        newBalances.set(token.address.toLowerCase(), {
          token,
          balance: ethers.formatUnits(balance, token.decimals),
          balanceRaw: balance,
        });
      } catch {
        // Keep default 0 balance
      }
    }));

    // Small delay between batches
    if (i + batchSize < TOKEN_LIST.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return newBalances;
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

    let retries = 0;
    let success = false;

    while (retries < MAX_RETRIES && !success) {
      try {
        const newBalances = await fetchBalancesWithMulticall(currentAddress);
        
        if (addressRef.current === currentAddress) {
          balanceCache.set(cacheKey, { balances: newBalances, timestamp: Date.now() });
          setBalances(newBalances);
          success = true;
        }
      } catch (error) {
        console.warn(`Balance fetch attempt ${retries + 1} failed:`, error);
        retries++;
        if (retries < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    }

    // Keep showing cached data on complete failure
    if (!success && cached && addressRef.current === currentAddress) {
      setBalances(cached.balances);
    }

    setLoading(false);
    isFetchingRef.current = false;
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
