import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TokenSelect } from './TokenSelect';
import { SlippageSettings } from './SlippageSettings';
import { PriceImpactWarning, PriceImpactBadge, SlippageProtection, getPriceImpactSeverity } from './PriceImpactWarning';
import { RouteDisplay, CompactRoute, RouteComparison } from './RouteDisplay';
import { SwapConfirmation } from './SwapConfirmation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TOKEN_LIST, TokenInfo, CONTRACTS, TOKENS } from '@/config/contracts';
import { ROUTER_ABI, ERC20_ABI } from '@/config/abis';
import { ArrowDown, Loader2, AlertTriangle, Zap, AlertCircle } from 'lucide-react';
import { BalanceRetryButton } from './BalanceRetryButton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  getAmountOut as calcAmountOut,
  getAmountIn as calcAmountIn,
  calculatePriceImpact, 
  getReserves,
} from '@/lib/uniswapV2Library';
import { findBestRoute, SwapRoute } from '@/lib/multiHopRouter';
import { addTransaction, updateTransactionStatus } from './TransactionHistory';
import { calculateAutoSlippage, getSlippageSeverityColor } from '@/lib/autoSlippage';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTokenPairBalances } from '@/hooks/useStableBalances';
import { playSwapSound, playSuccessSound, playErrorSound, playNotificationSound } from '@/lib/sounds';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SwapCard() {
  const { provider, signer, address, isConnected } = useWeb3();
  const { settings } = useSettingsStore();
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(TOKEN_LIST[0]); // NEX
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(TOKEN_LIST[4]); // FRDX
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [isExactOutput, setIsExactOutput] = useState(false); // Track if user is inputting exact output
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [slippage, setSlippage] = useState(settings.defaultSlippage);
  const [deadline, setDeadline] = useState(settings.transactionDeadline);
  const [priceImpact, setPriceImpact] = useState(0);
  const [bestRoute, setBestRoute] = useState<SwapRoute | null>(null);
  const [allRoutes, setAllRoutes] = useState<SwapRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [reserves, setReserves] = useState<{ reserveA: bigint; reserveB: bigint }>({ reserveA: BigInt(0), reserveB: BigInt(0) });
  
  // Use stable balance hook
  const { balanceA: balanceIn, balanceB: balanceOut, loading: loadingBalances, refetch: refetchBalances } = 
    useTokenPairBalances(address, tokenIn, tokenOut);
  
  // Auto-slippage state
  const [autoSlippageResult, setAutoSlippageResult] = useState<{
    recommendedSlippage: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
  } | null>(null);
  const [isAutoSlippage, setIsAutoSlippage] = useState(settings.autoSlippage);
  
  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);

  const isNativeToken = (token: TokenInfo | null) => 
    token?.address === '0x0000000000000000000000000000000000000000';

  const getTokenAddress = (token: TokenInfo) => 
    isNativeToken(token) ? CONTRACTS.WETH : token.address;

  useEffect(() => {
    // Balances are auto-fetched by useTokenPairBalances hook
  }, []);

  // Get quote using multi-hop router with better error handling
  const getQuote = useCallback(async (inputAmount: string) => {
    // Validate input first
    if (!inputAmount || inputAmount.trim() === '') {
      setAmountOut('');
      setPriceImpact(0);
      setBestRoute(null);
      setAllRoutes([]);
      setAutoSlippageResult(null);
      return;
    }

    const inputNum = parseFloat(inputAmount);
    if (isNaN(inputNum) || inputNum <= 0) {
      setAmountOut('');
      setPriceImpact(0);
      setBestRoute(null);
      setAllRoutes([]);
      setAutoSlippageResult(null);
      return;
    }

    if (!provider || !tokenIn || !tokenOut) {
      console.log('[SwapCard] getQuote - missing deps:', { provider: !!provider, tokenIn: tokenIn?.symbol, tokenOut: tokenOut?.symbol });
      return;
    }

    console.log('[SwapCard] getQuote - starting for amount:', inputAmount, tokenIn?.symbol, '->', tokenOut?.symbol);
    setQuoting(true);
    try {
      const amountInWei = ethers.parseUnits(inputAmount, tokenIn.decimals);
      
      // Find all possible routes including multi-hop
      console.log('[SwapCard] Finding routes...');
      const routes = await findBestRoute(provider, tokenIn, tokenOut, amountInWei);
      console.log('[SwapCard] Routes found:', routes.length);
      setAllRoutes(routes);
      
      if (routes.length === 0) {
        // No routes found, try direct calculation
        console.log('[SwapCard] No routes found, trying direct calculation...');
        const tokenAAddress = isNativeToken(tokenIn) ? CONTRACTS.WETH : tokenIn.address;
        const tokenBAddress = isNativeToken(tokenOut) ? CONTRACTS.WETH : tokenOut.address;
        
        try {
          const { reserveA, reserveB } = await getReserves(provider, tokenAAddress, tokenBAddress);
          console.log('[SwapCard] Direct reserves:', { reserveA: reserveA.toString(), reserveB: reserveB.toString() });
          setReserves({ reserveA, reserveB });
          
          if (reserveA === BigInt(0) || reserveB === BigInt(0)) {
            console.log('[SwapCard] Reserves are zero, cannot calculate');
            setAmountOut('');
            setPriceImpact(0);
            setBestRoute(null);
            setAutoSlippageResult(null);
            return;
          }

          const amountOutWei = calcAmountOut(amountInWei, reserveA, reserveB);
          const outAmount = ethers.formatUnits(amountOutWei, tokenOut.decimals);
          const formattedOut = parseFloat(outAmount);
          console.log('[SwapCard] Calculated output:', formattedOut);
          setAmountOut(isNaN(formattedOut) ? '' : formattedOut.toFixed(6));
          
          const impact = calculatePriceImpact(amountInWei, amountOutWei, reserveA, reserveB);
          setPriceImpact(isNaN(impact) ? 0 : impact);
          setBestRoute(null);
          
          // Calculate auto slippage
          const autoSlip = calculateAutoSlippage(amountInWei, reserveA, reserveB, slippage);
          setAutoSlippageResult(autoSlip);
          
          // Apply auto slippage if enabled
          if (isAutoSlippage && autoSlip.recommendedSlippage !== slippage) {
            setSlippage(autoSlip.recommendedSlippage);
          }
        } catch (err) {
          // Silent fail on reserve fetch
          console.warn('[SwapCard] Direct reserve fetch error:', err);
          setAmountOut('');
          setPriceImpact(0);
          setBestRoute(null);
        }
        
        return;
      }

      // Use the best route
      const best = routes[0];
      console.log('[SwapCard] Best route:', best.path.map(t => t.symbol).join(' -> '), 'Output:', ethers.formatUnits(best.amountOut, tokenOut.decimals));
      setBestRoute(best);
      
      const outAmount = ethers.formatUnits(best.amountOut, tokenOut.decimals);
      const formattedOut = parseFloat(outAmount);
      setAmountOut(isNaN(formattedOut) ? '' : formattedOut.toFixed(6));
      setPriceImpact(isNaN(best.priceImpact) ? 0 : best.priceImpact);
      
      // Calculate auto slippage based on price impact
      const autoSlip = calculateAutoSlippage(
        amountInWei, 
        reserves.reserveA > 0n ? reserves.reserveA : BigInt(1000000000000000000),
        reserves.reserveB > 0n ? reserves.reserveB : BigInt(1000000000000000000),
        slippage
      );
      setAutoSlippageResult(autoSlip);
      
      // Apply auto slippage if enabled
      if (isAutoSlippage && autoSlip.recommendedSlippage !== slippage) {
        setSlippage(autoSlip.recommendedSlippage);
      }
      
      // Show toast for multi-hop if better
      if (best.path.length > 2 && routes.length > 1) {
        const directRoute = routes.find(r => r.path.length === 2);
        if (directRoute && best.amountOut > directRoute.amountOut) {
          const improvement = ((Number(best.amountOut - directRoute.amountOut) / Number(directRoute.amountOut)) * 100);
          if (improvement > 0.1) {
            toast.info(`Multi-hop route via ${best.path[1].symbol} gives ${improvement.toFixed(2)}% better rate!`);
          }
        }
      }
    } catch (error) {
      console.error('Quote error:', error);
      // Fallback to router call
      try {
        const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, provider);
        const amountInWei = ethers.parseUnits(inputAmount, tokenIn.decimals);
        const path = [getTokenAddress(tokenIn), getTokenAddress(tokenOut)];
        
        const amounts = await router.getAmountsOut(amountInWei, path);
        const outAmountFallback = ethers.formatUnits(amounts[1], tokenOut.decimals);
        const formattedOut = parseFloat(outAmountFallback);
        setAmountOut(isNaN(formattedOut) ? '' : formattedOut.toFixed(6));
        setPriceImpact(0);
        setBestRoute(null);
        setAutoSlippageResult(null);
      } catch {
        setAmountOut('');
        setPriceImpact(0);
        setBestRoute(null);
        setAutoSlippageResult(null);
      }
    } finally {
      setQuoting(false);
    }
  }, [provider, tokenIn, tokenOut, slippage, isAutoSlippage, reserves]);

  // Get reverse quote using getAmountsIn - calculate input from desired output
  const getReverseQuote = useCallback(async (outputAmount: string) => {
    if (!outputAmount || outputAmount.trim() === '') {
      setAmountIn('');
      setPriceImpact(0);
      setBestRoute(null);
      return;
    }

    const outputNum = parseFloat(outputAmount);
    if (isNaN(outputNum) || outputNum <= 0) {
      setAmountIn('');
      setPriceImpact(0);
      setBestRoute(null);
      return;
    }

    if (!provider || !tokenIn || !tokenOut) return;

    setQuoting(true);
    try {
      const tokenAAddress = isNativeToken(tokenIn) ? CONTRACTS.WETH : tokenIn.address;
      const tokenBAddress = isNativeToken(tokenOut) ? CONTRACTS.WETH : tokenOut.address;
      
      const { reserveA, reserveB } = await getReserves(provider, tokenAAddress, tokenBAddress);
      setReserves({ reserveA, reserveB });
      
      if (reserveA === BigInt(0) || reserveB === BigInt(0)) {
        setAmountIn('');
        setPriceImpact(0);
        return;
      }

      const amountOutWei = ethers.parseUnits(outputAmount, tokenOut.decimals);
      
      // Check if desired output is more than available reserves
      if (amountOutWei >= reserveB) {
        setAmountIn('');
        setPriceImpact(100);
        return;
      }

      const amountInWei = calcAmountIn(amountOutWei, reserveA, reserveB);
      const inAmount = ethers.formatUnits(amountInWei, tokenIn.decimals);
      const formattedIn = parseFloat(inAmount);
      setAmountIn(isNaN(formattedIn) ? '' : formattedIn.toFixed(6));
      
      const impact = calculatePriceImpact(amountInWei, amountOutWei, reserveA, reserveB);
      setPriceImpact(isNaN(impact) ? 0 : impact);
    } catch (error) {
      console.error('Reverse quote error:', error);
      // Fallback to router call using getAmountsIn
      try {
        const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, provider);
        const amountOutWei = ethers.parseUnits(outputAmount, tokenOut.decimals);
        const path = [getTokenAddress(tokenIn), getTokenAddress(tokenOut)];
        
        const amounts = await router.getAmountsIn(amountOutWei, path);
        const inAmountFallback = ethers.formatUnits(amounts[0], tokenIn.decimals);
        const formattedIn = parseFloat(inAmountFallback);
        setAmountIn(isNaN(formattedIn) ? '' : formattedIn.toFixed(6));
        setPriceImpact(0);
      } catch {
        setAmountIn('');
        setPriceImpact(0);
      }
    } finally {
      setQuoting(false);
    }
  }, [provider, tokenIn, tokenOut]);

  // Debounced quote with longer delay to reduce RPC calls
  useEffect(() => {
    if (isExactOutput) return; // Skip if user is inputting output
    const timeout = setTimeout(() => {
      getQuote(amountIn);
    }, 600);
    return () => clearTimeout(timeout);
  }, [amountIn, getQuote, isExactOutput]);

  // Debounced reverse quote for exact output
  useEffect(() => {
    if (!isExactOutput) return;
    const timeout = setTimeout(() => {
      getReverseQuote(amountOut);
    }, 600);
    return () => clearTimeout(timeout);
  }, [amountOut, getReverseQuote, isExactOutput]);

  // Handle input amount change
  const handleAmountInChange = (value: string) => {
    setIsExactOutput(false);
    setAmountIn(value);
  };

  // Handle output amount change - triggers reverse calculation
  const handleAmountOutChange = (value: string) => {
    setIsExactOutput(true);
    setAmountOut(value);
  };

  const switchTokens = () => {
    const tempToken = tokenIn;
    const tempAmount = amountIn;
    setTokenIn(tokenOut);
    setTokenOut(tempToken);
    setAmountIn(amountOut);
    setAmountOut(tempAmount);
    setIsExactOutput(!isExactOutput);
  };

  const openSwapConfirmation = () => {
    if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) === 0) return;
    setShowConfirmation(true);
  };

  const handleSwap = async () => {
    if (!signer || !tokenIn || !tokenOut || !amountIn || !amountOut || !provider) return;

    // Check price impact and show warning
    const severity = getPriceImpactSeverity(priceImpact);
    if (severity === 'critical') {
      toast.error('Price impact is too high! Please reduce your trade size.');
      setShowConfirmation(false);
      return;
    }

    setLoading(true);
    try {
      const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
      
      // Use block timestamp to avoid clock sync issues
      const block = await provider.getBlock('latest');
      const txDeadline = (block?.timestamp || Math.floor(Date.now() / 1000)) + 60 * deadline;
      
      // Use selected route path if available, otherwise direct path
      const selectedRoute = allRoutes[selectedRouteIndex] || bestRoute;
      const path = selectedRoute && selectedRoute.path.length > 2 
        ? selectedRoute.pathAddresses 
        : [getTokenAddress(tokenIn), getTokenAddress(tokenOut)];

      let tx;

      if (isExactOutput) {
        // === EXACT OUTPUT SWAP ===
        // User specifies exact amount they want to receive
        const amountOutWei = ethers.parseUnits(amountOut, tokenOut.decimals);
        const amountInMax = ethers.parseUnits(
          (parseFloat(amountIn) * (1 + slippage / 100)).toFixed(tokenIn.decimals),
          tokenIn.decimals
        );

        if (isNativeToken(tokenIn)) {
          // ETH -> Exact Token (swapETHForExactTokens)
          tx = await router.swapETHForExactTokens(
            amountOutWei,
            path,
            address,
            txDeadline,
            { value: amountInMax }
          );
        } else if (isNativeToken(tokenOut)) {
          // Token -> Exact ETH (swapTokensForExactETH)
          const tokenContract = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
          const allowance = await tokenContract.allowance(address, CONTRACTS.ROUTER);
          if (allowance < amountInMax) {
            const approveTx = await tokenContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
            await approveTx.wait();
            toast.success('Token approved!');
          }
          
          tx = await router.swapTokensForExactETH(
            amountOutWei,
            amountInMax,
            path,
            address,
            txDeadline
          );
        } else {
          // Token -> Exact Token (swapTokensForExactTokens)
          const tokenContract = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
          const allowance = await tokenContract.allowance(address, CONTRACTS.ROUTER);
          if (allowance < amountInMax) {
            const approveTx = await tokenContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
            await approveTx.wait();
            toast.success('Token approved!');
          }

          tx = await router.swapTokensForExactTokens(
            amountOutWei,
            amountInMax,
            path,
            address,
            txDeadline
          );
        }
      } else {
        // === EXACT INPUT SWAP ===
        // User specifies exact amount they want to spend
        const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);
        const amountOutMin = ethers.parseUnits(
          (parseFloat(amountOut) * (1 - slippage / 100)).toFixed(tokenOut.decimals),
          tokenOut.decimals
        );

        if (isNativeToken(tokenIn)) {
          // Exact ETH -> Token (swapExactETHForTokens)
          tx = await router.swapExactETHForTokens(
            amountOutMin,
            path,
            address,
            txDeadline,
            { value: amountInWei }
          );
        } else if (isNativeToken(tokenOut)) {
          // Exact Token -> ETH (swapExactTokensForETH)
          const tokenContract = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
          const allowance = await tokenContract.allowance(address, CONTRACTS.ROUTER);
          if (allowance < amountInWei) {
            const approveTx = await tokenContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
            await approveTx.wait();
            toast.success('Token approved!');
          }
          
          tx = await router.swapExactTokensForETH(
            amountInWei,
            amountOutMin,
            path,
            address,
            txDeadline
          );
        } else {
          // Exact Token -> Token (swapExactTokensForTokens)
          const tokenContract = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
          const allowance = await tokenContract.allowance(address, CONTRACTS.ROUTER);
          if (allowance < amountInWei) {
            const approveTx = await tokenContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
            await approveTx.wait();
            toast.success('Token approved!');
          }

          tx = await router.swapExactTokensForTokens(
            amountInWei,
            amountOutMin,
            path,
            address,
            txDeadline
          );
        }
      }

      // Add transaction to history
      addTransaction(address, {
        hash: tx.hash,
        type: 'swap',
        description: `Swap ${amountIn} ${tokenIn.symbol} → ${amountOut} ${tokenOut.symbol}`,
        timestamp: Date.now(),
        status: 'pending',
      });

      playNotificationSound();
      toast.info('Transaction submitted...');
      const receipt = await tx.wait();
      updateTransactionStatus(address, tx.hash, 'confirmed');
      
      playSuccessSound();
      playSwapSound();
      toast.success(`Swap successful! TX: ${receipt.hash.slice(0, 10)}...`);
      
      setShowConfirmation(false);
      setAmountIn('');
      setAmountOut('');
      setIsExactOutput(false);
      
      // Force refresh balances after transaction
      setTimeout(() => {
        refetchBalances();
      }, 2000);
    } catch (error: any) {
      playErrorSound();
      // Use rpcProvider to parse user-friendly error messages
      const { rpcProvider } = await import('@/lib/rpcProvider');
      const errorMsg = rpcProvider.parseError(error, true);
      if (errorMsg) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle route selection
  const handleRouteSelect = (index: number) => {
    setSelectedRouteIndex(index);
    if (allRoutes[index]) {
      const route = allRoutes[index];
      setBestRoute(route);
      const outAmount = ethers.formatUnits(route.amountOut, tokenOut?.decimals || 18);
      setAmountOut(parseFloat(outAmount).toFixed(6));
      setPriceImpact(route.priceImpact);
    }
  };

  return (
    <div className="glass-card p-4 sm:p-6 w-full max-w-md mx-auto animate-fade-in animated-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold">Swap</h2>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Auto Slippage Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  setIsAutoSlippage(!isAutoSlippage);
                  if (!isAutoSlippage && autoSlippageResult) {
                    setSlippage(autoSlippageResult.recommendedSlippage);
                  }
                }}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                  isAutoSlippage 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                <Zap className="w-3 h-3" />
                Auto
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                {isAutoSlippage 
                  ? 'Auto-slippage enabled: Automatically adjusts based on trade size and pool conditions'
                  : 'Click to enable auto-slippage detection'}
              </p>
            </TooltipContent>
          </Tooltip>
          
          <SlippageSettings
            slippage={slippage}
            onSlippageChange={(val) => {
              setSlippage(val);
              setIsAutoSlippage(false);
            }}
            deadline={deadline}
            onDeadlineChange={setDeadline}
          />
        </div>
      </div>

      {/* Auto Slippage Indicator */}
      {isAutoSlippage && autoSlippageResult && amountIn && (
        <div className={cn(
          'mb-4 p-3 rounded-lg border text-sm',
          autoSlippageResult.severity === 'low' && 'bg-green-500/10 border-green-500/30',
          autoSlippageResult.severity === 'medium' && 'bg-yellow-500/10 border-yellow-500/30',
          autoSlippageResult.severity === 'high' && 'bg-orange-500/10 border-orange-500/30',
          autoSlippageResult.severity === 'critical' && 'bg-red-500/10 border-red-500/30'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={cn('w-4 h-4', getSlippageSeverityColor(autoSlippageResult.severity))} />
              <span className="font-medium">Auto Slippage: {autoSlippageResult.recommendedSlippage}%</span>
            </div>
            <span className={cn('text-xs', getSlippageSeverityColor(autoSlippageResult.severity))}>
              {autoSlippageResult.severity.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{autoSlippageResult.reason}</p>
        </div>
      )}

      {/* Token In */}
      <div className="token-input mb-2 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">You pay</span>
          <div className="flex items-center gap-1.5">
            {loadingBalances ? (
              <Skeleton className="h-4 w-20 inline-block" />
            ) : balanceIn === '0' && !loadingBalances ? (
              <div className="flex items-center gap-1 text-yellow-500">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs">0.0000</span>
                <BalanceRetryButton onRetry={refetchBalances} loading={loadingBalances} />
              </div>
            ) : (
              <span className="text-sm font-medium text-foreground">{parseFloat(balanceIn || '0').toFixed(4)}</span>
            )}
            <BalanceRetryButton onRetry={refetchBalances} loading={loadingBalances} className="ml-0.5" />
            {parseFloat(balanceIn || '0') > 0 && (
              <button
                onClick={() => {
                  setIsExactOutput(false);
                  setAmountIn(balanceIn);
                }}
                className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
              >
                MAX
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.0"
            value={quoting && isExactOutput ? '' : amountIn}
            onChange={(e) => handleAmountInChange(e.target.value)}
            className="flex-1 text-2xl sm:text-3xl font-bold bg-transparent border-none p-0 h-12 focus-visible:ring-0 placeholder:text-muted-foreground/50"
          />
          {quoting && isExactOutput && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          <TokenSelect selected={tokenIn} onSelect={setTokenIn} excludeToken={tokenOut} />
        </div>
      </div>

      {/* Switch Button */}
      <div className="flex justify-center -my-4 relative z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={switchTokens}
          className="rounded-full border-2 border-border bg-card hover:bg-primary/10 hover:border-primary/50 transition-all w-10 h-10 shadow-lg"
        >
          <ArrowDown className="w-5 h-5" />
        </Button>
      </div>

      {/* Token Out */}
      <div className="token-input mt-2 mb-5 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">You receive</span>
          <div className="flex items-center gap-1.5">
            {loadingBalances ? (
              <Skeleton className="h-4 w-20 inline-block" />
            ) : balanceOut === '0' && !loadingBalances ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="text-sm">0.0000</span>
                <BalanceRetryButton onRetry={refetchBalances} loading={loadingBalances} />
              </div>
            ) : (
              <span className="text-sm font-medium text-foreground">{parseFloat(balanceOut || '0').toFixed(4)}</span>
            )}
            <BalanceRetryButton onRetry={refetchBalances} loading={loadingBalances} className="ml-0.5" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.0"
              value={quoting && !isExactOutput ? '' : amountOut}
              onChange={(e) => handleAmountOutChange(e.target.value)}
              className="flex-1 text-2xl sm:text-3xl font-bold bg-transparent border-none p-0 h-12 focus-visible:ring-0 placeholder:text-muted-foreground/50"
            />
            {quoting && !isExactOutput && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm hidden sm:inline">Calculating...</span>
              </div>
            )}
          </div>
          <TokenSelect selected={tokenOut} onSelect={setTokenOut} excludeToken={tokenIn} />
        </div>
      </div>

      {/* Price Impact Warning */}
      {priceImpact > 1 && (
        <PriceImpactWarning priceImpact={priceImpact} className="mb-4" />
      )}

      {/* Route Display */}
      {bestRoute && amountIn && (
        <RouteDisplay route={bestRoute} isLoading={quoting} className="mb-4" showDetails={false} />
      )}

      {/* Route Comparison - show when multiple routes available */}
      {allRoutes.length > 1 && amountIn && tokenOut && (
        <div className="mb-4">
          <RouteComparison 
            routes={allRoutes} 
            selectedIndex={selectedRouteIndex}
            onSelect={handleRouteSelect}
            tokenOutDecimals={tokenOut.decimals}
          />
        </div>
      )}

      {/* Swap Button */}
      {isConnected ? (
        <Button
          onClick={openSwapConfirmation}
          disabled={loading || !amountIn || !amountOut || parseFloat(amountIn) === 0 || getPriceImpactSeverity(priceImpact) === 'critical'}
          className={cn(
            'w-full h-14 text-lg font-semibold btn-glow',
            getPriceImpactSeverity(priceImpact) === 'critical' 
              ? 'bg-destructive hover:bg-destructive/90' 
              : 'bg-gradient-wolf hover:opacity-90',
            'transition-all'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Swapping...
            </>
          ) : getPriceImpactSeverity(priceImpact) === 'critical' ? (
            <>
              <AlertTriangle className="w-5 h-5 mr-2" />
              Price Impact Too High
            </>
          ) : (
            'Review Swap'
          )}
        </Button>
      ) : (
        <Button
          disabled
          className="w-full h-14 text-lg font-semibold"
          variant="secondary"
        >
          Connect Wallet to Swap
        </Button>
      )}

      {/* Price Info */}
      {amountIn && amountOut && tokenIn && tokenOut && (
        <div className="mt-4 p-3 rounded-lg bg-muted/30 text-sm space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Rate</span>
            <span>
              1 {tokenIn.symbol} = {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)} {tokenOut.symbol}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Price Impact</span>
            <PriceImpactBadge priceImpact={priceImpact} />
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Slippage Tolerance</span>
            <span>{slippage}%</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{isExactOutput ? 'Maximum Spent' : 'Minimum Received'}</span>
            <span>
              {isExactOutput 
                ? `${(parseFloat(amountIn) * (1 + slippage / 100)).toFixed(6)} ${tokenIn.symbol}`
                : `${(parseFloat(amountOut) * (1 - slippage / 100)).toFixed(6)} ${tokenOut.symbol}`
              }
            </span>
          </div>
          
          {/* Route info */}
          {bestRoute && (
            <div className="pt-2 border-t border-border/50">
              <CompactRoute route={bestRoute} />
            </div>
          )}
          
          {/* Slippage protection status */}
          <div className="pt-2 border-t border-border/50">
            <SlippageProtection slippage={slippage} priceImpact={priceImpact} />
          </div>
        </div>
      )}

      {/* Swap Confirmation Modal */}
      {tokenIn && tokenOut && (
        <SwapConfirmation
          open={showConfirmation}
          onOpenChange={setShowConfirmation}
          onConfirm={handleSwap}
          tokenIn={tokenIn}
          tokenOut={tokenOut}
          amountIn={amountIn}
          amountOut={amountOut}
          slippage={slippage}
          priceImpact={priceImpact}
          route={bestRoute}
          deadline={deadline}
          loading={loading}
        />
      )}
    </div>
  );
}
