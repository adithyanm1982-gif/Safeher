import { useCallback, useEffect, useState } from 'react';
import { Download, MapPinned, Star } from 'lucide-react';
import LiveMap from '../components/map/LiveMap';
import { Btn, Card } from '../components/ui/Primitives';
import { useApp } from '../context/AppContext';
import { useSafety } from '../context/SafetyContext';
import { addReport, listReports, listSafeZones, putSafeZones } from '../services/db';
import { fetchNearbySafeZones, formatDistance, haversine, precacheTiles } from '../services/geo';
import { sendOrQueue } from '../services/sync';

function Rating({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${label} ${n}`} onClick={() => onChange(n)} className="grid min-h-touch min-w-[36px] place-items-center">
            <Star size={20} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted'} />
          </button>
        ))}
      </span>
    </div>
  );
}

export default function MapPage() {
  const { t } = useApp();
  const { geo, online } = useSafety();
  const [zones, setZones] = useState([]);
  const [reports, setReports] = useState([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [lighting, setLighting] = useState(3);
  const [crowd, setCrowd] = useState(3);

  const reload = useCallback(async () => {
    setZones(await listSafeZones());
    setReports(await listReports());
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const refreshZones = async () => {
    if (!geo.pos) return setMsg('Waiting for a location fix.');
    setBusy('zones');
    try {
      const found = await fetchNearbySafeZones(geo.pos);
      await putSafeZones(found);
      await reload();
      setMsg(`${found.length} safe places saved for offline use.`);
    } catch (e) {
      setMsg(online ? `Could not load safe zones: ${e.message}` : 'You are offline. Saved zones are shown.');
    }
    setBusy('');
  };

  const cacheTiles = async () => {
    if (!geo.pos) return setMsg('Waiting for a location fix.');
    setBusy('tiles');
    const r = await precacheTiles(geo.pos, {}, (d, n) => setMsg(`Caching map ${d}/${n}`));
    setMsg(`Map cached (${r.total - r.failed}/${r.total} tiles).`);
    setBusy('');
  };

  const submit = async () => {
    const score = Math.round(((lighting + (6 - Math.abs(crowd - 3) * 1.5 - 0)) / 10) * 10 * 0.5 + (lighting + crowd) * 0.5);
    const clamped = Math.max(1, Math.min(10, Math.round((lighting * 2 + crowd * 2 + 0) / 2)));
    const rep = await addReport({ pos: geo.pos ? { lat: geo.pos.lat, lng: geo.pos.lng } : null, lighting, crowd, score: clamped || score });
    const how = await sendOrQueue('report', rep);
    setMsg(how === 'sent' ? 'Report sent.' : `Report ${t('queued')}.`);
    reload();
  };

  const sorted = geo.pos ? [...zones].sort((a, b) => haversine(geo.pos, a) - haversine(geo.pos, b)) : zones;

  return (
    <div className="space-y-4">
      <LiveMap pos={geo.pos} trail={geo.trail} zones={zones} reports={reports} height={300} />
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Speed {((geo.pos?.speed || 0) * 3.6).toFixed(1)} km/h</span>
        <span>±{geo.pos ? Math.round(geo.pos.accuracy || 0) : '—'} m</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Btn variant="ghost" disabled={!online || busy !== ''} onClick={refreshZones}><MapPinned size={16} /> {t('safeZones')}</Btn>
        <Btn variant="ghost" disabled={!online || busy !== ''} onClick={cacheTiles}><Download size={16} /> Cache map</Btn>
      </div>
      {msg && <p className="text-center text-xs text-muted">{msg}</p>}

      <Card>
        <h3 className="mb-2 font-bold">{t('safeZones')}</h3>
        {sorted.length === 0 && <p className="text-sm text-muted">Tap “{t('safeZones')}” while online to save nearby police, hospitals and pharmacies.</p>}
        <ul className="divide-y divide-line">
          {sorted.slice(0, 12).map((z) => (
            <li key={z.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <b>{z.name}</b>
                <span className="block text-xs text-muted">{z.category}</span>
              </span>
              {geo.pos && <span className="text-xs">{formatDistance(haversine(geo.pos, z))}</span>}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="mb-1 font-bold">{t('reports')}</h3>
        <Rating label={t('lighting')} value={lighting} onChange={setLighting} />
        <Rating label={t('crowd')} value={crowd} onChange={setCrowd} />
        <Btn className="mt-2 w-full" onClick={submit}>{t('submit')}</Btn>
        {reports.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            {reports.length} reports · avg {t('score')} {(reports.reduce((s, r) => s + r.score, 0) / reports.length).toFixed(1)}/10
          </p>
        )}
      </Card>
    </div>
  );
}
