// The funnel the ad spend is decided on: a tradie proves his code (joined, and which ad he came from), answers the
// set-up (set up, with his trade), sends his first message to a real customer (chasing), and pays (paid). Each is
// written once, and Meta hears each once, hashed, only when its keys are set. None of it can break the step itself.
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';
import { createHmac } from 'node:crypto';

const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, {
  TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 'twtok', TWILIO_MESSAGING_SERVICE_SID: 'MGtest',
  RESEND_API_KEY: 're_test', RESEND_FROM: 'Chasem <help@chasem.app>', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test',
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', SITE_URL: 'https://chasem.app', RELAY_URL: 'https://chasem.app/api/msg', APP_URL: 'https://go.chasem.app/',
  META_PIXEL_ID: '123456', META_CAPI_TOKEN: 'capi_tok', MIGRATE_SECRET: 'admin_secret',
});
const meta = [], mail = []; let sid = 0, customers = {}, metaDown = false;
globalThis.__relayFetch = async (url, opt = {}) => {
  url = String(url); const body = String(opt.body || ''); let j = {}, okk = true;
  if (/graph\.facebook\.com/.test(url)) { if (metaDown) throw new Error('down'); meta.push({ url, body: JSON.parse(body) }); j = { events_received: 1 }; }
  else if (/api\.stripe\.com\/v1\/customers\?limit=1&email=/.test(url)) { const em = decodeURIComponent(url.split('email=')[1]); const c = Object.values(customers).find(x => x.email === em); j = { data: c ? [c] : [] }; }
  else if (/api\.stripe\.com\/v1\/customers$/.test(url) && opt.method !== 'GET') { const p = new URLSearchParams(body); const id = 'cus_' + (++sid); customers[id] = { id, email: p.get('email'), metadata: { qc_joined: p.get('metadata[qc_joined]') } }; j = customers[id]; }
  else if (/api\.stripe\.com\/v1\/customers\//.test(url)) { const id = url.split('/customers/')[1].split('?')[0]; j = customers[decodeURIComponent(id)] || { id, metadata: {} }; }
  else if (/api\.stripe\.com\/v1\/subscriptions\//.test(url)) j = { id: 'sub_1', customer: 'cus_1', current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, items: { data: [{ price: { unit_amount: 9900 } }] } };
  else if (/api\.stripe\.com\/v1\/invoices/.test(url)) j = { data: [{ amount_paid: 9900 }, { amount_paid: 9900 }] };
  else if (/api\.stripe\.com/.test(url)) j = { id: 'x', metadata: {} };
  else if (/api\.twilio\.com/.test(url)) j = { sid: 'SM' + (++sid), status: 'scheduled' };
  else if (/api\.resend\.com/.test(url)) { mail.push(body); j = { id: 'em' + (++sid) }; }
  return { ok: okk, status: 200, json: async () => j, text: async () => JSON.stringify(j) };
};

const { migrate, q } = await import('../api/_db.js');
const { mintToken } = await import('../api/_setup.js');
const signin = (await import('../api/signin.js')).default;
const sync = (await import('../api/sync.js')).default;
const msg = (await import('../api/msg.js')).default;
const webhook = (await import('../api/stripe-webhook.js')).default;
const admin = (await import('../api/admin.js')).default;
await migrate();

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
let ip = 0;
async function call(handler, body, url, headers = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body), r = Readable.from([Buffer.from(raw)]); r.method = 'POST'; r.url = url;
  const a = '10.2.0.' + (++ip % 250); r.headers = Object.assign({ origin: 'https://go.chasem.app', 'content-type': 'application/json', 'x-forwarded-for': a, 'user-agent': 'Mozilla/5.0 (iPhone)' }, headers); r.socket = { remoteAddress: a };
  const o = { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; } };
  await handler(r, o); return { status: o.statusCode, json: o.body ? JSON.parse(o.body) : null };
}
const painter = async (id) => (await q('select * from painter where id=$1', [id])).rows[0];
const events = (name) => meta.filter(m => m.body.data[0].event_name === name);
async function signUp(email, src) {
  await call(signin, { action: 'start', email }, '/api/signin');
  const code = (mail.map(b => (JSON.parse(b).text || '').match(/\b(\d{6})\b/)).filter(Boolean).pop() || [])[1];
  return call(signin, { action: 'check', email, code, src }, '/api/signin');
}

// ---- joined, from an ad
const src = { utm_source: 'meta', utm_medium: 'paid', utm_campaign: 'first100', utm_content: 'followup-sparkies', fbclid: 'IwAR123', at: new Date(Date.now() - 600000).toISOString() };
let r = await signUp('dave@example.com', src);
ok(r.status === 200 && r.json.token, 'the code signs him in as before');
const cus = r.json.cus; let row = await painter(cus);
ok(row && row.joined_at, 'his row says when he joined');
ok(row.utm_content === 'followup-sparkies' && row.utm_campaign === 'first100' && row.fbclid === 'IwAR123', 'and which ad brought him');
ok(customers[cus].metadata.qc_joined && customers[cus].metadata.qc_joined.length > 10, 'the Stripe record keeps the join as a full time, not a date');
let ev = events('CompleteRegistration');
ok(ev.length === 1, 'Meta hears "registered" once');
const ud = ev[0] && ev[0].body.data[0].user_data;
ok(ud && /^[a-f0-9]{64}$/.test(ud.em[0]) && !JSON.stringify(ev[0].body).includes('dave@example.com'), 'with his email hashed, never in plain');
ok(ud && /^fb\.1\.\d+\.IwAR123$/.test(ud.fbc) && ud.client_user_agent, 'with the click id Meta needs to match the ad');
ok(/graph\.facebook\.com\/v\d+\.\d+\/123456\/events/.test(ev[0].url), 'sent to the pixel\'s own events endpoint');

