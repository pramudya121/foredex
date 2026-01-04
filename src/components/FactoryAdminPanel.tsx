import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI } from '@/config/abis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  User,
  UserCog,
  Shield,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export function FactoryAdminPanel() {
  const { isConnected, address, signer } = useWeb3();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Contract data
  const [feeTo, setFeeTo] = useState('');
  const [feeToSetter, setFeeToSetter] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Form inputs
  const [newFeeTo, setNewFeeTo] = useState('');
  const [newFeeToSetter, setNewFeeToSetter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);

      const [feeToAddr, feeToSetterAddr] = await Promise.all([
        factory.feeTo(),
        factory.feeToSetter(),
      ]);

      setFeeTo(feeToAddr);
      setFeeToSetter(feeToSetterAddr);

      // Check if current user is the feeToSetter
      if (address) {
        setIsAuthorized(feeToSetterAddr.toLowerCase() === address.toLowerCase());
      }
    } catch (error) {
      console.error('Error fetching factory data:', error);
      toast.error('Failed to fetch factory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [address]);

  const handleSetFeeTo = async () => {
    if (!signer || !isAuthorized) {
      toast.error('Not authorized');
      return;
    }

    if (!newFeeTo || !ethers.isAddress(newFeeTo)) {
      toast.error('Please enter a valid address');
      return;
    }

    setActionLoading('feeTo');
    try {
      toast.loading('Setting fee recipient...', { id: 'set-fee-to' });

      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, signer);
      const tx = await factory.setFeeTo(newFeeTo);

      toast.loading('Waiting for confirmation...', { id: 'set-fee-to' });
      await tx.wait();

      toast.success('Fee recipient updated!', { id: 'set-fee-to' });
      setNewFeeTo('');
      fetchData();
    } catch (error: any) {
      console.error('Error setting feeTo:', error);
      const msg = error?.reason || error?.message || 'Failed to set fee recipient';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'set-fee-to' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetFeeToSetter = async () => {
    if (!signer || !isAuthorized) {
      toast.error('Not authorized');
      return;
    }

    if (!newFeeToSetter || !ethers.isAddress(newFeeToSetter)) {
      toast.error('Please enter a valid address');
      return;
    }

    setActionLoading('feeToSetter');
    try {
      toast.loading('Transferring admin rights...', { id: 'set-fee-setter' });

      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, signer);
      const tx = await factory.setFeeToSetter(newFeeToSetter);

      toast.loading('Waiting for confirmation...', { id: 'set-fee-setter' });
      await tx.wait();

      toast.success('Admin rights transferred!', { id: 'set-fee-setter' });
      setNewFeeToSetter('');
      fetchData();
    } catch (error: any) {
      console.error('Error setting feeToSetter:', error);
      const msg = error?.reason || error?.message || 'Failed to transfer admin rights';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'set-fee-setter' });
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
    if (addr === ethers.ZeroAddress) return 'Not Set (0x0...)';
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  if (loading) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
            Connect your wallet to access factory admin functions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthorized) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-12 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold text-destructive mb-2">Access Denied</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Only the feeToSetter can modify factory settings.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Current feeToSetter:</span>
            <code className="bg-muted px-2 py-1 rounded font-mono">
              {truncateAddress(feeToSetter)}
            </code>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-gradient-to-br from-card via-card to-amber-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 ring-2 ring-amber-500/30">
              <Settings className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <CardTitle>Factory Admin Panel</CardTitle>
              <CardDescription>Manage factory fee settings</CardDescription>
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Shield className="w-3 h-3 mr-1" />
            Authorized
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Values */}
        <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
          <h4 className="text-sm font-medium text-muted-foreground">Current Settings</h4>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Fee Recipient (feeTo)</span>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {truncateAddress(feeTo)}
              </code>
              {feeTo !== ethers.ZeroAddress && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(feeTo, 'feeTo')}
                >
                  {copiedField === 'feeTo' ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Fee Setter (feeToSetter)</span>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {truncateAddress(feeToSetter)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(feeToSetter, 'feeToSetter')}
              >
                {copiedField === 'feeToSetter' ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Set Fee To */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <Label className="font-medium">Set Fee Recipient</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Set the address that receives protocol fees. Set to zero address to disable fees.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="0x..."
              value={newFeeTo}
              onChange={(e) => setNewFeeTo(e.target.value)}
              className="bg-muted/30 font-mono text-sm"
            />
            <Button
              onClick={handleSetFeeTo}
              disabled={actionLoading === 'feeTo'}
              className="shrink-0"
            >
              {actionLoading === 'feeTo' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                'Set'
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Set Fee To Setter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-amber-400" />
            <Label className="font-medium">Transfer Admin Rights</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Transfer the ability to set fee recipient to a new address. This action is irreversible!
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="0x..."
              value={newFeeToSetter}
              onChange={(e) => setNewFeeToSetter(e.target.value)}
              className="bg-muted/30 font-mono text-sm"
            />
            <Button
              onClick={handleSetFeeToSetter}
              disabled={actionLoading === 'feeToSetter'}
              variant="destructive"
              className="shrink-0"
            >
              {actionLoading === 'feeToSetter' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                'Transfer'
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">
              Warning: This will permanently transfer admin rights to the new address.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}