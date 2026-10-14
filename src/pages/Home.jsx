import { EyeOff } from 'lucide-react';
import SOSButton from '../components/sos/SOSButton';
import HelplineList from '../components/ui/HelplineList';
import MedicalCard from '../components/ui/MedicalCard';
import { Banner, Btn, Card } from '../components/ui/Primitives';
import { useApp } from '../context/AppContext';
import { useSafety } from '../context/SafetyContext';
import { listQueue } from '../services/db';
import { useEffect, useState } from 'react';
import { flushQueue } from '../services/sync';

export default function Home() {
  const { t, update, guardians, emergencyContact } = useApp();
  const { geo, online } = useSafety();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const load = () => listQueue().then((q) => setPending(q.length)).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [online]);

  return (
    <div className="space-y-3">
      {geo.lockFailed && <Banner>{t('gpsLost')}</Banner>}

      {/* Above the fold: SOS and emergency numbers only */}
      <div className="flex flex-col items-center gap-1 pb-1 pt-1">
        <SOSButton />
        <p className="text-sm text-muted">{t('holdSos')}</p>
      </div>

      <HelplineList />

      {/* Everything below is secondary and kept thin */}
      <Btn variant="subtle" className="w-full !min-h-[48px]" onClick={() => update({ stealthMode: true })}>
        <EyeOff size={18} /> {t('disguise')}
      </Btn>

      <MedicalCard />

      <Card className="space-y-1 !p-3 text-sm">
        <p className="font-semibold">{t('guardians')}: {guardians.length}/5</p>
        {guardians.length === 0 && (
          <p className="text-xs font-semibold text-accent">{t('addGuardiansHint')}</p>
        )}
        <p className="text-xs text-muted">
          {t('emergencyCall')}: {emergencyContact.phone
            ? `${emergencyContact.name || emergencyContact.phone}${emergencyContact.autoCall ? ` (${t('automatic')})` : ''}`
            : t('oneTap')}
        </p>
        <p className="text-xs text-muted">
          {geo.pos ? `${geo.pos.lat.toFixed(5)}, ${geo.pos.lng.toFixed(5)}${geo.pos.cached ? ' (cached)' : ''}` : '—'}
        </p>
        {!online && <p className="text-xs text-amber-600">{t('offlineNote')}</p>}
        {pending > 0 && (
          <button type="button" className="mt-1 text-xs font-semibold text-accent" onClick={() => flushQueue().then(() => listQueue().then((q) => setPending(q.length)))}>
            {t('pending')}: {pending}
          </button>
        )}
      </Card>
    </div>
  );
}