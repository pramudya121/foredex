import { memo, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenPrice } from '@/hooks/useRealtimePrices';

interface LivePriceIndicatorProps {
  price: TokenPrice;
  showChange?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: {
    price: 'text-sm',
    change: 'text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    price: 'text-base',
    change: 'text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    price: 'text-lg',
    change: 'text-base',
    icon: 'w-5 h-5',
  },
};

function LivePriceIndicator({ price, showChange = true, size = 'md' }: LivePriceIndicatorProps) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const classes = sizeClasses[size];

  useEffect(() => {
    if (price.priceChange !== 0) {
      setFlash(price.priceChange > 0 ? 'up' : 'down');
      const timer = setTimeout(() => setFlash(null), 500);
      return () => clearTimeout(timer);
    }
  }, [price.lastUpdate, price.priceChange]);

  const isUp = price.priceChangePercent > 0;
  const isDown = price.priceChangePercent < 0;

  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        'font-mono font-medium transition-colors duration-300',
        classes.price,
        flash === 'up' && 'text-green-500',
        flash === 'down' && 'text-red-500'
      )}>
        ${price.price.toFixed(6)}
      </span>
      
      {showChange && (
        <div className={cn(
          'flex items-center gap-1 font-medium',
          classes.change,
          isUp && 'text-green-500',
          isDown && 'text-red-500',
          !isUp && !isDown && 'text-muted-foreground'
        )}>
          {isUp && <TrendingUp className={classes.icon} />}
          {isDown && <TrendingDown className={classes.icon} />}
          {!isUp && !isDown && <Minus className={classes.icon} />}
          <span>{Math.abs(price.priceChangePercent).toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
      isConnected 
        ? 'bg-green-500/10 text-green-500' 
        : 'bg-red-500/10 text-red-500'
    )}>
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Live</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}

export default memo(LivePriceIndicator);
