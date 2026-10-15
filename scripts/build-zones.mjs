// Builds public/data/zones/<state>.json from OpenStreetMap. Needs Node 18+.
// Usage:  node scripts/build-zones.mjs --states=TN        (test with one state first)
//         node scripts/build-zones.mjs                    (all states, takes hours)
// Options: --skip=worship,market   --only=police,hospital   --fresh (ignore saved progress)
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATES, ZONE_CATS } from '../src/services/indiaStates.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');  
const OUT = path.join(root, 'public', 'data', 'zones');
const CACHE = path.join(root, 'scripts', '.cache');
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1];
const fresh = process.argv.includes('--fresh');
const wantStates = arg('states') ? arg('states').split(',').map((s) => s.trim().toUpperCase()) : null;
const skip = new Set((arg('skip') || '').split(',').filter(Boolean));
const only = arg('only') ? new Set(arg('only').split(',')) : null;
const cats = ZONE_CATS.filter((c) => !skip.has(c.key) && (!only || only.has(c.key)));

const SEL = {
  police: ['nwr["amenity"="police"]'],
  hospital: ['nwr["amenity"="hospital"]', 'nwr["emergency"="ambulance_station"]'],
  pharmacy: ['nwr["amenity"="pharmacy"]'],
  fire: ['nwr["amenity"="fire_station"]'],
  shelter: ['nwr["amenity"="social_facility"]["social_facility"~"shelter|outreach"]', 'nwr["emergency"="assembly_point"]'],
  fuel: ['nwr["amenity"="fuel"]'],
  tourist: [
    'nwr["tourism"~"^(attraction|museum|viewpoint|zoo|theme_park|aquarium|gallery)$"]',
    'nwr["historic"~"^(monument|fort|castle|ruins|memorial|archaeological_site)$"]["name"]'
  ],
  bus: ['nwr["amenity"="bus_station"]'],
  rail: ['nwr["railway"="station"]["name"]', 'nwr["railway"="halt"]["name"]'],
  mall: ['nwr["shop"="mall"]'],
  worship: ['nwr["amenity"="place_of_worship"]["name"]'],
  govt: ['nwr["office"="government"]', 'nwr["amenity"~"^(townhall|courthouse)$"]'],
  airport: ['nwr["aeroway"="aerodrome"]["name"]'],
  market: ['nwr["amenity"="marketplace"]']
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query) {
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SafeHer-zone-builder/1.0' },
        body: 'data=' + encodeURIComponent(query)
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (text.trimStart().startsWith('<')) throw new Error('server busy');
      const json = JSON.parse(text);
      if (json.remark && /runtime error|timed out|out of memory/i.test(json.remark) && !(json.elements || []).length) {
        throw new Error(json.remark);
      }
      return json.elements || [];
    } catch (e) {
      lastErr = e;
      const wait = 15000 * (attempt + 1);
      console.log(`   retry in ${wait / 1000}s (${e.message})`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function resolveArea(s) {
  // Look up the boundary relation (fast, indexed), then turn its id into an area id.
  const tries = [
    `rel["ISO3166-2"="IN-${s.code}"]["boundary"="administrative"]`,
    `rel["name:en"="${s.name}"]["boundary"="administrative"]["admin_level"="4"]`,
    `rel["name"="${s.name}"]["boundary"="administrative"]["admin_level"="4"]`
  ];
  for (const t of tries) {
    const els = await overpass(`[out:json][timeout:60];${t};out ids;`);
    if (els.length) return `area(${3600000000 + els[0].id})`;
    await sleep(1500);
  }
  return null;
}

async function fetchCategory(areaSel, cat) {
  const body = SEL[cat.key].map((q) => `${q}(area.a);`).join('');
  const els = await overpass(`[out:json][timeout:900][maxsize:2147483648];${areaSel}->.a;(${body});out center;`);
  const seen = new Set();
  const rows = [];
  for (const e of els) {
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;
    const key = `${e.type[0]}${e.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name = (e.tags?.['name:en'] || e.tags?.name || '').slice(0, 80);
    rows.push([Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5, name, key]);
  }
  return rows;
}

async function buildState(s) {
  console.log(`\n== ${s.name} (${s.code})`);
  const areaSel = await resolveArea(s);
  if (!areaSel) {
    console.log('   !! could not find this state on OpenStreetMap, skipped');
    return false;
  }
  const places = [];
  for (let ci = 0; ci < cats.length; ci++) {
    const cat = cats[ci];
    const cacheFile = path.join(CACHE, `${s.slug}.${cat.key}.json`);
    let rows;
    if (!fresh && existsSync(cacheFile)) {
      rows = JSON.parse(await readFile(cacheFile, 'utf8'));
    } else {
      rows = await fetchCategory(areaSel, cat);
      await writeFile(cacheFile, JSON.stringify(rows));
      await sleep(2000);
    }
    console.log(`   ${cat.key.padEnd(9)} ${rows.length}`);
    for (const r of rows) places.push([ci, ...r]);
  }
  const data = { v: 1, slug: s.slug, name: s.name, built: new Date().toISOString(), cats: cats.map((c) => c.key), p: places };
  const text = JSON.stringify(data);
  await writeFile(path.join(OUT, `${s.slug}.json`), text);
  console.log(`   -> ${places.length} places, ${(text.length / 1048576).toFixed(1)} MB`);
  return true;
}

async function writeIndex() {
  const files = (await readdir(OUT)).filter((f) => f.endsWith('.json') && f !== 'index.json');
  const states = [];
  for (const f of files) {
    const text = await readFile(path.join(OUT, f), 'utf8');
    const j = JSON.parse(text);
    states.push({ slug: j.slug, count: j.p.length, bytes: Buffer.byteLength(text), built: j.built });
  }
  await writeFile(path.join(OUT, 'index.json'), JSON.stringify({ built: new Date().toISOString(), states }));
  console.log(`\nindex.json written (${states.length} states)`);
}

await mkdir(OUT, { recursive: true });
await mkdir(CACHE, { recursive: true });
const list = STATES.filter((s) => !wantStates || wantStates.includes(s.code));
if (!list.length) {
  console.log('No matching states. Use codes such as --states=TN,KL');
  process.exit(1);
}
const failed = [];
for (const s of list) {
  try {
    if (!(await buildState(s))) failed.push(s.code);
  } catch (e) {
    console.log(`   !! ${s.name} failed: ${e.message}. Run the same command again to resume.`);
    failed.push(s.code);
  }
}
await writeIndex();
if (failed.length) console.log('Failed or skipped:', failed.join(', '));