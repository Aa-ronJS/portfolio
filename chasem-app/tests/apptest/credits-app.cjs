// The app under the credits model: an email opens it, the balance shows where it matters, running out degrades to hand-send.
const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); };
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
let cfg = null;
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; if (p === '/config.js' && cfg) { res.writeHead(200, { 'Content-Type': 'application/javascript' }); return res.end(cfg); } fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jcode = obj => 'j:' + b64u(Buffer.from(JSON.stringify(obj), 'utf8'));
const MOCK = () => { window.__qcCalls = []; let saved = null; try { saved = JSON.parse(sessionStorage.getItem('qcmock') || 'null'); } catch (e) {}
  window.__qcMock = saved || { signup: null, signin: null, relay: { ok: true, id: 'ID1' }, topup: { ok: true, messages: 100, charged: 35, left: 100, used: 0, included: 100 }, seat: { ok: true, seat: 2, link: 'https://x/app/#/setup?d=j:eyJ2IjoxfQ' } };
  window.__qcRelayFetch = (u, o) => { const b = JSON.parse(o.body); window.__qcCalls.push({ url: u, body: b });
    const r = /\/signin$/.test(u) ? window.__qcMock.signin : /\/signup$/.test(u) ? window.__qcMock.signup : /\/topup$/.test(u) ? window.__qcMock.topup : /\/seat$/.test(u) ? window.__qcMock.seat : window.__qcMock.relay;
    return Promise.resolve({ json: () => Promise.resolve(r) }); }; };

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.addInitScript(__OPEN_SEC); await p.addInitScript(MOCK);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  const text = () => p.$eval('#app', e => e.innerText);
  const state = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__qcApp.store.load())));
  const setMock = m => p.evaluate(m => { window.__qcMock = Object.assign(window.__qcMock || {}, m); try { sessionStorage.setItem('qcmock', JSON.stringify(window.__qcMock)); } catch (e) {} }, m);
  const toastText = async () => { await p.waitForSelector('#toast:not([hidden])', { timeout: 4000 }).catch(() => null); return p.$eval('#toast', e => e.textContent).catch(() => ''); };

  // ---- the door: nothing works until the app knows whose it is
  cfg = "window.QC_APP = { maps_key: '', signup_url: 'https://relay.example.test/api/signup' };";
  await p.goto(base, { waitUntil: 'load' }); await p.waitForSelector('#joinform'); let t = await text();
  ok(/Chasem/.test(t) && /3 jobs free/.test(t) && /\$99 a month/.test(t) && /\$35 for 100/.test(t), 'the door states the price in one line: ' + t.replace(/\s+/g, ' ').slice(0, 90));
  ok(!(await p.$('[data-nav]:not([hidden])')) || !/New job/.test(t), 'no jobs screen behind the door');
  await p.fill('#join_email', 'not-an-email'); await p.click('#join_go');
  ok(/does not look like an email/.test(await p.$eval('#join_msg', e => e.textContent)), 'a bad address is refused on the phone, before any request');
  // the relay answers with a set-up link carrying the token and the free twelve
  const payload = { v: 1, settings: { details: { email: 'dave@example.com', trading_name: "Dave's Painting" }, sending: { server: 'https://relay.example.test/api/msg', token: 'qc1.FREE.SIG', server_has_creds: true, hosted: true, hosted_until: '', hosted_name: "Dave's Painting" } }, jobs: [], note: 'Your app, ready to go.' };
  // the code step, then the account
  await setMock({ signin: { ok: true, sent: true } });
  await p.fill('#join_email', 'dave@example.com'); await p.click('#join_go'); await p.waitForTimeout(700);
  await setMock({ signin: { ok: true, token: 'qc1.FREE.SIG', cus: 'cus_free1',
    sending: { server: 'https://relay.example.test/api/msg', token: 'qc1.FREE.SIG', server_has_creds: true, hosted: true },
    setup: payload } });
  await p.fill('#join_code', '654321'); await p.waitForTimeout(900);
  let S = await state();
  ok(S.account.email === 'dave@example.com' && S.sending.token === 'qc1.FREE.SIG', 'the account and the token are on the phone once the code is right');
  ok(S.details.trading_name === "Dave's Painting", 'and his details came back with the account');
  // a new account meets the wall, not the jobs list
  t = await text();
  ok(/of 5/.test(t), 'a new account is walked through set-up before anything else: ' + t.replace(/\s+/g, ' ').slice(0, 60));
  await p.evaluate(() => { const st = window.__qcApp.store, S2 = st.load();
    S2.details.abn = '12 345 678 901'; S2.details.state = 'SA'; S2.security.setup_done = true;
    S2.payment = { account_name: 'Dave', bsb: '063-000', account_number: '12345678' }; st.save(); });
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.waitForSelector('h1'); t = await text();
  ok(/Jobs/.test(t) && !(await p.$('#joinform')), 'and once set up it opens straight to the jobs');

  // ---- the balance, wherever it matters
  await setMock({ relay: { ok: true, id: 'SM1', left: 11, used: 1, included: 12, plan: 'free', period: 'once' } });
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); const j = st.newJob(); j.id = 'cr_a'; j.client = { name: 'Margaret', phone: '0411222333', email: 'm@x.com', address: '' }; j.status = 'quoted'; j.manual_total = 2000; j.quote = { number: j.quote_no, total: 2200, subtotal: 2000, gst: 200, sent_date: st.today(), lines: [{ desc: 'x', amount: 2000, qty: 1, unit: 'job', rate: 2000 }] }; j.sent_date = st.today(); j.sent_confirmed = true; j.sent_how = 'other'; st.save(); });
  await p.evaluate(() => window.QCMsg.call({ action: 'ping' }).catch(() => null));
  await p.waitForFunction(() => window.__qcApp.store.load().sending.bal_left === 11, { timeout: 4000 });
  await p.goto(base + '#/chase', { waitUntil: 'load' }); await p.waitForSelector('h1'); t = await text();
  ok(/11 of 12 messages left to start\./.test(t), 'the Follow-ups tab says where the allowance stands: ' + (t.match(/\d+ of \d+ messages[^\n]*/) || [''])[0]);
  await p.goto(base + '#/settings', { waitUntil: 'load' }); await p.waitForSelector('#setupcode'); t = await text();
  ok(/11 of 12 messages left to start\./.test(t), 'so does the sending card in Set-up');
  // running low puts a top-up link next to it
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending.bal_left = 2; st.save(); });
  await p.goto(base + '#/chase', { waitUntil: 'load' }); await p.waitForSelector('h1');
  ok(!!(await p.$('#balline a')), 'down to the last few, a top-up link appears');

  // ---- running out: it never fails silently and never stops him working
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending.bal_left = 0; st.save(); });
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('h1'); t = await text();
  ok(/No messages left\. The app still writes every message; you send it\./.test(t) && !!(await p.$('#balline a')), 'out of messages: the tab says so and offers the way out');
  const sch = await p.evaluate(async () => { window.__qcCalls = []; const r = await window.__qcApp.scheduleFollowUps(window.__qcApp.store.getJob('cr_a'), 'quote'); return { r: r, calls: window.__qcCalls.length }; });
  ok(sch.calls === 0 && sch.r.reason === 'out of messages' && sch.r.scheduled.length === 0, 'it does not even ask the relay when there is nothing left');
  ok(/Out of messages\. The app still writes every one; you tap Send\./.test(await toastText()), 'and it says so in words a painter can act on');
  // the relay refusing mid-flight is reported, not swallowed
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending.bal_left = 5; st.save(); });
  await setMock({ relay: { ok: false, error: 'You are out of messages', out_of_messages: true, left: 0, used: 5, included: 5, plan: 'free' } });
  const err = await p.evaluate(() => window.QCMsg.call({ action: 'send', channel: 'sms', to: '0411222333', body: 'x' }).then(() => null, e => ({ m: e.message, out: !!e.outOfMessages })));
  ok(err && err.out === true && /out of messages/i.test(err.m), 'a refusal from the relay comes back marked, not as a mystery failure');
  ok((await state()).sending.bal_left === 0, 'and the phone updates its own count from the refusal');

  // ---- one tap buys a pack on the card already on file
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); Object.assign(S.sending, { bal_left: 3, bal_included: 150, bal_used: 147, bal_plan: 'paid', auto_topup: false }); st.save(); });
  await p.goto(base + '#/settings', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#topnow'); t = await text();
  ok(/Top up 100 messages, \$35/.test(t) && /Top up by itself when I run out/.test(t), 'a paid account gets one tap and a switch, not a web page');
  await p.click('#topnow'); await p.waitForFunction(() => /messages added/.test(document.getElementById('toast').textContent), { timeout: 5000 });
  const tcall = await p.evaluate(() => window.__qcCalls.filter(c => /topup/.test(c.url)).pop());
  ok(/100 messages added, \$35 charged to your card\./.test(await toastText()) && tcall.url === 'https://relay.example.test/api/topup' && tcall.body.buy === true && tcall.body.token === 'qc1.FREE.SIG', 'it charges the card and says so, with no browser opened');
  // the switch is saved on both sides
  await p.waitForSelector('#topauto'); await p.click('#topauto');
  await p.waitForFunction(() => window.__qcApp.store.load().sending.auto_topup === true, { timeout: 5000 });
  const acall = await p.evaluate(() => window.__qcCalls.filter(c => /topup/.test(c.url)).pop());
  ok(acall.body.auto === true && !acall.body.buy, 'turning the switch on tells the relay and is not a purchase');
  ok(/Up to three packs a month, never more\./.test(await p.$eval('#topres', e => e.textContent)), 'and it says where the ceiling is');
  // a card that needs him says so plainly
  await setMock({ topup: { ok: false, needs_card: true, error: 'That card needs you: requires_action' } });
  await p.goto(base + '#/settings', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#topnow'); await p.click('#topnow');
  await p.waitForFunction(() => /card needs a look/.test(document.getElementById('topres').textContent), { timeout: 5000 });
  ok(/Your card needs a look\. Tap Manage to fix it\./.test(await p.$eval('#topres', e => e.textContent)), 'a card that needs him is explained, not swallowed');
  // a free account is offered the plan, not a pack
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending.bal_plan = 'free'; st.save(); });
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#setupcode'); t = await text();
  ok(/Go monthly: 150 messages for \$99 a month/.test(t) && !(await p.$('#topnow')), 'a free account is shown the plan, not a top-up');

  // ---- the second phone
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); Object.assign(S.sending, { bal_left: 200, bal_included: 250, bal_used: 50, bal_plan: 'paid', bal_seats: 1, bal_seat: 1 }); st.save(); });
  await p.goto(base + '#/settings', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#setupcode'); t = await text();
  ok(/Two of you\? The two-phone plan is \$149 a month with 250 messages\./.test(t) && !(await p.$('#seatgo')), 'a one-phone plan is offered the two-phone plan, not a broken button');
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending.bal_seats = 2; st.save(); });
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#seatgo'); t = await text();
  ok(/Same business name, same messages, its own jobs/.test(t), 'the card says exactly what the second phone shares and what it does not');
  await p.click('#seatgo'); await p.waitForSelector('#seatlink', { timeout: 5000 });
  const link2 = await p.$eval('#seatlink', e => e.value);
  const scall = await p.evaluate(() => window.__qcCalls.filter(c => /seat/.test(c.url)).pop());
  ok(link2 === 'https://x/app/#/setup?d=j:eyJ2IjoxfQ' && scall.url === 'https://relay.example.test/api/seat' && scall.body.token === 'qc1.FREE.SIG', 'it asks the relay and shows the link to open on the other phone');
  ok(/on the other phone and tap Load/.test(await text()), 'with instructions a painter can follow');
  // the second phone says what it is, and is not offered a third
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending.bal_seat = 2; st.save(); });
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#setupcode'); t = await text();
  ok(/This is the second phone on your plan/.test(t) && !(await p.$('#seatgo')), 'the second phone knows what it is and cannot mint another');
  // handing a job across
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending.bal_seat = 1; st.save(); });
  await p.goto(base + '#/job/cr_a/quote', { waitUntil: 'load' }); await p.waitForSelector('#handoff'); await p.click('#handoff');
  await p.waitForSelector('#hoff'); t = await text();
  const hlink = await p.$eval('#hoff', e => e.value);
  ok(/#\/setup\?d=j:/.test(hlink) && /Send this job to the other phone/.test(t) && /this phone keeps its copy/.test(t), 'a job can be handed over, and it says it is a copy');
  const carried = await p.evaluate(l => window.__qcApp.decodeSetup(l.split('d=')[1]).then(o => ({ jobs: o.jobs.length, name: o.jobs[0].client.name, note: o.note })), hlink);
  ok(carried.jobs === 1 && carried.name === 'Margaret' && /A job from the other phone: Margaret/.test(carried.note), 'the link carries that one job and says where it came from');
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending.bal_seats = 1; st.save(); });
  await p.goto(base + '#/job/cr_a/quote', { waitUntil: 'load' }); await p.waitForSelector('h1');
  ok(!(await p.$('#handoff')), 'a one-phone plan is not shown a button that would go nowhere');

  // ---- a painter with no sending at all still gets in and still works
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.removeItem('qcmock'); } catch (e) {} });
  cfg = "window.QC_APP = { maps_key: '', signup_url: '' };";
  await p.goto(base, { waitUntil: 'load' }); await p.waitForSelector('#joinform'); t = await text();
  ok(/not switched on yet/.test(t), 'with no relay configured the door says so rather than pretending');
  await p.fill('#join_email', 'solo@example.com'); await p.click('#join_go');
  await p.waitForFunction(() => location.hash === '#/' || location.hash === '', { timeout: 4000 });
  ok(/Ready\. Sending is not switched on/.test(await toastText()), 'he still gets in, and is told the messages are his to send');
  S = await state(); ok(S.account.email === 'solo@example.com' && S.account.offline === true, 'the account is recorded on the phone anyway');
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
