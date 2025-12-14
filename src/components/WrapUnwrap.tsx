import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TOKENS, NEXUS_TESTNET } from '@/config/contracts';
import { WETH_ABI, ERC20_ABI } from '@/config/abis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownUp, Loader2, ExternalLink, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { addTransaction, updateTransactionStatus } from './TransactionHistory';

export function WrapUnwrap() {
  const { provider, signer, address, isConnected, balance } = useWeb3();
  const [activeTab, setActiveTab] = useState<'wrap' | 'unwrap'>('wrap');
  const [amount, setAmount] = useState('');
  const [wnexBalance, setWnexBalance] = useState('0');
  const [loading, setLoading] = useState(false);

  // Fetch WNEX balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!provider || !address) return;
      
      try {
        const wnex = new ethers.Contract(TOKENS.WNEX, ERC20_ABI, provider);
        const bal = await wnex.balanceOf(address);
        setWnexBalance(ethers.formatEther(bal));
      } catch (error) {
        console.error('Failed to fetch WNEX balance:', error);
      }
    };
    
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [provider, address]);

  const handleWrap = async () => {
    if (!signer || !address || !amount) return;
    
    setLoading(true);
    try {
      const wnex = new ethers.Contract(TOKENS.WNEX, WETH_ABI, signer);
      const amountWei = ethers.parseEther(amount);
      
      toast.info('Wrapping NEX...', { description: 'Please confirm in your wallet' });
      
      const tx = await wnex.deposit({ value: amountWei });
      
      addTransaction(address, {
        hash: tx.hash,
        type: 'approve',
        description: `Wrap ${amount} NEX → WNEX`,
        timestamp: Date.now(),
        status: 'pending',
      });
      
      await tx.wait();
      updateTransactionStatus(address, tx.hash, 'confirmed');
      
      toast.success(`Successfully wrapped ${amount} NEX to WNEX!`);
      setAmount('');
      
      // Refresh balance
      const bal = await wnex.balanceOf(address);
      setWnexBalance(ethers.formatEther(bal));
    } catch (error: any) {
      console.error('Wrap error:', error);
      toast.error('Failed to wrap NEX', {
        description: error.reason || error.message || 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnwrap = async () => {
    if (!signer || !address || !amount) return;
    
    setLoading(true);
    try {
      const wnex = new ethers.Contract(TOKENS.WNEX, WETH_ABI, signer);
      const amountWei = ethers.parseEther(amount);
      
      toast.info('Unwrapping WNEX...', { description: 'Please confirm in your wallet' });
      
      const tx = await wnex.withdraw(amountWei);
      
      addTransaction(address, {
        hash: tx.hash,
        type: 'approve',
        description: `Unwrap ${amount} WNEX → NEX`,
        timestamp: Date.now(),
        status: 'pending',
      });
      
      await tx.wait();
      updateTransactionStatus(address, tx.hash, 'confirmed');
      
      toast.success(`Successfully unwrapped ${amount} WNEX to NEX!`);
      setAmount('');
      
      // Refresh balance
      const bal = await wnex.balanceOf(address);
      setWnexBalance(ethers.formatEther(bal));
    } catch (error: any) {
      console.error('Unwrap error:', error);
      toast.error('Failed to unwrap WNEX', {
        description: error.reason || error.message || 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const maxBalance = activeTab === 'wrap' 
    ? parseFloat(balance || '0') 
    : parseFloat(wnexBalance);

  const handleMax = () => {
    if (activeTab === 'wrap') {
      // Leave some for gas
      const maxAmount = Math.max(0, parseFloat(balance || '0') - 0.01);
      setAmount(maxAmount.toFixed(6));
    } else {
      setAmount(wnexBalance);
    }
  };

  return (
    <div className="glass-card p-6 w-full max-w-md mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <ArrowDownUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Wrap / Unwrap</h3>
          <p className="text-sm text-muted-foreground">Convert NEX ↔ WNEX</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'wrap' | 'unwrap')}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="wrap">Wrap NEX</TabsTrigger>
          <TabsTrigger value="unwrap">Unwrap WNEX</TabsTrigger>
        </TabsList>

        <TabsContent value="wrap" className="space-y-4">
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">From</span>
              <span className="text-sm text-muted-foreground">
                Balance: {parseFloat(balance || '0').toFixed(4)} NEX
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 text-xl font-medium bg-transparent border-none p-0 focus-visible:ring-0"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMax}
                className="text-primary hover:text-primary/80"
              >
                MAX
              </Button>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">N</span>
                </div>
                <span className="font-medium">NEX</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <ArrowDownUp className="w-5 h-5 text-primary" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">To</span>
              <span className="text-sm text-muted-foreground">
                Balance: {parseFloat(wnexBalance).toFixed(4)} WNEX
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex-1 text-xl font-medium">
                {amount || '0.0'}
              </span>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">W</span>
                </div>
                <span className="font-medium">WNEX</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="unwrap" className="space-y-4">
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">From</span>
              <span className="text-sm text-muted-foreground">
                Balance: {parseFloat(wnexBalance).toFixed(4)} WNEX
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 text-xl font-medium bg-transparent border-none p-0 focus-visible:ring-0"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMax}
                className="text-primary hover:text-primary/80"
              >
                MAX
              </Button>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">W</span>
                </div>
                <span className="font-medium">WNEX</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <ArrowDownUp className="w-5 h-5 text-primary" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">To</span>
              <span className="text-sm text-muted-foreground">
                Balance: {parseFloat(balance || '0').toFixed(4)} NEX
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex-1 text-xl font-medium">
                {amount || '0.0'}
              </span>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">N</span>
                </div>
                <span className="font-medium">NEX</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Box */}
      <div className="mt-4 p-3 rounded-lg bg-muted/20 text-sm text-muted-foreground">
        <p>
          {activeTab === 'wrap' 
            ? 'Wrap your native NEX tokens to WNEX (ERC-20) for use in DeFi protocols.'
            : 'Unwrap your WNEX tokens back to native NEX.'}
        </p>
      </div>

      {isConnected ? (
        <Button
          onClick={activeTab === 'wrap' ? handleWrap : handleUnwrap}
          disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxBalance}
          className={cn(
            'w-full h-14 text-lg font-semibold mt-4 btn-glow',
            'bg-gradient-wolf hover:opacity-90'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {activeTab === 'wrap' ? 'Wrapping...' : 'Unwrapping...'}
            </>
          ) : (
            <>
              <ArrowDownUp className="w-5 h-5 mr-2" />
              {activeTab === 'wrap' ? 'Wrap NEX' : 'Unwrap WNEX'}
            </>
          )}
        </Button>
      ) : (
        <Button disabled className="w-full h-14 mt-4" variant="secondary">
          <Wallet className="w-5 h-5 mr-2" />
          Connect Wallet
        </Button>
      )}

      {/* Contract Link */}
      <div className="mt-4 text-center">
        <a
          href={`${NEXUS_TESTNET.blockExplorer}/address/${TOKENS.WNEX}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
        >
          WNEX Contract
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
