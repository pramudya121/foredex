import { useState } from 'react';
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

const NAV_ITEMS = [
  { path: '/', label: 'Swap' },
  { path: '/liquidity', label: 'Liquidity' },
  { path: '/pools', label: 'Pools' },
  { path: '/tokens', label: 'Tokens' },
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

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <img 
              src={wolfLogo} 
              alt="FOREDEX" 
              className="h-10 w-10 transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-xl font-bold tracking-tight">
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
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Network Status */}
          <NetworkStatus />

          {/* Pending Transactions */}
          {isConnected && <PendingTransactions />}

          {isConnected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary/30 hover:border-primary/50">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline">{parseFloat(balance).toFixed(4)} NEX</span>
                  <span className="font-mono">{formatAddress(address!)}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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