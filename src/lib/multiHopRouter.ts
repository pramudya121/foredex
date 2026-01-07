// Multi-Hop Router - Find optimal swap routes through multiple pools
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST, TokenInfo } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { getAmountOut } from './uniswapV2Library';
import { rpcProvider } from './rpcProvider';

export interface RouteStep {
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  pairAddress: string;
  reserveIn: bigint;
  reserveOut: bigint;
}

export interface SwapRoute {
  path: TokenInfo[];
  pathAddresses: string[];
  steps: RouteStep[];
  amountOut: bigint;
  priceImpact: number;
  gasEstimate: number;
}

// Cache for pair existence and reserves
interface PairCache {
  address: string | null;
  reserves?: { reserveIn: bigint; reserveOut: bigint };
  timestamp: number;
}

const pairCache = new Map<string, PairCache>();
const PAIR_CACHE_TTL = 20000; // 20 seconds

// Get cache key for pair
const getPairCacheKey = (tokenA: string, tokenB: string) => {
  const [first, second] = [tokenA, tokenB].sort();
  return `${first.toLowerCase()}-${second.toLowerCase()}`;
};

// Get all possible intermediate tokens for routing (limit to most liquid)
function getIntermediateTokens(tokenIn: TokenInfo, tokenOut: TokenInfo): TokenInfo[] {
  // Only use WETH and stablecoins as intermediates for efficiency
  const preferredIntermediates = ['WETH', 'USDC', 'NEX', 'FRDX'];
  
  return TOKEN_LIST.filter(token => 
    token.address !== tokenIn.address && 
    token.address !== tokenOut.address &&
    token.address !== '0x0000000000000000000000000000000000000000' &&
    preferredIntermediates.includes(token.symbol)
  );
}

// Check if a pair exists with caching
async function pairExists(
  provider: ethers.Provider,
  tokenA: string,
  tokenB: string
): Promise<string | null> {
  const cacheKey = getPairCacheKey(tokenA, tokenB);
  const cached = pairCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < PAIR_CACHE_TTL) {
    return cached.address;
  }

  try {
    const result = await rpcProvider.call(async () => {
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      return factory.getPair(tokenA, tokenB);
    }, `pair_${cacheKey}`);

    const pairAddress = result !== ethers.ZeroAddress && result ? result : null;
    
    pairCache.set(cacheKey, {
      address: pairAddress,
      timestamp: Date.now(),
    });
    
    return pairAddress;
  } catch {
    return null;
  }
}

// Get reserves for a specific pair with caching
async function getPairReserves(
  provider: ethers.Provider,
  pairAddress: string,
  tokenIn: string,
  tokenOut: string
): Promise<{ reserveIn: bigint; reserveOut: bigint } | null> {
  const cacheKey = `reserves_${pairAddress}_${tokenIn.toLowerCase()}`;
  
  try {
    const result = await rpcProvider.call(async () => {
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      const [reserves, token0] = await Promise.all([
        pair.getReserves(),
        pair.token0(),
      ]);
      
      if (tokenIn.toLowerCase() === token0.toLowerCase()) {
        return { reserveIn: BigInt(reserves[0]), reserveOut: BigInt(reserves[1]) };
      } else {
        return { reserveIn: BigInt(reserves[1]), reserveOut: BigInt(reserves[0]) };
      }
    }, cacheKey, { timeout: 10000 });

    return result;
  } catch {
    return null;
  }
}

// Calculate route output and price impact
function calculateRouteOutput(
  amountIn: bigint,
  steps: RouteStep[]
): { amountOut: bigint; priceImpact: number } {
  let currentAmount = amountIn;
  let totalPriceImpact = 0;

  for (const step of steps) {
    if (step.reserveIn === BigInt(0) || step.reserveOut === BigInt(0)) {
      return { amountOut: BigInt(0), priceImpact: 0 };
    }

    const spotPrice = Number(step.reserveOut) / Number(step.reserveIn);
    const amountOut = getAmountOut(currentAmount, step.reserveIn, step.reserveOut);
    const executionPrice = Number(amountOut) / Number(currentAmount);
    const stepImpact = ((spotPrice - executionPrice) / spotPrice) * 100;
    totalPriceImpact += Math.max(0, stepImpact);
    
    currentAmount = amountOut;
  }

  return { amountOut: currentAmount, priceImpact: totalPriceImpact };
}

