import { memo } from 'react';
import { useChainlinkPrices } from '@/hooks/useChainlinkPrices';
import { TOKEN_LIST } from '@/config/contracts';
import { TokenLogo } from './TokenLogo';
import { TrendingUp, TrendingDown, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PriceFeedDisplayProps {
  className?: string;
  compact?: boolean;
}

export const PriceFeedDisplay = memo(function PriceFeedDisplay({ 
  className, 
  compact = false 
}: PriceFeedDisplayProps) {
  const { prices, loading, error, refresh } = useChainlinkPrices();

  if (loading && prices.size === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 sm:w-8 sm:h-8 rounded-full" />
              <Skeleton className="w-12 sm:w-16 h-4" />
            </div>
            <Skeleton className="w-16 sm:w-20 h-4" />
          </div>
        ))}
      </div>
    );
  }

  const tokens = TOKEN_LIST.filter(t => 
    t.address !== '0x0000000000000000000000000000000000000000'
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs sm:text-sm font-medium">Live Prices</span>
          <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
            Chainlink
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 sm:h-8 sm:w-8" 
              onClick={() => refresh()}
            >
              <RefreshCw className={cn('w-3 h-3 sm:w-4 sm:h-4', loading && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh prices</TooltipContent>
        </Tooltip>
      </div>

      {/* Price List */}
      <ScrollArea className={compact ? 'h-[200px]' : 'h-auto max-h-[400px]'}>
        <div className="space-y-1.5 sm:space-y-2">
          {tokens.map(token => {
            const priceData = prices.get(token.symbol.toUpperCase());
            const price = priceData?.price || 0;
            const change = priceData?.change24h || 0;
            const isPositive = change >= 0;

            return (
              <div 
                key={token.address}
                className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <TokenLogo 
                    symbol={token.symbol} 
                    logoURI={token.logoURI} 
                    size="sm"
                    className="flex-shrink-0" 
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{token.symbol}</p>
                    {!compact && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{token.name}</p>
                    )}
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-mono text-xs sm:text-sm font-medium">
                    ${price < 0.01 ? price.toFixed(8) : price.toFixed(4)}
                  </p>
                  <div className={cn(
                    'flex items-center justify-end gap-0.5 text-[10px] sm:text-xs font-medium',
                    isPositive ? 'text-green-500' : 'text-red-500'
                  )}>
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    )}
                    <span>{isPositive ? '+' : ''}{change.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Source indicator */}
      <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
        Prices simulated for testnet • Updates every 5s
      </p>
    </div>
  );
});
