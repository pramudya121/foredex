import { useState, useEffect, memo } from 'react';
import { rpcProvider } from '@/lib/rpcProvider';
import { WifiOff, Wifi, RefreshCw, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const RpcStatusBanner = memo(function RpcStatusBanner() {
  const [status, setStatus] = useState<'connected' | 'degraded' | 'offline'>('connected');
  const [retrying, setRetrying] = useState(false);
  const [lastCheck, setLastCheck] = useState(Date.now());

  useEffect(() => {
    const check = () => {
      const available = rpcProvider.isAvailable();
      const wsAvailable = rpcProvider.isWsAvailable();
      
      if (available && wsAvailable) {
        setStatus('connected');
      } else if (available) {
        setStatus('connected'); // HTTP works, WS optional
      } else {
        setStatus('offline');
      }
      setLastCheck(Date.now());
    };

    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    // Force provider re-initialization
    try {
      const provider = rpcProvider.getProvider();
      if (provider) {
        await provider.getBlockNumber();
        setStatus('connected');
      }
    } catch {
      setStatus('offline');
    } finally {
      setRetrying(false);
    }
  };

  if (status === 'connected') return null;

  return (
    <div className={cn(
      'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-lg backdrop-blur-md transition-all animate-slide-up',
      status === 'offline' 
        ? 'bg-destructive/10 border-destructive/30 text-destructive' 
        : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
    )}>
      {status === 'offline' ? (
        <WifiOff className="w-4 h-4 shrink-0" />
      ) : (
        <Wifi className="w-4 h-4 shrink-0" />
      )}
      <div className="text-sm">
        <span className="font-medium">
          {status === 'offline' ? 'Network Offline' : 'Connection Degraded'}
        </span>
        <span className="text-muted-foreground ml-1.5 text-xs">
          — Using cached data
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRetry}
        disabled={retrying}
        className="h-7 px-2.5 text-xs shrink-0"
      >
        <RefreshCw className={cn('w-3 h-3 mr-1', retrying && 'animate-spin')} />
        Retry
      </Button>
    </div>
  );
});

export default RpcStatusBanner;
