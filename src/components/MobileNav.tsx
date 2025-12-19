import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  ArrowLeftRight, 
  Droplets, 
  LayoutGrid, 
  BarChart3, 
  Wallet, 
  FileText, 
  Settings,
  Coins,
  GitCompare,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import wolfLogo from '@/assets/wolf-logo.png';

const NAV_ITEMS = [
  { path: '/', label: 'Swap', icon: ArrowLeftRight },
  { path: '/liquidity', label: 'Liquidity', icon: Droplets },
  { path: '/pools', label: 'Pools', icon: LayoutGrid },
  { path: '/tokens', label: 'Tokens', icon: Coins },
  { path: '/compare', label: 'Compare', icon: GitCompare },
  { path: '/trading-analytics', label: 'P&L', icon: TrendingUp },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/portfolio', label: 'Portfolio', icon: Wallet },
  { path: '/docs', label: 'Docs', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden shrink-0">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border/50 p-4">
          <SheetTitle className="flex items-center gap-3">
            <img src={wolfLogo} alt="FOREDEX" className="h-8 w-8" />
            <span className="text-lg font-bold">
              FORE<span className="text-primary">DEX</span>
            </span>
          </SheetTitle>
        </SheetHeader>
        
        <nav className="p-2 space-y-0.5 max-h-[calc(100vh-180px)] overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 touch-manipulation',
                  pathname === item.path
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50 bg-background">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-sm font-medium mb-1">Nexus Testnet</p>
            <p className="text-xs text-muted-foreground">
              Trading on Nexus blockchain testnet
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
