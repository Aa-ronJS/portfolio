// Getting paid by card, from the phone, with nothing to paste.
//
// Set-up offers one button; Stripe's own pages do the rest; an invoice then carries a Pay by card button drawn
// on his account; and when a customer pays it, the next sync ticks the invoice off and says so in money.
const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); };
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

const TOASTS = () => { window.__toasts = []; document.addEventListener('DOMContentLoaded', () => { const t = document.getElementById('toast'); if (!t) return; new MutationObserver(() => { const s = t.textContent; if (s && window.__toasts[window.__toasts.length - 1] !== s) window.__toasts.push(s); }).observe(t, { childList: true, characterData: true, subtree: true, attributes: true }); }); };

// A relay that answers about Connect and sync, and remembers what it was asked.
const MOCK = () => {
  const load = () => { try { return JSON.parse(sessionStorage.getItem('qccalls') || '[]'); } catch (e) { return []; } };
  window.__qcCalls = load();
  window.__connect = { ok: true, started: false, ready: false };
  window.__syncOut = { ok: true, now: new Date().toISOString(), changes: [], bookings: [], replies: [], payments: [] };
  window.__qcRelayFetch = (u, o) => {
    const b = JSON.parse(o.body); window.__qcCalls.push({ url: String(u), body: b });
    try { sessionStorage.setItem('qccalls', JSON.stringify(window.__qcCalls)); } catch (e) {}
    if (/\/connect$/.test(String(u))) return Promise.resolve({ json: () => Promise.resolve(window.__connect) });
    if (/\/sync$/.test(String(u))) return Promise.resolve({ json: () => Promise.resolve(window.__syncOut) });
    return Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
  };
};

