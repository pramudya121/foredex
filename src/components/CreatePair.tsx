import { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, TOKEN_LIST } from '@/config/contracts';
import { FACTORY_ABI } from '@/config/abis';
import { Button } from '@/components/ui/button';
import { TokenSelect } from '@/components/TokenSelect';
import { Plus, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { NEXUS_TESTNET } from '@/config/contracts';

export function CreatePair() {
  const { signer, isConnected } = useWeb3();
  const [tokenA, setTokenA] = useState(TOKEN_LIST[1]); // WNEX
  const [tokenB, setTokenB] = useState(TOKEN_LIST[2]); // MON
  const [loading, setLoading] = useState(false);
  const [createdPair, setCreatedPair] = useState<string | null>(null);

  const handleCreatePair = async () => {
    if (!signer || !isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (tokenA.address === tokenB.address) {
      toast.error('Please select different tokens');
      return;
    }

    setLoading(true);
    setCreatedPair(null);

    try {
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, signer);

      // Check if pair already exists
      const existingPair = await factory.getPair(tokenA.address, tokenB.address);
      if (existingPair !== ethers.ZeroAddress) {
        toast.info('This pair already exists!', {
          description: `Pair: ${existingPair.slice(0, 10)}...`,
        });
        setCreatedPair(existingPair);
        setLoading(false);
        return;
      }

      toast.info('Creating pair...', { description: 'Please confirm in your wallet' });

      const tx = await factory.createPair(tokenA.address, tokenB.address);
      
      toast.info('Transaction submitted', {
        description: 'Waiting for confirmation...',
      });

      const receipt = await tx.wait();
      
      // Get the created pair address from events
      const pairCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === 'PairCreated';
        } catch {
          return false;
        }
      });

      let pairAddress = '';
      if (pairCreatedEvent) {
        const parsed = factory.interface.parseLog(pairCreatedEvent);
        pairAddress = parsed?.args?.pair || '';
      }

      setCreatedPair(pairAddress);
      
      toast.success('Pair created successfully!', {
        description: `${tokenA.symbol}/${tokenB.symbol} pair is now available`,
      });
    } catch (error: any) {
      console.error('Create pair error:', error);
      toast.error('Failed to create pair', {
        description: error.reason || error.message || 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5 text-primary" />
        Create New Pair
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Token A</label>
            <TokenSelect
              selected={tokenA}
              onSelect={setTokenA}
              excludeToken={tokenB}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Token B</label>
            <TokenSelect
              selected={tokenB}
              onSelect={setTokenB}
              excludeToken={tokenA}
            />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleCreatePair}
          disabled={!isConnected || loading || tokenA.address === tokenB.address}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Pair...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create {tokenA.symbol}/{tokenB.symbol} Pair
            </>
          )}
        </Button>

        {createdPair && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Pair Created!</span>
            </div>
            <div className="flex items-center justify-between">
              <code className="text-sm text-muted-foreground">
                {createdPair.slice(0, 20)}...{createdPair.slice(-8)}
              </code>
              <a
                href={`${NEXUS_TESTNET.blockExplorer}/address/${createdPair}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {!isConnected && (
          <p className="text-sm text-center text-muted-foreground">
            Connect your wallet to create a pair
          </p>
        )}
      </div>
    </div>
  );
}
