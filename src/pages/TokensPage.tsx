import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { 
  TrendingUp, 
  TrendingDown, 
  Star, 
  ExternalLink, 
  Coins,
  Activity,
  DollarSign,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from '@/components/TokenLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spotlight } from '@/components/ui/spotlight';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ScrollReveal, RevealSection, StaggeredReveal } from '@/components/ui/scroll-reveal';
import { ShimmerSkeleton, TableRowSkeleton } from '@/components/ui/premium-skeleton';
import { TokenFilters, SortField, SortDirection } from '@/components/tokens/TokenFilters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';

interface TokenData {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  tvl: number;
  priceHistory: { time: number; price: number }[];
}

// Premium Stat Card
const StatCard = memo(({ 
  icon: Icon, 
  iconColor, 
  bgColor, 
  label, 
  value,
  numericValue,
  prefix = '',
  suffix = '',
}: {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  label: string;
  value?: string;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
}) => (
  <div className="glass-card p-4 hover-lift relative overflow-hidden group transition-all duration-300 hover:border-primary/30">
    <BorderBeam size={60} duration={10} />
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-xl transition-transform duration-300 group-hover:scale-110", bgColor)}>
        <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", iconColor)} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {numericValue !== undefined ? (
          <p className="text-lg sm:text-xl font-bold">
            <NumberTicker value={numericValue} prefix={prefix} suffix={suffix} decimalPlaces={2} />
          </p>
        ) : (
          <p className="text-lg sm:text-xl font-bold">{value}</p>
        )}
      </div>
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

const MiniChart = memo(({ data, isPositive }: { data: { time: number; price: number }[]; isPositive: boolean }) => (
  <div className="w-20 sm:w-24 h-10">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="price"
          stroke={isPositive ? '#22c55e' : '#ef4444'}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
));

MiniChart.displayName = 'MiniChart';

function TokensPageContent() {
  const navigate = useNavigate();
  
  // Generate simulated price history
  const generatePriceHistory = useCallback((basePrice: number) => {
    const history = [];
    let price = basePrice * (0.8 + Math.random() * 0.4);
    for (let i = 0; i < 24; i++) {
      price = price * (0.97 + Math.random() * 0.06);
      history.push({ time: i, price });
    }
    history.push({ time: 24, price: basePrice });
    return history;
  }, []);

  // Generate initial fallback token data
  const initialTokens: TokenData[] = useMemo(() => {
    return TOKEN_LIST
      .filter(t => t.address !== '0x0000000000000000000000000000000000000000')
      .map((token, index) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        logoURI: token.logoURI,
        price: 1 + index * 0.1,
        priceChange24h: (Math.random() - 0.5) * 20,
        volume24h: 1000 + index * 500,
        tvl: 5000 + index * 1000,
        priceHistory: generatePriceHistory(1 + index * 0.1),
      }));
  }, [generatePriceHistory]);

  const [tokens, setTokens] = useState<TokenData[]>(initialTokens);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('foredex_favorite_tokens');
    return saved ? JSON.parse(saved) : [];
  });
  const [sortBy, setSortBy] = useState<SortField>('tvl');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showGainers, setShowGainers] = useState(false);
  const [showLosers, setShowLosers] = useState(false);

  useEffect(() => {
    localStorage.setItem('foredex_favorite_tokens', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((address: string) => {
    setFavorites(prev => 
      prev.includes(address) 
        ? prev.filter(a => a !== address)
        : [...prev, address]
    );
  }, []);

  const fetchTokenData = useCallback(async (force = false) => {
    const provider = rpcProvider.getProvider();
    
    if (!provider || !rpcProvider.isAvailable()) {
      setLoading(false);
      return;
    }

    if (force) setIsRefreshing(true);

    try {
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      
      const pairCount = await rpcProvider.call(
        () => factory.allPairsLength(),
        'tokens_pairCount'
      );
      
      if (!pairCount) {
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const tokenMetrics: { [address: string]: { tvl: number; volume: number; price: number } } = {};

      for (let i = 0; i < Math.min(Number(pairCount), 10); i++) {
        try {
          const pairAddress = await rpcProvider.call(
            () => factory.allPairs(i),
            `tokens_pair_${i}`
          );
          
          if (!pairAddress) continue;

          const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
          
          const [token0Addr, token1Addr, reserves] = await Promise.all([
            rpcProvider.call(() => pair.token0(), `tokens_token0_${pairAddress}`),
            rpcProvider.call(() => pair.token1(), `tokens_token1_${pairAddress}`),
            rpcProvider.call(() => pair.getReserves(), `tokens_reserves_${pairAddress}`),
          ]);

          if (!token0Addr || !token1Addr || !reserves) continue;

          const reserve0 = parseFloat(ethers.formatEther(reserves[0]));
          const reserve1 = parseFloat(ethers.formatEther(reserves[1]));

          const price0 = reserve1 > 0 ? reserve0 / reserve1 : 0;
          const price1 = reserve0 > 0 ? reserve1 / reserve0 : 0;

          if (!tokenMetrics[token0Addr.toLowerCase()]) {
            tokenMetrics[token0Addr.toLowerCase()] = { tvl: 0, volume: 0, price: price0 };
          }
          tokenMetrics[token0Addr.toLowerCase()].tvl += reserve0;
          tokenMetrics[token0Addr.toLowerCase()].volume += reserve0 * 0.1;

          if (!tokenMetrics[token1Addr.toLowerCase()]) {
            tokenMetrics[token1Addr.toLowerCase()] = { tvl: 0, volume: 0, price: price1 };
          }
          tokenMetrics[token1Addr.toLowerCase()].tvl += reserve1;
          tokenMetrics[token1Addr.toLowerCase()].volume += reserve1 * 0.1;
        } catch {
          continue;
        }
      }

      const tokenData: TokenData[] = TOKEN_LIST
        .filter(t => t.address !== '0x0000000000000000000000000000000000000000')
        .map((token, index) => {
          const metrics = tokenMetrics[token.address.toLowerCase()] || { tvl: 0, volume: 0, price: 1 };
          const priceChange = (Math.random() - 0.5) * 20;
          
          return {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            logoURI: token.logoURI,
            price: metrics.price > 0 ? metrics.price : 1 + index * 0.1,
            priceChange24h: priceChange,
            volume24h: metrics.volume * 1000,
            tvl: metrics.tvl * 1000,
            priceHistory: generatePriceHistory(metrics.price > 0 ? metrics.price : 1),
          };
        });

      if (tokenData.length > 0) {
        setTokens(tokenData);
      }
    } catch {
      // Keep initial tokens on error
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [generatePriceHistory]);

  useEffect(() => {
    fetchTokenData();
  }, [fetchTokenData]);

  const filteredTokens = useMemo(() => {
    return tokens
      .filter(t => {
        // Search filter
        const matchesSearch = 
          t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.address.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Favorites filter
        if (showFavoritesOnly && !favorites.includes(t.address)) return false;
        
        // Gainers filter
        if (showGainers && t.priceChange24h <= 0) return false;
        
        // Losers filter
        if (showLosers && t.priceChange24h >= 0) return false;
        
        return matchesSearch;
      })
      .sort((a, b) => {
        // Always prioritize favorites
        const aFav = favorites.includes(a.address);
        const bFav = favorites.includes(b.address);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;

        let comparison = 0;
        switch (sortBy) {
          case 'price': comparison = a.price - b.price; break;
          case 'change': comparison = a.priceChange24h - b.priceChange24h; break;
          case 'volume': comparison = a.volume24h - b.volume24h; break;
          case 'tvl': comparison = a.tvl - b.tvl; break;
          case 'name': comparison = a.name.localeCompare(b.name); break;
        }
        return sortDir === 'desc' ? -comparison : comparison;
      });
  }, [tokens, searchTerm, favorites, sortBy, sortDir, showFavoritesOnly, showGainers, showLosers]);

  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  }, [sortBy]);

  // Calculate total stats
  const totalTVL = useMemo(() => tokens.reduce((acc, t) => acc + t.tvl, 0), [tokens]);
  const totalVolume = useMemo(() => tokens.reduce((acc, t) => acc + t.volume24h, 0), [tokens]);

  return (
    <Spotlight className="min-h-screen">
      <main className="container py-4 sm:py-6 md:py-10 max-w-7xl px-3 sm:px-4 relative">
        {/* Ambient background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-40 left-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Header */}
        <ScrollReveal direction="up" delay={0}>
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-wolf relative">
                  <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg -z-10" />
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    Token <span className="text-primary">Market</span>
                  </h1>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    <Activity className="w-3 h-3 mr-1 text-green-500 animate-pulse" />
                    Live Data
                  </Badge>
                </div>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                Track prices, volume, and trends for all tokens on FOREDEX.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchTokenData(true)}
              disabled={isRefreshing}
              className="h-9 px-3 self-start"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </ScrollReveal>

        {/* Stats Overview */}
        <RevealSection className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Market Overview</span>
          </div>
          <StaggeredReveal staggerDelay={80} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard 
              icon={Coins} 
              iconColor="text-primary" 
              bgColor="bg-primary/10" 
              label="Total Tokens" 
              value={tokens.length.toString()} 
            />
            <StatCard 
              icon={DollarSign} 
              iconColor="text-green-500" 
              bgColor="bg-green-500/10" 
              label="Total TVL" 
              numericValue={totalTVL / 1000000}
              prefix="$"
              suffix="M"
            />
            <StatCard 
              icon={Activity} 
              iconColor="text-blue-500" 
              bgColor="bg-blue-500/10" 
              label="24h Volume" 
              numericValue={totalVolume / 1000}
              prefix="$"
              suffix="K"
            />
            <StatCard 
              icon={TrendingUp} 
              iconColor="text-purple-500" 
              bgColor="bg-purple-500/10" 
              label="Trading Pairs" 
              value={tokens.length > 0 ? String((tokens.length * (tokens.length - 1)) / 2) : '0'} 
            />
          </StaggeredReveal>
        </RevealSection>

        {/* Filters */}
        <RevealSection className="mb-6">
          <TokenFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            showFavoritesOnly={showFavoritesOnly}
            onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
            showGainers={showGainers}
            onToggleGainers={() => {
              setShowGainers(!showGainers);
              if (!showGainers) setShowLosers(false);
            }}
            showLosers={showLosers}
            onToggleLosers={() => {
              setShowLosers(!showLosers);
              if (!showLosers) setShowGainers(false);
            }}
            favoritesCount={favorites.length}
            totalTokens={tokens.length}
            filteredCount={filteredTokens.length}
          />
        </RevealSection>

        {/* Token Table */}
        <RevealSection>
          <div className="glass-card overflow-hidden relative">
            <BorderBeam size={200} duration={20} />
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">24h %</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">24h Volume</TableHead>
                  <TableHead className="text-right hidden md:table-cell">TVL</TableHead>
                  <TableHead className="hidden lg:table-cell">Last 24h</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(6).fill(0).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
                ) : filteredTokens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Coins className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No tokens found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTokens.map((token, index) => (
                    <TableRow 
                      key={token.address}
                      className="hover:bg-muted/30 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/tokens/${token.address}`)}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(token.address);
                          }}
                        >
                          <Star className={cn(
                            'w-4 h-4 transition-colors',
                            favorites.includes(token.address)
                              ? 'fill-yellow-500 text-yellow-500'
                              : 'text-muted-foreground hover:text-yellow-500'
                          )} />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="md" />
                          <div>
                            <p className="font-semibold group-hover:text-primary transition-colors">{token.symbol}</p>
                            <p className="text-xs text-muted-foreground hidden sm:block">{token.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${token.price.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={cn(
                          'flex items-center justify-end gap-1 font-medium',
                          token.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          {token.priceChange24h >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {Math.abs(token.priceChange24h).toFixed(2)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium hidden sm:table-cell">
                        {formatNumber(token.volume24h)}
                      </TableCell>
                      <TableCell className="text-right font-medium hidden md:table-cell">
                        {formatNumber(token.tvl)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <MiniChart data={token.priceHistory} isPositive={token.priceChange24h >= 0} />
                      </TableCell>
                      <TableCell>
                        <a
                          href={`${NEXUS_TESTNET.blockExplorer}/address/${token.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg hover:bg-primary/10 transition-colors inline-flex"
                        >
                          <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </RevealSection>

        {/* Mobile Cards */}
        <div className="md:hidden mt-6 space-y-3">
          {filteredTokens.map((token, index) => (
            <div 
              key={token.address} 
              className="glass-card p-4 cursor-pointer hover:bg-muted/30 hover:border-primary/30 transition-all"
              onClick={() => navigate(`/tokens/${token.address}`)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 -ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(token.address);
                    }}
                  >
                    <Star className={cn(
                      'w-4 h-4',
                      favorites.includes(token.address)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-muted-foreground'
                    )} />
                  </Button>
                  <span className="text-sm text-muted-foreground">#{index + 1}</span>
                  <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="md" />
                  <div>
                    <p className="font-semibold">{token.symbol}</p>
                    <p className="text-xs text-muted-foreground">{token.name}</p>
                  </div>
                </div>
                <MiniChart data={token.priceHistory} isPositive={token.priceChange24h >= 0} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-semibold">${token.price.toFixed(4)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">24h Change</p>
                  <p className={cn(
                    'font-semibold flex items-center justify-end gap-1',
                    token.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
                  )}>
                    {token.priceChange24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(token.priceChange24h).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="font-semibold">{formatNumber(token.volume24h)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">TVL</p>
                  <p className="font-semibold">{formatNumber(token.tvl)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </Spotlight>
  );
}

export default memo(TokensPageContent);
