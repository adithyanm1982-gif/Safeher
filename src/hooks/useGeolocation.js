import { useCallback, useEffect, useRef, useState } from 'react';
import { getSecure, setSecure } from '../services/db';

const MAX_TRAIL = 500;

function intervalForSpeed(speed) {
  if (speed == null || speed < 0.5) return 15000;
  if (speed < 2) return 8000;
  return 3000;
}

export default function useGeolocation() {
  const [pos, setPos] = useState(null);
  const [trail, setTrail] = useState([]);
  const [lockFailed, setLockFailed] = useState(false);
  const [error, setError] = useState(null);
  const lastAccepted = useRef(0);
  const lastSaved = useRef(0);
  const watchId = useRef(null);
  const posRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getSecure('lastLocation').then((last) => {
      if (!cancelled && last && !posRef.current) {
        posRef.current = { ...last, cached: true };
        setPos(posRef.current);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onPosition = useCallback((p) => {
    const now = Date.now();
    const speed = p.coords.speed;
    if (lastAccepted.current && now - lastAccepted.current < intervalForSpeed(speed)) return;
    lastAccepted.current = now;
    const next = {
      lat: p.coords.latitude,
      lng: p.coords.longitude,
      accuracy: p.coords.accuracy,
      speed: speed ?? 0,
      heading: p.coords.heading,
      ts: p.timestamp || now,
      cached: false
    };
    posRef.current = next;
    setPos(next);
    setLockFailed(false);
    setError(null);
    setTrail((t) => [...t.slice(-(MAX_TRAIL - 1)), [next.lat, next.lng]]);
    if (now - lastSaved.current > 20000) {
      lastSaved.current = now;
      setSecure('lastLocation', next).catch(() => {});
    }
  }, []);

  const onError = useCallback((err) => {
    setError(err?.message || 'Location error');
    setLockFailed(true);
    getSecure('lastLocation').then((last) => {
      if (last && (!posRef.current || posRef.current.cached)) {
        posRef.current = { ...last, cached: true };
        setPos(posRef.current);
      }
    });
  }, []);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      onError({ message: 'Geolocation not supported' });
      return;
    }
    if (watchId.current != null) return;
    watchId.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000
    });
  }, [onPosition, onError]);

  const stop = useCallback(() => {
    if (watchId.current != null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
  }, []);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  const getCurrent = useCallback(
    () =>
      new Promise((resolve) => {
        const fallback = async () => {
          if (posRef.current) return resolve(posRef.current);
          const last = await getSecure('lastLocation');
          resolve(last ? { ...last, cached: true } : null);
        };
        if (!('geolocation' in navigator)) return void fallback();
        navigator.geolocation.getCurrentPosition(
          (p) => {
            const fresh = {
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              accuracy: p.coords.accuracy,
              speed: p.coords.speed ?? 0,
              ts: p.timestamp,
              cached: false
            };
            posRef.current = fresh;
            setPos(fresh);
            setLockFailed(false);
            setSecure('lastLocation', fresh).catch(() => {});
            resolve(fresh);
          },
          () => {
            setLockFailed(true);
            fallback();
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
        );
      }),
    []
  );

  let signal = 0;
  if (pos && !pos.cached && !lockFailed) {
    signal = pos.accuracy < 20 ? 3 : pos.accuracy < 60 ? 2 : 1;
  }

  return { pos, trail, lockFailed, error, signal, getCurrent, posRef, restart: () => { stop(); start(); } };
}
