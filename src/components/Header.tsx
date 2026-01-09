import { useState, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '@/contexts/Web3Context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, ChevronDown, ExternalLink, Copy, LogOut, QrCode, HelpCircle } from 'lucide-react';
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
  { path: '/farming', label: 'Farming' },
  { path: '/tokens', label: 'Tokens' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/portfolio', label: 'Portfolio' },
  { path: '/docs', label: 'Docs' },
];

// Wallet icons as SVG components
const WalletConnectIcon = () => (
  <svg width="28" height="28" viewBox="0 0 300 185" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M61.4385 36.2557C104.419 -5.41854 172.581 -5.41854 215.562 36.2557L220.808 41.3212C223.046 43.5025 223.046 47.0323 220.808 49.2136L202.447 67.0026C201.328 68.0933 199.54 68.0933 198.421 67.0026L191.178 59.9584C162.089 31.6007 114.911 31.6007 85.8223 59.9584L78.0406 67.5174C76.9218 68.608 75.1335 68.608 74.0147 67.5174L55.6533 49.7284C53.4149 47.5471 53.4149 44.0173 55.6533 41.836L61.4385 36.2557ZM252.385 72.0121L268.847 87.9982C271.085 90.1795 271.085 93.7093 268.847 95.8906L196.119 166.769C193.881 168.95 190.304 168.95 188.066 166.769L134.981 115.237C134.422 114.691 133.528 114.691 132.969 115.237L79.8832 166.769C77.645 168.95 74.0683 168.95 71.8301 166.769L-0.847 95.8906C-3.08533 93.7093 -3.08533 90.1795 -0.847 87.9982L15.6144 72.0121C17.8526 69.8308 21.4293 69.8308 23.6675 72.0121L76.7534 123.544C77.3123 124.09 78.2065 124.09 78.7654 123.544L131.851 72.0121C134.089 69.8308 137.666 69.8308 139.904 72.0121L192.99 123.544C193.549 124.09 194.443 124.09 195.002 123.544L248.088 72.0121C250.326 69.8308 253.903 69.8308 256.141 72.0121L252.385 72.0121Z" fill="#3B99FC"/>
  </svg>
);

const RabbyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="128" height="128" rx="24" fill="#8697FF"/>
    <path d="M93.2352 69.7843C92.6539 68.8627 91.4849 68.4902 90.4706 68.898C89.4563 69.3059 88.8529 70.3529 89.002 71.4275C89.2314 73.0196 89.3333 74.649 89.3333 76.2353C89.3333 89.7059 78.3725 100.667 64.902 100.667C51.4314 100.667 40.4706 89.7059 40.4706 76.2353C40.4706 62.7647 51.4314 51.8039 64.902 51.8039C69.2549 51.8039 73.4588 52.8431 77.251 54.8235C78.2353 55.3373 79.4314 55.1373 80.2039 54.3451C80.9765 53.5529 81.1608 52.349 80.6706 51.3569C80.1333 50.2784 79.549 49.2314 78.9373 48.2275C74.6941 40.8 68.0078 35.6784 60.3922 34.1098C60.3373 33.9765 60.2706 33.8471 60.1922 33.7255L53.6549 23.3647C52.7647 21.9608 50.8627 21.5412 49.451 22.4196C48.0392 23.298 47.6 25.1843 48.4784 26.5882L54.3255 35.8667C48.9804 37.8157 44.2039 41.2157 40.498 45.7333L40.1451 43.0588C39.9137 41.3137 38.3137 40.0941 36.5686 40.3255C34.8235 40.5569 33.6039 42.1569 33.8353 43.902L35.6314 57.4471C32.8549 62.6196 31.3333 68.4706 31.3333 74.3529V76.2353C31.3333 94.6588 46.4706 109.804 64.9098 109.804C83.349 109.804 98.4863 94.6588 98.4863 76.2353C98.4863 73.8706 98.2667 71.5922 97.8471 69.4C97.7294 68.8039 97.4196 68.2588 96.9608 67.8588L93.2352 69.7843Z" fill="white"/>
    <ellipse cx="76" cy="72" rx="6" ry="7" fill="white"/>
  </svg>
);

