import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LimitOrder {
  id: string;
  tokenIn: {
    address: string;
    symbol: string;
    decimals: number;
  };
  tokenOut: {
    address: string;
    symbol: string;
    decimals: number;
  };
  amountIn: string;
  targetPrice: string;
  createdAt: number;
  status: 'pending' | 'executed' | 'cancelled' | 'expired';
  expiresAt: number;
  userAddress: string;
}

interface LimitOrderStore {
  orders: LimitOrder[];
  addOrder: (order: Omit<LimitOrder, 'id' | 'createdAt' | 'status'>) => void;
  cancelOrder: (id: string) => void;
  updateOrderStatus: (id: string, status: LimitOrder['status']) => void;
  getOrdersByUser: (address: string) => LimitOrder[];
  clearExpiredOrders: () => void;
}

export const useLimitOrderStore = create<LimitOrderStore>()(
  persist(
    (set, get) => ({
      orders: [],
      
      addOrder: (order) => {
        const newOrder: LimitOrder = {
          ...order,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: Date.now(),
          status: 'pending',
        };
        set((state) => ({
          orders: [...state.orders, newOrder],
        }));
      },
      
      cancelOrder: (id) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, status: 'cancelled' as const } : order
          ),
        }));
      },
      
      updateOrderStatus: (id, status) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, status } : order
          ),
        }));
      },
      
      getOrdersByUser: (address) => {
        return get().orders.filter(
          (order) => order.userAddress.toLowerCase() === address.toLowerCase()
        );
      },
      
      clearExpiredOrders: () => {
        const now = Date.now();
        set((state) => ({
          orders: state.orders.map((order) =>
            order.status === 'pending' && order.expiresAt < now
              ? { ...order, status: 'expired' as const }
              : order
          ),
        }));
      },
    }),
    {
      name: 'foredex-limit-orders',
    }
  )
);
