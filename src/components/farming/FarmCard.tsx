import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, NEXUS_TESTNET } from '@/config/contracts';
import { ERC20_ABI } from '@/config/abis';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TokenLogo } from '@/components/TokenLogo';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Flame,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface PoolInfo {
  pid: number;
  lpToken: string;
  allocPoint: bigint;
  token0Symbol: string;
  token1Symbol: string;
  totalStaked: string;
  userStaked: string;
  pendingReward: string;
  apr: number;
  lpBalance: string;
}

interface FarmCardProps {
  pool: PoolInfo;
  onDeposit: (pid: number, amount: string) => Promise<void>;
  onWithdraw: (pid: number, amount: string) => Promise<void>;
  onHarvest: (pid: number) => void;
  onEmergencyWithdraw: (pid: number) => void;
}

export const FarmCard = memo(function FarmCard({ 
  pool, 
  onDeposit, 
  onWithdraw, 
  onHarvest, 
  onEmergencyWithdraw 
}: FarmCardProps) {
  const { isConnected, signer, address } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [stakeMode, setStakeMode] = useState<'stake' | 'unstake'>('stake');
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  
  const hasDeposit = parseFloat(pool.userStaked) > 0;
  const hasPending = parseFloat(pool.pendingReward) > 0;
  const hasLpBalance = parseFloat(pool.lpBalance) > 0;
  const isPair = !!pool.token1Symbol;
  const pairName = isPair 
    ? `${pool.token0Symbol}-${pool.token1Symbol}` 
    : pool.token0Symbol;

  const handleApprove = async () => {
    if (!signer || !pool) {
      toast.error('Wallet not connected');
      return;
    }

    setApproving(true);
    try {
      const lpContract = new ethers.Contract(pool.lpToken, ERC20_ABI, signer);
      toast.loading('Approving LP token...', { id: 'approve' });
      
      const tx = await lpContract.approve(CONTRACTS.FARMING, ethers.MaxUint256);
      toast.loading('Waiting for confirmation...', { id: 'approve' });
      await tx.wait();
      
      toast.success('LP token approved!', { id: 'approve' });
      setIsApproved(true);
    } catch (error: any) {
      console.error('Approval error:', error);
      const msg = error?.reason || error?.message || 'Approval failed';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'approve' });
    } finally {
      setApproving(false);
    }
  };

  const checkApproval = async (amount: string) => {
    if (!address || !signer?.provider || !amount || parseFloat(amount) <= 0) {
      setIsApproved(false);
      return;
    }

    try {
      const lpContract = new ethers.Contract(pool.lpToken, ERC20_ABI, signer.provider);
      const amountWei = ethers.parseEther(amount);
      const allowance = await lpContract.allowance(address, CONTRACTS.FARMING);
      setIsApproved(allowance >= amountWei);
    } catch {
      setIsApproved(false);
    }
  };

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    if (parseFloat(stakeAmount) > parseFloat(pool.lpBalance)) {
      toast.error('Insufficient LP balance');
      return;
    }

    // Check approval first
    await checkApproval(stakeAmount);
    if (!isApproved) {
      await handleApprove();
      return;
    }

    setLoading(true);
    try {
      toast.loading('Staking LP tokens...', { id: 'stake' });
      await onDeposit(pool.pid, stakeAmount);
      toast.success('Staked successfully!', { id: 'stake' });
      setStakeAmount('');
    } catch (error: any) {
      console.error('Stake error:', error);
      const msg = error?.reason || error?.message || 'Stake failed';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'stake' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    if (parseFloat(unstakeAmount) > parseFloat(pool.userStaked)) {
      toast.error('Insufficient staked amount');
      return;
    }

    setLoading(true);
    try {
      toast.loading('Unstaking LP tokens...', { id: 'unstake' });
      await onWithdraw(pool.pid, unstakeAmount);
      toast.success('Unstaked successfully!', { id: 'unstake' });
      setUnstakeAmount('');
    } catch (error: any) {
      console.error('Unstake error:', error);
      const msg = error?.reason || error?.message || 'Unstake failed';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'unstake' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-border/50 bg-card/95 backdrop-blur-sm hover:border-primary/30 transition-all">
        {/* Header */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex -space-x-2">
                <TokenLogo symbol={pool.token0Symbol} className="w-10 h-10 rounded-full border-2 border-card z-10" />
                {pool.token1Symbol && (
                  <TokenLogo symbol={pool.token1Symbol} className="w-10 h-10 rounded-full border-2 border-card" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">{pairName} LP</h3>
                <p className="text-xs text-muted-foreground">
                  Pool #{pool.pid} • <span className="text-primary">{Number(pool.allocPoint)}x</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasDeposit && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Farming
                </Badge>
              )}
              <Badge className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/30 px-2 py-0.5">
                <Flame className="w-3 h-3 mr-1" />
                {pool.apr > 1000 ? `${(pool.apr / 1000).toFixed(1)}K` : pool.apr.toFixed(2)}% APR
              </Badge>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> APR
              </p>
              <p className="text-lg font-bold text-primary mt-0.5">
                {pool.apr.toFixed(2)}%
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Total Staked
              </p>
              <p className="text-lg font-bold mt-0.5">
                {parseFloat(pool.totalStaked).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Your Staked & Earned */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Your Staked</span>
              <span className="font-bold">
                {parseFloat(pool.userStaked).toFixed(6)} LP
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Earned</span>
              <span className="font-bold text-primary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {parseFloat(pool.pendingReward).toFixed(6)} FRDX
              </span>
            </div>
          </div>

          {/* Harvest Button */}
          {hasPending && isConnected && (
            <Button 
              className="w-full mt-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold"
              onClick={() => onHarvest(pool.pid)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Harvest {parseFloat(pool.pendingReward).toFixed(4)} FRDX
            </Button>
          )}

          {/* Collapsible Details */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full mt-3 border border-border/50 hover:bg-muted/50"
              >
                {isOpen ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show Details
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-4 space-y-4">
              {/* Stake/Unstake Tabs */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={stakeMode === 'stake' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStakeMode('stake')}
                  className={cn(
                    stakeMode === 'stake' 
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600' 
                      : 'border-border/50'
                  )}
                >
                  <ArrowDownToLine className="w-4 h-4 mr-1.5" />
                  Stake
                </Button>
                <Button
                  variant={stakeMode === 'unstake' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStakeMode('unstake')}
                  className={cn(
                    stakeMode === 'unstake'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'
                      : 'border-border/50'
                  )}
                >
                  <ArrowUpFromLine className="w-4 h-4 mr-1.5" />
                  Unstake
                </Button>
              </div>

              {/* Stake Section */}
              {stakeMode === 'stake' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Available LP</span>
                    <span className="font-medium">{parseFloat(pool.lpBalance).toFixed(6)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={stakeAmount}
                      onChange={(e) => {
                        setStakeAmount(e.target.value);
                        if (e.target.value) checkApproval(e.target.value);
                      }}
                      className="flex-1 bg-muted/30 border-border/50"
                      disabled={!isConnected || loading || approving}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary text-xs font-semibold px-2"
                      onClick={() => {
                        setStakeAmount(pool.lpBalance);
                        checkApproval(pool.lpBalance);
                      }}
                      disabled={!isConnected}
                    >
                      MAX
                    </Button>
                  </div>
                  
                  {!hasLpBalance && isPair && (
                    <Link to="/liquidity" className="block">
                      <p className="text-xs text-muted-foreground text-center">
                        No LP tokens? <span className="text-primary hover:underline">Add liquidity first →</span>
                      </p>
                    </Link>
                  )}

                  <Button
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                    onClick={handleStake}
                    disabled={!isConnected || loading || approving || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  >
                    {loading || approving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        {approving ? 'Approving...' : 'Staking...'}
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="w-4 h-4 mr-2" />
                        Stake LP
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Unstake Section */}
              {stakeMode === 'unstake' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Available LP</span>
                    <span className="font-medium">{parseFloat(pool.userStaked).toFixed(6)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                      className="flex-1 bg-muted/30 border-border/50"
                      disabled={!isConnected || loading || !hasDeposit}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary text-xs font-semibold px-2"
                      onClick={() => setUnstakeAmount(pool.userStaked)}
                      disabled={!isConnected || !hasDeposit}
                    >
                      MAX
                    </Button>
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    onClick={handleUnstake}
                    disabled={!isConnected || loading || !hasDeposit || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Unstaking...
                      </>
                    ) : (
                      <>
                        <ArrowUpFromLine className="w-4 h-4 mr-2" />
                        Unstake LP
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Footer Links */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <a
                  href={`${NEXUS_TESTNET.blockExplorer}/address/${pool.lpToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                >
                  View LP Contract
                  <ExternalLink className="w-3 h-3" />
                </a>
                
                {hasDeposit && (
                  <button
                    onClick={() => setShowEmergency(true)}
                    className="text-xs text-destructive/70 hover:text-destructive flex items-center gap-1 transition-colors"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Emergency
                  </button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </Card>

      {/* Emergency Withdraw Dialog */}
      <Dialog open={showEmergency} onOpenChange={setShowEmergency}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Emergency Withdraw
            </DialogTitle>
            <DialogDescription>
              This will withdraw all your staked LP tokens WITHOUT harvesting pending rewards.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">You will LOSE:</p>
            <p className="text-lg font-bold text-destructive">{parseFloat(pool.pendingReward).toFixed(6)} FRDX rewards</p>
            <p className="text-sm font-medium mt-3">You will receive:</p>
            <p className="text-lg font-bold">{parseFloat(pool.userStaked).toFixed(6)} LP tokens</p>
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
    </>
  );
});
