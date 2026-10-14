import { useRef, useState } from 'react';
import { Delete, Fingerprint } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { vibrate } from '../../services/haptics';
import { Btn } from '../ui/Primitives';

const MAX_PIN = 8;

export function PatternPad({ onComplete, resetKey }) {
  const [path, setPath] = useState([]);
  const drawing = useRef(false);
  const refs = useRef([]);

  const hit = (x, y) => {
    refs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inside = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < r.width * 0.7;
      if (inside) {
        setPath((p) => {
          if (p.includes(i)) return p;
          vibrate(10);
          return [...p, i];
        });
      }
    });
  };

  const end = () => {
    drawing.current = false;
    setPath((p) => {
      if (p.length) setTimeout(() => onComplete(p), 0);
      return [];
    });
  };

  return (
    <div
      key={resetKey}
      className="mx-auto grid w-64 touch-none grid-cols-3 gap-6 p-2 nosel"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => { drawing.current = true; hit(e.clientX, e.clientY); }}
      onPointerMove={(e) => drawing.current && hit(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className={`mx-auto h-14 w-14 rounded-full border-2 ${path.includes(i) ? 'border-accent bg-accent/40' : 'border-line'}`}
        />
      ))}
    </div>
  );
}

export default function LockScreen() {
  const { hasPin, hasPattern, hasBiometric, pinLength, unlockWithPin, unlockWithPattern, unlockWithBiometric } = useAuth();
  const { t } = useApp();
  const [mode, setMode] = useState(hasPin ? 'pin' : 'pattern');
  const [pin, setPin] = useState('');
  const [bad, setBad] = useState(false);
  const [nonce, setNonce] = useState(0);

  const fail = () => {
    setBad(true);
    vibrate([80, 40, 80]);
    setPin('');
    setNonce((n) => n + 1);
    setTimeout(() => setBad(false), 600);
  };

  const press = async (d) => {
    const limit = pinLength || MAX_PIN;
    if (pin.length >= limit) return;
    const next = pin + d;
    setPin(next);
    vibrate(10);

    if (pinLength) {
      // Known PIN length: only check once the full PIN has been typed.
      if (next.length === pinLength) {
        const ok = await unlockWithPin(next);
        if (!ok) fail();
      }
    } else if (next.length >= 4) {
      // Older PIN with no saved length: quietly try each length, only fail at the maximum.
      const ok = await unlockWithPin(next);
      if (!ok && next.length >= MAX_PIN) fail();
    }
  };

  const submitPin = async () => {
    if (!pin) return;
    if (!(await unlockWithPin(pin))) fail();
  };

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-[90] flex flex-col items-center justify-center bg-bg p-6">
      <h1 className="mb-1 text-3xl font-black text-accent">SafeHer</h1>
      <p className={`mb-4 text-sm ${bad ? 'text-red-500' : 'text-muted'}`}>{bad ? t('wrongPin') : t('enterPin')}</p>

      {mode === 'pin' ? (
        <>
          <div className={`mb-4 flex h-6 gap-2 ${bad ? 'shake' : ''}`}>
            {pin.split('').map((_, i) => <span key={i} className="h-4 w-4 rounded-full bg-accent" />)}
          </div>
          <div className="grid w-64 grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <Btn key={d} variant="ghost" className="!h-16 !text-xl" onClick={() => press(d)}>{d}</Btn>
            ))}
            <Btn variant="ghost" className="!h-16" onClick={() => setPin((p) => p.slice(0, -1))}><Delete size={22} /></Btn>
            <Btn variant="ghost" className="!h-16 !text-xl" onClick={() => press('0')}>0</Btn>
            <Btn className="!h-16" onClick={submitPin}>{t('unlock')}</Btn>
          </div>
        </>
      ) : (
        <PatternPad
          resetKey={nonce}
          onComplete={async (seq) => {
            if (seq.length < 4 || !(await unlockWithPattern(seq))) fail();
          }}
        />
      )}

      <div className="mt-6 flex gap-3">
        {hasPin && hasPattern && (
          <Btn variant="subtle" onClick={() => setMode(mode === 'pin' ? 'pattern' : 'pin')}>
            {mode === 'pin' ? t('pattern') : t('pin')}
          </Btn>
        )}
        {hasBiometric && (
          <Btn variant="subtle" onClick={unlockWithBiometric}><Fingerprint size={18} /> {t('biometric')}</Btn>
        )}
      </div>
    </div>
  );
}