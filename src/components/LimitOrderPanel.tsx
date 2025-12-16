import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TOKEN_LIST, TokenInfo, CONTRACTS, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { useLimitOrderStore, LimitOrder } from '@/stores/limitOrderStore';
import { TokenSelect } from './TokenSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  Plus, 
  X, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  Timer,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function LimitOrderPanel() {
  const { provider, address, isConnected } = useWeb3();
  const { orders, addOrder, cancelOrder, getOrdersByUser, clearExpiredOrders } = useLimitOrderStore();
  
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(TOKEN_LIST[0]);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(TOKEN_LIST[4]);
  const [amountIn, setAmountIn] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [expireDays, setExpireDays] = useState(7);
  const [loading, setLoading] = useState(false);

  const userOrders = address ? getOrdersByUser(address) : [];

  // Fetch current price
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      if (!provider || !tokenIn || !tokenOut) return;
      
      try {
        const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
        const tokenInAddr = tokenIn.address === '0x0000000000000000000000000000000000000000' 
          ? CONTRACTS.WETH 
          : tokenIn.address;
        const tokenOutAddr = tokenOut.address === '0x0000000000000000000000000000000000000000' 
          ? CONTRACTS.WETH 
          : tokenOut.address;
        
        const pairAddress = await factory.getPair(tokenInAddr, tokenOutAddr);
        
        if (pairAddress === ethers.ZeroAddress) {
          setCurrentPrice(null);
          return;
        }
        
        const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
        const [token0, reserves] = await Promise.all([
          pair.token0(),
          pair.getReserves(),
        ]);
        
        const reserve0 = parseFloat(ethers.formatEther(reserves[0]));
        const reserve1 = parseFloat(ethers.formatEther(reserves[1]));
        
        if (token0.toLowerCase() === tokenInAddr.toLowerCase()) {
          setCurrentPrice(reserve1 / reserve0);
        } else {
          setCurrentPrice(reserve0 / reserve1);
        }
      } catch (error) {
        console.error('Error fetching price:', error);
        setCurrentPrice(null);
      }
    };

    fetchCurrentPrice();
    const interval = setInterval(fetchCurrentPrice, 30000);
    return () => clearInterval(interval);
  }, [provider, tokenIn, tokenOut]);

  // Clear expired orders periodically
  useEffect(() => {
    clearExpiredOrders();
    const interval = setInterval(clearExpiredOrders, 60000);
    return () => clearInterval(interval);
  }, [clearExpiredOrders]);

  const handleCreateOrder = () => {
    if (!tokenIn || !tokenOut || !amountIn || !targetPrice || !address) {
      toast.error('Please fill in all fields');
      return;
    }

    const targetPriceNum = parseFloat(targetPrice);
    if (isNaN(targetPriceNum) || targetPriceNum <= 0) {
      toast.error('Invalid target price');
      return;
    }

    setLoading(true);
    try {
      const expiresAt = Date.now() + expireDays * 24 * 60 * 60 * 1000;
      
      addOrder({
        tokenIn: {
          address: tokenIn.address,
          symbol: tokenIn.symbol,
          decimals: tokenIn.decimals,
        },
        tokenOut: {
          address: tokenOut.address,
          symbol: tokenOut.symbol,
          decimals: tokenOut.decimals,
        },
        amountIn,
        targetPrice,
        expiresAt,
        userAddress: address,
      });

      toast.success('Limit order created! We will notify you when the price target is reached.');
      setAmountIn('');
      setTargetPrice('');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create limit order');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    cancelOrder(orderId);
    toast.success('Order cancelled');
  };

  const getStatusIcon = (status: LimitOrder['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'executed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      case 'expired':
        return <Timer className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: LimitOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'executed':
        return 'text-green-500 bg-green-500/10';
      case 'cancelled':
        return 'text-muted-foreground bg-muted/50';
      case 'expired':
        return 'text-red-500 bg-red-500/10';
    }
  };

  const priceChangePercent = currentPrice && targetPrice 
    ? ((parseFloat(targetPrice) - currentPrice) / currentPrice * 100).toFixed(2)
    : null;

  return (
    <div className="glass-card p-6 w-full max-w-md mx-auto animate-fade-in">
      <Tabs defaultValue="create">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Order
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            My Orders ({userOrders.filter(o => o.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          {/* Token Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Sell Token</Label>
              <TokenSelect selected={tokenIn} onSelect={setTokenIn} excludeToken={tokenOut} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Buy Token</Label>
              <TokenSelect selected={tokenOut} onSelect={setTokenOut} excludeToken={tokenIn} />
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Amount to Sell</Label>
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

          {/* Current Price Display */}
          {currentPrice !== null && tokenIn && tokenOut && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Price</span>
                <span className="font-medium">
                  1 {tokenIn.symbol} = {currentPrice.toFixed(6)} {tokenOut.symbol}
                </span>
              </div>
            </div>
          )}

          {/* Target Price */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Target Price
            </Label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="pr-20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {tokenOut?.symbol}/{tokenIn?.symbol}
              </span>
            </div>
            {priceChangePercent && (
              <p className={cn(
                'text-xs',
                parseFloat(priceChangePercent) > 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {parseFloat(priceChangePercent) > 0 ? '+' : ''}{priceChangePercent}% from current price
              </p>
            )}
          </div>

          {/* Expiry */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Expires In
            </Label>
            <div className="flex gap-2">
              {[1, 7, 14, 30].map((days) => (
                <Button
                  key={days}
                  variant={expireDays === days ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExpireDays(days)}
                  className="flex-1"
                >
                  {days}d
                </Button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Limit orders are monitored locally. You'll receive a notification when your target price is reached, and you can execute the swap manually.
              </p>
            </div>
          </div>

          {/* Create Button */}
          {isConnected ? (
            <Button
              onClick={handleCreateOrder}
              disabled={loading || !amountIn || !targetPrice}
              className="w-full h-12 bg-gradient-wolf hover:opacity-90"
            >
              {loading ? (
                <Clock className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Target className="w-4 h-4 mr-2" />
              )}
              Create Limit Order
            </Button>
          ) : (
            <Button disabled className="w-full h-12" variant="secondary">
              Connect Wallet to Create Order
            </Button>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-3">
          {userOrders.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No limit orders yet</p>
              <p className="text-sm text-muted-foreground/70">
                Create your first order to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {userOrders.map((order) => (
                <div
                  key={order.id}
                  className={cn(
                    'p-4 rounded-lg border transition-all',
                    order.status === 'pending' 
                      ? 'bg-muted/30 border-border/50 hover:border-primary/30'
                      : 'bg-muted/10 border-border/30 opacity-70'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {order.tokenIn.symbol} → {order.tokenOut.symbol}
                      </span>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full flex items-center gap-1',
                        getStatusColor(order.status)
                      )}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                    </div>
                    {order.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelOrder(order.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Amount</p>
                      <p className="font-medium">{order.amountIn} {order.tokenIn.symbol}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Target Price</p>
                      <p className="font-medium flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        {order.targetPrice}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Created</p>
                      <p className="font-medium text-xs">
                        {format(order.createdAt, 'MMM d, HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Expires</p>
                      <p className="font-medium text-xs">
                        {format(order.expiresAt, 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
