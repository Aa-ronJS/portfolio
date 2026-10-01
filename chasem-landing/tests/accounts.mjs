// Accounts with a password: sign up, log in, the wrong password, the lock, a forgotten password, an account from
// before passwords, and looking after the account once in (password, email, delete).
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';

const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, {
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', ALLOWED_ORIGINS: 'https://chasem.app',
  STRIPE_SECRET_KEY: 'rk_test_x', RESEND_API_KEY: 're_test', RESEND_FROM: 'Chasem <help@chasem.app>',
  APP_URL: 'https://go.chasem.app/', RELAY_URL: 'https://go.chasem.app/api/msg', FREE_MESSAGES: '12',
});

// A Stripe that keeps customers and subscriptions, enough for list, create, retrieve and update.
let customers = [], subs = [];
const mails = [];
const reply = (j, status = 200) => ({ ok: status < 400, status, json: async () => j });
globalThis.__relayFetch = async (url, opt = {}) => {
  const u = String(url), form = new URLSearchParams(String(opt.body || ''));
  if (u.includes('resend.com')) { mails.push(JSON.parse(opt.body)); return reply({ id: 'em' + mails.length }); }
  let m;
  if (/\/v1\/customers\?/.test(u)) { const want = decodeURIComponent((u.match(/email=([^&]+)/) || [])[1] || ''); return reply({ data: customers.filter((c) => c.email === want) }); }
  if (/\/v1\/customers$/.test(u)) {
    const c = { id: 'cus_' + (customers.length + 1), email: form.get('email'), name: form.get('name') || '', metadata: {} };
    for (const [k, v] of form) { const mm = k.match(/^metadata\[(.+)\]$/); if (mm) c.metadata[mm[1]] = v; }
    customers.push(c); return reply(c);
  }
  if ((m = u.match(/\/v1\/customers\/([^/?]+)$/))) {
    const c = customers.find((x) => x.id === decodeURIComponent(m[1])); if (!c) return reply({ error: { message: 'No such customer' } }, 404);
    if (opt.method === 'POST') for (const [k, v] of form) { const mm = k.match(/^metadata\[(.+)\]$/); if (mm) { if (v === '') delete c.metadata[mm[1]]; else c.metadata[mm[1]] = v; } else c[k] = v; }
    return reply(c);
  }
  if (/\/v1\/subscriptions\?/.test(u)) { const who = decodeURIComponent((u.match(/customer=([^&]+)/) || [])[1] || ''); return reply({ data: subs.filter((s) => s.customer === who) }); }
  return reply({});
};

const { migrate, q } = await import('../api/_db.js');
const { readToken } = await import('../api/_setup.js');
const signin = (await import('../api/signin.js')).default;
const account = (await import('../api/account.js')).default;

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
await migrate();

function res() { return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } }; }
async function call(fn, path, body, ip) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = 'POST'; req.url = path; req.headers = { origin: 'https://chasem.app', 'content-type': 'application/json' };
  if (ip) req.headers['x-forwarded-for'] = ip + ', 10.0.0.1';
  const r = res(); await fn(req, r); return { status: r.statusCode, ...(r.body ? JSON.parse(r.body) : {}) };
}
const post = (b, ip) => call(signin, '/api/signin', b, ip);
const acct = (b, ip) => call(account, '/api/account', b, ip);
const lastCode = () => (String((mails[mails.length - 1] || {}).text).match(/Your code is (\d{6})/) || [])[1];

// ---- signing up
let r = await post({ action: 'signup', email: 'kim@example.com', password: 'longenough1', name: '' });
ok(!r.ok && r.field === 'name', 'sign-up needs a name, and says which box: ' + r.error);
r = await post({ action: 'signup', email: 'kim@example.com', password: 'short', name: 'Kim Vo' });
ok(!r.ok && r.field === 'password' && /8 characters/.test(r.error), 'a short password is refused in plain words: ' + r.error);
r = await post({ action: 'signup', email: 'kim@example.com', password: 'password123', name: 'Kim Vo' });
ok(!r.ok && /too easy/.test(r.error), 'a password everyone tries is refused: ' + r.error);
r = await post({ action: 'signup', email: 'kimvo@example.com', password: 'kimvo-rules', name: 'Kim Vo' });
ok(!r.ok && /email address out/.test(r.error), 'a password made of the email is refused: ' + r.error);
mails.length = 0;
r = await post({ action: 'signup', email: 'Kim@Example.com', password: 'blue ladder 42', name: 'Kim Vo', business: 'Vo Painting' });
ok(r.ok && r.sent && !r.token, 'good details send a code to prove the inbox, and nothing that gets in comes back yet');
ok(mails.length === 1 && mails[0].to[0] === 'kim@example.com', 'the code goes to the address, lower-cased');
ok(customers.length === 0, 'and no account exists until the inbox is proved');
r = await post({ action: 'check', email: 'kim@example.com', code: lastCode(), password: 'blue ladder 42', name: 'Kim Vo', business: 'Vo Painting' });
ok(r.ok && r.token && r.has_password === true, 'the code finishes sign-up and hands over the account');
ok(customers[0] && customers[0].name === 'Kim Vo' && customers[0].metadata.qc_trading_name === 'Vo Painting', 'with the name and business on it');
const kimCus = r.cus;
const row = (await q("select pw_hash from account where email='kim@example.com'")).rows[0];
ok(row && /^s1\$/.test(row.pw_hash) && !row.pw_hash.includes('blue ladder'), 'the password is kept only as a scrypt hash');
r = await post({ action: 'signup', email: 'kim@example.com', password: 'another one 99', name: 'Someone' });
ok(r.status === 409 && r.exists, 'signing up again with the same email says to log in instead: ' + r.error);

