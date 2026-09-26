// Pictures over words. Every picture-button still carries a word under it and a full name for a screen
// reader; a job's stage is green done, yellow in hand, red when money is overdue; and if the pictures never
// arrive (an old cache, one bar of signal) every button still works with its word.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
let blockPics = false;
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; if (blockPics && /pics\.js$/.test(p)) { res.writeHead(503); return res.end(); } fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const pre = () => { try { const k = 'qc-app-v1', S = JSON.parse(localStorage.getItem(k) || '{}'); S.account = { email: 'd@e.com', joined: '2026-01-01', verified: true }; S.details = Object.assign({}, S.details, { trading_name: 'Test Painting Co', abn: '12 345 678 901', state: 'SA', bsb: '063-000', account_number: '12345678', phone: '0412 345 678', email: 'd@e.com' }); S.security = Object.assign({}, S.security, { setup_done: true }); localStorage.setItem(k, JSON.stringify(S)); } catch (e) {} };

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  await p.addInitScript(pre);
  await p.addInitScript(() => { window.__qcRelayFetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) }); });
  const go = async (h) => { await p.evaluate(() => { location.hash = '#/x'; }); await p.waitForTimeout(100); await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(700); };
  await p.goto(base + '#/test', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.click('#tdseed'); await p.waitForTimeout(1500);

  // ---- every picture-button has a word, and a name
  for (const h of ['#/', '#/chase']) {
    await go(h);
    const bad = await p.$$eval('#app .btn.tile', els => els.filter(e => !(e.querySelector('.w') && e.querySelector('.w').textContent.trim()) || !(e.getAttribute('aria-label') || '').trim()).length);
    const n = await p.$$eval('#app .btn.tile', els => els.length);
    ok(n > 0 && bad === 0, h + ': all ' + n + ' picture buttons carry a word under the picture and a name for a screen reader');
  }
  const tabs = await p.$$eval('header.top nav a', els => els.map(a => !!a.querySelector('svg.ico') && a.textContent.trim()));
  ok(tabs.length === 3 && tabs.every(Boolean), 'the tabs are pictures over their words: ' + tabs.join(', '));

  // ---- the stage of each job, as a picture
  await go('#/');
  const tracks = await p.evaluate(() => {
    const S = window.__qcApp.store.load(), out = {};
    document.querySelectorAll('#app a.job').forEach(a => {
      const id = (a.getAttribute('href').match(/#\/(?:job|enquiry)\/([^/]+)/) || [])[1], j = S.jobs.find(x => x.id === id); if (!j) return;
      const st = Array.from(a.querySelectorAll('.track .st')).map(s => s.classList.contains('done') ? 'done' : s.classList.contains('now') ? (s.classList.contains('bad') ? 'late' : 'now') : '-');
      out[j.status + (j.client.name === 'Dennis Ward' ? '-late' : '')] = st.join(' ');
    });
    return out;
  });
  ok(tracks.quoted === 'done now - - -', 'a quoted job: asked done, quote in hand, the rest to come (' + tracks.quoted + ')');
  ok(tracks.paid === 'done done done done done', 'a paid job is finished: every step done, nothing in hand (' + tracks.paid + ')');
  ok(/done done done late -/.test(tracks['invoiced-late'] || ''), 'an overdue invoice is red on its step (' + tracks['invoiced-late'] + ')');
  const yellow = await p.$eval('#app .track .st.now:not(.bad)', e => getComputedStyle(e).backgroundColor).catch(() => '');
  ok(/rgb\(245, 183, 0\)/.test(yellow), 'in hand is yellow, like a traffic light: ' + yellow);
  const said = await p.$eval('#app a.job .track', e => e.getAttribute('aria-label') || '').catch(() => '');
  ok(said.length > 2, 'the stage is still said in words to a screen reader: "' + said + '"');

  // ---- no pictures at all: every button still has its word and works
  blockPics = true;
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(600);
  await go('#/');
  const words = await p.$eval('#app', e => e.innerText);
  ok(/Chase/.test(words) && /New/.test(words) && /Enquiry/.test(words) && /Quick/.test(words), 'without the pictures, Home still shows every way to start a job in words');
  await p.click('#newjob'); await p.waitForTimeout(600);
  ok(/#\/job\//.test(await p.evaluate(() => location.hash)), 'and New job still works');
  await go('#/chase');
  ok(/Text/.test(await p.$eval('#app', e => e.innerText)) && await p.$('#app a[href^="sms:"]') !== null, 'Follow-ups still offers Text, in words');
  blockPics = false;

  await b.close(); srv.close();
  console.log(fails ? '\nFAILURES: ' + fails : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
