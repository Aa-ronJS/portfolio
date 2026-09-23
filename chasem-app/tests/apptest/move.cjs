// The move to go.chasem.app: the old address hands its data across before it forwards, the new one asks for it when it
// is empty, nothing is ever written over or lost, and if go.chasem.app is not answering nothing changes at all.
// Both addresses are served from this folder through Playwright's router, so they are real, separate origins.
const { chromium, devices } = require('playwright-core');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const OLD = 'https://chasem.app', NEW = 'https://go.chasem.app';

function serve(route, rel) {
  if (rel === 'seed') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>seed</title>' });
  if (/^(api|y)\//.test(rel)) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  let p = rel.split('?')[0].split('#')[0]; if (p === '' || p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(ROOT, p), (e, d) => e ? route.fulfill({ status: 404, body: 'nf' }) : route.fulfill({ status: 200, contentType: MIME[path.extname(p)] || 'application/octet-stream', body: d }));
}
const job = (id, name) => ({ id, client: { name, phone: '', address: '' }, summary: 'Hall', status: 'draft', rooms: [] });
const S = (name, saved) => ({ version: 1, jobs: [job('mv_' + saved, name)], details: { trading_name: name + ' Co' }, account: { email: 'p@example.com', joined: '2026-01-01', verified: true }, saved_at: saved });

(async () => {
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  async function fresh(opts) {
    opts = opts || {};
    const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    await ctx.route(OLD + '/**', r => { const u = new URL(r.request().url()); if (u.pathname === '/seed') return serve(r, 'seed'); if (!u.pathname.startsWith('/app/')) return serve(r, 'api/none'); serve(r, u.pathname.slice(5)); });
    await ctx.route(NEW + '/**', r => { if (opts.newDown) return r.abort('namenotresolved'); const u = new URL(r.request().url()); serve(r, u.pathname === '/seed' ? 'seed' : u.pathname.slice(1)); });
    await ctx.route('https://evil.example/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>x</title>' }));
    const p = await ctx.newPage(); p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
    return { ctx, p };
  }
  const seed = async (p, origin, obj) => { await p.goto(origin + '/seed'); await p.evaluate(o => { localStorage.clear(); for (const k in o) localStorage.setItem(k, typeof o[k] === 'string' ? o[k] : JSON.stringify(o[k])); }, obj); };
  const read = async (p, origin) => { await p.goto(origin + '/seed'); return p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; }); };
  const settle = p => p.waitForFunction(() => !/qc-moving/.test(document.documentElement.className), null, { timeout: 8000 }).then(() => true, () => false);

  // 1. old address with work on it, new address empty: handed across, then forwarded, keeping where he was going
  let { ctx, p } = await fresh();
  await seed(p, OLD, { 'qc-app-v1': S('Old Person', 111), 'qc-sync-v1': { since: 'x1' } });
  await p.goto(OLD + '/app/#/chase'); await p.waitForURL(NEW + '/#/chase', { timeout: 8000 }).catch(() => {});
  ok(p.url() === NEW + '/#/chase', 'old address forwards to go.chasem.app with the same screen: ' + p.url());
  await settle(p);
  let n = await read(p, NEW), o = await read(p, OLD);
  ok(/Old Person/.test(n['qc-app-v1'] || '') && /x1/.test(n['qc-sync-v1'] || ''), 'the jobs and the sync bookmark arrived at the new address');
  ok(/Old Person/.test(o['qc-app-v1'] || '') && o['qc-moved'], 'the old copy is still there, and marked as handed over');
  // he works at the new address; the old icon still sends him there and does not write over it
  await seed(p, NEW, Object.assign({}, n, { 'qc-app-v1': JSON.stringify(Object.assign(JSON.parse(n['qc-app-v1']), { saved_at: 999, jobs: [job('mv_new', 'Typed Here')] })) }));
  await p.goto(OLD + '/app/'); await p.waitForURL(NEW + '/', { timeout: 8000 }).catch(() => {});
  ok(p.url() === NEW + '/', 'opening the old address again goes straight to the new one');
  await settle(p); n = await read(p, NEW);
  const jobsNow = JSON.parse(n['qc-app-v1']).jobs.map(j => j.client.name).join(',');
  ok(jobsNow === 'Typed Here', 'what he typed at the new address was not written over (' + jobsNow + ')');
  await ctx.close();

  // 2. old address with nothing on it (a set-up link on a new phone): straight across
  ({ ctx, p } = await fresh());
  await p.goto(OLD + '/app/#/setup?d=j:eyJ2IjoxfQ'); await p.waitForURL(u => String(u).startsWith(NEW), { timeout: 8000 }).catch(() => {});
  ok(p.url() === NEW + '/#/setup?d=j:eyJ2IjoxfQ', 'an empty old address forwards at once, link intact: ' + p.url());
  await ctx.close();

  // 3. go.chasem.app not answering: the old address opens as it always did, with his work, soon
  ({ ctx, p } = await fresh({ newDown: true }));
  await seed(p, OLD, { 'qc-app-v1': S('Stay Put', 222) });
  let t0 = Date.now(); await p.goto(OLD + '/app/');
  ok(await settle(p) && p.url() === OLD + '/app/' && Date.now() - t0 < 7000, 'new address down: stays on the old one and shows it within the wait (' + (Date.now() - t0) + ' ms)');
  o = await read(p, OLD); ok(/Stay Put/.test(o['qc-app-v1']) && !o['qc-moved'], 'nothing marked as moved when nothing moved');
  await ctx.close();

  // 4. someone types go.chasem.app on a phone that has work at the old address: it comes across by itself
  ({ ctx, p } = await fresh());
  await seed(p, OLD, { 'qc-app-v1': S('Pulled Person', 333) });
  await p.goto(NEW + '/'); await settle(p); await p.waitForLoadState('load');
  n = await read(p, NEW); o = await read(p, OLD);
  ok(/Pulled Person/.test(n['qc-app-v1'] || ''), 'empty new address fetched the work from the old one');
  ok(o['qc-moved'] === '333', 'the old address knows, so its icon now forwards');
  await p.goto(OLD + '/app/'); await p.waitForURL(NEW + '/', { timeout: 8000 }).catch(() => {});
  ok(p.url() === NEW + '/', 'and it does');
  await ctx.close();

  // 5. both addresses have their own work: neither is written over, and the old one stays usable
  ({ ctx, p } = await fresh());
  await seed(p, NEW, { 'qc-app-v1': S('New Own', 444) });
  await seed(p, OLD, { 'qc-app-v1': S('Old Own', 555) });
  await p.goto(OLD + '/app/'); ok(await settle(p) && p.url() === OLD + '/app/', 'old address stays put when the new one has its own work');
  n = await read(p, NEW); o = await read(p, OLD);
  ok(/New Own/.test(n['qc-app-v1']) && /Old Own/.test(o['qc-app-v1']) && !o['qc-moved'], 'both copies intact');
  await ctx.close();

  // 6. another site cannot ask for the data
  ({ ctx, p } = await fresh());
  await seed(p, OLD, { 'qc-app-v1': S('Secret', 666) });
  await p.goto('https://evil.example/');
  const got = await p.evaluate(OLD => new Promise(res => { const f = document.createElement('iframe'); f.src = OLD + '/app/move.html'; const seen = []; addEventListener('message', e => { seen.push(e.data && e.data.chasem); if (e.data && e.data.chasem === 'ready') f.contentWindow.postMessage({ chasem: 'give' }, '*'); }); document.body.appendChild(f); setTimeout(() => res(seen), 1500); }), OLD);
  ok(got.indexOf('ready') >= 0 && got.indexOf('here') < 0, 'a stranger gets "ready" and nothing else: ' + JSON.stringify(got));
  await ctx.close();

  // 7. anywhere else (preview, localhost) the move does nothing
  ({ ctx, p } = await fresh());
  await ctx.route('https://preview.vercel.app/**', r => serve(r, new URL(r.request().url()).pathname.slice(1)));
  await p.goto('https://preview.vercel.app/'); await p.waitForLoadState('load');
  ok(!/qc-moving/.test(await p.evaluate(() => document.documentElement.className)) && p.url() === 'https://preview.vercel.app/', 'inert on any other address');
  await ctx.close();

  // 8. the routing that puts the app on go.chasem.app
  const mw = await import(path.join(ROOT, '../chasem-landing/middleware.js'));
  const hdr = (host, pth) => { const r = mw.default(new Request('https://' + host + pth, { headers: { host } })); return r.headers.get('x-middleware-rewrite') || (r.headers.get('x-middleware-next') ? 'next' : '?'); };
  ok(hdr('go.chasem.app', '/') === 'https://go.chasem.app/app/', 'go.chasem.app/ is the app');
  ok(hdr('go.chasem.app', '/app.js') === 'https://go.chasem.app/app/app.js' && hdr('go.chasem.app', '/config.js') === 'https://go.chasem.app/app/config.js', 'its files are the app\'s, not the site\'s');
  ok(hdr('go.chasem.app', '/index.html') === 'https://go.chasem.app/app/' && hdr('go.chasem.app', '/move.html') === 'https://go.chasem.app/app/move', '.html paths land where cleanUrls serves them');
  ok(hdr('go.chasem.app', '/api/signup') === 'next' && hdr('go.chasem.app', '/y/abc') === 'next', 'the relay and booking pages answer on go.chasem.app too');
  ok(hdr('chasem.app', '/') === 'next' && hdr('chasem.app', '/app/') === 'next' && hdr('www.chasem.app', '/config.js') === 'next', 'the site is untouched');

  await b.close();
  console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(1); });
