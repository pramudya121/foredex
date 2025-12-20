import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartDataPoint {
  timestamp: string;
  date: Date;
  price: number;
  volume: number;
}

type Timeframe = '1H' | '24H' | '7D' | '30D';

interface PriceChartProps {
  token0Symbol: string;
  token1Symbol: string;
  currentPrice: number;
  className?: string;
}

const TIMEFRAMES: { key: Timeframe; label: string; points: number; interval: number }[] = [
  { key: '1H', label: '1H', points: 60, interval: 60 * 1000 }, // 1 minute intervals
  { key: '24H', label: '24H', points: 48, interval: 30 * 60 * 1000 }, // 30 min intervals
  { key: '7D', label: '7D', points: 56, interval: 3 * 60 * 60 * 1000 }, // 3 hour intervals
  { key: '30D', label: '30D', points: 60, interval: 12 * 60 * 60 * 1000 }, // 12 hour intervals
];

// Generate realistic mock historical data
function generateHistoricalData(
  currentPrice: number, 
  points: number, 
  interval: number,
  timeframe: Timeframe
): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = Date.now();
  
  // Base volatility varies by timeframe
  const volatility = {
    '1H': 0.002,
    '24H': 0.01,
    '7D': 0.05,
    '30D': 0.15,
  }[timeframe];
  
  let price = currentPrice * (1 - volatility * (Math.random() - 0.3));
  
  for (let i = points - 1; i >= 0; i--) {
    const date = new Date(now - i * interval);
    
    // Random walk with trend toward current price
    const trend = (currentPrice - price) / (i + 1) * 0.3;
    const noise = (Math.random() - 0.5) * volatility * currentPrice;
    price = Math.max(0.0001, price + trend + noise);
    
    const volume = Math.random() * 1000 + 100;
    
    let timestamp: string;
    if (timeframe === '1H') {
      timestamp = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (timeframe === '24H') {
      timestamp = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (timeframe === '7D') {
      timestamp = date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' });
    } else {
      timestamp = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    data.push({
      timestamp,
      date,
      price,
      volume,
    });
  }
  
  // Ensure last point is current price
  if (data.length > 0) {
    data[data.length - 1].price = currentPrice;
  }
  
  return data;
}

export function PriceChart({ token0Symbol, token1Symbol, currentPrice, className }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('24H');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartDataPoint[]>([]);

  const config = useMemo(() => 
    TIMEFRAMES.find(t => t.key === timeframe)!,
    [timeframe]
  );

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setData(generateHistoricalData(currentPrice, config.points, config.interval, timeframe));
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentPrice, config, timeframe]);

  const stats = useMemo(() => {
    if (data.length < 2) return { change: 0, high: 0, low: 0, avgVolume: 0 };
    
    const firstPrice = data[0].price;
    const lastPrice = data[data.length - 1].price;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    const prices = data.map(d => d.price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    
    return { change, high, low, avgVolume };
  }, [data]);

  const isPositive = stats.change >= 0;

  return (
    <div className={cn('p-4 sm:p-5', className)}>
      {/* Header - More Compact */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">
              {token0Symbol}/{token1Symbol}
            </h3>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            )}>
              {isPositive ? '+' : ''}{stats.change.toFixed(2)}%
            </span>
          </div>
          <p className="text-xl font-bold mt-0.5">{currentPrice.toFixed(6)}</p>
        </div>
        
        {/* Timeframe Selector - Compact */}
        <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
          {TIMEFRAMES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeframe(key)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                timeframe === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row - Compact */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 rounded-lg bg-muted/20 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">High</p>
          <p className="text-sm font-medium text-green-400">{stats.high.toFixed(4)}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/20 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Low</p>
          <p className="text-sm font-medium text-red-400">{stats.low.toFixed(4)}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/20 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Vol</p>
          <p className="text-sm font-medium">${stats.avgVolume.toFixed(0)}</p>
        </div>
      </div>

      {/* Chart - Reduced Height */}
      {loading ? (
        <Skeleton className="h-[160px] w-full rounded-lg" />
      ) : (
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="priceGradientUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="priceGradientDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84%, 50%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(0, 84%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.2} 
                vertical={false}
              />
              <XAxis 
                dataKey="timestamp" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.toFixed(4)}
                domain={['auto', 'auto']}
                width={60}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                formatter={(value: number) => [value.toFixed(6), 'Price']}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={isPositive ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 50%)'} 
                fill={isPositive ? 'url(#priceGradientUp)' : 'url(#priceGradientDown)'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer - Minimal */}
      <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Updated now</span>
        <span className="flex items-center gap-1">
          <div className={cn(
            'w-1.5 h-1.5 rounded-full animate-pulse',
            isPositive ? 'bg-green-500' : 'bg-red-500'
          )} />
          Live
        </span>
      </div>
    </div>
  );
}
