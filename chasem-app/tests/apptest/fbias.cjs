const __OPEN_SEC = () => {};
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..'), SP = require('path').join(__dirname, '..'), M = SP + '/mtest';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] }); const ctx = await b.newContext({ ...devices['iPhone 13'] });
  // the app asks for an email before it shows anything; this test is about the camera model, not joining
  await ctx.addInitScript(() => { try { const raw = localStorage.getItem('qc-app-v1'); const st = raw ? JSON.parse(raw) : {}; if (!st.account || !st.account.email) { st.account = { email: 'test@example.com', joined: '2026-01-01', offline: true }; localStorage.setItem('qc-app-v1', JSON.stringify(st)); } } catch (e) {} }); const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await p.goto(base + '#/', { waitUntil: 'load' });
  const ids = await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); const j = st.newJob(); const r = st.newRoom('interior'); r.method = 'measured'; j.rooms.push(r); st.save(); return { j: j.id, r: r.id }; });
  const names = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(M).filter(f => /^fb_.*\.jpg$/.test(f)).map(f => f.replace('.jpg', '')).sort();
  console.log('scene'.padEnd(30) + 'W mm'.padStart(7) + 'errW'.padStart(8) + 'H mm'.padStart(7) + 'errH'.padStart(8) + '  f source / note');
  for (const n of names) {
    const T = JSON.parse(fs.readFileSync(`${M}/${n}.json`, 'utf8'));
    const rid = await p.evaluate((jid) => { const st = window.__qcApp.store, S = st.load(); const j = S.jobs.find(x => x.id === jid); const r = st.newRoom('interior'); r.method = 'measured'; j.rooms.push(r); st.save(); return r.id; }, ids.j);
    await p.goto(base + '#/job/' + ids.j + '/room/' + rid, { waitUntil: 'load' }); await p.waitForSelector('[data-part="photolib"]', { state: 'attached' });
    await p.setInputFiles('[data-part="photolib"]', `${M}/${n}.jpg`);
    try { await p.waitForFunction(() => window.__qcMeasure && window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind === 'page' || /No A4 page/.test(document.querySelector('[data-part="status"]').textContent), null, { timeout: 60000 }); } catch (e) { console.log(n, 'timeout at page'); continue; }
    if (/No A4 page/.test(await p.$eval('[data-part="status"]', e => e.textContent))) { console.log(n.padEnd(30) + 'page not found'); continue; }
    await p.click('[data-part="stepbtns"] .btn.tape'); await p.waitForFunction(() => window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind === 'wall', null, { timeout: 30000 });
    // put the wall corners exactly on the truth so only the page scale and camera model are under test
    const autoPts = await p.evaluate(() => window.__qcMeasure.state.edit.pts.map(q => [q.x, q.y]));
    const sc = await p.evaluate(() => window.__qcMeasure.state.w) / T.size[0]; if (!process.env.AUTO) await p.evaluate(({ c, sc }) => { window.__qcMeasure.state.edit.pts = c.map(q => ({ x: q[0] * sc, y: q[1] * sc })); }, { c: T.wall.corners, sc });
    await p.click('[data-part="stepbtns"] .btn.tape'); await p.waitForFunction(() => window.__qcMeasure.wall(), null, { timeout: 30000 });
    const r = await p.evaluate(() => ({ w: window.__qcMeasure.state.scale.measured.W, h: window.__qcMeasure.state.scale.measured.H, f: window.__qcMeasure.state.fSource, note: (window.__qcMeasure.state.scale.note || ''), page: window.__qcMeasure.state.page.corners.map(q => [q.x, q.y]) }));
    const pe = (a, b) => ((a - b) / b * 100).toFixed(1) + '%';
    const perr = T.page.corners.map((c, i) => Math.hypot(c[0] * sc - r.page[i][0], c[1] * sc - r.page[i][1])); 
    console.log(n.padEnd(30) + r.w.toFixed(0).padStart(7) + pe(r.w, T.wall.w).padStart(8) + r.h.toFixed(0).padStart(7) + pe(r.h, T.wall.h).padStart(8) + '  ' + r.f + (r.note ? ' | ' + r.note : '') + ' | page err ' + Math.max(...perr).toFixed(2) + ' px' + (process.env.AUTO ? ' | auto wall corner errs ' + T.wall.corners.map((c, i) => Math.hypot(c[0] * sc - autoPts[i][0], c[1] * sc - autoPts[i][1]).toFixed(0)).join('/') + ' (work scale ' + sc.toFixed(3) + ')' : ''));
  }
  await b.close(); srv.close(); process.exit(0);
})();
