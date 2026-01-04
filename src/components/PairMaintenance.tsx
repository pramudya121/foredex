import { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { PAIR_ABI } from '@/config/abis';
import { NEXUS_TESTNET } from '@/config/contracts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Wrench,
  AlertTriangle,
  ExternalLink,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';

interface PairMaintenanceProps {
  pairAddress?: string;
  token0Symbol?: string;
  token1Symbol?: string;
  onSuccess?: () => void;
}

export function PairMaintenance({ 
  pairAddress: initialPairAddress, 
  token0Symbol = 'Token0',
  token1Symbol = 'Token1',
  onSuccess 
}: PairMaintenanceProps) {
  const { isConnected, signer, address } = useWeb3();
  const [pairAddress, setPairAddress] = useState(initialPairAddress || '');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [skimRecipient, setSkimRecipient] = useState('');

  const handleSync = async () => {
    if (!signer || !pairAddress) {
      toast.error('Wallet not connected or pair address not set');
      return;
    }

    if (!ethers.isAddress(pairAddress)) {
      toast.error('Invalid pair address');
      return;
    }

    setActionLoading('sync');
    try {
      toast.loading('Syncing reserves...', { id: 'sync' });

      const pair = new ethers.Contract(pairAddress, PAIR_ABI, signer);
      const tx = await pair.sync();

      toast.loading('Waiting for confirmation...', { id: 'sync' });
      await tx.wait();

      toast.success('Reserves synced successfully!', { id: 'sync' });
      onSuccess?.();
    } catch (error: any) {
      console.error('Error syncing:', error);
      const msg = error?.reason || error?.message || 'Failed to sync';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'sync' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkim = async () => {
    if (!signer || !pairAddress) {
      toast.error('Wallet not connected or pair address not set');
      return;
    }

    if (!ethers.isAddress(pairAddress)) {
      toast.error('Invalid pair address');
      return;
    }

    const recipient = skimRecipient || address;
    if (!recipient || !ethers.isAddress(recipient)) {
      toast.error('Invalid recipient address');
      return;
    }

    setActionLoading('skim');
    try {
      toast.loading('Skimming excess tokens...', { id: 'skim' });

      const pair = new ethers.Contract(pairAddress, PAIR_ABI, signer);
      const tx = await pair.skim(recipient);

      toast.loading('Waiting for confirmation...', { id: 'skim' });
      await tx.wait();

      toast.success('Excess tokens skimmed!', { id: 'skim' });
      setSkimRecipient('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error skimming:', error);
      const msg = error?.reason || error?.message || 'Failed to skim';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'skim' });
    } finally {
      setActionLoading(null);
    }
  };

  if (!isConnected) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
          <p className="text-sm text-muted-foreground">
            Connect your wallet to use maintenance functions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-gradient-to-br from-card via-card to-blue-500/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20">
            <Wrench className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Pool Maintenance</CardTitle>
            <CardDescription>
              Sync reserves and skim excess tokens
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pair Address Input (if not provided) */}
        {!initialPairAddress && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pair Contract Address</Label>
            <Input
              placeholder="0x..."
              value={pairAddress}
              onChange={(e) => setPairAddress(e.target.value)}
              className="bg-muted/30 font-mono text-sm"
            />
          </div>
        )}

        {/* Sync Function */}
        <div className="p-4 bg-muted/20 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-green-400" />
              <span className="font-medium">Sync Reserves</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              Force Update
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Forces the pair's reserves to match the actual token balances. Use this if reserves 
            become out of sync due to direct token transfers.
          </p>
          <Button
            onClick={handleSync}
            disabled={actionLoading === 'sync' || !pairAddress}
            className="w-full"
            variant="outline"
          >
            {actionLoading === 'sync' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Reserves
              </>
            )}
          </Button>
        </div>

        {/* Skim Function */}
        <div className="p-4 bg-muted/20 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="font-medium">Skim Excess Tokens</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              Claim Tokens
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Withdraws any excess tokens (balance - reserves) to the specified recipient. 
            Useful for recovering tokens accidentally sent to the pair.
          </p>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Recipient (leave empty to use your address)
            </Label>
            <Input
              placeholder={address || '0x...'}
              value={skimRecipient}
              onChange={(e) => setSkimRecipient(e.target.value)}
              className="bg-muted/30 font-mono text-sm"
            />
          </div>
          <Button
            onClick={handleSkim}
            disabled={actionLoading === 'skim' || !pairAddress}
            className="w-full"
            variant="outline"
          >
            {actionLoading === 'skim' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Skimming...
              </>
            ) : (
              <>
                <Layers className="w-4 h-4 mr-2" />
                Skim Excess
              </>
            )}
          </Button>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-300">
            <p className="font-medium mb-1">Note about low-level functions:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-300/80">
              <li>mint() and burn() are called by the Router during liquidity operations</li>
              <li>swap() is called by the Router during token swaps</li>
              <li>These functions require tokens to be transferred first</li>
            </ul>
          </div>
        </div>

        {/* Link to explorer */}
        {pairAddress && ethers.isAddress(pairAddress) && (
          <a
            href={`${NEXUS_TESTNET.blockExplorer}/address/${pairAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Pair on Explorer
          </a>
        )}
      </CardContent>
    </Card>
  );
}