import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, TOKEN_LIST } from '@/config/contracts';
import { FARMING_ABI } from '@/config/farmingAbi';
import { ERC20_ABI, PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';

export interface PoolInfo {
  pid: number;
  lpToken: string;
  allocPoint: bigint;
  token0Symbol: string;
  token1Symbol: string;
  totalStaked: string;
  userStaked: string;
  pendingReward: string;
  apr: number;
  lpBalance: string;
}

export interface FarmingStats {
  rewardTokenSymbol: string;
  rewardPerBlock: string;
  totalAllocPoint: bigint;
  isPaused: boolean;
}

// Cache for farming data
interface FarmingCache {
  pools: PoolInfo[];
  stats: FarmingStats | null;
  timestamp: number;
  poolCount: number;
}

const CACHE_TTL = 45000; // 45 seconds
let farmingCache: FarmingCache | null = null;

export function clearFarmingCache() {
  farmingCache = null;
}

const getTokenSymbol = (tokenAddress: string): string => {
  const token = TOKEN_LIST.find(
    t => t.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  return token?.symbol || tokenAddress.slice(0, 6) + '...';
};

export function useFarmingData() {
  const { address, signer } = useWeb3();
  const [pools, setPools] = useState<PoolInfo[]>(() => farmingCache?.pools || []);
  const [stats, setStats] = useState<FarmingStats | null>(() => farmingCache?.stats || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const initialFetchDone = useRef(false);
  const retryCountRef = useRef(0);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    
    // Check cache validity
    if (!forceRefresh && farmingCache && Date.now() - farmingCache.timestamp < CACHE_TTL) {
      setPools(farmingCache.pools);
      setStats(farmingCache.stats);
      return;
    }

    fetchingRef.current = true;
    
    // Only show loading on initial fetch
    if (!initialFetchDone.current && pools.length === 0) {
      setLoading(true);
    }
    
    try {
      setError(null);
      const provider = rpcProvider.getProvider();
      if (!provider || !rpcProvider.isAvailable()) {
        console.warn('[useFarmingData] RPC not available');
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          setTimeout(() => {
            fetchingRef.current = false;
            fetchData(forceRefresh);
          }, 2000 * retryCountRef.current);
        }
        return;
      }
      
      const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, provider);

      // Fetch basic contract info with proper error handling
      let rewardToken: string, rewardPerBlock: bigint, totalAllocPoint: bigint, isPaused: boolean, poolLength: bigint, owner: string;
      
      try {
        [rewardToken, rewardPerBlock, totalAllocPoint, isPaused, poolLength, owner] = await Promise.all([
          rpcProvider.call(() => farmingContract.rewardToken(), 'farming_rewardToken', { retries: 3 }),
          rpcProvider.call(() => farmingContract.rewardPerBlock(), 'farming_rewardPerBlock', { retries: 3, skipCache: forceRefresh }),
          rpcProvider.call(() => farmingContract.totalAllocPoint(), 'farming_totalAllocPoint', { retries: 3, skipCache: forceRefresh }),
          rpcProvider.call(() => farmingContract.paused(), 'farming_paused', { retries: 2 }),
          rpcProvider.call(() => farmingContract.poolLength(), 'farming_poolLength', { retries: 3, skipCache: forceRefresh }),
          rpcProvider.call(() => farmingContract.owner(), 'farming_owner', { retries: 2 }),
        ]);
      } catch (e) {
        console.error('[useFarmingData] Failed to fetch contract info:', e);
        fetchingRef.current = false;
        setLoading(false);
        return;
      }

      if (!mountedRef.current) return;

      // Check owner status
      if (address) {
        setIsOwner(owner?.toLowerCase() === address.toLowerCase());
      }

      // Get reward token symbol
      let rewardTokenSymbol = 'FRDX';
      if (rewardToken) {
        try {
          const rewardTokenContract = new ethers.Contract(rewardToken, ERC20_ABI, provider);
          rewardTokenSymbol = await rpcProvider.call(
            () => rewardTokenContract.symbol(),
            'reward_token_symbol',
            { retries: 2 }
          ) || 'FRDX';
        } catch {
          // Use default
        }
      }

      const newStats: FarmingStats = {
        rewardTokenSymbol,
        rewardPerBlock: rewardPerBlock ? ethers.formatEther(rewardPerBlock) : '0',
        totalAllocPoint: totalAllocPoint || BigInt(0),
        isPaused: isPaused || false,
      };

      setStats(newStats);

      // Fetch all pools
      const poolCount = Number(poolLength || 0);
      console.log('[useFarmingData] Pool count from chain:', poolCount);
      
      if (poolCount === 0) {
        setPools([]);
        farmingCache = { pools: [], stats: newStats, timestamp: Date.now(), poolCount: 0 };
        setLoading(false);
        fetchingRef.current = false;
        initialFetchDone.current = true;
        retryCountRef.current = 0;
        return;
      }

      const validPools: PoolInfo[] = [];

      // Fetch pools sequentially with good error handling
      for (let pid = 0; pid < poolCount; pid++) {
        try {
          const poolInfo = await rpcProvider.call(
            () => farmingContract.poolInfo(pid),
            `farming_pool_${pid}`,
            { retries: 2, skipCache: forceRefresh }
          );
          
          if (!poolInfo) continue;
          
          const lpToken = poolInfo.lpToken;
          
          // Skip invalid LP tokens
          if (!lpToken || lpToken === ethers.ZeroAddress) continue;

          const lpContract = new ethers.Contract(lpToken, [...PAIR_ABI, ...ERC20_ABI], provider);

          // Verify LP token contract exists
          try {
            const code = await provider.getCode(lpToken);
            if (code === '0x' || code === '0x0') continue;
          } catch {
            continue;
          }

          let token0Symbol = 'LP', token1Symbol = '';
          let totalStaked = '0';

          // Get pair tokens
          try {
            const [t0, t1] = await Promise.all([
              rpcProvider.call(() => lpContract.token0(), `lp_token0_${lpToken}`, { retries: 2 }),
              rpcProvider.call(() => lpContract.token1(), `lp_token1_${lpToken}`, { retries: 2 }),
            ]);
            if (t0 && t1) {
              token0Symbol = getTokenSymbol(t0);
              token1Symbol = getTokenSymbol(t1);
            }
          } catch {
            // Single token staking
            try {
              const sym = await rpcProvider.call(() => lpContract.symbol(), `lp_symbol_${lpToken}`, { retries: 1 });
              token0Symbol = sym || 'LP';
            } catch {
              token0Symbol = 'LP';
            }
          }

          // Get total staked
          try {
            const staked = await rpcProvider.call(
              () => lpContract.balanceOf(CONTRACTS.FARMING),
              `farming_staked_${lpToken}`,
              { retries: 2, skipCache: forceRefresh }
            );
            if (staked) {
              totalStaked = ethers.formatEther(staked);
            }
          } catch {
            continue; // Skip pools where we can't get total staked
          }

          // Get user info if connected
          let userStaked = '0';
          let pendingReward = '0';
          let lpBalance = '0';

          if (address) {
            try {
              const userInfo = await rpcProvider.call(
                () => farmingContract.userInfo(pid, address),
                `farming_userInfo_${pid}_${address}`,
                { retries: 2, skipCache: forceRefresh }
              );
              if (userInfo) {
                userStaked = ethers.formatEther(userInfo.amount || 0);
              }
            } catch {}

            try {
              const pending = await rpcProvider.call(
                () => farmingContract.pendingReward(pid, address),
                `farming_pending_${pid}_${address}`,
                { retries: 2, skipCache: forceRefresh }
              );
              if (pending !== null) {
                pendingReward = ethers.formatEther(pending);
              }
            } catch {}

            try {
              const balance = await rpcProvider.call(
                () => lpContract.balanceOf(address),
                `farming_lpBalance_${lpToken}_${address}`,
                { retries: 2, skipCache: forceRefresh }
              );
              if (balance) {
                lpBalance = ethers.formatEther(balance);
              }
            } catch {}
          }

          // Calculate APR
          const rewardPerBlockNum = parseFloat(ethers.formatEther(rewardPerBlock || 0));
          const totalStakedNum = parseFloat(totalStaked) || 0.001;
          const allocPointNum = Number(poolInfo.allocPoint || 0);
          const totalAllocNum = Number(totalAllocPoint || 1);
          const blocksPerYear = 15768000; // ~2 sec blocks
          
          const poolShareOfRewards = totalAllocNum > 0 ? allocPointNum / totalAllocNum : 0;
          const poolRewardPerYear = rewardPerBlockNum * blocksPerYear * poolShareOfRewards;
          
          let apr = totalStakedNum > 0.001 
            ? (poolRewardPerYear / totalStakedNum) * 100 
            : poolRewardPerYear > 0 ? 9999 : 0;

          validPools.push({
            pid,
            lpToken,
            allocPoint: poolInfo.allocPoint,
            token0Symbol,
            token1Symbol,
            totalStaked,
            userStaked,
            pendingReward,
            apr: Math.min(apr, 99999),
            lpBalance,
          });
        } catch (e) {
          console.warn(`[useFarmingData] Failed to fetch pool ${pid}:`, e);
        }
      }

      // Sort by allocation points
      validPools.sort((a, b) => Number(b.allocPoint) - Number(a.allocPoint));

      if (!mountedRef.current) return;

      console.log('[useFarmingData] Valid pools fetched:', validPools.length);

      // Update cache
      farmingCache = {
        pools: validPools,
        stats: newStats,
        timestamp: Date.now(),
        poolCount,
      };

      setPools(validPools);
      setError(null);
      retryCountRef.current = 0;
      
    } catch (err: any) {
      console.error('[useFarmingData] Error:', err);
      // Keep previous data if available
      if (farmingCache) {
        setPools(farmingCache.pools);
        setStats(farmingCache.stats);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        initialFetchDone.current = true;
      }
      fetchingRef.current = false;
    }
  }, [address, pools.length]);

  // Deposit LP tokens
  const deposit = useCallback(async (pid: number, amount: string) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const amountWei = ethers.parseEther(amount);
    
    const tx = await farmingContract.deposit(pid, amountWei);
    await tx.wait();
    
    clearFarmingCache();
    await fetchData(true);
  }, [signer, fetchData]);

  // Withdraw LP tokens
  const withdraw = useCallback(async (pid: number, amount: string) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const amountWei = ethers.parseEther(amount);
    
    const tx = await farmingContract.withdraw(pid, amountWei);
    await tx.wait();
    
    clearFarmingCache();
    await fetchData(true);
  }, [signer, fetchData]);

  // Harvest rewards
  const harvest = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.harvest(pid);
    await tx.wait();
    
    clearFarmingCache();
    await fetchData(true);
  }, [signer, fetchData]);

  // Harvest all pools
  const harvestAll = useCallback(async () => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const poolsWithRewards = pools.filter(p => parseFloat(p.pendingReward) > 0);
    
    if (poolsWithRewards.length === 0) {
      throw new Error('No rewards to harvest');
    }

    for (const pool of poolsWithRewards) {
      const tx = await farmingContract.harvest(pool.pid);
      await tx.wait();
    }
    
    clearFarmingCache();
    await fetchData(true);
  }, [signer, pools, fetchData]);

  // Emergency withdraw
  const emergencyWithdraw = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.emergencyWithdraw(pid);
    await tx.wait();
    
    clearFarmingCache();
    await fetchData(true);
  }, [signer, fetchData]);

  // Admin: Add pool
  const addPool = useCallback(async (allocPoint: number, lpTokenAddress: string) => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.add(allocPoint, lpTokenAddress);
    await tx.wait();
    
    clearFarmingCache();
    await fetchData(true);
  }, [signer, isOwner, fetchData]);

  // Admin: Set pool allocation
  const setPoolAlloc = useCallback(async (pid: number, allocPoint: number) => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.set(pid, allocPoint);
    await tx.wait();
    
    clearFarmingCache();
    await fetchData(true);
  }, [signer, isOwner, fetchData]);

  // Admin: Pause
  const pause = useCallback(async () => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.pause();
    await tx.wait();
    
    clearFarmingCache();
    await fetchData(true);
  }, [signer, isOwner, fetchData]);

  // Admin: Unpause
  const unpause = useCallback(async () => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.unpause();
    await tx.wait();
    
    clearFarmingCache();
    await fetchData(true);
  }, [signer, isOwner, fetchData]);

  // Initial fetch and polling
  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    
    const interval = setInterval(() => fetchData(), 60000);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  // Refetch when address changes
  useEffect(() => {
    if (address) {
      clearFarmingCache();
      fetchData(true);
    }
  }, [address, fetchData]);

  return {
    pools,
    stats,
    loading,
    error,
    isOwner,
    refetch: () => {
      clearFarmingCache();
      fetchData(true);
    },
    deposit,
    withdraw,
    harvest,
    harvestAll,
    emergencyWithdraw,
    addPool,
    setPoolAlloc,
    pause,
    unpause,
  };
}
