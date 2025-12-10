import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { TokenSelect } from './TokenSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TOKEN_LIST, TokenInfo, CONTRACTS, TOKENS } from '@/config/contracts';
import { ROUTER_ABI, ERC20_ABI, FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  getReserves, 
  quote, 
  calculatePoolShare, 
  calculateRemoveLiquidity,
  calculateLiquidityMinted 
} from '@/lib/uniswapV2Library';

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
  const [reserves, setReserves] = useState<{ reserveA: bigint; reserveB: bigint }>({ reserveA: BigInt(0), reserveB: BigInt(0) });
  const [totalSupply, setTotalSupply] = useState(BigInt(0));
  const [removeAmounts, setRemoveAmounts] = useState<{ amountA: string; amountB: string }>({ amountA: '0', amountB: '0' });

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
    if (!amountA || reserves.reserveA === BigInt(0) || reserves.reserveB === BigInt(0) || !tokenA) {
      return;
    }
    
    try {
      const amountAWei = ethers.parseUnits(amountA, tokenA.decimals);
      const amountBWei = quote(amountAWei, reserves.reserveA, reserves.reserveB);
      setAmountB(ethers.formatUnits(amountBWei, tokenB?.decimals || 18));
    } catch {
      // New pool - no quote needed
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
    if (!signer || !tokenA || !tokenB || !amountA || !amountB) return;

    setLoading(true);
    try {
      const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
      const amountAWei = ethers.parseUnits(amountA, tokenA.decimals);
      const amountBWei = ethers.parseUnits(amountB, tokenB.decimals);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

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
          0,
          0,
          address,
          deadline,
          { value: amountAWei }
        );
      } else if (isNativeToken(tokenB)) {
        tx = await router.addLiquidityETH(
          getTokenAddress(tokenA),
          amountAWei,
          0,
          0,
          address,
          deadline,
          { value: amountBWei }
        );
      } else {
        tx = await router.addLiquidity(
          getTokenAddress(tokenA),
          getTokenAddress(tokenB),
          amountAWei,
          amountBWei,
          0,
          0,
          address,
          deadline
        );
      }

      toast.info('Transaction submitted...');
      const receipt = await tx.wait();
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
    if (!signer || !tokenA || !tokenB || !lpToRemove || !pairAddress) return;

    setLoading(true);
    try {
      const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
      const lpWei = ethers.parseUnits(lpToRemove, 18);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

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
        tx = await router.removeLiquidityETH(tokenAddress, lpWei, 0, 0, address, deadline);
      } else {
        tx = await router.removeLiquidity(
          getTokenAddress(tokenA),
          getTokenAddress(tokenB),
          lpWei,
          0,
          0,
          address,
          deadline
        );
      }

      toast.info('Transaction submitted...');
      const receipt = await tx.wait();
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
