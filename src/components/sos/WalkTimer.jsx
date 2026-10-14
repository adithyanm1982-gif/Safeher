import { useState } from 'react';
import { Footprints } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useSafety } from '../../context/SafetyContext';
import { Btn, Card, Field } from '../ui/Primitives';
import { vibrate } from '../../services/haptics';

export default function WalkTimer() {
  const { settings, update, t } = useApp();
  const { verifyPin, hasPin } = useAuth();
  const { walkActive, walkLeft, startWalk, endWalk } = useSafety();
  const [pin, setPin] = useState('');
  const [bad, setBad] = useState(false);

  const arrive = async () => {
    const ok = hasPin ? await verifyPin(pin) : true;
    if (ok) {
      endWalk();
      setPin('');
      setBad(false);
    } else {
      setBad(true);
      vibrate([80, 40, 80]);
      setPin('');
    }
  };

  const mm = String(Math.floor(walkLeft / 60)).padStart(2, '0');
  const ss = String(walkLeft % 60).padStart(2, '0');

  return (
    <Card>
      <h3 className="mb-2 flex items-center gap-2 font-bold"><Footprints size={18} /> {t('walkHome')}</h3>
      {walkActive ? (
        <>
          <p className={`my-2 text-center text-5xl font-black tabular-nums ${walkLeft <= 30 ? 'text-red-500' : ''}`}>{mm}:{ss}</p>
          {hasPin && <Field label={t('enterPin')} type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value); setBad(false); }} />}
          {bad && <p className="mt-1 text-xs text-red-500">{t('wrongPin')}</p>}
          <Btn className="mt-3 w-full" onClick={arrive}>{t('imSafe')}</Btn>
        </>
      ) : (
        <div className="flex items-end gap-3">
          <Field className="flex-1" label={t('minutes')} type="number" min="1" max="180" value={settings.walkMinutes}
            onChange={(e) => update({ walkMinutes: Math.min(180, Math.max(1, Number(e.target.value) || 1)) })} />
          <Btn onClick={() => startWalk(settings.walkMinutes)}>{t('startWalk')}</Btn>
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted">{t('walk_note')}</p>
    </Card>
  );
}