import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataRefreshIndicatorProps {
  lastUpdated: number;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  interval?: number; // in seconds
  className?: string;
}

export function DataRefreshIndicator({
  lastUpdated,
  isRefreshing = false,
  onRefresh,
  interval = 15,
  className,
}: DataRefreshIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState('');
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const updateTime = () => {
      const diff = Math.floor((Date.now() - lastUpdated) / 1000);
      
      if (diff < 5) {
        setTimeAgo('Just now');
      } else if (diff < 60) {
        setTimeAgo(`${diff}s ago`);
      } else if (diff < 3600) {
        setTimeAgo(`${Math.floor(diff / 60)}m ago`);
      } else {
        setTimeAgo(`${Math.floor(diff / 3600)}h ago`);
      }
      
      // Calculate progress for next refresh
      const progressValue = Math.max(0, 100 - (diff / interval) * 100);
      setProgress(progressValue);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated, interval]);

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className={cn(
          'p-1.5 rounded-lg hover:bg-muted/50 transition-colors',
          isRefreshing && 'pointer-events-none'
        )}
        title="Refresh now"
      >
        <RefreshCw
          className={cn(
            'w-4 h-4',
            isRefreshing && 'animate-spin text-primary'
          )}
        />
      </button>
      
      <div className="flex items-center gap-2">
        <span className="text-xs">{timeAgo}</span>
        
        {/* Progress bar */}
        <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
