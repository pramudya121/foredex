import { useState, useEffect, useCallback } from 'react';
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

// Simple provider singleton
const getProvider = () => {
  return new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
};

const getTokenSymbol = (tokenAddress: string): string => {
  const token = TOKEN_LIST.find(
    t => t.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  return token?.symbol || tokenAddress.slice(0, 6) + '...';
};

export function useFarmingData() {
  const { address, signer } = useWeb3();
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [stats, setStats] = useState<FarmingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const provider = getProvider();
      const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, provider);

      // Fetch basic contract info
      const [rewardToken, rewardPerBlock, totalAllocPoint, isPaused, poolLength, owner] = await Promise.all([
        farmingContract.rewardToken(),
        farmingContract.rewardPerBlock(),
        farmingContract.totalAllocPoint(),
        farmingContract.paused(),
        farmingContract.poolLength(),
        farmingContract.owner(),
      ]);

      // Check owner status
      if (address) {
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
      }

      // Get reward token symbol
      let rewardTokenSymbol = 'FRDX';
      try {
        const rewardTokenContract = new ethers.Contract(rewardToken, ERC20_ABI, provider);
        rewardTokenSymbol = await rewardTokenContract.symbol();
      } catch {
        // Use default
      }

      setStats({
        rewardTokenSymbol,
        rewardPerBlock: ethers.formatEther(rewardPerBlock),
        totalAllocPoint: totalAllocPoint || BigInt(0),
        isPaused: isPaused || false,
      });

      // Fetch pools
      const poolCount = Number(poolLength);
      const poolsData: PoolInfo[] = [];

      for (let pid = 0; pid < poolCount; pid++) {
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
          const rewardPerBlockNum = parseFloat(ethers.formatEther(rewardPerBlock));
          const totalStakedNum = parseFloat(totalStaked) || 1;
          const allocPointNum = Number(poolInfo.allocPoint);
          const totalAllocNum = Number(totalAllocPoint) || 1;
          const blocksPerYear = 15768000; // ~2 sec blocks
          const poolRewardPerYear = (rewardPerBlockNum * blocksPerYear * allocPointNum) / totalAllocNum;
          const apr = totalStakedNum > 0 ? (poolRewardPerYear / totalStakedNum) * 100 : 0;

          poolsData.push({
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
          console.error(`Error fetching pool ${pid}:`, e);
        }
      }

      setPools(poolsData);
    } catch (err) {
      console.error('Error fetching farming data:', err);
      setError('Failed to load farming data');
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Deposit LP tokens (approval must be done first in UI)
  const deposit = useCallback(async (pid: number, amount: string) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const amountWei = ethers.parseEther(amount);
    
    const tx = await farmingContract.deposit(pid, amountWei);
    await tx.wait();
    
    // Refresh data
    await fetchData();
  }, [signer, fetchData]);

  // Withdraw LP tokens
  const withdraw = useCallback(async (pid: number, amount: string) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const amountWei = ethers.parseEther(amount);
    
    const tx = await farmingContract.withdraw(pid, amountWei);
    await tx.wait();
    
    await fetchData();
  }, [signer, fetchData]);

  // Harvest rewards
  const harvest = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.harvest(pid);
    await tx.wait();
    
    await fetchData();
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
    
    await fetchData();
  }, [signer, pools, fetchData]);

  // Emergency withdraw (no rewards)
  const emergencyWithdraw = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.emergencyWithdraw(pid);
    await tx.wait();
    
    await fetchData();
  }, [signer, fetchData]);

  // Admin: Add pool
  const addPool = useCallback(async (allocPoint: number, lpTokenAddress: string) => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.add(allocPoint, lpTokenAddress);
    await tx.wait();
    
    await fetchData();
  }, [signer, isOwner, fetchData]);

  // Admin: Set pool allocation
  const setPoolAlloc = useCallback(async (pid: number, allocPoint: number) => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.set(pid, allocPoint);
    await tx.wait();
    
    await fetchData();
  }, [signer, isOwner, fetchData]);

  // Admin: Pause
  const pause = useCallback(async () => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.pause();
    await tx.wait();
    
    await fetchData();
  }, [signer, isOwner, fetchData]);

  // Admin: Unpause
  const unpause = useCallback(async () => {
    if (!signer || !isOwner) throw new Error('Not authorized');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.unpause();
    await tx.wait();
    
    await fetchData();
  }, [signer, isOwner, fetchData]);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    pools,
    stats,
    loading,
    error,
    isOwner,
    refetch: fetchData,
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
