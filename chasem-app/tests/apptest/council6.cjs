// Council six builds: stale reminders queued on Load, deposit invoice drafted on Accepted, hosted-expiry banner, no-reply line on hosted texts.
const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); };
const __JOINED = () => { try { const k = 'qc-app-v1', raw = localStorage.getItem(k); const s = raw ? JSON.parse(raw) : {}; s.account = Object.assign({ email: 'test@example.com', joined: '2026-01-01', verified: true }, s.account || {}); s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }; // the app asks for an email before it opens; these suites are about what comes after
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jcode = obj => 'j:' + b64u(Buffer.from(JSON.stringify(obj), 'utf8'));
const isoDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const MOCK = () => { window.__qcCalls = []; window.__qcRelayFetch = (u, o) => { const b = JSON.parse(o.body); window.__qcCalls.push(b); return Promise.resolve({ json: () => Promise.resolve({ ok: true, id: 'ID' + window.__qcCalls.length }) }); }; };

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.addInitScript(__JOINED); await p.addInitScript(__OPEN_SEC); await p.addInitScript(MOCK);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  const text = () => p.$eval('#app', e => e.innerText);
  const state = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__qcApp.store.load())));
  const toastText = async () => { await p.waitForSelector('#toast:not([hidden])', { timeout: 4000 }).catch(() => null); return p.$eval('#toast', e => e.textContent).catch(() => ''); };
  const calls = () => p.evaluate(() => window.__qcCalls);

  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.details.trading_name = 'Daves Painting'; S.details.owner_name = 'Dave Smith'; S.details.abn = '11 222 333 444'; S.details.phone = '0412 000 000'; S.details.email = 'dave@example.com'; S.details.state = 'VIC'; st.save(); });
  const d40 = isoDays(-40), d33 = isoDays(-33), d21 = isoDays(-21), d7 = isoDays(-7), d30 = isoDays(-30), until = isoDays(90);
  const P = { v: 1, settings: { sending: { server: 'https://relay.example.test/api/msg', token: 'qc_tok', server_has_creds: true, hosted: true, hosted_until: until, hosted_name: 'Daves Painting' } },
    jobs: [
      // invoice due 7 days ago: +3 has passed, +10 and +21 have not -> two scheduled, one skipped, no late reminder
      { id: 'c6_a', client: { name: 'Recent Owing', phone: '0411 000 111' }, summary: 'Exterior', status: 'invoiced', manual_total: 3000, quote: { number: '', total: 3300, subtotal: 3000, sent_date: d21 }, sent_date: d21, sent_how: 'other', sent_confirmed: true, invoices: [{ no: '', kind: 'final', total: 3300, subtotal: 3000, date: d21, due: d7, sent_date: d21, sent_how: 'other', sent_confirmed: true, lines: [{ desc: 'Exterior', qty: 1, unit: 'job', amount: 3000 }], payments: [] }] },
      // invoice due 33 days ago: every configured day has passed -> one reminder at the next send time
      { id: 'c6_b', client: { name: 'Slow Payer', phone: '0411 000 222' }, summary: 'Lounge', status: 'invoiced', manual_total: 2000, quote: { number: '', total: 2200, subtotal: 2000, sent_date: d40 }, sent_date: d40, sent_how: 'other', sent_confirmed: true, invoices: [{ no: '', kind: 'final', total: 2200, subtotal: 2000, date: d40, due: d33, sent_date: d40, sent_how: 'other', sent_confirmed: true, lines: [{ desc: 'Lounge', qty: 1, unit: 'job', amount: 2000 }], payments: [] }] },
      // quote sent 30 days ago, every follow-up day passed -> one late quote nudge
      { id: 'c6_c', client: { name: 'Old Quote', phone: '0411 000 333', email: 'old@example.com' }, summary: 'Hallway', status: 'quoted', manual_total: 1500, quote: { number: '', total: 1650, subtotal: 1500, sent_date: d30 }, sent_date: d30, sent_how: 'other', sent_confirmed: true },
      // quoted with a client email, to accept later
      { id: 'c6_d', client: { name: 'Margaret Hanley', phone: '0411 222 333', email: 'mh@example.com', address: '8 Beaumont St Hamilton NSW 2303' }, summary: 'Lounge and hall', status: 'quoted', manual_total: 2450, quote: { number: '', total: 2695, subtotal: 2450, sent_date: d7 }, sent_date: d7, sent_how: 'other', sent_confirmed: true }],
    scoreboard_start: isoDays(0), note: 'Set up by Aaron' };
  await p.goto(base + '#/setup?d=' + jcode(P), { waitUntil: 'load' }); await p.waitForSelector('#setupload');
  await p.click('#setupload'); await p.waitForFunction(() => location.hash === '#/' || location.hash === '');
  let tt = await toastText(); ok(/Loaded: .*4 jobs\. Nothing is sent until you tap Start the chasing\.$/.test(tt), 'Load toast says nothing is sent yet: ' + tt);
  let C = await calls(); ok(C.filter(c => c.action === 'schedule').length === 0, 'Load itself schedules nothing');
  await p.waitForSelector('#bookchase'); let t = await text();
  ok(/Money you are owed\s+2 unpaid invoices and 2 open quotes ready to chase\. Nothing has been sent\./.test(t.replace(/\n+/g, ' ').replace(/\s+/g, ' ')) && /Start the chasing/.test(t) && /Read the wording/.test(t), 'home card lists the book and the Start button: ' + t.replace(/\s+/g, ' ').slice(t.indexOf('Your book'), t.indexOf('Your book') + 200));
  // the confirm screen said so too
  await p.goto(base + '#/setup?d=' + jcode(Object.assign({}, P, { jobs: P.jobs.map(j => Object.assign({}, j, { id: j.id + 'x' })) })), { waitUntil: 'load' }); await p.waitForSelector('#setupload'); const ct = await text();
  ok(/To chase\s*2 unpaid invoices, 2 open quotes\. Nothing is sent until you tap Start the chasing\./.test(ct), 'confirm screen has the To chase row: ' + ct.replace(/\s+/g, ' ').slice(0, 300));
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#bookgo'); await p.click('#bookgo');
  await p.waitForFunction(() => /reminder/.test(document.getElementById('toast').textContent), { timeout: 8000 }).catch(() => null);
  tt = await toastText(); ok(/^4 reminders queued for 4 jobs in your book\. The first goes (today|tomorrow|[A-Z][a-z]+day \d+ [A-Z][a-z]+) at \d+(am|pm)\.$/.test(tt), 'Start toast names the queued reminders and the first send: ' + tt);
  ok(!(await p.$('#bookchase')), 'the book card goes once started');
  C = await calls(); const sched = C.filter(c => c.action === 'schedule');
  ok(sched.length === 4, 'loading a book of 4 jobs books 4 messages, one per chase, not the 7-8 it used to spend up front (' + sched.length + ')');
  const late = sched.filter(c => /\+late$/.test(c.ref));
  // Only one reminder per chase is booked. Where a catch-up and a scheduled nudge fall at the same minute the
  // catch-up must win: it has one date, so losing the tie means it waits until its time passes and is dropped.
  const qd = (await state()).local_queue.filter(q => q.job === 'c6_d').map(q => q.ref);
  ok(sched.some(c => c.ref === 'quote+late') && !qd.includes('quote+late'),
     'the catch-up is booked, not left in the queue behind a nudge due the same minute (queued for that job: ' + (qd.join(', ') || 'nothing') + ')');
  ok(late.length === 4 && late.every(c => new Date(c.send_at).getTime() > Date.now() + 9 * 60000), 'four next-morning reminders (two invoices never chased, two quotes), all in the future: ' + late.map(c => c.ref + ' ' + c.send_at).join(' | '));
  const lateInv = late.find(c => /^INV-/.test(c.ref) && /2,200/.test(c.body)), lateQ = late.find(c => c.ref === 'quote+late' && /1,650/.test(c.body)), lateQd = late.find(c => c.ref === 'quote+late' && /2,695/.test(c.body));
  ok(lateInv && /a friendly reminder that invoice INV-\d+ \(\$2,200\) was due on/.test(lateInv.body) && /This number does not take replies: text or call me on 0412 000 000\.$/.test(lateInv.body), 'late invoice nudge is the friendly tier (never chased) and ends with the no-reply line: ' + (lateInv && lateInv.body));
  ok(lateQ && /a start slot the week of/.test(lateQ.body) && lateQ.channel === 'sms' && lateQd && /just checking quote/.test(lateQd.body), 'stale quote gets the start-slot tier, a week-old quote the friendly one');
  let S = await state(); const jb = S.jobs.find(j => j.id === 'c6_b'), ja = S.jobs.find(j => j.id === 'c6_a');
  ok(jb.invoices[0].follow_ups.length === 1 && jb.invoices[0].follow_ups[0].what === jb.invoices[0].no + '+late' && ja.invoices[0].follow_ups.length === 1 && ja.invoices[0].follow_ups[0].what === ja.invoices[0].no + '+late' && ja.from_book === true, 'each invoice has exactly the next reminder booked, the next-morning one; from_book kept');
  ok((S.local_queue || []).filter(q => q.inv === ja.invoices[0].no).length === 2, "job a's two dated reminders wait in the queue instead of being paid for now");
  // a second Load of the same code schedules nothing new
  await p.evaluate(() => { window.__qcCalls = []; }); await p.goto(base + '#/setup?d=' + jcode(P), { waitUntil: 'load' }); await p.waitForSelector('#setupload'); await p.click('#setupload'); await p.waitForFunction(() => location.hash === '#/' || location.hash === ''); await new Promise(r => setTimeout(r, 800));
  C = await calls(); ok(C.filter(c => c.action === 'schedule').length === 0, 'loading the same code again schedules nothing (jobs already here)');

  // ---- Accepted drafts the deposit invoice
  await p.goto(base + '#/job/c6_d/quote', { waitUntil: 'load' }); await p.waitForSelector('#accepted'); await p.evaluate(() => { window.__qcCalls = []; });
  await p.click('#accepted'); tt = await toastText(); ok(/^Accepted\. Deposit invoice INV-\d+ for \$269\.50 is written\.$/.test(tt), 'accept toast names the drafted deposit invoice: ' + tt);
  await p.waitForSelector('#depdraft'); t = await text();
  ok(/Deposit invoice INV-\d+, \$269\.50\s+Written when you marked it accepted, due [^.]+\. Not sent yet\./.test(t.replace(/\n/g, ' ')) && /Send it to Margaret/.test(t) && /Not yet/.test(t), 'quote page shows the deposit card with Send and Not yet');
  S = await state(); let jd = S.jobs.find(j => j.id === 'c6_d'); const dinv = jd.invoices[0];
  ok(jd.status === 'accepted' && jd.invoices.length === 1 && dinv.kind === 'deposit' && dinv.total === 269.5 && dinv.subtotal === 245 && dinv.gst === 24.5 && dinv.pct === 10 && dinv.sent_confirmed === false && !dinv.sent_date && dinv.drafted === 'accepted' && /^INV-\d+$/.test(dinv.no) && dinv.due > isoDays(0), 'drafted invoice: 10% deposit, GST split, numbered, unsent, status stays accepted, due ahead');
  await p.goto(base + '#/job/c6_d', { waitUntil: 'load' }); await p.waitForSelector('h1'); t = await text(); ok(/Deposit invoice INV-\d+ \(\$269\.50\) written, not sent\./.test(t), 'job page says the deposit invoice is written, not sent');
  // Send it: goes by email through the relay (client has an email, hosted sending on), then the deposit reminders queue
  await p.goto(base + '#/job/c6_d/quote', { waitUntil: 'load' }); await p.waitForSelector('#depdraft'); await p.click('#depdraft a.btn');
  await p.waitForFunction(() => window.__qcCalls.some(c => c.action === 'send'), { timeout: 8000 }).catch(() => null); await new Promise(r => setTimeout(r, 600));
  C = await calls(); const sent = C.find(c => c.action === 'send');
  ok(sent && sent.channel === 'email' && sent.to === 'mh@example.com' && /Tax invoice INV-\d+ for the deposit is attached: \$269\.50 inc GST/.test(sent.body) && sent.attachments && sent.attachments.length === 1, 'Send it emailed the deposit invoice through the relay with the PDF attached');
  ok(C.filter(c => c.action === 'schedule').length >= 1 && C.filter(c => c.action === 'schedule').every(c => /^INV-\d+\+\d+$/.test(c.ref)), 'deposit reminders scheduled after the send: ' + C.filter(c => c.action === 'schedule').map(c => c.ref).join(','));
  ok(await p.evaluate(() => location.hash === '#/job/c6_d/invoice'), 'the ?send= is stripped from the address after sending');
  S = await state(); jd = S.jobs.find(j => j.id === 'c6_d'); ok(jd.invoices[0].sent_date && jd.status === 'invoiced' && (await p.evaluate(() => !window.__qcApp.draftedDeposit(window.__qcApp.store.getJob('c6_d')))), 'invoice marked sent, job invoiced, no draft card left');
  // Not yet: dismisses the card; the invoice stays on the Invoice page
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); const j = st.getJob('c6_c'); j.client.email = ''; st.save(); });
  await p.goto(base + '#/job/c6_c/quote', { waitUntil: 'load' }); await p.waitForSelector('#accepted'); await p.click('#accepted'); await p.waitForSelector('#depdraft'); await p.click('#depnotyet'); await new Promise(r => setTimeout(r, 300));
  ok(!(await p.$('#depdraft')), 'Not yet hides the deposit card');
  await p.goto(base + '#/job/c6_c/invoice', { waitUntil: 'load' }); await p.waitForSelector('h1'); t = await text();
  ok(/Written when the quote was accepted\. Not sent yet\./.test(t) && /Send to Old/.test(t), 'invoice page lists the drafted deposit with a Send button');
  // no deposit drafted when the deposit rule is 0
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.rules.deposit_pct = 0; S.details.deposit_pct = 0; const j = st.newJob(); j.id = 'c6_e'; j.client.name = 'No Dep'; j.client.phone = '0411 999 999'; j.status = 'quoted'; j.manual_total = 1000; j.quote = { number: j.quote_no, total: 1100, subtotal: 1000, sent_date: st.today(), lines: [{ desc: 'x', amount: 1000, qty: 1, unit: 'job', rate: 1000 }], gst: 100 }; j.sent_date = st.today(); j.sent_confirmed = true; j.sent_how = 'other'; st.save(); });
  await p.goto(base + '#/job/c6_e/quote', { waitUntil: 'load' }); await p.waitForSelector('#accepted'); await p.click('#accepted'); tt = await toastText();
  ok(/Accepted\. Note how they said yes\./.test(tt) && !(await p.$('#depdraft')), 'no deposit rule: plain accept, nothing drafted');
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.rules.deposit_pct = 10; S.details.deposit_pct = 10; st.save(); });

  // ---- hosted expiry banner on Home
  const setUntil = async n => { await p.evaluate(n => { const st = window.__qcApp.store, S = st.load(); S.sending.hosted_until = st.addDays(st.today(), n); st.save(); }, n); await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.waitForSelector('h1'); return text(); };
  t = await setUntil(60); ok(!/chasing is off|Cancelled|card was declined/.test(t), 'a subscription in the middle of its month says nothing at all');
  t = await setUntil(20); ok(!/chasing is off|Cancelled|card was declined/.test(t), 'twenty days to run: still nothing, because it renews itself');
  t = await setUntil(5); ok(!/chasing is off|Cancelled|card was declined/.test(t), 'five days to run: still nothing; the app renews in the background');
  t = await setUntil(-1); ok(/The chasing is off\. Your sending ran to [^.]+\. Reminders already queued still go out; nothing new is scheduled\./.test(t) && /Turn it back on at the website/.test(t), 'only when it has actually run out does the app say so');
  await setUntil(90);
  // ---- no-reply line only while hosted; email bodies never carry it
  const nr = await p.evaluate(() => { const a = window.__qcApp, st = a.store, j = st.getJob('c6_a'), inv = j.invoices[0]; const hosted = a.chaseText('invoice', j, inv, 5, { auto: true }); const q = a.chaseText('quote', st.getJob('c6_c'), st.getJob('c6_c').quote, 3, { auto: true }); const S = st.load(); S.sending.hosted = false; st.save(); location.hash = '#/'; const own = window.__qcApp.chaseText('invoice', st.getJob('c6_a'), st.getJob('c6_a').invoices[0], 5, { auto: true }); S.sending.hosted = true; st.save(); return { hs: hosted.sms, he: hosted.email, qs: q.sms, os: own.sms }; });
  ok(/This number does not take replies: text or call me on 0412 000 000\.$/.test(nr.hs) && /replies/.test(nr.qs) && !/does not take replies/.test(nr.he) && !/does not take replies/.test(nr.os), 'no-reply line on hosted SMS only: ' + JSON.stringify(nr).slice(0, 300));
  // the no-reply line holds even when the phone-in-texts setting is off; the nudge templates replace the body with tokens filled
  // no mobile in the app: the hosted text still gives a way back, and Set-up says so
  const nm = await p.evaluate(() => { const a = window.__qcApp, st = a.store, S = st.load(); const keep = S.details.phone; S.details.phone = ''; st.save(); location.hash = '#/'; const r = a.chaseText('invoice', st.getJob('c6_a'), st.getJob('c6_a').invoices[0], 5, { auto: true }); S.details.phone = keep; st.save(); return r.sms; });
  ok(/This number does not take replies: reply to my email at dave@example\.com\.$/.test(nm), 'no mobile: the hosted text falls back to the email, never a dead end: ' + nm.slice(-90));
  await p.goto(base + '#/settings', { waitUntil: 'load' }); await p.waitForSelector('#setupcode'); let sd = await text();
  ok(/Every text it sends ends with a way to reach you on 0412 000 000, because the number it comes from cannot take replies\./.test(sd) && !/Add your mobile/.test(sd), 'Set-up states the number the texts give out');
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.details.phone = ''; st.save(); });
  await p.goto(base + '#/settings', { waitUntil: 'load' }); await p.waitForSelector('#setupcode'); sd = await text();
  ok(/Every text it sends ends with a way to reach you by email, because the number it comes from cannot take replies\. Add your mobile in Your business above and texts point them there instead\./.test(sd), 'Set-up warns when hosted sending has no mobile to give');
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.details.phone = '0412 000 000'; st.save(); });
  const nt = await p.evaluate(() => { const a = window.__qcApp, st = a.store, S = st.load(); S.details.contact_phone_in_texts = false; S.wording.nudges.invoice = 'oi {name}, {invoice} for {amount} was due {due} and I have not seen it. {card} Ring me on {phone} if there is a problem.'; S.wording.nudges.quote = ''; st.save(); location.hash = '#/'; const j = st.getJob('c6_a'), inv = j.invoices[0]; const r = a.chaseText('invoice', j, inv, 5, { auto: true }); const q = a.chaseText('quote', st.getJob('c6_c'), st.getJob('c6_c').quote, 3, { auto: true }); S.details.contact_phone_in_texts = true; S.wording.nudges.invoice = ''; st.save(); return { sms: r.sms, email: r.email, q: q.sms }; });
  ok(/^Hi Recent, oi Recent, INV-\d+ for \$3,300 was due \d+ [A-Z][a-z]+ and I have not seen it\. Bank details are on the invoice, ref INV-\d+\. Ring me on 0412 000 000 if there is a problem\. Cheers, Dave This number does not take replies: text or call me on 0412 000 000\.$/.test(nt.sms) && /^Hi Recent,\n\nOi Recent, INV-/.test(nt.email) && /just checking quote/.test(nt.q), 'invoice nudge in the painter\'s words with tokens filled, greeting and sign-off kept; blank quote template falls back: ' + nt.sms);

  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