// ---- logging in
r = await post({ action: 'login', email: 'KIM@example.com ', password: 'blue ladder 42' });
ok(r.ok && r.cus === kimCus && typeof r.token === 'string', 'the right email and password log in, any capitals');
ok(readToken(r.token, process.env.RELAY_SIGNING_SECRET).reply_to === 'kim@example.com', 'and the token is his');
ok(r.setup && r.sending && r.sending.hosted === true, 'with his details and sending switched on');
r = await post({ action: 'login', email: 'kim@example.com', password: 'wrong' });
ok(!r.ok && r.error === 'That email and password do not match.', 'a wrong password says only that they do not match');
const nobody = await post({ action: 'login', email: 'nobody@example.com', password: 'whatever1' });
ok(!nobody.ok && nobody.error === r.error, 'an email with no account gets exactly the same words');
r = await post({ action: 'login', email: 'kim@example.com', password: '' });
ok(!r.ok && r.field === 'password', 'an empty password is asked for');

// ---- too many wrong passwords
await q("update account set failed=0 where email='kim@example.com'");
let last;
for (let i = 1; i <= 10; i++) last = await post({ action: 'login', email: 'kim@example.com', password: 'nope' + i });
ok(last.status === 429 && last.locked && /15 minutes/.test(last.error), 'the tenth wrong password locks it for fifteen minutes: ' + last.error);
r = await post({ action: 'login', email: 'kim@example.com', password: 'blue ladder 42' });
ok(!r.ok && r.locked, 'and while locked even the right password waits');
const warned = (await (async () => { await q("update account set locked_until=null, failed=6 where email='kim@example.com'"); return post({ action: 'login', email: 'kim@example.com', password: 'x1' }); })());
ok(/3 more tries/.test(warned.error), 'the last three tries are counted down out loud: ' + warned.error);
await q("update account set locked_until=null, failed=0 where email='kim@example.com'");

// ---- a forgotten password: the emailed code sets a new one
mails.length = 0;
r = await post({ action: 'start', email: 'kim@example.com' });
r = await post({ action: 'check', email: 'kim@example.com', code: lastCode(), password: 'new paint tin 7' });
ok(r.ok && r.cus === kimCus, 'the emailed code plus a new password gets him back into the same account');
ok((await post({ action: 'login', email: 'kim@example.com', password: 'blue ladder 42' })).ok === false, 'the old password no longer works');
ok((await post({ action: 'login', email: 'kim@example.com', password: 'new paint tin 7' })).ok, 'and the new one does');
await q("update account set locked_until=now() + interval '10 minutes' where email='kim@example.com'");
mails.length = 0; await post({ action: 'start', email: 'kim@example.com' });
r = await post({ action: 'check', email: 'kim@example.com', code: lastCode(), password: 'unlocked again 8' });
ok(r.ok && !(await q("select locked_until from account where email='kim@example.com'")).rows[0].locked_until, 'a reset also lifts a lock');

// ---- the code alone still logs in, as the backup for a phone with no password manager
mails.length = 0; await post({ action: 'start', email: 'kim@example.com' });
r = await post({ action: 'check', email: 'kim@example.com', code: lastCode() });
ok(r.ok && r.has_password === true, 'an emailed code still gets him in, and his password is kept');

// ---- an account from before passwords
customers.push({ id: 'cus_old', email: 'dave@example.com', name: 'Dave', metadata: { qc: '1', qc_trading_name: "Dave's Painting" } });
r = await post({ action: 'login', email: 'dave@example.com', password: 'anything at all' });
ok(!r.ok && r.need === 'code', 'an account made before passwords is told it needs one, not that the password is wrong');
mails.length = 0; await post({ action: 'start', email: 'dave@example.com' });
r = await post({ action: 'check', email: 'dave@example.com', code: lastCode(), password: 'blue gutter 77' });
ok(r.ok && r.cus === 'cus_old', 'the code sets his first password on the account he already had (' + r.cus + ')');
ok((await post({ action: 'login', email: 'dave@example.com', password: 'blue gutter 77' })).cus === 'cus_old', 'and from then on he logs in like anyone else');

