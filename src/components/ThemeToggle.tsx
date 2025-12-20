import { useState, useEffect } from 'react';
import { Moon, Sun, Stars, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'foredex-theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('light', saved === 'light');
    }
  }, []);

  const toggleTheme = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
    
    setTimeout(() => setIsAnimating(false), 600);
  };

  return (
    <button
      onClick={toggleTheme}
      disabled={isAnimating}
      className={cn(
        'relative w-14 h-8 rounded-full p-1 transition-all duration-500 ease-out',
        'border border-border/50 overflow-hidden',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        theme === 'dark' 
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900' 
          : 'bg-gradient-to-r from-sky-300 via-blue-200 to-sky-300'
      )}
      aria-label="Toggle theme"
    >
      {/* Background stars/clouds */}
      <div className={cn(
        'absolute inset-0 transition-opacity duration-500',
        theme === 'dark' ? 'opacity-100' : 'opacity-0'
      )}>
        <Stars className="absolute top-1 left-2 w-2 h-2 text-yellow-200/60 animate-pulse" />
        <Sparkles className="absolute bottom-1 right-3 w-2 h-2 text-blue-200/40 animate-pulse delay-150" />
        <div className="absolute top-2 right-6 w-1 h-1 rounded-full bg-white/30" />
      </div>
      
      {/* Clouds for light mode */}
      <div className={cn(
        'absolute inset-0 transition-opacity duration-500',
        theme === 'light' ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="absolute top-1 left-1 w-4 h-2 bg-white/60 rounded-full blur-[1px]" />
        <div className="absolute bottom-1 right-1 w-3 h-1.5 bg-white/40 rounded-full blur-[1px]" />
      </div>

      {/* Toggle knob */}
      <div
        className={cn(
          'relative w-6 h-6 rounded-full transition-all duration-500 ease-out',
          'flex items-center justify-center shadow-lg',
          theme === 'dark'
            ? 'translate-x-0 bg-gradient-to-br from-slate-700 to-slate-800 shadow-indigo-500/20'
            : 'translate-x-6 bg-gradient-to-br from-amber-300 to-yellow-400 shadow-orange-400/40',
          isAnimating && 'scale-90'
        )}
      >
        {/* Icon with rotation animation */}
        <div className={cn(
          'transition-all duration-500',
          isAnimating && 'rotate-[360deg] scale-110'
        )}>
          {theme === 'dark' ? (
            <Moon className="w-3.5 h-3.5 text-indigo-200" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-700" />
          )}
        </div>
        
        {/* Glow effect */}
        <div className={cn(
          'absolute inset-0 rounded-full transition-opacity duration-300',
          theme === 'light' 
            ? 'bg-yellow-400/30 blur-md animate-pulse' 
            : 'bg-indigo-400/20 blur-md'
        )} />
      </div>

      {/* Transition sparkle effect */}
      {isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            'absolute w-full h-full',
            theme === 'light' ? 'animate-ping bg-yellow-300/20' : 'animate-ping bg-indigo-400/20',
            'rounded-full'
          )} />
        </div>
      )}
    </button>
  );
}
