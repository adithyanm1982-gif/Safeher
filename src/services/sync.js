import { enqueue, listQueue, removeFromQueue, listMedia, readMedia, markMediaSynced } from './db';

function apiBase() {
  try {
    const s = JSON.parse(localStorage.getItem('safeher.settings') || '{}');
    return (s.apiBase || '').replace(/\/$/, '');
  } catch {
    return '';
  }
}

function wsUrl() {
  try {
    const s = JSON.parse(localStorage.getItem('safeher.settings') || '{}');
    return s.wsUrl || '';
  } catch {
    return '';
  }
}

async function post(path, body) {
  const base = apiBase();
  if (!base) throw new Error('No API endpoint configured');
  const res = await fetch(`${base}/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

export async function sendOrQueue(type, payload) {
  if (navigator.onLine && apiBase()) {
    try {
      await post(type, payload);
      return 'sent';
    } catch {
      /* fall through to queue */
    }
  }
  await enqueue(type, payload);
  return 'queued';
}

let flushing = false;

export async function flushQueue() {
  if (flushing || !navigator.onLine || !apiBase()) return { sent: 0, remaining: (await listQueue()).length };
  flushing = true;
  let sent = 0;
  try {
    const items = await listQueue();
    for (const item of items.sort((a, b) => a.ts - b.ts)) {
      try {
        await post(item.type, { ...item.payload, queuedAt: item.ts });
        await removeFromQueue(item.id);
        sent += 1;
      } catch {
        break;
      }
    }
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
      await sendOrQueue('broadcast', payload);
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
