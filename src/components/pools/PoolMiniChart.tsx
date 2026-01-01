import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PoolMiniChartProps {
  data: number[];
  className?: string;
  height?: number;
  showTrend?: boolean;
  color?: 'primary' | 'green' | 'red';
}

export function PoolMiniChart({ 
  data, 
  className, 
  height = 40,
  showTrend = false,
  color = 'primary'
}: PoolMiniChartProps) {
  const chartData = useMemo(() => {
    return data.map((value, index) => ({ value, index }));
  }, [data]);

  const trend = useMemo(() => {
    if (data.length < 2) return 0;
    const first = data[0];
    const last = data[data.length - 1];
    return first ? ((last - first) / first) * 100 : 0;
  }, [data]);

  const isPositive = trend >= 0;
  
  const colors = {
    primary: {
      stroke: 'hsl(var(--primary))',
      fill: 'hsl(var(--primary))',
    },
    green: {
      stroke: '#22c55e',
      fill: '#22c55e',
    },
    red: {
      stroke: '#ef4444',
      fill: '#ef4444',
    },
  };

  const activeColor = color === 'primary' 
    ? (isPositive ? colors.green : colors.red)
    : colors[color];

  const gradientId = `miniChartGradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activeColor.fill} stopOpacity={0.3} />
                <stop offset="100%" stopColor={activeColor.fill} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={activeColor.stroke}
              fill={`url(#${gradientId})`}
              strokeWidth={1.5}
              dot={false}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {showTrend && (
        <div className={cn(
          'flex items-center gap-0.5 text-xs font-medium',
          isPositive ? 'text-green-500' : 'text-red-500'
        )}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
