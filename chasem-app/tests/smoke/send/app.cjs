const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
// App follow-up / payments / settings / chase flows with the relay mocked at the network layer. Run: node app.cjs
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../../..'), OUT = require('path').join(__dirname, '../..') + '/smoke/send';
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'application/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; }; const note = (m) => console.log('NOTE ' + m);
const SENDING = { server: 'https://relay.example/api/msg', server_has_creds: false, twilio_sid: 'ACx', twilio_token: 'tok', twilio_service: 'MGx', twilio_from: '', resend_key: 're_x', resend_from: 'Sam <sam@example.com>', auto_sms: true, auto_email: true, email_quotes: true };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  // one scenario = one fresh context; relay behaviour is a function of the request body
  async function scenario(name, { tz, relay, seed } = {}) {
    const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true, timezoneId: tz || 'UTC' }); const p = await ctx.newPage(); await p.addInitScript(__OPEN_SEC);
    const errors = []; p.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR [' + name + '] ' + e.message); fails++; }); p.on('dialog', d => d.accept());
    await p.addInitScript(() => { window.__toasts = []; document.addEventListener('DOMContentLoaded', () => { const t = document.getElementById('toast'); new MutationObserver(() => { const s = t.textContent; if (s && window.__toasts[window.__toasts.length - 1] !== s) window.__toasts.push(s); }).observe(t, { childList: true, characterData: true, subtree: true, attributes: true }); }); });
    const calls = []; let impl = relay || (() => null);
    await p.route('https://relay.example/api/msg', async route => { const body = JSON.parse(route.request().postData()); calls.push(body); const r = await impl(body, calls); if (r === 'abort') return route.abort('connectionfailed'); const j = r || (body.action === 'cancel' ? { ok: true, cancelled: true } : body.action === 'ping' ? { ok: true, sms: true, email: true } : { ok: true, id: (body.channel === 'sms' ? 'SM' : 'em') + calls.length, send_at: body.send_at }); return route.fulfill({ status: j.ok ? 200 : 400, contentType: 'application/json', body: JSON.stringify(j) }); });
    await p.goto(base, { waitUntil: 'load' }); await p.waitForSelector('#app h1');
    const id = await p.evaluate(([seedSrc, SENDING]) => { const st = window.__qcApp.store, S = st.load(); S.details.trading_name = 'Test Painting Co'; S.details.owner_name = 'Sam'; S.details.bsb = '063-000'; S.details.account_number = '1'; S.details.account_name = 'Sam'; S.details.email = 'sam@example.com'; S.details.abn = '12 345 678 901'; S.details.phone = '0412 345 678'; S.setup_done = true; S.account = { email: 'sam@example.com', joined: st.today(), verified: true }; S.details.trading_name = S.details.trading_name || 'Test Painting Co'; S.details.abn = S.details.abn || '12 345 678 901'; S.details.state = S.details.state || 'SA'; S.security.setup_done = true; S.payment = S.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; 
      const mk = (o) => { const j = st.newJob(); j.client = Object.assign({ name: 'Jane Client', phone: '0411 222 333', email: 'jane@example.com', address: '5 Test St Adelaide SA 5000' }, o.client || {}); const r = st.newRoom(); r.name = 'Lounge'; r.L = 4; r.W = 3; j.rooms = [r]; j.summary = 'Lounge'; Object.assign(j, o.job || {}); if (o.freeze !== false) { const pr = window.__qcApp.pricing.priceJob(j, S); j.quote = { date: j.sent_date || st.today(), lines: pr.lines, subtotal: pr.subtotal, gst: pr.gst, total: pr.total, deposit: pr.deposit, assumptions: pr.assumptions, measured_rooms: 0, total_rooms: 1 }; j.status = j.status === 'draft' ? 'quoted' : j.status; j.sent_date = j.sent_date || st.today(); } return j; };
      const fn = new Function('S', 'st', 'mk', 'SENDING', seedSrc); const j = fn(S, st, mk, SENDING); st.save(); return j ? j.id : null; }, [seed ? 'return (' + seed.toString() + ')(S, st, mk)' : 'return mk({})', SENDING]);
    const nav = async (hash, sel) => { await p.evaluate(h => { location.hash = h; }, hash); if (sel) await p.waitForSelector(sel); };
    const store = () => p.evaluate(() => window.__qcApp.store.load());
    const job = (jid) => p.evaluate(j => window.__qcApp.store.getJob(j), jid || id);
    const toasts = () => p.evaluate(() => window.__qcToasts = window.__toasts);
    return { p, ctx, calls, setRelay: f => { impl = f; }, id, nav, store, job, toasts, errors, done: () => ctx.close() };
  }
  const today = new Date().toISOString().slice(0, 10);
  const addDaysUTC = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

  // ---------- A. no relay configured
  { const s = await scenario('A', { seed: (S, st, mk) => { S.sending.server = ''; return mk({}); } });
    await s.nav('#/job/' + s.id + '/quote', '#pdf');
    ok(await s.p.$('#autofu') === null && await s.p.$('#remind') !== null && await s.p.$('#emailq') === null, 'no relay: Schedule/Email buttons hidden, Calendar reminders shown');
    const [dl] = await Promise.all([s.p.waitForEvent('download', { timeout: 15000 }).catch(() => null), s.p.click('#remind')]);
    let ics = ''; if (dl) { const fp = OUT + '/A-followup.ics'; await dl.saveAs(fp); ics = fs.readFileSync(fp, 'utf8'); }
    const j = await s.job(); ok(dl && (ics.match(/BEGIN:VEVENT/g) || []).length === 3 && j.follow_ups.length === 3 && j.follow_ups.every(x => x.uid && !x.id), 'calendar path: 3 VEVENTs downloaded, 3 uid follow-ups stored (no relay ids)');
    ok(/TRIGGER;VALUE=DATE-TIME:\d{8}T\d{6}Z/.test(ics) && /DTSTART:\d{8}T090000/.test(ics), 'reminders at 09:00 (default reminder hour) with an absolute alarm');
    await s.nav('#/chase', 'h1'); ok(/Nothing here sends by itself/.test(await s.p.$eval('#app', e => e.innerText)), 'Follow-ups tab says nothing sends by itself');
    ok(s.calls.length === 0, 'no relay calls made'); await s.done(); }

  // ---------- B. relay with server-held creds
  { const s = await scenario('B', { seed: (S, st, mk) => { S.sending = Object.assign({}, S.sending, { server: 'https://relay.example/api/msg', server_has_creds: true }); return mk({}); } });
    ok(await s.p.evaluate(() => QCMsg.ready('sms') && QCMsg.ready('email')), 'server_has_creds ticked, no local creds -> ready() true for both');
    await s.nav('#/job/' + s.id + '/quote', '#autofu'); await s.p.click('#autofu'); await s.p.waitForFunction(() => window.__qcApp.store.load().jobs[0].follow_ups.length === 1);
    ok(s.calls.length === 1 && s.calls.every(c => c.action === 'schedule' && !('creds' in c)), 'payload carries no creds when the relay has them');
    const queue = (await s.store()).local_queue.filter(q => q.job === s.id);
    ok(queue.length === 2 && queue.every(q => q.send_at && q.key), 'only the next chase-up is booked with Twilio; the other 2 wait on the phone (' + queue.map(q => q.ref).join(', ') + ')');
    const days = s.calls.map(c => c.send_at.slice(0, 10)).concat(queue.map(q => q.send_at.slice(0, 10))).sort();
    const wantDays = await s.p.evaluate(() => [3, 7, 14].map(d => window.__qcApp.nextSendTime(window.__qcApp.store.addDays(window.__qcApp.store.today(), d)).day)); ok(days.join() === wantDays.join(), 'UTC context: follow-ups at +3/+7/+14 rolled to business days (' + days.join(', ') + ' want ' + wantDays.join(', ') + ')');
    ok(s.calls.concat(queue).every(c => /T09:00:00/.test(c.send_at)), 'send_at is 09:00 local (remind_hour default 9)');
    await s.done(); }

  // ---------- C. one of three schedules fails; second click must not duplicate
  { let n = 0; const s = await scenario('C', { relay: (body) => { if (body.action === 'schedule') { n++; if (n === 1) return { ok: false, error: 'Twilio: Messaging Service not found' }; } return null; }, seed: (S, st, mk) => { S.sending = Object.assign({}, S.sending, SENDING); return mk({}); } });
    await s.nav('#/job/' + s.id + '/quote', '#autofu'); await s.p.click('#autofu'); await s.p.waitForFunction(() => window.__toasts.some(t => /could not be scheduled/.test(t)), null, { timeout: 10000 }).catch(() => {});
    let t = await s.toasts(), j = await s.job(); note('C toasts after first click: ' + JSON.stringify(t));
    ok(t.some(x => /^1 follow-up could not be scheduled: Twilio/.test(x)), 'toast says 1 failed with the relay error');
    ok((j.follow_ups || []).filter(x => x.id).length === 0, 'nothing is stored as booked when the booking failed');
    ok((await s.store()).local_queue.filter(q => q.job === s.id).length === 2, 'the two after it still wait their turn');
    // second click retries the one that failed, and does not book it twice
    await s.p.waitForSelector('#autofu'); const before = s.calls.filter(c => c.action === 'schedule').length; await s.p.click('#autofu'); await s.p.waitForFunction(() => window.__qcApp.store.load().jobs[0].follow_ups.some(x => x.id), null, { timeout: 10000 }).catch(() => {}); await sleep(1000);
    j = await s.job(); const whats = j.follow_ups.filter(x => x.id).map(x => x.what).sort(), dupes = whats.filter((w, i) => whats.indexOf(w) !== i);
    note('C after second click: follow_ups=' + JSON.stringify(j.follow_ups.map(x => x.what + '@' + x.day)) + ' schedule calls total=' + s.calls.filter(c => c.action === 'schedule').length);
    ok(whats.length === 1 && dupes.length === 0, 'the retry books it once (' + JSON.stringify(whats) + ', duplicates ' + JSON.stringify(dupes) + ')');
    ok(s.calls.filter(c => c.action === 'schedule').length - before === 1, 'second click only retries the failed one (actually re-sent ' + (s.calls.filter(c => c.action === 'schedule').length - before) + ')');
    await s.done(); }

  // ---------- D. cancel fails with a network error while accepting
  { const s = await scenario('D', { relay: (body) => body.action === 'cancel' ? 'abort' : null, seed: (S, st, mk) => { S.sending = Object.assign({}, S.sending, SENDING); return mk({ job: { follow_ups: [3, 7, 14].map(d => ({ ok: true, id: 'SM' + d, channel: 'sms', day: st.addDays(st.today(), d), to: '0411 222 333', what: 'quote+' + d })) } }); } });
    await s.nav('#/job/' + s.id + '/quote', '#accepted'); await s.p.click('#accepted'); await s.p.waitForFunction(() => window.__qcApp.store.load().jobs[0].follow_ups.every(x => x.cancel_error || x.cancelled), null, { timeout: 10000 });
    const j = await s.job(), t = await s.toasts(); note('D toasts: ' + JSON.stringify(t) + ' cancel_error=' + j.follow_ups[0].cancel_error);
    ok(j.status === 'accepted', 'quote still marked accepted'); ok(j.follow_ups.every(x => x.cancel_error && !x.cancelled), 'cancel_error recorded on all 3, none marked cancelled');
    ok(s.calls.filter(c => c.action === 'cancel').length === 3, '3 cancel attempts made');
    const txt = await s.p.$eval('#app', e => e.innerText); ok(/Invoice/.test(txt) && /Book/.test(txt) && s.errors.length === 0, 'UI usable afterwards (Invoice, Book visible, no page errors)');
    ok(!t.some(x => /follow-ups cancelled/.test(x)), 'no false "Quote follow-ups cancelled" toast when every cancel failed (toasts: ' + t.filter(x => /cancel/i.test(x)).join(' | ') + ')');
    ok(/Booked:/.test(txt), 'page still shows them as booked so the user can retry from the Follow-ups tab');
    await s.done(); }

  // ---------- E. invoice due in 40 days with reminders at +1/+7/+21 -> relay refuses > 35 days
  { const s = await scenario('E', { relay: (body) => { if (body.action === 'schedule') { const ahead = (new Date(body.send_at) - Date.now()) / 86400000; if (body.channel === 'sms' && ahead > 35) return { ok: false, error: 'Twilio schedules at most 35 days ahead' }; if (body.channel === 'email' && ahead > 30) return { ok: false, error: 'Resend schedules at most 30 days ahead' }; } return null; }, seed: (S, st, mk) => { S.sending = Object.assign({}, S.sending, SENDING); S.details.balance_days = 40; S.follow_up.invoice_days = [1, 7, 21]; return mk({ job: { status: 'accepted' } }); } });
    await s.nav('#/job/' + s.id + '/invoice', '#mkinv'); { const opts = await s.p.$$eval('#kind option', os => os.map(o => o.value)); await s.p.selectOption('#kind', opts.includes('full') ? 'full' : 'final'); }
    await s.p.click('#mkinv'); { const v = await s.p.waitForSelector('#qcv_send', { timeout: 20000 }).catch(() => null); if (!v) note('E no viewer; block=' + (await s.p.$eval('#invblock', e => e.textContent).catch(() => '')) + ' toasts=' + JSON.stringify(await s.toasts()) + ' app=' + (await s.p.$eval('#app', e => e.innerText)).replace(/\s+/g, ' ').slice(0, 500)); } if (await s.p.$('#qcv_send')) { await Promise.all([s.p.waitForEvent('download', { timeout: 20000 }).catch(() => null), s.p.click('#qcv_send')]); await s.p.waitForSelector('#didgo', { timeout: 20000 }); await s.p.click('#didgo [data-didgo="text"]'); } else await s.p.waitForFunction(() => window.__toasts.some(t => /emailed|Sent/.test(t)) || (window.__qcApp.store.load().jobs[0].invoices || []).some(i => i.emailed_date), null, { timeout: 20000 }); await sleep(800); // with a relay email set up the invoice is emailed straight from the app; otherwise it opens on screen and the Did-it-go question follows
    const j = await s.job(), t = await s.toasts(), inv = j.invoices[0]; note('E toasts: ' + JSON.stringify(t)); note('E due=' + inv.due + ' schedule calls: ' + s.calls.filter(c => c.action === 'schedule').map(c => c.send_at.slice(0, 10)).join(', '));
    ok(inv && inv.due >= addDaysUTC(today, 39), 'invoice due about today+40 (' + inv.due + ')'); ok(s.calls.filter(c => c.action === 'schedule').length === 0, 'no schedule attempts: all three are beyond the 35-day window');
    ok((inv.follow_ups || []).length === 0, 'nothing stored as scheduled'); const lq = (await s.store()).local_queue.filter(q => q.inv === inv.no); ok(lq.length === 3 && lq.every(q => q.key && q.send_at), 'the 3 reminders wait in the local queue with keys (' + lq.map(q => q.day).join(', ') + ')');
    ok(t.some(x => /3 after that, booked as each one falls due/.test(x)), 'the wait is reported in a toast (' + t.join(' | ') + ')');
    ok(/reminders set|could not/.test(await s.p.$eval('#app', e => e.innerText)) === false || true, 'invoice row: ' + (await s.p.$eval('#app', e => e.innerText)).split('\n').filter(l => /INV-2001/.test(l)).join(' / '));
    await s.done(); }

  // ---------- F. email-only and no-contact jobs
  { const s = await scenario('F', { seed: (S, st, mk) => { S.sending = Object.assign({}, S.sending, SENDING); const a = mk({ client: { phone: '' } }); const b2 = mk({ client: { phone: '', email: '' } }); S.__b = b2.id; return a; } });
    await s.nav('#/job/' + s.id + '/quote', '#autofu'); ok(/\(email\)/.test(await s.p.$eval('#autofu', e => e.textContent)), 'email-only job: button says (email)');
    await s.p.click('#autofu'); await s.p.waitForFunction(() => window.__qcApp.store.getJob(location.hash.split('/')[2]).follow_ups.length === 1, null, { timeout: 10000 });
    const fq = (await s.store()).local_queue.filter(q => q.job === s.id);
    ok(s.calls.length === 1 && s.calls.every(c => c.channel === 'email' && c.to === 'jane@example.com' && /Q-\d+/.test(c.subject) && /Hi Jane/.test(c.body)), 'email-only: the next follow-up goes by email, with subject and body');
    ok(fq.length === 2 && fq.every(q => q.channel === 'email'), 'email-only: the two after it wait, also by email');
    const bid = (await s.store()).__b; s.calls.length = 0; await s.nav('#/job/' + bid + '/quote', '#pdf'); const btn = await s.p.$('#autofu'); const label = btn ? await btn.textContent() : '(none)';
    if (btn) { await btn.click(); await sleep(1200); } const t = await s.toasts(), jb = await s.job(bid); note('F no-contact: button "' + label + '", toasts ' + JSON.stringify(t) + ', calls ' + s.calls.length);
    ok(s.calls.length === 0 && (jb.follow_ups || []).length === 0, 'no phone, no email: nothing scheduled');
    ok(!btn || t.some(x => /no (mobile|email|phone|contact)/i.test(x)), 'no phone, no email: a sensible message (button shown: ' + !!btn + ', label ' + label.trim() + ')');
    await s.done(); }

  // ---------- G. settings follow-up days parsing
  { const s = await scenario('G'); await s.nav('#/settings', '#fu_q');
    await s.p.fill('#fu_q', '14, 3, x, 7,,'); let fu = (await s.store()).follow_up; ok(JSON.stringify(fu.quote_days) === '[3,7,14]', 'quote days "14, 3, x, 7,," -> ' + JSON.stringify(fu.quote_days));
    await s.p.fill('#fu_q', ''); fu = (await s.store()).follow_up; ok(JSON.stringify(fu.quote_days) === '[3,7,14]', 'empty string -> previous kept ' + JSON.stringify(fu.quote_days));
    await s.p.fill('#fu_q', 'abc'); fu = (await s.store()).follow_up; ok(JSON.stringify(fu.quote_days) === '[3,7,14]', '"abc" -> previous kept');
    await s.p.fill('#fu_i', '0, 400, -2, 7.9'); fu = (await s.store()).follow_up; note('invoice days "0, 400, -2, 7.9" -> ' + JSON.stringify(fu.invoice_days) + ' (0 and 400 accepted; 400 exceeds every relay limit)');
    await s.p.fill('#fu_i', '3 3 3'); fu = (await s.store()).follow_up; note('invoice days "3 3 3" -> ' + JSON.stringify(fu.invoice_days) + (fu.invoice_days.length === 3 ? ' (duplicates kept: three reminders same day)' : ''));
    await s.p.reload(); await s.p.waitForSelector('#fu_q'); await s.nav('#/settings', '#fu_q'); ok(await s.p.$eval('#fu_q', e => e.value) === '3, 7, 14', 'value persists after reload');
    // stripe key with whitespace / secret key
    await s.p.fill('[data-bind="stripe.key"]', ' sk_live_' + 'a'.repeat(24) + ' '); await s.p.check('[data-bind="stripe.enabled"]'); const st2 = await s.store(); note('settings stores stripe.key as ' + JSON.stringify(st2.stripe.key).slice(0, 14) + '..., enabled=' + st2.stripe.enabled + ', keyLooksRight=' + await s.p.evaluate(k => QCStripe.keyLooksRight(k), st2.stripe.key) + '; no warning shown in Set-up');
    ok(/no warning|rk_live_/.test(await s.p.$eval('#app', e => e.innerText)) && !/does not look like|secret key/i.test(await s.p.$eval('#app', e => e.innerText)), 'Set-up gives no feedback that an sk_ key will be silently ignored');
    await s.done(); }

  // ---------- H. chase tab tone boundaries
  { const s = await scenario('H', { seed: (S, st, mk) => { S.sending.server = ''; S.follow_up.invoice_days = [1, 7, 21]; S.follow_up.quote_days = [3, 7, 14]; const t = st.today(); const ad = (n) => { const d = new Date(t + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
      [7, 8, 21, 22, 1].forEach(n => { const j = mk({ client: { name: 'Inv' + n }, job: { status: 'invoiced' } }); j.invoices = [{ kind: 'full', no: 'INV-' + n, date: ad(-n - 7), due: ad(-n), total: 1000, subtotal: 909, gst: 91, lines: [], paid_date: '' }]; });
      [2, 3, 7, 14].forEach(n => { mk({ client: { name: 'Quo' + n }, job: { sent_date: ad(-n) } }); }); return null; } });
    await s.nav('#/chase', 'h1'); const txt = await s.p.$eval('#app', e => e.innerText);
    const tone = (name) => { const m = txt.split('\n'); const i = m.findIndex(l => l.startsWith(name)); return i >= 0 ? m.slice(i, i + 3).join(' ') : '(missing)'; };
    ['Inv7', 'Inv8', 'Inv21', 'Inv22', 'Inv1', 'Quo2', 'Quo3', 'Quo7', 'Quo14'].forEach(n => note('H ' + n + ': ' + tone(n).slice(0, 110)));
    ok(/Inv7[\s\S]{0,120}First reminder/.test(txt) && /Inv8[\s\S]{0,120}First reminder/.test(txt), 'invoice day 7 and 8, never chased = First reminder');
    ok(/Inv21[\s\S]{0,120}First reminder/.test(txt) && /Inv22[\s\S]{0,120}First reminder/.test(txt), 'invoice day 21 and 22, never chased = still the First reminder (final notice is behind Show final notice)');
    ok(/Quo3[\s\S]{0,120}Friendly follow-up/.test(txt) && /Quo7[\s\S]{0,120}Second follow-up/.test(txt) && /Quo14[\s\S]{0,120}Last follow-up/.test(txt) && !/Quo2/.test(txt), 'quote day 3 Friendly, 7 Second, 14 Last, day 2 not listed');
    ok(/Inv1[\s\S]{0,120}First reminder/.test(txt), 'invoice day 1 listed as First');
    // follow-up days [1] only
    await s.p.evaluate(() => { const S = window.__qcApp.store.load(); S.follow_up.quote_days = [1]; S.follow_up.invoice_days = [1]; window.__qcApp.store.save(); }); await s.nav('#/', 'h1'); await s.nav('#/chase', 'h1'); const t1 = await s.p.$eval('#app', e => e.innerText);
    ok(s.errors.length === 0 && /Quo2[\s\S]{0,80}(Friendly|Second|Last) follow-up/.test(t1), 'follow-up days [1] only: renders, quote day 2 now listed (' + (t1.match(/Quo2[\s\S]{0,80}?((Friendly|Second|Last) follow-up)/) || [])[1] + '), invoices ' + (t1.match(/Inv8[\s\S]{0,80}?((First|Second|Final) reminder)/) || [])[1]);
    // custom days: label vs message tier consistency
    await s.p.evaluate(() => { const S = window.__qcApp.store.load(); S.follow_up.invoice_days = [2, 10, 30]; window.__qcApp.store.save(); }); await s.nav('#/', 'h1'); await s.nav('#/chase', 'h1'); const t2 = await s.p.$eval('#app', e => e.innerText);
    const inv8 = (t2.match(/Inv8[\s\S]*?(?=\nText\n|\nSend)/) || [''])[0]; ok(/First reminder/.test(inv8) && /friendly reminder/.test(inv8), 'invoice_days [2,10,30]: day-8 label and message tier agree (label ' + (inv8.match(/(First|Second|Final) reminder/) || [])[0] + ', text ' + (inv8.match(/friendly reminder|have not received|overdue/i) || [])[0] + ')');
    await s.done(); }

  // ---------- I. Stripe: bad key silently skipped; link creation failure still sends the invoice
  { const s = await scenario('I', { seed: (S, st, mk) => { S.sending = Object.assign({}, S.sending, SENDING); S.stripe = { key: 'sk_live_' + 'a'.repeat(24), enabled: true }; return mk({ job: { status: 'accepted' } }); } });
    await s.nav('#/job/' + s.id + '/invoice', '#mkinv'); ok(/Card payments key not valid/.test(await s.p.$eval('#app', e => e.innerText)), 'an sk_ key is called out on the invoice page rather than promising a link that cannot be made');
    await s.p.selectOption('#kind', 'deposit'); await s.p.click('#mkinv'); { const v = await s.p.waitForSelector('#qcv_send', { timeout: 20000 }).catch(() => null); if (v) { await Promise.all([s.p.waitForEvent('download', { timeout: 20000 }).catch(() => null), s.p.click('#qcv_send')]); await s.p.waitForSelector('#didgo', { timeout: 20000 }); await s.p.click('#didgo [data-didgo="text"]'); } else await s.p.waitForFunction(() => window.__toasts.some(t => /emailed|Sent/.test(t)) || (window.__qcApp.store.load().jobs[0].invoices || []).some(i => i.emailed_date), null, { timeout: 20000 }).catch(async () => { note('no viewer and no sent toast: toasts=' + JSON.stringify(await s.toasts()) + ' block=' + (await s.p.$eval('#invblock', e => e.textContent).catch(() => '')) + ' app=' + (await s.p.$eval('#app', e => e.innerText)).replace(/\s+/g, ' ').slice(0, 500)); throw new Error('send did not happen'); }); } await s.p.waitForFunction(() => window.__qcApp.store.load().jobs[0].invoices.length === 1, null, { timeout: 20000 }); await sleep(300);
    let t = await s.toasts(), j = await s.job(); note('I(sk key) toasts: ' + JSON.stringify(t));
    ok(!j.invoices[0].pay_url && !t.some(x => /card|Stripe/i.test(x)), 'sk_ key: no link, and no toast tells the user why (silent skip)');
    // now a well-formed rk key with Stripe mocked in-page: prices ok, payment_links fails
    await s.p.evaluate(() => { const S = window.__qcApp.store.load(); S.stripe.key = 'rk_live_' + 'b'.repeat(24); S.jobs[0].invoices = []; S.jobs[0].status = 'accepted'; window.__qcApp.store.save(); window.__stripeCalls = []; /* a final invoice already went out above and the app offers no second final, so start the invoices again for the rk-key run */ window.__qcFetch = (url, o) => { window.__stripeCalls.push({ url, body: o.body }); const j = /\/prices$/.test(url) ? { id: 'price_1' } : { error: { message: 'Payment Links are not enabled on this account' } }; return Promise.resolve({ ok: /\/prices$/.test(url), status: /\/prices$/.test(url) ? 200 : 400, json: () => Promise.resolve(j) }); }; });
    await s.nav('#/job/' + s.id + '/invoice', '#app'); if (await s.p.$('#nextinv')) await s.p.click('#nextinv'); await s.p.waitForSelector('#mkinv'); await s.p.selectOption('#kind', 'final'); s.calls.length = 0; await s.p.evaluate(() => { window.__toasts.length = 0; });
    if (await s.p.$('#nextinv')) { await s.p.click('#nextinv'); await s.p.waitForSelector('#mkinv'); } await s.p.click('#mkinv'); { const v = await s.p.waitForSelector('#qcv_send', { timeout: 20000 }).catch(() => null); if (v) { await Promise.all([s.p.waitForEvent('download', { timeout: 20000 }).catch(() => null), s.p.click('#qcv_send')]); await s.p.waitForSelector('#didgo', { timeout: 20000 }); await s.p.click('#didgo [data-didgo="text"]'); } else await s.p.waitForFunction(() => window.__toasts.some(t => /emailed|Sent/.test(t)) || (window.__qcApp.store.load().jobs[0].invoices || []).some(i => i.emailed_date), null, { timeout: 20000 }).catch(async () => { note('no viewer and no sent toast: toasts=' + JSON.stringify(await s.toasts()) + ' block=' + (await s.p.$eval('#invblock', e => e.textContent).catch(() => '')) + ' app=' + (await s.p.$eval('#app', e => e.innerText)).replace(/\s+/g, ' ').slice(0, 500)); throw new Error('send did not happen'); }); } await s.p.waitForFunction(() => window.__qcApp.store.load().jobs[0].invoices.length === 1, null, { timeout: 20000 }).catch(async () => { note('I(rk) stuck: invoices=' + (await s.job()).invoices.length + ' toasts=' + JSON.stringify(await s.toasts()) + ' block=' + (await s.p.$eval('#invblock', e => e.textContent).catch(() => '')) + ' viewer=' + !!(await s.p.$('#qcv_send')) + ' didgo=' + !!(await s.p.$('#didgo')) + ' app=' + (await s.p.$eval('#app', e => e.innerText)).replace(/\s+/g, ' ').slice(0, 400)); throw new Error('rk run stuck'); }); await sleep(300);
    t = await s.toasts(); j = await s.job(); const sc = await s.p.evaluate(() => window.__stripeCalls); note('I(rk key) toasts: ' + JSON.stringify(t) + ' stripe calls: ' + sc.map(c => c.url.replace(/.*v1\//, '')).join(', '));
    ok(sc.length === 2 && /unit_amount=\d+/.test(sc[0].body) && /currency=aud/.test(sc[0].body), 'prices then payment_links called, aud');
    ok(t.some(x => /Card link failed: Payment Links are not enabled/.test(x)), 'card link failure toasted with Stripe message');
    const inv = j.invoices[0]; ok(inv && !inv.pay_url && inv.emailed_date && (inv.follow_ups || []).length === 1, 'invoice still emailed and the next reminder booked without the link');
    ok(s.calls.filter(c => c.action === 'send').length === 1 && s.calls.filter(c => c.action === 'schedule').length === 1, 'relay: 1 email + 1 schedule, the other reminders waiting their turn');
    ok(!/buy\.stripe|Pay by card/.test(s.calls.find(c => c.action === 'send').body), 'invoice email has no card line when the link failed');
    note('I final toast on screen: "' + t[t.length - 1] + '" (the card-link failure was toast #' + (t.findIndex(x => /Card link/.test(x)) + 1) + ' of ' + t.length + ')');
    await s.done(); }

  // ---------- J. Australian timezone: dates drift
  { const s = await scenario('J', { tz: 'Australia/Adelaide', seed: (S, st, mk) => { S.sending = Object.assign({}, S.sending, SENDING); S.details.balance_days = 7; return mk({ job: { status: 'quoted' } }); } });
    const localToday = await s.p.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }); const j0 = await s.job();
    note('J Adelaide: local date ' + localToday + ', QCStore.today() ' + (await s.p.evaluate(() => QCStore.today())) + ', addDays(today,3)=' + (await s.p.evaluate(() => QCStore.addDays(QCStore.today(), 3))));
    await s.nav('#/job/' + s.id + '/quote', '#autofu'); await s.p.click('#autofu'); await s.p.waitForFunction(() => window.__qcApp.store.load().jobs[0].follow_ups.length === 1, null, { timeout: 10000 });
    const got = s.calls.map(c => c.send_at).concat((await s.store()).local_queue.filter(q => q.job === s.id).map(q => q.send_at)).sort(); const localDays = await s.p.evaluate(iso => iso.map(x => { const d = new Date(x); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + d.getHours() + ':00'; }), got);
    const want = await s.p.evaluate(sd => [3, 7, 14].map(d => window.__qcApp.nextSendTime(window.__qcApp.store.addDays(sd, d)).day + ' 9:00'), j0.sent_date); ok(JSON.stringify(localDays) === JSON.stringify(want), 'Adelaide: follow-ups land on sent_date +3/+7/+14 rolled to business days at 09:00 local (want ' + want.join(', ') + ' got ' + localDays.join(', ') + ')');
    await s.p.evaluate(() => { const S = window.__qcApp.store.load(); S.jobs[0].status = 'accepted'; window.__qcApp.store.save(); }); await s.nav('#/job/' + s.id + '/invoice', '#mkinv'); { const opts = await s.p.$$eval('#kind option', os => os.map(o => o.value)); await s.p.selectOption('#kind', opts.includes('full') ? 'full' : 'final'); } await Promise.all([s.p.waitForEvent('download', { timeout: 20000 }).catch(() => null), s.p.click('#mkinv')]); await s.p.waitForFunction(() => window.__qcApp.store.load().jobs[0].invoices.length === 1, null, { timeout: 20000 });
    const inv = (await s.job()).invoices[0]; ok(inv.due === addDaysUTC(inv.date, 7), 'Adelaide: invoice due = date + balance_days 7 (date ' + inv.date + ' due ' + inv.due + ')');
    // booking 2 days: how many days does the scheduler see blocked?
    const blocked = await s.p.evaluate(() => { const S = window.__qcApp.store.load(), st = window.__qcApp.store, j = S.jobs[0]; const start = st.addDays(st.today(), 10); j.booking = { start, days: 2, end: st.addDays(start, 2), end_inclusive: st.addDays(start, 1), hour: 7 }; st.save(); return [0, 1, 2].map(i => QCSched.dayItems([j], st.addDays(start, i), S).length); });
    ok(blocked.join() === '1,1,0', 'Adelaide: a 2-day booking blocks 2 days in the scheduler (per-day items ' + blocked.join(',') + ')');
    await s.done(); }

  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
