// The calendar card in Set-up: what a painter sees before he connects one, after he connects one, when the
// relay has no Google credentials at all, and when he comes back from Google having said no.
const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); };
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

// A relay that answers about calendars and nothing else. Each test sets window.__cal to what it should say.
const TOASTS = () => { window.__toasts = []; document.addEventListener('DOMContentLoaded', () => { const t = document.getElementById('toast'); if (!t) return; new MutationObserver(() => { const s = t.textContent; if (s && window.__toasts[window.__toasts.length - 1] !== s) window.__toasts.push(s); }).observe(t, { childList: true, characterData: true, subtree: true, attributes: true }); }); };
const MOCK = () => {
  // kept in sessionStorage as well as memory: going to Google throws the page away, and what was asked for
  // just before he left is exactly what this test is about
  const load = () => { try { return JSON.parse(sessionStorage.getItem('qccalls') || '[]'); } catch (e) { return []; } };
  window.__qcCalls = load();
  window.__cal = { ok: true, connected: false };
  window.__qcRelayFetch = (u, o) => {
    const b = JSON.parse(o.body); window.__qcCalls.push({ url: String(u), body: b });
    try { sessionStorage.setItem('qccalls', JSON.stringify(window.__qcCalls)); } catch (e) {}
    if (/\/gcal$/.test(String(u))) return Promise.resolve({ json: () => Promise.resolve(window.__cal) });
    return Promise.resolve({ json: () => Promise.resolve({ ok: true, now: new Date().toISOString(), changes: [], bookings: [], replies: [] }) });
  };
};
const seed = () => {
  // what the relay last said about the calendar is remembered on the phone; each case starts without it
  try { const k = 'qc-sync-v1', m = JSON.parse(localStorage.getItem(k) || '{}'); delete m.calendar; localStorage.setItem(k, JSON.stringify(m)); } catch (e) {}
  const st = window.__qcApp.store, S = st.load();
  S.account = { email: 'dave@example.com', joined: st.today(), verified: true }; S.details.trading_name = S.details.trading_name || 'Test Painting Co'; S.details.abn = S.details.abn || '12 345 678 901'; S.details.state = S.details.state || 'SA'; S.security.setup_done = true; S.payment = S.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; 
  S.details.trading_name = "Dave's Painting"; S.details.email = 'dave@example.com'; S.details.state = 'SA';
  S.sending = Object.assign({}, S.sending, { server: 'https://relay.example/api/msg', hosted: true, token: 'qc1.eyJ2IjoxfQ.sig', server_has_creds: true });
  st.save();
};

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.addInitScript(MOCK); await p.addInitScript(TOASTS); await p.addInitScript(__OPEN_SEC);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  const text = () => p.$eval('#app', e => e.innerText);
  // setting the hash it already has fires nothing, so step out and back
  const settings = async () => { await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(120); await p.evaluate(() => { location.hash = '#/settings'; }); await p.waitForTimeout(600); };

  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(seed); await p.reload({ waitUntil: 'load' });

  // not connected
  await settings();
  let t = await text();
  ok(/Your calendar/.test(t), 'a hosted painter is offered a calendar');
  ok(/Not connected/.test(t) && await p.$('#calon') !== null, 'before he connects one it says so and offers the button');
  ok(/free or busy only/.test(t) && /never writes/.test(t), 'the card says what is read and that nothing is written');

  // connecting: the app asks the relay for a link rather than building a Google URL itself
  // First without a usable link, so the page stays put and what was asked for can be read off it.
  await p.evaluate(() => { window.__cal = { ok: false, error: 'Google is not set up.' }; });
  await p.click('#calon'); await p.waitForTimeout(600);
  const asked = await p.evaluate(() => (window.__qcCalls || []).filter(c => /gcal/.test(c.url)).map(c => c.body.action));
  ok(asked.includes('start'), 'Connect asks the relay to start, and sends the token with it (' + asked.join(', ') + ')');
  const sentToken = await p.evaluate(() => (window.__qcCalls || []).filter(c => /gcal/.test(c.url)).every(c => typeof c.body.token === 'string' && c.body.token.slice(0, 4) === 'qc1.'));
  ok(sentToken, 'every calendar call carries his signed token');
  ok(/Google is not set up/.test(await text()), 'and a relay that cannot start it says why, on the card');

  // Then with one, to see that he is sent to the relay's link and not to something the app made up.
  let wentTo = '';
  await p.route('https://accounts.google.com/**', (route) => { wentTo = route.request().url(); route.abort(); });
  await settings();
  await p.evaluate(() => { window.__cal = { ok: true, url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=x&state=y' }; });
  await p.click('#calon').catch(() => {}); await p.waitForTimeout(1200);
  ok(/^https:\/\/accounts\.google\.com\//.test(wentTo), 'and then sends him to the link the relay gave, not one the app made up: ' + ((wentTo || '(nowhere)').slice(0, 45)));
  await p.unroute('https://accounts.google.com/**');

  // connected
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(seed);
  await p.evaluate(() => { window.__cal = { ok: true, connected: true, account: 'dave@example.com', days: 4, error: '' }; });
  await settings(); await p.waitForTimeout(400); t = await text();
  ok(/dave@example\.com/.test(t) && /4 days blocked out/.test(t), 'once connected it names the account and how many days are blocked: ' + (t.match(/Your calendar[\s\S]{0,120}/) || [''])[0].replace(/\s+/g, ' '));
  ok(await p.$('#caloff') !== null && await p.$('#calon') === null, 'and offers Disconnect instead of Connect');

  // a permission he took back
  await p.evaluate(() => { window.__cal = { ok: true, connected: true, account: 'dave@example.com', days: 0, error: 'Token has been expired or revoked.' }; });
  await p.evaluate(seed);
  await settings(); await p.waitForTimeout(500); t = await text();
  ok(/expired or revoked/.test(t) && /Connect it again/.test(t), 'a permission he took back is shown, with what to do about it');

  // disconnecting
  await p.evaluate(() => { window.__cal = { ok: true, connected: false }; });
  await p.click('#caloff'); await p.waitForTimeout(600);
  t = await text();
  ok(/Not connected/.test(t), 'after disconnecting the card goes back to offering the connection');

  // the relay has no Google credentials: no card at all, rather than one that cannot work
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(seed);
  await p.evaluate(() => { window.__cal = { ok: false, off: true, error: 'Calendars are not switched on yet' }; });
  await settings(); await p.waitForTimeout(600); t = await text();
  ok(!/Your calendar/.test(t), 'with calendars switched off at the relay the card is left out entirely');

  // coming back from Google having said no
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(seed);
  await p.evaluate(() => { window.__toasts = []; });
  await p.evaluate(() => { location.hash = '#/settings?calendar=no&why=' + encodeURIComponent('You said no to the permission.'); });
  await p.waitForTimeout(600);
  const toasts = await p.evaluate(() => window.__toasts || []);
  ok(toasts.some(x => /not connected/i.test(x) && /said no/i.test(x)), 'coming back from Google having refused says so plainly: ' + JSON.stringify(toasts));
  ok(!/\?calendar=/.test(await p.evaluate(() => location.hash)), 'and the message is not repeated on the next reload (' + await p.evaluate(() => location.hash) + ')');

  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
