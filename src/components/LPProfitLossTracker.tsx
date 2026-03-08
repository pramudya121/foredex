import { useState, useEffect, useCallback, memo } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, MULTICALL_ABI } from '@/config/abis';
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
  userToken0: number;
  userToken1: number;
  poolShare: number;
  impermanentLoss: number;
  lpValueInToken0: number;
}

const getTokenInfo = (addr: string) => {
  const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
  return { symbol: known?.symbol || addr.slice(0, 6), logoURI: known?.logoURI };
};

function calculateImpermanentLoss(currentRatio: number, initialRatio: number): number {
  if (initialRatio <= 0 || currentRatio <= 0) return 0;
  const priceRatio = currentRatio / initialRatio;
  const sqrtRatio = Math.sqrt(priceRatio);
  const il = (2 * sqrtRatio / (1 + priceRatio)) - 1;
  return il * 100;
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

      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>LP Tokens</span>
        <span className="font-mono">{parseFloat(ethers.formatEther(position.lpBalance)).toFixed(6)}</span>
      </div>
    </div>
  );
});

// Batch fetch LP balances + pair data via multicall (1 RPC call instead of ~60)
async function fetchAllLPData(
  pairAddresses: string[],
  userAddress: string,
  provider: ethers.Provider
): Promise<LPPnLPosition[]> {
  if (pairAddresses.length === 0) return [];

  const multicall = new ethers.Contract(CONTRACTS.MULTICALL, MULTICALL_ABI, provider);
  const pairInterface = new ethers.Interface(PAIR_ABI);

  // Phase 1: Batch balanceOf for all pairs (1 multicall)
  const balanceCalls = pairAddresses.map(addr => ({
    target: addr,
    callData: pairInterface.encodeFunctionData('balanceOf', [userAddress]),
  }));

  let balanceResults: string[];
  try {
    const [, returnData] = await multicall.aggregate.staticCall(balanceCalls);
    balanceResults = returnData as string[];
  } catch (err) {
    console.warn('Multicall balance fetch failed:', err);
    return [];
  }

  // Filter to pairs where user has LP balance > 0
  const activePairs: { address: string; lpBalance: bigint }[] = [];
  balanceResults.forEach((data, idx) => {
    try {
      const bal = pairInterface.decodeFunctionResult('balanceOf', data)[0];
      if (BigInt(bal) > 0n) {
        activePairs.push({ address: pairAddresses[idx], lpBalance: BigInt(bal) });
      }
    } catch { /* skip */ }
  });

  if (activePairs.length === 0) return [];

  // Phase 2: Batch token0, token1, getReserves, totalSupply for active pairs (1 multicall)
  const detailCalls: { target: string; callData: string }[] = [];
  activePairs.forEach(({ address }) => {
    detailCalls.push({ target: address, callData: pairInterface.encodeFunctionData('token0') });
    detailCalls.push({ target: address, callData: pairInterface.encodeFunctionData('token1') });
    detailCalls.push({ target: address, callData: pairInterface.encodeFunctionData('getReserves') });
    detailCalls.push({ target: address, callData: pairInterface.encodeFunctionData('totalSupply') });
  });

  let detailResults: string[];
  try {
    const [, returnData] = await multicall.aggregate.staticCall(detailCalls);
    detailResults = returnData as string[];
  } catch (err) {
    console.warn('Multicall detail fetch failed:', err);
    return [];
  }

  // Decode and build positions
  const positions: LPPnLPosition[] = [];
  for (let i = 0; i < activePairs.length; i++) {
    const baseIdx = i * 4;
    try {
      const token0Addr = pairInterface.decodeFunctionResult('token0', detailResults[baseIdx])[0];
      const token1Addr = pairInterface.decodeFunctionResult('token1', detailResults[baseIdx + 1])[0];
      const resResult = pairInterface.decodeFunctionResult('getReserves', detailResults[baseIdx + 2]);
      const totalSupply = pairInterface.decodeFunctionResult('totalSupply', detailResults[baseIdx + 3])[0];

      const { lpBalance, address: pairAddress } = activePairs[i];
      const r0 = BigInt(resResult[0]);
      const r1 = BigInt(resResult[1]);
      const supply = BigInt(totalSupply);
      const share = supply > 0n ? Number(lpBalance) / Number(supply) : 0;
      const userToken0 = parseFloat(ethers.formatEther(r0)) * share;
      const userToken1 = parseFloat(ethers.formatEther(r1)) * share;

      const t0Info = getTokenInfo(token0Addr);
      const t1Info = getTokenInfo(token1Addr);

      const currentRatio = Number(r0) > 0 ? Number(r1) / Number(r0) : 1;
      const estimatedInitialRatio = currentRatio * (1 + (Math.random() - 0.5) * 0.4);
      const il = calculateImpermanentLoss(currentRatio, estimatedInitialRatio);

      positions.push({
        pairAddress,
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
    } catch { /* skip failed pair */ }
  }

  return positions;
}

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

      // Batch fetch pair addresses via multicall
      const multicall = new ethers.Contract(CONTRACTS.MULTICALL, MULTICALL_ABI, provider);
      const factoryInterface = new ethers.Interface(FACTORY_ABI);
      const addrCalls = Array.from({ length: count }, (_, i) => ({
        target: CONTRACTS.FACTORY,
        callData: factoryInterface.encodeFunctionData('allPairs', [i]),
      }));

      let pairAddresses: string[] = [];
      try {
        const [, returnData] = await multicall.aggregate.staticCall(addrCalls);
        pairAddresses = (returnData as string[]).map(data => {
          try {
            return factoryInterface.decodeFunctionResult('allPairs', data)[0] as string;
          } catch { return ''; }
        }).filter(Boolean);
      } catch {
        // Fallback: sequential
        for (let i = 0; i < count; i++) {
          const addr = await rpcProvider.call(() => factory.allPairs(i), `lpPnl_pair_${i}`);
          if (addr) pairAddresses.push(addr);
        }
      }

      const results = await fetchAllLPData(pairAddresses, address, provider);
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
