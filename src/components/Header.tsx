import { useState, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '@/contexts/Web3Context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, ChevronDown, ExternalLink, Copy, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NEXUS_TESTNET } from '@/config/contracts';
import { toast } from 'sonner';
import wolfLogo from '@/assets/wolf-logo.png';
import { NetworkStatus } from './NetworkStatus';
import { PendingTransactions } from './PendingTransactions';
import { MobileNav } from './MobileNav';
import { ThemeToggle } from './ThemeToggle';
import { RpcStatusIndicator } from './RpcStatusIndicator';

const PriceAlertManager = lazy(() => import('./PriceAlertManager'));

const NAV_ITEMS = [
  { path: '/', label: 'Swap' },
  { path: '/liquidity', label: 'Liquidity' },
  { path: '/pools', label: 'Pools' },
  { path: '/tokens', label: 'Tokens' },
  { path: '/compare', label: 'Compare' },
  { path: '/trading-analytics', label: 'P&L' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/portfolio', label: 'Portfolio' },
  { path: '/docs', label: 'Docs' },
];

const WALLETS = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊' },
  { id: 'okx', name: 'OKX Wallet', icon: '⭕' },
  { id: 'rabby', name: 'Rabby', icon: '🐰' },
  { id: 'bitget', name: 'Bitget', icon: '💎' },
];

export function Header() {
  const { pathname } = useLocation();
  const { isConnected, isConnecting, address, balance, connect, disconnect } = useWeb3();
  const [walletOpen, setWalletOpen] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied!');
    }
  };

  const openExplorer = () => {
    if (address) {
      window.open(`${NEXUS_TESTNET.blockExplorer}/address/${address}`, '_blank');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Mobile Menu */}
        <MobileNav />

        {/* Logo - Always visible */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
          <div className="relative">
            <img 
              src={wolfLogo} 
              alt="FOREDEX" 
              className="h-8 w-8 sm:h-10 sm:w-10 transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight whitespace-nowrap">
            FORE<span className="text-primary">DEX</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Wallet & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Price Alerts */}
          <Suspense fallback={null}>
            <PriceAlertManager />
          </Suspense>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* RPC Status */}
          <RpcStatusIndicator />

          {/* Network Status */}
          <NetworkStatus />

          {/* Pending Transactions */}
          {isConnected && <PendingTransactions />}

          {isConnected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1 sm:gap-2 border-primary/30 hover:border-primary/50 px-2 sm:px-4">
                  <Wallet className="w-4 h-4 text-primary shrink-0" />
                  <span className="hidden md:inline text-sm">{parseFloat(balance).toFixed(3)} NEX</span>
                  <span className="font-mono text-xs sm:text-sm">{formatAddress(address!)}</span>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border border-border">
                <DropdownMenuItem onClick={copyAddress}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Address
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openExplorer}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={disconnect} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu open={walletOpen} onOpenChange={setWalletOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="gap-2 bg-gradient-wolf btn-glow"
                  disabled={isConnecting}
                >
                  <Wallet className="w-4 h-4" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {WALLETS.map((wallet) => (
                  <DropdownMenuItem
                    key={wallet.id}
                    onClick={() => {
                      connect(wallet.id);
                      setWalletOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <span className="mr-2 text-lg">{wallet.icon}</span>
                    {wallet.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}