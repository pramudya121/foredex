import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TokenInfo } from '@/config/contracts';

export interface LimitOrder {
  id: string;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  targetPrice: number;
  currentPrice: number;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'filled' | 'cancelled' | 'expired';
  walletAddress: string;
}

interface LimitOrderStore {
  orders: LimitOrder[];
  addOrder: (order: Omit<LimitOrder, 'id' | 'createdAt' | 'status'>) => string;
  cancelOrder: (id: string) => void;
  fillOrder: (id: string) => void;
  expireOrders: () => void;
  getActiveOrders: (walletAddress: string) => LimitOrder[];
  getOrderHistory: (walletAddress: string) => LimitOrder[];
}

export const useLimitOrderStore = create<LimitOrderStore>()(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (orderData) => {
        const id = `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const newOrder: LimitOrder = {
          ...orderData,
          id,
          createdAt: Date.now(),
          status: 'active',
        };
        
        set(state => ({
          orders: [newOrder, ...state.orders],
        }));
        
        return id;
      },

      cancelOrder: (id) => {
        set(state => ({
          orders: state.orders.map(order =>
            order.id === id && order.status === 'active'
              ? { ...order, status: 'cancelled' as const }
              : order
          ),
        }));
      },

      fillOrder: (id) => {
        set(state => ({
          orders: state.orders.map(order =>
            order.id === id && order.status === 'active'
              ? { ...order, status: 'filled' as const }
              : order
          ),
        }));
      },

      expireOrders: () => {
        const now = Date.now();
        set(state => ({
          orders: state.orders.map(order =>
            order.status === 'active' && order.expiresAt < now
              ? { ...order, status: 'expired' as const }
              : order
          ),
        }));
      },

      getActiveOrders: (walletAddress) => {
        get().expireOrders();
        return get().orders.filter(
          order => order.walletAddress.toLowerCase() === walletAddress.toLowerCase() && 
                   order.status === 'active'
        );
      },

      getOrderHistory: (walletAddress) => {
        return get().orders.filter(
          order => order.walletAddress.toLowerCase() === walletAddress.toLowerCase()
        );
      },
    }),
    {
      name: 'foredex-limit-orders',
    }
  )
);
