import { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TOKEN_LIST, TokenInfo, NEXUS_TESTNET } from '@/config/contracts';
import { Button } from '@/components/ui/button';
import { TokenLogo } from './TokenLogo';
import { Droplets, Loader2, ExternalLink, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

  const handleMint = async (token: TokenInfo) => {
    if (!signer || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    setLoading(token.address);

    try {
      const tokenContract = new ethers.Contract(
        token.address,
        MINTABLE_TOKEN_ABI,
        signer
      );

      // Mint 1000 tokens
      const amount = ethers.parseUnits('1000', token.decimals);
      
      const tx = await tokenContract.mint(address, amount);
      toast.info(`Minting ${token.symbol}...`, {
        description: 'Waiting for confirmation',
      });

      await tx.wait();
      
      setMintedTokens((prev) => [...prev, token.address]);
      toast.success(`Successfully minted 1000 ${token.symbol}!`);
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
    }
  };

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Droplets className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Token Faucet</h3>
          <p className="text-sm text-muted-foreground">Get free testnet tokens</p>
        </div>
      </div>

      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Connect your wallet to use the faucet
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
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/30">
        <div className="flex items-start gap-3">
          <TokenLogo 
            symbol={TOKEN_LIST[0].symbol}
            logoURI={TOKEN_LIST[0].logoURI}
            size="md" 
          />
          <div className="flex-1">
            <div className="font-medium mb-1">Need NEX (Native Token)?</div>
            <p className="text-sm text-muted-foreground mb-3">
              Get free NEX from the official Nexus testnet faucet
            </p>
            <a
              href="https://faucet.nexus.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Visit Nexus Faucet
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Block Explorer Link */}
      <div className="mt-4 text-center">
        <a
          href={NEXUS_TESTNET.blockExplorer}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
        >
          View on Block Explorer
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
