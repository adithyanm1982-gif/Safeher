import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useSafety } from '../../context/SafetyContext';
import { vibrate } from '../../services/haptics';

const HOLD_MS = 2000;
const R = 88;
const C = 2 * Math.PI * R;

export default function SOSButton() {
  const { t } = useApp();
  const { trigger, status } = useSafety();
  const [progress, setProgress] = useState(0);
  const raf = useRef(null);
  const start = useRef(0);
  const holding = useRef(false);

  const reset = useCallback(() => {
    holding.current = false;
    cancelAnimationFrame(raf.current);
    setProgress(0);
  }, []);

  const loop = useCallback(() => {
    if (!holding.current) return;
    const p = Math.min(1, (Date.now() - start.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      reset();
      vibrate([200, 80, 200]);
      trigger('manual');
      return;
    }
    raf.current = requestAnimationFrame(loop);
  }, [reset, trigger]);

  const down = (e) => {
    e.preventDefault();
    if (status !== 'idle') return;
    holding.current = true;
    start.current = Date.now();
    vibrate(30);
    raf.current = requestAnimationFrame(loop);
  };

  useEffect(() => reset, [reset]);

  return (
    <div className="relative grid place-items-center">
      <span className="absolute h-44 w-44 animate-pulseRing rounded-full bg-accent/40" />
      <button
        type="button"
        aria-label={t('holdSos')}
        onPointerDown={down}
        onPointerUp={reset}
        onPointerLeave={reset}
        onPointerCancel={reset}
        onContextMenu={(e) => e.preventDefault()}
        className="nosel relative grid h-52 w-52 place-items-center rounded-full"
        style={{ touchAction: 'none' }}
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="10" />
          <circle
            cx="100" cy="100" r={R} fill="none" stroke="rgb(var(--fg))" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
          />
        </svg>
        <span className="grid h-40 w-40 place-items-center rounded-full bg-accent text-4xl font-black text-onaccent shadow-xl">
          {t('sos')}
        </span>
      </button>
    </div>
  );
}
