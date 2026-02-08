import { memo, useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Wifi, WifiOff, Radio, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenPrice } from '@/hooks/useRealtimePrices';

interface LivePriceIndicatorProps {
  price: TokenPrice;
  showChange?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
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

function LivePriceIndicator({ price, showChange = true, size = 'md', showPulse = false }: LivePriceIndicatorProps) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const prevPriceRef = useRef(price.price);
  const classes = sizeClasses[size];

  useEffect(() => {
    // Detect price change direction
    if (price.price !== prevPriceRef.current) {
      const direction = price.price > prevPriceRef.current ? 'up' : 'down';
      setFlash(direction);
      setIsUpdating(true);
      prevPriceRef.current = price.price;
      
      const flashTimer = setTimeout(() => setFlash(null), 600);
      const updateTimer = setTimeout(() => setIsUpdating(false), 200);
      
      return () => {
        clearTimeout(flashTimer);
        clearTimeout(updateTimer);
      };
    }
  }, [price.price, price.lastUpdate]);

  const isUp = price.priceChangePercent > 0;
  const isDown = price.priceChangePercent < 0;

  return (
    <div className="flex items-center gap-2">
      {/* Live pulse indicator */}
      {showPulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      )}
      
      {/* Price with flash animation */}
      <span className={cn(
        'font-mono font-medium transition-all duration-300 relative',
        classes.price,
        flash === 'up' && 'text-green-500 scale-105',
        flash === 'down' && 'text-red-500 scale-105',
        isUpdating && 'animate-pulse'
      )}>
        ${price.price.toFixed(6)}
        
        {/* Flash overlay */}
        {flash && (
          <span className={cn(
            'absolute inset-0 rounded animate-fade-out',
            flash === 'up' ? 'bg-green-500/20' : 'bg-red-500/20'
          )} />
        )}
      </span>
      
      {showChange && (
        <div className={cn(
          'flex items-center gap-1 font-medium transition-transform duration-200',
          classes.change,
          isUp && 'text-green-500',
          isDown && 'text-red-500',
          !isUp && !isDown && 'text-muted-foreground',
          flash && 'scale-110'
        )}>
          {isUp && <TrendingUp className={cn(classes.icon, 'animate-bounce-subtle')} />}
          {isDown && <TrendingDown className={cn(classes.icon, 'animate-bounce-subtle')} />}
          {!isUp && !isDown && <Minus className={classes.icon} />}
          <span>{Math.abs(price.priceChangePercent).toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}

interface ConnectionStatusProps {
  isConnected: boolean;
  isWsConnected?: boolean;
  showLabel?: boolean;
}

export function ConnectionStatus({ isConnected, isWsConnected = false, showLabel = true }: ConnectionStatusProps) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300',
      isWsConnected 
        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
        : isConnected 
          ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
          : 'bg-red-500/10 text-red-500 border border-red-500/20'
    )}>
      {isWsConnected ? (
        <>
          <Radio className="w-3 h-3" />
          {showLabel && <span>Real-time</span>}
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
        </>
      ) : isConnected ? (
        <>
          <Wifi className="w-3 h-3" />
          {showLabel && <span>Live</span>}
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" style={{ animationDuration: '2s' }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500" />
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          {showLabel && <span>Offline</span>}
        </>
      )}
    </div>
  );
}

// Compact activity indicator for headers
export function ActivityIndicator({ isActive = true }: { isActive?: boolean }) {
  if (!isActive) return null;
  
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Activity className="w-3 h-3 animate-pulse text-green-500" />
      <span className="hidden sm:inline">Live</span>
    </div>
  );
}

export default memo(LivePriceIndicator);
