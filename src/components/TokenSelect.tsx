import { useState } from 'react';
import { TOKEN_LIST, TokenInfo } from '@/config/contracts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenSelectProps {
  selected: TokenInfo | null;
  onSelect: (token: TokenInfo) => void;
  excludeToken?: TokenInfo | null;
  className?: string;
}

export function TokenSelect({ selected, onSelect, excludeToken, className }: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTokens = TOKEN_LIST.filter((token) => {
    if (excludeToken && token.address === excludeToken.address) return false;
    if (!search) return true;
    return (
      token.symbol.toLowerCase().includes(search.toLowerCase()) ||
      token.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleSelect = (token: TokenInfo) => {
    onSelect(token);
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'gap-2 h-auto py-2 px-3 border-border/50 hover:border-primary/50 transition-all',
            className
          )}
        >
          {selected ? (
            <>
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                {selected.symbol[0]}
              </div>
              <span className="font-semibold">{selected.symbol}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Select token</span>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border/50">
        <DialogHeader>
          <DialogTitle>Select a token</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted/50 border-border/50"
            />
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {filteredTokens.map((token) => (
              <button
                key={token.address}
                onClick={() => handleSelect(token)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
                  'hover:bg-primary/10 text-left',
                  selected?.address === token.address && 'bg-primary/10'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                  {token.symbol[0]}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{token.symbol}</div>
                  <div className="text-xs text-muted-foreground">{token.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
