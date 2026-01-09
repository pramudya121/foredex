import { ArrowRight, Zap, Route, ChevronDown, ChevronUp, TrendingUp, Fuel } from 'lucide-react';
import { SwapRoute } from '@/lib/multiHopRouter';
import { TokenLogo } from './TokenLogo';
import { cn } from '@/lib/utils';
import { ethers } from 'ethers';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface RouteDisplayProps {
  route: SwapRoute | null;
  isLoading?: boolean;
  className?: string;
  showDetails?: boolean;
}

export function RouteDisplay({ route, isLoading, className, showDetails = false }: RouteDisplayProps) {
  const [expanded, setExpanded] = useState(showDetails);

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
      {/* Route header with toggle */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {isMultiHop ? (
            <>
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-primary">Multi-Hop Route</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 ml-1 bg-primary/10 text-primary border-primary/30">
                {route.path.length - 1} hops
              </Badge>
            </>
          ) : (
            <>
              <Route className="w-3.5 h-3.5" />
              <span>Direct Route</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Fuel className="w-3 h-3" />
            <span>~{(route.gasEstimate / 1000).toFixed(0)}k</span>
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Route visualization - Enhanced */}
      <div className="relative flex items-center justify-center gap-0 p-3 rounded-xl bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 border border-border/30">
        {/* Connection line */}
        <div className="absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 -translate-y-1/2 z-0" />
        
        {route.path.map((token, index) => (
          <div key={token.address} className="flex items-center z-10">
            <div className="flex flex-col items-center group">
              <div className={cn(
                'relative p-1 rounded-full bg-card border-2 transition-all',
                index === 0 ? 'border-green-500/50' : 
                index === route.path.length - 1 ? 'border-blue-500/50' : 
                'border-primary/50'
              )}>
                <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="sm" />
                {index > 0 && index < route.path.length - 1 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary flex items-center justify-center">
                    <Zap className="w-2 h-2 text-primary-foreground" />
                  </div>
                )}
              </div>
              <span className={cn(
                'text-[10px] mt-1 font-medium',
                index === 0 ? 'text-green-500' : 
                index === route.path.length - 1 ? 'text-blue-500' : 
                'text-primary'
              )}>
                {token.symbol}
              </span>
              {index === 0 && (
                <span className="text-[8px] text-muted-foreground">FROM</span>
              )}
              {index === route.path.length - 1 && (
                <span className="text-[8px] text-muted-foreground">TO</span>
              )}
            </div>
            {index < route.path.length - 1 && (
              <div className="flex items-center mx-2">
                <div className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-primary" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-2 text-xs">
          {/* Step-by-step breakdown */}
          <div className="p-2 rounded-lg bg-muted/20 border border-border/30 space-y-2">
            <div className="text-muted-foreground font-medium mb-1">Route Steps</div>
            {route.steps.map((step, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded bg-card/50">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <TokenLogo symbol={step.tokenIn.symbol} logoURI={step.tokenIn.logoURI} size="xs" />
                    <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />
                    <TokenLogo symbol={step.tokenOut.symbol} logoURI={step.tokenOut.logoURI} size="xs" />
                  </div>
                  <span className="text-muted-foreground">
                    {step.tokenIn.symbol} → {step.tokenOut.symbol}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-[10px]">
                    Pool: {step.pairAddress.slice(0, 6)}...{step.pairAddress.slice(-4)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Route stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-muted/20 text-center">
              <div className="text-[10px] text-muted-foreground">Hops</div>
              <div className="font-medium text-foreground">{route.steps.length}</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/20 text-center">
              <div className="text-[10px] text-muted-foreground">Impact</div>
              <div className={cn(
                'font-medium',
                route.priceImpact < 1 ? 'text-green-500' : 
                route.priceImpact < 3 ? 'text-yellow-500' : 
                'text-red-500'
              )}>
                {route.priceImpact.toFixed(2)}%
              </div>
            </div>
            <div className="p-2 rounded-lg bg-muted/20 text-center">
              <div className="text-[10px] text-muted-foreground">Gas</div>
              <div className="font-medium text-foreground">~{(route.gasEstimate / 1000).toFixed(0)}k</div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-hop savings indicator */}
      {isMultiHop && !expanded && (
        <div className="flex items-center justify-center gap-1.5 text-xs">
          <TrendingUp className="w-3 h-3 text-green-500" />
          <span className="text-green-500 font-medium">Better rate via {route.path.slice(1, -1).map(t => t.symbol).join(', ')}</span>
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
      <Route className="w-3 h-3" />
      <span>Route:</span>
      {route.path.map((token, index) => (
        <span key={token.address} className="flex items-center">
          <span className={cn(
            'font-medium',
            index === 0 ? 'text-green-500' : 
            index === route.path.length - 1 ? 'text-blue-500' : 
            'text-primary'
          )}>
            {token.symbol}
          </span>
          {index < route.path.length - 1 && (
            <ArrowRight className="w-2.5 h-2.5 mx-0.5" />
          )}
        </span>
      ))}
      {route.path.length > 2 && (
        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 ml-1 bg-primary/10 text-primary border-primary/30">
          Multi-hop
        </Badge>
      )}
    </div>
  );
}

// Enhanced route comparison component
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
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Available Routes</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {routes.length} routes found
        </Badge>
      </div>
      
      <div className="space-y-1.5">
        {routes.slice(0, 4).map((route, index) => {
          const isSelected = index === selectedIndex;
          const isBest = index === 0;
          const outputDiff = bestOutput > BigInt(0) 
            ? ((Number(bestOutput - route.amountOut) / Number(bestOutput)) * 100)
            : 0;
          const isMultiHop = route.path.length > 2;

          return (
            <button
              key={index}
              onClick={() => onSelect(index)}
              className={cn(
                'w-full p-3 rounded-xl border transition-all text-left',
                isSelected 
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' 
                  : 'border-border/50 bg-muted/20 hover:border-border hover:bg-muted/30'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Route path visualization */}
                  <div className="flex items-center gap-0.5">
                    {route.path.map((token, idx) => (
                      <div key={token.address} className="flex items-center">
                        <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="xs" />
                        {idx < route.path.length - 1 && (
                          <ArrowRight className="w-2.5 h-2.5 mx-0.5 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Badges */}
                  <div className="flex items-center gap-1">
                    {isBest && (
                      <Badge className="text-[9px] px-1.5 py-0 h-4 bg-green-500/20 text-green-500 border-green-500/30">
                        BEST
                      </Badge>
                    )}
                    {isMultiHop && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                        <Zap className="w-2 h-2 mr-0.5" />
                        {route.path.length - 1} hops
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Output amount */}
                <div className="text-right">
                  <div className={cn(
                    'text-sm font-semibold',
                    isSelected ? 'text-primary' : 'text-foreground'
                  )}>
                    {parseFloat(ethers.formatUnits(route.amountOut, tokenOutDecimals)).toFixed(4)}
                  </div>
                  {!isBest && outputDiff > 0 && (
                    <div className="text-[10px] text-destructive">
                      -{outputDiff.toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
              
              {/* Route details */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span>Impact: <span className={cn(
                    route.priceImpact < 1 ? 'text-green-500' : 
                    route.priceImpact < 3 ? 'text-yellow-500' : 
                    'text-red-500'
                  )}>{route.priceImpact.toFixed(2)}%</span></span>
                  <span>Gas: ~{(route.gasEstimate / 1000).toFixed(0)}k</span>
                </div>
                {isSelected && (
                  <span className="text-primary font-medium">Selected</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
