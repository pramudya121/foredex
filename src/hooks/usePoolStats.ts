import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';

export interface PoolStats {
  totalPools: number;
  totalTVL: number;
  volume24h: number;
  totalFees: number;
  loading: boolean;
}

export interface PoolData {
  address: string;
  token0: { address: string; symbol: string; name: string; logoURI?: string };
  token1: { address: string; symbol: string; name: string; logoURI?: string };
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  tvl: number;
}

export function usePoolStats() {
  const [stats, setStats] = useState<PoolStats>({
    totalPools: 0,
    totalTVL: 0,
    volume24h: 0,
    totalFees: 0,
    loading: true,
  });
  const [pools, setPools] = useState<PoolData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      
      const pairCount = await factory.allPairsLength();
      const totalPools = Number(pairCount);
      
      let totalTVL = 0;
      const poolPromises = [];

      for (let i = 0; i < Math.min(totalPools, 50); i++) {
        poolPromises.push(
          (async () => {
            try {
              const pairAddress = await factory.allPairs(i);
              const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
              
              const [token0Addr, token1Addr, reserves, totalSupply] = await Promise.all([
                pair.token0(),
                pair.token1(),
                pair.getReserves(),
                pair.totalSupply(),
              ]);

              const getTokenInfo = (addr: string) => {
                const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
                if (known) return { address: addr, symbol: known.symbol, name: known.name, logoURI: known.logoURI };
                return { address: addr, symbol: 'UNKNOWN', name: 'Unknown Token', logoURI: undefined };
              };

              const token0 = getTokenInfo(token0Addr);
              const token1 = getTokenInfo(token1Addr);

              const reserve0 = parseFloat(ethers.formatEther(reserves[0]));
              const reserve1 = parseFloat(ethers.formatEther(reserves[1]));
              
              // Simple TVL calculation (sum of reserves * assumed price)
              // In production, you'd get actual token prices
              const tvl = (reserve0 + reserve1);

              return {
                address: pairAddress,
                token0,
                token1,
                reserve0: ethers.formatEther(reserves[0]),
                reserve1: ethers.formatEther(reserves[1]),
                totalSupply: ethers.formatEther(totalSupply),
                tvl,
              };
            } catch {
              return null;
            }
          })()
        );
      }

      const results = await Promise.all(poolPromises);
      const validPools = results.filter((p): p is PoolData => p !== null);
      
      totalTVL = validPools.reduce((sum, pool) => sum + pool.tvl, 0);
      
      // Estimate 24h volume (in production, use subgraph or indexer)
      // For testnet, we'll estimate based on TVL activity
      const volume24h = totalTVL * 0.15; // Estimated 15% of TVL traded daily
      
      // Total fees (0.3% fee on swaps)
      const totalFees = volume24h * 0.003;

      setPools(validPools);
      setStats({
        totalPools,
        totalTVL,
        volume24h,
        totalFees,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching pool stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, pools, refetch: fetchStats, isRefreshing };
}
