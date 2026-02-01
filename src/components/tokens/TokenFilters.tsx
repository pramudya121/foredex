import { memo, useCallback } from 'react';
import { Search, Star, TrendingUp, TrendingDown, Flame, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

export type SortField = 'price' | 'change' | 'volume' | 'tvl' | 'name';
export type SortDirection = 'asc' | 'desc';

interface TokenFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: SortField;
  sortDir: SortDirection;
  onSort: (field: SortField) => void;
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
  showGainers: boolean;
  onToggleGainers: () => void;
  showLosers: boolean;
  onToggleLosers: () => void;
  favoritesCount: number;
  totalTokens: number;
  filteredCount: number;
}

const sortOptions: { value: SortField; label: string; icon: React.ReactNode }[] = [
  { value: 'tvl', label: 'TVL', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'volume', label: 'Volume', icon: <Flame className="w-4 h-4" /> },
  { value: 'change', label: '24h Change', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'price', label: 'Price', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'name', label: 'Name', icon: <Filter className="w-4 h-4" /> },
];

export const TokenFilters = memo(function TokenFilters({
  searchTerm,
  onSearchChange,
  sortBy,
  sortDir,
  onSort,
  showFavoritesOnly,
  onToggleFavorites,
  showGainers,
  onToggleGainers,
  showLosers,
  onToggleLosers,
  favoritesCount,
  totalTokens,
  filteredCount,
}: TokenFiltersProps) {
  const currentSort = sortOptions.find(o => o.value === sortBy);
  const hasActiveFilters = showFavoritesOnly || showGainers || showLosers || searchTerm;

  const clearAllFilters = useCallback(() => {
    onSearchChange('');
    if (showFavoritesOnly) onToggleFavorites();
    if (showGainers) onToggleGainers();
    if (showLosers) onToggleLosers();
  }, [onSearchChange, showFavoritesOnly, onToggleFavorites, showGainers, onToggleGainers, showLosers, onToggleLosers]);

  return (
    <div className="space-y-3">
      {/* Search and Main Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, symbol, or address..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 h-10 bg-background/50"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 gap-2 min-w-[140px]">
              {currentSort?.icon}
              <span>Sort: {currentSort?.label}</span>
              {sortDir === 'asc' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSort(option.value)}
                className={cn(
                  'flex items-center gap-2 cursor-pointer',
                  sortBy === option.value && 'bg-primary/10 text-primary'
                )}
              >
                {option.icon}
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showFavoritesOnly ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleFavorites}
          className="h-8 gap-1.5"
        >
          <Star className={cn('w-3.5 h-3.5', showFavoritesOnly && 'fill-current')} />
          Favorites
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
            {favoritesCount}
          </Badge>
        </Button>

        <Button
          variant={showGainers ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleGainers}
          className={cn("h-8 gap-1.5", showGainers && "bg-green-600 hover:bg-green-700")}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Gainers
        </Button>

        <Button
          variant={showLosers ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleLosers}
          className={cn("h-8 gap-1.5", showLosers && "bg-red-600 hover:bg-red-700")}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          Losers
        </Button>

        <div className="flex-1" />

        {/* Results Count */}
        <Badge variant="secondary" className="h-8 px-3">
          {filteredCount}/{totalTokens} tokens
        </Badge>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
});
