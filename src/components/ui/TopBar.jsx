import { Wifi, WifiOff, Satellite, Mic, Activity, Video, Globe } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useSafety } from '../../context/SafetyContext';
import { LANGS } from '../../services/i18n';
import { tap } from '../../services/haptics';

const SENSOR_ICON = { GPS: Satellite, MIC: Mic, SHAKE: Activity, REC: Video };

export default function TopBar() {
  const { settings, update, t } = useApp();
  const { online, geo, activeSensors } = useSafety();

  const nextLang = () => {
    tap();
    const i = LANGS.findIndex((l) => l.code === settings.lang);
    update({ lang: LANGS[(i + 1) % LANGS.length].code });
  };

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex min-h-[52px] max-w-md items-center justify-between gap-2 px-3">
        <span className="text-lg font-extrabold tracking-tight text-accent">SafeHer</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1" title="GPS signal">
            <Satellite size={16} className={geo.signal ? '' : 'text-muted'} />
            <span className="flex items-end gap-[2px]" aria-label={`GPS signal ${geo.signal} of 3`}>
              {[1, 2, 3].map((n) => (
                <span key={n} className={`w-[3px] rounded-sm ${geo.signal >= n ? 'bg-accent' : 'bg-fg/20'}`} style={{ height: 4 + n * 3 }} />
              ))}
            </span>
          </span>
          <span className={`flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${online ? 'bg-emerald-600/15 text-emerald-600' : 'bg-amber-500/20 text-amber-600'}`}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {online ? t('online') : t('offline')}
          </span>
          <span className="flex items-center gap-1">
            {activeSensors
              .filter((s) => s !== 'GPS')
              .map((s) => {
                const Icon = SENSOR_ICON[s];
                return <Icon key={s} size={15} className="text-accent" aria-label={s} />;
              })}
          </span>
          <button
            type="button"
            onClick={nextLang}
            aria-label={t('language')}
            className="flex min-h-touch min-w-touch items-center justify-center gap-1 font-bold"
          >
            <Globe size={16} />
            {settings.lang.toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
}
