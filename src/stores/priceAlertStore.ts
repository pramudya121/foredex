import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PriceAlert {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
}

interface PriceAlertStore {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  removeAlert: (id: string) => void;
  triggerAlert: (id: string) => void;
  clearTriggeredAlerts: () => void;
  getActiveAlerts: () => PriceAlert[];
  getTriggeredAlerts: () => PriceAlert[];
}

export const usePriceAlertStore = create<PriceAlertStore>()(
  persist(
    (set, get) => ({
      alerts: [],
      
      addAlert: (alert) => {
        const newAlert: PriceAlert = {
          ...alert,
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          triggered: false,
        };
        set((state) => ({ alerts: [...state.alerts, newAlert] }));
      },
      
      removeAlert: (id) => {
        set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }));
      },
      
      triggerAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, triggered: true, triggeredAt: Date.now() } : a
          ),
        }));
      },
      
      clearTriggeredAlerts: () => {
        set((state) => ({ alerts: state.alerts.filter((a) => !a.triggered) }));
      },
      
      getActiveAlerts: () => {
        return get().alerts.filter((a) => !a.triggered);
      },
      
      getTriggeredAlerts: () => {
        return get().alerts.filter((a) => a.triggered);
      },
    }),
    {
      name: 'foredex-price-alerts',
    }
  )
);
