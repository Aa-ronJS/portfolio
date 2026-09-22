// The photo path against a faked Supabase Storage, checking the shapes Supabase actually expects and the one
// thing that must never be possible: a painter reaching another painter's folder.
import { Readable } from 'node:stream';
Object.assign(process.env, {
  SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc_secret_key',
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', ALLOWED_ORIGINS: 'https://chasem.app',
});
const calls = [];
globalThis.__relayFetch = async (url, opt = {}) => {
  const u = String(url); calls.push({ u, m: opt.method || 'GET', h: opt.headers || {}, b: opt.body });
  if (/\/storage\/v1\/bucket\/job-photos$/.test(u)) return { ok: false, status: 404, text: async () => '' };
  if (/\/storage\/v1\/bucket$/.test(u)) return { ok: true, status: 200, json: async () => ({ name: 'job-photos' }) };
  if (/\/storage\/v1\/object\/sign\//.test(u)) return { ok: true, status: 200, json: async () => ({ signedURL: '/object/sign/job-photos/x?token=abc' }) };
  return { ok: true, status: 200, json: async () => ({ Key: 'ok' }), text: async () => 'ok' };
};
const setup = await import('../api/_setup.js');
const photo = (await import('../api/photo.js')).default;
const ph = await import('../api/_photos.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

const TOK = setup.signToken({ v: 1, cus: 'cus_dave', name: 'Dave', plan: 'paid', inc: 150, iat: 1 }, 'sign_me_0123456789');
const res = () => ({ statusCode: 0, body: '', setHeader() {}, end(b) { this.body = b || ''; } });
async function call(body) {
  const r = Readable.from([Buffer.from(JSON.stringify(body))]);
  r.method = 'POST'; r.url = '/api/photo'; r.headers = { origin: 'https://chasem.app', 'content-type': 'application/json' };
  const rs = res(); await photo(r, rs); return { status: rs.statusCode, json: JSON.parse(rs.body || '{}') };
}

const jpg = 'data:image/jpeg;base64,' + Buffer.from('a'.repeat(50000)).toString('base64');
calls.length = 0;
let r = await call({ token: TOK, action: 'put', job: 'j1', id: 'p1', data: jpg });
ok(r.status === 200 && r.json.ok && r.json.path === 'cus_dave/j1/p1.jpg', 'a photo is stored under the painter, the job and the photo: ' + r.json.path);
const made = calls.find(c => /\/storage\/v1\/bucket$/.test(c.u) && c.m === 'POST');
ok(made && JSON.parse(made.b).public === false, 'the bucket is made private the first time');
const up = calls.find(c => /\/object\/job-photos\/cus_dave\/j1\/p1\.jpg$/.test(c.u));
ok(up && up.m === 'POST' && up.h['x-upsert'] === 'true' && Buffer.isBuffer(up.b), 'the picture goes up as bytes, not as base64 text');
ok(up && /^Bearer svc_/.test(up.h.Authorization), 'authenticated with the service key, which only the server has');
ok(r.json.bytes === 50000, 'and arrives the size it started: ' + r.json.bytes + ' bytes');

r = await call({ token: TOK, action: 'url', job: 'j1', id: 'p1' });
ok(r.status === 200 && /^https:\/\/proj\.supabase\.co\/storage\/v1\/object\/sign\//.test(r.json.url), 'reading it back gives a signed URL, not the bucket: ' + String(r.json.url).slice(0, 60));

// the thing that must never work
r = await call({ token: TOK, action: 'url', job: '../../cus_sam/j9', id: 'p1' });
ok(r.json.ok !== true || !/cus_sam/.test(JSON.stringify(r.json)), 'a path that tries to climb out of his own folder gets nowhere');
ok(ph.photoPath('cus_dave', '../cus_sam/j1', 'p1') === 'cus_dave/cus_samj1/p1.jpg', 'because the segments are stripped, not trusted: ' + ph.photoPath('cus_dave', '../cus_sam/j1', 'p1'));
const other = setup.signToken({ v: 1, cus: 'cus_sam', name: 'Sam', plan: 'paid', inc: 150, iat: 1 }, 'sign_me_0123456789');
r = await call({ token: other, action: 'url', job: 'j1', id: 'p1' });
ok(!/cus_dave/.test(JSON.stringify(calls[calls.length - 1] || {})), "another painter's token reaches his own folder, never Dave's");

r = await call({ token: 'qc1.forged.sig', action: 'url', job: 'j1', id: 'p1' });
ok(r.status === 401, 'a forged token is refused');
r = await call({ token: TOK, action: 'put', job: 'j1', id: 'p2', data: 'data:image/jpeg;base64,' + Buffer.alloc(7_000_000).toString('base64') });
ok(r.status === 413, 'a photo far too big is refused rather than stored');

console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
