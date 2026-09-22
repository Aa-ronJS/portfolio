// A connected Google Calendar, against real Postgres and a faked Google. The cases that matter are the ones
// where a painter loses a day he should have kept, or keeps one he is actually busy on.
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';

const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, {
  GOOGLE_CLIENT_ID: 'gid.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'gsecret',
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', SITE_URL: 'https://chasem.app', ALLOWED_ORIGINS: 'https://chasem.app',
});

let freebusy = [];
const calls = [];
globalThis.__relayFetch = async (url, opt = {}) => {
  const u = String(url); calls.push({ u, body: String(opt.body || '') });
  if (u.includes('oauth2.googleapis.com/token')) return { ok: true, status: 200, json: async () => ({ access_token: 'at', refresh_token: 'rt', expires_in: 3599 }) };
  if (u.includes('userinfo')) return { ok: true, status: 200, json: async () => ({ email: 'dave@example.com' }) };
  if (u.includes('freeBusy')) return { ok: true, status: 200, json: async () => ({ calendars: { primary: { busy: freebusy } } }) };
  return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
};

const { migrate, q } = await import('../api/_db.js');
const { signToken } = await import('../api/_setup.js');
const gcal = (await import('../api/gcal.js')).default;
const sync = (await import('../api/sync.js')).default;

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
await migrate();

const TOKEN = signToken({ v: 1, cus: 'cus_dave', name: "Dave's Painting", plan: 'paid' }, process.env.RELAY_SIGNING_SECRET);
function res() {
  const r = { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; this.done = true; } };
  return r;
}
function post(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = 'POST'; req.url = '/api/gcal'; req.headers = { origin: 'https://chasem.app', 'content-type': 'application/json' };
  return req;
}
async function call(body) { const r = res(); await gcal(post(body), r); return { status: r.statusCode, ...(r.body ? JSON.parse(r.body) : {}) }; }
async function callback(qs) {
  const req = Readable.from([]); req.method = 'GET'; req.url = '/api/gcal?action=callback&' + qs; req.headers = {};
  const r = res(); await gcal(req, r); return { status: r.statusCode, to: r.headers.location || '' };
}

// ---- the consent link
const start = await call({ token: TOKEN, action: 'start' });
ok(start.ok && start.url.startsWith('https://accounts.google.com/'), 'start hands back a Google consent link');
ok(/scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.freebusy/.test(start.url), 'the only scope asked for is free/busy: not the events, not who is in them');
ok(/access_type=offline/.test(start.url) && /prompt=consent/.test(start.url), 'asks for a lasting permission, so it never has to ask him again');
const state = decodeURIComponent((start.url.match(/[?&]state=([^&]+)/) || [])[1] || '');

// ---- his own token cannot be used as someone else's state, and a stale one is refused
const bad = await callback('code=x&state=' + encodeURIComponent(signToken({ v: 1, kind: 'gcal', cus: 'cus_dave', exp: Date.now() - 1000 }, process.env.RELAY_SIGNING_SECRET).slice(0)));
ok(/calendar=expired/.test(bad.to), 'a state older than its fifteen minutes is refused: ' + bad.to);
const forged = await callback('code=x&state=qc1.' + Buffer.from(JSON.stringify({ v: 1, kind: 'gcal', cus: 'cus_someone', exp: Date.now() + 9e5 })).toString('base64url') + '.bogus');
ok(/calendar=expired/.test(forged.to), 'a state we did not sign is refused');

// ---- coming back from Google
// 'start' already made the row; this is the timezone he is actually in
await q("update painter set tz='Australia/Adelaide', state='SA' where id='cus_dave'");
// what Google actually hands back for an Australian calendar: instants, with his own offset in them
freebusy = [
  { start: '2026-10-05T22:30:00Z', end: '2026-10-05T23:30:00Z' },       // 9:00-10:00 Tue 6 Oct in Adelaide
  { start: '2026-10-12T00:00:00+10:30', end: '2026-10-14T00:00:00+10:30' }, // all day Mon 12 and Tue 13
];
const back = await callback('code=abc&state=' + encodeURIComponent(state));
ok(/calendar=on/.test(back.to), 'a good code connects him and sends him back to Set-up: ' + back.to);
const row = (await q("select account, refresh_token, error from calendar where painter_id='cus_dave'")).rows[0];
ok(row && row.refresh_token === 'rt' && row.account === 'dave@example.com', 'the lasting permission is kept, and the address to show him');
ok(!calls.some((c) => /events|calendarList/.test(c.u)), 'nothing but freeBusy is ever asked of Google (' + [...new Set(calls.map((c) => c.u.split('?')[0]))].join(', ') + ')');

