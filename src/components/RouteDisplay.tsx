import { ArrowRight, Zap, Route } from 'lucide-react';
import { SwapRoute } from '@/lib/multiHopRouter';
import { TokenLogo } from './TokenLogo';
import { cn } from '@/lib/utils';
import { ethers } from 'ethers';

interface RouteDisplayProps {
  route: SwapRoute | null;
  isLoading?: boolean;
  className?: string;
}

export function RouteDisplay({ route, isLoading, className }: RouteDisplayProps) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Route className="w-4 h-4 animate-pulse" />
        <span className="animate-pulse">Finding best route...</span>
      </div>
    );
  }

  if (!route) {
    return null;
  }

  const isMultiHop = route.path.length > 2;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Route header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {isMultiHop ? (
            <>
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Multi-Hop Route</span>
            </>
          ) : (
            <>
              <Route className="w-3.5 h-3.5" />
              <span>Direct Route</span>
            </>
          )}
        </div>
        <span>~{(route.gasEstimate / 1000).toFixed(0)}k gas</span>
      </div>

      {/* Route visualization */}
      <div className="flex items-center justify-center gap-1 p-2 rounded-lg bg-muted/30">
        {route.path.map((token, index) => (
          <div key={token.address} className="flex items-center">
            <div className="flex flex-col items-center">
              <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="sm" />
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {token.symbol}
              </span>
            </div>
            {index < route.path.length - 1 && (
              <ArrowRight className="w-3 h-3 mx-1 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Multi-hop savings indicator */}
      {isMultiHop && (
        <div className="flex items-center justify-center gap-1 text-xs text-primary">
          <Zap className="w-3 h-3" />
          <span>Better rate via {route.path[1].symbol}</span>
        </div>
      )}
    </div>
  );
}

// Compact route display for inline use
interface CompactRouteProps {
  route: SwapRoute | null;
}

export function CompactRoute({ route }: CompactRouteProps) {
  if (!route) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span>Route:</span>
      {route.path.map((token, index) => (
        <span key={token.address} className="flex items-center">
          <span className="font-medium text-foreground">{token.symbol}</span>
          {index < route.path.length - 1 && (
            <ArrowRight className="w-2.5 h-2.5 mx-0.5" />
          )}
        </span>
      ))}
    </div>
  );
}

// Route comparison component
interface RouteComparisonProps {
  routes: SwapRoute[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  tokenOutDecimals: number;
}

export function RouteComparison({ 
  routes, 
  selectedIndex, 
  onSelect,
  tokenOutDecimals 
}: RouteComparisonProps) {
  if (routes.length <= 1) return null;

  const bestOutput = routes[0]?.amountOut || BigInt(0);

  return (
    <div className="space-y-2">
      <span className="text-xs text-muted-foreground">Available Routes</span>
      <div className="space-y-1">
        {routes.slice(0, 3).map((route, index) => {
          const isSelected = index === selectedIndex;
          const isBest = index === 0;
          const outputDiff = bestOutput > BigInt(0) 
            ? ((Number(bestOutput - route.amountOut) / Number(bestOutput)) * 100)
            : 0;

          return (
            <button
              key={index}
              onClick={() => onSelect(index)}
              className={cn(
                'w-full p-2 rounded-lg border transition-all text-left',
                isSelected 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border/50 bg-muted/20 hover:border-border'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {route.path.map((token, idx) => (
                    <span key={token.address} className="flex items-center text-xs">
                      <span className={cn(
                        'font-medium',
                        isSelected ? 'text-primary' : 'text-foreground'
                      )}>
                        {token.symbol}
                      </span>
                      {idx < route.path.length - 1 && (
                        <ArrowRight className="w-2 h-2 mx-0.5 text-muted-foreground" />
                      )}
                    </span>
                  ))}
                  {isBest && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-primary/20 text-primary rounded">
                      BEST
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium">
                    {parseFloat(ethers.formatUnits(route.amountOut, tokenOutDecimals)).toFixed(4)}
                  </div>
                  {!isBest && outputDiff > 0 && (
                    <div className="text-[10px] text-destructive">
                      -{outputDiff.toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
