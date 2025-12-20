import { memo, useEffect, useState, useMemo } from 'react';
import { ArrowRightLeft, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from '@/components/TokenLogo';
import { TOKEN_LIST } from '@/config/contracts';
import { Skeleton } from '@/components/ui/skeleton';

interface Trade {
  id: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  timestamp: number;
  type: 'buy' | 'sell';
}

function generateMockTrades(): Trade[] {
  const tokens = TOKEN_LIST.filter(t => t.address !== '0x0000000000000000000000000000000000000000');
  const trades: Trade[] = [];
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    const tokenIn = tokens[Math.floor(Math.random() * tokens.length)];
    let tokenOut = tokens[Math.floor(Math.random() * tokens.length)];
    while (tokenOut.address === tokenIn.address) {
      tokenOut = tokens[Math.floor(Math.random() * tokens.length)];
    }

    trades.push({
      id: `trade_${i}_${Date.now()}`,
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountIn: Math.random() * 100,
      amountOut: Math.random() * 100,
      timestamp: now - Math.floor(Math.random() * 3600000), // Last hour
      type: Math.random() > 0.5 ? 'buy' : 'sell',
    });
  }

  return trades.sort((a, b) => b.timestamp - a.timestamp);
}

const TradeRow = memo(({ trade, isNew }: { trade: Trade; isNew: boolean }) => {
  const tokenIn = TOKEN_LIST.find(t => t.address.toLowerCase() === trade.tokenIn.toLowerCase());
  const tokenOut = TOKEN_LIST.find(t => t.address.toLowerCase() === trade.tokenOut.toLowerCase());

  const timeAgo = useMemo(() => {
    const seconds = Math.floor((Date.now() - trade.timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }, [trade.timestamp]);

  return (
    <div className={cn(
      'flex items-center justify-between p-2 rounded-lg transition-all duration-300',
      isNew ? 'bg-primary/10 animate-pulse' : 'hover:bg-muted/30'
    )}>
      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-2">
          <TokenLogo symbol={tokenIn?.symbol || '?'} logoURI={tokenIn?.logoURI} size="sm" />
          <TokenLogo symbol={tokenOut?.symbol || '?'} logoURI={tokenOut?.logoURI} size="sm" />
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="font-medium">{trade.amountIn.toFixed(2)}</span>
          <span className="text-muted-foreground">{tokenIn?.symbol}</span>
          <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium">{trade.amountOut.toFixed(2)}</span>
          <span className="text-muted-foreground">{tokenOut?.symbol}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        {timeAgo}
      </div>
    </div>
  );
});

TradeRow.displayName = 'TradeRow';

function RecentTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTradeIds, setNewTradeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Initial load
    setTimeout(() => {
      setTrades(generateMockTrades());
      setLoading(false);
    }, 1000);

    // Simulate new trades coming in
    const interval = setInterval(() => {
      const tokens = TOKEN_LIST.filter(t => t.address !== '0x0000000000000000000000000000000000000000');
      const tokenIn = tokens[Math.floor(Math.random() * tokens.length)];
      let tokenOut = tokens[Math.floor(Math.random() * tokens.length)];
      while (tokenOut.address === tokenIn.address) {
        tokenOut = tokens[Math.floor(Math.random() * tokens.length)];
      }

      const newTrade: Trade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: Math.random() * 50,
        amountOut: Math.random() * 50,
        timestamp: Date.now(),
        type: Math.random() > 0.5 ? 'buy' : 'sell',
      };

      setNewTradeIds(prev => new Set([...prev, newTrade.id]));
      setTrades(prev => [newTrade, ...prev.slice(0, 9)]);

      // Remove highlight after animation
      setTimeout(() => {
        setNewTradeIds(prev => {
          const next = new Set(prev);
          next.delete(newTrade.id);
          return next;
        });
      }, 2000);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRightLeft className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Recent Trades</h3>
        </div>
        <div className="space-y-2">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Recent Trades</h3>
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {trades.slice(0, 6).map(trade => (
          <TradeRow 
            key={trade.id} 
            trade={trade} 
            isNew={newTradeIds.has(trade.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(RecentTrades);
