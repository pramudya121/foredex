import { useState, useEffect, useMemo, memo, useCallback } from 'react';
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
  Star,
  CandlestickChart as CandlestickIcon,
  Users,
  Zap,
  Sparkles,
  ArrowRightLeft,
  Shield,
  Globe,
  Hash,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from '@/components/TokenLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spotlight } from '@/components/ui/spotlight';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ScrollReveal, RevealSection, StaggeredReveal } from '@/components/ui/scroll-reveal';
import { ShimmerSkeleton, ChartSkeleton, StatsGridSkeleton } from '@/components/ui/premium-skeleton';
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
import CandlestickChart, { generateCandlestickData, CandlestickData } from '@/components/CandlestickChart';

interface TokenMetrics {
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  volume24h: number;
  tvl: number;
  marketCap: number;
  circulatingSupply: number;
  totalSupply: number;
  allTimeHigh: number;
  allTimeLow: number;
  holders: number;
  transactions24h: number;
  liquidityScore: number;
  volumeToMcap: number;
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  price: number;
  volume: number;
}

type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y';

const TIME_RANGES: { label: string; value: TimeRange; points: number }[] = [
  { label: '1H', value: '1h', points: 60 },
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
      case '1h': return 60 * 1000; // 1 minute
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
    if (timeRange === '1h') {
      timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (timeRange === '24h') {
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

// Premium Stat Card Component with BorderBeam
const PremiumStatCard = memo(({ 
  icon: Icon, 
  iconColor, 
  bgColor,
  label, 
  value,
  numericValue,
  prefix = '',
  suffix = '',
  valueColor,
  delay = 0,
  highlight = false,
}: {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  label: string;
  value?: string | React.ReactNode;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  valueColor?: string;
  delay?: number;
  highlight?: boolean;
}) => (
  <div className="relative group">
    {highlight && (
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 to-primary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    )}
    <div className={cn(
      "relative glass-card p-4 hover-lift overflow-hidden transition-all duration-300 group-hover:border-primary/30",
      highlight && "border-primary/30 bg-primary/5"
    )}>
      <BorderBeam size={60} duration={10} delay={delay / 1000} />
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-xl transition-transform duration-300 group-hover:scale-110", bgColor)}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          {numericValue !== undefined ? (
            <p className={cn("text-lg font-bold", valueColor || 'text-foreground')}>
              <NumberTicker value={numericValue} prefix={prefix} suffix={suffix} delay={delay} decimalPlaces={2} />
            </p>
          ) : (
            <p className={cn("text-lg font-bold truncate", valueColor || 'text-foreground')}>{value}</p>
          )}
        </div>
      </div>
    </div>
  </div>
));

PremiumStatCard.displayName = 'PremiumStatCard';

// Info Row Component
const InfoRow = memo(({ label, value, copyable, onCopy }: { 
  label: string; 
  value: string; 
  copyable?: boolean;
  onCopy?: () => void;
}) => (
  <div className="flex justify-between items-center py-3 border-b border-border/30 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-medium text-sm">{value}</span>
      {copyable && onCopy && (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onCopy}>
          <Copy className="w-3 h-3" />
        </Button>
      )}
    </div>
  </div>
));

InfoRow.displayName = 'InfoRow';

