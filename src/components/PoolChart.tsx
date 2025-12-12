import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';

interface ChartDataPoint {
  timestamp: string;
  price: number;
  tvl: number;
  volume: number;
}

interface PoolChartProps {
  poolAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  reserve0: string;
  reserve1: string;
}

// Generate mock historical data based on current reserves
function generateHistoricalData(reserve0: number, reserve1: number): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = Date.now();
  const currentPrice = reserve0 > 0 ? reserve1 / reserve0 : 1;
  const currentTvl = reserve0 + reserve1;
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now - i * 3600000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const variance = (Math.random() - 0.5) * 0.2;
    const volumeVariance = Math.random() * 100;
    
    data.push({
      timestamp,
      price: currentPrice * (1 + variance * (i / 24)),
      tvl: currentTvl * (1 - variance * 0.3 * (i / 24)),
      volume: volumeVariance + (Math.random() * 50),
    });
  }
  
  return data;
}

export function PoolChart({ poolAddress, token0Symbol, token1Symbol, reserve0, reserve1 }: PoolChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('price');

  useEffect(() => {
    setLoading(true);
    // Simulate loading historical data
    const timer = setTimeout(() => {
      const r0 = parseFloat(reserve0) || 1;
      const r1 = parseFloat(reserve1) || 1;
      setData(generateHistoricalData(r0, r1));
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [poolAddress, reserve0, reserve1]);

  const currentPrice = data.length > 0 ? data[data.length - 1].price : 0;
  const previousPrice = data.length > 1 ? data[0].price : currentPrice;
  const priceChange = previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  const currentTvl = data.length > 0 ? data[data.length - 1].tvl : 0;
  const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);

  if (loading) {
    return (
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">
            {token0Symbol}/{token1Symbol} Pool Analytics
          </h3>
          <p className="text-sm text-muted-foreground">Last 24 hours performance</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current Price</p>
            <p className="text-xl font-bold">{currentPrice.toFixed(6)}</p>
            <p className={`text-sm flex items-center justify-end gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(priceChange).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <DollarSign className="w-3 h-3" />
            TVL
          </div>
          <p className="font-semibold">${currentTvl.toFixed(2)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Activity className="w-3 h-3" />
            24h Volume
          </div>
          <p className="font-semibold">${totalVolume.toFixed(2)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            24h Change
          </div>
          <p className={`font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 bg-muted/30">
          <TabsTrigger value="price" className="text-xs">Price</TabsTrigger>
          <TabsTrigger value="tvl" className="text-xs">TVL</TabsTrigger>
          <TabsTrigger value="volume" className="text-xs">Volume</TabsTrigger>
        </TabsList>

        <TabsContent value="price" className="mt-0">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => v.toFixed(4)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#priceGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="tvl" className="mt-0">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'TVL']}
                />
                <Area 
                  type="monotone" 
                  dataKey="tvl" 
                  stroke="hsl(142, 76%, 36%)" 
                  fill="url(#tvlGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="volume" className="mt-0">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Volume']}
                />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="hsl(217, 91%, 60%)" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
