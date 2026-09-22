// Hands-off app: the price wizard that replaces the phone call, the subscription that renews itself, manage/cancel, and the banners.
const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); };
const __JOINED = () => { try { const k = 'qc-app-v1', raw = localStorage.getItem(k); const s = raw ? JSON.parse(raw) : {}; s.account = Object.assign({ email: 'test@example.com', joined: '2026-01-01' }, s.account || {}); localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }; // the app asks for an email before it opens; these suites are about what comes after
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const isoDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// the relay is mocked: renew and portal answer whatever __qcMock says
const MOCK = () => { let saved = null; try { saved = JSON.parse(sessionStorage.getItem('qcmock') || 'null'); } catch (e) {} window.__qcMock = saved || { renew: { ok: true, active: true, status: 'active', token: 'qc1.NEW.SIG', until: '' }, portal: { ok: true, url: 'https://billing.stripe.com/p/test' } }; window.__qcCalls = [];
  window.__qcRelayFetch = (u, o) => { const b = JSON.parse(o.body); window.__qcCalls.push({ url: u, body: b }); const which = /\/renew$/.test(u) ? 'renew' : /\/portal$/.test(u) ? 'portal' : 'msg'; const r = which === 'msg' ? { ok: true, id: 'ID1' } : window.__qcMock[which]; return Promise.resolve({ json: () => Promise.resolve(r) }); }; };

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.addInitScript(__JOINED); await p.addInitScript(__OPEN_SEC); await p.addInitScript(MOCK);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  await ctx.route('https://billing.stripe.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Stripe billing</h1>' })); // the real page cannot load in here
  const text = () => p.$eval('#app', e => e.innerText);
  const state = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__qcApp.store.load())));
  const setMock = (m) => p.evaluate(m => { window.__qcMock = Object.assign(window.__qcMock || {}, m); try { sessionStorage.setItem('qcmock', JSON.stringify(window.__qcMock)); } catch (e) {} }, m);
  const toastText = async () => { await p.waitForSelector('#toast:not([hidden])', { timeout: 4000 }).catch(() => null); return p.$eval('#toast', e => e.textContent).catch(() => ''); };
  await p.goto(base, { waitUntil: 'load' });

  // ---- nobody's name is in the app any more
  const src = fs.readFileSync(ROOT + '/app.js', 'utf8'); ok(!/Aaron/.test(src), 'no person is named anywhere in the app');
  // ---- the set-up card names the four self-service steps and links them
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.details.trading_name = 'Daves Painting'; st.save(); });
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#setupcard'); let t = await text();
  ok(/1 of 4 done/.test(t) && /Make the prices yours/.test(t) && /Let it chase for you/.test(t) && /Ten minutes, whenever suits/.test(t), 'set-up card: four steps, done alone: ' + t.slice(t.indexOf('Set up'), t.indexOf('Set up') + 120).replace(/\n/g, ' '));
  ok(await p.$('#setupcard a[href="#/myprices"]'), 'the prices step is a link to the wizard');

  // ---- 1. prices from a day rate
  await p.goto(base + '#/myprices', { waitUntil: 'load' }); await p.waitForSelector('#mp_daygo'); t = await text();
  ok(/Five minutes, and the app quotes the way you do/.test(t) && /What do you charge for a day on the tools\?/.test(t), 'the wizard opens with the day-rate question');
  const before = await p.evaluate(() => window.__qcApp.store.load().prices.p_walls);
  await p.fill('#mp_day', '760'); await p.fill('#mp_margin', '45'); await p.click('#mp_daygo');
  await p.waitForFunction(() => location.hash === '#/settings/prices');
  let tt = await toastText(); ok(/^\d+ prices worked out from \$760 a day\. Change any of them on the price list\.$/.test(tt), 'day rate toast: ' + tt);
  let S = await state();
  ok(S.costing.labour_rate === 95 && S.costing.margin_pct === 45 && S.prices.p_walls > 0 && S.prices.p_walls !== before && S.security.setup_done === true, 'day rate becomes an hourly cost and every price moves: walls ' + before + ' -> ' + S.prices.p_walls);
  // ---- 2. prices matched to a job he already quoted
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(), d = st.defaults().prices; Object.keys(d).forEach(k => { S.prices[k] = d[k]; }); S.security.setup_done = false; st.save(); });
  await p.goto(base + '#/myprices', { waitUntil: 'load' }); await p.waitForSelector('#mp_jobgo');
  const startWalls = await p.evaluate(() => window.__qcApp.store.load().prices.p_walls);
  await p.fill('#mp_w', '4'); await p.fill('#mp_l', '5'); await p.fill('#mp_price', '2400'); await p.click('#mp_jobgo');
  await p.waitForFunction(() => location.hash === '#/settings/prices', { timeout: 5000 }).catch(() => null);
  tt = await toastText(); ok(/^Prices moved (up|down) \d+% so that room comes to \$2,400\.$/.test(tt), 'job-match toast: ' + tt);
  S = await state(); ok(S.prices.p_walls > startWalls && S.security.setup_done === true, 'every price moved by the same factor: walls ' + startWalls + ' -> ' + S.prices.p_walls);
  // a silly number is refused rather than wrecking the list
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(), d = st.defaults().prices; Object.keys(d).forEach(k => { S.prices[k] = d[k]; }); st.save(); });
  await p.goto(base + '#/myprices', { waitUntil: 'load' }); await p.waitForSelector('#mp_jobgo');
  await p.fill('#mp_w', '4'); await p.fill('#mp_l', '5'); await p.fill('#mp_price', '80'); await p.click('#mp_jobgo');
  ok(/a lot lower than the app makes it/.test(await p.$eval('#mp_jobres', e => e.textContent)) && (await state()).prices.p_walls === (await p.evaluate(() => window.__qcApp.store.defaults().prices.p_walls)), 'a price ten times out is refused, the list is untouched');

  // ---- 3. the subscription renews itself
  const setHosted = async (until, extra) => p.evaluate(([u, x]) => { const st = window.__qcApp.store, S = st.load(); Object.assign(S.sending, { hosted: true, server: 'https://relay.example.test/api/msg', token: 'qc1.OLD.SIG', server_has_creds: true, hosted_until: u, hosted_name: 'Daves Painting', hosted_cancelled: false, hosted_past_due: false, renew_checked: '' }, x || {}); st.save(); }, [until, extra]);
  await setMock({ renew: { ok: true, active: true, status: 'active', token: 'qc1.NEW.SIG', until: isoDays(35) } });
  await setHosted(isoDays(40)); await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2200));
  ok((await p.evaluate(() => window.__qcCalls.filter(c => /renew/.test(c.url)).length)) === 0, 'more than a week to run: the app does not bother asking');
  await setHosted(isoDays(4)); await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => window.__qcCalls.some(c => /renew/.test(c.url)), { timeout: 6000 });
  await p.waitForFunction(u => window.__qcApp.store.load().sending.hosted_until === u, isoDays(35), { timeout: 4000 });
  S = await state(); const rc = await p.evaluate(() => window.__qcCalls.find(c => /renew/.test(c.url)));
  ok(rc.url === 'https://relay.example.test/api/renew' && rc.body.token === 'qc1.OLD.SIG' && S.sending.token === 'qc1.NEW.SIG' && S.sending.hosted_until === isoDays(35) && S.sending.renew_checked, 'near the end: the app swaps its own token and moves its own date, no banner, nothing asked');
  ok(!(await p.$('#hostedend')), 'a subscription that renewed shows no banner at all');
  // cancelled
  await setMock({ renew: { ok: true, active: false, status: 'canceled', until: isoDays(6) } });
  await setHosted(isoDays(6)); await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => window.__qcApp.store.load().sending.hosted_cancelled === true, { timeout: 6000 });
  await p.waitForSelector('#hostedend', { timeout: 8000 }).catch(() => null); t = await text();
  ok(/Cancelled\. The chasing runs to [^.]+ and stops after that\. Change your mind in Set-up\./.test(t), 'cancelled: a quiet line, not a scare');
  // card declined
  await setMock({ renew: { ok: true, active: true, status: 'past_due', token: 'qc1.PD.SIG', until: isoDays(9) } });
  await setHosted(isoDays(3)); await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => window.__qcApp.store.load().sending.hosted_past_due === true, { timeout: 6000 });
  await p.waitForSelector('#hostedend', { timeout: 6000 }).catch(() => null); t = await text();
  ok(/Your card was declined\. The chasing keeps going for a few days\. Tap Manage in Set-up to fix the card\./.test(t), 'declined card: told once, told plainly');
  // ran out entirely
  await setHosted(isoDays(-1), { renew_checked: isoDays(0) });
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#hostedend'); t = await text();
  ok(/The chasing is off\. Your sending ran to [^.]+\. Reminders already queued still go out; nothing new is scheduled\./.test(t) && /Turn it back on at the website/.test(t), 'run out: says what still happens and where to turn it back on');
  // ---- 4. manage and check, from the phone, no email to anyone
  await setHosted(isoDays(20), { renew_checked: isoDays(0) });
  await p.goto(base + '#/settings', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#hostedmanage'); t = await text();
  ok(/On, and paid to [^.]+, when it renews itself\./.test(t), 'Set-up says it is paid and renews itself: ' + (t.match(/On, and paid[^\n]*/) || [''])[0].slice(0, 90));
  const popup = ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null);
  await p.click('#hostedmanage'); const pop = await popup; if (pop) await pop.waitForLoadState('domcontentloaded').catch(() => null);
  const pc = await p.evaluate(() => window.__qcCalls.filter(c => /portal/.test(c.url)).pop());
  ok(pc && pc.url === 'https://relay.example.test/api/portal' && pc.body.token === 'qc1.OLD.SIG' && pc.body.return_url && pop && /billing\.stripe\.com/.test(pop.url()), 'Manage asks the relay for his own billing page: ' + JSON.stringify(pc && { u: pc.url, t: pc.body.token }) + ' popup=' + (pop ? pop.url() : 'blocked in the test browser')); if (pop) await pop.close().catch(() => null);
  await setMock({ renew: { ok: true, active: true, status: 'active', token: 'qc1.CHK.SIG', until: isoDays(44) } });
  await p.click('#hostedcheck'); await p.waitForFunction(() => /Paid up to/.test(document.getElementById('hostedres').textContent), { timeout: 5000 });
  ok(/Paid up to /.test(await p.$eval('#hostedres', e => e.textContent)), 'Check my subscription answers on the spot');
  // ---- 5. with no subscription at all the app still works and points at the website
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending = Object.assign(st.defaults().sending, { auto_sms: true, auto_email: true }); st.save(); });
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#setupcode'); t = await text();
  ok(/Rather not\? Turn the chasing on: one card, one tap, cancel from this page any time\./.test(t) && !(await p.$('#hostedmanage')), 'free painter: one link to turn it on, no manage button');
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