// Price Change Badge
const PriceChangeBadge = memo(({ value, label }: { value: number; label: string }) => (
  <div className="text-center px-3 py-2 rounded-lg bg-muted/30">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className={cn(
      "font-bold flex items-center justify-center gap-1",
      value >= 0 ? 'text-green-500' : 'text-red-500'
    )}>
      {value >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      {Math.abs(value).toFixed(2)}%
    </p>
  </div>
));

PriceChangeBadge.displayName = 'PriceChangeBadge';

export default function TokenDetailPage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([]);
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

  const toggleFavorite = useCallback(() => {
    const favorites = JSON.parse(localStorage.getItem('foredex_favorite_tokens') || '[]');
    const newFavorites = isFavorite
      ? favorites.filter((a: string) => a !== address)
      : [...favorites, address];
    localStorage.setItem('foredex_favorite_tokens', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  }, [address, isFavorite]);

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
        const priceChange30d = (Math.random() - 0.5) * 60;
        const marketCap = price * 1000000;
        const volume24h = volume * 1000;
        
        setMetrics({
          price,
          priceChange24h,
          priceChange7d,
          priceChange30d,
          volume24h,
          tvl: tvl * 1000,
          marketCap,
          circulatingSupply: 1000000,
          totalSupply: 10000000,
          allTimeHigh: price * (1.5 + Math.random()),
          allTimeLow: price * (0.3 + Math.random() * 0.2),
          holders: Math.floor(100 + Math.random() * 500),
          transactions24h: Math.floor(50 + Math.random() * 200),
          liquidityScore: Math.floor(60 + Math.random() * 40),
          volumeToMcap: (volume24h / marketCap) * 100,
        });
        
        const rangeConfig = TIME_RANGES.find(r => r.value === timeRange)!;
        const historicalData = generateHistoricalData(price, rangeConfig.points, timeRange);
        setChartData(historicalData);
        
        // Generate candlestick data from price history
        const priceHistory = historicalData.map(d => ({
          time: d.timestamp,
          price: d.price,
        }));
        const candleData = generateCandlestickData(priceHistory, timeRange === '24h' || timeRange === '1h' ? 'hourly' : 'daily');
        setCandlestickData(candleData);
      } catch (error) {
        console.error('Error fetching token metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTokenMetrics();
  }, [token, address, timeRange]);

  const copyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  const formatNumber = useCallback((num: number, decimals = 2) => {
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(decimals)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
  }, []);

  const formatSupply = useCallback((num: number) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(0);
  }, []);

  if (!token) {
    return (
      <Spotlight className="min-h-screen">
        <main className="container py-6 sm:py-8 max-w-7xl px-4 relative">
          <Button variant="ghost" onClick={() => navigate('/tokens')} className="mb-6 hover-lift">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tokens
          </Button>
          <div className="glass-card p-12 text-center">
            <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">Token Not Found</h2>
            <p className="text-muted-foreground mb-6">The token you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/tokens')} className="bg-gradient-wolf">
              View All Tokens
            </Button>
          </div>
        </main>
      </Spotlight>
    );
  }

  return (
    <Spotlight className="min-h-screen">
      <main className="container py-4 sm:py-6 md:py-8 max-w-7xl px-3 sm:px-4 relative">
        {/* Ambient background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Back Button */}
        <ScrollReveal direction="up" delay={0}>
          <Button variant="ghost" onClick={() => navigate('/tokens')} className="mb-4 hover-lift">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tokens
          </Button>
        </ScrollReveal>

        {/* Token Header - Premium Design */}
        <ScrollReveal direction="up" delay={100}>
          <div className="glass-card p-5 sm:p-6 mb-6 relative overflow-hidden">
            <BorderBeam size={150} duration={15} />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="lg" className="ring-2 ring-primary/20" />
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full -z-10 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-bold">{token.name}</h1>
                    <Badge variant="outline" className="text-sm">{token.symbol}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover-lift"
                      onClick={toggleFavorite}
                    >
                      <Star className={cn(
                        'w-5 h-5 transition-colors',
                        isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'
                      )} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
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
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="w-3 h-3 mr-1 text-green-500" />
                      Verified
                    </Badge>
                  </div>
                </div>
              </div>
              
              {loading ? (
                <ShimmerSkeleton className="h-16 w-48" />
              ) : metrics && (
                <div className="text-right">
                  <p className="text-3xl md:text-4xl font-bold mb-1">${metrics.price.toFixed(6)}</p>
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
            
            {/* Price Change Badges */}
            {!loading && metrics && (
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/30">
                <PriceChangeBadge value={metrics.priceChange24h} label="24h" />
                <PriceChangeBadge value={metrics.priceChange7d} label="7d" />
                <PriceChangeBadge value={metrics.priceChange30d} label="30d" />
                <div className="text-center px-3 py-2 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">ATH</p>
                  <p className="font-bold text-green-500">${metrics.allTimeHigh.toFixed(4)}</p>
                </div>
                <div className="text-center px-3 py-2 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">ATL</p>
                  <p className="font-bold text-red-500">${metrics.allTimeLow.toFixed(4)}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Stats Grid - Premium Design */}
        <RevealSection className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Key Metrics</span>
          </div>
          
          {loading ? (
            <StatsGridSkeleton count={8} className="grid-cols-2 md:grid-cols-4" />
          ) : metrics && (
            <StaggeredReveal staggerDelay={50} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <PremiumStatCard
                icon={DollarSign}
                iconColor="text-primary"
                bgColor="bg-primary/10"
                label="Market Cap"
                numericValue={metrics.marketCap / 1000000}
                prefix="$"
                suffix="M"
                delay={0}
                highlight
              />
              <PremiumStatCard
                icon={Activity}
                iconColor="text-blue-500"
                bgColor="bg-blue-500/10"
                label="24h Volume"
                numericValue={metrics.volume24h / 1000}
                prefix="$"
                suffix="K"
                delay={50}
              />
              <PremiumStatCard
                icon={Layers}
                iconColor="text-green-500"
                bgColor="bg-green-500/10"
                label="TVL"
                numericValue={metrics.tvl / 1000}
                prefix="$"
                suffix="K"
                delay={100}
              />
              <PremiumStatCard
                icon={Zap}
                iconColor="text-yellow-500"
                bgColor="bg-yellow-500/10"
                label="Liquidity Score"
                numericValue={metrics.liquidityScore}
                suffix="/100"
                delay={150}
              />
              <PremiumStatCard
                icon={BarChart3}
                iconColor="text-orange-500"
                bgColor="bg-orange-500/10"
                label="Circulating Supply"
                value={formatSupply(metrics.circulatingSupply)}
                delay={200}
              />
              <PremiumStatCard
                icon={Layers}
                iconColor="text-cyan-500"
                bgColor="bg-cyan-500/10"
                label="Total Supply"
                value={formatSupply(metrics.totalSupply)}
                delay={250}
              />
              <PremiumStatCard
                icon={Users}
                iconColor="text-purple-500"
                bgColor="bg-purple-500/10"
                label="Holders"
                numericValue={metrics.holders}
                delay={300}
              />
              <PremiumStatCard
                icon={Hash}
                iconColor="text-pink-500"
                bgColor="bg-pink-500/10"
                label="24h Transactions"
                numericValue={metrics.transactions24h}
                delay={350}
              />
            </StaggeredReveal>
          )}
        </RevealSection>

        {/* Charts Section */}
        <RevealSection className="mb-6">
          <div className="glass-card p-4 sm:p-6 relative overflow-hidden">
            <BorderBeam size={180} duration={20} />
            <Tabs defaultValue="price" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <TabsList>
                    <TabsTrigger value="price" className="gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Price
                    </TabsTrigger>
                    <TabsTrigger value="candlestick" className="gap-1">
                      <CandlestickIcon className="w-3.5 h-3.5" />
                      Candles
                    </TabsTrigger>
                    <TabsTrigger value="volume" className="gap-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Volume
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="flex gap-1 flex-wrap">
                  {TIME_RANGES.map((range) => (
                    <Button
                      key={range.value}
                      variant={timeRange === range.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange(range.value)}
                      className="text-xs px-2.5 h-8"
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>

              <TabsContent value="price" className="h-[350px] sm:h-[400px]">
                {loading ? (
                  <ChartSkeleton className="h-full" />
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
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickFormatter={(value) => `$${value.toFixed(4)}`}
                        width={70}
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

              <TabsContent value="candlestick" className="h-[350px] sm:h-[400px]">
                {loading ? (
                  <ChartSkeleton className="h-full" />
                ) : candlestickData.length > 0 ? (
                  <CandlestickChart data={candlestickData} height={350} />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <CandlestickIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Not enough data for candlestick chart</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="volume" className="h-[350px] sm:h-[400px]">
                {loading ? (
                  <ChartSkeleton className="h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="time" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickFormatter={(value) => formatNumber(value)}
                        width={70}
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
        </RevealSection>

        {/* Info Cards */}
        <RevealSection>
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {/* Token Information */}
            <div className="glass-card p-5 sm:p-6 relative overflow-hidden hover-lift">
              <BorderBeam size={100} duration={12} />
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Token Information</h3>
              </div>
              <div className="space-y-1">
                <InfoRow 
                  label="Contract Address" 
                  value={`${address?.slice(0, 10)}...${address?.slice(-8)}`} 
                  copyable 
                  onCopy={copyAddress} 
                />
                <InfoRow label="Network" value="Nexus Testnet" />
                <InfoRow label="Decimals" value="18" />
                <InfoRow label="Token Type" value="ERC-20" />
                <InfoRow label="Token Standard" value="Native" />
              </div>
            </div>

            {/* Market Statistics */}
            <div className="glass-card p-5 sm:p-6 relative overflow-hidden hover-lift">
              <BorderBeam size={100} duration={12} delay={0.5} />
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Market Statistics</h3>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <ShimmerSkeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : metrics && (
                <div className="space-y-1">
                  <InfoRow label="Holders" value={metrics.holders.toLocaleString()} />
                  <InfoRow label="24h Transactions" value={metrics.transactions24h.toLocaleString()} />
                  <InfoRow label="Volume/MCap Ratio" value={`${metrics.volumeToMcap.toFixed(2)}%`} />
                  <InfoRow label="Fully Diluted Valuation" value={formatNumber(metrics.price * metrics.totalSupply)} />
                  <InfoRow label="Liquidity Score" value={`${metrics.liquidityScore}/100`} />
                </div>
              )}
            </div>
          </div>
        </RevealSection>

        {/* Trade CTA */}
        <RevealSection className="mt-8">
          <div className="glass-card p-6 sm:p-8 text-center relative overflow-hidden">
            <BorderBeam size={150} duration={15} />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
            <div className="relative z-10">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">
                Ready to Trade <span className="text-primary">{token.symbol}</span>?
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base mb-6 max-w-md mx-auto">
                Swap tokens instantly with minimal slippage and low fees.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button 
                  size="lg" 
                  className="bg-gradient-wolf hover-lift group"
                  onClick={() => navigate('/swap')}
                >
                  <ArrowRightLeft className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  Trade {token.symbol}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/liquidity')}
                  className="hover-lift"
                >
                  <Layers className="w-5 h-5 mr-2" />
                  Add Liquidity
                </Button>
              </div>
            </div>
          </div>
        </RevealSection>
      </main>
    </Spotlight>
  );
}
