import { AlertTriangle, CheckCircle2, Clock, Loader2, MapPin, MessageSquare, PhoneCall, ShieldCheck, Siren as SirenIcon, Video, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useSafety } from '../../context/SafetyContext';
import { Btn } from '../ui/Primitives';
import { fillTemplate, mapsUrl, smsLink } from '../../services/sms';

const cleanNumber = (n) => (n || '').replace(/[^\d+]/g, '');
const warnIcon = <AlertTriangle size={18} className="text-amber-300" />;

function StatusCard({ alert, t }) {
  const { status, results, call } = alert;
  const head = {
    idle: { icon: <Loader2 size={18} className="animate-spin" />, text: t('gettingLoc') },
    sending: { icon: <Loader2 size={18} className="animate-spin" />, text: t('sendingAlerts') },
    sent: { icon: <CheckCircle2 size={18} className="text-emerald-300" />, text: t('alertSent', { n: results.length }) },
    partial: { icon: warnIcon, text: t('partialAlert') },
    failed: { icon: <XCircle size={18} className="text-amber-300" />, text: t('alertFailed') },
    queued: { icon: <Clock size={18} />, text: t('alertQueued') },
    unconfigured: { icon: warnIcon, text: t('alertNoServer') },
    'no-contacts': { icon: warnIcon, text: t('noContacts') }
  }[status] || { icon: null, text: '' };

  return (
    <div className="rounded-2xl bg-black/25 p-3">
      <p className="flex items-start gap-2 text-sm font-bold">
        <span className="mt-0.5 shrink-0">{head.icon}</span>
        <span>{head.text}</span>
      </p>
      {results.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-white/20 pt-2">
          {results.map((r, i) => (
            <li key={`${r.id}-${i}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{r.name || t('guardians')}</span>
              {r.ok ? (
                <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-300"><CheckCircle2 size={14} /> {t('smsSent')}</span>
              ) : (
                <span className="flex min-w-0 items-center gap-1 text-xs text-amber-300"><XCircle size={14} className="shrink-0" /> <span className="truncate">{r.error || t('failed')}</span></span>
              )}
            </li>
          ))}
        </ul>
      )}
      {call && (
        <p className={`mt-2 flex items-center gap-2 border-t border-white/20 pt-2 text-sm ${call.ok ? '' : 'text-amber-300'}`}>
          <PhoneCall size={14} className="shrink-0" />
          {call.ok
            ? t('calling', { name: call.name || t('defaultContactName') })
            : `${t('callFailed')}: ${call.error || ''}`}
        </p>
      )}
    </div>
  );
}

export default function SOSOverlay() {
  const { t, te, emergencyContact } = useApp();
  const { status, grace, cancel, resolve, emergency, alert, geo, rec, sirenOn, toggleSiren, silent, online, source } = useSafety();

  if (status === 'idle' || (silent && status === 'countdown')) return null;
  if (silent && status === 'active') return null;

  if (status === 'countdown') {
    return (
      <div className="fixed inset-0 z-[70] grid place-items-center bg-red-700 p-6 text-white">
        <div className="text-center">
          <p className="text-lg font-semibold">{t('graceTitle')}</p>
          <p className="my-4 text-9xl font-black">{Math.max(grace, 0)}</p>
          <Btn variant="light" className="!min-h-[64px] !px-10 !text-lg" onClick={cancel}>
            {t('cancel')}
          </Btn>
        </div>
      </div>
    );
  }

  const srcKey = `src_${source}`;
  const srcLabel = t(srcKey) === srcKey ? source : t(srcKey);

  const pos = geo.pos;
  const customNumber = cleanNumber(emergencyContact.phone);
  const callLabel = customNumber
    ? t('callName', { name: emergencyContact.name || emergencyContact.phone })
    : t('call112');

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-[70] flex flex-col bg-red-700 text-white">
      <div className="flex-1 overflow-y-auto px-4 pb-3 pt-4">
        <div className="mx-auto w-full max-w-md space-y-3">
          <div className="text-center">
            <h1 className="text-3xl font-black">{t('sosActive')}</h1>
            <p className="text-sm opacity-90">{t('sendingHelp')} · {srcLabel}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-black/30 px-3 py-1">{online ? t('online') : t('offline')}</span>
            {rec.recording && (
              <span className="flex items-center gap-1 rounded-full bg-black/30 px-3 py-1"><Video size={12} /> REC {rec.mode}</span>
            )}
            {pos && (
              <span className="flex items-center gap-1 rounded-full bg-black/30 px-3 py-1">
                <MapPin size={12} /> {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}{pos.cached ? ' (cached)' : ''}
              </span>
            )}
          </div>

          {geo.lockFailed && <p className="rounded-lg bg-amber-400 p-2 text-center text-xs font-bold text-black">{t('gpsLost')}</p>}
          {rec.error && <p className="rounded-lg bg-black/30 p-2 text-center text-xs">{te(rec.error)}</p>}

          <StatusCard alert={alert} t={t} />

          <a href={`tel:${customNumber || '112'}`} className="flex min-h-[64px] items-center justify-center gap-2 rounded-2xl bg-black text-lg font-bold">
            <PhoneCall size={22} /> {callLabel}
          </a>
          {customNumber && (
            <a href="tel:112" className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white/15 text-sm font-semibold">
              <PhoneCall size={16} /> {t('call112Long')}
            </a>
          )}

          <details className="rounded-2xl bg-black/25 p-3">
            <summary className="cursor-pointer text-sm font-bold">{t('manualSms')}</summary>
            <div className="mt-3 space-y-2">
              {emergency.group && (
                <a href={emergency.group} className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white font-bold text-red-700">
                  <MessageSquare size={18} /> {t('smsAll')}
                </a>
              )}
              {emergency.links.map((l) => (
                <div key={l.id} className="flex gap-2">
                  {l.sms && (
                    <a href={l.sms} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-white/90 text-sm font-semibold text-red-700">
                      <MessageSquare size={16} /> {l.name}
                    </a>
                  )}
                  {l.whatsapp && (
                    <a href={l.whatsapp} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold">
                      WhatsApp
                    </a>
                  )}
                </div>
              ))}
              {!emergency.links.length && (
                <a
                  href={smsLink('', fillTemplate('', { name: '' }, pos))}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/90 text-sm font-semibold text-red-700"
                >
                  <MessageSquare size={16} /> {t('smsAddGuardians')}
                </a>
              )}
              {pos && (
                <a href={mapsUrl(pos)} target="_blank" rel="noreferrer" className="block break-all text-center text-xs underline">
                  {mapsUrl(pos)}
                </a>
              )}
            </div>
          </details>
        </div>
      </div>

      <div className="border-t border-white/20 bg-red-800 px-4 py-3">
        <div className="mx-auto flex w-full max-w-md gap-2">
          <Btn variant="light" className="flex-1" onClick={toggleSiren}>
            <SirenIcon size={18} /> {sirenOn ? t('sirenOff') : t('sirenOn')}
          </Btn>
          <Btn variant="light" className="flex-[2] !min-h-[56px]" onClick={resolve}>
            <ShieldCheck size={18} /> {t('imSafe')}
          </Btn>
        </div>
      </div>
    </div>
  );
}