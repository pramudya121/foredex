import { useState } from 'react';
import { PoolsTable } from '@/components/PoolsTable';
import { CreatePair } from '@/components/CreatePair';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, Plus, TrendingUp, BarChart3, Coins, RefreshCw } from 'lucide-react';
import { usePoolStats } from '@/hooks/usePoolStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const Pools = () => {
  const [activeTab, setActiveTab] = useState('pools');
  const { stats, refetch } = usePoolStats();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <main className="container py-8 md:py-12 max-w-6xl">
      {/* Hero Section */}
      <div className="mb-8 text-center md:text-left flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Liquidity Pools
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Provide liquidity to earn trading fees. Create new pools or add to existing ones.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refetch}
          className="hidden md:flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Droplets className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pools</p>
              {stats.loading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-xl font-bold">{stats.totalPools}</p>
              )}
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total TVL</p>
              {stats.loading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className="text-xl font-bold">{formatNumber(stats.totalTVL)}</p>
              )}
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">24h Volume</p>
              {stats.loading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className="text-xl font-bold">{formatNumber(stats.volume24h)}</p>
              )}
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Coins className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Fees</p>
              {stats.loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-xl font-bold">{formatNumber(stats.totalFees)}</p>
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
