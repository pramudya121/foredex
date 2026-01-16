import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, BookOpen, Zap, Shield, TrendingUp, Droplets, Coins, BarChart3, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spotlight } from '@/components/ui/spotlight';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { RotatingLogo } from '@/components/ui/rotating-logo';
import { Marquee } from '@/components/ui/marquee';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import { HoverEffect } from '@/components/ui/hover-effect';
import { TOKEN_LIST } from '@/config/contracts';
import { TokenLogo } from '@/components/TokenLogo';

// Token for hero section rotating display
const HERO_TOKEN = {
  symbol: 'WETH',
  logoURI: '/tokens/weth.png',
};

// Feature cards data
const FEATURES = [
  {
    title: 'Instant Swaps',
    description: 'Trade tokens instantly with minimal slippage and low fees on Nexus Testnet.',
    link: '/swap',
    icon: ArrowRightLeft,
  },
  {
    title: 'Add Liquidity',
    description: 'Provide liquidity to earn trading fees and rewards from every swap.',
    link: '/liquidity',
    icon: Droplets,
  },
  {
    title: 'Yield Farming',
    description: 'Stake your LP tokens to earn additional FRDX rewards.',
    link: '/farming',
    icon: Coins,
  },
  {
    title: 'Analytics',
    description: 'Track your portfolio performance and market trends in real-time.',
    link: '/analytics',
    icon: BarChart3,
  },
];

// Stats data
const STATS = [
  { value: 12, prefix: '$', suffix: 'M+', label: 'Total Value Locked' },
  { value: 50, suffix: 'K+', label: 'Total Trades' },
  { value: 0.3, suffix: '%', label: 'Trading Fee', decimalPlaces: 1 },
  { value: 1000, suffix: '+', label: 'Active Users' },
];

// Token ticker component
const TokenTickerItem = memo(({ symbol, logoURI, price, change }: { 
  symbol: string; 
  logoURI?: string; 
  price: number; 
  change: number;
}) => (
  <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/50 border border-border/30 mx-2 backdrop-blur-sm">
    <TokenLogo symbol={symbol} logoURI={logoURI} size="sm" />
    <span className="font-medium text-sm">{symbol}</span>
    <span className="text-sm text-muted-foreground">${price.toFixed(4)}</span>
    <span className={`text-xs font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
    </span>
  </div>
));

TokenTickerItem.displayName = 'TokenTickerItem';

// Stat card component
const StatCard = memo(({ value, label, prefix = "", suffix = "", delay = 0, decimalPlaces = 0 }: {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
  decimalPlaces?: number;
}) => (
  <div 
    className="glass-card p-6 text-center hover-lift card-glow animate-fade-in-up relative overflow-hidden"
    style={{ animationDelay: `${delay}ms` }}
  >
    <BorderBeam size={100} duration={12} delay={delay / 1000} />
    <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">
      <NumberTicker value={value} prefix={prefix} suffix={suffix} delay={delay} decimalPlaces={decimalPlaces} />
    </p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
));

StatCard.displayName = 'StatCard';

const Home = () => {
  // Generate mock token prices for marquee
  const tokenPrices = useMemo(() => {
    return TOKEN_LIST
      .filter(t => t.address !== '0x0000000000000000000000000000000000000000')
      .map((token) => ({
        ...token,
        price: 1 + Math.random() * 10,
        change: (Math.random() - 0.5) * 20,
      }));
  }, []);

  return (
    <Spotlight className="min-h-screen">
      <main className="relative">
        {/* Ambient background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-40 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-[200px]" />
        </div>

        {/* Hero Section */}
        <section className="container px-4 py-16 sm:py-20 md:py-28 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8 animate-fade-in">
              {/* Network Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
                <span className="text-sm font-medium text-primary">Nexus Network Testnet</span>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                  Trade on{' '}
                  <span className="gradient-text animate-shimmer">FOREDEX</span>
                </h1>
                <TextGenerateEffect 
                  words="The fastest DEX on Nexus Network. Swap tokens with minimal slippage and low fees."
                  className="text-lg sm:text-xl text-muted-foreground max-w-xl"
                />
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <Link to="/swap">
                  <ShimmerButton className="px-8 py-4 text-base font-semibold">
                    <ArrowRightLeft className="w-5 h-5 mr-2" />
                    Start Trading
                  </ShimmerButton>
                </Link>
                <Link to="/docs">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="px-8 py-6 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <BookOpen className="w-5 h-5 mr-2" />
                    Learn More
                  </Button>
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Instant Swaps</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Secure Trading</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>Best Rates</span>
                </div>
              </div>
            </div>

            {/* Right Content - Rotating Token Logo */}
            <div className="relative flex items-center justify-center lg:justify-end animate-scale-in">
              {/* Glow effect behind */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 sm:w-80 sm:h-80 bg-primary/20 rounded-full blur-[80px] animate-pulse" />
              </div>
              
              {/* Token display with border */}
              <div className="relative">
                <div className="relative p-8 rounded-full border-2 border-primary/30 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl">
                  {/* Rotating border effect */}
                  <div className="absolute inset-0 rounded-full border border-primary/50 animate-spin" style={{ animationDuration: '8s' }} />
                  
                  <RotatingLogo 
                    src={HERO_TOKEN.logoURI} 
                    alt={HERO_TOKEN.symbol}
                    size="xl"
                    enableHover={true}
                  />
                </div>
                
                {/* Token label */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-card border border-border/50 backdrop-blur-sm">
                  <span className="text-sm font-bold text-primary">{HERO_TOKEN.symbol}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Price Ticker */}
        <section className="relative py-6 border-y border-border/30 bg-card/30 backdrop-blur-sm">
          <Marquee pauseOnHover speed={40}>
            {tokenPrices.map((token) => (
              <TokenTickerItem 
                key={token.address}
                symbol={token.symbol}
                logoURI={token.logoURI}
                price={token.price}
                change={token.change}
              />
            ))}
          </Marquee>
        </section>

        {/* Stats Section */}
        <section className="container px-4 py-16 sm:py-20">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Trusted by <span className="text-primary">Thousands</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Join the growing community of traders and liquidity providers on FOREDEX.
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {STATS.map((stat, index) => (
              <StatCard 
                key={stat.label}
                {...stat}
                delay={index * 100}
              />
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="container px-4 py-16 sm:py-20">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Everything You Need to <span className="text-primary">Trade</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete DeFi ecosystem with swapping, liquidity provision, and yield farming.
            </p>
          </div>
          
          <HoverEffect items={FEATURES.map(f => ({
            title: f.title,
            description: f.description,
            link: f.link,
          }))} />
        </section>

        {/* CTA Section */}
        <section className="container px-4 py-16 sm:py-20">
          <div className="relative glass-card p-8 sm:p-12 md:p-16 text-center overflow-hidden">
            <BorderBeam size={200} duration={15} />
            
            <div className="relative z-10 space-y-6 animate-fade-in">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Ready to Start <span className="gradient-text">Trading</span>?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Connect your wallet and start swapping tokens in seconds.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Link to="/swap">
                  <ShimmerButton className="px-8 py-4 text-base font-semibold">
                    <ArrowRightLeft className="w-5 h-5 mr-2" />
                    Launch App
                  </ShimmerButton>
                </Link>
                <Link to="/portfolio">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="px-8 py-6 border-border/50 hover:border-primary/50"
                  >
                    <Wallet className="w-5 h-5 mr-2" />
                    View Portfolio
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer spacer */}
        <div className="h-8" />
      </main>
    </Spotlight>
  );
};

export default memo(Home);
