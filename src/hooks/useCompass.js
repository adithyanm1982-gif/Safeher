import { useCallback, useEffect, useRef, useState } from 'react';

const norm = (d) => ((d % 360) + 360) % 360;

export default function useCompass() {
  const [heading, setHeading] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState(null);
  const last = useRef({ t: 0, v: null });

  const push = useCallback((raw) => {
    const now = Date.now();
    if (now - last.current.t < 100) return;
    let v = norm(raw);
    const prev = last.current.v;
    if (prev != null) {
      let d = v - prev;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      v = norm(prev + d * 0.25);
    }
    last.current = { t: now, v };
    setHeading(v);
  }, []);

  const enable = useCallback(async () => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setError('Compass not supported');
      return false;
    }
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') {
          setError('Compass permission denied');
          return false;
        }
      }
      setEnabled(true);
      setError(null);
      return true;
    } catch {
      setError('Compass unavailable');
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      setEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let gotAbsolute = false;
    const onAbs = (e) => {
      if (e.alpha != null) {
        gotAbsolute = true;
        push(360 - e.alpha);
      }
    };
    const onRel = (e) => {
      if (e.webkitCompassHeading != null) push(e.webkitCompassHeading);
      else if (!gotAbsolute && e.absolute && e.alpha != null) push(360 - e.alpha);
    };
    window.addEventListener('deviceorientationabsolute', onAbs, true);
    window.addEventListener('deviceorientation', onRel, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onAbs, true);
      window.removeEventListener('deviceorientation', onRel, true);
    };
  }, [enabled, push]);

  return { heading, enabled, error, enable };
}