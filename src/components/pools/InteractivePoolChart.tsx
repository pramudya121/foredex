import { useState, useMemo, useCallback } from 'react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Maximize2,
  Calendar,
  BarChart3,
  LineChartIcon,
  AreaChartIcon
} from 'lucide-react';

type ChartType = 'tvl' | 'apr' | 'volume' | 'fees';
type TimeRange = '7d' | '30d' | '90d' | 'all';
type ChartStyle = 'area' | 'line' | 'bar';

interface DataPoint {
  date: string;
  timestamp: number;
  tvl: number;
  apr: number;
  volume: number;
  fees: number;
}

interface InteractivePoolChartProps {
  data: DataPoint[];
  className?: string;
}

const CustomTooltip = ({ active, payload, label, dataType }: any) => {
  if (!active || !payload?.length) return null;

  const value = payload[0]?.value;
  const formatValue = () => {
    switch (dataType) {
      case 'apr':
        return `${value?.toFixed(2)}%`;
      default:
        return value >= 1000000 
          ? `$${(value / 1000000).toFixed(2)}M` 
          : value >= 1000 
            ? `$${(value / 1000).toFixed(2)}K` 
            : `$${value?.toFixed(2)}`;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl backdrop-blur-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold">{formatValue()}</p>
      <div className="flex items-center gap-1 mt-1">
        {payload[0]?.payload?.change > 0 ? (
          <TrendingUp className="w-3 h-3 text-green-500" />
        ) : (
          <TrendingDown className="w-3 h-3 text-red-500" />
        )}
        <span className={cn(
          "text-xs",
          payload[0]?.payload?.change > 0 ? 'text-green-500' : 'text-red-500'
        )}>
          {Math.abs(payload[0]?.payload?.change || 0).toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

export function InteractivePoolChart({ data, className }: InteractivePoolChartProps) {
  const [activeChart, setActiveChart] = useState<ChartType>('tvl');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('area');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const filteredData = useMemo(() => {
    const now = Date.now();
    const ranges: Record<TimeRange, number> = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity,
    };

    const filtered = data.filter(d => now - d.timestamp < ranges[timeRange]);
    
    // Add change percentage for each point
    return filtered.map((point, index) => {
      const prevPoint = filtered[index - 1];
      const currentValue = point[activeChart];
      const prevValue = prevPoint?.[activeChart] || currentValue;
      const change = prevValue ? ((currentValue - prevValue) / prevValue) * 100 : 0;
      return { ...point, change };
    });
  }, [data, timeRange, activeChart]);

  const stats = useMemo(() => {
    if (!filteredData.length) return { current: 0, high: 0, low: 0, avg: 0, change: 0 };
    
    const values = filteredData.map(d => d[activeChart]);
    const current = values[values.length - 1] || 0;
    const first = values[0] || 0;
    const high = Math.max(...values);
    const low = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const change = first ? ((current - first) / first) * 100 : 0;

    return { current, high, low, avg, change };
  }, [filteredData, activeChart]);

  const formatValue = useCallback((value: number) => {
    if (activeChart === 'apr') return `${value.toFixed(2)}%`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  }, [activeChart]);

  const chartConfigs: Record<ChartType, { label: string; color: string; gradient: string }> = {
    tvl: { label: 'TVL', color: 'hsl(var(--primary))', gradient: 'tvlGradient' },
    apr: { label: 'APR', color: '#22c55e', gradient: 'aprGradient' },
    volume: { label: 'Volume', color: '#8b5cf6', gradient: 'volumeGradient' },
    fees: { label: 'Fees', color: '#f59e0b', gradient: 'feesGradient' },
  };

  const renderChart = () => {
    const config = chartConfigs[activeChart];
    const commonProps = {
      data: filteredData,
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
    };

    const axisProps = {
      tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
      stroke: 'hsl(var(--border))',
      tickLine: false,
      axisLine: false,
    };

    const tooltipProps = {
      content: <CustomTooltip dataType={activeChart} />,
    };

    if (chartStyle === 'area') {
      return (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id={config.gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.4}/>
              <stop offset="50%" stopColor={config.color} stopOpacity={0.1}/>
              <stop offset="95%" stopColor={config.color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
          <XAxis dataKey="date" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => formatValue(v)} width={70} />
          <Tooltip {...tooltipProps} />
          <ReferenceLine y={stats.avg} stroke={config.color} strokeDasharray="5 5" strokeOpacity={0.5} />
          <Area 
            type="monotone" 
            dataKey={activeChart} 
            stroke={config.color} 
            fill={`url(#${config.gradient})`} 
            strokeWidth={2.5}
            animationDuration={500}
          />
          {filteredData.length > 15 && (
            <Brush 
              dataKey="date" 
              height={30} 
              stroke="hsl(var(--border))" 
              fill="hsl(var(--card))"
              travellerWidth={8}
            />
          )}
        </AreaChart>
      );
    }

    if (chartStyle === 'line') {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
          <XAxis dataKey="date" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => formatValue(v)} width={70} />
          <Tooltip {...tooltipProps} />
          <ReferenceLine y={stats.avg} stroke={config.color} strokeDasharray="5 5" strokeOpacity={0.5} />
          <Line 
            type="monotone" 
            dataKey={activeChart} 
            stroke={config.color} 
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, fill: config.color, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
            animationDuration={500}
          />
          {filteredData.length > 15 && (
            <Brush 
              dataKey="date" 
              height={30} 
              stroke="hsl(var(--border))" 
              fill="hsl(var(--card))"
            />
          )}
        </LineChart>
      );
    }

    return (
      <BarChart {...commonProps}>
        <defs>
          <linearGradient id={`${config.gradient}Bar`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.color} stopOpacity={0.9}/>
            <stop offset="100%" stopColor={config.color} stopOpacity={0.4}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => formatValue(v)} width={70} />
        <Tooltip {...tooltipProps} />
        <ReferenceLine y={stats.avg} stroke={config.color} strokeDasharray="5 5" strokeOpacity={0.5} />
        <Bar 
          dataKey={activeChart} 
          fill={`url(#${config.gradient}Bar)`}
          radius={[4, 4, 0, 0]}
          animationDuration={500}
        />
        {filteredData.length > 15 && (
          <Brush 
            dataKey="date" 
            height={30} 
            stroke="hsl(var(--border))" 
            fill="hsl(var(--card))"
          />
        )}
      </BarChart>
    );
  };

  return (
    <Card className={cn('overflow-hidden', className, isFullscreen && 'fixed inset-4 z-50')}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4">
          {/* Title and Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Historical Analytics</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Current:</span>
                <span className="font-bold">{formatValue(stats.current)}</span>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'text-xs',
                    stats.change > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  )}
                >
                  {stats.change > 0 ? '+' : ''}{stats.change.toFixed(2)}%
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Chart Type Selector */}
            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
              {(Object.keys(chartConfigs) as ChartType[]).map((type) => (
                <Button
                  key={type}
                  variant={activeChart === type ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveChart(type)}
                  className={cn(
                    'h-7 px-3 text-xs',
                    activeChart === type && 'bg-gradient-wolf shadow-lg'
                  )}
                >
                  {chartConfigs[type].label}
                </Button>
              ))}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Time Range */}
              <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
                {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className="h-7 px-2.5 text-xs"
                  >
                    {range === 'all' ? 'All' : range}
                  </Button>
                ))}
              </div>

              {/* Chart Style */}
              <div className="hidden sm:flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
                <Button
                  variant={chartStyle === 'area' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setChartStyle('area')}
                  className="h-7 w-7"
                >
                  <AreaChartIcon className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={chartStyle === 'line' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setChartStyle('line')}
                  className="h-7 w-7"
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={chartStyle === 'bar' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setChartStyle('bar')}
                  className="h-7 w-7"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Mini Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-muted/20 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">High</p>
            <p className="text-sm font-semibold text-green-500">{formatValue(stats.high)}</p>
          </div>
          <div className="text-center p-2 bg-muted/20 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Low</p>
            <p className="text-sm font-semibold text-red-500">{formatValue(stats.low)}</p>
          </div>
          <div className="text-center p-2 bg-muted/20 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Average</p>
            <p className="text-sm font-semibold">{formatValue(stats.avg)}</p>
          </div>
          <div className="text-center p-2 bg-muted/20 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Change</p>
            <p className={cn(
              'text-sm font-semibold',
              stats.change > 0 ? 'text-green-500' : 'text-red-500'
            )}>
              {stats.change > 0 ? '+' : ''}{stats.change.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className={cn('w-full', isFullscreen ? 'h-[calc(100vh-280px)]' : 'h-[320px]')}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
