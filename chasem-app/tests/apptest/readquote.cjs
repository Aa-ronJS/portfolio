// A photo or a PDF of a quote, read. A PDF from a quoting app is read on the phone (no signal needed, no cost);
// a photo or a scan goes to the relay (faked here; chasem-landing/tests/read.mjs covers its side). Nothing he has
// typed is overwritten, and when reading is off or fails he is told to type it, with the picture kept.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
let blockPdfJs = false;
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; if (blockPdfJs && /lib\/pdf/.test(p)) { res.writeHead(503); return res.end(); } fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const pre = () => { try { const k = 'qc-app-v1', S = JSON.parse(localStorage.getItem(k) || '{}'); if (S.account) return; S.account = { email: 'dave@steele.com.au', joined: '2026-01-01', verified: true }; S.details = Object.assign({}, S.details, { trading_name: 'Steele Electrical', owner_name: 'Dave Steele', abn: '12 345 678 901', state: 'SA', bsb: '063-000', account_number: '12345678', phone: '0412 345 678', email: 'dave@steele.com.au', trade: 'electrician', gst: true }); S.security = Object.assign({}, S.security, { setup_done: true }); S.sending = Object.assign({}, S.sending, { server: 'https://relay.test/api/send', token: 'qc1.x.y' }); localStorage.setItem(k, JSON.stringify(S)); } catch (e) {} };
const relay = () => {
  window.__calls = []; window.__read = window.__read || { ok: true, item: { kind: 'quote', name: 'Tom Nguyen', phone: '0413 222 333', email: '', amount: 880, number: 'Q-2044', date: '2026-09-14', due: '', what: 'Downlights' } };
  window.__qcRelayFetch = (url, o) => { const b = JSON.parse(o.body); window.__calls.push({ url, media_type: b.media_type, own: b.own, size: (b.data || '').length });
    const out = /\/find$/.test(url) ? { ok: true, providers: [] } : /\/read$/.test(url) ? window.__read : { ok: false };
    return Promise.resolve({ json: () => Promise.resolve(out) }); };
};

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  await p.addInitScript(pre); await p.addInitScript(relay);
  const val = (id) => p.$eval('#' + id, e => e.value).catch(() => '');
  const calls = () => p.evaluate(() => window.__calls);
  const fresh = async () => { await p.evaluate(() => { localStorage.removeItem('qc-add-draft'); window.__qcApp && 0; location.hash = '#/'; }); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(300); await p.evaluate(() => { location.hash = '#/add/photo'; }); await p.waitForTimeout(600); };
  const settle = async () => { await p.waitForFunction(() => { const m = document.getElementById('readmsg'); return m && !/Reading it/.test(m.textContent); }, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(300); };
  // PDFs are made in the page with the jsPDF the app already carries
  const makePdf = (lines, withImage) => p.evaluate(([lines, withImage]) => { const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' }); let y = 60;
    if (withImage) { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 400, 300); x.fillStyle = '#000'; x.font = '20px sans-serif'; x.fillText('QUOTE  Tom Nguyen  $880', 20, 60); doc.addImage(c.toDataURL('image/jpeg'), 'JPEG', 40, 40, 400, 300); }
    else lines.forEach(l => { doc.text(l, 50, y); y += 18; });
    return btoa(String.fromCharCode.apply(null, new Uint8Array(doc.output('arraybuffer')))); }, [lines, withImage]).then(s => Buffer.from(s, 'base64'));
  await p.goto(base + '#/add/photo', { waitUntil: 'load' }); await p.waitForTimeout(600);

  // ---- two ways in, each a picture over its word
  const tiles = await p.$$eval('#app .readtiles .tile', els => els.map(e => e.getAttribute('aria-label') + '|' + e.innerText.trim()));
  ok(tiles.length === 2 && /Photo/.test(tiles[0]) && /PDF or picture/.test(tiles[1]), 'Photo tab: a camera and a PDF-or-picture button: ' + tiles.join(', '));

  // ---- a PDF from a quoting app: read on the phone, nothing sent anywhere
  const tradify = ['Steele Electrical', 'ABN 12 345 678 901', 'Ph 0412 345 678   dave@steele.com.au', 'QUOTE', 'Quote Number: QU-0042', 'Quote Date: 03/09/2026', 'Valid Until: 03/10/2026',
    'Prepared For:', 'Jane Mitchell', '14 Beaumont St, Norwood SA 5067', '0412 111 222   jane.m@example.com', 'Description: Switchboard upgrade and RCDs', 'Subtotal $2,227.27', 'GST $222.73', 'Total (inc GST) $2,450.00'];
  await p.setInputFiles('#addfile', { name: 'QU-0042.pdf', mimeType: 'application/pdf', buffer: await makePdf(tradify) }); await settle();
  ok((await val('a_name')) === 'Jane Mitchell' && /2450|2,450/.test(await val('a_amount')) && (await val('a_number')) === 'QU-0042', 'a quote PDF fills in Jane Mitchell, $2,450, QU-0042');
  ok((await val('a_phone')) === '0412 111 222' && (await val('a_email')) === 'jane.m@example.com' && (await val('a_date')) === '2026-09-03', 'her mobile and email, not his, and the quote date');
  ok((await calls()).filter(c => /read$/.test(c.url)).length === 0, 'read on the phone: nothing was sent anywhere');
  ok(!!(await p.$('#app img.addthumb')) && /Check what it found/.test(await p.$eval('#app', e => e.innerText)), 'page one is kept as the picture, and it says to check what it found');
  ok(!(await p.$eval('#a_go', e => e.disabled)), 'and it is ready to chase');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(700);
  ok((await val('a_name')) === 'Jane Mitchell' && !!(await p.$('#app img.addthumb')), 'a lost tab keeps what it read, and the picture');

  // ---- the quote PDF this app itself makes (the website's sample)
  await fresh();
  await p.setInputFiles('#addfile', path.join(ROOT, '../chasem-landing/public/sample-quote.pdf')); await settle();
  const sample = { name: await val('a_name'), amount: await val('a_amount'), number: await val('a_number') };
  ok(sample.name && sample.name !== 'Steele Electrical' && /\d/.test(sample.amount) && /\d/.test(sample.number), 'a real three-page quote PDF reads too: ' + JSON.stringify(sample));

  // ---- what he typed stays
  await fresh();
  await p.fill('#a_name', 'Janey M'); await p.waitForTimeout(100);
  await p.setInputFiles('#addfile', { name: 'q.pdf', mimeType: 'application/pdf', buffer: await makePdf(tradify) }); await settle();
  ok((await val('a_name')) === 'Janey M' && /2450|2,450/.test(await val('a_amount')), 'a name he typed first is kept; the empty boxes are filled');

  // ---- a scanned PDF: no words in it, so the relay reads it, with his own details marked as his
  await fresh(); await p.evaluate(() => { window.__calls = []; });
  await p.setInputFiles('#addfile', { name: 'scan.pdf', mimeType: 'application/pdf', buffer: await makePdf([], true) }); await settle();
  let c = (await calls()).filter(c => /read$/.test(c.url));
  ok(c.length === 1 && c[0].media_type === 'application/pdf' && c[0].own.trading_name === 'Steele Electrical' && c[0].own.phone === '0412 345 678', 'a scan with no words goes to be read, as a PDF, with his own details marked as his');
  ok((await val('a_name')) === 'Tom Nguyen' && /880/.test(await val('a_amount')), 'and what comes back fills the boxes');

  // ---- a photo
  await fresh(); await p.evaluate(() => { window.__calls = []; });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
  await p.setInputFiles('#addphoto', { name: 'quote.png', mimeType: 'image/png', buffer: png }); await settle();
  c = (await calls()).filter(c => /read$/.test(c.url));
  ok(c.length === 1 && c[0].media_type === 'image/jpeg' && (await val('a_name')) === 'Tom Nguyen', 'a photo is sent to be read as a small JPEG, and fills the boxes');

  // ---- reading off: says so in one line, keeps the picture, the boxes stay his to fill
  await fresh(); await p.evaluate(() => { window.__read = { ok: false, off: true, error: 'Reading it is not switched on yet. Type it in.' }; });
  await p.setInputFiles('#addphoto', { name: 'quote.png', mimeType: 'image/png', buffer: png }); await settle();
  ok(/not switched on yet\. Type it in\./.test(await p.$eval('#readmsg', e => e.textContent)) && !!(await p.$('#app img.addthumb')) && (await val('a_name')) === '', 'reading off: one line to type it, and the photo is kept');
  await p.fill('#a_name', 'Kim Vo'); await p.fill('#a_phone', '0412 555 444'); await p.fill('#a_amount', '1150'); await p.waitForTimeout(100);
  ok(!(await p.$eval('#a_go', e => e.disabled)), 'typed in by hand, it chases as before');

  // ---- the PDF reader will not load (first time, no signal): the relay reads the PDF instead
  await p.evaluate(() => { window.__read = { ok: true, item: { kind: 'invoice', name: 'Bay Cafe', phone: '', email: 'accounts@bay.cafe', amount: 3885.2, number: 'INV-1006', date: '2026-09-01', due: '2026-09-15', what: '' } }; });
  blockPdfJs = true; const ctx2 = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); await ctx2.addInitScript(pre); await ctx2.addInitScript(relay); const p2 = await ctx2.newPage(); p2.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
  await p2.goto(base + '#/add/photo', { waitUntil: 'load' }); await p2.waitForTimeout(600);
  await p2.evaluate(() => { localStorage.removeItem('qc-add-draft'); window.__read = { ok: true, item: { kind: 'invoice', name: 'Bay Cafe', phone: '', email: 'accounts@bay.cafe', amount: 3885.2, number: 'INV-1006', date: '2026-09-01', due: '2026-09-15', what: '' } }; location.hash = '#/'; }); await p2.waitForTimeout(200);
  await p2.evaluate(() => { location.hash = '#/add/photo'; }); await p2.waitForTimeout(500);
  const invPdf = await makePdf(tradify); await p2.setInputFiles('#addfile', { name: 'inv.pdf', mimeType: 'application/pdf', buffer: invPdf });
  await p2.waitForFunction(() => { const m = document.getElementById('readmsg'); return m && !/Reading it/.test(m.textContent); }, null, { timeout: 20000 }).catch(() => {}); await p2.waitForTimeout(300);
  ok((await p2.$eval('#a_name', e => e.value)) === 'Bay Cafe' && /INV-1006/.test(await p2.$eval('#a_number', e => e.value)) && await p2.$('.kindchips .on[data-kind="invoice"]'), 'no PDF reader on the phone: the relay reads it, and an invoice comes in as an invoice: ' + (await p2.$eval('#a_name', e => e.value)) + ' / ' + (await p2.$eval('#readmsg', e => e.textContent)));
  blockPdfJs = false;

  await b.close(); srv.close();
  console.log(fails ? '\nFAILURES: ' + fails : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
