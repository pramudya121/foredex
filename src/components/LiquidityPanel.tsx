// LiquidityPanel - Manages add/remove liquidity for DEX pools
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TokenSelect } from './TokenSelect';
import { SlippageSettings } from './SlippageSettings';
import { TokenLogo } from './TokenLogo';
import { BalanceRetryButton } from './BalanceRetryButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TOKEN_LIST, TokenInfo, CONTRACTS, TOKENS } from '@/config/contracts';
import { ROUTER_ABI, ERC20_ABI, PAIR_ABI } from '@/config/abis';
import { Plus, Minus, Loader2, Info, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  getReserves, 
  quote, 
  calculatePoolShare, 
  calculateRemoveLiquidity,
} from '@/lib/uniswapV2Library';
import { addTransaction, updateTransactionStatus } from './TransactionHistory';
import { useTokenPairBalances } from '@/hooks/useStableBalances';
import { rpcProvider } from '@/lib/rpcProvider';
import { clearPoolsTableCache } from './PoolsTable';

export function LiquidityPanel() {
  const { provider, signer, address, isConnected } = useWeb3();
  const [activeTab, setActiveTab] = useState('add');
  const [tokenA, setTokenA] = useState<TokenInfo | null>(TOKEN_LIST[0]);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(TOKEN_LIST[4]);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [lpBalance, setLpBalance] = useState('0');
  const [lpBalanceLoading, setLpBalanceLoading] = useState(false);
  const [lpToRemove, setLpToRemove] = useState('');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [approvingA, setApprovingA] = useState(false);
  const [approvingB, setApprovingB] = useState(false);
  const [approvalA, setApprovalA] = useState(false);
  const [approvalB, setApprovalB] = useState(false);
  const [pairAddress, setPairAddress] = useState<string | null>(null);
  const [poolShare, setPoolShare] = useState(0);
  const [slippage, setSlippage] = useState(0.5);
  const [deadline, setDeadline] = useState(20);
  const [reserves, setReserves] = useState<{ reserveA: bigint; reserveB: bigint }>({ reserveA: BigInt(0), reserveB: BigInt(0) });
  const [totalSupply, setTotalSupply] = useState(BigInt(0));
  const [removeAmounts, setRemoveAmounts] = useState<{ amountA: string; amountB: string }>({ amountA: '0', amountB: '0' });
  const [estimatedShare, setEstimatedShare] = useState(0);

  // Use stable balance hook
  const { balanceA, balanceB, loading: loadingBalances, error: balanceError, refetch: refetchBalances } = 
    useTokenPairBalances(address, tokenA, tokenB);

  const isNativeToken = (token: TokenInfo | null) =>
    token?.address === '0x0000000000000000000000000000000000000000';

  const getTokenAddress = (token: TokenInfo) =>
    isNativeToken(token) ? CONTRACTS.WETH : token.address;

  // Fetch pair info and LP balance with better error handling
  const fetchPairData = useCallback(async () => {
    if (!tokenA || !tokenB) {
      console.log('[LiquidityPanel] Missing token deps for fetchPairData');
      return;
    }

    const rpc = rpcProvider.getProvider();
    if (!rpc || !rpcProvider.isAvailable()) {
      console.warn('[LiquidityPanel] RPC not available for fetchPairData');
      return;
    }

    setLpBalanceLoading(true);
    console.log('[LiquidityPanel] Fetching pair data for:', tokenA.symbol, '/', tokenB.symbol);
    
    try {
      const tokenAAddr = getTokenAddress(tokenA);
      const tokenBAddr = getTokenAddress(tokenB);
      
      // Fetch pair address directly using rpcProvider
      const factory = new ethers.Contract(CONTRACTS.FACTORY, ['function getPair(address, address) view returns (address)'], rpc);
      
      const pairAddr = await rpcProvider.call(
        () => factory.getPair(tokenAAddr, tokenBAddr),
        `pair_${tokenAAddr}_${tokenBAddr}`,
        { retries: 3, timeout: 15000 }
      );
      
      console.log('[LiquidityPanel] Pair address result:', pairAddr);
      
      if (!pairAddr || pairAddr === ethers.ZeroAddress) {
        console.log('[LiquidityPanel] No pair found');
        setPairAddress(null);
        setLpBalance('0');
        setPoolShare(0);
        setReserves({ reserveA: BigInt(0), reserveB: BigInt(0) });
        setTotalSupply(BigInt(0));
        setLpBalanceLoading(false);
        return;
      }
      
      setPairAddress(pairAddr);
      console.log('[LiquidityPanel] Pair found:', pairAddr);
      
      // Fetch all pair data in parallel
      const pairContract = new ethers.Contract(pairAddr, PAIR_ABI, rpc);
      
      // Fetch reserves and token0 first (always needed)
      const [reservesResult, token0Result, supplyResult] = await Promise.all([
        rpcProvider.call(
          () => pairContract.getReserves(),
          `reserves_${pairAddr}`,
          { retries: 3, timeout: 15000, skipCache: true }
        ),
        rpcProvider.call(
          () => pairContract.token0(),
          `token0_${pairAddr}`,
          { retries: 2, timeout: 10000 }
        ),
        rpcProvider.call(
          () => pairContract.totalSupply(),
          `lp_supply_${pairAddr}`,
          { retries: 3, timeout: 15000, skipCache: true }
        )
      ]);
      
      // Process reserves
      if (reservesResult && token0Result) {
        const [reserve0, reserve1] = reservesResult;
        const [reserveA, reserveB] = tokenAAddr.toLowerCase() === token0Result.toLowerCase()
          ? [reserve0, reserve1]
          : [reserve1, reserve0];
        setReserves({ reserveA: BigInt(reserveA), reserveB: BigInt(reserveB) });
        console.log('[LiquidityPanel] Reserves set:', { reserveA: reserveA.toString(), reserveB: reserveB.toString() });
      } else if (reservesResult) {
        // Fallback if token0 fails
        setReserves({ reserveA: BigInt(reservesResult[0]), reserveB: BigInt(reservesResult[1]) });
      } else {
        setReserves({ reserveA: BigInt(0), reserveB: BigInt(0) });
      }

      // Process total supply
      const supply = supplyResult ? BigInt(supplyResult) : BigInt(0);
      setTotalSupply(supply);

      // Fetch LP balance only if address is connected
      if (address) {
        try {
          const lpBalResult = await rpcProvider.call(
            () => pairContract.balanceOf(address),
            `lp_balance_${pairAddr}_${address}`,
            { retries: 3, timeout: 15000, skipCache: true }
          );
          
          console.log('[LiquidityPanel] LP balance result:', lpBalResult?.toString());
          
          if (lpBalResult !== null && lpBalResult !== undefined) {
            const formatted = ethers.formatEther(lpBalResult);
            const parsed = parseFloat(formatted);
            console.log('[LiquidityPanel] LP balance formatted:', formatted);
            setLpBalance(isNaN(parsed) ? '0' : formatted);
            
            // Calculate pool share
            if (supply > BigInt(0)) {
              const share = calculatePoolShare(BigInt(lpBalResult), supply);
              setPoolShare(isNaN(share) ? 0 : share);
            } else {
              setPoolShare(0);
            }
          } else {
            console.warn('[LiquidityPanel] LP balance is null/undefined');
            setLpBalance('0');
            setPoolShare(0);
          }
        } catch (balanceError) {
          console.error('[LiquidityPanel] Error fetching LP balance:', balanceError);
          setLpBalance('0');
          setPoolShare(0);
        }
      } else {
        setLpBalance('0');
        setPoolShare(0);
      }
    } catch (error) {
      console.error('[LiquidityPanel] Error fetching pair data:', error);
      setPairAddress(null);
      setLpBalance('0');
      setPoolShare(0);
      setReserves({ reserveA: BigInt(0), reserveB: BigInt(0) });
      setTotalSupply(BigInt(0));
    } finally {
      setLpBalanceLoading(false);
    }
  }, [address, tokenA, tokenB]);

  // Threshold for "unlimited" approval - if allowance >= this, consider it approved
  const UNLIMITED_APPROVAL_THRESHOLD = ethers.MaxUint256 / BigInt(2);

  // Check token approvals - with smart caching for unlimited approvals
  const checkApprovals = useCallback(async () => {
    if (!address || !tokenA || !tokenB) {
      return;
    }

    // Native tokens don't need approval
    if (isNativeToken(tokenA)) {
      setApprovalA(true);
    }
    if (isNativeToken(tokenB)) {
      setApprovalB(true);
    }

    const rpc = rpcProvider.getProvider();
    if (!rpc || !rpcProvider.isAvailable()) {
      // If RPC not available, assume not approved to be safe
      if (!isNativeToken(tokenA)) setApprovalA(false);
      if (!isNativeToken(tokenB)) setApprovalB(false);
      return;
    }

    // Check amount A valid
    const hasAmountA = amountA && amountA.trim() !== '' && parseFloat(amountA) > 0;
    // Check amount B valid  
    const hasAmountB = amountB && amountB.trim() !== '' && parseFloat(amountB) > 0;

    try {
      // Check token A approval (skip if native token)
      if (!isNativeToken(tokenA)) {
        try {
          const tokenContract = new ethers.Contract(tokenA.address, ERC20_ABI, rpc);
          const allowance = await rpcProvider.call(
            () => tokenContract.allowance(address, CONTRACTS.ROUTER),
            `allowance_${tokenA.address}_${address}_router`,
            { retries: 2, timeout: 10000, skipCache: true }
          );
          
          if (allowance !== null) {
            const allowanceBigInt = BigInt(allowance);
            // If user has unlimited approval (MaxUint256), always approved
            if (allowanceBigInt >= UNLIMITED_APPROVAL_THRESHOLD) {
              setApprovalA(true);
            } else if (hasAmountA) {
              // Check against specific amount
              const amountAWei = ethers.parseUnits(amountA, tokenA.decimals);
              setApprovalA(allowanceBigInt >= amountAWei);
            } else {
              // No amount entered, check if has any significant allowance
              setApprovalA(allowanceBigInt > BigInt(0));
            }
          } else {
            setApprovalA(false);
          }
        } catch {
          setApprovalA(false);
        }
      }

      // Check token B approval (skip if native token)
      if (!isNativeToken(tokenB)) {
        try {
          const tokenContract = new ethers.Contract(tokenB.address, ERC20_ABI, rpc);
          const allowance = await rpcProvider.call(
            () => tokenContract.allowance(address, CONTRACTS.ROUTER),
            `allowance_${tokenB.address}_${address}_router`,
            { retries: 2, timeout: 10000, skipCache: true }
          );
          
          if (allowance !== null) {
            const allowanceBigInt = BigInt(allowance);
            // If user has unlimited approval (MaxUint256), always approved
            if (allowanceBigInt >= UNLIMITED_APPROVAL_THRESHOLD) {
              setApprovalB(true);
            } else if (hasAmountB) {
              // Check against specific amount
              const amountBWei = ethers.parseUnits(amountB, tokenB.decimals);
              setApprovalB(allowanceBigInt >= amountBWei);
            } else {
              // No amount entered, check if has any significant allowance
              setApprovalB(allowanceBigInt > BigInt(0));
            }
          } else {
            setApprovalB(false);
          }
        } catch {
          setApprovalB(false);
        }
      }
    } catch {
      // Silent fail on parse errors
    }
  }, [address, tokenA, tokenB, amountA, amountB]);

  useEffect(() => {
    checkApprovals();
  }, [checkApprovals]);

  const handleApproveTokenA = async () => {
    if (!signer || !tokenA || isNativeToken(tokenA)) return;
    
    setApprovingA(true);
    try {
      const tokenContract = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
      
      console.log('[LiquidityPanel] Approving token A:', tokenA.symbol);
      const tx = await tokenContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
      toast.info(`Approving ${tokenA.symbol}...`);
      
      const receipt = await tx.wait();
      console.log('[LiquidityPanel] Token A approved:', receipt.hash);
      
      toast.success(`${tokenA.symbol} approved!`);
      setApprovalA(true);
      
      // Re-check approvals after successful approval
      setTimeout(() => checkApprovals(), 1000);
    } catch (error: any) {
      console.error('[LiquidityPanel] Approve A error:', error);
      const errorMsg = rpcProvider.parseError(error, true);
      if (errorMsg) {
        toast.error(errorMsg);
      }
    } finally {
      setApprovingA(false);
    }
  };

  const handleApproveTokenB = async () => {
    if (!signer || !tokenB || isNativeToken(tokenB)) return;
    
    setApprovingB(true);
    try {
      const tokenContract = new ethers.Contract(tokenB.address, ERC20_ABI, signer);
      
      console.log('[LiquidityPanel] Approving token B:', tokenB.symbol);
      const tx = await tokenContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
      toast.info(`Approving ${tokenB.symbol}...`);
      
      const receipt = await tx.wait();
      console.log('[LiquidityPanel] Token B approved:', receipt.hash);
      
      toast.success(`${tokenB.symbol} approved!`);
      setApprovalB(true);
      
      // Re-check approvals after successful approval
      setTimeout(() => checkApprovals(), 1000);
    } catch (error: any) {
      console.error('[LiquidityPanel] Approve B error:', error);
      const errorMsg = rpcProvider.parseError(error, true);
      if (errorMsg) {
        toast.error(errorMsg);
      }
    } finally {
      setApprovingB(false);
    }
  };

  // Auto-calculate amountB when amountA changes (using library quote) with debounce
  useEffect(() => {
    // Validate input first
    if (!amountA || amountA.trim() === '') {
      setEstimatedShare(0);
      setAmountB('');
      setCalculating(false);
      return;
    }
    
    const amountNum = parseFloat(amountA);
    if (isNaN(amountNum) || amountNum <= 0) {
      setEstimatedShare(0);
      setAmountB('');
      setCalculating(false);
      return;
    }

    if (!tokenA || !tokenB) {
      setCalculating(false);
      return;
    }
    
    // Check if this is a new pool (no reserves)
    if (reserves.reserveA === BigInt(0) || reserves.reserveB === BigInt(0)) {
      // New pool - 100% share, allow user to set both amounts manually
      console.log('[LiquidityPanel] New pool detected, allowing manual input for both amounts');
      setEstimatedShare(100);
      setCalculating(false);
      return;
    }
    
    // Show calculating state
    setCalculating(true);
    
    // Debounce the calculation
    const timeout = setTimeout(() => {
      try {
        console.log('[LiquidityPanel] Calculating amountB for amountA:', amountA);
        console.log('[LiquidityPanel] Using reserves:', { 
          reserveA: reserves.reserveA.toString(), 
          reserveB: reserves.reserveB.toString() 
        });
        
        const amountAWei = ethers.parseUnits(amountA, tokenA.decimals);
        const amountBWei = quote(amountAWei, reserves.reserveA, reserves.reserveB);
        const formattedB = ethers.formatUnits(amountBWei, tokenB.decimals);
        const parsedB = parseFloat(formattedB);
        
        console.log('[LiquidityPanel] Calculated amountB:', formattedB);
        
        if (!isNaN(parsedB) && parsedB > 0) {
          // Format to reasonable precision
          const formatted = parsedB < 1 ? parsedB.toFixed(8) : parsedB.toFixed(6);
          setAmountB(formatted);
        } else {
          setAmountB('');
        }
        
        // Estimate pool share after adding liquidity
        if (reserves.reserveA > BigInt(0)) {
          const newTotalA = reserves.reserveA + amountAWei;
          const share = Number(amountAWei * BigInt(10000)) / Number(newTotalA) / 100;
          setEstimatedShare(isNaN(share) ? 0 : share);
        } else {
          setEstimatedShare(100);
        }
      } catch (err) {
        console.error('[LiquidityPanel] Quote calculation error:', err);
        setEstimatedShare(0);
        setAmountB('');
      } finally {
        setCalculating(false);
      }
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [amountA, reserves, tokenA, tokenB]);

  // Calculate expected amounts when removing liquidity
  useEffect(() => {
    if (!lpToRemove || !tokenA || !tokenB || totalSupply === BigInt(0)) {
      setRemoveAmounts({ amountA: '0', amountB: '0' });
      return;
    }
    
    try {
      const lpWei = ethers.parseUnits(lpToRemove, 18);
      const { amountA: outA, amountB: outB } = calculateRemoveLiquidity(
        lpWei, 
        reserves.reserveA, 
        reserves.reserveB, 
        totalSupply
      );
      
      setRemoveAmounts({
        amountA: ethers.formatUnits(outA, tokenA.decimals),
        amountB: ethers.formatUnits(outB, tokenB.decimals)
      });
    } catch {
      setRemoveAmounts({ amountA: '0', amountB: '0' });
    }
  }, [lpToRemove, reserves, totalSupply, tokenA, tokenB]);

  // Refetch pair data when tokens change or tab switches to remove
  useEffect(() => {
    fetchPairData();
  }, [fetchPairData]);

  // Refresh LP balance when switching to remove tab
  useEffect(() => {
    if (activeTab === 'remove' && tokenA && tokenB) {
      fetchPairData();
    }
  }, [activeTab, tokenA, tokenB, fetchPairData]);

  // Reset approvals when tokens change
  useEffect(() => {
    if (tokenA) {
      if (isNativeToken(tokenA)) {
        setApprovalA(true);
      } else {
        // Will be checked by checkApprovals
      }
    }
  }, [tokenA]);

  useEffect(() => {
    if (tokenB) {
      if (isNativeToken(tokenB)) {
        setApprovalB(true);
      } else {
        // Will be checked by checkApprovals
      }
    }
  }, [tokenB]);

  const handleAddLiquidity = async () => {
    if (!signer || !tokenA || !tokenB || !amountA || !amountB || !provider) return;

    setLoading(true);
    try {
      const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
      const amountAWei = ethers.parseUnits(amountA, tokenA.decimals);
      const amountBWei = ethers.parseUnits(amountB, tokenB.decimals);
      
      // Use block timestamp to avoid clock sync issues
      const block = await provider.getBlock('latest');
      const txDeadline = (block?.timestamp || Math.floor(Date.now() / 1000)) + 60 * deadline;
      
      // Calculate minimum amounts with slippage
      const amountAMin = amountAWei * BigInt(Math.floor((100 - slippage) * 100)) / BigInt(10000);
      const amountBMin = amountBWei * BigInt(Math.floor((100 - slippage) * 100)) / BigInt(10000);

      let tx;
      if (isNativeToken(tokenA)) {
        tx = await router.addLiquidityETH(
          getTokenAddress(tokenB),
          amountBWei,
          amountBMin,
          amountAMin,
          address,
          txDeadline,
          { value: amountAWei }
        );
      } else if (isNativeToken(tokenB)) {
        tx = await router.addLiquidityETH(
          getTokenAddress(tokenA),
          amountAWei,
          amountAMin,
          amountBMin,
          address,
          txDeadline,
          { value: amountBWei }
        );
      } else {
        tx = await router.addLiquidity(
          getTokenAddress(tokenA),
          getTokenAddress(tokenB),
          amountAWei,
          amountBWei,
          amountAMin,
          amountBMin,
          address,
          txDeadline
        );
      }

      // Track transaction
      addTransaction(address, {
        hash: tx.hash,
        type: 'add_liquidity',
        description: `Add ${amountA} ${tokenA.symbol} + ${parseFloat(amountB).toFixed(4)} ${tokenB.symbol}`,
        timestamp: Date.now(),
        status: 'pending',
      });

      toast.info('Transaction submitted...');
      const receipt = await tx.wait();
      updateTransactionStatus(address, tx.hash, 'confirmed');
      toast.success(`Liquidity added! TX: ${receipt.hash.slice(0, 10)}...`);
      
      // Clear pools cache so new pool shows up
      clearPoolsTableCache();
      
      setAmountA('');
      setAmountB('');
      
      // Force refresh balances after transaction
      setTimeout(() => {
        refetchBalances();
        fetchPairData();
      }, 2000);
    } catch (error: any) {
      // Use rpcProvider to parse user-friendly error messages
      const errorMsg = rpcProvider.parseError(error, true);
      if (errorMsg) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!signer || !tokenA || !tokenB || !lpToRemove || !pairAddress || !provider || !address) return;

    // Validate LP amount
    const lpAmount = parseFloat(lpToRemove);
    const userLpBalance = parseFloat(lpBalance);
    if (isNaN(lpAmount) || lpAmount <= 0) {
      toast.error('Please enter a valid LP amount');
      return;
    }
    if (lpAmount > userLpBalance) {
      toast.error('Insufficient LP balance');
      return;
    }

    setLoading(true);
    try {
      const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
      const lpWei = ethers.parseUnits(lpToRemove, 18);
      
      // Use block timestamp to avoid clock sync issues
      const block = await provider.getBlock('latest');
      const txDeadline = BigInt((block?.timestamp || Math.floor(Date.now() / 1000)) + 60 * deadline);

      // Check and approve LP tokens if needed
      const pairContract = new ethers.Contract(pairAddress, ERC20_ABI, signer);
      
      console.log('[LiquidityPanel] Checking LP token allowance...');
      const allowance = await pairContract.allowance(address, CONTRACTS.ROUTER);
      console.log('[LiquidityPanel] LP allowance:', allowance.toString(), 'needed:', lpWei.toString());
      
      if (BigInt(allowance) < lpWei) {
        console.log('[LiquidityPanel] Approving LP tokens...');
        toast.info('Approving LP tokens...');
        const approveTx = await pairContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
        await approveTx.wait();
        toast.success('LP tokens approved!');
      }

      // Determine token addresses - need to match pair's token0/token1 order
      const tokenAAddr = getTokenAddress(tokenA);
      const tokenBAddr = getTokenAddress(tokenB);
      
      // Calculate minimum amounts with slippage tolerance
      const slippageMultiplier = BigInt(Math.floor((100 - slippage) * 100));
      const amountAMin = (reserves.reserveA * lpWei / totalSupply) * slippageMultiplier / BigInt(10000);
      const amountBMin = (reserves.reserveB * lpWei / totalSupply) * slippageMultiplier / BigInt(10000);

      let tx;
      console.log('[LiquidityPanel] Removing liquidity...', {
        tokenA: tokenA.symbol,
        tokenB: tokenB.symbol,
        lpWei: lpWei.toString(),
        isNativeA: isNativeToken(tokenA),
        isNativeB: isNativeToken(tokenB)
      });

      if (isNativeToken(tokenA)) {
        // Token A is native (ETH/NEX), Token B is ERC20
        // removeLiquidityETH(token, liquidity, amountTokenMin, amountETHMin, to, deadline)
        console.log('[LiquidityPanel] Using removeLiquidityETH with token:', tokenBAddr);
        tx = await router.removeLiquidityETH(
          tokenBAddr,    // ERC20 token address
          lpWei,         // liquidity amount
          amountBMin,    // amountTokenMin (for the ERC20)
          amountAMin,    // amountETHMin (for native token)
          address,       // recipient
          txDeadline     // deadline
        );
      } else if (isNativeToken(tokenB)) {
        // Token B is native (ETH/NEX), Token A is ERC20
        console.log('[LiquidityPanel] Using removeLiquidityETH with token:', tokenAAddr);
        tx = await router.removeLiquidityETH(
          tokenAAddr,    // ERC20 token address
          lpWei,         // liquidity amount
          amountAMin,    // amountTokenMin (for the ERC20)
          amountBMin,    // amountETHMin (for native token)
          address,       // recipient
          txDeadline     // deadline
        );
      } else {
        // Both are ERC20 tokens
        console.log('[LiquidityPanel] Using removeLiquidity');
        tx = await router.removeLiquidity(
          tokenAAddr,
          tokenBAddr,
          lpWei,
          amountAMin,
          amountBMin,
          address,
          txDeadline
        );
      }

      // Track transaction
      addTransaction(address, {
        hash: tx.hash,
        type: 'remove_liquidity',
        description: `Remove ${parseFloat(lpToRemove).toFixed(4)} LP (${tokenA.symbol}/${tokenB.symbol})`,
        timestamp: Date.now(),
        status: 'pending',
      });

      toast.info('Transaction submitted...');
      const receipt = await tx.wait();
      updateTransactionStatus(address, tx.hash, 'confirmed');
      toast.success(`Liquidity removed! TX: ${receipt.hash.slice(0, 10)}...`);
      
      setLpToRemove('');
      
      // Refresh data immediately and after delay
      fetchPairData();
      refetchBalances();
      setTimeout(() => {
        refetchBalances();
        fetchPairData();
      }, 3000);
    } catch (error: any) {
      console.error('[LiquidityPanel] Remove liquidity error:', error);
      // Use rpcProvider to parse user-friendly error messages
      const errorMsg = rpcProvider.parseError(error, true);
      toast.error(errorMsg || 'Failed to remove liquidity');
    } finally {
      setLoading(false);
    }
  };

  const handleMaxLp = () => {
    if (lpBalance && parseFloat(lpBalance) > 0) {
      setLpToRemove(lpBalance);
    }
  };

  return (
    <div className="glass-card p-4 sm:p-6 w-full max-w-md mx-auto animate-fade-in animated-border">
      {/* Header with Settings */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-base sm:text-lg font-semibold">Manage Liquidity</h2>
        <SlippageSettings
          slippage={slippage}
          onSlippageChange={setSlippage}
          deadline={deadline}
          onDeadlineChange={setDeadline}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
          <TabsTrigger value="add" className="gap-1.5 sm:gap-2 text-sm touch-manipulation">
            <Plus className="w-4 h-4" />
            Add
          </TabsTrigger>
          <TabsTrigger value="remove" className="gap-1.5 sm:gap-2 text-sm touch-manipulation">
            <Minus className="w-4 h-4" />
            Remove
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-4">
          {/* Token A */}
          <div className="token-input p-4">
            <div className="flex justify-between mb-3 items-center">
              <span className="text-sm text-muted-foreground font-medium">Token A</span>
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="hidden sm:inline">Balance:</span>
                <span className="sm:hidden">Bal:</span>
                {loadingBalances ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <span className="font-medium text-foreground">{parseFloat(balanceA || '0').toFixed(4)}</span>
                )}
                <BalanceRetryButton onRetry={refetchBalances} loading={loadingBalances} />
                {parseFloat(balanceA || '0') > 0 && (
                  <button
                    onClick={() => setAmountA(balanceA)}
                    className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
                  >
                    MAX
                  </button>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                className="flex-1 text-xl sm:text-2xl font-bold bg-transparent border-none p-0 h-10 focus-visible:ring-0"
              />
              <TokenSelect selected={tokenA} onSelect={setTokenA} excludeToken={tokenB} />
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-border">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          {/* Token B */}
          <div className="token-input p-4">
            <div className="flex justify-between mb-3 items-center">
              <span className="text-sm text-muted-foreground font-medium">Token B</span>
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="hidden sm:inline">Balance:</span>
                <span className="sm:hidden">Bal:</span>
                {loadingBalances ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <span className="font-medium text-foreground">{parseFloat(balanceB || '0').toFixed(4)}</span>
                )}
                <BalanceRetryButton onRetry={refetchBalances} loading={loadingBalances} />
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={calculating ? '' : amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  className="flex-1 text-xl sm:text-2xl font-bold bg-transparent border-none p-0 h-10 focus-visible:ring-0"
                  readOnly={reserves.reserveA > BigInt(0)}
                />
                {calculating && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs hidden sm:inline">Calculating...</span>
                  </div>
                )}
              </div>
              <TokenSelect selected={tokenB} onSelect={setTokenB} excludeToken={tokenA} />
            </div>
          </div>

          {/* Balance Error Alert */}
          {balanceError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-destructive">{balanceError}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={refetchBalances}
                className="ml-auto h-7 text-xs"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Pool Info */}
          {pairAddress && tokenA && tokenB && (
            <div className="p-2.5 sm:p-3 rounded-lg bg-muted/30 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5 sm:mb-2">
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Pool Info</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground truncate">Reserve {tokenA.symbol}</span>
                <span className="font-mono">{ethers.formatUnits(reserves.reserveA, tokenA.decimals).slice(0, 10)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground truncate">Reserve {tokenB.symbol}</span>
                <span className="font-mono">{ethers.formatUnits(reserves.reserveB, tokenB.decimals).slice(0, 10)}</span>
              </div>
              {amountA && estimatedShare > 0 && (
                <div className="flex justify-between text-primary gap-2">
                  <span>Est. Pool Share</span>
                  <span>{estimatedShare.toFixed(2)}%</span>
                </div>
              )}
            </div>
          )}

          {!pairAddress && tokenA && tokenB && amountA && amountB && (
            <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10 border border-primary/30 text-xs sm:text-sm">
              <p className="text-primary font-medium">New Pool</p>
              <p className="text-muted-foreground">You will be the first liquidity provider.</p>
            </div>
          )}

          {isConnected ? (
            <div className="space-y-2">
              {/* Approve Token A Button */}
              {!isNativeToken(tokenA) && !approvalA && amountA && parseFloat(amountA) > 0 && (
                <Button
                  onClick={handleApproveTokenA}
                  disabled={approvingA}
                  className="w-full h-12 sm:h-14 text-base font-semibold"
                  variant="outline"
                >
                  {approvingA ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving {tokenA?.symbol}...
                    </>
                  ) : (
                    <>Approve {tokenA?.symbol}</>
                  )}
                </Button>
              )}

              {/* Approve Token B Button */}
              {!isNativeToken(tokenB) && !approvalB && amountB && parseFloat(amountB) > 0 && (
                <Button
                  onClick={handleApproveTokenB}
                  disabled={approvingB}
                  className="w-full h-12 sm:h-14 text-base font-semibold"
                  variant="outline"
                >
                  {approvingB ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving {tokenB?.symbol}...
                    </>
                  ) : (
                    <>Approve {tokenB?.symbol}</>
                  )}
                </Button>
              )}

              {/* Add Liquidity Button */}
              <Button
                onClick={handleAddLiquidity}
                disabled={loading || !amountA || !amountB || (!isNativeToken(tokenA) && !approvalA) || (!isNativeToken(tokenB) && !approvalB)}
                className={cn(
                  'w-full h-12 sm:h-14 text-base sm:text-lg font-semibold btn-glow touch-manipulation',
                  'bg-gradient-wolf hover:opacity-90'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Liquidity'
                )}
              </Button>
            </div>
          ) : (
            <Button disabled className="w-full h-12 sm:h-14 touch-manipulation" variant="secondary">
              Connect Wallet
            </Button>
          )}
        </TabsContent>

        <TabsContent value="remove" className="space-y-3 sm:space-y-4">
          {/* Token Selection for Remove */}
          <div className="flex gap-2 mb-3 sm:mb-4">
            <TokenSelect selected={tokenA} onSelect={setTokenA} excludeToken={tokenB} className="flex-1" />
            <TokenSelect selected={tokenB} onSelect={setTokenB} excludeToken={tokenA} className="flex-1" />
          </div>

          {/* LP Balance Display Card */}
          <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Your LP Balance</span>
              <BalanceRetryButton onRetry={fetchPairData} loading={lpBalanceLoading} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  <TokenLogo symbol={tokenA?.symbol || ''} logoURI={tokenA?.logoURI} size="sm" />
                  <TokenLogo symbol={tokenB?.symbol || ''} logoURI={tokenB?.logoURI} size="sm" />
                </div>
                <span className="text-sm font-medium">{tokenA?.symbol}/{tokenB?.symbol} LP</span>
              </div>
              {lpBalanceLoading ? (
                <span className="text-lg font-bold animate-pulse">...</span>
              ) : (
                <span className="text-lg font-bold">{parseFloat(lpBalance).toFixed(6)}</span>
              )}
            </div>
            {poolShare > 0 && (
              <div className="text-xs text-muted-foreground mt-1 text-right">
                Pool share: {poolShare.toFixed(2)}%
              </div>
            )}
          </div>

          {/* LP Tokens to Remove Input */}
          <div className="token-input p-4">
            <div className="flex justify-between mb-3 items-center flex-wrap gap-2">
              <span className="text-sm text-muted-foreground font-medium">Amount to Remove</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Available: {lpBalanceLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    <span className="font-medium text-foreground">{parseFloat(lpBalance).toFixed(6)}</span>
                  )}
                </span>
                {parseFloat(lpBalance) > 0 && (
                  <button
                    onClick={handleMaxLp}
                    className="px-2.5 py-1 rounded bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.0"
              value={lpToRemove}
              onChange={(e) => setLpToRemove(e.target.value)}
              className="text-xl sm:text-2xl font-bold bg-transparent border-none focus-visible:ring-0 p-0 h-10"
            />
            
            {/* Quick percentage buttons */}
            {parseFloat(lpBalance) > 0 && (
              <div className="flex gap-2 mt-3">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setLpToRemove((parseFloat(lpBalance) * pct / 100).toString())}
                    className={cn(
                      'flex-1 py-1.5 rounded text-xs font-medium transition-colors',
                      lpToRemove && parseFloat(lpToRemove) === parseFloat(lpBalance) * pct / 100
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expected output */}
          {lpToRemove && parseFloat(lpToRemove) > 0 && pairAddress && (
            <div className="p-3 sm:p-4 rounded-lg bg-muted/30 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>You will receive</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <TokenLogo symbol={tokenA?.symbol || ''} logoURI={tokenA?.logoURI} size="sm" />
                  <span className="truncate font-medium">{tokenA?.symbol}</span>
                </div>
                <span className="font-mono font-semibold">{parseFloat(removeAmounts.amountA).toFixed(6)}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <TokenLogo symbol={tokenB?.symbol || ''} logoURI={tokenB?.logoURI} size="sm" />
                  <span className="truncate font-medium">{tokenB?.symbol}</span>
                </div>
                <span className="font-mono font-semibold">{parseFloat(removeAmounts.amountB).toFixed(6)}</span>
              </div>
            </div>
          )}

          {!pairAddress && tokenA && tokenB && (
            <div className="p-4 rounded-lg bg-muted/30 text-center text-muted-foreground text-sm">
              No pool exists for this pair
            </div>
          )}

          {isConnected ? (
            <Button
              onClick={handleRemoveLiquidity}
              disabled={loading || !lpToRemove || !pairAddress || parseFloat(lpToRemove) === 0 || parseFloat(lpToRemove) > parseFloat(lpBalance)}
              className={cn(
                'w-full h-12 sm:h-14 text-base sm:text-lg font-semibold touch-manipulation',
                'bg-destructive hover:bg-destructive/90'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  Removing...
                </>
              ) : parseFloat(lpToRemove) > parseFloat(lpBalance) ? (
                'Insufficient LP Balance'
              ) : (
                'Remove Liquidity'
              )}
            </Button>
          ) : (
            <Button disabled className="w-full h-12 sm:h-14 touch-manipulation" variant="secondary">
              Connect Wallet
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
