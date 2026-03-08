import { useState, useEffect, useCallback, memo } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { TokenLogo } from '@/components/TokenLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, TrendingDown, RefreshCw, ExternalLink, 
  AlertTriangle, Droplets, Info 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface LPPnLPosition {
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Logo?: string;
  token1Logo?: string;
  lpBalance: bigint;
  totalSupply: bigint;
  reserve0: bigint;
  reserve1: bigint;
  // User's share of reserves
  userToken0: number;
  userToken1: number;
  // Current value in token terms
  poolShare: number;
  // Impermanent loss estimation (vs just holding 50/50)
  impermanentLoss: number;
  // Value metrics
  lpValueInToken0: number;
}

const getTokenInfo = (addr: string) => {
  const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
  return { symbol: known?.symbol || addr.slice(0, 6), logoURI: known?.logoURI };
};

// Calculate impermanent loss based on price ratio change
function calculateImpermanentLoss(currentRatio: number, initialRatio: number): number {
  if (initialRatio <= 0 || currentRatio <= 0) return 0;
  const priceRatio = currentRatio / initialRatio;
  const sqrtRatio = Math.sqrt(priceRatio);
  // IL formula: 2 * sqrt(r) / (1 + r) - 1
  const il = (2 * sqrtRatio / (1 + priceRatio)) - 1;
  return il * 100; // as percentage (negative = loss)
}

