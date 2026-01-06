// LiquidityPanel - Manages add/remove liquidity for DEX pools
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TokenSelect } from './TokenSelect';
import { SlippageSettings } from './SlippageSettings';
import { TokenLogo } from './TokenLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TOKEN_LIST, TokenInfo, CONTRACTS, TOKENS } from '@/config/contracts';
import { ROUTER_ABI, ERC20_ABI, PAIR_ABI } from '@/config/abis';
import { Plus, Minus, Loader2, Info } from 'lucide-react';
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
  const { balanceA, balanceB, loading: loadingBalances, refetch: refetchBalances } = 
    useTokenPairBalances(address, tokenA, tokenB);

  const isNativeToken = (token: TokenInfo | null) =>
    token?.address === '0x0000000000000000000000000000000000000000';

  const getTokenAddress = (token: TokenInfo) =>
    isNativeToken(token) ? CONTRACTS.WETH : token.address;

  // Fetch pair info and LP balance with better error handling
  const fetchPairData = useCallback(async () => {
    if (!provider || !address || !tokenA || !tokenB) return;

    try {
      const tokenAAddr = getTokenAddress(tokenA);
      const tokenBAddr = getTokenAddress(tokenB);
      
      let reserveData;
      try {
        reserveData = await getReserves(provider, tokenAAddr, tokenBAddr);
      } catch {
        // Silent fail - pool may not exist
        setPairAddress(null);
        setLpBalance('0');
        setPoolShare(0);
        setReserves({ reserveA: BigInt(0), reserveB: BigInt(0) });
        setTotalSupply(BigInt(0));
        return;
      }
      
      const { reserveA, reserveB, pairAddress: pair } = reserveData;
      
      if (pair && pair !== ethers.ZeroAddress) {
        setPairAddress(pair);
        setReserves({ reserveA, reserveB });
        
        // Use rpcProvider for LP balance fetch
        const rpc = rpcProvider.getProvider();
        if (rpc && rpcProvider.isAvailable()) {
          try {
            const pairContract = new ethers.Contract(pair, PAIR_ABI, rpc);
            
            const lpBal = await rpcProvider.call(
              () => pairContract.balanceOf(address),
              `lp_balance_${pair}_${address}`
            );
            
            const supply = await rpcProvider.call(
              () => pairContract.totalSupply(),
              `lp_supply_${pair}`
            );
            
            if (lpBal !== null) {
              const formatted = ethers.formatEther(lpBal);
              const parsed = parseFloat(formatted);
              setLpBalance(isNaN(parsed) ? '0' : formatted);
            }
            if (supply !== null) {
              setTotalSupply(BigInt(supply));
              if (lpBal !== null) {
                const share = calculatePoolShare(BigInt(lpBal), BigInt(supply));
                setPoolShare(isNaN(share) ? 0 : share);
              }
            }
          } catch {
            // Silent fail on LP balance fetch
            setLpBalance('0');
            setPoolShare(0);
          }
        }
      } else {
        setPairAddress(null);
        setLpBalance('0');
        setPoolShare(0);
        setReserves({ reserveA: BigInt(0), reserveB: BigInt(0) });
        setTotalSupply(BigInt(0));
      }
    } catch (error) {
      console.error('Error fetching pair data:', error);
      // Reset state on error
      setPairAddress(null);
      setLpBalance('0');
      setPoolShare(0);
    }
  }, [provider, address, tokenA, tokenB]);

  // Check token approvals - with silent error handling
  const checkApprovals = useCallback(async () => {
    if (!provider || !address || !tokenA || !tokenB || !amountA || !amountB) {
      setApprovalA(false);
      setApprovalB(false);
      return;
    }

    try {
      const amountAWei = ethers.parseUnits(amountA || '0', tokenA.decimals);
      const amountBWei = ethers.parseUnits(amountB || '0', tokenB.decimals);

      // Check token A approval (skip if native token)
      if (!isNativeToken(tokenA) && amountAWei > BigInt(0)) {
        try {
          const tokenContract = new ethers.Contract(tokenA.address, ERC20_ABI, provider);
          const allowance = await tokenContract.allowance(address, CONTRACTS.ROUTER);
          setApprovalA(allowance >= amountAWei);
        } catch {
          // Silent fail - assume not approved, will check again before tx
          setApprovalA(false);
        }
      } else {
        setApprovalA(true);
      }

      // Check token B approval (skip if native token)
      if (!isNativeToken(tokenB) && amountBWei > BigInt(0)) {
        try {
          const tokenContract = new ethers.Contract(tokenB.address, ERC20_ABI, provider);
          const allowance = await tokenContract.allowance(address, CONTRACTS.ROUTER);
          setApprovalB(allowance >= amountBWei);
        } catch {
          // Silent fail - assume not approved
          setApprovalB(false);
        }
      } else {
        setApprovalB(true);
      }
    } catch {
      // Silent fail on parse errors
    }
  }, [provider, address, tokenA, tokenB, amountA, amountB]);

  useEffect(() => {
    checkApprovals();
  }, [checkApprovals]);

  const handleApproveTokenA = async () => {
    if (!signer || !tokenA || isNativeToken(tokenA)) return;
    
    setApprovingA(true);
    try {
      const tokenContract = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
      const tx = await tokenContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
      toast.info(`Approving ${tokenA.symbol}...`);
      await tx.wait();
      toast.success(`${tokenA.symbol} approved!`);
      setApprovalA(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve token');
    } finally {
      setApprovingA(false);
    }
  };

  const handleApproveTokenB = async () => {
    if (!signer || !tokenB || isNativeToken(tokenB)) return;
    
    setApprovingB(true);
    try {
      const tokenContract = new ethers.Contract(tokenB.address, ERC20_ABI, signer);
      const tx = await tokenContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
      toast.info(`Approving ${tokenB.symbol}...`);
      await tx.wait();
      toast.success(`${tokenB.symbol} approved!`);
      setApprovalB(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve token');
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
    
    if (reserves.reserveA === BigInt(0) || reserves.reserveB === BigInt(0)) {
      // New pool - 100% share, allow user to set both amounts
      setEstimatedShare(100);
      setCalculating(false);
      return;
    }
    
    // Show calculating state
    setCalculating(true);
    
    // Debounce the calculation
    const timeout = setTimeout(() => {
      try {
        const amountAWei = ethers.parseUnits(amountA, tokenA.decimals);
        const amountBWei = quote(amountAWei, reserves.reserveA, reserves.reserveB);
        const formattedB = ethers.formatUnits(amountBWei, tokenB.decimals);
        const parsedB = parseFloat(formattedB);
        
        if (!isNaN(parsedB) && parsedB > 0) {
          setAmountB(parsedB.toFixed(6));
        } else {
          setAmountB('');
        }
        
        // Estimate pool share after adding liquidity
        const newTotalA = reserves.reserveA + amountAWei;
        const share = Number(amountAWei * BigInt(100)) / Number(newTotalA);
        setEstimatedShare(isNaN(share) ? 0 : share);
      } catch {
        setEstimatedShare(0);
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

  useEffect(() => {
    fetchPairData();
  }, [fetchPairData]);

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
    if (!signer || !tokenA || !tokenB || !lpToRemove || !pairAddress || !provider) return;

    setLoading(true);
    try {
      const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
      const lpWei = ethers.parseUnits(lpToRemove, 18);
      
      // Use block timestamp to avoid clock sync issues
      const block = await provider.getBlock('latest');
      const txDeadline = (block?.timestamp || Math.floor(Date.now() / 1000)) + 60 * deadline;

      // Approve LP tokens
      const pairContract = new ethers.Contract(pairAddress, ERC20_ABI, signer);
      const allowance = await pairContract.allowance(address, CONTRACTS.ROUTER);
      if (allowance < lpWei) {
        const approveTx = await pairContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
        await approveTx.wait();
        toast.success('LP tokens approved!');
      }

      let tx;
      if (isNativeToken(tokenA) || isNativeToken(tokenB)) {
        const tokenAddress = isNativeToken(tokenA) ? getTokenAddress(tokenB) : getTokenAddress(tokenA);
        tx = await router.removeLiquidityETH(tokenAddress, lpWei, 0, 0, address, txDeadline);
      } else {
        tx = await router.removeLiquidity(
          getTokenAddress(tokenA),
          getTokenAddress(tokenB),
          lpWei,
          0,
          0,
          address,
          txDeadline
        );
      }

      // Track transaction
      addTransaction(address, {
        hash: tx.hash,
        type: 'remove_liquidity',
        description: `Remove ${lpToRemove} LP (${tokenA.symbol}/${tokenB.symbol})`,
        timestamp: Date.now(),
        status: 'pending',
      });

      toast.info('Transaction submitted...');
      const receipt = await tx.wait();
      updateTransactionStatus(address, tx.hash, 'confirmed');
      toast.success(`Liquidity removed! TX: ${receipt.hash.slice(0, 10)}...`);
      
      setLpToRemove('');
      fetchPairData();
    } catch (error: any) {
      // Use rpcProvider to parse user-friendly error messages
      const errorMsg = rpcProvider.parseError(error);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
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

          {/* LP Balance */}
          <div className="token-input">
            <div className="flex justify-between mb-2 flex-wrap gap-1">
              <span className="text-xs sm:text-sm text-muted-foreground">LP Tokens to Remove</span>
              <span className="text-xs sm:text-sm text-muted-foreground">
                Balance: {parseFloat(lpBalance).toFixed(6)}
                <button
                  onClick={() => setLpToRemove(lpBalance)}
                  className="ml-2 text-primary hover:underline active:opacity-80 touch-manipulation"
                >
                  MAX
                </button>
              </span>
            </div>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.0"
              value={lpToRemove}
              onChange={(e) => setLpToRemove(e.target.value)}
              className="text-lg sm:text-xl font-medium bg-transparent border-none focus-visible:ring-0"
            />
          </div>

          {/* Expected output */}
          {lpToRemove && parseFloat(lpToRemove) > 0 && pairAddress && (
            <div className="p-2.5 sm:p-3 rounded-lg bg-muted/30 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5 sm:mb-2">
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>You will receive</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <TokenLogo symbol={tokenA?.symbol || ''} logoURI={tokenA?.logoURI} size="sm" />
                  <span className="truncate">{tokenA?.symbol}</span>
                </div>
                <span className="font-mono shrink-0">{parseFloat(removeAmounts.amountA).toFixed(6)}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <TokenLogo symbol={tokenB?.symbol || ''} logoURI={tokenB?.logoURI} size="sm" />
                  <span className="truncate">{tokenB?.symbol}</span>
                </div>
                <span className="font-mono shrink-0">{parseFloat(removeAmounts.amountB).toFixed(6)}</span>
              </div>
            </div>
          )}

          {!pairAddress && tokenA && tokenB && (
            <div className="p-3 sm:p-4 rounded-lg bg-muted/30 text-center text-muted-foreground text-sm">
              No pool exists for this pair
            </div>
          )}

          {isConnected ? (
            <Button
              onClick={handleRemoveLiquidity}
              disabled={loading || !lpToRemove || !pairAddress || parseFloat(lpToRemove) === 0}
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
