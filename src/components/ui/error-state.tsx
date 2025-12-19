import { memo } from 'react';
import { AlertCircle, RefreshCw, WifiOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: 'default' | 'network' | 'timeout' | 'empty';
  className?: string;
}

const variantConfig = {
  default: {
    icon: AlertCircle,
    iconColor: 'text-destructive',
    bgColor: 'bg-destructive/10',
    title: 'Something went wrong',
    message: 'An error occurred. Please try again.',
  },
  network: {
    icon: WifiOff,
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    title: 'Connection Error',
    message: 'Unable to connect to the network. Please check your connection.',
  },
  timeout: {
    icon: Clock,
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    title: 'Request Timeout',
    message: 'The request took too long. Please try again.',
  },
  empty: {
    icon: AlertCircle,
    iconColor: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    title: 'No Data',
    message: 'No data available at the moment.',
  },
};

export const ErrorState = memo(function ErrorState({
  title,
  message,
  onRetry,
  variant = 'default',
  className,
}: ErrorStateProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl text-center',
      config.bgColor,
      className
    )}>
      <div className={cn(
        'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-4',
        'bg-background/50'
      )}>
        <Icon className={cn('w-6 h-6 sm:w-7 sm:h-7', config.iconColor)} />
      </div>
      
      <h3 className="text-base sm:text-lg font-semibold mb-1.5">
        {title || config.title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {message || config.message}
      </p>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2 touch-manipulation"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      )}
    </div>
  );
});

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState = memo(function LoadingState({
  message = 'Loading...',
  className,
}: LoadingStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8 sm:p-12',
      className
    )}>
      <div className="relative">
        <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 border-primary/30 rounded-full" />
        <div className="absolute inset-0 w-10 h-10 sm:w-12 sm:h-12 border-3 border-t-primary rounded-full animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground mt-4">{message}</p>
    </div>
  );
});

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8 sm:p-12 text-center',
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground/50">
          {icon}
        </div>
      )}
      
      <h3 className="text-base sm:text-lg font-semibold mb-1.5">
        {title}
      </h3>
      
      {message && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {message}
        </p>
      )}

      {action}
    </div>
  );
});