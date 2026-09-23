// The front door. An email address alone must never be enough: that was the hole this closes.
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';

const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, {
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', ALLOWED_ORIGINS: 'https://chasem.app',
  STRIPE_SECRET_KEY: 'rk_test_x', RESEND_API_KEY: 're_test', RESEND_FROM: 'Chasem <help@chasem.app>',
  APP_URL: 'https://chasem.app/app/', RELAY_URL: 'https://chasem.app/api/msg', FREE_MESSAGES: '12',
});

let customers = [];
const mails = [];
globalThis.__relayFetch = async (url, opt = {}) => {
  const u = String(url);
  if (u.includes('resend.com')) { mails.push(JSON.parse(opt.body)); return { ok: true, status: 200, json: async () => ({ id: 'em1' }) }; }
  if (/api\.stripe\.com\/v1\/customers\?/.test(u)) {
    const want = decodeURIComponent((u.match(/email=([^&]+)/) || [])[1] || '');
    return { ok: true, status: 200, json: async () => ({ data: customers.filter((c) => c.email === want) }) };
  }
  if (/api\.stripe\.com\/v1\/customers$/.test(u)) {
    const p = new URLSearchParams(String(opt.body || ''));
    const c = { id: 'cus_' + (customers.length + 1), email: p.get('email'), metadata: {} };
    customers.push(c); return { ok: true, status: 200, json: async () => c };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};

const { migrate, q } = await import('../api/_db.js');
const { readToken } = await import('../api/_setup.js');
const signin = (await import('../api/signin.js')).default;

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
await migrate();

function res() { return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } }; }
async function post(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = 'POST'; req.url = '/api/signin'; req.headers = { origin: 'https://chasem.app', 'content-type': 'application/json' };
  const r = res(); await signin(req, r); return { status: r.statusCode, ...(r.body ? JSON.parse(r.body) : {}) };
}
const codeFrom = (m) => (String(m.text).match(/Your code is (\d{6})/) || [])[1];

// ---- asking for a code
const a = await post({ action: 'start', email: 'Dave@Example.com ' });
ok(a.ok && a.sent, 'a code is sent');
ok(!a.token && !a.link, 'and nothing that works comes back with it: an email address alone is not a way in');
ok(mails.length === 1 && /^\d{6} is your Chasem code$/.test(mails[0].subject), 'the code is in the subject, so he can read it from the notification: ' + mails[0].subject);
ok(mails[0].to[0] === 'dave@example.com', 'the address is trimmed and lower-cased, so one person is one account');
const code = codeFrom(mails[0]);
ok(/did not ask for it/.test(mails[0].text), 'and the email says what to do if he did not ask for it');

// ---- the wrong code
const w1 = await post({ action: 'check', email: 'dave@example.com', code: '000000' });
ok(!w1.ok && /4 more tries/.test(w1.error), 'a wrong code counts down out loud: ' + w1.error);
for (let i = 0; i < 3; i++) await post({ action: 'check', email: 'dave@example.com', code: '000001' });
const w5 = await post({ action: 'check', email: 'dave@example.com', code: '000002' });
ok(!w5.ok, 'the fifth wrong try is refused');
const after = await post({ action: 'check', email: 'dave@example.com', code });
ok(!after.ok, 'and the real code is dead too, so guessing cannot be resumed');

// ---- the right code
mails.length = 0;
await post({ action: 'start', email: 'dave@example.com' });
const good = codeFrom(mails[0]);
const inn = await post({ action: 'check', email: 'dave@example.com', code: good });
ok(inn.ok && typeof inn.token === 'string' && inn.token.slice(0, 4) === 'qc1.', 'the right code hands over the account');
const claim = readToken(inn.token, process.env.RELAY_SIGNING_SECRET);
ok(claim && claim.cus === inn.cus && claim.reply_to === 'dave@example.com', 'and the token is his: ' + JSON.stringify({ cus: claim.cus, to: claim.reply_to }));
ok(inn.sending && inn.sending.hosted === true && inn.sending.token === inn.token, 'with sending switched on, so there is nothing else to set up');
const used = await post({ action: 'check', email: 'dave@example.com', code: good });
ok(!used.ok, 'a code works once and then never again');

// ---- the same email on a second phone is the same account
mails.length = 0;
await post({ action: 'start', email: 'dave@example.com' });
const second = await post({ action: 'check', email: 'dave@example.com', code: codeFrom(mails[0]) });
ok(second.ok && second.cus === inn.cus, 'the same address on another phone reaches the same jobs (' + second.cus + ')');
ok(second.returning === false || second.returning === true, 'and the app is told whether he is new');

// ---- a different email is a different account
mails.length = 0;
await post({ action: 'start', email: 'other@example.com' });
const other = await post({ action: 'check', email: 'other@example.com', code: codeFrom(mails[0]) });
ok(other.ok && other.cus !== inn.cus, 'a different address is a different account, with none of his jobs');

// ---- an inbox cannot be flooded
mails.length = 0;
for (let i = 0; i < 5; i++) await post({ action: 'start', email: 'flood@example.com' });
const sixth = await post({ action: 'start', email: 'flood@example.com' });
ok(sixth.status === 429 && !sixth.ok, 'the sixth code in an hour is refused rather than sent (' + mails.length + ' emails)');

// ---- a code that has run out
mails.length = 0;
await post({ action: 'start', email: 'slow@example.com' });
const slowCode = codeFrom(mails[0]);
await q("update signin set expires_at = now() - interval '1 minute' where email='slow@example.com'");
const late = await post({ action: 'check', email: 'slow@example.com', code: slowCode });
ok(!late.ok && /run out/.test(late.error), 'a code older than ten minutes is refused: ' + late.error);

// ---- rubbish in
ok((await post({ action: 'start', email: 'not an email' })).status === 400, 'a thing that is not an email address is refused');
ok((await post({ action: 'check', email: 'dave@example.com', code: '12' })).status === 400, 'a code that is not six numbers is refused');
const none = await post({ action: 'check', email: 'nobody@example.com', code: '123456' });
ok(!none.ok && /new code/.test(none.error), 'a code for an address that never asked is refused');

// ---- the code is not sitting in the database in the clear
mails.length = 0;
await post({ action: 'start', email: 'peek@example.com' });
const peek = codeFrom(mails[0]);
const stored = (await q("select code_hash from signin where email='peek@example.com'")).rows[0].code_hash;
ok(stored !== peek && !stored.includes(peek), 'the code is stored as a hash, not as the number itself');

console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
