import { useEffect } from 'react';

function createFallback() {
  // Silent looping canvas stream played in a hidden video keeps iOS Safari awake.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 2;
  const ctx = canvas.getContext('2d');
  const video = document.createElement('video');
  video.muted = true;
  video.setAttribute('playsinline', '');
  video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;left:-2px;top:-2px';
  let raf;
  let n = 0;
  const draw = () => {
    ctx.fillStyle = n++ % 2 ? '#000' : '#010101';
    ctx.fillRect(0, 0, 2, 2);
    raf = requestAnimationFrame(draw);
  };
  draw();
  if (typeof canvas.captureStream !== 'function') {
    cancelAnimationFrame(raf);
    return () => {};
  }
  video.srcObject = canvas.captureStream(5);
  video.loop = true;
  document.body.appendChild(video);
  video.play().catch(() => {});
  return () => {
    cancelAnimationFrame(raf);
    video.pause();
    video.srcObject = null;
    video.remove();
  };
}

export default function useWakeLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    let lock = null;
    let releaseFallback = null;
    let cancelled = false;

    const acquire = async () => {
      if ('wakeLock' in navigator) {
        try {
          lock = await navigator.wakeLock.request('screen');
          return;
        } catch {
          /* fall through */
        }
      }
      if (!releaseFallback && !cancelled) releaseFallback = createFallback();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      try {
        lock && lock.release();
      } catch {
        /* ignore */
      }
      releaseFallback && releaseFallback();
    };
  }, [active]);
}
