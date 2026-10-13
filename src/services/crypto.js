import { openDB } from 'idb';

const KEY_DB = 'safeher-keys';
let keyPromise = null;

async function loadOrCreateKey() {
  const db = await openDB(KEY_DB, 1, {
    upgrade(d) {
      d.createObjectStore('k');
    }
  });
  try {
    let key = await db.get('k', 'main');
    if (!key) {
      key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      await db.put('k', key, 'main');
    }
    return key;
  } finally {
    db.close();
  }
}

export function getKey() {
  if (!keyPromise) keyPromise = loadOrCreateKey();
  return keyPromise;
}

export async function encryptBytes(buffer) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer);
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), 12);
  return out.buffer;
}

export async function decryptBytes(buffer) {
  const key = await getKey();
  const bytes = new Uint8Array(buffer);
  const iv = bytes.slice(0, 12);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, bytes.slice(12));
}

export async function encryptJSON(value) {
  return encryptBytes(new TextEncoder().encode(JSON.stringify(value)));
}

export async function decryptJSON(buffer) {
  const plain = await decryptBytes(buffer);
  return JSON.parse(new TextDecoder().decode(plain));
}

export async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function randomSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function resetKeyCache() {
  keyPromise = null;
}
