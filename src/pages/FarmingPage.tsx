import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useFarmingData, PoolInfo } from '@/hooks/useFarmingData';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/config/contracts';
import { ERC20_ABI } from '@/config/abis';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Layers,
  Shield,
  Plus,
  Settings,
  Check,
  Zap,
  ArrowUpDown,
  ChevronRight,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TokenLogo } from '@/components/TokenLogo';

function FarmCard({ pool, onDeposit, onWithdraw, onHarvest, onEmergencyWithdraw, onViewDetails }: { 
  pool: PoolInfo; 
  onDeposit: (pool: PoolInfo) => void;
  onWithdraw: (pool: PoolInfo) => void;
  onHarvest: (pid: number) => void;
  onEmergencyWithdraw: (pid: number) => void;
  onViewDetails: (pool: PoolInfo) => void;
}) {
  const { isConnected } = useWeb3();
  const hasDeposit = parseFloat(pool.userStaked) > 0;
  const hasPending = parseFloat(pool.pendingReward) > 0;
  const [showEmergency, setShowEmergency] = useState(false);

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
          <div className="relative flex -space-x-2">
            <TokenLogo symbol={pool.token0Symbol} className="w-10 h-10 rounded-full border-2 border-card z-10" />
            {pool.token1Symbol && (
              <TokenLogo symbol={pool.token1Symbol} className="w-10 h-10 rounded-full border-2 border-card" />
            )}
            {hasDeposit && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card z-20" />
            )}
          </div>
          <div>
            <CardTitle className="text-lg font-bold">
              {pool.token1Symbol ? `${pool.token0Symbol}-${pool.token1Symbol}` : pool.token0Symbol}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Pool #{pool.pid} • {Number(pool.allocPoint)}x</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Layers className="w-3 h-3" /> TVL
            </p>
            <p className="text-sm font-semibold mt-1">
              {parseFloat(pool.totalStaked).toLocaleString(undefined, { maximumFractionDigits: 2 })} LP
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Coins className="w-3 h-3" /> Your Deposit
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

        {/* Action Buttons - Changed to Deposit/Withdraw */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="w-full border-primary/30 hover:bg-primary/10"
            onClick={() => onDeposit(pool)}
            disabled={!isConnected}
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Deposit
          </Button>
          <Button
            variant="outline"
            className="w-full border-orange-500/30 hover:bg-orange-500/10 text-foreground"
            onClick={() => onWithdraw(pool)}
            disabled={!isConnected || !hasDeposit}
          >
            <ArrowUpFromLine className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>

        {/* View Details & Emergency */}
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => onViewDetails(pool)}
            className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            View Details
            <ChevronRight className="w-3 h-3" />
          </button>
          
          <div className="flex items-center gap-3">
            {isConnected && parseFloat(pool.lpBalance) > 0 && (
              <span className="text-muted-foreground">Available: {parseFloat(pool.lpBalance).toFixed(4)} LP</span>
            )}
            {hasDeposit && (
              <button
                onClick={() => setShowEmergency(true)}
                className="text-destructive/70 hover:text-destructive transition-colors flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                Emergency
              </button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Emergency Withdraw Dialog */}
      <Dialog open={showEmergency} onOpenChange={setShowEmergency}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Emergency Withdraw
            </DialogTitle>
            <DialogDescription>
              This will withdraw all your deposited LP tokens without harvesting pending rewards. Only use this if the normal withdraw is not working.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">You will lose:</p>
            <p className="text-lg font-bold text-destructive">{parseFloat(pool.pendingReward).toFixed(6)} rewards</p>
            <p className="text-sm font-medium">You will receive:</p>
            <p className="text-lg font-bold">{parseFloat(pool.userStaked).toFixed(6)} LP</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmergency(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => {
                onEmergencyWithdraw(pool.pid);
                setShowEmergency(false);
              }}
            >
              Confirm Emergency Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DepositWithdrawDialog({ 
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
  const { signer, address } = useWeb3();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'checking' | 'needed' | 'approved'>('checking');

  const maxAmount = mode === 'deposit' ? pool?.lpBalance : pool?.userStaked;

  // Check approval status when dialog opens or amount changes
  useEffect(() => {
    const checkApproval = async () => {
      // Withdraw doesn't need approval
      if (mode !== 'deposit') {
        setApprovalStatus('approved');
        return;
      }

      if (!pool || !address || !signer?.provider) {
        setApprovalStatus('checking');
        return;
      }

      // If no amount entered, show as needing approval by default
      if (!amount || parseFloat(amount) <= 0) {
        setApprovalStatus('needed');
        return;
      }

      try {
        setApprovalStatus('checking');
        const lpContract = new ethers.Contract(pool.lpToken, ERC20_ABI, signer.provider);
        const amountWei = ethers.parseEther(amount);
        const allowance = await lpContract.allowance(address, CONTRACTS.FARMING);
        
        if (allowance >= amountWei) {
          setApprovalStatus('approved');
        } else {
          setApprovalStatus('needed');
        }
      } catch (error) {
        console.error('Error checking approval:', error);
        setApprovalStatus('needed');
      }
    };

    if (isOpen && pool) {
      checkApproval();
    }
  }, [pool, address, amount, mode, signer, isOpen]);

  const handleMax = () => {
    if (maxAmount) {
      setAmount(maxAmount);
    }
  };

  const handleApprove = async () => {
    if (!signer || !pool) {
      toast.error('Wallet not connected');
      return;
    }

    setApproving(true);
    try {
      const lpContract = new ethers.Contract(pool.lpToken, ERC20_ABI, signer);
      toast.loading('Approving LP token...', { id: 'approve-lp' });
      
      const tx = await lpContract.approve(CONTRACTS.FARMING, ethers.MaxUint256);
      toast.loading('Waiting for confirmation...', { id: 'approve-lp' });
      await tx.wait();
      
      toast.success('LP token approved!', { id: 'approve-lp' });
      setApprovalStatus('approved');
    } catch (error: any) {
      console.error('Approval error:', error);
      const errorMsg = error?.reason || error?.message || 'Failed to approve';
      toast.error(errorMsg.includes('user rejected') ? 'Transaction cancelled' : errorMsg, { id: 'approve-lp' });
    } finally {
      setApproving(false);
    }
  };

  const handleConfirm = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > parseFloat(maxAmount || '0')) {
      toast.error('Amount exceeds available balance');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(amount);
      setAmount('');
      onClose();
    } catch (error: any) {
      console.error('Transaction error:', error);
      // Error toast is handled in the parent component
    } finally {
      setLoading(false);
    }
  };

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setApprovalStatus(mode === 'withdraw' ? 'approved' : 'checking');
    }
  }, [isOpen, mode]);

  if (!pool) return null;

  const pairName = pool.token1Symbol 
    ? `${pool.token0Symbol}-${pool.token1Symbol}` 
    : pool.token0Symbol;

  const showApproveButton = mode === 'deposit' && approvalStatus === 'needed';
  const showDepositButton = mode === 'deposit' && approvalStatus === 'approved';
  const showWithdrawButton = mode === 'withdraw';
  const isCheckingApproval = mode === 'deposit' && approvalStatus === 'checking';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'deposit' ? (
              <ArrowDownToLine className="w-5 h-5 text-primary" />
            ) : (
              <ArrowUpFromLine className="w-5 h-5 text-orange-500" />
            )}
            {mode === 'deposit' ? 'Deposit' : 'Withdraw'} {pairName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Token Pair Display */}
          <div className="flex items-center justify-center gap-2 pb-2">
            <TokenLogo symbol={pool.token0Symbol} size="lg" />
            {pool.token1Symbol && (
              <>
                <span className="text-muted-foreground">+</span>
                <TokenLogo symbol={pool.token1Symbol} size="lg" />
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-muted-foreground">
                Available: {parseFloat(maxAmount || '0').toFixed(6)} LP
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-16"
                min="0"
                step="any"
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
            <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">APR</span>
                <span className="text-green-400 font-medium">{pool.apr.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pool Share</span>
                <span>
                  {parseFloat(pool.totalStaked) > 0
                    ? ((parseFloat(amount || '0') / (parseFloat(pool.totalStaked) + parseFloat(amount || '0'))) * 100).toFixed(4)
                    : amount ? '100' : '0'}%
                </span>
              </div>
              {approvalStatus === 'approved' && (
                <div className="flex items-center gap-1 text-green-400 pt-1">
                  <Check className="w-3 h-3" />
                  <span className="text-xs">LP Token Approved</span>
                </div>
              )}
            </div>
          )}

          {mode === 'withdraw' && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Deposit</span>
                <span>{parseFloat(pool.userStaked).toFixed(6)} LP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Rewards</span>
                <span className="text-primary">{parseFloat(pool.pendingReward).toFixed(6)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Note: Withdrawing will also harvest your pending rewards.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          
          {isCheckingApproval && (
            <Button disabled className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Checking...
            </Button>
          )}
          
          {showApproveButton && (
            <Button 
              onClick={handleApprove}
              disabled={approving || !amount || parseFloat(amount) <= 0}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {approving ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {approving ? 'Approving...' : 'Approve LP Token'}
            </Button>
          )}
          
          {showDepositButton && (
            <Button 
              onClick={handleConfirm}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowDownToLine className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Depositing...' : 'Deposit'}
            </Button>
          )}

          {showWithdrawButton && (
            <Button 
              onClick={handleConfirm}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowUpFromLine className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Withdrawing...' : 'Withdraw'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Admin Panel Component
function AdminPanel({ 
  onAddPool, 
  onSetAlloc,
  onPause,
  onUnpause,
  onUpdatePool,
  pools,
  isLoading,
  isPaused,
  isOpen,
  onToggle
}: { 
  onAddPool: (allocPoint: number, lpAddress: string) => Promise<void>;
  onSetAlloc: (pid: number, allocPoint: number) => Promise<void>;
  onPause: () => Promise<void>;
  onUnpause: () => Promise<void>;
  onUpdatePool: (pid: number) => Promise<void>;
  pools: PoolInfo[];
  isLoading: boolean;
  isPaused: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [lpAddress, setLpAddress] = useState('');
  const [allocPoint, setAllocPoint] = useState('100');
  const [addingPool, setAddingPool] = useState(false);
  const [editPid, setEditPid] = useState<number | null>(null);
  const [editAlloc, setEditAlloc] = useState('');
  const [updatingAlloc, setUpdatingAlloc] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [updatingPool, setUpdatingPool] = useState<number | null>(null);

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

  const handlePauseToggle = async () => {
    setPausing(true);
    try {
      if (isPaused) {
        toast.loading('Unpausing contract...', { id: 'pause' });
        await onUnpause();
        toast.success('Contract unpaused!', { id: 'pause' });
      } else {
        toast.loading('Pausing contract...', { id: 'pause' });
        await onPause();
        toast.success('Contract paused!', { id: 'pause' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle pause', { id: 'pause' });
    } finally {
      setPausing(false);
    }
  };

  const handleUpdatePool = async (pid: number) => {
    setUpdatingPool(pid);
    try {
      toast.loading(`Updating pool #${pid}...`, { id: 'update-pool' });
      await onUpdatePool(pid);
      toast.success('Pool updated!', { id: 'update-pool' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update pool', { id: 'update-pool' });
    } finally {
      setUpdatingPool(null);
    }
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={onToggle}
        className="mb-8 bg-gradient-to-r from-primary/80 to-primary border-primary/30"
      >
        <Shield className="w-4 h-4 mr-2" />
        Open Admin Panel
        {isPaused && <Badge variant="destructive" className="ml-2">Paused</Badge>}
      </Button>
    );
  }

  return (
    <Card className="mb-8 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Admin Panel
                <Badge variant="outline" className="border-primary/50 text-primary">Owner</Badge>
                {isPaused && (
                  <Badge variant="destructive" className="ml-2">Paused</Badge>
                )}
              </CardTitle>
              <CardDescription>Manage farming pools</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isPaused ? "default" : "destructive"}
              size="sm"
              onClick={handlePauseToggle}
              disabled={pausing}
            >
              {pausing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : isPaused ? (
                <Play className="w-4 h-4 mr-2" />
              ) : (
                <Pause className="w-4 h-4 mr-2" />
              )}
              {isPaused ? 'Unpause' : 'Pause'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              Close
            </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  Update Alloc
                </Button>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => editPid !== null && handleUpdatePool(editPid)} 
                  disabled={updatingPool !== null || editPid === null}
                  variant="outline"
                  className="w-full"
                >
                  {updatingPool === editPid ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  Update Pool
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
  const navigate = useNavigate();
  const { isConnected } = useWeb3();
  const { 
    pools, 
    stats, 
    loading, 
    error, 
    isOwner, 
    refetch, 
    deposit, 
    withdraw, 
    harvest, 
    harvestAll, 
    emergencyWithdraw, 
    addPool, 
    setPoolAlloc,
    pause,
    unpause,
    updatePool
  } = useFarmingData();
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [dialogMode, setDialogMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'apr' | 'tvl' | 'newest'>('apr');
  const [harvestingAll, setHarvestingAll] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const sortedPools = useMemo(() => {
    return [...pools].sort((a, b) => {
      switch (sortBy) {
        case 'apr':
          return b.apr - a.apr;
        case 'tvl':
          return parseFloat(b.totalStaked) - parseFloat(a.totalStaked);
        case 'newest':
          return b.pid - a.pid;
        default:
          return 0;
      }
    });
  }, [pools, sortBy]);

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

  const handleHarvestAll = async () => {
    const poolsWithRewards = pools.filter(p => parseFloat(p.pendingReward) > 0);
    if (poolsWithRewards.length === 0) {
      toast.error('No rewards to harvest');
      return;
    }
    setHarvestingAll(true);
    try {
      toast.loading(`Harvesting from ${poolsWithRewards.length} pools...`, { id: 'harvest-all' });
      await harvestAll();
      toast.success('All rewards harvested!', { id: 'harvest-all' });
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to harvest all', { id: 'harvest-all' });
    } finally {
      setHarvestingAll(false);
    }
  };

  const handleEmergencyWithdraw = async (pid: number) => {
    try {
      toast.loading('Emergency withdrawing...', { id: 'emergency' });
      await emergencyWithdraw(pid);
      toast.success('Emergency withdraw successful!', { id: 'emergency' });
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Emergency withdraw failed', { id: 'emergency' });
    }
  };

  const handleViewDetails = (pool: PoolInfo) => {
    navigate(`/farming/${pool.pid}`);
  };

  const handleConfirmAction = async (amount: string) => {
    if (!selectedPool) return;

    try {
      const action = dialogMode === 'deposit' ? 'Depositing' : 'Withdrawing';
      toast.loading(`${action}...`, { id: 'action' });
      
      if (dialogMode === 'deposit') {
        await deposit(selectedPool.pid, amount);
      } else {
        await withdraw(selectedPool.pid, amount);
      }
      
      toast.success(`${dialogMode === 'deposit' ? 'Deposit' : 'Withdraw'} successful!`, { id: 'action' });
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Transaction failed', { id: 'action' });
      throw err;
    }
  };

  const totalPending = pools.reduce((sum, p) => sum + parseFloat(p.pendingReward), 0);
  const totalDeposited = pools.reduce((sum, p) => sum + parseFloat(p.userStaked), 0);
  const totalTVL = pools.reduce((sum, p) => sum + parseFloat(p.totalStaked), 0);

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
          Deposit your LP tokens to earn {stats?.rewardTokenSymbol || 'FRDX'} rewards. 
          Higher APR pools mean more rewards!
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total TVL</p>
                <p className="text-xl font-bold">{totalTVL.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">LP Tokens</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sprout className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Pools</p>
                <p className="text-xl font-bold">{pools.length}</p>
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
                <p className="text-xs text-muted-foreground">Your Deposits</p>
                <p className="text-xl font-bold">{totalDeposited.toFixed(4)}</p>
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
                <p className="text-xs text-muted-foreground">Pending Rewards</p>
                <p className="text-xl font-bold text-yellow-500">{totalPending.toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Coins className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reward/Block</p>
                <p className="text-xl font-bold">
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
          onPause={pause}
          onUnpause={unpause}
          onUpdatePool={updatePool}
          pools={pools}
          isLoading={loading}
          isPaused={stats?.isPaused || false}
          isOpen={showAdminPanel}
          onToggle={() => setShowAdminPanel(!showAdminPanel)}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="all" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-muted/30 border border-border/50">
            <TabsTrigger value="all">All Farms</TabsTrigger>
            <TabsTrigger value="my">My Farms</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[140px] h-9">
                <ArrowUpDown className="w-3 h-3 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apr">Highest APR</SelectItem>
                <SelectItem value="tvl">Highest TVL</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Harvest All */}
            {totalPending > 0 && isConnected && (
              <Button 
                size="sm" 
                onClick={handleHarvestAll}
                disabled={harvestingAll}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
              >
                {harvestingAll ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Harvest All
              </Button>
            )}
            
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {!isConnected && (
          <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <p className="text-sm">Connect your wallet to deposit LP tokens and earn rewards.</p>
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
          ) : sortedPools.length === 0 ? (
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
              {sortedPools.map((pool) => (
                <FarmCard
                  key={pool.pid}
                  pool={pool}
                  onDeposit={handleDeposit}
                  onWithdraw={handleWithdraw}
                  onHarvest={handleHarvest}
                  onEmergencyWithdraw={handleEmergencyWithdraw}
                  onViewDetails={handleViewDetails}
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
              const myPools = sortedPools.filter(p => parseFloat(p.userStaked) > 0);
              if (myPools.length === 0) {
                return (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Wallet className="w-16 h-16 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Active Deposits</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        You haven't deposited in any farms yet. Browse available farms and start earning rewards!
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
                      onEmergencyWithdraw={handleEmergencyWithdraw}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              );
            })()
          )}
        </TabsContent>
      </Tabs>

      {/* Deposit/Withdraw Dialog */}
      <DepositWithdrawDialog
        pool={selectedPool}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode={dialogMode}
        onConfirm={handleConfirmAction}
      />
    </main>
  );
}
