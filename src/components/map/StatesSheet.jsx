import { useEffect, useState } from 'react';
import { Check, ChevronDown, Download, RefreshCw, Trash2 } from 'lucide-react';
import { Sheet } from '../ui/Primitives';
import { useApp } from '../../context/AppContext';
import { STATES } from '../../services/indiaStates';
import { askPersist, downloadState, listDownloaded, loadIndex, removeState } from '../../services/zoneData';

const mb = (b) => (b / 1048576).toFixed(1);
const KNOWN = ['zNotPublished', 'zOffline', 'zFailed'];

export default function StatesSheet({ open, onClose, onChanged, online }) {
  const { t } = useApp();
  const [installed, setInstalled] = useState({});
  const [index, setIndex] = useState({});
  const [openSlug, setOpenSlug] = useState(null);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(null);
  const [err, setErr] = useState('');

  const refresh = async () => setInstalled(Object.fromEntries((await listDownloaded()).map((s) => [s.slug, s])));

  useEffect(() => {
    if (!open) return;
    refresh().catch(() => {});
    if (online) {
      loadIndex()
        .then((j) => setIndex(Object.fromEntries(j.states.map((s) => [s.slug, s]))))
        .catch(() => setIndex({}));
    }
  }, [open, online]);

  const fail = (e) => setErr(KNOWN.includes(e.message) ? t(e.message) : t('zFailed'));

  const run = async (s) => {
    setErr('');
    setBusy(s.slug);
    try {
      await askPersist();
      await downloadState(s, (d, n) => setProgress({ slug: s.slug, d, n }));
      await refresh();
      onChanged();
    } catch (e) {
      fail(e);
    }
    setProgress(null);
    setBusy('');
  };

  const del = async (s) => {
    if (!window.confirm(t('zDeleteAsk', { name: s.name }))) return;
    setBusy(s.slug);
    await removeState(s.slug);
    await refresh();
    onChanged();
    setBusy('');
  };

  const all = async () => {
    const todo = STATES.filter((s) => !installed[s.slug] && index[s.slug]);
    const total = todo.reduce((n, s) => n + index[s.slug].bytes, 0);
    if (!todo.length || !window.confirm(t('zAllAsk', { mb: mb(total) }))) return;
    for (const s of todo) {
      await run(s);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('zTitle')}>
      <p className="mb-3 text-xs text-muted">{t('zHint')}</p>
      {!online && <p className="mb-2 text-xs font-semibold text-amber-600">{t('zOfflineNeed')}</p>}
      {err && <p className="mb-2 text-xs font-semibold text-red-500">{err}</p>}
      <button
        type="button"
        disabled={!online || busy !== '' || !Object.keys(index).length}
        onClick={all}
        className="mb-3 h-9 w-full rounded-xl border border-line bg-bg text-xs font-semibold text-fg disabled:opacity-40"
      >
        {t('zAll')}
      </button>

      <ul className="divide-y divide-line">
        {STATES.map((s) => {
          const inst = installed[s.slug];
          const meta = index[s.slug];
          const expanded = openSlug === s.slug;
          const update = inst && meta && meta.built > inst.built;
          const working = busy === s.slug;
          return (
            <li key={s.slug}>
              <button
                type="button"
                onClick={() => setOpenSlug(expanded ? null : s.slug)}
                className="flex min-h-[48px] w-full items-center justify-between gap-2 py-2 text-left"
              >
                <span className="min-w-0 text-sm font-semibold">{s.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                  {inst && <Check size={16} className="text-emerald-500" />}
                  {update && <span className="text-accent">{t('zUpdateAvail')}</span>}
                  <ChevronDown size={16} className={expanded ? 'rotate-180' : ''} />
                </span>
              </button>
              {expanded && (
                <div className="pb-3">
                  {inst && (
                    <p className="mb-2 text-xs text-muted">
                      {t('zOnPhone')} · {t('zPlaces', { n: inst.count })}
                    </p>
                  )}
                  {working && progress && progress.slug === s.slug ? (
                    <p className="text-xs font-semibold">{t('zSaving', { d: progress.d, n: progress.n })}</p>
                  ) : working ? (
                    <p className="text-xs font-semibold">{t('zGetting')}</p>
                  ) : (
                    <div className="flex gap-2">
                      {(!inst || update) && (
                        <button
                          type="button"
                          disabled={!online || busy !== ''}
                          onClick={() => run(s)}
                          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-onaccent disabled:opacity-40"
                        >
                          {inst ? <RefreshCw size={16} /> : <Download size={16} />}
                          {inst ? t('zUpdate') : t('zDownload', { name: s.name })}
                          {meta && !inst && <span className="text-[11px] opacity-80">({t('zSize', { mb: mb(meta.bytes) })})</span>}
                        </button>
                      )}
                      {inst && (
                        <button
                          type="button"
                          disabled={busy !== ''}
                          onClick={() => del(s)}
                          className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-line px-3 text-sm font-semibold text-red-500"
                        >
                          <Trash2 size={16} /> {t('zDelete')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}