import { memo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BalanceRetryButtonProps {
  onRetry: () => Promise<void> | void;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}

export const BalanceRetryButton = memo(({ 
  onRetry, 
  loading = false, 
  className,
  size = 'sm'
}: BalanceRetryButtonProps) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (isRetrying || loading) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      // Small delay to show the animation
      setTimeout(() => setIsRetrying(false), 500);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleRetry}
      disabled={isRetrying || loading}
      className={cn(
        'h-6 w-6 p-0 rounded-full hover:bg-primary/10',
        className
      )}
      title="Refresh balance"
    >
      <RefreshCw className={cn(
        'w-3 h-3',
        (isRetrying || loading) && 'animate-spin'
      )} />
    </Button>
  );
});

BalanceRetryButton.displayName = 'BalanceRetryButton';
