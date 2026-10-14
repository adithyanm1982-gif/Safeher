// Vercel serverless function: POST /api/sos
// Sends an SMS to every emergency contact and, for SOS alerts, places an automated
// voice call to the default emergency contact. Uses Twilio's REST API directly (no packages).
//
// Required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
// Optional env vars: TWILIO_MESSAGING_SERVICE_SID, DEFAULT_COUNTRY_CODE (default +91), ALLOWED_ORIGINS

const MAX_RECIPIENTS = 7;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 8;
const hits = new Map();

const env = () => ({
  sid: process.env.TWILIO_ACCOUNT_SID,
  token: process.env.TWILIO_AUTH_TOKEN,
  from: process.env.TWILIO_FROM_NUMBER,
  service: process.env.TWILIO_MESSAGING_SERVICE_SID
});

const isConfigured = () => {
  const e = env();
  return Boolean(e.sid && e.token && e.from);
};

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
  }
  return list.length > RATE_MAX;
}

function originOk(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  if (host === req.headers.host) return true;
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return allowed.includes(origin);
}

function toE164(raw) {
  let s = String(raw || '').trim().replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (!s.startsWith('+')) {
    let cc = process.env.DEFAULT_COUNTRY_CODE || '+91';
    if (!cc.startsWith('+')) cc = `+${cc}`;
    s = cc + s.replace(/^0+/, '');
  }
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

// Names are shown inside SMS text, so strip anything that could carry links or odd characters.
const cleanName = (n) =>
  String(n || '')
    .replace(/[^\p{L}\p{N} .'-]/gu, '')
    .trim()
    .slice(0, 40);

function formatTime(ts, tz) {
  const d = new Date(Number.isFinite(ts) ? ts : Date.now());
  try {
    return d.toLocaleString('en-IN', {
      timeZone: tz || 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return d.toISOString();
  }
}

function validPos(p) {
  return (
    p &&
    typeof p.lat === 'number' && typeof p.lng === 'number' &&
    p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180
  );
}

function smsBody({ kind, name, pos, ts, tz, delayed }) {
  const who = name || 'A SafeHer user who listed you as an emergency contact';
  if (kind === 'safe') {
    return `SafeHer: ${who} says they are now SAFE. The earlier SOS alert is over. Please check in with them if you can.`;
  }
  let loc = 'Location unavailable';
  if (validPos(pos)) {
    const acc = Number.isFinite(pos.accuracy) && pos.accuracy > 0 ? ` (accuracy ~${Math.round(pos.accuracy)} m)` : '';
    const old = pos.cached ? ' (last known location)' : '';
    loc = `https://www.google.com/maps?q=${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}${old}${acc}`;
  }
  const late = delayed ? ' (sent late, phone was offline)' : '';
  return `SOS! ${who} needs help.\nLocation: ${loc}\nTime: ${formatTime(ts, tz)}${late}\nPlease call them now or contact emergency services. - SafeHer`;
}

const esc = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

async function twilio(path, params) {
  const e = env();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${e.sid}/${path}.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${e.sid}:${e.token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(params),
      signal: ctrl.signal
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: data.message || `HTTP ${r.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Timed out' : 'Network error' };
  } finally {
    clearTimeout(timer);
  }
}

function sendSms(to, body) {
  const e = env();
  const params = { To: to, Body: body };
  if (e.service) params.MessagingServiceSid = e.service;
  else params.From = e.from;
  return twilio('Messages', params);
}

function placeCall(to, name) {
  const who = name || 'a person who listed you as an emergency contact';
  const text = `This is an automated emergency call from Safe Her. ${who} has sent an S O S and needs help. Please check your text messages for their location, and call them now.`;
  const say = `<Say voice="alice" language="en-IN">${esc(text)}</Say>`;
  const twiml = `<Response><Pause length="1"/>${say}<Pause length="1"/>${say}<Pause length="1"/>${say}</Response>`;
  return twilio('Calls', { To: to, From: env().from, Twiml: twiml, Timeout: '40' });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({ configured: isConfigured() });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!originOk(req)) return res.status(403).json({ error: 'forbidden' });
  if (!isConfigured()) return res.status(501).json({ error: 'not_configured' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ error: 'rate_limited' });

  let body = req.body;
  try {
    if (typeof body === 'string') body = JSON.parse(body);
  } catch {
    return res.status(400).json({ error: 'bad_json' });
  }
  body = body || {};

  const kind = body.kind === 'safe' ? 'safe' : 'sos';
  const recipients = Array.isArray(body.recipients) ? body.recipients.slice(0, MAX_RECIPIENTS) : [];
  if (!recipients.length) return res.status(400).json({ error: 'no_recipients' });

  const name = cleanName(body.name);
  const ts = Number(body.ts) || Date.now();
  const delayed = Boolean(body.queuedAt) && Date.now() - ts > 60000;
  const text = smsBody({ kind, name, pos: body.pos, ts, tz: String(body.tz || ''), delayed });

  const seen = new Set();
  const results = [];
  const jobs = [];

  for (const r of recipients) {
    const id = String(r?.id ?? '').slice(0, 40);
    const rname = cleanName(r?.name);
    const to = toE164(r?.phone);
    if (!to) {
      results.push({ id, name: rname, ok: false, error: 'Invalid phone number' });
      continue;
    }
    if (seen.has(to)) continue;
    seen.add(to);
    jobs.push(sendSms(to, text).then((o) => results.push({ id, name: rname, ...o })));
  }

  let call = null;
  if (kind === 'sos' && body.callTo) {
    const to = toE164(body.callTo.phone);
    const cname = cleanName(body.callTo.name);
    if (!to) {
      call = { ok: false, name: cname, error: 'Invalid phone number' };
    } else {
      jobs.push(placeCall(to, name).then((o) => { call = { name: cname, ...o }; }));
    }
  }

  await Promise.all(jobs);
  return res.status(200).json({ results, call });
}