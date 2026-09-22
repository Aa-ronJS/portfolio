const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const D = require('path').join(__dirname, '..') + '/apptest', M = require('path').join(__dirname, '..') + '/mtest';
const srv = http.createServer((req, res) => { const p = decodeURIComponent(req.url.split('?')[0]); const f = p.startsWith('/m/') ? path.join(M, p.slice(3)) : p === '/detect.js' ? require('path').join(__dirname, '../..') + '/detect.js' : path.join(D, p); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'application/javascript' : f.endsWith('.html') ? 'text/html' : 'image/jpeg' }); res.end(d); }); });
const dist = (a, b) => Math.hypot(a.x - b[0], a.y - b[1]);
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const p = await (await b.newContext()).newPage(); p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await p.goto(base + 'detect-harness.html', { waitUntil: 'load' });
  const names = (process.argv[2] ? [process.argv[2]] : ['a4_basic', 'a4_printed', 'a4_printed_dense', 'a4_printed_landscape', 'a4_landscape', 'a4_cream_gradient', 'a4_white_wall', 'a4_far_wide', 'a4_furniture', 'a4_nodoor']);
  let fails = 0;
  for (const n of names) {
    const T = JSON.parse(fs.readFileSync(`${M}/${n}.json`, 'utf8'));
    await p.evaluate(({ W, H }) => { window.__Wmm = W; window.__Hmm = H; }, { W: T.wall.w, H: T.wall.h });
    const r = await p.evaluate(({ u, f }) => window.run(u, f), { u: base + 'm/' + n + '.jpg', f: T.f_px });
    const pe = r.page ? Math.max(...r.page.corners.map((c, i) => dist(c, T.page.corners[i]))) : null;
    const we = r.wall ? r.wall.corners.map((c, i) => dist(c, T.wall.corners[i])) : null;
    const pageOk = pe !== null && pe < 3 && r.page.portrait === (T.page.h > T.page.w), wallHpx = Math.hypot(T.wall.corners[3][0] - T.wall.corners[0][0], T.wall.corners[3][1] - T.wall.corners[0][1]), wallOk = we && Math.max(...we) < 0.05 * wallHpx;
    if (!pageOk) fails++; if (!wallOk) fails++;
    console.log(`${pageOk ? 'PASS' : 'FAIL'} ${n.padEnd(18)} page: ${r.page ? `max corner err ${pe.toFixed(2)} px, ${r.page.portrait ? 'portrait' : 'landscape'} (truth ${T.page.h > T.page.w ? 'portrait' : 'landscape'}), contrast ${r.page.contrast.toFixed(1)}, aspect ${r.page.aspect.toFixed(3)}` : 'NOT FOUND'}  [${r.ms[0]} ms]`);
    console.log(`${wallOk ? 'PASS' : 'FAIL'} ${''.padEnd(18)} wall: ${we ? `corner errs ${we.map(e => e.toFixed(1)).join(', ')} px, conf ${r.wall.confidence.toFixed(2)} (tolerance ${(0.05 * wallHpx).toFixed(0)} px = cornice/skirting)` : 'NOT FOUND'}  [${r.ms[1]} ms]`);
    const ops = (r.openings || []).map(o => `${o.type} ${Math.round(o.width_mm)}x${Math.round(o.height_mm)} (${o.score.toFixed(2)})`).join('; ');
    console.log(`     ${''.padEnd(18)} openings: ${ops || 'none'}  truth: ${T.door ? 'door 820x2040' : ''} ${T.window ? 'window ' + T.window.w + 'x' + T.window.h : ''}  [${r.ms[2]} ms]`);
  }
  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
