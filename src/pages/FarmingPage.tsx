import { useState, useMemo, useCallback, memo } from 'react';
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
  Zap,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PoolInfo } from '@/components/farming/FarmCard';

// Stats Card Component
const StatsCard = memo(function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  gradient = false,
  iconColor = 'text-primary'
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  subValue?: string;
  gradient?: boolean;
  iconColor?: string;
}) {
  return (
    <Card className={`overflow-hidden border-border/40 transition-all duration-300 hover:border-primary/30 ${
      gradient 
        ? 'bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border-primary/30' 
        : 'bg-gradient-to-br from-card via-card to-card/80'
    }`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${gradient ? 'bg-primary/20' : 'bg-muted/50'} ring-1 ${gradient ? 'ring-primary/30' : 'ring-border/50'}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
            <p className={`text-xl font-bold truncate ${gradient ? 'text-primary' : 'text-foreground'}`}>
              {value}
            </p>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Loading Skeleton
const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="border-border/40 bg-card/80">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-28" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Pools Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="border-border/40 bg-card/80">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <Skeleton className="w-11 h-11 rounded-full" />
                    <Skeleton className="w-11 h-11 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-10 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

// Empty State
const EmptyState = memo(function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Card className="border-border/40 bg-gradient-to-br from-card via-card to-muted/20">
      <CardContent className="py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Sprout className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {hasFilters ? 'No pools match your filters' : 'No farming pools available'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {hasFilters 
            ? 'Try adjusting your filter settings to see more pools.'
            : 'Check back later for new farming opportunities.'}
        </p>
      </CardContent>
    </Card>
  );
});

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

  const handleFilteredPoolsChange = useCallback((filtered: PoolInfo[]) => {
    setFilteredPools(filtered);
  }, []);

  const totalPendingRewards = useMemo(() => {
    return pools.reduce((sum, p) => sum + parseFloat(p.pendingReward), 0);
  }, [pools]);

  const totalUserStaked = useMemo(() => {
    return pools.reduce((sum, p) => sum + parseFloat(p.userStaked), 0);
  }, [pools]);

  const totalTVL = useMemo(() => {
    return pools.reduce((sum, p) => sum + parseFloat(p.totalStaked), 0);
  }, [pools]);

  const formatNumber = (num: number, decimals = 4) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(decimals);
  };

  const handleHarvest = useCallback(async (pid: number) => {
    try {
      toast.loading('Harvesting rewards...', { id: `harvest-${pid}` });
      await harvest(pid);
      toast.success('Rewards harvested!', { id: `harvest-${pid}` });
    } catch (err: any) {
      console.error('Harvest error:', err);
      const msg = err?.reason || err?.message || 'Harvest failed';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: `harvest-${pid}` });
    }
  }, [harvest]);

  const handleHarvestAll = useCallback(async () => {
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
  }, [totalPendingRewards, harvestAll]);

  const handleEmergencyWithdraw = useCallback(async (pid: number) => {
    try {
      toast.loading('Emergency withdrawing...', { id: `emergency-${pid}` });
      await emergencyWithdraw(pid);
      toast.success('Emergency withdrawal complete', { id: `emergency-${pid}` });
    } catch (err: any) {
      console.error('Emergency withdraw error:', err);
      const msg = err?.reason || err?.message || 'Emergency withdraw failed';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: `emergency-${pid}` });
    }
  }, [emergencyWithdraw]);

  // Error State
  if (error && pools.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-destructive mb-2">Failed to load farming data</h3>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => refetch()} variant="outline" className="border-destructive/30 hover:bg-destructive/10">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 lg:py-8 space-y-6 lg:space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-6 lg:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-primary/20 ring-2 ring-primary/30">
                <Sprout className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Yield Farming</h1>
              {stats?.isPaused && (
                <Badge variant="destructive" className="text-xs">
                  Paused
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm lg:text-base max-w-xl">
              Stake your LP tokens to earn FRDX rewards. Higher APR for longer-term stakers.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()} 
              disabled={loading}
              className="border-primary/30 hover:bg-primary/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {!isConnected && (
              <Button 
                onClick={() => connect()}
                className="bg-gradient-to-r from-primary to-rose-500 hover:from-primary/90 hover:to-rose-500/90"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>

      {loading && pools.length === 0 ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard 
              icon={BarChart3} 
              label="Active Pools" 
              value={pools.length.toString()}
              subValue={`${stats?.rewardPerBlock || '0'} FRDX/block`}
              iconColor="text-blue-400"
            />
            <StatsCard 
              icon={Coins} 
              label="Total Value Locked" 
              value={`${formatNumber(totalTVL, 2)} LP`}
              iconColor="text-green-400"
            />
            <StatsCard 
              icon={TrendingUp} 
              label="Your Stake" 
              value={`${formatNumber(totalUserStaked, 4)} LP`}
              iconColor="text-purple-400"
            />
            
            {/* Pending Rewards Card with Harvest All */}
            <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/15 via-primary/10 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/20 ring-1 ring-primary/30">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">Pending Rewards</p>
                      <p className="text-xl font-bold text-primary">
                        {formatNumber(totalPendingRewards, 4)} FRDX
                      </p>
                    </div>
                  </div>
                  
                  {isConnected && totalPendingRewards > 0 && (
                    <Button 
                      size="sm" 
                      onClick={handleHarvestAll}
                      disabled={harvestingAll}
                      className="bg-gradient-to-r from-primary to-rose-500 hover:from-primary/90 hover:to-rose-500/90 shadow-lg shadow-primary/25"
                    >
                      {harvestingAll ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-1" />
                          Claim
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
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Active Pools</h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredPools.length} of {pools.length} pools shown
                  </p>
                </div>
              </div>
            </div>
            
            {/* Filters */}
            <FarmingFilters
              pools={pools}
              onFilteredPoolsChange={handleFilteredPoolsChange}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            {/* Pools Grid */}
            {filteredPools.length === 0 ? (
              <EmptyState hasFilters={pools.length > 0} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
