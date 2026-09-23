const __WALLDONE = () => { const st = window.__qcApp.store, S = st.load(); S.details.trading_name = S.details.trading_name || 'Test Painting Co'; if (!/\d{11}/.test(String(S.details.abn || '').replace(/\D/g, ''))) S.details.abn = '12 345 678 901'; S.details.state = S.details.state || 'SA'; S.security.setup_done = true; S.payment = S.payment || { account_name: 'Test', bsb: '063-000', account_number: '12345678' }; st.save(); };
const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
// Invoice guards and money flow: kinds offered per state, 3x rule, ABN block, deposit + progress + final = quote, payments and balance, void, credit note, refund, reopen, quote revisions and lock.
const __JOINED = () => { try { const k = 'qc-app-v1', raw = localStorage.getItem(k); const s = raw ? JSON.parse(raw) : {}; s.account = Object.assign({ email: 'test@example.com', joined: '2026-01-01', verified: true }, s.account || {}); s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }; // the app asks for an email before it opens; these suites are about what comes after
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const near = (a, b) => Math.abs(a - b) < 0.006;
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true }); const p = await ctx.newPage(); await p.addInitScript(__JOINED); await p.addInitScript(__OPEN_SEC);
  const errors = []; p.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); }); p.on('dialog', d => d.accept());
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(__WALLDONE).catch(() => {});
  await p.evaluate(() => { window.__toasts = []; const t = document.getElementById('toast'); new MutationObserver(() => { if (!t.hidden && t.textContent) window.__toasts.push(t.textContent); }).observe(t, { childList: true, attributes: true, characterData: true, subtree: true }); });
  // seed: three frozen quotes (accepted, declined, quoted), 10% deposit in NSW (cap 10%, so nothing is trimmed), GST on
  const ids = await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); Object.assign(S.details, { trading_name: 'T', abn: '12 345 678 901', deposit_pct: 10, gst: true, state: 'NSW' }); const mk = (status) => { const j = st.newJob(); j.client = { name: 'Guard Person', phone: '0411 000 000', email: '', address: '1 St Adelaide 5000', type: 'homeowner', first_name: '', abn: '', bill_to: '' }; const r = st.newRoom('interior'); r.L = 4; r.W = 3; j.rooms = [r]; const pr = window.__qcApp.priceLive(j); j.quote = { date: st.today(), version: 1, number: j.quote_no, history: [], lines: pr.lines, options: [], subtotal: pr.subtotal, gst: pr.gst, total: pr.total, deposit: pr.deposit, deposit_pct: pr.deposit_pct, assumptions: pr.assumptions }; j.sent_date = st.today(); j.status = status; return j; }; const a = mk('accepted'), d = mk('declined'), q = mk('quoted'); st.save(); return { a: a.id, d: d.id, q: q.id, total: a.quote.total, qno: a.quote_no }; });
  await p.evaluate(__WALLDONE).catch(() => {});
  const text = () => p.$eval('#app', e => e.innerText); const kinds = () => p.$$eval('#kind option', os => os.map(o => o.value)).catch(() => []);
  const lastToast = () => p.evaluate(() => window.__toasts[window.__toasts.length - 1] || '');
  const lastBlock = () => p.$eval('#invblock', e => e.textContent).catch(() => ''); // blocking messages sit inline next to the button now, not in a toast
  // A2: a document now opens on screen first, then Send hands it to the phone (a download here), then the app asks "Did it go?"; answer Yes, by text
  const sendDoc = async (clickSel) => { if (clickSel) await p.click(clickSel); const v = await p.waitForSelector('#qcv_send', { timeout: 4000 }).catch(() => null); if (!v) return null; const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.click('#qcv_send')]); await p.waitForSelector('#didgo', { timeout: 10000 }); await p.click('#didgo [data-didgo="text"]'); await p.waitForTimeout(400); return dl; };
  const openForm = async () => { if (await p.$('#nextinv')) { await p.click('#nextinv'); await p.waitForSelector('#mkinv'); } };

  const nav = async (h) => { await p.goto(base + h, { waitUntil: 'load' }); await p.evaluate(__WALLDONE).catch(() => {}); await p.evaluate(() => window.__qcApp.route()); await p.waitForTimeout(250); }; // same-URL goto does not re-render, so route() after it
  await p.evaluate(__WALLDONE).catch(() => {});
  const job = (id) => p.evaluate(id => JSON.parse(JSON.stringify(window.__qcApp.store.load().jobs.find(j => j.id === id))), id);
  const invs = async (id) => (await job(id)).invoices.map(i => ({ kind: i.kind, total: i.total, no: i.no, paid: i.paid_date, void: !!i.void, pays: (i.payments || []).length, dep: i.deposit_invoice_no || '' }));
  const mkinv = async (kind, before) => { await openForm(); await p.selectOption('#kind', kind); if (before) await before(); await sendDoc('#mkinv'); await p.waitForTimeout(600); return invs(ids.a); };
  // ---- bounces
  await nav('#/job/' + ids.d + '/invoice'); ok(/\/quote$/.test(await p.evaluate(() => location.hash)), 'declined job: invoice bounces to quote'); ok(/declined/i.test(await lastToast()), 'declined bounce explains itself: ' + await lastToast());
  await nav('#/job/' + ids.q + '/invoice'); ok(/\/quote$/.test(await p.evaluate(() => location.hash)) && /accepted first/i.test(await lastToast()), 'quoted job: invoice bounces, says mark accepted first');
  // ---- kinds on a fresh accepted job
  await nav('#/job/' + ids.a + '/invoice'); let k = await kinds(); ok(JSON.stringify(k) === '["deposit","progress","final"]', 'fresh job offers deposit / progress / final: ' + JSON.stringify(k));
  ok(/Deposit, 10% of the quote/.test(await text()), 'deposit kind names the percentage');
  // ---- an invoice with no ABN is no longer a thing that can happen: the set-up wall asks for one before
  // anything, and clearing it puts him straight back there rather than letting an invoice go out without it.
  // no reload here: a fresh page re-runs this suite's own seeding, which would put the ABN straight back
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.details.abn = ''; window.__qcApp.store.save(); location.hash = '#/'; });
  await p.waitForTimeout(300); await p.evaluate(() => window.__qcApp.route()); await p.waitForTimeout(400);
  const walled = await p.$eval('#app', e => e.innerText);
  ok(/Your ABN/.test(walled) && /of 5/.test(walled), 'clearing the ABN puts him back at set-up, so no invoice can be raised without one');
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.details.abn = '12 345 678 901'; window.__qcApp.store.save(); });
  let list;
  // ---- 3x rule through an agreed variation
  await p.evaluate((id) => { const st = window.__qcApp.store, j = st.load().jobs.find(j => j.id === id); j.variations.push({ id: 'huge', n: 1, date: st.today(), desc: 'Huge extra', amount: Math.round(j.quote.total * 4), how_agreed: 'text', agreed_date: st.today(), status: 'agreed', invoiced: false }); st.save(); }, ids.a);
  await nav('#/job/' + ids.a + '/invoice'); list = await mkinv('final'); ok(list.length === 0 && /3×|three times/.test(await lastBlock()), 'final at 4x the quote is blocked: ' + await lastBlock());
  await p.evaluate((id) => { const st = window.__qcApp.store, j = st.load().jobs.find(j => j.id === id); j.variations = []; st.save(); }, ids.a);
  // ---- progress claim above what is left is blocked
  await nav('#/job/' + ids.a + '/invoice'); list = await mkinv('progress', async () => { await p.fill('#prog_amt', String(Math.round(ids.total * 2))); await p.waitForTimeout(150); }); ok(list.length === 0 && /left to claim/.test(await lastBlock()), 'progress claim over the quote is blocked: ' + await lastBlock());
  // ---- deposit, progress, final add up to the quote; final names the deposit invoice
  await nav('#/job/' + ids.a + '/invoice'); list = await mkinv('deposit'); ok(list.length === 1 && list[0].kind === 'deposit' && near(list[0].total, Math.round(ids.total * 10) / 100), 'deposit invoice = 10% of quote inc GST to the cent: ' + JSON.stringify(list));
  await nav('#/job/' + ids.a + '/invoice'); k = await kinds(); ok(JSON.stringify(k) === '["progress","final"]', 'after the deposit: progress and final offered: ' + JSON.stringify(k));
  list = await mkinv('progress', async () => { await p.fill('#prog_pct', '30'); await p.waitForTimeout(150); }); ok(list.length === 2 && list[1].kind === 'progress' && near(list[1].total, Math.round(ids.total * 30) / 100), 'progress claim = 30% of the quote: ' + JSON.stringify(list[1]));
  await nav('#/job/' + ids.a + '/invoice'); k = await kinds(); ok(JSON.stringify(k) === '["progress","final"]', 'any number of progress claims: still offered');
  const finPrev = await p.evaluate(async () => { document.getElementById('kind').value = 'final'; document.getElementById('kind').dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 50)); return document.getElementById('invprev').innerText; });
  ok(/Less deposit invoiced, INV-\d+ dated/.test(finPrev) && /Less progress claim invoiced, INV-\d+ dated/.test(finPrev), 'final preview names the deposit and progress invoices with dates');
  list = await mkinv('final'); const sum = list.reduce((s, i) => s + i.total, 0);
  ok(list.length === 3 && near(sum, ids.total), 'deposit + progress + final = quote total (' + list.map(i => i.total).join(' + ') + ' vs ' + ids.total + ')');
  ok(list[2].dep === list[0].no, 'final carries the deposit invoice number: ' + list[2].dep);
  ok(list.every((i, n) => i.no === 'INV-' + (2001 + n)), 'invoice numbers run in sequence: ' + list.map(i => i.no).join(', '));
  await nav('#/job/' + ids.a + '/invoice'); k = await kinds(); let t = await text(); ok(k.length === 0 && /Final invoice INV-2003 issued/.test(t), 'after the final: no more kinds, page names the final'); ok(/Record payment/.test(t) && /Statement/.test(t), 'invoice list has Record payment and Statement'); ok(/Sent to Guard Person by text/.test(t) && !/Not sent yet/.test(t), 'each invoice row says it was sent by text after the Did-it-go answer');
  ok((await job(ids.a)).status === 'invoiced', 'job status invoiced');
  // ---- payments: part payment, balance, paid, remove, overpay -> credit -> refund
  const fin = 2; const balBefore = list[fin].total;
  await p.click('[data-paid="' + fin + '"]'); await p.fill('#pay_amt_' + fin, String(Math.round(balBefore * 50) / 100)); await p.selectOption('#pay_how_' + fin, 'cash'); await p.fill('#pay_ref_' + fin, 'R1'); await p.click('[data-paygo="' + fin + '"]'); await p.waitForTimeout(300);
  let j = await job(ids.a); let fi = j.invoices[fin]; ok(fi.payments.length === 1 && fi.payments[0].method === 'cash' && fi.payments[0].ref === 'R1' && !fi.paid_date, 'part payment recorded by cash with a reference, not yet paid');
  t = await text(); ok(/part paid/.test(t) && /Balance \$/.test(t), 'list shows part paid and the balance');
  await p.click('[data-paid="' + fin + '"]'); const suggested = await p.inputValue('#pay_amt_' + fin); ok(near(parseFloat(suggested), balBefore - Math.round(balBefore * 50) / 100), 'next payment defaults to the balance: ' + suggested);
  await p.click('[data-paygo="' + fin + '"]'); await p.waitForTimeout(300); j = await job(ids.a); fi = j.invoices[fin]; ok(fi.paid_date && fi.payments.length === 2, 'second payment clears it: paid_date set');
  ok(j.status === 'invoiced', 'job stays invoiced while the deposit and progress claim are open');
  await p.click('[data-payrm="' + fin + ':1"]'); await p.waitForTimeout(300); j = await job(ids.a); fi = j.invoices[fin]; ok(!fi.paid_date && fi.payments.length === 1, 'removing a payment clears paid_date');
  // overpay the deposit
  await p.click('[data-paid="0"]'); await p.fill('#pay_amt_0', String(Math.round((list[0].total + 100) * 100) / 100)); await p.click('[data-paygo="0"]'); await p.waitForTimeout(300);
  ok(/more than this invoice/.test(await text()) && !!(await p.$('[data-splitno="0"]')), 'amount above the balance asks whether it was one payment for several invoices'); await p.click('[data-splitno="0"]'); await p.waitForTimeout(300);
  j = await job(ids.a); t = await text(); ok(j.invoices[0].paid_date && /Overpaid \$100\.00/.test(t) && /Credit on account \$100\.00/.test(t), 'overpayment shows as credit on the job');
  await nav('#/job/' + ids.a); ok(/Credit \$100\.00 on account/.test(await text()), 'job page mentions the credit');
  await nav('#/job/' + ids.a + '/invoice'); await p.click('#refund'); await p.fill('#rf_amt', '100'); await p.click('#rf_go'); await p.waitForTimeout(300);
  j = await job(ids.a); t = await text(); ok(!/Credit on account/.test(t) && j.invoices[0].payments.some(x => x.method === 'refund' && near(x.amount, -100)) && j.invoices[0].paid_date, 'refund recorded as a negative payment, credit gone, deposit still paid');
  // receipt button present per positive payment; PDF module may not have receiptPDF yet: must toast, not throw
  ok((await p.$$('[data-rcpt]')).length >= 2, 'a Receipt button per payment');
  await p.click('[data-rcpt="0:0"]'); const rv = await p.waitForSelector('#qcview', { timeout: 4000 }).catch(() => null); ok(rv && errors.length === 0, 'Receipt opens on screen first (viewer), never throws'); if (rv) { await p.click('#qcv_close'); await p.waitForSelector('#qcview', { state: 'detached' }); }
  // ---- void: progress claim has no payments -> void keeps its number, counts for nothing
  await p.click('[data-void="1"]'); await p.fill('#void_why_1', 'Claimed too early'); await p.click('[data-voidgo="1"]'); await p.waitForTimeout(300);
  j = await job(ids.a); t = await text(); ok(j.invoices[1].void && j.invoices[1].void.reason === 'Claimed too early' && j.invoices[1].no === 'INV-2002' && /void/.test(t), 'progress claim voided with reason, number kept');
  ok(!(await p.$('[data-paid="1"]')) && !(await p.$('[data-void="0"]')), 'no Record payment on a void invoice, no Void on a paid one');
  const owingTxt = (t.match(/Owing on this job: \$([\d,.]+)/) || [])[1]; ok(owingTxt && near(parseFloat(owingTxt.replace(/,/g, '')), list[2].total - Math.round(list[2].total * 50) / 100), 'owing excludes the void invoice: ' + owingTxt);
  // ---- credit note against the paid deposit
  await p.click('[data-cn="0"]'); await p.fill('#cn_amt_0', '50'); await p.fill('#cn_why_0', 'Goodwill'); await p.click('[data-cngo="0"]'); await p.waitForTimeout(300); const cnv = await p.waitForSelector('#qcview', { timeout: 4000 }).catch(() => null); ok(!!cnv, 'credit note opens on screen first'); if (cnv) { await p.click('#qcv_close'); await p.waitForSelector('#qcview', { state: 'detached' }); }
  j = await job(ids.a); t = await text(); ok(j.invoices[0].credit_notes.length === 1 && j.invoices[0].credit_notes[0].no === 'CN-1' && /Credit on account \$50\.00/.test(t) && errors.length === 0, 'credit note CN-1 issued, shows as credit, no throw');
  // ---- CSV exports exist and carry the numbers
  const csv = await p.evaluate(() => ({ i: window.__qcApp.exportInvoicesCsv(), p: window.__qcApp.exportPaymentsCsv(), j: window.__qcApp.exportJobsCsv() }));
  ok(/^InvoiceNumber,ContactName/.test(csv.i) && /INV-2001/.test(csv.i) && /VOID/.test(csv.i), 'invoices CSV has headers, numbers and VOID marking');
  ok(/^Date,InvoiceNumber/.test(csv.p) && /Refund/.test(csv.p) && /Credit note CN-1/.test(csv.p), 'payments CSV has the refund and the credit note');
  ok(/^QuoteNumber,QuoteVersion/.test(csv.j) && new RegExp(ids.qno).test(csv.j), 'jobs CSV lists the job');
  // ---- reopen a declined quote
  await nav('#/job/' + ids.d + '/quote'); ok(!!(await p.$('#reopen')) && !(await p.$('#accepted')), 'declined quote offers Reopen, not Accepted'); await p.click('#reopen'); await p.waitForSelector('#accepted'); ok((await job(ids.d)).status === 'quoted', 'reopened quote is quoted again');
  // ---- revision: change the job after sending, send again -> R2 with history; accept -> locked; revise -> unlocked
  const before = await job(ids.q); await p.evaluate((id) => { const st = window.__qcApp.store, j = st.load().jobs.find(j => j.id === id); j.rooms[0].L = 6; st.save(); }, ids.q);
  await nav('#/job/' + ids.q + '/quote'); t = await text(); ok(/With the changes since/.test(t) && /Sending issues revision 2/.test(t), 'changed quote warns that sending issues revision 2');
  ok(/Send revision 2/.test(await p.$eval('#pdf', e => e.textContent)), 'send button says Send revision 2');
  await sendDoc('#pdf'); await p.waitForTimeout(500);
  j = await job(ids.q); ok(j.quote.version === 2 && j.quote.number === j.quote_no + '-R2' && j.quote.history.length === 1 && j.quote.history[0].number === j.quote_no && near(j.quote.history[0].total, before.quote.total) && j.quote.total > before.quote.total, 'revision 2 issued: number -R2, old version in history');
  ok(j.quote.snapshot && Array.isArray(j.quote.snapshot.wording.included) && j.quote.snapshot.details.abn === '12 345 678 901', 'wording and details frozen with the quote');
  await nav('#/job/' + ids.q + '/quote'); t = await text(); ok(/Revision 2 of Q-/.test(t) && !/With the changes since/.test(t), 'quote page shows revision 2 with no pending changes');
    // send again with nothing changed: no new revision
  await sendDoc('#pdf'); await p.waitForTimeout(400); j = await job(ids.q); ok(j.quote.version === 2 && j.quote.history.length === 1, 'send again with no change keeps revision 2');
  await p.click('#accepted'); await p.waitForTimeout(300); j = await job(ids.q); ok(j.status === 'accepted' && j.acceptance && j.acceptance.date && j.acceptance.how === 'text', 'accepted with an acceptance record');
  const lockedTotal = j.quote.total; await p.evaluate((id) => { const st = window.__qcApp.store, j = st.load().jobs.find(j => j.id === id); j.rooms[0].L = 9; st.save(); }, ids.q);
  await nav('#/job/' + ids.q + '/quote'); t = await text(); ok(/Showing the quote as sent/.test(t) && !/With the changes since/.test(t) && !!(await p.$('#revise')), 'accepted quote is locked: renders the snapshot, offers Revise quote');
  await sendDoc('#pdf'); await p.waitForTimeout(400); j = await job(ids.q); ok(near(j.quote.total, lockedTotal) && j.quote.version === 2, 'Send again on a locked quote does not reprice');
  await p.click('#revise'); await p.waitForTimeout(300); j = await job(ids.q); ok(j.status === 'quoted', 'Revise quote sets it back to quoted');
  await nav('#/job/' + ids.q + '/quote'); ok(/Sending issues revision 3/.test(await text()), 'next send would be revision 3');
  // ---- cancel job keeps everything
  await nav('#/job/' + ids.a); await p.click('#canceljob'); await p.waitForTimeout(300); j = await job(ids.a); ok(j.status === 'cancelled' && j.invoices.length === 3 && /Cancelled/.test(await text()), 'cancelled job keeps its invoices and shows the pill');
  await nav('#/job/' + ids.a + '/invoice'); ok(/No new invoices on a cancelled job/.test(await text()), 'no new invoices on a cancelled job');
  ok(errors.length === 0, 'no page errors (' + errors.length + ')');
  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
