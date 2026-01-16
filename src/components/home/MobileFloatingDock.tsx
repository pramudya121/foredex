import { memo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  ArrowLeftRight, 
  Droplets, 
  LayoutGrid, 
  Sprout,
  BarChart3,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DOCK_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/swap', icon: ArrowLeftRight, label: 'Swap' },
  { path: '/liquidity', icon: Droplets, label: 'Liquidity' },
  { path: '/pools', icon: LayoutGrid, label: 'Pools' },
  { path: '/farming', icon: Sprout, label: 'Farming' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/portfolio', icon: Wallet, label: 'Portfolio' },
];

export const MobileFloatingDock = memo(function MobileFloatingDock() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide dock on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "md:hidden", // Only show on mobile
        "flex items-end gap-1 px-3 py-2",
        "glass-card backdrop-blur-xl",
        "border border-border/50 shadow-2xl shadow-black/30",
        "transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      )}
      style={{ borderRadius: "24px" }}
    >
      {DOCK_ITEMS.map((item, index) => {
        const isActive = pathname === item.path;
        const isHovered = hoveredIndex === index;
        const isNeighbor = hoveredIndex !== null && Math.abs(hoveredIndex - index) === 1;
        
        const scale = isHovered ? 1.3 : isNeighbor ? 1.15 : 1;
        const translateY = isHovered ? -8 : isNeighbor ? -4 : 0;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onTouchStart={() => setHoveredIndex(index)}
            onTouchEnd={() => setTimeout(() => setHoveredIndex(null), 500)}
            className={cn(
              "relative flex flex-col items-center justify-center",
              "w-11 h-11 rounded-xl",
              "transition-all duration-300 ease-out",
              isActive 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
                : "text-muted-foreground hover:text-foreground active:bg-muted"
            )}
            style={{
              transform: `scale(${scale}) translateY(${translateY}px)`,
            }}
          >
            <item.icon className="w-5 h-5" />
            
            {/* Tooltip */}
            <span
              className={cn(
                "absolute -top-9 left-1/2 -translate-x-1/2",
                "px-2.5 py-1 rounded-lg bg-card border border-border",
                "text-[10px] font-medium whitespace-nowrap",
                "transition-all duration-200 shadow-lg",
                isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
              )}
            >
              {item.label}
            </span>
            
            {/* Active glow */}
            {isActive && (
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md -z-10" />
            )}
          </button>
        );
      })}
    </div>
  );
});
