import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  X,
  TrendingUp,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PoolInfo } from './FarmCard';

interface FarmingFiltersProps {
  pools: PoolInfo[];
  onFilteredPoolsChange: (pools: PoolInfo[]) => void;
  sortBy: 'apr' | 'tvl' | 'newest';
  onSortChange: (sort: 'apr' | 'tvl' | 'newest') => void;
}

interface Filters {
  search: string;
  minAPR: number;
  maxAPR: number;
  minTVL: number;
  maxTVL: number;
}

const defaultFilters: Filters = {
  search: '',
  minAPR: 0,
  maxAPR: 999999, // Very high to not filter by default
  minTVL: 0,
  maxTVL: 999999999, // Very high to not filter by default
};

export function FarmingFilters({ pools, onFilteredPoolsChange, sortBy, onSortChange }: FarmingFiltersProps) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [isOpen, setIsOpen] = useState(false);

  // Get pair name helper
  const getPairName = (pool: PoolInfo) => {
    return pool.token1Symbol 
      ? `${pool.token0Symbol}-${pool.token1Symbol}` 
      : pool.token0Symbol;
  };

  // Calculate max values for sliders
  const maxPoolAPR = useMemo(() => {
    return Math.max(...pools.map(p => p.apr), 100);
  }, [pools]);

  const maxPoolTVL = useMemo(() => {
    const maxTVL = Math.max(...pools.map(p => parseFloat(p.totalStaked) * 100), 10000);
    return Math.ceil(maxTVL / 1000) * 1000; // Round up to nearest 1000
  }, [pools]);

  // Apply filters and sorting
  const applyFilters = useMemo(() => {
    let filtered = [...pools];

    // Search filter (token pair)
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(pool => {
        const pairName = getPairName(pool).toLowerCase();
        return pairName.includes(searchLower) || 
               pool.token0Symbol.toLowerCase().includes(searchLower) ||
               (pool.token1Symbol && pool.token1Symbol.toLowerCase().includes(searchLower));
      });
    }

    // APR filter
    filtered = filtered.filter(pool => 
      pool.apr >= filters.minAPR && pool.apr <= filters.maxAPR
    );

    // TVL filter (using totalStaked as proxy)
    const tvlMultiplier = 100; // Approximate USD value per LP token
    filtered = filtered.filter(pool => {
      const tvl = parseFloat(pool.totalStaked) * tvlMultiplier;
      return tvl >= filters.minTVL && tvl <= filters.maxTVL;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'apr': return b.apr - a.apr;
        case 'tvl': return parseFloat(b.totalStaked) - parseFloat(a.totalStaked);
        case 'newest': return b.pid - a.pid;
        default: return 0;
      }
    });

    return filtered;
  }, [pools, filters, sortBy]);

  // Update parent when filters change
  useMemo(() => {
    onFilteredPoolsChange(applyFilters);
  }, [applyFilters, onFilteredPoolsChange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.minAPR > 0 || filters.maxAPR < maxPoolAPR) count++;
    if (filters.minTVL > 0 || filters.maxTVL < maxPoolTVL) count++;
    return count;
  }, [filters, maxPoolAPR, maxPoolTVL]);

  const resetFilters = () => {
    setFilters({
      ...defaultFilters,
      maxAPR: maxPoolAPR,
      maxTVL: maxPoolTVL,
    });
  };

  const formatTVL = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Search Input */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search token pair..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="pl-10 bg-background/50"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Sort Select */}
      <Select value={sortBy} onValueChange={(v) => onSortChange(v as typeof sortBy)}>
        <SelectTrigger className="w-36 bg-background/50">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value="apr">Highest APR</SelectItem>
          <SelectItem value="tvl">Highest TVL</SelectItem>
          <SelectItem value="newest">Newest</SelectItem>
        </SelectContent>
      </Select>

      {/* Advanced Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="default"
            className={cn(
              "gap-2 bg-background/50",
              activeFilterCount > 0 && "border-primary/50"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-card border-border" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Advanced Filters
              </h4>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Reset
                </Button>
              )}
            </div>

            {/* APR Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  APR Range
                </label>
                <span className="text-xs text-muted-foreground">
                  {filters.minAPR.toFixed(0)}% - {filters.maxAPR.toFixed(0)}%
                </span>
              </div>
              <div className="px-1">
                <Slider
                  value={[filters.minAPR, filters.maxAPR]}
                  min={0}
                  max={Math.max(maxPoolAPR, 100)}
                  step={1}
                  onValueChange={([min, max]) => 
                    setFilters(prev => ({ ...prev, minAPR: min, maxAPR: max }))
                  }
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minAPR || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    minAPR: Math.max(0, parseFloat(e.target.value) || 0)
                  }))}
                  className="h-8 text-xs"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxAPR || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    maxAPR: parseFloat(e.target.value) || maxPoolAPR
                  }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* TVL Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" />
                  TVL Range
                </label>
                <span className="text-xs text-muted-foreground">
                  {formatTVL(filters.minTVL)} - {formatTVL(filters.maxTVL)}
                </span>
              </div>
              <div className="px-1">
                <Slider
                  value={[filters.minTVL, filters.maxTVL]}
                  min={0}
                  max={maxPoolTVL}
                  step={100}
                  onValueChange={([min, max]) => 
                    setFilters(prev => ({ ...prev, minTVL: min, maxTVL: max }))
                  }
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min TVL"
                  value={filters.minTVL || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    minTVL: Math.max(0, parseFloat(e.target.value) || 0)
                  }))}
                  className="h-8 text-xs"
                />
                <Input
                  type="number"
                  placeholder="Max TVL"
                  value={filters.maxTVL || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    maxTVL: parseFloat(e.target.value) || maxPoolTVL
                  }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Filters</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFilters(prev => ({ ...prev, minAPR: 50 }))}
                >
                  APR &gt; 50%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFilters(prev => ({ ...prev, minAPR: 100 }))}
                >
                  APR &gt; 100%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFilters(prev => ({ ...prev, minTVL: 10000 }))}
                >
                  TVL &gt; $10K
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {filters.search}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {(filters.minAPR > 0 || filters.maxAPR < maxPoolAPR) && (
            <Badge variant="secondary" className="gap-1 pr-1">
              APR: {filters.minAPR}%-{filters.maxAPR}%
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => setFilters(prev => ({ ...prev, minAPR: 0, maxAPR: maxPoolAPR }))}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {(filters.minTVL > 0 || filters.maxTVL < maxPoolTVL) && (
            <Badge variant="secondary" className="gap-1 pr-1">
              TVL: {formatTVL(filters.minTVL)}-{formatTVL(filters.maxTVL)}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => setFilters(prev => ({ ...prev, minTVL: 0, maxTVL: maxPoolTVL }))}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
