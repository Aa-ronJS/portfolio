// Draws the running-C logo (tests/logo-mark.cjs) into icons/: node tests/make-logo.cjs
const { chromium } = require('playwright-core'); const fs = require('fs'); const M = require('./logo-mark.cjs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage();
  const shot = async (svg, size, out) => { await p.setViewportSize({ width: size, height: size }); await p.setContent('<html><body style="margin:0;background:transparent">' + svg.replace('<svg ', '<svg width="' + size + '" height="' + size + '" ') + '</body></html>'); await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }); };
  const dir = process.argv[2] || require('path').join(__dirname, '../icons');
  const rounded = M.icon({ scale: 1.1 }), square = M.icon({ scale: 1.1, round: 0 }), mask = M.icon({ scale: 0.84, round: 0 });
  await shot(rounded, 192, dir + '/icon-192.png'); await shot(rounded, 512, dir + '/icon-512.png');
  await shot(square, 180, dir + '/icon-180.png');   // iOS rounds it itself
  await shot(mask, 512, dir + '/icon-maskable-512.png');
  fs.writeFileSync(dir + '/icon.svg', rounded);
  // a preview sheet: sizes, the maskable safe circle, dark and light grounds
  await p.setViewportSize({ width: 900, height: 330 });
  await p.setContent('<body style="margin:0;display:flex;gap:24px;align-items:center;padding:20px;background:#eee">' + rounded.replace('<svg ', '<svg width="256" height="256" ') + mask.replace('<svg ', '<svg width="200" height="200" style="border-radius:50%" ') + rounded.replace('<svg ', '<svg width="64" height="64" ') + rounded.replace('<svg ', '<svg width="32" height="32" ') + rounded.replace('<svg ', '<svg width="16" height="16" ') + '<div style="background:#15171B;padding:14px">' + rounded.replace('<svg ', '<svg width="96" height="96" ') + '</div></body>');
  await p.screenshot({ path: dir + '/preview.png' });
  await b.close();
})();
