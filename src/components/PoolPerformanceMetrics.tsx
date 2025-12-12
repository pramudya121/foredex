import { PoolData } from '@/hooks/usePoolData';
import { TokenLogo } from './TokenLogo';
import { TrendingUp, TrendingDown, Percent, DollarSign, Activity, ArrowUpRight } from 'lucide-react';
import { NEXUS_TESTNET } from '@/config/contracts';

interface PoolPerformanceMetricsProps {
  pools: PoolData[];
  loading: boolean;
}

export function PoolPerformanceMetrics({ pools, loading }: PoolPerformanceMetricsProps) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Pool Performance</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-muted/50 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sortedByTVL = [...pools].sort((a, b) => b.tvl - a.tvl);
  const sortedByVolume = [...pools].sort((a, b) => b.volume24h - a.volume24h);
  const sortedByAPR = [...pools].sort((a, b) => b.apr - a.apr);

  return (
    <div className="space-y-6">
      {/* Top Pools by TVL */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Top Pools by TVL</h3>
          </div>
        </div>
        <div className="space-y-3">
          {sortedByTVL.slice(0, 5).map((pool, index) => (
            <div
              key={pool.pairAddress}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-6">#{index + 1}</span>
                <div className="flex -space-x-2">
                  <TokenLogo symbol={pool.token0.symbol} logoURI={pool.token0.logoURI} size="sm" className="border-2 border-background z-10" />
                  <TokenLogo symbol={pool.token1.symbol} logoURI={pool.token1.logoURI} size="sm" className="border-2 border-background" />
                </div>
                <span className="font-medium">{pool.token0.symbol}/{pool.token1.symbol}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm">${pool.tvl.toFixed(2)}</span>
                <a
                  href={`${NEXUS_TESTNET.blockExplorer}/address/${pool.pairAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Pools by Volume */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Top Pools by Volume (24h)</h3>
        </div>
        <div className="space-y-3">
          {sortedByVolume.slice(0, 5).map((pool, index) => (
            <div
              key={pool.pairAddress}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-6">#{index + 1}</span>
                <div className="flex -space-x-2">
                  <TokenLogo symbol={pool.token0.symbol} logoURI={pool.token0.logoURI} size="sm" className="border-2 border-background z-10" />
                  <TokenLogo symbol={pool.token1.symbol} logoURI={pool.token1.logoURI} size="sm" className="border-2 border-background" />
                </div>
                <span className="font-medium">{pool.token0.symbol}/{pool.token1.symbol}</span>
              </div>
              <span className="font-mono text-sm text-green-500">${pool.volume24h.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Pools by APR */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Percent className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Highest APR Pools</h3>
        </div>
        <div className="space-y-3">
          {sortedByAPR.slice(0, 5).map((pool, index) => (
            <div
              key={pool.pairAddress}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-6">#{index + 1}</span>
                <div className="flex -space-x-2">
                  <TokenLogo symbol={pool.token0.symbol} logoURI={pool.token0.logoURI} size="sm" className="border-2 border-background z-10" />
                  <TokenLogo symbol={pool.token1.symbol} logoURI={pool.token1.logoURI} size="sm" className="border-2 border-background" />
                </div>
                <span className="font-medium">{pool.token0.symbol}/{pool.token1.symbol}</span>
              </div>
              <span className="font-mono text-sm text-primary">{pool.apr.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Price Ratios Table */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Current Price Ratios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-sm text-muted-foreground border-b border-border">
                <th className="text-left py-3 px-2">Pool</th>
                <th className="text-right py-3 px-2">Price (Token0)</th>
                <th className="text-right py-3 px-2">Price (Token1)</th>
                <th className="text-right py-3 px-2">Reserve 0</th>
                <th className="text-right py-3 px-2">Reserve 1</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((pool) => (
                <tr key={pool.pairAddress} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        <TokenLogo symbol={pool.token0.symbol} logoURI={pool.token0.logoURI} size="sm" className="border border-background" />
                        <TokenLogo symbol={pool.token1.symbol} logoURI={pool.token1.logoURI} size="sm" className="border border-background" />
                      </div>
                      <span className="text-sm">{pool.token0.symbol}/{pool.token1.symbol}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-sm">{pool.priceToken0.toFixed(6)}</td>
                  <td className="py-3 px-2 text-right font-mono text-sm">{pool.priceToken1.toFixed(6)}</td>
                  <td className="py-3 px-2 text-right font-mono text-sm">{pool.reserve0}</td>
                  <td className="py-3 px-2 text-right font-mono text-sm">{pool.reserve1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
