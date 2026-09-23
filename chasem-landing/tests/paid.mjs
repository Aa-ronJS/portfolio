// Getting paid without typing a BSB, and without watching a bank feed.
//
// One tap makes the painter a Stripe account; every invoice can then carry a Pay by card button drawn on HIS
// account; and when a customer pays it, Stripe tells us and the phone ticks the invoice off by itself.
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';
import { createHmac } from 'node:crypto';

const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, {
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', ALLOWED_ORIGINS: 'https://chasem.app',
  STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_connect',
  SITE_URL: 'https://chasem.app', APP_URL: 'https://chasem.app/app/', RELAY_URL: 'https://chasem.app/api/msg',
});

// A Stripe that answers like the real one, and remembers which account each call was made on.
let connectOff = false;
const calls = [];
globalThis.__relayFetch = async (url, opt = {}) => {
  const u = String(url), p = new URLSearchParams(String(opt.body || ''));
  const onAccount = (opt.headers || {})["Stripe-Account"] || '';
  calls.push({ url: u, account: onAccount, form: Object.fromEntries(p) });
  const no = (msg) => ({ ok: false, status: 400, json: async () => ({ error: { message: msg } }) });
  if (/\/v1\/accounts$/.test(u)) {
    if (connectOff) return no('Only Stripe accounts that have signed up for Connect can create new accounts.');
    return { ok: true, status: 200, json: async () => ({ id: 'acct_dave' }) };
  }
  if (/\/v1\/accounts\/acct_dave\/login_links$/.test(u)) return { ok: true, status: 200, json: async () => ({ url: 'https://connect.stripe.com/express/login' }) };
  if (/\/v1\/accounts\/acct_dave$/.test(u)) return { ok: true, status: 200, json: async () => accountState };
  if (/\/v1\/account_links$/.test(u)) return { ok: true, status: 200, json: async () => ({ url: 'https://connect.stripe.com/setup/e/acct_dave/abc' }) };
  if (/\/v1\/prices$/.test(u)) return { ok: true, status: 200, json: async () => ({ id: 'price_1' }) };
  if (/\/v1\/payment_links\/plink_1$/.test(u)) return { ok: true, status: 200, json: async () => ({ id: 'plink_1', active: p.get('active') !== 'false' }) };
  if (/\/v1\/payment_links$/.test(u)) return { ok: true, status: 200, json: async () => ({ id: 'plink_1', url: 'https://buy.stripe.com/test_plink_1' }) };
  return { ok: true, status: 200, json: async () => ({}) };
};
let accountState = { id: 'acct_dave', charges_enabled: false, payouts_enabled: false, requirements: { currently_due: ['external_account'] } };

const { migrate, q } = await import('../api/_db.js');
const { signToken } = await import('../api/_setup.js');
const connect = (await import('../api/connect.js')).default;
const paid = (await import('../api/paid.js')).default;
const sync = (await import('../api/sync.js')).default;

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
await migrate();

const TOKEN = signToken({ v: 1, cus: 'cus_dave', name: "Dave's Painting", reply_to: 'dave@example.com', plan: 'paid' }, process.env.RELAY_SIGNING_SECRET);
const OTHER = signToken({ v: 1, cus: 'cus_sam', name: "Sam's Painting", reply_to: 'sam@example.com', plan: 'paid' }, process.env.RELAY_SIGNING_SECRET);
function res() { return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } }; }
async function call(fn, body, url) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = 'POST'; req.url = url; req.headers = { origin: 'https://chasem.app', 'content-type': 'application/json' };
  const r = res(); await fn(req, r); return { status: r.statusCode, ...(r.body ? JSON.parse(r.body) : {}) };
}
const conn = (body) => call(connect, body, '/api/connect');
const pull = (body) => call(sync, body, '/api/sync');

