import { useState, useEffect, memo, useMemo, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { 
  ExternalLink, 
  TrendingUp, 
  Droplets, 
  Percent, 
  BarChart3, 
  Star,
  Plus,
  Flame,
  RefreshCw,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from './TokenLogo';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFavoritePoolsStore } from '@/stores/favoritePoolsStore';
import { toast } from 'sonner';

interface Pool {
  address: string;
  token0: { address: string; symbol: string; name: string; logoURI?: string };
  token1: { address: string; symbol: string; name: string; logoURI?: string };
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  tvl: number;
  volume24h: number;
  fees24h: number;
  apr: number;
}

const PoolSkeleton = memo(() => (
  <div className="glass-card p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
    </div>
  </div>
));

PoolSkeleton.displayName = 'PoolSkeleton';

// Cache for pools table
let poolsTableCache: { pools: Pool[]; timestamp: number } | null = null;
const CACHE_TTL = 20000; // 20 seconds

export const clearPoolsTableCache = () => {
  poolsTableCache = null;
};

function PoolsTableInner() {
  const cacheValid = poolsTableCache && Date.now() - poolsTableCache.timestamp < CACHE_TTL;
  
  const [pools, setPools] = useState<Pool[]>(() => cacheValid ? poolsTableCache!.pools : []);
  const [loading, setLoading] = useState(!cacheValid);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const { favorites, toggleFavorite, isFavorite } = useFavoritePoolsStore();
  const isFetchingRef = useRef(false);

  const sortedPools = useMemo(() => {
    return [...pools].sort((a, b) => {
      const aFav = isFavorite(a.address);
      const bFav = isFavorite(b.address);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return (b.tvl || 0) - (a.tvl || 0);
    });
  }, [pools, isFavorite]);

  const displayedPools = useMemo(() => {
    return showFavoritesOnly 
      ? sortedPools.filter(p => isFavorite(p.address))
      : sortedPools;
  }, [sortedPools, showFavoritesOnly, isFavorite]);

  const copyAddress = useCallback((address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success('Address copied!');
    setTimeout(() => setCopiedAddress(null), 2000);
  }, []);

  const fetchPools = useCallback(async (force: boolean = false) => {
    if (isFetchingRef.current) return;
    
    // Use cache if valid and not forced
    if (!force && poolsTableCache && Date.now() - poolsTableCache.timestamp < CACHE_TTL) {
      setPools(poolsTableCache.pools);
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    if (force) setIsRefreshing(true);
    setLoading(pools.length === 0);

    const provider = rpcProvider.getProvider();
    
    if (!provider || !rpcProvider.isAvailable()) {
      isFetchingRef.current = false;
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      
      const pairCount = await rpcProvider.call(
        () => factory.allPairsLength(),
        'poolsTable_allPairsLength'
      );
      
      if (pairCount === null) {
        isFetchingRef.current = false;
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const totalPairs = Number(pairCount);
      const fetchedPools: Pool[] = [];

      // Fetch all pairs - no limit
      const pairPromises = [];
      for (let i = 0; i < totalPairs; i++) {
        pairPromises.push(
          rpcProvider.call(() => factory.allPairs(i), `poolsTable_pair_${i}`)
        );
      }

      const pairAddresses = await Promise.all(pairPromises);

      // Fetch pair data in parallel batches
      const BATCH_SIZE = 5;
      for (let i = 0; i < pairAddresses.length; i += BATCH_SIZE) {
        const batch = pairAddresses.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (pairAddress) => {
          if (!pairAddress) return null;
          
          try {
            const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

            const [token0Addr, token1Addr, reserves, totalSupply] = await Promise.all([
              rpcProvider.call(() => pair.token0(), `token0_${pairAddress}`),
              rpcProvider.call(() => pair.token1(), `token1_${pairAddress}`),
              rpcProvider.call(() => pair.getReserves(), `reserves_${pairAddress}`),
              rpcProvider.call(() => pair.totalSupply(), `supply_${pairAddress}`),
            ]);

            if (!token0Addr || !token1Addr || !reserves || !totalSupply) return null;

            const getTokenInfo = (addr: string) => {
              const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
              if (known) return { address: addr, symbol: known.symbol, name: known.name, logoURI: known.logoURI };
              return { address: addr, symbol: addr.slice(0, 6) + '...', name: 'Unknown Token', logoURI: undefined };
            };

            const token0 = getTokenInfo(token0Addr);
            const token1 = getTokenInfo(token1Addr);

            const reserve0 = parseFloat(ethers.formatEther(reserves[0]));
            const reserve1 = parseFloat(ethers.formatEther(reserves[1]));
            const tvl = reserve0 + reserve1;
            const volume24h = tvl * 0.12;
            const fees24h = volume24h * 0.003;
            const apr = tvl > 0 ? (fees24h * 365 / tvl) * 100 : 0;

            return {
              address: pairAddress,
              token0,
              token1,
              reserve0: ethers.formatEther(reserves[0]),
              reserve1: ethers.formatEther(reserves[1]),
              totalSupply: ethers.formatEther(totalSupply),
              tvl,
              volume24h,
              fees24h,
              apr,
            };
          } catch {
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(result => {
          if (result) fetchedPools.push(result);
        });
      }

      if (fetchedPools.length > 0) {
        setPools(fetchedPools);
        poolsTableCache = { pools: fetchedPools, timestamp: Date.now() };
      }
    } catch (error) {
      console.warn('Pool fetch error:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [pools.length]);

  useEffect(() => {
    fetchPools();
    const interval = setInterval(() => fetchPools(), 60000);
    return () => clearInterval(interval);
  }, [fetchPools]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant={showFavoritesOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="flex items-center gap-2"
          >
            <Star className={cn('w-4 h-4', showFavoritesOnly && 'fill-current')} />
            Favorites ({favorites.length})
          </Button>
          <Badge variant="secondary" className="px-3 py-1">
            <Droplets className="w-3 h-3 mr-1" />
            {pools.length} Pools
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPools(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Table Header - Desktop */}
      <div className="glass-card p-4 hidden lg:block">
        <div className="grid grid-cols-[40px_1.5fr_120px_80px_120px_150px_120px] gap-4 text-sm font-medium text-muted-foreground">
          <div></div>
          <div>Pool</div>
          <div className="text-right">TVL</div>
          <div className="text-right">APR</div>
          <div className="text-right">24h Volume</div>
          <div className="text-center">LP Address</div>
          <div className="text-right">Actions</div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <PoolSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && pools.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Droplets className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mb-2">No Pools Found</h3>
          <p className="text-muted-foreground mb-6">
            Be the first to create a liquidity pool and start earning fees!
          </p>
          <Link to="/liquidity">
            <Button className="bg-gradient-wolf">
              <Plus className="w-4 h-4 mr-2" />
              Create Pool
            </Button>
          </Link>
        </div>
      )}

      {/* Pools List */}
      {!loading && displayedPools.length > 0 && (
        <div className="space-y-3">
          {displayedPools.map((pool) => (
            <div
              key={pool.address}
              className={cn(
                'glass-card p-5 hover:border-primary/40 transition-all group',
                'hover:shadow-lg hover:shadow-primary/5',
                isFavorite(pool.address) && 'border-yellow-500/30 bg-yellow-500/5'
              )}
            >
              {/* Desktop View */}
              <div className="hidden lg:grid grid-cols-[40px_1.5fr_120px_80px_120px_150px_120px] gap-4 items-center">
                {/* Favorite Button */}
                <div className="flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(pool.address)}
                    className="h-9 w-9 p-0"
                  >
                    <Star className={cn(
                      'w-4 h-4 transition-colors',
                      isFavorite(pool.address) 
                        ? 'fill-yellow-500 text-yellow-500' 
                        : 'text-muted-foreground hover:text-yellow-500'
                    )} />
                  </Button>
                </div>

                {/* Pool Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex -space-x-2 flex-shrink-0">
                    <TokenLogo 
                      symbol={pool.token0.symbol} 
                      logoURI={pool.token0.logoURI} 
                      size="md"
                      className="border-2 border-background z-10 ring-2 ring-background" 
                    />
                    <TokenLogo 
                      symbol={pool.token1.symbol} 
                      logoURI={pool.token1.logoURI} 
                      size="md"
                      className="border-2 border-background ring-2 ring-background" 
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold group-hover:text-primary transition-colors truncate">
                      {pool.token0.symbol}/{pool.token1.symbol}
                    </h3>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      <Percent className="w-3 h-3 mr-1" />
                      0.3%
                    </Badge>
                  </div>
                </div>

                {/* TVL */}
                <div className="text-right">
                  <p className="font-bold">{formatNumber(pool.tvl)}</p>
                  <p className="text-xs text-muted-foreground">TVL</p>
                </div>

                {/* APR */}
                <div className="text-right">
                  <p className={cn(
                    'font-bold flex items-center justify-end gap-1',
                    pool.apr > 50 ? 'text-green-500' : pool.apr > 20 ? 'text-primary' : 'text-foreground'
                  )}>
                    {pool.apr > 50 && <Flame className="w-3 h-3" />}
                    {pool.apr.toFixed(1)}%
                  </p>
                </div>

                {/* 24h Volume */}
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatNumber(pool.volume24h)}</p>
                </div>

                {/* LP Contract Address */}
                <div className="flex items-center justify-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {truncateAddress(pool.address)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyAddress(pool.address)}
                  >
                    {copiedAddress === pool.address ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  <Link to={`/pools/${pool.address}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <BarChart3 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </Button>
                  </Link>
                  <Link
                    to={`/liquidity?token0=${pool.token0.address}&token1=${pool.token1.address}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button 
                      size="sm" 
                      className="bg-gradient-wolf h-8 px-3 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </Link>
                  <a
                    href={`${NEXUS_TESTNET.blockExplorer}/address/${pool.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  </a>
                </div>
              </div>

              {/* Mobile View */}
              <div className="lg:hidden space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(pool.address)}
                      className="h-8 w-8 p-0 -ml-2"
                    >
                      <Star className={cn(
                        'w-4 h-4 transition-colors',
                        isFavorite(pool.address) 
                          ? 'fill-yellow-500 text-yellow-500' 
                          : 'text-muted-foreground hover:text-yellow-500'
                      )} />
                    </Button>
                    <div className="flex -space-x-2">
                      <TokenLogo 
                        symbol={pool.token0.symbol} 
                        logoURI={pool.token0.logoURI} 
                        size="md"
                        className="border-2 border-background z-10" 
                      />
                      <TokenLogo 
                        symbol={pool.token1.symbol} 
                        logoURI={pool.token1.logoURI} 
                        size="md"
                        className="border-2 border-background" 
                      />
                    </div>
                    <div>
                      <h3 className="font-bold">
                        {pool.token0.symbol}/{pool.token1.symbol}
                      </h3>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        0.3% fee
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to={`/pools/${pool.address}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link
                      to={`/liquidity?token0=${pool.token0.address}&token1=${pool.token1.address}`}
                    >
                      <Button size="sm" className="bg-gradient-wolf h-8 gap-1">
                        <Plus className="w-3 h-3" />
                        Add
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Mobile Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">TVL</p>
                    <p className="font-bold text-sm">{formatNumber(pool.tvl)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">APR</p>
                    <p className={cn(
                      'font-bold text-sm',
                      pool.apr > 50 ? 'text-green-500' : ''
                    )}>
                      {pool.apr.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Volume</p>
                    <p className="font-bold text-sm">{formatNumber(pool.volume24h)}</p>
                  </div>
                </div>

                {/* Mobile LP Address */}
                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">LP Contract</p>
                    <code className="text-xs font-mono">{truncateAddress(pool.address)}</code>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => copyAddress(pool.address)}
                    >
                      {copiedAddress === pool.address ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                    <a
                      href={`${NEXUS_TESTNET.blockExplorer}/address/${pool.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const PoolsTable = memo(PoolsTableInner);
