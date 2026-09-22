// The welcome page after a self-service sign-up: the set-up button from ?session=, the email fallback, and the subscribe button's three states.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../../..', 'quote-and-chase-landing') + '/public';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.pdf': 'application/pdf' };
const baseCfg = fs.readFileSync(ROOT + '/config.js', 'utf8'); let cfgOverride = null;
const withCfg = (patch) => baseCfg + '\nObject.assign(window.QC, ' + JSON.stringify(patch) + ');\n';
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; if (!path.extname(p) && fs.existsSync(path.join(ROOT, p + '.html'))) p += '.html'; if (p === '/config.js' && cfgOverride) { res.writeHead(200, { 'Content-Type': 'application/javascript' }); return res.end(cfgOverride); } fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const LINK = 'https://chasem.app/app/#/setup?d=j:eyJ2IjoxfQ';
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const vis = () => p.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('[hidden]').forEach(e => e.remove()); return c.textContent.replace(/\s+/g, ' '); });
  const API = 'https://relay.example.test/api/setup-link'; let hits = [];
  await p.route(API + '*', route => { hits.push(route.request().url()); const s = new URL(route.request().url()).searchParams.get('session');
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(s === 'cs_test_paid1234' ? { ok: true, paid: true, hosted: true, until: '2026-10-26', link: LINK, name: "Dave's Painting" } : { ok: true, paid: false }) }); });

  cfgOverride = withCfg({ SETUP_LINK_API: API, SUPPORT_EMAIL: 'help@example.com.au', SUBSCRIBE_URL: 'https://buy.stripe.com/test_sub' });
  // ---- paid: the button is on the screen he paid from
  await p.goto(base + 'welcome?session=cs_test_paid1234', { waitUntil: 'load' }); await p.waitForSelector('[data-my-ready]:not([hidden])', { timeout: 6000 }).catch(() => null);
  let t = await vis();
  ok(/You're on\./.test(t) && /Your card is charged, your receipt is in your email, and your messages are topped up/.test(t), 'the welcome page states what already happened');
  ok((await p.$eval('[data-my-link]', e => e.getAttribute('href'))) === LINK && hits.length === 1 && /session=cs_test_paid1234/.test(hits[0]), 'Set up my app carries the link the relay minted');
  ok(/Open this on the phone you quote from and tap Load/.test(t) && /your month's messages are on it from that moment/.test(t), 'it says where to tap it and what that does');
  ok(/Five minutes on your prices, whenever suits/.test(t) && /what you charge for a day on the tools/.test(t), 'the price step is described as self-service');
  ok(/Set-up, then Manage or cancel/.test(t) && /no notice period and no email to send/.test(t), 'cancelling is inside the app');
  ok(/Thirty days, money back/.test(t), 'the guarantee is repeated after payment');
  ok(!/ring you|book a|pick your hour|on the call|fifteen minutes on the phone/i.test(t), 'nothing on the page involves a human');
  // ---- unpaid or unknown session: the email fallback, never a dead end
  await p.goto(base + 'welcome?session=cs_test_other999', { waitUntil: 'load' }); await p.waitForSelector('[data-my-fail]:not([hidden])', { timeout: 6000 }).catch(() => null); t = await vis();
  ok(/Your set-up link is in the welcome email, arriving now/.test(t) && /email help@example\.com\.au/.test(t), 'unknown session: the emailed link and a real address');
  // ---- opened by hand, no session at all
  await p.goto(base + 'welcome', { waitUntil: 'load' }); await p.waitForTimeout(300); t = await vis();
  ok(/Your set-up link is in the welcome email/.test(t) && !/Set up my app/.test(t), 'no session: straight to the email fallback');
  // ---- no API configured: the page never spins
  cfgOverride = withCfg({ SETUP_LINK_API: '', SUPPORT_EMAIL: 'help@example.com.au' });
  await p.goto(base + 'welcome?session=cs_test_paid1234', { waitUntil: 'load' }); await p.waitForTimeout(300); t = await vis();
  ok(/Your set-up link is in the welcome email/.test(t) && !/Getting your set-up link/.test(t), 'no API: the fallback, not a spinner');
  // ---- the ask on the landing page always opens the app, because that is where sign-up happens now
  cfgOverride = withCfg({ SUBSCRIBE_URL: 'https://buy.stripe.com/test_sub' });
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(300);
  ok((await p.$$eval('[data-sub]', as => as.every(a => a.getAttribute('href') === 'app/'))), 'with a checkout configured the page still sends him to the app, not to a card form');
  cfgOverride = withCfg({ SUBSCRIBE_URL: '', FORM_ACTION: '', SUPPORT_EMAIL: '' });
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(300);
  ok((await p.$$('[data-sub]:not([hidden])')).length === 2 && !/Opening soon|Coming soon/.test(await vis()), 'with nothing configured the way in still works and there is no shopfront');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
