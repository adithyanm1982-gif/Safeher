import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Film, Mic, Play, Square, Trash2 } from 'lucide-react';
import { Btn, Sheet } from '../ui/Primitives';
import { useApp } from '../../context/AppContext';
import { buildRecordingBlob, deleteRecordings, listRecordings } from '../../services/media';

const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const fileName = (g) => {
  const d = new Date(g.start);
  const p = (n) => String(n).padStart(2, '0');
  const ext = (g.mime || '').includes('mp4') ? 'mp4' : 'webm';
  return `safeher-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${ext}`;
};

function RecordingList() {
  const { t, settings } = useApp();
  const [items, setItems] = useState(null);
  const [player, setPlayer] = useState(null);
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const urlRef = useRef(null);

  const load = useCallback(async () => setItems(await listRecordings().catch(() => [])), []);

  useEffect(() => {
    load();
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [load]);

  const closePlayer = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPlayer(null);
  };

  const play = async (g) => {
    closePlayer();
    setErr('');
    setBusy(g.id);
    try {
      const blob = await buildRecordingBlob(g);
      if (!blob.size) throw new Error('empty');
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setPlayer({ id: g.id, url, video: g.video });
    } catch {
      setErr(t('recError'));
    }
    setBusy('');
  };

  const download = async (g) => {
    setErr('');
    setBusy(g.id);
    try {
      const blob = await buildRecordingBlob(g);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName(g);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setErr(t('recError'));
    }
    setBusy('');
  };

  const remove = async (ids) => {
    closePlayer();
    await deleteRecordings(ids);
    setConfirm('');
    await load();
  };

  const when = (ts) => new Date(ts).toLocaleString(`${settings.lang}-IN`, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (items === null) return <p className="text-sm text-muted">{t('recLoading')}</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t('recHint')}</p>
      {err && <p className="text-xs font-semibold text-red-500">{err}</p>}
      {items.length === 0 && <p className="rounded-xl border border-line p-3 text-sm text-muted">{t('recNone')}</p>}

      <ul className="space-y-3">
        {items.map((g) => (
          <li key={g.id} className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                {g.video ? <Film size={18} /> : <Mic size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{when(g.start)}</p>
                <p className="text-xs text-muted">{g.video ? t('recVideo') : t('recAudio')} · ~{g.seconds}s · {fmtSize(g.size)}</p>
              </div>
            </div>

            {player?.id === g.id && (
              <div className="mt-2">
                {player.video ? (
                  <video src={player.url} controls autoPlay playsInline className="w-full rounded-xl bg-black" />
                ) : (
                  <audio src={player.url} controls autoPlay className="w-full" />
                )}
              </div>
            )}

            {confirm === g.id ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-semibold">{t('recDeleteAsk')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Btn variant="ghost" onClick={() => setConfirm('')}>{t('cancel')}</Btn>
                  <Btn variant="danger" onClick={() => remove(g.chunks.map((c) => c.id))}>{t('yes')}</Btn>
                </div>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {player?.id === g.id ? (
                  <Btn variant="subtle" className="!px-2 !text-xs" onClick={closePlayer}><Square size={14} /> {t('recStop')}</Btn>
                ) : (
                  <Btn variant="subtle" className="!px-2 !text-xs" disabled={busy === g.id} onClick={() => play(g)}><Play size={14} /> {t('recPlay')}</Btn>
                )}
                <Btn variant="subtle" className="!px-2 !text-xs" disabled={busy === g.id} onClick={() => download(g)}><Download size={14} /> {t('download')}</Btn>
                <Btn variant="subtle" className="!px-2 !text-xs !text-red-500" onClick={() => setConfirm(g.id)}><Trash2 size={14} /> {t('delete')}</Btn>
              </div>
            )}
          </li>
        ))}
      </ul>

      {items.length > 1 &&
        (confirm === 'all' ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold">{t('recDeleteAllAsk')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="ghost" onClick={() => setConfirm('')}>{t('cancel')}</Btn>
              <Btn variant="danger" onClick={() => remove(items.flatMap((g) => g.chunks.map((c) => c.id)))}>{t('yes')}</Btn>
            </div>
          </div>
        ) : (
          <Btn variant="ghost" className="w-full !text-red-500" onClick={() => setConfirm('all')}>
            <Trash2 size={16} /> {t('recDeleteAll')}
          </Btn>
        ))}
    </div>
  );
}

export default function Recordings({ open, onClose }) {
  const { t } = useApp();
  return (
    <Sheet open={open} onClose={onClose} title={t('recordingsBtn')}>
      <RecordingList />
    </Sheet>
  );
}