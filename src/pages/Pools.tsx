import { useState } from 'react';
import { PoolsTable } from '@/components/PoolsTable';
import { CreatePair } from '@/components/CreatePair';
import { TokenFaucet } from '@/components/TokenFaucet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, Plus, Coins, TrendingUp, BarChart3 } from 'lucide-react';

const Pools = () => {
  const [activeTab, setActiveTab] = useState('pools');

  return (
    <main className="container py-8 md:py-12 max-w-6xl">
      {/* Hero Section */}
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Liquidity Pools
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Provide liquidity to earn trading fees. Create new pools or add to existing ones.
        </p>
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
              <p className="text-xl font-bold">--</p>
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
              <p className="text-xl font-bold">--</p>
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
              <p className="text-xl font-bold">--</p>
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
              <p className="text-xl font-bold">--</p>
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
          <TabsTrigger 
            value="faucet" 
            className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Coins className="w-4 h-4" />
            Token Faucet
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

        <TabsContent value="faucet" className="mt-6">
          <div className="max-w-lg mx-auto">
            <TokenFaucet />
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Pools;