const seed = () => {
  const st = window.__qcApp.store, S = st.load();
  S.account = { email: 'dave@example.com', joined: st.today(), verified: true };
  S.details.trading_name = "Dave's Painting"; S.details.abn = '12 345 678 901'; S.details.state = 'SA';
  S.details.email = 'dave@example.com'; S.details.phone = '0412 345 678';
  S.security.setup_done = true;
  S.payment = { account_name: "Dave's Painting", bsb: '063-000', account_number: '12345678' };
  S.sending = Object.assign({}, S.sending, { server: 'https://relay.example/api/msg', hosted: true, token: 'qc1.eyJ2IjoxfQ.sig', server_has_creds: true });
  // one job with one invoice out, which is what a card button is for
  const j = st.newJob();
  j.client = { name: 'Priya Nair', first_name: 'Priya', address: '8 Park Ave Salisbury SA 5108', phone: '0400 000 111', email: 'priya@example.com' };
  j.summary = 'two bedrooms and a hallway';
  j.status = 'invoiced';
  j.quote = { number: 'Q-1004', date: st.today(), total: 3885.20, subtotal: 3532, gst: 353.20, lines: [] };
  j.quote_no = 'Q-1004';
  j.invoices = [{ no: 'INV-1006', kind: 'final', date: st.today(), due: st.addDays(st.today(), 7), total: 3885.20, subtotal: 3532, lines: [], payments: [], credit_notes: [], sent_date: st.today(), sent_confirmed: true }];
  st.save();
  window.__jobId = j.id;
  return j.id;
};

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.addInitScript(MOCK); await p.addInitScript(TOASTS); await p.addInitScript(__OPEN_SEC);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  const text = () => p.$eval('#app', e => e.innerText);
  const goHash = async (h) => { await p.evaluate(() => { location.hash = '#/x'; }); await p.waitForTimeout(120); await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(700); };
  // read straight off the phone, so a test still works on a page that has been thrown away by a navigation
  const state = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('qc-app-v1') || '{}'); } catch (e) { return {}; } });
  const calls = () => p.evaluate(() => { try { return JSON.parse(sessionStorage.getItem('qccalls') || '[]'); } catch (e) { return []; } });

  await p.goto(base, { waitUntil: 'load' });
  const jobId = await p.evaluate(seed);
  await p.reload({ waitUntil: 'load' });

  // ---- before he starts: one button, and no key anywhere he looks
  await goHash('#/settings');
  let t = await text();
  ok(/Card payments/.test(t) && await p.$('#card_go') !== null, 'Set-up offers one button to turn card payments on');
  ok(/money goes straight to you/.test(t), 'and says where the money goes: ' + (t.match(/Stripe asks[^\n]*/) || [''])[0]);
  // just the card, from its heading to the fold he never has to open
  const card = t.slice(t.indexOf('Card payments'), t.indexOf('Use my own Stripe key instead'));
  ok(card.length > 20 && !/rk_live|restricted key|API|Stripe key/i.test(card),
    'nothing in front of him mentions a key, a dashboard or an API: ' + JSON.stringify(card));

  // ---- tapping it sends him to Stripe's own onboarding, not to a form of ours
  let wentTo = '';
  await p.route('https://connect.stripe.com/**', (route) => { wentTo = route.request().url(); route.abort(); });
  await p.evaluate(() => { window.__connect = { ok: true, url: 'https://connect.stripe.com/setup/e/acct_dave/abc' }; });
  await p.click('#card_go'); await p.waitForTimeout(800);
  ok(/^https:\/\/connect\.stripe\.com\/setup\//.test(wentTo), 'he is handed to Stripe itself: ' + wentTo);
  await p.goto(base, { waitUntil: 'load' });   // he comes back from Stripe to a fresh page, as he really would
  const made = (await calls()).filter(c => /connect/.test(c.url));
  ok(made.some(c => c.body.action === 'start'), 'which the relay was asked for (' + made.map(c => c.body.action).join(', ') + ')');
  ok(made.length > 0 && made.every(c => String(c.body.token || '').slice(0, 4) === 'qc1.'), 'every call carries his signed token and nothing else of his');
  ok(((await state()).payment || {}).stripe_started === true, 'the phone remembers he started, so coming back lands somewhere sensible');

  // ---- back from Stripe, still being checked
  await p.evaluate(() => { window.__connect = { ok: true, started: true, ready: false, note: 'Stripe still needs a few details from you.' }; });
  await goHash('#/settings'); await p.waitForTimeout(900);
  t = await text();
  ok(/Stripe still needs a few details/.test(t), 'while Stripe is checking, his own screen says what is holding it up');
  ok(await p.$('#card_check') !== null && await p.$('#card_go') !== null, 'with a way to finish it and a way to ask again');

  // and no invoice may carry a button that cannot take money yet
  await goHash('#/job/' + jobId + '/invoice');
  ok(!/Pay by card/i.test(await text()), 'no card button on an invoice until Stripe has cleared him');

  // ---- cleared
  await p.evaluate(() => { window.__connect = { ok: true, started: true, ready: true, note: '' }; });
  await goHash('#/settings'); await p.waitForTimeout(400);
  await p.click('#card_check'); await p.waitForTimeout(1000);   // the button he has, rather than waiting on the quiet re-check
  t = await text();
  ok(/Paying the invoice ticks it off here/.test(t), 'once it is on, the card says what it does for him');
  ok(await p.$('#card_manage') !== null && await p.$('#card_go') === null, 'and offers the bank account, not the set-up, from then on');
  ok((await state()).payment.card_ready === true, 'the phone knows card payments are live');

  // ---- an invoice now carries a button, made on his account by the relay
  await p.evaluate(() => { window.__connect = { ok: true, id: 'plink_1', url: 'https://buy.stripe.com/test_plink_1' }; });
  await goHash('#/job/' + jobId + '/invoice');
  await p.click('#sendinv_0').catch(e => console.log('   click failed: ' + e.message.slice(0, 80)));
  await p.waitForTimeout(1500);
  const linkCall = (await calls()).map(c => c.body).filter(x => x.action === 'link')[0] || null;
  ok(linkCall && linkCall.invoice === 'INV-1006' && Math.abs(linkCall.amount - 3885.20) < 0.005,
    'sending the invoice asks the relay for a link for that invoice and that amount: ' + JSON.stringify(linkCall));
  ok(linkCall && linkCall.job === jobId, 'carrying the job, which is how the payment finds its way back');
  let S = await state();
  let inv = S.jobs.find(j => j.id === jobId).invoices[0];
  ok(inv.pay_url === 'https://buy.stripe.com/test_plink_1' && inv.pay_link_id === 'plink_1', 'and the link is kept on the invoice');

  // ---- someone pays it: the next sync ticks it off without him doing anything
  await p.evaluate(() => {
    window.__syncOut = { ok: true, now: new Date().toISOString(), changes: [], bookings: [], replies: [],
      payments: [{ id: 'cs_1', job_id: window.__jobId, invoice_no: 'INV-1006', amount_cents: 388520, currency: 'aud', paid_at: new Date().toISOString() }] };
  });
  await p.evaluate(() => { window.__jobId = null; });
  // the id above is read at sync time, so put it back the way the app will see it
  await p.evaluate(j => { window.__jobId = j; window.__syncOut.payments[0].job_id = j; }, jobId);
  await p.evaluate(() => window.__qcApp.sync && window.__qcApp.sync());
  await p.waitForTimeout(1500);
  S = await state();
  inv = S.jobs.find(j => j.id === jobId).invoices[0];
  ok((inv.payments || []).length === 1 && Math.abs(inv.payments[0].amount - 3885.20) < 0.005 && inv.payments[0].method === 'card',
    'the card payment lands on the invoice, to the cent');
  ok(!!inv.paid_date, 'the invoice is marked paid without him touching it');
  ok(S.jobs.find(j => j.id === jobId).status === 'paid', 'and the job moves to paid');
  const said = await p.evaluate(() => (window.__toasts || []).join(' | '));
  ok(/Priya paid INV-1006/.test(said), 'and he is told, in money and in his customer’s name: ' + said);

  // ---- Stripe retries; the phone syncs twice; he is not paid twice
  await p.evaluate(() => window.__qcApp.sync && window.__qcApp.sync());
  await p.waitForTimeout(1200);
  S = await state();
  inv = S.jobs.find(j => j.id === jobId).invoices[0];
  ok((inv.payments || []).length === 1, 'the same payment arriving twice is still one payment');

  // ---- Connect not switched on: he is offered the bank details instead, not an error
  await p.evaluate(() => { const st = window.__qcApp.store, S2 = st.load(); S2.payment = { account_name: "Dave's Painting", bsb: '063-000', account_number: '12345678' }; st.save(); window.__connect = { ok: true, off: true }; });
  await goHash('#/settings'); await p.waitForTimeout(600);
  await p.click('#card_go').catch(() => {});
  await p.waitForTimeout(800);
  t = await text();
  ok(/Not switched on yet/.test(t) && !/error|failed/i.test(t), 'before Connect is live the card says so plainly, with no error and nothing to fix: ' + JSON.stringify(t.slice(t.indexOf('Card payments'), t.indexOf('Card payments') + 120)));

  await b.close(); srv.close();
  console.log(fails ? '\nFAILURES: ' + fails : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
