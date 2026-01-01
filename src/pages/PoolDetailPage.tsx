import { useParams, useNavigate } from 'react-router-dom';
import { useFarmingData } from '@/hooks/useFarmingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TokenLogo } from '@/components/TokenLogo';
import { ArrowLeft, Flame, Layers, Gift, TrendingUp, Clock, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Mock historical data for APR chart
const generateMockAPRData = (currentAPR: number) => {
  const data = [];
  for (let i = 30; i >= 0; i--) {
    const variance = (Math.random() - 0.5) * currentAPR * 0.3;
    data.push({
      day: `Day ${30 - i}`,
      apr: Math.max(0, currentAPR + variance),
    });
  }
  return data;
};

export default function PoolDetailPage() {
  const { pid } = useParams();
  const navigate = useNavigate();
  const { pools, stats, loading } = useFarmingData();

  const pool = pools.find(p => p.pid === Number(pid));
  const aprData = pool ? generateMockAPRData(pool.apr) : [];

  if (loading) {
    return (
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-10 w-32 mb-6" />
        <Skeleton className="h-64 w-full mb-6" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate('/farming')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Farming
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Pool not found</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const pairName = pool.token1Symbol ? `${pool.token0Symbol}-${pool.token1Symbol}` : pool.token0Symbol;

  return (
    <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
      <Button variant="ghost" onClick={() => navigate('/farming')} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Farming
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex -space-x-3">
          <TokenLogo symbol={pool.token0Symbol} size="xl" className="border-2 border-card z-10" />
          {pool.token1Symbol && (
            <TokenLogo symbol={pool.token1Symbol} size="xl" className="border-2 border-card" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{pairName}</h1>
          <p className="text-muted-foreground">Pool #{pool.pid} • {Number(pool.allocPoint)}x Multiplier</p>
        </div>
        <Badge className="ml-auto bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30 px-4 py-2 text-lg">
          <Flame className="w-4 h-4 mr-2" />
          {pool.apr.toFixed(0)}% APR
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Layers className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Deposited</p>
                <p className="text-xl font-bold">{parseFloat(pool.totalStaked).toFixed(4)} LP</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Your Deposit</p>
                <p className="text-xl font-bold">{parseFloat(pool.userStaked).toFixed(4)} LP</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pending Rewards</p>
                <p className="text-xl font-bold text-yellow-500">{parseFloat(pool.pendingReward).toFixed(6)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pool ID</p>
                <p className="text-xl font-bold">#{pool.pid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* APR Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Historical APR (30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aprData}>
                <defs>
                  <linearGradient id="aprGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'APR']}
                />
                <Area type="monotone" dataKey="apr" stroke="hsl(var(--primary))" fill="url(#aprGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pool Info */}
      <Card>
        <CardHeader>
          <CardTitle>Pool Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">LP Token Address</span>
            <span className="font-mono text-sm">{pool.lpToken}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Reward Token</span>
            <span>{stats?.rewardTokenSymbol || 'FRDX'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Reward Per Block</span>
            <span>{stats?.rewardPerBlock || '0'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Allocation Points</span>
            <span>{Number(pool.allocPoint)}</span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
