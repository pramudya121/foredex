import { memo, useState, useEffect, useMemo } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { getStoredTransactions, Transaction } from '@/components/TransactionHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Activity, DollarSign, 
  BarChart3, PieChart, Calendar, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface TradeStats {
  totalTrades: number;
  swaps: number;
  liquidityAdds: number;
  liquidityRemoves: number;
  totalVolume: number;
  estimatedPnL: number;
  winRate: number;
  avgTradeSize: number;
}

interface DailyStats {
  date: string;
  trades: number;
  volume: number;
  pnl: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

function TradingAnalytics() {
  const { address, isConnected } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (!address) return;

    const loadTransactions = () => {
      setTransactions(getStoredTransactions(address));
    };

    loadTransactions();
    window.addEventListener('foredex_tx_update', loadTransactions);
    return () => window.removeEventListener('foredex_tx_update', loadTransactions);
  }, [address]);

  const filteredTransactions = useMemo(() => {
    const now = Date.now();
    const ranges = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };
    return transactions.filter(tx => now - tx.timestamp < ranges[timeRange]);
  }, [transactions, timeRange]);

  const stats: TradeStats = useMemo(() => {
    const swaps = filteredTransactions.filter(tx => tx.type === 'swap').length;
    const liquidityAdds = filteredTransactions.filter(tx => tx.type === 'add_liquidity').length;
    const liquidityRemoves = filteredTransactions.filter(tx => tx.type === 'remove_liquidity').length;
    
    // Simulate volume and P&L based on transaction count (in real app, would track actual values)
    const baseVolume = swaps * 150 + liquidityAdds * 500 + liquidityRemoves * 400;
    const estimatedPnL = (swaps * 12) - (swaps * 0.3 * 5); // Simulated profit minus fees
    const confirmedSwaps = filteredTransactions.filter(tx => tx.type === 'swap' && tx.status === 'confirmed').length;
    
    return {
      totalTrades: filteredTransactions.length,
      swaps,
      liquidityAdds,
      liquidityRemoves,
      totalVolume: baseVolume,
      estimatedPnL,
      winRate: swaps > 0 ? Math.min(95, 50 + confirmedSwaps * 3) : 0,
      avgTradeSize: filteredTransactions.length > 0 ? baseVolume / filteredTransactions.length : 0
    };
  }, [filteredTransactions]);

  const dailyStats: DailyStats[] = useMemo(() => {
    const grouped = new Map<string, DailyStats>();
    
    filteredTransactions.forEach(tx => {
      const date = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = grouped.get(date) || { date, trades: 0, volume: 0, pnl: 0 };
      existing.trades += 1;
      existing.volume += tx.type === 'swap' ? 150 : tx.type === 'add_liquidity' ? 500 : 400;
      existing.pnl += tx.type === 'swap' ? 12 : tx.type === 'add_liquidity' ? 5 : -2;
      grouped.set(date, existing);
    });

    return Array.from(grouped.values()).slice(-14);
  }, [filteredTransactions]);

  const pieData = useMemo(() => [
    { name: 'Swaps', value: stats.swaps },
    { name: 'Add Liquidity', value: stats.liquidityAdds },
    { name: 'Remove Liquidity', value: stats.liquidityRemoves }
  ].filter(d => d.value > 0), [stats]);

  const cumulativePnL = useMemo(() => {
    let cumulative = 0;
    return dailyStats.map(d => {
      cumulative += d.pnl;
      return { ...d, cumulative };
    });
  }, [dailyStats]);

  if (!isConnected) {
    return (
      <div className="glass-card p-8 text-center">
        <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
        <p className="text-muted-foreground">Connect your wallet to view trading analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Trading Analytics
        </h2>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          {(['7d', '30d', '90d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-all',
                timeRange === range 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {range === 'all' ? 'All' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold">{stats.totalTrades}</p>
              </div>
              <Activity className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">${stats.totalVolume.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Est. P&L</p>
                <p className={cn(
                  'text-2xl font-bold flex items-center gap-1',
                  stats.estimatedPnL >= 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {stats.estimatedPnL >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  ${Math.abs(stats.estimatedPnL).toFixed(2)}
                </p>
              </div>
              {stats.estimatedPnL >= 0 
                ? <TrendingUp className="w-8 h-8 text-green-500/50" />
                : <TrendingDown className="w-8 h-8 text-red-500/50" />
              }
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="pnl" className="w-full">
        <TabsList className="glass-card p-1 mb-4">
          <TabsTrigger value="pnl">P&L Chart</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Cumulative P&L</CardTitle>
            </CardHeader>
            <CardContent>
              {cumulativePnL.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={cumulativePnL}>
                    <defs>
                      <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#pnlGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No trading data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Daily Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
                    />
                    <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No volume data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Trading Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="trades" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No activity data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Transaction Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No data to display
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[0] }} />
                      <span>Swaps</span>
                    </div>
                    <Badge variant="secondary">{stats.swaps}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[1] }} />
                      <span>Add Liquidity</span>
                    </div>
                    <Badge variant="secondary">{stats.liquidityAdds}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[2] }} />
                      <span>Remove Liquidity</span>
                    </div>
                    <Badge variant="secondary">{stats.liquidityRemoves}</Badge>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Avg. Trade Size: <span className="text-foreground font-medium">${stats.avgTradeSize.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(TradingAnalytics);
