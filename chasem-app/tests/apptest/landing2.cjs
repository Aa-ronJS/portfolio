// Landing page, self-service: phone render, config wiring in three states, jargon kept out of the sales copy, links resolve, laptop, welcome and terms pages.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../../..', 'chasem-landing') + '/public';
const SP = require('path').join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json' };
let cfgOverride = null;
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; if (!path.extname(p) && fs.existsSync(path.join(ROOT, p + '.html'))) p += '.html'; if (p === '/config.js' && cfgOverride) { res.writeHead(200, { 'Content-Type': 'application/javascript' }); return res.end(cfgOverride); } fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const baseCfg = fs.readFileSync(ROOT + '/config.js', 'utf8');
const withCfg = (patch) => baseCfg + '\nObject.assign(window.QC, ' + JSON.stringify(patch) + ');\n';
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message)); const failed = []; p.on('requestfailed', r => { if (!/fonts\.|cdnjs|facebook/.test(r.url())) failed.push(r.url()); });
  const text = () => p.evaluate(() => document.body.innerText); const allText = () => p.evaluate(() => document.body.textContent); // innerText skips closed FAQ folds and applies text-transform

  // ---- state 1: config as shipped (nothing wired)
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(400);
  let t = await text();
  ok(/Quote it before you leave the driveway\./.test(t), 'headline sells the outcome');
  ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'no sideways scroll at 390 px');
  const h = await p.evaluate(() => document.documentElement.scrollHeight); console.log('  page height ' + h + ' px, ' + (h / 664).toFixed(1) + ' phone screens');
  ok(h / 664 < 22, 'page length within bounds (stack is long by design; was 16.8 screens before the stack)');
  const img = await p.$eval('.proof img', e => ({ w: e.naturalWidth, alt: e.alt })); ok(img.w === 892 && /quote the app made/.test(img.alt), 'hero shows page one of the real sample quote');
  const firstScreen = await p.evaluate(() => Array.from(document.querySelectorAll('.hero .stack *')).filter(e => e.getBoundingClientRect().top < 664).map(e => e.textContent).join(' '));
  ok(/Start free, your first three jobs/.test(firstScreen), 'the way in is on the first screen');
  ok(!/Coming soon/.test(t), 'no "Coming soon" shopfront anywhere');
  ok((await p.$$('[data-sub]:not([hidden])')).length === 2 && (await p.$eval('[data-sub]', a => a.getAttribute('href'))) === 'app/', 'with nothing configured the ask still opens the app, because that is where sign-up happens');
  ok(!(await p.$('#maker:not([hidden])')), 'maker block hidden until written');
  ok(!/Contact email coming soon|to be added/.test(t), 'no placeholder contact line');
  // jargon stays out of the sales copy: everything above the "It\'s yours" section
  const above = await p.evaluate(() => { const stop = document.getElementById('inside'); let out = ''; for (const el of document.body.children) { if (el === stop) break; out += el.innerText + '\n'; } return out; });
  const jargon = ['Twilio', 'Resend', 'relay', 'Vercel', 'Claude Code', 'slash command', 'PDF attached', 'share sheet', 'one and a half percent', 'deploy'];
  const leaks = jargon.filter(w => new RegExp(w, 'i').test(above)); ok(leaks.length === 0, 'no jargon in the sales copy above the honest section: ' + JSON.stringify(leaks));
  ok(/6 cm on a 4 m wall/.test(t), 'accuracy in centimetres');
  ok(!/\$249 pack|laptop pack needs an AI subscription/.test(above), 'laptop pack is off the painter page (footer and FAQ only)');
  ok(/\$99/.test(t) && /a month/.test(t) && /150 messages included/.test(t) && /three jobs free/i.test(t) && /Cancel from inside the app any time/.test(t) && !/an hour with me|Driveway Quote Hour|Book your/.test(await allText()), 'one price, messages included, first three jobs free, cancelled by the painter');
  ok(/For the painter who quotes every week and hates ringing people about money/.test(t) && /Quote from the driveway\. It does the chasing\./.test(t) && /Nothing to open/.test(t), 'one-line avatar, the sub-line and the outcome statement open the card');
  const priceTop = await p.evaluate(() => { const c = document.getElementById('plan').getBoundingClientRect().top; return document.querySelector('#plan .price').getBoundingClientRect().top - c; }); ok(priceTop < 1400, 'price arrives within the first two phone screens of the card (' + Math.round(priceTop) + ' px)');
  const cardH = await p.evaluate(() => document.getElementById('plan').getBoundingClientRect().height); ok(cardH < 2600, 'card under four phone screens with the folds closed (' + Math.round(cardH) + ' px)');
  ok(/The quoting, all of it/.test(t) && /The chasing, without you/.test(t) && /Nothing to open/.test(t) && /Off in two taps/.test(t), 'the card promises the quoting, the chasing, no accounts, and cancelling in two taps');
  const at = await allText(); ok(/What counts as a message/.test(at) && /The first ten minutes, on the phone in your hand/.test(at) && /What you still do: mark it paid, and back it up/.test(at) && /Before you say no/.test(at) && /I'm on gmail/.test(at), 'detail folds: sign-up, what runs, what is still his, and the objections');
  ok(!(await p.$eval('#plan details.group', d => d.open)), 'detail folds closed on a phone');
  ok(/What happens when you sign up/.test(t) && /No call to book, no reply to wait for, no account to verify/.test(t) && /chasing money by 9:05/.test(t), 'the after-signup section promises nobody in the loop');
  ok(!/ring you|book a call|book your|pick your hour|fifteen minutes on the phone|on the call/i.test(await allText()), 'nothing anywhere asks the painter to get on a call');
  ok(/Manage or cancel/.test(await allText()) || /cancel from inside the app/i.test(await allText()), 'cancelling is described as something he does himself');
  ok(/One app, one price, and the texting and emailing already built in/.test(await allText()) && /like credit on a phone/.test(await allText()), 'the lede explains the model in one line');
  ok(/Your email, and you are quoting in a minute\. No card until you want the monthly\./.test(await allText()), 'the ask is an email, not a card');
  ok(/the app keeps writing every message for you to send by hand/.test(await allText()), 'it says plainly what happens when the messages run out');
  ok(!/waiting list|Later there may be a hosted version/i.test(await allText()) && /No sign-up call, no demo, no salesperson/.test(await allText()), 'no waiting list and no sales machinery: the thing is simply for sale');
  ok(/Rough ballpark demo/i.test(t) && /This is not the measuring/.test(t), 'demo labelled as a rough ballpark, not the measuring');
  const faqN = await p.$$eval('#faq details', d => d.length); ok(faqN >= 12, faqN + ' FAQ entries');
  ok(/What does it cost, really\?/.test(t) && /What's the catch/.test(t) && /Will my customers know/.test(t), 'the burned painter\'s questions are answered');
  // links resolve
  const hrefs = await p.$$eval('a[href]', as => Array.from(new Set(as.map(a => a.getAttribute('href')).filter(h => h && !/^(#|mailto:|https?:)/.test(h)))));
  for (const hf of hrefs) { const r = await p.request.get(base + hf.replace(/^\.\//, '')); ok(r.status() === 200, 'link resolves: ' + hf + ' (' + r.status() + ')'); }
  await p.screenshot({ path: SP + '/apptest/landing2-top.png' });
  await p.evaluate(() => document.getElementById('price').scrollIntoView()); await p.waitForTimeout(200); await p.screenshot({ path: SP + '/apptest/landing2-price.png', fullPage: false });
  ok(errors.length === 0 && failed.length === 0, 'state 1: no page errors or failed requests ' + JSON.stringify(errors.concat(failed)).slice(0, 200));

  // ---- state 2: form wired, no checkout, support email, maker, ABN
  cfgOverride = withCfg({ FORM_ACTION: 'https://formspree.example/f/abc', SUPPORT_EMAIL: 'help@example.com.au', ABN: '51 824 753 556', MAKER_NOTE: 'I build software and got tired of watching mates quote at 9pm.', MAKER_NAME: 'Aaron, Melbourne', SETUP_SLOTS_WEEK: 5, FOUNDING_LEFT: 14, HOSTED_DATE: 'March 2027', BONUSES_READY: true });
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(400); t = await text();
  ok((await p.$$('[data-sub]:not([hidden])')).length === 2, 'both asks stay live whatever the config, because sign-up lives in the app');
  ok(!!(await p.$('#maker:not([hidden])')) && /Aaron, Melbourne/.test(t) && /ABN 51 824 753 556/.test(t) && /help@example.com.au/.test(t), 'maker, ABN and email appear once configured');
  ok(/Aaron, Melbourne\. One person, not a company/.test(await allText()), 'FAQ "who is behind this" names the maker');
  ok(!!(await p.$('#waitlist:not([hidden])')), 'sample-quote email capture visible with a form');
  ok(errors.length === 0, 'state 2: no page errors');

  // ---- state 3: checkout wired, GST registered, founding places 0
  cfgOverride = withCfg({ SUBSCRIBE_URL: 'https://buy.stripe.com/test_sub', GST_REGISTERED: true, PLAN_PRICE: 49, HELP_SAME_DAY: false, BUSINESS_PHONE: '0400 000 000', PHONE_HOURS: 'weekdays 4 to 7pm', SETUP_LOG: [{ date: '6 Oct', state: 'VIC', who: 'Dave, Ballarat', quote_on_call: true, sending_live: true }, { date: '8 Oct', state: 'NSW', quote_on_call: true, sending_live: false, second_session: true }] });
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(400); t = await text();
  ok((await p.$$eval('[data-sub]', as => as.every(a => a.getAttribute('href') === 'app/'))), 'every ask opens the app, wherever the config stands');
  ok(/inc GST, a month/.test(t) && /tax invoice with GST shown/.test(await allText()), 'price and GST wording follow config');
  ok(/Thirty days, money back, no reason needed\./.test(t) && /within one business day/.test(await allText()), 'guarantee tag and the slower help promise follow config');
  ok(errors.length === 0, 'state 3: no page errors');

  // ---- laptop, welcome and terms pages
  cfgOverride = null;
  await p.goto(base + 'laptop', { waitUntil: 'load' }); await p.waitForTimeout(300); t = await text();
  ok(/Run your painting quotes from Claude Code/.test(t) && /\$249/.test(t) && /Thirty days from the day the videos reach your inbox/.test(t), 'laptop page: own pitch, price, guarantee from video delivery');
  const lb = await p.$eval('[data-checkout]', e => ({ href: e.getAttribute('href') || '', text: e.textContent.trim(), hidden: e.hidden })).catch(() => null);
  ok(lb && !lb.hidden && /^mailto:help@chasem\.app/.test(lb.href) && /Email me about the pack/.test(lb.text),
     'laptop page: with no checkout wired the buy button asks for an email instead of vanishing: ' + JSON.stringify(lb));
  ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'laptop page fits the phone');
  cfgOverride = withCfg({ CHECKOUT_URL: 'https://gum.example/pack', PACK_PRICE: 199 });
  await p.goto(base + 'laptop', { waitUntil: 'load' }); await p.waitForTimeout(300);
  ok(/gum\.example\/pack\|Buy the pack, \$199/.test(await p.$eval('[data-checkout]', e => e.getAttribute('href') + '|' + e.textContent)), 'laptop page: checkout and price from config');
  cfgOverride = withCfg({ SUPPORT_EMAIL: 'help@example.com.au' });
  await p.goto(base + 'welcome', { waitUntil: 'load' }); await p.waitForTimeout(400); t = await text();
  ok(/You're on\./.test(t) && /Set up your app/.test(t) && /Five minutes on your prices/.test(t) && /Manage or cancel/.test(t) && /Thirty days, money back/.test(t) && !/ring you|book a|pick your hour|on the call/i.test(t), 'welcome page: sets itself up, no call anywhere');
  await p.goto(base + 'prefill', { waitUntil: 'load' }); await p.fill('#trading_name', 'Dave Painting'); await p.selectOption('#state', 'VIC'); await p.fill('#prices', 'p_walls = 24'); await p.fill('#jobs', 'Margaret Hanley | 0411 222 333 | 8 Beaumont St | Lounge | 2450 | quoted'); await p.click('#build'); await p.waitForFunction(() => /#\/setup\?d=/.test(document.getElementById('out').textContent)); const link = await p.$eval('#out', e => e.textContent); ok(/^https:\/\/chasem\.app\/app\/#\/setup\?d=(z|j):/.test(link), 'link builder makes a set-up link on the real domain: ' + link.slice(0, 70));
  await p.goto(base + 'terms', { waitUntil: 'load' }); t = await text();
  ok(/2\. The plan and its messages/.test(t) && /What a message is/.test(t) && /Thirty days, money back/.test(t) && /Price, payment and cancelling/.test(t) && /major failures with the service/.test(t) && /3\. The laptop pack/.test(t) && /4\. Changes to these terms/.test(t) && /What sending through us means/.test(t), 'terms: subscription, cancelling, sending, ACL services text');
  ok(errors.length === 0, 'laptop, welcome and terms: no page errors ' + errors.join(' | '));
  await b.close(); srv.close(); console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
