import { useState, useEffect } from 'react';
import { rpcProvider } from '@/lib/rpcProvider';
import { Wifi, WifiOff, Loader2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type RpcStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
type WsStatus = 'connected' | 'connecting' | 'disconnected';

export function RpcStatusIndicator() {
  const [status, setStatus] = useState<RpcStatus>('connecting');
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      const provider = rpcProvider.getProvider();
      const isAvailable = rpcProvider.isAvailable();
      
      // HTTP RPC status
      if (!provider) {
        setStatus('connecting');
      } else if (isAvailable) {
        setStatus('connected');
      } else {
        setStatus('connecting');
      }

      // WebSocket status
      const wsAvailable = rpcProvider.isWsAvailable();
      const wsProvider = rpcProvider.getWsProvider();
      
      if (!wsProvider) {
        setWsStatus('connecting');
      } else if (wsAvailable) {
        setWsStatus('connected');
      } else {
        setWsStatus('disconnected');
      }

      setLastCheck(new Date());
    };

    // Initial check
    checkStatus();

    // Check every 60 seconds to reduce load
    const interval = setInterval(checkStatus, 60000);
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

  const wsStatusConfig = {
    connected: {
      color: 'text-green-500',
      label: 'WebSocket Connected',
      description: 'Real-time updates active',
    },
    connecting: {
      color: 'text-yellow-500',
      label: 'WebSocket Connecting...',
      description: 'Establishing real-time connection',
    },
    disconnected: {
      color: 'text-muted-foreground',
      label: 'WebSocket Disconnected',
      description: 'Real-time updates unavailable',
    },
  };

  const config = statusConfig[status];
  const wsConfig = wsStatusConfig[wsStatus];
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
          <div className="flex items-center gap-1">
            <Icon 
              className={cn(
                'w-4 h-4',
                config.color,
                status === 'connecting' && 'animate-spin'
              )} 
            />
            {/* WebSocket indicator */}
            <Radio 
              className={cn(
                'w-3 h-3',
                wsStatus === 'connected' ? 'text-green-500' : 
                wsStatus === 'connecting' ? 'text-yellow-500' : 'text-muted-foreground'
              )} 
            />
          </div>
          {/* Pulse indicator */}
          {status === 'connected' && wsStatus === 'connected' && (
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
      <TooltipContent side="bottom" className="max-w-[220px]">
        <div className="space-y-2">
          {/* HTTP RPC Status */}
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', config.pulse)} />
              {config.label}
            </p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
          
          {/* WebSocket Status */}
          <div className="space-y-1 border-t border-border/50 pt-2">
            <p className="font-medium flex items-center gap-2">
              <Radio className={cn('w-3 h-3', wsConfig.color)} />
              {wsConfig.label}
            </p>
            <p className="text-xs text-muted-foreground">{wsConfig.description}</p>
          </div>
          
          {lastCheck && (
            <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
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
