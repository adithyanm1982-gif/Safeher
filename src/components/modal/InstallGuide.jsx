import { useEffect, useState } from 'react';
import { Download, HeartPulse, MapPin, Siren, Smartphone, Users } from 'lucide-react';
import { Btn, Sheet } from '../ui/Primitives';
import { useApp } from '../../context/AppContext';
import { LANGS } from '../../services/i18n';
import { canInstall, isIOS, isStandalone, promptInstall } from '../../services/pwaInstall';

const KEY = 'safeher.guideSeen';
const wasSeen = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
};

const STEPS = [
  { icon: Smartphone, title: 'g_s1_t', desc: 'g_s1_d' },
  { icon: Users, title: 'g_s2_t', desc: 'g_s2_d' },
  { icon: HeartPulse, title: 'g_s5_t', desc: 'g_s5_d' },
  { icon: MapPin, title: 'g_s3_t', desc: 'g_s3_d' },
  { icon: Siren, title: 'g_s4_t', desc: 'g_s4_d' }
];

export default function InstallGuide() {
  const { t, settings, update } = useApp();
  const [open, setOpen] = useState(() => !wasSeen() && !isStandalone());
  const [manual, setManual] = useState(false);
  const installed = isStandalone();

  const dismiss = () => {
    markSeen();
    setOpen(false);
  };

  useEffect(() => {
    const done = () => {
      markSeen();
      setOpen(false);
    };
    // Settings > "How to use / Install" reopens the guide at any time.
    const show = () => {
      setManual(false);
      setOpen(true);
    };
    window.addEventListener('appinstalled', done);
    window.addEventListener('safeher:guide', show);
    return () => {
      window.removeEventListener('appinstalled', done);
      window.removeEventListener('safeher:guide', show);
    };
  }, []);

  const install = async () => {
    if (isIOS() || !canInstall()) {
      setManual(true);
      return;
    }
    const result = await promptInstall();
    if (result === 'accepted') dismiss();
  };

  return (
    <Sheet open={open} onClose={dismiss} title={t('g_title')}>
      <p className="mb-3 text-sm text-muted">{t('g_sub')}</p>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {LANGS.map((l) => (
          <Btn
            key={l.code}
            variant={settings.lang === l.code ? 'primary' : 'ghost'}
            className="!px-1 !text-xs"
            onClick={() => update({ lang: l.code })}
          >
            {l.name}
          </Btn>
        ))}
      </div>

      <ol className="mb-4 space-y-3">
        {STEPS.map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
              <Icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t(title)}</span>
              <span className="block text-xs text-muted">{t(desc)}</span>
            </span>
          </li>
        ))}
      </ol>

      {manual && !installed && (
        <p className="mb-3 rounded-xl bg-amber-500/15 p-3 text-xs font-medium">
          {isIOS() ? t('g_manual_ios') : t('g_manual_android')}
        </p>
      )}

      <div className="space-y-2">
        {installed ? (
          <p className="rounded-xl bg-emerald-600/15 p-3 text-center text-sm font-semibold">{t('g_installed')}</p>
        ) : (
          <Btn className="w-full !min-h-[52px]" onClick={install}>
            <Download size={18} /> {t('g_install')}
          </Btn>
        )}
        <Btn variant="ghost" className="w-full" onClick={dismiss}>
          {installed ? t('close') : t('g_later')}
        </Btn>
      </div>
    </Sheet>
  );
}