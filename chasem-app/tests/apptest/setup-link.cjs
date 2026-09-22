// The set-up link (#/setup?d=j:... / z:...), the paste-the-code field, hosted sending wording and expiry, the Scoreboard.
const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); };
const __JOINED = () => { try { const k = 'qc-app-v1', raw = localStorage.getItem(k); const s = raw ? JSON.parse(raw) : {}; s.account = Object.assign({ email: 'test@example.com', joined: '2026-01-01' }, s.account || {}); localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }; // the app asks for an email before it opens; these suites are about what comes after
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jcode = obj => 'j:' + b64u(Buffer.from(JSON.stringify(obj), 'utf8'));
const zcode = obj => 'z:' + b64u(zlib.deflateRawSync(Buffer.from(JSON.stringify(obj), 'utf8')));
const isoDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.addInitScript(__JOINED); await p.addInitScript(__OPEN_SEC);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  const text = () => p.$eval('#app', e => e.innerText);
  const state = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__qcApp.store.load())));
  const toastText = async () => { await p.waitForSelector('#toast:not([hidden])', { timeout: 4000 }).catch(() => null); return p.$eval('#toast', e => e.textContent).catch(() => ''); };

  await p.goto(base, { waitUntil: 'load' });
  // what the painter already has on the phone before the link is opened
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.details.trading_name = 'Existing Co'; S.details.owner_name = ''; S.prices.p_walls = 99; const j = st.newJob(); j.id = 'pf_a'; j.client.name = 'Already Here'; st.save(); });
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' });
  ok(!/Scoreboard/.test(await text()), 'home has no Scoreboard link before a start date is set');
  const d21 = isoDays(-21), d7 = isoDays(-7), start = isoDays(-20), until = isoDays(90);
  const P = { v: 1, settings: {
      details: { trading_name: '', owner_name: 'Dave', abn: '', email: 'dave@example.com', postcode: '5000', state: 'SA' },
      prices: { p_walls: 50, p_ceilings: 40 },
      sending: { server: 'https://relay.example.test/api/msg', token: 'qc_tok', server_has_creds: true, hosted: true, hosted_until: until, hosted_name: "Dave's Painting" } },
    jobs: [
      { id: 'pf_a', client: { name: 'Dupe', phone: '', address: '' }, summary: 'should not land', status: 'draft' },
      { id: 'pf_b', client: { name: 'New Person', phone: '0411 222 333', address: '1 High St Adelaide 5000' }, summary: 'Repaint hall', notes: 'Loaded from your book by Aaron before the call. Check the figure.', status: 'quoted', manual_total: 2000, quote: { number: '', total: 2200, subtotal: 2000, sent_date: d21 }, sent_date: d21, sent_how: 'other', sent_confirmed: true },
      { id: 'pf_c', client: { name: 'Owing Person', phone: '0411 000 111', address: '' }, summary: 'Exterior', notes: '', status: 'invoiced', manual_total: 3000, quote: { number: '', total: 3300, subtotal: 3000, sent_date: d21 }, sent_date: d21, sent_how: 'other', sent_confirmed: true, invoices: [{ no: '', kind: 'final', total: 3300, subtotal: 3000, date: d21, due: d7, sent_date: d21, sent_how: 'other', sent_confirmed: true, lines: [{ desc: 'Exterior', qty: 1, unit: 'job', amount: 3000 }], payments: [] }] },
      { id: 'pf_d', client: { name: 'Draft Person', phone: '', address: '' }, summary: 'Two bedrooms', notes: '', status: 'draft' }],
    scoreboard_start: start, note: 'Your details and prices, ready to load' };
  const J = jcode(P);
  // ---- j: link -> confirm screen
  await p.goto(base + '#/setup?d=' + J, { waitUntil: 'load' }); await p.waitForSelector('#setupload');
  let t = await text();
  ok(/Set up your app\?/.test(t) && /Your details and prices, ready to load/.test(t), 'confirm screen with the note');
  ok(/Business details\s*yes/.test(t) && /Prices\s*2/.test(t) && /Jobs\s*4/.test(t) && /on, in your name, paid to/.test(t) && /Scoreboard\s*counts from/.test(t), 'confirm lists details, 2 prices, 4 jobs, hosted until, scoreboard: ' + t.replace(/\s+/g, ' ').slice(0, 260));
  await p.click('#setupload'); await p.waitForFunction(() => location.hash === '#/' || location.hash === '');
  const tt = await toastText(); ok(/Loaded: your prices, details and 3 jobs/.test(tt), 'toast: ' + tt);
  let S = await state();
  ok(S.details.trading_name === 'Existing Co' && S.details.owner_name === 'Dave' && S.details.email === 'dave@example.com' && S.details.state === 'SA', 'details merged: blank trading_name did not wipe Existing Co, owner_name and email filled');
  ok(S.prices.p_walls === 50 && S.prices.p_ceilings === 40 && S.prices.p_doors === (await p.evaluate(() => QCStore.defaults ? QCStore.defaults().prices.p_doors : window.__qcApp.store.load().prices.p_doors)), 'prices: only the two given are changed');
  ok(S.jobs.length === 4 && S.jobs.filter(j => j.id === 'pf_a').length === 1 && S.jobs.filter(j => j.id === 'pf_a')[0].client.name === 'Already Here', 'jobs: pf_a kept as it was, three new ones appended (' + S.jobs.map(j => j.id).join(',') + ')');
  const jb = S.jobs.filter(j => j.id === 'pf_b')[0], jc = S.jobs.filter(j => j.id === 'pf_c')[0];
  ok(jb && /^Q-\d+$/.test(jb.quote_no) && jb.quote_no !== 'Q-1001' && jb.quote.number === jb.quote_no && jb.quote.lines.length === 1 && jb.quote.total === 2200 && jb.quote.gst === 200 && jb.quote.subtotal === 2000 && jb.status === 'quoted', 'pf_b got a quote number, a one-line snapshot with GST: ' + (jb && jb.quote_no) + ' ' + JSON.stringify(jb && [jb.quote.number, jb.quote.total, jb.quote.gst]));
  ok(jc && /^INV-\d+$/.test(jc.invoices[0].no) && jc.invoices[0].gst === 300 && jc.invoices[0].client_snapshot && jc.invoices[0].lines[0].desc === 'Exterior', 'pf_c invoice got a number and GST: ' + (jc && jc.invoices[0].no));
  ok(S.next_quote > parseInt(jc.quote_no.slice(2), 10), 'next quote number moved past the loaded ones (' + S.next_quote + ')');
  ok(S.sending.hosted === true && S.sending.server === 'https://relay.example.test/api/msg' && S.sending.token === 'qc_tok' && S.sending.server_has_creds === true && S.sending.hosted_until === until, 'sending set to hosted');
  ok(S.ui.scoreboard_start === start, 'scoreboard start stored');
  // the loaded quote holds its figure on the quote screen and the chase screen
  await p.goto(base + '#/job/pf_b/quote', { waitUntil: 'load' }); await p.waitForSelector('h1'); t = await text();
  ok(/From your book, loaded when you set up/.test(t) && /\$2,200/.test(t) && !/With the changes since/.test(t) && /Repaint hall/.test(t), 'quote screen shows the book figure, no revision warning');
  await p.goto(base + '#/chase', { waitUntil: 'load' }); await p.waitForSelector('h1'); t = await text();
  ok(/New Person/.test(t) && /\$2,200/.test(t) && /Owing Person/.test(t) && /\$3,300/.test(t), 'chase lists the loaded quote and the loaded invoice at their figures');
  // ---- loading the same link again adds nothing
  await p.goto(base + '#/setup?d=' + J, { waitUntil: 'load' }); await p.waitForSelector('#setupload'); await p.click('#setupload'); await p.waitForFunction(() => location.hash === '#/' || location.hash === '');
  const tt2 = await toastText(); S = await state(); ok(S.jobs.length === 4 && /Already loaded: nothing new/.test(tt2), 'second load: no duplicate jobs, toast says nothing new (' + tt2 + ')');
  // ---- z: link, Not now, then Load
  const P2 = { v: 1, settings: { details: { licence: 'BLD 123', trading_name: 'Overwrite Co' } }, jobs: [] }, Z = zcode(P2);
  await p.goto(base + '#/setup?d=' + Z, { waitUntil: 'load' }); await p.waitForSelector('#setupload'); t = await text();
  ok(/Business details\s*yes/.test(t) && /Jobs\s*none/.test(t) && /Sending\s*not included/.test(t), 'z: code decodes to the confirm screen');
  await p.click('a:has-text("Not now")'); await p.waitForFunction(() => location.hash === '#/' || location.hash === ''); S = await state(); ok(S.details.licence === '' && S.details.trading_name === 'Existing Co', 'Not now changes nothing');
  await p.goto(base + '#/setup?d=' + Z, { waitUntil: 'load' }); await p.waitForSelector('#setupload'); await p.click('#setupload'); await p.waitForFunction(() => location.hash === '#/' || location.hash === '');
  const tt3 = await toastText(); S = await state(); ok(S.details.licence === 'BLD 123' && S.details.trading_name === 'Overwrite Co' && /Loaded: details and 0 jobs/.test(tt3), 'z: load: licence filled, a filled-in value from Aaron replaces the old one (' + tt3 + ')');
  // ---- bad codes
  await p.goto(base + '#/setup?d=j:notbase64!!', { waitUntil: 'load' }); await p.waitForSelector('#setupcodego'); t = await text(); ok(/does not look like|not complete/.test(t) && /Paste your set-up code/.test(t), 'rubbish code: message and paste box');
  await p.goto(base + '#/setup?d=' + jcode({ v: 2, settings: {} }), { waitUntil: 'load' }); await p.waitForSelector('#setupcodego'); t = await text(); ok(/different version/.test(t), 'v:2 refused');
  const big = jcode({ v: 1, settings: { wording: { terms: [new Array(210 * 1024).join('x')] } } });
  await p.goto(base + '#/setup?d=' + big, { waitUntil: 'load' }); await p.waitForSelector('#setupcodego'); t = await text(); ok(/too big/.test(t), 'over 200 KB refused');
  // ---- paste-the-code field in Set-up (full link)
  await p.goto(base + '#/settings', { waitUntil: 'load' }); await p.waitForSelector('#setupcode');
  await p.fill('#setupcode', 'https://chasem.example/app/#/setup?d=' + J); await p.click('#setupcodego');
  await p.waitForFunction(() => /^#\/setup\?d=j:/.test(location.hash)); await p.waitForSelector('#setupload'); t = await text(); ok(/Set up your app\?/.test(t) && /Prices\s*2/.test(t), 'pasting the whole link opens the same confirm screen'); // was: ok(/Load the set-up from Aaron\?/.test(t) && /Jobs\s*4/.test(t), 'pasting the whole link opens the same confirm screen');
  await p.goto(base + '#/settings', { waitUntil: 'load' }); await p.waitForSelector('#setupcode'); await p.fill('#setupcode', 'hello there'); await p.click('#setupcodego');
  ok(/does not look like a set-up code/.test(await p.$eval('#setupcoderes', e => e.textContent)), 'pasting rubbish says so');
  // ---- hosted wording and readiness
  t = await text();
  ok(new RegExp("On, and paid to [^,]+, when it renews itself\\. Texts and emails go out in your name and there is nothing to open\\.").test(t), 'hosted first line: paid, renews itself');
  ok(/Only for running your own accounts instead\./.test(t), 'own-accounts line inside the fold');
  ok(await p.evaluate(() => QCMsg.ready('sms') && QCMsg.ready('email')), 'QCMsg.ready true for sms and email with server + token + server_has_creds');
  // scheduled emails carry reply_to = details.email, bodies carry the sign-off
  const sched = await p.evaluate(async () => { const calls = []; window.__qcRelayFetch = (u, o) => { calls.push(JSON.parse(o.body)); return Promise.resolve({ json: () => Promise.resolve({ ok: true, id: 'SM' + calls.length }) }); }; const day = window.__qcApp.store.addDays(window.__qcApp.store.today(), 3); await QCMsg.scheduleAll([{ day, channel: 'email', to: 'c@example.com', subject: 's', body: 'b', ref: 'quote+3', key: 'k1', job: 'pf_b', reply_to: 'dave@example.com' }, { day, channel: 'sms', to: '0411222333', body: 'b', ref: 'quote+3', key: 'k2', job: 'pf_b', reply_to: 'dave@example.com' }], 9); window.__qcRelayFetch = null; return calls; });
  ok(sched.length === 2 && sched[0].reply_to === 'dave@example.com' && sched[0].token === 'qc_tok' && !('creds' in sched[0]) && sched[1].reply_to === undefined, 'scheduled email carries reply_to and the token, no creds; sms carries none: ' + JSON.stringify(sched.map(c => [c.channel, c.reply_to])));
  await p.goto(base + '#/job/pf_b', { waitUntil: 'load' }); await p.waitForSelector('h1'); t = await text(); ok(/Quoted \$2,200\. Sent to New/.test(t), 'job page shows the loaded job as quoted at $2,200: ' + t.replace(/\s+/g, ' ').slice(0, 80));
  // ---- hosted_until in the past
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending.hosted_until = st.addDays(st.today(), -1); st.save(); });
  await p.goto(base + '#/settings', { waitUntil: 'load' }); await p.waitForSelector('#setupcode'); t = await text();
  ok(/The chasing is off: your sending ran to [^.]+\. Turn it back on at the website/.test(t), 'expired hosted line');
  ok(await p.evaluate(() => !QCMsg.ready('sms') && !QCMsg.ready('email') && QCMsg.hostedEnded()), 'QCMsg.ready false once hosted_until has passed');
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending.hosted_until = st.addDays(st.today(), 90); st.save(); });
  // ---- window.__qcApp hooks: encodeSetup / applySetup
  const hook = await p.evaluate(() => { const a = window.__qcApp, code = a.encodeSetup({ v: 1, settings: { details: { insurance: 'Pol 9' } }, jobs: [] }); const r = a.applySetup({ v: 1, settings: { details: { insurance: 'Pol 9' } }, jobs: [{ id: 'pf_e', client: { name: 'Hook Person' } }] }); return { code, r, ins: a.store.load().details.insurance, n: a.store.load().jobs.length }; });
  ok(/^j:[A-Za-z0-9_-]+$/.test(hook.code) && hook.r.jobs === 1 && hook.ins === 'Pol 9' && hook.n === 5, 'window.__qcApp.encodeSetup / applySetup work: ' + JSON.stringify(hook.r));
  const roundtrip = await p.evaluate(code => window.__qcApp.decodeSetup(code).then(o => o.settings.details.insurance), hook.code); ok(roundtrip === 'Pol 9', 'decodeSetup reads what encodeSetup wrote');
  // ---- Scoreboard on a seeded state
  await p.evaluate(start => {
    const st = window.__qcApp.store; st.reset(); const S = st.load(), T = st.today(), D = n => st.addDays(T, n); S.account = { email: 'test@example.com', joined: T }; // reset wipes the account too, as it should
    Object.assign(S.details, { trading_name: 'Test Painting Co', owner_name: 'Sam Tester' }); S.ui = { scoreboard_start: start };
    const iso = (day, h) => new Date(day + 'T' + (h < 10 ? '0' : '') + h + ':00:00').toISOString();
    const mk = (name, extra) => st.normaliseJob(Object.assign({ id: 'sb_' + name.toLowerCase(), client: { name, phone: '0411 222 333' }, status: 'quoted', quote: { total: 1100, subtotal: 1000, gst: 100, lines: [] } }, extra));
    S.jobs = [
      mk('Alpha', { sent_date: D(-15), sent_confirmed: true, rooms: [{ id: 'r1', name: 'Lounge', method: 'measured', walls: [{ width_mm: 3000, height_mm: 2400, paint_area_m2: 7.2 }] }] }),
      mk('Bravo', { sent_date: D(-10), sent_confirmed: true, rooms: [{ id: 'r2', name: 'Hall', method: 'typed', L: 4, W: 2 }] }),
      mk('Charlie', { sent_date: D(-30), sent_confirmed: true }),
      mk('', { sent_date: D(-5), sent_confirmed: true }),
      mk('Echo', { sent_date: D(-14), sent_confirmed: true, status: 'invoiced', invoices: [
        { no: 'INV-1', kind: 'deposit', total: 500, subtotal: 454.55, gst: 45.45, date: D(-12), due: D(-10), sent_date: D(-12), sent_confirmed: true, paid_date: D(-7), payments: [{ id: 'p1', amount: 500, date: D(-7), method: 'bank' }], lines: [] },
        { no: 'INV-2', kind: 'final', total: 2000, subtotal: 1818.18, gst: 181.82, date: D(-5), due: D(-2), sent_date: D(-5), sent_confirmed: true, paid_date: D(-3), payments: [{ id: 'p2', amount: 2000, date: D(-3), method: 'bank' }], lines: [] }] }),
      mk('Foxtrot', { sent_date: D(-28), sent_confirmed: true, status: 'invoiced', invoices: [{ no: 'INV-0', kind: 'deposit', total: 300, subtotal: 272.73, gst: 27.27, date: D(-25), due: D(-23), sent_date: D(-25), sent_confirmed: true, paid_date: D(-22), payments: [{ id: 'p0', amount: 300, date: D(-22), method: 'bank' }], lines: [] }] })];
    S.log = { sent: [
      { t: iso(D(-6), 10), kind: 'schedule', ok: true, id: 's1', channel: 'sms', send_at: iso(D(-3), 9), job: 'sb_alpha', ref: 'quote+3' },
      { t: iso(D(-6), 10), kind: 'schedule', ok: true, id: 's2', channel: 'sms', send_at: iso(D(-1), 9), job: 'sb_alpha', ref: 'quote+7' },
      { t: iso(D(-6), 10), kind: 'schedule', ok: true, id: 's3', channel: 'sms', send_at: iso(D(5), 9), job: 'sb_alpha', ref: 'quote+14' },
      { t: iso(D(-6), 10), kind: 'schedule', ok: true, id: 's4', channel: 'email', send_at: iso(D(-2), 9), job: 'sb_bravo', ref: 'quote+3' },
      { t: iso(D(-4), 10), kind: 'cancel', ok: true, id: 's4', channel: 'email', job: 'sb_bravo', ref: 'quote+3' },
      { t: iso(D(-4), 9), kind: 'send', ok: true, auto: true, channel: 'sms', job: 'sb_bravo', ref: 'quote+7' },
      { t: iso(D(-4), 9), kind: 'send', ok: true, by: 'you', channel: 'sms', job: 'sb_bravo', ref: 'quote+7' },
      { t: iso(D(-26), 10), kind: 'schedule', ok: true, id: 's5', channel: 'sms', send_at: iso(D(-25), 9), job: 'sb_charlie', ref: 'quote+3' }] };
    st.save();
  }, start);
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); t = await text();
  ok(/Scoreboard/.test(t) && /How it is going/.test(t), 'home links to the Scoreboard once a start date is set');
  await p.click('a[href="#/scoreboard"]'); await p.waitForSelector('#sbshare'); t = await text();
  const sb = await p.evaluate(() => window.__qcApp.scoreboardData(window.__qcApp.store.load().ui.scoreboard_start));
  ok(sb.quotes === 3 && sb.measured === 1 && sb.auto === 3 && sb.first_paid_days === 13 && sb.paid.length === 2 && sb.paid_total === 2500 && sb.deposits === 1 && sb.deposit_total === 500, 'scoreboard numbers: ' + JSON.stringify([sb.quotes, sb.measured, sb.auto, sb.first_paid_days, sb.paid.length, sb.paid_total, sb.deposits, sb.deposit_total]));
  ok(/Quotes sent to customers\s*3/.test(t) && /Measured with the sheet[\s\S]{0,90}\n1\n/.test(t) && /went by themselves\s*3/.test(t) && /13 days in/.test(t) && /Deposit invoices sent\s*1 · \$500/.test(t), 'scoreboard page shows the rows');
  const exp = new RegExp('^Since [A-Za-z0-9 ]+: 3 quotes sent, 1 measured with the sheet\\. 3 follow-ups went by themselves\\. First invoice paid [A-Za-z0-9 ]+, 13 days in; 2 paid so far, \\$2,500\\. 1 deposit invoice sent, \\$500\\.$');
  ok(exp.test(sb.text), 'summary sentence: ' + sb.text);
  const shared = await p.evaluate(() => new Promise(res => { navigator.share = d => { res(d); return Promise.resolve(); }; document.getElementById('sbshare').click(); setTimeout(() => res(null), 1500); }));
  ok(shared && shared.text === sb.text, 'Share hands the sentence to the phone: ' + (shared && shared.text && shared.text.slice(0, 60)));
  await p.waitForTimeout(300); const logged = await p.evaluate(() => window.__qcApp.store.load().log.sent[0]); ok(logged && logged.kind === 'handed' && /summary/i.test(logged.text), 'share is written to the sent log as handed: ' + (logged && logged.text));
  ok(!(await p.$('#didgo')), 'no Did-it-go question after sharing the scoreboard');
  ok(await p.evaluate(() => { let m = 0; document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.right > m) m = r.right; }); return m <= innerWidth + 1; }), 'no horizontal overflow on the scoreboard');
  await p.goto(base + '#/scoreboard', { waitUntil: 'load' }); await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); delete S.ui.scoreboard_start; st.save(); }); await p.goto(base + '#/scoreboard', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); t = await text(); ok(/No start date yet/.test(t), 'scoreboard without a start date says so');
  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
