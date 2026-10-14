// Captures the browser's install prompt as early as possible (it can fire before React mounts).
let deferred = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
  });
}

export const canInstall = () => Boolean(deferred);

export function isStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

export function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Returns 'accepted' | 'dismissed' | 'unavailable'
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const ev = deferred;
  deferred = null;
  try {
    ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome;
  } catch {
    return 'dismissed';
  }
}