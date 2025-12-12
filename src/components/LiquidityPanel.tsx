import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TokenSelect } from './TokenSelect';
import { SlippageSettings } from './SlippageSettings';
import { TokenLogo } from './TokenLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TOKEN_LIST, TokenInfo, CONTRACTS, TOKENS } from '@/config/contracts';
import { ROUTER_ABI, ERC20_ABI, PAIR_ABI } from '@/config/abis';
import { Plus, Minus, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  getReserves, 
  quote, 
  calculatePoolShare, 
  calculateRemoveLiquidity,
} from '@/lib/uniswapV2Library';
import { addTransaction, updateTransactionStatus } from './TransactionHistory';

export function LiquidityPanel() {
  const { provider, signer, address, isConnected } = useWeb3();
  const [activeTab, setActiveTab] = useState('add');
  const [tokenA, setTokenA] = useState<TokenInfo | null>(TOKEN_LIST[0]);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(TOKEN_LIST[4]);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [balanceA, setBalanceA] = useState('0');
  const [balanceB, setBalanceB] = useState('0');
  const [lpBalance, setLpBalance] = useState('0');
  const [lpToRemove, setLpToRemove] = useState('');
  const [loading, setLoading] = useState(false);
  const [pairAddress, setPairAddress] = useState<string | null>(null);
  const [poolShare, setPoolShare] = useState(0);
  const [slippage, setSlippage] = useState(0.5);
  const [deadline, setDeadline] = useState(20);
  const [reserves, setReserves] = useState<{ reserveA: bigint; reserveB: bigint }>({ reserveA: BigInt(0), reserveB: BigInt(0) });
  const [totalSupply, setTotalSupply] = useState(BigInt(0));
  const [removeAmounts, setRemoveAmounts] = useState<{ amountA: string; amountB: string }>({ amountA: '0', amountB: '0' });
  const [estimatedShare, setEstimatedShare] = useState(0);

  const isNativeToken = (token: TokenInfo | null) =>
    token?.address === '0x0000000000000000000000000000000000000000';

  const getTokenAddress = (token: TokenInfo) =>
    isNativeToken(token) ? TOKENS.WETH : token.address;

  // Fetch pair and balances
  const fetchData = useCallback(async () => {
    if (!provider || !address || !tokenA || !tokenB) return;

    try {
      // Fetch token balances
      if (isNativeToken(tokenA)) {
        const bal = await provider.getBalance(address);
        setBalanceA(ethers.formatEther(bal));
      } else {
        const contract = new ethers.Contract(tokenA.address, ERC20_ABI, provider);
        const bal = await contract.balanceOf(address);
        setBalanceA(ethers.formatUnits(bal, tokenA.decimals));
      }

      if (isNativeToken(tokenB)) {
        const bal = await provider.getBalance(address);
        setBalanceB(ethers.formatEther(bal));
      } else {
        const contract = new ethers.Contract(tokenB.address, ERC20_ABI, provider);
        const bal = await contract.balanceOf(address);
        setBalanceB(ethers.formatUnits(bal, tokenB.decimals));
      }

      // Check if pair exists and get reserves using library
      const tokenAAddr = getTokenAddress(tokenA);
      const tokenBAddr = getTokenAddress(tokenB);
      
      const { reserveA, reserveB, pairAddress: pair } = await getReserves(provider, tokenAAddr, tokenBAddr);
      
      if (pair !== ethers.ZeroAddress) {
        setPairAddress(pair);
        setReserves({ reserveA, reserveB });
        
        const pairContract = new ethers.Contract(pair, PAIR_ABI, provider);
        const [lpBal, supply] = await Promise.all([
          pairContract.balanceOf(address),
          pairContract.totalSupply()
        ]);
        
        setLpBalance(ethers.formatEther(lpBal));
        setTotalSupply(BigInt(supply));
        
        // Calculate pool share using library
        const share = calculatePoolShare(BigInt(lpBal), BigInt(supply));
        setPoolShare(share);
      } else {
        setPairAddress(null);
        setLpBalance('0');
        setPoolShare(0);
        setReserves({ reserveA: BigInt(0), reserveB: BigInt(0) });
        setTotalSupply(BigInt(0));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [provider, address, tokenA, tokenB]);

  // Auto-calculate amountB when amountA changes (using library quote)
  useEffect(() => {
    if (!amountA || !tokenA || !tokenB) {
      setEstimatedShare(0);
      return;
    }
    
    if (reserves.reserveA === BigInt(0) || reserves.reserveB === BigInt(0)) {
      // New pool - 100% share
      setEstimatedShare(100);
      return;
    }
    
    try {
      const amountAWei = ethers.parseUnits(amountA, tokenA.decimals);
      const amountBWei = quote(amountAWei, reserves.reserveA, reserves.reserveB);
      setAmountB(ethers.formatUnits(amountBWei, tokenB.decimals));
      
      // Estimate pool share after adding liquidity
      const newTotalA = reserves.reserveA + amountAWei;
      const share = Number(amountAWei * BigInt(100)) / Number(newTotalA);
      setEstimatedShare(share);
    } catch {
      setEstimatedShare(0);
    }
  }, [amountA, reserves, tokenA, tokenB]);

  // Calculate expected amounts when removing liquidity
  useEffect(() => {
    if (!lpToRemove || !tokenA || !tokenB || totalSupply === BigInt(0)) {
      setRemoveAmounts({ amountA: '0', amountB: '0' });
      return;
    }
    
    try {
      const lpWei = ethers.parseUnits(lpToRemove, 18);
      const { amountA: outA, amountB: outB } = calculateRemoveLiquidity(
        lpWei, 
        reserves.reserveA, 
        reserves.reserveB, 
        totalSupply
      );
      
      setRemoveAmounts({
        amountA: ethers.formatUnits(outA, tokenA.decimals),
        amountB: ethers.formatUnits(outB, tokenB.decimals)
      });
    } catch {
      setRemoveAmounts({ amountA: '0', amountB: '0' });
    }
  }, [lpToRemove, reserves, totalSupply, tokenA, tokenB]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddLiquidity = async () => {
    if (!signer || !tokenA || !tokenB || !amountA || !amountB || !provider) return;

    setLoading(true);
    try {
      const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
      const amountAWei = ethers.parseUnits(amountA, tokenA.decimals);
      const amountBWei = ethers.parseUnits(amountB, tokenB.decimals);
      
      // Use block timestamp to avoid clock sync issues
      const block = await provider.getBlock('latest');
      const txDeadline = (block?.timestamp || Math.floor(Date.now() / 1000)) + 60 * deadline;
      
      // Calculate minimum amounts with slippage
      const amountAMin = amountAWei * BigInt(Math.floor((100 - slippage) * 100)) / BigInt(10000);
      const amountBMin = amountBWei * BigInt(Math.floor((100 - slippage) * 100)) / BigInt(10000);

      // Approve tokens if needed
      if (!isNativeToken(tokenA)) {
        const tokenContract = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(address, CONTRACTS.ROUTER);
        if (allowance < amountAWei) {
          const approveTx = await tokenContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
          await approveTx.wait();
          toast.success(`${tokenA.symbol} approved!`);
        }
      }

      if (!isNativeToken(tokenB)) {
        const tokenContract = new ethers.Contract(tokenB.address, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(address, CONTRACTS.ROUTER);
        if (allowance < amountBWei) {
          const approveTx = await tokenContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
          await approveTx.wait();
          toast.success(`${tokenB.symbol} approved!`);
        }
      }

      let tx;
      if (isNativeToken(tokenA)) {
        tx = await router.addLiquidityETH(
          getTokenAddress(tokenB),
          amountBWei,
          amountBMin,
          amountAMin,
          address,
          txDeadline,
          { value: amountAWei }
        );
      } else if (isNativeToken(tokenB)) {
        tx = await router.addLiquidityETH(
          getTokenAddress(tokenA),
          amountAWei,
          amountAMin,
          amountBMin,
          address,
          txDeadline,
          { value: amountBWei }
        );
      } else {
        tx = await router.addLiquidity(
          getTokenAddress(tokenA),
          getTokenAddress(tokenB),
          amountAWei,
          amountBWei,
          amountAMin,
          amountBMin,
          address,
          txDeadline
        );
      }

      // Track transaction
      addTransaction(address, {
        hash: tx.hash,
        type: 'add_liquidity',
        description: `Add ${amountA} ${tokenA.symbol} + ${parseFloat(amountB).toFixed(4)} ${tokenB.symbol}`,
        timestamp: Date.now(),
        status: 'pending',
      });

      toast.info('Transaction submitted...');
      const receipt = await tx.wait();
      updateTransactionStatus(address, tx.hash, 'confirmed');
      toast.success(`Liquidity added! TX: ${receipt.hash.slice(0, 10)}...`);
      
      setAmountA('');
      setAmountB('');
      fetchData();
    } catch (error: any) {
      console.error('Add liquidity error:', error);
      toast.error(error.reason || error.message || 'Failed to add liquidity');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!signer || !tokenA || !tokenB || !lpToRemove || !pairAddress || !provider) return;

    setLoading(true);
    try {
      const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
      const lpWei = ethers.parseUnits(lpToRemove, 18);
      
      // Use block timestamp to avoid clock sync issues
      const block = await provider.getBlock('latest');
      const txDeadline = (block?.timestamp || Math.floor(Date.now() / 1000)) + 60 * deadline;

      // Approve LP tokens
      const pairContract = new ethers.Contract(pairAddress, ERC20_ABI, signer);
      const allowance = await pairContract.allowance(address, CONTRACTS.ROUTER);
      if (allowance < lpWei) {
        const approveTx = await pairContract.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
        await approveTx.wait();
        toast.success('LP tokens approved!');
      }

      let tx;
      if (isNativeToken(tokenA) || isNativeToken(tokenB)) {
        const tokenAddress = isNativeToken(tokenA) ? getTokenAddress(tokenB) : getTokenAddress(tokenA);
        tx = await router.removeLiquidityETH(tokenAddress, lpWei, 0, 0, address, txDeadline);
      } else {
        tx = await router.removeLiquidity(
          getTokenAddress(tokenA),
          getTokenAddress(tokenB),
          lpWei,
          0,
          0,
          address,
          txDeadline
        );
      }

      // Track transaction
      addTransaction(address, {
        hash: tx.hash,
        type: 'remove_liquidity',
        description: `Remove ${lpToRemove} LP (${tokenA.symbol}/${tokenB.symbol})`,
        timestamp: Date.now(),
        status: 'pending',
      });

      toast.info('Transaction submitted...');
      const receipt = await tx.wait();
      updateTransactionStatus(address, tx.hash, 'confirmed');
      toast.success(`Liquidity removed! TX: ${receipt.hash.slice(0, 10)}...`);
      
      setLpToRemove('');
      fetchData();
    } catch (error: any) {
      console.error('Remove liquidity error:', error);
      toast.error(error.reason || error.message || 'Failed to remove liquidity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 w-full max-w-md mx-auto animate-fade-in animated-border">
      {/* Header with Settings */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Manage Liquidity</h2>
        <SlippageSettings
          slippage={slippage}
          onSlippageChange={setSlippage}
          deadline={deadline}
          onDeadlineChange={setDeadline}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="add" className="gap-2">
            <Plus className="w-4 h-4" />
            Add
          </TabsTrigger>
          <TabsTrigger value="remove" className="gap-2">
            <Minus className="w-4 h-4" />
            Remove
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-4">
          {/* Token A */}
          <div className="token-input">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Token A</span>
              <span className="text-sm text-muted-foreground">
                Balance: {parseFloat(balanceA).toFixed(4)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="0.0"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                className="flex-1 text-xl font-medium bg-transparent border-none p-0 focus-visible:ring-0"
              />
              <TokenSelect selected={tokenA} onSelect={setTokenA} excludeToken={tokenB} />
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Token B */}
          <div className="token-input">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Token B</span>
              <span className="text-sm text-muted-foreground">
                Balance: {parseFloat(balanceB).toFixed(4)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="0.0"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                className="flex-1 text-xl font-medium bg-transparent border-none p-0 focus-visible:ring-0"
              />
              <TokenSelect selected={tokenB} onSelect={setTokenB} excludeToken={tokenA} />
            </div>
          </div>

          {/* Pool Info */}
          {pairAddress && tokenA && tokenB && (
            <div className="p-3 rounded-lg bg-muted/30 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Info className="w-4 h-4" />
                <span>Pool Info</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reserve {tokenA.symbol}</span>
                <span>{ethers.formatUnits(reserves.reserveA, tokenA.decimals).slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reserve {tokenB.symbol}</span>
                <span>{ethers.formatUnits(reserves.reserveB, tokenB.decimals).slice(0, 10)}</span>
              </div>
              {amountA && estimatedShare > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Est. Pool Share</span>
                  <span>{estimatedShare.toFixed(2)}%</span>
                </div>
              )}
            </div>
          )}

          {!pairAddress && tokenA && tokenB && amountA && amountB && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
              <p className="text-primary font-medium">New Pool</p>
              <p className="text-muted-foreground">You will be the first liquidity provider.</p>
            </div>
          )}

          {isConnected ? (
            <Button
              onClick={handleAddLiquidity}
              disabled={loading || !amountA || !amountB}
              className={cn(
                'w-full h-14 text-lg font-semibold btn-glow',
                'bg-gradient-wolf hover:opacity-90'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Adding Liquidity...
                </>
              ) : (
                'Add Liquidity'
              )}
            </Button>
          ) : (
            <Button disabled className="w-full h-14" variant="secondary">
              Connect Wallet
            </Button>
          )}
        </TabsContent>

        <TabsContent value="remove" className="space-y-4">
          {/* Token Selection for Remove */}
          <div className="flex gap-2 mb-4">
            <TokenSelect selected={tokenA} onSelect={setTokenA} excludeToken={tokenB} className="flex-1" />
            <TokenSelect selected={tokenB} onSelect={setTokenB} excludeToken={tokenA} className="flex-1" />
          </div>

          {/* LP Balance */}
          <div className="token-input">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">LP Tokens to Remove</span>
              <span className="text-sm text-muted-foreground">
                Balance: {parseFloat(lpBalance).toFixed(6)}
                <button
                  onClick={() => setLpToRemove(lpBalance)}
                  className="ml-2 text-primary hover:underline"
                >
                  MAX
                </button>
              </span>
            </div>
            <Input
              type="number"
              placeholder="0.0"
              value={lpToRemove}
              onChange={(e) => setLpToRemove(e.target.value)}
              className="text-xl font-medium bg-transparent border-none focus-visible:ring-0"
            />
          </div>

          {/* Expected output */}
          {lpToRemove && parseFloat(lpToRemove) > 0 && pairAddress && (
            <div className="p-3 rounded-lg bg-muted/30 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Info className="w-4 h-4" />
                <span>You will receive</span>
              </div>
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <TokenLogo symbol={tokenA?.symbol || ''} logoURI={tokenA?.logoURI} size="sm" />
                  <span>{tokenA?.symbol}</span>
                </div>
                <span className="font-mono">{parseFloat(removeAmounts.amountA).toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <TokenLogo symbol={tokenB?.symbol || ''} logoURI={tokenB?.logoURI} size="sm" />
                  <span>{tokenB?.symbol}</span>
                </div>
                <span className="font-mono">{parseFloat(removeAmounts.amountB).toFixed(6)}</span>
              </div>
            </div>
          )}

          {!pairAddress && tokenA && tokenB && (
            <div className="p-4 rounded-lg bg-muted/30 text-center text-muted-foreground">
              No pool exists for this pair
            </div>
          )}

          {isConnected ? (
            <Button
              onClick={handleRemoveLiquidity}
              disabled={loading || !lpToRemove || !pairAddress || parseFloat(lpToRemove) === 0}
              className={cn(
                'w-full h-14 text-lg font-semibold',
                'bg-destructive hover:bg-destructive/90'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Removing Liquidity...
                </>
              ) : (
                'Remove Liquidity'
              )}
            </Button>
          ) : (
            <Button disabled className="w-full h-14" variant="secondary">
              Connect Wallet
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
