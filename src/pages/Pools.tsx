import { useState } from 'react';
import { PoolsTable } from '@/components/PoolsTable';
import { CreatePair } from '@/components/CreatePair';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, Plus, TrendingUp, BarChart3, Coins, RefreshCw, Flame } from 'lucide-react';
import { usePoolStats } from '@/hooks/usePoolStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Pools = () => {
  const [activeTab, setActiveTab] = useState('pools');
  const { stats, refetch, isRefreshing } = usePoolStats();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <main className="container py-8 md:py-12 max-w-7xl">
      {/* Hero Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-gradient-wolf">
              <Droplets className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                Liquidity <span className="text-primary">Pools</span>
              </h1>
              <Badge variant="secondary" className="mt-1">
                <Flame className="w-3 h-3 mr-1 text-orange-500" />
                Earn 0.3% on every trade
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Provide liquidity to earn trading fees. APR calculated from real on-chain trading volume.
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
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pools</p>
              {stats.loading ? (
                <Skeleton className="h-8 w-14 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{stats.totalPools}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="glass-card p-5 hover:border-green-500/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-500/10">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total TVL</p>
              {stats.loading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{formatNumber(stats.totalTVL)}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="glass-card p-5 hover:border-blue-500/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <BarChart3 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">24h Volume</p>
              {stats.loading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{formatNumber(stats.volume24h)}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="glass-card p-5 hover:border-purple-500/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Coins className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Fees (24h)</p>
              {stats.loading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-green-500">{formatNumber(stats.totalFees)}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="glass-card p-1 h-auto w-full md:w-auto inline-flex">
          <TabsTrigger 
            value="pools" 
            className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Droplets className="w-4 h-4" />
            All Pools
          </TabsTrigger>
          <TabsTrigger 
            value="create" 
            className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            Create Pool
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pools" className="mt-6">
          <PoolsTable />
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <div className="max-w-lg mx-auto">
            <CreatePair />
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Pools;
