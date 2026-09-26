// Landing page for every trade, self-service: phone render, config wiring in three states, jargon kept out of the sales copy, links resolve, laptop, welcome and terms pages.
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
  ok(/You quote\.\s*Chasem chases\./.test(t) && /For Australian tradies/i.test(t), 'headline sells the outcome, to every trade');
  ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'no sideways scroll at 390 px');
  const h = await p.evaluate(() => document.documentElement.scrollHeight); console.log('  page height ' + h + ' px, ' + (h / 664).toFixed(1) + ' phone screens');
  ok(h / 664 < 22, 'page length within bounds');
  const img = await p.$eval('.proof img', e => ({ w: e.naturalWidth, alt: e.alt })); ok(img.w === 780 && /Owed|owed/.test(img.alt), 'hero shows the app itself: what is owed, waiting and won');
  const firstScreen = await p.evaluate(() => Array.from(document.querySelectorAll('.hero .stack *')).filter(e => e.getBoundingClientRect().top < 664).map(e => e.textContent).join(' '));
  ok(/Start free, your first three jobs/.test(firstScreen), 'the way in is on the first screen');
  ok(!/Coming soon/.test(t), 'no "Coming soon" shopfront anywhere');
  ok((await p.$$('[data-sub]')).length >= 2 && (await p.$$eval('[data-sub]', as => as.every(a => a.getAttribute('href') === 'app/'))), 'with nothing configured every ask opens the app, because that is where sign-up happens');
  ok(!(await p.$('#maker:not([hidden])')), 'maker block hidden until written');
  ok(!/Contact email coming soon|to be added/.test(t), 'no placeholder contact line');
  // nobody is told painting is the point any more: painters get one section of their own
  const notPaint = await p.evaluate(() => { let out = ''; for (const el of document.body.children) { if (el.id === 'painters') continue; if (el.tagName === 'FOOTER') continue; out += el.innerText + '\n'; } return out; });
  ok(!/paint/i.test(notPaint), 'outside the painters section and the footer, nothing says paint: ' + ((notPaint.match(/.{30}paint.{30}/i) || [''])[0]));
  ok(/It writes the quote too\./.test(t) && /6 cm on a 4 m wall/.test(t), 'painters still find the measuring, in their own section');
  // jargon stays out of the sales copy: everything above the "Straight about what is where" section
  const above = await p.evaluate(() => { const stop = document.getElementById('inside'); let out = ''; for (const el of document.body.children) { if (el === stop) break; out += el.innerText + '\n'; } return out; });
  const jargon = ['Twilio', 'Resend', 'relay', 'Vercel', 'Claude Code', 'slash command', 'CSV', 'share sheet', 'deploy', 'OAuth', 'API'];
  const leaks = jargon.filter(w => new RegExp('\\b' + w + '\\b', 'i').test(above)); ok(leaks.length === 0, 'no jargon in the sales copy above the honest section: ' + JSON.stringify(leaks));
  ok(/Tradify/.test(t) && /ServiceM8/.test(t) && /Xero/.test(t), 'names the quoting apps people already use');
  ok(!(await p.$('[data-logins]:not([hidden])')), 'email and Xero logins are not promised until they are switched on');
  ok(/\$99/.test(t) && /a month/.test(t) && /150 messages included/.test(t) && /three jobs free/i.test(t) && /Cancel from inside the app any time/.test(t) && !/an hour with me|Book your|\$149|Two phones/.test(await allText()), 'one price, messages included, first three jobs free, cancelled by the tradie');
  ok(/For the tradie with quotes out and money owed/.test(t) && /You quote\. It does the chasing\./.test(t) && /Nothing to open/.test(t), 'one-line avatar, the sub-line and the outcome statement open the card');
  const priceTop = await p.evaluate(() => { const c = document.getElementById('plan').getBoundingClientRect().top; return document.querySelector('#plan .price').getBoundingClientRect().top - c; }); ok(priceTop < 1400, 'price arrives within the first two phone screens of the card (' + Math.round(priceTop) + ' px)');
  const cardH = await p.evaluate(() => document.getElementById('plan').getBoundingClientRect().height); ok(cardH < 2800, 'card under four and a bit phone screens with the folds closed (' + Math.round(cardH) + ' px)');
  ok(/Your quotes, from anywhere/.test(t) && /The chasing, without you/.test(t) && /Yes to booked/.test(t) && /Off in two taps/.test(t), 'the card promises the bringing in, the chasing, the booking, and cancelling in two taps');
  const at = await allText(); ok(/What counts as a message/.test(at) && /The first ten minutes, on the phone in your hand/.test(at) && /What you still do: mark it paid, and back it up/.test(at) && /Before you say no/.test(at) && /I already use Tradify/.test(at), 'detail folds: sign-up, what runs, what is still his, and the objections');
  ok(!(await p.$eval('#plan details.group', d => d.open)), 'detail folds closed on a phone');
  ok(/What happens when you sign up/.test(t) && /No call to book, no reply to wait for, no password to make/.test(t) && /chasing money by 9:05/.test(t), 'the after-signup section promises nobody in the loop');
  ok(!/\bring you\b|book a call|book your\b|pick your hour|fifteen minutes on the phone|on the call/i.test(await allText()), 'nothing anywhere asks the tradie to get on a call');
  ok(/cancel from inside the app/i.test(await allText()), 'cancelling is described as something he does himself');
  ok(/One app, one price, and the texting and emailing already built in/.test(await allText()) && /like credit on a phone/.test(await allText()), 'the lede explains the model in one line');
  ok(/No card until you want the monthly\./.test(await allText()), 'the ask is an email, not a card');
  ok(/the app keeps writing every message for you to send by hand/.test(await allText()), 'it says plainly what happens when the messages run out');
  ok(/No sign-up call, no demo, no salesperson/.test(await allText()), 'no sales machinery: the thing is simply for sale');
  const faqN = await p.$$eval('#faq details', d => d.length); ok(faqN >= 12, faqN + ' FAQ entries');
  ok(/What does it cost, really\?/.test(t) && /What's the catch/.test(t) && /Which trades is it for/.test(t) && /Do I have to stop using my quoting app/.test(t), 'the burned tradie\'s questions are answered');
  // the ways in carry pictures from the app's own set, each with its words
  const ways = await p.$$eval('.way:not([hidden])', els => els.map(e => !!e.querySelector('.pic svg') && e.querySelector('h3').textContent.trim()));
  ok(ways.length === 5 && ways.every(Boolean), 'five ways to bring quotes in, each a picture over its words: ' + ways.join(' | '));
  // try it: the app's own reader, on the page, nothing sent
  const sent = []; p.on('request', r => { if (r.method() === 'POST') sent.push(r.url()); });
  await p.fill('#pastebox', 'Hi Tom, price for the downlights and dimmers is $880 inc GST. Q-2044. Cheers, Dave'); await p.click('#readit'); await p.waitForTimeout(300);
  const found = await p.$eval('#found', e => e.innerText), whens = await p.$$eval('#found .when', els => els.map(e => e.textContent));
  ok(/Tom · \$880/.test(found) && /Q-2044/.test(found) && (found.match(/Hi Tom,/g) || []).length === 3 && /last note from me/.test(found), 'paste a quote: it finds Tom, $880 and Q-2044, and shows the three follow-ups');
  ok(whens.length === 3 && whens.every(w => /9am$/.test(w) && !/^(Sat|Sun)/.test(w)), 'the follow-ups land on weekdays at 9am: ' + whens.join(' | '));
  ok(sent.length === 0, 'trying it sends nothing anywhere');
  await p.fill('#pastebox', 'see you tuesday'); await p.click('#readit'); await p.waitForTimeout(200);
  ok(/No price in that one/.test(await p.$eval('#found', e => e.innerText)), 'a text with no price says so in one line');
  // links resolve
  const hrefs = await p.$$eval('a[href]', as => Array.from(new Set(as.map(a => a.getAttribute('href')).filter(h => h && !/^(#|mailto:|https?:)/.test(h)))));
  for (const hf of hrefs) { const r = await p.request.get(base + hf.replace(/^\.\//, '')); ok(r.status() === 200, 'link resolves: ' + hf + ' (' + r.status() + ')'); }
  await p.screenshot({ path: SP + '/apptest/landing2-top.png' });
  await p.evaluate(() => document.getElementById('price').scrollIntoView()); await p.waitForTimeout(200); await p.screenshot({ path: SP + '/apptest/landing2-price.png', fullPage: false });
  ok(errors.length === 0 && failed.length === 0, 'state 1: no page errors or failed requests ' + JSON.stringify(errors.concat(failed)).slice(0, 200));

  // ---- state 2: form wired, no checkout, support email, maker, ABN
  cfgOverride = withCfg({ FORM_ACTION: 'https://formspree.example/f/abc', SUPPORT_EMAIL: 'help@example.com.au', ABN: '51 824 753 556', MAKER_NOTE: 'I build software and got tired of watching mates quote at 9pm.', MAKER_NAME: 'Aaron, Melbourne', SETUP_SLOTS_WEEK: 5, FOUNDING_LEFT: 14, HOSTED_DATE: 'March 2027', BONUSES_READY: true });
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(400); t = await text();
  ok((await p.$$('[data-sub]:not([hidden])')).length >= 2, 'every ask stays live whatever the config, because sign-up lives in the app');
  ok(!!(await p.$('#maker:not([hidden])')) && /Aaron, Melbourne/.test(t) && /ABN 51 824 753 556/.test(t) && /help@example.com.au/.test(t), 'maker, ABN and email appear once configured');
  ok(/Aaron, Melbourne\. One person, not a company/.test(await allText()), 'FAQ "who is behind this" names the maker');
  ok(!!(await p.$('#waitlist:not([hidden])')), 'sample-quote email capture visible with a form');
  await p.route('**/api/find?action=which', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, providers: ['Outlook', 'Xero'] }) }));
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(500);
  ok(/Log in to Outlook or Xero\./.test(await p.$eval('[data-logins]', e => e.hidden ? '' : e.innerText).catch(() => '')), 'once logins are switched on the server, the page offers exactly those');
  await p.unroute('**/api/find?action=which');
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
  ok(/You're on\./.test(t) && /Set up your app/.test(t) && /Bring in the quotes you already have out/.test(t) && /Manage or cancel/.test(t) && /Thirty days, money back/.test(t) && !/ring you|book a|pick your hour|on the call/i.test(t), 'welcome page: sets itself up, no call anywhere');
  await p.goto(base + 'prefill', { waitUntil: 'load' }); await p.fill('#trading_name', 'Dave Painting'); await p.selectOption('#state', 'VIC'); await p.fill('#prices', 'p_walls = 24'); await p.fill('#jobs', 'Margaret Hanley | 0411 222 333 | 8 Beaumont St | Lounge | 2450 | quoted'); await p.click('#build'); await p.waitForFunction(() => /#\/setup\?d=/.test(document.getElementById('out').textContent)); const link = await p.$eval('#out', e => e.textContent); ok(/^https:\/\/chasem\.app\/app\/#\/setup\?d=(z|j):/.test(link), 'link builder makes a set-up link on the real domain: ' + link.slice(0, 70));
  await p.goto(base + 'terms', { waitUntil: 'load' }); t = await text();
  ok(/2\. The plan and its messages/.test(t) && /What a message is/.test(t) && /Thirty days, money back/.test(t) && /Price, payment and cancelling/.test(t) && /major failures with the service/.test(t) && /3\. The laptop pack/.test(t) && /4\. Changes to these terms/.test(t) && /What sending through us means/.test(t), 'terms: subscription, cancelling, sending, ACL services text');
  ok(errors.length === 0, 'laptop, welcome and terms: no page errors ' + errors.join(' | '));
  await b.close(); srv.close(); console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
