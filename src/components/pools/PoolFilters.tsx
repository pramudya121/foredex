import { memo, useCallback } from 'react';
import { 
  Search, 
  Star, 
  Wallet, 
  TrendingUp, 
  Flame, 
  BarChart3, 
  Coins, 
  ArrowDown,
  X,
  LayoutGrid,
  List,
  Filter,
  Sparkles,
} from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export type SortOption = 'tvl' | 'apr' | 'volume' | 'fees' | 'newest';
export type ViewMode = 'table' | 'card';

interface PoolFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
  showMyPositions: boolean;
  onToggleMyPositions: () => void;
  isConnected: boolean;
  favoritesCount: number;
  totalPools: number;
  filteredCount: number;
  minTvl: number;
  onMinTvlChange: (value: number) => void;
  minApr: number;
  onMinAprChange: (value: number) => void;
}

const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'tvl', label: 'TVL', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'apr', label: 'APR', icon: <Flame className="w-4 h-4" /> },
  { value: 'volume', label: 'Volume', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'fees', label: 'Fees', icon: <Coins className="w-4 h-4" /> },
  { value: 'newest', label: 'Newest', icon: <ArrowDown className="w-4 h-4" /> },
];

export const PoolFilters = memo(function PoolFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  showFavoritesOnly,
  onToggleFavorites,
  showMyPositions,
  onToggleMyPositions,
  isConnected,
  favoritesCount,
  totalPools,
  filteredCount,
  minTvl,
  onMinTvlChange,
  minApr,
  onMinAprChange,
}: PoolFiltersProps) {
  const currentSort = sortOptions.find(o => o.value === sortBy);
  const hasActiveFilters = showFavoritesOnly || showMyPositions || searchQuery || minTvl > 0 || minApr > 0;
  const advancedFiltersActive = minTvl > 0 || minApr > 0;

  const clearAllFilters = useCallback(() => {
    onSearchChange('');
    if (showFavoritesOnly) onToggleFavorites();
    if (showMyPositions) onToggleMyPositions();
    onMinTvlChange(0);
    onMinAprChange(0);
  }, [onSearchChange, showFavoritesOnly, onToggleFavorites, showMyPositions, onToggleMyPositions, onMinTvlChange, onMinAprChange]);

  return (
    <div className="space-y-3">
      {/* Search and Main Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pools by token name or address..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 h-10 bg-background/50"
          />
          {searchQuery && (
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

        <div className="flex items-center gap-2">
          {/* Advanced Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant={advancedFiltersActive ? 'default' : 'outline'} 
                className="h-10 gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {advancedFiltersActive && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    Active
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h4 className="font-medium">Advanced Filters</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Minimum TVL</Label>
                      <span className="text-sm text-muted-foreground">
                        ${minTvl > 0 ? minTvl.toLocaleString() : '0'}
                      </span>
                    </div>
                    <Slider
                      value={[minTvl]}
                      onValueChange={([value]) => onMinTvlChange(value)}
                      max={100000}
                      step={1000}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Minimum APR</Label>
                      <span className="text-sm text-muted-foreground">
                        {minApr > 0 ? `${minApr}%` : '0%'}
                      </span>
                    </div>
                    <Slider
                      value={[minApr]}
                      onValueChange={([value]) => onMinAprChange(value)}
                      max={500}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>

                {advancedFiltersActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onMinTvlChange(0);
                      onMinAprChange(0);
                    }}
                    className="w-full"
                  >
                    Reset Advanced Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 min-w-[120px]">
                {currentSort?.icon}
                <span className="hidden sm:inline">Sort:</span>
                <span className="font-medium">{currentSort?.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
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

          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('table')}
              className="rounded-none h-10 px-3"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('card')}
              className="rounded-none h-10 px-3"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
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

        {isConnected && (
          <Button
            variant={showMyPositions ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleMyPositions}
            className="h-8 gap-1.5"
          >
            <Wallet className={cn('w-3.5 h-3.5', showMyPositions && 'fill-current')} />
            My Positions
          </Button>
        )}

        <div className="flex-1" />

        {/* Results Count */}
        <Badge variant="secondary" className="h-8 px-3">
          {filteredCount}/{totalPools} pools
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
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
});
