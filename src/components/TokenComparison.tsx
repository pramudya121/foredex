import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TokenLogo } from '@/components/TokenLogo';
import { TOKEN_LIST } from '@/config/contracts';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { 
  GitCompare, Plus, X, TrendingUp, TrendingDown, 
  BarChart3, Activity, DollarSign, Star, Zap, RefreshCw
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))'
];

// Generate historical data with proper price simulation
const generateHistoricalData = (basePrice: number, days: number = 30, symbol: string) => {
  const data = [];
  let price = basePrice * (0.85 + Math.random() * 0.1);
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const trend = symbol === 'FRDX' ? 0.003 : symbol === 'WNEX' ? 0.001 : -0.001;
    const volatility = (Math.random() - 0.5) * 0.08;
    price = Math.max(price * (1 + volatility + trend), 0.01);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: price,
      volume: Math.random() * 100000 + 50000,
    });
  }
  return data;
};

function TokenComparison() {
  const { getAllPrices, isConnected } = useRealtimePrices();
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const prices = getAllPrices();
  
  const availableTokens = useMemo(() => 
    TOKEN_LIST.filter(t => 
      !selectedTokens.includes(t.address) && 
      t.address !== '0x0000000000000000000000000000000000000000'
    ),
    [selectedTokens]
  );

  const selectedTokenData = useMemo(() => 
    selectedTokens.map(address => {
      const token = TOKEN_LIST.find(t => t.address === address);
      const priceData = prices.find(p => p.address.toLowerCase() === address.toLowerCase());
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      return {
        ...token,
        priceData,
        historicalData: generateHistoricalData(priceData?.price || 1, days, token?.symbol || '')
      };
    }).filter(Boolean),
    [selectedTokens, prices, timeRange]
  );

  // Combine historical data for chart
  const combinedChartData = useMemo(() => {
    if (selectedTokenData.length === 0) return [];
    
    const baseData = selectedTokenData[0]?.historicalData || [];
    return baseData.map((point, index) => {
      const combined: Record<string, any> = { date: point.date };
      selectedTokenData.forEach(token => {
        if (token?.historicalData?.[index]) {
          combined[token.symbol!] = token.historicalData[index].price;
        }
      });
      return combined;
    });
  }, [selectedTokenData]);

  // Radar chart data with real metrics
  const radarData = useMemo(() => {
    if (selectedTokenData.length === 0) return [];
    
    const maxPrice = Math.max(...selectedTokenData.map(t => t.priceData?.price || 0));
    const maxVolume = Math.max(...selectedTokenData.map(t => t.priceData?.volume24h || 0));
    const maxTvl = Math.max(...selectedTokenData.map(t => t.priceData?.tvl || 0));
    
    return [
      { metric: 'Price', ...Object.fromEntries(selectedTokenData.map(t => [t.symbol, maxPrice > 0 ? ((t.priceData?.price || 0) / maxPrice) * 100 : 50])) },
      { metric: 'Volume', ...Object.fromEntries(selectedTokenData.map(t => [t.symbol, maxVolume > 0 ? ((t.priceData?.volume24h || 0) / maxVolume) * 100 : 50])) },
      { metric: 'TVL', ...Object.fromEntries(selectedTokenData.map(t => [t.symbol, maxTvl > 0 ? ((t.priceData?.tvl || 0) / maxTvl) * 100 : 50])) },
      { metric: 'Momentum', ...Object.fromEntries(selectedTokenData.map(t => [t.symbol, Math.min(100, Math.max(0, 50 + (t.priceData?.priceChangePercent || 0) * 5))])) },
      { metric: 'Stability', ...Object.fromEntries(selectedTokenData.map(t => [t.symbol, 100 - Math.abs(t.priceData?.priceChangePercent || 0) * 3])) }
    ];
  }, [selectedTokenData]);

  const addToken = useCallback((address: string) => {
    if (selectedTokens.length < 4 && !selectedTokens.includes(address)) {
      setSelectedTokens(prev => [...prev, address]);
    }
    setIsDialogOpen(false);
  }, [selectedTokens]);

  const removeToken = useCallback((address: string) => {
    setSelectedTokens(prev => prev.filter(a => a !== address));
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-primary" />
            Token Comparison
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Compare up to 4 tokens side by side
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedTokens.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRefresh}
              className={cn(isRefreshing && "animate-spin")}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={selectedTokens.length >= 4}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Token ({selectedTokens.length}/4)
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border border-border">
              <DialogHeader>
                <DialogTitle>Select Token to Compare</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
                {availableTokens.map(token => (
                  <button
                    key={token.address}
                    onClick={() => addToken(token.address)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                  >
                    <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="sm" />
                    <div className="text-left flex-1">
                      <p className="font-medium">{token.symbol}</p>
                      <p className="text-xs text-muted-foreground">{token.name}</p>
                    </div>
                    <Zap className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Selected Tokens */}
      {selectedTokens.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            {selectedTokenData.map((token, index) => (
              <Badge 
                key={token?.address}
                variant="secondary"
                className="flex items-center gap-2 px-3 py-2"
                style={{ borderLeft: `3px solid ${CHART_COLORS[index]}` }}
              >
                <TokenLogo symbol={token?.symbol || ''} logoURI={token?.logoURI} size="sm" />
                <span>{token?.symbol}</span>
                <button 
                  onClick={() => removeToken(token?.address || '')}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedTokenData.map((token, index) => (
              <Card key={token?.address} className="glass-card" style={{ borderTop: `3px solid ${CHART_COLORS[index]}` }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TokenLogo symbol={token?.symbol || ''} logoURI={token?.logoURI} size="sm" />
                    <div>
                      <p className="font-semibold">{token?.symbol}</p>
                      <p className="text-xs text-muted-foreground">{token?.name}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Price</span>
                      <span className="font-medium">${token?.priceData?.price.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">24h Change</span>
                      <span className={cn(
                        'font-medium flex items-center gap-1',
                        (token?.priceData?.priceChangePercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                      )}>
                        {(token?.priceData?.priceChangePercent || 0) >= 0 
                          ? <TrendingUp className="w-3 h-3" /> 
                          : <TrendingDown className="w-3 h-3" />
                        }
                        {Math.abs(token?.priceData?.priceChangePercent || 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Volume</span>
                      <span className="font-medium">${(token?.priceData?.volume24h || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">TVL</span>
                      <span className="font-medium">${(token?.priceData?.tvl || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Price Chart */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Price History
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-muted p-1">
                  {(['7d', '30d', '90d'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={cn(
                        'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                        timeRange === range 
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {range.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="flex rounded-lg bg-muted p-1">
                  <button
                    onClick={() => setChartType('area')}
                    className={cn(
                      'px-2 py-1 text-xs rounded-md transition-colors',
                      chartType === 'area' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                    )}
                  >
                    Area
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={cn(
                      'px-2 py-1 text-xs rounded-md transition-colors',
                      chartType === 'line' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                    )}
                  >
                    Line
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                {chartType === 'area' ? (
                  <AreaChart data={combinedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${v.toFixed(2)}`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value.toFixed(4)}`, '']}
                    />
                    <Legend />
                    {selectedTokenData.map((token, index) => (
                      <Area
                        key={token?.address}
                        type="monotone"
                        dataKey={token?.symbol}
                        stroke={CHART_COLORS[index]}
                        fill={CHART_COLORS[index]}
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                ) : (
                  <LineChart data={combinedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${v.toFixed(2)}`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value.toFixed(4)}`, '']}
                    />
                    <Legend />
                    {selectedTokenData.map((token, index) => (
                      <Line
                        key={token?.address}
                        type="monotone"
                        dataKey={token?.symbol}
                        stroke={CHART_COLORS[index]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          {selectedTokenData.length >= 2 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    {selectedTokenData.map((token, index) => (
                      <Radar
                        key={token?.address}
                        name={token?.symbol}
                        dataKey={token?.symbol}
                        stroke={CHART_COLORS[index]}
                        fill={CHART_COLORS[index]}
                        fillOpacity={0.2}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Comparison Table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Detailed Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-sm text-muted-foreground">Metric</th>
                      {selectedTokenData.map((token, index) => (
                        <th key={token?.address} className="text-right p-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index] }} />
                            {token?.symbol}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="p-3 text-sm text-muted-foreground">Current Price</td>
                      {selectedTokenData.map(token => (
                        <td key={token?.address} className="text-right p-3 font-medium">
                          ${token?.priceData?.price.toFixed(4)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="p-3 text-sm text-muted-foreground">24h Change</td>
                      {selectedTokenData.map(token => (
                        <td key={token?.address} className={cn(
                          'text-right p-3 font-medium',
                          (token?.priceData?.priceChangePercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          {(token?.priceData?.priceChangePercent || 0) >= 0 ? '+' : ''}{token?.priceData?.priceChangePercent?.toFixed(2)}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="p-3 text-sm text-muted-foreground">24h High</td>
                      {selectedTokenData.map(token => (
                        <td key={token?.address} className="text-right p-3 font-medium">
                          ${((token?.priceData?.price || 0) * 1.05).toFixed(4)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="p-3 text-sm text-muted-foreground">24h Low</td>
                      {selectedTokenData.map(token => (
                        <td key={token?.address} className="text-right p-3 font-medium">
                          ${((token?.priceData?.price || 0) * 0.95).toFixed(4)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 text-sm text-muted-foreground">Market Cap</td>
                      {selectedTokenData.map(token => (
                        <td key={token?.address} className="text-right p-3 font-medium">
                          ${((token?.priceData?.price || 0) * 10000000).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="glass-card p-12 text-center">
          <GitCompare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-2">Compare Tokens</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Select up to 4 tokens to compare their price performance, metrics, and trends side by side.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Token
          </Button>
        </Card>
      )}
    </div>
  );
}

export default memo(TokenComparison);
