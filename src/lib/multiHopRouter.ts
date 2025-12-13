// Multi-Hop Router - Find optimal swap routes through multiple pools
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST, TokenInfo } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { getAmountOut, getReserves } from './uniswapV2Library';

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

// Get all possible intermediate tokens for routing
function getIntermediateTokens(tokenIn: TokenInfo, tokenOut: TokenInfo): TokenInfo[] {
  return TOKEN_LIST.filter(token => 
    token.address !== tokenIn.address && 
    token.address !== tokenOut.address &&
    token.address !== '0x0000000000000000000000000000000000000000' // Exclude native
  );
}

// Check if a pair exists
async function pairExists(
  provider: ethers.Provider,
  tokenA: string,
  tokenB: string
): Promise<string | null> {
  try {
    const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
    const pairAddress = await factory.getPair(tokenA, tokenB);
    if (pairAddress !== ethers.ZeroAddress) {
      return pairAddress;
    }
    return null;
  } catch {
    return null;
  }
}

// Get reserves for a specific pair
async function getPairReserves(
  provider: ethers.Provider,
  pairAddress: string,
  tokenIn: string,
  tokenOut: string
): Promise<{ reserveIn: bigint; reserveOut: bigint } | null> {
  try {
    const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
    const [reserve0, reserve1] = await pair.getReserves();
    const token0 = await pair.token0();
    
    if (tokenIn.toLowerCase() === token0.toLowerCase()) {
      return { reserveIn: BigInt(reserve0), reserveOut: BigInt(reserve1) };
    } else {
      return { reserveIn: BigInt(reserve1), reserveOut: BigInt(reserve0) };
    }
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

    // Calculate spot price before trade
    const spotPrice = Number(step.reserveOut) / Number(step.reserveIn);
    
    // Calculate output
    const amountOut = getAmountOut(currentAmount, step.reserveIn, step.reserveOut);
    
    // Calculate execution price
    const executionPrice = Number(amountOut) / Number(currentAmount);
    
    // Add price impact
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
  
  // Normalize addresses (use WETH for native)
  const tokenInAddress = tokenIn.address === '0x0000000000000000000000000000000000000000' 
    ? CONTRACTS.WETH 
    : tokenIn.address;
  const tokenOutAddress = tokenOut.address === '0x0000000000000000000000000000000000000000' 
    ? CONTRACTS.WETH 
    : tokenOut.address;

  // Route 1: Direct swap
  try {
    const directPair = await pairExists(provider, tokenInAddress, tokenOutAddress);
    if (directPair) {
      const reserves = await getPairReserves(provider, directPair, tokenInAddress, tokenOutAddress);
      if (reserves && reserves.reserveIn > BigInt(0)) {
        const step: RouteStep = {
          tokenIn,
          tokenOut,
          pairAddress: directPair,
          reserveIn: reserves.reserveIn,
          reserveOut: reserves.reserveOut,
        };
        
        const { amountOut, priceImpact } = calculateRouteOutput(amountIn, [step]);
        
        routes.push({
          path: [tokenIn, tokenOut],
          pathAddresses: [tokenInAddress, tokenOutAddress],
          steps: [step],
          amountOut,
          priceImpact,
          gasEstimate: 150000, // Base gas for single hop
        });
      }
    }
  } catch (error) {
    console.error('Error checking direct route:', error);
  }

  // Route 2: Multi-hop through intermediate tokens
  const intermediateTokens = getIntermediateTokens(tokenIn, tokenOut);
  
  for (const intermediateToken of intermediateTokens) {
    try {
      const intermediateAddress = intermediateToken.address === '0x0000000000000000000000000000000000000000'
        ? CONTRACTS.WETH
        : intermediateToken.address;

      // Check first hop: tokenIn -> intermediate
      const pair1 = await pairExists(provider, tokenInAddress, intermediateAddress);
      if (!pair1) continue;

      // Check second hop: intermediate -> tokenOut
      const pair2 = await pairExists(provider, intermediateAddress, tokenOutAddress);
      if (!pair2) continue;

      // Get reserves for both pairs
      const reserves1 = await getPairReserves(provider, pair1, tokenInAddress, intermediateAddress);
      const reserves2 = await getPairReserves(provider, pair2, intermediateAddress, tokenOutAddress);

      if (!reserves1 || !reserves2) continue;
      if (reserves1.reserveIn === BigInt(0) || reserves2.reserveIn === BigInt(0)) continue;

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
        routes.push({
          path: [tokenIn, intermediateToken, tokenOut],
          pathAddresses: [tokenInAddress, intermediateAddress, tokenOutAddress],
          steps,
          amountOut,
          priceImpact,
          gasEstimate: 250000, // Higher gas for multi-hop
        });
      }
    } catch (error) {
      console.error(`Error checking route through ${intermediateToken.symbol}:`, error);
    }
  }

  // Sort routes by output amount (descending)
  routes.sort((a, b) => {
    if (a.amountOut > b.amountOut) return -1;
    if (a.amountOut < b.amountOut) return 1;
    return 0;
  });

  return routes;
}

// Get the best route and format for display
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
