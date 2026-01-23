import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { TokenSelect } from './TokenSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TOKEN_LIST, TokenInfo, CONTRACTS } from '@/config/contracts';
import { useLimitOrderStore, LimitOrder } from '@/stores/limitOrderStore';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { TokenLogo } from './TokenLogo';
import { 
  ArrowRightLeft, 
  Clock, 
  Target, 
  X,
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { playSuccessSound, playNotificationSound } from '@/lib/sounds';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const EXPIRY_OPTIONS = [
  { label: '1 Hour', value: 60 * 60 * 1000 },
  { label: '24 Hours', value: 24 * 60 * 60 * 1000 },
  { label: '7 Days', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 Days', value: 30 * 24 * 60 * 60 * 1000 },
];

function OrderCard({ order, onCancel }: { order: LimitOrder; onCancel: (id: string) => void }) {
  const priceDiff = ((order.targetPrice - order.currentPrice) / order.currentPrice) * 100;
  const isAboveMarket = order.targetPrice > order.currentPrice;
  const timeLeft = order.expiresAt - Date.now();
  
  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return 'Expired';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: LimitOrder['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'filled': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'expired': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
    }
  };

  return (
    <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
      {/* Token Pair */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TokenLogo symbol={order.tokenIn.symbol} logoURI={order.tokenIn.logoURI} size="sm" />
          <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
          <TokenLogo symbol={order.tokenOut.symbol} logoURI={order.tokenOut.logoURI} size="sm" />
          <span className="font-medium text-sm">
            {order.tokenIn.symbol} → {order.tokenOut.symbol}
          </span>
        </div>
        <Badge variant="outline" className={cn('text-xs', getStatusColor(order.status))}>
          {order.status.toUpperCase()}
        </Badge>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Amount</p>
          <p className="font-medium">{order.amountIn} {order.tokenIn.symbol}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Target Price</p>
          <div className="flex items-center gap-1">
            {isAboveMarket ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span className="font-medium">${order.targetPrice.toFixed(6)}</span>
            <span className={cn(
              'text-xs',
              isAboveMarket ? 'text-green-500' : 'text-red-500'
            )}>
              ({priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Current Price</p>
          <p className="font-medium">${order.currentPrice.toFixed(6)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Expires In</p>
          <p className={cn(
            'font-medium',
            timeLeft < 3600000 && order.status === 'active' && 'text-yellow-500'
          )}>
            {formatTimeLeft(timeLeft)}
          </p>
        </div>
      </div>

      {/* Actions */}
      {order.status === 'active' && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:bg-destructive/10"
          onClick={() => onCancel(order.id)}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel Order
        </Button>
      )}
    </div>
  );
}

export function LimitOrderPanel() {
  const { address, isConnected, signer } = useWeb3();
  const { addOrder, cancelOrder, getActiveOrders, getOrderHistory, expireOrders, fillOrder } = useLimitOrderStore();
  const { prices } = useRealtimePrices();
  
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(TOKEN_LIST[0]);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(TOKEN_LIST[4]);
  const [amountIn, setAmountIn] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [expiryIndex, setExpiryIndex] = useState(1); // Default 24 hours
  const [creating, setCreating] = useState(false);

  const activeOrders = address ? getActiveOrders(address) : [];
  const orderHistory = address ? getOrderHistory(address) : [];

  // Get current market price
  const currentPrice = tokenOut ? (prices[tokenOut.symbol] || 1) : 1;

  // Check if any orders should be filled (simulated)
  useEffect(() => {
    if (!address) return;

    const checkOrders = () => {
      expireOrders();
      const orders = getActiveOrders(address);
      
      for (const order of orders) {
        const currentMarketPrice = prices[order.tokenOut.symbol] || order.currentPrice;
        
        // Simulate fill if price reached target
        if (
          (order.targetPrice <= order.currentPrice && currentMarketPrice <= order.targetPrice) ||
          (order.targetPrice > order.currentPrice && currentMarketPrice >= order.targetPrice)
        ) {
          fillOrder(order.id);
          playSuccessSound();
          toast.success(`Limit order filled! ${order.amountIn} ${order.tokenIn.symbol} → ${order.tokenOut.symbol}`);
        }
      }
    };

    const interval = setInterval(checkOrders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [address, prices, expireOrders, getActiveOrders, fillOrder]);

  const handleCreateOrder = async () => {
    if (!tokenIn || !tokenOut || !amountIn || !targetPrice || !address) {
      toast.error('Please fill all fields');
      return;
    }

    const amount = parseFloat(amountIn);
    const target = parseFloat(targetPrice);

    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }

    if (isNaN(target) || target <= 0) {
      toast.error('Invalid target price');
      return;
    }

    setCreating(true);
    try {
      const orderId = addOrder({
        tokenIn,
        tokenOut,
        amountIn,
        targetPrice: target,
        currentPrice,
        expiresAt: Date.now() + EXPIRY_OPTIONS[expiryIndex].value,
        walletAddress: address,
      });

      playNotificationSound();
      toast.success('Limit order created successfully!');
      
      // Reset form
      setAmountIn('');
      setTargetPrice('');
    } catch (error) {
      console.error('Create order error:', error);
      toast.error('Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  const handleCancelOrder = (id: string) => {
    cancelOrder(id);
    toast.success('Order cancelled');
  };

  const setMarketPrice = () => {
    setTargetPrice(currentPrice.toFixed(6));
  };

  if (!isConnected) {
    return (
      <div className="glass-card p-8 text-center">
        <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">Connect wallet to use limit orders</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="create">Create Order</TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4 mt-4">
          {/* Token Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sell</Label>
              <TokenSelect
                selected={tokenIn}
                onSelect={setTokenIn}
                excludeToken={tokenOut}
              />
            </div>
            <div className="space-y-2">
              <Label>Buy</Label>
              <TokenSelect
                selected={tokenOut}
                onSelect={setTokenOut}
                excludeToken={tokenIn}
              />
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>Amount to Sell</Label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {tokenIn?.symbol}
              </span>
            </div>
          </div>

          {/* Target Price */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                Target Price
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Order will execute when {tokenOut?.symbol} reaches this price</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <button
                onClick={setMarketPrice}
                className="text-xs text-primary hover:underline"
              >
                Use Market Price
              </button>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Current market: ${currentPrice.toFixed(6)}
            </p>
          </div>

          {/* Expiry */}
          <div className="space-y-2">
            <Label>Expires In</Label>
            <div className="flex gap-2">
              {EXPIRY_OPTIONS.map((option, index) => (
                <Button
                  key={option.label}
                  variant={expiryIndex === index ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setExpiryIndex(index)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCreateOrder}
            disabled={creating || !amountIn || !targetPrice}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Order...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Create Limit Order
              </>
            )}
          </Button>

          {/* Info Note */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5" />
              <p className="text-xs text-blue-500">
                Limit orders are simulated on testnet. Orders will auto-fill when market price reaches your target.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {activeOrders.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No active orders</p>
              <p className="text-xs text-muted-foreground/70">Create a limit order to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {activeOrders.map(order => (
                  <OrderCard key={order.id} order={order} onCancel={handleCancelOrder} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {orderHistory.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No order history</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {orderHistory.map(order => (
                  <OrderCard key={order.id} order={order} onCancel={handleCancelOrder} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
