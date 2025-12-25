import { useState, useEffect, useCallback } from 'react';
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

export function useFarmingData() {
  const { address, signer } = useWeb3();
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [stats, setStats] = useState<FarmingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const getTokenSymbol = (tokenAddress: string): string => {
    const token = TOKEN_LIST.find(
      t => t.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    return token?.symbol || tokenAddress.slice(0, 6) + '...';
  };

  const fetchFarmingData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = rpcProvider.getProvider();
      const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, provider);

      // Fetch basic stats
      const [rewardToken, rewardPerBlock, totalAllocPoint, startBlock, isPaused, poolLength, owner] = 
        await Promise.all([
          farmingContract.rewardToken(),
          farmingContract.rewardPerBlock(),
          farmingContract.totalAllocPoint(),
          farmingContract.startBlock(),
          farmingContract.paused(),
          farmingContract.poolLength(),
          farmingContract.owner(),
        ]);

      // Check if current user is owner
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
        rewardToken,
        rewardTokenSymbol,
        rewardPerBlock: ethers.formatEther(rewardPerBlock),
        totalAllocPoint,
        startBlock,
        isPaused,
      });

      // Fetch all pools
      const poolCount = Number(poolLength);
      const poolsData: PoolInfo[] = [];

      for (let pid = 0; pid < poolCount; pid++) {
        try {
          const poolInfo = await farmingContract.poolInfo(pid);
          const lpToken = poolInfo.lpToken;

          // Get LP token info
          const lpContract = new ethers.Contract(lpToken, [...PAIR_ABI, ...ERC20_ABI], provider);
          
          let token0Address = '', token1Address = '', token0Symbol = 'LP', token1Symbol = '';
          let totalStaked = '0';

          try {
            [token0Address, token1Address] = await Promise.all([
              lpContract.token0(),
              lpContract.token1(),
            ]);
            token0Symbol = getTokenSymbol(token0Address);
            token1Symbol = getTokenSymbol(token1Address);
            
            const stakedBalance = await lpContract.balanceOf(CONTRACTS.FARMING);
            totalStaked = ethers.formatEther(stakedBalance);
          } catch {
            // Single token staking
            try {
              token0Symbol = await lpContract.symbol();
            } catch {
              token0Symbol = 'LP';
            }
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
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Error fetching pool ${pid}:`, err);
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

    const tx = await farmingContract.deposit(pid, amountWei);
    return tx.wait();
  }, [signer, address, pools]);

  const withdraw = useCallback(async (pid: number, amount: string) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const amountWei = ethers.parseEther(amount);
    const tx = await farmingContract.withdraw(pid, amountWei);
    return tx.wait();
  }, [signer]);

  const harvest = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.harvest(pid);
    return tx.wait();
  }, [signer]);

  const emergencyWithdraw = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.emergencyWithdraw(pid);
    return tx.wait();
  }, [signer]);

  // Admin functions
  const addPool = useCallback(async (allocPoint: number, lpTokenAddress: string) => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can add pools');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.add(allocPoint, lpTokenAddress);
    return tx.wait();
  }, [signer, isOwner]);

  const setPoolAlloc = useCallback(async (pid: number, allocPoint: number) => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can modify pools');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const tx = await farmingContract.set(pid, allocPoint);
    return tx.wait();
  }, [signer, isOwner]);

  useEffect(() => {
    fetchFarmingData();
    const interval = setInterval(fetchFarmingData, 30000);
    return () => clearInterval(interval);
  }, [fetchFarmingData]);

  return {
    pools,
    stats,
    loading,
    error,
    isOwner,
    refetch: fetchFarmingData,
    deposit,
    withdraw,
    harvest,
    emergencyWithdraw,
    addPool,
    setPoolAlloc,
  };
}
