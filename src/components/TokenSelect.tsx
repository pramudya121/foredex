import { useState } from 'react';
import { TOKEN_LIST, TokenInfo } from '@/config/contracts';
import { Button } from '@/components/ui/button';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search, X, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWeb3 } from '@/contexts/Web3Context';
import { useTokenBalances } from '@/hooks/useTokenBalances';

interface TokenSelectProps {
  selected: TokenInfo | null;
  onSelect: (token: TokenInfo) => void;
  excludeToken?: TokenInfo | null;
  className?: string;
}

export function TokenSelect({ selected, onSelect, excludeToken, className }: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { address, isConnected } = useWeb3();
  const { getBalance, loading: balancesLoading } = useTokenBalances(address);

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

  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    if (isNaN(num) || num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
    return (num / 1000000).toFixed(2) + 'M';
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'gap-2 h-auto py-2 px-3 border-border/50 hover:border-primary/50 transition-all relative z-10',
            className
          )}
        >
          {selected ? (
            <>
              {selected.logoURI ? (
                <img 
                  src={selected.logoURI} 
                  alt={selected.symbol} 
                  className="w-6 h-6 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold ${selected.logoURI ? 'hidden' : ''}`}>
                {selected.symbol[0]}
              </div>
              <span className="font-semibold">{selected.symbol}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Select token</span>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-border/50 bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
              Select a token
            </DialogPrimitive.Title>
            {isConnected && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                Your balances shown
              </p>
            )}
          </div>
          
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
              {filteredTokens.map((token) => {
                const balance = isConnected ? getBalance(token.address) : '0';
                const hasBalance = parseFloat(balance) > 0;
                
                return (
                  <button
                    key={token.address}
                    type="button"
                    onClick={() => handleSelect(token)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
                      'hover:bg-primary/10 text-left',
                      selected?.address === token.address && 'bg-primary/10',
                      hasBalance && 'bg-primary/5'
                    )}
                  >
                    {token.logoURI ? (
                      <img 
                        src={token.logoURI} 
                        alt={token.symbol} 
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold ${token.logoURI ? 'hidden' : ''}`}>
                      {token.symbol[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{token.symbol}</div>
                      <div className="text-xs text-muted-foreground truncate">{token.name}</div>
                    </div>
                    {isConnected && (
                      <div className="text-right shrink-0">
                        {balancesLoading ? (
                          <div className="text-xs text-muted-foreground">Loading...</div>
                        ) : (
                          <>
                            <div className={cn(
                              "text-sm font-medium",
                              hasBalance ? "text-primary" : "text-muted-foreground"
                            )}>
                              {formatBalance(balance)}
                            </div>
                            <div className="text-xs text-muted-foreground">Balance</div>
                          </>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
