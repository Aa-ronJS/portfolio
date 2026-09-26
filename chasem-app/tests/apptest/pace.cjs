// A tradie drops in a spreadsheet of forty-five quotes. Every one of them is chased, but never as a burst from the
// shared number: twenty a business day at most, five minutes apart, the rest rolled on, each chase keeping its own
// gaps. A quote more than three months old is not chased by itself. A booking the relay turns away is not lost.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const pre = () => { try { const k = 'qc-app-v1', S = JSON.parse(localStorage.getItem(k) || '{}'); if (S.account) return; S.account = { email: 'd@e.com', joined: '2026-01-01', verified: true }; S.details = Object.assign({}, S.details, { trading_name: 'Steele Electrical', owner_name: 'Dave Steele', abn: '12 345 678 901', state: 'SA', bsb: '063-000', account_number: '12345678', phone: '0412 345 678', email: 'dave@example.com', gst: true, trade: 'electrician' }); S.security = Object.assign({}, S.security, { setup_done: true }); S.sending = Object.assign({}, S.sending, { server: 'https://relay.test/api/msg', token: 'qc1.x.y', server_has_creds: true, hosted: true, auto_sms: true, auto_email: true }); localStorage.setItem(k, JSON.stringify(S)); } catch (e) {} };
// the relay: books whatever it is asked, unless told to refuse
const relay = () => { window.__calls = []; window.__refuse = null; let n = 0;
  window.__qcRelayFetch = (url, o) => { const b = JSON.parse(o.body); window.__calls.push(b);
    let out = { ok: true };
    if (b.action === 'schedule') { const why = window.__refuse && window.__refuse(b); out = why === 'slow' ? { ok: false, error: 'Slow down' } : why === 'full' ? { ok: false, error: 'That day is full', day_full: true } : { ok: true, id: 'SM' + (++n), send_at: b.send_at, left: 500, used: n, included: 650 }; }
    return Promise.resolve({ json: () => Promise.resolve(out) }); }; };
