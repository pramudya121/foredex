import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFarmingData } from '@/hooks/useFarmingData';
import { useWeb3 } from '@/contexts/Web3Context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TokenLogo } from '@/components/TokenLogo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  TrendingUp,
  Coins,
  BarChart3,
  ExternalLink,
  RefreshCw,
  Flame,
  Wallet,
  Clock,
  Activity,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart,
  Bar,
  BarChart,
} from 'recharts';
import { NEXUS_TESTNET } from '@/config/contracts';

// Generate mock historical data for charts
const generateHistoricalData = (pid: number, days: number = 30) => {
  const data = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  // Use pid to create consistent but different data for each pool
  const baseTVL = 10000 + (pid * 5000);
  const baseAPR = 50 + (pid * 20);
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - (i * dayMs));
    const noise = Math.sin(i * 0.5 + pid) * 0.2 + 1;
    const trend = 1 + (days - i) * 0.01;
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: date.getTime(),
      tvl: Math.round(baseTVL * noise * trend),
      apr: Math.round((baseAPR * noise * (2 - trend * 0.5)) * 10) / 10,
      volume: Math.round(baseTVL * noise * 0.3),
      deposits: Math.floor(Math.random() * 10) + 1,
      withdrawals: Math.floor(Math.random() * 5),
    });
  }
  
  return data;
};

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  changePositive,
  subValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  subValue?: string;
}) => (
  <Card className="border-border/40 bg-gradient-to-br from-card via-card to-card/80">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg bg-muted/50">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        {change && (
          <Badge 
            variant="outline" 
            className={changePositive 
              ? 'text-green-400 border-green-400/30 bg-green-400/10' 
              : 'text-red-400 border-red-400/30 bg-red-400/10'
            }
          >
            {changePositive ? <ChevronUp className="w-3 h-3 mr-0.5" /> : <ChevronDown className="w-3 h-3 mr-0.5" />}
            {change}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3 mb-0.5">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
    </CardContent>
  </Card>
);

const ChartSkeleton = () => (
  <div className="h-64 flex items-center justify-center">
    <div className="space-y-2 w-full px-6">
      <Skeleton className="h-48 w-full" />
      <div className="flex justify-between">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-4 w-12" />
        ))}
      </div>
    </div>
  </div>
);

