import { memo, useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';
import { TOKEN_LIST, CONTRACTS } from '@/config/contracts';
import { ERC20_ABI, FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { Portfolio } from '@/components/Portfolio';
import { Wallet, TrendingUp, Shield, Zap, Sparkles, PieChart, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spotlight } from '@/components/ui/spotlight';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ScrollReveal, RevealSection, StaggeredReveal } from '@/components/ui/scroll-reveal';

// Premium stat card with BorderBeam
const PortfolioStatCard = memo(({ 
  value, 
  label, 
  prefix = "", 
  suffix = "", 
  icon: Icon,
}: {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  icon?: React.ElementType;
}) => (
  <div className="glass-card p-4 text-center hover-lift relative overflow-hidden group transition-all duration-300 hover:border-primary/30">
    <BorderBeam size={60} duration={8} />
    {Icon && (
      <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-primary/10 opacity-50 group-hover:opacity-100 transition-opacity">
        <Icon className="w-3 h-3 text-primary" />
      </div>
    )}
    <p className="text-lg sm:text-xl font-bold text-primary mb-0.5 group-hover:scale-110 transition-transform">
      <NumberTicker value={value} prefix={prefix} suffix={suffix} />
    </p>
    <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
  </div>
));

PortfolioStatCard.displayName = 'PortfolioStatCard';

// Feature badge component
const FeatureBadge = memo(({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs hover-lift transition-all duration-300 hover:bg-primary/15 hover:border-primary/30">
    <Icon className="w-3 h-3 text-primary" />
    <span className="text-muted-foreground">{text}</span>
  </div>
));

FeatureBadge.displayName = 'FeatureBadge';

const PortfolioPage = () => {
  const { address, isConnected, balance } = useWeb3();
  const [tokenCount, setTokenCount] = useState(0);
  const [lpCount, setLpCount] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  // Fetch real portfolio summary stats
  const fetchStats = useCallback(async () => {
    if (!address || !isConnected) return;

    const provider = rpcProvider.getProvider();
    if (!provider) return;

    try {
      // Count tokens with non-zero balances
      const tokens = TOKEN_LIST.filter(t => t.address !== '0x0000000000000000000000000000000000000000');
      let tCount = 0;
      let totalVal = 0;

      // Include native balance
      const nativeBalance = parseFloat(balance || '0');
      if (nativeBalance > 0) {
        tCount++;
        totalVal += nativeBalance;
      }

      for (const token of tokens) {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const bal = await rpcProvider.call(
            () => contract.balanceOf(address),
            `portfolio_stat_${token.address}_${address}`
          );
          if (bal && BigInt(bal) > 0n) {
            tCount++;
            totalVal += parseFloat(ethers.formatUnits(bal, token.decimals));
          }
        } catch { /* skip */ }
      }

      setTokenCount(tCount);
      setTotalValue(totalVal);

      // Count LP positions
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      const pairCount = await rpcProvider.call(() => factory.allPairsLength(), 'portfolio_pairCount');
      let lps = 0;
      const count = Number(pairCount || 0);

      for (let i = 0; i < count; i++) {
        try {
          const pairAddr = await rpcProvider.call(() => factory.allPairs(i), `portfolio_pair_${i}`);
          if (pairAddr) {
            const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
            const lpBal = await rpcProvider.call(
              () => pair.balanceOf(address),
              `portfolio_lp_${pairAddr}_${address}`
            );
            if (lpBal && BigInt(lpBal) > 0n) lps++;
          }
        } catch { /* skip */ }
      }

      setLpCount(lps);
    } catch (error) {
      console.warn('Error fetching portfolio stats:', error);
    }
  }, [address, isConnected, balance]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <Spotlight className="min-h-screen">
      <main className="container py-4 sm:py-6 md:py-10 max-w-5xl px-3 sm:px-4 relative">
        {/* Ambient background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-40 left-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Hero Section */}
        <ScrollReveal direction="up" duration={600}>
          <div className="mb-6 sm:mb-8 relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-wolf">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="absolute inset-0 bg-primary/30 rounded-xl blur-xl animate-pulse -z-10" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles className="w-3 h-3 text-primary/70 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Your</span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                  <span className="gradient-text">Portfolio</span>
                </h1>
              </div>
              <Badge variant="secondary" className="ml-2 text-xs">
                <Shield className="w-3 h-3 mr-1 text-green-500" />
                Secure & Private
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-xl">
              Track your token holdings, LP positions, and trading history in one place.
            </p>
          </div>
        </ScrollReveal>
        
        {/* Quick Stats with real data */}
        <StaggeredReveal staggerDelay={80} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
          <PortfolioStatCard value={tokenCount} label="Tokens" icon={PieChart} />
          <PortfolioStatCard value={lpCount} label="LP Positions" icon={Activity} />
          <PortfolioStatCard value={parseFloat(totalValue.toFixed(2))} prefix="" label="Total Holdings" icon={TrendingUp} />
          <PortfolioStatCard value={parseFloat(balance || '0')} suffix=" NEX" label="Native Balance" icon={Zap} />
        </StaggeredReveal>
        
        {/* Quick Features */}
        <ScrollReveal direction="up" delay={200}>
          <div className="flex flex-wrap gap-2 mb-8">
            <FeatureBadge icon={TrendingUp} text="Real-time Values" />
            <FeatureBadge icon={Zap} text="Auto Refresh" />
            <FeatureBadge icon={Shield} text="Secure Tracking" />
          </div>
        </ScrollReveal>
        
        {/* Portfolio Content */}
        <RevealSection>
          <Portfolio />
        </RevealSection>
      </main>
    </Spotlight>
  );
};

export default memo(PortfolioPage);
