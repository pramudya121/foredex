import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'foredex-theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Load saved theme
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('light', saved === 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        'w-9 h-9 rounded-full',
        'hover:bg-muted/50 transition-colors'
      )}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-yellow-500" />
      ) : (
        <Moon className="w-4 h-4 text-blue-500" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
