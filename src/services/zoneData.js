import { openDB } from 'idb';
import { haversine } from './geo';
import { ZONE_CATS } from './indiaStates';

const CELL = 20; // 0.05 degrees, about 5.5 km
const NAME_BY_KEY = Object.fromEntries(ZONE_CATS.map((c) => [c.key, c.name]));
let dbp = null;

// Separate database so the emergency wipe can leave it alone.
function db() {
  if (!dbp) {
    dbp = openDB('safeher-zones', 1, {
      upgrade(d) {
        d.createObjectStore('states', { keyPath: 'slug' });
        const places = d.createObjectStore('places', { keyPath: 'id' });
        places.createIndex('cell', 'cell');
        places.createIndex('state', 'state');
        d.createObjectStore('meta');
      }
    });
  }
  return dbp;
}

export async function getMeta(k) {
  return (await db()).get('meta', k);
}
export async function setMeta(k, v) {
  return (await db()).put('meta', v, k);
}

export async function listDownloaded() {
  return (await db()).getAll('states');
}

export async function loadIndex() {
  const res = await fetch('/data/zones/index.json', { cache: 'no-cache' });
  if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) throw new Error('zNotPublished');
  return res.json();
}

export async function askPersist() {
  try {
    return (await navigator.storage?.persist?.()) || false;
  } catch {
    return false;
  }
}

export async function removeState(slug) {
  const d = await db();
  const keys = await d.getAllKeysFromIndex('places', 'state', slug);
  for (let i = 0; i < keys.length; i += 2000) {
    const tx = d.transaction('places', 'readwrite');
    keys.slice(i, i + 2000).forEach((k) => tx.store.delete(k));
    await tx.done;
  }
  await d.delete('states', slug);
}

export async function downloadState(state, onProgress) {
  if (!navigator.onLine) throw new Error('zOffline');
  let json;
  try {
    const res = await fetch(`/data/zones/${state.slug}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error('zNotPublished');
    json = await res.json();
  } catch (e) {
    throw new Error(e.message === 'zNotPublished' || e instanceof SyntaxError ? 'zNotPublished' : 'zFailed');
  }
  await removeState(state.slug);
  const d = await db();
  const { cats, p } = json;
  for (let i = 0; i < p.length; i += 2000) {
    const tx = d.transaction('places', 'readwrite');
    for (const r of p.slice(i, i + 2000)) {
      const [ci, lat, lng, name, osm] = r;
      const cat = cats[ci];
      tx.store.put({
        id: `${state.slug}:${cat}:${osm}`,
        state: state.slug,
        cat,
        lat,
        lng,
        name,
        cell: `${Math.floor(lat * CELL)}:${Math.floor(lng * CELL)}`
      });
    }
    await tx.done;
    onProgress && onProgress(Math.min(i + 2000, p.length), p.length);
  }
  await d.put('states', { slug: state.slug, name: state.name, count: p.length, built: json.built, downloadedAt: Date.now() });
}

function toZone(r) {
  const category = NAME_BY_KEY[r.cat] || 'Safe place';
  return { id: r.id, name: r.name || category, category, lat: r.lat, lng: r.lng, source: 'offline' };
}

function cellsFor(points, radius) {
  const set = new Set();
  for (const p of points) {
    const dLat = radius / 110540;
    const dLng = radius / (111320 * Math.max(0.2, Math.cos((p.lat * Math.PI) / 180)));
    for (let i = Math.floor((p.lat - dLat) * CELL); i <= Math.floor((p.lat + dLat) * CELL); i++) {
      for (let j = Math.floor((p.lng - dLng) * CELL); j <= Math.floor((p.lng + dLng) * CELL); j++) set.add(`${i}:${j}`);
    }
    if (set.size > 600) break;
  }
  return [...set];
}

// Points every `step` metres along a route so cell lookups do not skip the middle.
export function densify(route, step = 2000) {
  if (route.length < 2) return route;
  const out = [];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const n = Math.max(1, Math.ceil(haversine(a, b) / step));
    for (let k = 0; k < n; k++) out.push({ lat: a.lat + ((b.lat - a.lat) * k) / n, lng: a.lng + ((b.lng - a.lng) * k) / n });
  }
  out.push(route[route.length - 1]);
  return out;
}

// All downloaded places whose map cell touches the given points. Callers filter by exact distance.
export async function zonesNear(points, radius, categoryNames) {
  const d = await db();
  if (!(await d.count('states'))) return [];
  const want = categoryNames && categoryNames.length ? new Set(categoryNames) : null;
  const cells = cellsFor(points, radius);
  const tx = d.transaction('places');
  const idx = tx.store.index('cell');
  const batches = await Promise.all(cells.map((c) => idx.getAll(c)));
  const out = [];
  for (const rows of batches) {
    for (const r of rows) {
      const z = toZone(r);
      if (!want || want.has(z.category)) out.push(z);
    }
  }
  return out;
}

export async function nearbyZones(pos, radius = 6000, limit = 150) {
  const all = await zonesNear([pos], radius);
  return all
    .map((z) => ({ ...z, dist: haversine(pos, z) }))
    .filter((z) => z.dist <= radius)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);
}