import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TokenSelect } from './TokenSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TOKEN_LIST, TokenInfo, CONTRACTS, TOKENS } from '@/config/contracts';
import { ROUTER_ABI, ERC20_ABI } from '@/config/abis';
import { useLimitOrderStore, LimitOrder } from '@/stores/limitOrderStore';
import { useTokenPairBalances } from '@/hooks/useStableBalances';
import { getReserves } from '@/lib/uniswapV2Library';
import { rpcProvider } from '@/lib/rpcProvider';
import { addTransaction, updateTransactionStatus } from './TransactionHistory';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Target, Clock, X, CheckCircle2, AlertTriangle, ArrowDown,
  Loader2, History, Zap, TrendingUp, TrendingDown, RefreshCw,
} from 'lucide-react';

const EXPIRY_OPTIONS = [
  { label: '1h', value: 60 * 60 * 1000 },
  { label: '24h', value: 24 * 60 * 60 * 1000 },
  { label: '7d', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30d', value: 30 * 24 * 60 * 60 * 1000 },
];

export function LimitOrderPanel() {
  const { provider, signer, address, isConnected } = useWeb3();
  const { addOrder, cancelOrder, fillOrder, getActiveOrders, getOrderHistory } = useLimitOrderStore();

  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(TOKEN_LIST[0]);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(TOKEN_LIST[4]);
  const [amountIn, setAmountIn] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [expiryIndex, setExpiryIndex] = useState(1); // default 24h
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const monitorRef = useRef<ReturnType<typeof setInterval>>();

  const { balanceA: balanceIn } = useTokenPairBalances(address, tokenIn, tokenOut);

  // Fetch current price
  const fetchCurrentPrice = useCallback(async () => {
    if (!tokenIn || !tokenOut) return;
    setFetchingPrice(true);
    try {
      const p = rpcProvider.getProvider();
      if (!p) return;
      const { reserveA, reserveB } = await getReserves(p, tokenIn.address, tokenOut.address);
      if (reserveA > BigInt(0) && reserveB > BigInt(0)) {
        const price = Number(ethers.formatEther(reserveB)) / Number(ethers.formatEther(reserveA));
        setCurrentPrice(price);
      }
    } catch {
      // silent
    } finally {
      setFetchingPrice(false);
    }
  }, [tokenIn, tokenOut]);

  useEffect(() => {
    fetchCurrentPrice();
    const interval = setInterval(fetchCurrentPrice, 15000);
    return () => clearInterval(interval);
  }, [fetchCurrentPrice]);

  // Calculate estimated output
  const estimatedOutput = amountIn && targetPrice ? (parseFloat(amountIn) * parseFloat(targetPrice)).toFixed(6) : '';

  // Price difference from current
  const priceDiff = currentPrice > 0 && targetPrice
    ? ((parseFloat(targetPrice) - currentPrice) / currentPrice * 100)
    : 0;

  // Place limit order
  const handlePlaceOrder = useCallback(() => {
    if (!tokenIn || !tokenOut || !amountIn || !targetPrice || !address) return;

    const target = parseFloat(targetPrice);
    if (target <= 0 || parseFloat(amountIn) <= 0) {
      toast.error('Invalid amount or price');
      return;
    }

    if (balanceIn !== null && parseFloat(amountIn) > parseFloat(balanceIn)) {
      toast.error('Insufficient balance');
      return;
    }

    const orderId = addOrder({
      tokenIn,
      tokenOut,
      amountIn,
      targetPrice: target,
      currentPrice,
      expiresAt: Date.now() + EXPIRY_OPTIONS[expiryIndex].value,
      walletAddress: address,
    });

    toast.success('Limit order placed!', {
      description: `Buy ${tokenOut.symbol} at ${targetPrice} ${tokenOut.symbol}/${tokenIn.symbol}`,
    });

    setAmountIn('');
    setTargetPrice('');
  }, [tokenIn, tokenOut, amountIn, targetPrice, address, currentPrice, expiryIndex, balanceIn, addOrder]);

  // Execute order (swap on-chain)
  const executeOrder = useCallback(async (order: LimitOrder) => {
    if (!signer || !address) return;
    setExecuting(order.id);

    try {
      const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
      const tokenContract = new ethers.Contract(order.tokenIn.address, ERC20_ABI, signer);

      const amountInWei = ethers.parseEther(order.amountIn);
      const deadline = Math.floor(Date.now() / 1000) + 1200;

      // Check allowance
      const allowance = await tokenContract.allowance(address, CONTRACTS.ROUTER);
      if (allowance < amountInWei) {
        const approveTx = await tokenContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
        await approveTx.wait();
      }

      const minOut = ethers.parseEther(
        (parseFloat(order.amountIn) * order.targetPrice * 0.995).toFixed(18)
      );

      const path = order.tokenIn.address === TOKENS.WNEX
        ? [TOKENS.WNEX, order.tokenOut.address]
        : order.tokenOut.address === TOKENS.WNEX
        ? [order.tokenIn.address, TOKENS.WNEX]
        : [order.tokenIn.address, TOKENS.WNEX, order.tokenOut.address];

      const tx = await router.swapExactTokensForTokens(
        amountInWei, minOut, path, address, deadline
      );

      addTransaction(address, {
        hash: tx.hash,
        type: 'swap',
        description: `Limit: ${order.amountIn} ${order.tokenIn.symbol} → ${order.tokenOut.symbol}`,
        timestamp: Date.now(),
        status: 'pending',
      });

      const receipt = await tx.wait();
      if (receipt.status === 1) {
        fillOrder(order.id);
        updateTransactionStatus(address, tx.hash, 'confirmed');
        toast.success('Limit order filled!', {
          description: `Swapped ${order.amountIn} ${order.tokenIn.symbol} → ${order.tokenOut.symbol}`,
        });
      } else {
        updateTransactionStatus(address, tx.hash, 'failed');
        toast.error('Order execution failed');
      }
    } catch (err: any) {
      toast.error('Execution failed', { description: err?.message?.slice(0, 100) });
    } finally {
      setExecuting(null);
    }
  }, [signer, address, fillOrder]);

  // Monitor active orders for price hits
  useEffect(() => {
    if (!address || !isConnected) return;

    const checkOrders = async () => {
      const active = getActiveOrders(address);
      if (active.length === 0) return;

      const p = rpcProvider.getProvider();
      if (!p) return;

      for (const order of active) {
        try {
          const { reserveA, reserveB } = await getReserves(p, order.tokenIn.address, order.tokenOut.address);
          if (reserveA > BigInt(0) && reserveB > BigInt(0)) {
            const price = Number(ethers.formatEther(reserveB)) / Number(ethers.formatEther(reserveA));
            // Check if price meets target (buy lower or sell higher)
            if (price >= order.targetPrice) {
              toast.info(`Order ready to fill!`, {
                description: `${order.tokenIn.symbol}→${order.tokenOut.symbol} target ${order.targetPrice.toFixed(4)} reached`,
                action: { label: 'Execute', onClick: () => executeOrder(order) },
              });
            }
          }
        } catch {
          // skip
        }
      }
    };

    checkOrders();
    monitorRef.current = setInterval(checkOrders, 30000);
    return () => clearInterval(monitorRef.current);
  }, [address, isConnected, getActiveOrders, executeOrder]);

  const activeOrders = address ? getActiveOrders(address) : [];
  const orderHistory = address ? getOrderHistory(address) : [];

  return (
    <div className="w-full space-y-4">
      {/* Order Form */}
      <div className="space-y-3">
        {/* Token In */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">You Pay</label>
          <div className="flex gap-2">
            <TokenSelect
              selected={tokenIn}
              onSelect={setTokenIn}
              excludeToken={tokenOut}
            />
            <Input
              type="number"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              className="text-right text-lg font-mono"
            />
          </div>
          {balanceIn && (
            <div className="flex justify-end">
              <button
                onClick={() => setAmountIn(balanceIn)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Balance: {parseFloat(balanceIn).toFixed(4)}
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <ArrowDown className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Token Out */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">You Receive</label>
          <div className="flex gap-2">
            <TokenSelect
              selected={tokenOut}
              onSelect={setTokenOut}
              excludeToken={tokenIn}
            />
            <Input
              type="text"
              placeholder="0.0"
              value={estimatedOutput}
              readOnly
              className="text-right text-lg font-mono bg-muted/30"
            />
          </div>
        </div>

        {/* Target Price */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" />
              Target Price
            </label>
            {currentPrice > 0 && (
              <button
                onClick={() => setTargetPrice(currentPrice.toFixed(6))}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                Current: {currentPrice.toFixed(4)}
                {fetchingPrice && <RefreshCw className="w-3 h-3 animate-spin" />}
              </button>
            )}
          </div>
          <Input
            type="number"
            placeholder={`Price in ${tokenOut?.symbol || 'token'}/${tokenIn?.symbol || 'token'}`}
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="font-mono"
          />
          {priceDiff !== 0 && targetPrice && (
            <div className={cn(
              "text-xs flex items-center gap-1",
              priceDiff > 0 ? "text-green-500" : "text-red-500"
            )}>
              {priceDiff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(2)}% from current price
            </div>
          )}
        </div>

        {/* Expiry */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Expires In
          </label>
          <div className="flex gap-2">
            {EXPIRY_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => setExpiryIndex(i)}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors border",
                  i === expiryIndex
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Place Order Button */}
        <Button
          onClick={handlePlaceOrder}
          disabled={!isConnected || !amountIn || !targetPrice || loading}
          className="w-full font-semibold"
          size="lg"
        >
          {!isConnected ? (
            'Connect Wallet'
          ) : !amountIn || !targetPrice ? (
            'Enter Amount & Price'
          ) : (
            <>
              <Target className="w-4 h-4 mr-2" />
              Place Limit Order
            </>
          )}
        </Button>
      </div>

      {/* Active Orders & History */}
      {isConnected && (activeOrders.length > 0 || orderHistory.length > 0) && (
        <Tabs defaultValue="active" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1 text-xs">
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs">
              History ({orderHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-2 max-h-60 overflow-y-auto">
            {activeOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No active orders</p>
            ) : (
              activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onCancel={() => {
                    cancelOrder(order.id);
                    toast.info('Order cancelled');
                  }}
                  onExecute={() => executeOrder(order)}
                  executing={executing === order.id}
                  currentPrice={currentPrice}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-2 max-h-60 overflow-y-auto">
            {orderHistory.filter(o => o.status !== 'active').length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No order history</p>
            ) : (
              orderHistory
                .filter(o => o.status !== 'active')
                .slice(0, 20)
                .map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function OrderCard({
  order,
  onCancel,
  onExecute,
  executing,
  currentPrice,
}: {
  order: LimitOrder;
  onCancel?: () => void;
  onExecute?: () => void;
  executing?: boolean;
  currentPrice?: number;
}) {
  const statusColors: Record<string, string> = {
    active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    filled: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelled: 'bg-muted text-muted-foreground border-border',
    expired: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };

  const timeLeft = order.expiresAt - Date.now();
  const timeStr = order.status === 'active' && timeLeft > 0
    ? timeLeft > 86400000
      ? `${Math.floor(timeLeft / 86400000)}d left`
      : timeLeft > 3600000
      ? `${Math.floor(timeLeft / 3600000)}h left`
      : `${Math.floor(timeLeft / 60000)}m left`
    : '';

  return (
    <div className="p-3 rounded-lg border border-border/50 bg-card/50 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {order.tokenIn.symbol} → {order.tokenOut.symbol}
          </span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColors[order.status])}>
            {order.status}
          </Badge>
        </div>
        {onCancel && order.status === 'active' && (
          <button onClick={onCancel} className="text-muted-foreground hover:text-destructive transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-muted-foreground">Amount</div>
        <div className="text-right font-mono">{parseFloat(order.amountIn).toFixed(4)} {order.tokenIn.symbol}</div>
        <div className="text-muted-foreground">Target Price</div>
        <div className="text-right font-mono">{order.targetPrice.toFixed(4)}</div>
        {currentPrice && order.status === 'active' && (
          <>
            <div className="text-muted-foreground">Current Price</div>
            <div className={cn("text-right font-mono", currentPrice >= order.targetPrice ? "text-green-400" : "text-muted-foreground")}>
              {currentPrice.toFixed(4)}
            </div>
          </>
        )}
        {timeStr && (
          <>
            <div className="text-muted-foreground">Expires</div>
            <div className="text-right">{timeStr}</div>
          </>
        )}
      </div>

      {onExecute && order.status === 'active' && currentPrice && currentPrice >= order.targetPrice && (
        <Button
          size="sm"
          onClick={onExecute}
          disabled={executing}
          className="w-full text-xs"
        >
          {executing ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Executing...</>
          ) : (
            <><Zap className="w-3 h-3 mr-1" /> Execute Now</>
          )}
        </Button>
      )}
    </div>
  );
}
