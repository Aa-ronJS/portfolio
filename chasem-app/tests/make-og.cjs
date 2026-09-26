// Draws the website's share image (chasem-landing/public/og.png, 1200x630) from the logo and the app screenshot.
// node tests/make-og.cjs     (run tests/make-landing-shots.cjs first if the app has changed)
const { chromium } = require('playwright-core'); const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '../../chasem-landing/public');
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const html = `<!doctype html><html><head><style>
body{margin:0;width:1200px;height:630px;background:#F7F7F4;font-family:"DejaVu Sans",system-ui,sans-serif;color:#16181D;overflow:hidden;position:relative}
.l{position:absolute;left:72px;top:0;bottom:0;width:640px;display:flex;flex-direction:column;justify-content:center;gap:26px}
.brand{display:flex;align-items:center;gap:16px;font-weight:800;font-size:40px;letter-spacing:-.5px}.brand img{width:64px;height:64px;border-radius:14px}
h1{margin:0;font-size:70px;line-height:1.02;letter-spacing:-2.5px;font-weight:800}
p{margin:0;font-size:30px;color:#5B5F66;line-height:1.3}
.dots{display:flex;gap:22px;font-size:24px;color:#16181D;font-weight:700}.dots span{display:flex;align-items:center;gap:8px}.dots i{width:16px;height:16px;border-radius:4px;display:inline-block}
.ph{position:absolute;right:70px;top:48px;width:360px;border-radius:44px;border:12px solid #16181D;background:#16181D;overflow:hidden;box-shadow:0 30px 60px -30px rgba(0,0,0,.5);height:640px}
.ph img{width:100%;display:block;border-radius:32px}
</style></head><body>
<div class="l"><div class="brand"><img src="${b64(PUB + '/app/icons/icon-192.png')}">Chasem</div>
<h1>You quote.<br>Chasem chases.</h1>
<p>Every quote followed up, every invoice chased until it is paid. For Australian tradies.</p>
<div class="dots"><span><i style="background:#B3261E"></i>Owed</span><span><i style="background:#F5B700"></i>Waiting</span><span><i style="background:#1F7A4D"></i>Won</span></div></div>
<div class="ph"><img src="${b64(PUB + '/app-home.png')}"></div>
</body></html>`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(html); await p.waitForTimeout(300);
  await p.screenshot({ path: PUB + '/og.png' }); await b.close();
})();
