// UniswapV2Library - Frontend implementation
// Port of Solidity library functions to TypeScript for off-chain calculations

import { ethers } from 'ethers';
import { CONTRACTS, TOKENS } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';

// Constants
const MINIMUM_LIQUIDITY = BigInt(1000);

// Sort tokens to get consistent pair addresses
export function sortTokens(tokenA: string, tokenB: string): [string, string] {
  if (tokenA.toLowerCase() === tokenB.toLowerCase()) {
    throw new Error('UniswapV2Library: IDENTICAL_ADDRESSES');
  }
  
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() 
    ? [tokenA, tokenB] 
    : [tokenB, tokenA];
  
  if (token0 === ethers.ZeroAddress) {
    throw new Error('UniswapV2Library: ZERO_ADDRESS');
  }
  
  return [token0, token1];
}

// Calculate pair address using CREATE2
export function pairFor(factory: string, tokenA: string, tokenB: string, initCodeHash: string): string {
  const [token0, token1] = sortTokens(tokenA, tokenB);
  
  const salt = ethers.keccak256(
    ethers.solidityPacked(['address', 'address'], [token0, token1])
  );
  
  const pair = ethers.getCreate2Address(factory, salt, initCodeHash);
  
  return pair;
}

// Get reserves for a pair
export async function getReserves(
  provider: ethers.Provider,
  tokenA: string,
  tokenB: string
): Promise<{ reserveA: bigint; reserveB: bigint; pairAddress: string }> {
  const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
  
  const pairAddress = await factory.getPair(tokenA, tokenB);
  
  if (pairAddress === ethers.ZeroAddress) {
    return { reserveA: BigInt(0), reserveB: BigInt(0), pairAddress: ethers.ZeroAddress };
  }
  
  const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
  const [reserve0, reserve1] = await pair.getReserves();
  const token0 = await pair.token0();
  
  const [reserveA, reserveB] = tokenA.toLowerCase() === token0.toLowerCase()
    ? [reserve0, reserve1]
    : [reserve1, reserve0];
  
  return { reserveA: BigInt(reserveA), reserveB: BigInt(reserveB), pairAddress };
}

// Given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
export function quote(amountA: bigint, reserveA: bigint, reserveB: bigint): bigint {
  if (amountA <= BigInt(0)) {
    throw new Error('UniswapV2Library: INSUFFICIENT_AMOUNT');
  }
  if (reserveA <= BigInt(0) || reserveB <= BigInt(0)) {
    throw new Error('UniswapV2Library: INSUFFICIENT_LIQUIDITY');
  }
  
  return (amountA * reserveB) / reserveA;
}

// Given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
export function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn <= BigInt(0)) {
    throw new Error('UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
  }
  if (reserveIn <= BigInt(0) || reserveOut <= BigInt(0)) {
    throw new Error('UniswapV2Library: INSUFFICIENT_LIQUIDITY');
  }
  
  const amountInWithFee = amountIn * BigInt(997);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * BigInt(1000) + amountInWithFee;
  
  return numerator / denominator;
}

// Given an output amount of an asset and pair reserves, returns a required input amount of the other asset
export function getAmountIn(amountOut: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountOut <= BigInt(0)) {
    throw new Error('UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');
  }
  if (reserveIn <= BigInt(0) || reserveOut <= BigInt(0)) {
    throw new Error('UniswapV2Library: INSUFFICIENT_LIQUIDITY');
  }
  
  const numerator = reserveIn * amountOut * BigInt(1000);
  const denominator = (reserveOut - amountOut) * BigInt(997);
  
  return numerator / denominator + BigInt(1);
}

// Performs chained getAmountOut calculations on any number of pairs
export function getAmountsOut(amountIn: bigint, path: string[], reserves: bigint[][]): bigint[] {
  if (path.length < 2) {
    throw new Error('UniswapV2Library: INVALID_PATH');
  }
  
  const amounts: bigint[] = new Array(path.length);
  amounts[0] = amountIn;
  
  for (let i = 0; i < path.length - 1; i++) {
    const [reserveIn, reserveOut] = reserves[i];
    amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
  }
  
  return amounts;
}

