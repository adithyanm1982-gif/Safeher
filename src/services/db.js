import { openDB } from 'idb';
import { encryptJSON, decryptJSON, encryptBytes, decryptBytes, resetKeyCache } from './crypto';

const DB_NAME = 'safeher';
const STORES = ['kv', 'queue', 'media', 'reports', 'safezones'];
let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        STORES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: name === 'kv' ? 'key' : 'id' });
          }
        });
      }
    });
  }
  return dbPromise;
}

export async function setSecure(key, value) {
  const db = await getDB();
  const data = await encryptJSON(value);
  await db.put('kv', { key, data });
}

export async function getSecure(key, fallback = null) {
  try {
    const db = await getDB();
    const row = await db.get('kv', key);
    if (!row) return fallback;
    return await decryptJSON(row.data);
  } catch {
    return fallback;
  }
}

export async function delSecure(key) {
  const db = await getDB();
  await db.delete('kv', key);
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function enqueue(type, payload) {
  const db = await getDB();
  const item = { id: uid(), type, payload, ts: Date.now() };
  await db.put('queue', item);
  return item;
}

export async function listQueue() {
  const db = await getDB();
  return db.getAll('queue');
}

export async function removeFromQueue(id) {
  const db = await getDB();
  await db.delete('queue', id);
}

export async function addMedia(blob, meta = {}) {
  const db = await getDB();
  const buffer = await blob.arrayBuffer();
  const data = await encryptBytes(buffer);
  const record = { id: uid(), data, mime: blob.type, size: blob.size, ts: Date.now(), meta, synced: false };
  try {
    await db.put('media', record);
  } catch (err) {
    if (err && err.name === 'QuotaExceededError') {
      const all = await db.getAllKeys('media');
      const oldest = all.slice(0, Math.max(1, Math.ceil(all.length / 4)));
      await Promise.all(oldest.map((k) => db.delete('media', k)));
      await db.put('media', record);
    } else {
      throw err;
    }
  }
  return record.id;
}

export async function listMedia() {
  const db = await getDB();
  const all = await db.getAll('media');
  return all.map(({ data, ...rest }) => rest);
}

export async function readMedia(id) {
  const db = await getDB();
  const row = await db.get('media', id);
  if (!row) return null;
  const plain = await decryptBytes(row.data);
  return new Blob([plain], { type: row.mime });
}

export async function markMediaSynced(id) {
  const db = await getDB();
  const row = await db.get('media', id);
  if (row) await db.put('media', { ...row, synced: true });
}

export async function addReport(report) {
  const db = await getDB();
  const rec = { ...report, id: uid(), ts: Date.now() };
  await db.put('reports', rec);
  return rec;
}

export async function listReports() {
  const db = await getDB();
  return db.getAll('reports');
}

export async function putSafeZones(zones) {
  const db = await getDB();
  const tx = db.transaction('safezones', 'readwrite');
  await Promise.all(zones.map((z) => tx.store.put(z)));
  await tx.done;
}

export async function listSafeZones() {
  const db = await getDB();
  return db.getAll('safezones');
}

export async function deleteSafeZone(id) {
  const db = await getDB();
  await db.delete('safezones', id);
}

export async function wipeEverything() {
  try {
    const db = await getDB();
    db.close();
  } catch {
    /* database may not be open */
  }
  dbPromise = null;
  resetKeyCache();
  const names = [DB_NAME, 'safeher-keys'];
  try {
    if (indexedDB.databases) {
      const all = await indexedDB.databases();
      all.forEach((d) => d.name && !names.includes(d.name) && names.push(d.name));
    }
  } catch {
    /* ignore */
  }
  await Promise.all(
    names.map(
      (n) =>
        new Promise((resolve) => {
          const req = indexedDB.deleteDatabase(n);
          req.onsuccess = req.onerror = req.onblocked = () => resolve();
        })
    )
  );
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
}
