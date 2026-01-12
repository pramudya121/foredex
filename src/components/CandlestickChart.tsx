import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  height?: number;
  showVolume?: boolean;
  className?: string;
}

// Generate mock candlestick data from price history
export function generateCandlestickData(
  priceHistory: { time: number; price: number }[],
  interval: 'hourly' | 'daily' = 'hourly'
): CandlestickData[] {
  if (!priceHistory || priceHistory.length < 2) return [];
  
  const intervalMs = interval === 'hourly' ? 3600000 : 86400000;
  const candles: CandlestickData[] = [];
  
  // Group prices by interval
  const groups = new Map<number, number[]>();
  
  for (const point of priceHistory) {
    const bucket = Math.floor(point.time / intervalMs) * intervalMs;
    if (!groups.has(bucket)) {
      groups.set(bucket, []);
    }
    groups.get(bucket)!.push(point.price);
  }
  
  // Create candles from groups
  const sortedBuckets = Array.from(groups.keys()).sort((a, b) => a - b);
  
  for (const bucket of sortedBuckets) {
    const prices = groups.get(bucket)!;
    if (prices.length === 0) continue;
    
    candles.push({
      time: bucket,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume: Math.random() * 10000 + 1000, // Mock volume
    });
  }
  
  return candles;
}

// Custom Candlestick shape
const Candlestick = (props: any) => {
  const { x, y, width, height, payload, yAxisScale } = props;
  
  if (!payload || !yAxisScale) return null;
  
  const { open, high, low, close } = payload;
  const isGreen = close >= open;
  const color = isGreen ? '#22c55e' : '#ef4444';
  
  const candleWidth = Math.max(width * 0.7, 4);
  const wickWidth = 1;
  
  // Calculate y positions
  const yHigh = yAxisScale(high);
  const yLow = yAxisScale(low);
  const yOpen = yAxisScale(open);
  const yClose = yAxisScale(close);
  
  const candleY = Math.min(yOpen, yClose);
  const candleHeight = Math.abs(yOpen - yClose) || 1;
  
  return (
    <g>
      {/* Wick */}
      <line
        x1={x + width / 2}
        y1={yHigh}
        x2={x + width / 2}
        y2={yLow}
        stroke={color}
        strokeWidth={wickWidth}
      />
      {/* Body */}
      <rect
        x={x + (width - candleWidth) / 2}
        y={candleY}
        width={candleWidth}
        height={candleHeight}
        fill={isGreen ? color : color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload[0]) return null;
  
  const data = payload[0].payload as CandlestickData;
  const isGreen = data.close >= data.open;
  const changePercent = ((data.close - data.open) / data.open) * 100;
  
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-xl">
      <p className="text-xs text-muted-foreground mb-2">
        {new Date(data.time).toLocaleString()}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">Open:</span>
        <span className="font-mono">${data.open.toFixed(4)}</span>
        <span className="text-muted-foreground">High:</span>
        <span className="font-mono text-green-500">${data.high.toFixed(4)}</span>
        <span className="text-muted-foreground">Low:</span>
        <span className="font-mono text-red-500">${data.low.toFixed(4)}</span>
        <span className="text-muted-foreground">Close:</span>
        <span className={cn('font-mono', isGreen ? 'text-green-500' : 'text-red-500')}>
          ${data.close.toFixed(4)}
        </span>
      </div>
      <div className={cn(
        'mt-2 pt-2 border-t border-border text-sm font-medium',
        isGreen ? 'text-green-500' : 'text-red-500'
      )}>
        {isGreen ? '+' : ''}{changePercent.toFixed(2)}%
      </div>
    </div>
  );
};

function CandlestickChart({ 
  data, 
  height = 300, 
  showVolume = false,
  className 
}: CandlestickChartProps) {
  const chartData = useMemo((): { candles: CandlestickData[]; domain: [number, number] } | null => {
    if (!data || data.length === 0) return null;
    
    // Calculate range for y-axis
    const allPrices = data.flatMap(d => [d.open, d.high, d.low, d.close]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const padding = (maxPrice - minPrice) * 0.1;
    
    return {
      candles: data,
      domain: [minPrice - padding, maxPrice + padding],
    };
  }, [data]);

  if (!chartData) {
    return (
      <div className={cn('flex items-center justify-center bg-muted/20 rounded-lg', className)} style={{ height }}>
        <p className="text-muted-foreground text-sm">No chart data available</p>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData.candles}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <XAxis
            dataKey="time"
            tickFormatter={(time) => new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis
            domain={chartData.domain}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
            orientation="right"
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Candlesticks using Bar with custom shape */}
          <Bar
            dataKey="high"
            shape={(props: any) => (
              <Candlestick 
                {...props} 
                yAxisScale={(val: number) => {
                  const [min, max] = chartData.domain;
                  const chartHeight = height - 40; // Account for margins
                  return 10 + ((max - val) / (max - min)) * chartHeight;
                }}
              />
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(CandlestickChart);
