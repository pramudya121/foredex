import { ethers } from 'ethers';
import { CONTRACTS } from '@/config/contracts';
import { MULTICALL_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';

interface Call {
  target: string;
  callData: string;
}

interface MulticallResult {
  success: boolean;
  returnData: string;
}

/**
 * Batch multiple contract calls into a single RPC request
 * @param calls Array of contract calls to batch
 * @returns Array of decoded results
 */
export async function multicall(calls: Call[]): Promise<MulticallResult[]> {
  const provider = rpcProvider.getProvider();
  if (!provider) {
    throw new Error('Provider not available');
  }

  const multicallContract = new ethers.Contract(
    CONTRACTS.MULTICALL,
    MULTICALL_ABI,
    provider
  );

  try {
    const [, returnData] = await multicallContract.aggregate(calls);
    
    return (returnData as string[]).map((data) => ({
      success: true,
      returnData: data,
    }));
  } catch (error) {
    console.error('Multicall aggregate failed:', error);
    throw error;
  }
}

/**
 * Helper to encode function call data
 */
export function encodeCall(
  contractInterface: ethers.Interface,
  functionName: string,
  params: any[] = []
): string {
  return contractInterface.encodeFunctionData(functionName, params);
}

/**
 * Helper to decode function return data
 */
export function decodeResult(
  contractInterface: ethers.Interface,
  functionName: string,
  data: string
): any {
  return contractInterface.decodeFunctionResult(functionName, data);
}

/**
 * Batch multiple ERC20 balance calls
 */
export async function batchGetBalances(
  tokenAddresses: string[],
  userAddress: string
): Promise<Map<string, bigint>> {
  const erc20Interface = new ethers.Interface([
    'function balanceOf(address) view returns (uint256)',
  ]);

  const calls: Call[] = tokenAddresses.map((token) => ({
    target: token,
    callData: encodeCall(erc20Interface, 'balanceOf', [userAddress]),
  }));

  const results = await multicall(calls);
  const balances = new Map<string, bigint>();

  results.forEach((result, index) => {
    if (result.success) {
      const decoded = decodeResult(erc20Interface, 'balanceOf', result.returnData);
      balances.set(tokenAddresses[index].toLowerCase(), decoded[0]);
    } else {
      balances.set(tokenAddresses[index].toLowerCase(), BigInt(0));
    }
  });

  return balances;
}

/**
 * Batch multiple pair reserves calls
 */
export async function batchGetReserves(
  pairAddresses: string[]
): Promise<Map<string, { reserve0: bigint; reserve1: bigint }>> {
  const pairInterface = new ethers.Interface([
    'function getReserves() view returns (uint112, uint112, uint32)',
  ]);

  const calls: Call[] = pairAddresses.map((pair) => ({
    target: pair,
    callData: encodeCall(pairInterface, 'getReserves', []),
  }));

  const results = await multicall(calls);
  const reserves = new Map<string, { reserve0: bigint; reserve1: bigint }>();

  results.forEach((result, index) => {
    if (result.success) {
      try {
        const decoded = decodeResult(pairInterface, 'getReserves', result.returnData);
        reserves.set(pairAddresses[index].toLowerCase(), {
          reserve0: decoded[0],
          reserve1: decoded[1],
        });
      } catch {
        reserves.set(pairAddresses[index].toLowerCase(), {
          reserve0: BigInt(0),
          reserve1: BigInt(0),
        });
      }
    }
  });

  return reserves;
}

/**
 * Batch multiple token info calls (symbol, name, decimals)
 */
export async function batchGetTokenInfo(
  tokenAddresses: string[]
): Promise<Map<string, { symbol: string; name: string; decimals: number }>> {
  const erc20Interface = new ethers.Interface([
    'function symbol() view returns (string)',
    'function name() view returns (string)',
    'function decimals() view returns (uint8)',
  ]);

  const calls: Call[] = [];
  tokenAddresses.forEach((token) => {
    calls.push({ target: token, callData: encodeCall(erc20Interface, 'symbol', []) });
    calls.push({ target: token, callData: encodeCall(erc20Interface, 'name', []) });
    calls.push({ target: token, callData: encodeCall(erc20Interface, 'decimals', []) });
  });

  const results = await multicall(calls);
  const tokenInfo = new Map<string, { symbol: string; name: string; decimals: number }>();

  for (let i = 0; i < tokenAddresses.length; i++) {
    const symbolIdx = i * 3;
    const nameIdx = i * 3 + 1;
    const decimalsIdx = i * 3 + 2;

    try {
      const symbol = results[symbolIdx].success
        ? decodeResult(erc20Interface, 'symbol', results[symbolIdx].returnData)[0]
        : 'UNKNOWN';
      const name = results[nameIdx].success
        ? decodeResult(erc20Interface, 'name', results[nameIdx].returnData)[0]
        : 'Unknown Token';
      const decimals = results[decimalsIdx].success
        ? Number(decodeResult(erc20Interface, 'decimals', results[decimalsIdx].returnData)[0])
        : 18;

      tokenInfo.set(tokenAddresses[i].toLowerCase(), { symbol, name, decimals });
    } catch {
      tokenInfo.set(tokenAddresses[i].toLowerCase(), {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18,
      });
    }
  }

  return tokenInfo;
}
