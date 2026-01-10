import { useState, useEffect, memo, useMemo, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { useWeb3 } from '@/contexts/Web3Context';
import { 
  ExternalLink, 
  TrendingUp, 
  Droplets, 
  Percent, 
  BarChart3, 
  Star,
  Plus,
  Flame,
  ChevronRight,
  Copy,
  Check,
  Wallet,
  LayoutGrid,
  List,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Coins,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from './TokenLogo';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useFavoritePoolsStore } from '@/stores/favoritePoolsStore';
import { toast } from 'sonner';
import { PoolMiniChart } from './pools/PoolMiniChart';
import { PoolCard } from './pools/PoolCard';
import { AutoRefreshTimer } from './AutoRefreshTimer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  chartData?: number[];
  userLpBalance?: string; // User's LP token balance
  userShare?: number; // User's pool share percentage
}

// Generate mini chart data for each pool
const generateMiniChartData = (tvl: number, seed: number): number[] => {
  const data: number[] = [];
  let value = tvl * 0.7;
  let s = seed;
  
  for (let i = 0; i < 14; i++) {
    s = (s * 9301 + 49297) % 233280;
    const change = (s / 233280 - 0.5) * 0.1;
    value = value * (1 + change);
    data.push(Math.max(0, value));
  }
  data.push(tvl); // End with current TVL
  return data;
};

const PoolSkeleton = memo(() => (
  <div className="glass-card p-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <Skeleton className="w-10 h-10 rounded-full bg-muted/60" />
          <Skeleton className="w-10 h-10 rounded-full bg-muted/60" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-28 bg-muted/60" />
          <Skeleton className="h-4 w-20 bg-muted/60" />
        </div>
      </div>
      <div className="hidden lg:flex items-center gap-6">
        <div className="space-y-1.5 text-right">
          <Skeleton className="h-3 w-10 bg-muted/50" />
          <Skeleton className="h-5 w-16 bg-muted/60" />
        </div>
        <div className="space-y-1.5 text-right">
          <Skeleton className="h-3 w-8 bg-muted/50" />
          <Skeleton className="h-5 w-12 bg-muted/60" />
        </div>
        <div className="space-y-1.5 text-right">
          <Skeleton className="h-3 w-12 bg-muted/50" />
          <Skeleton className="h-5 w-14 bg-muted/60" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg bg-muted/60" />
      </div>
      <div className="lg:hidden flex items-center gap-2">
        <Skeleton className="h-8 w-16 rounded-lg bg-muted/60" />
      </div>
    </div>
  </div>
));

PoolSkeleton.displayName = 'PoolSkeleton';

// Enhanced loading skeleton with multiple items
const LoadingSkeletons = memo(() => (
  <div className="space-y-3">
    {[...Array(6)].map((_, i) => (
      <div key={i} style={{ animationDelay: `${i * 100}ms` }}>
        <PoolSkeleton />
      </div>
    ))}
  </div>
));

LoadingSkeletons.displayName = 'LoadingSkeletons';

// Cache for pools table
interface PoolsTableCache {
  pools: Pool[];
  timestamp: number;
  poolCount: number;
}

let poolsTableCache: PoolsTableCache | null = null;
const CACHE_TTL = 30000; // 30 seconds

export const clearPoolsTableCache = () => {
  poolsTableCache = null;
};

type SortOption = 'tvl' | 'apr' | 'volume' | 'fees' | 'newest';

