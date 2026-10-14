import { Phone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { HELPLINES } from '../../services/helplines';

export default function HelplineList() {
  const { t } = useApp();
  const [main, ...rest] = HELPLINES;

  return (
    <nav aria-label={t('helplines')} className="space-y-2">
      <a
        href={`tel:${main.num}`}
        className="flex min-h-[56px] items-center justify-center gap-3 rounded-2xl bg-accent px-4 text-onaccent shadow active:scale-95"
      >
        <Phone size={22} className="shrink-0" />
        <span className="text-2xl font-black leading-none">{main.num}</span>
        <span className="min-w-0 truncate text-xs font-semibold opacity-95">{t(main.key)}</span>
      </a>

      <div className="grid grid-cols-3 gap-2">
        {rest.map((h) => (
          <a
            key={h.num}
            href={`tel:${h.num}`}
            className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center rounded-xl px-1 py-1 text-center active:scale-95 ${
              h.primary ? 'bg-accent/90 text-onaccent' : 'bg-fg/10 text-fg'
            }`}
          >
            <span className="text-base font-extrabold leading-tight">{h.num}</span>
            <span className="w-full truncate text-[10px] leading-tight opacity-90">{t(h.key)}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}