// ---- looking after the account
let tok = (await post({ action: 'login', email: 'kim@example.com', password: 'unlocked again 8' })).token;
ok((await acct({ action: 'me' })).status === 401, 'nothing about an account without its token');
r = await acct({ token: tok, action: 'me' });
ok(r.ok && r.email === 'kim@example.com' && r.has_password, 'the account says whose it is');
r = await acct({ token: tok, action: 'password', current: 'wrong one', next: 'fresh password 1' });
ok(!r.ok && r.field === 'current', 'changing the password needs the current one');
r = await acct({ token: tok, action: 'password', current: 'unlocked again 8', next: 'short' });
ok(!r.ok && r.field === 'next', 'and the new one must be a good one');
r = await acct({ token: tok, action: 'password', current: 'unlocked again 8', next: 'fresh password 1' });
ok(r.ok && (await post({ action: 'login', email: 'kim@example.com', password: 'fresh password 1' })).ok, 'a changed password is the one that logs in');

r = await acct({ token: tok, action: 'email_start', password: 'fresh password 1', new_email: 'dave@example.com' });
ok(!r.ok && r.status === 409, 'an email another account uses cannot be taken');
r = await acct({ token: tok, action: 'email_start', password: 'wrong', new_email: 'kim@vopainting.com.au' });
ok(!r.ok && r.field === 'password', 'moving the account needs the password');
mails.length = 0;
r = await acct({ token: tok, action: 'email_start', password: 'fresh password 1', new_email: 'Kim@VoPainting.com.au' });
ok(r.ok && mails[0] && mails[0].to[0] === 'kim@vopainting.com.au', 'a code goes to the new address');
r = await post({ action: 'check', email: 'kim@vopainting.com.au', code: lastCode() });
ok(!r.ok, 'and that code cannot be used to log in to anything');
mails.length = 0; await acct({ token: tok, action: 'email_start', password: 'fresh password 1', new_email: 'kim@vopainting.com.au' });
r = await acct({ token: tok, action: 'email_check', new_email: 'kim@vopainting.com.au', code: '000000' });
ok(!r.ok && /wrong/.test(r.error), 'a wrong code does not move it');
r = await acct({ token: tok, action: 'email_check', new_email: 'kim@vopainting.com.au', code: lastCode() });
ok(r.ok && r.email === 'kim@vopainting.com.au' && r.cus === kimCus, 'the right code moves the account to the new email');
ok(customers.find((c) => c.id === kimCus).email === 'kim@vopainting.com.au', 'Stripe has the new address too');
ok((await post({ action: 'login', email: 'kim@vopainting.com.au', password: 'fresh password 1' })).ok, 'he logs in with the new email');
ok(!(await post({ action: 'login', email: 'kim@example.com', password: 'fresh password 1' })).ok, 'and the old one no longer works');
tok = r.token;

// ---- deleting
subs.push({ customer: kimCus, status: 'active', cancel_at_period_end: false });
r = await acct({ token: tok, action: 'delete', password: 'fresh password 1' });
ok(!r.ok && r.subscribed, 'a paying account is asked to cancel the plan first, so nothing keeps charging: ' + r.error);
subs.length = 0;
r = await acct({ token: tok, action: 'delete', password: 'nope' });
ok(!r.ok && r.field === 'password', 'deleting needs the password');
await q("insert into painter (id) values ($1) on conflict do nothing", [kimCus]);
r = await acct({ token: tok, action: 'delete', password: 'fresh password 1' });
ok(r.ok && r.deleted, 'the right password deletes it');
ok(!(await q('select 1 from painter where id=$1', [kimCus])).rows.length && !(await q('select 1 from account where cus=$1', [kimCus])).rows.length, 'his jobs and his login are gone from the server');
ok(!(await post({ action: 'login', email: 'kim@vopainting.com.au', password: 'fresh password 1' })).ok, 'and the password no longer logs in');
mails.length = 0;
r = await post({ action: 'signup', email: 'kim@vopainting.com.au', password: 'starting over 5', name: 'Kim Vo' });
r = await post({ action: 'check', email: 'kim@vopainting.com.au', code: lastCode(), password: 'starting over 5', name: 'Kim Vo' });
ok(r.ok && !customers.find((c) => c.id === r.cus).metadata.qc_deleted, 'signing up again with that email starts a fresh account');

// ---- guessing from one place
await q('delete from signin_bucket');
let refused = 0;
for (let i = 1; i <= 61; i++) { const x = await post({ action: 'login', email: 'spray' + i + '@example.com', password: 'guess-' + i }, '203.0.113.9'); if (x.status === 429 && !refused) refused = i; }
ok(refused === 61, 'one place gets 60 password tries an hour across every email (' + refused + ')');

console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
