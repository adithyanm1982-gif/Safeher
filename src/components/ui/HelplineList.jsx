import { Phone } from 'lucide-react';
import { Card } from './Primitives';
import { useApp } from '../../context/AppContext';
import { HELPLINES } from '../../services/helplines';

export default function HelplineList() {
  const { t } = useApp();
  return (
    <Card className="!p-3">
      <h3 className="font-bold">{t('helplines')}</h3>
      <p className="mb-2 text-[11px] text-muted">{t('helplinesNote')}</p>
      <div className="grid grid-cols-2 gap-2">
        {HELPLINES.map((h, i) => (
          <a
            key={h.num}
            href={`tel:${h.num}`}
            className={`flex min-h-[56px] items-center gap-2 rounded-xl px-3 py-2 active:scale-95 ${
              h.primary ? 'bg-accent text-onaccent' : 'bg-fg/10 text-fg'
            } ${i === HELPLINES.length - 1 && HELPLINES.length % 2 ? 'col-span-2' : ''}`}
          >
            <Phone size={16} className="shrink-0" />
            <span className="min-w-0">
              <span className="block text-base font-extrabold leading-tight">{h.num}</span>
              <span className="block truncate text-[11px] leading-tight opacity-90">{t(h.key)}</span>
            </span>
          </a>
        ))}
      </div>
    </Card>
  );
}