import { useEffect, useRef } from 'react';

export async function requestMotionPermission() {
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      return (await DeviceMotionEvent.requestPermission()) === 'granted';
    }
    return typeof DeviceMotionEvent !== 'undefined';
  } catch {
    return false;
  }
}

// sensitivity: 1 (hard shake needed) .. 10 (light shake)
export default function useShake({ enabled, sensitivity = 5, onShake }) {
  const cb = useRef(onShake);
  cb.current = onShake;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return undefined;
    const threshold = 32 - sensitivity * 2.4;
    let last = { x: 0, y: 0, z: 0 };
    let hits = [];
    const handler = (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      const delta = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z);
      last = { x: a.x, y: a.y, z: a.z };
      if (delta > threshold) {
        const now = Date.now();
        hits = hits.filter((t) => now - t < 1500);
        if (!hits.length || now - hits[hits.length - 1] > 120) hits.push(now);
        if (hits.length >= 4) {
          hits = [];
          cb.current && cb.current('shake');
        }
      }
    };
    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [enabled, sensitivity]);
}
