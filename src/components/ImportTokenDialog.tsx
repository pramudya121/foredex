import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TOKEN_LIST, TokenInfo } from '@/config/contracts';
import { ERC20_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { useCustomTokenStore } from '@/stores/customTokenStore';
import { TokenLogo } from './TokenLogo';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportTokenDialogProps {
  trigger?: React.ReactNode;
  onTokenImported?: (token: TokenInfo) => void;
}

export function ImportTokenDialog({ trigger, onTokenImported }: ImportTokenDialogProps) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [error, setError] = useState('');
  
  const { customTokens, addToken, removeToken, hasToken } = useCustomTokenStore();

  const fetchTokenInfo = useCallback(async (tokenAddress: string) => {
    setError('');
    setTokenInfo(null);
    
    // Validate address format
    if (!ethers.isAddress(tokenAddress)) {
      setError('Invalid address format');
      return;
    }
    
    // Check if already exists in default list
    const existsInDefault = TOKEN_LIST.some(
      t => t.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    if (existsInDefault) {
      setError('This token is already in the default list');
      return;
    }
    
    // Check if already imported
    if (hasToken(tokenAddress)) {
      setError('This token is already imported');
      return;
    }
    
    setLoading(true);
    
    try {
      const provider = rpcProvider.getProvider();
      if (!provider) {
        setError('Provider not available');
        return;
      }
      
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      // Fetch token info
      const [symbol, name, decimals] = await Promise.all([
        contract.symbol().catch(() => 'UNKNOWN'),
        contract.name().catch(() => 'Unknown Token'),
        contract.decimals().catch(() => 18),
      ]);
      
      const token: TokenInfo = {
        address: tokenAddress,
        symbol,
        name,
        decimals: Number(decimals),
        logoURI: '', // No logo for custom tokens
      };
      
      setTokenInfo(token);
    } catch (err: any) {
      console.error('Error fetching token info:', err);
      setError('Failed to fetch token info. Make sure the address is a valid ERC20 token.');
    } finally {
      setLoading(false);
    }
  }, [hasToken]);

  const handleImport = () => {
    if (!tokenInfo) return;
    
    addToken(tokenInfo);
    toast.success(`${tokenInfo.symbol} imported successfully!`);
    onTokenImported?.(tokenInfo);
    
    // Reset state
    setAddress('');
    setTokenInfo(null);
    setOpen(false);
  };

  const handleRemoveToken = (token: TokenInfo) => {
    removeToken(token.address);
    toast.success(`${token.symbol} removed from imported tokens`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Import Token
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Token</DialogTitle>
          <DialogDescription>
            Import a custom ERC20 token by entering its contract address.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="token-address">Token Contract Address</Label>
            <Input
              id="token-address"
              placeholder="0x..."
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setTokenInfo(null);
                setError('');
              }}
              onBlur={() => {
                if (address && address.length === 42) {
                  fetchTokenInfo(address);
                }
              }}
            />
          </div>
          
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Fetching token info...</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          {tokenInfo && (
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <TokenLogo symbol={tokenInfo.symbol} logoURI={tokenInfo.logoURI} size="md" />
                  <div>
                    <p className="font-medium">{tokenInfo.symbol}</p>
                    <p className="text-sm text-muted-foreground">{tokenInfo.name}</p>
                  </div>
                </div>
                <Check className="w-5 h-5 text-green-500" />
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium">Address:</span> {tokenInfo.address.slice(0, 10)}...{tokenInfo.address.slice(-8)}</p>
                <p><span className="font-medium">Decimals:</span> {tokenInfo.decimals}</p>
              </div>
              
              <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Anyone can create a token with any name. Make sure this is the token you want to trade.
                  </p>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4" 
                onClick={handleImport}
              >
                Import {tokenInfo.symbol}
              </Button>
            </div>
          )}
          
          {customTokens.length > 0 && (
            <div className="space-y-2">
              <Label>Imported Tokens</Label>
              <ScrollArea className="h-[150px] rounded-lg border">
                <div className="p-2 space-y-2">
                  {customTokens.map((token) => (
                    <div 
                      key={token.address}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{token.symbol}</p>
                          <p className="text-xs text-muted-foreground">{token.name}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveToken(token)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
