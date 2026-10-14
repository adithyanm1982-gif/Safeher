import { enqueue, listQueue, removeFromQueue, listMedia, readMedia, markMediaSynced } from './db';

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem('safeher.settings') || '{}');
  } catch {
    return {};
  }
}

function apiBase() {
  return (readSettings().apiBase || '').replace(/\/$/, '');
}

function wsUrl() {
  return readSettings().wsUrl || '';
}

// SOS alerts always go to this site's own /api/sos function.
// Everything else goes to the optional custom backend from Settings.
const hasBackend = (type) => type === 'sos' || Boolean(apiBase());

// Errors that will never succeed on retry (bad request, rate limit, server not configured).
export const isPermanent = (err) =>
  Boolean(err && err.status && ((err.status >= 400 && err.status < 500) || err.status === 501));

export async function postApi(path, body) {
  const base = path === 'sos' ? '' : apiBase();
  if (path !== 'sos' && !base) throw new Error('No API endpoint configured');
  const res = await fetch(`${base}/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

export async function sendOrQueue(type, payload, { queue = true } = {}) {
  if (navigator.onLine && hasBackend(type)) {
    try {
      await postApi(type, payload);
      return 'sent';
    } catch {
      /* fall through to queue */
    }
  }
  if (!queue) return 'dropped';
  await enqueue(type, payload);
  return 'queued';
}

let flushing = false;

export async function flushQueue() {
  if (flushing || !navigator.onLine) return { sent: 0, remaining: (await listQueue()).length };
  flushing = true;
  let sent = 0;
  try {
    const items = (await listQueue()).sort((a, b) => a.ts - b.ts);
    for (const item of items) {
      if (!hasBackend(item.type)) continue;
      try {
        await postApi(item.type, { ...item.payload, queuedAt: item.ts });
        await removeFromQueue(item.id);
        sent += 1;
      } catch (err) {
        if (item.type === 'sos' && isPermanent(err)) {
          await removeFromQueue(item.id);
          continue;
        }
        break;
      }
    }

    if (apiBase()) {
      const media = (await listMedia()).filter((m) => !m.synced);
      for (const m of media) {
        try {
          const blob = await readMedia(m.id);
          if (!blob) continue;
          const res = await fetch(`${apiBase()}/api/evidence?ts=${m.ts}&mime=${encodeURIComponent(m.mime)}`, {
            method: 'POST',
            headers: { 'Content-Type': m.mime || 'application/octet-stream' },
            body: blob
          });
          if (!res.ok) throw new Error('upload failed');
          await markMediaSynced(m.id);
          sent += 1;
        } catch {
          break;
        }
      }
    }
  } finally {
    flushing = false;
  }
  return { sent, remaining: (await listQueue()).length };
}

export class LiveBroadcaster {
  constructor() {
    this.ws = null;
    this.timer = null;
  }

  start(getPayload, intervalMs = 10000) {
    this.stop();
    const url = wsUrl();
    if (url && navigator.onLine) {
      try {
        this.ws = new WebSocket(url);
      } catch {
        this.ws = null;
      }
    }
    const push = async () => {
      const payload = getPayload();
      if (!payload) return;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'sos-location', ...payload }));
          return;
        } catch {
          /* fall back to HTTP */
        }
      }
      // Old location pings are useless later, so they are never queued.
      await sendOrQueue('broadcast', payload, { queue: false });
    };
    push();
    this.timer = setInterval(push, intervalMs);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    try {
      this.ws && this.ws.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
  }
}