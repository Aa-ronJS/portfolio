const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const __JOINED = () => { try { const k = 'qc-app-v1', raw = localStorage.getItem(k); const s = raw ? JSON.parse(raw) : {}; s.account = Object.assign({ email: 'test@example.com', joined: '2026-01-01', verified: true }, s.account || {}); s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }; // the app asks for an email before it opens; these suites are about what comes after
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..'), SP = require('path').join(__dirname, '..'), M = SP + '/mtest';
const T = JSON.parse(fs.readFileSync(M + '/truth2.json', 'utf8')); const pt = a => ({ x: a[0], y: a[1] });
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'application/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true }); const p = await ctx.newPage(); await p.addInitScript(__JOINED); await p.addInitScript(__OPEN_SEC);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  await p.goto(base, { waitUntil: 'load' });
  // settings: business, postcode, stripe (mocked), follow-ups
  await p.click('a[data-nav="settings"]'); await p.waitForSelector('[data-bind="details.trading_name"]');
  await p.fill('[data-bind="details.trading_name"]', 'Test Painting Co'); await p.fill('[data-bind="details.owner_name"]', 'Sam'); await p.fill('[data-bind="details.bsb"]', '063-000'); await p.fill('[data-bind="details.account_number"]', '12345678'); await p.fill('[data-bind="details.account_name"]', 'Test Painting Co');
  ok((await p.inputValue('[data-bind="details.postcode"]')) === '' && /5000/.test(await p.getAttribute('[data-bind="details.postcode"]', 'placeholder')), 'business postcode blank by default with a placeholder'); await p.fill('[data-bind="details.postcode"]', '5000'); await p.fill('[data-bind="details.abn"]', '12 345 678 901');
  const before = await p.inputValue('[data-price="p_walls"]'); await p.click('#derive'); await p.waitForSelector('[data-price="p_walls"]'); const after = await p.inputValue('[data-price="p_walls"]');
  const expect = await p.evaluate(() => QCCosting.deriveRates(window.__qcApp.store.load().costing).p_walls); ok(after !== '' && +after === expect, `derive rates fills price list: walls ${before} -> ${after} (formula ${expect})`);
  await p.fill('#fu_q', '2, 5, 12'); await p.fill('[data-bind="stripe.key"]', 'rk_test_ABCDEFGHIJKLMNOP1234'); await p.check('[data-bind="stripe.enabled"]');
  // mock stripe fetch
  await p.evaluate(() => { window.__qcFetch = function (url, opts) { window.__stripeCalls = (window.__stripeCalls || []).concat([[url, opts && opts.body]]); var j; if (/\/prices$/.test(url)) j = { id: 'price_1' }; else if (/\/payment_links$/.test(url)) j = { id: 'plink_1', url: 'https://buy.stripe.com/test_abc' }; else if (/checkout\/sessions/.test(url)) j = { data: window.__paidYet ? [{ payment_status: 'paid', amount_total: 63500, created: 1758000000, customer_details: { email: 'jane@example.com' } }] : [] }; else j = { error: { message: 'unexpected ' + url } }; if (j.data && j.data[0] && window.__invCents) j.data[0].amount_total = window.__invCents; return Promise.resolve({ ok: !j.error, status: j.error ? 400 : 200, json: function () { return Promise.resolve(j); } }); }; });
  // quick quote
  await p.click('a[data-nav="home"]'); await p.waitForSelector('#quick'); await p.click('#quick'); await p.waitForSelector('[data-method="measured"]'); await p.click('[data-method="measured"]'); await p.waitForSelector('[data-part="photo"]');
  ok(!!(await p.$('a:has-text("Done, build the quote")')), 'quick quote opens the camera room with a Done, build the quote button');
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.rules.round_up_cm = 0; window.__qcApp.store.save(); });
  await p.setInputFiles('[data-part="photolib"]', M + '/photo2.jpg'); await p.waitForFunction(() => window.__qcMeasure && window.__qcMeasure.state.img && window.__qcMeasure.state.auto); await p.evaluate(() => window.__qcMeasure.manual());
  await p.evaluate(pts => { window.__qcMeasure.wall4(pts); window.__qcMeasure.scale('ceiling', 2400); }, T.wall.corners.map(pt));
  ok(/Wall measured/.test(await p.$eval('[data-part="steptitle"]', e => e.textContent)), 'after sizing, a Save this wall step is shown');
  // leave WITHOUT saving: auto-save must catch it
  await p.click('a:has-text("Done, build the quote")'); await p.waitForSelector('#pdf');
  const walls = await p.evaluate(() => window.__qcApp.store.load().jobs[0].rooms[0].walls.length); ok(walls === 1, 'wall auto-saved when leaving the room without pressing Save (' + walls + ')');
  ok(!!(await p.$('[data-bind="client.name"]')), 'quote page asks for client details when missing');
  await p.fill('[data-bind="client.name"]', 'Jane Client'); await p.fill('[data-bind="client.phone"]', '0411 222 333');
  await p.fill('[data-bind="client.address"]', '12 Main St Gawler SA 5118'); await p.waitForSelector('#pdf');
  const txt = await p.$eval('#app', e => e.innerText);
  ok(/Travel/.test(txt) && /5118/.test(txt), 'travel line from postcode 5118 vs 5000: ' + (txt.match(/Travel[^\n]*/) || [''])[0].slice(0, 90));
  const tr = await p.evaluate(() => QCGeo.travel(window.__qcApp.store.load().jobs[0], window.__qcApp.store.load()));
  const trRate = await p.evaluate(() => window.__qcApp.store.load().rules.travel_per_km); const trUnit = Math.max(0, tr.chargeable) * trRate * 2, trMult = trUnit ? tr.amount / trUnit : 0;
  ok(tr.km > 30 && tr.km < 60 && tr.amount > 0 && Math.abs(trMult - Math.round(trMult)) < 0.02, `Gawler about ${tr.km} km, charge $${tr.amount} for ${tr.chargeable} km each way at $${trRate}/km (x${Math.round(trMult)} day${Math.round(trMult) === 1 ? '' : 's'})`);
  ok(!/Margin/.test(txt) && !!(await p.$('#showcost')), 'private costing hidden behind Show my costs'); await p.click('#showcost'); const txt2 = await p.$eval('#app', e => e.innerText); ok(/hours/.test(txt2) && /Margin/.test(txt2) && /Not on .* copy/.test(txt2), 'Show my costs reveals hours and margin');
  await p.screenshot({ path: SP + '/apptest/flow-quote.png', fullPage: true });
  // send
  await p.click('#pdf'); await p.waitForSelector('#qcv_send', { timeout: 10000 }); const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.click('#qcv_send')]); ok(dl && /Q-1001/.test(dl.suggestedFilename()), 'Send quote produces the PDF'); await p.waitForSelector('#didgo', { timeout: 10000 }); await p.click('#didgo [data-didgo="text"]'); await p.waitForTimeout(400); ok((await p.evaluate(() => window.__qcApp.store.load().jobs[0].sent_how)) === 'text', 'quote marked sent by text after the Did-it-go answer');
  await p.waitForSelector('#remind'); const [ics] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.click('#remind')]);
  if (ics) { const fp = SP + '/apptest/followup.ics'; await ics.saveAs(fp); const t = fs.readFileSync(fp, 'utf8'); const n = (t.match(/BEGIN:VEVENT/g) || []).length; ok(n === 3 && /VALARM/.test(t) && /Follow up quote Q-1001/.test(t), 'follow-up ics has 3 events with alarms at 2, 5, 12 days (' + n + ')'); const dates = [...t.matchAll(/DTSTART:(\d{8})T/g)].map(m => m[1]); console.log('  reminder dates', dates.join(', ')); } else ok(false, 'follow-up ics download');
  // accept + book
  await p.click('#accepted'); await p.waitForSelector('#book'); await p.click('#book'); await p.fill('#bk_start', '2026-10-05'); await p.fill('#bk_days', '2');
  const [bics] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.click('#bk_go')]);
  if (bics) { const fp = SP + '/apptest/booking.ics'; await bics.saveAs(fp); const t = fs.readFileSync(fp, 'utf8'); ok(/DTSTART;VALUE=DATE:20261005/.test(t) && /DTEND;VALUE=DATE:20261007/.test(t) && /Painting: Jane Client/.test(t) && /LOCATION:12 Main St Gawler SA 5118/.test(t), 'booking ics is a 2-day all-day event with address'); } else ok(false, 'booking ics download');
  await p.waitForSelector('text=Booked'); const bk = await p.evaluate(() => window.__qcApp.store.load().jobs[0].booking); ok(bk && bk.start === '2026-10-05' && /calendar\.google\.com/.test(bk.gcal), 'booking stored with a Google Calendar link');
  // invoice with stripe link
  await p.click('a:has-text("Invoice")'); await p.waitForSelector('#mkinv'); await p.selectOption('#kind', 'final'); await p.evaluate(() => { const j = window.__qcApp.store.load().jobs[0]; window.__invCents = Math.round(j.quote.total * 100); });
  await p.click('#mkinv'); await p.waitForSelector('#qcv_send', { timeout: 10000 }); const [idl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.click('#qcv_send')]); await p.waitForSelector('#didgo', { timeout: 10000 }); await p.click('#didgo [data-didgo="text"]'); await p.waitForTimeout(400);
  await p.waitForSelector('#checkpay');
  const inv = await p.evaluate(() => window.__qcApp.store.load().jobs[0].invoices[0]); ok(inv.pay_url === 'https://buy.stripe.com/test_abc' && inv.pay_link_id === 'plink_1', 'invoice carries the Stripe payment link');
  const calls = await p.evaluate(() => window.__stripeCalls); ok(calls.length === 2 && /unit_amount=/.test(calls[0][1]) && /line_items%5B0%5D%5Bprice%5D=price_1/.test(calls[1][1]), 'Stripe called for a price then a payment link: ' + calls.map(c => c[0].split('/v1/')[1]).join(', '));
  const pdfHasLink = await p.evaluate(() => { const S = window.__qcApp.store.load(), j = S.jobs[0]; const d = QCPdf.invoicePDF(j, j.invoices[0], S); const ab = d.output('arraybuffer'); let str = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i++) str += String.fromCharCode(u[i]); return str.indexOf('buy.stripe.com') >= 0; }); ok(pdfHasLink, 'invoice PDF contains the card link');
  await p.click('#checkpay'); await p.waitForTimeout(300); ok(!(await p.evaluate(() => window.__qcApp.store.load().jobs[0].invoices[0].paid_date)), 'check payments: nothing paid yet');
  await p.evaluate(() => { window.__paidYet = true; }); await p.click('#checkpay'); await p.waitForTimeout(300);
  const st = await p.evaluate(() => { const j = window.__qcApp.store.load().jobs[0]; return [j.invoices[0].paid_date, j.invoices[0].paid_by, j.status, (j.invoices[0].payments || []).map(x => x.method + ':' + x.amount).join(',')]; }); ok(st[0] && st[1] === 'card' && st[2] === 'paid' && /^card:/.test(st[3]), 'check payments records a card payment, marks invoice paid and job paid: ' + st.join(' '));
  // chase text carries card link for unpaid invoice
  await p.evaluate(() => { const S = window.__qcApp.store.load(); const j = S.jobs[0]; j.invoices[0].paid_date = ''; j.invoices[0].payments = []; j.status = 'invoiced'; j.invoices[0].due = window.__qcApp.store.addDays(window.__qcApp.store.today(), -5); window.__qcApp.store.save(); });
  await p.click('a[data-nav="chase"]'); await p.waitForSelector('h1:has-text("Follow-ups")'); const ch = await p.$eval('#app', e => e.innerText); ok(/Pay by card: https:\/\/buy\.stripe\.com/.test(ch), 'reminder text includes the card link');
  await p.screenshot({ path: SP + '/apptest/flow-chase.png', fullPage: true });
  await p.click('a[data-nav="settings"]'); await p.waitForSelector('#derive'); await p.screenshot({ path: SP + '/apptest/flow-settings.png', fullPage: true });
  ok(await p.evaluate(() => { let m = 0; document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.right > m) m = r.right; }); return m <= innerWidth + 1; }), 'no horizontal overflow on settings');
  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