// the same person signing in again is not a new sign-up
r = await signUp('dave@example.com', { utm_content: 'something-else' });
row = await painter(cus);
ok(events('CompleteRegistration').length === 1 && row.utm_content === 'followup-sparkies', 'signing in again changes nothing and tells Meta nothing');

// ---- set up, with his trade, through sync
const token = r.json.token;
await call(sync, { token, push: [], me: { trading_name: "Dave's Electrical", reply_to: 'dave@example.com', phone: '0412 345 678', trade: 'electrician', setup: false } }, '/api/sync');
row = await painter(cus);
ok(row.trade === 'electrician' && !row.setup_at, 'his trade is kept; set-up is not done yet');
await call(sync, { token, push: [], me: { trade: 'electrician', setup: true } }, '/api/sync');
await call(sync, { token, push: [], me: { trade: 'electrician', setup: true } }, '/api/sync');
row = await painter(cus);
ok(row.setup_at && events('StartTrial').length === 1, 'set-up done is written once, and Meta hears it once');

// ---- chasing: a test-drive message and a text to himself do not count; a customer does
const soon = new Date(Date.now() + 3 * 86400000).toISOString();
await call(msg, { action: 'schedule', channel: 'sms', to: '0412 345 678', body: '[TEST] hi', send_at: soon, token, job: 'j1', ref: 'quote+3', key: 'a', diverted_from: '0411 000 000' }, '/api/msg');
await call(msg, { action: 'send', channel: 'sms', to: '0412 345 678', body: 'hi me', token, job: 'j1', ref: 'x' }, '/api/msg');
await call(msg, { action: 'send', channel: 'email', to: 'DAVE@example.com', subject: 's', body: 'me', token, job: 'j1', ref: 'x' }, '/api/msg');
row = await painter(cus);
ok(!row.first_chase_at && !events('Activated').length, 'test-drive messages and ones to his own phone or inbox are not a first chase');
await call(msg, { action: 'schedule', channel: 'sms', to: '0411 222 333', body: 'Just checking in', send_at: soon, token, job: 'j2', ref: 'quote+3', key: 'b' }, '/api/msg');
await call(msg, { action: 'schedule', channel: 'sms', to: '0411 222 444', body: 'Just checking in', send_at: soon, token, job: 'j3', ref: 'quote+3', key: 'c' }, '/api/msg');
row = await painter(cus);
ok(row.first_chase_at && events('Activated').length === 1, 'his first message to a customer is the first chase, written and told once');

// ---- paid
const sess = { id: 'cs_1', object: 'checkout.session', mode: 'subscription', payment_status: 'paid', subscription: 'sub_1', customer: 'cus_1', client_reference_id: cus, amount_total: 9900, customer_details: { email: 'dave@example.com', name: 'Dave' } };
const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: sess } }), t = Math.floor(Date.now() / 1000);
const sig = 't=' + t + ',v1=' + createHmac('sha256', 'whsec_test').update(t + '.' + payload).digest('hex');
r = await call(webhook, payload, '/api/stripe-webhook', { 'stripe-signature': sig });
row = await painter(cus);
ok(r.status === 200 && row.paid_at && row.paid_cus === 'cus_1', 'the first payment is written on the row he joined with, with the paying customer');
ev = events('Subscribe');
ok(ev.length === 1 && ev[0].body.data[0].custom_data.value === 90 && ev[0].body.data[0].custom_data.currency === 'AUD', 'Meta hears "subscribed", $90 ex GST, once');

// ---- a second tradie, no ad, never chases
await signUp('sam@example.com', {});
// ---- the report
r = await call(admin, { secret: 'admin_secret', action: 'funnel', by: 'ad', seconds: true }, '/api/admin');
const line = (r.json.funnel || []).find(x => x.ad === 'followup-sparkies'), none = (r.json.funnel || []).find(x => x.ad === '(none)');
ok(line && line.joined === 1 && line.set_up === 1 && line.chasing === 1 && line.chasing_7d === 1 && line.paid === 1, 'the report, by ad: ' + JSON.stringify(line));
ok(line && line.still_paying === 1, 'and with seconds, who is still paying after the guarantee');
ok(none && none.joined === 1 && none.chasing === 0, 'a tradie with no ad is counted under (none)');
r = await call(admin, { secret: 'admin_secret', action: 'funnel', by: 'trade' }, '/api/admin');
ok((r.json.funnel || []).some(x => x.trade === 'electrician' && x.joined === 1), 'and by trade');
r = await call(admin, { secret: 'wrong', action: 'funnel' }, '/api/admin');
ok(r.status === 401, 'nobody without the admin secret can read it');

// ---- Meta down, or not set up: sign-up still works
metaDown = true;
r = await signUp('kim@example.com', src);
ok(r.status === 200 && r.json.token, 'with Meta not answering, sign-up still works');
metaDown = false; delete process.env.META_CAPI_TOKEN; const n = meta.length;
r = await signUp('lee@example.com', src);
ok(r.status === 200 && meta.length === n, 'with no Meta keys, nothing is sent to Meta at all');

console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
