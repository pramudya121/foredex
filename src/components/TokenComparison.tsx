import { memo, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TokenLogo } from '@/components/TokenLogo';
import { TOKEN_LIST } from '@/config/contracts';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { 
  GitCompare, Plus, X, TrendingUp, TrendingDown, 
  BarChart3, Activity, DollarSign
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))'
];

// Generate mock historical data for comparison
const generateHistoricalData = (basePrice: number, days: number = 30) => {
  const data = [];
  let price = basePrice * 0.8;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const volatility = (Math.random() - 0.5) * 0.1;
    price = price * (1 + volatility);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: price
    });
  }
  return data;
};

function TokenComparison() {
  const { getAllPrices } = useRealtimePrices();
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const prices = getAllPrices();
  
  const availableTokens = useMemo(() => 
    TOKEN_LIST.filter(t => !selectedTokens.includes(t.address)),
    [selectedTokens]
  );

  const selectedTokenData = useMemo(() => 
    selectedTokens.map(address => {
      const token = TOKEN_LIST.find(t => t.address === address);
      const priceData = prices.find(p => p.address.toLowerCase() === address.toLowerCase());
      return {
        ...token,
        priceData,
        historicalData: generateHistoricalData(priceData?.price || 1)
      };
    }).filter(Boolean),
    [selectedTokens, prices]
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

  // Radar chart data for token comparison
  const radarData = useMemo(() => {
    if (selectedTokenData.length === 0) return [];
    
    return [
      { metric: 'Price', ...Object.fromEntries(selectedTokenData.map(t => [t.symbol, (t.priceData?.price || 0) * 20])) },
      { metric: 'Volume', ...Object.fromEntries(selectedTokenData.map(t => [t.symbol, Math.random() * 100])) },
      { metric: 'Liquidity', ...Object.fromEntries(selectedTokenData.map(t => [t.symbol, Math.random() * 100])) },
      { metric: 'Volatility', ...Object.fromEntries(selectedTokenData.map(t => [t.symbol, 30 + Math.random() * 50])) },
      { metric: 'Growth', ...Object.fromEntries(selectedTokenData.map(t => [t.symbol, (t.priceData?.priceChangePercent || 0) + 50])) }
    ];
  }, [selectedTokenData]);

  const addToken = (address: string) => {
    if (selectedTokens.length < 4 && !selectedTokens.includes(address)) {
      setSelectedTokens([...selectedTokens, address]);
    }
    setIsDialogOpen(false);
  };

  const removeToken = (address: string) => {
    setSelectedTokens(selectedTokens.filter(a => a !== address));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-primary" />
          Token Comparison
        </h2>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={selectedTokens.length >= 4}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Token ({selectedTokens.length}/4)
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Token to Compare</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {availableTokens.map(token => (
                <button
                  key={token.address}
                  onClick={() => addToken(token.address)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="sm" />
                  <div className="text-left">
                    <p className="font-medium">{token.symbol}</p>
                    <p className="text-xs text-muted-foreground">{token.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
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
                      <span className="font-medium">${((token?.priceData?.price || 1) * 1000000).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Price Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Price History (30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
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
