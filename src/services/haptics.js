export function vibrate(pattern = 15) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      return navigator.vibrate(pattern);
    }
  } catch {
    /* unsupported or blocked */
  }
  return false;
}

export const tap = () => vibrate(12);
export const success = () => vibrate([20, 40, 20]);
export const warning = () => vibrate([120, 60, 120]);
export const sosPulse = () => vibrate([300, 100, 300, 100, 600]);