const dmy = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const ago = (n) => new Date(Date.now() - n * 86400000);

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  await p.addInitScript(pre); await p.addInitScript(relay);
  const text = () => p.$eval('#app', e => e.innerText);
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem('qc-app-v1') || '{}'));
  const go = async (h) => { await p.evaluate(() => { location.hash = '#/x'; }); await p.waitForTimeout(100); await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(500); };
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(1200);

  // ---- 45 quotes sent five days ago (so each has a catch-up now and nudges still to come), and two from last summer
  const rows = ['Quote Number,Customer,Mobile,Status,Created Date,Total (inc GST)'];
  for (let i = 0; i < 45; i++) rows.push(`Q-${3000 + i},Customer ${i},04${String(12000000 + i).padStart(8, '0')},Sent,${dmy(ago(5))},$${900 + i}.00`);
  rows.push(`Q-2001,Old Summer,0499 000 001,Sent,${dmy(ago(150))},$4000.00`, `Q-2002,Older Still,0499 000 002,Sent,${dmy(ago(200))},$2500.00`);
  await go('#/add/sheet');
  await p.setInputFiles('#sheetfile', { name: 'quotes.csv', mimeType: 'text/csv', buffer: Buffer.from(rows.join('\n')) });
  await p.waitForSelector('#sheetgo');
  const oldBoxes = await p.$$eval('.sheetrow', rs => rs.filter(r => /over 3 months/.test(r.innerText)).map(r => r.querySelector('input').checked));
  ok(oldBoxes.length === 2 && oldBoxes.every(c => !c), 'the two quotes from last summer are listed, marked, and left unticked');
  ok(/Chase 45/.test(await p.$eval('#sheetgo', e => e.textContent)), 'the button counts only the ones it will chase');
  ok(await p.$eval('#sheetpace', e => !e.hidden && /20 a day/.test(e.textContent)), 'with more than twenty ticked, the pace is on the screen');
  await p.evaluate(() => { window.__calls.length = 0; });
  await p.click('#sheetgo'); await p.waitForTimeout(2500);

  const calls = (await p.evaluate(() => window.__calls)).filter(c => c.action === 'schedule');
  let S = await state();
  const queue = S.local_queue || [];
  const all = calls.map(c => ({ at: c.send_at, key: c.key })).concat(queue.map(q => ({ at: q.send_at, key: q.key })));
  const perDay = {}; all.forEach(x => { const d = new Date(x.at); const k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); (perDay[k] = perDay[k] || []).push(d.getTime()); });
  const busiest = Math.max(...Object.values(perDay).map(v => v.length));
  ok(calls.length === 45, 'one message booked per chase, for all 45 (' + calls.length + ')');
  ok(busiest <= 20, 'no day carries more than twenty, counting what waits on the phone (' + busiest + ')');
  const gapsOk = Object.values(perDay).every(v => { v.sort((a, b) => a - b); return v.every((t, i) => i === 0 || t - v[i - 1] >= 5 * 60000); });
  ok(gapsOk, 'on any one day they go at least five minutes apart');
  ok(all.every(x => new Date(x.at).getTime() > Date.now()), 'nothing is booked in the past');
  ok(all.every(x => { const d = new Date(x.at); return d.getDay() !== 0 && d.getDay() !== 6; }), 'nothing lands on a weekend');
  const days = [...new Set(calls.map(c => c.send_at.slice(0, 10)))];
  ok(days.length >= 3, 'the first messages are spread over at least three business days (' + days.length + ')');
  // every chase keeps its own order and never doubles up on a customer in one day
  const byJob = {}; all.forEach(x => { const j = x.key.split(':')[0]; (byJob[j] = byJob[j] || []).push(x.at); });
  const dup = Object.entries(byJob).filter(([k, v]) => new Set(v.map(t => new Date(t).toDateString())).size !== v.length); if (dup.length) console.log('DUP', JSON.stringify(dup.slice(0, 2).map(([k, v]) => v.map(t => new Date(t).toString().slice(0, 21))))); ok(!dup.length, 'no customer gets two messages on the same day');
  ok(!S.jobs.some(j => /Old Summer|Older Still/.test(j.client.name)), 'the unticked old quotes were not brought in');
  ok(/45 added to Follow-ups\. The last goes/.test(await p.evaluate(() => (document.getElementById('toast') || {}).textContent || '')), 'and the toast says when the last one goes');

  // ---- an old quote typed in by hand: in, on Follow-ups, but not chased by itself
  await p.evaluate(() => { window.__calls.length = 0; });
  await go('#/add/type');
  await p.fill('#a_name', 'Margaret Old'); await p.fill('#a_phone', '0412 777 888'); await p.fill('#a_amount', '3100');
  await p.evaluate((d) => { const el = document.getElementById('a_date'); el.value = d; el.dispatchEvent(new Event('input')); }, ago(120).toISOString().slice(0, 10));
  await p.click('#a_go'); await p.waitForTimeout(900);
  ok(!(await p.evaluate(() => window.__calls)).some(c => c.action === 'schedule'), 'a quote four months old books nothing');
  ok(/you send it/.test(await p.evaluate(() => (document.getElementById('toast') || {}).textContent || '')), 'and the toast says it is his to send');
  ok(/Margaret Old/.test(await text()), 'she is on Follow-ups, where Text and Email are');

  // ---- a busy relay: the refused ones wait on the phone and go when it answers again
  await go('#/add/type');
  await p.evaluate(() => { window.__calls.length = 0; window.__refuse = () => 'slow'; });
  await p.fill('#a_name', 'Ravi Busy'); await p.fill('#a_phone', '0412 555 999'); await p.fill('#a_amount', '1200');
  await p.evaluate((d) => { const el = document.getElementById('a_date'); el.value = d; el.dispatchEvent(new Event('input')); }, ago(20).toISOString().slice(0, 10));
  await p.click('#a_go'); await p.waitForTimeout(900);
  S = await state(); let ravi = S.jobs.find(j => j.client.name === 'Ravi Busy');
  ok(ravi && (S.local_queue || []).some(q => q.job === ravi.id && /\+late$/.test(q.ref)), 'the refused catch-up is kept on the phone, not dropped');
  ok(ravi && /tries again/.test(ravi.follow_up_error || ''), 'and the job says it is waiting, in words');
  await p.evaluate(() => { window.__refuse = null; window.dispatchEvent(new Event('online')); }); await p.waitForTimeout(1500);
  S = await state(); ravi = S.jobs.find(j => j.client.name === 'Ravi Busy');
  ok(!(S.local_queue || []).some(q => q.job === ravi.id && /\+late$/.test(q.ref)) && (ravi.follow_ups || []).some(f => /\+late$/.test(f.what)), 'back online, it is booked');
  ok(!ravi.follow_up_error, 'and the waiting note is gone');

  // ---- the relay says that day is full: it moves a business day on, it does not vanish
  await go('#/add/type');
  await p.evaluate(() => { window.__calls.length = 0; window.__refuse = () => 'full'; });
  await p.fill('#a_name', 'Fay Full'); await p.fill('#a_phone', '0412 444 111'); await p.fill('#a_amount', '800');
  await p.evaluate((d) => { const el = document.getElementById('a_date'); el.value = d; el.dispatchEvent(new Event('input')); }, ago(20).toISOString().slice(0, 10));
  await p.click('#a_go'); await p.waitForTimeout(900);
  const asked = (await p.evaluate(() => window.__calls)).find(c => c.action === 'schedule');
  S = await state(); const fay = S.jobs.find(j => j.client.name === 'Fay Full'), fq = (S.local_queue || []).find(q => fay && q.job === fay.id);
  ok(asked && fq && fq.send_at.slice(0, 10) > asked.send_at.slice(0, 10), 'a full day moves the message to a later day (' + (asked && asked.send_at.slice(0, 10)) + ' to ' + (fq && fq.send_at.slice(0, 10)) + ')');

  await b.close(); srv.close();
  console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(1); });
