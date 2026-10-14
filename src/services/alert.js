import { enqueue, listQueue, removeFromQueue } from './db';
import { postApi, isPermanent } from './sync';

const digits = (s) => String(s || '').replace(/\D/g, '');
const sameNumber = (a, b) => {
  const x = digits(a);
  const y = digits(b);
  return Boolean(x && y && x.slice(-10) === y.slice(-10));
};

// Guardians plus the default emergency contact, without duplicates.
export function collectRecipients(guardians, emergencyContact) {
  const list = (guardians || [])
    .filter((g) => g.phone)
    .map((g) => ({ id: g.id, name: g.name, phone: g.phone }));
  if (emergencyContact?.phone && !list.some((r) => sameNumber(r.phone, emergencyContact.phone))) {
    list.push({ id: 'default', name: emergencyContact.name || 'Default contact', phone: emergencyContact.phone });
  }
  return list;
}

function summarize(data) {
  const results = Array.isArray(data?.results) ? data.results : [];
  const okCount = results.filter((r) => r.ok).length;
  const call = data?.call || null;
  let status = 'failed';
  if (results.length && okCount === results.length) status = 'sent';
  else if (okCount > 0 || call?.ok) status = 'partial';
  return { status, results, call };
}

// kind: 'sos' | 'safe'. Never throws. Returns { status, results, call }.
export async function sendSOSAlert(payload) {
  const body = { ...payload, tz: Intl.DateTimeFormat().resolvedOptions().timeZone };

  if (!navigator.onLine) {
    await enqueue('sos', body).catch(() => {});
    return { status: 'queued', results: [], call: null };
  }
  try {
    const res = await postApi('sos', body);
    return summarize(await res.json());
  } catch (err) {
    if (isPermanent(err)) {
      return { status: err.status === 501 ? 'unconfigured' : 'failed', results: [], call: null };
    }
    await enqueue('sos', body).catch(() => {});
    return { status: 'queued', results: [], call: null };
  }
}

// Removes SOS alerts that were queued but never delivered (used when the user says "I'm safe").
export async function cancelQueuedSOS() {
  try {
    const items = (await listQueue()).filter((i) => i.type === 'sos');
    await Promise.all(items.map((i) => removeFromQueue(i.id)));
    return items.length;
  } catch {
    return 0;
  }
}

// Asks the server whether Twilio is set up. Returns true / false / null (unknown).
export async function checkAlertServer() {
  try {
    const res = await fetch('/api/sos', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.configured === 'boolean' ? data.configured : null;
  } catch {
    return null;
  }
}