const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const __JOINED = () => { try { const k = 'qc-app-v1', raw = localStorage.getItem(k); const s = raw ? JSON.parse(raw) : {}; s.account = Object.assign({ email: 'test@example.com', joined: '2026-01-01' }, s.account || {}); localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }; // the app asks for an email before it opens; these suites are about what comes after
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..'), SP = require('path').join(__dirname, '..');
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'application/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true }); const p = await ctx.newPage(); await p.addInitScript(__JOINED); await p.addInitScript(__OPEN_SEC);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  await p.goto(base, { waitUntil: 'load' });
  // seed: a booked job at Gawler tomorrow and a visit at Elizabeth
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.details.trading_name = 'Test Painting Co'; S.details.owner_name = 'Sam'; S.details.postcode = '5000'; S.details.state = 'SA'; const t = st.addDays(st.today(), 1);
    const a = st.newJob(); a.client = { name: 'Gawler job', phone: '', email: '', address: '1 Main St Gawler SA 5118' }; a.status = 'accepted'; a.booking = { start: t, end: st.addDays(t, 1), hour: 7, days: 1, end_inclusive: t };
    const c = st.newJob(); c.client = { name: 'Elizabeth visit', phone: '', email: '', address: '2 Side St Elizabeth SA 5112' }; c.status = 'enquiry'; c.visit = { date: t, start_min: 16 * 60 + 30, minutes: 30 }; st.save(); });
  await p.click('a[data-nav="home"]'); await p.waitForSelector('a:has-text("Phone enquiry")'); ok(/Quote visits/.test(await p.$eval('#app', e => e.innerText)), 'home lists upcoming quote visits');
  await p.click('a:has-text("Phone enquiry")'); await p.waitForSelector('#findslots');
  await p.fill('[data-bind="client.name"]', 'Kate Caller'); await p.fill('[data-bind="client.phone"]', '0400 111 222'); await p.fill('[data-bind="client.address"]', '9 Near St Willaston SA 5118'); await p.fill('[data-bind="summary"]', 'Lounge and two bedrooms');
  await p.click('[data-room="lounge"]'); await p.click('[data-room="bedroom"]'); await p.click('[data-room="bedroom"]');
  const bp1 = await p.$eval('#ballpark', e => e.textContent); ok(/\$[\d,]+ to \$[\d,]+/.test(bp1), 'ballpark appears after tapping rooms: ' + bp1);
  await p.click('[data-size="0:L"]'); const bp2 = await p.$eval('#ballpark', e => e.textContent); ok(bp2 !== bp1, 'size L changes the ballpark: ' + bp2);
  await p.selectOption('[data-bind="condition"]', 'fair'); const bp3 = await p.$eval('#ballpark', e => e.textContent); ok(bp3 !== bp2, 'fair condition changes the ballpark: ' + bp3);
  ok(/travel included/.test(await p.$eval('#bpnote', e => e.textContent)), 'ballpark note includes travel from the postcode');
  await p.screenshot({ path: SP + '/apptest/enquiry.png', fullPage: true });
  await p.click('#findslots'); await p.waitForSelector('[data-slot]');
  const slots = await p.$$eval('[data-slot]', els => els.map(e => e.innerText.replace(/\s+/g, ' ')));
  console.log('  slots:', slots.slice(0, 3).join(' | '));
  ok(slots.length >= 3 && /after Job: Gawler job/.test(slots[0]) && /3:15pm/.test(slots[0]), 'first suggestion is straight after the Gawler job (same postcode)');
  await p.click('[data-slot="0"]'); await p.waitForSelector('#visitics');
  const v = await p.evaluate(() => window.__qcApp.store.load().jobs.filter(j => j.client.name === 'Kate Caller')[0]); ok(v && v.status === 'enquiry' && v.visit && v.visit.start_min === 15 * 60 + 15 && v.ballpark && /calendar\.google\.com/.test(v.visit.gcal), 'enquiry saved with visit, ballpark and Google link');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.click('#visitics')]);
  if (dl) { const fp = SP + '/apptest/visit.ics'; await dl.saveAs(fp); const t = fs.readFileSync(fp, 'utf8'); ok(/DTSTART:\d{8}T151500/.test(t) && /TRIGGER:-PT45M/.test(t) && /Quote visit: Kate Caller/.test(t) && /Willaston/.test(t), 'visit ics: 15:15 start, 45 min alarm, address'); } else ok(false, 'visit ics');
  await p.click('a[data-nav="home"]'); // the download above can still be settling, so wait for Home rather than reading mid-render
  await p.waitForFunction(() => /Kate Caller/.test(document.querySelector('#app').innerText), null, { timeout: 5000 }).catch(() => {});
  const home = await p.$eval('#app', e => e.innerText); ok(/Kate Caller/.test(home) && /3:15pm/.test(home) && /Enquiry/.test(home), 'home shows the enquiry and its visit');
  await p.click('a[href="#/enquiry/' + v.id + '"]'); await p.waitForSelector('#savebp'); await p.click('#savebp'); await p.waitForSelector('#runtotal');
  const j = await p.evaluate(() => window.__qcApp.store.load().jobs.filter(j => j.client.name === 'Kate Caller')[0]); ok(j.status === 'draft' && j.rooms.length === 3 && j.rooms[0].L > 5, 'saved as a job with three typed rooms, lounge at L size (' + j.rooms.map(r => r.name + ' ' + r.L + 'x' + r.W).join(', ') + ')');
  ok(/Phone ballpark was/.test(await p.$eval('#app', e => e.innerText)), 'job page shows the phone ballpark and visit');
  // far enquiry never squeezed between Gawler and Elizabeth
  await p.click('a[data-nav="home"]'); await p.click('a:has-text("Phone enquiry")'); await p.waitForSelector('#findslots'); await p.fill('[data-bind="client.address"]', '5 Hill Rd Mount Barker SA 5251'); await p.click('#findslots'); await p.waitForSelector('[data-slot]');
  const far = await p.$$eval('[data-slot]', els => els.map(e => e.innerText.replace(/\s+/g, ' '))); console.log('  far slots:', far.slice(0, 2).join(' | '));
  ok(!far.some(s => /after Job: Gawler job/.test(s) && /before Quote visit/.test(s)), 'Mount Barker is not offered between the two northern appointments');
  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
