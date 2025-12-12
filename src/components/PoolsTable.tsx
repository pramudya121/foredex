import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { ExternalLink, TrendingUp, Droplets, Percent, ChevronRight, ChevronDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from './TokenLogo';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PoolChart } from './PoolChart';
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
  tvl?: number;
}

function PoolSkeleton() {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="space-y-2 text-right">
            <Skeleton className="h-3 w-12 ml-auto" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-3 w-16 ml-auto" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="w-8 h-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function PoolsTable() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

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

                return {
                  address: pairAddress,
                  token0,
                  token1,
                  reserve0: ethers.formatEther(reserves[0]),
                  reserve1: ethers.formatEther(reserves[1]),
                  totalSupply: ethers.formatEther(totalSupply),
                  tvl,
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card p-4 hidden md:block">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-4">Pool</div>
          <div className="col-span-2 text-right">TVL</div>
          <div className="col-span-2 text-right">APR</div>
          <div className="col-span-3 text-right">Reserves</div>
          <div className="col-span-1"></div>
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
      {!loading && pools.length > 0 && (
        <div className="space-y-3">
          {pools.map((pool) => (
            <Collapsible key={pool.address}>
              <div
                className={cn(
                  'glass-card p-4 hover:border-primary/40 transition-all group',
                  'hover:shadow-lg hover:shadow-primary/5'
                )}
              >
                {/* Desktop View */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                  {/* Pool Info */}
                  <div className="col-span-4 flex items-center gap-4">
                    <div className="flex -space-x-3">
                      <TokenLogo 
                        symbol={pool.token0.symbol} 
                        logoURI={pool.token0.logoURI} 
                        size="lg"
                        className="border-2 border-background z-10 ring-2 ring-background" 
                      />
                      <TokenLogo 
                        symbol={pool.token1.symbol} 
                        logoURI={pool.token1.logoURI} 
                        size="lg"
                        className="border-2 border-background ring-2 ring-background" 
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {pool.token0.symbol}/{pool.token1.symbol}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                          <Percent className="w-3 h-3" />
                          0.3% fee
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* TVL */}
                  <div className="col-span-2 text-right">
                    <p className="font-semibold">${pool.tvl?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                  </div>

                  {/* APR */}
                  <div className="col-span-2 text-right">
                    <p className="font-semibold text-green-500 flex items-center justify-end gap-1">
                      <TrendingUp className="w-4 h-4" />
                      --
                    </p>
                    <p className="text-xs text-muted-foreground">Est. APR</p>
                  </div>

                  {/* Reserves */}
                  <div className="col-span-3 text-right">
                    <p className="font-medium text-sm">
                      {parseFloat(pool.reserve0).toFixed(4)} {pool.token0.symbol}
                    </p>
                    <p className="font-medium text-sm text-muted-foreground">
                      {parseFloat(pool.reserve1).toFixed(4)} {pool.token1.symbol}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end gap-1">
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
                      className="p-2 rounded-lg hover:bg-primary/10 transition-colors group/link"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover/link:text-primary" />
                    </a>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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
                        <h3 className="font-semibold">
                          {pool.token0.symbol}/{pool.token1.symbol}
                        </h3>
                        <span className="text-xs text-primary">0.3% fee</span>
                      </div>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">TVL</p>
                      <p className="font-semibold">${pool.tvl?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">LP Supply</p>
                      <p className="font-semibold">{parseFloat(pool.totalSupply).toFixed(4)}</p>
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
