import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TokenLogo } from '@/components/TokenLogo';
import { InteractivePoolChart } from '@/components/pools/InteractivePoolChart';
import { PairMaintenance } from '@/components/PairMaintenance';
import { 
  ArrowLeft, 
  Flame, 
  Layers, 
  TrendingUp, 
  ExternalLink,
  Copy,
  Check,
  Percent,
  DollarSign,
  Plus,
  Share2,
  Star,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFavoritePoolsStore } from '@/stores/favoritePoolsStore';

interface PoolData {
  address: string;
  token0: { address: string; symbol: string; name: string; logoURI?: string };
  token1: { address: string; symbol: string; name: string; logoURI?: string };
  reserve0: number;
  reserve1: number;
  totalSupply: string;
  tvl: number;
  volume24h: number;
  fees24h: number;
  apr: number;
  price0: number;
  price1: number;
}

// Generate historical data for charts (90 days for more interactive range)
const generateHistoricalData = (currentTVL: number, currentAPR: number, days: number = 90) => {
  const data = [];
  const now = Date.now();
  
  // Create a seed for consistent randomness per pool
  let seed = currentTVL * 1000 + currentAPR * 100;
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  
  for (let i = days; i >= 0; i--) {
    const timestamp = now - (i * 24 * 60 * 60 * 1000);
    const date = new Date(timestamp);
    const dayStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Simulate realistic market patterns
    const progress = (days - i) / days;
    const weekCycle = Math.sin((days - i) / 7 * Math.PI * 2) * 0.05;
    const trend = progress * 0.3;
    const noise = (seededRandom() - 0.5) * 0.12;
    
    const tvl = currentTVL * (0.5 + trend + weekCycle + noise);
    const apr = currentAPR * (0.7 + seededRandom() * 0.6);
    const volume = tvl * (0.08 + seededRandom() * 0.12);
    const fees = volume * 0.003;
    
    data.push({
      date: dayStr,
      timestamp,
      tvl: Math.max(0, tvl),
      apr: Math.max(0, apr),
      volume: Math.max(0, volume),
      fees: Math.max(0, fees),
    });
  }
  
  return data;
};

export default function LiquidityPoolDetailPage() {
  const { address } = useParams();
  const navigate = useNavigate();
  const [pool, setPool] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const { isFavorite, toggleFavorite } = useFavoritePoolsStore();

  const copyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      toast.success('Address copied!');
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  }, [address]);

  useEffect(() => {
    const fetchPoolData = async () => {
      if (!address) return;
      
      setLoading(true);
      const provider = rpcProvider.getProvider();
      
      if (!provider || !rpcProvider.isAvailable()) {
        setLoading(false);
        return;
      }

      try {
        const pair = new ethers.Contract(address, PAIR_ABI, provider);
        
        const [token0Addr, token1Addr, reserves, totalSupply] = await Promise.all([
          rpcProvider.call(() => pair.token0(), 'poolDetail_token0'),
          rpcProvider.call(() => pair.token1(), 'poolDetail_token1'),
          rpcProvider.call(() => pair.getReserves(), 'poolDetail_reserves'),
          rpcProvider.call(() => pair.totalSupply(), 'poolDetail_supply'),
        ]);

        if (!token0Addr || !token1Addr || !reserves || !totalSupply) {
          setLoading(false);
          return;
        }

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
        const price0 = reserve1 > 0 ? reserve0 / reserve1 : 0;
        const price1 = reserve0 > 0 ? reserve1 / reserve0 : 0;

        setPool({
          address,
          token0,
          token1,
          reserve0,
          reserve1,
          totalSupply: ethers.formatEther(totalSupply),
          tvl,
          volume24h,
          fees24h,
          apr,
          price0,
          price1,
        });
      } catch (error) {
        console.warn('Failed to fetch pool data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPoolData();
  }, [address]);

  const historicalData = useMemo(() => {
    if (!pool) return [];
    return generateHistoricalData(pool.tvl, pool.apr, 90);
  }, [pool]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  if (loading) {
    return (
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-10 w-32 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full mb-6" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate('/pools')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pools
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">Pool Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The liquidity pool you're looking for doesn't exist or couldn't be loaded.
            </p>
            <Link to="/pools">
              <Button className="bg-gradient-wolf">View All Pools</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const pairName = `${pool.token0.symbol}/${pool.token1.symbol}`;

  return (
    <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
      <Button variant="ghost" onClick={() => navigate('/pools')} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pools
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            <TokenLogo symbol={pool.token0.symbol} logoURI={pool.token0.logoURI} size="xl" className="border-2 border-card z-10" />
            <TokenLogo symbol={pool.token1.symbol} logoURI={pool.token1.logoURI} size="xl" className="border-2 border-card" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{pairName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                <Percent className="w-3 h-3 mr-1" />
                0.3% fee
              </Badge>
              <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30">
                <Flame className="w-3 h-3 mr-1" />
                {pool.apr.toFixed(1)}% APR
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to={`/liquidity?token0=${pool.token0.address}&token1=${pool.token1.address}`}>
            <Button className="bg-gradient-wolf">
              <Plus className="w-4 h-4 mr-2" />
              Add Liquidity
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowMaintenance(!showMaintenance)}
            className={showMaintenance ? 'bg-muted' : ''}
          >
            <Wrench className="w-4 h-4" />
          </Button>
          <a
            href={`${NEXUS_TESTNET.blockExplorer}/address/${pool.address}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="icon">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Layers className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value Locked</p>
                <p className="text-xl font-bold">{formatNumber(pool.tvl)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">24h Volume</p>
                <p className="text-xl font-bold">{formatNumber(pool.volume24h)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <DollarSign className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">24h Fees</p>
                <p className="text-xl font-bold text-green-500">{formatNumber(pool.fees24h)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/10">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">APR</p>
                <p className={cn(
                  'text-xl font-bold',
                  pool.apr > 50 ? 'text-green-500' : 'text-foreground'
                )}>
                  {pool.apr.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Chart Section */}
      <InteractivePoolChart data={historicalData} className="mb-8" />

      {/* Pool Maintenance Panel */}
      {showMaintenance && (
        <div className="mb-8">
          <PairMaintenance 
            pairAddress={pool.address}
            token0Symbol={pool.token0.symbol}
            token1Symbol={pool.token1.symbol}
          />
        </div>
      )}

      {/* Pool Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pool Composition */}
        <Card>
          <CardHeader>
            <CardTitle>Pool Composition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <TokenLogo symbol={pool.token0.symbol} logoURI={pool.token0.logoURI} size="md" />
                <div>
                  <p className="font-semibold">{pool.token0.symbol}</p>
                  <p className="text-xs text-muted-foreground">{pool.token0.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{pool.reserve0.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">
                  1 {pool.token0.symbol} = {pool.price1.toFixed(6)} {pool.token1.symbol}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <TokenLogo symbol={pool.token1.symbol} logoURI={pool.token1.logoURI} size="md" />
                <div>
                  <p className="font-semibold">{pool.token1.symbol}</p>
                  <p className="text-xs text-muted-foreground">{pool.token1.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{pool.reserve1.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">
                  1 {pool.token1.symbol} = {pool.price0.toFixed(6)} {pool.token0.symbol}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">LP Token Address</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                  {pool.address.slice(0, 10)}...{pool.address.slice(-8)}
                </code>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={copyAddress}>
                  {copiedAddress ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Total LP Supply</span>
              <span className="font-mono text-sm">{parseFloat(pool.totalSupply).toFixed(6)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Fee Tier</span>
              <span>0.3%</span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Network</span>
              <Badge variant="outline">{NEXUS_TESTNET.name}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
