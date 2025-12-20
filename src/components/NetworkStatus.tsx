import { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { NEXUS_TESTNET } from '@/config/contracts';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { rpcProvider } from '@/lib/rpcProvider';

type NetworkState = 'connected' | 'wrong-network' | 'disconnected';

export function NetworkStatus() {
  const { isConnected, chainId, switchToNexus } = useWeb3();
  const [networkState, setNetworkState] = useState<NetworkState>('disconnected');
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    if (!isConnected) {
      setNetworkState('disconnected');
      return;
    }

    if (chainId !== NEXUS_TESTNET.chainId) {
      setNetworkState('wrong-network');
      return;
    }

    setNetworkState('connected');

    // Check RPC health using centralized provider
    const checkHealth = async () => {
      // Throttle health checks to every 60 seconds
      const now = Date.now();
      if (now - lastCheckRef.current < 60000) return;
      lastCheckRef.current = now;

      const provider = rpcProvider.getProvider();
      if (!provider || !rpcProvider.isAvailable()) {
        setLatency(null);
        return;
      }

      try {
        const start = Date.now();
        const block = await rpcProvider.call(
          () => provider.getBlockNumber(),
          'network_block_number'
        );
        const end = Date.now();
        
        if (block !== null) {
          setLatency(end - start);
          setBlockNumber(block);
        } else {
          setLatency(null);
        }
      } catch {
        setLatency(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every 60 seconds
    return () => clearInterval(interval);
  }, [isConnected, chainId]);

  if (networkState === 'disconnected') {
    return null;
  }

  if (networkState === 'wrong-network') {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={switchToNexus}
        className="gap-2"
      >
        <AlertTriangle className="w-4 h-4" />
        <span className="hidden sm:inline">Switch to Nexus</span>
        <span className="sm:hidden">Switch</span>
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
          <div className={cn(
            'w-2 h-2 rounded-full',
            rpcProvider.isAvailable() ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
          )} />
          <span className="text-xs font-medium text-muted-foreground">
            Nexus
          </span>
          {blockNumber && (
            <span className="text-xs text-muted-foreground/70">
              #{blockNumber.toLocaleString()}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            {rpcProvider.isAvailable() ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-yellow-500" />
            )}
            <span>Nexus Testnet (Chain ID: {NEXUS_TESTNET.chainId})</span>
          </div>
          {latency !== null && (
            <div className="text-muted-foreground">
              Latency: {latency}ms
            </div>
          )}
          {blockNumber && (
            <div className="text-muted-foreground">
              Block: #{blockNumber.toLocaleString()}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}