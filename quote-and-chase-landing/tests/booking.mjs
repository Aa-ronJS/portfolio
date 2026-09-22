// Sync and the booking page, against real Postgres. The cases that matter are the ones where two people act
// at once, and where a phone that has been offline comes back with stale work.
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';
import { createHmac } from 'node:crypto';

const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, {
  TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 'twtok', TWILIO_MESSAGING_SERVICE_SID: 'MGtest',
  RESEND_API_KEY: 're_test', RESEND_FROM: 'Quote and Chase <help@chasem.app>',
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', SITE_URL: 'https://chasem.app',
  ALLOWED_ORIGINS: 'https://chasem.app',
});
const out = [];
globalThis.__relayFetch = async (url, opt) => { out.push({ url: String(url), body: String(opt && opt.body || '') }); return { ok: true, status: 200, json: async () => ({ sid: 'SM' + out.length, id: 'em' + out.length }), text: async () => '{}' }; };

const { migrate, q } = await import('../api/_db.js');
const setup = await import('../api/_setup.js');
const sync = (await import('../api/sync.js')).default;
const y = (await import('../api/y.js')).default;
await migrate();
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

const TOKEN = setup.signToken({ v: 1, cus: 'cus_dave', name: "Dave's Painting", reply_to: 'dave@example.com', plan: 'paid', inc: 150, iat: 1 }, 'sign_me_0123456789');
const res = () => ({ statusCode: 0, body: '', headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; } });
function jreq(body) { const r = Readable.from([Buffer.from(JSON.stringify(body))]); r.method = 'POST'; r.url = '/api/sync'; r.headers = { origin: 'https://chasem.app', 'content-type': 'application/json' }; return r; }
const call = async (body) => { const rs = res(); await sync(jreq(body), rs); return { status: rs.statusCode, json: JSON.parse(rs.body || '{}') }; };

// ---- sync
let r = await call({ token: TOKEN, me: { phone: '0412 000 111', state: 'SA' },
  push: [{ kind: 'job', id: 'j1', rev: 1, body: { status: 'quoted', quote_no: 'Q-1001', sent_date: '2026-09-20', est_days: 2,
    client: { name: 'Jane Client', phone: '0411 222 333', email: 'jane@example.com' }, quote: { number: 'Q-1001', total: 2695 } } }],
  busy: ['2026-09-25', '2026-09-28'], rules: { hour: 7, offer: 4 } });
ok(r.status === 200 && r.json.ok && r.json.took === 1, 'the phone pushes a job and the server takes it');
const idx = (await q("select * from job_index where job_id='j1'")).rows[0];
ok(idx && idx.client_phone === '+61411222333' && idx.total_cents === 269500 && idx.est_days === 2 && idx.quote_no === 'Q-1001',
   'and pulls out what it needs to answer questions: ' + JSON.stringify({ ph: idx.client_phone, c: idx.total_cents, d: idx.est_days }));
ok((await q("select count(*)::int n from busy where source='app'")).rows[0].n === 2, 'his busy days are stored');

// a phone that was offline comes back with an older revision
r = await call({ token: TOKEN, push: [{ kind: 'job', id: 'j1', rev: 1, body: { status: 'draft', quote_no: 'WRONG' } }] });
ok(r.json.took === 0 && (await q("select quote_no from job_index where job_id='j1'")).rows[0].quote_no === 'Q-1001',
   'a stale revision from a pocket-phone is refused, not applied');

// pull only hands back what is new
const t1 = r.json.now;
await q("update doc set rev=2, body=jsonb_set(body,'{status}','\"accepted\"'), updated_at=now() where id='j1'");
r = await call({ token: TOKEN, since: t1 });
ok(r.json.changes.length === 1 && r.json.changes[0].id === 'j1', 'a pull hands back only what changed since last time');

// ---- the booking page
function wreq(method, t, form) {
  const rq = Readable.from(form ? [Buffer.from(new URLSearchParams(form).toString())] : []);
  rq.method = method; rq.url = '/y/' + t; rq.headers = { host: 'chasem.app' }; return rq;
}
const link = setup.signToken({ v: 1, p: 'cus_dave', j: 'j1', iat: 2 }, 'sign_me_0123456789').slice(4);
let rs = res(); await y(wreq('GET', link), rs);
ok(rs.statusCode === 200 && /pick a start day/i.test(rs.body), 'the customer sees a page asking her to pick a day');
ok(/Jane, pick/.test(rs.body), 'addressed to her by first name');
ok(!/2026-09-25|2026-09-28/.test(rs.body), 'and is not offered the days he is already busy');
const offered = [...rs.body.matchAll(/name="day" value="(\d{4}-\d{2}-\d{2})"/g)].map(m => m[1]);
ok(offered.length === 4, 'his own rule of four options is honoured: ' + offered.join(' '));

// two customers, one day: the second must lose cleanly
out.length = 0;
rs = res(); await y(wreq('POST', link, { day: offered[0] }), rs);
ok(rs.statusCode === 200 && /You're booked in/.test(rs.body), 'picking a day books it');
ok((await q("select count(*)::int n from booking where cancelled_at is null")).rows[0].n === 1, 'one booking exists');
ok((await q("select count(*)::int n from busy where source='booking'")).rows[0].n === 2, 'and it takes both days of a two-day job off his diary');
const told = out.find(o => /Messages\.json/.test(o.url));
ok(told && /Jane Client booked Q-1001 to start/.test(decodeURIComponent(told.body.replace(/\+/g, ' '))), 'the painter is told, with the day');
ok((await q("select status from job_index where job_id='j1'")).rows[0].status === 'accepted', 'and the job is accepted');

// a second customer of the same painter tries for the same day
await q(`insert into job_index (painter_id, job_id, client_name, client_phone, quote_no, total_cents, status, sent_at, est_days)
         values ('cus_dave','j2','Bob','+61411000999','Q-1002',100000,'quoted', now(), 1)`);
const link2 = setup.signToken({ v: 1, p: 'cus_dave', j: 'j2', iat: 3 }, 'sign_me_0123456789').slice(4);
rs = res(); await y(wreq('GET', link2), rs);
const offered2 = [...rs.body.matchAll(/name="day" value="(\d{4}-\d{2}-\d{2})"/g)].map(m => m[1]);
ok(!offered2.includes(offered[0]), "the day Jane took is no longer offered to Bob");

// and if he posts it anyway, from a page he loaded before she booked
rs = res(); await y(wreq('POST', link2, { day: offered[0] }), rs);
ok(rs.statusCode === 409 && /just gone/.test(rs.body), 'posting a day that has since gone is refused, and he is shown what is left');
ok((await q("select count(*)::int n from booking where cancelled_at is null")).rows[0].n === 1, 'and no second booking was written');

// re-opening a booked link shows the booking rather than offering again
rs = res(); await y(wreq('GET', link), rs);
ok(/You're booked in/.test(rs.body), 'reopening the link shows what was booked, it does not offer a second day');

// a forged token gets nothing
rs = res(); await y(wreq('GET', link.slice(0, -2) + 'xy'), rs);
ok(rs.statusCode === 404 && !/pick a start day/i.test(rs.body), 'a tampered link is refused');

await db.close();
console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
