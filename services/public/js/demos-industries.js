/* Live builds for the twelve industry pages: a working slice of the system
   that sector actually needs, with its data, its rules and its traps. */
(function (D) {
  var h = D.h, money = D.money, fmt = D.fmt;
  function ctl(label, node) { return h('label', { class: 'demo__label' }, label, node); }
  function logline(log, cls, text) { log.appendChild(h('div', { class: cls }, text)); log.scrollTop = log.scrollHeight; }
  function stamp() { return new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }); }

  /* ---------------- TRADES: the week vs the weather ---------------- */
  D.register('trades-schedule', function () {
    var f = D.frame({ kind: 'app', app: { name: 'SiteBoard', mark: 'S', accent: '#EA580C', side: '#1F1712', nav: [['Schedule', 'cal'], ['Jobs', 'clip'], ['Quotes', 'doc'], ['Invoices', 'dollar'], ['Customers', 'users']], active: 0, title: 'This week', user: 'Jo Hargreaves' }, title: 'This week\'s jobs against the forecast', status: 'Sunday night view',
      note: 'Rain Check, one of my live tools, already does the forecast half for Adelaide trades. Joined to your job system, the reshuffle proposes itself before 6am.' });
    var days = [['Mon', 2, 10], ['Tue', 14, 80], ['Wed', 22, 90], ['Thu', 1, 5], ['Fri', 0, 0]];
    var jobs = [
      { who: 'Hargreaves', what: 'Roof re-wire', out: true, day: 0 }, { who: 'Nguyen', what: 'Switchboard', out: false, day: 0 },
      { who: 'Bella Vista', what: 'Outdoor lighting', out: true, day: 1 }, { who: 'Okafor', what: 'Downlights', out: false, day: 1 },
      { who: 'Council depot', what: 'Carpark bollards', out: true, day: 2 }, { who: 'Tran', what: 'Safety switch', out: false, day: 2 },
      { who: 'Whitfield', what: 'Pool pump circuit', out: true, day: 3 }, { who: 'Marion clinic', what: 'Data cabling', out: false, day: 4 }
    ];
    var board = h('div', { class: 'demo__grid', style: 'grid-template-columns:repeat(5,minmax(120px,1fr)); gap:8px' }), log = h('pre', { class: 'demo__log' });
    function risky(j) { return j.out && days[j.day][1] >= 5; }
    function draw() {
      board.innerHTML = '';
      days.forEach(function (d, i) {
        var col = h('div', { class: 'demo__panel', style: 'padding:10px' },
          h('div', { style: 'font-weight:800' }, d[0]), h('div', { class: 'dim', style: 'font-size:0.8rem; margin-bottom:8px' }, d[2] + '% · ' + d[1] + 'mm'));
        jobs.filter(function (j) { return j.day === i; }).forEach(function (j) {
          col.appendChild(h('div', { style: 'border:1.5px solid ' + (risky(j) ? '#dc2626' : 'var(--line)') + '; padding:6px 8px; margin-top:6px; font-size:0.82rem; background:' + (risky(j) ? '#fee2e2' : 'var(--bone)') },
            h('b', {}, j.who), h('br'), j.what, ' ', h('span', { class: 'demo__pill demo__pill--dim', style: 'font-size:0.62rem' }, j.out ? 'outdoor' : 'indoor')));
        });
        board.appendChild(col);
      });
      var n = jobs.filter(risky).length;
      f.status(n ? n + ' outdoor jobs on wet days' : 'week is dry-safe', n ? 'bad' : 'ok');
    }
    function reshuffle() {
      log.innerHTML = '';
      var moved = 0;
      jobs.filter(risky).forEach(function (j) {
        var dry = [3, 4, 0].filter(function (i) { return days[i][1] < 5 && jobs.filter(function (x) { return x.day === i; }).length < 3; })[0];
        if (dry == null) { logline(log, 'warn', '[hold] ' + j.who + ' ' + j.what + ': no dry slot this week, propose next Monday'); return; }
        var indoor = jobs.filter(function (x) { return x.day === dry && !x.out; })[0];
        if (indoor) { indoor.day = j.day; logline(log, 'dim', '[swap] ' + indoor.who + ' (indoor) moved to ' + days[j.day][0] + ' to fill the gap'); }
        logline(log, 'ok', '[move] ' + j.who + ' ' + j.what + ': ' + days[j.day][0] + ' -> ' + days[dry][0]);
        logline(log, 'dim', '[sms draft] "Hi ' + j.who + ', ' + days[j.day][0] + ' is forecast ' + days[j.day][1] + 'mm so we have moved your ' + j.what.toLowerCase() + ' to ' + days[dry][0] + '. Reply if that does not suit." (awaiting your OK)');
        j.day = dry; moved++;
      });
      logline(log, moved ? 'ok' : 'dim', '[done] ' + moved + ' moved, ' + jobs.filter(risky).length + ' still at risk. Nothing sent without a human tap.');
      draw();
    }
    f.body.appendChild(board);
    f.body.appendChild(h('div', { class: 'demo__row' }, D.btn('Reshuffle around the rain', reshuffle), D.btn('Make it rain Thursday', function () { days[3] = ['Thu', 9, 70]; draw(); D.toast(f.root, 'Forecast changed. Red boxes updated.', ''); }, 'demo__btn--ghost')));
    f.body.appendChild(log);
    draw();
    return f.root;
  });

  /* ---------------- TRANSPORT: the consignment board ---------------- */
  D.register('transport-board', function () {
    var f = D.frame({ kind: 'app', app: { name: 'Linehaul', mark: 'L', accent: '#2563EB', side: '#0F1B33', nav: [['Operations', 'truck'], ['Consignments', 'box'], ['Lanes', 'map'], ['Reports', 'chart'], ['Settings', 'cog']], active: 0, title: 'Operations board', user: 'Dee Marsh' }, title: 'Linehaul operations board', status: 'live from the event log',
      note: 'This is the reference build\'s dashboard logic, running on fixtures in your browser: derived from the record of what happened, so it cannot drift from the truth. The full build is public and compilable.' });
    var r = D.rng(11), lanes = ['ADL-MEL', 'ADL-PER', 'ADL-SYD', 'MEL-ADL'], now = 0, cons = [];
    for (var i = 0; i < 18; i++) cons.push({ id: 'LH-24' + (100 + i), lane: lanes[i % 4], kg: Math.round(40 + r() * 1200), due: 1 + Math.floor(r() * 4), status: ['Booked', 'PickedUp', 'InTransit', 'InTransit', 'Delivered'][Math.floor(r() * 5)], deliveredAt: null });
    cons.forEach(function (c) { if (c.status === 'Delivered') c.deliveredAt = c.due - (r() < 0.85 ? 0 : -1); });
    var filter = '', tiles = h('div', { class: 'demo__grid', style: 'grid-template-columns:repeat(auto-fit,minmax(130px,1fr))' }), tbl = h('div'), chips = h('div', { class: 'demo__chips' });
    function draw() {
      var delivered = cons.filter(function (c) { return c.status === 'Delivered'; }), onTime = delivered.filter(function (c) { return c.deliveredAt <= c.due; }).length;
      var late = cons.filter(function (c) { return c.status !== 'Delivered' && c.status !== 'Cancelled' && c.due < now; });
      tiles.innerHTML = '';
      [['Booked', cons.filter(function (c) { return c.status !== 'Cancelled'; }).length], ['Delivered', delivered.length], ['On time', delivered.length ? Math.round(onTime / delivered.length * 100) + '%' : '-'], ['Held', cons.filter(function (c) { return c.status === 'Held'; }).length, 'warn'], ['Overdue', late.length, late.length ? 'bad' : '']].forEach(function (t) {
        tiles.appendChild(h('div', { class: 'demo__panel' }, h('div', { class: 'demo__big', style: t[2] === 'bad' ? 'color:#dc2626' : t[2] === 'warn' ? 'color:#d97706' : '' }, String(t[1])), h('div', { class: 'dim', style: 'font-size:0.82rem' }, t[0])));
      });
      chips.innerHTML = '';
      ['', 'Booked', 'PickedUp', 'InTransit', 'Held', 'Delivered'].forEach(function (s) { chips.appendChild(h('button', { class: 'demo__chip', type: 'button', 'aria-pressed': filter === s, onclick: function () { filter = s; draw(); } }, s || 'All')); });
      tbl.innerHTML = '';
      tbl.appendChild(D.table(['Consignment', 'Lane', 'Status', 'Weight', 'Due day', 'Flag'], cons.filter(function (c) { return !filter || c.status === filter; }).map(function (c) {
        var over = c.status !== 'Delivered' && c.status !== 'Cancelled' && c.due < now;
        return h('tr', { class: over ? 'is-bad' : c.status === 'Held' ? 'is-warn' : '' }, h('td', {}, h('code', {}, c.id)), h('td', {}, c.lane), h('td', {}, h('span', { class: 'demo__pill' }, c.status)), h('td', { class: 'num' }, c.kg + ' kg'), h('td', {}, 'Day ' + c.due), h('td', {}, over ? h('span', { class: 'demo__pill demo__pill--bad' }, 'overdue ' + (now - c.due) + 'd') : c.status === 'Delivered' ? (c.deliveredAt <= c.due ? h('span', { class: 'demo__pill demo__pill--ok' }, 'on time') : h('span', { class: 'demo__pill demo__pill--warn' }, 'late')) : ''));
      })));
      f.status('day ' + now + ' · ' + late.length + ' overdue', late.length ? 'warn' : 'ok');
    }
    function advance() {
      now++;
      cons.forEach(function (c) {
        if (c.status === 'Booked' && r() < 0.6) c.status = 'PickedUp';
        else if (c.status === 'PickedUp' && r() < 0.7) c.status = 'InTransit';
        else if (c.status === 'InTransit' && r() < 0.55) { c.status = 'Delivered'; c.deliveredAt = now; }
        else if (c.status === 'InTransit' && r() < 0.08) c.status = 'Held';
      });
      draw();
    }
    f.body.appendChild(tiles);
    f.body.appendChild(h('div', { class: 'demo__row' }, chips, D.btn('Advance one day', advance), D.btn('Run the overdue sweep', function () { var n = cons.filter(function (c) { return c.status !== 'Delivered' && c.status !== 'Cancelled' && c.due < now; }).length; D.toast(f.root, n ? n + ' overdue consignments flagged and the ops lead notified. This is the scheduled function in the build.' : 'Sweep ran: nothing overdue. Quiet is the point.', n ? 'bad' : 'ok'); }, 'demo__btn--ghost')));
    f.body.appendChild(tbl);
    draw();
    return f.root;
  });

  /* ---------------- MINING: pre-start, permits, sign-off ---------------- */
  D.register('mining-prestart', function () {
    var f = D.frame({ kind: 'app', app: { name: 'ShiftGate', mark: '!', accent: '#F59E0B', side: '#111827', nav: [['Pre-start', 'check'], ['Permits', 'doc'], ['Crew', 'users'], ['Audit trail', 'list'], ['Settings', 'cog']], active: 0, title: 'Pre-start · Day shift · Crew B', user: 'S. Tran' }, title: 'Pre-start and permit-to-work, gated', status: 'shift not started',
      note: 'The rule that matters is the gate: nobody starts until every check passes and every permit is in date, and every tap is in an audit trail with a name and a time. Built the way BHP-grade sites expect, sized for a contractor.' });
    var checks = [['Isolation verified and tagged', null], ['Gas test within 30 min', null], ['Emergency exit route confirmed', null], ['PPE inspected', null], ['Crew fit for work declared', null]];
    var permits = [['Hot work permit HW-2291', 2], ['Confined space CS-0418', 0], ['Working at heights WH-1177', 5]];
    var log = h('pre', { class: 'demo__log' }), list = h('div'), startBtn = D.btn('Start shift', function () { logline(log, 'ok', '[' + stamp() + '] SHIFT STARTED by S. Tran (supervisor). Gate satisfied: 5/5 checks, permits valid.'); f.status('shift running', 'ok'); startBtn.disabled = true; });
    function gate() {
      var ok = checks.every(function (c) { return c[1] === true; }) && permits.every(function (p) { return p[1] > 0; });
      startBtn.disabled = !ok;
      f.status(ok ? 'gate open: ready to start' : 'gate closed', ok ? 'ok' : 'warn');
    }
    function draw() {
      list.innerHTML = '';
      list.appendChild(h('div', { class: 'demo__grid' },
        h('div', { class: 'demo__panel' }, h('h4', {}, 'Pre-start checks'), checks.map(function (c, i) {
          return h('div', { class: 'demo__row', style: 'justify-content:space-between; border-bottom:1px solid var(--line); padding:6px 0' }, h('span', { style: 'font-size:0.9rem' }, c[0]),
            h('span', { class: 'demo__chips' }, [[true, 'Pass'], [false, 'Fail']].map(function (o) { return h('button', { class: 'demo__chip demo__btn--small', type: 'button', 'aria-pressed': c[1] === o[0], onclick: function () { c[1] = o[0]; logline(log, o[0] ? 'ok' : 'bad', '[' + stamp() + '] ' + c[0] + ': ' + (o[0] ? 'PASS' : 'FAIL') + ' (S. Tran)'); draw(); } }, o[1]); })));
        })),
        h('div', { class: 'demo__panel' }, h('h4', {}, 'Permits'), permits.map(function (p, i) {
          return h('div', { class: 'demo__row', style: 'justify-content:space-between; border-bottom:1px solid var(--line); padding:6px 0' }, h('span', { style: 'font-size:0.9rem' }, p[0]),
            p[1] > 0 ? h('span', { class: 'demo__pill demo__pill--' + (p[1] <= 2 ? 'warn' : 'ok') }, p[1] + 'd left') : h('span', { class: 'demo__row', style: 'gap:6px' }, h('span', { class: 'demo__pill demo__pill--bad' }, 'expired'), D.btn('Renew', function () { p[1] = 7; logline(log, 'ok', '[' + stamp() + '] ' + p[0] + ' renewed, 7 days (issuer: J. Okafor)'); draw(); }, 'demo__btn--small')));
        }))));
      gate();
    }
    f.body.appendChild(list);
    f.body.appendChild(h('div', { class: 'demo__row' }, startBtn, h('span', { class: 'dim', style: 'font-size:0.86rem' }, 'disabled until the gate is satisfied; that is the feature')));
    f.body.appendChild(log);
    logline(log, 'dim', '[' + stamp() + '] audit trail open. Every action below is recorded with who and when.');
    draw();
    return f.root;
  });

  /* ---------------- RETAIL: one stock truth ---------------- */
  D.register('retail-stock', function () {
    var f = D.frame({ kind: 'app', app: { name: 'Stockline', mark: 'S', accent: '#7C3AED', side: '#1E1033', nav: [['Products', 'box'], ['Stock', 'list'], ['Orders', 'cart'], ['Channels', 'map'], ['Reports', 'chart']], active: 1, title: 'Stock', user: 'Marco Bell' }, title: 'One shelf, two tills', status: 'single ledger',
      note: 'Your till in store, your shop online, one truth about stock. Flip the switch to see how most shops actually run: two ledgers each certain they are right, and the oversell lands on your busiest Saturday.' });
    var skus = [{ sku: 'TEE-BLK-M', name: 'Black tee, M', stock: 3, reorder: 4 }, { sku: 'CAP-OLV', name: 'Olive cap', stock: 7, reorder: 3 }, { sku: 'MUG-01', name: 'Enamel mug', stock: 1, reorder: 5 }];
    var split = false, shadow = {}, tbl = h('div'), log = h('pre', { class: 'demo__log' });
    skus.forEach(function (s) { shadow[s.sku] = { store: s.stock, online: s.stock }; });
    function sell(s, ch) {
      if (!split) {
        if (s.stock <= 0) { logline(log, 'bad', '[' + ch + '] ' + s.name + ': refused, out of stock. Customer told at checkout, not next week.'); return draw(); }
        s.stock--; logline(log, 'ok', '[' + ch + '] sold ' + s.name + ', ledger now ' + s.stock + (s.stock <= s.reorder ? ' -> reorder suggested' : ''));
      } else {
        var sh = shadow[s.sku]; sh[ch]--;
        logline(log, sh[ch] < 0 ? 'bad' : 'warn', '[' + ch + '] sold ' + s.name + '; ' + ch + ' ledger says ' + sh[ch] + ', the other till still thinks ' + sh[ch === 'store' ? 'online' : 'store']);
        if (sh.store + sh.online < s.stock * 1) { }
        var real = s.stock - ((s.stock - sh.store) + (s.stock - sh.online)); if (real < 0) logline(log, 'bad', '[oversell] ' + s.name + ' is at ' + real + ' on the shelf. Two apologies to write.');
      }
      draw();
    }
    function draw() {
      tbl.innerHTML = '';
      tbl.appendChild(D.table(['SKU', 'Item', split ? 'Store ledger' : 'Stock (one ledger)', split ? 'Online ledger' : 'Reorder at', 'Sell'], skus.map(function (s) {
        var sh = shadow[s.sku], real = split ? s.stock - ((s.stock - sh.store) + (s.stock - sh.online)) : s.stock;
        return h('tr', { class: real < 0 ? 'is-bad' : real <= s.reorder ? 'is-warn' : '' }, h('td', {}, h('code', {}, s.sku)), h('td', {}, s.name), h('td', { class: 'num' }, String(split ? sh.store : s.stock)), h('td', { class: 'num' }, String(split ? sh.online : s.reorder)),
          h('td', {}, h('span', { class: 'demo__row', style: 'gap:6px' }, D.btn('In store', function () { sell(s, 'store'); }, 'demo__btn--small'), D.btn('Online', function () { sell(s, 'online'); }, 'demo__btn--small demo__btn--ghost'))));
      })));
      var over = skus.filter(function (s) { var sh = shadow[s.sku]; return split && s.stock - ((s.stock - sh.store) + (s.stock - sh.online)) < 0; }).length;
      f.status(split ? (over ? over + ' oversold' : 'two ledgers, drifting') : 'single ledger, honest', split ? (over ? 'bad' : 'warn') : 'ok');
    }
    f.body.appendChild(h('label', { class: 'demo__row', style: 'gap:8px; font-weight:700; cursor:pointer' }, h('input', { type: 'checkbox', onchange: function (e) { split = e.target.checked; skus.forEach(function (s) { shadow[s.sku] = { store: s.stock, online: s.stock }; }); logline(log, 'dim', split ? '[mode] two separate ledgers (POS and web store each keep their own count)' : '[mode] one ledger, both channels subscribe'); draw(); } }), 'Run it the way most shops do (two ledgers)'));
    f.body.appendChild(tbl); f.body.appendChild(log);
    logline(log, 'dim', '[ready] sell a mug from both tills and watch what happens.');
    draw();
    return f.root;
  });

  /* ---------------- HOSPITALITY: bookings, covers, roster ---------------- */
  D.register('hospo-bookings', function () {
    var f = D.frame({ kind: 'browser', browser: { url: 'bellavistacafe.com.au', path: '/book' }, accent: '#2F6B4F', title: 'Saturday service: bookings, covers, roster', status: 'take a booking',
      note: 'The booking widget is the visible bit; the value is underneath: capacity per slot, kitchen load, and a roster that follows covers instead of guesswork.' });
    var slots = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'], cap = 36, covers = [10, 18, 30, 34, 26, 14, 6];
    var pick = { slot: '19:00', size: 4, name: 'Nguyen' }, chart = h('div'), out = h('p', { style: 'margin:0; font-size:0.92rem' });
    f.device.body.insertBefore(h('div', { style: 'font-family:Inter,system-ui,sans-serif; background:#F8F3E8; color:#1E211F' },
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; padding:14px 22px; border-bottom:1px solid rgba(0,0,0,0.08)' }, h('b', { style: "font-family:'Playfair Display',Georgia,serif; font-size:20px; font-weight:600" }, 'Bella Vista'), h('span', { style: 'display:flex; gap:18px; font-size:13px' }, h('span', {}, 'Menu'), h('span', {}, 'Functions'), h('b', { style: 'border-bottom:2px solid #2F6B4F' }, 'Book'), h('span', {}, 'Contact'))),
      h('div', { style: 'padding:22px 22px 0' }, h('h1', { style: "font-family:'Playfair Display',Georgia,serif; font-weight:600; font-size:28px; margin:0 0 4px" }, 'Book a table'), h('p', { style: 'margin:0; font-size:13px; opacity:0.75' }, 'Saturday dinner service. Tables of 2 to 8; larger groups, call us.'))), f.body);
    f.body.style.background = '#F8F3E8';
    function draw() {
      var W = 620, H = 160, bw = (W - 40) / slots.length;
      var svg = '<svg class="demo__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Covers per half hour">';
      slots.forEach(function (s, i) { var c = covers[i], bh = c / cap * (H - 50), over = c > cap * 0.9; svg += '<rect x="' + (20 + i * bw + 6) + '" y="' + (H - 30 - bh) + '" width="' + (bw - 12) + '" height="' + bh + '" fill="' + (c > cap ? '#dc2626' : over ? 'var(--p-warn)' : 'var(--p-accent)') + '"></rect><text x="' + (20 + i * bw + bw / 2) + '" y="' + (H - 12) + '" font-size="11" text-anchor="middle" fill="currentColor">' + s + '</text><text x="' + (20 + i * bw + bw / 2) + '" y="' + (H - 36 - bh) + '" font-size="11" text-anchor="middle" fill="currentColor">' + c + '</text>'; });
      svg += '<line x1="20" y1="' + (H - 30 - (H - 50)) + '" x2="' + (W - 20) + '" y2="' + (H - 30 - (H - 50)) + '" stroke="currentColor" stroke-dasharray="4 4"></line></svg>';
      chart.innerHTML = svg;
      var total = covers.reduce(function (a, b) { return a + b; }, 0), peak = Math.max.apply(null, covers), foh = Math.ceil(peak / 12), kitchen = Math.ceil(peak / 14);
      out.innerHTML = '';
      out.appendChild(h('span', {}, h('b', {}, total + ' covers booked, peak ' + peak + '.'), ' Roster that follows: ' + foh + ' floor, ' + kitchen + ' kitchen at peak, thinning after 20:00. ' + (peak > cap * 0.9 ? 'The 19:00 slot is at capacity; the widget will offer 18:30 or 19:30 automatically.' : 'Room at every slot.')));
    }
    function book() {
      var i = slots.indexOf(pick.slot);
      if (covers[i] + pick.size > cap) { var alt = slots.filter(function (s, j) { return covers[j] + pick.size <= cap; }); D.toast(f.root, pick.slot + ' is full for ' + pick.size + '. Offering ' + (alt.slice(0, 2).join(' or ') || 'the waitlist') + '.', 'bad'); f.status('slot full, alternatives offered', 'warn'); return; }
      covers[i] += pick.size; draw(); D.toast(f.root, 'Booked ' + pick.name + ', ' + pick.size + ' at ' + pick.slot + '. Confirmation SMS queued, kitchen sheet updated.', 'ok'); f.status('booked', 'ok');
    }
    f.body.appendChild(h('div', { class: 'demo__row' },
      ctl('Name', h('input', { class: 'demo__input', value: pick.name, oninput: function (e) { pick.name = e.target.value; } })),
      ctl('Party', D.select([2, 3, 4, 5, 6, 8].map(String), String(pick.size), function (v) { pick.size = +v; })),
      ctl('Time', D.select(slots, pick.slot, function (v) { pick.slot = v; })),
      D.btn('Book the table', book)));
    f.body.appendChild(chart); f.body.appendChild(out);
    draw();
    return f.root;
  });

  /* ---------------- PROFESSIONAL SERVICES: time to invoice ---------------- */
  D.register('pro-timesheet', function () {
    var f = D.frame({ kind: 'app', app: { name: 'Matterly', mark: 'M', accent: '#1E3A8A', side: '#0B1220', nav: [['Matters', 'doc'], ['Time', 'cal'], ['Invoices', 'dollar'], ['Clients', 'users'], ['Reports', 'chart']], active: 2, title: 'Invoice · Shareholders agreement', user: 'A. Whitfield' }, title: 'Matter time to invoice, fixed fee vs hourly', status: 'WIP loaded',
      note: 'Time captured once, priced two ways, invoiced with narrative lines a client will actually pay. The write-off flag is the honest bit most practices avoid looking at.' });
    var rate = 280, fixed = 2400;
    var entries = [['Initial consult and scoping', 1.5], ['Drafting: shareholders agreement', 4.2], ['Client revisions round 1', 1.8], ['Revisions round 2 (scope creep)', 2.6], ['Finalise and send', 0.7]];
    var mode = 'hourly', out = h('div');
    function draw() {
      var hours = entries.reduce(function (a, e) { return a + e[1]; }, 0), hourly = hours * rate;
      out.innerHTML = '';
      out.appendChild(D.table(['Narrative', 'Hours', mode === 'hourly' ? 'Amount' : 'Covered by fee'], entries.map(function (e) {
        return h('tr', { class: mode === 'fixed' && /creep/.test(e[0]) ? 'is-warn' : '' }, h('td', {}, e[0]), h('td', { class: 'num' }, e[1].toFixed(1)), h('td', { class: 'num' }, mode === 'hourly' ? money(e[1] * rate) : 'yes'));
      })));
      var inv = h('div', { class: 'demo__panel', style: 'margin-top:12px' }, h('h4', {}, 'Invoice preview'),
        h('div', { class: 'demo__kv' }, h('span', {}, 'Hours on the matter'), h('b', {}, hours.toFixed(1) + ' h'),
          h('span', {}, mode === 'hourly' ? 'Billed at ' + money(rate) + '/h' : 'Fixed fee agreed'), h('b', {}, money(mode === 'hourly' ? hourly : fixed)),
          h('span', {}, 'Effective rate'), h('b', {}, money((mode === 'hourly' ? hourly : fixed) / hours) + '/h'),
          h('span', {}, mode === 'fixed' ? 'Write-off vs hourly' : 'Client surprise risk'), h('b', { style: mode === 'fixed' && hourly > fixed ? 'color:#dc2626' : '' }, mode === 'fixed' ? money(Math.max(0, hourly - fixed)) : (hours > 8 ? 'high: no estimate was agreed' : 'low'))),
        h('p', { style: 'margin:10px 0 0; font-size:0.88rem' }, mode === 'fixed' ? 'The amber row is where fixed fees die: unscoped revisions. The system flags it at 80% of the fee so you can have the conversation before the write-off, not after.' : 'Hourly is honest to the effort and terrifying to the client. The system sends a WIP alert at the estimate so nobody is surprised by the number.'));
      out.appendChild(inv);
      f.status(mode === 'fixed' && hourly > fixed ? 'write-off ' + money(hourly - fixed) : 'invoice ready', mode === 'fixed' && hourly > fixed ? 'warn' : 'ok');
    }
    f.body.appendChild(h('div', { class: 'demo__row' }, ctl('Pricing', D.select([['hourly', 'Hourly at $280'], ['fixed', 'Fixed fee $2,400']], mode, function (v) { mode = v; draw(); })),
      D.btn('Add another revision round', function () { entries.push(['Client revisions round ' + (entries.filter(function (e) { return /revisions/.test(e[0]); }).length + 1) + ' (scope creep)', 1.9]); draw(); }, 'demo__btn--ghost')));
    f.body.appendChild(out);
    draw();
    return f.root;
  });

  /* ---------------- HEALTH: cancellations, waitlist, recalls ---------------- */
  D.register('health-waitlist', function () {
    var f = D.frame({ kind: 'app', app: { name: 'FrontDesk', mark: '+', accent: '#0D9488', side: '#0F2E2B', nav: [['Today', 'cal'], ['Waitlist', 'list'], ['Patients', 'users'], ['Recalls', 'bell'], ['Settings', 'cog']], active: 0, title: 'Tuesday', user: 'Reception' }, title: 'Cancellations that fill themselves', status: 'Tuesday, two practitioners',
      note: 'Built onto the practice software you already run: a cancellation frees the slot, the first matching waitlisted patient gets an SMS, the slot fills. The recall list is the quiet revenue most practices never chase.' });
    var appts = [['9:00', 'Dr Rao', 'M. Chen'], ['9:30', 'Dr Rao', 'P. Nair'], ['10:00', 'S. Wells (physio)', 'T. Okafor'], ['10:30', 'Dr Rao', 'J. Hargreaves'], ['11:00', 'S. Wells (physio)', 'L. Tran']];
    var wait = [['A. Whitfield', 'Dr Rao', 'any morning'], ['R. Singh', 'S. Wells (physio)', 'before 11'], ['D. Marsh', 'Dr Rao', 'any']];
    var recalls = [['K. Lowe', 'Dr Rao', 'review due 6 weeks ago'], ['B. Costa', 'S. Wells (physio)', 'plan said 4 weeks, 9 weeks ago']];
    var tbl = h('div'), log = h('pre', { class: 'demo__log' }), wl = h('div'), noshow = 0;
    function draw() {
      tbl.innerHTML = '';
      tbl.appendChild(D.table(['Time', 'With', 'Patient', ''], appts.map(function (a, i) {
        return h('tr', { class: a[2] ? '' : 'is-warn' }, h('td', {}, a[0]), h('td', {}, a[1]), h('td', {}, a[2] || h('i', { class: 'dim' }, 'open')),
          h('td', {}, a[2] ? D.btn('Cancel', function () { cancel(i); }, 'demo__btn--small demo__btn--ghost') : ''));
      })));
      wl.innerHTML = '';
      wl.appendChild(h('h4', {}, 'Waitlist (' + wait.length + ')'));
      wait.forEach(function (w) { wl.appendChild(h('div', { style: 'font-size:0.88rem; padding:4px 0; border-bottom:1px solid var(--line)' }, h('b', {}, w[0]), ' · ' + w[1] + ' · ' + w[2])); });
      f.status(appts.filter(function (a) { return !a[2]; }).length + ' open slots', 'ok');
    }
    function cancel(i) {
      var a = appts[i], who = a[2]; a[2] = '';
      logline(log, 'warn', '[' + stamp() + '] ' + who + ' cancelled ' + a[0] + ' with ' + a[1]);
      var idx = -1; wait.forEach(function (w, j) { if (idx < 0 && w[1] === a[1]) idx = j; });
      draw();
      if (idx < 0) { logline(log, 'dim', '[waitlist] nobody waiting for ' + a[1] + '; slot stays open, reception sees it'); return; }
      var w = wait[idx];
      logline(log, 'dim', '[sms] -> ' + w[0] + ': "A ' + a[0] + ' with ' + a[1] + ' has opened up today. Reply YES to take it."');
      setTimeout(function () { logline(log, 'ok', '[sms] <- ' + w[0] + ': "YES"'); a[2] = w[0]; wait.splice(idx, 1); logline(log, 'ok', '[filled] ' + a[0] + ' rebooked to ' + w[0] + '. Reception did nothing.'); draw(); }, 1400);
    }
    f.body.appendChild(h('div', { class: 'demo__grid', style: 'grid-template-columns:2fr 1fr' }, tbl, h('div', { class: 'demo__panel' }, wl,
      h('div', { style: 'margin-top:12px' }, D.btn('Run this week\'s recalls', function () { recalls.forEach(function (r) { logline(log, 'warn', '[recall] ' + r[0] + ' (' + r[1] + '): ' + r[2] + ' -> personal SMS drafted for practice approval'); }); logline(log, 'dim', '[recall] ' + recalls.length + ' patients who never rebooked. Retention, not marketing.'); }, 'demo__btn--small')))));
    f.body.appendChild(log);
    logline(log, 'dim', '[ready] cancel an appointment and watch the slot refill.');
    draw();
    return f.root;
  });

  /* ---------------- NOT-FOR-PROFITS: acquittal with provenance ---------------- */
  D.register('nfp-acquittal', function () {
    var f = D.frame({ kind: 'app', app: { name: 'Grantwise', mark: 'G', accent: '#16A34A', side: '#14291B', nav: [['Programs', 'clip'], ['Acquittals', 'doc'], ['Donations', 'dollar'], ['Contacts', 'users'], ['Reports', 'chart']], active: 1, title: 'Employment Pathways · Q1 acquittal', user: 'K. Lowe' }, title: 'Funder report with provenance, receipting on rails', status: 'program data loaded',
      note: 'Program data captured once becomes the acquittal, and every figure points at its source rows. Receipts issue themselves from the donation record. No volunteer\'s Tuesday required.' });
    var sessions = [['12 Aug', 'Job-ready workshop', 14, 9], ['19 Aug', 'Job-ready workshop', 11, 7], ['21 Aug', 'One-to-one mentoring', 6, 6], ['26 Aug', 'Job-ready workshop', 16, 12], ['28 Aug', 'Employer meet-up', 22, 15]];
    var out = h('div'), rec = h('div');
    function report() {
      var s = sessions.length, p = sessions.reduce(function (a, x) { return a + x[2]; }, 0), o = sessions.reduce(function (a, x) { return a + x[3]; }, 0);
      out.innerHTML = '';
      out.appendChild(h('div', { class: 'demo__panel' }, h('h4', {}, 'Q1 acquittal: Employment Pathways grant'),
        h('div', { class: 'demo__kv' }, h('span', {}, 'Sessions delivered'), h('b', {}, s + ' ', h('span', { class: 'demo__pill demo__pill--dim' }, 'rows 1-' + s)),
          h('span', {}, 'Participant attendances'), h('b', {}, p + ' ', h('span', { class: 'demo__pill demo__pill--dim' }, 'sum of col 3')),
          h('span', {}, 'Recorded outcomes'), h('b', {}, o + ' ', h('span', { class: 'demo__pill demo__pill--dim' }, 'sum of col 4')),
          h('span', {}, 'Outcome rate'), h('b', {}, Math.round(o / p * 100) + '%'),
          h('span', {}, 'Milestone (60 attendances)'), h('b', {}, p >= 60 ? 'met' : (60 - p) + ' short')),
        h('p', { style: 'margin:10px 0 0; font-size:0.88rem' }, 'Every number above is traceable to the table. When the funder asks "show me", the answer is a click, not a fortnight of archaeology.')));
      f.status('acquittal generated', 'ok');
    }
    var n = 1040;
    function receipt() {
      var amt = [50, 120, 250, 1000][n % 4]; n++;
      rec.innerHTML = '';
      rec.appendChild(h('div', { class: 'demo__panel', style: 'font-family:var(--mono); font-size:0.82rem' }, h('div', { style: 'font-weight:700' }, 'RECEIPT ' + n), h('div', {}, 'Received with thanks: ' + money(amt)), h('div', {}, 'From: J. Hargreaves · Date: ' + new Date().toLocaleDateString('en-AU')), h('div', { class: 'dim' }, 'Gift to a deductible gift recipient (wording per your ATO status)'), h('div', { class: 'dim' }, 'Posted to CRM contact and to accounting (Xero) as income: Donations. Same second.')));
      D.toast(f.root, 'Receipt ' + n + ' issued and emailed. Nobody typed anything.', 'ok');
    }
    f.body.appendChild(D.table(['Date', 'Activity', 'Attendances', 'Outcomes'], sessions.map(function (x) { return h('tr', {}, h('td', {}, x[0]), h('td', {}, x[1]), h('td', { class: 'num' }, String(x[2])), h('td', { class: 'num' }, String(x[3]))); })));
    f.body.appendChild(h('div', { class: 'demo__row' }, D.btn('Generate the funder report', report), D.btn('Add a session', function () { sessions.push(['2 Sep', 'Job-ready workshop', 13, 8]); f.body.replaceChild(D.table(['Date', 'Activity', 'Attendances', 'Outcomes'], sessions.map(function (x) { return h('tr', {}, h('td', {}, x[0]), h('td', {}, x[1]), h('td', { class: 'num' }, String(x[2])), h('td', { class: 'num' }, String(x[3]))); })), f.body.firstChild); report(); }, 'demo__btn--ghost'), D.btn('Record a donation', receipt, 'demo__btn--ghost')));
    f.body.appendChild(out); f.body.appendChild(rec);
    report();
    return f.root;
  });

  /* ---------------- REAL ESTATE: the portfolio view and the owner report ---------------- */
  D.register('re-portfolio', function () {
    var f = D.frame({ kind: 'app', app: { name: 'RentRoll', mark: 'R', accent: '#9F1239', side: '#2A0A14', nav: [['Portfolio', 'home'], ['Arrears', 'dollar'], ['Leases', 'doc'], ['Owners', 'users'], ['Reports', 'chart']], active: 0, title: 'Portfolio', user: 'Kate Reid' }, title: 'The rent roll, one level up', status: 'Monday morning',
      note: 'Your property platform holds the properties; this layer holds the judgement: arrears by age, leases about to lapse, and an owner report that reads like advice. Data out on a schedule, in your branding, in your accounts.' });
    var props = [['12 Elm St, Prospect', 'Kate', 620, 0, 240], ['4/88 Bay Rd, Glenelg', 'Kate', 540, 16, 61], ['31 Orchard Ave, Unley', 'Dev', 890, 3, 402], ['7 Mill Ct, Norwood', 'Dev', 710, 29, 18], ['2/15 Park Tce, Marion', 'Kate', 480, 0, 88], ['66 Grange Rd, Findon', 'Dev', 595, 44, 130]];
    var mgr = '', tbl = h('div'), tiles = h('div', { class: 'demo__grid', style: 'grid-template-columns:repeat(auto-fit,minmax(140px,1fr))' }), rep = h('div');
    function draw() {
      var rows = props.filter(function (p) { return !mgr || p[1] === mgr; });
      var arr14 = rows.filter(function (p) { return p[3] >= 14 && p[3] < 28; }).length, arr28 = rows.filter(function (p) { return p[3] >= 28; }).length, exp = rows.filter(function (p) { return p[4] <= 90; }).length;
      tiles.innerHTML = '';
      [['Properties', rows.length], ['Arrears 14-28d', arr14, arr14 ? 'warn' : ''], ['Arrears 28d+', arr28, arr28 ? 'bad' : ''], ['Leases ending <90d', exp, exp ? 'warn' : '']].forEach(function (t) { tiles.appendChild(h('div', { class: 'demo__panel' }, h('div', { class: 'demo__big', style: t[2] === 'bad' ? 'color:#dc2626' : t[2] === 'warn' ? 'color:#d97706' : '' }, String(t[1])), h('div', { class: 'dim', style: 'font-size:0.82rem' }, t[0]))); });
      tbl.innerHTML = '';
      tbl.appendChild(D.table(['Property', 'Manager', 'Rent/wk', 'Arrears', 'Lease ends', ''], rows.map(function (p) {
        return h('tr', { class: p[3] >= 28 ? 'is-bad' : p[3] >= 14 || p[4] <= 90 ? 'is-warn' : '' }, h('td', {}, p[0]), h('td', {}, p[1]), h('td', { class: 'num' }, money(p[2])), h('td', {}, p[3] ? h('span', { class: 'demo__pill demo__pill--' + (p[3] >= 28 ? 'bad' : 'warn') }, p[3] + ' days') : h('span', { class: 'demo__pill demo__pill--ok' }, 'current')), h('td', {}, p[4] + ' days' + (p[4] <= 90 ? ' ⚠' : '')), h('td', {}, D.btn('Owner report', function () { report(p); }, 'demo__btn--small demo__btn--ghost')));
      })));
    }
    function report(p) {
      rep.innerHTML = '';
      rep.appendChild(h('div', { class: 'demo__panel' }, h('h4', {}, 'Quarterly owner report: ' + p[0]),
        h('p', { style: 'margin:0 0 8px; font-size:0.9rem' }, 'Rent ' + money(p[2]) + '/week, ' + (p[3] ? 'currently ' + p[3] + ' days in arrears; our follow-up sequence started at day 14 and a payment plan is in place.' : 'paid to date with no arrears this quarter.') + ' Comparable listings in the suburb sit ' + (p[2] < 600 ? 'around $30 to $50 above' : 'in line with') + ' your rent; ' + (p[4] <= 90 ? 'with the lease ending in ' + p[4] + ' days, we recommend opening the renewal conversation now with a modest increase.' : 'no action needed before the next review.')),
        h('p', { style: 'margin:0; font-size:0.85rem; color:var(--fg-mute)' }, 'Assembled from your property platform\'s data automatically, edited by your property manager in two minutes, sent in your branding. Four times a year, forever, without the swivel-chair audit.')));
      f.status('owner report drafted', 'ok');
    }
    f.body.appendChild(h('div', { class: 'demo__row' }, ctl('Property manager', D.select([['', 'Everyone'], 'Kate', 'Dev'], mgr, function (v) { mgr = v; draw(); }))));
    f.body.appendChild(tiles); f.body.appendChild(tbl); f.body.appendChild(rep);
    draw(); f.status('2 arrears past 28 days', 'warn');
    return f.root;
  });

  /* ---------------- AGRICULTURE: spray windows and the compliance record ---------------- */
  D.register('agri-spray', function () {
    var f = D.frame({ kind: 'app', app: { name: 'Paddock', mark: 'P', accent: '#4D7C0F', side: '#1A2E05', nav: [['Spray planner', 'cal'], ['Paddocks', 'map'], ['Records', 'doc'], ['Weather', 'chart'], ['Settings', 'cog']], active: 0, title: 'Spray planner · this week', user: 'B. Costa' }, title: 'Spray window finder and the record it writes', status: 'pick a paddock',
      note: 'Forecast plus label rules plus your paddocks: the days you can legally and sensibly spray, the withholding date computed, and the compliance record written as you go. Same shape for harvest windows, irrigation and stock movements.' });
    var days = [['Mon', 12, 0, 24], ['Tue', 22, 0, 27], ['Wed', 8, 6, 19], ['Thu', 6, 0, 21], ['Fri', 18, 0, 29], ['Sat', 4, 0, 22], ['Sun', 9, 12, 17]];
    var paddocks = ['North 40 (wheat)', 'Creek (canola)', 'Back block (barley)'], chems = [['glyphosate', 7], ['fungicide X', 14], ['insecticide Y', 21]];
    var st = { pad: paddocks[0], chem: 0 }, out = h('div'), log = h('pre', { class: 'demo__log' });
    function ok(d) { return d[1] <= 15 && d[2] === 0 && d[3] <= 28; }
    function draw() {
      out.innerHTML = '';
      out.appendChild(h('div', { class: 'demo__cal' }, days.map(function (d) {
        var good = ok(d), why = d[1] > 15 ? 'wind ' + d[1] + 'km/h' : d[2] ? 'rain ' + d[2] + 'mm' : d[3] > 28 ? 'too hot' : 'window';
        return h('button', { type: 'button', class: good ? '' : 'taken', title: why, onclick: function () { if (!good) return; var wh = chems[st.chem][1], end = new Date(); end.setDate(end.getDate() + wh); logline(log, 'ok', '[' + stamp() + '] ' + st.pad + ': ' + chems[st.chem][0] + ' applied ' + d[0] + ' (wind ' + d[1] + ', ' + d[3] + '°C). Withholding ' + wh + ' days -> harvest/graze after ' + end.toLocaleDateString('en-AU') + '. Record signed.'); D.toast(f.root, 'Logged. The compliance record wrote itself.', 'ok'); } }, h('b', {}, d[0]), h('br'), h('span', { style: 'font-size:0.72rem' }, why));
      })));
      f.status(days.filter(ok).length + ' spray days this week', 'ok');
    }
    f.body.appendChild(h('div', { class: 'demo__row' }, ctl('Paddock', D.select(paddocks, st.pad, function (v) { st.pad = v; })), ctl('Product', D.select(chems.map(function (c, i) { return [String(i), c[0] + ' (WHP ' + c[1] + 'd)']; }), '0', function (v) { st.chem = +v; })), h('span', { class: 'dim', style: 'font-size:0.86rem' }, 'click a green day to apply and log it')));
    f.body.appendChild(out); f.body.appendChild(log);
    logline(log, 'dim', '[rules] wind under 15 km/h, no rain in the window, under 28°C. Label limits load per product.');
    draw();
    return f.root;
  });

  /* ---------------- GOVERNMENT: assessment with an audit trail ---------------- */
  D.register('gov-assessment', function () {
    var f = D.frame({ kind: 'app', app: { name: 'Assess', mark: 'A', accent: '#1D4ED8', side: '#1F2937', nav: [['Queue', 'inbox'], ['Assessments', 'clip'], ['Decisions', 'check'], ['Audit trail', 'list'], ['Reports', 'chart']], active: 1, title: 'Assessment', user: 'A. Steele' }, title: 'Application assessment, defensible by design', status: 'queue: 3 applications',
      note: 'The shape of every eligibility, grant and approval workflow I have built inside government: criteria you can point to, a recommendation with reasons, and an audit trail that survives an FOI request. Accessible, boring, correct.' });
    var apps = [['APP-3041', 'Hargreaves Cafe', 'Shopfront activation grant'], ['APP-3042', 'Marion Netball Club', 'Community facilities'], ['APP-3043', 'Okafor Group', 'Shopfront activation grant']];
    var criteria = [['Eligible entity (ABN, in LGA)', 'gate'], ['Application complete', 'gate'], ['Community benefit evidenced', 3], ['Value for money', 3], ['Capability to deliver', 2]];
    var cur = 0, scores = {}, out = h('div'), log = h('pre', { class: 'demo__log' });
    function draw() {
      var a = apps[cur], sc = scores[a[0]] = scores[a[0]] || {};
      out.innerHTML = '';
      out.appendChild(h('div', { class: 'demo__panel' }, h('h4', {}, a[0] + ' · ' + a[1] + ' · ' + a[2]),
        criteria.map(function (c, i) {
          return h('div', { class: 'demo__row', style: 'justify-content:space-between; border-bottom:1px solid var(--line); padding:6px 0' }, h('span', { style: 'font-size:0.9rem' }, c[0], c[1] === 'gate' ? h('span', { class: 'demo__pill demo__pill--dim', style: 'margin-left:6px' }, 'gate') : ''),
            h('span', { class: 'demo__chips' }, (c[1] === 'gate' ? [['yes', 'Met'], ['no', 'Not met']] : [['0', '0'], ['1', '1'], ['2', '2'], ['3', '3']].slice(0, c[1] + 1)).map(function (o) {
              return h('button', { class: 'demo__chip demo__btn--small', type: 'button', 'aria-pressed': sc[i] === o[0], onclick: function () { sc[i] = o[0]; logline(log, 'dim', '[' + stamp() + '] ' + a[0] + ' · "' + c[0] + '" scored ' + o[1] + ' by assessor A. Steele'); draw(); } }, o[1]);
            })));
        }),
        recommend(a, sc)));
    }
    function recommend(a, sc) {
      var gates = criteria.map(function (c, i) { return c[1] === 'gate' ? sc[i] : null; }).filter(function (x) { return x !== null; });
      if (gates.some(function (g) { return g === undefined; })) return h('p', { style: 'margin:10px 0 0; font-size:0.9rem' }, 'Recommendation appears when the gates are assessed.');
      if (gates.some(function (g) { return g === 'no'; })) return h('p', { style: 'margin:10px 0 0; font-size:0.9rem' }, h('b', {}, 'Recommend: ineligible.'), ' A gate criterion is not met; scoring does not proceed and the reason is recorded verbatim for the applicant letter.');
      var tot = 0, max = 0, done = true; criteria.forEach(function (c, i) { if (c[1] !== 'gate') { max += c[1]; if (sc[i] === undefined) done = false; else tot += +sc[i]; } });
      if (!done) return h('p', { style: 'margin:10px 0 0; font-size:0.9rem' }, 'Gates met. Score the remaining criteria for a recommendation.');
      var p = tot / max;
      return h('p', { style: 'margin:10px 0 0; font-size:0.9rem' }, h('b', {}, 'Recommend: ' + (p >= 0.7 ? 'approve' : p >= 0.5 ? 'approve subject to conditions' : 'decline') + ' (' + tot + '/' + max + ').'), ' Reasons are the scored criteria above, in the applicant\'s letter and the delegate\'s brief, word for word. Nobody has to remember why.');
    }
    f.body.appendChild(h('div', { class: 'demo__chips' }, apps.map(function (a, i) { return h('button', { class: 'demo__chip', type: 'button', 'aria-pressed': cur === i, onclick: function () { cur = i; f.body.querySelectorAll('.demo__chips')[0].querySelectorAll('button').forEach(function (b, j) { b.setAttribute('aria-pressed', j === i); }); draw(); } }, a[0]); })));
    f.body.appendChild(out); f.body.appendChild(log);
    logline(log, 'dim', '[' + stamp() + '] audit trail open. FOI-ready by construction: every score, who, when.');
    draw();
    return f.root;
  });

  /* ---------------- EDUCATION: enrolment that validates at the door ---------------- */
  D.register('edu-enrolment', function () {
    var f = D.frame({ kind: 'browser', browser: { url: 'adelaideskills.edu.au', path: '/enrol/CPC30220' }, accent: '#B91C1C', title: 'Enrolment form that refuses bad AVETMISS data', status: 'try to enrol',
      note: 'Every error caught here is one that does not appear in the reporting week. The same checks run weekly against the student system so the deadline finds a clean file. Whatever student system you run, the point of entry is the point.' });
    var v = { name: 'Priya Nair', usi: 'AB12CD34E', pc: '50', fund: '', course: 'CPC30220 · Feb intake' };
    var errs = h('ul', { style: 'margin:0; padding-left:1.1em; font-size:0.88rem; display:grid; gap:4px' }), ok = h('div');
    f.device.body.insertBefore(h('div', { style: 'font-family:Inter,system-ui,sans-serif' },
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; padding:12px 22px; background:#B91C1C; color:#fff' }, h('b', { style: 'font-size:16px; letter-spacing:-0.01em' }, 'Adelaide Skills Institute'), h('span', { style: 'font-size:12px; opacity:0.9' }, 'RTO 40000 · Courses · Enrol · Student portal')),
      h('div', { style: 'padding:20px 22px 0' }, h('div', { style: 'font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:#B91C1C; font-weight:600' }, 'Step 2 of 3'), h('h1', { style: 'font-size:24px; margin:4px 0 2px; letter-spacing:-0.01em' }, 'Your details'), h('p', { style: 'margin:0; font-size:13px; color:#6B7280' }, 'We check these as you type so your enrolment is not bounced later.'))), f.body);
    function validate() {
      var e = [];
      if (!/^[A-Z0-9]{10}$/i.test(v.usi)) e.push('USI must be 10 characters (letters and digits). Yours has ' + v.usi.length + '.');
      else if (/[IO01]/i.test(v.usi)) e.push('USI never contains I, O, 0 or 1; this one does. Likely a typo from a scanned form.');
      if (!/^\d{4}$/.test(v.pc)) e.push('Postcode must be four digits.');
      else if (+v.pc < 200 || +v.pc > 9999) e.push('Postcode outside the Australian range.');
      if (!v.fund) e.push('Funding source is required; the state contract code determines what is reported.');
      if (!v.name.trim()) e.push('Name is required.');
      errs.innerHTML = '';
      e.forEach(function (x) { errs.appendChild(h('li', {}, x)); });
      ok.innerHTML = '';
      if (!e.length) { ok.appendChild(h('span', { class: 'demo__pill demo__pill--ok' }, 'AVETMISS-clean: this record will validate at export')); f.status('clean', 'ok'); }
      else f.status(e.length + ' error' + (e.length === 1 ? '' : 's') + ' caught at entry', 'warn');
      return !e.length;
    }
    function field(label, key, opts) {
      var inp = opts ? D.select(opts, v[key], function (x) { v[key] = x; validate(); }) : h('input', { class: 'demo__input', value: v[key], oninput: function (ev) { v[key] = ev.target.value; validate(); } });
      return ctl(label, inp);
    }
    f.body.appendChild(h('div', { class: 'demo__grid' },
      h('div', { style: 'display:grid; gap:10px' }, field('Student name', 'name'), field('USI', 'usi'), field('Postcode', 'pc'),
        field('Funding source', 'fund', [['', 'Select...'], ['11', '11 Commonwealth general'], ['15', '15 State training authority (SA)'], ['20', '20 Fee for service']]),
        field('Course and intake', 'course', ['CPC30220 · Feb intake', 'BSB40520 · Mar intake', 'HLT33115 · Feb intake']),
        D.btn('Enrol', function () { if (validate()) D.toast(f.root, 'Enrolled. Student record created, payment link sent, trainer roster updated, USI verified overnight.', 'ok'); else D.toast(f.root, 'Not enrolled: fix the errors first. That is the whole point.', 'bad'); })),
      h('div', { class: 'demo__panel' }, h('h4', {}, 'Validation, live'), errs, ok,
        h('h4', { style: 'margin-top:14px' }, 'This week\'s sweep (the other half)'), h('div', { style: 'font-size:0.86rem; display:grid; gap:4px' },
          h('div', {}, h('span', { class: 'demo__pill demo__pill--warn' }, '12'), ' enrolments missing USI, owner: admissions'),
          h('div', {}, h('span', { class: 'demo__pill demo__pill--warn' }, '8'), ' outcomes overdue past activity end, owner: trainers'),
          h('div', {}, h('span', { class: 'demo__pill demo__pill--ok' }, '0'), ' invalid funding codes'),
          h('p', { class: 'dim', style: 'margin:6px 0 0' }, 'Fifty small errors a week is admin. Two thousand at the deadline is the week of pain.')))));
    validate();
    return f.root;
  });

})(window.Demos);
