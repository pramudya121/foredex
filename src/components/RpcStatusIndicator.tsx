import { useState, useEffect, memo } from 'react';
import { rpcProvider } from '@/lib/rpcProvider';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type RpcStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

function RpcStatusIndicatorInner() {
  const [status, setStatus] = useState<RpcStatus>('connecting');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      const provider = rpcProvider.getProvider();
      const isAvailable = rpcProvider.isAvailable();
      
      if (!provider) {
        setStatus('connecting');
      } else if (isAvailable) {
        setStatus('connected');
      } else {
        setStatus('error');
      }
      setLastCheck(new Date());
    };

    // Initial check
    checkStatus();

    // Check every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      pulse: 'bg-green-500',
      label: 'RPC Connected',
      description: 'Blockchain connection active',
    },
    connecting: {
      icon: Loader2,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      pulse: 'bg-yellow-500',
      label: 'Connecting...',
      description: 'Establishing blockchain connection',
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-muted-foreground',
      bg: 'bg-muted/30',
      pulse: 'bg-muted-foreground',
      label: 'Disconnected',
      description: 'No blockchain connection',
    },
    error: {
      icon: WifiOff,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      pulse: 'bg-red-500',
      label: 'Connection Error',
      description: 'RPC temporarily unavailable (rate limited)',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button 
          className={cn(
            'relative p-2 rounded-lg transition-colors',
            config.bg,
            'hover:opacity-80'
          )}
          onClick={() => {
            if (status === 'error') {
              rpcProvider.reset();
              setStatus('connecting');
            }
          }}
        >
          <Icon 
            className={cn(
              'w-4 h-4',
              config.color,
              status === 'connecting' && 'animate-spin'
            )} 
          />
          {/* Pulse indicator */}
          {status === 'connected' && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                config.pulse
              )} />
              <span className={cn(
                'relative inline-flex rounded-full h-2 w-2',
                config.pulse
              )} />
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <div className="space-y-1">
          <p className="font-medium flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full', config.pulse)} />
            {config.label}
          </p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
          {lastCheck && (
            <p className="text-xs text-muted-foreground">
              Last check: {lastCheck.toLocaleTimeString()}
            </p>
          )}
          {status === 'error' && (
            <p className="text-xs text-primary">Click to retry</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export const RpcStatusIndicator = memo(RpcStatusIndicatorInner);
