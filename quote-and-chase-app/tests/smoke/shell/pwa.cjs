const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const L = require('./lib.cjs'); const { ok, wire, fs, path } = L;
const COPY = require('path').join(require('os').tmpdir(), 'qc-appcopy'); // outside the tree: copying it into itself would recurse
function png(f) { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), sig: b.slice(1, 4).toString() }; }
(async () => {
  // 4a. sw FILES vs index.html refs (static)
  const idx = fs.readFileSync(L.ROOT + '/index.html', 'utf8'); const sw = fs.readFileSync(L.ROOT + '/sw.js', 'utf8');
  const refs = [...idx.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map(m => m[1]).filter(u => !/^https?:|^#/.test(u));
  const FILES = eval(sw.match(/var FILES = (\[[\s\S]*?\]);/)[1]);
  const missing = refs.filter(r => !FILES.includes(r)); ok(!missing.length, 'every index.html src/href is in sw FILES' + (missing.length ? ' missing: ' + missing.join(', ') : '') + ' (refs=' + refs.length + ', FILES=' + FILES.length + ')');
  const noFile = FILES.filter(f => f !== './' && !fs.existsSync(path.join(L.ROOT, f))); ok(!noFile.length, 'every sw FILES entry exists on disk' + (noFile.length ? ' missing: ' + noFile.join(', ') : ''));
  const extra = FILES.filter(f => f !== './' && f !== 'index.html' && !refs.includes(f) && !/manifest/.test(f)); console.log('  FILES not referenced by index.html: ' + extra.join(', '));
  const man = JSON.parse(fs.readFileSync(L.ROOT + '/manifest.webmanifest', 'utf8'));
  ok(man.start_url === './' && man.scope === './', 'manifest start_url/scope relative: ' + man.start_url + ' ' + man.scope); ok(man.display === 'standalone', 'manifest display standalone'); ok(!!man.theme_color && !!man.background_color, 'manifest theme/background colour present ' + man.theme_color + ' ' + man.background_color);
  ok(man.theme_color.toLowerCase() === (idx.match(/name="theme-color" content="([^"]+)"/) || [])[1].toLowerCase(), 'manifest theme_color matches meta theme-color');
  for (const ic of man.icons) { const f = path.join(L.ROOT, ic.src); const ex = fs.existsSync(f); const d = ex ? png(f) : {}; ok(ex && d.sig === 'PNG' && ic.sizes === d.w + 'x' + d.h, 'manifest icon ' + ic.src + ' declared ' + ic.sizes + ' actual ' + (ex ? d.w + 'x' + d.h : 'MISSING') + (ic.purpose ? ' purpose=' + ic.purpose : '')); }
  const at = (idx.match(/rel="apple-touch-icon" href="([^"]+)"/) || [])[1]; const atd = png(path.join(L.ROOT, at)); ok(atd.w === 180 && atd.h === 180, 'apple-touch-icon ' + at + ' is ' + atd.w + 'x' + atd.h);
  ok(man.icons.some(i => /maskable/.test(i.purpose || '')) , 'a maskable icon is declared'); ok(!man.icons.some(i => (i.purpose || '').split(' ').includes('any') && (i.purpose || '').split(' ').includes('maskable')), 'no icon declares both any and maskable in one entry (Lighthouse warns)');
  // 4b. runtime: serve a COPY so a file can be changed for the SWR check
  fs.rmSync(COPY, { recursive: true, force: true }); fs.cpSync(L.ROOT, COPY, { recursive: true });
  const { srv, base } = await L.serve(COPY); const b = await L.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); await p.addInitScript(L.joinScript); await p.addInitScript(__OPEN_SEC); const log = []; wire(p, log);
  await p.goto(base + '#/', { waitUntil: 'load' });
  const reg = await p.evaluate(() => navigator.serviceWorker.ready.then(r => ({ scope: r.scope, active: !!r.active })));
  ok(reg.active, 'service worker active, scope ' + reg.scope);
  await p.waitForFunction(() => caches.keys().then(k => k.length > 0)); const cached = await p.evaluate(async () => { const ks = await caches.keys(); const c = await caches.open(ks[0]); return { key: ks[0], n: (await c.keys()).length }; }); ok(cached.n >= 24, 'cache ' + cached.key + ' holds ' + cached.n + ' entries');
  const ids = await p.evaluate(L.seedJs);
  // offline every route
  await ctx.setOffline(true);
  const routes = ['#/', '#/chase', '#/settings', '#/help', '#/enquiry', '#/enquiry/' + ids.enquiry, '#/job/' + ids.draft, '#/job/' + ids.draft + '/room/' + ids.room, '#/job/' + ids.quoted + '/quote', '#/job/' + ids.invoiced + '/invoice'];
  for (const h of routes) { const n = log.length; try { await p.goto(base + h, { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); const t = await p.$eval('#app', e => e.innerText); const e = log.slice(n).filter(x => x.type === 'pageerror'); ok(t.length > 20 && !e.length, 'offline reload ' + h + ' renders' + (e.length ? ' ERR ' + e[0].text : '')); } catch (e) { ok(false, 'offline reload ' + h + ': ' + e.message.split('\n')[0]); } }
  const manOff = await p.evaluate(() => fetch('manifest.webmanifest').then(r => r.ok).catch(() => false)); ok(manOff, 'manifest served from cache offline');
  const pdfOff = await p.evaluate(() => { try { const j = window.__qcApp.store.load().jobs.find(x => x.status === 'quoted'); const d = QCPdf.quotePDF(j, window.__qcApp.store.load(), window.__qcApp.pricing.priceJob(j, window.__qcApp.store.load())); return d.getNumberOfPages() > 0; } catch (e) { return 'ERR ' + e.message; } }); ok(pdfOff === true, 'PDF generation works offline: ' + pdfOff);
  const offNoise = log.filter(x => x.type !== 'pageerror').map(x => x.text); console.log('  offline console: ' + [...new Set(offNoise)].slice(0, 5).join(' | '));
  await ctx.setOffline(false);
  // stale-while-revalidate: change app.css and app.js in the copy (no VERSION bump)
  fs.appendFileSync(COPY + '/app.css', '\n#app{--smoke:1}\n'); fs.appendFileSync(COPY + '/app.js', '\nwindow.__smokeMarker = 2;\n');
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(400);
  const first = await p.evaluate(() => ({ css: getComputedStyle(document.getElementById('app')).getPropertyValue('--smoke').trim(), js: window.__smokeMarker || 0 }));
  ok(first.css === '' && first.js === 0, 'first load after a file change still serves the cached (stale) copy: ' + JSON.stringify(first));
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(800);
  const second = await p.evaluate(() => ({ css: getComputedStyle(document.getElementById('app')).getPropertyValue('--smoke').trim(), js: window.__smokeMarker || 0 }));
  ok(second.css === '1' && second.js === 2, 'second load gets the new content (stale-while-revalidate): ' + JSON.stringify(second));
  // index.html change without VERSION bump
  fs.writeFileSync(COPY + '/index.html', fs.readFileSync(COPY + '/index.html', 'utf8').replace('<title>Quote & Chase</title>', '<title>Quote & Chase v2</title>'));
  await p.reload({ waitUntil: 'load' }); const t1 = await p.title(); await p.waitForTimeout(300); await p.reload({ waitUntil: 'load' }); const t2 = await p.title(); ok(t1 === 'Quote & Chase' && t2 === 'Quote & Chase v2', 'navigation (index.html) also stale-then-fresh: ' + t1 + ' -> ' + t2);
  // does the SW swallow a 404? (cache miss + server 404 -> passes through)
  const s404 = await p.evaluate(() => fetch('nope.js').then(r => r.status)); ok(s404 === 404, 'uncached missing file returns 404 through SW: ' + s404);
  // cross-origin GET through the SW while offline -> should reject, not hang
  await ctx.setOffline(true); const xo = await p.evaluate(() => Promise.race([fetch('https://example.com/x').then(r => 'status ' + r.status, e => 'rejected ' + e.message), new Promise(r => setTimeout(() => r('timeout'), 4000))])); ok(/rejected/.test(xo), 'cross-origin fetch offline rejects promptly: ' + xo); await ctx.setOffline(false);
  // VERSION bump -> old cache deleted
  const curV = (fs.readFileSync(COPY + '/sw.js', 'utf8').match(/qc-app-v(\d+)/) || [])[1], oldKey = 'qc-app-v' + curV, newKey = 'qc-app-v' + (+curV + 1); fs.writeFileSync(COPY + '/sw.js', fs.readFileSync(COPY + '/sw.js', 'utf8').replace("'" + oldKey + "'", "'" + newKey + "'"));
  await p.reload({ waitUntil: 'load' }); await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())); for (let i = 0; i < 30; i++) { const ks = await p.evaluate(() => caches.keys()); if (ks.includes(newKey) && !ks.includes(oldKey)) break; await p.waitForTimeout(1000); } // poll from Node: rAF-based waitForFunction stalls here
  const keys = await p.evaluate(() => caches.keys()); ok(keys.includes(newKey) && !keys.includes(oldKey), 'after VERSION bump old cache removed: ' + keys.join(','));
  const distinct = [...new Set(log.map(x => x.type + ': ' + x.text))]; console.log('CONSOLE DISTINCT (' + distinct.length + '):\n  ' + distinct.join('\n  '));
  await b.close(); srv.close(); console.log(L.fails ? 'FAILURES: ' + L.fails : 'ALL PASSED');
})().catch(e => { console.error('CRASH', e); process.exit(1); });
