import { useParams, useNavigate, Link } from 'react-router-dom';
import { memo, useMemo } from 'react';
import { useFarmingData } from '@/hooks/useFarmingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TokenLogo } from '@/components/TokenLogo';
import { ArrowLeft, Flame, Layers, Gift, TrendingUp, Clock, Activity, ExternalLink, Wallet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NEXUS_TESTNET } from '@/config/contracts';

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

// Stat Card with consistent UI Kit styling
const StatCard = memo(({ 
  icon: Icon, 
  iconColor, 
  bgColor,
  label, 
  value, 
  valueColor,
  delay = 0 
}: {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  label: string;
  value: string;
  valueColor?: string;
  delay?: number;
}) => (
  <div 
    className="glass-card p-4 hover-lift card-glow animate-scale-in opacity-0"
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${bgColor} transition-transform duration-300 hover:scale-110`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold truncate ${valueColor || ''}`}>{value}</p>
      </div>
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

function PoolDetailPage() {
  const { pid } = useParams();
  const navigate = useNavigate();
  const { pools, stats, loading } = useFarmingData();

  const pool = pools.find(p => p.pid === Number(pid));
  const aprData = useMemo(() => pool ? generateMockAPRData(pool.apr) : [], [pool]);

  if (loading) {
    return (
      <main className="container py-6 sm:py-8 max-w-5xl px-4 relative">
        <Skeleton className="h-10 w-32 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full mb-6" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="container py-6 sm:py-8 max-w-5xl px-4 relative">
        <Button variant="ghost" onClick={() => navigate('/farming')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Farming
        </Button>
        <div className="glass-card p-12 text-center animate-scale-in">
          <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold mb-2">Pool Not Found</h2>
          <p className="text-muted-foreground mb-6">The pool you're looking for doesn't exist.</p>
          <Link to="/farming">
            <Button className="bg-gradient-wolf">View All Pools</Button>
          </Link>
        </div>
      </main>
    );
  }

  const pairName = pool.token1Symbol ? `${pool.token0Symbol}-${pool.token1Symbol}` : pool.token0Symbol;

  return (
    <main className="container py-6 sm:py-8 max-w-5xl px-4 relative">
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-green-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Button variant="ghost" onClick={() => navigate('/farming')} className="mb-6 hover-lift">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Farming
      </Button>

      {/* Header */}
      <div className="glass-card p-6 mb-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <TokenLogo symbol={pool.token0Symbol} size="xl" className="border-2 border-card z-10 ring-2 ring-primary/20" />
              {pool.token1Symbol && (
                <TokenLogo symbol={pool.token1Symbol} size="xl" className="border-2 border-card ring-2 ring-primary/20" />
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{pairName}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>Pool #{pool.pid}</span>
                <span>•</span>
                <span>{Number(pool.allocPoint)}x Multiplier</span>
                <a 
                  href={`${NEXUS_TESTNET.blockExplorer}/address/${pool.lpToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30 px-4 py-2 text-lg self-start md:self-center">
            <Flame className="w-4 h-4 mr-2" />
            {pool.apr.toFixed(0)}% APR
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Layers}
          iconColor="text-blue-500"
          bgColor="bg-blue-500/10"
          label="Total Deposited"
          value={`${parseFloat(pool.totalStaked).toFixed(4)} LP`}
          delay={100}
        />
        <StatCard
          icon={TrendingUp}
          iconColor="text-green-500"
          bgColor="bg-green-500/10"
          label="Your Deposit"
          value={`${parseFloat(pool.userStaked).toFixed(4)} LP`}
          delay={200}
        />
        <StatCard
          icon={Gift}
          iconColor="text-yellow-500"
          bgColor="bg-yellow-500/10"
          label="Pending Rewards"
          value={parseFloat(pool.pendingReward).toFixed(6)}
          valueColor="text-primary"
          delay={300}
        />
        <StatCard
          icon={Clock}
          iconColor="text-purple-500"
          bgColor="bg-purple-500/10"
          label="Pool ID"
          value={`#${pool.pid}`}
          delay={400}
        />
      </div>

      {/* APR Chart */}
      <div className="glass-card mb-6 animate-scale-in" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'APR']}
                />
                <Area type="monotone" dataKey="apr" stroke="hsl(var(--primary))" fill="url(#aprGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </div>

      {/* Pool Info */}
      <div className="glass-card animate-slide-up" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5 text-primary" />
            Pool Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-muted-foreground">LP Token Address</span>
            <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{pool.lpToken.slice(0,10)}...{pool.lpToken.slice(-8)}</code>
          </div>
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-muted-foreground">Reward Token</span>
            <span className="font-medium">{stats?.rewardTokenSymbol || 'FRDX'}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-muted-foreground">Reward Per Block</span>
            <span className="font-medium">{stats?.rewardPerBlock || '0'}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-muted-foreground">Allocation Points</span>
            <Badge variant="secondary">{Number(pool.allocPoint)}</Badge>
          </div>
        </CardContent>
      </div>
    </main>
  );
}

export default memo(PoolDetailPage);
