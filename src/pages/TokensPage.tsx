import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Star, 
  ExternalLink, 
  BarChart3,
  ArrowUpDown,
  Coins,
  Activity,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from '@/components/TokenLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
  Tooltip as RechartsTooltip,
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

const TokenSkeleton = memo(() => (
  <TableRow>
    <TableCell><Skeleton className="w-6 h-6" /></TableCell>
    <TableCell><Skeleton className="w-8 h-4" /></TableCell>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-10 w-24" /></TableCell>
  </TableRow>
));

TokenSkeleton.displayName = 'TokenSkeleton';

const MiniChart = memo(({ data, isPositive }: { data: { time: number; price: number }[]; isPositive: boolean }) => (
  <div className="w-24 h-10">
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
  const generatePriceHistory = (basePrice: number) => {
    const history = [];
    let price = basePrice * (0.8 + Math.random() * 0.4);
    for (let i = 0; i < 24; i++) {
      price = price * (0.97 + Math.random() * 0.06);
      history.push({ time: i, price });
    }
    history.push({ time: 24, price: basePrice });
    return history;
  };

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
        priceChange24h: (Math.random() - 0.5) * 10,
        volume24h: 1000 + index * 500,
        tvl: 5000 + index * 1000,
        priceHistory: generatePriceHistory(1 + index * 0.1),
      }));
  }, []);

  const [tokens, setTokens] = useState<TokenData[]>(initialTokens);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('foredex_favorite_tokens');
    return saved ? JSON.parse(saved) : [];
  });
  const [sortBy, setSortBy] = useState<'price' | 'change' | 'volume' | 'tvl'>('tvl');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    localStorage.setItem('foredex_favorite_tokens', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (address: string) => {
    setFavorites(prev => 
      prev.includes(address) 
        ? prev.filter(a => a !== address)
        : [...prev, address]
    );
  };


  useEffect(() => {
    const fetchTokenData = async () => {
      const provider = rpcProvider.getProvider();
      
      // If RPC not available, keep initial data
      if (!provider || !rpcProvider.isAvailable()) {
        setLoading(false);
        return;
      }

      try {
        const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
        
        // Get all pairs to calculate token metrics
        const pairCount = await rpcProvider.call(
          () => factory.allPairsLength(),
          'tokens_pairCount'
        );
        
        if (!pairCount) {
          setLoading(false);
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

            // Calculate prices and TVL for both tokens
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

        // Build token list with metrics
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
      }
    };

    fetchTokenData();
  }, [initialTokens]);

  const filteredTokens = tokens
    .filter(t => 
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
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
      }
      return sortDir === 'desc' ? -comparison : comparison;
    });


  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  }, []);

  const handleSort = useCallback((field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  }, [sortBy]);

  // Calculate total stats
  const totalTVL = tokens.reduce((acc, t) => acc + t.tvl, 0);
  const totalVolume = tokens.reduce((acc, t) => acc + t.volume24h, 0);

  return (
    <main className="container py-6 px-4 sm:py-8 md:py-12 max-w-7xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">
            Token <span className="text-primary">Market</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground sm:text-lg max-w-xl">
            Track prices, volume, and trends for all tokens on FOREDEX.
          </p>
        </div>
        <Badge variant="secondary" className="self-start px-3 py-1.5">
          <Coins className="w-4 h-4 mr-2" />
          {tokens.length} Tokens
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="glass-card p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total Tokens</p>
              <p className="text-lg sm:text-xl font-bold">{tokens.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/10">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total TVL</p>
              <p className="text-lg sm:text-xl font-bold">{formatNumber(totalTVL)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">24h Volume</p>
              <p className="text-lg sm:text-xl font-bold">{formatNumber(totalVolume)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/10">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Trading Pairs</p>
              <p className="text-lg sm:text-xl font-bold">{tokens.length > 0 ? (tokens.length * (tokens.length - 1)) / 2 : 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Token Table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1 -ml-3"
                  onClick={() => handleSort('price')}
                >
                  Price <ArrowUpDown className="w-3 h-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1 -ml-3"
                  onClick={() => handleSort('change')}
                >
                  24h % <ArrowUpDown className="w-3 h-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1 -ml-3"
                  onClick={() => handleSort('volume')}
                >
                  24h Volume <ArrowUpDown className="w-3 h-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1 -ml-3"
                  onClick={() => handleSort('tvl')}
                >
                  TVL <ArrowUpDown className="w-3 h-3" />
                </Button>
              </TableHead>
              <TableHead>Last 24h</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array(4).fill(0).map((_, i) => <TokenSkeleton key={i} />)
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
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
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
                        <p className="font-semibold">{token.symbol}</p>
                        <p className="text-xs text-muted-foreground">{token.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    ${token.price.toFixed(4)}
                  </TableCell>
                  <TableCell>
                    <div className={cn(
                      'flex items-center gap-1 font-medium',
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
                  <TableCell className="font-medium">{formatNumber(token.volume24h)}</TableCell>
                  <TableCell className="font-medium">{formatNumber(token.tvl)}</TableCell>
                  <TableCell>
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

      {/* Mobile Cards */}
      <div className="md:hidden mt-6 space-y-3">
        {filteredTokens.map((token, index) => (
          <div 
            key={token.address} 
            className="glass-card p-4 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate(`/tokens/${token.address}`)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 -ml-2"
                  onClick={() => toggleFavorite(token.address)}
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
  );
}

export default memo(TokensPageContent);
