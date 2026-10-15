import { haversine } from './geo';
import { listSafeZones } from './db';
import { densify, zonesNear } from './zoneData';

export const CATEGORIES = [
  { key: 'hospital', name: 'Hospital' },
  { key: 'pharmacy', name: 'Pharmacy' },
  { key: 'fire', name: 'Fire Station' },
  { key: 'fuel', name: 'Petrol Bunk' },
  { key: 'bus', name: 'Bus Stand' },
  { key: 'rail', name: 'Railway Station' },
  { key: 'govt', name: 'Government Office' },
  { key: 'airport', name: 'Airport' }
];

function sample(arr, n) {
  if (arr.length <= n) return arr;
  const out = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.round((i * (arr.length - 1)) / (n - 1))]);
  return out;
}

export function buildRoute(pos, trail, destination) {
  if (!pos) return [];
  const here = { lat: pos.lat, lng: pos.lng };
  if (destination) return [here, destination];
  if (trail.length >= 2) {
    const pts = sample(trail.slice(-60), 12).map(([lat, lng]) => ({ lat, lng }));
    pts.push(here);
    return pts;
  }
  return [here];
}

function distToSegment(p, a, b) {
  const k = Math.cos((p.lat * Math.PI) / 180);
  const X = (q) => (q.lng - p.lng) * 111320 * k;
  const Y = (q) => (q.lat - p.lat) * 110540;
  const ax = X(a), ay = Y(a), bx = X(b), by = Y(b);
  const dx = bx - ax, dy = by - ay;
  const len = dx * dx + dy * dy;
  let t = len ? (-ax * dx - ay * dy) / len : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

export function distToRoute(p, route) {
  if (route.length < 2) return route.length ? haversine(p, route[0]) : 0;
  let m = Infinity;
  for (let i = 0; i < route.length - 1; i++) m = Math.min(m, distToSegment(p, route[i], route[i + 1]));
  return m;
}

// Works only from saved data (downloaded states + places saved earlier), so it needs no internet.
export async function searchAlongRoute({ pos, route, keys }) {
  const cats = CATEGORIES.filter((c) => !keys.length || keys.includes(c.key));
  const wanted = new Set(cats.map((c) => c.name));
  const isRoute = route.length > 1;
  const r = isRoute ? 600 : 5000;

  const saved = await listSafeZones();
  let offline = [];
  try {
    offline = await zonesNear(densify(isRoute ? route : [pos], 2000), r, [...wanted]);
  } catch {
    /* no downloaded states */
  }

  const seen = new Set();
  const results = [...saved, ...offline]
    .filter((z) => wanted.has(z.category))
    .filter((z) => {
      const k = `${z.category}|${z.lat.toFixed(4)}|${z.lng.toFixed(4)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((z) => ({ ...z, dist: haversine(pos, z), away: isRoute ? distToRoute(z, route) : haversine(pos, z) }))
    .filter((z) => z.away <= r)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 40);

  return { results, live: false, error: null, isRoute };
}