import { haversine } from './geo';
import { listSafeZones, putSafeZones } from './db';

export const CATEGORIES = [
  { key: 'police', label: 'Police', name: 'Police Station', q: '"amenity"="police"' },
  { key: 'hospital', label: 'Hospital', name: 'Hospital', q: '"amenity"="hospital"' },
  { key: 'pharmacy', label: 'Pharmacy', name: 'Pharmacy', q: '"amenity"="pharmacy"' },
  { key: 'fire', label: 'Fire station', name: 'Fire Station', q: '"amenity"="fire_station"' },
  { key: 'shelter', label: 'Shelter', name: 'Shelter', q: '"amenity"="social_facility"]["social_facility"~"shelter|outreach"' }
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

const NAME_BY_AMENITY = { police: 'Police Station', hospital: 'Hospital', pharmacy: 'Pharmacy', fire_station: 'Fire Station', social_facility: 'Shelter' };

export async function searchAlongRoute({ pos, route, keys, radius = 400, online }) {
  const cats = CATEGORIES.filter((c) => !keys.length || keys.includes(c.key));
  const isRoute = route.length > 1;
  const r = isRoute ? radius : 1500;
  let error = null;
  let live = false;

  if (online) {
    try {
      const around = isRoute
        ? `around:${r},${sample(route, 20).map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(',')}`
        : `around:${r},${pos.lat},${pos.lng}`;
      const body = `[out:json][timeout:25];(${cats.map((c) => `nwr[${c.q}](${around});`).join('')});out center 120;`;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(body),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      if (!res.ok) throw new Error(`Search server error ${res.status}`);
      const json = await res.json();
      const fresh = json.elements
        .map((e) => {
          const lat = e.lat ?? e.center?.lat;
          const lng = e.lon ?? e.center?.lon;
          const cat = NAME_BY_AMENITY[e.tags?.amenity] || 'Shelter';
          return lat == null ? null : {
            id: e.type === 'node' ? `osm-${e.id}` : `osm-${e.type[0]}${e.id}`,
            name: e.tags?.name || cat, category: cat, lat, lng, source: 'osm'
          };
        })
        .filter(Boolean);
      if (fresh.length) await putSafeZones(fresh);
      live = true;
    } catch (e) {
      error = e.message || 'Search failed';
    }
  }

  const wanted = new Set(cats.map((c) => c.name));
  const saved = await listSafeZones();
  const results = saved
    .filter((z) => wanted.has(z.category))
    .map((z) => ({ ...z, dist: haversine(pos, z), away: isRoute ? distToRoute(z, route) : haversine(pos, z) }))
    .filter((z) => z.away <= r)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 30);

  return { results, live, error, isRoute };
}