const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
// App-side sending flow with the relay mocked at the network layer.
const __JOINED = () => { try { const k = 'qc-app-v1', raw = localStorage.getItem(k); const s = raw ? JSON.parse(raw) : {}; s.account = Object.assign({ email: 'test@example.com', joined: '2026-01-01' }, s.account || {}); localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }; // the app asks for an email before it opens; these suites are about what comes after
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
  const relay = []; let n = 0;
  await p.route('https://relay.example/api/msg', route => { const body = JSON.parse(route.request().postData()); relay.push(body); n++; const j = body.action === 'cancel' ? { ok: true, cancelled: true } : { ok: true, id: (body.channel === 'sms' ? 'SM' : 'em') + n, send_at: body.send_at }; route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j) }); });
  await p.goto(base, { waitUntil: 'load' });
  await p.click('a[data-nav="settings"]'); await p.waitForSelector('[data-bind="sending.server"]');
  await p.fill('[data-bind="details.trading_name"]', 'Test Painting Co'); await p.fill('[data-bind="details.owner_name"]', 'Sam'); await p.fill('[data-bind="details.bsb"]', '063-000'); await p.fill('[data-bind="details.account_number"]', '1'); await p.fill('[data-bind="details.email"]', 'sam@example.com'); await p.fill('[data-bind="details.abn"]', '12 345 678 901');
  await p.fill('[data-bind="sending.server"]', 'https://relay.example/api/msg'); await p.fill('[data-bind="sending.twilio_sid"]', 'ACx'); await p.fill('[data-bind="sending.twilio_token"]', 'tok'); await p.fill('[data-bind="sending.twilio_service"]', 'MGx'); await p.fill('[data-bind="sending.resend_key"]', 're_x'); await p.fill('[data-bind="sending.resend_from"]', 'Sam <sam@example.com>');
  await p.fill('#testto', '0411 222 333'); await p.click('#testsms'); await p.waitForFunction(() => /Sent/.test(document.getElementById('testres').textContent)); ok(relay[0].action === 'test' && relay[0].creds.twilio_sid === 'ACx' && relay[0].creds.resend_key === 're_x', 'test SMS goes through the relay with the phone-held credentials');
  ok(await p.evaluate(() => QCMsg.ready('sms') && QCMsg.ready('email')), 'both channels ready');
  // job with phone and email
  await p.click('a[data-nav="home"]'); await p.click('#quick'); await p.waitForSelector('[data-method="measured"]'); await p.click('[data-method="measured"]'); await p.waitForSelector('[data-part="photo"]');
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.rules.round_up_cm = 0; window.__qcApp.store.save(); });
  await p.setInputFiles('[data-part="photolib"]', M + '/photo2.jpg'); await p.waitForFunction(() => window.__qcMeasure && window.__qcMeasure.state.img && window.__qcMeasure.state.auto); await p.evaluate(() => window.__qcMeasure.manual());
  await p.evaluate(pts => { window.__qcMeasure.wall4(pts); window.__qcMeasure.scale('ceiling', 2400); }, T.wall.corners.map(pt));
  await p.click('a:has-text("Done, build the quote")'); await p.waitForSelector('#pdf');
  await p.fill('[data-bind="client.name"]', 'Jane Client'); await p.fill('[data-bind="client.phone"]', '0411 222 333'); await p.fill('[data-bind="client.address"]', '5 Test St Adelaide SA 5000');
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.jobs[0].client.email = 'jane@example.com'; window.__qcApp.store.save(); }); await p.click('a[data-nav="home"]'); await p.click('.job'); await p.click('a:text-matches("Build the quote|Open the quote")'); await p.waitForSelector('#emailq');
  // a job is two messages, not one: warn BEFORE he sends, so a quote never goes out with no chasing behind it
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); Object.assign(S.sending, { bal_left: 1, bal_included: 150, bal_used: 149, bal_plan: 'paid' }); st.save(); });
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#emailq');
  let sn = await p.$eval('#shortnote', e => e.innerText).catch(() => '');
  ok(/One message left/.test(sn) && /this job needs two/.test(sn) && /the chase-up waits for you to tap Send yourself/.test(sn), 'with one message left the quote screen says so before he sends: ' + sn.replace(/\s+/g, ' ').slice(0, 120));
  ok(await p.$('#shortup') !== null, 'and offers a one-tap top-up rather than just blocking');
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); Object.assign(S.sending, { bal_left: 0, bal_used: 150 }); st.save(); });
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#emailq');
  sn = await p.$eval('#shortnote', e => e.innerText).catch(() => '');
  ok(/No messages left/.test(sn) && /never stops working and never costs anything/.test(sn), 'at zero it says the app still writes everything and he taps Send: ' + sn.replace(/\s+/g, ' ').slice(0, 110));
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); Object.assign(S.sending, { bal_left: 140, bal_used: 10 }); st.save(); });
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#emailq');
  ok(await p.$('#shortnote') === null, 'with plenty left the warning stays out of his way');
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); Object.assign(S.sending, { bal_left: null, bal_included: null, bal_used: 0, bal_plan: '' }); st.save(); });
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#emailq');

  // email the quote: relay gets an email with a PDF attachment, then follow-ups get scheduled by SMS
  relay.length = 0; await p.click('#emailq'); await p.waitForFunction(() => { const S = window.__qcApp.store.load(); return S.jobs[0].follow_ups && S.jobs[0].follow_ups.length === 1 && (S.local_queue || []).length === 2; }, null, { timeout: 20000 });
  const em = relay.find(r => r.action === 'send' && r.channel === 'email'); ok(em && em.to === 'jane@example.com' && em.attachments[0].filename === 'Q-1001.pdf' && em.attachments[0].content.startsWith('JVBERi0'), 'quote emailed with the PDF attached (base64 PDF header)');
  const sch = relay.filter(r => r.action === 'schedule'); ok(sch.length === 1 && sch.every(s => s.channel === 'sms' && s.to === '0411 222 333' && /Hi Jane/.test(s.body)), 'only the NEXT follow-up is booked with the sender, not all three: a booked message is a spent message');
  const days = sch.map(s => s.send_at.slice(0, 10)); console.log('  booked for', days.join(', '));
  const q3 = await p.evaluate(() => (window.__qcApp.store.load().local_queue || []).map(q => ({ ref: q.ref, day: q.day })).sort((a, b) => a.day < b.day ? -1 : 1));
  ok(q3.length === 2 && q3[0].ref === 'quote+7' && q3[1].ref === 'quote+14', 'the other two wait in the local queue with their dates: ' + q3.map(x => x.ref + ' ' + x.day).join(', '));
  ok(sch[0].send_at.slice(0, 10) < q3[0].day, 'the one booked is the earliest of the three');
  // the queue does not book the next one while the booked one is still in the future
  relay.length = 0; await p.evaluate(() => window.__qcApp.retryLocalQueue());
  ok(relay.filter(r => r.action === 'schedule').length === 0, 'opening the app again books nothing while the first nudge is still to go');
  // once the booked one has gone, the next is booked -- and only the next
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.jobs[0].follow_ups[0].send_at = new Date(Date.now() - 864e5).toISOString(); S.jobs[0].follow_ups[0].day = window.__qcApp.store.addDays(window.__qcApp.store.today(), -1); window.__qcApp.store.save(); });
  relay.length = 0; await p.evaluate(() => window.__qcApp.retryLocalQueue());
  await p.waitForFunction(() => window.__qcApp.store.load().jobs[0].follow_ups.length === 2, null, { timeout: 10000 });
  const sch2 = relay.filter(r => r.action === 'schedule');
  ok(sch2.length === 1 && /quote\+7/.test(sch2[0].ref), 'once the first has gone, the second is booked and the third still waits');
  ok((await p.evaluate(() => (window.__qcApp.store.load().local_queue || []).length)) === 1, 'one still waiting in the queue');
  const st = await p.evaluate(() => window.__qcApp.store.load().jobs[0].status); ok(st === 'quoted', 'job marked quoted');
  const q = await p.$eval('#app', e => e.innerText); ok(/Booked:/.test(q) && /booked as each one falls due/.test(q), 'quote page shows the booked follow-up AND the ones still waiting, so he can see all three dates');
  // follow-ups tab shows them; cancel one
  await p.click('a[data-nav="chase"]'); await p.waitForSelector('h1:has-text("Follow-ups")'); ok(/Scheduled/.test(await p.$eval('#app', e => e.innerText)), 'Follow-ups tab shows what is going out automatically');
  const earliest = await p.evaluate(() => window.__qcApp.pendingFollowUps(window.__qcApp.store.load().jobs[0]).slice().sort((a, b) => a.day < b.day ? -1 : 1)[0].id); relay.length = 0; await p.click('[data-cancelfu="0"]'); await p.waitForFunction(() => window.__qcApp.store.load().jobs[0].follow_ups.filter(x => x.cancelled).length === 1); ok(relay[0].action === 'cancel' && relay[0].id === earliest, 'cancel one follow-up through the relay: ' + relay[0].id + ' (earliest day)');
  // client says yes: remaining follow-ups cancelled
  await p.click('a[data-nav="home"]'); await p.click('.job'); await p.click('a:text-matches("Build the quote|Open the quote")'); await p.waitForSelector('#accepted'); relay.length = 0; await p.click('#accepted');
  await p.waitForFunction(() => window.__qcApp.store.load().jobs[0].follow_ups.every(x => x.cancelled)); ok(relay.filter(r => r.action === 'cancel').length === 1, 'accepting the quote cancels the one booked follow-up (and refunds its message)');
  ok((await p.evaluate(() => (window.__qcApp.store.load().local_queue || []).filter(q => !q.inv).length)) === 0, 'accepting also drops the quote follow-ups that were still waiting, so they never cost anything');
  // invoice: emailed with PDF, reminders scheduled; mark paid cancels
  await p.click('a:has-text("Invoice")'); await p.waitForSelector('#mkinv'); await p.selectOption('#kind', 'final'); relay.length = 0;
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }).catch(() => null), p.click('#mkinv')]);
  await p.waitForFunction(() => { const i = window.__qcApp.store.load().jobs[0].invoices[0]; return i && i.follow_ups && i.follow_ups.length === 1 && i.emailed_date; }, null, { timeout: 20000 });
  const iem = relay.find(r => r.action === 'send' && r.channel === 'email'); ok(iem && /Invoice INV-2001/.test(iem.subject) && iem.attachments[0].filename === 'INV-2001.pdf', 'invoice emailed with PDF');
  const isch = relay.filter(r => r.action === 'schedule'); ok(isch.length === 1 && isch.every(s => /INV-2001/.test(s.body)), 'one invoice reminder booked by SMS, the other two waiting');
  ok((await p.evaluate(() => (window.__qcApp.store.load().local_queue || []).filter(q => q.inv === 'INV-2001').length)) === 2, 'the other 2 invoice reminders wait in the queue under the invoice number');
  relay.length = 0; await p.click('[data-paid]'); await p.click('[data-paygo]'); await p.waitForFunction(() => window.__qcApp.store.load().jobs[0].invoices[0].follow_ups.every(x => x.cancelled)); ok(relay.filter(r => r.action === 'cancel').length === 1, 'marking paid cancels the one booked reminder');
  ok((await p.evaluate(() => (window.__qcApp.store.load().local_queue || []).filter(q => q.inv === 'INV-2001').length)) === 0, 'and drops the waiting ones');
  // send now from the Follow-ups tab
  await p.evaluate(() => { const S = window.__qcApp.store.load(); const j = S.jobs[0]; j.invoices[0].paid_date = ''; j.invoices[0].payments = []; j.status = 'invoiced'; j.invoices[0].due = window.__qcApp.store.addDays(window.__qcApp.store.today(), -3); window.__qcApp.store.save(); });
  await p.click('a[data-nav="chase"]'); await p.waitForSelector('[data-sendnow]'); relay.length = 0; await p.click('[data-sendnow][data-ch="sms"]'); await p.waitForFunction(() => window.__qcApp.store.load().jobs[0].last_chased);
  ok(relay[0].action === 'send' && relay[0].channel === 'sms' && /INV-2001/.test(relay[0].body), 'Send SMS now goes through the relay');
  // relay failure is reported, not fatal
  await p.route('https://relay.example/api/msg', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Twilio: invalid number' }) }), { times: 1 });
  await p.click('[data-sendnow][data-ch="email"]'); await p.waitForFunction(() => Array.from(document.querySelectorAll('.block')).some(b => /Could not send: Twilio/.test(b.textContent))); ok(true, 'relay error stays on screen as an inline block next to the button (round two: not a toast)');
  await p.screenshot({ path: SP + '/apptest/sendflow-chase.png', fullPage: true });
  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
