import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/config/contracts';
import { FARMING_ABI } from '@/config/farmingAbi';
import { FarmingOwnershipTransfer } from '@/components/FarmingOwnershipTransfer';
import { rpcProvider } from '@/lib/rpcProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Plus, 
  Settings, 
  Pause, 
  Play, 
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function FarmingAdminPage() {
  const navigate = useNavigate();
  const { isConnected, address, signer } = useWeb3();
  const [isOwner, setIsOwner] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Form states
  const [newPoolLP, setNewPoolLP] = useState('');
  const [newPoolAlloc, setNewPoolAlloc] = useState('100');
  const [editPid, setEditPid] = useState('');
  const [editAlloc, setEditAlloc] = useState('');

  // Check owner status using rpcProvider to avoid CORS issues
  useEffect(() => {
    const checkOwner = async () => {
      if (!address) {
        setIsOwner(false);
        setLoading(false);
        return;
      }

      try {
        const provider = rpcProvider.getProvider();
        if (!provider) {
          setLoading(false);
          return;
        }
        
        const contract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, provider);
        
        const [owner, paused] = await Promise.all([
          rpcProvider.call(() => contract.owner(), 'farming_owner'),
          rpcProvider.call(() => contract.paused(), 'farming_paused'),
        ]);
        
        setIsOwner(owner?.toLowerCase() === address.toLowerCase());
        setIsPaused(paused ?? false);
      } catch (error) {
        // Silently handle CORS/network errors
        const errorMsg = rpcProvider.parseError(error);
        if (errorMsg) {
          console.error('Error checking owner:', errorMsg);
        }
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };

    checkOwner();
  }, [address]);

  const handleAddPool = async () => {
    if (!signer || !isOwner) {
      toast.error('Not authorized');
      return;
    }

    if (!newPoolLP || !ethers.isAddress(newPoolLP)) {
      toast.error('Please enter a valid LP token address');
      return;
    }

    if (!newPoolAlloc || parseInt(newPoolAlloc) <= 0) {
      toast.error('Please enter valid allocation points');
      return;
    }

    setActionLoading('add');
    try {
      toast.loading('Adding new pool...', { id: 'add-pool' });
      
      const contract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
      const tx = await contract.add(parseInt(newPoolAlloc), newPoolLP);
      
      toast.loading('Waiting for confirmation...', { id: 'add-pool' });
      await tx.wait();
      
      toast.success('Pool added successfully!', { id: 'add-pool' });
      setNewPoolLP('');
      setNewPoolAlloc('100');
    } catch (error: any) {
      // Use rpcProvider to parse and filter errors
      const errorMsg = rpcProvider.parseError(error, true);
      if (errorMsg) {
        toast.error(errorMsg, { id: 'add-pool' });
      } else {
        // Only log if it's not a network/CORS error
        toast.dismiss('add-pool');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetAlloc = async () => {
    if (!signer || !isOwner) {
      toast.error('Not authorized');
      return;
    }

    if (editPid === '' || parseInt(editPid) < 0) {
      toast.error('Please enter a valid pool ID');
      return;
    }

    if (!editAlloc || parseInt(editAlloc) < 0) {
      toast.error('Please enter valid allocation points');
      return;
    }

    setActionLoading('set');
    try {
      toast.loading('Updating pool allocation...', { id: 'set-alloc' });
      
      const contract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
      const tx = await contract.set(parseInt(editPid), parseInt(editAlloc));
      
      toast.loading('Waiting for confirmation...', { id: 'set-alloc' });
      await tx.wait();
      
      toast.success('Pool allocation updated!', { id: 'set-alloc' });
      setEditPid('');
      setEditAlloc('');
    } catch (error: any) {
      const errorMsg = rpcProvider.parseError(error, true);
      if (errorMsg) {
        toast.error(errorMsg, { id: 'set-alloc' });
      } else {
        toast.dismiss('set-alloc');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePause = async () => {
    if (!signer || !isOwner) {
      toast.error('Not authorized');
      return;
    }

    setActionLoading('pause');
    try {
      const contract = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, signer);
      
      if (isPaused) {
        toast.loading('Unpausing farming...', { id: 'pause' });
        const tx = await contract.unpause();
        await tx.wait();
        toast.success('Farming unpaused!', { id: 'pause' });
        setIsPaused(false);
      } else {
        toast.loading('Pausing farming...', { id: 'pause' });
        const tx = await contract.pause();
        await tx.wait();
        toast.success('Farming paused!', { id: 'pause' });
        setIsPaused(true);
      }
    } catch (error: any) {
      const errorMsg = rpcProvider.parseError(error, true);
      if (errorMsg) {
        toast.error(errorMsg, { id: 'pause' });
      } else {
        toast.dismiss('pause');
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto border-border/40">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please connect your wallet to access the admin panel.
            </p>
            <Button onClick={() => navigate('/farming')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Farming
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto border-destructive/30 bg-destructive/5">
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Access Denied</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You are not authorized to access the admin panel.
            </p>
            <Button onClick={() => navigate('/farming')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Farming
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 lg:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/farming')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 ring-2 ring-amber-500/30">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Admin Panel</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Manage farming pools and contract settings
            </p>
          </div>
        </div>
        <Badge 
          variant={isPaused ? "destructive" : "default"}
          className="text-sm px-3 py-1"
        >
          {isPaused ? 'Paused' : 'Active'}
        </Badge>
      </div>

      {/* Admin Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add New Pool */}
        <Card className="border-border/40 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5 text-primary" />
              Add New Pool
            </CardTitle>
            <CardDescription>
              Add a new LP token pool for farming rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">LP Token Address</Label>
              <Input
                placeholder="0x..."
                value={newPoolLP}
                onChange={(e) => setNewPoolLP(e.target.value)}
                className="mt-1.5 bg-muted/30"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Allocation Points</Label>
              <Input
                type="number"
                placeholder="100"
                value={newPoolAlloc}
                onChange={(e) => setNewPoolAlloc(e.target.value)}
                className="mt-1.5 bg-muted/30"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Higher points = larger share of rewards
              </p>
            </div>
            <Button 
              onClick={handleAddPool} 
              disabled={actionLoading === 'add'}
              className="w-full bg-gradient-to-r from-primary to-rose-500 hover:from-primary/90 hover:to-rose-500/90"
            >
              {actionLoading === 'add' ? (
                <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Adding Pool...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" />Add Pool</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Set Pool Allocation */}
        <Card className="border-border/40 bg-gradient-to-br from-card via-card to-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5 text-blue-400" />
              Set Pool Allocation
            </CardTitle>
            <CardDescription>
              Update the allocation points for an existing pool
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Pool ID</Label>
              <Input
                type="number"
                placeholder="0"
                value={editPid}
                onChange={(e) => setEditPid(e.target.value)}
                className="mt-1.5 bg-muted/30"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">New Allocation Points</Label>
              <Input
                type="number"
                placeholder="100"
                value={editAlloc}
                onChange={(e) => setEditAlloc(e.target.value)}
                className="mt-1.5 bg-muted/30"
              />
            </div>
            <Button 
              onClick={handleSetAlloc} 
              disabled={actionLoading === 'set'}
              className="w-full"
              variant="outline"
            >
              {actionLoading === 'set' ? (
                <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Updating...</>
              ) : (
                <><Settings className="w-4 h-4 mr-2" />Update Allocation</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pause/Unpause Section */}
      <Card className={`border-border/40 ${isPaused ? 'bg-gradient-to-br from-card via-card to-green-500/5' : 'bg-gradient-to-br from-card via-card to-destructive/5'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isPaused ? (
              <Play className="w-5 h-5 text-green-400" />
            ) : (
              <Pause className="w-5 h-5 text-amber-400" />
            )}
            {isPaused ? 'Resume Farming' : 'Pause Farming'}
          </CardTitle>
          <CardDescription>
            {isPaused 
              ? 'Resume deposits and reward distribution'
              : 'Temporarily stop deposits and reward distribution'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isPaused ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                {isPaused ? (
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  Contract is currently {isPaused ? 'paused' : 'active'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPaused 
                    ? 'Users cannot deposit or claim rewards'
                    : 'All farming operations are running normally'}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleTogglePause} 
              disabled={actionLoading === 'pause'}
              variant={isPaused ? "default" : "destructive"}
              size="lg"
            >
              {actionLoading === 'pause' ? (
                <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Processing...</>
              ) : isPaused ? (
                <><Play className="w-4 h-4 mr-2" />Unpause</>
              ) : (
                <><Pause className="w-4 h-4 mr-2" />Pause</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ownership Transfer */}
      <FarmingOwnershipTransfer />
    </div>
  );
}
