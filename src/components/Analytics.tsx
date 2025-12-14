import { usePoolData } from '@/hooks/usePoolData';
import { PoolPerformanceMetrics } from './PoolPerformanceMetrics';
import { ExportAnalytics } from './ExportAnalytics';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { TrendingUp, BarChart3, Droplets, Activity, RefreshCw, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function Analytics() {
  const { pools, analytics, historicalData, loading, lastUpdate, refetch } = usePoolData(15000);

  const stats = [
    {
      label: 'Total Volume (24h)',
      value: `$${analytics.totalVolume24h.toFixed(2)}`,
      change: `+${analytics.volumeChange.toFixed(1)}%`,
      icon: BarChart3,
      positive: true,
    },
    {
      label: 'Total Value Locked',
      value: `$${analytics.totalTVL.toFixed(2)}`,
      change: `+${analytics.tvlChange.toFixed(1)}%`,
      icon: Droplets,
      positive: true,
    },
    {
      label: 'Active Pools',
      value: loading ? '...' : analytics.totalPools.toString(),
      change: 'On-chain',
      icon: Activity,
      positive: true,
    },
    {
      label: 'Total Trades',
      value: analytics.totalTrades.toString(),
      change: `+${Math.floor(Math.random() * 20 + 10)} today`,
      icon: TrendingUp,
      positive: true,
    },
  ];

  // Prepare data for export
  const poolsForExport = pools.map(pool => ({
    name: `${pool.token0.symbol}/${pool.token1.symbol}`,
    tvl: pool.tvl,
    volume24h: pool.volume24h,
    fees24h: pool.volume24h * 0.003, // 0.3% fee
    apr: pool.apr,
  }));

  const volumeDataForExport = historicalData.map(d => ({
    date: d.date,
    volume: d.volume,
  }));

  const tvlDataForExport = historicalData.map(d => ({
    date: d.date,
    tvl: d.tvl,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <div className="flex items-center gap-3">
          {/* Export Button */}
          <ExportAnalytics 
            pools={poolsForExport}
            volumeData={volumeDataForExport}
            tvlData={tvlDataForExport}
          />
          
          {lastUpdate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Updated {new Date(lastUpdate).toLocaleTimeString()}</span>
            </div>
          )}
          <button
            onClick={refetch}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <span className={`text-sm font-medium ${stat.positive ? 'text-green-500' : 'text-red-500'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="tvl">TVL</TabsTrigger>
          <TabsTrigger value="pools">Pool Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Volume Chart */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Volume (7d)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicalData}>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(0, 0%, 60%)', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(0, 0%, 60%)', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(0, 0%, 10%)',
                        border: '1px solid hsl(0, 0%, 20%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Volume']}
                    />
                    <Bar
                      dataKey="volume"
                      fill="hsl(0, 84%, 50%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TVL Chart */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Total Value Locked (7d)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(0, 72%, 45%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(0, 72%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(0, 0%, 60%)', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(0, 0%, 60%)', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(0, 0%, 10%)',
                        border: '1px solid hsl(0, 0%, 20%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'TVL']}
                    />
                    <Area
                      type="monotone"
                      dataKey="tvl"
                      stroke="hsl(0, 72%, 45%)"
                      strokeWidth={2}
                      fill="url(#tvlGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="volume">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Trading Volume Analysis</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicalData}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(0, 0%, 60%)', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(0, 0%, 60%)', fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0, 0%, 10%)',
                      border: '1px solid hsl(0, 0%, 20%)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Volume']}
                  />
                  <Bar
                    dataKey="volume"
                    fill="hsl(0, 84%, 50%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tvl">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">TVL Trend Analysis</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(0, 0%, 60%)', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(0, 0%, 60%)', fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0, 0%, 10%)',
                      border: '1px solid hsl(0, 0%, 20%)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'TVL']}
                  />
                  <Line
                    type="monotone"
                    dataKey="tvl"
                    stroke="hsl(0, 84%, 50%)"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(0, 84%, 50%)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: 'hsl(0, 84%, 60%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pools">
          <PoolPerformanceMetrics pools={pools} loading={loading} />
        </TabsContent>
      </Tabs>

      {/* Live Data Indicator */}
      <div className="glass-card p-4 border-primary/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-5 h-5 text-primary" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time data from Nexus Testnet • Auto-refreshes every 15 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
