// Browser Push Notification Service for FOREDEX

const NOTIFICATION_STORAGE_KEY = 'foredex-notifications-enabled';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

/**
 * Check if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Check if notifications are enabled
 */
export function isNotificationEnabled(): boolean {
  if (!isNotificationSupported()) return false;
  return Notification.permission === 'granted';
}

/**
 * Check user preference for notifications
 */
export function getUserNotificationPreference(): boolean {
  const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
  return stored === 'true';
}

/**
 * Save user notification preference
 */
export function setUserNotificationPreference(enabled: boolean): void {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, String(enabled));
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setUserNotificationPreference(true);
    }
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Show a notification
 */
export function showNotification(options: NotificationOptions): Notification | null {
  if (!isNotificationEnabled() || !getUserNotificationPreference()) {
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/wolf-logo.png',
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
      data: options.data,
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // If there's a transaction hash, open explorer
      if (options.data?.txHash) {
        window.open(
          `https://nexus.testnet.blockscout.com/tx/${options.data.txHash}`,
          '_blank'
        );
      }
    };

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}

/**
 * Notify transaction confirmed
 */
export function notifyTransactionConfirmed(description: string, txHash: string): void {
  showNotification({
    title: '✅ Transaction Confirmed',
    body: description,
    tag: `tx-${txHash}`,
    data: { txHash },
  });
}

/**
 * Notify transaction failed
 */
export function notifyTransactionFailed(description: string, txHash: string): void {
  showNotification({
    title: '❌ Transaction Failed',
    body: description,
    tag: `tx-${txHash}`,
    requireInteraction: true,
    data: { txHash },
  });
}

/**
 * Notify swap completed
 */
export function notifySwapCompleted(fromToken: string, toToken: string, txHash: string): void {
  showNotification({
    title: '🔄 Swap Completed',
    body: `Successfully swapped ${fromToken} → ${toToken}`,
    tag: `swap-${txHash}`,
    data: { txHash },
  });
}

/**
 * Notify liquidity added
 */
export function notifyLiquidityAdded(token0: string, token1: string, txHash: string): void {
  showNotification({
    title: '💧 Liquidity Added',
    body: `Added liquidity to ${token0}/${token1} pool`,
    tag: `lp-${txHash}`,
    data: { txHash },
  });
}
