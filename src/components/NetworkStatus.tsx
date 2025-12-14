import { useState, useEffect } from 'react';
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

type NetworkState = 'connected' | 'wrong-network' | 'disconnected';

export function NetworkStatus() {
  const { isConnected, chainId, switchToNexus } = useWeb3();
  const [networkState, setNetworkState] = useState<NetworkState>('disconnected');
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

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

    // Check RPC health
    const checkHealth = async () => {
      try {
        const start = Date.now();
        const response = await fetch(NEXUS_TESTNET.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          }),
        });
        const end = Date.now();
        setLatency(end - start);

        const data = await response.json();
        if (data.result) {
          setBlockNumber(parseInt(data.result, 16));
        }
      } catch (error) {
        console.error('RPC health check failed:', error);
        setLatency(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
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
            latency !== null ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
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
            {latency !== null ? (
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
