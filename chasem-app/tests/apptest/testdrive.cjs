// The test drive: the seeded book, the safety net that stops a message reaching a customer, the walkthrough,
// and the findings getting off the phone.
const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); };
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

const MOCK = () => {
  window.__qcCalls = [];
  window.__feedback = { ok: true, stored: 1, mailed: true };
  window.__qcRelayFetch = (u, o) => {
    const b = JSON.parse(o.body); window.__qcCalls.push({ url: String(u), body: b });
    if (/\/feedback$/.test(String(u))) return Promise.resolve({ json: () => Promise.resolve(window.__feedback) });
    if (/\/sync$/.test(String(u))) return Promise.resolve({ json: () => Promise.resolve({ ok: true, now: new Date().toISOString(), changes: [], bookings: [], replies: [] }) });
    return Promise.resolve({ json: () => Promise.resolve({ ok: true, id: 'SM1', left: 10, included: 12 }) });
  };
};
const joined = () => { try { const k = 'qc-app-v1', s = JSON.parse(localStorage.getItem(k) || '{}'); s.account = { email: 'dave@example.com', joined: '2026-01-01', verified: true }; s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} };

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.addInitScript(joined); await p.addInitScript(MOCK); await p.addInitScript(__OPEN_SEC);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
  p.on('dialog', d => d.accept());
  const text = () => p.$eval('#app', e => e.innerText);
  const store = () => p.evaluate(() => window.__qcApp.store.load());

  await p.goto(base + '#/test', { waitUntil: 'load' }); await p.waitForTimeout(400);
  let t = await text();
  ok(/Test drive/.test(t) && /Load a busy week/.test(t), 'the test drive opens with a way to load a book');
  ok(/fourteen steps|Walk it through/i.test(t) && (await p.$$('[data-step]')).length === 14, 'and fourteen steps of the job, in order (' + (await p.$$('[data-step]')).length + ')');

  // his own details first, so the diverted messages have somewhere to go
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.details.phone = '0412 345 678'; S.details.email = 'dave@example.com';
    S.sending = Object.assign({}, S.sending, { server: 'https://relay.example/api/msg', hosted: true, token: 'qc1.eyJ2IjoxfQ.sig', server_has_creds: true }); st.save(); });

  // ---- the book
  await p.click('#tdseed'); await p.waitForTimeout(900);
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.sending = Object.assign({}, S.sending, { server: 'https://relay.example/api/msg', hosted: true, token: 'qc1.eyJ2IjoxfQ.sig', server_has_creds: true }); st.save(); });
  let S = await store();
  ok(S.jobs.length === 8, 'a busy week is eight jobs (' + S.jobs.length + ')');
  const statuses = S.jobs.map(j => j.status).sort().join(',');
  ok(/enquiry/.test(statuses) && /draft/.test(statuses) && /quoted/.test(statuses) && /accepted/.test(statuses) && /invoiced/.test(statuses) && /paid/.test(statuses), 'every stage of a job is in it: ' + statuses);
  ok(S.jobs.filter(j => j.status === 'quoted').length === 2 && S.jobs.every(j => j.status === 'draft' || j.status === 'enquiry' || j.quote), 'the quoted jobs carry a frozen quote, so the chasing has something to chase');
  const overdue = S.jobs.filter(j => (j.invoices || []).some(i => !i.paid_date && i.due < new Date().toISOString().slice(0, 10)));
  ok(overdue.length >= 1, 'at least one invoice is already overdue (' + overdue.length + ')');
  ok(S.details.trading_name && S.details.abn && S.details.account_number, 'and the set-up a painter types once is filled in');
  ok(S.details.phone === '0412 345 678' && S.details.email === 'dave@example.com', 'but his own mobile and email are kept, because that is where the test messages go');
  ok(S.testdrive && S.testdrive.on === true, 'loading a book turns test drive on rather than leaving it to him');

  // the chase list has something in it: the point of the seeded dates
  await p.goto(base + '#/chase', { waitUntil: 'load' }); await p.waitForTimeout(600);
  t = await text();
  ok(/Dennis Ward|Margaret Hill/.test(t), 'the Follow-ups tab has something to chase the moment the book lands');

  // ---- the safety net
  const one = await p.evaluate(() => {
    const S = window.__qcApp.store.load(), j = S.jobs.filter(x => x.status === 'quoted')[0];
    const out = QCMsg.divert({ action: 'send', channel: 'sms', to: j.client.phone, body: 'Hi, your quote is attached.' });
    return { out, was: j.client.phone };
  });
  ok(one.out.to === '0412 345 678', 'a text to a customer is re-addressed to him (' + one.out.to + ')');
  ok(/TEST DRIVE/.test(one.out.body) && one.out.body.indexOf(one.was) > -1, 'and says at the top where it would have gone (' + one.was + ')');
  const mail = await p.evaluate(() => QCMsg.divert({ action: 'send', channel: 'email', to: 'margaret@example.com', subject: 'Quote Q-1001', body: 'Hi' }));
  ok(mail.to === 'dave@example.com' && /^\[TEST\]/.test(mail.subject), 'an email goes to his inbox, marked so he can see it in a list');
  const later = await p.evaluate(() => QCMsg.divert({ action: 'schedule', channel: 'sms', to: '0400 333 444', body: 'a nudge', send_at: '2026-12-01T09:00:00.000Z' }));
  ok(later.to === '0412 345 678', 'a follow-up booked for next week is diverted too, not just what goes now');
  const cancel = await p.evaluate(() => QCMsg.divert({ action: 'cancel', id: 'SM1' }));
  ok(!cancel.to, 'a cancel is left alone: there is nothing to re-address');

  // the real send path, not just the helper
  await p.evaluate(() => { window.__qcCalls.length = 0; });
  await p.evaluate(() => QCMsg.call({ action: 'send', channel: 'sms', to: '0400 333 444', body: 'straight through the relay' }).catch(() => {}));
  const sent = await p.evaluate(() => (window.__qcCalls || []).map(c => c.body).filter(x => x.action === 'send')[0]);
  ok(sent && sent.to === '0412 345 678' && /TEST DRIVE/.test(sent.body), 'and the relay itself is handed his number, not the customer\'s: ' + (sent && sent.to));

  // turning the net off is possible, deliberate, and warned about
  await p.goto(base + '#/test', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.click('#tddivert'); await p.waitForTimeout(400);
  ok(/real numbers/.test(await text()), 'turning the net off says so on the card');
  const raw = await p.evaluate(() => QCMsg.divert({ action: 'send', channel: 'sms', to: '0400 333 444', body: 'x' }));
  ok(raw.to === '0400 333 444', 'and then a message really does go to the customer');
  await p.click('#tddivert'); await p.waitForTimeout(400);

  // ---- the bar, on every screen
  for (const h of ['#/', '#/chase', '#/settings']) {
    await p.goto(base + h, { waitUntil: 'load' }); await p.waitForTimeout(350);
    const bar = await p.$eval('#testbar', e => (e.hidden ? '' : e.innerText)).catch(() => '');
    ok(/Test drive/.test(bar) && /0412 345 678/.test(bar), 'the bar is there on ' + h + ' and names where the messages go');
  }

  // ---- the walkthrough
  await p.goto(base + '#/test', { waitUntil: 'load' }); await p.waitForTimeout(400);
  // the note box is not there until he says something is broken
  ok(await p.$eval('[data-note="measure"]', e => e.hidden), 'no note box sitting empty on all fourteen steps');
  await p.click('[data-td="broken"][data-for="measure"]'); await p.waitForTimeout(300);
  ok(!(await p.$eval('[data-note="measure"]', e => e.hidden)), 'Broken opens one');
  await p.click('[data-td="broken"][data-for="measure"]'); await p.waitForTimeout(300);
  ok(/Say what went wrong/.test(await text()), 'and saving it empty is refused');
  await p.fill('[data-note="measure"]', 'The wall came back 300mm short on a dark photo.');
  await p.click('[data-td="broken"][data-for="measure"]'); await p.waitForTimeout(400);
  await p.click('[data-td="works"][data-for="setup"]'); await p.waitForTimeout(400);
  S = await store();
  const found = (S.testdrive && S.testdrive.found) || [];
  ok(found.length === 2 && found.some(f => f.verdict === 'broken' && /300mm/.test(f.note)), 'what he wrote is kept on the phone, with the step it belongs to (' + found.length + ')');
  ok(found.every(f => f.screen && f.app), 'and which screen and which version it was found on');
  t = await text();
  ok(/2 of 14/.test(t) && /1 broken/.test(t), 'the screen counts what is done and what is broken');

  // changing his mind replaces the verdict rather than stacking another. A step he has ruled on folds away,
  // so open it again first, the way he would.
  ok(await p.$eval('[data-step="measure"]', e => !e.open), 'a step he has ruled on folds away, so the list gets shorter as he works down it');
  await p.click('[data-step="measure"] summary');
  await p.fill('[data-note="measure"]', 'Fine on the second go, it was my photo.');
  await p.click('[data-td="works"][data-for="measure"]'); await p.waitForTimeout(400);
  S = await store();
  ok(((S.testdrive || {}).found || []).length === 2, 'changing his mind about a step replaces the note, it does not stack up');

  // a loose note
  await p.fill('#tdloose', 'The word "ballpark" reads odd to me.');
  await p.click('#tdadd'); await p.waitForTimeout(400);
  S = await store();
  ok(((S.testdrive || {}).found || []).length === 3, 'anything else he thinks of is added on its own');

  // ---- getting them off the phone
  await p.evaluate(() => { window.__qcCalls.length = 0; });
  await p.click('#tdsend'); await p.waitForTimeout(700);
  const fb = await p.evaluate(() => (window.__qcCalls || []).filter(c => /feedback/.test(c.url))[0]);
  ok(fb && fb.body.items.length === 3, 'Send hands the whole list to the relay (' + (fb ? fb.body.items.length : 0) + ')');
  ok(fb && fb.body.items.every(i => i.id && i.step !== undefined), 'each one carries its own id, so a retry cannot double it up');
  ok(fb && typeof fb.body.reply_to === 'string' && fb.body.reply_to === 'dave@example.com', 'and his email, so a reply reaches him');
  ok(/Sent/.test(await p.$eval('#tdres', e => e.textContent)), 'and he is told it went');
  S = await store();
  ok(((S.testdrive || {}).found || []).every(f => f.sent), 'the notes are marked as sent rather than deleted, so he can still read them back');

  // a relay that is down does not lose anything
  await p.evaluate(() => { window.__feedback = { ok: false, error: 'nope' }; });
  await p.fill('#tdloose', 'Second thought.'); await p.click('#tdadd'); await p.waitForTimeout(300);
  await p.click('#tdsend'); await p.waitForTimeout(700);
  S = await store();
  ok(((S.testdrive || {}).found || []).length === 4, 'a send that fails leaves every note where it is');

  // ---- starting empty, like a new painter
  await p.click('#tdempty'); await p.waitForTimeout(800);
  S = await store();
  ok(S.jobs.length === 0 && S.details.trading_name, 'starting empty leaves no jobs but a painter who is set up');
  ok(S.details.phone === '0412 345 678', 'and still knows where to send him his own test messages');

  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
