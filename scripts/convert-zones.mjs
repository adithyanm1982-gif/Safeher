// Usage: node scripts/convert-zones.mjs TN
// Reads scripts/raw/TN/<category>.json (Overpass JSON files) and writes public/data/zones/tamil-nadu.json + index.json
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
  console.log('Usage: node scripts/convert-zones.mjs TN');
  process.exit(1);
}

const dir = path.join(root, 'scripts', 'raw', code);
const cats = ZONE_CATS.filter((c) => existsSync(path.join(dir, `${c.key}.json`)));
if (!cats.length) {
  console.log(`No files found in ${dir}. Name them police.json, hospital.json, and so on.`);
  process.exit(1);
}

const places = [];
for (let ci = 0; ci < cats.length; ci++) {
  const json = JSON.parse(await readFile(path.join(dir, `${cats[ci].key}.json`), 'utf8'));
  const seen = new Set();
  let n = 0;
  for (const e of json.elements || []) {
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;
    const key = `${e.type[0]}${e.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name = (e.tags?.['name:en'] || e.tags?.name || '').slice(0, 80);
    places.push([ci, Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5, name, key]);
    n++;
  }
  console.log(`${cats[ci].key.padEnd(9)} ${n}`);
}

await mkdir(OUT, { recursive: true });
const text = JSON.stringify({ v: 1, slug: s.slug, name: s.name, built: new Date().toISOString(), cats: cats.map((c) => c.key), p: places });
await writeFile(path.join(OUT, `${s.slug}.json`), text);
console.log(`-> ${places.length} places, ${(text.length / 1048576).toFixed(1)} MB`);

const files = (await readdir(OUT)).filter((f) => f.endsWith('.json') && f !== 'index.json');
const states = [];
for (const f of files) {
  const t = await readFile(path.join(OUT, f), 'utf8');
  const j = JSON.parse(t);
  states.push({ slug: j.slug, count: j.p.length, bytes: Buffer.byteLength(t), built: j.built });
}
await writeFile(path.join(OUT, 'index.json'), JSON.stringify({ built: new Date().toISOString(), states }));
console.log('index.json written');