// Find the best route for a swap
export async function findBestRoute(
  provider: ethers.Provider,
  tokenIn: TokenInfo,
  tokenOut: TokenInfo,
  amountIn: bigint
): Promise<SwapRoute[]> {
  const routes: SwapRoute[] = [];
  
  const tokenInAddress = tokenIn.address === '0x0000000000000000000000000000000000000000' 
    ? CONTRACTS.WETH 
    : tokenIn.address;
  const tokenOutAddress = tokenOut.address === '0x0000000000000000000000000000000000000000' 
    ? CONTRACTS.WETH 
    : tokenOut.address;

  console.log('[MultiHopRouter] Finding routes for:', tokenIn.symbol, '->', tokenOut.symbol);

  // Check direct route first
  try {
    const directPair = await pairExists(provider, tokenInAddress, tokenOutAddress);
    console.log('[MultiHopRouter] Direct pair:', directPair);
    
    if (directPair) {
      const reserves = await getPairReserves(provider, directPair, tokenInAddress, tokenOutAddress);
      console.log('[MultiHopRouter] Direct pair reserves:', reserves);
      
      if (reserves && reserves.reserveIn > BigInt(0)) {
        const step: RouteStep = {
          tokenIn,
          tokenOut,
          pairAddress: directPair,
          reserveIn: reserves.reserveIn,
          reserveOut: reserves.reserveOut,
        };
        
        const { amountOut, priceImpact } = calculateRouteOutput(amountIn, [step]);
        console.log('[MultiHopRouter] Direct route output:', amountOut.toString());
        
        routes.push({
          path: [tokenIn, tokenOut],
          pathAddresses: [tokenInAddress, tokenOutAddress],
          steps: [step],
          amountOut,
          priceImpact,
          gasEstimate: 150000,
        });
      }
    }
  } catch (error) {
    console.error('[MultiHopRouter] Error checking direct route:', error);
  }

  // Check multi-hop routes in parallel
  const intermediateTokens = getIntermediateTokens(tokenIn, tokenOut);
  
  const multiHopPromises = intermediateTokens.map(async (intermediateToken) => {
    try {
      const intermediateAddress = intermediateToken.address === '0x0000000000000000000000000000000000000000'
        ? CONTRACTS.WETH
        : intermediateToken.address;

      // Check both hops exist
      const [pair1, pair2] = await Promise.all([
        pairExists(provider, tokenInAddress, intermediateAddress),
        pairExists(provider, intermediateAddress, tokenOutAddress),
      ]);

      if (!pair1 || !pair2) return null;

      // Get reserves for both pairs in parallel
      const [reserves1, reserves2] = await Promise.all([
        getPairReserves(provider, pair1, tokenInAddress, intermediateAddress),
        getPairReserves(provider, pair2, intermediateAddress, tokenOutAddress),
      ]);

      if (!reserves1 || !reserves2) return null;
      if (reserves1.reserveIn === BigInt(0) || reserves2.reserveIn === BigInt(0)) return null;

      const steps: RouteStep[] = [
        {
          tokenIn,
          tokenOut: intermediateToken,
          pairAddress: pair1,
          reserveIn: reserves1.reserveIn,
          reserveOut: reserves1.reserveOut,
        },
        {
          tokenIn: intermediateToken,
          tokenOut,
          pairAddress: pair2,
          reserveIn: reserves2.reserveIn,
          reserveOut: reserves2.reserveOut,
        },
      ];

      const { amountOut, priceImpact } = calculateRouteOutput(amountIn, steps);

      if (amountOut > BigInt(0)) {
        return {
          path: [tokenIn, intermediateToken, tokenOut],
          pathAddresses: [tokenInAddress, intermediateAddress, tokenOutAddress],
          steps,
          amountOut,
          priceImpact,
          gasEstimate: 250000,
        } as SwapRoute;
      }
      return null;
    } catch {
      return null;
    }
  });

  const multiHopResults = await Promise.all(multiHopPromises);
  routes.push(...multiHopResults.filter((r): r is SwapRoute => r !== null));

  // Sort by output amount
  routes.sort((a, b) => (a.amountOut > b.amountOut ? -1 : a.amountOut < b.amountOut ? 1 : 0));

  return routes;
}

// Get the best route
export async function getBestSwapRoute(
  provider: ethers.Provider,
  tokenIn: TokenInfo,
  tokenOut: TokenInfo,
  amountIn: bigint
): Promise<SwapRoute | null> {
  const routes = await findBestRoute(provider, tokenIn, tokenOut, amountIn);
  return routes.length > 0 ? routes[0] : null;
}

// Format route path for display
export function formatRoutePath(route: SwapRoute): string {
  return route.path.map(token => token.symbol).join(' → ');
}

// Check if multi-hop gives better output
export function isMultiHopBetter(routes: SwapRoute[]): boolean {
  if (routes.length < 2) return false;
  
  const directRoute = routes.find(r => r.path.length === 2);
  const multiHopRoute = routes.find(r => r.path.length > 2);
  
  if (!directRoute || !multiHopRoute) return false;
  
  return multiHopRoute.amountOut > directRoute.amountOut;
}

// Clear pair cache
export function clearRouterCache() {
  pairCache.clear();
}
