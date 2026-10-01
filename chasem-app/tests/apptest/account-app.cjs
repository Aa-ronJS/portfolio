// The front door as a paid app has it: Log in, Create an account, Forgot password, and Account in Set-up.
// A mock relay that behaves like api/signin.js and api/account.js, so every screen and every refusal is driven.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

const MOCK = () => {
  window.__calls = [];
  const users = JSON.parse(sessionStorage.getItem('users') || '{}');
  const keep = () => sessionStorage.setItem('users', JSON.stringify(users));
  const R = (j) => Promise.resolve({ json: () => Promise.resolve(j) });
  const handed = (email) => ({ ok: true, token: 'qc1.tok.' + email, cus: 'cus_' + email.split('@')[0], email, has_password: !!(users[email] && users[email].pw),
    sending: { server: '/api/msg', token: 'qc1.tok.' + email, hosted: true, server_has_creds: true }, setup: { v: 1, settings: { details: { email, trading_name: (users[email] || {}).biz || '' } }, jobs: [] } });
  window.__qcRelayFetch = (u, o) => {
    const b = JSON.parse(o.body); window.__calls.push({ url: String(u), body: b });
    if (window.__down) return R(null);
    if (/\/signin$/.test(String(u))) {
      if (b.action === 'login') {
        const x = users[b.email];
        if (x && !x.pw) return R({ ok: false, need: 'code', error: 'Your account needs a password.' });
        if (!x || x.pw !== b.password) return R({ ok: false, error: 'That email and password do not match.' });
        return R(handed(b.email));
      }
      if (b.action === 'signup') { if (users[b.email] && users[b.email].pw) return R({ ok: false, exists: true, field: 'email', error: 'There is already an account for that email. Log in instead.' }); if (b.password === 'password123') return R({ ok: false, field: 'password', error: 'That password is too easy to guess. Try a few words together.' }); return R({ ok: true, sent: true }); }
      if (b.action === 'start') return R({ ok: true, sent: true });
      if (b.action === 'check') {
        if (b.code !== '246810') return R({ ok: false, field: 'code', error: 'That code is wrong. 4 more tries.' });
        users[b.email] = Object.assign(users[b.email] || {}, b.password ? { pw: b.password } : {}, b.business ? { biz: b.business } : {}); keep();
        return R(handed(b.email));
      }
    }
    if (/\/account$/.test(String(u))) {
      const email = String(b.token || '').replace('qc1.tok.', ''), x = users[email];
      if (b.action === 'password') { if (x.pw && x.pw !== b.current) return R({ ok: false, field: 'current', error: 'That is not your current password.' }); x.pw = b.next; keep(); return R({ ok: true }); }
      if (b.action === 'delete') { if (x.pw !== b.password) return R({ ok: false, field: 'password', error: 'That is not your password.' }); delete users[email]; keep(); return R({ ok: true, deleted: true }); }
    }
    return R({ ok: true });
  };
};

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.addInitScript(MOCK);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  const text = () => p.$eval('#app', e => e.innerText);
  const S = () => p.evaluate(() => window.__qcApp.store.load());
  const lastCall = () => p.evaluate(() => window.__calls[window.__calls.length - 1]);

  // the door
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(500);
  let t = await text();
  ok(/Log in/.test(t) && !!(await p.$('#a_email')) && !!(await p.$('#a_pw')), 'a phone with no account opens on Log in: email and password');
  ok(!!(await p.$('#a_forgot')) && /Create an account/.test(t) && !!(await p.$('#a_codein')), 'with Forgot password, Create an account, and Email me a code');
  ok(!!(await p.$('.authbrand .cmark')) && /Chasem/.test(await p.$eval('.authbrand', e => e.textContent)), 'the running C and the name sit above the form');
  ok(await p.$eval('header.top', h => h.hidden), 'and nothing else is offered at the door');
  ok(await p.$eval('#a_pw', e => e.autocomplete) === 'current-password' && await p.$eval('#a_email', e => e.autocomplete) === 'username', 'password managers know which boxes are which');

  // show and hide
  await p.fill('#a_pw', 'secret words'); await p.click('[data-eye=a_pw]');
  ok(await p.$eval('#a_pw', e => e.type) === 'text' && await p.$eval('[data-eye=a_pw]', e => e.textContent) === 'Hide', 'Show reveals the password and says Hide');
  await p.click('[data-eye=a_pw]'); ok(await p.$eval('#a_pw', e => e.type) === 'password', 'and Hide hides it again');

  // refusals on the phone, before anything is sent
  await p.fill('#a_email', 'nope'); await p.click('#a_go'); await p.waitForTimeout(200);
  ok(/does not look like an email/.test(await p.$eval('#a_email_err', e => e.textContent)) && (await p.evaluate(() => window.__calls.length)) === 0, 'a bad email is caught next to its box and never sent');
  await p.fill('#a_email', 'kim@example.com'); await p.fill('#a_pw', ''); await p.click('#a_go'); await p.waitForTimeout(200);
  ok(/Type your password/.test(await p.$eval('#a_pw_err', e => e.textContent)), 'an empty password is asked for');
  await p.fill('#a_pw', 'wrong one'); await p.click('#a_go'); await p.waitForTimeout(500);
  ok(/do not match/.test(await p.$eval('#a_msg', e => e.textContent)), 'a wrong login says the email and password do not match');
  ok(!(await S()).account || !(await S()).account.verified, 'and lets nobody in');

  // sign up
  await p.click('#a_switch'); await p.waitForTimeout(300);
  ok(/Create your account/.test(await text()) && await p.$eval('#a_email', e => e.value) === 'kim@example.com', 'Create an account keeps the email already typed');
  await p.click('#a_go'); await p.waitForTimeout(200);
  ok(/Type your name/.test(await p.$eval('#a_name_err', e => e.textContent)), 'it needs a name');
  await p.fill('#a_name', 'Kim Vo'); await p.fill('#a_biz', 'Vo Painting'); await p.fill('#a_pw', 'short'); await p.click('#a_go'); await p.waitForTimeout(200);
  ok(/8 characters/.test(await p.$eval('#a_pw_err', e => e.textContent)), 'a short password is caught on the phone');
  await p.fill('#a_pw', 'password123'); await p.click('#a_go'); await p.waitForTimeout(500);
  ok(/too easy/.test(await p.$eval('#a_pw_err', e => e.textContent)), "the server's refusal lands next to the password box");
  await p.fill('#a_pw', 'blue ladder 42'); await p.click('#a_go'); await p.waitForTimeout(500);
  const su = (await p.evaluate(() => window.__calls.filter(c => c.body.action === 'signup')))[1];
  ok(su && su.body.name === 'Kim Vo' && su.body.business === 'Vo Painting' && su.body.email === 'kim@example.com', 'sign-up sends the name, business and email');
  t = await text();
  ok(/Check your email/.test(t) && /kim@example\.com/.test(t) && !!(await p.$('#a_code')), 'then asks for the code and says where it went');
  ok(!JSON.stringify(await S()).includes('blue ladder'), 'the password is never written to the phone');
  await p.fill('#a_code', '111111'); await p.waitForTimeout(600);
  ok(/code is wrong/.test(await p.$eval('#a_code_err', e => e.textContent)), 'a wrong code says so next to the box');
  await p.fill('#a_code', ''); await p.fill('#a_code', '246810'); await p.waitForTimeout(900);
  const chk = await p.evaluate(() => window.__calls.filter(c => c.body.action === 'check').pop());
  ok(chk && chk.body.password === 'blue ladder 42' && chk.body.name === 'Kim Vo', 'the right code finishes sign-up with the password and name');
  let st = await S();
  ok(st.account && st.account.verified && st.account.email === 'kim@example.com' && st.sending.token === 'qc1.tok.kim@example.com', 'and he is in, with sending on');
  ok(!/a_email/.test(await p.evaluate(() => document.querySelector('#app').innerHTML)), 'the door is gone once he is in');
  ok(await p.$eval('header.top .lockup .word', e => e.textContent) === 'Chasem' && !!(await p.$('header.top .cmark')), 'the header carries the running C lockup');

  // log out keeps the email, never the password
  await p.click('#w_out'); await p.waitForTimeout(500);
  ok(/Log in/.test(await text()) && await p.$eval('#a_email', e => e.value) === 'kim@example.com' && await p.$eval('#a_pw', e => e.value) === '', 'Log out returns to Log in with the email kept and the password empty');
  ok(!(await S()).sending.token, 'and the token is off the phone');
  await p.fill('#a_pw', 'blue ladder 42'); await p.click('#a_go'); await p.waitForTimeout(800);
  ok((await S()).account.verified, 'the email and password log him back in');

  // forgot password
  await p.click('#w_out'); await p.waitForTimeout(400); await p.click('#a_forgot'); await p.waitForTimeout(300);
  ok(/Reset your password/.test(await text()), 'Forgot password opens the reset');
  await p.click('#a_go'); await p.waitForTimeout(500);
  ok((await lastCall()).body.action === 'start' && !!(await p.$('#a_pw')), 'a code is sent, and the code screen asks for a new password too');
  await p.fill('#a_code', '246810'); await p.fill('#a_pw', 'new paint tin 7'); await p.click('#a_go'); await p.waitForTimeout(800);
  ok((await lastCall()).body.password === 'new paint tin 7' && (await S()).account.verified, 'the code and new password log him in');

  // an account from before passwords
  await p.evaluate(() => { const u = JSON.parse(sessionStorage.getItem('users')); u['dave@example.com'] = {}; sessionStorage.setItem('users', JSON.stringify(u)); });
  await p.click('#w_out'); await p.waitForTimeout(400); await p.reload(); await p.waitForTimeout(500);
  await p.fill('#a_email', 'dave@example.com'); await p.fill('#a_pw', 'anything'); await p.click('#a_go'); await p.waitForTimeout(800);
  t = await text();
  ok(/before Chasem had passwords/.test(t) && !!(await p.$('#a_code')) && !!(await p.$('#a_pw')), 'an older account is sent a code and asked to pick a password, not told it is wrong');

  // the words when things fail
  await p.click('#a_back'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__down = true; });
  await p.fill('#a_pw', 'anything'); await p.click('#a_go'); await p.waitForTimeout(500);
  ok(/not answering/.test(await p.$eval('#a_msg', e => e.textContent)) && !/No signal/.test(await p.$eval('#a_msg', e => e.textContent)), 'when the server does not answer it says so, not "No signal"');
  await p.evaluate(() => { window.__down = false; window.__qcRelayFetch = () => Promise.reject(new Error('offline')); });
  await ctx.setOffline(true); await p.click('#a_go'); await p.waitForTimeout(500);
  ok(/No signal/.test(await p.$eval('#a_msg', e => e.textContent)), 'and "No signal" only when the phone really has none');
  ok(!(await p.$eval('#a_go', e => e.disabled)), 'the button is left usable for another go');
  await ctx.setOffline(false);

  // Account in Set-up
  await p.addInitScript(MOCK); await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(400);
  await p.fill('#a_email', 'kim@example.com'); await p.fill('#a_pw', 'new paint tin 7'); await p.click('#a_go'); await p.waitForTimeout(800);
  await p.evaluate(() => { const st = window.__qcApp.store, s = st.load(); Object.assign(s.details, { trade: 'painter', state: 'SA', owner_name: 'Kim Vo', trading_name: 'Vo Painting', abn: '51824753556', phone: '0412345678', account_name: 'Vo Painting', bsb: '065000', account_number: '12345678' }); s.security.setup_done = true; st.save(s); });
  await p.goto(base + '#/settings'); await p.reload(); await p.waitForTimeout(800);
  ok(!!(await p.$('#acctcard')) && /Account/.test(await p.$eval('#acctcard > summary', e => e.textContent)), 'Set-up has an Account section');
  if (!(await p.$eval('#acctcard', d => d.open))) await p.click('#acctcard > summary');
  t = await p.$eval('#acct_body', e => e.innerText);
  ok(/Logged in as kim@example\.com/.test(t) && /Password/.test(t) && /Log out/.test(t) && /Delete account/.test(t), 'showing who is logged in, the password, the email, Log out and Delete account');
  await p.click('[data-acct=password]'); await p.fill('#ac_cur', 'wrong'); await p.fill('#ac_new', 'fresh password 1'); await p.click('#acct_f button[type=submit]'); await p.waitForTimeout(500);
  ok(/not your current password/.test(await p.$eval('#ac_cur_err', e => e.textContent)), 'changing the password needs the current one');
  await p.fill('#ac_cur', 'new paint tin 7'); await p.click('#acct_f button[type=submit]'); await p.waitForTimeout(500);
  ok(!(await p.$('#ac_cur')) && /Password saved/.test(await p.$eval('.toast', e => e.textContent).catch(() => '')), 'and with it the password is changed');
  await p.click('[data-acct=delete]'); await p.waitForTimeout(200);
  ok(/cannot be undone/.test(await p.$eval('#acct_body', e => e.innerText)), 'Delete says plainly what goes and that it cannot be undone');
  await p.fill('#ac_pw', 'fresh password 1'); await p.click('#acct_f button[type=submit]'); await p.waitForTimeout(900);
  st = await S();
  ok(!(st.account && st.account.email) && !st.details.trading_name && !st.sending.token && /Create your account/.test(await text()), 'deleting empties the phone and returns to Create an account');

  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
