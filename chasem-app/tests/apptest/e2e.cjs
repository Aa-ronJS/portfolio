const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const __JOINED = () => { try { const k = 'qc-app-v1', raw = localStorage.getItem(k); const s = raw ? JSON.parse(raw) : {}; s.account = Object.assign({ email: 'test@example.com', joined: '2026-01-01', verified: true }, s.account || {}); s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }; // the app asks for an email before it opens; these suites are about what comes after
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const SP = require('path').join(__dirname, '..');
const T = JSON.parse(fs.readFileSync(SP + '/mtest/truth.json', 'utf8'));
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.pdf': 'application/pdf', '.txt': 'text/plain' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= (tol || 0.5);
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
  const p = await ctx.newPage(); await p.addInitScript(__JOINED); await p.addInitScript(__OPEN_SEC);
  // A2: a document now opens on screen first, then Send hands it to the phone (a download here), then the app asks "Did it go?"; answer Yes, by text
  const sendDoc = async (clickSel) => { if (clickSel) await p.click(clickSel); const v = await p.waitForSelector('#qcv_send', { timeout: 4000 }).catch(() => null); if (!v) return null; const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.click('#qcv_send')]); await p.waitForSelector('#didgo', { timeout: 10000 }); await p.click('#didgo [data-didgo="text"]'); await p.waitForTimeout(400); return dl; };
  const openForm = async () => { if (await p.$('#nextinv')) { await p.click('#nextinv'); await p.waitForSelector('#mkinv'); } };

  const errors = []; p.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); }); p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  p.on('dialog', d => d.accept());
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.costing.charge_tins = false; window.__qcApp.store.save(); }); // the arithmetic checks below are about the lines themselves
  ok(await p.$('#newjob'), 'home renders with New job');
  ok(await p.evaluate(() => { let m = 0, who = ''; document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.right > m) { m = r.right; who = e.tagName + '.' + e.className; } }); if (m > innerWidth + 1) console.log('OVERFLOW ' + who + ' right=' + m); return m <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }), 'no horizontal overflow on home');
  // service worker
  const sw = await p.evaluate(() => navigator.serviceWorker.ready.then(r => !!r.active, () => false));
  ok(sw, 'service worker active');
  const man = await p.evaluate(() => fetch('manifest.webmanifest').then(r => r.json()).then(j => j.name).catch(() => null));
  ok(man, 'manifest loads: ' + man);
  // ---- settings
  await p.click('a[data-nav="settings"]'); await p.waitForSelector('[data-bind="details.trading_name"]');
  await p.fill('[data-bind="details.trading_name"]', 'Test Painting Co'); await p.fill('[data-bind="details.owner_name"]', 'Sam Tester');
  await p.fill('[data-bind="details.phone"]', '0400 000 000'); await p.fill('[data-bind="details.email"]', 'sam@example.com'); await p.fill('[data-bind="details.abn"]', '12 345 678 901');
  await p.fill('[data-bind="details.account_name"]', 'Test Painting Co'); await p.fill('[data-bind="details.bsb"]', '063-000'); await p.fill('[data-bind="details.account_number"]', '12345678');
  await p.fill('[data-price="p_walls"]', '20'); await p.fill('[data-bind="details.postcode"]', '5000');
  ok(await p.evaluate(() => { let m = 0, who = ''; document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.right > m) { m = r.right; who = e.tagName + '.' + e.className; } }); if (m > innerWidth + 1) console.log('OVERFLOW ' + who + ' right=' + m); return m <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }), 'no horizontal overflow on settings');
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('[data-bind="details.trading_name"]');
  ok((await p.inputValue('[data-bind="details.trading_name"]')) === 'Test Painting Co', 'settings persist after reload');
  ok((await p.inputValue('[data-price="p_walls"]')) === '20', 'price edit persists');
  // ---- new job
  await p.click('a[data-nav="home"]'); await p.click('#newjob'); await p.waitForSelector('[data-bind="client.name"]');
  await p.fill('[data-bind="client.name"]', 'Jane Client'); await p.fill('[data-bind="client.phone"]', '0411 222 333'); await p.fill('[data-bind="client.email"]', 'jane@example.com');
  await p.fill('[data-bind="client.address"]', '12 Wattle St Ringwood'); await p.fill('[data-bind="summary"]', 'Repaint lounge and hall');
  const jobUrl = p.url();
  // typed room: lounge 5x4x2.4, 1 door, 2 windows, fair
  await p.click('[data-add="interior"]'); await p.waitForSelector('[data-bind="L"]');
  await p.fill('[data-bind="name"]', 'Lounge'); await p.fill('[data-bind="L"]', '5'); await p.fill('[data-bind="W"]', '4'); await p.fill('[data-bind="H"]', '2.4');
  await p.fill('[data-bind="doors"]', '1'); await p.fill('[data-bind="windows"]', '2'); await p.selectOption('[data-bind="condition"]', 'fair');
  const prev = await p.$eval('#preview', e => e.innerText);
  // walls: 2*(9)*2.4=43.2 -1.7 -3.0 = 38.5 ; ceiling 20 ; skirting 18-0.9=17.1 ; door 1 ; windows 2 ; prep 38.5/20=1.9 hr
  ok(/43\.2 m²/.test(prev), 'wall area 43.2 m², no deduction for painted openings (' + (prev.match(/[\d.]+ m²/g) || []).join(',') + ')');
  ok(/20 m²/.test(prev) && /17\.1 m\b/.test(prev) && /hour/.test(prev), 'ceiling 20, skirting 17.1 m, prep hours shown');
  // subtotal: 38.5*20=770 + 20*25=500 + 17.1*9=153.9→154 + 95 + 130 + 1.9*65=123.5→124 = 1673
  { const expRoom = await p.evaluate(() => { const S = window.__qcApp.store.load(), j = S.jobs[0], pr = window.__qcApp.pricing.priceJob(j, S); return pr.lines.filter(l => l.room === j.rooms[0].name).reduce((s, l) => s + l.amount, 0).toFixed(2); }); ok(prev.replace(/\n/g, ' ').indexOf(Number(expRoom).toLocaleString('en-AU', { minimumFractionDigits: 2 })) >= 0, 'room subtotal matches the engine (' + expRoom + ')'); }
  ok(await p.evaluate(() => { let m = 0, who = ''; document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.right > m) { m = r.right; who = e.tagName + '.' + e.className; } }); if (m > innerWidth + 1) console.log('OVERFLOW ' + who + ' right=' + m); return m <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }), 'no horizontal overflow on room');
  await p.click('a.btn.tape:has-text("Done")'); await p.waitForSelector('#runtotal');
  // job total inc GST: 1673 * 1.1 = 1840.3 -> gst 167 -> 1840
  const run = await p.$eval('#runtotal', e => e.textContent); const engTot = await p.evaluate(() => { const S = window.__qcApp.store.load(), j = S.jobs[0]; return window.__qcApp.pricing.priceJob(j, S).total; }); ok(run === '$' + Number(engTot).toLocaleString('en-AU', { minimumFractionDigits: 2 }).replace(/\.00$/, '') || run === '$' + Number(engTot).toLocaleString('en-AU', { minimumFractionDigits: 2 }), 'running total matches the engine (' + engTot + ') got ' + run);
  // ---- measured room via sheet photo
  await p.click('[data-add="interior"]'); await p.waitForSelector('[data-bind="L"]');
  await p.fill('[data-bind="name"]', 'Hall'); await p.evaluate(() => { const S = window.__qcApp.store.load(); S.rules.round_up_cm = 0; window.__qcApp.store.save(); }); await p.click('[data-method="measured"]'); await p.waitForSelector('[data-part="photo"]');
  const t0 = Date.now();
  await p.setInputFiles('[data-part="photo"]', SP + '/mtest/photo.jpg');
  await p.waitForFunction(() => window.__qcMeasure && window.__qcMeasure.state.sheet && window.__qcMeasure.state.auto, null, { timeout: 120000 }); await p.evaluate(() => window.__qcMeasure.manual());
  const st = await p.evaluate(() => ({ status: document.querySelector('[data-part="status"]').textContent, markers: window.__qcMeasure.state.markers.length, reproj: window.__qcMeasure.state.sheet.e }));
  console.log('  detect ms', Date.now() - t0, st);
  ok(st.markers === 4, 'four markers found on phone');
  const wall = await p.evaluate(pts => { window.__qcMeasure.wall4(pts.map(q => ({ x: q[0], y: q[1] }))); return window.__qcMeasure.wall(); }, T.wall.corners);
  ok(wall && near(wall.w, 4000, 40) && near(wall.h, 2400, 24), 'wall 4 corners (sheet in shot, auto scale) -> ' + (wall ? wall.w.toFixed(0) + 'x' + wall.h.toFixed(0) : 'none'));
  await p.evaluate(({ a, b }) => { window.__qcMeasure.setMode('door'); window.__qcMeasure.place({ x: a[0], y: a[1] }); window.__qcMeasure.place({ x: b[0], y: b[1] }); }, { a: T.door.tl, b: T.door.br });
  await p.evaluate(({ a, b }) => { window.__qcMeasure.setMode('window'); window.__qcMeasure.place({ x: a[0], y: a[1] }); window.__qcMeasure.place({ x: b[0], y: b[1] }); }, { a: T.window.tl, b: T.window.br });
  const items = await p.evaluate(() => window.__qcMeasure.state.items.map(i => [i.type, Math.round(i.w), Math.round(i.h)]));
  console.log('  items', JSON.stringify(items));
  ok(items.length === 3, 'wall + door + window placed');
  await p.$eval('.stage', e => e.scrollIntoView({ block: 'center' })); await p.screenshot({ path: SP + '/apptest/stage.png' });
  await p.fill('[data-part="wallname"]', 'Window wall'); await p.click('[data-part="savewall"]');
  await p.waitForSelector('#walls table');
  const wtxt = await p.$eval('#walls', e => e.innerText); console.log('  walls table:', wtxt.replace(/\s+/g, ' ').slice(0, 160));
  ok(/Window wall/.test(wtxt), 'wall saved into the room');
  // paint area = 9.6 - 1.673 - 1.2 = 6.73
  const prev2 = await p.$eval('#preview', e => e.innerText);
  ok(/measured \(photo/.test(prev2), 'preview marks source as measured: ' + (prev2.match(/measured[^\n]*/) || [''])[0]);
  // second wall via wall4 again (uses same photo, ok)
  // (second wall skipped)
  ok(await p.evaluate(() => { let m = 0, who = ''; document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.right > m) { m = r.right; who = e.tagName + '.' + e.className; } }); if (m > innerWidth + 1) console.log('OVERFLOW ' + who + ' right=' + m); return m <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }), 'no horizontal overflow on measured room');
  await p.screenshot({ path: SP + '/apptest/room-measured.png' });
  // LiDAR import
  await p.setInputFiles('#lidar', SP + '/mtest/Room.json'); await p.waitForTimeout(400);
  const wtxt2 = await p.$eval('#walls', e => e.innerText); ok(/LiDAR/.test(wtxt2), 'LiDAR walls imported: ' + (wtxt2.match(/Scanned wall \d/g) || []).length + ' walls');
  await p.click('a.btn.tape:has-text("Done")'); await p.waitForSelector('#runtotal');
  // ---- quote
  await p.click('a:text-matches("Build the quote|Open the quote")'); await p.waitForSelector('#pdf');
  const qtxt = await p.$eval('#app', e => e.innerText);
  ok(/1 of 2 rooms measured/.test(qtxt), 'quote says 1 of 2 rooms measured');
  ok(/Total inc GST/.test(qtxt), 'quote shows total inc GST');
  ok(await p.evaluate(() => { let m = 0, who = ''; document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.right > m) { m = r.right; who = e.tagName + '.' + e.className; } }); if (m > innerWidth + 1) console.log('OVERFLOW ' + who + ' right=' + m); return m <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }), 'no horizontal overflow on quote');
  await p.screenshot({ path: SP + '/apptest/quote.png', fullPage: true });
  // PDF: build directly and check size, then click button and catch download
  const pdfInfo = await p.evaluate(() => { const app = window.__qcApp; const job = app.store.load().jobs[0]; const S = app.store.load(); const pr = app.pricing.priceJob(job, S); job.quote = job.quote || { date: app.store.today() }; const d = QCPdf.quotePDF(job, S, pr); const out = d.output('arraybuffer'); return { bytes: out.byteLength, pages: d.getNumberOfPages(), head: String.fromCharCode.apply(null, new Uint8Array(out.slice(0, 5))) }; });
  ok(pdfInfo.head === '%PDF-' && pdfInfo.bytes > 5000, 'quote PDF generated ' + JSON.stringify(pdfInfo));
  await p.click('#pdf'); await p.waitForSelector('#qcv_send'); ok(true, 'Send opens the quote on screen first (viewer with Close and Send)');
  const statusPre = await p.evaluate(() => ({ s: window.__qcApp.store.load().jobs[0].status, d: window.__qcApp.store.load().jobs[0].sent_date })); ok(statusPre.s === 'draft' && !statusPre.d, 'nothing marked sent while only looking: ' + JSON.stringify(statusPre));
  const dl = await sendDoc(null);
  ok(dl, 'Send hands the quote to the phone (a file here): ' + (dl && dl.suggestedFilename()));
  if (dl) { const fp = SP + '/apptest/' + dl.suggestedFilename(); await dl.saveAs(fp); console.log('  saved', fp, fs.statSync(fp).size); }
  await p.waitForSelector('#accepted');
  const status1 = await p.evaluate(() => { const j = window.__qcApp.store.load().jobs[0]; return j.status + ':' + j.sent_how + ':' + (j.sent_date ? 'dated' : 'nodate'); }); ok(status1 === 'quoted:text:dated', 'status quoted, by text, dated after Yes, by text: ' + status1);
  ok(/Sent to .* by text, \d+ \w+/.test(await p.$eval('#sentfoot', e => e.textContent)), 'footer says Sent to <name> by text, <date>');
  await p.click('#accepted'); await p.waitForSelector('a:has-text("Invoice")');
  // ---- invoice deposit
  await p.click('a:has-text("Invoice")'); await p.waitForSelector('#mkinv');
  const qTotal = await p.evaluate(() => window.__qcApp.store.load().jobs[0].quote.total);
  const dep = await p.$eval('[data-inv="0"]', e => e.innerText); console.log('  drafted deposit row', dep.replace(/\s+/g, ' ')); ok(/Written when the quote was accepted\. Not sent yet\./.test(dep) && /Deposit/.test(dep), 'the deposit invoice was drafted when the quote was accepted');
  const depAmt = await p.evaluate(() => { const j = window.__qcApp.store.load().jobs[0]; return window.__qcApp.depositFor(j, j.quote.total).amount; }); const depPct = await p.evaluate(() => window.__qcApp.store.load().details.deposit_pct);
  ok(depAmt > 0 && dep.indexOf(depAmt.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) >= 0, 'deposit total = ' + depPct + '% of ' + qTotal + ' = ' + depAmt);
  const dl2 = await sendDoc('[data-sendinv="0"]');
  ok(dl2, 'deposit invoice handed over: ' + (dl2 && dl2.suggestedFilename()));
  ok(!(await p.$('#newinv:not([hidden])')) && !!(await p.$('#nextinv')), 'no second invoice form opens by itself; a Next invoice button instead');
  await p.waitForSelector('[data-paid]'); await p.click('[data-paid]'); await p.click('[data-paygo]'); await p.waitForSelector('.pill:has-text("paid")');
  const pay1 = await p.evaluate(() => { const i = window.__qcApp.store.load().jobs[0].invoices[0]; return { n: i.payments.length, amt: i.payments[0] && i.payments[0].amount, method: i.payments[0] && i.payments[0].method, paid: i.paid_date, total: i.total }; }); ok(pay1.n === 1 && Math.abs(pay1.amt - pay1.total) < 0.005 && pay1.method === 'transfer' && pay1.paid, 'deposit payment recorded in full by transfer: ' + JSON.stringify(pay1));
  // final with variation
  await p.evaluate(() => { const st = window.__qcApp.store, j = st.load().jobs[0]; j.variations.push({ id: st.uid(), n: 1, date: st.today(), desc: 'Extra door', amount: 100, how_agreed: 'text', agreed_date: st.today(), status: 'agreed', invoiced: false }); st.save(); }); await p.click('a[href$="/quote"]'); await p.waitForSelector('#pdf'); await p.click('a:has-text("Invoice")'); await p.waitForSelector('#nextinv'); await openForm(); await p.selectOption('#kind', 'final');
  const fin = await p.$eval('#invprev', e => e.innerText); console.log('  final preview', fin.replace(/\s+/g, ' '));
  const st2 = await p.evaluate(() => { const j = window.__qcApp.store.load().jobs[0]; return { sub: j.quote.subtotal, total: j.quote.total, depTotal: j.invoices[0].total }; });
  const expTot = Math.round((st2.total + 110 - st2.depTotal) * 100) / 100;
  ok(new RegExp('Total\\s*\\$' + expTot.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[.]/g, '\\.')).test(fin) && /Variation 1: Extra door, agreed by text/.test(fin) && /Less deposit paid, INV-/.test(fin), 'final total = quote + variation inc GST - deposit, names the deposit invoice, expected $' + expTot);
  ok(/This will bill \$[\d,.]+ of \$[\d,.]+/.test(await p.$eval('#billline', e => e.textContent)), 'bold This will bill $X of $Y line when it is not the whole amount: ' + await p.$eval('#billline', e => e.textContent));
  const dl3 = await sendDoc('#mkinv');
  ok(dl3, 'final invoice handed over: ' + (dl3 && dl3.suggestedFilename()));
  await p.waitForSelector('[data-paid]');
  // ---- chase: backdate the final invoice, plus a second job quoted 10 days ago
  await p.evaluate(() => { const S = window.__qcApp.store.load(); const j = S.jobs[0]; j.invoices[1].due = window.__qcApp.store.addDays(window.__qcApp.store.today(), -12);
    const j2 = window.__qcApp.store.newJob(); j2.client = { name: 'Bob Waiting', phone: '0422 333 444', email: 'bob@example.com', address: '' }; j2.status = 'quoted'; j2.quote = { date: window.__qcApp.store.addDays(window.__qcApp.store.today(), -10), total: 2500, lines: [] }; j2.sent_date = j2.quote.date; window.__qcApp.store.save(); });
  await p.click('a[data-nav="chase"]'); await p.waitForSelector('h1:has-text("Follow-ups")');
  const ch = await p.$eval('#app', e => e.innerText); console.log('  chase:', ch.replace(/\s+/g, ' ').slice(0, 400));
  ok(/First reminder/.test(ch) && /12 days overdue/.test(ch), 'never-chased overdue invoice gets the friendly first reminder');
  ok(/Bob Waiting/.test(ch) && /waiting 10 days/.test(ch), 'quote waiting 10 days listed');
  const links = await p.$$eval('a.btn', as => as.map(a => a.getAttribute('href')).filter(h => /^(sms|mailto):/.test(h)));
  console.log('  chase cards: ' + JSON.stringify(await p.$$eval('#app .card', cs => cs.map(c => c.innerText.split('\n').slice(0, 3).join(' / ').slice(0, 140))))); ok(links.some(h => h.startsWith('sms:0411222333?&body=Hi%20Jane')), 'sms link to Jane: ' + JSON.stringify(links.filter(h => h.startsWith('sms:')).map(h => h.slice(0, 60))));
  ok(links.some(h => h.startsWith('mailto:jane@example.com?subject=')), 'mailto link to Jane');
  ok(await p.evaluate(() => { let m = 0, who = ''; document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.right > m) { m = r.right; who = e.tagName + '.' + e.className; } }); if (m > innerWidth + 1) console.log('OVERFLOW ' + who + ' right=' + m); return m <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }), 'no horizontal overflow on chase');
  await p.screenshot({ path: SP + '/apptest/chase.png', fullPage: true });
  await p.click('[data-chased]'); await p.waitForSelector('text=chased today');
  // ---- export / import round trip
  await p.click('a[data-nav="settings"]'); await p.waitForSelector('#export');
  const exp = await p.evaluate(() => window.__qcApp.store.exportAll()); ok(JSON.parse(exp).jobs.length === 2, 'export has 2 jobs');
  await p.evaluate(() => { localStorage.clear(); }); await p.reload({ waitUntil: 'load' }); await p.click('a[data-nav="home"]');
  ok(/Nothing to chase yet/.test(await p.$eval('#app', e => e.innerText)), 'wiped state shows empty, and the way to start');
  await p.click('a[data-nav="settings"]'); await p.waitForSelector('#import');
  const backupFile = require('path').join(require('os').tmpdir(), 'qc-e2e-backup.json');
  fs.writeFileSync(backupFile, exp); await p.setInputFiles('#import', backupFile);
  // the file is read asynchronously: go Home once the jobs are actually in, or Home renders the empty state
  await p.waitForFunction(() => window.__qcApp.store.load().jobs.length === 2, null, { timeout: 15000 }).catch(() => {});
  // reload rather than routing: what matters is that the backup is on the phone, not which screen was mid-render
  await p.goto(base + '#/', { waitUntil: 'load' }); const home = await p.$eval('#app', e => e.innerText); ok(/Jane Client/.test(home) && /Bob Waiting/.test(home), 'import restores both jobs');
  await p.screenshot({ path: SP + '/apptest/home.png' });
  // ---- offline: go offline and reload
  await ctx.setOffline(true); try { await p.reload({ waitUntil: 'load' }); ok(await p.$('#newjob'), 'app loads offline from service worker cache'); } catch (e) { ok(false, 'offline reload: ' + e.message); } await ctx.setOffline(false);
  // exterior room + extras + travel + minimum job
  await p.click('#newjob'); await p.waitForSelector('[data-add="exterior"]'); await p.click('[data-add="exterior"]'); await p.waitForSelector('[data-bind="ext.fence"]');
  await p.fill('[data-bind="ext.fence"]', '10'); const pe = await p.$eval('#preview', e => e.innerText); ok(/\$220/.test(pe), 'exterior fence 10 m² = $220');
  await p.click('a.btn.tape:has-text("Done")'); await p.waitForSelector('#runtotal'); const rt = await p.$eval('#runtotal', e => e.textContent); ok(rt === '$660', 'minimum job 600 + GST = $660, got ' + rt);
  await p.click('#addextra'); await p.fill('[data-xk="desc"]', 'Garage door'); await p.fill('[data-xk="rate"]', '300'); await p.fill('[data-bind="travel_km"]', '20');
  const rt2 = await p.$eval('#runtotal', e => e.textContent); { const expT = await p.evaluate(() => { const S = window.__qcApp.store.load(), id = (location.hash.match(/#\/job\/([^\/]+)/) || [])[1], j = S.jobs.find(x => x.id === id) || S.jobs[0]; return window.__qcApp.pricing.priceJob(j, S).total; }); const fmt = '$' + Number(expT).toLocaleString('en-AU', { minimumFractionDigits: 2 }); ok(rt2 === fmt || rt2 === fmt.replace(/\.00$/, ''), 'fence + extra + travel matches the engine (' + fmt + ') got ' + rt2); }
  ok(errors.length === 0, 'no page errors (' + errors.length + ')');
  await b.close(); srv.close();
  console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
