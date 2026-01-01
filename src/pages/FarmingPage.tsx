import { useState, useMemo, useCallback } from 'react';
import { useFarmingData } from '@/hooks/useFarmingData';
import { useWeb3 } from '@/contexts/Web3Context';
import { FarmCard } from '@/components/farming/FarmCard';
import { AdminPanel } from '@/components/farming/AdminPanel';
import { FarmingFilters } from '@/components/farming/FarmingFilters';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sprout, 
  TrendingUp, 
  Coins, 
  RefreshCw, 
  Gift,
  Sparkles,
  Shield,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PoolInfo } from '@/components/farming/FarmCard';

function StatsCard({ icon: Icon, label, value, subValue }: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  subValue?: string;
}) {
  return (
    <Card className="bg-gradient-to-br from-card/80 to-card/60 border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Pools Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
              <Skeleton className="h-20 rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function FarmingPage() {
  const { isConnected, connect } = useWeb3();
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
  } = useFarmingData();
  
  const [sortBy, setSortBy] = useState<'apr' | 'tvl' | 'newest'>('apr');
  const [harvestingAll, setHarvestingAll] = useState(false);
  const [filteredPools, setFilteredPools] = useState<PoolInfo[]>([]);

  // Callback for when filters change
  const handleFilteredPoolsChange = useCallback((filtered: PoolInfo[]) => {
    setFilteredPools(filtered);
  }, []);

  const totalPendingRewards = useMemo(() => {
    return pools.reduce((sum, p) => sum + parseFloat(p.pendingReward), 0);
  }, [pools]);

  const totalUserStaked = useMemo(() => {
    return pools.reduce((sum, p) => sum + parseFloat(p.userStaked), 0);
  }, [pools]);

  // Deposit and withdraw now handled directly in FarmCard with inline inputs

  const handleHarvest = async (pid: number) => {
    try {
      toast.loading('Harvesting rewards...', { id: `harvest-${pid}` });
      await harvest(pid);
      toast.success('Rewards harvested!', { id: `harvest-${pid}` });
    } catch (err: any) {
      console.error('Harvest error:', err);
      const msg = err?.reason || err?.message || 'Harvest failed';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: `harvest-${pid}` });
    }
  };

  const handleHarvestAll = async () => {
    if (totalPendingRewards <= 0) {
      toast.error('No rewards to harvest');
      return;
    }
    
    setHarvestingAll(true);
    try {
      toast.loading('Harvesting all rewards...', { id: 'harvest-all' });
      await harvestAll();
      toast.success('All rewards harvested!', { id: 'harvest-all' });
    } catch (err: any) {
      console.error('Harvest all error:', err);
      const msg = err?.reason || err?.message || 'Harvest failed';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'harvest-all' });
    } finally {
      setHarvestingAll(false);
    }
  };

  const handleEmergencyWithdraw = async (pid: number) => {
    try {
      toast.loading('Emergency withdrawing...', { id: `emergency-${pid}` });
      await emergencyWithdraw(pid);
      toast.success('Emergency withdrawal complete', { id: `emergency-${pid}` });
    } catch (err: any) {
      console.error('Emergency withdraw error:', err);
      const msg = err?.reason || err?.message || 'Emergency withdraw failed';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: `emergency-${pid}` });
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sprout className="w-8 h-8 text-primary" />
            Yield Farming
          </h1>
          <p className="text-muted-foreground mt-1">
            Stake LP tokens to earn FRDX rewards
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {stats?.isPaused && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              Farming Paused
            </Badge>
          )}
          
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {!isConnected && (
            <Button onClick={() => connect()}>
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard 
              icon={Coins} 
              label="Total Pools" 
              value={pools.length.toString()}
              subValue={`${stats?.rewardPerBlock || '0'} FRDX/block`}
            />
            <StatsCard 
              icon={TrendingUp} 
              label="Your Total Staked" 
              value={`${totalUserStaked.toFixed(4)} LP`}
            />
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pending Rewards</p>
                      <p className="text-xl font-bold text-primary">{totalPendingRewards.toFixed(6)} FRDX</p>
                    </div>
                  </div>
                  {isConnected && totalPendingRewards > 0 && (
                    <Button 
                      size="sm" 
                      onClick={handleHarvestAll}
                      disabled={harvestingAll}
                      className="bg-gradient-to-r from-primary to-primary/80"
                    >
                      {harvestingAll ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1" />
                          Harvest All
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Panel */}
          {isOwner && (
            <AdminPanel 
              isPaused={stats?.isPaused || false}
              onAddPool={addPool}
              onSetPoolAlloc={setPoolAlloc}
              onPause={pause}
              onUnpause={unpause}
            />
          )}

          {/* Pools Section */}
          <div>
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Active Pools ({filteredPools.length}/{pools.length})
                </h2>
              </div>
              
              {/* Filters */}
              <FarmingFilters
                pools={pools}
                onFilteredPoolsChange={handleFilteredPoolsChange}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
            </div>

            {filteredPools.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <Sprout className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {pools.length === 0 ? 'No farming pools available yet.' : 'No pools match your filters.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPools.map(pool => (
                  <FarmCard
                    key={pool.pid}
                    pool={pool}
                    onDeposit={deposit}
                    onWithdraw={withdraw}
                    onHarvest={handleHarvest}
                    onEmergencyWithdraw={handleEmergencyWithdraw}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
