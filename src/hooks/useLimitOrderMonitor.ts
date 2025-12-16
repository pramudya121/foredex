import { useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { useLimitOrderStore, LimitOrder } from '@/stores/limitOrderStore';
import { showNotification } from '@/lib/notifications';
import { toast } from 'sonner';

export function useLimitOrderMonitor() {
  const { orders, updateOrderStatus, getOrdersByUser } = useLimitOrderStore();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkPrices = useCallback(async () => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    if (pendingOrders.length === 0) return;

    try {
      const provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);

      for (const order of pendingOrders) {
        try {
          // Check if order expired
          if (order.expiresAt < Date.now()) {
            updateOrderStatus(order.id, 'expired');
            toast.info(`Limit order ${order.tokenIn.symbol}→${order.tokenOut.symbol} expired`);
            continue;
          }

          const tokenInAddr = order.tokenIn.address === '0x0000000000000000000000000000000000000000' 
            ? CONTRACTS.WETH 
            : order.tokenIn.address;
          const tokenOutAddr = order.tokenOut.address === '0x0000000000000000000000000000000000000000' 
            ? CONTRACTS.WETH 
            : order.tokenOut.address;

          const pairAddress = await factory.getPair(tokenInAddr, tokenOutAddr);
          
          if (pairAddress === ethers.ZeroAddress) continue;

          const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
          const [token0, reserves] = await Promise.all([
            pair.token0(),
            pair.getReserves(),
          ]);

          const reserve0 = parseFloat(ethers.formatEther(reserves[0]));
          const reserve1 = parseFloat(ethers.formatEther(reserves[1]));

          let currentPrice: number;
          if (token0.toLowerCase() === tokenInAddr.toLowerCase()) {
            currentPrice = reserve1 / reserve0;
          } else {
            currentPrice = reserve0 / reserve1;
          }

          const targetPrice = parseFloat(order.targetPrice);
          
          // Check if current price meets or exceeds target
          if (currentPrice >= targetPrice) {
            // Price target reached!
            toast.success(
              `🎯 Limit Order Target Reached! ${order.tokenIn.symbol}→${order.tokenOut.symbol} at ${currentPrice.toFixed(6)}`,
              {
                duration: 10000,
                action: {
                  label: 'Swap Now',
                  onClick: () => window.location.href = '/',
                },
              }
            );

            // Send browser notification
            showNotification({
              title: `Limit Order Ready: ${order.tokenIn.symbol}→${order.tokenOut.symbol}`,
              body: `Target price ${targetPrice.toFixed(6)} reached! Current: ${currentPrice.toFixed(6)}. Click to execute swap.`,
              tag: `limit-order-${order.id}`,
              requireInteraction: true,
            });

            // Mark as ready for execution (user still needs to manually execute)
            // We keep it pending but notify them
          }
        } catch (error) {
          console.error(`Error checking order ${order.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in price monitor:', error);
    }
  }, [orders, updateOrderStatus]);

  useEffect(() => {
    // Check prices every 30 seconds
    checkPrices();
    checkIntervalRef.current = setInterval(checkPrices, 30000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkPrices]);

  return { checkPrices };
}
