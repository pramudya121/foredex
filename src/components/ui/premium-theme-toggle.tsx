import { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'foredex-theme';

export function PremiumThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const getSystemTheme = useCallback((): 'dark' | 'light' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }, []);

  const applyTheme = useCallback((selectedTheme: Theme) => {
    const actualTheme = selectedTheme === 'system' ? getSystemTheme() : selectedTheme;
    document.documentElement.classList.toggle('light', actualTheme === 'light');
  }, [getSystemTheme]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  const selectTheme = (newTheme: Theme) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setTheme(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
    setIsOpen(false);
    
    setTimeout(() => setIsAnimating(false), 600);
  };

  const getCurrentIcon = () => {
    const actualTheme = theme === 'system' ? getSystemTheme() : theme;
    if (theme === 'system') return <Monitor className="w-4 h-4" />;
    return actualTheme === 'dark' 
      ? <Moon className="w-4 h-4 text-indigo-300" /> 
      : <Sun className="w-4 h-4 text-amber-500" />;
  };

  const actualTheme = theme === 'system' ? getSystemTheme() : theme;

  return (
    <div className="relative">
      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isAnimating}
        className={cn(
          "relative w-10 h-10 rounded-xl overflow-hidden",
          "border border-border/50",
          "transition-all duration-500 ease-out",
          "hover:border-primary/50 hover:scale-105",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "flex items-center justify-center",
          actualTheme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800 via-indigo-900/50 to-slate-900' 
            : 'bg-gradient-to-br from-sky-100 via-amber-50 to-sky-100'
        )}
        aria-label="Toggle theme"
      >
        {/* Background effects */}
        <div className={cn(
          "absolute inset-0 transition-opacity duration-500",
          actualTheme === 'dark' ? 'opacity-100' : 'opacity-0'
        )}>
          {/* Stars */}
          <div className="absolute top-1.5 left-1.5 w-0.5 h-0.5 bg-white/60 rounded-full animate-pulse" />
          <div className="absolute top-3 right-2 w-0.5 h-0.5 bg-blue-200/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-2 left-3 w-0.5 h-0.5 bg-indigo-200/50 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Sun rays for light mode */}
        <div className={cn(
          "absolute inset-0 transition-opacity duration-500",
          actualTheme === 'light' ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="absolute inset-0 bg-gradient-radial from-amber-200/20 via-transparent to-transparent" />
        </div>

        {/* Icon with rotation */}
        <div className={cn(
          "relative z-10 transition-all duration-500",
          isAnimating && "rotate-[360deg] scale-110"
        )}>
          {getCurrentIcon()}
        </div>

        {/* Glow ring */}
        <div className={cn(
          "absolute inset-0 rounded-xl transition-opacity duration-300",
          actualTheme === 'dark' 
            ? "ring-1 ring-inset ring-indigo-400/20" 
            : "ring-1 ring-inset ring-amber-400/30"
        )} />
      </button>

      {/* Dropdown Menu */}
      <div className={cn(
        "absolute right-0 top-full mt-2 z-50",
        "w-40 p-1.5 rounded-xl",
        "bg-card/95 backdrop-blur-xl border border-border/50",
        "shadow-xl shadow-black/20",
        "transition-all duration-300 origin-top-right",
        isOpen 
          ? "opacity-100 scale-100 translate-y-0" 
          : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
      )}>
        {/* Theme Options */}
        {[
          { value: 'light' as Theme, label: 'Light', icon: Sun, color: 'text-amber-500' },
          { value: 'dark' as Theme, label: 'Dark', icon: Moon, color: 'text-indigo-400' },
          { value: 'system' as Theme, label: 'System', icon: Monitor, color: 'text-muted-foreground' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => selectTheme(option.value)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
              "transition-all duration-200",
              "hover:bg-muted/50",
              theme === option.value && "bg-primary/10 text-primary"
            )}
          >
            <option.icon className={cn("w-4 h-4", theme === option.value ? "text-primary" : option.color)} />
            <span className="text-sm font-medium">{option.label}</span>
            {theme === option.value && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </button>
        ))}

        {/* Preview indicator */}
        <div className="mt-1.5 pt-1.5 border-t border-border/30">
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground/70 flex items-center gap-1.5">
            <span>Current:</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium",
              actualTheme === 'dark' ? "bg-indigo-500/20 text-indigo-300" : "bg-amber-500/20 text-amber-600"
            )}>
              {actualTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </div>
  );
}
