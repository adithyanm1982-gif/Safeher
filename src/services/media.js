import { getDB, listMedia, readMedia } from './db';

const GAP_MS = 25000; // chunks closer than this belong to the same recording
const CHUNK_MS = 8000; // recorder saves a chunk every 8 seconds

// SOS saves a recording in small chunks. This joins them back into whole recordings, newest first.
export async function listRecordings() {
  const all = (await listMedia()).sort((a, b) => a.ts - b.ts);
  const groups = [];
  for (const m of all) {
    const g = groups[groups.length - 1];
    const video = Boolean(m.meta?.video);
    if (g && m.ts - g.end <= GAP_MS && g.video === video && g.mime === m.mime) {
      g.chunks.push(m);
      g.end = m.ts;
      g.size += m.size || 0;
    } else {
      groups.push({ id: m.id, start: m.ts, end: m.ts, video, mime: m.mime, size: m.size || 0, chunks: [m] });
    }
  }
  return groups.reverse().map((g) => ({ ...g, seconds: Math.round((g.end - g.start) / 1000) + CHUNK_MS / 1000 }));
}

export async function buildRecordingBlob(group) {
  const parts = [];
  for (const c of group.chunks) {
    const b = await readMedia(c.id);
    if (b) parts.push(b);
  }
  return new Blob(parts, { type: group.mime || parts[0]?.type || 'video/webm' });
}

export async function deleteRecordings(ids) {
  const db = await getDB();
  const tx = db.transaction('media', 'readwrite');
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}