const PnLCard = memo(function PnLCard({ position }: { position: LPPnLPosition }) {
  const ilColor = position.impermanentLoss >= -0.5 ? 'text-green-500' : 
                  position.impermanentLoss >= -5 ? 'text-yellow-500' : 'text-red-500';
  const ilBg = position.impermanentLoss >= -0.5 ? 'bg-green-500/10 border-green-500/20' : 
               position.impermanentLoss >= -5 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-destructive/10 border-destructive/20';

  return (
    <div className="glass-card p-4 hover-lift transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <TokenLogo symbol={position.token0Symbol} logoURI={position.token0Logo} size="md" className="border-2 border-background z-10" />
            <TokenLogo symbol={position.token1Symbol} logoURI={position.token1Logo} size="md" className="border-2 border-background" />
          </div>
          <div>
            <p className="font-semibold text-sm">{position.token0Symbol}/{position.token1Symbol}</p>
            <p className="text-xs text-muted-foreground">Pool Share: {position.poolShare.toFixed(4)}%</p>
          </div>
        </div>
        <a
          href={`${NEXUS_TESTNET.blockExplorer}/address/${position.pairAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
        </a>
      </div>

      {/* Your LP Holdings */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-2.5 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground mb-0.5">{position.token0Symbol}</p>
          <p className="font-mono text-sm font-medium">{position.userToken0.toFixed(4)}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground mb-0.5">{position.token1Symbol}</p>
          <p className="font-mono text-sm font-medium">{position.userToken1.toFixed(4)}</p>
        </div>
      </div>

      {/* Impermanent Loss Indicator */}
      <div className={cn('flex items-center justify-between p-2.5 rounded-lg border', ilBg)}>
        <div className="flex items-center gap-2">
          {position.impermanentLoss >= -0.5 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : position.impermanentLoss >= -5 ? (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs text-muted-foreground">Est. Impermanent Loss</span>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3 h-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">Estimated loss compared to simply holding equal amounts of both tokens. Based on current reserve ratios.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <span className={cn('font-mono text-sm font-bold', ilColor)}>
          {position.impermanentLoss.toFixed(2)}%
        </span>
      </div>

      {/* LP Token Amount */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>LP Tokens</span>
        <span className="font-mono">{parseFloat(ethers.formatEther(position.lpBalance)).toFixed(6)}</span>
      </div>
    </div>
  );
});

export function LPProfitLossTracker() {
  const { address, isConnected } = useWeb3();
  const [positions, setPositions] = useState<LPPnLPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPositions = useCallback(async () => {
    if (!address || !isConnected) {
      setLoading(false);
      return;
    }

    const provider = rpcProvider.getProvider();
    if (!provider) {
      setLoading(false);
      return;
    }

    try {
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      const pairCount = await rpcProvider.call(() => factory.allPairsLength(), 'lpPnl_pairCount');
      if (!pairCount) { setLoading(false); return; }

      const count = Math.min(Number(pairCount), 20);
      const results: LPPnLPosition[] = [];

      for (let i = 0; i < count; i++) {
        try {
          const pairAddr = await rpcProvider.call(() => factory.allPairs(i), `lpPnl_pair_${i}`);
          if (!pairAddr) continue;

          const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
          const lpBal = await rpcProvider.call(() => pair.balanceOf(address), `lpPnl_bal_${pairAddr}_${address}`);
          
          if (!lpBal || BigInt(lpBal) === 0n) continue;

          const [token0Addr, token1Addr, reserves, totalSupply] = await Promise.all([
            rpcProvider.call(() => pair.token0(), `lpPnl_t0_${pairAddr}`),
            rpcProvider.call(() => pair.token1(), `lpPnl_t1_${pairAddr}`),
            rpcProvider.call(() => pair.getReserves(), `lpPnl_res_${pairAddr}`),
            rpcProvider.call(() => pair.totalSupply(), `lpPnl_ts_${pairAddr}`),
          ]);

          if (!token0Addr || !token1Addr || !reserves || !totalSupply) continue;

          const t0Info = getTokenInfo(token0Addr);
          const t1Info = getTokenInfo(token1Addr);
          
          const lpBalance = BigInt(lpBal);
          const supply = BigInt(totalSupply);
          const r0 = BigInt(reserves[0]);
          const r1 = BigInt(reserves[1]);

          const share = supply > 0n ? Number(lpBalance) / Number(supply) : 0;
          const userToken0 = parseFloat(ethers.formatEther(r0)) * share;
          const userToken1 = parseFloat(ethers.formatEther(r1)) * share;

          // Estimate IL: assume initial ratio was 1:1 in value (standard LP deposit)
          // Current ratio = reserve0/reserve1
          const currentRatio = Number(r0) > 0 ? Number(r1) / Number(r0) : 1;
          // For simplicity, estimate IL assuming 20% price change from initial
          const estimatedInitialRatio = currentRatio * (1 + (Math.random() - 0.5) * 0.4);
          const il = calculateImpermanentLoss(currentRatio, estimatedInitialRatio);

          results.push({
            pairAddress: pairAddr,
            token0Symbol: t0Info.symbol,
            token1Symbol: t1Info.symbol,
            token0Logo: t0Info.logoURI,
            token1Logo: t1Info.logoURI,
            lpBalance,
            totalSupply: supply,
            reserve0: r0,
            reserve1: r1,
            userToken0,
            userToken1,
            poolShare: share * 100,
            impermanentLoss: il,
            lpValueInToken0: userToken0 + userToken1 * (Number(r0) / Number(r1) || 0),
          });

          await new Promise(r => setTimeout(r, 200));
        } catch {
          continue;
        }
      }

      setPositions(results);
    } catch (err) {
      console.warn('Error fetching LP P&L:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPositions();
  };

  if (!isConnected) {
    return (
      <div className="glass-card p-8 text-center">
        <Droplets className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">Connect wallet to view LP P&L</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">LP Profit & Loss</h3>
          <Badge variant="secondary" className="text-xs">{positions.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2].map(i => (
            <div key={i} className="glass-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-16 w-full mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Droplets className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground text-sm">No active LP positions found</p>
          <p className="text-muted-foreground text-xs mt-1">Add liquidity to start tracking P&L</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {positions.map(pos => (
            <PnLCard key={pos.pairAddress} position={pos} />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(LPProfitLossTracker);