function PoolsTableInner() {
  const { address: userAddress, isConnected } = useWeb3();
  const cacheValid = poolsTableCache && Date.now() - poolsTableCache.timestamp < CACHE_TTL;
  
  const [pools, setPools] = useState<Pool[]>(() => cacheValid ? poolsTableCache!.pools : []);
  const [loading, setLoading] = useState(!cacheValid);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showMyPositions, setShowMyPositions] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [sortBy, setSortBy] = useState<SortOption>('tvl');
  const [searchQuery, setSearchQuery] = useState('');
  const { favorites, toggleFavorite, isFavorite } = useFavoritePoolsStore();
  const isFetchingRef = useRef(false);

  // Sort pools based on selected option
  const sortedPools = useMemo(() => {
    return [...pools].sort((a, b) => {
      // Always prioritize favorites
      const aFav = isFavorite(a.address);
      const bFav = isFavorite(b.address);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      // Then sort by selected option
      switch (sortBy) {
        case 'tvl':
          return (b.tvl || 0) - (a.tvl || 0);
        case 'apr':
          return (b.apr || 0) - (a.apr || 0);
        case 'volume':
          return (b.volume24h || 0) - (a.volume24h || 0);
        case 'fees':
          return (b.fees24h || 0) - (a.fees24h || 0);
        case 'newest':
          // Newest first (by address as proxy for creation order)
          return a.address.localeCompare(b.address);
        default:
          return (b.tvl || 0) - (a.tvl || 0);
      }
    });
  }, [pools, isFavorite, sortBy]);

  // Filter pools based on search and toggles
  const displayedPools = useMemo(() => {
    let filtered = sortedPools;
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.token0.symbol.toLowerCase().includes(query) ||
        p.token1.symbol.toLowerCase().includes(query) ||
        p.token0.name.toLowerCase().includes(query) ||
        p.token1.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
      );
    }
    
    if (showFavoritesOnly) {
      filtered = filtered.filter(p => isFavorite(p.address));
    }
    if (showMyPositions && isConnected) {
      filtered = filtered.filter(p => p.userLpBalance && parseFloat(p.userLpBalance) > 0);
    }
    return filtered;
  }, [sortedPools, showFavoritesOnly, showMyPositions, isFavorite, isConnected, searchQuery]);

  const copyAddress = useCallback((address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success('Address copied!');
    setTimeout(() => setCopiedAddress(null), 2000);
  }, []);

  const fetchPools = useCallback(async (force: boolean = false) => {
    if (isFetchingRef.current) return;
    
    // Use cache if valid and not forced (but still update LP balances if connected)
    if (!force && poolsTableCache && Date.now() - poolsTableCache.timestamp < CACHE_TTL) {
      // If user is connected, update LP balances on cached pools
      if (userAddress && isConnected) {
        await updateUserLpBalances(poolsTableCache.pools);
      } else {
        setPools(poolsTableCache.pools);
      }
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    if (force) setIsRefreshing(true);
    setLoading(pools.length === 0);

    const provider = rpcProvider.getProvider();
    
    // Don't fail if provider is temporarily unavailable - just wait
    if (!provider) {
      setTimeout(() => {
        isFetchingRef.current = false;
        fetchPools(force);
      }, 2000);
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

      // Use batch RPC to fetch all pair addresses efficiently
      const pairAddressCalls = [];
      for (let i = 0; i < totalPairs; i++) {
        pairAddressCalls.push(
          rpcProvider.batchCall('eth_call', [
            {
              to: CONTRACTS.FACTORY,
              data: factory.interface.encodeFunctionData('allPairs', [i])
            },
            'latest'
          ])
        );
      }

      const pairAddressResults = await Promise.all(pairAddressCalls);
      const pairAddresses = pairAddressResults.map(result => {
        if (!result) return null;
        try {
          return factory.interface.decodeFunctionResult('allPairs', result)[0];
        } catch {
          return null;
        }
      }).filter(Boolean);

      // Fetch pair data using batchContractCalls for better efficiency
      const BATCH_SIZE = 8; // Larger batch with batched RPC
      for (let i = 0; i < pairAddresses.length; i += BATCH_SIZE) {
        const batch = pairAddresses.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (pairAddress) => {
          if (!pairAddress) return null;
          
          try {
            const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

            // Use batchContractCalls for efficient data fetching
            const calls = [
              { contract: pair, method: 'token0', args: [] },
              { contract: pair, method: 'token1', args: [] },
              { contract: pair, method: 'getReserves', args: [] },
              { contract: pair, method: 'totalSupply', args: [] },
            ];

            // Add user balance if connected
            if (userAddress && isConnected) {
              calls.push({ contract: pair, method: 'balanceOf', args: [userAddress] });
            }

            const results = await rpcProvider.batchContractCalls(
              calls,
              `pool_${pairAddress}`
            );

            const [token0Addr, token1Addr, reserves, totalSupply] = results as [string, string, any, bigint];
            const userLpBalanceRaw = results[4] as bigint | undefined;

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

            // Calculate user LP balance and share
            const totalSupplyNum = parseFloat(ethers.formatEther(totalSupply));
            let userLpBalance = '0';
            let userShare = 0;
            
            if (userLpBalanceRaw) {
              userLpBalance = ethers.formatEther(userLpBalanceRaw);
              const userLpNum = parseFloat(userLpBalance);
              userShare = totalSupplyNum > 0 ? (userLpNum / totalSupplyNum) * 100 : 0;
            }

            // Generate seed from address for consistent chart data
            const addressSeed = parseInt(pairAddress.slice(2, 10), 16);
            const chartData = generateMiniChartData(tvl, addressSeed);

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
              chartData,
              userLpBalance,
              userShare,
            };
          } catch {
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(result => {
          if (result) fetchedPools.push(result);
        });
        
        // Minimal delay between batches - batch RPC is more efficient
        if (i + BATCH_SIZE < pairAddresses.length) {
          await new Promise(r => setTimeout(r, 100));
        }
      }

      if (fetchedPools.length > 0) {
        setPools(fetchedPools);
        poolsTableCache = { pools: fetchedPools, timestamp: Date.now(), poolCount: fetchedPools.length };
      }
    } catch {
      // Silent fail - will retry automatically
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [pools.length, userAddress, isConnected]);

  // Helper function to update user LP balances on cached pools
  const updateUserLpBalances = useCallback(async (cachedPools: Pool[]) => {
    if (!userAddress || !isConnected) {
      setPools(cachedPools);
      return;
    }

    const provider = rpcProvider.getProvider();
    if (!provider || !rpcProvider.isAvailable()) {
      setPools(cachedPools);
      return;
    }

    try {
      const updatedPools = await Promise.all(
        cachedPools.map(async (pool) => {
          try {
            const pair = new ethers.Contract(pool.address, PAIR_ABI, provider);
            const userLpBalanceRaw = await rpcProvider.call(
              () => pair.balanceOf(userAddress),
              `userLp_${pool.address}_${userAddress}`
            );
            
            if (userLpBalanceRaw) {
              const userLpBalance = ethers.formatEther(userLpBalanceRaw);
              const totalSupplyNum = parseFloat(pool.totalSupply);
              const userLpNum = parseFloat(userLpBalance);
              const userShare = totalSupplyNum > 0 ? (userLpNum / totalSupplyNum) * 100 : 0;
              return { ...pool, userLpBalance, userShare };
            }
            return pool;
          } catch {
            return pool;
          }
        })
      );
      setPools(updatedPools);
    } catch {
      setPools(cachedPools);
    }
  }, [userAddress, isConnected]);

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

  // Sort options configuration
  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'tvl', label: 'TVL', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'apr', label: 'APR', icon: <Flame className="w-4 h-4" /> },
    { value: 'volume', label: 'Volume', icon: <BarChart3 className="w-4 h-4" /> },
    { value: 'fees', label: 'Fees', icon: <Coins className="w-4 h-4" /> },
    { value: 'newest', label: 'Newest', icon: <ArrowDown className="w-4 h-4" /> },
  ];

  const currentSortOption = sortOptions.find(o => o.value === sortBy);

  return (
    <div className="space-y-4">
      {/* Enhanced Filter Bar */}
      <div className="flex flex-col gap-3">
        {/* Search and Auto-refresh Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search pools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background/50"
            />
          </div>
          
          {/* Auto-refresh Timer */}
          <AutoRefreshTimer
            intervalSeconds={30}
            onRefresh={() => fetchPools(true)}
            isRefreshing={isRefreshing}
            showProgress={true}
            size="sm"
          />
        </div>

        {/* Filters and Sort Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                if (!showFavoritesOnly) setShowMyPositions(false);
              }}
              className="flex items-center gap-2 h-8"
            >
              <Star className={cn('w-4 h-4', showFavoritesOnly && 'fill-current')} />
              <span className="hidden sm:inline">Favorites</span> ({favorites.length})
            </Button>
            {isConnected && (
              <Button
                variant={showMyPositions ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowMyPositions(!showMyPositions);
                  if (!showMyPositions) setShowFavoritesOnly(false);
                }}
                className="flex items-center gap-2 h-8"
              >
                <Wallet className={cn('w-4 h-4', showMyPositions && 'fill-current')} />
                <span className="hidden sm:inline">My Positions</span>
              </Button>
            )}
            <Badge variant="secondary" className="px-3 py-1">
              <Droplets className="w-3 h-3 mr-1" />
              {displayedPools.length}/{pools.length} Pools
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="hidden sm:inline">Sort:</span>
                  <span className="font-medium">{currentSortOption?.label}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={cn(
                      'flex items-center gap-2 cursor-pointer',
                      sortBy === option.value && 'bg-primary/10 text-primary'
                    )}
                  >
                    {option.icon}
                    {option.label}
                    {sortBy === option.value && (
                      <Check className="w-4 h-4 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-none h-8 px-2"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="rounded-none h-8 px-2"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Header - Desktop */}
      <div className="glass-card p-4 hidden lg:block">
        <div className="grid grid-cols-[40px_1.2fr_80px_100px_70px_90px_100px_100px_90px] gap-3 text-sm font-medium text-muted-foreground">
          <div></div>
          <div>Pool</div>
          <div className="text-center">Trend</div>
          <div className="text-right">TVL</div>
          <div className="text-right">APR</div>
          <div className="text-right">Volume</div>
          <div className="text-center">Your LP</div>
          <div className="text-center">Address</div>
          <div className="text-right">Actions</div>
        </div>
      </div>

      {/* Loading State */}
      {loading && <LoadingSkeletons />}

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

      {/* Card View */}
      {!loading && displayedPools.length > 0 && viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedPools.map((pool) => (
            <PoolCard
              key={pool.address}
              pool={pool}
              isFavorite={isFavorite(pool.address)}
              isConnected={isConnected}
              onToggleFavorite={toggleFavorite}
              onCopyAddress={copyAddress}
              copiedAddress={copiedAddress}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {!loading && displayedPools.length > 0 && viewMode === 'table' && (
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
              <div className="hidden lg:grid grid-cols-[40px_1.2fr_80px_100px_70px_90px_100px_100px_90px] gap-3 items-center">
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
                    <h3 className="font-bold group-hover:text-primary transition-colors truncate text-sm">
                      {pool.token0.symbol}/{pool.token1.symbol}
                    </h3>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      <Percent className="w-3 h-3 mr-1" />
                      0.3%
                    </Badge>
                  </div>
                </div>

                {/* Mini Chart */}
                <div className="flex justify-center">
                  {pool.chartData && (
                    <PoolMiniChart 
                      data={pool.chartData} 
                      height={28} 
                      showTrend={false}
                    />
                  )}
                </div>

                {/* TVL */}
                <div className="text-right">
                  <p className="font-bold text-sm">{formatNumber(pool.tvl)}</p>
                </div>

                {/* APR */}
                <div className="text-right">
                  <p className={cn(
                    'font-bold text-sm flex items-center justify-end gap-1',
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

                {/* User LP Balance */}
                <div className="text-center">
                  {isConnected && pool.userLpBalance && parseFloat(pool.userLpBalance) > 0 ? (
                    <div className="bg-primary/10 rounded-lg px-2 py-1">
                      <p className="font-bold text-xs text-primary">
                        {parseFloat(pool.userLpBalance).toFixed(4)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {pool.userShare?.toFixed(2)}% share
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
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
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-muted/30 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">TVL</p>
                    <p className="font-bold text-xs">{formatNumber(pool.tvl)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">APR</p>
                    <p className={cn('font-bold text-xs', pool.apr > 50 ? 'text-green-500' : '')}>
                      {pool.apr.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Volume</p>
                    <p className="font-bold text-xs">{formatNumber(pool.volume24h)}</p>
                  </div>
                  <div className={cn(
                    "rounded-lg p-2 text-center",
                    isConnected && pool.userLpBalance && parseFloat(pool.userLpBalance) > 0 
                      ? "bg-primary/10" 
                      : "bg-muted/30"
                  )}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Your LP</p>
                    <p className={cn(
                      "font-bold text-xs",
                      isConnected && pool.userLpBalance && parseFloat(pool.userLpBalance) > 0 && "text-primary"
                    )}>
                      {isConnected && pool.userLpBalance && parseFloat(pool.userLpBalance) > 0 
                        ? parseFloat(pool.userLpBalance).toFixed(2)
                        : '-'}
                    </p>
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
