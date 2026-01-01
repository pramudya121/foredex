import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FARMING_ABI } from '@/config/farmingAbi';
import { ERC20_ABI, PAIR_ABI } from '@/config/abis';

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
}

const CACHE_TTL = 30000; // 30 seconds
let farmingCache: FarmingCache | null = null;

// Singleton provider with connection reuse
let providerInstance: ethers.JsonRpcProvider | null = null;
const getProvider = () => {
  if (!providerInstance) {
    providerInstance = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl, undefined, {
      staticNetwork: true,
      batchMaxCount: 10,
    });
  }
  return providerInstance;
};

const getTokenSymbol = (tokenAddress: string): string => {
  const token = TOKEN_LIST.find(
    t => t.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  return token?.symbol || tokenAddress.slice(0, 6) + '...';
};

// Retry helper
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay * (i + 1)));
      }
    }
  }
  throw lastError;
}

export function useFarmingData() {
  const { address, signer } = useWeb3();
  const [pools, setPools] = useState<PoolInfo[]>(() => farmingCache?.pools || []);
  const [stats, setStats] = useState<FarmingStats | null>(() => farmingCache?.stats || null);
  const [loading, setLoading] = useState(!farmingCache || Date.now() - farmingCache.timestamp > CACHE_TTL);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    
    // Check cache validity
    if (!forceRefresh && farmingCache && Date.now() - farmingCache.timestamp < CACHE_TTL) {
      setPools(farmingCache.pools);
      setStats(farmingCache.stats);
      setLoading(false);
      return;
    }

    fetchingRef.current = true;
    
    try {
      setError(null);
      const provider = getProvider();
      const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, provider);

      // Fetch basic contract info with retry
      const contractInfo = await retry(async () => {
        const [rewardToken, rewardPerBlock, totalAllocPoint, isPaused, poolLength, owner] = await Promise.all([
          farmingContract.rewardToken(),
          farmingContract.rewardPerBlock(),
          farmingContract.totalAllocPoint(),
          farmingContract.paused(),
          farmingContract.poolLength(),
          farmingContract.owner(),
        ]);
        return { rewardToken, rewardPerBlock, totalAllocPoint, isPaused, poolLength, owner };
      });

      if (!mountedRef.current) return;

      // Check owner status
      if (address) {
        setIsOwner(contractInfo.owner.toLowerCase() === address.toLowerCase());
      }

      // Get reward token symbol
      let rewardTokenSymbol = 'FRDX';
      try {
        const rewardTokenContract = new ethers.Contract(contractInfo.rewardToken, ERC20_ABI, provider);
        rewardTokenSymbol = await rewardTokenContract.symbol();
      } catch {
        // Use default
      }

      const newStats: FarmingStats = {
        rewardTokenSymbol,
        rewardPerBlock: ethers.formatEther(contractInfo.rewardPerBlock),
        totalAllocPoint: contractInfo.totalAllocPoint || BigInt(0),
        isPaused: contractInfo.isPaused || false,
      };

      setStats(newStats);

      // Fetch all pools in parallel with batching
      const poolCount = Number(contractInfo.poolLength);
      const poolPromises: Promise<PoolInfo | null>[] = [];

      for (let pid = 0; pid < poolCount; pid++) {
        poolPromises.push(
          (async () => {
            try {
              const poolInfo = await farmingContract.poolInfo(pid);
              const lpToken = poolInfo.lpToken;
              const lpContract = new ethers.Contract(lpToken, [...PAIR_ABI, ...ERC20_ABI], provider);

              let token0Symbol = 'LP', token1Symbol = '';
              let totalStaked = '0';

              // Try to get pair tokens
              try {
                const [t0, t1] = await Promise.all([
                  lpContract.token0(),
                  lpContract.token1(),
                ]);
                token0Symbol = getTokenSymbol(t0);
                token1Symbol = getTokenSymbol(t1);
              } catch {
                // Single token staking
                try {
                  token0Symbol = await lpContract.symbol();
                } catch {
                  token0Symbol = 'LP';
                }
              }

              // Get total staked
              try {
                const staked = await lpContract.balanceOf(CONTRACTS.FARMING);
                totalStaked = ethers.formatEther(staked);
              } catch {
                totalStaked = '0';
              }

              // Get user info if connected
              let userStaked = '0';
              let pendingReward = '0';
              let lpBalance = '0';

              if (address) {
                try {
                  const [userInfo, pending, balance] = await Promise.all([
                    farmingContract.userInfo(pid, address),
                    farmingContract.pendingReward(pid, address),
                    lpContract.balanceOf(address),
                  ]);
                  userStaked = ethers.formatEther(userInfo.amount);
                  pendingReward = ethers.formatEther(pending);
                  lpBalance = ethers.formatEther(balance);
                } catch (e) {
                  console.warn(`Error fetching user info for pool ${pid}:`, e);
                }
              }

              // Calculate APR
              const rewardPerBlockNum = parseFloat(ethers.formatEther(contractInfo.rewardPerBlock));
              const totalStakedNum = parseFloat(totalStaked) || 1;
              const allocPointNum = Number(poolInfo.allocPoint);
              const totalAllocNum = Number(contractInfo.totalAllocPoint) || 1;
              const blocksPerYear = 15768000; // ~2 sec blocks
              const poolRewardPerYear = (rewardPerBlockNum * blocksPerYear * allocPointNum) / totalAllocNum;
              const apr = totalStakedNum > 0 ? (poolRewardPerYear / totalStakedNum) * 100 : 0;

              return {
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
              };
            } catch (e) {
              console.error(`Error fetching pool ${pid}:`, e);
              return null;
            }
          })()
        );
      }

      const poolResults = await Promise.all(poolPromises);
      const validPools = poolResults.filter((p): p is PoolInfo => p !== null);
      
      // Sort by allocation points (highest first)
      validPools.sort((a, b) => Number(b.allocPoint) - Number(a.allocPoint));

      if (!mountedRef.current) return;

      // Update cache
      farmingCache = {
        pools: validPools,
        stats: newStats,
        timestamp: Date.now(),
      };

      setPools(validPools);
      setError(null);
    } catch (err) {
      console.error('Error fetching farming data:', err);
      if (mountedRef.current) {
        setError('Failed to load farming data. Please try again.');
        // Keep previous data if available
        if (farmingCache) {
          setPools(farmingCache.pools);
          setStats(farmingCache.stats);
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [address]);

  // Deposit LP tokens
  const deposit = useCallback(async (pid: number, amount: string) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const amountWei = ethers.parseEther(amount);
    
    const tx = await farmingContract.deposit(pid, amountWei);
    await tx.wait();
    
    // Invalidate cache and refresh
    farmingCache = null;
    await fetchData(true);
  }, [signer, fetchData]);

  // Withdraw LP tokens
  const withdraw = useCallback(async (pid: number, amount: string) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const amountWei = ethers.parseEther(amount);
    
    const tx = await farmingContract.withdraw(pid, amountWei);
    await tx.wait();
    
    farmingCache = null;
    await fetchData(true);
  }, [signer, fetchData]);

  // Harvest rewards
  const harvest = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.harvest(pid);
    await tx.wait();
    
    farmingCache = null;
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

    // Harvest all pools in sequence to avoid nonce issues
    for (const pool of poolsWithRewards) {
      const tx = await farmingContract.harvest(pool.pid);
      await tx.wait();
    }
    
    farmingCache = null;
    await fetchData(true);
  }, [signer, pools, fetchData]);

  // Emergency withdraw
  const emergencyWithdraw = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.emergencyWithdraw(pid);
    await tx.wait();
    
    farmingCache = null;
    await fetchData(true);
  }, [signer, fetchData]);

  // Admin: Add pool
  const addPool = useCallback(async (allocPoint: number, lpTokenAddress: string) => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.add(allocPoint, lpTokenAddress);
    await tx.wait();
    
    farmingCache = null;
    await fetchData(true);
  }, [signer, isOwner, fetchData]);

  // Admin: Set pool allocation
  const setPoolAlloc = useCallback(async (pid: number, allocPoint: number) => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.set(pid, allocPoint);
    await tx.wait();
    
    farmingCache = null;
    await fetchData(true);
  }, [signer, isOwner, fetchData]);

  // Admin: Pause
  const pause = useCallback(async () => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.pause();
    await tx.wait();
    
    farmingCache = null;
    await fetchData(true);
  }, [signer, isOwner, fetchData]);

  // Admin: Unpause
  const unpause = useCallback(async () => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.unpause();
    await tx.wait();
    
    farmingCache = null;
    await fetchData(true);
  }, [signer, isOwner, fetchData]);

  // Initial fetch and polling
  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    
    // Refresh every 60 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 60000);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  // Refetch when address changes
  useEffect(() => {
    if (address) {
      farmingCache = null;
      fetchData(true);
    }
  }, [address, fetchData]);

  return {
    pools,
    stats,
    loading,
    error,
    isOwner,
    refetch: () => fetchData(true),
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
