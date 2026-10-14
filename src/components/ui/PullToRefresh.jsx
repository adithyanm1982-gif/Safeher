import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 70;
const MAX_PULL = 120;
const SKIP = 'input, textarea, select, .leaflet-container';

// True when the touch starts somewhere a pull must not refresh (popups, overlays, inner scroll areas).
function blocked(el) {
  if (!(el instanceof Element)) return false;
  if (el.closest(SKIP)) return true;
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.position === 'fixed' && (parseInt(cs.zIndex, 10) || 0) >= 50) return true;
    const scrollable = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
    if (scrollable && n.scrollHeight > n.clientHeight && n.scrollTop > 0) return true;
  }
  return false;
}

// Reloads the page. Saved data lives in IndexedDB/localStorage, so nothing is erased.
async function refreshApp() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await Promise.race([reg.update(), new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    /* offline or no service worker: just reload */
  }
  window.location.reload();
}

export default function PullToRefresh({ disabled }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const off = useRef(disabled);
  off.current = disabled;
  const s = useRef({ startY: 0, startX: 0, active: false, dragging: false, pull: 0, busy: false });

  useEffect(() => {
    const st = s.current;

    const reset = () => {
      st.active = false;
      st.dragging = false;
      st.pull = 0;
      setPull(0);
    };

    const onStart = (e) => {
      st.active = false;
      if (off.current || st.busy || e.touches.length !== 1) return;
      if (window.scrollY > 0 || document.documentElement.scrollTop > 0) return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      if (blocked(e.target)) return;
      st.startY = e.touches[0].clientY;
      st.startX = e.touches[0].clientX;
      st.active = true;
      st.dragging = false;
      st.pull = 0;
    };

    const onMove = (e) => {
      if (!st.active) return;
      const dy = e.touches[0].clientY - st.startY;
      const dx = e.touches[0].clientX - st.startX;
      if (!st.dragging) {
        if (dy < -6 || Math.abs(dx) > Math.abs(dy) + 6) {
          st.active = false;
          return;
        }
        if (dy < 10) return;
        st.dragging = true;
      }
      if (window.scrollY > 0) {
        reset();
        return;
      }
      if (e.cancelable) e.preventDefault();
      st.pull = Math.min(MAX_PULL, (dy - 10) * 0.55);
      setPull(st.pull);
    };

    const onEnd = async () => {
      if (!st.active) return;
      const done = st.pull >= THRESHOLD;
      st.active = false;
      st.dragging = false;
      if (!done) {
        reset();
        return;
      }
      st.busy = true;
      setRefreshing(true);
      await new Promise((r) => setTimeout(r, 450));
      await refreshApp();
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', reset, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, []);

  if (pull <= 0 && !refreshing) return null;

  const progress = Math.min(1, pull / THRESHOLD);
  const y = refreshing ? 34 : pull - 36;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[40] flex justify-center"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-accent shadow-lg"
        style={{
          transform: `translateY(${y}px)`,
          opacity: refreshing ? 1 : Math.min(1, pull / 30),
          transition: refreshing ? 'transform .2s ease' : 'none'
        }}
      >
        <RefreshCw
          size={20}
          className={refreshing ? 'animate-spin' : ''}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
        />
      </div>
    </div>
  );
}