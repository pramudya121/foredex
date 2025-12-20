import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TOKEN_LIST, TokenInfo, NEXUS_TESTNET } from '@/config/contracts';
import { Button } from '@/components/ui/button';
import { TokenLogo } from './TokenLogo';
import { Droplets, Loader2, ExternalLink, CheckCircle, Sparkles, Gift, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// Simple ERC20 ABI for minting (test tokens usually have public mint function)
const MINTABLE_TOKEN_ABI = [
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// Tokens that can be minted from faucet (excluding native NEX and WNEX)
const FAUCET_TOKENS = TOKEN_LIST.filter(
  (token) => 
    token.address !== '0x0000000000000000000000000000000000000000' &&
    token.address !== '0x34088CafC2810e1507477c14C215a44b732f5283' // WNEX
);

export function TokenFaucet() {
  const { signer, address, isConnected } = useWeb3();
  const [loading, setLoading] = useState<string | null>(null);
  const [mintedTokens, setMintedTokens] = useState<string[]>([]);
  const [mintProgress, setMintProgress] = useState(0);
  const [dailyMints, setDailyMints] = useState(0);
  const MAX_DAILY_MINTS = 10;

  useEffect(() => {
    // Check daily mint count from localStorage
    const today = new Date().toDateString();
    const stored = localStorage.getItem('foredex-faucet');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        setDailyMints(data.count);
        setMintedTokens(data.tokens || []);
      } else {
        localStorage.setItem('foredex-faucet', JSON.stringify({ date: today, count: 0, tokens: [] }));
      }
    }
  }, []);

  const updateDailyMints = (tokenAddress: string) => {
    const today = new Date().toDateString();
    const newCount = dailyMints + 1;
    const newTokens = [...mintedTokens, tokenAddress];
    setDailyMints(newCount);
    setMintedTokens(newTokens);
    localStorage.setItem('foredex-faucet', JSON.stringify({ 
      date: today, 
      count: newCount, 
      tokens: newTokens 
    }));
  };

  const handleMint = async (token: TokenInfo) => {
    if (!signer || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (dailyMints >= MAX_DAILY_MINTS) {
      toast.error('Daily limit reached', {
        description: 'You can mint again tomorrow',
      });
      return;
    }

    setLoading(token.address);
    setMintProgress(0);

    try {
      const tokenContract = new ethers.Contract(
        token.address,
        MINTABLE_TOKEN_ABI,
        signer
      );

      // Animate progress
      const progressInterval = setInterval(() => {
        setMintProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Mint 1000 tokens
      const amount = ethers.parseUnits('1000', token.decimals);
      
      const tx = await tokenContract.mint(address, amount);
      toast.info(`Minting ${token.symbol}...`, {
        description: 'Waiting for confirmation',
        icon: <Sparkles className="w-4 h-4 text-primary animate-pulse" />,
      });

      await tx.wait();
      
      clearInterval(progressInterval);
      setMintProgress(100);
      
      updateDailyMints(token.address);
      
      toast.success(`Successfully minted 1000 ${token.symbol}!`, {
        icon: <Gift className="w-4 h-4 text-green-500" />,
      });
    } catch (error: any) {
      console.error('Mint error:', error);
      
      // Handle specific errors
      if (error.message?.includes('execution reverted')) {
        toast.error('Mint failed', {
          description: 'This token may not support public minting',
        });
      } else {
        toast.error('Failed to mint tokens', {
          description: error.reason || error.message || 'Unknown error',
        });
      }
    } finally {
      setLoading(null);
      setMintProgress(0);
    }
  };

  const handleMintAll = async () => {
    if (!signer || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    const unmintedTokens = FAUCET_TOKENS.filter(t => !mintedTokens.includes(t.address));
    
    for (const token of unmintedTokens) {
      if (dailyMints >= MAX_DAILY_MINTS) break;
      await handleMint(token);
    }
  };

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Token Faucet</h3>
            <p className="text-sm text-muted-foreground">Get free testnet tokens</p>
          </div>
        </div>
        
        {isConnected && (
          <div className="text-right">
            <div className="text-sm font-medium">{dailyMints}/{MAX_DAILY_MINTS}</div>
            <div className="text-xs text-muted-foreground">Daily mints</div>
          </div>
        )}
      </div>

      {/* Daily limit progress */}
      {isConnected && (
        <div className="mb-6">
          <Progress value={(dailyMints / MAX_DAILY_MINTS) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {MAX_DAILY_MINTS - dailyMints} mints remaining today
          </p>
        </div>
      )}

      {!isConnected ? (
        <div className="text-center py-8 bg-muted/30 rounded-xl border border-border/50">
          <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-2">
            Connect your wallet to use the faucet
          </p>
          <p className="text-xs text-muted-foreground">
            Free tokens for testing on Nexus Testnet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {FAUCET_TOKENS.map((token) => {
            const isMinted = mintedTokens.includes(token.address);
            const isLoading = loading === token.address;

            return (
              <div
                key={token.address}
                className={cn(
                  'flex items-center justify-between p-4 rounded-xl border transition-all',
                  isMinted 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-muted/30 border-border/50 hover:border-primary/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="md" />
                  <div>
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-xs text-muted-foreground">{token.name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isMinted && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  <Button
                    size="sm"
                    variant={isMinted ? 'outline' : 'default'}
                    onClick={() => handleMint(token)}
                    disabled={isLoading}
                    className={cn(
                      isMinted && 'border-green-500/30 text-green-500 hover:bg-green-500/10'
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Minting...
                      </>
                    ) : isMinted ? (
                      'Mint More'
                    ) : (
                      'Mint 1000'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
          
          {/* Mint All Button */}
          {FAUCET_TOKENS.filter(t => !mintedTokens.includes(t.address)).length > 1 && (
            <Button 
              onClick={handleMintAll}
              variant="outline"
              className="w-full mt-4 border-primary/30 hover:bg-primary/10"
              disabled={loading !== null || dailyMints >= MAX_DAILY_MINTS}
            >
              <Gift className="w-4 h-4 mr-2" />
              Mint All Tokens
            </Button>
          )}
        </div>
      )}

      {/* Mint progress overlay */}
      {loading && mintProgress > 0 && (
        <div className="mt-4">
          <Progress value={mintProgress} className="h-1" />
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <TokenLogo 
              symbol={TOKEN_LIST[0].symbol}
              logoURI={TOKEN_LIST[0].logoURI}
              size="sm" 
            />
          </div>
          <div className="flex-1">
            <div className="font-medium mb-1 flex items-center gap-2">
              Need NEX (Native Token)?
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Required</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Get free NEX from the official Nexus testnet faucet for gas fees
            </p>
            <a
              href="https://faucet.nexus.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              Visit Nexus Faucet
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>Testnet tokens only</span>
        <a
          href={NEXUS_TESTNET.blockExplorer}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors inline-flex items-center gap-1"
        >
          Block Explorer
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
