// Usage: node scripts/convert-zones.mjs KL
// Reads every .json file in scripts/raw/KL/ (Overpass JSON) and writes public/data/zones/kerala.json + index.json
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATES, ZONE_CATS } from '../src/services/indiaStates.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'data', 'zones');
const code = (process.argv[2] || '').toUpperCase();
const s = STATES.find((x) => x.code === code);
if (!s) {
  console.log('Usage: node scripts/convert-zones.mjs KL');
  process.exit(1);
}

const dir = path.join(root, 'scripts', 'raw', code);
if (!existsSync(dir)) {
  console.log(`Folder not found: ${dir}`);
  process.exit(1);
}
const inputs = (await readdir(dir)).filter((f) => f.endsWith('.json'));
if (!inputs.length) {
  console.log(`No .json files in ${dir}`);
  process.exit(1);
}

function classify(t = {}) {
  if (t.amenity === 'police') return 'police';
  if (t.amenity === 'hospital' || t.emergency === 'ambulance_station') return 'hospital';
  if (t.amenity === 'pharmacy') return 'pharmacy';
  if (t.amenity === 'fire_station') return 'fire';
  if (t.amenity === 'social_facility' || t.emergency === 'assembly_point') return 'shelter';
  if (t.amenity === 'fuel') return 'fuel';
  if (t.amenity === 'bus_station') return 'bus';
  if (t.railway) return 'rail';
  if (t.shop === 'mall') return 'mall';
  if (t.amenity === 'place_of_worship') return 'worship';
  if (t.office === 'government' || t.amenity === 'townhall' || t.amenity === 'courthouse') return 'govt';
  if (t.aeroway) return 'airport';
  if (t.amenity === 'marketplace') return 'market';
  if (t.tourism || t.historic) return 'tourist';
  return null;
}

const byCat = {};
const seen = new Set();
for (const f of inputs) {
  const json = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
  for (const e of json.elements || []) {
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;
    const cat = classify(e.tags);
    if (!cat) continue;
    const key = `${e.type[0]}${e.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name = (e.tags?.['name:en'] || e.tags?.name || '').slice(0, 80);
    (byCat[cat] ||= []).push([Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5, name, key]);
  }
}

const cats = ZONE_CATS.filter((c) => byCat[c.key]?.length);
const places = [];
cats.forEach((c, ci) => {
  console.log(`${c.key.padEnd(9)} ${byCat[c.key].length}`);
  for (const r of byCat[c.key]) places.push([ci, ...r]);
});

await mkdir(OUT, { recursive: true });
const text = JSON.stringify({ v: 1, slug: s.slug, name: s.name, built: new Date().toISOString(), cats: cats.map((c) => c.key), p: places });
await writeFile(path.join(OUT, `${s.slug}.json`), text);
console.log(`-> ${s.name}: ${places.length} places, ${(text.length / 1048576).toFixed(1)} MB`);

const files = (await readdir(OUT)).filter((f) => f.endsWith('.json') && f !== 'index.json');
const states = [];
for (const f of files) {
  const t = await readFile(path.join(OUT, f), 'utf8');
  const j = JSON.parse(t);
  states.push({ slug: j.slug, count: j.p.length, bytes: Buffer.byteLength(t), built: j.built });
}
await writeFile(path.join(OUT, 'index.json'), JSON.stringify({ built: new Date().toISOString(), states }));
console.log('index.json written');