const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const L = require('./lib.cjs'); const { ok, wire } = L;
(async () => {
  const { srv, base } = await L.serve(L.ROOT); const b = await L.launch();
  const ctx = await b.newContext({ ...L.devices['iPhone 13'] }); const p = await ctx.newPage(); await p.addInitScript(L.joinScript); await p.addInitScript(__OPEN_SEC); const log = []; wire(p, log);
  const hash = () => p.evaluate(() => location.hash); const text = () => p.$eval('#app', e => e.innerText);
  const errsSince = (n) => log.filter(x => x.type === 'pageerror').slice(n);
  // 1. every route with an empty store
  const empties = ['#/', '#/job/nonexistent', '#/job/nonexistent/room/x', '#/job/nonexistent/quote', '#/job/nonexistent/invoice', '#/chase', '#/settings', '#/help', '#/enquiry', '#/enquiry/nonexistent', '#/job//', '#/%', '#/job/<script>alert(1)</script>', '#/job/%3Cimg%20src=x%20onerror=alert(1)%3E', '#//', '#/settings/extra/parts', '#/JOB', '#/enquiry/', '#'];
  for (const h of empties) { const n = log.length; await p.goto(base + h, { waitUntil: 'load' }); await p.waitForTimeout(150); const t = await text(); const e = errsSince(n); ok(!e.length && t.length > 20, 'empty store route ' + h + ' -> ' + (await hash()) + ' renders (' + t.slice(0, 30).replace(/\n/g, ' ') + ')' + (e.length ? ' ERR ' + e[0].text : '')); }
  ok(!(await p.evaluate(() => document.querySelector('#app script, #app img[onerror]'))), 'no injected script/img from malformed hash');
  // #/enquiry/nonexistent renders new-enquiry form at that url
  await p.goto(base + '#/enquiry/nonexistent', { waitUntil: 'load' }); await p.waitForTimeout(200); ok((await hash()) === '#/' && /Jobs/.test(await text()), 'enquiry/nonexistent bounces home, like job/nonexistent, so a dead link lands somewhere: hash=' + await hash());
  // back trap: settings -> job/nonexistent (bounces) -> back
  await p.goto(base + '#/settings', { waitUntil: 'load' }); await p.evaluate(() => { location.hash = '#/job/nonexistent'; }); await p.waitForTimeout(200); ok((await hash()) === '#/', 'job/nonexistent bounces to #/ (got ' + await hash() + ')');
  await p.goBack(); await p.waitForTimeout(250); const afterBack = await hash(); ok(afterBack === '#/settings', 'browser back after a bounced route returns to #/settings, got ' + afterBack + ' (history.length=' + await p.evaluate(() => history.length) + ')');
  // double clicks
  await p.goto(base + '#/', { waitUntil: 'load' });
  const count = () => p.evaluate(() => window.__qcApp.store.load().jobs.length);
  await p.dblclick('#newjob'); await p.waitForTimeout(300); ok((await count()) === 1, 'dblclick New job creates 1 job, got ' + await count());
  await p.evaluate(() => localStorage.clear()); await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' });
  await p.evaluate(() => { const b = document.getElementById('newjob'); b.click(); b.click(); }); await p.waitForTimeout(300); ok((await count()) === 1, 'two synchronous clicks on New job create 1 job, got ' + await count());
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'load' });
  await p.dblclick('#quick'); await p.waitForTimeout(300); ok((await count()) === 1, 'dblclick Quick quote creates 1 job, got ' + await count());
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'load' });
  await p.evaluate(() => { const b = document.getElementById('quick'); b.click(); b.click(); }); await p.waitForTimeout(300); ok((await count()) === 1, 'two synchronous clicks on Quick quote create 1 job, got ' + await count());
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'load' });
  await p.dblclick('a[href="#/enquiry"]'); await p.waitForTimeout(300); ok((await count()) === 0 && /Phone enquiry/.test(await text()), 'dblclick Phone enquiry: no job created until saved (' + await count() + ')');
  await p.click('[data-room="lounge"]'); await p.evaluate(() => { const b = document.getElementById('savebp'); b.click(); b.click(); }); await p.waitForTimeout(300); ok((await count()) === 1, 'double Save-as-job from enquiry creates 1 job, got ' + await count());
  // rapid room adds
  await p.evaluate(() => localStorage.clear()); await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.click('#newjob'); await p.waitForSelector('[data-add="interior"]');
  await p.evaluate(() => { const b = document.querySelector('[data-add="interior"]'); b.click(); b.click(); }); await p.waitForTimeout(300); const nrooms = await p.evaluate(() => window.__qcApp.store.load().jobs[0].rooms.length); ok(nrooms === 1, 'two synchronous clicks on + Room add 1 room, got ' + nrooms);
  // 10-step flow, reload on every route, back/forward
  await p.evaluate(() => localStorage.clear()); await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' });
  await p.click('#newjob'); await p.waitForSelector('[data-add="interior"]'); const jobHash = await hash(); const jid = jobHash.split('/')[2];
  await p.click('[data-add="interior"]'); await p.waitForSelector('[data-bind="L"]'); const roomHash = await hash();
  await p.fill('[data-bind="L"]', '4'); await p.fill('[data-bind="W"]', '3');
  const steps = [roomHash, jobHash, jobHash + '/quote', jobHash + '/invoice', '#/chase', '#/settings', '#/help', '#/enquiry', '#/', jobHash + '/quote'];
  const seen = [];
  for (const h of steps) { const n = log.length; await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(200); const before = await hash(); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(150); const after = await hash(); seen.push(after); const t = await text(); const e = errsSince(n); ok(!e.length && before === after && t.length > 20, 'step ' + h + ' -> ' + before + ' survives reload (' + after + ')' + (e.length ? ' ERR ' + e[0].text : '')); }
  ok(seen[3] === jobHash + '/quote', 'invoice with no quote bounces to quote page: ' + seen[3]);
  // quote page with a room but nothing else, then back through history
  const hist = []; for (let i = 0; i < 12; i++) { const n = log.length; await p.goBack(); await p.waitForTimeout(150); hist.push(await hash()); const e = errsSince(n); if (e.length) ok(false, 'page error during back: ' + e[0].text); }
  console.log('  back trail: ' + hist.join(' <- '));
  const fwd = []; for (let i = 0; i < 6; i++) { await p.goForward(); await p.waitForTimeout(120); fwd.push(await hash()); } console.log('  forward trail: ' + fwd.join(' -> '));
  ok(new Set(hist).size >= 6, 'back walks through distinct routes (' + new Set(hist).size + ' distinct in 12 presses)');
  ok(await p.evaluate(() => document.querySelector('#app').innerText.length > 20), 'app rendered after back/forward');
  // room with nonexistent id bounces to job; quote with no rooms
  await p.goto(base + jobHash + '/room/nonexistent', { waitUntil: 'load' }); await p.waitForTimeout(200); ok((await hash()) === jobHash, 'room/nonexistent bounces to job: ' + await hash());
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.jobs[0].rooms = []; window.__qcApp.store.save(); }); { const n = log.length; await p.goto(base + jobHash + '/quote', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); const t = await text(); ok(!errsSince(n).length && /Total/.test(t), 'quote with no rooms renders: ' + t.replace(/\s+/g, ' ').slice(0, 120)); }
  // nav on-state
  const navOn = async (h) => { await p.goto(base + h, { waitUntil: 'load' }); await p.waitForTimeout(100); return p.$$eval('nav a', as => as.filter(a => a.classList.contains('on')).map(a => a.dataset.nav).join(',') || 'none'); };
  for (const [h, exp] of [['#/', 'home'], ['#/chase', 'chase'], ['#/settings', 'settings'], [jobHash, 'home'], [jobHash + '/quote', 'home'], ['#/enquiry', 'home'], ['#/help', 'none']]) { const got = await navOn(h); ok(got === exp, 'nav on-state at ' + h + ' expected ' + exp + ' got ' + got); }
  // two tabs: A writes, B opened after shows it
  await p.evaluate(() => localStorage.clear()); await p.goto(base + '#/', { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.click('#newjob'); await p.waitForSelector('[data-bind="client.name"]'); await p.fill('[data-bind="client.name"]', 'Tab One Client');
  const p2 = await ctx.newPage(); await p2.addInitScript(L.joinScript); await p2.addInitScript(__OPEN_SEC); wire(p2, log); await p2.goto(base + '#/', { waitUntil: 'load' }); ok(/Tab One Client/.test(await p2.$eval('#app', e => e.innerText)), 'second tab (opened after) sees job written by first tab');
  // adversarial: both tabs open, A writes a new job, B (stale) saves settings -> A's job?
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.click('#newjob'); await p.waitForSelector('[data-bind="client.name"]'); await p.fill('[data-bind="client.name"]', 'Second Job In A');
  await p2.goto(base + '#/settings', { waitUntil: 'load' }); // p2 reloads -> fresh; simulate stale: p2 loaded before A wrote? do it properly:
  await p2.waitForSelector('[data-bind="details.owner_name"]');
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.click('#newjob'); await p.waitForSelector('[data-bind="client.name"]'); await p.fill('[data-bind="client.name"]', 'Third Job In A');
  await p2.fill('[data-bind="details.owner_name"]', 'Stale Tab Writer'); await p2.waitForTimeout(200);
  await p.reload({ waitUntil: 'load' }); await p.goto(base + '#/', { waitUntil: 'load' }); const homeA = await p.$eval('#app', e => e.innerText);
  ok(/Third Job In A/.test(homeA), 'job created in tab A survives a settings edit in already-open tab B (last-writer-wins check)');
  ok(/Second Job In A/.test(homeA) && /Tab One Client/.test(homeA), 'earlier jobs still present after cross-tab writes');
  const owner = await p.evaluate(() => window.__qcApp.store.load().details.owner_name); console.log('  owner_name after reload in A: ' + owner);
  await p2.close();
  // console noise summary
  const distinct = [...new Set(log.map(x => x.type + ': ' + x.text))]; console.log('CONSOLE DISTINCT (' + distinct.length + '):\n  ' + distinct.join('\n  '));
  await b.close(); srv.close(); console.log(L.fails ? 'FAILURES: ' + L.fails : 'ALL PASSED');
})().catch(e => { console.error('CRASH', e); process.exit(1); });
