const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const __JOINED = () => { try { const k = 'qc-app-v1', raw = localStorage.getItem(k); const s = raw ? JSON.parse(raw) : {}; s.account = Object.assign({ email: 'test@example.com', joined: '2026-01-01' }, s.account || {}); s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }; // the app asks for an email before it opens; these suites are about what comes after
const { chromium } = require('playwright-core');
const fs = require('fs'), SP = require('path').join(__dirname, '..');
const T = JSON.parse(fs.readFileSync(SP + '/mtest/truth2.json', 'utf8')); const pt = a => ({ x: a[0], y: a[1] });
(async () => {
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); await p.addInitScript(__JOINED); await p.addInitScript(__OPEN_SEC);
  p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await p.goto('file://' + require('path').join(__dirname, '../..', 'chasem-pack/pack/measure/measure.html'), { waitUntil: 'load' });
  await p.fill('#room', 'Lounge');
  await p.setInputFiles('[data-part="photolib"]', SP + '/mtest/photo2.jpg');
  await p.waitForFunction(() => window.__qc.state.img && window.__qc.state.auto); await p.evaluate(() => window.__qc.manual());
  await p.evaluate(pts => window.__qc.wall4(pts), T.wall.corners.map(pt));
  await p.click('[data-part="scalebox"] summary'); await p.fill('[data-part="ceiling"]', '2.4'); await p.click('[data-scale="ceiling"]');
  await p.evaluate(({ a, b }) => { window.__qc.setMode('door'); window.__qc.place(a); window.__qc.place(b); }, { a: pt(T.door.tl), b: pt(T.door.br) });
  console.log('status:', await p.$eval('[data-part="status"]', e => e.textContent));
  await p.fill('[data-part="wallname"]', 'Door wall'); await p.click('[data-part="savewall"]');
  console.log('saved:', await p.$eval('#savedtable', e => e.innerText.replace(/\s+/g, ' ')));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#download')]);
  const fp = SP + '/apptest/measurements.json'; await dl.saveAs(fp); const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const wl = j.rooms[0].walls[0]; console.log('json:', j.rooms[0].name, wl.width_mm, wl.height_mm, 'measured', wl.measured_width_mm, wl.measured_height_mm, wl.method, wl.scale, wl.expected_error_pct, 'rounded', wl.rounded); if (!(Math.abs(wl.width_mm - wl.measured_width_mm) < 1 && !wl.rounded && wl.measured_width_mm >= 3990 && wl.measured_width_mm <= 4010)) { console.log('FAIL pack rounding'); process.exit(1); }
  await p.screenshot({ path: SP + '/apptest/pack-measure.png', fullPage: true });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
