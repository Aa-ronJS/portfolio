// Builds the landing page's "See a quote it makes" PDF with the app's own code, so what a prospect opens is
// exactly what a painter would send. Run it after any change to pricing.js or pdf.js:
//
//   node tests/make-sample-quote.cjs            (from chasem-app/)
//
// It writes ../chasem-landing/public/sample-quote.pdf. The business, client and job are invented.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, '..', 'chasem-landing', 'public', 'sample-quote.pdf');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });

// Signed in and set up before the app boots, so the wall never stands in the way.
const signedIn = () => { try {
  const k = 'qc-app-v1', S = JSON.parse(localStorage.getItem(k) || '{}');
  S.account = { email: 'office@steelepainting.com.au', joined: '2026-09-01', verified: true };
  S.details = Object.assign({}, S.details, { trading_name: 'Steele & Sons Painting', abn: '51 824 753 556', state: 'NSW' });
  S.security = Object.assign({}, S.security, { setup_done: true });
  S.payment = { account_name: 'Steele & Sons Painting', bsb: '062-000', account_number: '1234 5678' };
  localStorage.setItem(k, JSON.stringify(S));
} catch (e) {} };

const build = () => {
  const app = window.__qcApp, st = app.store, S = st.load();
  Object.assign(S.details, {
    trading_name: 'Steele & Sons Painting', owner_name: 'Dave Steele', abn: '51 824 753 556', gst: true,
    phone: '0412 345 678', email: 'office@steelepainting.com.au', address: '4 Hunter St, Newcastle NSW 2300',
    postcode: '2300', state: 'NSW', licence: '123456C', insurance: 'Public liability $20m',
    account_name: 'Steele & Sons Painting', bsb: '062-000', account_number: '1234 5678',
  });
  S.wording.products = Object.assign({}, S.wording.products, {
    walls: 'Dulux Wash&Wear low sheen', ceilings: 'Dulux Ceiling White flat', enamel: 'Dulux Aquanamel semi-gloss',
  });
  st.save();

  const room = (o) => Object.assign(st.newRoom('interior'), o);
  const job = st.newJob();
  job.client = { name: 'Jane Mitchell', first_name: 'Jane', address: '8 Beaumont St, Hamilton NSW 2303', phone: '0411 222 333', email: 'jane.mitchell@example.com' };
  job.summary = 'Repaint lounge and main bedroom: walls, ceilings, skirting, doors and windows';
  job.notes_client = "Access from 7:30am; the dog will be at the neighbour's. Furniture moved to the centre of each room and covered by us.";
  job.rooms = [
    room({ name: 'Lounge', L: 5.2, W: 3.8, H: 2.7, doors: 1, windows: 2, colour_change: true }),
    room({ name: 'Main bedroom', L: 4.1, W: 3.6, H: 2.7, doors: 1, windows: 1, wardrobe_pairs: 1, condition: 'fair' }),
  ];
  job.extras = [
    { desc: 'Patch and paint water stain, main bedroom ceiling', qty: 1, unit: 'each', rate: 180 },
    { desc: 'Feature wall in the lounge, Dulux Domino, 3 coats', qty: 12, unit: 'm²', rate: 34, optional: true },
  ];
  const S2 = st.load(); S2.jobs = S2.jobs.map((j) => (j.id === job.id ? job : j)); if (!S2.jobs.some((j) => j.id === job.id)) S2.jobs.push(job);
  const priced = app.pricing.priceJob(job, S2);
  app.freeze(job, priced);
  const doc = QCPdf.quotePDF(job, S2, priced);
  return { pdf: doc.output('datauristring'), total: priced.total, lines: priced.lines.length };
};

(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  let err = ''; p.on('pageerror', (e) => { err = err || e.message; });
  await p.addInitScript(signedIn);
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(500);
  const r = await p.evaluate(build);
  await b.close(); srv.close();
  if (err) { console.error('page error: ' + err); process.exit(1); }
  fs.writeFileSync(OUT, Buffer.from(String(r.pdf).split(',')[1], 'base64'));
  console.log('wrote ' + path.relative(process.cwd(), OUT) + ' (' + fs.statSync(OUT).size + ' bytes, ' + r.lines + ' lines, total $' + r.total + ')');
})().catch((e) => { console.error(e); process.exit(1); });
