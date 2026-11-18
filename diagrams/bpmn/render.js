// Render out/*.bpmn with the bpmn.io viewer into one multi-page PDF + PNG per page.
// usage: node render.js <path-to-bpmn-viewer.production.min.js>
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'out');
const VIEWER = process.argv[2];
const index = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8'));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const CSS = `
  @font-face{font-family:Satoshi;src:url('file://${path.resolve(__dirname, '../../public/fonts/satoshi-var.woff2')}') format('woff2');}
  html,body{margin:0;background:#fff;font-family:Satoshi,Helvetica,Arial,sans-serif;color:#1d1d1f}
  .hd{display:flex;align-items:baseline;gap:18px;padding:28px 40px 6px;border-bottom:3px solid #1d1d1f;margin:0 40px}
  .pg{font-weight:800;font-size:22px;background:#1d1d1f;color:#fff;padding:4px 12px;border-radius:6px}
  .t{font-weight:800;font-size:34px} .b{font-size:18px;color:#555}
  .src{position:absolute;right:48px;top:36px;font-size:13px;color:#888}
  svg.d{display:block;margin:20px 40px 30px}`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent('<div id="c" style="width:4000px;height:3000px"></div>');
  await page.addScriptTag({ path: VIEWER });
  const svgs = [];
  for (const it of index) {
    const xml = fs.readFileSync(path.join(OUT, it.file), 'utf8');
    const svg = await page.evaluate(async (xml) => {
      const el = document.getElementById('c'); el.innerHTML = '';
      const v = new BpmnJS({ container: el });
      const r = await v.importXML(xml);
      if (r.warnings.length) console.log(JSON.stringify(r.warnings.map(w => w.message)));
      const { svg } = await v.saveSVG(); v.destroy(); return svg;
    }, xml);
    const m = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
    svgs.push({ ...it, svg, w: +m[3], h: +m[4] });
    fs.writeFileSync(path.join(OUT, it.file.replace('.bpmn', '.svg')), svg);
  }

  const lxml = fs.readFileSync(path.join(OUT, 'legend.bpmn'), 'utf8');
  const legend = await page.evaluate(async (xml) => {
    const el = document.getElementById('c'); el.innerHTML = '';
    const v = new BpmnJS({ container: el }); await v.importXML(xml);
    const { svg } = await v.saveSVG(); v.destroy(); return svg;
  }, lxml);
  const pdfs = [];
  const total = index.length + 1;
  // cover / legend page
  const cover = fs.readFileSync(path.join(__dirname, 'cover.html'), 'utf8')
    .replace('/*CSS*/', CSS).replace('<!--LEGEND-->', legend.replace(/ width="[\d.]+" height="[\d.]+"/, ''))
    .replace('<!--INDEX-->', svgs.map(s => `<tr><td class="n">${s.num}</td><td><b>${esc(s.title)}</b><br><span>${esc(s.blurb)}</span></td></tr>`).join(''));
  await page.setViewportSize({ width: 1700, height: 1400 });
  await page.setContent(cover, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  let f = path.join(OUT, '_p00.pdf');
  await page.pdf({ path: f, width: '1700px', height: '1400px', printBackground: true });
  await page.screenshot({ path: path.join(OUT, '00-cover.png'), fullPage: true });
  pdfs.push(f);

  for (const s of svgs) {
    const W = Math.ceil(s.w + 80), H = Math.ceil(s.h + 150);
    const body = s.svg.replace('<svg ', '<svg class="d" ');
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      <div class="src">Olympic Dam underground radio · BPMN 2.0</div>
      <div class="hd"><span class="pg">Page ${s.num} of ${index.length}</span><span class="t">${esc(s.title)}</span><span class="b">${esc(s.blurb)}</span></div>
      ${body}</body></html>`;
    await page.setViewportSize({ width: W, height: H });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    f = path.join(OUT, `_p${String(s.num).padStart(2, '0')}.pdf`);
    await page.pdf({ path: f, width: W + 'px', height: H + 'px', printBackground: true, pageRanges: '1' });
    const scale = Math.min(1.6, 7900 / Math.max(W, H));
    const ctx2 = await browser.newContext({ deviceScaleFactor: scale, viewport: { width: W, height: H } });
    const p2 = await ctx2.newPage(); await p2.setContent(html, { waitUntil: 'load' });
    await p2.evaluate(() => document.fonts.ready);
    await p2.screenshot({ path: path.join(OUT, s.file.replace('.bpmn', '.png')), fullPage: true });
    await ctx2.close();
    pdfs.push(f);
    console.log('rendered', s.file, W + 'x' + H);
  }
  fs.writeFileSync(path.join(OUT, '_pdfs.json'), JSON.stringify(pdfs));
  await browser.close();
})();
