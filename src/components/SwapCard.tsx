import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TokenSelect } from './TokenSelect';
import { SlippageSettings } from './SlippageSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TOKEN_LIST, TokenInfo, CONTRACTS, TOKENS } from '@/config/contracts';
import { ROUTER_ABI, ERC20_ABI } from '@/config/abis';
import { ArrowDown, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  getAmountOut as calcAmountOut, 
  calculatePriceImpact, 
  getReserves,
} from '@/lib/uniswapV2Library';
import { addTransaction, updateTransactionStatus } from './TransactionHistory';

export function SwapCard() {
  const { provider, signer, address, isConnected } = useWeb3();
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(TOKEN_LIST[0]); // NEX
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(TOKEN_LIST[4]); // FRDX
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [balanceIn, setBalanceIn] = useState('0');
  const [balanceOut, setBalanceOut] = useState('0');
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [slippage, setSlippage] = useState(0.5);
  const [deadline, setDeadline] = useState(20);
  const [priceImpact, setPriceImpact] = useState(0);
  const [reserves, setReserves] = useState<{ reserveA: bigint; reserveB: bigint }>({ reserveA: BigInt(0), reserveB: BigInt(0) });

  const isNativeToken = (token: TokenInfo | null) => 
    token?.address === '0x0000000000000000000000000000000000000000';

  const getTokenAddress = (token: TokenInfo) => 
    isNativeToken(token) ? TOKENS.WETH : token.address;

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!provider || !address) return;

    try {
      if (tokenIn) {
        if (isNativeToken(tokenIn)) {
          const bal = await provider.getBalance(address);
          setBalanceIn(ethers.formatEther(bal));
        } else {
          const contract = new ethers.Contract(tokenIn.address, ERC20_ABI, provider);
          const bal = await contract.balanceOf(address);
          setBalanceIn(ethers.formatUnits(bal, tokenIn.decimals));
        }
      }

      if (tokenOut) {
        if (isNativeToken(tokenOut)) {
          const bal = await provider.getBalance(address);
          setBalanceOut(ethers.formatEther(bal));
        } else {
          const contract = new ethers.Contract(tokenOut.address, ERC20_ABI, provider);
          const bal = await contract.balanceOf(address);
          setBalanceOut(ethers.formatUnits(bal, tokenOut.decimals));
        }
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  }, [provider, address, tokenIn, tokenOut]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Get quote using UniswapV2Library
  const getQuote = useCallback(async (inputAmount: string) => {
    if (!provider || !tokenIn || !tokenOut || !inputAmount || parseFloat(inputAmount) === 0) {
      setAmountOut('');
      setPriceImpact(0);
      return;
    }

    setQuoting(true);
    try {
      const tokenAAddress = isNativeToken(tokenIn) ? CONTRACTS.WETH : tokenIn.address;
      const tokenBAddress = isNativeToken(tokenOut) ? CONTRACTS.WETH : tokenOut.address;
      
      // Get reserves using UniswapV2Library
      const { reserveA, reserveB } = await getReserves(provider, tokenAAddress, tokenBAddress);
      setReserves({ reserveA, reserveB });
      
      if (reserveA === BigInt(0) || reserveB === BigInt(0)) {
        setAmountOut('');
        setPriceImpact(0);
        return;
      }

      const amountInWei = ethers.parseUnits(inputAmount, tokenIn.decimals);
      
      // Calculate output using local library function
      const amountOutWei = calcAmountOut(amountInWei, reserveA, reserveB);
      const outAmount = ethers.formatUnits(amountOutWei, tokenOut.decimals);
      setAmountOut(parseFloat(outAmount).toFixed(6));
      
      // Calculate price impact using library
      const impact = calculatePriceImpact(amountInWei, amountOutWei, reserveA, reserveB);
      setPriceImpact(impact);
    } catch (error) {
      console.error('Quote error:', error);
      // Fallback to router call
      try {
        const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, provider);
        const amountInWei = ethers.parseUnits(inputAmount, tokenIn.decimals);
        const path = [getTokenAddress(tokenIn), getTokenAddress(tokenOut)];
        
        const amounts = await router.getAmountsOut(amountInWei, path);
        const outAmount = ethers.formatUnits(amounts[1], tokenOut.decimals);
        setAmountOut(parseFloat(outAmount).toFixed(6));
        setPriceImpact(0);
      } catch {
        setAmountOut('');
        setPriceImpact(0);
      }
    } finally {
      setQuoting(false);
    }
  }, [provider, tokenIn, tokenOut]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      getQuote(amountIn);
    }, 500);
    return () => clearTimeout(timeout);
  }, [amountIn, getQuote]);

  const switchTokens = () => {
    const tempToken = tokenIn;
    const tempAmount = amountIn;
    setTokenIn(tokenOut);
    setTokenOut(tempToken);
    setAmountIn(amountOut);
    setAmountOut(tempAmount);
  };

  const handleSwap = async () => {
    if (!signer || !tokenIn || !tokenOut || !amountIn || !provider) return;

    setLoading(true);
    try {
      const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
      const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);
      const amountOutMin = ethers.parseUnits(
        (parseFloat(amountOut) * (1 - slippage / 100)).toFixed(tokenOut.decimals),
        tokenOut.decimals
      );
      
      // Use block timestamp to avoid clock sync issues
      const block = await provider.getBlock('latest');
      const txDeadline = (block?.timestamp || Math.floor(Date.now() / 1000)) + 60 * deadline;
      const path = [getTokenAddress(tokenIn), getTokenAddress(tokenOut)];

      let tx;

      if (isNativeToken(tokenIn)) {
        // ETH -> Token
        tx = await router.swapExactETHForTokens(
          amountOutMin,
          path,
          address,
          txDeadline,
          { value: amountInWei }
        );
      } else if (isNativeToken(tokenOut)) {
        // Token -> ETH
        // Approve first
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
        // Token -> Token
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

      // Add transaction to history
      addTransaction(address, {
        hash: tx.hash,
        type: 'swap',
        description: `Swap ${amountIn} ${tokenIn.symbol} → ${tokenOut.symbol}`,
        timestamp: Date.now(),
        status: 'pending',
      });

      toast.info('Transaction submitted...');
      const receipt = await tx.wait();
      updateTransactionStatus(address, tx.hash, 'confirmed');
      toast.success(`Swap successful! TX: ${receipt.hash.slice(0, 10)}...`);
      
      setAmountIn('');
      setAmountOut('');
      fetchBalances();
    } catch (error: any) {
      console.error('Swap error:', error);
      toast.error(error.reason || error.message || 'Swap failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 w-full max-w-md mx-auto animate-fade-in animated-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Swap</h2>
        <SlippageSettings
          slippage={slippage}
          onSlippageChange={setSlippage}
          deadline={deadline}
          onDeadlineChange={setDeadline}
        />
      </div>

      {/* Token In */}
      <div className="token-input mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">You pay</span>
          <span className="text-sm text-muted-foreground">
            Balance: {parseFloat(balanceIn).toFixed(4)}
            <button
              onClick={() => setAmountIn(balanceIn)}
              className="ml-2 text-primary hover:underline"
            >
              MAX
            </button>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            placeholder="0.0"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            className="flex-1 text-2xl font-medium bg-transparent border-none p-0 focus-visible:ring-0"
          />
          <TokenSelect selected={tokenIn} onSelect={setTokenIn} excludeToken={tokenOut} />
        </div>
      </div>

      {/* Switch Button */}
      <div className="flex justify-center -my-3 relative z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={switchTokens}
          className="rounded-full border-border bg-card hover:bg-primary/10 hover:border-primary/50 transition-all"
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
      </div>

      {/* Token Out */}
      <div className="token-input mt-2 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">You receive</span>
          <span className="text-sm text-muted-foreground">
            Balance: {parseFloat(balanceOut).toFixed(4)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center">
            {quoting ? (
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <Input
                type="text"
                placeholder="0.0"
                value={amountOut}
                readOnly
                className="flex-1 text-2xl font-medium bg-transparent border-none p-0 focus-visible:ring-0"
              />
            )}
          </div>
          <TokenSelect selected={tokenOut} onSelect={setTokenOut} excludeToken={tokenIn} />
        </div>
      </div>

      {/* Swap Button */}
      {isConnected ? (
        <Button
          onClick={handleSwap}
          disabled={loading || !amountIn || !amountOut || parseFloat(amountIn) === 0}
          className={cn(
            'w-full h-14 text-lg font-semibold btn-glow',
            'bg-gradient-wolf hover:opacity-90 transition-all'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Swapping...
            </>
          ) : (
            'Swap'
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
        <div className="mt-4 p-3 rounded-lg bg-muted/30 text-sm space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Rate</span>
            <span>
              1 {tokenIn.symbol} = {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)} {tokenOut.symbol}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Price Impact</span>
            <span className={cn(
              priceImpact > 5 ? 'text-destructive' : priceImpact > 2 ? 'text-yellow-500' : 'text-green-500'
            )}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Slippage Tolerance</span>
            <span>{slippage}%</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Minimum Received</span>
            <span>
              {(parseFloat(amountOut) * (1 - slippage / 100)).toFixed(6)} {tokenOut.symbol}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
