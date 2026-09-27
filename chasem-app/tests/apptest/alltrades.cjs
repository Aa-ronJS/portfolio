// Any trade, end to end: every text says who it is from and how to reach him; an electrician's job screen is
// who, how much, Won or Lost, with nothing about rooms or paint; the quote he sends again carries no painting
// terms; a wrong figure is put right in one box and the booked nudges follow it; and the audit's safety fixes hold.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const TOKEN = 'qc1.' + b64({ v: 1, cus: 'cus_dave', plan: 'free' }) + '.sig';
const NEW = (tok) => () => { try { const k = 'qc-app-v1', s = JSON.parse(localStorage.getItem(k) || '{}'); if (s.account) return; s.account = { email: 'dave@steele.com.au', joined: '2026-01-01', verified: true }; s.sending = { server: 'https://chasem.app/api/msg', token: window.__TOK, hosted: true, server_has_creds: true }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} };

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  await p.addInitScript((t) => { window.__TOK = t; }, TOKEN); await p.addInitScript(NEW());
  await p.addInitScript(() => { window.__sent = []; window.__qcRelayFetch = (u, o) => { let body = {}; try { body = JSON.parse(o.body); } catch (e) {} window.__sent.push({ u: String(u), body }); return Promise.resolve({ json: () => Promise.resolve(/connect/.test(String(u)) ? { ok: true, off: true } : /find/.test(String(u)) ? { ok: true, providers: [] } : /renew/.test(String(u)) ? { ok: true, active: true, until: '' } : { ok: true, id: 'm' + Math.random() }) }); }; });
  const text = () => p.$eval('#app', e => e.innerText);
  const state = () => p.evaluate(() => window.__qcApp.store.load());
  const go = async (h) => { await p.evaluate(() => { location.hash = '#/x'; }); await p.waitForTimeout(100); await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(600); };
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(600);

  // ---- set-up asks for his mobile, so every text can say how to reach him
  await p.fill('#w_in', 'Steele Electrical'); await p.click('#w_next'); await p.waitForTimeout(400);
  ok(/Your mobile/.test(await text()) && /2 of 6/.test(await text()), 'the second question is his mobile');
  await p.fill('#w_in', '1234'); await p.click('#w_next'); await p.waitForTimeout(300);
  ok(/10 numbers/.test(await text()), 'a number that is not a phone number is refused');
  await p.fill('#w_in', '0412345678'); await p.fill('#w_first', 'Dave'); await p.click('#w_next'); await p.waitForTimeout(400);
  let S = await state(); ok(S.details.phone === '0412 345 678' && S.details.owner_name === 'Dave', 'his mobile, tidied, and his first name are kept');
  ok(S.details.email === 'dave@steele.com.au', 'the email he signed in with is the one customers reply to');
  await p.fill('#w_in', '12 345 678 901'); await p.click('#w_next'); await p.waitForTimeout(400);
  await p.click('[data-state="SA"]'); await p.waitForTimeout(400); await p.click('[data-trade="electrician"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const d = document.querySelector('#app details'); if (d) d.open = true; });
  await p.fill('#w_an', 'Dave Steele'); await p.fill('#w_bsb', '063-000'); await p.fill('#w_acct', '12345678'); await p.click('#w_bank'); await p.waitForTimeout(900);
  ok(/Chase/.test(await text()), 'set-up done, the app opens');
  ok(!/Cancelled/.test(await text()), 'a free account is not told it has cancelled');

  // ---- an electrician's quote, brought in
  await go('#/add/type');
  await p.fill('#a_name', 'Jane Mitchell'); await p.fill('#a_phone', '0412111222'); await p.fill('#a_amount', '2450'); await p.fill('#a_what', 'switchboard upgrade');
  await p.evaluate(() => { const d = new Date(Date.now() - 5 * 864e5); const el = document.getElementById('a_date'); el.value = d.toISOString().slice(0, 10); el.dispatchEvent(new Event('input')); });
  await p.click('#a_go'); await p.waitForTimeout(1200);
  const chase = await text();
  ok(/Cheers, Dave/.test(chase) && /0412 345 678/.test(chase), 'the nudge ends with his name and says how to reach him');
  ok(!/Overdue\s*\$0/.test(chase), 'no "Overdue $0" when nothing is overdue');
  ok(!/waiting to schedule/.test(chase), 'no "waiting to schedule" jargon');
  S = await state(); const job = S.jobs[0];
  await go('#/job/' + job.id); let jt = await text();
  ok(/^[\s\S]*Jane Mitchell/.test(jt.split('\n').slice(0, 3).join(' ')) && !/Q-1001/.test(jt.split('\n').slice(0, 3).join(' ')), 'the job is headed with her name, not a number she never saw');
  const shown = await p.evaluate(() => ['Rooms and outside areas', 'Colours', 'Premium paint', 'Client supplies paint', 'Running total', 'Extras'].filter(w => Array.from(document.querySelectorAll('#app *')).some(e => e.offsetParent !== null && e.children.length === 0 && e.textContent.trim().startsWith(w))));
  ok(shown.length === 0, 'none of the painter\'s room builder shows: ' + JSON.stringify(shown));
  ok(await p.isVisible('#jwon') && await p.isVisible('#jlost'), 'Won and Lost are right there, as pictures with words');

  // ---- a wrong figure, put right; the booked nudges follow it
  await p.fill('#jamount', '2,600'); await p.press('#jamount', 'Tab'); await p.waitForTimeout(1200);
  S = await state(); let j2 = S.jobs.find(x => x.id === job.id);
  ok(j2.quote.total === 2600 && Math.abs(j2.quote.subtotal - 2363.64) < 0.01, 'the quote is now $2,600 with GST worked out');
  await go('#/chase'); ok(/\$2,600/.test(await text()) && !/\$2,450/.test(await text()), 'and every follow-up now says $2,600');

  // ---- the quote PDF he can send again: no painting in it
  const pdfText = await p.evaluate((id) => { const S = window.__qcApp.store.load(), j = S.jobs.find(x => x.id === id); return QCPdf.quotePDF(j, S).output(); }, job.id);
  ok(!/paint|peeling|coats|sheen/i.test(pdfText), 'the quote PDF has no painting terms, coats or peeling guarantee: ' + (pdfText.match(/[\s\S]{80}(paint|peeling|coats|sheen)[\s\S]{40}/i) || [''])[0].replace(/\s+/g, ' '));
  ok(/2,600\.00/.test(pdfText) && /Statutory warranties/.test(pdfText) && (pdfText.match(/Statutory warranties/g) || []).length === 1, 'it has the total and one statutory warranty line');

  // ---- help, for his trade
  await go('#/help'); const help = await p.evaluate(() => Array.from(document.querySelectorAll('#app li')).filter(e => e.offsetParent !== null).map(e => e.innerText).join(' | '));
  ok(!/room|A4|Measure/i.test(help) && /Chase/.test(help) && /sign in/i.test(await text()), 'help is about chasing, with nothing about rooms or measuring');

  // ---- Won
  await go('#/job/' + job.id); await p.click('#jwon'); await p.waitForTimeout(1200);
  S = await state(); j2 = S.jobs.find(x => x.id === job.id);
  ok(j2.status === 'accepted' && /Invoice/.test(await text()), 'Won: the job is accepted and Invoice is offered');
  ok(!/Locked\. Revise quote/.test(await text()), 'with no painter jargon about locked quotes');
  await go('#/job/' + job.id + '/invoice'); const inv = await text();
  const owe = /Owing on this job: \$([\d,.]+)(?: \(plus \$([\d,.]+) not invoiced yet\))?/.exec(inv);
  ok(owe && (!owe[2] || Math.abs(parseFloat(owe[1].replace(/,/g, '')) + parseFloat(owe[2].replace(/,/g, '')) - 2600) < 0.01), 'owing plus not invoiced adds up to the job: ' + (owe && owe[0]));

  // ---- his own quote picture goes back out from Follow-ups
  const pic = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 60; c.height = 80; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 60, 80); return c.toDataURL('image/jpeg'); });
  await p.evaluate(([pic]) => { const st = window.__qcApp.store, S = st.load(), j = S.jobs[0]; const n = JSON.parse(JSON.stringify(j)); n.id = 'jpic'; n.quote_no = 'Q-1050'; n.no_number = true; n.status = 'quoted'; n.invoices = []; n.follow_ups = []; n.acceptance = null; n.client = Object.assign({}, n.client, { name: 'Tom Nguyen', first_name: 'Tom' }); n.photos = [{ id: 'p1', data: pic, caption: 'The quote', room: '' }]; S.jobs.push(n); st.save(); }, [pic]);
  await go('#/chase');
  const qtile = await p.$('[data-qpic]'); ok(!!qtile && /Quote/.test(await qtile.innerText()), 'a quote brought in as a picture has a Quote button on its follow-up');
  if (qtile) { await qtile.click(); await p.waitForTimeout(800); ok(!!(await p.$('#qcview')), 'which opens his quote to look at, then send'); await p.evaluate(() => { const v = document.getElementById('qcv_close'); if (v) v.click(); }); }

  // ---- sharing a text in never throws away a quote he was typing
  await p.evaluate(() => { localStorage.setItem('qc-add-draft', JSON.stringify({ kind: 'quote', name: 'Half typed', amount: '99' })); });
  await p.goto(base + '?share_text=' + encodeURIComponent('Hi Ben, price is $500'), { waitUntil: 'load' }); await p.waitForTimeout(800);
  ok(JSON.parse(await p.evaluate(() => localStorage.getItem('qc-add-draft'))).name === 'Half typed' && /Hi Ben, price is \$500/.test(await p.$eval('#pastebox', e => e.value).catch(() => '')), 'a shared text waits in the Paste box; his half-typed quote is kept');

  // ---- a set-up link cannot point his sending, and his token, somewhere else
  const evilLink = (sending) => base + '#/setup?d=j:' + b64({ v: 1, settings: { sending } });
  const before = (await state()).sending;
  await p.goto(evilLink({ server: 'https://evil.example/api/msg' }), { waitUntil: 'load' }); await p.waitForTimeout(700);
  const lb = await p.$('#setupload, [data-load], #load'); if (lb) { await lb.click(); await p.waitForTimeout(700); }
  else await p.evaluate(() => { try { window.__qcApp.applySetup({ v: 1, settings: { sending: { server: 'https://evil.example/api/msg' } } }); } catch (e) {} });
  S = await state(); ok(S.sending.server === before.server && S.sending.token === before.token, 'a link to another server is ignored: sending and token stay as they were');
  await p.evaluate((tok) => { try { window.__qcApp.applySetup({ v: 1, settings: { sending: { server: 'https://chasem.app/api/msg', token: tok } } }); } catch (e) {} }, 'qc1.' + b64({ v: 1, cus: 'cus_attacker', plan: 'paid' }) + '.sig');
  S = await state(); ok(S.sending.token === before.token, 'a link carrying someone else\'s account token is ignored too');
  const mine2 = 'qc1.' + b64({ v: 1, cus: 'cus_dave', plan: 'paid', until: '2027-01-01' }) + '.sig2';
  await p.evaluate((tok) => { window.__qcApp.applySetup({ v: 1, settings: { sending: { server: 'https://chasem.app/api/msg', token: tok } } }); }, mine2);
  S = await state(); ok(S.sending.token === mine2, 'his own account\'s new token (after paying) is taken');

  // ---- an account already past set-up is not stopped for a mobile; its texts still say who and how to reply
  const p2 = await ctx.newPage(); p2.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
  await p2.goto(base, { waitUntil: 'load' });
  await p2.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.details.phone = ''; S.details.owner_name = ''; st.save(); }); await p2.reload({ waitUntil: 'load' }); await p2.waitForTimeout(600);
  ok(!/Your mobile/.test(await p2.$eval('#app', e => e.innerText)), 'an account already set up is not stopped to give a mobile');
  await p2.evaluate(() => { location.hash = '#/chase'; }); await p2.waitForTimeout(700);
  const t2 = await p2.$eval('#app', e => e.innerText);
  ok(/Cheers, Steele Electrical/.test(t2) && /dave@steele\.com\.au/.test(t2), 'its texts end with the business name and give his email to reply to');

  await b.close(); srv.close();
  console.log(fails ? '\nFAILURES: ' + fails : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
