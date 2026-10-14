import { useEffect, useRef, useState } from 'react';
import { Flashlight, PhoneIncoming, Siren, Zap } from 'lucide-react';
import { Btn, Card, Field } from '../components/ui/Primitives';
import WalkTimer from '../components/sos/WalkTimer';
import FakeCall from '../components/sos/FakeCall';
import { useApp } from '../context/AppContext';
import { useSafety } from '../context/SafetyContext';

export default function Tools() {
  const { t, te, settings, update } = useApp();
  const { sirenOn, toggleSiren, torch, strobeOn, setStrobeOn } = useSafety();
  const [calling, setCalling] = useState(false);
  const [delay, setDelay] = useState(0);
  const delayTimer = useRef(null);

  useEffect(() => () => clearTimeout(delayTimer.current), []);

  const startFake = () => {
    clearTimeout(delayTimer.current);
    if (delay > 0) delayTimer.current = setTimeout(() => setCalling(true), delay * 1000);
    else setCalling(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Btn variant={sirenOn ? 'danger' : 'ghost'} className="!h-24 flex-col" onClick={toggleSiren}>
          <Siren size={26} /> {t('siren')}
        </Btn>
        <Btn variant={torch.on ? 'primary' : 'ghost'} className="!h-24 flex-col" onClick={torch.toggle}>
          <Flashlight size={26} /> {t('torch')}
        </Btn>
        <Btn variant={strobeOn ? 'primary' : 'ghost'} className="!h-24 flex-col" onClick={() => setStrobeOn(!strobeOn)}>
          <Zap size={26} /> {t('strobe')}
        </Btn>
      </div>
      {torch.error && <p className="text-xs text-amber-600">{te(torch.error)}</p>}

      <Card>
        <h3 className="mb-2 flex items-center gap-2 font-bold"><PhoneIncoming size={18} /> {t('fakeCall')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('name')} value={settings.fakeCallerName} onChange={(e) => update({ fakeCallerName: e.target.value })} />
          <Field label={t('phone')} value={settings.fakeCallerNumber} onChange={(e) => update({ fakeCallerNumber: e.target.value })} />
        </div>
        <div className="mt-3 flex items-end gap-3">
          <Field className="w-28" label={t('delaySec')} type="number" min="0" max="300" value={delay} onChange={(e) => setDelay(Math.max(0, Number(e.target.value) || 0))} />
          <Btn className="flex-1" onClick={startFake}>{t('fakeCall')}</Btn>
        </div>
      </Card>

      <WalkTimer />
      {calling && <FakeCall name={settings.fakeCallerName} number={settings.fakeCallerNumber} onClose={() => setCalling(false)} />}
    </div>
  );
}