const days = (await q("select day from busy where painter_id='cus_dave' and source='gcal' order by day")).rows
  .map((r) => (typeof r.day === 'string' ? r.day : r.day.toISOString().slice(0, 10)));
ok(days.includes('2026-10-06'), 'a 9am Adelaide appointment marks the Adelaide day, not the UTC one before it (' + days.join(', ') + ')');
ok(days.includes('2026-10-12') && days.includes('2026-10-13') && !days.includes('2026-10-14'), 'a span covers every day it touches and stops at midnight (' + days.join(', ') + ')');

// ---- his own days are a different source and survive a calendar refresh
await q("insert into busy (painter_id, day, source) values ('cus_dave','2026-10-06','app'), ('cus_dave','2026-11-02','app')");
freebusy = [{ start: '2026-10-20T00:00:00+10:30', end: '2026-10-21T00:00:00+10:30' }];
const again = await call({ token: TOKEN, action: 'sync' });
ok(again.ok && again.connected, 'a second read works from the stored permission alone, with no second consent');
const after = (await q("select day, source from busy where painter_id='cus_dave' order by day, source")).rows
  .map((r) => (typeof r.day === 'string' ? r.day : r.day.toISOString().slice(0, 10)) + ':' + r.source);
ok(after.includes('2026-11-02:app') && after.includes('2026-10-06:app'), 'his own busy days are untouched by a calendar refresh (' + after.join(' ') + ')');
ok(after.filter((x) => /gcal$/.test(x)).join() === '2026-10-20:gcal', 'the calendar days are replaced, not added to, so a cancelled meeting frees the day up');

// ---- disconnecting takes the days with it
const off = await call({ token: TOKEN, action: 'disconnect' });
const left = (await q("select count(*)::int n from busy where painter_id='cus_dave' and source='gcal'")).rows[0].n;
const cal = (await q("select count(*)::int n from calendar where painter_id='cus_dave'")).rows[0].n;
ok(off.ok && !off.connected && left === 0 && cal === 0, 'disconnecting deletes the permission and every day it was blocking (' + left + ' left)');
const mine = (await q("select count(*)::int n from busy where painter_id='cus_dave' and source='app'")).rows[0].n;
ok(mine === 2, 'and leaves his own days alone (' + mine + ')');

// ---- a painter with no calendar is simply told so, and sync still works
const st = await call({ token: TOKEN, action: 'status' });
ok(st.ok && st.connected === false, 'status on a painter who never connected one says so rather than failing');

const sres = res();
const sreq = Readable.from([Buffer.from(JSON.stringify({ token: TOKEN, since: "", push: [], busy: ["2026-12-01"] }))]);
sreq.method = 'POST'; sreq.url = '/api/sync'; sreq.headers = { origin: 'https://chasem.app', 'content-type': 'application/json' };
await sync(sreq, sres);
const sj = JSON.parse(sres.body);
ok(sj.ok && sj.calendar && sj.calendar.connected === false, 'a sync tells the phone where the calendar stands, connected or not');

// ---- a read that fails is remembered, so Set-up can say "connect it again" instead of going quiet
await q("insert into calendar (painter_id, account, refresh_token) values ('cus_dave','dave@example.com','rt')");
globalThis.__relayFetch = async (url) => String(url).includes('oauth2.googleapis.com/token')
  ? { ok: false, status: 400, json: async () => ({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }) }
  : { ok: true, status: 200, json: async () => ({}) };
const fail = await call({ token: TOKEN, action: 'sync' });
const err = (await q("select error from calendar where painter_id='cus_dave'")).rows[0].error;
ok(!fail.ok && /expired or revoked/.test(err), 'a permission he took back is recorded as an error to show him: ' + err);

console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
