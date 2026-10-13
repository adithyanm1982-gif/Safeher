import { MessageSquare, Phone, ShieldCheck, Video, Siren as SirenIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useSafety } from '../../context/SafetyContext';
import { Btn } from '../ui/Primitives';
import { fillTemplate, mapsUrl, smsLink } from '../../services/sms';

export default function SOSOverlay() {
  const { t } = useApp();
  const { status, grace, cancel, resolve, emergency, geo, rec, sirenOn, toggleSiren, silent, online, source } = useSafety();

  if (status === 'idle' || (silent && status === 'countdown')) return null;
  if (silent && status === 'active') return null;

  if (status === 'countdown') {
    return (
      <div className="fixed inset-0 z-[70] grid place-items-center bg-red-700 p-6 text-white">
        <div className="text-center">
          <p className="text-lg font-semibold">{t('graceTitle')}</p>
          <p className="my-4 text-9xl font-black">{Math.max(grace, 0)}</p>
          <Btn variant="ghost" className="!min-h-[64px] !px-10 !text-lg !text-black" onClick={cancel}>
            {t('cancel')}
          </Btn>
        </div>
      </div>
    );
  }

  const pos = geo.pos;
  return (
    <div className="safe-top safe-bottom fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-red-700 p-5 text-white">
      <div className="mx-auto w-full max-w-md flex-1">
        <h1 className="text-center text-3xl font-black">{t('sosActive')}</h1>
        <p className="mb-4 text-center text-sm opacity-90">{t('sendingHelp')} · {source}</p>

        <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-black/30 px-3 py-1">{online ? t('online') : t('offline')}</span>
          {rec.recording && (
            <span className="flex items-center gap-1 rounded-full bg-black/30 px-3 py-1"><Video size={12} /> REC {rec.mode}</span>
          )}
          {pos && (
            <span className="rounded-full bg-black/30 px-3 py-1">
              {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}{pos.cached ? ' (cached)' : ''}
            </span>
          )}
        </div>
        {geo.lockFailed && <p className="mb-3 rounded-lg bg-amber-400 p-2 text-center text-xs font-bold text-black">{t('gpsLost')}</p>}
        {rec.error && <p className="mb-3 rounded-lg bg-black/30 p-2 text-center text-xs">{rec.error}</p>}

        <div className="space-y-2">
          {emergency.group && (
            <a href={emergency.group} className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-white font-bold text-red-700">
              <MessageSquare size={20} /> SMS all guardians
            </a>
          )}
          {emergency.links.map((l) => (
            <div key={l.id} className="flex gap-2">
              {l.sms && (
                <a href={l.sms} className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-white/90 text-sm font-semibold text-red-700">
                  <MessageSquare size={16} /> {l.name}
                </a>
              )}
              {l.whatsapp && (
                <a href={l.whatsapp} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold">
                  WhatsApp
                </a>
              )}
            </div>
          ))}
          {!emergency.links.length && (
            <a
              href={smsLink('', fillTemplate('', { name: '' }, pos))}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white/90 text-sm font-semibold text-red-700"
            >
              <MessageSquare size={16} /> SMS (add guardians in Guardians tab)
            </a>
          )}
          <a href="tel:112" className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-black font-bold">
            <Phone size={20} /> Call emergency services
          </a>
          {pos && (
            <a href={mapsUrl(pos)} target="_blank" rel="noreferrer" className="block text-center text-xs underline">
              {mapsUrl(pos)}
            </a>
          )}
        </div>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-md gap-2">
        <Btn variant="ghost" className="flex-1 !text-black" onClick={toggleSiren}>
          <SirenIcon size={18} /> {sirenOn ? 'Siren off' : 'Siren on'}
        </Btn>
        <Btn variant="ghost" className="flex-[2] !min-h-[56px] !text-black" onClick={resolve}>
          <ShieldCheck size={18} /> {t('imSafe')}
        </Btn>
      </div>
    </div>
  );
}
