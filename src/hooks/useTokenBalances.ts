import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { TOKEN_LIST, TokenInfo, NEXUS_TESTNET } from '@/config/contracts';
import { ERC20_ABI } from '@/config/abis';

export interface TokenBalance {
  token: TokenInfo;
  balance: string;
  balanceRaw: bigint;
}

export function useTokenBalances(address: string | null) {
  const [balances, setBalances] = useState<Map<string, TokenBalance>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!address) {
      setBalances(new Map());
      return;
    }

    setLoading(true);
    const newBalances = new Map<string, TokenBalance>();

    try {
      const provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl, undefined, {
        staticNetwork: true,
        batchMaxCount: 1
      });

      // Set a timeout for all operations
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      const balancePromises = TOKEN_LIST.map(async (token) => {
        try {
          let balance: bigint;
          
          if (token.address === '0x0000000000000000000000000000000000000000') {
            // Native token (NEX)
            balance = await provider.getBalance(address);
          } else {
            // ERC20 token
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            balance = await contract.balanceOf(address);
          }

          return {
            token,
            balance: ethers.formatUnits(balance, token.decimals),
            balanceRaw: balance,
          };
        } catch (error) {
          // Return zero balance on error
          return {
            token,
            balance: '0',
            balanceRaw: BigInt(0),
          };
        }
      });

      const results = await Promise.race([
        Promise.all(balancePromises),
        timeoutPromise
      ]) as TokenBalance[] | null;

      if (results) {
        results.forEach((result) => {
          newBalances.set(result.token.address.toLowerCase(), result);
        });
      }
    } catch (error) {
      console.warn('Error fetching token balances:', error);
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
    }
  }, [address]);

  useEffect(() => {
    fetchBalances();
    // Refresh balances every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
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
