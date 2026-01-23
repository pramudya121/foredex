import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { 
  Star, 
  Plus, 
  ExternalLink, 
  Percent, 
  TrendingUp, 
  Flame,
  BarChart3,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenLogo } from '@/components/TokenLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BackgroundGradient } from '@/components/ui/background-gradient';
import { BorderBeam } from '@/components/ui/border-beam';
import { NEXUS_TESTNET } from '@/config/contracts';
import { PoolMiniChart } from './PoolMiniChart';

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
  userLpBalance?: string;
  userShare?: number;
}

interface PoolCardProps {
  pool: Pool;
  isFavorite: boolean;
  isConnected: boolean;
  onToggleFavorite: (address: string) => void;
  onCopyAddress: (address: string) => void;
  copiedAddress: string | null;
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export const PoolCard = memo(({
  pool,
  isFavorite,
  isConnected,
  onToggleFavorite,
  onCopyAddress,
  copiedAddress
}: PoolCardProps) => {
  const hasUserPosition = isConnected && pool.userLpBalance && parseFloat(pool.userLpBalance) > 0;

  return (
    <BackgroundGradient 
      className={cn(
        'p-5',
        isFavorite && 'ring-2 ring-yellow-500/30',
        hasUserPosition && 'ring-2 ring-primary/30'
      )}
      containerClassName="group"
    >
      <BorderBeam size={120} duration={8} />
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
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
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
              {pool.token0.symbol}/{pool.token1.symbol}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                <Percent className="w-3 h-3 mr-0.5" />
                0.3% fee
              </Badge>
              {pool.apr > 50 && (
                <Badge className="bg-green-500/20 text-green-500 text-xs px-1.5 py-0">
                  <Flame className="w-3 h-3 mr-0.5" />
                  Hot
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleFavorite(pool.address)}
          className="h-9 w-9 p-0 -mr-2 -mt-1"
        >
          <Star className={cn(
            'w-5 h-5 transition-colors',
            isFavorite 
              ? 'fill-yellow-500 text-yellow-500' 
              : 'text-muted-foreground hover:text-yellow-500'
          )} />
        </Button>
      </div>

      {/* Mini Chart */}
      {pool.chartData && (
        <div className="mb-4 h-16 bg-muted/20 rounded-lg p-2 flex items-center justify-center">
          <PoolMiniChart data={pool.chartData} height={48} showTrend />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">TVL</p>
          <p className="font-bold text-lg">{formatNumber(pool.tvl)}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">APR</p>
          <p className={cn(
            'font-bold text-lg flex items-center gap-1',
            pool.apr > 50 ? 'text-green-500' : pool.apr > 20 ? 'text-primary' : ''
          )}>
            {pool.apr > 50 && <Flame className="w-4 h-4" />}
            {pool.apr.toFixed(1)}%
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
          <p className="font-bold">{formatNumber(pool.volume24h)}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">24h Fees</p>
          <p className="font-bold">{formatNumber(pool.fees24h)}</p>
        </div>
      </div>

      {/* User Position */}
      {hasUserPosition && (
        <div className="bg-primary/10 rounded-lg p-3 mb-4 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Your LP Tokens</p>
              <p className="font-bold text-primary">
                {parseFloat(pool.userLpBalance!).toFixed(6)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Pool Share</p>
              <p className="font-bold text-primary">
                {pool.userShare?.toFixed(4)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reserves */}
      <div className="bg-muted/20 rounded-lg p-3 mb-4">
        <p className="text-xs text-muted-foreground mb-2">Reserves</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TokenLogo symbol={pool.token0.symbol} logoURI={pool.token0.logoURI} size="sm" />
              <span>{pool.token0.symbol}</span>
            </div>
            <span className="font-medium">{parseFloat(pool.reserve0).toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TokenLogo symbol={pool.token1.symbol} logoURI={pool.token1.logoURI} size="sm" />
              <span>{pool.token1.symbol}</span>
            </div>
            <span className="font-medium">{parseFloat(pool.reserve1).toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* LP Contract Address */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5 mb-4">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">LP Contract</p>
          <code className="text-xs font-mono">{truncateAddress(pool.address)}</code>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onCopyAddress(pool.address)}
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

      {/* Actions */}
      <div className="flex gap-2">
        <Link to={`/pools/${pool.address}`} className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <BarChart3 className="w-4 h-4" />
            Details
          </Button>
        </Link>
        <Link
          to={`/liquidity?token0=${pool.token0.address}&token1=${pool.token1.address}`}
          className="flex-1"
        >
          <Button className="w-full bg-gradient-wolf gap-2">
            <Plus className="w-4 h-4" />
            Add Liquidity
          </Button>
        </Link>
      </div>
    </BackgroundGradient>
  );
});

PoolCard.displayName = 'PoolCard';
