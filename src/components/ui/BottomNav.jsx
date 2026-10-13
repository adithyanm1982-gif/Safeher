import { Home, Map, Wrench, Users, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { tap } from '../../services/haptics';

const ITEMS = [
  { id: 'home', icon: Home, label: 'home' },
  { id: 'map', icon: Map, label: 'map' },
  { id: 'tools', icon: Wrench, label: 'tools' },
  { id: 'guardians', icon: Users, label: 'guardians' },
  { id: 'settings', icon: Settings, label: 'settings' }
];

export default function BottomNav({ tab, onChange }) {
  const { t } = useApp();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {ITEMS.map(({ id, icon: Icon, label }) => {
          const active = tab === id;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => {
                  tap();
                  onChange(id);
                }}
                aria-current={active ? 'page' : undefined}
                className={`nosel flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? 'text-accent' : 'text-muted'}`}
              >
                <Icon size={22} strokeWidth={active ? 2.6 : 2} />
                {t(label)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
