// A customer replies STOP. On his next sync the texts booked for her are taken back, the chase carries on by email,
// and the Follow-ups row says "Replied STOP" with no way to text her. A text the relay refuses for STOP is never
// retried. START gives the texting back.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const pre = () => { try { const k = 'qc-app-v1', S = JSON.parse(localStorage.getItem(k) || '{}'); if (S.account) return; S.account = { email: 'd@e.com', joined: '2026-01-01', verified: true }; S.details = Object.assign({}, S.details, { trading_name: 'Steele Electrical', owner_name: 'Dave Steele', abn: '12 345 678 901', state: 'SA', bsb: '063-000', account_number: '12345678', phone: '0412 345 678', email: 'dave@example.com', gst: true, trade: 'electrician' }); S.security = Object.assign({}, S.security, { setup_done: true }); S.sending = Object.assign({}, S.sending, { server: 'https://relay.test/api/msg', token: 'qc1.x.y', server_has_creds: true, hosted: true, auto_sms: true, auto_email: true }); localStorage.setItem(k, JSON.stringify(S)); } catch (e) {} };
// the relay: books and cancels; refuses texts to numbers in __stopped; sync hands back whatever __optouts holds, once
const relay = () => { window.__calls = []; window.__stopped = {}; window.__optouts = []; let n = 0;
  window.__qcRelayFetch = (url, o) => { const b = JSON.parse(o.body); b.__url = url; window.__calls.push(b);
    let out = { ok: true };
    if (/\/sync$/.test(url)) { out = { ok: true, now: new Date().toISOString(), changes: [], bookings: [], replies: [], payments: [], optouts: window.__optouts }; window.__optouts = []; }
    else if (b.action === 'schedule' || b.action === 'send') { const to = String(b.to || '').replace(/[^\d]/g, '').replace(/^0/, '61'); out = b.channel === 'sms' && window.__stopped[to] ? { ok: false, error: 'They replied STOP, so no more texts to that number. Email still works.', opted_out: true } : { ok: true, id: (b.channel === 'sms' ? 'SM' : 'em') + (++n), send_at: b.send_at, left: 500, used: n, included: 650 }; }
    else if (b.action === 'cancel') out = { ok: true, cancelled: true };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(out) }); }; };
const ago = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  await p.addInitScript(pre); await p.addInitScript(relay);
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem('qc-app-v1') || '{}'));
  const calls = () => p.evaluate(() => window.__calls);
  const toastText = () => p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
  const go = async (h) => { await p.evaluate(() => { location.hash = '#/x'; }); await p.waitForTimeout(100); await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(500); };
  const add = async (name, phone, email, days) => {
    await go('#/add/type'); await p.fill('#a_name', name); await p.fill('#a_phone', phone); if (email) await p.fill('#a_email', email); await p.fill('#a_amount', '2450');
    await p.evaluate((d) => { const el = document.getElementById('a_date'); el.value = d; el.dispatchEvent(new Event('input')); }, ago(days));
    await p.click('#a_go'); await p.waitForTimeout(900);
  };
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(1200);

  // ---- Jane, with a mobile and an email: chased by text until she replies STOP
  await add('Jane Mitchell', '0412 111 222', 'jane@example.com', 20);
  let S = await state(), jane = S.jobs.find(j => j.client.name === 'Jane Mitchell');
  const firstText = (jane.follow_ups || []).find(f => f.channel === 'sms' && f.id);
  ok(!!firstText, 'Jane\'s catch-up is booked by text');
  await p.evaluate(() => { window.__calls.length = 0; window.__stopped['61412111222'] = true; window.__optouts = [{ addr: '+61412111222', stopped: true, updated_at: new Date().toISOString() }]; });
  await p.evaluate(() => window.__qcApp.sync()); await p.waitForTimeout(1500);
  S = await state(); jane = S.jobs.find(j => j.client.name === 'Jane Mitchell');
  const cs = await calls();
  ok(S.sms_stop && S.sms_stop['+61412111222'], 'the STOP is kept on the phone against her number');
  ok(cs.some(c => c.action === 'cancel' && c.id === firstText.id), 'the text already booked for her is taken back');
  ok((jane.follow_ups || []).some(f => f.channel === 'email' && f.id && !f.cancelled), 'and the chase carries on by email');
  ok(!cs.some(c => c.action === 'schedule' && c.channel === 'sms'), 'nothing new is booked by text');
  ok(/Jane replied STOP\. No more texts to them; the chasing goes by email\./.test(await toastText()), 'he is told, by name, once: ' + await toastText());
  await go('#/chase');
  const row = await p.$$eval('.card.chase', cards => { const c = cards.find(x => /Jane Mitchell/.test(x.innerText)); return c ? { text: c.innerText, sms: !!c.querySelector('a[href^="sms:"]'), now: !!c.querySelector('[data-ch="sms"]') } : null; });
  ok(row && /Replied STOP: no texts/.test(row.text), 'her Follow-ups row says Replied STOP');
  ok(row && !row.sms && !row.now, 'and there is no way to text her from it');
  ok(row && /Email/.test(row.text), 'email is still there');

  // ---- Tom, a number that already replied STOP to someone else: the relay refuses, the app never retries it
  await p.evaluate(() => { window.__calls.length = 0; window.__stopped['61413999888'] = true; });
  await add('Tom Nguyen', '0413 999 888', '', 20);
  S = await state(); const tom = S.jobs.find(j => j.client.name === 'Tom Nguyen');
  ok(S.sms_stop && S.sms_stop['+61413999888'], 'the relay\'s refusal teaches the phone the number is stopped');
  ok(!(S.local_queue || []).some(q => q.job === tom.id && q.channel === 'sms'), 'and nothing waits to be tried again by text');
  ok(/STOP/.test(tom.follow_up_error || ''), 'the job says why: ' + tom.follow_up_error);
  await p.evaluate(() => { window.__calls.length = 0; window.dispatchEvent(new Event('online')); }); await p.waitForTimeout(1200);
  ok(!(await calls()).some(c => c.action === 'schedule' && c.channel === 'sms'), 'coming back online does not try to text him again');

  // ---- START: the texting comes back
  await p.evaluate(() => { delete window.__stopped['61412111222']; window.__optouts = [{ addr: '+61412111222', stopped: false, updated_at: new Date().toISOString() }]; });
  await p.evaluate(() => window.__qcApp.sync()); await p.waitForTimeout(1200);
  S = await state();
  ok(!(S.sms_stop || {})['+61412111222'], 'START takes the stop off her number');
  await go('#/chase');
  ok(await p.$$eval('.card.chase', cards => { const c = cards.find(x => /Jane Mitchell/.test(x.innerText)); return !!(c && c.querySelector('a[href^="sms:"]') && !/Replied STOP/.test(c.innerText)); }), 'and her row can text her again');

  await b.close(); srv.close();
  console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(1); });
