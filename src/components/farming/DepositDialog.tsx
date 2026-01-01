import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/config/contracts';
import { ERC20_ABI } from '@/config/abis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TokenLogo } from '@/components/TokenLogo';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Check, ExternalLink, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { PoolInfo } from './FarmCard';

interface DepositDialogProps {
  pool: PoolInfo | null;
  isOpen: boolean;
  onClose: () => void;
  mode: 'deposit' | 'withdraw';
  onDeposit: (pid: number, amount: string) => Promise<void>;
  onWithdraw: (pid: number, amount: string) => Promise<void>;
}

export function DepositDialog({ pool, isOpen, onClose, mode, onDeposit, onWithdraw }: DepositDialogProps) {
  const { signer, address } = useWeb3();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(false);

  const maxAmount = mode === 'deposit' ? pool?.lpBalance : pool?.userStaked;
  const maxAmountNum = parseFloat(maxAmount || '0');
  const pairName = pool?.token1Symbol 
    ? `${pool.token0Symbol}-${pool.token1Symbol}` 
    : pool?.token0Symbol || 'LP';

  // Check approval when dialog opens or amount changes (only for deposit)
  useEffect(() => {
    if (!isOpen || !pool || mode !== 'deposit') {
      setIsApproved(mode === 'withdraw');
      return;
    }

    const checkApproval = async () => {
      if (!address || !signer?.provider || !amount || parseFloat(amount) <= 0) {
        setIsApproved(false);
        return;
      }

      setCheckingApproval(true);
      try {
        const lpContract = new ethers.Contract(pool.lpToken, ERC20_ABI, signer.provider);
        const amountWei = ethers.parseEther(amount);
        const allowance = await lpContract.allowance(address, CONTRACTS.FARMING);
        setIsApproved(allowance >= amountWei);
      } catch (error) {
        console.error('Error checking approval:', error);
        setIsApproved(false);
      } finally {
        setCheckingApproval(false);
      }
    };

    const debounce = setTimeout(checkApproval, 300);
    return () => clearTimeout(debounce);
  }, [pool, address, amount, mode, signer, isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setIsApproved(false);
      setLoading(false);
      setApproving(false);
    }
  }, [isOpen]);

  const handlePercentage = (percent: number) => {
    if (maxAmountNum > 0) {
      const value = (maxAmountNum * percent / 100).toFixed(18);
      // Remove trailing zeros
      setAmount(parseFloat(value).toString());
    }
  };

  const handleMax = () => {
    if (maxAmount) setAmount(maxAmount);
  };

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

  const handleConfirm = async () => {
    if (!pool || !amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > maxAmountNum) {
      toast.error('Amount exceeds available balance');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'deposit') {
        toast.loading('Depositing LP tokens...', { id: 'deposit' });
        await onDeposit(pool.pid, amount);
        toast.success('Deposit successful!', { id: 'deposit' });
      } else {
        toast.loading('Withdrawing LP tokens...', { id: 'withdraw' });
        await onWithdraw(pool.pid, amount);
        toast.success('Withdrawal successful!', { id: 'withdraw' });
      }
      onClose();
    } catch (error: any) {
      console.error('Transaction error:', error);
      const msg = error?.reason || error?.message || 'Transaction failed';
      const toastId = mode === 'deposit' ? 'deposit' : 'withdraw';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!pool) return null;

  const hasNoBalance = mode === 'deposit' && maxAmountNum <= 0;

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

          {/* No Balance Warning for Deposit */}
          {hasNoBalance && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-500">No LP Tokens Available</p>
                  <p className="text-xs text-muted-foreground">
                    You need {pairName} LP tokens to deposit. Add liquidity first to get LP tokens.
                  </p>
                </div>
              </div>
              <Link to="/liquidity" onClick={onClose}>
                <Button variant="outline" size="sm" className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Liquidity to Get LP Tokens
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </Link>
            </div>
          )}

          {!hasNoBalance && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-muted-foreground">
                    Available: {maxAmountNum.toFixed(6)} LP
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-16 text-lg"
                    min="0"
                    step="any"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs font-semibold text-primary"
                    onClick={handleMax}
                  >
                    MAX
                  </Button>
                </div>

                {/* Percentage Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handlePercentage(percent)}
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pool</span>
                  <span className="font-medium">{pairName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">APR</span>
                  <span className="text-green-400 font-medium">{pool.apr.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Staked</span>
                  <span className="font-medium">{parseFloat(pool.userStaked).toFixed(6)} LP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Rewards</span>
                  <span className="text-primary font-medium">{parseFloat(pool.pendingReward).toFixed(6)} FRDX</span>
                </div>
                
                {mode === 'deposit' && isApproved && (
                  <div className="flex items-center gap-1 text-green-400 pt-1 border-t border-border/50">
                    <Check className="w-3 h-3" />
                    <span className="text-xs">LP Token Approved</span>
                  </div>
                )}
                {mode === 'withdraw' && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                    Withdrawing will also harvest your pending rewards.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          
          {!hasNoBalance && mode === 'deposit' && !isApproved && (
            <Button 
              onClick={handleApprove}
              disabled={approving || checkingApproval || !amount || parseFloat(amount) <= 0}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {approving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Approving...
                </>
              ) : checkingApproval ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Checking...
                </>
              ) : (
                'Approve LP Token'
              )}
            </Button>
          )}
          
          {!hasNoBalance && (mode === 'withdraw' || isApproved) && (
            <Button 
              onClick={handleConfirm}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className={`w-full sm:w-auto ${mode === 'deposit' ? 'bg-gradient-to-r from-primary to-primary/80' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                mode === 'deposit' ? 'Deposit' : 'Withdraw'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}