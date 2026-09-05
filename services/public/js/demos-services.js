/* Live builds for the ten service pages. Each demo is a working slice of the
   thing the page sells, running entirely in the visitor's browser. */
(function (D) {
  var h = D.h, money = D.money, fmt = D.fmt;

  /* ------------------------------------------------------------------ */
  /* WordPress: the site health audit                                    */
  /* ------------------------------------------------------------------ */
  D.register('wordpress-audit', function () {
    var f = D.frame({ title: 'WordPress health check', status: 'set your site up',
      note: 'The scoring model is the same one I run on a real audit, without the measurements: on a real job the numbers come from your live site, not from your description of it.' });
    var s = { hosting: 'shared', theme: 'builder', plugins: 34, images: 'raw', cache: 'none' };
    var out = h('div', { class: 'demo__grid' });

    function calc(st) {
      var weight = 1.2, load = 1.4, findings = [];
      if (st.hosting === 'shared') { load += 1.6; findings.push(['Hosting chosen on price', 'Move to managed WordPress hosting', 'high', 1.6]); }
      if (st.hosting === 'vps') { load += 0.4; findings.push(['Unmanaged server', 'Fine if patched; managed hosting removes the chore', 'low', 0.3]); }
      if (st.theme === 'builder') { weight += 1.8; load += 1.1; findings.push(['Page builder loading everything everywhere', 'Rebuild on a lean block theme', 'high', 1.1]); }
      if (st.theme === 'heavy') { weight += 1.1; load += 0.6; findings.push(['Heavy premium theme', 'Strip unused modules or replace', 'med', 0.6]); }
      if (st.plugins > 25) { load += (st.plugins - 25) * 0.05; findings.push([st.plugins + ' plugins doing overlapping jobs', 'Consolidate to one per job (target under 10)', 'high', (st.plugins - 25) * 0.05]); }
      else if (st.plugins > 12) { load += 0.3; findings.push([st.plugins + ' plugins', 'Audit and prune to under 10', 'med', 0.3]); }
      if (st.images === 'raw') { weight += 4.5; load += 2.2; findings.push(['Images uploaded straight off a phone', 'Resize, compress, modern formats, lazy-load', 'high', 2.2]); }
      if (st.cache === 'none') { load += 0.9; findings.push(['No caching', 'Host-level caching (a plugin is the fallback)', 'med', 0.9]); }
      var score = Math.max(8, Math.round(100 - (load - 1.4) * 13 - (weight - 1.2) * 4));
      return { weight: weight, load: load, score: score, findings: findings.sort(function (a, b) { return b[3] - a[3]; }) };
    }

    function render(fixed) {
      var st = fixed ? { hosting: 'managed', theme: 'block', plugins: 8, images: 'opt', cache: 'host' } : s;
      var r = calc(st);
      out.innerHTML = '';
      var kind = r.score > 80 ? 'ok' : r.score > 50 ? 'warn' : 'bad';
      f.status(fixed ? 'after the fix plan' : 'your setup, as described', kind);
      out.appendChild(h('div', { class: 'demo__panel' },
        h('h4', {}, fixed ? 'After' : 'Now'),
        h('div', { class: 'demo__big', text: r.score + '/100' }),
        D.bar(r.score, 100, r.score > 80 ? '' : r.score > 50 ? 'demo__meter--amber' : 'demo__meter--bad'),
        h('div', { class: 'demo__kv', style: 'margin-top:12px' },
          h('span', {}, 'Load on a phone'), h('b', {}, r.load.toFixed(1) + ' s'),
          h('span', {}, 'Page weight'), h('b', {}, r.weight.toFixed(1) + ' MB'),
          h('span', {}, 'Google mood'), h('b', {}, r.load < 2.5 ? 'happy' : r.load < 4 ? 'tolerant' : 'punishing'))));
      out.appendChild(h('div', { class: 'demo__panel' },
        h('h4', {}, fixed ? 'What changed' : 'Findings, worst first'),
        r.findings.length ? h('ol', { style: 'margin:0; padding-left:1.2em; font-size:0.92rem; display:grid; gap:8px' },
          r.findings.map(function (x) { return h('li', {}, h('b', {}, x[0]), ' ', h('span', { class: 'demo__pill demo__pill--' + (x[2] === 'high' ? 'bad' : x[2] === 'med' ? 'warn' : 'dim') }, x[2]), h('br'), h('span', { class: 'dim' }, x[1])); }))
          : h('p', { style: 'margin:0' }, 'Managed hosting, lean block theme, eight plugins, optimised images, host caching. This is what "fixed" looks like, and it costs less to run than the mess did.')));
    }

    function ctl(label, node) { return h('label', { class: 'demo__label' }, label, node); }
    var plug = h('input', { class: 'demo__input', type: 'range', min: 0, max: 60, value: s.plugins, style: 'min-height:auto; padding:0; border:0',
      oninput: function () { s.plugins = +plug.value; plugLbl.textContent = 'Plugins installed: ' + s.plugins; render(false); } });
    var plugLbl = h('span', { text: 'Plugins installed: ' + s.plugins });

    f.body.appendChild(h('div', { class: 'demo__row' },
      ctl('Hosting', D.select([['shared', '$5/month shared'], ['vps', 'A VPS someone set up'], ['managed', 'Managed WordPress']], s.hosting, function (v) { s.hosting = v; render(false); })),
      ctl('Theme', D.select([['builder', 'Page builder theme'], ['heavy', 'Premium theme, lots of modules'], ['block', 'Lean block theme']], s.theme, function (v) { s.theme = v; render(false); })),
      ctl('Images', D.select([['raw', 'Straight off the phone'], ['opt', 'Resized and compressed']], s.images, function (v) { s.images = v; render(false); })),
      ctl('Caching', D.select([['none', 'None'], ['plugin', 'A caching plugin'], ['host', 'Host level']], s.cache, function (v) { s.cache = v; render(false); })),
      ctl(plugLbl, plug)));
    f.body.appendChild(out);
    f.body.appendChild(h('div', { class: 'demo__row' },
      D.btn('Show me after the fix plan', function () { render(true); D.toast(f.root, 'Same content, same domain, no rebuild-from-scratch required.', 'ok'); }),
      D.btn('Back to my setup', function () { render(false); }, 'demo__btn--ghost')));
    render(false);
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* E-commerce: the payout reconciler                                   */
  /* ------------------------------------------------------------------ */
  D.register('ecommerce-reconcile', function () {
    var f = D.frame({ title: 'Payout reconciler', status: 'three days of orders loaded',
      note: 'Real stores have thousands of these. The structure is identical: clearing accounts per gateway, fees from the gateway report, refunds against the original sale, tax carried verbatim.' });
    var r = D.rng(7);
    var gateways = { shopify: { name: 'Shopify Payments', fee: 0.0175, fixed: 0.30 }, paypal: { name: 'PayPal', fee: 0.026, fixed: 0.30 }, afterpay: { name: 'Afterpay', fee: 0.06, fixed: 0.30 } };
    var orders = [];
    for (var i = 0; i < 14; i++) {
      var sub = Math.round((30 + r() * 260) * 100) / 100, gw = ['shopify', 'shopify', 'shopify', 'paypal', 'afterpay'][Math.floor(r() * 5)];
      var refund = r() < 0.18 ? Math.round(sub * (r() < 0.5 ? 1 : 0.4) * 100) / 100 : 0;
      orders.push({ id: 1041 + i, day: ['Fri', 'Sat', 'Sun'][Math.floor(i / 5)], gw: gw, gross: Math.round(sub * 1.1 * 100) / 100, gst: Math.round(sub * 0.1 * 100) / 100, refund: refund, gift: i === 6 });
    }
    var wrongWay = false;
    var out = h('div');

    function reconcile() {
      out.innerHTML = '';
      var byGw = {};
      orders.forEach(function (o) {
        var g = byGw[o.gw] = byGw[o.gw] || { gross: 0, fees: 0, refunds: 0, n: 0 };
        g.n++; g.gross += o.gross; g.refunds += o.refund;
        g.fees += Math.round((o.gross * gateways[o.gw].fee + gateways[o.gw].fixed) * 100) / 100;
      });
      var rows = [], totalGap = 0;
      Object.keys(byGw).forEach(function (k) {
        var g = byGw[k], payout = Math.round((g.gross - g.fees - g.refunds) * 100) / 100;
        var booked = wrongWay ? g.gross : g.gross - g.fees - g.refunds;
        var gap = Math.round((booked - payout) * 100) / 100; totalGap += gap;
        rows.push(h('tr', { class: Math.abs(gap) < 0.005 ? 'is-ok' : 'is-bad' },
          h('td', {}, gateways[k].name, h('br'), h('span', { class: 'demo__pill demo__pill--dim' }, g.n + ' orders')),
          h('td', { class: 'num' }, money(g.gross, true)),
          h('td', { class: 'num' }, '-' + money(g.fees, true)),
          h('td', { class: 'num' }, g.refunds ? '-' + money(g.refunds, true) : '0.00'),
          h('td', { class: 'num' }, h('b', {}, money(payout, true))),
          h('td', { class: 'num' }, money(booked, true)),
          h('td', { class: 'num' }, Math.abs(gap) < 0.005 ? h('span', { class: 'demo__pill demo__pill--ok' }, 'matches') : h('span', { class: 'demo__pill demo__pill--bad' }, (gap > 0 ? '+' : '') + money(gap, true)))));
      });
      out.appendChild(D.table(['Gateway', 'Gross sales', 'Fees', 'Refunds', 'Bank payout', 'Booked in accounts', 'Gap'], rows));
      var gift = orders.filter(function (o) { return o.gift; })[0];
      out.appendChild(h('p', { style: 'margin:12px 0 0; font-size:0.9rem' },
        wrongWay
          ? [h('b', {}, 'Books overstated by ' + money(totalGap, true) + ' in three days.'), ' Gross sales posted straight to the bank account: the fees and refunds never entered the books, so the bank feed can never match. Scale that to a year and your accountant is un-mashing it at BAS time.']
          : [h('b', {}, 'Every payout matches to the cent.'), ' Sales post to a clearing account per gateway, the payout clears it, fees become an expense from the gateway report, refunds credit the original sale. Order #' + gift.id + ' was a gift card: booked as a liability, not revenue, so it is not counted twice when redeemed.']));
      f.status(wrongWay ? 'the way most stores are set up' : 'reconciled', wrongWay ? 'bad' : 'ok');
    }
    f.body.appendChild(D.table(['Order', 'Day', 'Gateway', 'Total (inc GST)', 'GST', 'Refund'],
      orders.slice(0, 6).map(function (o) { return h('tr', {}, h('td', {}, '#' + o.id + (o.gift ? ' (gift card)' : '')), h('td', {}, o.day), h('td', {}, gateways[o.gw].name), h('td', { class: 'num' }, money(o.gross, true)), h('td', { class: 'num' }, money(o.gst, true)), h('td', { class: 'num' }, o.refund ? money(o.refund, true) : '')); })
        .concat([h('tr', {}, h('td', { colspan: 6, style: 'color:var(--fg-mute)' }, '... and ' + (orders.length - 6) + ' more across Friday to Sunday, paid out Monday'))])));
    var tog = h('label', { class: 'demo__row', style: 'gap:8px; font-weight:700; cursor:pointer' },
      h('input', { type: 'checkbox', onchange: function (e) { wrongWay = e.target.checked; reconcile(); } }), 'Show it done the usual wrong way (gross sales straight to the bank)');
    f.body.appendChild(h('div', { class: 'demo__row' }, D.btn('Reconcile Monday\'s payouts', reconcile), tog));
    f.body.appendChild(out);
    reconcile();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* AI development: the enquiry triage assistant                        */
  /* ------------------------------------------------------------------ */
  D.register('ai-triage', function () {
    var f = D.frame({ title: 'Enquiry triage assistant', status: 'paste anything a customer might send',
      note: 'This slice runs on rules in your browser so it works without a key. The production version uses a language model under the same guardrails: extract, never invent; draft, never send; flag what a human must decide.' });
    var samples = [
      'Hi, our website has been down since about 9 this morning and we have a big promo running. Can someone call me on 0412 555 019 asap? Jenny, Bloom Florist',
      'Looking for a quote to build a booking system for our clinic, 3 practitioners, needs to send SMS reminders and take deposits. Budget around $8k. Timeline before Nov 14.',
      'I paid you $450 two weeks ago for the fix and the contact form still doesn\'t work. Very disappointed. Invoice 2291.',
      'Do you do WordPress? My developer has disappeared and I cannot log in to my own site anymore.'
    ];
    var ta = h('textarea', { class: 'demo__textarea', rows: 5 }, samples[0]);
    var out = h('div', { class: 'demo__grid' });

    function run() {
      var t = ta.value, low = t.toLowerCase();
      var intents = [
        ['urgent support', /(down|broken|not working|doesn'?t work|asap|urgent|hacked|locked out|cannot log ?in)/],
        ['quote request', /(quote|price|cost|budget|how much|looking for|build)/],
        ['complaint', /(disappointed|refund|still|paid|unacceptable|frustrat)/],
        ['booking', /(book|appointment|call me|meeting|chat)/]
      ];
      var scores = intents.map(function (x) { return [x[0], (low.match(new RegExp(x[1].source, 'g')) || []).length]; }).sort(function (a, b) { return b[1] - a[1]; });
      var intent = scores[0][1] ? scores[0][0] : 'general enquiry';
      var phone = (t.match(/0\d[\d ]{8,10}/) || [])[0];
      var money_ = (t.match(/\$\s?[\d,]+(?:\.\d+)?k?/i) || [])[0];
      var date = (t.match(/\b(?:before|by|on)\s+([A-Z][a-z]{2,8}\s?\d{1,2})/) || [])[1];
      var inv = (t.match(/invoice\s*#?\s*(\d+)/i) || [])[1];
      var urgency = /asap|urgent|down|promo|hacked|locked/.test(low) ? 'high' : /before|by |deadline/.test(low) ? 'medium' : 'normal';
      var name = (t.match(/(?:^|\.\s|\n)\s*([A-Z][a-z]+),\s*[A-Z]/) || [])[1];
      var reply = {
        'urgent support': 'Thanks ' + (name || 'for the message') + '. I am looking at it now. Can you confirm the site address and whether anything was changed this morning? If it is hosting, I will have a status for you inside the hour.',
        'quote request': 'Thanks for the detail, that is enough to scope from. Two questions before I put a number in writing: which practice management system do you use today, and do the deposits need to hit your accounting system automatically?' + (date ? ' Your ' + date + ' date is workable if we start within a fortnight.' : ''),
        'complaint': 'You are right to be annoyed, and I want to fix this today rather than explain it. Can you send a screenshot of what the form does when you submit it? If it is not resolved by close of business I will refund' + (inv ? ' invoice ' + inv : ' the fix') + ' regardless.',
        'booking': 'Happy to talk. My slot is Wednesdays 11:30 Adelaide time; the booking link is below, or reply with a time that suits and I will make it work.',
        'general enquiry': 'Thanks for getting in touch. Yes to WordPress, and yes to getting you back into your own site: that is a rescue job I do often. First step is confirming who currently holds the domain and hosting logins; can you tell me who set the site up?'
      }[intent];
      var checks = [];
      if (!phone) checks.push('No phone number found: do not invent one, reply by email.');
      if (money_) checks.push('Budget mentioned (' + money_ + '): a human confirms scope before quoting.');
      if (intent === 'complaint') checks.push('Complaint: human reads before any reply is sent. Refund wording needs your approval.');
      if (urgency === 'high') checks.push('Urgency high: notify Aaron by SMS, not just the inbox.');
      if (!checks.length) checks.push('Nothing to escalate; a human still approves the send.');
      out.innerHTML = '';
      out.appendChild(h('div', { class: 'demo__panel' }, h('h4', {}, 'What it understood'),
        h('div', { class: 'demo__kv' },
          h('span', {}, 'Intent'), h('b', {}, intent, ' ', h('span', { class: 'demo__pill demo__pill--' + (urgency === 'high' ? 'bad' : urgency === 'medium' ? 'warn' : 'dim') }, urgency + ' urgency')),
          h('span', {}, 'Name'), h('b', {}, name || 'not stated'),
          h('span', {}, 'Phone'), h('b', {}, phone || 'none given'),
          h('span', {}, 'Money'), h('b', {}, money_ || 'none'),
          h('span', {}, 'Date'), h('b', {}, date || 'none'),
          h('span', {}, 'Invoice'), h('b', {}, inv || 'none'))));
      out.appendChild(h('div', { class: 'demo__panel' }, h('h4', {}, 'Draft reply (not sent)'), h('p', { style: 'margin:0 0 12px; font-size:0.92rem' }, reply),
        h('h4', {}, 'Human check'), h('ul', { style: 'margin:0; padding-left:1.1em; font-size:0.88rem; display:grid; gap:4px' }, checks.map(function (c) { return h('li', {}, c); }))));
      f.status('triaged as ' + intent, urgency === 'high' ? 'warn' : 'ok');
    }
    f.body.appendChild(h('div', { class: 'demo__chips' }, samples.map(function (s, i) {
      return h('button', { class: 'demo__chip', type: 'button', onclick: function () { ta.value = s; run(); } }, ['Site down', 'Clinic quote', 'Angry customer', 'Locked out'][i]);
    })));
    f.body.appendChild(ta);
    f.body.appendChild(h('div', { class: 'demo__row' }, D.btn('Run the assistant', run), h('span', { class: 'dim', style: 'font-size:0.88rem' }, 'or edit the message and run it again')));
    f.body.appendChild(out);
    run();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Mobile apps: a working app in a phone, plus the honest verdict      */
  /* ------------------------------------------------------------------ */
  D.register('mobile-app', function () {
    var f = D.frame({ title: 'JobBook: a field app you can use right now', status: 'tap around',
      note: 'One codebase, iOS and Android, your data. The phone on the left is a real interactive slice; the verdict on the right is the honest conversation before any app gets built.' });
    var jobs = [
      { id: 1, who: 'Hargreaves', what: 'Switchboard upgrade', when: '8:00', where: 'Prospect', done: false, notes: [] },
      { id: 2, who: 'Nguyen', what: 'Safety switch tripping', when: '10:30', where: 'Norwood', done: false, notes: ['Tenant home after 10'] },
      { id: 3, who: 'Bella Vista Cafe', what: 'Extra circuits, kitchen', when: '13:00', where: 'Glenelg', done: false, notes: [] },
      { id: 4, who: 'Okafor', what: 'Downlights x 12', when: '15:30', where: 'Unley', done: true, notes: ['Paid on site'] }
    ];
    var view = { tab: 'today', open: null };
    var screen = h('div', { class: 'demo__screen' });

    function render() {
      screen.innerHTML = '';
      var pending = jobs.filter(function (j) { return !j.done; }).length;
      screen.appendChild(h('div', { class: 'top' }, h('span', {}, view.open ? 'Job' : view.tab === 'today' ? 'Today' : view.tab === 'done' ? 'Done' : 'Me'), h('span', { class: 'demo__pill' }, pending + ' to go')));
      var list = h('div', { class: 'list' });
      if (view.open) {
        var j = jobs.filter(function (x) { return x.id === view.open; })[0];
        list.appendChild(h('div', { style: 'padding:14px' },
          h('div', { style: 'font-weight:800; font-size:1.1rem' }, j.who), h('div', {}, j.what), h('div', { class: 'dim', style: 'font-size:0.85rem' }, j.when + ' · ' + j.where),
          h('div', { style: 'margin:12px 0 6px; font-weight:700; font-size:0.85rem' }, 'Notes'),
          j.notes.length ? h('ul', { style: 'margin:0; padding-left:1.1em; font-size:0.88rem' }, j.notes.map(function (n) { return h('li', {}, n); })) : h('p', { class: 'dim', style: 'margin:0; font-size:0.88rem' }, 'none yet'),
          h('div', { class: 'demo__row', style: 'margin-top:14px' },
            D.btn(j.done ? 'Reopen' : 'Mark done', function () { j.done = !j.done; D.toast(f.root, j.done ? 'Done. Invoice draft created.' : 'Reopened.', j.done ? 'ok' : ''); view.open = null; render(); }, 'demo__btn--small'),
            D.btn('Add note', function () { j.notes.push(['Parts on order', 'Customer wants a call first', 'Access via side gate'][j.notes.length % 3]); render(); }, 'demo__btn--small demo__btn--ghost'),
            D.btn('Back', function () { view.open = null; render(); }, 'demo__btn--small demo__btn--ghost'))));
      } else if (view.tab === 'me') {
        list.appendChild(h('div', { style: 'padding:14px; font-size:0.9rem' }, h('p', {}, h('b', {}, 'Sam Tran'), h('br'), 'Licensed electrician'), h('p', {}, 'Store accounts: ', h('b', {}, 'yours'), h('br'), 'Code: ', h('b', {}, 'yours'), h('br'), 'Backend: ', h('b', {}, 'included')), h('p', { class: 'dim' }, 'The profile screen nobody demos, included because you own it.')));
      } else {
        jobs.filter(function (j) { return view.tab === 'done' ? j.done : !j.done; }).forEach(function (j) {
          list.appendChild(h('div', { class: 'item', onclick: function () { view.open = j.id; render(); } },
            h('span', {}, h('b', {}, j.who), h('br'), h('span', { style: 'font-size:0.85rem' }, j.what)),
            h('span', { class: 'dim', style: 'font-size:0.85rem; text-align:right' }, j.when, h('br'), j.where)));
        });
        if (!list.children.length) list.appendChild(h('p', { class: 'dim', style: 'padding:14px' }, 'Nothing here. Good day or slow day; either way it is honest.'));
      }
      screen.appendChild(list);
      screen.appendChild(h('div', { class: 'tabs' }, ['today', 'done', 'me'].map(function (t) {
        return h('button', { type: 'button', 'aria-pressed': view.tab === t && !view.open, onclick: function () { view.tab = t; view.open = null; render(); } }, t === 'today' ? 'Today' : t === 'done' ? 'Done' : 'Me');
      })));
    }
    render();

    var q = { edit: 'weekly', offline: 'no', native: 'no' };
    var verdict = h('div', { class: 'demo__panel' });
    function judge() {
      var v, why;
      if (q.native === 'yes') { v = 'A real app'; why = 'You need the camera, GPS in the background or push notifications that actually arrive. That is app territory, built once for both stores.'; }
      else if (q.offline === 'yes') { v = 'A real app, probably'; why = 'Working without signal is the honest reason to build one. A well-made web app can cache, but a field crew in a basement wants the real thing.'; }
      else if (q.edit === 'daily') { v = 'A web app you can install'; why = 'Daily use from a phone, always online: a progressive web app gives you the home-screen icon without the app-store tax. Cheaper, faster to change.'; }
      else { v = 'Probably not an app'; why = 'Occasional use, online, no phone hardware: a good mobile website does this. I would rather tell you that now than invoice you for an app nobody opens.'; }
      verdict.innerHTML = '';
      verdict.appendChild(h('h4', {}, 'Verdict: ' + v)); verdict.appendChild(h('p', { style: 'margin:0; font-size:0.92rem' }, why));
    }
    var right = h('div', { style: 'display:grid; gap:12px; align-content:start' },
      h('h4', { style: 'margin:0; font-family:var(--display); font-size:1.05rem' }, 'Do you even need an app?'),
      h('label', { class: 'demo__label' }, 'How often would staff or customers use it?', D.select([['rarely', 'Now and then'], ['weekly', 'Weekly'], ['daily', 'Every day, from a phone']], q.edit, function (v) { q.edit = v; judge(); })),
      h('label', { class: 'demo__label' }, 'Must it work with no signal?', D.select([['no', 'No, always online'], ['yes', 'Yes, sheds and basements']], q.offline, function (v) { q.offline = v; judge(); })),
      h('label', { class: 'demo__label' }, 'Camera, background GPS or push notifications?', D.select([['no', 'Not really'], ['yes', 'Yes, essential']], q.native, function (v) { q.native = v; judge(); })),
      verdict);
    judge();
    f.body.appendChild(h('div', { class: 'demo__grid', style: 'grid-template-columns:minmax(260px,320px) 1fr; align-items:start' }, h('div', { class: 'demo__phone' }, screen), right));
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Website rebuild: the redirect map that saves the rankings           */
  /* ------------------------------------------------------------------ */
  D.register('rebuild-redirects', function () {
    var f = D.frame({ title: 'Redirect map builder', status: 'sample site loaded',
      note: 'The real job adds the data: which old URLs actually earn traffic and links, so effort goes where the rankings are. This is the mechanism.' });
    var oldTa = h('textarea', { class: 'demo__textarea' }, ['/services/emergency-electrician-adelaide.html', '/services/switchboard-upgrades.html', '/about-us.html', '/blog/2019/03/safety-switch-tripping', '/gallery.php?id=4', '/contact.html', '/services/solar-installation.html'].join('\n'));
    var newTa = h('textarea', { class: 'demo__textarea' }, ['/emergency-electrician/', '/switchboards/', '/about/', '/guides/safety-switch-keeps-tripping/', '/contact/', '/ev-chargers/'].join('\n'));
    var out = h('div');
    function tokens(u) { return u.toLowerCase().replace(/\.(html|php|aspx)$/, '').replace(/\?.*$/, '').split(/[^a-z0-9]+/).filter(function (t) { return t && !/^(services|blog|20\d\d|\d+|id|us|the|and|a)$/.test(t); }); }
    var syn = { switchboard: 'switchboards', upgrades: 'switchboards', installation: 'install', tripping: 'tripping', keeps: 'tripping' };
    function build() {
      var olds = oldTa.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      var news = newTa.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      var rows = [], rules = [], kept = 0;
      olds.forEach(function (o) {
        var ot = tokens(o).map(function (t) { return syn[t] || t; }), best = null, bs = 0;
        news.forEach(function (n) {
          var nt = tokens(n).map(function (t) { return syn[t] || t; }), hit = 0;
          ot.forEach(function (t) { if (nt.indexOf(t) >= 0 || nt.some(function (x) { return x.indexOf(t) === 0 || t.indexOf(x) === 0; })) hit++; });
          var sc = ot.length ? hit / Math.max(ot.length, nt.length) : 0;
          if (sc > bs) { bs = sc; best = n; }
        });
        var conf = bs >= 0.6 ? 'high' : bs >= 0.3 ? 'check' : 'decide';
        if (conf !== 'decide') { kept++; rules.push(o.replace(/\?.*$/, '') + '  ->  ' + best + '  (301)'); }
        rows.push(h('tr', { class: conf === 'high' ? 'is-ok' : conf === 'check' ? 'is-warn' : 'is-bad' },
          h('td', {}, h('code', {}, o)), h('td', {}, best && conf !== 'decide' ? h('code', {}, best) : h('i', { class: 'dim' }, 'no obvious home')),
          h('td', {}, h('span', { class: 'demo__pill demo__pill--' + (conf === 'high' ? 'ok' : conf === 'check' ? 'warn' : 'bad') }, conf === 'high' ? 'match' : conf === 'check' ? 'check me' : 'needs a decision'))));
      });
      out.innerHTML = '';
      out.appendChild(D.table(['Old URL', 'Redirects to', 'Confidence'], rows));
      out.appendChild(h('p', { style: 'margin:12px 0 6px; font-size:0.92rem' }, h('b', {}, kept + ' of ' + olds.length + ' old pages keep their Google equity.'), ' The red rows are where rankings die on a careless rebuild: a real page with no new home. The fix is a decision (a new page, or a redirect to the closest parent), never a 404.'));
      out.appendChild(h('pre', { class: 'demo__log' }, rules.map(function (r) { return h('div', {}, r); })));
      f.status(kept === olds.length ? 'every page has a home' : (olds.length - kept) + ' decision' + (olds.length - kept === 1 ? '' : 's') + ' needed', kept === olds.length ? 'ok' : 'warn');
    }
    f.body.appendChild(h('div', { class: 'demo__grid' }, h('label', { class: 'demo__label' }, 'Old site URLs (one per line)', oldTa), h('label', { class: 'demo__label' }, 'New site URLs', newTa)));
    f.body.appendChild(h('div', { class: 'demo__row' }, D.btn('Build the redirect map', build), h('span', { class: 'dim', style: 'font-size:0.88rem' }, 'edit either list and rebuild')));
    f.body.appendChild(out);
    build();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Custom software: the API playground (the reference build's rules)   */
  /* ------------------------------------------------------------------ */
  D.register('api-playground', function () {
    var f = D.frame({ title: 'Linehaul API, in your browser', status: 'GET a list to start',
      note: 'These are the actual rules from the public reference build: statuses can only move forward along allowed paths, and an illegal move is refused with a reason instead of silently corrupting the record.' });
    var flow = { Booked: ['PickedUp', 'Cancelled'], PickedUp: ['InTransit', 'Held'], InTransit: ['Delivered', 'Held'], Held: ['InTransit', 'Cancelled'], Delivered: [], Cancelled: [] };
    var data = [
      { id: 'LH-24011', lane: 'ADL-MEL', status: 'InTransit', kg: 412, due: '2026-09-06T14:00' },
      { id: 'LH-24012', lane: 'ADL-PER', status: 'Booked', kg: 1180, due: '2026-09-08T09:00' },
      { id: 'LH-24013', lane: 'MEL-ADL', status: 'Delivered', kg: 96, due: '2026-09-05T11:00' },
      { id: 'LH-24014', lane: 'ADL-SYD', status: 'Held', kg: 640, due: '2026-09-06T17:00', note: 'consignee unreachable' },
      { id: 'LH-24015', lane: 'ADL-MEL', status: 'PickedUp', kg: 55, due: '2026-09-06T14:00' }
    ];
    var st = { ep: 'list', filter: '', id: 'LH-24012', to: 'PickedUp' };
    var req = h('pre', { class: 'demo__log' }), res = h('pre', { class: 'demo__log' }), tbl = h('div');
    function table() {
      tbl.innerHTML = '';
      tbl.appendChild(D.table(['Consignment', 'Lane', 'Status', 'Weight', 'Due'], data.map(function (c) {
        return h('tr', { class: c.status === 'Held' ? 'is-warn' : c.status === 'Delivered' ? 'is-ok' : '' }, h('td', {}, h('code', {}, c.id)), h('td', {}, c.lane), h('td', {}, h('span', { class: 'demo__pill' }, c.status)), h('td', { class: 'num' }, c.kg + ' kg'), h('td', {}, c.due.replace('T', ' ')));
      })));
    }
    function send() {
      var r, q;
      if (st.ep === 'list') {
        q = 'GET /api/consignments' + (st.filter ? '?status=' + st.filter : '');
        var items = data.filter(function (c) { return !st.filter || c.status === st.filter; });
        r = { code: '200 OK', body: { items: items.map(function (c) { return { id: c.id, lane: c.lane, status: c.status, weightKg: c.kg }; }), total: items.length } };
      } else if (st.ep === 'get') {
        q = 'GET /api/consignments/' + st.id;
        var c = data.filter(function (x) { return x.id === st.id; })[0];
        r = c ? { code: '200 OK', body: { id: c.id, lane: c.lane, status: c.status, weightKg: c.kg, dueAt: c.due, allowedTransitions: flow[c.status] } } : { code: '404 Not Found', body: { error: 'no consignment ' + st.id } };
      } else {
        q = 'POST /api/consignments/' + st.id + '/status\n{ "to": "' + st.to + '" }';
        var c2 = data.filter(function (x) { return x.id === st.id; })[0];
        if (!c2) r = { code: '404 Not Found', body: { error: 'no consignment ' + st.id } };
        else if (flow[c2.status].indexOf(st.to) < 0) r = { code: '409 Conflict', body: { error: 'illegal transition', from: c2.status, to: st.to, allowed: flow[c2.status], hint: 'The status flow is enforced in one place; nothing downstream has to re-check it.' } };
        else { c2.status = st.to; r = { code: '200 OK', body: { id: c2.id, status: c2.status, changedAt: new Date().toISOString(), allowedNext: flow[c2.status] } }; table(); }
      }
      req.textContent = q;
      res.innerHTML = '';
      res.appendChild(h('div', { class: r.code[0] === '2' ? 'ok' : r.code[0] === '4' && r.code[1] === '0' && r.code[2] === '9' ? 'warn' : 'bad' }, 'HTTP ' + r.code));
      res.appendChild(h('div', {}, JSON.stringify(r.body, null, 2)));
      f.status(r.code, r.code[0] === '2' ? 'ok' : 'warn');
    }
    var ctl = h('div', { class: 'demo__row' });
    function controls() {
      ctl.innerHTML = '';
      ctl.appendChild(h('label', { class: 'demo__label' }, 'Endpoint', D.select([['list', 'GET /consignments'], ['get', 'GET /consignments/{id}'], ['post', 'POST /consignments/{id}/status']], st.ep, function (v) { st.ep = v; controls(); })));
      if (st.ep === 'list') ctl.appendChild(h('label', { class: 'demo__label' }, 'Filter', D.select([['', 'all'], 'Booked', 'PickedUp', 'InTransit', 'Held', 'Delivered'], st.filter, function (v) { st.filter = v; })));
      else ctl.appendChild(h('label', { class: 'demo__label' }, 'Consignment', D.select(data.map(function (c) { return c.id; }).concat(['LH-99999']), st.id, function (v) { st.id = v; })));
      if (st.ep === 'post') ctl.appendChild(h('label', { class: 'demo__label' }, 'Move to', D.select(['PickedUp', 'InTransit', 'Held', 'Delivered', 'Cancelled', 'Booked'], st.to, function (v) { st.to = v; })));
      ctl.appendChild(D.btn('Send', send));
    }
    controls(); table();
    f.body.appendChild(ctl);
    f.body.appendChild(h('div', { class: 'demo__grid' }, h('div', {}, h('div', { class: 'demo__label', style: 'margin-bottom:6px' }, 'Request'), req), h('div', {}, h('div', { class: 'demo__label', style: 'margin-bottom:6px' }, 'Response'), res)));
    f.body.appendChild(tbl);
    send();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* CRM & automation: the dedupe lab and a flow you can fire            */
  /* ------------------------------------------------------------------ */
  D.register('crm-dedupe', function () {
    var f = D.frame({ title: 'Dedupe lab and automation bench', status: 'nine messy contacts loaded',
      note: 'The merge-key choice is the single decision that decides whether a migration is a cleanup or a catastrophe. The automation bench shows the plumbing shape: trigger, steps, a log you can read.' });
    var contacts = [
      { acct: 'A-1001', name: 'Dana Whitfield', email: 'dana@whitfield.com.au', co: 'Whitfield Plumbing' },
      { acct: 'A-1002', name: 'Marcus Whitfield', email: 'dana@whitfield.com.au', co: 'Whitfield Plumbing' },
      { acct: 'A-1003', name: 'Priya Nair', email: 'priya.nair@gmail.com', co: 'Nair Physio' },
      { acct: 'A-1003', name: 'Priya Nair', email: 'priya@nairphysio.com.au', co: 'Nair Physio' },
      { acct: 'A-1004', name: 'Tom Okafor', email: 'admin@okaforgroup.com', co: 'Okafor Group' },
      { acct: 'A-1005', name: 'Lena Okafor', email: 'admin@okaforgroup.com', co: 'Okafor Group' },
      { acct: 'A-1006', name: 'Sam Tran', email: 'sam.tran@outlook.com', co: 'Tran Electrical' },
      { acct: 'A-1006', name: 'Sam Tran', email: 'sam@tranelectrical.com.au', co: 'Tran Electrical' },
      { acct: 'A-1007', name: 'Jo Hargreaves', email: 'jo@hargreaves.co', co: 'Hargreaves Cafe' }
    ];
    var key = 'email', out = h('div');
    function run() {
      var groups = {};
      contacts.forEach(function (c) { var k = c[key === 'email' ? 'email' : 'acct']; (groups[k] = groups[k] || []).push(c); });
      var rows = [], bad = 0, fixed = 0;
      Object.keys(groups).forEach(function (k) {
        var g = groups[k], names = {}; g.forEach(function (c) { names[c.name] = 1; });
        var distinct = Object.keys(names).length, wrong = distinct > 1, split = false;
        if (key === 'acct' && g.length > 1) fixed++;
        if (wrong) bad++;
        rows.push(h('tr', { class: wrong ? 'is-bad' : g.length > 1 ? 'is-ok' : '' },
          h('td', {}, h('code', {}, k)), h('td', {}, g.map(function (c) { return c.name; }).join(' + ')), h('td', {}, g[0].co),
          h('td', {}, wrong ? h('span', { class: 'demo__pill demo__pill--bad' }, 'strangers merged') : g.length > 1 ? h('span', { class: 'demo__pill demo__pill--ok' }, 'duplicate merged') : h('span', { class: 'demo__pill demo__pill--dim' }, 'single'))));
      });
      out.innerHTML = '';
      out.appendChild(D.table(['Merge key', 'Records merged', 'Company', 'Result'], rows));
      out.appendChild(h('p', { style: 'margin:12px 0 0; font-size:0.92rem' }, key === 'email'
        ? [h('b', {}, bad + ' merges combined different people'), ' because they shared an email (a couple, a shared admin inbox), while the person who changed their email became two records. Every downstream report is now wrong, quietly, for years.']
        : [h('b', {}, fixed + ' real duplicates merged, zero strangers.'), ' The account number is the stable identifier the old system already used. Same data, one decision, opposite outcome.']));
      f.status(key === 'email' ? bad + ' wrong merges' : 'clean', key === 'email' ? 'bad' : 'ok');
    }
    f.body.appendChild(h('div', { class: 'demo__row' }, h('label', { class: 'demo__label' }, 'Merge duplicates on', D.select([['email', 'email address (the convenient one)'], ['acct', 'account number (the stable one)']], key, function (v) { key = v; run(); }))));
    f.body.appendChild(out);

    var steps = [], log = h('pre', { class: 'demo__log' }, h('div', { class: 'dim' }, 'bench idle. add steps, then fire a test event.'));
    var chain = h('div', { class: 'demo__chips' });
    var avail = [['contact', 'Create or update CRM contact'], ['owner', 'Assign an owner by postcode'], ['xero', 'Create Xero contact if new'], ['sms', 'SMS the owner'], ['task', 'Open a follow-up task (2 days)'], ['sheet', 'Append to the monthly report']];
    function drawChain() {
      chain.innerHTML = ''; chain.appendChild(h('span', { class: 'demo__pill demo__pill--warn' }, 'TRIGGER: website enquiry form'));
      steps.forEach(function (s, i) { chain.appendChild(h('span', {}, '→')); chain.appendChild(h('button', { class: 'demo__chip', type: 'button', 'aria-pressed': 'true', title: 'remove', onclick: function () { steps.splice(i, 1); drawChain(); } }, avail.filter(function (a) { return a[0] === s; })[0][1], ' ×')); });
    }
    function fire() {
      log.innerHTML = '';
      var lines = [['dim', '[event] form submitted: "Jo Hargreaves", jo@hargreaves.co, postcode 5000, "coffee machine POS keeps double charging"']];
      steps.forEach(function (s) {
        lines.push(s === 'contact' ? ['ok', '[crm] matched existing contact A-1007 on email, updated (no duplicate created)']
          : s === 'owner' ? ['ok', '[crm] postcode 5000 -> owner: Aaron'] : s === 'xero' ? ['ok', '[xero] contact exists (ABN match), skipped create']
          : s === 'sms' ? ['ok', '[sms] sent to owner: "New enquiry: Hargreaves Cafe, POS double charging"'] : s === 'task' ? ['ok', '[crm] task "follow up Hargreaves" due in 2 days'] : ['ok', '[sheets] appended row 214 to Enquiries 2026-09']);
      });
      if (!steps.length) lines.push(['warn', '[bench] no steps: the event was received and nothing happened. That is the default state of most CRMs.']);
      lines.push(['dim', '[done] ' + steps.length + ' step' + (steps.length === 1 ? '' : 's') + ', 0 retyping, fails loudly if any step errors.']);
      lines.forEach(function (l, i) { setTimeout(function () { log.appendChild(h('div', { class: l[0] }, l[1])); log.scrollTop = log.scrollHeight; }, i * 220); });
    }
    drawChain();
    f.body.appendChild(h('div', { class: 'demo__panel' }, h('h4', {}, 'Automation bench: build the chain, fire an event'), chain,
      h('div', { class: 'demo__row', style: 'margin-top:10px' }, avail.map(function (a) { return h('button', { class: 'demo__chip', type: 'button', onclick: function () { if (steps.indexOf(a[0]) < 0) { steps.push(a[0]); drawChain(); } } }, '+ ' + a[1]); })),
      h('div', { class: 'demo__row', style: 'margin-top:10px' }, D.btn('Fire a test enquiry', fire)), log));
    run();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Data & reporting: spreadsheet in, dashboard out, mismatch found     */
  /* ------------------------------------------------------------------ */
  D.register('data-dashboard', function () {
    var f = D.frame({ title: 'Spreadsheet to dashboard, and the mismatch finder', status: 'edit the numbers, it re-renders',
      note: 'The dashboard is derived from the rows, so it cannot drift from them. The mismatch finder does what a reconciliation actually does: names the mechanism instead of shrugging.' });
    var ta = h('textarea', { class: 'demo__textarea', rows: 8 }, 'month,north,south,online\nApr,42100,38800,12400\nMay,44900,37200,14100\nJun,41300,39900,15800\nJul,45200,36400,17900\nAug,27600,38100,19300\nSep,46800,40200,21000');
    var out = h('div');
    function render() {
      var lines = ta.value.trim().split('\n').map(function (l) { return l.split(',').map(function (c) { return c.trim(); }); });
      var head = lines[0], rows = lines.slice(1).filter(function (r) { return r.length === head.length; });
      var series = head.slice(1), totals = series.map(function () { return 0; }), max = 0, notes = [];
      rows.forEach(function (r) { r.slice(1).forEach(function (v, i) { v = +v || 0; totals[i] += v; max = Math.max(max, v); }); });
      series.forEach(function (s, i) {
        var vals = rows.map(function (r) { return +r[i + 1] || 0; }), mean = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
        vals.forEach(function (v, j) { if (Math.abs(v - mean) / mean > 0.3) notes.push(head[0] === 'month' ? rows[j][0] + ' ' + s + ' is ' + Math.round((v - mean) / mean * 100) + '% off its average: worth a question, not a panic' : s + ' row ' + (j + 1) + ' is an outlier'); });
      });
      var W = 640, H = 220, pad = 36, bw = (W - pad * 2) / rows.length, cols = ['var(--green)', 'var(--amber)', 'var(--ink)'];
      var svg = '<svg class="demo__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Bar chart of the pasted data">';
      rows.forEach(function (r, j) {
        r.slice(1).forEach(function (v, i) { v = +v || 0; var bh = (v / max) * (H - pad * 2), x = pad + j * bw + i * (bw / series.length) * 0.9 + 4; svg += '<rect x="' + x + '" y="' + (H - pad - bh) + '" width="' + ((bw / series.length) * 0.8) + '" height="' + bh + '" fill="' + cols[i % 3] + '"></rect>'; });
        svg += '<text x="' + (pad + j * bw + bw / 2) + '" y="' + (H - 12) + '" font-size="12" text-anchor="middle" fill="currentColor">' + r[0] + '</text>';
      });
      svg += '</svg>';
      out.innerHTML = '';
      out.appendChild(h('div', { class: 'demo__grid', style: 'grid-template-columns:2fr 1fr' },
        h('div', { html: svg }),
        h('div', { class: 'demo__panel' }, h('h4', {}, 'Totals'), h('div', { class: 'demo__kv' }, series.map(function (s, i) { return [h('span', {}, s), h('b', {}, money(totals[i]))]; }).reduce(function (a, b) { return a.concat(b); }, [])),
          h('h4', { style: 'margin-top:14px' }, 'Flags'), notes.length ? h('ul', { style: 'margin:0; padding-left:1.1em; font-size:0.86rem' }, notes.map(function (n) { return h('li', {}, n); })) : h('p', { class: 'dim', style: 'margin:0; font-size:0.86rem' }, 'nothing unusual'))));
      f.status(rows.length + ' rows, ' + series.length + ' series', 'ok');
    }
    f.body.appendChild(h('div', { class: 'demo__grid', style: 'grid-template-columns:minmax(240px,1fr) 2fr' }, h('label', { class: 'demo__label' }, 'Your spreadsheet (CSV, edit it)', ta, D.btn('Re-render', render, 'demo__btn--small')), out));

    var mm = h('div', { class: 'demo__panel' });
    var A = [['INV-2201', '28 Aug', 1540], ['INV-2202', '30 Aug', 880], ['INV-2203', '31 Aug', 2310], ['INV-2204', '31 Aug', 660]];
    var B = [['INV-2201', '28 Aug', 1540], ['INV-2202', '30 Aug', 968], ['INV-2203', '2 Sep', 2310], ['INV-2204', '31 Aug', 660]];
    function mismatch() {
      var found = [];
      A.forEach(function (a, i) { var b = B[i]; if (a[2] !== b[2]) found.push(a[0] + ': ' + money(a[2]) + ' vs ' + money(b[2]) + '. Ratio 1.10: one system holds GST, the other does not.'); if (a[1] !== b[1]) found.push(a[0] + ': dated ' + a[1] + ' vs ' + b[1] + '. Date boundary: invoiced in August, paid in September, so the two month totals will never agree and both are right.'); });
      mm.innerHTML = '';
      mm.appendChild(h('h4', {}, 'Why the two systems disagree'));
      mm.appendChild(h('ul', { style: 'margin:0; padding-left:1.1em; font-size:0.9rem; display:grid; gap:6px' }, found.map(function (x) { return h('li', {}, x); })));
      mm.appendChild(h('p', { style: 'margin:10px 0 0; font-size:0.88rem' }, h('b', {}, 'Mechanisms named, nothing left as "the systems just differ".'), ' Fix: report on payment date in both, carry tax as its own column, and the August numbers agree forever.'));
    }
    var side = h('div', { class: 'demo__grid' },
      h('div', {}, h('div', { class: 'demo__label', style: 'margin-bottom:6px' }, 'Accounting says'), D.table(['Invoice', 'Date', 'Amount'], A.map(function (r) { return h('tr', {}, h('td', {}, r[0]), h('td', {}, r[1]), h('td', { class: 'num' }, money(r[2]))); }))),
      h('div', {}, h('div', { class: 'demo__label', style: 'margin-bottom:6px' }, 'The CRM says'), D.table(['Invoice', 'Date', 'Amount'], B.map(function (r, i) { return h('tr', { class: r[2] !== A[i][2] || r[1] !== A[i][1] ? 'is-warn' : '' }, h('td', {}, r[0]), h('td', {}, r[1]), h('td', { class: 'num' }, money(r[2]))); }))));
    f.body.appendChild(h('div', { class: 'demo__panel' }, h('h4', {}, 'The numbers do not match'), side, h('div', { class: 'demo__row', style: 'margin-top:10px' }, D.btn('Find the mechanism', mismatch)), mm));
    render();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Project rescue: the ownership audit                                 */
  /* ------------------------------------------------------------------ */
  D.register('rescue-audit', function () {
    var f = D.frame({ title: 'Who actually owns your website?', status: 'answer honestly, nobody is watching',
      note: 'Half of every rescue is this list. On a real job I confirm each answer against the registrar, the host and the code, then execute the plan in this order.' });
    var items = [
      ['Domain name registration', 'If they hold this, they hold your business address. Recovery: registrar dispute or a transfer request, and it takes the longest.', 3],
      ['DNS (where the domain points)', 'Usually lives with the registrar or host. Needed before anything can move.', 2],
      ['Hosting account', 'The account paying for the server. Without it you cannot see backups or move files.', 2],
      ['WordPress / site admin login', 'An admin user in your name. Often the quickest win: a host can reset it for the owner.', 2],
      ['The code or theme files', 'Do you have a copy? A backup you have downloaded counts. Nothing else does.', 1],
      ['Database backup', 'Content, orders, users. Also in the hosting account, if you have that.', 1],
      ['Business email', 'If mail runs through the same developer, moving the site can break email. Plan it together.', 2],
      ['Analytics and Search Console', 'Your traffic history and Google standing. Ownership transfer is a few clicks once you can log in.', 1]
    ];
    var ans = items.map(function () { return 'unknown'; });
    var out = h('div', { class: 'demo__panel' });
    function plan() {
      var risk = 0, steps = [];
      items.forEach(function (it, i) { if (ans[i] === 'them') { risk += it[2] * 2; steps.push([it[2], 'Recover: ' + it[0] + '. ' + it[1]]); } else if (ans[i] === 'unknown') { risk += it[2]; steps.push([it[2] - 0.5, 'Find out: ' + it[0] + '. Check the registrar lookup, your hosting invoices, your inbox for setup emails.']); } });
      steps.sort(function (a, b) { return b[0] - a[0]; });
      var pctRisk = Math.min(100, Math.round(risk / 28 * 100));
      out.innerHTML = '';
      out.appendChild(h('h4', {}, 'Exposure: ' + (pctRisk < 20 ? 'low' : pctRisk < 55 ? 'real' : 'serious')));
      out.appendChild(D.bar(pctRisk, 100, pctRisk < 20 ? '' : pctRisk < 55 ? 'demo__meter--amber' : 'demo__meter--bad'));
      out.appendChild(h('p', { style: 'margin:10px 0; font-size:0.92rem' }, pctRisk < 20 ? 'You own your own business online. Rare, and well done. The rescue is just a handover.' : 'The recovery plan, in the order that unblocks the most:'));
      if (steps.length) out.appendChild(h('ol', { style: 'margin:0; padding-left:1.2em; font-size:0.9rem; display:grid; gap:6px' }, steps.map(function (s) { return h('li', {}, s[1]); })));
      f.status('exposure ' + pctRisk + '%', pctRisk < 20 ? 'ok' : pctRisk < 55 ? 'warn' : 'bad');
    }
    f.body.appendChild(D.table(['Thing', 'Who holds it?'], items.map(function (it, i) {
      return h('tr', {}, h('td', {}, h('b', {}, it[0]), h('br'), h('span', { class: 'dim', style: 'font-size:0.85rem' }, it[1])),
        h('td', {}, h('div', { class: 'demo__chips' }, [['me', 'Me'], ['them', 'The developer'], ['unknown', 'No idea']].map(function (o) { return h('button', { class: 'demo__chip', type: 'button', 'aria-pressed': ans[i] === o[0], onclick: function (e) { ans[i] = o[0]; Array.prototype.forEach.call(e.target.parentNode.children, function (c) { c.setAttribute('aria-pressed', c === e.target); }); plan(); } }, o[1]); }))));
    })));
    f.body.appendChild(out);
    plan();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Business analysis: process map and spec generator                   */
  /* ------------------------------------------------------------------ */
  D.register('ba-process-map', function () {
    var f = D.frame({ title: 'Describe the process, get the map and the spec', status: 'sample process loaded',
      note: 'Eleven years of this in rooms full of people who disagreed. The map finds the handoffs and waits; the spec turns them into statements you can check, which is what a developer (or an AI) can actually build from.' });
    var ta = h('textarea', { class: 'demo__textarea', rows: 8 }, ['Customer: submits enquiry on website', 'Admin: reads inbox, retypes into spreadsheet', 'Admin: waits for owner to price it', 'Owner: prices job from memory', 'Admin: emails quote as PDF', 'Customer: waits, often chases by phone', 'Customer: accepts by email', 'Admin: retypes job into scheduling app', 'Owner: does the job', 'Admin: retypes into Xero, sends invoice'].join('\n'));
    var out = h('div');
    function parse() { return ta.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) { var p = l.split(':'); return { actor: p.length > 1 ? p[0].trim() : 'Someone', step: (p.length > 1 ? p.slice(1).join(':') : l).trim() }; }); }
    function map() {
      var steps = parse(), actors = []; steps.forEach(function (s) { if (actors.indexOf(s.actor) < 0) actors.push(s.actor); });
      var W = 760, rowH = 70, colW = Math.max(90, (W - 130) / steps.length), H = actors.length * rowH + 20;
      var svg = '<svg class="demo__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Swimlane process map">';
      actors.forEach(function (a, i) { svg += '<rect x="0" y="' + (i * rowH + 10) + '" width="' + W + '" height="' + rowH + '" fill="' + (i % 2 ? 'transparent' : 'rgba(0,0,0,0.035)') + '"></rect><text x="8" y="' + (i * rowH + 44) + '" font-size="12" font-weight="700" fill="currentColor">' + a + '</text>'; });
      var handoffs = 0, waits = 0, retypes = 0;
      steps.forEach(function (s, j) {
        var row = actors.indexOf(s.actor), x = 120 + j * colW, y = row * rowH + 22, wait = /wait|chase/i.test(s.step), retype = /retype|re-?enter|copy/i.test(s.step);
        if (wait) waits++; if (retype) retypes++;
        if (j > 0 && steps[j - 1].actor !== s.actor) { handoffs++; var px = 120 + (j - 1) * colW + colW * 0.8 - 8, py = actors.indexOf(steps[j - 1].actor) * rowH + 45; svg += '<line x1="' + px + '" y1="' + py + '" x2="' + x + '" y2="' + (y + 23) + '" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"></line>'; }
        svg += '<rect x="' + x + '" y="' + y + '" width="' + (colW * 0.8 - 8) + '" height="46" rx="0" fill="' + (wait ? 'var(--amber-soft)' : retype ? 'oklch(0.9 0.05 30)' : 'var(--bone)') + '" stroke="currentColor" stroke-width="1.5"></rect>';
        var words = s.step.split(' '), l1 = words.slice(0, 3).join(' '), l2 = words.slice(3, 6).join(' ');
        svg += '<text x="' + (x + 6) + '" y="' + (y + 19) + '" font-size="10" fill="currentColor">' + l1.slice(0, 18) + '</text><text x="' + (x + 6) + '" y="' + (y + 34) + '" font-size="10" fill="currentColor">' + l2.slice(0, 18) + '</text>';
      });
      svg += '</svg>';
      out.innerHTML = '';
      out.appendChild(h('div', { html: svg }));
      out.appendChild(h('div', { class: 'demo__row', style: 'margin-top:10px' },
        h('span', { class: 'demo__pill' }, steps.length + ' steps'), h('span', { class: 'demo__pill' }, actors.length + ' actors'),
        h('span', { class: 'demo__pill ' + (handoffs > 4 ? 'demo__pill--warn' : '') }, handoffs + ' handoffs'),
        h('span', { class: 'demo__pill ' + (waits ? 'demo__pill--warn' : '') }, waits + ' waits'),
        h('span', { class: 'demo__pill ' + (retypes ? 'demo__pill--bad' : '') }, retypes + ' retyping steps')));
      out.appendChild(h('p', { style: 'margin:10px 0 0; font-size:0.9rem' }, retypes ? [h('b', {}, 'The ' + retypes + ' red boxes are the automation.'), ' Every retype is a join between two systems that software should own. The amber waits are where customers leak.'] : 'Clean process. Rare. Now let us check the spec holds.'));
      f.status(handoffs + ' handoffs, ' + retypes + ' retypes', retypes ? 'warn' : 'ok');
    }
    function spec() {
      var steps = parse(), lines = ['# SPEC (generated from your process)', '', '## Done means'];
      steps.forEach(function (s) {
        if (/retype|re-?enter|copy/i.test(s.step)) lines.push('- ' + s.step.replace(/retypes?|re-?enters?|copies/i, 'flows automatically') + ' without anyone typing; a failed sync is visible within 5 minutes.');
        else if (/wait|chase/i.test(s.step)) lines.push('- ' + s.actor + ' never has to chase: the status is visible to them and a reminder fires after 2 business days.');
        else if (/memory|guess/i.test(s.step)) lines.push('- ' + s.step.replace(/from memory/i, 'from a rate card') + '; the price can be reproduced by someone else.');
        else lines.push('- ' + s.actor + ' can ' + s.step.replace(/^(\w+)s\b/, '$1') + ' in under 2 minutes on a phone.');
      });
      lines.push('', '## Must never', '- Lose an enquiry between systems.', '- Require the same fact to be typed twice.');
      out.innerHTML = '';
      out.appendChild(h('pre', { class: 'demo__log', style: 'max-height:none' }, lines.join('\n')));
      out.appendChild(h('p', { style: 'margin:10px 0 0; font-size:0.9rem' }, h('b', {}, 'Checkable statements, not vibes.'), ' This is the document a build gets held to, and the reason AI-assisted delivery works when the spec exists and fails when it does not.'));
      f.status('spec drafted', 'ok');
    }
    f.body.appendChild(h('label', { class: 'demo__label' }, 'Your process, one step per line as "Who: does what"', ta));
    f.body.appendChild(h('div', { class: 'demo__row' }, D.btn('Map it', map), D.btn('Write the spec', spec, 'demo__btn--ghost')));
    f.body.appendChild(out);
    map();
    return f.root;
  });

})(window.Demos);
