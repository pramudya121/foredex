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

// Cache for token symbols fetched on-chain
const tokenSymbolCache = new Map<string, string>();

const getTokenSymbol = (tokenAddress: string): string => {
  if (!tokenAddress || tokenAddress === ethers.ZeroAddress) return 'UNKNOWN';
  
  const addr = tokenAddress.toLowerCase();
  
  // Check local cache first
  if (tokenSymbolCache.has(addr)) {
    return tokenSymbolCache.get(addr)!;
  }
  
  // Check TOKEN_LIST
  const token = TOKEN_LIST.find(
    t => t.address.toLowerCase() === addr
  );
  
  if (token?.symbol) {
    tokenSymbolCache.set(addr, token.symbol);
    return token.symbol;
  }
  
  // Return shortened address as fallback
  return tokenAddress.slice(0, 6) + '...' + tokenAddress.slice(-4);
};

// Async version that fetches from chain if needed
const getTokenSymbolAsync = async (tokenAddress: string, provider: ethers.Provider): Promise<string> => {
  if (!tokenAddress || tokenAddress === ethers.ZeroAddress) return 'UNKNOWN';
  
  const addr = tokenAddress.toLowerCase();
  
  // Check cache
  const cached = getTokenSymbol(tokenAddress);
  if (!cached.includes('...')) {
    return cached;
  }
  
  // Fetch from chain
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const symbol = await tokenContract.symbol();
    if (symbol) {
      tokenSymbolCache.set(addr, symbol);
      return symbol;
    }
  } catch {
    // Ignore fetch errors
  }
  
  return cached;
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
    
    // Check cache validity - use cache if valid
    if (!forceRefresh && farmingCache && Date.now() - farmingCache.timestamp < CACHE_TTL) {
      if (farmingCache.pools.length > 0 || farmingCache.stats) {
        setPools(farmingCache.pools);
        setStats(farmingCache.stats);
        return;
      }
    }

    fetchingRef.current = true;
    
    // Only show loading on initial fetch when no cached data
    if (!initialFetchDone.current && pools.length === 0 && !farmingCache?.pools.length) {
      setLoading(true);
    }
    
    try {
      setError(null);
      
      // Wait for provider to be ready
      let provider = rpcProvider.getProvider();
      let attempts = 0;
      while ((!provider || !rpcProvider.isAvailable()) && attempts < 5) {
        await new Promise(r => setTimeout(r, 1000));
        provider = rpcProvider.getProvider();
        attempts++;
      }
      
      if (!provider || !rpcProvider.isAvailable()) {
        console.warn('[useFarmingData] RPC not available after retries');
        // Use cached data if available
        if (farmingCache?.pools.length || farmingCache?.stats) {
          setPools(farmingCache.pools);
          setStats(farmingCache.stats);
        }
        fetchingRef.current = false;
        setLoading(false);
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

      // Fetch all pool info with improved retry logic and better error handling
      const fetchPool = async (pid: number, attempt = 1): Promise<PoolInfo | null> => {
        const maxAttempts = 3; // Reduced attempts for faster loading
        const delayMs = 400 * attempt; // Progressive delay
        
        try {
          // Direct contract call with timeout
          let poolInfo;
          try {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 8000)
            );
            poolInfo = await Promise.race([
              farmingContract.poolInfo(pid),
              timeoutPromise
            ]);
          } catch (e: any) {
            // Retry with delay on failure
            if (attempt < maxAttempts) {
              await new Promise(r => setTimeout(r, delayMs));
              return fetchPool(pid, attempt + 1);
            }
            // Return placeholder for failed pool instead of null
            console.warn(`[useFarmingData] Pool ${pid} failed, using placeholder`);
            return {
              pid,
              lpToken: ethers.ZeroAddress,
              allocPoint: BigInt(0),
              token0Symbol: `Pool ${pid}`,
              token1Symbol: '(Loading...)',
              totalStaked: '0',
              userStaked: '0',
              pendingReward: '0',
              apr: 0,
              lpBalance: '0',
            };
          }
          
          if (!poolInfo) {
            console.warn(`[useFarmingData] Pool ${pid} returned empty data`);
            return null;
          }
          
          const lpToken = poolInfo[0]; // lpToken is first element
          const allocPoint = poolInfo[1]; // allocPoint is second element
          
          // Skip invalid LP tokens
          if (!lpToken || lpToken === ethers.ZeroAddress) {
            console.warn(`[useFarmingData] Pool ${pid} has invalid lpToken: ${lpToken}`);
            return null;
          }

          const lpContract = new ethers.Contract(lpToken, [...PAIR_ABI, ...ERC20_ABI], provider);

          let token0Symbol = 'LP', token1Symbol = '';
          let totalStaked = '0';

          // Get pair tokens with fallback - try multiple approaches
          let isPairToken = false;
          
          try {
            // First try to get token0 and token1 (LP pair tokens) with timeout
            const pairPromise = Promise.all([
              lpContract.token0().catch(() => null),
              lpContract.token1().catch(() => null),
            ]);
            const timeoutPromise = new Promise<[null, null]>((resolve) => 
              setTimeout(() => resolve([null, null]), 5000)
            );
            
            const [t0, t1] = await Promise.race([pairPromise, timeoutPromise]);
            
            if (t0 && t1 && t0 !== ethers.ZeroAddress && t1 !== ethers.ZeroAddress) {
              isPairToken = true;
              // Use async version to fetch symbols if not in list
              const [sym0, sym1] = await Promise.all([
                getTokenSymbolAsync(t0, provider),
                getTokenSymbolAsync(t1, provider),
              ]);
              token0Symbol = sym0;
              token1Symbol = sym1;
            }
          } catch {
            // Not a pair token, continue to fallback
          }
          
          // If not a pair token, try to get LP token's own symbol
          if (!isPairToken) {
            try {
              const lpSymbol = await Promise.race([
                lpContract.symbol(),
                new Promise<string>((resolve) => setTimeout(() => resolve(''), 3000))
              ]);
              if (lpSymbol && lpSymbol !== 'UNI-V2') {
                token0Symbol = lpSymbol;
                token1Symbol = '';
              } else {
                // Try to get name as fallback
                try {
                  const lpName = await Promise.race([
                    lpContract.name(),
                    new Promise<string>((resolve) => setTimeout(() => resolve(''), 3000))
                  ]);
                  if (lpName) {
                    const match = lpName.match(/([A-Z0-9]+)[/-]([A-Z0-9]+)/i);
                    if (match) {
                      token0Symbol = match[1].toUpperCase();
                      token1Symbol = match[2].toUpperCase();
                    } else {
                      token0Symbol = lpName.slice(0, 10);
                    }
                  }
                } catch {
                  token0Symbol = 'LP-' + lpToken.slice(2, 6).toUpperCase();
                }
              }
            } catch {
              token0Symbol = 'LP-' + lpToken.slice(2, 6).toUpperCase();
            }
          }

          // Get total staked with timeout
          try {
            const staked = await Promise.race([
              lpContract.balanceOf(CONTRACTS.FARMING),
              new Promise<bigint>((resolve) => setTimeout(() => resolve(BigInt(0)), 3000))
            ]);
            if (staked) {
              totalStaked = ethers.formatEther(staked);
            }
          } catch {
            totalStaked = '0';
          }

          // Get user info if connected
          let userStaked = '0';
          let pendingReward = '0';
          let lpBalance = '0';

          if (address) {
            try {
              const userInfo = await Promise.race([
                farmingContract.userInfo(pid, address),
                new Promise((resolve) => setTimeout(() => resolve(null), 3000))
              ]);
              if (userInfo) {
                userStaked = ethers.formatEther(userInfo.amount || userInfo[0] || 0);
              }
            } catch {}

            try {
              const pending = await Promise.race([
                farmingContract.pendingReward(pid, address),
                new Promise((resolve) => setTimeout(() => resolve(null), 3000))
              ]);
              if (pending !== null) {
                pendingReward = ethers.formatEther(pending);
              }
            } catch {}

            try {
              const balance = await Promise.race([
                lpContract.balanceOf(address),
                new Promise((resolve) => setTimeout(() => resolve(null), 3000))
              ]);
              if (balance) {
                lpBalance = ethers.formatEther(balance);
              }
            } catch {}
          }

          // Calculate APR
          const rewardPerBlockNum = parseFloat(ethers.formatEther(rewardPerBlock || 0));
          const totalStakedNum = parseFloat(totalStaked) || 0.001;
          const allocPointNum = Number(allocPoint || 0);
          const totalAllocNum = Number(totalAllocPoint || 1);
          const blocksPerYear = 15768000; // ~2 sec blocks
          
          const poolShareOfRewards = totalAllocNum > 0 ? allocPointNum / totalAllocNum : 0;
          const poolRewardPerYear = rewardPerBlockNum * blocksPerYear * poolShareOfRewards;
          
          let apr = totalStakedNum > 0.001 
            ? (poolRewardPerYear / totalStakedNum) * 100 
            : poolRewardPerYear > 0 ? 9999 : 0;

          console.log(`[useFarmingData] Pool ${pid} fetched: ${token0Symbol}/${token1Symbol}, allocPoint: ${allocPointNum}`);

          return {
            pid,
            lpToken,
            allocPoint: allocPoint,
            token0Symbol,
            token1Symbol,
            totalStaked,
            userStaked,
            pendingReward,
            apr: Math.min(apr, 99999),
            lpBalance,
          };
        } catch (e) {
          console.warn(`[useFarmingData] Failed to fetch pool ${pid}:`, e);
          // Retry on failure
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, delayMs));
            return fetchPool(pid, attempt + 1);
          }
          // Return placeholder on final failure
          return {
            pid,
            lpToken: ethers.ZeroAddress,
            allocPoint: BigInt(0),
            token0Symbol: `Pool ${pid}`,
            token1Symbol: '(Unavailable)',
            totalStaked: '0',
            userStaked: '0',
            pendingReward: '0',
            apr: 0,
            lpBalance: '0',
          };
        }
      };

      // Fetch pools with staggered delays to avoid rate limiting
      const fetchPromises: Promise<PoolInfo | null>[] = [];
      for (let pid = 0; pid < poolCount; pid++) {
        // Stagger start times to reduce concurrent RPC load
        const startDelay = pid * 500; // 500ms between each pool start
        fetchPromises.push(
          new Promise(async (resolve) => {
            await new Promise(r => setTimeout(r, startDelay));
            const pool = await fetchPool(pid);
            resolve(pool);
          })
        );
      }
      
      const results = await Promise.all(fetchPromises);
      for (const pool of results) {
        if (pool && pool.lpToken !== ethers.ZeroAddress) {
          validPools.push(pool);
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
    
    // Clear cache and wait for blockchain to update before refetching
    clearFarmingCache();
    rpcProvider.clearCache();
    
    // Wait a bit for the blockchain state to propagate
    await new Promise(r => setTimeout(r, 2000));
    
    // Force multiple refetch attempts to ensure new pool appears
    await fetchData(true);
    await new Promise(r => setTimeout(r, 1000));
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
