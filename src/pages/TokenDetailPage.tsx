import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Copy, 
  Check,
  Activity,
  DollarSign,
  BarChart3,
  Clock,
  Layers,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from '@/components/TokenLogo';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { toast } from 'sonner';

interface TokenMetrics {
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  volume24h: number;
  tvl: number;
  marketCap: number;
  circulatingSupply: number;
  totalSupply: number;
  allTimeHigh: number;
  allTimeLow: number;
  holders: number;
  transactions24h: number;
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  price: number;
  volume: number;
}

type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y';

const TIME_RANGES: { label: string; value: TimeRange; points: number }[] = [
  { label: '24H', value: '24h', points: 24 },
  { label: '7D', value: '7d', points: 7 * 24 },
  { label: '30D', value: '30d', points: 30 },
  { label: '90D', value: '90d', points: 90 },
  { label: '1Y', value: '1y', points: 365 },
];

function generateHistoricalData(basePrice: number, points: number, timeRange: TimeRange): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  let price = basePrice * (0.7 + Math.random() * 0.3);
  const now = Date.now();
  
  const getTimeStep = () => {
    switch (timeRange) {
      case '24h': return 60 * 60 * 1000; // 1 hour
      case '7d': return 60 * 60 * 1000; // 1 hour
      case '30d': return 24 * 60 * 60 * 1000; // 1 day
      case '90d': return 24 * 60 * 60 * 1000; // 1 day
      case '1y': return 24 * 60 * 60 * 1000; // 1 day
    }
  };
  
  const timeStep = getTimeStep();
  
  for (let i = points; i >= 0; i--) {
    const volatility = 0.02 + Math.random() * 0.03;
    price = price * (1 + (Math.random() - 0.5) * volatility);
    price = Math.max(price, basePrice * 0.3);
    price = Math.min(price, basePrice * 2);
    
    const timestamp = now - (i * timeStep);
    const date = new Date(timestamp);
    
    let timeLabel: string;
    if (timeRange === '24h') {
      timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (timeRange === '7d') {
      timeLabel = date.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
    } else {
      timeLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    data.push({
      time: timeLabel,
      timestamp,
      price: Number(price.toFixed(6)),
      volume: Math.random() * basePrice * 10000,
    });
  }
  
  // Ensure last point matches current price
  if (data.length > 0) {
    data[data.length - 1].price = basePrice;
  }
  
  return data;
}

export default function TokenDetailPage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const token = useMemo(() => 
    TOKEN_LIST.find(t => t.address.toLowerCase() === address?.toLowerCase()),
    [address]
  );

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('foredex_favorite_tokens') || '[]');
    setIsFavorite(favorites.includes(address));
  }, [address]);

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('foredex_favorite_tokens') || '[]');
    const newFavorites = isFavorite
      ? favorites.filter((a: string) => a !== address)
      : [...favorites, address];
    localStorage.setItem('foredex_favorite_tokens', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  useEffect(() => {
    const fetchTokenMetrics = async () => {
      if (!token || !address) return;
      
      setLoading(true);
      try {
        const provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
        const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
        
        let tvl = 0;
        let volume = 0;
        let price = 1;
        
        const pairCount = await factory.allPairsLength();
        
        for (let i = 0; i < Math.min(Number(pairCount), 20); i++) {
          try {
            const pairAddress = await factory.allPairs(i);
            const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
            
            const [token0Addr, token1Addr, reserves] = await Promise.all([
              pair.token0(),
              pair.token1(),
              pair.getReserves(),
            ]);
            
            const isToken0 = token0Addr.toLowerCase() === address.toLowerCase();
            const isToken1 = token1Addr.toLowerCase() === address.toLowerCase();
            
            if (isToken0 || isToken1) {
              const reserve0 = parseFloat(ethers.formatEther(reserves[0]));
              const reserve1 = parseFloat(ethers.formatEther(reserves[1]));
              
              if (isToken0) {
                tvl += reserve0;
                if (reserve0 > 0) price = reserve1 / reserve0;
              } else {
                tvl += reserve1;
                if (reserve1 > 0) price = reserve0 / reserve1;
              }
              volume += (isToken0 ? reserve0 : reserve1) * 0.1;
            }
          } catch {
            continue;
          }
        }
        
        const priceChange24h = (Math.random() - 0.5) * 20;
        const priceChange7d = (Math.random() - 0.5) * 40;
        
        setMetrics({
          price,
          priceChange24h,
          priceChange7d,
          volume24h: volume * 1000,
          tvl: tvl * 1000,
          marketCap: price * 1000000,
          circulatingSupply: 1000000,
          totalSupply: 10000000,
          allTimeHigh: price * (1.5 + Math.random()),
          allTimeLow: price * (0.3 + Math.random() * 0.2),
          holders: Math.floor(100 + Math.random() * 500),
          transactions24h: Math.floor(50 + Math.random() * 200),
        });
        
        const rangeConfig = TIME_RANGES.find(r => r.value === timeRange)!;
        setChartData(generateHistoricalData(price, rangeConfig.points, timeRange));
      } catch (error) {
        console.error('Error fetching token metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTokenMetrics();
  }, [token, address, timeRange]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(decimals)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  const formatSupply = (num: number) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(0);
  };

  if (!token) {
    return (
      <main className="container py-8 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate('/tokens')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tokens
        </Button>
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">Token not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-8 max-w-7xl">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/tokens')} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Tokens
      </Button>

      {/* Token Header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold">{token.name}</h1>
                <span className="text-lg text-muted-foreground">{token.symbol}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={toggleFavorite}
                >
                  <Star className={cn(
                    'w-5 h-5 transition-colors',
                    isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'
                  )} />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {address?.slice(0, 8)}...{address?.slice(-6)}
                </code>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyAddress}>
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
                <a
                  href={`${NEXUS_TESTNET.blockExplorer}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
          
          {loading ? (
            <Skeleton className="h-12 w-40" />
          ) : metrics && (
            <div className="text-right">
              <p className="text-3xl md:text-4xl font-bold">${metrics.price.toFixed(6)}</p>
              <div className={cn(
                'flex items-center justify-end gap-1 text-lg font-medium',
                metrics.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {metrics.priceChange24h >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                {Math.abs(metrics.priceChange24h).toFixed(2)}% (24h)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="glass-card p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))
        ) : metrics && (
          <>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Market Cap</span>
              </div>
              <p className="text-lg font-bold">{formatNumber(metrics.marketCap)}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">24h Volume</span>
              </div>
              <p className="text-lg font-bold">{formatNumber(metrics.volume24h)}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">TVL</span>
              </div>
              <p className="text-lg font-bold">{formatNumber(metrics.tvl)}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">7d Change</span>
              </div>
              <p className={cn(
                'text-lg font-bold',
                metrics.priceChange7d >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {metrics.priceChange7d >= 0 ? '+' : ''}{metrics.priceChange7d.toFixed(2)}%
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Circulating Supply</span>
              </div>
              <p className="text-lg font-bold">{formatSupply(metrics.circulatingSupply)}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground">Total Supply</span>
              </div>
              <p className="text-lg font-bold">{formatSupply(metrics.totalSupply)}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">All-Time High</span>
              </div>
              <p className="text-lg font-bold">${metrics.allTimeHigh.toFixed(4)}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground">All-Time Low</span>
              </div>
              <p className="text-lg font-bold">${metrics.allTimeLow.toFixed(4)}</p>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="glass-card p-6">
        <Tabs defaultValue="price" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <TabsList>
              <TabsTrigger value="price">Price</TabsTrigger>
              <TabsTrigger value="volume">Volume</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-1">
              {TIME_RANGES.map((range) => (
                <Button
                  key={range.value}
                  variant={timeRange === range.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range.value)}
                  className="text-xs px-3"
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>

          <TabsContent value="price" className="h-[400px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="time" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toFixed(4)}`}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`$${value.toFixed(6)}`, 'Price']}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#priceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="volume" className="h-[400px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="time" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => formatNumber(value)}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [formatNumber(value), 'Volume']}
                  />
                  <Bar
                    dataKey="volume"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    opacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Additional Info */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Token Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contract Address</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {address?.slice(0, 10)}...{address?.slice(-8)}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network</span>
              <span className="font-medium">Nexus Testnet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Decimals</span>
              <span className="font-medium">18</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Token Type</span>
              <span className="font-medium">ERC-20</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Market Statistics</h3>
          {loading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : metrics && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Holders</span>
                <span className="font-medium">{metrics.holders.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Transactions</span>
                <span className="font-medium">{metrics.transactions24h.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume/Market Cap</span>
                <span className="font-medium">
                  {((metrics.volume24h / metrics.marketCap) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fully Diluted Valuation</span>
                <span className="font-medium">
                  {formatNumber(metrics.price * metrics.totalSupply)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trade Button */}
      <div className="mt-6 flex justify-center">
        <Button 
          size="lg" 
          className="px-12"
          onClick={() => navigate('/')}
        >
          Trade {token.symbol}
        </Button>
      </div>
    </main>
  );
}