// A webhook Stripe would have signed, and one it would not.
async function hook(event, { secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET, t = Math.floor(Date.now() / 1000) } = {}) {
  const raw = Buffer.from(JSON.stringify(event));
  const sig = createHmac('sha256', secret).update(t + '.').update(raw).digest('hex');
  const req = Readable.from([raw]);
  req.method = 'POST'; req.url = '/api/paid'; req.headers = { 'stripe-signature': `t=${t},v1=${sig}` };
  const r = res(); await paid(req, r); return { status: r.statusCode, ...(r.body ? JSON.parse(r.body) : {}) };
}
const session = (over = {}) => ({
  id: 'cs_1', object: 'checkout.session', payment_status: 'paid', amount_total: 388520, currency: 'aud',
  metadata: { invoice: 'INV-1006', job: 'job_7', painter: 'cus_dave' }, ...over,
});

// ---- one tap: he gets an account and Stripe's own onboarding, and never sees a key
const start = await conn({ token: TOKEN, action: 'start' });
ok(start.ok && /^https:\/\/connect\.stripe\.com\/setup\//.test(start.url || ''), 'one tap hands back Stripe’s own onboarding page');
const made = calls.filter((c) => /\/v1\/accounts$/.test(c.url))[0];
ok(made && made.form.type === 'express' && made.form.country === 'AU' && made.form['capabilities[card_payments][requested]'] === 'true',
  'an Australian Express account, asking for card payments');
ok((await q("select stripe_account from painter where id='cus_dave'")).rows[0].stripe_account === 'acct_dave', 'the account is his, and remembered');
const again = await conn({ token: TOKEN, action: 'start' });
ok(again.ok && calls.filter((c) => /\/v1\/accounts$/.test(c.url)).length === 1, 'tapping twice does not make him a second account');

// ---- while Stripe is still checking, no invoice may carry a card button
const waiting = await conn({ token: TOKEN, action: 'status' });
ok(waiting.ok && waiting.started && waiting.ready === false && /still needs/.test(waiting.note), 'while Stripe is checking, it says so in words he can act on: ' + waiting.note);
const early = await conn({ token: TOKEN, action: 'link', amount: 3885.20, invoice: 'INV-1006', job: 'job_7' });
ok(!early.ok && /not finished checking/.test(early.error || ''), 'and a card link is refused until it is real money he can actually take');

// ---- cleared
accountState = { id: 'acct_dave', charges_enabled: true, payouts_enabled: true, requirements: { currently_due: [] } };
const ready = await conn({ token: TOKEN, action: 'status' });
ok(ready.ok && ready.ready === true && ready.note === '', 'once Stripe clears him it says so with nothing left to do');
ok((await q("select pay_ready from painter where id='cus_dave'")).rows[0].pay_ready === true, 'and the relay remembers, so an invoice can carry the button');

// ---- the link is drawn on HIS account, not ours
calls.length = 0;
const link = await conn({ token: TOKEN, action: 'link', amount: 3885.20, invoice: 'INV-1006', job: 'job_7', name: "Dave's Painting INV-1006" });
ok(link.ok && link.url === 'https://buy.stripe.com/test_plink_1' && link.id === 'plink_1', 'a pay-by-card link comes back for the invoice');
const priceCall = calls.filter((c) => /\/v1\/prices$/.test(c.url))[0], linkCall = calls.filter((c) => /\/v1\/payment_links$/.test(c.url))[0];
ok(priceCall.account === 'acct_dave' && linkCall.account === 'acct_dave', 'both are made on his account, so the money goes to him and never through us');
ok(priceCall.form.unit_amount === '388520' && priceCall.form.currency === 'aud', 'for the exact balance, in dollars: ' + priceCall.form.unit_amount);
ok(linkCall.form['metadata[invoice]'] === 'INV-1006' && linkCall.form['metadata[job]'] === 'job_7',
  'carrying the invoice and the job, which is how a payment finds its way home');

// ---- and what it refuses
const tiny = await conn({ token: TOKEN, action: 'link', amount: 0.20, invoice: 'INV-1', job: 'job_7' });
ok(!tiny.ok && /50 cents/.test(tiny.error || ''), 'twenty cents is refused, because Stripe would refuse it: ' + tiny.error);
const nothing = await conn({ token: OTHER, action: 'link', amount: 100, invoice: 'INV-1', job: 'job_7' });
ok(!nothing.ok && /not on yet/.test(nothing.error || ''), 'a painter who never started cannot make one');

// ---- a paid card
const bad = await hook({ id: 'evt_1', type: 'checkout.session.completed', account: 'acct_dave', data: { object: session() } }, { secret: 'whsec_wrong' });
ok(bad.status === 400 && /signature/i.test(bad.error || ''), 'an unsigned "you have been paid" is refused');
ok((await q('select count(*)::int n from payment')).rows[0].n === 0, 'and nothing is written down');

const got = await hook({ id: 'evt_1', type: 'checkout.session.completed', account: 'acct_dave', data: { object: session() } });
ok(got.ok && got.recorded === 'cs_1', 'a signed one is recorded');
const row = (await q('select painter_id, job_id, invoice_no, amount_cents from payment')).rows[0];
ok(row.painter_id === 'cus_dave' && row.job_id === 'job_7' && row.invoice_no === 'INV-1006' && row.amount_cents === 388520,
  'against the right painter, job and invoice, to the cent');

await hook({ id: 'evt_2', type: 'checkout.session.async_payment_succeeded', account: 'acct_dave', data: { object: session() } });
ok((await q('select count(*)::int n from payment')).rows[0].n === 1, 'Stripe retrying, or both events firing, cannot pay one invoice twice');

const unpaid = await hook({ id: 'evt_3', type: 'checkout.session.completed', account: 'acct_dave', data: { object: session({ id: 'cs_2', payment_status: 'unpaid' }) } });
ok(unpaid.ok && !unpaid.recorded, 'a session that was not actually paid is not money');
const strange = await hook({ id: 'evt_4', type: 'checkout.session.completed', account: 'acct_nobody', data: { object: session({ id: 'cs_3' }) } });
ok(strange.ok && !strange.recorded, 'an account we do not know is ignored rather than guessed at');
const ours = await hook({ id: 'evt_5', type: 'checkout.session.completed', data: { object: session({ id: 'cs_4' }) } });
ok(ours.ok && !ours.recorded, 'our own subscription checkout is the other endpoint’s business, not this one’s');

// ---- and the phone finds out
const mine = await pull({ token: TOKEN, since: '1970-01-01T00:00:00.000Z' });
ok(mine.ok && (mine.payments || []).length === 1 && mine.payments[0].invoice_no === 'INV-1006',
  'the next sync hands the payment to his phone, so the invoice ticks itself off');
const theirs = await pull({ token: OTHER, since: '1970-01-01T00:00:00.000Z' });
ok(theirs.ok && (theirs.payments || []).length === 0, 'and to nobody else’s');
const later = await pull({ token: TOKEN, since: new Date(Date.now() + 60000).toISOString() });
ok(later.ok && (later.payments || []).length === 0, 'a phone that has already seen it is not told twice');

// ---- a cancelled invoice must stop taking money
const shut = await conn({ token: TOKEN, action: 'void', link: 'plink_1' });
ok(shut.ok && shut.closed, 'a cancelled invoice closes its card link');
ok(calls.filter((c) => /payment_links\/plink_1$/.test(c.url))[0].form.active === 'false', 'by switching it off on his account');
const junk = await conn({ token: TOKEN, action: 'void', link: 'acct_dave' });
ok(!junk.ok, 'and only a payment link can be closed this way');

// ---- Connect not switched on for the platform is a set-up job, not a fault of his
connectOff = true;
await q("update painter set stripe_account='' where id='cus_sam'");
const off = await conn({ token: OTHER, action: 'start' });
ok(off.ok && off.off === true, 'before Connect is signed up for, the app is told plainly instead of shown an error');

console.log(fails ? '\nFAILURES: ' + fails : '\nALL PASSED');
process.exit(fails ? 1 : 0);
