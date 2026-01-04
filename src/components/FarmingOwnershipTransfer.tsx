import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, NEXUS_TESTNET } from '@/config/contracts';
import { FARMING_ABI } from '@/config/farmingAbi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  UserCog,
  Shield,
  AlertTriangle,
  RefreshCw,
  Check,
  Copy,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export function FarmingOwnershipTransfer() {
  const { isConnected, address, signer } = useWeb3();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Contract data
  const [currentOwner, setCurrentOwner] = useState('');
  const [pendingOwner, setPendingOwner] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isPendingOwner, setIsPendingOwner] = useState(false);

  // Form input
  const [newPendingOwner, setNewPendingOwner] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
      const farming = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, provider);

      const [owner, pending] = await Promise.all([
        farming.owner(),
        farming.pendingOwner(),
      ]);

      setCurrentOwner(owner);
      setPendingOwner(pending);

      if (address) {
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
        setIsPendingOwner(pending.toLowerCase() === address.toLowerCase() && pending !== ethers.ZeroAddress);
      }
    } catch (error) {
      console.error('Error fetching ownership data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [address]);

  const handleSetPendingOwner = async () => {
    if (!signer || !isOwner) {
      toast.error('Not authorized');
      return;
    }

    if (!newPendingOwner || !ethers.isAddress(newPendingOwner)) {
      toast.error('Please enter a valid address');
      return;
    }

    setActionLoading('setPending');
    try {
      toast.loading('Setting pending owner...', { id: 'set-pending' });

      const farming = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
      const tx = await farming.setPendingOwner(newPendingOwner);

      toast.loading('Waiting for confirmation...', { id: 'set-pending' });
      await tx.wait();

      toast.success('Pending owner set! They must call acceptOwnership.', { id: 'set-pending' });
      setNewPendingOwner('');
      fetchData();
    } catch (error: any) {
      console.error('Error setting pending owner:', error);
      const msg = error?.reason || error?.message || 'Failed to set pending owner';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'set-pending' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptOwnership = async () => {
    if (!signer || !isPendingOwner) {
      toast.error('Not authorized - you must be the pending owner');
      return;
    }

    setActionLoading('accept');
    try {
      toast.loading('Accepting ownership...', { id: 'accept-ownership' });

      const farming = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
      const tx = await farming.acceptOwnership();

      toast.loading('Waiting for confirmation...', { id: 'accept-ownership' });
      await tx.wait();

      toast.success('Ownership transferred successfully!', { id: 'accept-ownership' });
      fetchData();
    } catch (error: any) {
      console.error('Error accepting ownership:', error);
      const msg = error?.reason || error?.message || 'Failed to accept ownership';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'accept-ownership' });
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const truncateAddress = (addr: string) => {
    if (addr === ethers.ZeroAddress) return 'Not Set';
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  if (loading) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-12 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
          <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
          <p className="text-sm text-muted-foreground">
            Connect your wallet to manage ownership.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-gradient-to-br from-card via-card to-purple-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 ring-2 ring-purple-500/30">
              <UserCog className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <CardTitle>Ownership Transfer</CardTitle>
              <CardDescription>Two-step ownership transfer for farming contract</CardDescription>
            </div>
          </div>
          {isOwner && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <Shield className="w-3 h-3 mr-1" />
              Owner
            </Badge>
          )}
          {isPendingOwner && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              <Clock className="w-3 h-3 mr-1" />
              Pending Owner
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
          <h4 className="text-sm font-medium text-muted-foreground">Current Status</h4>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Current Owner</span>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {truncateAddress(currentOwner)}
              </code>
              {currentOwner !== ethers.ZeroAddress && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(currentOwner, 'owner')}
                >
                  {copiedField === 'owner' ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Pending Owner</span>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {truncateAddress(pendingOwner)}
              </code>
              {pendingOwner !== ethers.ZeroAddress && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(pendingOwner, 'pending')}
                >
                  {copiedField === 'pending' ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Step 1: Set Pending Owner (Only for current owner) */}
        {isOwner && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Step 1</Badge>
              <Label className="font-medium">Set Pending Owner</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Set the address that will become the new owner after they accept.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="0x..."
                value={newPendingOwner}
                onChange={(e) => setNewPendingOwner(e.target.value)}
                className="bg-muted/30 font-mono text-sm"
              />
              <Button
                onClick={handleSetPendingOwner}
                disabled={actionLoading === 'setPending'}
                className="shrink-0"
              >
                {actionLoading === 'setPending' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Set'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Accept Ownership (Only for pending owner) */}
        {isPendingOwner && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Step 2</Badge>
                <Label className="font-medium">Accept Ownership</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                You have been designated as the pending owner. Click below to accept and become the new owner.
              </p>
              <Button
                onClick={handleAcceptOwnership}
                disabled={actionLoading === 'accept'}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {actionLoading === 'accept' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Accept Ownership
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Transfer Flow Diagram */}
        <div className="p-4 bg-muted/10 rounded-lg">
          <h4 className="text-xs font-medium text-muted-foreground mb-3">Transfer Flow</h4>
          <div className="flex items-center justify-between text-xs">
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="font-bold">1</span>
              </div>
              <span className="text-muted-foreground">Owner</span>
              <span className="text-[10px]">setPendingOwner</span>
            </div>
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="font-bold">2</span>
              </div>
              <span className="text-muted-foreground">Pending</span>
              <span className="text-[10px]">acceptOwnership</span>
            </div>
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <span className="text-muted-foreground">New Owner</span>
              <span className="text-[10px]">Complete!</span>
            </div>
          </div>
        </div>

        {/* Not authorized message */}
        {!isOwner && !isPendingOwner && (
          <div className="p-4 bg-muted/20 rounded-lg text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              You are not the owner or pending owner of this contract.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}