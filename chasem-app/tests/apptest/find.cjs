// Find my quotes: he logs in to his own email or Xero on their page, taps Allow, and comes back to a ticked list
// of the quotes he sent. The relay is faked here; tests/find.mjs in chasem-landing covers its side.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const pre = () => { try { const k = 'qc-app-v1', S = JSON.parse(localStorage.getItem(k) || '{}'); if (S.account) return; S.account = { email: 'd@e.com', joined: '2026-01-01', verified: true }; S.details = Object.assign({}, S.details, { trading_name: 'Steele Electrical', owner_name: 'Dave Steele', abn: '12 345 678 901', state: 'SA', bsb: '063-000', account_number: '12345678', phone: '0412 345 678', email: 'dave@example.com', gst: true, trade: 'electrician' }); S.security = Object.assign({}, S.security, { setup_done: true }); S.sending = Object.assign({}, S.sending, { server: 'https://relay.test/api/send', token: 'qc1.x.y' }); localStorage.setItem(k, JSON.stringify(S)); } catch (e) {} };
// The fake relay. window.__find says what it will answer; every call is written down in window.__calls.
const relay = () => {
  window.__calls = []; window.__find = window.__find || { providers: ['microsoft', 'xero'] };
  const found = { ok: true, provider: 'microsoft', name: 'Outlook', account: 'dave@example.com', scanned: 212, items: [
    { kind: 'quote', name: 'Jane Mitchell', email: 'jane@example.com', amount: 2450, date: '2026-09-10', number: 'Q-2041', what: 'switchboard upgrade' },
    { kind: 'quote', name: 'Tom Nguyen', phone: '0412 222 333', amount: 880, date: '2026-09-14', number: 'Q-2044', what: 'downlights' },
    { kind: 'invoice', name: 'Priya Shah', email: 'priya@example.com', amount: 3885.2, date: '2026-09-01', number: 'INV-1006', due: '2026-09-15', what: 'rewire' }] };
  window.__qcRelayFetch = (url, o) => { const b = JSON.parse(o.body); window.__calls.push({ url, b });
    const out = b.action === 'which' ? (window.__find.down ? null : { ok: true, providers: window.__find.providers })
      : b.action === 'start' ? { ok: true, url: '#/add/found?k=abc123' }
      : b.action === 'collect' ? (window.__find.collected || b.id !== 'abc123' ? { ok: false, error: 'That look has expired. Log in again.' } : (window.__find.collected = true, found))
      : { ok: false };
    return out ? Promise.resolve({ json: () => Promise.resolve(out) }) : Promise.reject(new Error('offline')); };
};

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  await p.addInitScript(pre); await p.addInitScript(relay);
  const text = () => p.$eval('#app', e => e.innerText);
  const state = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('qc-app-v1') || '{}'); } catch (e) { return {}; } });
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.waitForTimeout(400);

  // ---- Chase opens straight on Find when a login is switched on
  await p.click('#chaseadd'); await p.waitForTimeout(700);
  ok(/#\/add/.test(await p.evaluate(() => location.hash)), 'Chase opens the Chase a quote screen');
  const btns = await p.$$eval('#app [data-find]', els => els.map(e => e.innerText.trim() + '|' + e.getAttribute('aria-label')));
  ok(btns.join(',') === 'Outlook|Log in to Outlook,Xero|Log in to Xero', 'it shows one big button per login that is switched on: ' + btns.join(', '));
  ok(await p.$eval('#app .addtabs .tape', e => e.getAttribute('aria-label')) === 'Find', 'and Find is the tab it opens on');
  const calls = await p.evaluate(() => window.__calls.map(c => c.url + ' ' + c.b.action + ' ' + c.b.token));
  ok(calls[0] === 'https://relay.test/api/find which qc1.x.y', 'it asks the relay he already sends through, with his token: ' + calls[0]);
  const wide = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  ok(wide, 'five tabs still fit a phone without sideways scrolling');

  // ---- Tap Outlook: off to their login, back to a ticked list
  await p.click('[data-find="microsoft"]'); await p.waitForTimeout(1200);
  ok(/#\/add\/found\?k=abc123/.test(await p.evaluate(() => location.hash)), 'tapping a login goes to the page the relay gives (their login)');
  const t = await text();
  ok(/From Outlook, dave@example.com: 212 looked at\./.test(t), 'back again, it says where it looked and how much');
  ok(/3 to chase/.test(t) && /Jane Mitchell/.test(t) && /Priya Shah/.test(t), 'and lists the three it found, all ticked');
  // lost the tab after coming back: the list is kept, not lost
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(900);
  ok(/3 to chase/.test(await text()), 'a reload keeps the list (it can only be collected once)');
  await p.uncheck('.sheetrow:nth-of-type(2) input'); await p.waitForTimeout(100);
  ok((await p.$eval('#sheetgo', e => e.textContent)) === 'Chase 2', 'unticking one leaves Chase 2');
  await p.click('#sheetgo'); await p.waitForTimeout(1200);
  ok(/#\/chase/.test(await p.evaluate(() => location.hash)), 'Chase 2 goes to Follow-ups');
  const S = await state(), names = S.jobs.map(j => j.client.name).sort();
  ok(names.join(',') === 'Jane Mitchell,Priya Shah', 'the two ticked are now jobs: ' + names.join(', '));
  const priya = S.jobs.find(j => j.client.name === 'Priya Shah');
  ok(priya && priya.invoices && priya.invoices.length === 1 && priya.invoices[0].no === 'INV-1006', 'the invoice came in as an invoice to chase for payment');

  // ---- Coming back to the same look again: nothing doubled
  await p.evaluate(() => { location.hash = '#/add/found?k=abc123'; }); await p.waitForTimeout(800);
  ok(/1 to chase/.test(await text()) && /2 already here/.test(await text()), 'the same list again only offers the one left out, and says two are already here');

  // ---- Every way back from a login that did not work
  for (const [why, said] of [['no', /You said no/], ['expired', /took too long/], ['failed', /did not work/]]) {
    await p.evaluate(w => { location.hash = '#/x'; setTimeout(() => { location.hash = '#/add/find?why=' + w; }, 50); }, why); await p.waitForTimeout(700);
    const tt = await text();
    ok(said.test(tt) && await p.$('[data-find="microsoft"]') && /Type/.test(tt), 'why=' + why + ': says so in one line, with the logins and the other ways right there');
  }
  // a look that has gone (collected on another phone, or too old): a way straight back
  await p.evaluate(() => { sessionStorage.clear(); location.hash = '#/add/found?k=zzz'; }); await p.waitForTimeout(800);
  ok(/expired/.test(await text()) && await p.$('a[href="#/add/find"]'), 'an expired look says so and offers Log in again');

  // ---- Nothing switched on: no Find at all, Chase opens on Type
  const p2 = await ctx.newPage(); p2.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
  await p2.addInitScript(() => { window.__find = { providers: [] }; }); await p2.addInitScript(relay);
  await p2.goto(base + '#/add', { waitUntil: 'load' }); await p2.waitForTimeout(900);
  ok((await p2.evaluate(() => window.__calls.length)) === 1 && !(await p2.$('#app [data-find]')) && !(await p2.$('#app .addtabs [aria-label="Find"]')) && await p2.$('#a_name'), 'with no login switched on, Find is not there and it opens on Type');
  // ---- No signal when it asks: Type now, and it asks again next time
  const p3 = await ctx.newPage(); p3.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
  await p3.addInitScript(() => { window.__find = { providers: ['google'], down: true }; }); await p3.addInitScript(relay);
  await p3.goto(base + '#/add', { waitUntil: 'load' }); await p3.waitForTimeout(900);
  ok(await p3.$('#a_name'), 'no signal: it opens on Type, nothing broken');
  await p3.evaluate(() => { window.__find.down = false; location.hash = '#/'; setTimeout(() => { location.hash = '#/add'; }, 100); }); await p3.waitForTimeout(1200);
  ok(await p3.$('[data-find="google"]'), 'with signal back, Find turns up (Gmail)');

  await b.close(); srv.close();
  console.log(fails ? '\nFAILURES: ' + fails : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
