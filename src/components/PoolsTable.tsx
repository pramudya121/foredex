import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { 
  ExternalLink, 
  TrendingUp, 
  Droplets, 
  Percent, 
  ChevronDown, 
  BarChart3, 
  Star,
  Plus,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from './TokenLogo';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PoolChart } from './PoolChart';
import { useFavoritePoolsStore } from '@/stores/favoritePoolsStore';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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

function PoolsTableInner() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { favorites, toggleFavorite, isFavorite } = useFavoritePoolsStore();

  // Sort pools: favorites first, then by TVL
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

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
        const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
        
        const pairCount = await factory.allPairsLength();
        const poolPromises = [];

        for (let i = 0; i < Math.min(Number(pairCount), 20); i++) {
          poolPromises.push(
            (async () => {
              try {
                const pairAddress = await factory.allPairs(i);
                const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

                const [token0Addr, token1Addr, reserves, totalSupply] = await Promise.all([
                  pair.token0(),
                  pair.token1(),
                  pair.getReserves(),
                  pair.totalSupply(),
                ]);

                const getTokenInfo = async (addr: string) => {
                  const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
                  if (known) return { address: addr, symbol: known.symbol, name: known.name, logoURI: known.logoURI };
                  
                  try {
                    const token = new ethers.Contract(addr, ERC20_ABI, provider);
                    const [symbol, name] = await Promise.all([token.symbol(), token.name()]);
                    return { address: addr, symbol, name, logoURI: undefined };
                  } catch {
                    return { address: addr, symbol: 'UNKNOWN', name: 'Unknown Token', logoURI: undefined };
                  }
                };

                const [token0, token1] = await Promise.all([
                  getTokenInfo(token0Addr),
                  getTokenInfo(token1Addr),
                ]);

                const reserve0 = parseFloat(ethers.formatEther(reserves[0]));
                const reserve1 = parseFloat(ethers.formatEther(reserves[1]));
                const tvl = (reserve0 + reserve1) * 1; // Simplified TVL calculation
                
                // Calculate 24h volume (simulated based on reserves)
                const volume24h = tvl * 0.15; // ~15% of TVL as daily volume
                
                // Calculate fees (0.3% of volume)
                const fees24h = volume24h * 0.003;
                
                // Calculate APR: (fees * 365) / TVL * 100
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
            })()
          );
        }

        const results = await Promise.all(poolPromises);
        setPools(results.filter((p): p is Pool => p !== null));
      } catch (error) {
        console.error('Error fetching pools:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPools();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
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

      {/* Table Header - Desktop */}
      <div className="glass-card p-4 hidden lg:block">
        <div className="grid grid-cols-[40px_1fr_120px_80px_120px_100px_140px] gap-4 text-sm font-medium text-muted-foreground">
          <div></div>
          <div>Pool</div>
          <div className="text-right">TVL</div>
          <div className="text-right">APR</div>
          <div className="text-right">24h Volume</div>
          <div className="text-right">24h Fees</div>
          <div className="text-right">Actions</div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
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
          <Button className="bg-gradient-wolf">
            Create Pool
          </Button>
        </div>
      )}

      {/* Pools List */}
      {!loading && displayedPools.length > 0 && (
        <div className="space-y-3">
          {displayedPools.map((pool) => (
            <Collapsible key={pool.address}>
              <div
                className={cn(
                  'glass-card p-5 hover:border-primary/40 transition-all group',
                  'hover:shadow-lg hover:shadow-primary/5',
                  isFavorite(pool.address) && 'border-yellow-500/30 bg-yellow-500/5'
                )}
              >
                {/* Desktop View */}
                <div className="hidden lg:grid grid-cols-[40px_1fr_120px_80px_120px_100px_140px] gap-4 items-center">
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

                  {/* 24h Fees */}
                  <div className="text-right">
                    <p className="font-semibold text-sm text-green-500">{formatNumber(pool.fees24h)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
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
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <BarChart3 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </Button>
                    </CollapsibleTrigger>
                    <a
                      href={`${NEXUS_TESTNET.blockExplorer}/address/${pool.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </a>
                  </div>
                </div>

                {/* Mobile/Tablet View */}
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
                      <Link
                        to={`/liquidity?token0=${pool.token0.address}&token1=${pool.token1.address}`}
                      >
                        <Button size="sm" className="bg-gradient-wolf h-8 gap-1">
                          <Plus className="w-3 h-3" />
                          Add
                        </Button>
                      </Link>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">TVL</p>
                      <p className="font-bold">{formatNumber(pool.tvl)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">APR</p>
                      <p className={cn(
                        'font-bold flex items-center gap-1',
                        pool.apr > 50 ? 'text-green-500' : 'text-primary'
                      )}>
                        {pool.apr > 50 && <Flame className="w-3 h-3" />}
                        {pool.apr.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">24h Volume</p>
                      <p className="font-semibold">{formatNumber(pool.volume24h)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">24h Fees</p>
                      <p className="font-semibold text-green-500">{formatNumber(pool.fees24h)}</p>
                    </div>
                  </div>
                </div>

                {/* Expandable Chart Section */}
                <CollapsibleContent className="mt-4 pt-4 border-t border-border/50">
                  <PoolChart
                    poolAddress={pool.address}
                    token0Symbol={pool.token0.symbol}
                    token1Symbol={pool.token1.symbol}
                    reserve0={pool.reserve0}
                    reserve1={pool.reserve1}
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}

export const PoolsTable = memo(PoolsTableInner);
