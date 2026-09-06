/* Issue documents live in Vercel Blob as private JSON. Photos are public blobs
   because the magazine has to reference them by URL. Without a Blob token
   (local dev) everything sits in memory and vanishes on restart. */
import { put, get } from '@vercel/blob';

const mem = globalThis.__sct_mem || (globalThis.__sct_mem = new Map());
const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const path = id => `issues/${id}.json`;

export async function load(id) {
  if (!/^[a-z0-9]{6,16}$/.test(id || '')) return null;
  if (!hasBlob()) return mem.get(id) || null;
  try {
    const r = await get(path(id), { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return await new Response(r.stream).json();
  } catch (e) {
    if (e && e.name === 'BlobNotFoundError') return null;
    throw e;
  }
}

export async function save(doc) {
  doc.updatedAt = new Date().toISOString();
  if (!hasBlob()) { mem.set(doc.id, doc); return doc; }
  await put(path(doc.id), JSON.stringify(doc), {
    access: 'private', allowOverwrite: true, contentType: 'application/json', addRandomSuffix: false,
  });
  return doc;
}

/* base64 JPEG from the browser, already resized client-side. Returns a public URL. */
export async function savePhoto(issueId, base64) {
  const buf = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  if (buf.length > 1_500_000) throw new Error('photo too large');
  if (!hasBlob()) return `data:image/jpeg;base64,${buf.toString('base64')}`;
  const r = await put(`photos/${issueId}/${Date.now()}.jpg`, buf, {
    access: 'public', contentType: 'image/jpeg', addRandomSuffix: true,
  });
  return r.url;
}
