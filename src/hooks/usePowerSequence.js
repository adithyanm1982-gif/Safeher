import { useEffect, useRef } from 'react';

const VOLUME_KEYS = ['AudioVolumeUp', 'AudioVolumeDown', 'VolumeUp', 'VolumeDown', 'ArrowUp', 'ArrowDown'];

// Browsers cannot see hardware power taps, so rapid volume-key presses and rapid
// focus/visibility flips (screen off/on) inside a short window are used as the sequence.
export default function usePowerSequence({ enabled, count = 5, windowMs = 4000, onTrigger }) {
  const cb = useRef(onTrigger);
  cb.current = onTrigger;

  useEffect(() => {
    if (!enabled) return undefined;
    let stamps = [];
    const hit = () => {
      const now = Date.now();
      stamps = stamps.filter((t) => now - t < windowMs);
      stamps.push(now);
      if (stamps.length >= count) {
        stamps = [];
        cb.current && cb.current('power');
      }
    };
    const onKey = (e) => {
      if (VOLUME_KEYS.includes(e.key) || VOLUME_KEYS.includes(e.code)) hit();
    };
    const onVis = () => hit();
    window.addEventListener('keydown', onKey);
    window.addEventListener('focus', hit);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('focus', hit);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, count, windowMs]);
}
