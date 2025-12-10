import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI } from '@/config/abis';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3, Droplets, Activity } from 'lucide-react';

// Mock data for demonstration - in production, this would come from a subgraph
const mockVolumeData = [
  { date: 'Dec 4', volume: 1200, tvl: 5000 },
  { date: 'Dec 5', volume: 1800, tvl: 5500 },
  { date: 'Dec 6', volume: 2200, tvl: 6200 },
  { date: 'Dec 7', volume: 1600, tvl: 6000 },
  { date: 'Dec 8', volume: 2800, tvl: 7500 },
  { date: 'Dec 9', volume: 3200, tvl: 8000 },
  { date: 'Dec 10', volume: 2900, tvl: 8500 },
];

export function Analytics() {
  const [totalPools, setTotalPools] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
        const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
        const pairCount = await factory.allPairsLength();
        setTotalPools(Number(pairCount));
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const stats = [
    {
      label: 'Total Volume (24h)',
      value: '$2,847',
      change: '+12.5%',
      icon: BarChart3,
      positive: true,
    },
    {
      label: 'Total Value Locked',
      value: '$8,523',
      change: '+8.2%',
      icon: Droplets,
      positive: true,
    },
    {
      label: 'Active Pools',
      value: loading ? '...' : totalPools.toString(),
      change: 'On-chain',
      icon: Activity,
      positive: true,
    },
    {
      label: 'Total Trades',
      value: '156',
      change: '+23 today',
      icon: TrendingUp,
      positive: true,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Analytics</h2>

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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Volume (7d)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockVolumeData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 84%, 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(0, 84%, 50%)" stopOpacity={0} />
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
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0, 0%, 10%)',
                    border: '1px solid hsl(0, 0%, 20%)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(0, 0%, 98%)' }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="hsl(0, 84%, 50%)"
                  strokeWidth={2}
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TVL Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Total Value Locked (7d)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockVolumeData}>
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
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0, 0%, 10%)',
                    border: '1px solid hsl(0, 0%, 20%)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(0, 0%, 98%)' }}
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

      {/* Info Banner */}
      <div className="glass-card p-4 border-primary/30">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            Analytics data is fetched directly from Nexus Testnet. For production, connect a subgraph for historical data.
          </p>
        </div>
      </div>
    </div>
  );
}
