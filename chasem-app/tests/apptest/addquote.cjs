// Chase a quote made anywhere: typed in, pasted from a text or email he already sent, or a whole spreadsheet
// exported from the app he quotes with. Each lands as a job the Follow-ups tab chases like the app's own.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const pre = () => { try { const k = 'qc-app-v1', S = JSON.parse(localStorage.getItem(k) || '{}'); if (S.account) return; S.account = { email: 'd@e.com', joined: '2026-01-01', verified: true }; S.details = Object.assign({}, S.details, { trading_name: 'Steele Electrical', owner_name: 'Dave Steele', abn: '12 345 678 901', state: 'SA', bsb: '063-000', account_number: '12345678', phone: '0412 345 678', email: 'dave@example.com', gst: true }); S.security = Object.assign({}, S.security, { setup_done: true }); localStorage.setItem(k, JSON.stringify(S)); } catch (e) {} };

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  await p.addInitScript(pre);
  const text = () => p.$eval('#app', e => e.innerText);
  const state = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('qc-app-v1') || '{}'); } catch (e) { return {}; } });
  const go = async (h) => { await p.evaluate(() => { location.hash = '#/x'; }); await p.waitForTimeout(100); await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(500); };
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(400);

  // ---- Home: chasing comes first
  const first = await p.$eval('#app .btn.tile', e => e.getAttribute('aria-label')).catch(() => '');
  ok(first === 'Chase a quote', 'the first button on Home is Chase a quote (' + first + ')');
  await p.click('#chaseadd'); await p.waitForSelector('#a_name');
  ok(/#\/add/.test(await p.evaluate(() => location.hash)), 'and it opens the Chase a quote screen');

  // ---- Type one in: the button only lights up when there is enough to chase
  const lit = () => p.$eval('#a_go', e => !e.disabled);
  ok(!(await lit()), 'nothing typed: Chase it is not available');
  await p.fill('#a_name', 'Jane Mitchell'); ok(!(await lit()), 'a name alone is not enough');
  await p.fill('#a_phone', '0412111222'); ok(!(await lit()), 'a name and a mobile, but no amount, is not enough');
  await p.fill('#a_amount', '2,450'); ok(await lit(), 'name, mobile and amount: it can be chased');
  ok(/How much|mobile or an email/.test(await p.$eval('#a_msg', e => e.textContent)) === false, 'and nothing is left to say');
  await p.fill('#a_what', 'switchboard upgrade');
  // most quotes worth chasing went out a while ago
  await p.evaluate(() => { const d = new Date(Date.now() - 10 * 86400000); const el = document.getElementById('a_date'); el.value = d.toISOString().slice(0, 10); el.dispatchEvent(new Event('input')); });
  // a lost tab keeps what he typed
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#a_name');
  ok((await p.$eval('#a_name', e => e.value)) === 'Jane Mitchell' && (await p.$eval('#a_amount', e => e.value)) === '2,450', 'a reload keeps the half-typed quote');
  await p.click('#a_go'); await p.waitForTimeout(700);
  let S = await state(), j = S.jobs.find(x => x.client && x.client.name === 'Jane Mitchell');
  ok(j && j.status === 'quoted' && j.sent_confirmed === true, 'a job is made, already sent, so it can be chased');
  ok(j && Math.abs(j.quote.total - 2450) < 0.01 && Math.abs(j.manual_total - 2227.27) < 0.01, 'for $2,450 with GST ($2,227.27 before)');
  ok(j && j.client.phone === '0412 111 222' && j.client.first_name === 'Jane', 'the mobile tidied and the first name kept for the greeting');
  ok(/#\/chase/.test(await p.evaluate(() => location.hash)), 'and he lands on Follow-ups');
  ok((await p.evaluate(() => localStorage.getItem('qc-add-draft'))) === null, 'the draft is cleared once it is chased');

  // what the chaser says: never a quote number the customer has not seen
  const msg = await p.evaluate(id => { const S = window.__qcApp.store.load(); const job = S.jobs.find(x => x.id === id); return window.__qcApp.nudgeFor ? window.__qcApp.nudgeFor(job) : null; }, j.id);
  const chaseText = await text();
  ok(/Jane Mitchell/.test(chaseText), 'she is on the Follow-ups list');

  ok(/switchboard upgrade/.test(chaseText) && /my quote/.test(chaseText) && !/quote Q-/.test(chaseText), 'the message says "my quote", never an invented number');

  // ---- the same person for the same money is not added twice
  await go('#/add/type');
  await p.fill('#a_name', 'Jane Mitchell'); await p.fill('#a_phone', '0412111222'); await p.fill('#a_amount', '2450');
  await p.click('#a_go'); await p.waitForTimeout(600);
  S = await state();
  ok(S.jobs.filter(x => x.client && x.client.name === 'Jane Mitchell').length === 1, 'the same quote typed twice is one job');

  // ---- an invoice already out and overdue
  await go('#/add/type');
  await p.click('[data-kind="invoice"]'); await p.waitForSelector('#a_due');
  await p.fill('#a_name', 'Tom Lee'); await p.fill('#a_email', 'tom@example.com'); await p.fill('#a_amount', '540');
  await p.fill('#a_number', 'INV-0098');
  await p.fill('#a_date', '2026-08-01'); await p.fill('#a_due', '2026-08-08');
  await p.click('#a_go'); await p.waitForTimeout(700);
  S = await state(); j = S.jobs.find(x => x.client && x.client.name === 'Tom Lee');
  ok(j && j.status === 'invoiced' && j.invoices.length === 1 && j.invoices[0].no === 'INV-0098', 'an invoice keeps its own number');
  ok(/Tom Lee/.test(await text()) && /overdue/.test(await text()), 'and is chased as overdue');

  // ---- paste an email he sent
  await go('#/add/paste');
  await p.fill('#pastebox', ['From: Dave Steele <dave@example.com>', 'Sent: Thursday, 3 September 2026 4:12 PM', 'To: Priya Nair <priya@example.com>', 'Subject: Quote QU-2231 - new downlights', '', 'Hi Priya,', 'Total inc GST $1,320.00', 'Cheers, Dave'].join('\n'));
  await p.click('#pastego'); await p.waitForSelector('#a_name');
  const got = await p.evaluate(() => ({ n: document.getElementById('a_name').value, e: document.getElementById('a_email').value, a: document.getElementById('a_amount').value, d: document.getElementById('a_date').value, q: document.getElementById('a_number').value }));
  ok(got.n === 'Priya Nair' && got.e === 'priya@example.com' && /1320/.test(got.a) && got.d === '2026-09-03' && got.q === 'QU-2231', 'pasting an email fills in who, how much, when and the number: ' + JSON.stringify(got));
  ok(/Check what it found/.test(await text()), 'and asks him to check it');
  await p.click('#a_go'); await p.waitForTimeout(700);
  S = await state(); j = S.jobs.find(x => x.client && x.client.name === 'Priya Nair');
  ok(j && j.quote_no === 'QU-2231' && j.sent_date === '2026-09-03', 'the pasted quote keeps its number and the day it was sent');
  ok(/quote QU-2231/.test(await text()), 'and the chaser uses the number she has seen');

  // ---- a whole spreadsheet from the app he quotes with
  await go('#/add/sheet');
  const csv = ['Quote Number,Customer,Contact Name,Mobile,Email,Status,Created Date,Total (inc GST)',
    'Q-1001,Bay Cafe,Sione Tui,0412 000 222,,Sent,03/09/2026,"$3,885.20"',
    'Q-1002,Bob Smith,,0413 333 444,,Draft,04/09/2026,$900.00',
    'Q-1003,Acme Strata,Kate Caller,,kate@acme.com.au,Accepted,05/09/2026,"$12,000.00"',
    'Q-1004,Old Job,,0414 555 666,,Declined,06/09/2026,$1500',
    'QU-2231,Priya Nair,,,priya@example.com,Sent,03/09/2026,1320'].join('\n');
  await p.setInputFiles('#sheetfile', { name: 'tradify-quotes.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await p.waitForSelector('#sheetgo');
  const prev = await text();
  ok(/2 to chase/.test(prev), 'the preview shows the two new ones to chase');
  ok(/1 declined/.test(prev) && /1 never sent/.test(prev) && /1 already here/.test(prev), 'and says plainly what was left out and why');
  await p.click('#sheetgo'); await p.waitForTimeout(800);
  S = await state();
  ok(S.jobs.some(x => x.client.name === 'Sione Tui' && x.status === 'quoted') && S.jobs.some(x => x.client.name === 'Kate Caller' && x.status === 'accepted'), 'both are in: the sent one to chase, the accepted one to book');
  // the same file again adds nothing
  await go('#/add/sheet');
  await p.setInputFiles('#sheetfile', { name: 'tradify-quotes.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await p.waitForTimeout(600);
  ok(/already here/.test(await text()) && !(await p.$('#sheetgo')), 'importing the same file again adds nothing');
  await p.setInputFiles('#sheetfile', { name: 'notes.csv', mimeType: 'text/csv', buffer: Buffer.from('hello,world\nno,money') });
  await p.waitForTimeout(600);
  ok(/No quotes or invoices found/.test(await text()), 'a file that is not quotes says so, and does not break');

  // ---- Home leads with money: owed, waiting, won
  await go('#/');
  const strip = await p.$$eval('#app .mstrip .mtile', els => els.map(e => ({ cls: e.className.replace('mtile', '').trim(), t: e.innerText.replace(/\s+/g, ' ').trim(), href: e.getAttribute('href') })));
  ok(strip.length === 3, 'three tiles at the top of Home: ' + strip.map(x => x.t).join(' | '));
  ok(strip[0] && /Owed/.test(strip[0].t) && /\$540/.test(strip[0].t) && strip[0].cls === 'bad', 'owed first, red because Tom is overdue');
  ok(strip[1] && /quotes/.test(strip[1].t) && strip[1].cls === 'warn', 'quotes waiting on an answer, yellow');
  ok(strip[2] && /1/.test(strip[2].t) && /Won/.test(strip[2].t) && strip[2].cls === 'ok', 'work won, green');
  await p.click('#app .mstrip .mtile:nth-child(2)'); await p.waitForTimeout(500);
  const listed = await p.$$eval('#app a.job', els => els.length);
  ok(/f=quoted/.test(await p.evaluate(() => location.hash)) && listed >= 3, 'tapping a tile opens the list behind it (' + listed + ' quotes)');

  // ---- every trade: the building-work deposit rules only where they apply
  const dep = await p.evaluate(() => {
    const st = window.__qcApp.store, S = st.load(), app = window.__qcApp;
    const job = { client: { type: 'homeowner' }, deposit_pct: 20 };
    S.details.state = 'SA'; S.details.trade = 'electrician'; st.save(); app.route();
    const sparky = app.depositFor(job, 10000);
    const S2 = st.load(); S2.details.trade = 'cleaner'; st.save(); app.route();
    const cleaner = app.depositFor(job, 10000);
    return { sparky: sparky.amount, cleaner: cleaner.amount };
  });
  ok(dep.sparky === 1000, 'an electrician in SA is held to the building-work deposit cap ($1,000 on $10,000): ' + dep.sparky);
  ok(dep.cleaner === 2000, 'a cleaner is not building work: the 20% he asks for stands: ' + dep.cleaner);

  await b.close(); srv.close();
  console.log(fails ? '\nFAILURES: ' + fails : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
