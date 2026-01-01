import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FARMING_ABI } from '@/config/farmingAbi';
import { ERC20_ABI, PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';

export interface PoolInfo {
  pid: number;
  lpToken: string;
  allocPoint: bigint;
  lastRewardBlock: bigint;
  accRewardPerShare: bigint;
  token0Symbol: string;
  token1Symbol: string;
  token0Address: string;
  token1Address: string;
  totalStaked: string;
  userStaked: string;
  pendingReward: string;
  apr: number;
  lpBalance: string;
}

export interface FarmingStats {
  rewardToken: string;
  rewardTokenSymbol: string;
  rewardPerBlock: string;
  totalAllocPoint: bigint;
  startBlock: bigint;
  isPaused: boolean;
}

// Persistent cache for farming data
let farmingDataCache: {
  pools: PoolInfo[];
  stats: FarmingStats | null;
  timestamp: number;
} | null = null;

const CACHE_TTL = 30000; // 30 seconds

export function useFarmingData() {
  const { address, signer } = useWeb3();
  const [pools, setPools] = useState<PoolInfo[]>(() => farmingDataCache?.pools || []);
  const [stats, setStats] = useState<FarmingStats | null>(() => farmingDataCache?.stats || null);
  const [loading, setLoading] = useState(!farmingDataCache);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const isFetchingRef = useRef(false);

  const getTokenSymbol = (tokenAddress: string): string => {
    const token = TOKEN_LIST.find(
      t => t.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    return token?.symbol || tokenAddress.slice(0, 6) + '...';
  };

  const fetchFarmingData = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    
    // Check cache first
    if (farmingDataCache && Date.now() - farmingDataCache.timestamp < CACHE_TTL) {
      setPools(farmingDataCache.pools);
      setStats(farmingDataCache.stats);
      setLoading(false);
      return;
    }

    const provider = rpcProvider.getProvider();
    if (!provider || !rpcProvider.isAvailable()) {
      // Use cached data if RPC is not available
      if (farmingDataCache) {
        setPools(farmingDataCache.pools);
        setStats(farmingDataCache.stats);
      }
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    
    try {
      setLoading(pools.length === 0);
      setError(null);

      const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, provider);

      // Fetch basic stats with cache
      const [rewardToken, rewardPerBlock, totalAllocPoint, startBlock, isPaused, poolLength, owner] = await Promise.all([
        rpcProvider.call(() => farmingContract.rewardToken(), 'farming_rewardToken'),
        rpcProvider.call(() => farmingContract.rewardPerBlock(), 'farming_rewardPerBlock'),
        rpcProvider.call(() => farmingContract.totalAllocPoint(), 'farming_totalAllocPoint'),
        rpcProvider.call(() => farmingContract.startBlock(), 'farming_startBlock'),
        rpcProvider.call(() => farmingContract.paused(), 'farming_paused'),
        rpcProvider.call(() => farmingContract.poolLength(), 'farming_poolLength'),
        rpcProvider.call(() => farmingContract.owner(), 'farming_owner'),
      ]);

      // If any required data is missing, use cache
      if (!rewardToken || !rewardPerBlock || !poolLength) {
        if (farmingDataCache) {
          setPools(farmingDataCache.pools);
          setStats(farmingDataCache.stats);
        }
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Check if current user is owner
      if (address && owner) {
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
      }

      // Get reward token symbol
      let rewardTokenSymbol = 'FRDX';
      try {
        const rewardTokenContract = new ethers.Contract(rewardToken, ERC20_ABI, provider);
        const symbol = await rpcProvider.call(() => rewardTokenContract.symbol(), `token_symbol_${rewardToken}`);
        if (symbol) rewardTokenSymbol = symbol;
      } catch {
        // Use default
      }

      const newStats: FarmingStats = {
        rewardToken,
        rewardTokenSymbol,
        rewardPerBlock: ethers.formatEther(rewardPerBlock),
        totalAllocPoint: totalAllocPoint || BigInt(0),
        startBlock: startBlock || BigInt(0),
        isPaused: isPaused || false,
      };
      setStats(newStats);

      // Fetch all pools
      const poolCount = Number(poolLength);
      const poolsData: PoolInfo[] = [];

      for (let pid = 0; pid < poolCount; pid++) {
        try {
          const poolInfo = await rpcProvider.call(
            () => farmingContract.poolInfo(pid),
            `farming_poolInfo_${pid}`
          );
          
          if (!poolInfo) {
            // Use cached pool data if available
            const cachedPool = farmingDataCache?.pools.find(p => p.pid === pid);
            if (cachedPool) poolsData.push(cachedPool);
            continue;
          }
          
          const lpToken = poolInfo.lpToken;

          // Get LP token info
          const lpContract = new ethers.Contract(lpToken, [...PAIR_ABI, ...ERC20_ABI], provider);
          
          let token0Address = '', token1Address = '', token0Symbol = 'LP', token1Symbol = '';
          let totalStaked = '0';

          try {
            const [t0, t1] = await Promise.all([
              rpcProvider.call(() => lpContract.token0(), `lp_token0_${lpToken}`),
              rpcProvider.call(() => lpContract.token1(), `lp_token1_${lpToken}`),
            ]);
            
            if (t0 && t1) {
              token0Address = t0;
              token1Address = t1;
              token0Symbol = getTokenSymbol(token0Address);
              token1Symbol = getTokenSymbol(token1Address);
            }
            
            const stakedBalance = await rpcProvider.call(
              () => lpContract.balanceOf(CONTRACTS.FARMING),
              `lp_staked_${lpToken}`
            );
            if (stakedBalance) {
              totalStaked = ethers.formatEther(stakedBalance);
            }
          } catch {
            // Single token staking - try to get symbol
            try {
              const symbol = await rpcProvider.call(() => lpContract.symbol(), `lp_symbol_${lpToken}`);
              if (symbol) token0Symbol = symbol;
            } catch {
              // Use cached data
              const cachedPool = farmingDataCache?.pools.find(p => p.pid === pid);
              if (cachedPool) {
                token0Symbol = cachedPool.token0Symbol;
                token1Symbol = cachedPool.token1Symbol;
                token0Address = cachedPool.token0Address;
                token1Address = cachedPool.token1Address;
              }
            }
          }

          // Get user info if connected
          let userStaked = '0';
          let pendingReward = '0';
          let lpBalance = '0';

          if (address) {
            try {
              const [userInfo, pending, balance] = await Promise.all([
                rpcProvider.call(
                  () => farmingContract.userInfo(pid, address),
                  `farming_userInfo_${pid}_${address}`
                ),
                rpcProvider.call(
                  () => farmingContract.pendingReward(pid, address),
                  `farming_pending_${pid}_${address}`
                ),
                rpcProvider.call(
                  () => lpContract.balanceOf(address),
                  `lp_balance_${lpToken}_${address}`
                ),
              ]);
              
              if (userInfo) userStaked = ethers.formatEther(userInfo.amount);
              if (pending) pendingReward = ethers.formatEther(pending);
              if (balance) lpBalance = ethers.formatEther(balance);
            } catch {
              // Ignore user-specific errors
            }
          }

          // Calculate APR (simplified)
          const rewardPerBlockNum = parseFloat(ethers.formatEther(rewardPerBlock));
          const totalStakedNum = parseFloat(totalStaked) || 1;
          const allocPointNum = Number(poolInfo.allocPoint);
          const totalAllocNum = Number(totalAllocPoint) || 1;
          
          // Blocks per year (assuming 2 second blocks)
          const blocksPerYear = 15768000;
          const poolRewardPerYear = (rewardPerBlockNum * blocksPerYear * allocPointNum) / totalAllocNum;
          const apr = totalStakedNum > 0 ? (poolRewardPerYear / totalStakedNum) * 100 : 0;

          poolsData.push({
            pid,
            lpToken,
            allocPoint: poolInfo.allocPoint,
            lastRewardBlock: poolInfo.lastRewardBlock,
            accRewardPerShare: poolInfo.accRewardPerShare,
            token0Symbol,
            token1Symbol,
            token0Address,
            token1Address,
            totalStaked,
            userStaked,
            pendingReward,
            apr: Math.min(apr, 99999), // Cap at 99999%
            lpBalance,
          });

          // Small delay between pools to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`Error fetching pool ${pid}:`, err);
          // Use cached pool data if available
          const cachedPool = farmingDataCache?.pools.find(p => p.pid === pid);
          if (cachedPool) {
            poolsData.push(cachedPool);
          }
        }
      }

      // Update cache and state
      if (poolsData.length > 0) {
        farmingDataCache = {
          pools: poolsData,
          stats: newStats,
          timestamp: Date.now(),
        };
        setPools(poolsData);
      }
    } catch (err) {
      console.error('Error fetching farming data:', err);
      setError('Failed to load farming data. Please try again.');
      // Use cached data if available
      if (farmingDataCache) {
        setPools(farmingDataCache.pools);
        setStats(farmingDataCache.stats);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [address, pools.length]);

  // Contract write functions
  const deposit = useCallback(async (pid: number, amount: string) => {
    if (!signer || !address) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const pool = pools.find(p => p.pid === pid);
    if (!pool) throw new Error('Pool not found');

    const lpContract = new ethers.Contract(pool.lpToken, ERC20_ABI, signer);
    const amountWei = ethers.parseEther(amount);

    // Check allowance
    const allowance = await lpContract.allowance(address, CONTRACTS.FARMING);
    if (allowance < amountWei) {
      const approveTx = await lpContract.approve(CONTRACTS.FARMING, ethers.MaxUint256);
      await approveTx.wait();
    }

    // Call deposit function on contract
    const tx = await farmingContract.deposit(pid, amountWei);
    const receipt = await tx.wait();
    
    // Clear cache to refresh data
    farmingDataCache = null;
    
    return receipt;
  }, [signer, address, pools]);

  const withdraw = useCallback(async (pid: number, amount: string) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const amountWei = ethers.parseEther(amount);
    
    const tx = await farmingContract.withdraw(pid, amountWei);
    const receipt = await tx.wait();
    
    // Clear cache to refresh data
    farmingDataCache = null;
    
    return receipt;
  }, [signer]);

  const harvest = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.harvest(pid);
    const receipt = await tx.wait();
    
    // Clear cache to refresh data
    farmingDataCache = null;
    
    return receipt;
  }, [signer]);

  const harvestAll = useCallback(async () => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const poolsWithRewards = pools.filter(p => parseFloat(p.pendingReward) > 0);
    
    for (const pool of poolsWithRewards) {
      const tx = await farmingContract.harvest(pool.pid);
      await tx.wait();
    }
    
    // Clear cache to refresh data
    farmingDataCache = null;
  }, [signer, pools]);

  const emergencyWithdraw = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.emergencyWithdraw(pid);
    const receipt = await tx.wait();
    
    // Clear cache to refresh data
    farmingDataCache = null;
    
    return receipt;
  }, [signer]);

  // Admin functions
  const addPool = useCallback(async (allocPoint: number, lpTokenAddress: string) => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can add pools');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.add(allocPoint, lpTokenAddress);
    const receipt = await tx.wait();
    
    farmingDataCache = null;
    return receipt;
  }, [signer, isOwner]);

  const setPoolAlloc = useCallback(async (pid: number, allocPoint: number) => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can modify pools');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.set(pid, allocPoint);
    const receipt = await tx.wait();
    
    farmingDataCache = null;
    return receipt;
  }, [signer, isOwner]);

  const pause = useCallback(async () => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can pause');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.pause();
    const receipt = await tx.wait();
    
    farmingDataCache = null;
    return receipt;
  }, [signer, isOwner]);

  const unpause = useCallback(async () => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can unpause');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.unpause();
    const receipt = await tx.wait();
    
    farmingDataCache = null;
    return receipt;
  }, [signer, isOwner]);

  const updatePool = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can update pools');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.updatePool(pid);
    const receipt = await tx.wait();
    
    farmingDataCache = null;
    return receipt;
  }, [signer, isOwner]);

  const setPendingOwner = useCallback(async (newOwner: string) => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can set pending owner');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.setPendingOwner(newOwner);
    return tx.wait();
  }, [signer, isOwner]);

  const acceptOwnership = useCallback(async () => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.acceptOwnership();
    return tx.wait();
  }, [signer]);

  useEffect(() => {
    fetchFarmingData();
    const interval = setInterval(fetchFarmingData, 45000); // Refresh every 45 seconds
    return () => clearInterval(interval);
  }, [fetchFarmingData]);

  return {
    pools,
    stats,
    loading,
    error,
    isOwner,
    refetch: () => {
      farmingDataCache = null;
      fetchFarmingData();
    },
    // User functions
    deposit,
    withdraw,
    harvest,
    harvestAll,
    emergencyWithdraw,
    // Admin functions
    addPool,
    setPoolAlloc,
    pause,
    unpause,
    updatePool,
    setPendingOwner,
    acceptOwnership,
  };
}
