import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { ExternalLink, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from './TokenLogo';

interface Pool {
  address: string;
  token0: { address: string; symbol: string; name: string; logoURI?: string };
  token1: { address: string; symbol: string; name: string; logoURI?: string };
  reserve0: string;
  reserve1: string;
  totalSupply: string;
}

export function PoolsList() {
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

                // Get token info
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

                return {
                  address: pairAddress,
                  token0,
                  token1,
                  reserve0: ethers.formatEther(reserves[0]),
                  reserve1: ethers.formatEther(reserves[1]),
                  totalSupply: ethers.formatEther(totalSupply),
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

  if (loading) {
    return (
      <div className="glass-card p-8 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Droplets className="w-5 h-5 animate-pulse" />
          <span>Loading pools...</span>
        </div>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="glass-card p-8 animate-fade-in text-center">
        <Droplets className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Pools Found</h3>
        <p className="text-muted-foreground">
          Be the first to create a liquidity pool!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Liquidity Pools</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Droplets className="w-4 h-4" />
          {pools.length} pools
        </div>
      </div>

      <div className="space-y-3">
        {pools.map((pool) => (
          <div
            key={pool.address}
            className={cn(
              'glass-card p-4 hover:border-primary/30 transition-all cursor-pointer group'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Token Pair Icons */}
                <div className="flex -space-x-2">
                  <TokenLogo 
                    symbol={pool.token0.symbol} 
                    logoURI={pool.token0.logoURI} 
                    size="lg"
                    className="border-2 border-background z-10" 
                  />
                  <TokenLogo 
                    symbol={pool.token1.symbol} 
                    logoURI={pool.token1.logoURI} 
                    size="lg"
                    className="border-2 border-background" 
                  />
                </div>

                {/* Pair Name */}
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {pool.token0.symbol} / {pool.token1.symbol}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {pool.address.slice(0, 6)}...{pool.address.slice(-4)}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Reserves</p>
                  <p className="font-medium">
                    {parseFloat(pool.reserve0).toFixed(2)} / {parseFloat(pool.reserve1).toFixed(2)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">LP Supply</p>
                  <p className="font-medium">{parseFloat(pool.totalSupply).toFixed(4)}</p>
                </div>

                <a
                  href={`${NEXUS_TESTNET.blockExplorer}/address/${pool.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
