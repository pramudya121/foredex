import { useState } from 'react';
import { useFarmingData, PoolInfo } from '@/hooks/useFarmingData';
import { useWeb3 } from '@/contexts/Web3Context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sprout, 
  TrendingUp, 
  Coins, 
  RefreshCw, 
  Wallet, 
  ArrowDownToLine,
  ArrowUpFromLine,
  Gift,
  AlertTriangle,
  Flame,
  Sparkles,
  Clock,
  Layers,
  Shield,
  Plus,
  Settings,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function FarmCard({ pool, onDeposit, onWithdraw, onHarvest }: { 
  pool: PoolInfo; 
  onDeposit: (pool: PoolInfo) => void;
  onWithdraw: (pool: PoolInfo) => void;
  onHarvest: (pid: number) => void;
}) {
  const { isConnected } = useWeb3();
  const hasStake = parseFloat(pool.userStaked) > 0;
  const hasPending = parseFloat(pool.pendingReward) > 0;

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-card/80 via-card to-card/90 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* APR Badge */}
      <div className="absolute top-4 right-4">
        <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30 px-3 py-1">
          <Flame className="w-3 h-3 mr-1" />
          {pool.apr > 1000 ? `${(pool.apr / 1000).toFixed(1)}K` : pool.apr.toFixed(0)}% APR
        </Badge>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-primary" />
            </div>
            {hasStake && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
            )}
          </div>
          <div>
            <CardTitle className="text-lg font-bold">
              {pool.token1Symbol ? `${pool.token0Symbol}-${pool.token1Symbol}` : pool.token0Symbol}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Pool #{pool.pid}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Layers className="w-3 h-3" /> Total Staked
            </p>
            <p className="text-sm font-semibold mt-1">
              {parseFloat(pool.totalStaked).toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Coins className="w-3 h-3" /> Your Stake
            </p>
            <p className="text-sm font-semibold mt-1">
              {parseFloat(pool.userStaked).toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </p>
          </div>
        </div>

        {/* Pending Rewards */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Gift className="w-3 h-3" /> Pending Rewards
              </p>
              <p className="text-xl font-bold text-primary mt-1">
                {parseFloat(pool.pendingReward).toFixed(6)}
              </p>
            </div>
            <Button 
              size="sm" 
              onClick={() => onHarvest(pool.pid)}
              disabled={!isConnected || !hasPending}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Harvest
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="w-full border-primary/30 hover:bg-primary/10"
            onClick={() => onDeposit(pool)}
            disabled={!isConnected}
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Stake
          </Button>
          <Button
            variant="outline"
            className="w-full border-destructive/30 hover:bg-destructive/10 text-foreground"
            onClick={() => onWithdraw(pool)}
            disabled={!isConnected || !hasStake}
          >
            <ArrowUpFromLine className="w-4 h-4 mr-2" />
            Unstake
          </Button>
        </div>

        {/* LP Balance */}
        {isConnected && parseFloat(pool.lpBalance) > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            Available: {parseFloat(pool.lpBalance).toFixed(6)} LP
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StakeDialog({ 
  pool, 
  isOpen, 
  onClose, 
  mode,
  onConfirm 
}: { 
  pool: PoolInfo | null;
  isOpen: boolean;
  onClose: () => void;
  mode: 'deposit' | 'withdraw';
  onConfirm: (amount: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const maxAmount = mode === 'deposit' ? pool?.lpBalance : pool?.userStaked;

  const handleMax = () => {
    if (maxAmount) setAmount(maxAmount);
  };

  const handleConfirm = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      await onConfirm(amount);
      setAmount('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!pool) return null;

  const pairName = pool.token1Symbol 
    ? `${pool.token0Symbol}-${pool.token1Symbol}` 
    : pool.token0Symbol;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'deposit' ? (
              <ArrowDownToLine className="w-5 h-5 text-primary" />
            ) : (
              <ArrowUpFromLine className="w-5 h-5 text-destructive" />
            )}
            {mode === 'deposit' ? 'Stake' : 'Unstake'} {pairName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-muted-foreground">
                Available: {parseFloat(maxAmount || '0').toFixed(6)}
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-16"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                onClick={handleMax}
              >
                MAX
              </Button>
            </div>
          </div>

          {mode === 'deposit' && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">APR</span>
                <span className="text-green-400 font-medium">{pool.apr.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pool Share</span>
                <span>
                  {parseFloat(pool.totalStaked) > 0
                    ? ((parseFloat(amount || '0') / parseFloat(pool.totalStaked)) * 100).toFixed(4)
                    : '0'}%
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className={cn(
              mode === 'deposit' 
                ? 'bg-gradient-to-r from-primary to-primary/80' 
                : 'bg-gradient-to-r from-destructive to-destructive/80'
            )}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : mode === 'deposit' ? (
              <ArrowDownToLine className="w-4 h-4 mr-2" />
            ) : (
              <ArrowUpFromLine className="w-4 h-4 mr-2" />
            )}
            {mode === 'deposit' ? 'Stake' : 'Unstake'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Admin Panel Component
function AdminPanel({ 
  onAddPool, 
  onSetAlloc,
  pools,
  isLoading 
}: { 
  onAddPool: (allocPoint: number, lpAddress: string) => Promise<void>;
  onSetAlloc: (pid: number, allocPoint: number) => Promise<void>;
  pools: PoolInfo[];
  isLoading: boolean;
}) {
  const [lpAddress, setLpAddress] = useState('');
  const [allocPoint, setAllocPoint] = useState('100');
  const [addingPool, setAddingPool] = useState(false);
  const [editPid, setEditPid] = useState<number | null>(null);
  const [editAlloc, setEditAlloc] = useState('');
  const [updatingAlloc, setUpdatingAlloc] = useState(false);

  const handleAddPool = async () => {
    if (!lpAddress || !allocPoint) {
      toast.error('Please fill all fields');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(lpAddress)) {
      toast.error('Invalid LP token address');
      return;
    }

    setAddingPool(true);
    try {
      toast.loading('Adding new pool...', { id: 'add-pool' });
      await onAddPool(parseInt(allocPoint), lpAddress);
      toast.success('Pool added successfully!', { id: 'add-pool' });
      setLpAddress('');
      setAllocPoint('100');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add pool', { id: 'add-pool' });
    } finally {
      setAddingPool(false);
    }
  };

  const handleUpdateAlloc = async () => {
    if (editPid === null || !editAlloc) {
      toast.error('Please select pool and enter allocation');
      return;
    }

    setUpdatingAlloc(true);
    try {
      toast.loading('Updating allocation...', { id: 'update-alloc' });
      await onSetAlloc(editPid, parseInt(editAlloc));
      toast.success('Allocation updated!', { id: 'update-alloc' });
      setEditPid(null);
      setEditAlloc('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update', { id: 'update-alloc' });
    } finally {
      setUpdatingAlloc(false);
    }
  };

  return (
    <Card className="mb-8 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              Admin Panel
              <Badge variant="outline" className="border-primary/50 text-primary">Owner</Badge>
            </CardTitle>
            <CardDescription>Manage farming pools</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Pool */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add New Pool
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="lpAddress">LP Token Address</Label>
              <Input
                id="lpAddress"
                placeholder="0x..."
                value={lpAddress}
                onChange={(e) => setLpAddress(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allocPoint">Allocation Points</Label>
              <Input
                id="allocPoint"
                type="number"
                placeholder="100"
                value={allocPoint}
                onChange={(e) => setAllocPoint(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={handleAddPool} 
            disabled={addingPool || isLoading}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            {addingPool ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Pool
          </Button>
        </div>

        {/* Modify Existing Pools */}
        {pools.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h4 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" /> Modify Pool Allocation
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Select Pool</Label>
                <select
                  value={editPid ?? ''}
                  onChange={(e) => {
                    const pid = e.target.value ? parseInt(e.target.value) : null;
                    setEditPid(pid);
                    if (pid !== null) {
                      const pool = pools.find(p => p.pid === pid);
                      setEditAlloc(pool?.allocPoint.toString() || '');
                    }
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select pool...</option>
                  {pools.map(pool => (
                    <option key={pool.pid} value={pool.pid}>
                      #{pool.pid} - {pool.token1Symbol ? `${pool.token0Symbol}-${pool.token1Symbol}` : pool.token0Symbol}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editAlloc">New Allocation</Label>
                <Input
                  id="editAlloc"
                  type="number"
                  placeholder="100"
                  value={editAlloc}
                  onChange={(e) => setEditAlloc(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleUpdateAlloc} 
                  disabled={updatingAlloc || editPid === null}
                  variant="outline"
                  className="w-full"
                >
                  {updatingAlloc ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Update
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FarmingPage() {
  const { isConnected } = useWeb3();
  const { pools, stats, loading, error, isOwner, refetch, deposit, withdraw, harvest, addPool, setPoolAlloc } = useFarmingData();
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [dialogMode, setDialogMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDeposit = (pool: PoolInfo) => {
    setSelectedPool(pool);
    setDialogMode('deposit');
    setDialogOpen(true);
  };

  const handleWithdraw = (pool: PoolInfo) => {
    setSelectedPool(pool);
    setDialogMode('withdraw');
    setDialogOpen(true);
  };

  const handleHarvest = async (pid: number) => {
    try {
      toast.loading('Harvesting rewards...', { id: 'harvest' });
      await harvest(pid);
      toast.success('Rewards harvested successfully!', { id: 'harvest' });
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to harvest', { id: 'harvest' });
    }
  };

  const handleConfirmAction = async (amount: string) => {
    if (!selectedPool) return;

    try {
      const action = dialogMode === 'deposit' ? 'Staking' : 'Unstaking';
      toast.loading(`${action}...`, { id: 'action' });
      
      if (dialogMode === 'deposit') {
        await deposit(selectedPool.pid, amount);
      } else {
        await withdraw(selectedPool.pid, amount);
      }
      
      toast.success(`${action} successful!`, { id: 'action' });
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Transaction failed', { id: 'action' });
      throw err;
    }
  };

  const totalPending = pools.reduce((sum, p) => sum + parseFloat(p.pendingReward), 0);
  const totalStaked = pools.reduce((sum, p) => sum + parseFloat(p.userStaked), 0);

  return (
    <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Sprout className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Yield Farming</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
          Farm & Earn Rewards
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Stake your LP tokens to earn {stats?.rewardTokenSymbol || 'FRDX'} rewards. 
          Higher APR pools mean more rewards!
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pools</p>
                <p className="text-2xl font-bold">{pools.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Staked</p>
                <p className="text-2xl font-bold">{totalStaked.toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Rewards</p>
                <p className="text-2xl font-bold">{totalPending.toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reward/Block</p>
                <p className="text-2xl font-bold">
                  {stats ? parseFloat(stats.rewardPerBlock).toFixed(4) : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Panel - Only visible to owner */}
      {isOwner && (
        <AdminPanel 
          onAddPool={addPool} 
          onSetAlloc={setPoolAlloc}
          pools={pools}
          isLoading={loading}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="all" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-muted/30 border border-border/50">
            <TabsTrigger value="all">All Farms</TabsTrigger>
            <TabsTrigger value="my">My Farms</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {!isConnected && (
          <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <p className="text-sm">Connect your wallet to stake LP tokens and earn rewards.</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <TabsContent value="all">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-[350px]">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pools.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Sprout className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Farms Available</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  There are currently no farming pools available. Check back later for new opportunities.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pools.map((pool) => (
                <FarmCard
                  key={pool.pid}
                  pool={pool}
                  onDeposit={handleDeposit}
                  onWithdraw={handleWithdraw}
                  onHarvest={handleHarvest}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="h-[350px]">
                  <CardContent className="pt-6 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            (() => {
              const myPools = pools.filter(p => parseFloat(p.userStaked) > 0);
              if (myPools.length === 0) {
                return (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Wallet className="w-16 h-16 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Active Stakes</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        You haven't staked in any farms yet. Browse available farms and start earning rewards!
                      </p>
                    </CardContent>
                  </Card>
                );
              }
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myPools.map((pool) => (
                    <FarmCard
                      key={pool.pid}
                      pool={pool}
                      onDeposit={handleDeposit}
                      onWithdraw={handleWithdraw}
                      onHarvest={handleHarvest}
                    />
                  ))}
                </div>
              );
            })()
          )}
        </TabsContent>
      </Tabs>

      {/* Stake Dialog */}
      <StakeDialog
        pool={selectedPool}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode={dialogMode}
        onConfirm={handleConfirmAction}
      />
    </main>
  );
}
