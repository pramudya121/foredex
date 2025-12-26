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

// Helper to create provider with retry
const createProvider = () => {
  const network = {
    chainId: NEXUS_TESTNET.chainId,
    name: NEXUS_TESTNET.name,
  };
  
  return new ethers.JsonRpcProvider(
    NEXUS_TESTNET.rpcUrl,
    network,
    {
      staticNetwork: ethers.Network.from(network),
      batchMaxCount: 1,
    }
  );
};

// Retry wrapper for RPC calls
const retryCall = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
};

export function useFarmingData() {
  const { address, signer } = useWeb3();
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [stats, setStats] = useState<FarmingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
  const cachedPoolsRef = useRef<PoolInfo[]>([]);

  const getProvider = useCallback(() => {
    if (!providerRef.current) {
      providerRef.current = createProvider();
    }
    return providerRef.current;
  }, []);

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

      const provider = getProvider();
      const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, provider);

      // Fetch basic stats with retry
      const [rewardToken, rewardPerBlock, totalAllocPoint, startBlock, isPaused, poolLength, owner] = 
        await retryCall(() => Promise.all([
          farmingContract.rewardToken(),
          farmingContract.rewardPerBlock(),
          farmingContract.totalAllocPoint(),
          farmingContract.startBlock(),
          farmingContract.paused(),
          farmingContract.poolLength(),
          farmingContract.owner(),
        ]));

      // Check if current user is owner
      if (address) {
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
      }

      // Get reward token symbol
      let rewardTokenSymbol = 'FRDX';
      try {
        const rewardTokenContract = new ethers.Contract(rewardToken, ERC20_ABI, provider);
        rewardTokenSymbol = await retryCall(() => rewardTokenContract.symbol());
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
          const poolInfo = await retryCall(() => farmingContract.poolInfo(pid));
          const lpToken = poolInfo.lpToken;

          // Get LP token info
          const lpContract = new ethers.Contract(lpToken, [...PAIR_ABI, ...ERC20_ABI], provider);
          
          let token0Address = '', token1Address = '', token0Symbol = 'LP', token1Symbol = '';
          let totalStaked = '0';

          try {
            const [t0, t1] = await retryCall(() => Promise.all([
              lpContract.token0(),
              lpContract.token1(),
            ]));
            token0Address = t0;
            token1Address = t1;
            token0Symbol = getTokenSymbol(token0Address);
            token1Symbol = getTokenSymbol(token1Address);
            
            const stakedBalance = await retryCall(() => lpContract.balanceOf(CONTRACTS.FARMING));
            totalStaked = ethers.formatEther(stakedBalance);
          } catch {
            // Single token staking - try to get symbol
            try {
              token0Symbol = await retryCall(() => lpContract.symbol());
            } catch {
              // Check cached data for this pool
              const cachedPool = cachedPoolsRef.current.find(p => p.pid === pid);
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
              const [userInfo, pending, balance] = await retryCall(() => Promise.all([
                farmingContract.userInfo(pid, address),
                farmingContract.pendingReward(pid, address),
                lpContract.balanceOf(address),
              ]));
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
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.error(`Error fetching pool ${pid}:`, err);
          // Use cached pool data if available
          const cachedPool = cachedPoolsRef.current.find(p => p.pid === pid);
          if (cachedPool) {
            poolsData.push(cachedPool);
          }
        }
      }

      // Update cache
      cachedPoolsRef.current = poolsData;
      setPools(poolsData);
    } catch (err) {
      console.error('Error fetching farming data:', err);
      setError('Failed to load farming data. Please try again.');
      // Use cached data if available
      if (cachedPoolsRef.current.length > 0) {
        setPools(cachedPoolsRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, [address, getProvider]);

  // Contract write functions - using contract's actual function names
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
    return tx.wait();
  }, [signer, address, pools]);

  const withdraw = useCallback(async (pid: number, amount: string) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const amountWei = ethers.parseEther(amount);
    // Call withdraw function on contract
    const tx = await farmingContract.withdraw(pid, amountWei);
    return tx.wait();
  }, [signer]);

  const harvest = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    // Call harvest function on contract
    const tx = await farmingContract.harvest(pid);
    return tx.wait();
  }, [signer]);

  const harvestAll = useCallback(async () => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    const poolsWithRewards = pools.filter(p => parseFloat(p.pendingReward) > 0);
    
    for (const pool of poolsWithRewards) {
      const tx = await farmingContract.harvest(pool.pid);
      await tx.wait();
    }
  }, [signer, pools]);

  const emergencyWithdraw = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    // Call emergencyWithdraw function on contract
    const tx = await farmingContract.emergencyWithdraw(pid);
    return tx.wait();
  }, [signer]);

  // Admin functions
  const addPool = useCallback(async (allocPoint: number, lpTokenAddress: string) => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can add pools');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    // Call add function on contract
    const tx = await farmingContract.add(allocPoint, lpTokenAddress);
    return tx.wait();
  }, [signer, isOwner]);

  const setPoolAlloc = useCallback(async (pid: number, allocPoint: number) => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can modify pools');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    // Call set function on contract
    const tx = await farmingContract.set(pid, allocPoint);
    return tx.wait();
  }, [signer, isOwner]);

  const pause = useCallback(async () => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can pause');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    // Call pause function on contract
    const tx = await farmingContract.pause();
    return tx.wait();
  }, [signer, isOwner]);

  const unpause = useCallback(async () => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can unpause');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    // Call unpause function on contract
    const tx = await farmingContract.unpause();
    return tx.wait();
  }, [signer, isOwner]);

  const updatePool = useCallback(async (pid: number) => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can update pools');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    // Call updatePool function on contract
    const tx = await farmingContract.updatePool(pid);
    return tx.wait();
  }, [signer, isOwner]);

  const setPendingOwner = useCallback(async (newOwner: string) => {
    if (!signer) throw new Error('Wallet not connected');
    if (!isOwner) throw new Error('Only owner can set pending owner');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    // Call setPendingOwner function on contract
    const tx = await farmingContract.setPendingOwner(newOwner);
    return tx.wait();
  }, [signer, isOwner]);

  const acceptOwnership = useCallback(async () => {
    if (!signer) throw new Error('Wallet not connected');

    const farmingContract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
    // Call acceptOwnership function on contract
    const tx = await farmingContract.acceptOwnership();
    return tx.wait();
  }, [signer]);

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
    // User functions (matching contract)
    deposit,
    withdraw,
    harvest,
    harvestAll,
    emergencyWithdraw,
    // Admin functions (matching contract)
    addPool,
    setPoolAlloc,
    pause,
    unpause,
    updatePool,
    setPendingOwner,
    acceptOwnership,
  };
}
