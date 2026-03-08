import { useState, useEffect, memo, useMemo, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, MULTICALL_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { useWeb3 } from '@/contexts/Web3Context';
import { 
  ExternalLink, 
  Droplets, 
  Percent, 
  BarChart3, 
  Star,
  Plus,
  Flame,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from './TokenLogo';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFavoritePoolsStore } from '@/stores/favoritePoolsStore';
import { toast } from 'sonner';
import { PoolMiniChart } from './pools/PoolMiniChart';
import { PoolCard } from './pools/PoolCard';
import { PoolFilters, SortOption, ViewMode } from './pools/PoolFilters';

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

interface PoolsTableProps {
  externalPools?: Array<{
    address: string;
    token0: { address: string; symbol: string; name: string; logoURI?: string };
    token1: { address: string; symbol: string; name: string; logoURI?: string };
    reserve0: string;
    reserve1: string;
    totalSupply: string;
    tvl: number;
  }>;
  externalLoading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function PoolsTableInner({ externalPools, externalLoading, onRefresh, isRefreshing: externalRefreshing }: PoolsTableProps) {
  const { address: userAddress, isConnected } = useWeb3();
  
  // Use external pools if provided, otherwise fallback to own fetching
  const hasExternalPools = externalPools !== undefined;
  const cacheValid = !hasExternalPools && poolsTableCache && Date.now() - poolsTableCache.timestamp < CACHE_TTL;
  
  const [pools, setPools] = useState<Pool[]>(() => cacheValid ? poolsTableCache!.pools : []);
  const [loading, setLoading] = useState(!cacheValid && !hasExternalPools);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showMyPositions, setShowMyPositions] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortBy, setSortBy] = useState<SortOption>('tvl');
  const [searchQuery, setSearchQuery] = useState('');
  const [minTvl, setMinTvl] = useState(0);
  const [minApr, setMinApr] = useState(0);
  const { favorites, toggleFavorite, isFavorite } = useFavoritePoolsStore();
  const isFetchingRef = useRef(false);

  // Convert external pools to internal Pool format when provided
  useEffect(() => {
    if (!hasExternalPools || !externalPools) return;
    
    const converted: Pool[] = externalPools.map(ep => {
      const tvl = ep.tvl;
      const volume24h = tvl * 0.12;
      const fees24h = volume24h * 0.003;
      const apr = tvl > 0 ? (fees24h * 365 / tvl) * 100 : 0;
      const addressSeed = parseInt(ep.address.slice(2, 10), 16);
      const chartData = generateMiniChartData(tvl, addressSeed);
      
      return {
        address: ep.address,
        token0: ep.token0,
        token1: ep.token1,
        reserve0: ep.reserve0,
        reserve1: ep.reserve1,
        totalSupply: ep.totalSupply,
        tvl,
        volume24h,
        fees24h,
        apr,
        chartData,
        userLpBalance: '0',
        userShare: 0,
      };
    });
    
    setPools(converted);
    setLoading(false);
    
    // Fetch user LP balances if connected
    if (userAddress && isConnected) {
      updateUserLpBalances(converted);
    }
  }, [externalPools, hasExternalPools, userAddress, isConnected]);

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
    
    // Advanced filters
    if (minTvl > 0) {
      filtered = filtered.filter(p => p.tvl >= minTvl);
    }
    if (minApr > 0) {
      filtered = filtered.filter(p => p.apr >= minApr);
    }
    
    if (showFavoritesOnly) {
      filtered = filtered.filter(p => isFavorite(p.address));
    }
    if (showMyPositions && isConnected) {
      filtered = filtered.filter(p => p.userLpBalance && parseFloat(p.userLpBalance) > 0);
    }
    return filtered;
  }, [sortedPools, showFavoritesOnly, showMyPositions, isFavorite, isConnected, searchQuery, minTvl, minApr]);

  const copyAddress = useCallback((address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success('Address copied!');
    setTimeout(() => setCopiedAddress(null), 2000);
  }, []);

  const fetchPools = useCallback(async (force: boolean = false) => {
    // Skip own fetching if external pools are provided
    if (hasExternalPools) return;
    if (isFetchingRef.current) return;
    
    // Use cache if valid and not forced
    if (!force && poolsTableCache && Date.now() - poolsTableCache.timestamp < CACHE_TTL) {
      if (poolsTableCache.pools.length > 0) {
        // If user is connected, update LP balances on cached pools
        if (userAddress && isConnected) {
          await updateUserLpBalances(poolsTableCache.pools);
        } else {
          setPools(poolsTableCache.pools);
        }
        setLoading(false);
        return;
      }
    }

    isFetchingRef.current = true;
    if (force) setIsRefreshing(true);
    
    // Only show loading if no cached data
    if (pools.length === 0 && !poolsTableCache?.pools.length) {
      setLoading(true);
    }

    // Wait for provider to be ready
    let provider = rpcProvider.getProvider();
    let attempts = 0;
    while ((!provider || !rpcProvider.isAvailable()) && attempts < 5) {
      await new Promise(r => setTimeout(r, 1000));
      provider = rpcProvider.getProvider();
      attempts++;
    }
    
    if (!provider) {
      // Use cached data if available
      if (poolsTableCache?.pools.length) {
        setPools(poolsTableCache.pools);
      }
      isFetchingRef.current = false;
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      
      const pairCount = await rpcProvider.call(
        () => factory.allPairsLength(),
        'poolsTable_allPairsLength',
        { retries: 3, timeout: 15000, skipCache: force }
      );
      
      if (pairCount === null) {
        // Use cached data if available
        if (poolsTableCache?.pools.length) {
          setPools(poolsTableCache.pools);
        }
        isFetchingRef.current = false;
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const totalPairs = Number(pairCount);
      const fetchedPools: Pool[] = [];

      // Phase 1: Batch fetch all pair addresses via multicall
      let pairAddresses: string[] = [];
      try {
        const multicall = new ethers.Contract(CONTRACTS.MULTICALL, MULTICALL_ABI, provider);
        const factoryInterface = new ethers.Interface(FACTORY_ABI);
        const addrCalls = Array.from({ length: totalPairs }, (_, i) => ({
          target: CONTRACTS.FACTORY,
          callData: factoryInterface.encodeFunctionData('allPairs', [i]),
        }));
        const [, returnData] = await multicall.aggregate.staticCall(addrCalls);
        pairAddresses = (returnData as string[]).map(data => {
          try { return factoryInterface.decodeFunctionResult('allPairs', data)[0] as string; }
          catch { return ''; }
        }).filter(Boolean);
      } catch {
        // Fallback: sequential
        for (let i = 0; i < totalPairs; i++) {
          try {
            const addr = await rpcProvider.call(() => new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider).allPairs(i), `pt_pair_${i}`);
            if (addr) pairAddresses.push(addr);
          } catch { continue; }
        }
      }

      if (pairAddresses.length === 0) {
        if (poolsTableCache?.pools.length) setPools(poolsTableCache.pools);
        isFetchingRef.current = false;
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Phase 2: Batch fetch all pair data via multicall (token0, token1, reserves, totalSupply)
      try {
        const multicall = new ethers.Contract(CONTRACTS.MULTICALL, MULTICALL_ABI, provider);
        const pairInterface = new ethers.Interface(PAIR_ABI);
        
        const detailCalls: { target: string; callData: string }[] = [];
        pairAddresses.forEach(addr => {
          detailCalls.push({ target: addr, callData: pairInterface.encodeFunctionData('token0') });
          detailCalls.push({ target: addr, callData: pairInterface.encodeFunctionData('token1') });
          detailCalls.push({ target: addr, callData: pairInterface.encodeFunctionData('getReserves') });
          detailCalls.push({ target: addr, callData: pairInterface.encodeFunctionData('totalSupply') });
        });

        const [, detailReturnData] = await multicall.aggregate.staticCall(detailCalls);
        const detailResults = detailReturnData as string[];

        // Phase 3: Batch fetch user LP balances if connected
        let userBalanceMap = new Map<string, bigint>();
        if (userAddress && isConnected) {
          try {
            const balCalls = pairAddresses.map(addr => ({
              target: addr,
              callData: pairInterface.encodeFunctionData('balanceOf', [userAddress]),
            }));
            const [, balReturnData] = await multicall.aggregate.staticCall(balCalls);
            (balReturnData as string[]).forEach((data, idx) => {
              try {
                const bal = pairInterface.decodeFunctionResult('balanceOf', data)[0];
                userBalanceMap.set(pairAddresses[idx].toLowerCase(), BigInt(bal));
              } catch { /* skip */ }
            });
          } catch { /* skip user balances on failure */ }
        }

        // Decode and build pool objects
        for (let i = 0; i < pairAddresses.length; i++) {
          const baseIdx = i * 4;
          try {
            const token0Addr = pairInterface.decodeFunctionResult('token0', detailResults[baseIdx])[0];
            const token1Addr = pairInterface.decodeFunctionResult('token1', detailResults[baseIdx + 1])[0];
            const resResult = pairInterface.decodeFunctionResult('getReserves', detailResults[baseIdx + 2]);
            const totalSupply = pairInterface.decodeFunctionResult('totalSupply', detailResults[baseIdx + 3])[0];

            const getTokenInfo = (addr: string) => {
              const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
              if (known) return { address: addr, symbol: known.symbol, name: known.name, logoURI: known.logoURI };
              return { address: addr, symbol: addr.slice(0, 6) + '...', name: 'Unknown Token', logoURI: undefined };
            };

            const token0 = getTokenInfo(token0Addr);
            const token1 = getTokenInfo(token1Addr);
            const reserve0 = parseFloat(ethers.formatEther(resResult[0]));
            const reserve1 = parseFloat(ethers.formatEther(resResult[1]));
            const tvl = reserve0 + reserve1;
            const volume24h = tvl * 0.12;
            const fees24h = volume24h * 0.003;
            const apr = tvl > 0 ? (fees24h * 365 / tvl) * 100 : 0;
            const totalSupplyNum = parseFloat(ethers.formatEther(totalSupply));
            
            let userLpBalance = '0';
            let userShare = 0;
            const userBal = userBalanceMap.get(pairAddresses[i].toLowerCase());
            if (userBal && userBal > 0n) {
              userLpBalance = ethers.formatEther(userBal);
              userShare = totalSupplyNum > 0 ? (parseFloat(userLpBalance) / totalSupplyNum) * 100 : 0;
            }

            const addressSeed = parseInt(pairAddresses[i].slice(2, 10), 16);
            const chartData = generateMiniChartData(tvl, addressSeed);

            fetchedPools.push({
              address: pairAddresses[i],
              token0, token1,
              reserve0: ethers.formatEther(resResult[0]),
              reserve1: ethers.formatEther(resResult[1]),
              totalSupply: ethers.formatEther(totalSupply),
              tvl, volume24h, fees24h, apr, chartData, userLpBalance, userShare,
            });
          } catch { /* skip failed pair */ }
        }
      } catch (e) {
        console.warn('[PoolsTable] Multicall failed, falling back:', e);
        // Fallback: sequential (keep existing behavior)
        for (let i = 0; i < pairAddresses.length; i++) {
          try {
            const pair = new ethers.Contract(pairAddresses[i], PAIR_ABI, provider);
            const [token0Addr, token1Addr, reserves, totalSupply] = await Promise.all([
              pair.token0(), pair.token1(), pair.getReserves(), pair.totalSupply(),
            ]);

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
            const addressSeed = parseInt(pairAddresses[i].slice(2, 10), 16);

            fetchedPools.push({
              address: pairAddresses[i],
              token0, token1,
              reserve0: ethers.formatEther(reserves[0]),
              reserve1: ethers.formatEther(reserves[1]),
              totalSupply: ethers.formatEther(totalSupply),
              tvl, volume24h, fees24h, apr,
              chartData: generateMiniChartData(tvl, addressSeed),
              userLpBalance: '0', userShare: 0,
            });
          } catch { continue; }
          await new Promise(r => setTimeout(r, 400));
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
  }, [pools.length, userAddress, isConnected, hasExternalPools]);

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

  return (
    <div className="space-y-4">
      {/* Enhanced Filter Bar using new component */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PoolFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showFavoritesOnly={showFavoritesOnly}
          onToggleFavorites={() => {
            setShowFavoritesOnly(!showFavoritesOnly);
            if (!showFavoritesOnly) setShowMyPositions(false);
          }}
          showMyPositions={showMyPositions}
          onToggleMyPositions={() => {
            setShowMyPositions(!showMyPositions);
            if (!showMyPositions) setShowFavoritesOnly(false);
          }}
          isConnected={isConnected}
          favoritesCount={favorites.length}
          totalPools={pools.length}
          filteredCount={displayedPools.length}
          minTvl={minTvl}
          onMinTvlChange={setMinTvl}
          minApr={minApr}
          onMinAprChange={setMinApr}
        />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => hasExternalPools && onRefresh ? onRefresh() : fetchPools(true)}
          disabled={hasExternalPools ? externalRefreshing : isRefreshing}
          className="h-9 px-3"
        >
          <RefreshCw className={`w-4 h-4 ${(hasExternalPools ? externalRefreshing : isRefreshing) ? 'animate-spin' : ''}`} />
        </Button>
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
      {(hasExternalPools ? externalLoading : loading) && pools.length === 0 && <LoadingSkeletons />}

      {/* Empty State */}
      {!(hasExternalPools ? externalLoading : loading) && pools.length === 0 && (
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
