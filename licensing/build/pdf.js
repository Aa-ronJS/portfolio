// Renders the sell sheets and provisional specs to PDF, plus PNG previews.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const dir of ['sell-sheets', 'filing']) {
    for (const f of fs.readdirSync(path.join(root, dir)).filter((n) => n.endsWith('.html'))) {
      const src = path.join(root, dir, f);
      await page.goto('file://' + src, { waitUntil: 'networkidle' }).catch(() => page.goto('file://' + src));
      await page.pdf({ path: src.replace(/\.html$/, '.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
    }
  }
  await browser.close();
  console.log('pdfs rendered');
})();
