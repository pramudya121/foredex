import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface PriceImpactWarningProps {
  priceImpact: number;
  className?: string;
}

export function getPriceImpactSeverity(priceImpact: number): 'safe' | 'warning' | 'danger' | 'critical' {
  if (priceImpact < 1) return 'safe';
  if (priceImpact < 3) return 'warning';
  if (priceImpact < 10) return 'danger';
  return 'critical';
}

export function PriceImpactWarning({ priceImpact, className }: PriceImpactWarningProps) {
  const severity = getPriceImpactSeverity(priceImpact);

  if (severity === 'safe') {
    return null;
  }

  const config = {
    warning: {
      icon: Info,
      title: 'Low Price Impact',
      description: `Your trade has a ${priceImpact.toFixed(2)}% price impact. This is acceptable but consider smaller trades for better rates.`,
      variant: 'default' as const,
      className: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-200',
      iconClassName: 'text-yellow-500',
    },
    danger: {
      icon: AlertTriangle,
      title: 'High Price Impact',
      description: `Warning: This trade has a ${priceImpact.toFixed(2)}% price impact. You may receive significantly less than expected. Consider splitting your trade into smaller amounts.`,
      variant: 'destructive' as const,
      className: 'border-orange-500/50 bg-orange-500/10 text-orange-200',
      iconClassName: 'text-orange-500',
    },
    critical: {
      icon: ShieldAlert,
      title: 'Very High Price Impact!',
      description: `DANGER: This trade has a ${priceImpact.toFixed(2)}% price impact! You will lose a significant amount of value. This is likely due to low liquidity. Please reduce your trade size or find another route.`,
      variant: 'destructive' as const,
      className: 'border-destructive/50 bg-destructive/10 text-destructive',
      iconClassName: 'text-destructive',
    },
  };

  const currentConfig = config[severity];
  const Icon = currentConfig.icon;

  return (
    <Alert className={cn(currentConfig.className, 'animate-pulse-glow', className)}>
      <Icon className={cn('h-4 w-4', currentConfig.iconClassName)} />
      <AlertTitle className="font-semibold">{currentConfig.title}</AlertTitle>
      <AlertDescription className="text-sm opacity-90">
        {currentConfig.description}
      </AlertDescription>
    </Alert>
  );
}

// Inline badge for showing price impact in the swap form
export function PriceImpactBadge({ priceImpact }: { priceImpact: number }) {
  const severity = getPriceImpactSeverity(priceImpact);

  const colorClasses = {
    safe: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-orange-500',
    critical: 'text-destructive animate-pulse',
  };

  return (
    <span className={cn('font-medium', colorClasses[severity])}>
      {priceImpact.toFixed(2)}%
      {severity === 'critical' && (
        <AlertTriangle className="inline-block w-3 h-3 ml-1" />
      )}
    </span>
  );
}

// Slippage protection indicator
interface SlippageProtectionProps {
  slippage: number;
  priceImpact: number;
}

export function SlippageProtection({ slippage, priceImpact }: SlippageProtectionProps) {
  const isProtected = slippage >= priceImpact;
  const isHighRisk = priceImpact > slippage * 2;

  if (isProtected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-500">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Slippage protection active
      </div>
    );
  }

  if (isHighRisk) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle className="w-3 h-3" />
        Price impact exceeds slippage tolerance - consider increasing slippage to {Math.ceil(priceImpact)}%
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-yellow-500">
      <AlertTriangle className="w-3 h-3" />
      Low slippage tolerance for this trade
    </div>
  );
}
