import { memo, useMemo, useCallback, useState } from 'react';
import { PoolsTable } from '@/components/PoolsTable';
import { FactoryInfo } from '@/components/FactoryInfo';
import { FactoryAdminPanel } from '@/components/FactoryAdminPanel';
import { Droplets, TrendingUp, BarChart3, Coins, Flame, Settings2, Shield, RefreshCw, Sparkles } from 'lucide-react';
import { usePoolStats } from '@/hooks/usePoolStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ScrollReveal, RevealSection } from '@/components/ui/scroll-reveal';
import { Spotlight } from '@/components/ui/spotlight';
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible';

const StatCard = memo(({ 
  icon: Icon, 
  iconColor, 
  bgColor, 
  label, 
  value, 
  numericValue,
  loading, 
  valueColor,
  delay = 0,
  prefix = '',
  suffix = '',
}: {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  label: string;
  value: string;
  numericValue?: number;
  loading: boolean;
  valueColor?: string;
  delay?: number;
  prefix?: string;
  suffix?: string;
}) => (
  <div className="relative group">
    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-primary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative glass-card p-4 sm:p-5 hover-lift overflow-hidden transition-all duration-300 group-hover:border-primary/30">
      <BorderBeam size={80} duration={12} delay={delay / 1000} />
      <div className="flex items-center gap-3">
        <div className={`p-2.5 sm:p-3 rounded-xl ${bgColor} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-6 sm:h-8 w-16 sm:w-20 mt-0.5" />
          ) : numericValue !== undefined ? (
            <p className={`text-lg sm:text-2xl font-bold ${valueColor || 'text-foreground'}`}>
              <NumberTicker value={numericValue} prefix={prefix} suffix={suffix} delay={delay} decimalPlaces={2} />
            </p>
          ) : (
            <p className={`text-lg sm:text-2xl font-bold truncate ${valueColor || 'text-foreground'}`}>{value}</p>
          )}
        </div>
      </div>
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

const Pools = () => {
  const { stats, refetch, isRefreshing } = usePoolStats();
  const [showFactoryInfo, setShowFactoryInfo] = useState(false);

  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) return { value: num / 1000000, suffix: 'M' };
    if (num >= 1000) return { value: num / 1000, suffix: 'K' };
    return { value: num, suffix: '' };
  }, []);

  const statsData = useMemo(() => {
    const tvl = formatNumber(stats.totalTVL);
    const volume = formatNumber(stats.volume24h);
    const fees = formatNumber(stats.totalFees);
    
    return [
      { icon: Droplets, iconColor: 'text-primary', bgColor: 'bg-primary/10', label: 'Total Pools', value: String(stats.totalPools), delay: 0 },
      { icon: TrendingUp, iconColor: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Total TVL', numericValue: tvl.value, prefix: '$', suffix: tvl.suffix, delay: 100 },
      { icon: BarChart3, iconColor: 'text-blue-500', bgColor: 'bg-blue-500/10', label: '24h Volume', numericValue: volume.value, prefix: '$', suffix: volume.suffix, delay: 200 },
      { icon: Coins, iconColor: 'text-purple-500', bgColor: 'bg-purple-500/10', label: '24h Fees', numericValue: fees.value, prefix: '$', suffix: fees.suffix, valueColor: 'text-green-500', delay: 300 },
    ];
  }, [stats, formatNumber]);

  return (
    <Spotlight className="min-h-screen">
      <main className="container py-4 sm:py-6 md:py-10 max-w-7xl px-3 sm:px-4 relative">
        {/* Ambient background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-40 left-1/4 w-64 h-64 bg-blue-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Hero Section */}
        <ScrollReveal direction="up" delay={0}>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-wolf relative">
                  <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg -z-10" />
                  <Droplets className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    Liquidity <span className="text-primary">Pools</span>
                  </h1>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    <Flame className="w-3 h-3 mr-1 text-orange-500" />
                    Earn 0.3% on every trade
                  </Badge>
                </div>
              </div>
              <p className="text-muted-foreground text-sm md:text-base max-w-xl">
                Provide liquidity to earn trading fees. APR calculated from real on-chain data.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFactoryInfo(!showFactoryInfo)}
                className="flex items-center gap-2 hover:border-primary/50"
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Factory</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={refetch}
                disabled={isRefreshing}
                className="h-9 px-3"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </ScrollReveal>

        {/* Factory Info Collapsible */}
        <Collapsible open={showFactoryInfo} onOpenChange={setShowFactoryInfo}>
          <CollapsibleContent className="mb-6">
            <ScrollReveal direction="up">
              <div className="glass-card p-1 rounded-2xl">
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="mb-4 ml-4 mt-4">
                    <TabsTrigger value="info" className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Factory Info
                    </TabsTrigger>
                    <TabsTrigger value="admin" className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="info" className="px-4 pb-4">
                    <FactoryInfo />
                  </TabsContent>
                  <TabsContent value="admin" className="px-4 pb-4">
                    <FactoryAdminPanel />
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollReveal>
          </CollapsibleContent>
        </Collapsible>

        {/* Stats Cards */}
        <RevealSection className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Platform Statistics</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {statsData.map((stat, index) => (
              <StatCard
                key={index}
                icon={stat.icon}
                iconColor={stat.iconColor}
                bgColor={stat.bgColor}
                label={stat.label}
                value={stat.value || ''}
                numericValue={stat.numericValue}
                loading={stats.loading}
                valueColor={stat.valueColor}
                delay={stat.delay}
                prefix={stat.prefix}
                suffix={stat.suffix}
              />
            ))}
          </div>
        </RevealSection>

        {/* Pools Table */}
        <RevealSection>
          <PoolsTable />
        </RevealSection>
      </main>
    </Spotlight>
  );
};

export default memo(Pools);
