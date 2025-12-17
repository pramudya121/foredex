import { memo, useMemo, useCallback } from 'react';
import { PoolsTable } from '@/components/PoolsTable';
import { Droplets, TrendingUp, BarChart3, Coins, RefreshCw, Flame } from 'lucide-react';
import { usePoolStats } from '@/hooks/usePoolStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const StatCard = memo(({ 
  icon: Icon, 
  iconColor, 
  bgColor, 
  label, 
  value, 
  loading, 
  valueColor 
}: {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  label: string;
  value: string;
  loading: boolean;
  valueColor?: string;
}) => (
  <div className={`glass-card p-3 sm:p-4 md:p-5 hover:border-${iconColor}/30 transition-colors`}>
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={`p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl ${bgColor}`}>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">{label}</p>
        {loading ? (
          <Skeleton className="h-5 sm:h-6 md:h-8 w-14 sm:w-16 md:w-20 mt-0.5 sm:mt-1" />
        ) : (
          <p className={`text-sm sm:text-lg md:text-2xl font-bold truncate ${valueColor || ''}`}>{value}</p>
        )}
      </div>
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

const Pools = () => {
  const { stats, refetch, isRefreshing } = usePoolStats();

  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  }, []);

  const statsData = useMemo(() => [
    { icon: Droplets, iconColor: 'text-primary', bgColor: 'bg-primary/10', label: 'Total Pools', value: String(stats.totalPools) },
    { icon: TrendingUp, iconColor: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Total TVL', value: formatNumber(stats.totalTVL) },
    { icon: BarChart3, iconColor: 'text-blue-500', bgColor: 'bg-blue-500/10', label: '24h Volume', value: formatNumber(stats.volume24h) },
    { icon: Coins, iconColor: 'text-purple-500', bgColor: 'bg-purple-500/10', label: '24h Fees', value: formatNumber(stats.totalFees), valueColor: 'text-green-500' },
  ], [stats, formatNumber]);

  return (
    <main className="container py-4 sm:py-6 md:py-10 max-w-7xl px-3 sm:px-4">
      {/* Hero Section */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-wolf">
              <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                Liquidity <span className="text-primary">Pools</span>
              </h1>
              <Badge variant="secondary" className="mt-0.5 sm:mt-1 text-xs">
                <Flame className="w-3 h-3 mr-1 text-orange-500" />
                Earn 0.3% on every trade
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-xl">
            Provide liquidity to earn trading fees. APR calculated from real on-chain data.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refetch}
          disabled={isRefreshing}
          className="flex items-center gap-2 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        {statsData.map((stat, index) => (
          <StatCard
            key={index}
            icon={stat.icon}
            iconColor={stat.iconColor}
            bgColor={stat.bgColor}
            label={stat.label}
            value={stat.value}
            loading={stats.loading}
            valueColor={stat.valueColor}
          />
        ))}
      </div>

      {/* Pools Table */}
      <PoolsTable />
    </main>
  );
};

export default memo(Pools);
