import { useState, useEffect, useCallback, memo } from 'react';
import { RefreshCw, Clock, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AutoRefreshTimerProps {
  /** Interval in seconds between refreshes */
  intervalSeconds?: number;
  /** Callback function to trigger refresh */
  onRefresh: () => void | Promise<void>;
  /** Whether the refresh is currently in progress */
  isRefreshing?: boolean;
  /** Whether to show the progress bar */
  showProgress?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Custom class name */
  className?: string;
  /** Whether auto-refresh is initially enabled */
  initiallyEnabled?: boolean;
}

export const AutoRefreshTimer = memo(function AutoRefreshTimer({
  intervalSeconds = 30,
  onRefresh,
  isRefreshing = false,
  showProgress = true,
  size = 'sm',
  className,
  initiallyEnabled = true,
}: AutoRefreshTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(intervalSeconds);
  const [isEnabled, setIsEnabled] = useState(initiallyEnabled);
  const [isPaused, setIsPaused] = useState(false);

  // Calculate progress percentage
  const progress = ((intervalSeconds - timeRemaining) / intervalSeconds) * 100;

  // Handle manual refresh
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setTimeRemaining(intervalSeconds);
    await onRefresh();
  }, [onRefresh, isRefreshing, intervalSeconds]);

  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback(() => {
    setIsEnabled(prev => !prev);
    if (!isEnabled) {
      setTimeRemaining(intervalSeconds);
    }
  }, [isEnabled, intervalSeconds]);

  // Toggle pause
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Countdown and auto-refresh logic
  useEffect(() => {
    if (!isEnabled || isPaused || isRefreshing) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Trigger refresh when countdown reaches 0
          onRefresh();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isEnabled, isPaused, isRefreshing, onRefresh, intervalSeconds]);

  // Reset timer when refresh completes
  useEffect(() => {
    if (!isRefreshing && isEnabled) {
      setTimeRemaining(intervalSeconds);
    }
  }, [isRefreshing, isEnabled, intervalSeconds]);

  // Format time display
  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const isSmall = size === 'sm';

  return (
    <TooltipProvider>
      <div className={cn(
        'flex items-center gap-2',
        className
      )}>
        {/* Progress bar (optional) */}
        {showProgress && isEnabled && !isPaused && (
          <div className={cn(
            'relative overflow-hidden rounded-full bg-muted/50',
            isSmall ? 'w-16 h-1.5' : 'w-24 h-2'
          )}>
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Countdown badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={isEnabled ? 'default' : 'secondary'}
              className={cn(
                'cursor-pointer select-none transition-all duration-200',
                isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
                isEnabled && !isPaused && 'animate-pulse',
                !isEnabled && 'opacity-60'
              )}
              onClick={toggleAutoRefresh}
            >
              <Clock className={cn(
                'mr-1',
                isSmall ? 'w-3 h-3' : 'w-4 h-4'
              )} />
              {isEnabled ? (
                isPaused ? 'Paused' : formatTime(timeRemaining)
              ) : (
                'Auto Off'
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isEnabled 
                ? `Auto-refresh in ${formatTime(timeRemaining)}. Click to disable.`
                : 'Auto-refresh disabled. Click to enable.'
              }
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Pause button (only when enabled) */}
        {isEnabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePause}
                className={cn(
                  'transition-all duration-200',
                  isSmall ? 'h-7 w-7' : 'h-8 w-8',
                  isPaused && 'text-amber-500 hover:text-amber-400'
                )}
              >
                {isPaused ? (
                  <Play className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />
                ) : (
                  <Pause className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPaused ? 'Resume auto-refresh' : 'Pause auto-refresh'}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Manual refresh button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={isSmall ? 'sm' : 'default'}
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={cn(
                'transition-all duration-200',
                isSmall && 'h-7 px-2'
              )}
            >
              <RefreshCw className={cn(
                isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4',
                isRefreshing && 'animate-spin'
              )} />
              <span className={cn(
                'ml-1.5',
                isSmall ? 'hidden sm:inline text-xs' : 'hidden md:inline'
              )}>
                Refresh
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh now</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
});

export default AutoRefreshTimer;
