import { useState, memo, useCallback } from 'react';
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
  TrendingUp,
  Coins,
  Wallet,
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

  const formatNumber = (num: string | number, decimals = 4) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(2)}K`;
    return n.toFixed(decimals);
  };

  const handleApprove = useCallback(async () => {
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
  }, [signer, pool]);

  const checkApproval = useCallback(async (amount: string): Promise<boolean> => {
    if (!address || !signer?.provider || !amount || parseFloat(amount) <= 0) {
      setIsApproved(false);
      return false;
    }

    try {
      const lpContract = new ethers.Contract(pool.lpToken, ERC20_ABI, signer.provider);
      const amountWei = ethers.parseEther(amount);
      const allowance = await lpContract.allowance(address, CONTRACTS.FARMING);
      const approved = allowance >= amountWei;
      setIsApproved(approved);
      return approved;
    } catch (e) {
      console.warn('Error checking approval:', e);
      setIsApproved(false);
      return false;
    }
  }, [address, signer, pool.lpToken]);

  const handleStake = useCallback(async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    if (parseFloat(stakeAmount) > parseFloat(pool.lpBalance)) {
      toast.error('Insufficient LP balance');
      return;
    }

    setLoading(true);
    try {
      // Check approval first
      const approved = await checkApproval(stakeAmount);
      
      if (!approved) {
        // Need to approve first
        await handleApprove();
        // After approval, re-check and proceed to stake
        const nowApproved = await checkApproval(stakeAmount);
        if (!nowApproved) {
          setLoading(false);
          return;
        }
      }

      toast.loading('Staking LP tokens...', { id: `stake-${pool.pid}` });
      await onDeposit(pool.pid, stakeAmount);
      toast.success('Staked successfully!', { id: `stake-${pool.pid}` });
      setStakeAmount('');
      setIsApproved(false); // Reset for next time
    } catch (error: any) {
      console.error('Stake error:', error);
      const msg = error?.reason || error?.message || 'Stake failed';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: `stake-${pool.pid}` });
    } finally {
      setLoading(false);
    }
  }, [stakeAmount, pool, checkApproval, handleApprove, onDeposit]);

  const handleUnstake = useCallback(async () => {
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
  }, [unstakeAmount, pool, onWithdraw]);

  return (
    <>
      <Card className="group overflow-hidden border-border/40 bg-gradient-to-br from-card via-card to-card/80 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.15)]">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardContent className="relative p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex -space-x-3">
                  <TokenLogo 
                    symbol={pool.token0Symbol} 
                    className="w-11 h-11 rounded-full border-2 border-card ring-2 ring-primary/20 z-10" 
                  />
                  {pool.token1Symbol && (
                    <TokenLogo 
                      symbol={pool.token1Symbol} 
                      className="w-11 h-11 rounded-full border-2 border-card ring-2 ring-primary/20" 
                    />
                  )}
                </div>
                {hasDeposit && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight">{pairName}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium border-primary/30 text-primary">
                    {Number(pool.allocPoint)}x
                  </Badge>
                  <span className="text-xs text-muted-foreground">Pool #{pool.pid}</span>
                </div>
              </div>
            </div>
            
            {/* APR Badge */}
            <div className="flex flex-col items-end gap-1.5">
              <Badge className="bg-gradient-to-r from-primary/90 to-rose-500/90 text-primary-foreground border-0 px-2.5 py-1 font-bold text-sm shadow-lg shadow-primary/25">
                <Flame className="w-3.5 h-3.5 mr-1" />
                {pool.apr > 1000 ? `${(pool.apr / 1000).toFixed(1)}K` : pool.apr.toFixed(0)}%
              </Badge>
              <span className="text-[10px] text-muted-foreground">APR</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-3 border border-border/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Coins className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] text-muted-foreground font-medium">Total Staked</span>
              </div>
              <p className="text-base font-bold">{formatNumber(pool.totalStaked, 2)}</p>
            </div>
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-3 border border-border/30">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[11px] text-muted-foreground font-medium">APR</span>
              </div>
              <p className="text-base font-bold text-primary">{pool.apr.toFixed(2)}%</p>
            </div>
          </div>

          {/* User Stats */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-4 mb-4 border border-primary/20">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Your Stake
                </p>
                <p className="text-sm font-bold">{formatNumber(pool.userStaked, 6)} LP</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" /> Earned
                </p>
                <p className="text-sm font-bold text-primary flex items-center gap-1.5">
                  {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                  {formatNumber(pool.pendingReward, 6)} FRDX
                </p>
              </div>
            </div>
          </div>

          {/* Harvest Button */}
          {hasPending && isConnected && (
            <Button 
              className="w-full mb-3 bg-gradient-to-r from-primary to-rose-500 hover:from-primary/90 hover:to-rose-500/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => onHarvest(pool.pid)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Harvest {formatNumber(pool.pendingReward, 4)} FRDX
            </Button>
          )}

          {/* Collapsible Details */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all"
              >
                {isOpen ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    {!isConnected ? 'Connect to Stake' : 'Stake / Unstake'}
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
              {!isConnected ? (
                <div className="text-center py-6">
                  <Wallet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Connect your wallet to stake</p>
                </div>
              ) : (
                <>
                  {/* Stake/Unstake Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted/30 rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStakeMode('stake')}
                      className={cn(
                        "rounded-md transition-all",
                        stakeMode === 'stake' 
                          ? 'bg-gradient-to-r from-primary to-rose-500 text-primary-foreground shadow-lg' 
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <ArrowDownToLine className="w-4 h-4 mr-1.5" />
                      Stake
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStakeMode('unstake')}
                      className={cn(
                        "rounded-md transition-all",
                        stakeMode === 'unstake'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                          : 'hover:bg-muted/50'
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
                        <span className="font-semibold">{formatNumber(pool.lpBalance, 6)}</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            placeholder="0.0"
                            value={stakeAmount}
                            onChange={(e) => {
                              setStakeAmount(e.target.value);
                              if (e.target.value) checkApproval(e.target.value);
                            }}
                            className="pr-16 bg-muted/30 border-border/50 focus:border-primary/50"
                            disabled={!isConnected || loading || approving}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-primary text-xs font-bold hover:bg-primary/10"
                            onClick={() => {
                              setStakeAmount(pool.lpBalance);
                              checkApproval(pool.lpBalance);
                            }}
                            disabled={!isConnected}
                          >
                            MAX
                          </Button>
                        </div>
                      </div>
                      
                      {!hasLpBalance && isPair && (
                        <Link to="/liquidity" className="block">
                          <div className="text-xs text-center py-2 px-3 bg-primary/5 rounded-lg border border-primary/20 text-muted-foreground hover:bg-primary/10 transition-colors">
                            No LP tokens? <span className="text-primary font-medium">Add liquidity first →</span>
                          </div>
                        </Link>
                      )}

                      <Button
                        className="w-full bg-gradient-to-r from-primary to-rose-500 hover:from-primary/90 hover:to-rose-500/90 font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                            {isApproved ? 'Stake LP' : 'Approve & Stake'}
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Unstake Section */}
                  {stakeMode === 'unstake' && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Staked LP</span>
                        <span className="font-semibold">{formatNumber(pool.userStaked, 6)}</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            placeholder="0.0"
                            value={unstakeAmount}
                            onChange={(e) => setUnstakeAmount(e.target.value)}
                            className="pr-16 bg-muted/30 border-border/50 focus:border-primary/50"
                            disabled={!isConnected || loading || !hasDeposit}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-primary text-xs font-bold hover:bg-primary/10"
                            onClick={() => setUnstakeAmount(pool.userStaked)}
                            disabled={!isConnected || !hasDeposit}
                          >
                            MAX
                          </Button>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-500/90 hover:to-amber-500/90 font-semibold shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                  <div className="flex items-center justify-between pt-3 border-t border-border/30">
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
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
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
              This will withdraw your staked LP tokens without collecting pending rewards. Use only in emergencies.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <p className="text-sm font-medium text-destructive mb-2">Warning:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• You will lose {formatNumber(pool.pendingReward, 4)} FRDX pending rewards</li>
              <li>• This action cannot be undone</li>
              <li>• Your {formatNumber(pool.userStaked, 4)} LP will be returned</li>
            </ul>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEmergency(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onEmergencyWithdraw(pool.pid);
                setShowEmergency(false);
              }}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Emergency Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