// Performs chained getAmountIn calculations on any number of pairs
export function getAmountsIn(amountOut: bigint, path: string[], reserves: bigint[][]): bigint[] {
  if (path.length < 2) {
    throw new Error('UniswapV2Library: INVALID_PATH');
  }
  
  const amounts: bigint[] = new Array(path.length);
  amounts[amounts.length - 1] = amountOut;
  
  for (let i = path.length - 1; i > 0; i--) {
    const [reserveIn, reserveOut] = reserves[i - 1];
    amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
  }
  
  return amounts;
}

// Calculate price impact percentage
export function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  if (reserveIn <= BigInt(0) || reserveOut <= BigInt(0)) {
    return 0;
  }
  
  // Spot price before trade
  const spotPrice = Number(reserveOut) / Number(reserveIn);
  
  // Execution price
  const executionPrice = Number(amountOut) / Number(amountIn);
  
  // Price impact as percentage
  const priceImpact = ((spotPrice - executionPrice) / spotPrice) * 100;
  
  return Math.max(0, priceImpact);
}

// Calculate liquidity tokens to be minted
export function calculateLiquidityMinted(
  amountA: bigint,
  amountB: bigint,
  reserveA: bigint,
  reserveB: bigint,
  totalSupply: bigint
): bigint {
  if (totalSupply === BigInt(0)) {
    // First liquidity provision
    const liquidity = sqrt(amountA * amountB) - MINIMUM_LIQUIDITY;
    return liquidity > BigInt(0) ? liquidity : BigInt(0);
  }
  
  const liquidityA = (amountA * totalSupply) / reserveA;
  const liquidityB = (amountB * totalSupply) / reserveB;
  
  return liquidityA < liquidityB ? liquidityA : liquidityB;
}

// Calculate token amounts when removing liquidity
export function calculateRemoveLiquidity(
  liquidity: bigint,
  reserveA: bigint,
  reserveB: bigint,
  totalSupply: bigint
): { amountA: bigint; amountB: bigint } {
  if (totalSupply === BigInt(0)) {
    return { amountA: BigInt(0), amountB: BigInt(0) };
  }
  
  const amountA = (liquidity * reserveA) / totalSupply;
  const amountB = (liquidity * reserveB) / totalSupply;
  
  return { amountA, amountB };
}

// Calculate pool share percentage
export function calculatePoolShare(
  userLiquidity: bigint,
  totalSupply: bigint
): number {
  if (totalSupply === BigInt(0)) {
    return 0;
  }
  
  return (Number(userLiquidity) / Number(totalSupply)) * 100;
}

// Integer square root (Babylonian method)
function sqrt(value: bigint): bigint {
  if (value < BigInt(0)) {
    throw new Error('Square root of negative number');
  }
  if (value === BigInt(0)) return BigInt(0);
  
  let z = value;
  let x = value / BigInt(2) + BigInt(1);
  
  while (x < z) {
    z = x;
    x = (value / x + x) / BigInt(2);
  }
  
  return z;
}

// Get token address for native token wrapper
export function getWrappedToken(tokenAddress: string): string {
  if (tokenAddress === ethers.ZeroAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
    return CONTRACTS.WETH; // Return WETH for native NEX
  }
  return tokenAddress;
}

// Check if token is native
export function isNativeToken(tokenAddress: string): boolean {
  return tokenAddress === ethers.ZeroAddress || 
         tokenAddress === '0x0000000000000000000000000000000000000000';
}

// Format amount with decimals
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const formatted = ethers.formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
  if (num < 1000000000) return (num / 1000000).toFixed(2) + 'M';
  
  return (num / 1000000000).toFixed(2) + 'B';
}

// Parse amount to wei
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  try {
    return ethers.parseUnits(amount, decimals);
  } catch {
    return BigInt(0);
  }
}

// Calculate minimum amount with slippage
export function calculateMinAmount(amount: bigint, slippagePercent: number): bigint {
  const slippageBps = BigInt(Math.floor(slippagePercent * 100));
  return (amount * (BigInt(10000) - slippageBps)) / BigInt(10000);
}

// Get deadline timestamp
export function getDeadline(minutes: number = 20): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
}
