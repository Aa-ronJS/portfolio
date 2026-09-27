// A customer who replies STOP to the shared number gets no more texts from anyone on it, and the tradie who
// was chasing them hears about it on his next sync. START undoes it. Email is not touched. Anything that goes
// wrong while checking lets the message through rather than stopping a real chaser.
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';
import { createHmac } from 'node:crypto';

const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, {
  TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 'twtok', TWILIO_MESSAGING_SERVICE_SID: 'MGtest',
  RESEND_API_KEY: 're_test', RESEND_FROM: 'Chasem <help@chasem.app>', STRIPE_SECRET_KEY: 'sk_test_x',
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', SITE_URL: 'https://chasem.app', TWILIO_INBOUND_URL: 'https://chasem.app/api/sms-in',
});
let twilio = 0, resend = 0, sid = 0;
globalThis.__relayFetch = async (url) => {
  url = String(url); let j = {};
  if (/api\.stripe\.com/.test(url)) j = { id: 'cus_x', email: 'x@example.com', metadata: {} };
  else if (/api\.twilio\.com/.test(url)) { twilio++; j = { sid: 'SM' + (++sid), status: 'scheduled' }; }
  else if (/api\.resend\.com/.test(url)) { resend++; j = { id: 'em' + (++sid) }; }
  return { ok: true, status: 200, json: async () => j, text: async () => JSON.stringify(j) };
};

const { migrate, q } = await import('../api/_db.js');
const store = await import('../api/_store.js');
const { mintToken } = await import('../api/_setup.js');
const msg = (await import('../api/msg.js')).default;
const smsIn = (await import('../api/sms-in.js')).default;
const sync = (await import('../api/sync.js')).default;
await migrate();

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const res = () => ({ statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; } });
let ip = 0;
async function relay(body) {
  const r = Readable.from([Buffer.from(JSON.stringify(body))]); r.method = 'POST'; const a = '10.1.0.' + (++ip % 250);
  r.headers = { origin: 'https://chasem.app', 'x-forwarded-for': a }; r.socket = { remoteAddress: a };
  const o = res(); await msg(r, o); return { status: o.statusCode, json: o.body ? JSON.parse(o.body) : null };
}
async function reply(from, text, id) {
  const params = { From: from, Body: text, MessageSid: id };
  const raw = new URLSearchParams(params).toString(), r = Readable.from([Buffer.from(raw)]);
  r.method = 'POST'; r.url = '/api/sms-in';
  const sig = createHmac('sha1', 'twtok').update('https://chasem.app/api/sms-in' + Object.keys(params).sort().map(k => k + params[k]).join('')).digest('base64');
  r.headers = { host: 'chasem.app', 'x-forwarded-proto': 'https', 'x-twilio-signature': sig };
  const o = res(); await smsIn(r, o); return o;
}
async function pull(token, since) {
  const r = Readable.from([Buffer.from(JSON.stringify({ token, since, push: [] }))]); r.method = 'POST'; r.url = '/api/sync';
  r.headers = { origin: 'https://chasem.app', 'content-type': 'application/json' };
  const o = res(); await sync(r, o); return JSON.parse(o.body || '{}');
}

const dave = mintToken({ cus: 'cus_dave', name: "Dave's Electrical", plan: 'paid' });
const sam = mintToken({ cus: 'cus_sam', name: 'Sam Plumbing', plan: 'paid' });
const soon = new Date(Date.now() + 3 * 86400000).toISOString();
const text = (token, to, n) => relay({ action: 'schedule', channel: 'sms', to, body: 'Just checking in on my quote.', send_at: soon, token, job: 'jD', ref: 'quote+3', key: 'jD:quote+3:v' + n });

let r = await text(dave, '0411 222 333', 1);
ok(r.status === 200 && r.json.id, 'before any STOP, Dave texts Jane');
const first = await pull(dave), firstSam = await pull(sam);

// Jane replies STOP
const before = twilio; const o = await reply('+61411222333', 'STOP', 'SMstop1');
ok(o.statusCode === 200, 'the STOP is taken');
ok((await q("select stopped from optout where addr='+61411222333'")).rows[0].stopped === true, 'her number is written down as stopped');
r = await text(dave, '0411 222 333', 2);
ok(r.status === 409 && r.json.opted_out === true && twilio === before, 'Dave cannot text her again, and Twilio is not even asked (' + r.status + ')');
ok(/STOP/.test(r.json.error), 'the refusal says why, in words: ' + (r.json && r.json.error));
r = await text(sam, '+61 411 222 333', 3);
ok(r.status === 409 && r.json.opted_out, 'nor can any other tradie on the shared number, however the number is written');
r = await relay({ action: 'send', channel: 'sms', to: '0411222333', body: 'hi', token: dave });
ok(r.status === 409 && r.json.opted_out, 'a text sent now is refused the same way as a scheduled one');
const beforeMail = resend; r = await relay({ action: 'schedule', channel: 'email', to: 'jane@example.com', subject: 'Your quote', body: 'Checking in', send_at: soon, token: dave, key: 'jD:quote+3:v9' });
ok(r.status === 200 && resend === beforeMail + 1, 'email to her still goes');

// the tradie who was texting her hears about it; one who never did, does not
let d = await pull(dave, first.now), s = await pull(sam, firstSam.now);
ok((d.optouts || []).some(x => x.addr === '+61411222333' && x.stopped === true), 'Dave\'s next sync says Jane replied STOP');
ok(!(s.optouts || []).length, 'Sam, who never texted her, is told nothing');
ok((d.replies || []).some(x => /stop/i.test(x.body)), 'and the STOP shows among Dave\'s replies, so he can see what she said');

// START undoes it
await reply('+61411222333', 'START', 'SMstart1');
ok((await q("select stopped from optout where addr='+61411222333'")).rows[0].stopped === false, 'START takes the stop off');
r = await text(dave, '0411 222 333', 4);
ok(r.status === 200 && r.json.id, 'and Dave can text her again');
const d2 = await pull(dave, d.now);
ok((d2.optouts || []).some(x => x.addr === '+61411222333' && x.stopped === false), 'his next sync says so');

// the database goes away: the message still goes
await reply('+61400000009', 'stop', 'SMstop2');
const real = globalThis.__relayDb; globalThis.__relayDb = { query: () => Promise.reject(new Error('down')), exec: () => Promise.reject(new Error('down')) };
r = await text(dave, '0400 000 010', 5);
ok(r.status === 200 && r.json.id, 'with no database to check against, a text still goes');
globalThis.__relayDb = real;

console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
