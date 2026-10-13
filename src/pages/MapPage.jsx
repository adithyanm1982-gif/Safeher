import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Download, Flag, LocateFixed, MapPinned, Search, Star, X } from 'lucide-react';
import LiveMap from '../components/map/LiveMap';
import { useApp } from '../context/AppContext';
import { useSafety } from '../context/SafetyContext';
import useCompass from '../hooks/useCompass';
import { addReport, listReports, listSafeZones, putSafeZones } from '../services/db';
import { fetchNearbySafeZones, formatDistance, haversine, precacheTiles } from '../services/geo';
import { CATEGORIES, buildRoute, searchAlongRoute } from '../services/routeSearch';
import { sendOrQueue } from '../services/sync';
import { tap } from '../services/haptics';

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const cardinal = (h) => (h == null ? '—' : CARDINALS[Math.round(h / 45) % 8]);

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
  const { t } = useApp();
  const { geo, online } = useSafety();
  const compass = useCompass();

  const [following, setFollowing] = useState(true);
  const [flyKey, setFlyKey] = useState(0);
  const [focus, setFocus] = useState(null);
  const [zones, setZones] = useState([]);
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

  const reload = useCallback(async () => {
    setZones(await listSafeZones());
    setReports(await listReports());
  }, []);
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!msg) return undefined;
    const id = setTimeout(() => setMsg(''), 4000);
    return () => clearTimeout(id);
  }, [msg]);

  const pos = geo.pos;
  const heading = compass.heading ?? (pos && !pos.cached && pos.speed > 1 ? pos.heading : null);

  const recentre = async () => {
    tap();
    setFollowing(true);
    if (!pos || pos.cached) {
      const p = await geo.getCurrent();
      if (!p) return setMsg('No location yet. Turn on GPS and allow location access.');
    }
    setFlyKey((k) => k + 1);
  };

  const onCompass = async () => {
    tap();
    if (!compass.enabled) {
      const ok = await compass.enable();
      if (!ok) return setMsg(compass.error || 'Compass unavailable');
    }
    setMsg(heading == null ? 'Move your phone in a figure-8 to calibrate the compass.' : `Facing ${cardinal(heading)} ${Math.round(heading)}°`);
  };

  const loadZones = async () => {
    if (!pos) return setMsg('Waiting for a location fix.');
    setBusy('zones');
    try {
      const found = await fetchNearbySafeZones(pos);
      await putSafeZones(found);
      await reload();
      setMsg(`${found.length} safe places saved for offline use.`);
    } catch (e) {
      setMsg(`Could not load safe zones: ${e.message}`);
    }
    setBusy('');
  };

  const cacheTiles = async () => {
    if (!pos) return setMsg('Waiting for a location fix.');
    setBusy('tiles');
    const r = await precacheTiles(pos, {}, (d, n) => setMsg(`Caching map ${d}/${n}`));
    setMsg(`Map cached (${r.total - r.failed}/${r.total} tiles).`);
    setBusy('');
  };

  const runSearch = async () => {
    if (!pos) return setMsg('Waiting for a location fix.');
    setSearching(true);
    const route = buildRoute(pos, geo.trail, destination);
    const out = await searchAlongRoute({ pos, route, keys, online });
    setResults(out.results);
    await reload();
    setMsg(out.error ? `${out.error}. Showing saved places.` : out.results.length ? '' : 'Nothing found along this route.');
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
    setMsg(how === 'sent' ? 'Report sent.' : `Report ${t('queued')}.`);
    reload();
  };

  const sorted = pos ? [...zones].sort((a, b) => haversine(pos, a) - haversine(pos, b)) : zones;
  const avg = reports.length ? (reports.reduce((s, r) => s + r.score, 0) / reports.length).toFixed(1) : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div className="absolute inset-0">
        <LiveMap
          pos={pos} heading={heading} trail={geo.trail} zones={zones} reports={reports} results={results}
          destination={destination} following={following} flyKey={flyKey} focus={focus}
          onDrag={() => setFollowing(false)}
          onLongPress={(p) => { setDestination(p); setMsg('Destination set. Use the magnifier to search along the route.'); }}
        />
      </div>

      {/* top overlay */}
      <div className="absolute inset-x-2 top-2 z-10 space-y-2">
        {searchOpen ? (
          <div className="rounded-2xl border border-line bg-card p-3 text-fg shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">Search along route</span>
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} className="grid h-8 w-8 place-items-center"><X size={18} /></button>
            </div>
            <p className="mb-2 text-[11px] text-muted">
              {destination ? 'Searching the line to your destination.' : 'Searching the path you have walked. Long-press the map to set a destination.'}
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c.key} type="button" onClick={() => toggleKey(c.key)}
                  className={`h-8 rounded-full border px-3 text-xs font-semibold ${keys.includes(c.key) ? 'border-accent bg-accent text-onaccent' : 'border-line bg-bg text-fg'}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={runSearch} disabled={searching} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-onaccent disabled:opacity-50">
                <Search size={16} /> {searching ? 'Searching…' : 'Search'}
              </button>
              {(results.length > 0 || destination) && (
                <button type="button" onClick={() => { setResults([]); setDestination(null); }} className="h-10 rounded-xl border border-line px-3 text-sm font-semibold text-fg">Clear</button>
              )}
            </div>
            {results.length > 0 && (
              <ul className="mt-2 max-h-[34vh] divide-y divide-line overflow-y-auto">
                {results.map((z) => (
                  <li key={z.id}>
                    <button type="button" onClick={() => goTo(z)} className="flex min-h-[44px] w-full items-center justify-between gap-2 py-1.5 text-left">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{z.name}</span>
                        <span className="block text-[11px] text-muted">{z.category} · {formatDistance(z.away)} off route</span>
                      </span>
                      <span className="shrink-0 text-xs">{formatDistance(z.dist)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <button type="button" onClick={() => { tap(); setSearchOpen(true); }}
              className="flex h-11 w-full items-center gap-2 rounded-full border border-line bg-card px-4 text-sm text-muted shadow-lg">
              <Search size={18} className="text-fg" />
              {destination ? 'Search along route to destination' : 'Search along route'}
            </button>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              <button type="button" className={chip} disabled={!online || busy !== ''} onClick={loadZones}><MapPinned size={14} /> {t('safeZones')}</button>
              <button type="button" className={chip} disabled={!online || busy !== ''} onClick={cacheTiles}><Download size={14} /> Cache map</button>
              {destination && (
                <button type="button" className={chip} onClick={() => setDestination(null)}>
                  <Flag size={14} className="text-accent" /> {pos ? formatDistance(haversine(pos, destination)) : 'Destination'} <X size={12} />
                </button>
              )}
            </div>
          </>
        )}
        {msg && <div className="mx-auto w-fit max-w-full rounded-full bg-fg px-3 py-1 text-center text-xs font-semibold text-bg shadow">{msg}</div>}
      </div>

      {/* bottom: controls + sheet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col">
        <div className="pointer-events-auto flex flex-col items-center gap-2 self-end pb-2 pr-3">
          <button type="button" aria-label="Compass" onClick={onCompass} className={`${roundBtn} flex-col gap-0 !h-14 !w-12`}>
            <svg viewBox="0 0 24 24" width="24" height="24" style={{ transform: `rotate(${-(heading || 0)}deg)`, transition: 'transform .15s linear' }}>
              <polygon points="12,2 17.5,13 12,11 6.5,13" fill="#dc2626" />
              <polygon points="12,22 17.5,13 12,11 6.5,13" fill="#ffffff" stroke="currentColor" strokeWidth="1" />
            </svg>
            <span className="text-[9px] font-bold leading-none">{cardinal(heading)}</span>
          </button>
          <button type="button" aria-label="Recentre" onClick={recentre} className={`${roundBtn} ${following ? 'text-accent' : ''}`}>
            <LocateFixed size={24} />
          </button>
        </div>

        <div className="pointer-events-auto rounded-t-2xl border border-b-0 border-line bg-card text-fg shadow-[0_-4px_14px_rgba(0,0,0,.25)]">
          <button type="button" onClick={() => setSheet((s) => !s)} className="flex min-h-[44px] w-full items-center justify-between gap-2 px-4">
            <span className="flex items-center gap-2 text-sm font-bold">
              {sheet ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              {tab === 'nearby' ? `${t('safeZones')} (${zones.length})` : t('reports')}
            </span>
            <span className="text-[10px] text-muted">© OpenStreetMap contributors</span>
          </button>
          {sheet && (
            <div className="max-h-[36vh] overflow-y-auto px-4 pb-3">
              <div className="mb-2 flex gap-2">
                {[['nearby', t('safeZones')], ['route', t('reports')]].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setTab(id)}
                    className={`h-8 rounded-full px-3 text-xs font-semibold ${tab === id ? 'bg-accent text-onaccent' : 'border border-line text-fg'}`}>{label}</button>
                ))}
              </div>
              {tab === 'nearby' ? (
                sorted.length === 0 ? (
                  <p className="text-xs text-muted">Tap “{t('safeZones')}” while online to save nearby police, hospitals and pharmacies.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {sorted.slice(0, 15).map((z) => (
                      <li key={z.id}>
                        <button type="button" onClick={() => goTo(z)} className="flex min-h-[40px] w-full items-center justify-between py-1 text-left text-sm">
                          <span className="min-w-0"><b className="block truncate">{z.name}</b><span className="text-[11px] text-muted">{z.category}</span></span>
                          {pos && <span className="text-xs">{formatDistance(haversine(pos, z))}</span>}
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
                  {avg && <p className="mt-1 text-[11px] text-muted">{reports.length} reports · avg {avg}/10</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}