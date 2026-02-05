import { useState, useMemo, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { useFarmingData } from '@/hooks/useFarmingData';
import { useWeb3 } from '@/contexts/Web3Context';
import { FarmCard } from '@/components/farming/FarmCard';
import { FarmingFilters } from '@/components/farming/FarmingFilters';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Spotlight } from '@/components/ui/spotlight';
import { ScrollReveal, RevealSection } from '@/components/ui/scroll-reveal';
import { 
  Sprout, 
  TrendingUp, 
  Coins, 
  Gift,
  Shield,
  Wallet,
  Zap,
  BarChart3,
  Settings,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PoolInfo } from '@/components/farming/FarmCard';

// Stats Card Component
const StatsCard = memo(function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  numericValue,
  subValue,
  gradient = false,
  iconColor = 'text-primary',
  delay = 0,
  prefix = '',
  suffix = '',
}: { 
  icon: React.ElementType; 
  label: string; 
  value?: string;
  numericValue?: number;
  subValue?: string;
  gradient?: boolean;
  iconColor?: string;
  delay?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="relative group">
      <div className={`absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient ? 'bg-gradient-to-r from-primary/50 to-primary/20' : 'bg-primary/20'}`} />
      <Card 
        className={`relative overflow-hidden border-border/40 transition-all duration-300 hover-lift ${
          gradient 
            ? 'bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border-primary/30' 
            : 'bg-card/80'
        }`}
      >
        <BorderBeam size={80} duration={12} delay={delay / 1000} />
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${gradient ? 'bg-primary/20' : 'bg-muted/50'} ring-1 ${gradient ? 'ring-primary/30' : 'ring-border/50'} transition-transform duration-300 group-hover:scale-110`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
              {numericValue !== undefined ? (
                <p className={`text-xl font-bold truncate ${gradient ? 'text-primary' : 'text-foreground'}`}>
                  <NumberTicker value={numericValue} prefix={prefix} suffix={suffix} delay={delay} decimalPlaces={4} />
                </p>
              ) : (
                <p className={`text-xl font-bold truncate ${gradient ? 'text-primary' : 'text-foreground'}`}>
                  {value}
                </p>
              )}
              {subValue && (
                <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

// Loading Skeleton
const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="space-y-6">
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

function FarmingPage() {
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
    if (isNaN(num) || !isFinite(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    if (num < 0.0001 && num > 0) return '<0.0001';
    return num.toFixed(decimals);
  };
  
  const formatRewardPerBlock = (val: string | undefined) => {
    if (!val) return '0';
    const num = parseFloat(val);
    if (isNaN(num)) return '0';
    if (num >= 1) return num.toFixed(4);
    if (num >= 0.0001) return num.toFixed(6);
    if (num > 0) return num.toExponential(2);
    return '0';
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
    <Spotlight className="min-h-screen">
      <div className="container mx-auto px-4 py-6 lg:py-8 space-y-6 lg:space-y-8 relative">
        {/* Ambient background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-40 right-1/3 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-green-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Hero Header */}
        <ScrollReveal direction="up" delay={0}>
          <div className="relative overflow-hidden rounded-2xl glass-card p-6 lg:p-8 border-primary/20">
            <BorderBeam size={150} duration={15} />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_50%)] pointer-events-none" />
            
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-primary/20 ring-2 ring-primary/30">
                    <Sprout className="w-6 h-6 text-primary" />
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    Yield <span className="text-primary">Farming</span>
                  </h1>
                  {stats?.isPaused && (
                    <Badge variant="destructive" className="text-xs">Paused</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm lg:text-base max-w-xl">
                  Stake your LP tokens to earn FRDX rewards. Higher APR for longer-term stakers.
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Link to="/farming/admin">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={loading}
                  className="h-9 px-3"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                
                {!isConnected && (
                  <Button 
                    onClick={() => connect()}
                    className="bg-gradient-wolf hover:opacity-90"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {loading && pools.length === 0 ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Stats Grid */}
            <RevealSection>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Farming Statistics</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard 
                  icon={BarChart3} 
                  label="Active Pools" 
                  value={pools.length.toString()}
                  subValue={`${formatRewardPerBlock(stats?.rewardPerBlock)} FRDX/block`}
                  iconColor="text-blue-400"
                  delay={0}
                />
                <StatsCard 
                  icon={Coins} 
                  label="Total Value Locked" 
                  numericValue={totalTVL}
                  suffix=" LP"
                  iconColor="text-green-400"
                  delay={100}
                />
                <StatsCard 
                  icon={TrendingUp} 
                  label="Your Stake" 
                  numericValue={totalUserStaked}
                  suffix=" LP"
                  iconColor="text-purple-400"
                  delay={200}
                />
                
                {/* Pending Rewards Card with Harvest All */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-primary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/15 via-primary/10 to-transparent">
                    <BorderBeam size={80} duration={12} delay={0.3} />
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-primary/20 ring-1 ring-primary/30 group-hover:scale-110 transition-transform">
                            <Gift className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-0.5">Pending Rewards</p>
                            <p className="text-xl font-bold text-primary">
                              <NumberTicker value={totalPendingRewards} suffix=" FRDX" delay={300} decimalPlaces={4} />
                            </p>
                          </div>
                        </div>
                        
                        {isConnected && totalPendingRewards > 0 && (
                          <Button 
                            size="sm" 
                            onClick={handleHarvestAll}
                            disabled={harvestingAll}
                            className="bg-gradient-wolf hover:opacity-90 shadow-lg shadow-primary/25"
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
              </div>
            </RevealSection>

            {/* Pools Section */}
            <RevealSection>
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
            </RevealSection>
          </>
        )}
      </div>
    </Spotlight>
  );
}

export default memo(FarmingPage);