export default function FarmingPoolDetailPage() {
  const { pid } = useParams<{ pid: string }>();
  const { pools, loading, refetch } = useFarmingData();
  const { isConnected } = useWeb3();
  const [chartTab, setChartTab] = useState('tvl');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const poolId = parseInt(pid || '0');
  const pool = pools.find(p => p.pid === poolId);

  const historicalData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return generateHistoricalData(poolId, days);
  }, [poolId, timeRange]);

  const isPair = pool?.token1Symbol;
  const pairName = pool ? (isPair ? `${pool.token0Symbol}-${pool.token1Symbol}` : pool.token0Symbol) : 'Loading...';

  // Calculate stats from historical data
  const statsFromHistory = useMemo(() => {
    if (historicalData.length < 2) return null;
    
    const current = historicalData[historicalData.length - 1];
    const previous = historicalData[0];
    
    const tvlChange = ((current.tvl - previous.tvl) / previous.tvl * 100).toFixed(1);
    const aprChange = ((current.apr - previous.apr) / previous.apr * 100).toFixed(1);
    
    const totalVolume = historicalData.reduce((sum, d) => sum + d.volume, 0);
    const totalDeposits = historicalData.reduce((sum, d) => sum + d.deposits, 0);
    const avgAPR = (historicalData.reduce((sum, d) => sum + d.apr, 0) / historicalData.length).toFixed(1);
    
    return {
      tvlChange,
      aprChange,
      totalVolume,
      totalDeposits,
      avgAPR,
    };
  }, [historicalData]);

  const formatNumber = (num: number | string, decimals = 2) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(2)}K`;
    return `$${n.toFixed(decimals)}`;
  };

  if (loading && !pool) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-border/40">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Pool Not Found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              The pool you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/farming">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Farming
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 lg:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/farming">
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-muted/50">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex -space-x-3">
                <TokenLogo 
                  symbol={pool.token0Symbol} 
                  className="w-12 h-12 rounded-full border-2 border-card ring-2 ring-primary/20 z-10" 
                />
                {pool.token1Symbol && (
                  <TokenLogo 
                    symbol={pool.token1Symbol} 
                    className="w-12 h-12 rounded-full border-2 border-card ring-2 ring-primary/20" 
                  />
                )}
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl lg:text-3xl font-bold">{pairName}</h1>
                <Badge className="bg-gradient-to-r from-primary/90 to-rose-500/90 border-0">
                  <Flame className="w-3 h-3 mr-1" />
                  {pool.apr.toFixed(0)}% APR
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>Pool #{pool.pid}</span>
                <span>•</span>
                <span>{Number(pool.allocPoint)}x multiplier</span>
                <a 
                  href={`${NEXUS_TESTNET.blockExplorer}/address/${pool.lpToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <span className="hidden sm:inline">View contract</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="border-primary/30 hover:bg-primary/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link to="/farming">
            <Button className="bg-gradient-to-r from-primary to-rose-500 hover:from-primary/90 hover:to-rose-500/90">
              <Wallet className="w-4 h-4 mr-2" />
              Stake Now
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Coins}
          label="Total Value Locked"
          value={formatNumber(parseFloat(pool.totalStaked) * 100)}
          change={`${statsFromHistory?.tvlChange}%`}
          changePositive={parseFloat(statsFromHistory?.tvlChange || '0') > 0}
          subValue={`${parseFloat(pool.totalStaked).toFixed(4)} LP tokens`}
        />
        <StatCard
          icon={TrendingUp}
          label="Current APR"
          value={`${pool.apr.toFixed(2)}%`}
          change={`${statsFromHistory?.aprChange}%`}
          changePositive={parseFloat(statsFromHistory?.aprChange || '0') > 0}
          subValue={`Avg ${statsFromHistory?.avgAPR}% (${timeRange})`}
        />
        <StatCard
          icon={Activity}
          label="24h Volume"
          value={formatNumber(historicalData[historicalData.length - 1]?.volume || 0)}
          subValue={`${formatNumber(statsFromHistory?.totalVolume || 0)} total (${timeRange})`}
        />
        <StatCard
          icon={Clock}
          label="Deposit Activity"
          value={`${statsFromHistory?.totalDeposits || 0} deposits`}
          subValue={`In last ${timeRange}`}
        />
      </div>

      {/* User Position Card */}
      {isConnected && (parseFloat(pool.userStaked) > 0 || parseFloat(pool.pendingReward) > 0) && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Your Position
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Staked LP</p>
                <p className="text-lg font-bold">{parseFloat(pool.userStaked).toFixed(6)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Staked Value</p>
                <p className="text-lg font-bold">{formatNumber(parseFloat(pool.userStaked) * 100)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Pending Rewards</p>
                <p className="text-lg font-bold text-primary">{parseFloat(pool.pendingReward).toFixed(6)} FRDX</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Available to Stake</p>
                <p className="text-lg font-bold">{parseFloat(pool.lpBalance).toFixed(6)} LP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Pool Analytics
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-muted/30 rounded-lg p-1">
                {(['7d', '30d', '90d'] as const).map(range => (
                  <Button
                    key={range}
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className={`h-7 px-3 text-xs rounded-md ${
                      timeRange === range 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={chartTab} onValueChange={setChartTab} className="space-y-4">
            <TabsList className="bg-muted/30 p-1">
              <TabsTrigger value="tvl" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Coins className="w-4 h-4 mr-2" />
                TVL History
              </TabsTrigger>
              <TabsTrigger value="apr" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <TrendingUp className="w-4 h-4 mr-2" />
                APR History
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Activity className="w-4 h-4 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tvl" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'TVL']}
                    />
                    <Area
                      type="monotone"
                      dataKey="tvl"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#tvlGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="apr" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`${value}%`, 'APR']}
                    />
                    <Line
                      type="monotone"
                      dataKey="apr"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar 
                      dataKey="deposits" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Deposits"
                    />
                    <Bar 
                      dataKey="withdrawals" 
                      fill="hsl(var(--destructive))" 
                      radius={[4, 4, 0, 0]}
                      name="Withdrawals"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Pool Info */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Pool Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">LP Token Address</span>
                <a 
                  href={`${NEXUS_TESTNET.blockExplorer}/address/${pool.lpToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {pool.lpToken.slice(0, 6)}...{pool.lpToken.slice(-4)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Pool ID</span>
                <span className="text-sm font-medium">{pool.pid}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Allocation Points</span>
                <span className="text-sm font-medium">{Number(pool.allocPoint)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Reward Token</span>
                <span className="text-sm font-medium">FRDX</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Token 0</span>
                <span className="text-sm font-medium">{pool.token0Symbol}</span>
              </div>
              {pool.token1Symbol && (
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Token 1</span>
                  <span className="text-sm font-medium">{pool.token1Symbol}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
