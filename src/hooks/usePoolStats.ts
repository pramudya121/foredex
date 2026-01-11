import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';

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

// Cache for pool stats - global singleton
interface PoolStatsCache {
  stats: PoolStats;
  pools: PoolData[];
  timestamp: number;
  poolCount: number; // Store actual pool count from chain
}

let poolStatsCache: PoolStatsCache | null = null;
const CACHE_TTL = 30000; // 30 seconds

// Get token info helper
function getTokenInfo(addr: string): { address: string; symbol: string; name: string; logoURI?: string } {
  const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
  if (known) return { address: addr, symbol: known.symbol, name: known.name, logoURI: known.logoURI };
  return { address: addr, symbol: addr.slice(0, 6) + '...', name: 'Unknown', logoURI: undefined };
}

// Clear cache function exported for use after adding liquidity
export function clearPoolStatsCache() {
  poolStatsCache = null;
}

export function usePoolStats() {
  const [stats, setStats] = useState<PoolStats>(() => {
    if (poolStatsCache && Date.now() - poolStatsCache.timestamp < CACHE_TTL * 2) {
      return { ...poolStatsCache.stats, loading: false };
    }
    return { totalPools: 0, totalTVL: 0, volume24h: 0, totalFees: 0, loading: true };
  });
  
  const [pools, setPools] = useState<PoolData[]>(() => {
    if (poolStatsCache && Date.now() - poolStatsCache.timestamp < CACHE_TTL * 2) {
      return poolStatsCache.pools;
    }
    return [];
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  const fetchStats = useCallback(async (forceRefresh = false) => {
    if (isFetchingRef.current) return;
    
    // Check cache first - use cache if valid
    if (!forceRefresh && poolStatsCache && Date.now() - poolStatsCache.timestamp < CACHE_TTL) {
      if (poolStatsCache.pools.length > 0) {
        setStats({ ...poolStatsCache.stats, loading: false });
        setPools(poolStatsCache.pools);
        return;
      }
    }

    isFetchingRef.current = true;
    setIsRefreshing(true);
    
    // Only show loading spinner on first load, not refreshes
    if (pools.length === 0 && !poolStatsCache?.pools.length) {
      setStats(prev => ({ ...prev, loading: true }));
    }
    
    try {
      // Wait for provider to be ready
      let provider = rpcProvider.getProvider();
      let attempts = 0;
      while ((!provider || !rpcProvider.isAvailable()) && attempts < 5) {
        await new Promise(r => setTimeout(r, 1000));
        provider = rpcProvider.getProvider();
        attempts++;
      }
      
      if (!provider || !rpcProvider.isAvailable()) {
        console.warn('[usePoolStats] RPC not available after retries');
        // Use cached data if available
        if (poolStatsCache?.pools.length) {
          setStats({ ...poolStatsCache.stats, loading: false });
          setPools(poolStatsCache.pools);
        }
        isFetchingRef.current = false;
        setIsRefreshing(false);
        return;
      }

      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      
      // Get actual pool count with retry
      let pairCount: bigint;
      try {
        pairCount = await rpcProvider.call(
          () => factory.allPairsLength(),
          'poolStats_allPairsLength',
          { retries: 3, timeout: 15000, skipCache: forceRefresh }
        );
      } catch (e) {
        console.error('[usePoolStats] Failed to get pair count:', e);
        isFetchingRef.current = false;
        setIsRefreshing(false);
        return;
      }
      
      if (pairCount === null || pairCount === undefined) {
        isFetchingRef.current = false;
        setIsRefreshing(false);
        return;
      }
      
      const totalPools = Number(pairCount);
      console.log('[usePoolStats] Total pools from chain:', totalPools);
      
      if (totalPools === 0) {
        const emptyStats = { totalPools: 0, totalTVL: 0, volume24h: 0, totalFees: 0, loading: false };
        setStats(emptyStats);
        setPools([]);
        poolStatsCache = { stats: emptyStats, pools: [], timestamp: Date.now(), poolCount: 0 };
        setIsRefreshing(false);
        isFetchingRef.current = false;
        retryCountRef.current = 0;
        return;
      }

      // Fetch all pools - no limit
      const validPools: PoolData[] = [];
      let totalTVL = 0;

      // Batch fetch pair addresses first
      const pairAddresses: string[] = [];
      for (let i = 0; i < totalPools; i++) {
        try {
          const pairAddress = await rpcProvider.call(
            () => factory.allPairs(i),
            `pool_address_${i}`,
            { retries: 2, timeout: 10000 }
          );
          if (pairAddress && pairAddress !== ethers.ZeroAddress) {
            pairAddresses.push(pairAddress);
          }
        } catch {
          console.warn(`[usePoolStats] Failed to get pair ${i}`);
        }
      }

      console.log('[usePoolStats] Found pair addresses:', pairAddresses.length);

      // Fetch pool data in batches
      const BATCH_SIZE = 5;
      for (let i = 0; i < pairAddresses.length; i += BATCH_SIZE) {
        const batch = pairAddresses.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(async (pairAddress) => {
            try {
              const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
              
              const [token0Addr, token1Addr, reserves, totalSupply] = await Promise.all([
                rpcProvider.call(() => pair.token0(), `token0_${pairAddress}`, { retries: 2 }),
                rpcProvider.call(() => pair.token1(), `token1_${pairAddress}`, { retries: 2 }),
                rpcProvider.call(() => pair.getReserves(), `reserves_${pairAddress}`, { retries: 2, skipCache: forceRefresh }),
                rpcProvider.call(() => pair.totalSupply(), `supply_${pairAddress}`, { retries: 2, skipCache: forceRefresh }),
              ]);

              if (!token0Addr || !token1Addr || !reserves || !totalSupply) {
                return null;
              }

              const token0 = getTokenInfo(token0Addr);
              const token1 = getTokenInfo(token1Addr);

              const reserve0 = parseFloat(ethers.formatEther(reserves[0]));
              const reserve1 = parseFloat(ethers.formatEther(reserves[1]));
              const tvl = reserve0 + reserve1;

              return {
                address: pairAddress,
                token0,
                token1,
                reserve0: ethers.formatEther(reserves[0]),
                reserve1: ethers.formatEther(reserves[1]),
                totalSupply: ethers.formatEther(totalSupply),
                tvl,
              };
            } catch (e) {
              console.warn(`[usePoolStats] Failed to fetch pool ${pairAddress}:`, e);
              return null;
            }
          })
        );

        batchResults.forEach(result => {
          if (result) {
            validPools.push(result);
            totalTVL += result.tvl;
          }
        });

        // Small delay between batches
        if (i + BATCH_SIZE < pairAddresses.length) {
          await new Promise(r => setTimeout(r, 100));
        }
      }

      console.log('[usePoolStats] Valid pools fetched:', validPools.length);

      if (!mountedRef.current) return;

      const volume24h = totalTVL * 0.15;
      const totalFees = volume24h * 0.003;

      const newStats: PoolStats = {
        totalPools: validPools.length, // Use actual valid pool count
        totalTVL,
        volume24h,
        totalFees,
        loading: false,
      };

      // Update cache with actual pool count
      poolStatsCache = { 
        stats: newStats, 
        pools: validPools, 
        timestamp: Date.now(),
        poolCount: totalPools
      };
      
      setPools(validPools);
      setStats(newStats);
      retryCountRef.current = 0;
      
    } catch (error) {
      console.error('[usePoolStats] Error fetching stats:', error);
      // Keep existing data on error
    } finally {
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [pools.length]);

  useEffect(() => {
    mountedRef.current = true;
    fetchStats();
    
    const interval = setInterval(() => fetchStats(), 60000);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchStats]);

  const refetch = useCallback(() => {
    clearPoolStatsCache();
    fetchStats(true);
  }, [fetchStats]);

  return { stats, pools, refetch, isRefreshing };
}
