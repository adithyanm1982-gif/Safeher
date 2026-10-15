import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Download, Flag, Globe, LocateFixed, MapPinned, Search, Star, X } from 'lucide-react';
import LiveMap from '../components/map/LiveMap';
import StatesSheet from '../components/map/StatesSheet';
import { useApp } from '../context/AppContext';
import { useSafety } from '../context/SafetyContext';
import useCompass from '../hooks/useCompass';
import { addReport, listReports, listSafeZones, putSafeZones } from '../services/db';
import { fetchNearbySafeZones, formatDistance, haversine, precacheTiles } from '../services/geo';
import { CATEGORIES, buildRoute, searchAlongRoute } from '../services/routeSearch';
import { sendOrQueue } from '../services/sync';
import { tap } from '../services/haptics';
import { CAT_KEY, zoneName } from '../services/i18n';
import { getMeta, listDownloaded, nearbyZones, setMeta } from '../services/zoneData';

const CARDINALS = ['cN', 'cNE', 'cE', 'cSE', 'cS', 'cSW', 'cW', 'cNW'];

const chip = 'flex h-8 shrink-0 items-center gap-1 rounded-full border border-line bg-card px-3 text-xs font-semibold text-fg shadow disabled:opacity-40';
const roundBtn = 'grid h-12 w-12 place-items-center rounded-full border border-line bg-card text-fg shadow-lg active:scale-95';

function StarRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${label} ${n}`} onClick={() => onChange(n)} className="grid h-8 w-8 place-items-center">
            <Star size={18} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted'} />
          </button>
        ))}
      </span>
    </div>
  );
}

export default function MapPage() {
  const { t, te } = useApp();
  const { geo, online } = useSafety();
  const compass = useCompass();

  const [following, setFollowing] = useState(true);
  const [flyKey, setFlyKey] = useState(0);
  const [focus, setFocus] = useState(null);
  const [zones, setZones] = useState([]);
  const [offlineZones, setOfflineZones] = useState([]);
  const [reports, setReports] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState('nearby');
  const [lighting, setLighting] = useState(3);
  const [crowd, setCrowd] = useState(3);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keys, setKeys] = useState([]);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [destination, setDestination] = useState(null);
  const [statesOpen, setStatesOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(0);
  const [zver, setZver] = useState(0);
  const lastQ = useRef(null);

  const cardinal = (h) => (h == null ? '—' : t(CARDINALS[Math.round(h / 45) % 8]));
  const catLabel = (z) => t(CAT_KEY[z.category] || 'cat_other');

  const reload = useCallback(async () => {
    setZones(await listSafeZones());
    setReports(await listReports());
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // Open the state list once, the very first time the map is visited.
  useEffect(() => {
    (async () => {
      setDownloaded((await listDownloaded()).length);
      if (!(await getMeta('prompted'))) {
        await setMeta('prompted', true);
        setStatesOpen(true);
      }
    })().catch(() => {});
  }, []);

  const onStatesChanged = () => {
    setZver((v) => v + 1);
    listDownloaded().then((l) => setDownloaded(l.length)).catch(() => {});
  };

  useEffect(() => {
    if (!msg) return undefined;
    const id = setTimeout(() => setMsg(''), 4000);
    return () => clearTimeout(id);
  }, [msg]);

  const pos = geo.pos;
  const heading = compass.heading ?? (pos && !pos.cached && pos.speed > 1 ? pos.heading : null);

  // Places from downloaded states, refreshed when you move about 300 m.
  useEffect(() => {
    if (!pos) return;
    const l = lastQ.current;
    if (l && l.v === zver && haversine(l, pos) < 300) return;
    lastQ.current = { lat: pos.lat, lng: pos.lng, v: zver };
    nearbyZones(pos, 6000, 150).then(setOfflineZones).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.lat, pos?.lng, zver]);

  const allZones = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const z of [...zones, ...offlineZones]) {
      const k = `${z.category}|${z.lat.toFixed(4)}|${z.lng.toFixed(4)}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(z);
      }
    }
    return out;
  }, [zones, offlineZones]);

  const recentre = async () => {
    tap();
    setFollowing(true);
    if (!pos || pos.cached) {
      const p = await geo.getCurrent();
      if (!p) return setMsg(t('noLoc'));
    }
    setFlyKey((k) => k + 1);
  };

  const onCompass = async () => {
    tap();
    if (!compass.enabled) {
      const ok = await compass.enable();
      if (!ok) return setMsg(compass.error ? te(compass.error) : t('compassUnavail'));
    }
    setMsg(heading == null ? t('calibrate') : t('facing', { dir: cardinal(heading), deg: Math.round(heading) }));
  };

  const loadZones = async () => {
    if (!pos) return setMsg(t('waitFix'));
    setBusy('zones');
    try {
      const found = await fetchNearbySafeZones(pos);
      await putSafeZones(found);
      await reload();
      setMsg(t('zonesSaved', { n: found.length }));
    } catch (e) {
      setMsg(t('zonesFail', { err: e.message }));
    }
    setBusy('');
  };

  const cacheTiles = async () => {
    if (!pos) return setMsg(t('waitFix'));
    setBusy('tiles');
    const r = await precacheTiles(pos, {}, (d, n) => setMsg(t('cachingMap', { d, n })));
    setMsg(t('mapCached', { ok: r.total - r.failed, n: r.total }));
    setBusy('');
  };

  const runSearch = async () => {
    if (!pos) return setMsg(t('waitFix'));
    setSearching(true);
    const route = buildRoute(pos, geo.trail, destination);
    const out = await searchAlongRoute({ pos, route, keys });
    setResults(out.results);
    if (out.results.length) {
      setSearchOpen(false);
      setSheet(true);
      setTab('nearby');
    } else {
      setMsg(t('nothingFound'));
    }
    setSearching(false);
  };

  const toggleKey = (k) => setKeys((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));

  const goTo = (z) => {
    setFollowing(false);
    setFocus({ lat: z.lat, lng: z.lng, k: Date.now() });
  };

  const submitReport = async () => {
    const rep = await addReport({ pos: pos ? { lat: pos.lat, lng: pos.lng } : null, lighting, crowd, score: lighting + crowd });
    const how = await sendOrQueue('report', rep);
    setMsg(how === 'sent' ? t('reportSent') : t('reportQueued'));
    reload();
  };

  // While a search is active only its results are listed and drawn; otherwise everything nearby.
  const base = results.length ? results : allZones;
  const sorted = pos ? [...base].sort((a, b) => haversine(pos, a) - haversine(pos, b)) : base;
  const avg = reports.length ? (reports.reduce((s, r) => s + r.score, 0) / reports.length).toFixed(1) : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div className="absolute inset-0">
        <LiveMap
          pos={pos} heading={heading} trail={geo.trail} zones={results.length ? [] : allZones} reports={reports} results={results}
          destination={destination} following={following} flyKey={flyKey} focus={focus}
          onDrag={() => setFollowing(false)}
          onLongPress={(p) => { setDestination(p); setMsg(t('destSet')); }}
        />
      </div>

      {/* top overlay */}
      <div className="absolute inset-x-2 top-2 z-10 space-y-2">
        {searchOpen ? (
          <div className="rounded-2xl border border-line bg-card p-3 text-fg shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">{t('searchRoute')}</span>
              <button type="button" aria-label={t('closeSearch')} onClick={() => setSearchOpen(false)} className="grid h-8 w-8 place-items-center"><X size={18} /></button>
            </div>
            <p className="mb-2 text-[11px] text-muted">
              {destination ? t('searchingDest') : t('searchingTrail')}
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c.key} type="button" onClick={() => toggleKey(c.key)}
                  className={`min-h-8 rounded-full border px-3 py-1 text-xs font-semibold ${keys.includes(c.key) ? 'border-accent bg-accent text-onaccent' : 'border-line bg-bg text-fg'}`}>
                  {t(`cat_${c.key}`)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={runSearch} disabled={searching} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-onaccent disabled:opacity-50">
                <Search size={16} /> {searching ? t('searchingBtn') : t('search')}
              </button>
              {(results.length > 0 || destination) && (
                <button type="button" onClick={() => { setResults([]); setDestination(null); }} className="h-10 rounded-xl border border-line px-3 text-sm font-semibold text-fg">{t('clear')}</button>
              )}
            </div>
          </div>
        ) : (
          <>
            <button type="button" onClick={() => { tap(); setSearchOpen(true); }}
              className="flex h-11 w-full items-center gap-2 rounded-full border border-line bg-card px-4 text-sm text-muted shadow-lg">
              <Search size={18} className="shrink-0 text-fg" />
              <span className="truncate">{destination ? t('searchToDest') : t('searchRoute')}</span>
            </button>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              <button type="button" className={chip} disabled={!online || busy !== ''} onClick={loadZones}><MapPinned size={14} /> {t('safeZones')}</button>
              <button type="button" className={chip} disabled={!online || busy !== ''} onClick={cacheTiles}><Download size={14} /> {t('cacheMap')}</button>
              {results.length > 0 && (
                <button type="button" className={chip} onClick={() => setResults([])}>
                  <X size={12} /> {t('clear')} ({results.length})
                </button>
              )}
              {destination && (
                <button type="button" className={chip} onClick={() => setDestination(null)}>
                  <Flag size={14} className="text-accent" /> {pos ? formatDistance(haversine(pos, destination)) : t('destination')} <X size={12} />
                </button>
              )}
            </div>
          </>
        )}
        {msg && <div className="mx-auto w-fit max-w-full rounded-2xl bg-fg px-3 py-1 text-center text-xs font-semibold text-bg shadow">{msg}</div>}
      </div>

      {/* bottom: controls + sheet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col">
        <div className="flex items-end justify-between px-3 pb-2">
          <button type="button" onClick={() => { tap(); setStatesOpen(true); }} className={`${chip} pointer-events-auto`}>
            <Globe size={14} /> {t('zStates')}{downloaded > 0 ? ` · ${downloaded}` : ''}
          </button>
          <div className="pointer-events-auto flex flex-col items-center gap-2">
            <button type="button" aria-label={t('compass')} onClick={onCompass} className={`${roundBtn} flex-col gap-0 !h-14 !w-12`}>
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ transform: `rotate(${-(heading || 0)}deg)`, transition: 'transform .15s linear' }}>
                <polygon points="12,2 17.5,13 12,11 6.5,13" fill="#dc2626" />
                <polygon points="12,22 17.5,13 12,11 6.5,13" fill="#ffffff" stroke="currentColor" strokeWidth="1" />
              </svg>
              <span className="text-[9px] font-bold leading-none">{cardinal(heading)}</span>
            </button>
            <button type="button" aria-label={t('recentre')} onClick={recentre} className={`${roundBtn} ${following ? 'text-accent' : ''}`}>
              <LocateFixed size={24} />
            </button>
          </div>
        </div>

        <div className="pointer-events-auto rounded-t-2xl border border-b-0 border-line bg-card text-fg shadow-[0_-4px_14px_rgba(0,0,0,.25)]">
          <button type="button" onClick={() => setSheet((s) => !s)} className="flex min-h-[44px] w-full items-center justify-between gap-2 px-4">
            <span className="flex items-center gap-2 text-sm font-bold">
              {sheet ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              {tab === 'nearby' ? `${t('safeZones')} (${base.length})` : t('reports')}
            </span>
            <span className="text-[10px] text-muted">© OpenStreetMap contributors</span>
          </button>
          {sheet && (
            <div className="max-h-[36vh] overflow-y-auto px-4 pb-3">
              <div className="mb-2 flex gap-2">
                {[['nearby', t('safeZones')], ['route', t('reports')]].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setTab(id)}
                    className={`min-h-8 rounded-full px-3 py-1 text-xs font-semibold ${tab === id ? 'bg-accent text-onaccent' : 'border border-line text-fg'}`}>{label}</button>
                ))}
              </div>
              {tab === 'nearby' ? (
                sorted.length === 0 ? (
                  <p className="text-xs text-muted">{t('zonesHint', { label: t('safeZones') })}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {sorted.slice(0, 30).map((z) => (
                      <li key={z.id}>
                        <button type="button" onClick={() => goTo(z)} className="flex min-h-[40px] w-full items-center justify-between gap-2 py-1 text-left text-sm">
                          <span className="min-w-0"><b className="block truncate">{zoneName(t, z)}</b><span className="text-[11px] text-muted">{catLabel(z)}</span></span>
                          {pos && <span className="shrink-0 text-xs">{formatDistance(haversine(pos, z))}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <div>
                  <StarRow label={t('lighting')} value={lighting} onChange={setLighting} />
                  <StarRow label={t('crowd')} value={crowd} onChange={setCrowd} />
                  <button type="button" onClick={submitReport} className="mt-1 h-9 w-full rounded-xl bg-accent text-sm font-semibold text-onaccent">{t('submit')}</button>
                  {avg && <p className="mt-1 text-[11px] text-muted">{t('reportsAvg', { n: reports.length, avg })}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {createPortal(
        <StatesSheet open={statesOpen} onClose={() => setStatesOpen(false)} onChanged={onStatesChanged} online={online} />,
        document.body
      )}
    </div>
  );
}