const MetaMaskIcon = () => (
  <svg width="28" height="28" viewBox="0 0 318 318" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M274.1 35.5L174.6 109.4L193 65.8L274.1 35.5Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M44.4 35.5L143.1 110.1L125.6 65.8L44.4 35.5Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M238.3 206.8L211.8 247.4L268.5 263L284.8 207.7L238.3 206.8Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M33.9 207.7L50.1 263L106.8 247.4L80.3 206.8L33.9 207.7Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M103.6 138.2L87.8 162.1L143.8 164.6L141.9 104.6L103.6 138.2Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M214.9 138.2L175.9 104L174.6 164.6L230.5 162.1L214.9 138.2Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M106.8 247.4L140.6 230.9L111.4 208.1L106.8 247.4Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M177.9 230.9L211.8 247.4L207.1 208.1L177.9 230.9Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M211.8 247.4L177.9 230.9L180.6 253L180.3 262.3L211.8 247.4Z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M106.8 247.4L138.3 262.3L138.1 253L140.6 230.9L106.8 247.4Z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M138.8 193.5L110.6 185.2L130.5 176.1L138.8 193.5Z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M179.7 193.5L188 176.1L208 185.2L179.7 193.5Z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M106.8 247.4L111.6 206.8L80.3 207.7L106.8 247.4Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M207 206.8L211.8 247.4L238.3 207.7L207 206.8Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M230.5 162.1L174.6 164.6L179.8 193.5L188.1 176.1L208.1 185.2L230.5 162.1Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M110.6 185.2L130.6 176.1L138.8 193.5L144 164.6L87.8 162.1L110.6 185.2Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M87.8 162.1L111.4 208.1L110.6 185.2L87.8 162.1Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M208.1 185.2L207.1 208.1L230.5 162.1L208.1 185.2Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M144 164.6L138.8 193.5L145.4 227.6L146.9 182.7L144 164.6Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M174.6 164.6L171.8 182.6L173.1 227.6L179.8 193.5L174.6 164.6Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M179.8 193.5L173.1 227.6L177.9 230.9L207.1 208.1L208.1 185.2L179.8 193.5Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M110.6 185.2L111.4 208.1L140.6 230.9L145.4 227.6L138.8 193.5L110.6 185.2Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M180.3 262.3L180.6 253L178.1 250.8H140.4L138.1 253L138.3 262.3L106.8 247.4L117.8 256.4L140.1 271.9H178.4L200.8 256.4L211.8 247.4L180.3 262.3Z" fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M177.9 230.9L173.1 227.6H145.4L140.6 230.9L138.1 253L140.4 250.8H178.1L180.6 253L177.9 230.9Z" fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M278.3 114.2L286.8 73.4L274.1 35.5L177.9 106.9L214.9 138.2L267 154.5L278.8 140.8L273.6 137L281.8 129.6L275.4 124.7L283.6 118.4L278.3 114.2Z" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M31.8 73.4L40.3 114.2L34.9 118.4L43.1 124.7L36.8 129.6L45 137L39.8 140.8L51.5 154.5L103.6 138.2L140.6 106.9L44.4 35.5L31.8 73.4Z" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M267 154.5L214.9 138.2L230.5 162.1L207.1 208.1L238.3 207.7H284.8L267 154.5Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M103.6 138.2L51.5 154.5L33.9 207.7H80.3L111.4 208.1L87.8 162.1L103.6 138.2Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M174.6 164.6L177.9 106.9L193.1 65.8H125.6L140.6 106.9L144 164.6L145.3 182.8L145.4 227.6H173.1L173.3 182.8L174.6 164.6Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WALLETS = [
  { 
    id: 'walletconnect', 
    name: 'WalletConnect', 
    icon: WalletConnectIcon,
    badge: 'QR CODE',
    badgeColor: 'bg-blue-500/20 text-blue-400'
  },
  { 
    id: 'rabby', 
    name: 'Rabby Wallet', 
    icon: RabbyIcon,
    badge: 'INSTALLED',
    badgeColor: 'bg-green-500/20 text-green-400',
    checkInstalled: () => !!(window as any).ethereum?.isRabby || !!(window as any).rabby
  },
  { 
    id: 'metamask', 
    name: 'MetaMask', 
    icon: MetaMaskIcon,
    badge: 'INSTALLED',
    badgeColor: 'bg-green-500/20 text-green-400',
    checkInstalled: () => !!(window as any).ethereum?.isMetaMask
  },
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
            <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="gap-2 bg-gradient-wolf btn-glow"
                  disabled={isConnecting}
                >
                  <Wallet className="w-4 h-4" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/50">
                <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    <DialogTitle className="text-lg font-semibold">Connect Wallet</DialogTitle>
                  </div>
                </DialogHeader>
                
                <div className="space-y-2 py-4">
                  {WALLETS.map((wallet) => {
                    const isInstalled = wallet.checkInstalled?.() ?? (wallet.id === 'walletconnect');
                    const IconComponent = wallet.icon;
                    
                    return (
                      <button
                        key={wallet.id}
                        onClick={() => {
                          if (wallet.id === 'walletconnect') {
                            toast.info('WalletConnect coming soon!');
                            return;
                          }
                          if (!isInstalled) {
                            toast.error(`${wallet.name} not detected. Please install it first.`);
                            return;
                          }
                          connect(wallet.id);
                          setWalletOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200',
                          'hover:bg-muted/50 border border-transparent hover:border-border/50',
                          'group cursor-pointer'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                            <IconComponent />
                          </div>
                          <span className="font-medium text-foreground">{wallet.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {wallet.id === 'walletconnect' ? (
                            <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold uppercase', wallet.badgeColor)}>
                              <QrCode className="w-3 h-3 inline mr-1" />
                              QR CODE
                            </span>
                          ) : isInstalled ? (
                            <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold uppercase', wallet.badgeColor)}>
                              INSTALLED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-muted/50 text-muted-foreground">
                              NOT DETECTED
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                <div className="border-t border-border/30 pt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Haven't got a wallet?{' '}
                    <a 
                      href="https://metamask.io/download/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      Get started
                    </a>
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </header>
  );
}