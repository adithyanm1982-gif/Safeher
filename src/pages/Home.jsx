import { EyeOff, Phone } from 'lucide-react';
import SOSButton from '../components/sos/SOSButton';
import { Banner, Btn, Card } from '../components/ui/Primitives';
import { useApp } from '../context/AppContext';
import { useSafety } from '../context/SafetyContext';
import { listQueue } from '../services/db';
import { useEffect, useState } from 'react';
import { flushQueue } from '../services/sync';

export default function Home() {
  const { t, update, guardians } = useApp();
  const { geo, online } = useSafety();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const load = () => listQueue().then((q) => setPending(q.length)).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [online]);

  return (
    <div className="space-y-4">
      {geo.lockFailed && <Banner>{t('gpsLost')}</Banner>}
      <div className="flex flex-col items-center gap-3 py-6">
        <SOSButton />
        <p className="text-sm text-muted">{t('holdSos')}</p>
      </div>

      <Card className="text-sm">
        <p className="font-semibold">{t('guardians')}: {guardians.length}/5</p>
        <p className="text-xs text-muted">
          {geo.pos ? `${geo.pos.lat.toFixed(5)}, ${geo.pos.lng.toFixed(5)}${geo.pos.cached ? ' (cached)' : ''}` : '—'}
        </p>
        {pending > 0 && (
          <button type="button" className="mt-2 text-xs font-semibold text-accent" onClick={() => flushQueue().then(() => listQueue().then((q) => setPending(q.length)))}>
            {t('pending')}: {pending}
          </button>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <a href="tel:112" className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-fg/10 font-semibold">
          <Phone size={18} /> 112
        </a>
        <Btn variant="subtle" className="!min-h-[56px]" onClick={() => update({ stealthMode: true })}>
          <EyeOff size={18} /> {t('disguise')}
        </Btn>
      </div>
    </div>
  );
}
