import { registerSW } from 'virtual:pwa-register';
import { flushQueue } from './sync';

export function initServiceWorker() {
  try {
    registerSW({ immediate: true });
  } catch {
    /* service workers unavailable */
  }
  window.addEventListener('online', () => {
    flushQueue().catch(() => {});
    requestBackgroundSync();
  });
  if (navigator.onLine) flushQueue().catch(() => {});
}

export async function requestBackgroundSync() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && 'sync' in reg) await reg.sync.register('safeher-sync-queue');
  } catch {
    /* background sync unsupported */
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export async function notify(title, body) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', vibrate: [200, 100, 200], tag: 'safeher' });
    } else {
      new Notification(title, { body, icon: '/icon-192.png' });
    }
    return true;
  } catch {
    return false;
  }
}
