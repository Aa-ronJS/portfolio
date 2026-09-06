import { randomBytes } from 'node:crypto';

export function id(n = 10) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function site(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}`;
}

export function bad(res, status, message) {
  res.status(status).json({ error: message });
}

export function str(v, max) {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/* What a contributor or the public may see: no edit key, no magazine. */
export function publicView(doc) {
  return {
    id: doc.id,
    subject: doc.subject,
    occasion: doc.occasion,
    tipCount: doc.tips.length,
    photoCount: doc.photos.length,
    status: doc.status,
    recent: doc.tips.slice(-6).map(t => ({ text: t.text, by: t.by })),
  };
}
