// The front door on the phone: an email, then six numbers. An address alone gets nobody in.
const __OPEN = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); };
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

// a relay that behaves like the real one: a code, and nothing useful until it is right
const MOCK = () => {
  window.__calls = [];
  window.__code = '654321';
  window.__qcRelayFetch = (u, o) => {
    const b = JSON.parse(o.body); window.__calls.push({ url: String(u), body: b });
    if (/\/signin$/.test(String(u))) {
      if (b.action === 'start') return Promise.resolve({ json: () => Promise.resolve({ ok: true, sent: true }) });
      if (b.code !== window.__code) return Promise.resolve({ json: () => Promise.resolve({ ok: false, error: 'That code is wrong. 4 more tries.' }) });
      return Promise.resolve({ json: () => Promise.resolve({ ok: true, token: 'qc1.eyJ2IjoxfQ.sig', cus: 'cus_live1',
        sending: { server: 'https://relay.example/api/msg', token: 'qc1.eyJ2IjoxfQ.sig', hosted: true, server_has_creds: true },
        setup: { v: 1, settings: { details: { email: 'dave@example.com', trading_name: "Dave's Painting" } }, jobs: [] } }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
  };
};

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.addInitScript(MOCK); await p.addInitScript(__OPEN);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  const text = () => p.$eval('#app', e => e.innerText);

  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(600);
  let t = await text();
  ok(/Chasem/.test(t) && !!(await p.$('#join_email')), 'a phone with no account is asked for an email and nothing else');
  ok(!(await p.$('#join_name')), 'and not for a business name yet: one thing at a time');

  // a bad address never reaches the relay
  await p.fill('#join_email', 'nope'); await p.click('#join_go'); await p.waitForTimeout(300);
  ok(/does not look like an email/.test(await text()), 'a thing that is not an email is caught on the phone');
  ok((await p.evaluate(() => window.__calls.length)) === 0, 'and never reaches the relay');

  // the code step
  await p.fill('#join_email', 'Dave@Example.com'); await p.click('#join_go'); await p.waitForTimeout(700);
  const startCall = await p.evaluate(() => window.__calls[0]);
  ok(startCall && startCall.body.action === 'start' && startCall.body.email === 'dave@example.com', 'the address is lower-cased before it is sent (' + (startCall && startCall.body.email) + ')');
  t = await text();
  ok(!!(await p.$('#join_code')) && /dave@example\.com/.test(t), 'then it asks for the six numbers and says where they went');
  ok(!(await p.evaluate(() => (window.__qcApp.store.load().sending || {}).token)), 'and nothing is on the phone yet: the email alone is not a way in');

  // a wrong code
  await p.fill('#join_code', '111111'); await p.waitForTimeout(900);
  ok(/code is wrong/.test(await text()), 'a wrong code says so, in the relay\'s words');
  ok(!(await p.evaluate(() => (window.__qcApp.store.load().sending || {}).token)), 'and still lets nobody in');

  // the right one, typed rather than submitted: a phone keypad has no Enter
  await p.fill('#join_code', ''); await p.fill('#join_code', '654321'); await p.waitForTimeout(1000);
  const S = await p.evaluate(() => window.__qcApp.store.load());
  ok(S.sending && S.sending.token === 'qc1.eyJ2IjoxfQ.sig', 'the right code opens the app, with no Enter needed');
  ok(S.account && S.account.email === 'dave@example.com' && S.account.cus === 'cus_live1', 'the account is the email, and it remembers which one');
  ok(S.details.trading_name === "Dave's Painting", 'and his details come back with it, so a new phone is not a blank app');
  ok(!/join_email/.test(await p.evaluate(() => document.querySelector('#app').innerHTML)), 'the door is gone once he is in');

  // send another / different email
  await p.evaluate(() => { localStorage.clear(); }); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(500);
  await p.fill('#join_email', 'dave@example.com'); await p.click('#join_go'); await p.waitForTimeout(600);
  await p.click('#code_again'); await p.waitForTimeout(600);
  ok(/Sent/.test(await text()), 'he can ask for another code');
  await p.click('#code_back'); await p.waitForTimeout(400);
  ok(!!(await p.$('#join_email')), 'and go back to change the address he typed');

  // the relay being down does not eat the app
  await p.evaluate(() => { window.__qcRelayFetch = () => Promise.reject(new Error('offline')); });
  await p.fill('#join_email', 'dave@example.com'); await p.click('#join_go'); await p.waitForTimeout(700);
  ok(/No signal/.test(await text()), 'with no signal it says so rather than hanging: ' + (await text()).replace(/\s+/g, ' ').slice(0, 60));
  ok(!!(await p.$('#join_go')), 'and leaves the button usable for another go');

  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
