import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, TOKEN_LIST } from '@/config/contracts';
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

const CACHE_TTL = 45000; // 45 seconds
let farmingCache: FarmingCache | null = null;

// Use centralized RPC provider
import { rpcProvider } from '@/lib/rpcProvider';

const getProvider = () => {
  return rpcProvider.getProvider();
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const initialFetchDone = useRef(false);

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
    
    // Only show loading on initial fetch, not refreshes
    if (!initialFetchDone.current && pools.length === 0) {
      setLoading(true);
    }
    
    try {
      setError(null);
      const provider = getProvider();
      if (!provider) {
        setError('RPC provider not available');
        return;
      }
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
      }, 3, 2000);

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

      // Fetch all pools in parallel with better error handling
      const poolCount = Number(contractInfo.poolLength);
      const poolPromises: Promise<PoolInfo | null>[] = [];

      for (let pid = 0; pid < poolCount; pid++) {
        poolPromises.push(
          (async () => {
            try {
              const poolInfo = await retry(() => farmingContract.poolInfo(pid), 2, 1000);
              const lpToken = poolInfo.lpToken;
              
              // Skip if LP token is zero address
              if (lpToken === ethers.ZeroAddress || !lpToken) {
                console.warn(`Pool ${pid} has invalid LP token address`);
                return null;
              }
              
              const lpContract = new ethers.Contract(lpToken, [...PAIR_ABI, ...ERC20_ABI], provider);

              let token0Symbol = 'LP', token1Symbol = '';
              let totalStaked = '0';
              let lpValid = true;

              // Verify LP token contract exists by checking code
              try {
                const code = await provider.getCode(lpToken);
                if (code === '0x' || code === '0x0') {
                  console.warn(`Pool ${pid} LP token contract doesn't exist at ${lpToken}`);
                  return null; // Skip this pool
                }
              } catch {
                console.warn(`Could not verify LP token contract for pool ${pid}`);
                return null;
              }

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

              // Get total staked - if this fails, the LP token is likely invalid
              try {
                const staked = await lpContract.balanceOf(CONTRACTS.FARMING);
                totalStaked = ethers.formatEther(staked);
              } catch (e) {
                console.warn(`Could not fetch total staked for pool ${pid}, skipping:`, e);
                return null; // Skip pools where we can't even get total staked
              }

              // Get user info if connected - with better error handling
              let userStaked = '0';
              let pendingReward = '0';
              let lpBalance = '0';

              if (address) {
                // Fetch user data separately with individual error handling
                try {
                  const userInfo = await farmingContract.userInfo(pid, address);
                  userStaked = ethers.formatEther(userInfo.amount);
                } catch (e) {
                  // Silent fail - user just has 0 staked
                  userStaked = '0';
                }

                try {
                  const pending = await farmingContract.pendingReward(pid, address);
                  pendingReward = ethers.formatEther(pending);
                } catch (e) {
                  // Silent fail - user just has 0 pending
                  pendingReward = '0';
                }

                try {
                  const balance = await lpContract.balanceOf(address);
                  lpBalance = ethers.formatEther(balance);
                } catch (e) {
                  // Silent fail - user just has 0 balance
                  lpBalance = '0';
                }
              }

              // Calculate APR with better handling
              const rewardPerBlockNum = parseFloat(ethers.formatEther(contractInfo.rewardPerBlock));
              const totalStakedNum = parseFloat(totalStaked) || 0.001; // Avoid division by 0
              const allocPointNum = Number(poolInfo.allocPoint);
              const totalAllocNum = Number(contractInfo.totalAllocPoint) || 1;
              const blocksPerYear = 15768000; // ~2 sec blocks
              
              // Calculate pool's share of rewards
              const poolShareOfRewards = totalAllocNum > 0 ? allocPointNum / totalAllocNum : 0;
              const poolRewardPerYear = rewardPerBlockNum * blocksPerYear * poolShareOfRewards;
              
              // APR = (rewards per year / total staked) * 100
              // If total staked is very low, cap APR to prevent absurd numbers
              let apr = totalStakedNum > 0.001 
                ? (poolRewardPerYear / totalStakedNum) * 100 
                : poolRewardPerYear > 0 ? 9999 : 0;

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
        setError('Network connection issue. Retrying...');
        // Keep previous data if available
        if (farmingCache) {
          setPools(farmingCache.pools);
          setStats(farmingCache.stats);
        }
        // Auto-retry after 5 seconds
        setTimeout(() => {
          if (mountedRef.current) {
            fetchingRef.current = false;
            fetchData(true);
          }
        }, 5000);
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
