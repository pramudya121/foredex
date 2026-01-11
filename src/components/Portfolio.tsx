import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { FARMING_ABI } from '@/config/farmingAbi';
import { Wallet, Droplets, Sprout, History, ExternalLink, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { TokenLogo } from './TokenLogo';
import { TransactionHistory } from './TransactionHistory';
import { PortfolioValueChart } from './PortfolioValueChart';
import { rpcProvider } from '@/lib/rpcProvider';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  address: string;
  logoURI?: string;
}

interface LPPosition {
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Logo?: string;
  token1Logo?: string;
  lpBalance: string;
  share: string;
}

interface FarmingPosition {
  pid: number;
  lpToken: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Logo?: string;
  token1Logo?: string;
  stakedAmount: string;
  pendingReward: string;
}

// Cache for portfolio data
interface PortfolioCache {
  tokenBalances: TokenBalance[];
  lpPositions: LPPosition[];
  farmingPositions: FarmingPosition[];
  timestamp: number;
  address: string;
}

let portfolioCache: PortfolioCache | null = null;
const CACHE_TTL = 60000; // 1 minute

export function Portfolio() {
  const { address, isConnected, balance } = useWeb3();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [farmingPositions, setFarmingPositions] = useState<FarmingPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [loadingLP, setLoadingLP] = useState(true);
  const [loadingFarming, setLoadingFarming] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Check if cache is valid
  const isCacheValid = useCallback(() => {
    return portfolioCache &&
      portfolioCache.address === address &&
      Date.now() - portfolioCache.timestamp < CACHE_TTL;
  }, [address]);

  // Fetch token balances
  const fetchTokenBalances = useCallback(async () => {
    if (!address) return [];
    
    const provider = rpcProvider.getProvider();
    if (!provider) return [];

    setLoadingTokens(true);
    const balances: TokenBalance[] = [];
    const tokens = TOKEN_LIST.filter(t => t.address !== '0x0000000000000000000000000000000000000000');

    // Fetch balances in parallel batches
    const batchSize = 5;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(async (token) => {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const bal = await rpcProvider.call(
            () => contract.balanceOf(address),
            `portfolio_token_${token.address}_${address}`,
            { skipCache: refreshing }
          );
          return { token, balance: bal };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.balance && result.value.balance > 0n) {
          const { token, balance: bal } = result.value;
          balances.push({
            symbol: token.symbol,
            name: token.name,
            balance: ethers.formatUnits(bal, token.decimals),
            address: token.address,
            logoURI: token.logoURI,
          });
        }
      }
    }

    if (mountedRef.current) {
      setTokenBalances(balances);
      setLoadingTokens(false);
    }
    return balances;
  }, [address, refreshing]);

  // Fetch LP positions
  const fetchLPPositions = useCallback(async () => {
    if (!address) return [];

    const provider = rpcProvider.getProvider();
    if (!provider) return [];

    setLoadingLP(true);
    const positions: LPPosition[] = [];

    try {
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      const pairCount = await rpcProvider.call(
        () => factory.allPairsLength(),
        'portfolio_pair_count',
        { skipCache: refreshing }
      );

      if (!pairCount || Number(pairCount) === 0) {
        if (mountedRef.current) {
          setLpPositions([]);
          setLoadingLP(false);
        }
        return [];
      }

      const maxPairs = Math.min(Number(pairCount), 20);
      
      // Get all pair addresses first
      const pairAddresses: string[] = [];
      for (let i = 0; i < maxPairs; i++) {
        try {
          const addr = await rpcProvider.call(
            () => factory.allPairs(i),
            `portfolio_pair_addr_${i}`,
            { skipCache: refreshing }
          );
          if (addr && addr !== ethers.ZeroAddress) {
            pairAddresses.push(addr);
          }
        } catch {
          // Skip invalid pairs
        }
      }

      // Check LP balances in parallel
      const lpResults = await Promise.allSettled(
        pairAddresses.map(async (pairAddress) => {
          const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
          const lpBalance = await rpcProvider.call(
            () => pair.balanceOf(address),
            `portfolio_lp_bal_${pairAddress}_${address}`,
            { skipCache: true }
          );
          return { pairAddress, lpBalance };
        })
      );

      // Get details for pairs with balance
      for (const result of lpResults) {
        if (result.status === 'fulfilled') {
          const { pairAddress, lpBalance } = result.value;
          if (lpBalance && lpBalance > 0n) {
            try {
              const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
              const [token0Addr, token1Addr, totalSupply] = await Promise.all([
                pair.token0(),
                pair.token1(),
                pair.totalSupply(),
              ]);

              const getTokenInfo = (addr: string) => {
                const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
                return { symbol: known?.symbol || 'UNKNOWN', logoURI: known?.logoURI };
              };

              const token0Info = getTokenInfo(token0Addr);
              const token1Info = getTokenInfo(token1Addr);
              const share = totalSupply > 0n ? (Number(lpBalance) / Number(totalSupply)) * 100 : 0;

              positions.push({
                pairAddress,
                token0Symbol: token0Info.symbol,
                token1Symbol: token1Info.symbol,
                token0Logo: token0Info.logoURI,
                token1Logo: token1Info.logoURI,
                lpBalance: ethers.formatEther(lpBalance),
                share: share.toFixed(2),
              });
            } catch {
              // Skip if can't get details
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching LP positions:', err);
    }

    if (mountedRef.current) {
      setLpPositions(positions);
      setLoadingLP(false);
    }
    return positions;
  }, [address, refreshing]);

  // Fetch farming positions
  const fetchFarmingPositions = useCallback(async () => {
    if (!address) return [];

    const provider = rpcProvider.getProvider();
    if (!provider) return [];

    setLoadingFarming(true);
    const positions: FarmingPosition[] = [];

    try {
      const farming = new ethers.Contract(CONTRACTS.FARMING, FARMING_ABI, provider);
      const poolCount = await rpcProvider.call(
        () => farming.poolLength(),
        'portfolio_farm_pool_count',
        { skipCache: refreshing }
      );

      if (!poolCount || Number(poolCount) === 0) {
        if (mountedRef.current) {
          setFarmingPositions([]);
          setLoadingFarming(false);
        }
        return [];
      }

      const maxPools = Math.min(Number(poolCount), 20);

      // Check all pools in parallel
      const results = await Promise.allSettled(
        Array.from({ length: maxPools }, (_, pid) => 
          (async () => {
            const [poolInfo, userInfo, pendingReward] = await Promise.all([
              farming.poolInfo(pid),
              farming.userInfo(pid, address),
              farming.pendingReward(pid, address),
            ]);
            return { pid, poolInfo, userInfo, pendingReward };
          })()
        )
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { pid, poolInfo, userInfo, pendingReward } = result.value;
          const stakedAmount = userInfo?.amount || 0n;

          if (stakedAmount > 0n || pendingReward > 0n) {
            const lpToken = poolInfo?.lpToken || poolInfo[0];
            
            // Try to get LP token info
            let token0Symbol = 'Token0';
            let token1Symbol = 'Token1';
            let token0Logo: string | undefined;
            let token1Logo: string | undefined;

            try {
              const pair = new ethers.Contract(lpToken, PAIR_ABI, provider);
              const [token0Addr, token1Addr] = await Promise.all([
                pair.token0(),
                pair.token1(),
              ]);

              const getTokenInfo = (addr: string) => {
                const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
                return { symbol: known?.symbol || 'UNKNOWN', logoURI: known?.logoURI };
              };

              const t0Info = getTokenInfo(token0Addr);
              const t1Info = getTokenInfo(token1Addr);
              token0Symbol = t0Info.symbol;
              token1Symbol = t1Info.symbol;
              token0Logo = t0Info.logoURI;
              token1Logo = t1Info.logoURI;
            } catch {
              // Use defaults
            }

            positions.push({
              pid,
              lpToken,
              token0Symbol,
              token1Symbol,
              token0Logo,
              token1Logo,
              stakedAmount: ethers.formatEther(stakedAmount),
              pendingReward: ethers.formatEther(pendingReward),
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching farming positions:', err);
    }

    if (mountedRef.current) {
      setFarmingPositions(positions);
      setLoadingFarming(false);
    }
    return positions;
  }, [address, refreshing]);

  // Main fetch function
  const fetchPortfolio = useCallback(async (forceRefresh = false) => {
    if (!address) {
      setLoading(false);
      setLoadingTokens(false);
      setLoadingLP(false);
      setLoadingFarming(false);
      return;
    }

    // Use cache if available and not forcing refresh
    if (!forceRefresh && isCacheValid()) {
      setTokenBalances(portfolioCache!.tokenBalances);
      setLpPositions(portfolioCache!.lpPositions);
      setFarmingPositions(portfolioCache!.farmingPositions);
      setLoading(false);
      setLoadingTokens(false);
      setLoadingLP(false);
      setLoadingFarming(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [tokens, lps, farms] = await Promise.all([
        fetchTokenBalances(),
        fetchLPPositions(),
        fetchFarmingPositions(),
      ]);

      // Update cache
      portfolioCache = {
        tokenBalances: tokens,
        lpPositions: lps,
        farmingPositions: farms,
        timestamp: Date.now(),
        address,
      };
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError('Failed to load portfolio data');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [address, isCacheValid, fetchTokenBalances, fetchLPPositions, fetchFarmingPositions]);

  useEffect(() => {
    mountedRef.current = true;
    fetchPortfolio();

    // Refresh every 2 minutes
    const interval = setInterval(() => fetchPortfolio(), 120000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchPortfolio]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPortfolio(true);
  };

  // Calculate totals
  const totalStats = useMemo(() => {
    const totalTokenValue = tokenBalances.reduce((acc, t) => acc + parseFloat(t.balance), 0);
    const totalLPValue = lpPositions.reduce((acc, p) => acc + parseFloat(p.lpBalance), 0);
    const totalStaked = farmingPositions.reduce((acc, p) => acc + parseFloat(p.stakedAmount), 0);
    const totalPending = farmingPositions.reduce((acc, p) => acc + parseFloat(p.pendingReward), 0);
    
    return { totalTokenValue, totalLPValue, totalStaked, totalPending };
  }, [tokenBalances, lpPositions, farmingPositions]);

  if (!isConnected) {
    return (
      <div className="glass-card p-12 text-center animate-fade-in">
        <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground">
          Connect your wallet to view your portfolio
        </p>
      </div>
    );
  }

  // Loading skeleton
  const LoadingSkeleton = ({ label }: { label: string }) => (
    <div className="glass-card p-4 sm:p-6 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold">Portfolio</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground font-mono">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto">
            Retry
          </Button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
        <div className="glass-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">NEX Balance</p>
          <p className="text-base sm:text-xl font-bold">{parseFloat(balance).toFixed(4)}</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Token Holdings</p>
          {loadingTokens ? (
            <Skeleton className="h-6 w-12 mt-1" />
          ) : (
            <p className="text-base sm:text-xl font-bold">{tokenBalances.length}</p>
          )}
        </div>
        <div className="glass-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">LP Positions</p>
          {loadingLP ? (
            <Skeleton className="h-6 w-12 mt-1" />
          ) : (
            <p className="text-base sm:text-xl font-bold">{lpPositions.length}</p>
          )}
        </div>
        <div className="glass-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Farming Positions</p>
          {loadingFarming ? (
            <Skeleton className="h-6 w-12 mt-1" />
          ) : (
            <p className="text-base sm:text-xl font-bold">{farmingPositions.length}</p>
          )}
        </div>
        <div className="glass-card p-3 sm:p-4 col-span-2 lg:col-span-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Pending Rewards</p>
          {loadingFarming ? (
            <Skeleton className="h-6 w-16 mt-1" />
          ) : (
            <p className="text-base sm:text-xl font-bold text-primary">
              {totalStats.totalPending.toFixed(4)} FRDX
            </p>
          )}
        </div>
      </div>

      {/* Portfolio Value Charts */}
      <PortfolioValueChart />

      {/* Native Balance */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <TokenLogo symbol="NEX" logoURI="/tokens/nex.jpg" size="lg" />
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">NEX Balance</p>
            <p className="text-lg sm:text-2xl font-bold">{parseFloat(balance).toFixed(4)} NEX</p>
          </div>
        </div>
      </div>

      {/* Token Holdings */}
      {loadingTokens ? (
        <LoadingSkeleton label="Token Holdings" />
      ) : (
        <div className="glass-card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Token Holdings
            <Badge variant="secondary" className="ml-2">{tokenBalances.length}</Badge>
          </h3>
          
          {tokenBalances.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">No tokens found</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {tokenBalances.map((token) => (
                <div
                  key={token.address}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="md" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{token.symbol}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{token.name}</p>
                    </div>
                  </div>
                  <p className="font-mono text-sm sm:text-base shrink-0">{parseFloat(token.balance).toFixed(4)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LP Positions */}
      {loadingLP ? (
        <LoadingSkeleton label="Liquidity Positions" />
      ) : (
        <div className="glass-card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Liquidity Positions
            <Badge variant="secondary" className="ml-2">{lpPositions.length}</Badge>
          </h3>
          
          {lpPositions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">No liquidity positions</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {lpPositions.map((position) => (
                <div
                  key={position.pairAddress}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex -space-x-2">
                      <TokenLogo 
                        symbol={position.token0Symbol} 
                        logoURI={position.token0Logo} 
                        size="md"
                        className="border-2 border-background z-10" 
                      />
                      <TokenLogo 
                        symbol={position.token1Symbol} 
                        logoURI={position.token1Logo} 
                        size="md"
                        className="border-2 border-background" 
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm sm:text-base">{position.token0Symbol}/{position.token1Symbol}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Pool share: {position.share}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <p className="font-mono text-sm sm:text-base">{parseFloat(position.lpBalance).toFixed(6)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">LP Tokens</p>
                    </div>
                    <a
                      href={`${NEXUS_TESTNET.blockExplorer}/address/${position.pairAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors touch-manipulation"
                    >
                      <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Farming Positions */}
      {loadingFarming ? (
        <LoadingSkeleton label="Farming Positions" />
      ) : (
        <div className="glass-card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Sprout className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            Farming Positions
            <Badge variant="secondary" className="ml-2">{farmingPositions.length}</Badge>
          </h3>
          
          {farmingPositions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">No farming positions</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {farmingPositions.map((position) => (
                <div
                  key={position.pid}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex -space-x-2">
                      <TokenLogo 
                        symbol={position.token0Symbol} 
                        logoURI={position.token0Logo} 
                        size="md"
                        className="border-2 border-background z-10" 
                      />
                      <TokenLogo 
                        symbol={position.token1Symbol} 
                        logoURI={position.token1Logo} 
                        size="md"
                        className="border-2 border-background" 
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm sm:text-base">{position.token0Symbol}/{position.token1Symbol}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Pool #{position.pid}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-auto">
                    <div className="text-right">
                      <p className="font-mono text-sm sm:text-base">{parseFloat(position.stakedAmount).toFixed(4)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Staked LP</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm sm:text-base text-primary">{parseFloat(position.pendingReward).toFixed(4)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">FRDX Pending</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="glass-card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <History className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Recent Activity
        </h3>
        <TransactionHistory />
      </div>
    </div>
  );
}