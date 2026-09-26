// The relay's backstop for the shared number: no more than SEND_PER_DAY automatic messages from one tradie on one
// day, whatever his app asks for. A message taken back frees its place, other days and other tradies are not
// touched, and a database that cannot answer lets the message through rather than stopping a real chaser.
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';

const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, {
  TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 'twtok', TWILIO_MESSAGING_SERVICE_SID: 'MGtest',
  RESEND_API_KEY: 're_test', RESEND_FROM: 'Chasem <help@chasem.app>', STRIPE_SECRET_KEY: 'sk_test_x',
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', SEND_PER_DAY: '3',
});
let sid = 0, twilio = 0;
globalThis.__relayFetch = async (url) => {
  url = String(url); let j = {};
  if (/api\.stripe\.com/.test(url)) j = { id: 'cus_x', email: 'x@example.com', metadata: {} };
  else if (/api\.twilio\.com/.test(url)) { twilio++; j = { sid: 'SM' + (++sid), status: 'scheduled' }; }
  return { ok: true, status: 200, json: async () => j, text: async () => JSON.stringify(j) };
};

const { migrate, q } = await import('../api/_db.js');
const { mintToken } = await import('../api/_setup.js');
const { default: handler } = await import('../api/msg.js');
await migrate();

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
let ip = 0;
async function run(body) {
  const r = Readable.from([Buffer.from(JSON.stringify(body))]); r.method = 'POST'; const addr = '10.0.0.' + (++ip % 250);
  r.headers = { origin: 'https://chasem.app', 'x-forwarded-for': addr }; r.socket = { remoteAddress: addr };
  const o = { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; } };
  await handler(r, o); return { status: o.statusCode, json: o.body ? JSON.parse(o.body) : null };
}
const dave = mintToken({ cus: 'cus_dave', name: "Dave's Electrical", plan: 'paid' });
const sam = mintToken({ cus: 'cus_sam', name: 'Sam Plumbing', plan: 'paid' });
// a weekday a week out, 9am Adelaide-ish, and the same day an hour later
const day = new Date(Date.now() + 7 * 86400000); day.setUTCHours(23, 30, 0, 0);
const at = (mins, d = day) => new Date(d.getTime() + mins * 60000).toISOString();
const book = (token, send_at, n) => run({ action: 'schedule', channel: 'sms', to: '0412 000 ' + String(100 + n), body: 'Just checking in on my quote.', send_at, token, job: 'j' + n, ref: 'quote+late', key: 'j' + n + ':quote+late:v1' });

let r, booked = [];
for (let i = 0; i < 3; i++) { r = await book(dave, at(i * 5), i); booked.push(r.json.id); }
ok(booked.every(Boolean) && twilio === 3, 'three on one day are booked');
const before = twilio; r = await book(dave, at(20), 3);
ok(r.status === 429 && r.json.day_full === true && twilio === before, 'the fourth on the same day is refused before Twilio is asked (' + r.status + ')');
ok(/next day/.test(r.json.error), 'and says, in words, that it moves to the next day');
r = await book(dave, at(20, new Date(day.getTime() + 86400000)), 4);
ok(r.status === 200 && r.json.id, 'the next day still has room');
r = await book(sam, at(0), 5);
ok(r.status === 200 && r.json.id, 'another tradie on the same day is not touched');
r = await run({ action: 'cancel', channel: 'sms', id: booked[0], token: dave });
ok(r.status === 200, 'one of the three is taken back');
r = await book(dave, at(25), 6);
ok(r.status === 200 && r.json.id, 'and its place is free again');
ok((await q("select count(*)::int n from outbound where painter_id='cus_dave' and send_for is not null")).rows[0].n === 5, 'each booking is written down with the day it goes');

// the database goes away: the message still goes
const real = globalThis.__relayDb; globalThis.__relayDb = { query: () => Promise.reject(new Error('down')), exec: () => Promise.reject(new Error('down')) };
r = await book(dave, at(30), 7);
ok(r.status === 200 && r.json.id, 'with no database to count against, the message goes anyway');
globalThis.__relayDb = real;

console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
