const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const L = require('./lib.cjs'); const { ok, wire } = L;
const VIEWPORTS = [[320, 568], [375, 667], [390, 844], [412, 915], [768, 1024], [1280, 800]];
const contrastJs = () => {
  function lum(c) { const m = c.match(/[\d.]+/g).map(Number); const [r, g, b] = m.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return { l: 0.2126 * r + 0.7152 * g + 0.0722 * b, a: m.length > 3 ? m[3] : 1 }; }
  function bg(el) { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && lum(c).a > 0.9) return c; e = e.parentElement; } return getComputedStyle(document.body).backgroundColor; }
  const bad = [];
  document.querySelectorAll('#app *, header *').forEach(el => { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return; const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) return; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return; const fg = lum(cs.color).l, b = lum(bg(el)).l; const ratio = (Math.max(fg, b) + 0.05) / (Math.min(fg, b) + 0.05); const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && parseInt(cs.fontWeight) >= 700); const min = big ? 3 : 4.5; if (ratio < min) bad.push({ el: el.tagName + '.' + el.className, text: el.textContent.trim().slice(0, 30), ratio: +ratio.toFixed(2), fg: cs.color, bg: bg(el) }); });
  return bad;
};
const a11yJs = () => {
  const out = { unlabeled: [], emptyButtons: [], noAlt: [], lang: document.documentElement.lang };
  document.querySelectorAll('input, select, textarea').forEach(el => { if (el.type === 'hidden') return; const has = el.closest('label') || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.id && document.querySelector('label[for="' + el.id + '"]')); if (!has) out.unlabeled.push(el.tagName.toLowerCase() + (el.type ? '[' + el.type + ']' : '') + (el.id ? '#' + el.id : '') + (el.dataset.bind ? '[data-bind=' + el.dataset.bind + ']' : el.dataset.price ? '[data-price]' : el.dataset.xk ? '[data-xk=' + el.dataset.xk + ']' : '') + (el.placeholder ? ' ph="' + el.placeholder + '"' : '')); });
  document.querySelectorAll('button, a.btn').forEach(el => { if (!el.textContent.trim() && !el.getAttribute('aria-label')) out.emptyButtons.push(el.outerHTML.slice(0, 60)); });
  document.querySelectorAll('img').forEach(el => { if (!el.hasAttribute('alt')) out.noAlt.push(el.outerHTML.slice(0, 60)); });
  return out;
};
(async () => {
  const { srv, base } = await L.serve(L.ROOT); const b = await L.launch();
  const log = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); await p.addInitScript(L.joinScript); await p.addInitScript(__OPEN_SEC); wire(p, log);
  await p.goto(base + '#/', { waitUntil: 'load' });
  const ids = await p.evaluate(L.seedJs); console.log('  seeded', JSON.stringify(ids));
  await p.reload({ waitUntil: 'load' });
  const routesFor = ids => ({ home: '#/', chase: '#/chase', settings: '#/settings', help: '#/help', enquiryNew: '#/enquiry', enquiry: '#/enquiry/' + ids.enquiry, jobDraft: '#/job/' + ids.draft, room: '#/job/' + ids.draft + '/room/' + ids.room, jobEnquiryAsJob: '#/job/' + ids.enquiry, jobQuoted: '#/job/' + ids.quoted, jobAccepted: '#/job/' + ids.accepted, jobInvoiced: '#/job/' + ids.invoiced, jobPaid: '#/job/' + ids.paid, jobDeclined: '#/job/' + ids.declined, quoteDraft: '#/job/' + ids.draft + '/quote', quoteNoRooms: '#/job/' + ids.noroom + '/quote', quoteQuoted: '#/job/' + ids.quoted + '/quote', quoteAccepted: '#/job/' + ids.accepted + '/quote', quoteInvoiced: '#/job/' + ids.invoiced + '/quote', quotePaid: '#/job/' + ids.paid + '/quote', quoteDeclined: '#/job/' + ids.declined + '/quote', invoiceDraft: '#/job/' + ids.draft + '/invoice', invoiceQuoted: '#/job/' + ids.quoted + '/invoice', invoiceAccepted: '#/job/' + ids.accepted + '/invoice', invoiceInvoiced: '#/job/' + ids.invoiced + '/invoice', invoicePaid: '#/job/' + ids.paid + '/invoice' });
  const routes = routesFor(ids);
  const texts = {};
  // 2. render each with seeded state, check errors and content
  for (const [k, h] of Object.entries(routes)) { const n = log.length; await p.goto(base + h, { waitUntil: 'load' }); await p.waitForTimeout(150); const t = await p.$eval('#app', e => e.innerText); texts[k] = t; const e = log.slice(n).filter(x => x.type === 'pageerror'); ok(!e.length && t.length > 20, 'seeded render ' + k + ' -> ' + (await p.evaluate(() => location.hash)) + (e.length ? ' ERR ' + e[0].text : '')); }
  // pills / labels sanity
  const home = texts.home;
  for (const [name, pill] of [['Enquiry Person', 'Enquiry'], ['Draft Person', 'Draft'], ['Quoted Person', 'Quoted'], ['Accepted Person', 'Accepted'], ['Invoiced Person', 'Deposit paid'], ['Paid Person', 'Paid'], ['Declined Person', 'Declined']]) ok(new RegExp(name + '[\\s\\S]{0,80}' + pill).test(home), 'home shows ' + name + ' with pill ' + pill);
  ok(/Quote visits[\s\S]*Enquiry Person/.test(home), 'home lists upcoming quote visit'); ok(/Booked[\s\S]*Accepted Person/.test(home), 'home lists booked job');
  ok(/\$1,200 to \$1,700/.test(home), 'enquiry row shows ballpark range');
  const ch = texts.chase; console.log('  chase: ' + ch.replace(/\s+/g, ' ').slice(0, 700));
  ok(/Invoiced Person[\s\S]{0,120}INV-2002[\s\S]{0,40}12 days overdue/.test(ch), 'chase lists overdue INV-2002 12 days');
  ok(/First reminder|day 21/.test(ch), 'chase shows the reminder for INV-2002 (scheduled day-21 message in this fixture)'); ok(/Quoted Person[\s\S]{0,80}waiting 10 days/.test(ch) && /Second follow-up/.test(ch), 'chase lists quote waiting 10 days as Second follow-up');
  ok(/Pay by card: https:\/\/buy\.stripe\.com/.test(ch), 'chase SMS text carries pay_url'); ok(/Scheduled[\s\S]*Invoiced Person/.test(ch), 'chase shows scheduled (future) follow-up');
  ok(!/Paid Person|Declined Person|Accepted Person|Draft Person/.test(ch), 'chase omits paid/declined/accepted/draft jobs');
  const owed = (ch.match(/Outstanding\s*\$([\d,]+)/) || [])[1]; console.log('  outstanding=' + owed);
  ok(/Phone ballpark was \$[\d,]+ to \$[\d,]+\. Visit/.test(texts.jobEnquiryAsJob), 'job page for enquiry shows ballpark + visit line: ' + texts.jobEnquiryAsJob.replace(/\s+/g,' ').slice(0,160));
  ok(/Booked/.test(texts.jobAccepted) && /Change/.test(texts.jobAccepted), 'accepted job page shows booking card');
  ok(/Accepted/.test(texts.quoteQuoted) && /Declined/.test(texts.quoteQuoted), 'quoted quote page offers yes/declined');
  ok(/Invoice/.test(texts.quoteAccepted) && /Booked/.test(texts.quoteAccepted) && !/\bBook\b(?!ed)/.test(texts.quoteAccepted), 'accepted quote page: Invoice link, booked line, no Book-it-in');
  ok(!/Accepted/.test(texts.quoteDeclined) && /Declined/.test(texts.quoteDeclined), 'declined quote page has no accept buttons but shows pill');
  ok(!/Accepted/.test(texts.quotePaid) && /Paid/.test(texts.quotePaid), 'paid quote page shows Paid pill and no accept buttons');
  console.log('  invoiceInvoiced: ' + texts.invoiceInvoiced.replace(/\s+/g, ' ').slice(0, 500));
  ok(/INV-2001[\s\S]{0,80}paid/.test(texts.invoiceInvoiced) && /INV-2002[\s\S]{0,160}card link[\s\S]{0,60}1 reminder pending[\s\S]{0,80}Record payment/.test(texts.invoiceInvoiced), 'invoice page: deposit paid, final has card link + 1 pending reminder + Mark paid');
  ok(/[Cc]ard/.test(texts.invoicePaid) && /[Pp]aid/.test(texts.invoicePaid), 'paid job invoice page shows the card payment');
  ok(/Fixed price/.test(texts.quoteDraft), 'draft quote says fixed price from typed sizes'); ok(!/Estimate from typed/.test(texts.quoteNoRooms) && /Total/.test(texts.quoteNoRooms), 'no-rooms quote renders total');
  const dr = texts.jobDraft; if (!/typed sizes/.test(dr) || !/5 × 4 m/.test(dr)) console.log('  jobDraft text: ' + dr.replace(/\s+/g, ' ').slice(0, 600)); ok(/typed sizes/.test(dr) && /5 × 4 m/.test(dr), 'draft job room row shows typed sizes pill');
  // enquiry page for seeded enquiry
  ok(/Lounge \/ living[\s\S]*Bedroom[\s\S]*× 2/.test(texts.enquiry) && /at 9:00am|9am/i.test(texts.enquiry), 'enquiry page shows picks and visit time: ' + (texts.enquiry.match(/for 30 min[^\n]*/) || [''])[0]);
  const bpNote = (texts.enquiry.match(/\$[\d,]+ to \$[\d,]+[\s\S]{0,140}/) || [''])[0]; console.log('  ballpark: ' + bpNote.replace(/\s+/g, ' '));
  // 3. layout across viewports (light), with per-screen overflow + tap targets
  const screens = ['home', 'chase', 'settings', 'help', 'enquiry', 'enquiryNew', 'jobInvoiced', 'jobDraft', 'room', 'quoteInvoiced', 'quoteQuoted', 'invoiceInvoiced'];
  for (const [w, h] of VIEWPORTS) {
    const c2 = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 700 ? 2 : 1, isMobile: w < 700, hasTouch: w < 700 }); const q = await c2.newPage(); await q.addInitScript(__OPEN_SEC); wire(q, log);
    await q.goto(base + '#/', { waitUntil: 'load' }); const qr = routesFor(await q.evaluate(L.seedJs)); await q.reload({ waitUntil: 'load' });
    for (const s of screens) {
      await q.goto(base + qr[s], { waitUntil: 'load' }); await q.waitForTimeout(120);
      if (s === 'invoiceInvoiced' && await q.$('#kind')) { const opts = await q.$$eval('#kind option', os => os.map(o => o.value)); if (opts.includes('final')) await q.selectOption('#kind', 'final'); if (await q.$('#addvar')) { await q.click('#addvar'); await q.click('#addvar'); } }
      if (s === 'jobDraft') { await q.click('#addextra'); await q.click('#addextra'); }
      if (s === 'enquiryNew') { await q.click('[data-room="lounge"]'); await q.click('#findslots'); await q.waitForTimeout(150); }
      if (s === 'quoteInvoiced' || s === 'quoteQuoted') { const bk = await q.$('#book'); if (bk) { await bk.click(); } }
      const o = await q.evaluate(L.overflowJs); if (!o.ok) console.log('  OVERFLOW DETAIL ' + JSON.stringify(await q.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).slice(0, 6).map(e => ({ tag: e.tagName, id: e.id, cls: e.className, bind: e.dataset.bind, right: Math.round(e.getBoundingClientRect().right), w: Math.round(e.getBoundingClientRect().width), html: e.outerHTML.slice(0, 70) }))))); ok(o.ok, w + 'x' + h + ' ' + s + ' no overflow (maxRight=' + o.maxRight + ' by ' + o.who + ', scrollWidth=' + o.sw + ')');
      if (w < 700) { const small = await q.$$eval('.btn', bs => bs.filter(b => { const r = b.getBoundingClientRect(); return r.width && r.height && r.height < 40; }).map(b => b.textContent.trim().slice(0, 18) + '=' + Math.round(b.getBoundingClientRect().height))); ok(!small.length, w + 'x' + h + ' ' + s + ' all .btn >= 40px tall' + (small.length ? ' (' + small.length + ' short: ' + small.slice(0, 6).join(', ') + ')' : '')); }
      if ((w === 320 || w === 1280) && ['home', 'quoteInvoiced', 'settings', 'enquiry', 'chase'].includes(s)) await q.screenshot({ path: L.SP + '/shots/' + s + '-' + w + '.png', fullPage: true });
      if (w === 320 && s === 'room') await q.screenshot({ path: L.SP + '/shots/room-320.png', fullPage: true });
    }
    await c2.close();
  }
  // dark mode pass at 390 with contrast checks and screenshots
  const cd = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, colorScheme: 'dark' }); const d = await cd.newPage(); await d.addInitScript(__OPEN_SEC); wire(d, log);
  await d.goto(base + '#/', { waitUntil: 'load' }); const dr2 = routesFor(await d.evaluate(L.seedJs)); await d.reload({ waitUntil: 'load' });
  const contrastAll = {};
  for (const s of ['home', 'chase', 'settings', 'enquiry', 'quoteInvoiced', 'jobDraft', 'invoiceInvoiced', 'help', 'room']) { await d.goto(base + dr2[s], { waitUntil: 'load' }); await d.waitForTimeout(120); const bad = await d.evaluate(contrastJs); bad.forEach(x => { const k = x.el + ' ' + x.fg + ' on ' + x.bg; contrastAll[k] = contrastAll[k] || { ...x, screens: [] }; contrastAll[k].screens.push(s); }); if (['home', 'quoteInvoiced', 'chase', 'settings'].includes(s)) await d.screenshot({ path: L.SP + '/shots/dark-' + s + '-390.png', fullPage: s !== 'settings' }); }
  const cl = Object.values(contrastAll); ok(!cl.length, 'dark mode: all text >= WCAG AA contrast' + (cl.length ? '\n    ' + cl.map(x => x.ratio + ':1 ' + x.el + ' "' + x.text + '" ' + x.fg + ' on ' + x.bg + ' [' + [...new Set(x.screens)].join(',') + ']').join('\n    ') : ''));
  // light mode contrast too
  await p.goto(base + '#/', { waitUntil: 'load' }); const lightBad = {}; for (const s of ['home', 'chase', 'settings', 'quoteInvoiced', 'help']) { await p.goto(base + routes[s], { waitUntil: 'load' }); (await p.evaluate(contrastJs)).forEach(x => { lightBad[x.el + x.fg + x.bg] = x; }); } const lb = Object.values(lightBad); ok(!lb.length, 'light mode: all text >= WCAG AA' + (lb.length ? ' ' + lb.map(x => x.ratio + ':1 ' + x.el + ' "' + x.text + '" ' + x.fg + ' on ' + x.bg).join('; ') : ''));
  await cd.close();
  // 6. a11y basics
  for (const s of ['settings', 'jobDraft', 'enquiry', 'quoteQuoted', 'invoiceInvoiced', 'chase', 'home', 'room']) { await p.goto(base + routes[s], { waitUntil: 'load' }); if (s === 'jobDraft') await p.click('#addextra'); if (s === 'invoiceInvoiced') { if (await p.$('#nextinv')) { await p.click('#nextinv'); await p.waitForSelector('#kind'); } if (await p.$('#kind')) { await p.selectOption('#kind', 'final'); if (await p.$('#addvar')) await p.click('#addvar'); } } const a = await p.evaluate(a11yJs); ok(!a.unlabeled.length, s + ': every input labelled' + (a.unlabeled.length ? ' (unlabelled: ' + a.unlabeled.join(', ') + ')' : '')); ok(!a.emptyButtons.length, s + ': buttons have text' + (a.emptyButtons.length ? ' ' + a.emptyButtons.join(' | ') : '')); ok(!a.noAlt.length, s + ': images have alt' + (a.noAlt.length ? ' ' + a.noAlt.join(' | ') : '')); }
  ok((await p.evaluate(() => document.documentElement.lang)) === 'en-AU', 'html lang=en-AU');
  // focus order on quote page
  await p.goto(base + routes.quoteQuoted, { waitUntil: 'load' }); await p.evaluate(() => document.body.focus());
  const order = []; for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); if (await p.evaluate(() => document.activeElement === document.body)) break; order.push(await p.evaluate(() => { const a = document.activeElement; const all = [...document.querySelectorAll('a,button,input,select,textarea')]; return { i: all.indexOf(a), d: a.tagName + ':' + (a.textContent || a.value || '').trim().slice(0, 18) }; })); }
  const idx = order.map(o => o.i); ok(idx.every((v, i) => i === 0 || v > idx[i - 1]), 'quote page Tab order follows DOM: ' + order.map(o => o.i + ' ' + o.d).join(' > '));
  // 7. console noise
  const distinct = [...new Set(log.map(x => x.type + ': ' + x.text))]; console.log('CONSOLE DISTINCT (' + distinct.length + '):\n  ' + distinct.join('\n  '));
  await b.close(); srv.close(); console.log(L.fails ? 'FAILURES: ' + L.fails : 'ALL PASSED');
})().catch(e => { console.error('CRASH', e); process.exit(1); });
