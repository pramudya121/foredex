import { useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ArrowDownToLine,
  ArrowUpFromLine,
  Gift,
  AlertTriangle,
  Flame,
  Sparkles,
  Layers,
  Coins,
} from 'lucide-react';

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
  onDeposit: (pool: PoolInfo) => void;
  onWithdraw: (pool: PoolInfo) => void;
  onHarvest: (pid: number) => void;
  onEmergencyWithdraw: (pid: number) => void;
}

export function FarmCard({ pool, onDeposit, onWithdraw, onHarvest, onEmergencyWithdraw }: FarmCardProps) {
  const { isConnected } = useWeb3();
  const [showEmergency, setShowEmergency] = useState(false);
  
  const hasDeposit = parseFloat(pool.userStaked) > 0;
  const hasPending = parseFloat(pool.pendingReward) > 0;
  const pairName = pool.token1Symbol 
    ? `${pool.token0Symbol}-${pool.token1Symbol}` 
    : pool.token0Symbol;

  return (
    <>
      <Card className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-card/80 via-card to-card/90 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
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
              <CardTitle className="text-lg font-bold">{pairName}</CardTitle>
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
                  {parseFloat(pool.pendingReward).toFixed(6)} FRDX
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
              className="w-full border-primary/30 hover:bg-primary/10 hover:border-primary/50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeposit(pool);
              }}
            >
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              Deposit
            </Button>
            <Button
              variant="outline"
              className="w-full border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onWithdraw(pool);
              }}
              disabled={!hasDeposit}
            >
              <ArrowUpFromLine className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
          </div>

          {/* Info & Emergency */}
          <div className="flex items-center justify-between text-xs">
            {isConnected && parseFloat(pool.lpBalance) > 0 && (
              <span className="text-muted-foreground">LP Balance: {parseFloat(pool.lpBalance).toFixed(4)}</span>
            )}
            {hasDeposit && (
              <button
                onClick={() => setShowEmergency(true)}
                className="text-destructive/70 hover:text-destructive transition-colors flex items-center gap-1 ml-auto"
              >
                <AlertTriangle className="w-3 h-3" />
                Emergency
              </button>
            )}
          </div>
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
}
