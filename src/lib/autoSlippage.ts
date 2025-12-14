import { ethers } from 'ethers';

interface SlippageCalculation {
  recommendedSlippage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

/**
 * Auto-detect optimal slippage based on pool conditions and trade size
 */
export function calculateAutoSlippage(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  userSlippage?: number
): SlippageCalculation {
  // If reserves are zero, return high slippage
  if (reserveIn === 0n || reserveOut === 0n) {
    return {
      recommendedSlippage: 5,
      severity: 'critical',
      reason: 'Pool has no liquidity',
    };
  }

  // Calculate trade size as percentage of pool
  const tradeSizePercent = (Number(amountIn) / Number(reserveIn)) * 100;
  
  // Calculate price impact
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  const amountOut = numerator / denominator;
  
  const spotPrice = Number(reserveOut) / Number(reserveIn);
  const executionPrice = Number(amountOut) / Number(amountIn);
  const priceImpact = ((spotPrice - executionPrice) / spotPrice) * 100;

  // Determine recommended slippage based on conditions
  let recommendedSlippage: number;
  let severity: SlippageCalculation['severity'];
  let reason: string;

  if (tradeSizePercent > 10 || priceImpact > 10) {
    // Very large trade - high slippage needed
    recommendedSlippage = Math.min(10, Math.max(5, priceImpact * 1.5));
    severity = 'critical';
    reason = `Large trade (${tradeSizePercent.toFixed(2)}% of pool). Price impact: ${priceImpact.toFixed(2)}%`;
  } else if (tradeSizePercent > 5 || priceImpact > 5) {
    // Large trade
    recommendedSlippage = Math.min(5, Math.max(3, priceImpact * 1.3));
    severity = 'high';
    reason = `Significant trade size. Price impact: ${priceImpact.toFixed(2)}%`;
  } else if (tradeSizePercent > 2 || priceImpact > 2) {
    // Medium trade
    recommendedSlippage = Math.min(3, Math.max(1, priceImpact * 1.2));
    severity = 'medium';
    reason = `Moderate price impact: ${priceImpact.toFixed(2)}%`;
  } else if (tradeSizePercent > 0.5 || priceImpact > 0.5) {
    // Small trade
    recommendedSlippage = 0.5;
    severity = 'low';
    reason = `Low price impact: ${priceImpact.toFixed(2)}%`;
  } else {
    // Very small trade
    recommendedSlippage = 0.3;
    severity = 'low';
    reason = 'Minimal price impact';
  }

  // If user has set a slippage, use it if it's higher than recommended
  if (userSlippage !== undefined && userSlippage > recommendedSlippage) {
    return {
      recommendedSlippage: userSlippage,
      severity,
      reason: `User slippage (${userSlippage}%) applied. ${reason}`,
    };
  }

  return {
    recommendedSlippage: Math.round(recommendedSlippage * 100) / 100,
    severity,
    reason,
  };
}

/**
 * Check if current slippage is sufficient for the trade
 */
export function isSlippageSufficient(
  currentSlippage: number,
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): { sufficient: boolean; recommendedSlippage: number; message: string } {
  const { recommendedSlippage, severity, reason } = calculateAutoSlippage(
    amountIn,
    reserveIn,
    reserveOut
  );

  if (currentSlippage >= recommendedSlippage) {
    return {
      sufficient: true,
      recommendedSlippage: currentSlippage,
      message: 'Slippage is sufficient',
    };
  }

  return {
    sufficient: severity === 'low' || severity === 'medium',
    recommendedSlippage,
    message: `Recommended slippage: ${recommendedSlippage}%. ${reason}`,
  };
}

/**
 * Get slippage color based on severity
 */
export function getSlippageSeverityColor(severity: SlippageCalculation['severity']): string {
  switch (severity) {
    case 'low':
      return 'text-green-500';
    case 'medium':
      return 'text-yellow-500';
    case 'high':
      return 'text-orange-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}
