import { memo } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { rpcProvider } from '@/lib/rpcProvider';
import { Button } from '@/components/ui/button';

interface RpcOfflineBannerProps {
  isOffline: boolean;
  isCachedData?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const RpcOfflineBanner = memo(({ isOffline, isCachedData, onRetry, isRetrying }: RpcOfflineBannerProps) => {
  if (!isOffline) return null;

  const handleRetry = () => {
    rpcProvider.reset();
    onRetry?.();
  };

  return (
    <div className="glass-card border-yellow-500/30 bg-yellow-500/5 p-3 mb-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <WifiOff className="w-4 h-4 text-yellow-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-500">RPC Offline</p>
            <p className="text-xs text-muted-foreground">
              {isCachedData 
                ? 'Showing cached data. Live data will resume when network recovers.' 
                : 'Showing estimated data. Connect to Nexus Testnet for live stats.'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={isRetrying}
          className="shrink-0 border-yellow-500/30 hover:border-yellow-500/50 text-xs"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    </div>
  );
});

RpcOfflineBanner.displayName = 'RpcOfflineBanner';
