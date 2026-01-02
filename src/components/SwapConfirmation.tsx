import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TokenInfo } from '@/config/contracts';
import { SwapRoute } from '@/lib/multiHopRouter';
import { TokenLogo } from './TokenLogo';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowDown, Loader2, Fuel, Clock, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPriceImpactSeverity } from './PriceImpactWarning';

interface SwapConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  amountOut: string;
  slippage: number;
  priceImpact: number;
  route?: SwapRoute | null;
  deadline: number;
  loading: boolean;
}

export function SwapConfirmation({
  open,
  onOpenChange,
  onConfirm,
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  slippage,
  priceImpact,
  route,
  deadline,
  loading,
}: SwapConfirmationProps) {
  const { provider } = useWeb3();
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [gasCost, setGasCost] = useState<string | null>(null);
  const [estimatingGas, setEstimatingGas] = useState(false);

  const severity = getPriceImpactSeverity(priceImpact);
  const minimumReceived = (parseFloat(amountOut) * (1 - slippage / 100)).toFixed(6);
  const rate = parseFloat(amountOut) / parseFloat(amountIn);

  useEffect(() => {
    const estimateGas = async () => {
      if (!provider || !open) {
        setGasCost('0.001');
        return;
      }
      
      setEstimatingGas(true);
      try {
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || BigInt(1000000000); // Default 1 gwei
        
        // Estimate gas for swap (approximate)
        const estimatedGas = route && route.path.length > 2 
          ? BigInt(250000) // Multi-hop
          : BigInt(150000); // Direct swap
        
        const totalCost = gasPrice * estimatedGas;
        const costFormatted = ethers.formatEther(totalCost);
        setGasEstimate(estimatedGas.toString());
        setGasCost(costFormatted || '0.001');
      } catch {
        setGasEstimate('150000');
        setGasCost('0.001');
      } finally {
        setEstimatingGas(false);
      }
    };

    estimateGas();
  }, [provider, open, route]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Confirm Swap</DialogTitle>
          <DialogDescription>
            Review the details of your swap before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Token Exchange Visual */}
          <div className="space-y-3">
            {/* From */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                <TokenLogo symbol={tokenIn.symbol} logoURI={tokenIn.logoURI} size="lg" />
                <div>
                  <p className="text-sm text-muted-foreground">You pay</p>
                  <p className="text-xl font-bold">{parseFloat(amountIn).toFixed(6)}</p>
                </div>
              </div>
              <span className="text-lg font-semibold">{tokenIn.symbol}</span>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="p-2 rounded-full bg-primary/10 border border-primary/30">
                <ArrowDown className="w-5 h-5 text-primary" />
              </div>
            </div>

            {/* To */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                <TokenLogo symbol={tokenOut.symbol} logoURI={tokenOut.logoURI} size="lg" />
                <div>
                  <p className="text-sm text-muted-foreground">You receive</p>
                  <p className="text-xl font-bold text-green-500">{parseFloat(amountOut).toFixed(6)}</p>
                </div>
              </div>
              <span className="text-lg font-semibold">{tokenOut.symbol}</span>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/30">
            {/* Rate */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rate</span>
              <span className="font-medium">
                1 {tokenIn.symbol} = {rate.toFixed(6)} {tokenOut.symbol}
              </span>
            </div>

            {/* Price Impact */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price Impact</span>
            <span className={cn(
                'font-medium',
                severity === 'safe' && 'text-green-500',
                severity === 'warning' && 'text-yellow-500',
                severity === 'danger' && 'text-orange-500',
                severity === 'critical' && 'text-red-500'
              )}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>

            {/* Minimum Received */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Minimum Received
              </span>
              <span className="font-medium">
                {minimumReceived} {tokenOut.symbol}
              </span>
            </div>

            {/* Slippage */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Slippage Tolerance</span>
              <span className="font-medium">{slippage}%</span>
            </div>

            {/* Deadline */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Transaction Deadline
              </span>
              <span className="font-medium">{deadline} min</span>
            </div>

            {/* Gas Estimate */}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border/30">
              <span className="text-muted-foreground flex items-center gap-1">
                <Fuel className="w-4 h-4" />
                Estimated Gas
              </span>
              <span className="font-medium">
                {estimatingGas ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  `~${parseFloat(gasCost || '0.001').toFixed(6)} NEX`
                )}
              </span>
            </div>

            {/* Route */}
            {route && route.path.length > 2 && (
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border/30">
                <span className="text-muted-foreground">Route</span>
                <span className="font-medium text-xs">
                  {route.path.map(t => t.symbol).join(' → ')}
                </span>
              </div>
            )}
          </div>

          {/* Warning for high price impact */}
          {(severity === 'danger' || severity === 'critical') && (
            <div className={cn(
              'flex items-start gap-3 p-3 rounded-lg',
              severity === 'danger' && 'bg-orange-500/10 border border-orange-500/30',
              severity === 'critical' && 'bg-red-500/10 border border-red-500/30'
            )}>
              <AlertTriangle className={cn(
                'w-5 h-5 flex-shrink-0 mt-0.5',
                severity === 'danger' && 'text-orange-500',
                severity === 'critical' && 'text-red-500'
              )} />
              <div>
                <p className={cn(
                  'font-medium text-sm',
                  severity === 'danger' && 'text-orange-500',
                  severity === 'critical' && 'text-red-500'
                )}>
                  {severity === 'critical' ? 'Very High Price Impact!' : 'High Price Impact'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {severity === 'critical' 
                    ? 'This trade will significantly move the market price. Consider reducing your trade size.'
                    : 'This trade has a high price impact. Proceed with caution.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading || severity === 'critical'}
            className={cn(
              'min-w-[120px]',
              severity === 'critical' 
                ? 'bg-destructive hover:bg-destructive/90'
                : 'bg-gradient-wolf hover:opacity-90'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Swapping...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm Swap
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
