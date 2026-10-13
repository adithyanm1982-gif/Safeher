export function haversine(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatDistance(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function latLngToTile(lat, lng, z) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

// Pre-fetches OSM tiles around a point. Requests pass through the service worker's CacheFirst rule.
export async function precacheTiles(center, { minZoom = 13, maxZoom = 16, radius = 2 } = {}, onProgress) {
  const jobs = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const { x, y } = latLngToTile(center.lat, center.lng, z);
    const r = z >= 16 ? 1 : radius;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const sub = 'abc'[(x + dx + y + dy + 3000) % 3];
        jobs.push(`https://${sub}.tile.openstreetmap.org/${z}/${x + dx}/${y + dy}.png`);
      }
    }
  }
  let done = 0;
  let failed = 0;
  for (let i = 0; i < jobs.length; i += 6) {
    const batch = jobs.slice(i, i + 6);
    await Promise.all(
      batch.map(async (url) => {
        try {
          await fetch(url, { mode: 'no-cors' });
        } catch {
          failed += 1;
        } finally {
          done += 1;
        }
      })
    );
    onProgress && onProgress(done, jobs.length);
  }
  return { total: jobs.length, failed };
}

const CATEGORY_MAP = {
  police: 'Police Station',
  hospital: 'Hospital',
  pharmacy: 'Pharmacy',
  social_facility: 'Shelter',
  fire_station: 'Fire Station'
};

// Fetches real nearby safe places from OpenStreetMap (Overpass) while online so they are available offline.
export async function fetchNearbySafeZones(center, radius = 4000) {
  const q = `[out:json][timeout:25];(
    node["amenity"~"police|hospital|pharmacy|fire_station"](around:${radius},${center.lat},${center.lng});
    node["amenity"="social_facility"]["social_facility"~"shelter|outreach"](around:${radius},${center.lat},${center.lng});
  );out body 80;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(q),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  if (!res.ok) throw new Error(`Overpass error ${res.status}`);
  const json = await res.json();
  return json.elements.map((e) => ({
    id: `osm-${e.id}`,
    name: e.tags?.name || CATEGORY_MAP[e.tags?.amenity] || 'Safe place',
    category: CATEGORY_MAP[e.tags?.amenity] || 'Shelter',
    lat: e.lat,
    lng: e.lon,
    source: 'osm',
    open247: e.tags?.opening_hours === '24/7'
  }));
}
