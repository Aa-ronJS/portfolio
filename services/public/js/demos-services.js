/* Live builds for the ten service pages. Each one is the finished thing a
   buyer would get, working in their browser: not a tool about their
   problem, the end result. */
(function (D) {
  var h = D.h, money = D.money, fmt = D.fmt;
  function ctl(label, node) { return h('label', { class: 'demo__label' }, label, node); }
  function logline(log, cls, text) { log.appendChild(h('div', { class: cls }, text)); log.scrollTop = log.scrollHeight; }

  /* Shared: four example businesses, so demos can re-skin to the visitor. */
  var BIZ = {
    sparky: { name: 'Hargreaves Electrical', tag: 'Licensed electricians, Adelaide hills to the coast', accent: '#D9482B', ink: '#1F1D1A', paper: '#FBF7EF',
      services: [['Switchboard upgrades', 'Old fuse boxes replaced with compliant, safe boards.'], ['Emergency call-outs', 'Same-day for power loss, burning smells, tripping switches.'], ['EV charger installs', 'Home and workplace chargers, wired and certified.']],
      about: 'Two brothers, one van each, fifteen years on the tools. We turn up when we said, and we clean up.', suburbs: 'Stirling, Mount Barker, Norwood, Glenelg', phone: '0412 555 019' },
    cafe: { name: 'Bella Vista Cafe', tag: 'Breakfast, lunch and very good coffee, Glenelg', accent: '#2F6B4F', ink: '#1E211F', paper: '#F7F4EC',
      services: [['All-day breakfast', 'Until 2:30, every day, no exceptions.'], ['Catering', 'Boxes and platters for offices and events, ordered online.'], ['Functions', 'The back room seats 30 for evenings and Sundays.']],
      about: 'Family-run since 2011. Beans from a local roaster, bread baked overnight, staff who remember your order.', suburbs: 'Glenelg, Brighton, Somerton Park', phone: '08 8295 0141' },
    physio: { name: 'Nair Physiotherapy', tag: 'Movement, recovery and honest advice, Norwood', accent: '#2B5FA8', ink: '#1B1F26', paper: '#F5F7FA',
      services: [['Sports injuries', 'Assessment, rehab plans and return-to-play timelines.'], ['Back and neck pain', 'Hands-on treatment plus the exercises that actually stick.'], ['Post-surgery rehab', 'Working with your surgeon\'s protocol, not against it.']],
      about: 'Three physios, no upselling. If you need two sessions, you will be told two sessions.', suburbs: 'Norwood, Kent Town, Payneham', phone: '08 8362 7710' },
    accountant: { name: 'Okafor & Co', tag: 'Accountants for trades and small business, Unley', accent: '#8A5A2B', ink: '#1E1B17', paper: '#FAF6EF',
      services: [['Tax and BAS', 'Lodged on time, explained in plain words, no surprises.'], ['Bookkeeping', 'Xero kept clean monthly so year-end is a formality.'], ['Structure advice', 'Sole trader, company or trust: the right answer for you, not the fanciest.']],
      about: 'Twelve years of keeping tradies and shop owners out of trouble with the ATO. We speak human.', suburbs: 'Unley, Parkside, Mitcham', phone: '08 8272 3390' }
  };
  var BIZ_OPTS = [['sparky', 'An electrician'], ['cafe', 'A cafe'], ['physio', 'A physio clinic'], ['accountant', 'An accountant']];

  /* Render a finished small-business website into a frame. */
  function miniSite(biz, opts) {
    opts = opts || {};
    var page = 'home', form = { sent: false };
    var root = h('div', { class: 'ms', style: 'background:' + biz.paper + '; color:' + biz.ink + '; font-family:var(--body); border:2px solid var(--ink); overflow:hidden; min-height:520px; display:flex; flex-direction:column' });
    function nav() {
      return h('div', { style: 'display:flex; gap:6px 16px; align-items:center; justify-content:space-between; flex-wrap:wrap; padding:14px 18px; border-bottom:2px solid ' + biz.ink },
        h('b', { style: 'font-family:var(--display); font-size:1.1rem' }, biz.name),
        h('span', { style: 'display:flex; gap:12px; font-size:0.85rem; font-weight:600' }, ['home', 'services', 'about', 'contact'].map(function (p) {
          return h('a', { href: '#', style: 'text-decoration:' + (page === p ? 'underline' : 'none') + '; color:inherit; text-underline-offset:4px; text-decoration-color:' + biz.accent, onclick: function (e) { e.preventDefault(); page = p; draw(); } }, p[0].toUpperCase() + p.slice(1));
        })));
    }
    function btn(label, onclick) { return h('button', { type: 'button', style: 'font:700 0.9rem var(--body); background:' + biz.accent + '; color:#fff; border:0; padding:11px 18px; cursor:pointer', onclick: onclick }, label); }
    function body() {
      var wrap = h('div', { style: 'padding:22px 18px; flex:1' });
      if (page === 'home') {
        wrap.appendChild(h('div', { style: 'display:grid; gap:14px' },
          h('h3', { style: 'font-family:var(--display); font-size:clamp(1.5rem,3vw,2.2rem); line-height:1.05; margin:0; max-width:18ch' }, biz.tag),
          h('p', { style: 'margin:0; max-width:48ch; font-size:0.95rem' }, biz.about),
          h('div', { style: 'display:flex; gap:10px; flex-wrap:wrap' }, btn('Call ' + biz.phone, function () { D.toast(opts.toastRoot || root, 'On a phone this dials. That is the whole point of the button.', 'ok'); }), h('button', { type: 'button', style: 'font:700 0.9rem var(--body); background:none; border:2px solid ' + biz.ink + '; padding:9px 16px; cursor:pointer; color:inherit', onclick: function () { page = 'contact'; draw(); } }, 'Get a quote')),
          h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; margin-top:6px' }, biz.services.map(function (s) { return h('div', { style: 'border-top:3px solid ' + biz.accent + '; padding-top:8px' }, h('b', { style: 'display:block; font-size:0.92rem' }, s[0]), h('span', { style: 'font-size:0.82rem; opacity:0.8' }, s[1])); })),
          h('p', { style: 'margin:6px 0 0; font-size:0.8rem; opacity:0.7' }, 'Serving ' + biz.suburbs + '. Reviews: 4.9 from 112 Google reviews.')));
      } else if (page === 'services') {
        wrap.appendChild(h('h3', { style: 'font-family:var(--display); font-size:1.5rem; margin:0 0 12px' }, 'What we do'));
        biz.services.forEach(function (s) { wrap.appendChild(h('div', { style: 'padding:12px 0; border-bottom:1px solid rgba(0,0,0,0.12)' }, h('b', {}, s[0]), h('p', { style: 'margin:4px 0 0; font-size:0.9rem' }, s[1] + ' Fixed price quoted before we start.'))); });
      } else if (page === 'about') {
        wrap.appendChild(h('h3', { style: 'font-family:var(--display); font-size:1.5rem; margin:0 0 12px' }, 'About us'));
        wrap.appendChild(h('p', { style: 'margin:0 0 10px; font-size:0.95rem; max-width:52ch' }, biz.about));
        wrap.appendChild(h('div', { style: 'display:flex; gap:10px; flex-wrap:wrap' }, ['Owner', 'Team', 'The van'].map(function (c, i) { return h('div', { style: 'width:120px; height:84px; background:' + biz.accent + (i ? '22' : '') + '; border:2px solid ' + biz.ink + '; display:grid; place-items:center; font-size:0.75rem; font-weight:700' }, c + ' photo'); })));
      } else {
        wrap.appendChild(h('h3', { style: 'font-family:var(--display); font-size:1.5rem; margin:0 0 12px' }, 'Get in touch'));
        if (form.sent) wrap.appendChild(h('div', { style: 'border:2px solid ' + biz.accent + '; padding:14px' }, h('b', {}, 'Thanks, ' + (form.name || 'there') + '.'), h('p', { style: 'margin:6px 0 0; font-size:0.9rem' }, 'Your message landed in our inbox and our job system at the same time. Expect a call within the hour on a weekday.')));
        else {
          var name = h('input', { placeholder: 'Your name', style: 'font:inherit; padding:10px; border:2px solid ' + biz.ink + '; width:100%', oninput: function (e) { form.name = e.target.value; } });
          wrap.appendChild(h('div', { style: 'display:grid; gap:10px; max-width:420px' }, name, h('input', { placeholder: 'Phone or email', style: 'font:inherit; padding:10px; border:2px solid ' + biz.ink + '; width:100%' }), h('textarea', { placeholder: 'What do you need?', rows: 3, style: 'font:inherit; padding:10px; border:2px solid ' + biz.ink + '; width:100%' }), btn('Send', function () { form.sent = true; draw(); })));
        }
      }
      return wrap;
    }
    function draw() { root.innerHTML = ''; root.appendChild(nav()); root.appendChild(body()); root.appendChild(h('div', { style: 'padding:10px 18px; border-top:1px solid rgba(0,0,0,0.12); font-size:0.75rem; opacity:0.7; display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px' }, h('span', {}, biz.name + ' · ABN 00 000 000 000'), h('span', {}, 'Built by Aaron Steele'))); }
    draw();
    return { root: root, go: function (p) { page = p; draw(); } };
  }

  /* ------------------------------------------------------------------ */
  /* WordPress: the finished website, re-skinned to your business        */
  /* ------------------------------------------------------------------ */
  D.register('wordpress-site', function () {
    var f = D.frame({ title: 'A finished small-business website', status: 'click around the site',
      note: 'This is the deliverable: a fast five-page site that reads well on a phone, takes enquiries, and is owned by you. Pick a business type to see the same build re-skinned in one click.' });
    var key = 'sparky', width = 'desktop', holder = h('div');
    function draw() {
      holder.innerHTML = '';
      var site = miniSite(BIZ[key], { toastRoot: f.root });
      holder.appendChild(h('div', { style: 'margin:0 auto; max-width:' + (width === 'phone' ? '390px' : '100%') + '; transition:max-width 300ms' }, site.root));
      f.status(BIZ[key].name + ' · ' + width, 'ok');
    }
    f.body.appendChild(h('div', { class: 'demo__row' }, ctl('Business type', D.select(BIZ_OPTS, key, function (v) { key = v; draw(); })), ctl('View', D.select([['desktop', 'Desktop'], ['phone', 'Phone']], width, function (v) { width = v; draw(); }))));
    f.body.appendChild(holder);
    draw();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Website rebuild: before and after, same business, same URLs         */
  /* ------------------------------------------------------------------ */
  D.register('rebuild-before-after', function () {
    var f = D.frame({ title: 'The rebuild: drag to compare', status: 'drag the handle',
      note: 'Same business, same domain, same page addresses redirected so the Google rankings the old site earned carry over. The after is a live site you can click; the before is the reason they rang.' });
    var biz = BIZ.accountant;
    var before = h('div', { style: 'position:absolute; inset:0; background:#fff; color:#333; font-family:Times New Roman, serif; overflow:hidden' },
      h('div', { style: 'background:#003366; color:#fff; padding:10px 14px; font-size:20px; font-weight:bold' }, 'OKAFOR & CO ACCOUNTANTS PTY LTD'),
      h('div', { style: 'display:flex; gap:10px; padding:6px 14px; background:#e6e6e6; font-size:13px' }, ['Home', 'About Us', 'Services', 'Links', 'Contact Us'].map(function (t) { return h('u', {}, t); })),
      h('div', { style: 'padding:14px; font-size:14px; line-height:1.4' },
        h('p', { style: 'margin:0 0 8px' }, h('b', {}, 'Welcome to our website!!')), h('p', { style: 'margin:0 0 8px' }, 'Okafor & Co has been providing quality accounting solutions since 2013. We are committed to excellence. Click ', h('u', {}, 'here'), ' to download our brochure (PDF, 8MB).'),
        h('table', { border: '1', cellpadding: '6', style: 'font-size:13px; border-collapse:collapse; margin-top:8px' }, h('tr', {}, h('td', {}, 'Tax Returns'), h('td', {}, 'Call for pricing')), h('tr', {}, h('td', {}, 'BAS'), h('td', {}, 'Call for pricing'))),
        h('p', { style: 'margin:10px 0 0; font-size:11px; color:#888' }, 'Last updated: March 2017. Best viewed in Internet Explorer.')));
    var after = h('div', { style: 'position:absolute; inset:0; overflow:hidden' }, miniSite(biz, { toastRoot: f.root }).root);
    var pos = 50;
    var stage = h('div', { style: 'position:relative; height:520px; border:2px solid var(--ink); overflow:hidden; background:var(--bone)' });
    var afterClip = h('div', { style: 'position:absolute; inset:0; clip-path:inset(0 0 0 ' + pos + '%)' }, after);
    var handle = h('div', { style: 'position:absolute; top:0; bottom:0; left:' + pos + '%; width:4px; background:var(--amber-deep); pointer-events:none' }, h('span', { style: 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--amber); border:2px solid var(--ink); font:700 0.72rem var(--body); padding:4px 8px; white-space:nowrap' }, '◀ before · after ▶'));
    var range = h('input', { type: 'range', min: 0, max: 100, value: pos, style: 'width:100%', 'aria-label': 'Reveal before and after', oninput: function (e) { pos = +e.target.value; afterClip.style.clipPath = 'inset(0 0 0 ' + pos + '%)'; handle.style.left = pos + '%'; f.status(pos < 30 ? 'mostly the old site' : pos > 70 ? 'mostly the rebuild' : 'half and half', pos > 70 ? 'ok' : pos < 30 ? 'warn' : ''); } });
    stage.appendChild(before); stage.appendChild(afterClip); stage.appendChild(handle);
    f.body.appendChild(stage); f.body.appendChild(range);
    f.body.appendChild(h('div', { class: 'demo__grid' },
      h('div', { class: 'demo__panel' }, h('h4', {}, 'What carried over'), h('div', { class: 'demo__kv' }, h('span', {}, 'Old addresses'), h('b', {}, '14 of 14 redirected'), h('span', {}, 'Google rankings'), h('b', {}, 'kept (the redirects do this)'), h('span', {}, 'Content'), h('b', {}, 'rewritten, nothing invented'), h('span', {}, 'Domain and email'), h('b', {}, 'untouched'))),
      h('div', { class: 'demo__panel' }, h('h4', {}, 'What changed'), h('div', { class: 'demo__kv' }, h('span', {}, 'Load on a phone'), h('b', {}, '6.8 s → 1.2 s'), h('span', {}, 'Pricing'), h('b', {}, '"call for pricing" → fixed, published'), h('span', {}, 'Enquiries'), h('b', {}, 'a form that lands in the inbox and the CRM'), h('span', {}, 'Ownership'), h('b', {}, 'everything in the client\'s name')))));
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* E-commerce: a store that takes an order, end to end                 */
  /* ------------------------------------------------------------------ */
  D.register('store-checkout', function () {
    var f = D.frame({ title: 'A working online store', status: 'add something to the cart',
      note: 'Products, cart, checkout, confirmation, and the part customers never see: stock adjusted, the sale posted to accounting, the fulfilment email queued. All in one motion, no retyping.' });
    var products = [{ id: 1, name: 'Enamel camp mug', price: 24, stock: 6 }, { id: 2, name: 'Wool blend beanie', price: 39, stock: 3 }, { id: 3, name: 'Canvas tote', price: 32, stock: 11 }, { id: 4, name: 'Gift card $50', price: 50, stock: 99, gift: true }];
    var cart = {}, step = 'shop', order = null, out = h('div');
    function total() { return Object.keys(cart).reduce(function (a, id) { var p = products.filter(function (x) { return x.id === +id; })[0]; return a + p.price * cart[id]; }, 0); }
    function count() { return Object.keys(cart).reduce(function (a, id) { return a + cart[id]; }, 0); }
    function draw() {
      out.innerHTML = '';
      var head = h('div', { class: 'demo__row', style: 'justify-content:space-between; padding-bottom:10px; border-bottom:2px solid var(--ink)' }, h('b', { style: 'font-family:var(--display); font-size:1.15rem' }, 'Gum Leaf Goods'), h('span', {}, h('span', { class: 'demo__pill' }, count() + ' in cart · ' + money(total())), ' ', count() && step === 'shop' ? D.btn('Checkout', function () { step = 'details'; draw(); }, 'demo__btn--small') : ''));
      out.appendChild(head);
      if (step === 'shop') {
        out.appendChild(h('div', { class: 'demo__grid', style: 'margin-top:14px' }, products.map(function (p) {
          return h('div', { class: 'demo__panel' }, h('div', { style: 'height:70px; background:var(--bone-2); border:1px solid var(--line); display:grid; place-items:center; font-size:0.75rem; color:var(--fg-mute); margin-bottom:10px' }, 'product photo'), h('b', {}, p.name), h('div', { class: 'demo__row', style: 'justify-content:space-between; margin-top:6px' }, h('span', {}, money(p.price)), p.stock - (cart[p.id] || 0) > 0 ? D.btn('Add', function () { cart[p.id] = (cart[p.id] || 0) + 1; draw(); D.toast(f.root, p.name + ' added.', ''); }, 'demo__btn--small') : h('span', { class: 'demo__pill demo__pill--bad' }, 'sold out')), h('div', { class: 'dim', style: 'font-size:0.78rem; margin-top:4px' }, p.gift ? 'never sells out' : (p.stock - (cart[p.id] || 0)) + ' left'));
        })));
      } else if (step === 'details') {
        out.appendChild(h('div', { class: 'demo__grid', style: 'margin-top:14px' },
          h('div', { style: 'display:grid; gap:10px' }, h('h4', { style: 'margin:0; font-family:var(--display)' }, 'Your details'), h('input', { class: 'demo__input', value: 'Jo Hargreaves' }), h('input', { class: 'demo__input', value: 'jo@hargreaves.co' }), h('input', { class: 'demo__input', value: '12 Elm St, Prospect SA 5082' }), h('h4', { style: 'margin:6px 0 0; font-family:var(--display)' }, 'Payment'), h('input', { class: 'demo__input', value: '4242 4242 4242 4242', 'aria-label': 'Card number (test)' }), h('div', { class: 'demo__row' }, D.btn('Pay ' + money(total() + 9.95, true), function () { pay(); }), D.btn('Back to shop', function () { step = 'shop'; draw(); }, 'demo__btn--ghost'))),
          h('div', { class: 'demo__panel' }, h('h4', {}, 'Order summary'), Object.keys(cart).map(function (id) { var p = products.filter(function (x) { return x.id === +id; })[0]; return h('div', { class: 'demo__row', style: 'justify-content:space-between; font-size:0.9rem' }, h('span', {}, cart[id] + ' × ' + p.name), h('span', {}, money(p.price * cart[id]))); }), h('div', { class: 'demo__row', style: 'justify-content:space-between; font-size:0.9rem; margin-top:6px; border-top:1px solid var(--line); padding-top:6px' }, h('span', {}, 'Shipping'), h('span', {}, '$9.95')), h('div', { class: 'demo__row', style: 'justify-content:space-between; font-weight:700; margin-top:4px' }, h('span', {}, 'Total inc GST'), h('span', {}, money(total() + 9.95, true))))));
      } else {
        out.appendChild(h('div', { class: 'demo__grid', style: 'margin-top:14px' },
          h('div', { class: 'demo__panel' }, h('h4', {}, 'Order ' + order.id + ' confirmed'), h('p', { style: 'margin:0 0 8px; font-size:0.92rem' }, 'Thanks Jo. ' + count() + ' item' + (count() === 1 ? '' : 's') + ', ' + money(order.total, true) + ' paid. Dispatching Tuesday; tracking by SMS.'), D.btn('Shop again', function () { cart = {}; step = 'shop'; draw(); }, 'demo__btn--small')),
          h('div', { class: 'demo__panel' }, h('h4', {}, 'What just happened behind the scenes'), h('pre', { class: 'demo__log', style: 'max-height:none' }, order.log.map(function (l) { return h('div', { class: l[0] }, l[1]); })))));
      }
    }
    function pay() {
      var id = 'GL-' + (2040 + Math.floor(Math.random() * 900)), log = [];
      log.push(['ok', '[payment] ' + money(total() + 9.95, true) + ' captured (Stripe test mode)']);
      Object.keys(cart).forEach(function (cid) { var p = products.filter(function (x) { return x.id === +cid; })[0]; if (!p.gift) { p.stock -= cart[cid]; log.push(['ok', '[stock] ' + p.name + ' ' + (p.stock + cart[cid]) + ' -> ' + p.stock + (p.stock <= 2 ? ' (reorder alert sent)' : '')]); } else log.push(['warn', '[ledger] gift card booked as a liability, not revenue, until redeemed']); });
      log.push(['ok', '[accounting] invoice ' + id + ' posted: sales to the Stripe clearing account, GST as its own line, fee to be booked from the payout']);
      log.push(['ok', '[email] confirmation sent to jo@hargreaves.co; fulfilment sheet updated for Tuesday']);
      log.push(['dim', '[done] 0 things for a human to retype']);
      order = { id: id, total: total() + 9.95, log: log }; step = 'done'; draw(); f.status('order ' + id + ' placed', 'ok');
    }
    f.body.appendChild(out); draw();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Mobile apps: the app itself, in a phone                             */
  /* ------------------------------------------------------------------ */
  D.register('mobile-app', function () {
    var f = D.frame({ title: 'JobBook: the app, in a phone', status: 'tap around',
      note: 'One codebase, iOS and Android, your accounts, backend included. The app is real; the profile tab says who owns it, because that is part of the deliverable too.' });
    var jobs = [
      { id: 1, who: 'Hargreaves', what: 'Switchboard upgrade', when: '8:00', where: 'Prospect', done: false, notes: [] },
      { id: 2, who: 'Nguyen', what: 'Safety switch tripping', when: '10:30', where: 'Norwood', done: false, notes: ['Tenant home after 10'] },
      { id: 3, who: 'Bella Vista Cafe', what: 'Extra circuits, kitchen', when: '13:00', where: 'Glenelg', done: false, notes: [] },
      { id: 4, who: 'Okafor', what: 'Downlights x 12', when: '15:30', where: 'Unley', done: true, notes: ['Paid on site'] }
    ];
    var view = { tab: 'today', open: null }, screen = h('div', { class: 'demo__screen' });
    function render() {
      screen.innerHTML = '';
      var pending = jobs.filter(function (j) { return !j.done; }).length;
      screen.appendChild(h('div', { class: 'top' }, h('span', {}, view.open ? 'Job' : view.tab === 'today' ? 'Today' : view.tab === 'done' ? 'Done' : 'Me'), h('span', { class: 'demo__pill' }, pending + ' to go')));
      var list = h('div', { class: 'list' });
      if (view.open) {
        var j = jobs.filter(function (x) { return x.id === view.open; })[0];
        list.appendChild(h('div', { style: 'padding:14px' }, h('div', { style: 'font-weight:800; font-size:1.1rem' }, j.who), h('div', {}, j.what), h('div', { class: 'dim', style: 'font-size:0.85rem' }, j.when + ' · ' + j.where),
          h('div', { style: 'margin:12px 0 6px; font-weight:700; font-size:0.85rem' }, 'Notes'), j.notes.length ? h('ul', { style: 'margin:0; padding-left:1.1em; font-size:0.88rem' }, j.notes.map(function (n) { return h('li', {}, n); })) : h('p', { class: 'dim', style: 'margin:0; font-size:0.88rem' }, 'none yet'),
          h('div', { class: 'demo__row', style: 'margin-top:14px' }, D.btn(j.done ? 'Reopen' : 'Mark done', function () { j.done = !j.done; D.toast(f.root, j.done ? 'Done. Invoice drafted in accounting.' : 'Reopened.', j.done ? 'ok' : ''); view.open = null; render(); }, 'demo__btn--small'), D.btn('Add note', function () { j.notes.push(['Parts on order', 'Customer wants a call first', 'Access via side gate'][j.notes.length % 3]); render(); }, 'demo__btn--small demo__btn--ghost'), D.btn('Back', function () { view.open = null; render(); }, 'demo__btn--small demo__btn--ghost'))));
      } else if (view.tab === 'me') {
        list.appendChild(h('div', { style: 'padding:14px; font-size:0.9rem' }, h('p', {}, h('b', {}, 'Sam Tran'), h('br'), 'Licensed electrician'), h('p', {}, 'App store accounts: ', h('b', {}, 'yours'), h('br'), 'Source code: ', h('b', {}, 'yours'), h('br'), 'Backend and data: ', h('b', {}, 'yours')), h('p', { class: 'dim' }, 'The screen nobody demos, included because you own it.')));
      } else {
        jobs.filter(function (j) { return view.tab === 'done' ? j.done : !j.done; }).forEach(function (j) { list.appendChild(h('div', { class: 'item', onclick: function () { view.open = j.id; render(); } }, h('span', {}, h('b', {}, j.who), h('br'), h('span', { style: 'font-size:0.85rem' }, j.what)), h('span', { class: 'dim', style: 'font-size:0.85rem; text-align:right' }, j.when, h('br'), j.where))); });
        if (!list.children.length) list.appendChild(h('p', { class: 'dim', style: 'padding:14px' }, 'Nothing here yet.'));
      }
      screen.appendChild(list);
      screen.appendChild(h('div', { class: 'tabs' }, ['today', 'done', 'me'].map(function (t) { return h('button', { type: 'button', 'aria-pressed': view.tab === t && !view.open, onclick: function () { view.tab = t; view.open = null; render(); } }, t === 'today' ? 'Today' : t === 'done' ? 'Done' : 'Me'); })));
    }
    render();
    f.body.appendChild(h('div', { class: 'demo__grid', style: 'grid-template-columns:minmax(260px,320px) 1fr; align-items:start' }, h('div', { class: 'demo__phone' }, screen),
      h('div', { class: 'demo__panel' }, h('h4', {}, 'What you are looking at'), h('p', { style: 'margin:0 0 8px; font-size:0.92rem' }, 'A job list for a small crew: today\'s work, notes from the field, done with one tap, invoice drafted the moment a job closes. The same app ships to both stores from one codebase.'), h('p', { style: 'margin:0; font-size:0.92rem' }, 'Swap the jobs for bookings, deliveries, inspections or patients and it is the same build. And if a good mobile website would do the job instead, you will hear that first.'))));
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Custom software: a working internal tool                            */
  /* ------------------------------------------------------------------ */
  D.register('internal-tool', function () {
    var f = D.frame({ title: 'Quotes and jobs tracker', status: 'the tool your spreadsheet wants to be',
      note: 'The internal tool most small businesses fake in a spreadsheet: quotes in, jobs through, invoices out, and the numbers on top derived from the rows so they cannot be wrong. Built to your process, owned by you.' });
    var rows = [
      { id: 'Q-118', client: 'Bella Vista Cafe', desc: 'Kitchen circuits', amt: 4800, stage: 'quoted' },
      { id: 'Q-119', client: 'Hargreaves', desc: 'Switchboard upgrade', amt: 2650, stage: 'accepted' },
      { id: 'Q-120', client: 'Marion Netball', desc: 'Court lighting', amt: 18400, stage: 'quoted' },
      { id: 'Q-117', client: 'Okafor', desc: 'Downlights x 12', amt: 1180, stage: 'invoiced' },
      { id: 'Q-116', client: 'Nguyen', desc: 'Safety switch', amt: 320, stage: 'paid' },
      { id: 'Q-115', client: 'Council depot', desc: 'Bollards', amt: 7200, stage: 'lost' }
    ];
    var next = { quoted: 'accepted', accepted: 'in progress', 'in progress': 'invoiced', invoiced: 'paid' }, n = 121;
    var tiles = h('div', { class: 'demo__grid', style: 'grid-template-columns:repeat(auto-fit,minmax(140px,1fr))' }), tbl = h('div');
    var form = { client: '', desc: '', amt: '' };
    function draw() {
      var open = rows.filter(function (r) { return r.stage === 'quoted'; }), won = rows.filter(function (r) { return ['accepted', 'in progress', 'invoiced', 'paid'].indexOf(r.stage) >= 0; }), lost = rows.filter(function (r) { return r.stage === 'lost'; });
      var owing = rows.filter(function (r) { return r.stage === 'invoiced'; }).reduce(function (a, r) { return a + r.amt; }, 0);
      tiles.innerHTML = '';
      [['Quotes out', money(open.reduce(function (a, r) { return a + r.amt; }, 0)), open.length + ' open'], ['Win rate', Math.round(won.length / Math.max(1, won.length + lost.length) * 100) + '%', won.length + ' won, ' + lost.length + ' lost'], ['Work booked', money(won.filter(function (r) { return r.stage !== 'paid'; }).reduce(function (a, r) { return a + r.amt; }, 0)), 'accepted to invoiced'], ['Owed to you', money(owing), owing ? 'chase on day 14' : 'nothing outstanding']].forEach(function (t) {
        tiles.appendChild(h('div', { class: 'demo__panel' }, h('div', { class: 'demo__big' }, t[1]), h('div', { style: 'font-weight:700; font-size:0.9rem' }, t[0]), h('div', { class: 'dim', style: 'font-size:0.8rem' }, t[2])));
      });
      tbl.innerHTML = '';
      tbl.appendChild(D.table(['Quote', 'Client', 'Work', 'Amount', 'Stage', ''], rows.map(function (r) {
        return h('tr', { class: r.stage === 'lost' ? 'is-bad' : r.stage === 'paid' ? 'is-ok' : r.stage === 'invoiced' ? 'is-warn' : '' }, h('td', {}, h('code', {}, r.id)), h('td', {}, r.client), h('td', {}, r.desc), h('td', { class: 'num' }, money(r.amt)), h('td', {}, h('span', { class: 'demo__pill' }, r.stage)),
          h('td', {}, h('span', { class: 'demo__row', style: 'gap:6px' }, next[r.stage] ? D.btn('→ ' + next[r.stage], function () { r.stage = next[r.stage]; if (r.stage === 'invoiced') D.toast(f.root, 'Invoice ' + r.id.replace('Q', 'INV') + ' created in accounting and emailed.', 'ok'); draw(); }, 'demo__btn--small') : '', r.stage === 'quoted' ? D.btn('lost', function () { r.stage = 'lost'; draw(); }, 'demo__btn--small demo__btn--ghost') : '')));
      })));
      f.status(rows.length + ' quotes · ' + money(owing) + ' outstanding', owing ? 'warn' : 'ok');
    }
    f.body.appendChild(tiles);
    f.body.appendChild(h('div', { class: 'demo__panel' }, h('h4', {}, 'New quote'), h('div', { class: 'demo__row' },
      h('input', { class: 'demo__input', placeholder: 'Client', oninput: function (e) { form.client = e.target.value; } }), h('input', { class: 'demo__input', placeholder: 'What for', oninput: function (e) { form.desc = e.target.value; } }), h('input', { class: 'demo__input', placeholder: 'Amount', type: 'number', style: 'max-width:140px', oninput: function (e) { form.amt = e.target.value; } }),
      D.btn('Add quote', function () { if (!form.client || !+form.amt) { D.toast(f.root, 'Client and amount, please. The tool refuses half a record.', 'bad'); return; } rows.unshift({ id: 'Q-' + (n++), client: form.client, desc: form.desc || 'TBC', amt: +form.amt, stage: 'quoted' }); draw(); D.toast(f.root, 'Quote added and PDF emailed to ' + form.client + '.', 'ok'); }))));
    f.body.appendChild(tbl); draw();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* CRM & automation: a working pipeline with automations that fire     */
  /* ------------------------------------------------------------------ */
  D.register('crm-pipeline', function () {
    var f = D.frame({ title: 'Your CRM, moving deals and doing the chores', status: 'move a deal, watch the automations',
      note: 'A pipeline your team will actually use, because it does the work for them: every stage change fires the follow-ups, tasks and accounting entries that people used to retype. Set up in HubSpot, Zoho or a simpler tool, whichever fits.' });
    var stages = ['New', 'Contacted', 'Quoted', 'Won'];
    var deals = [{ co: 'Bella Vista Cafe', v: 4800, s: 0, who: 'Marco' }, { co: 'Marion Netball Club', v: 18400, s: 1, who: 'Dee' }, { co: 'Hargreaves Electrical', v: 2650, s: 2, who: 'Jo' }, { co: 'Okafor & Co', v: 6200, s: 2, who: 'Tom' }, { co: 'Nair Physio', v: 3100, s: 3, who: 'Priya' }];
    var board = h('div', { class: 'demo__grid', style: 'grid-template-columns:repeat(4,minmax(150px,1fr)); gap:10px' }), log = h('pre', { class: 'demo__log' });
    function fire(d, from, to) {
      var lines = { 1: ['[email] intro drafted to ' + d.who + ' for approval', '[task] "call ' + d.who + '" due tomorrow 9am'], 2: ['[quote] PDF generated from the deal line items, awaiting your send', '[task] follow up in 3 business days if unopened'], 3: ['[accounting] invoice drafted for ' + money(d.v) + ' with GST, deposit terms applied', '[email] welcome + next steps sent to ' + d.who, '[calendar] kickoff proposed: Wednesday 11:30'] };
      logline(log, 'dim', '[deal] ' + d.co + ': ' + stages[from] + ' -> ' + stages[to]);
      (lines[to] || []).forEach(function (l, i) { setTimeout(function () { logline(log, 'ok', l); }, 180 * (i + 1)); });
    }
    function draw() {
      board.innerHTML = '';
      stages.forEach(function (s, i) {
        var col = h('div', { class: 'demo__panel', style: 'padding:10px' }, h('div', { style: 'font-weight:800; display:flex; justify-content:space-between' }, h('span', {}, s), h('span', { class: 'demo__pill demo__pill--dim' }, money(deals.filter(function (d) { return d.s === i; }).reduce(function (a, d) { return a + d.v; }, 0)))));
        deals.filter(function (d) { return d.s === i; }).forEach(function (d) {
          col.appendChild(h('div', { style: 'border:1.5px solid var(--line); background:var(--bone); padding:8px; margin-top:8px; font-size:0.85rem' }, h('b', {}, d.co), h('br'), money(d.v) + ' · ' + d.who, h('div', { class: 'demo__row', style: 'gap:4px; margin-top:6px' }, i < 3 ? D.btn('→', function () { d.s++; fire(d, i, d.s); draw(); }, 'demo__btn--small') : h('span', { class: 'demo__pill demo__pill--ok' }, 'won'))));
        });
        board.appendChild(col);
      });
      f.status(deals.filter(function (d) { return d.s === 3; }).length + ' won · ' + money(deals.reduce(function (a, d) { return a + (d.s < 3 ? d.v : 0); }, 0)) + ' in pipeline', 'ok');
    }
    var lead = { co: '', who: '' };
    f.body.appendChild(h('div', { class: 'demo__row' }, h('input', { class: 'demo__input', placeholder: 'Company', oninput: function (e) { lead.co = e.target.value; } }), h('input', { class: 'demo__input', placeholder: 'Contact', oninput: function (e) { lead.who = e.target.value; } }), D.btn('Add lead', function () { if (!lead.co) return; deals.push({ co: lead.co, v: 2500, s: 0, who: lead.who || 'them' }); logline(log, 'ok', '[crm] ' + lead.co + ' created from web form; deduped against existing contacts on ABN, none found'); draw(); }, 'demo__btn--small')));
    f.body.appendChild(board); f.body.appendChild(log);
    logline(log, 'dim', '[ready] move a deal with the arrow. Every stage change does its chores.');
    draw();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Data & reporting: the finished dashboard                            */
  /* ------------------------------------------------------------------ */
  D.register('dashboard', function () {
    var f = D.frame({ title: 'The dashboard your Monday needs', status: 'filter it',
      note: 'Pulled from where the numbers actually live, refreshed on a schedule, opened on a phone. Every figure is derived from the rows behind it, so it cannot quietly drift from the truth.' });
    var r = D.rng(3), branches = ['North', 'South', 'Online'], months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], data = [];
    branches.forEach(function (b, bi) { months.forEach(function (m, mi) { data.push({ b: b, m: m, rev: Math.round(28000 + bi * 6000 + mi * 1800 + r() * 9000), jobs: Math.round(40 + r() * 30), late: Math.round(r() * 6) }); }); });
    var fb = '', fm = 'all', tiles = h('div', { class: 'demo__grid', style: 'grid-template-columns:repeat(auto-fit,minmax(140px,1fr))' }), chart = h('div'), tbl = h('div');
    function draw() {
      var rows = data.filter(function (d) { return (!fb || d.b === fb) && (fm === 'all' || months.indexOf(d.m) >= months.length - +fm); });
      var rev = rows.reduce(function (a, d) { return a + d.rev; }, 0), jobs = rows.reduce(function (a, d) { return a + d.jobs; }, 0), late = rows.reduce(function (a, d) { return a + d.late; }, 0);
      tiles.innerHTML = '';
      [['Revenue', money(rev), ''], ['Jobs', fmt(jobs), ''], ['Avg ticket', money(rev / Math.max(1, jobs)), ''], ['Late jobs', fmt(late), late > jobs * 0.06 ? 'bad' : '']].forEach(function (t) { tiles.appendChild(h('div', { class: 'demo__panel' }, h('div', { class: 'demo__big', style: t[2] === 'bad' ? 'color:oklch(0.5 0.16 30)' : '' }, t[1]), h('div', { class: 'dim', style: 'font-size:0.85rem; font-weight:700' }, t[0]))); });
      var byM = months.filter(function (m) { return fm === 'all' || months.indexOf(m) >= months.length - +fm; }).map(function (m) { return [m, rows.filter(function (d) { return d.m === m; }).reduce(function (a, d) { return a + d.rev; }, 0)]; });
      var W = 640, H = 200, pad = 30, bw = (W - pad * 2) / byM.length, max = Math.max.apply(null, byM.map(function (x) { return x[1]; }));
      var svg = '<svg class="demo__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Revenue by month">';
      byM.forEach(function (x, i) { var bh = x[1] / max * (H - 60); svg += '<rect x="' + (pad + i * bw + 8) + '" y="' + (H - 30 - bh) + '" width="' + (bw - 16) + '" height="' + bh + '" fill="var(--green)"></rect><text x="' + (pad + i * bw + bw / 2) + '" y="' + (H - 12) + '" font-size="12" text-anchor="middle" fill="currentColor">' + x[0] + '</text><text x="' + (pad + i * bw + bw / 2) + '" y="' + (H - 36 - bh) + '" font-size="11" text-anchor="middle" fill="currentColor">' + Math.round(x[1] / 1000) + 'k</text>'; });
      chart.innerHTML = svg + '</svg>';
      tbl.innerHTML = '';
      tbl.appendChild(D.table(['Branch', 'Revenue', 'Jobs', 'Late', 'Share'], branches.filter(function (b) { return !fb || b === fb; }).map(function (b) { var rr = rows.filter(function (d) { return d.b === b; }), rv = rr.reduce(function (a, d) { return a + d.rev; }, 0); return h('tr', {}, h('td', {}, b), h('td', { class: 'num' }, money(rv)), h('td', { class: 'num' }, fmt(rr.reduce(function (a, d) { return a + d.jobs; }, 0))), h('td', { class: 'num' }, fmt(rr.reduce(function (a, d) { return a + d.late; }, 0))), h('td', {}, D.bar(rv, rev))); })));
      f.status((fb || 'all branches') + ' · ' + (fm === 'all' ? '6 months' : 'last ' + fm), 'ok');
    }
    f.body.appendChild(h('div', { class: 'demo__row' }, ctl('Branch', D.select([['', 'All branches']].concat(branches), fb, function (v) { fb = v; draw(); })), ctl('Period', D.select([['all', 'Last 6 months'], ['3', 'Last 3 months'], ['1', 'Last month']], fm, function (v) { fm = v; draw(); })), h('span', { class: 'dim', style: 'font-size:0.86rem' }, 'refreshed nightly from accounting and the job system')));
    f.body.appendChild(tiles); f.body.appendChild(chart); f.body.appendChild(tbl); draw();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* AI development: the assistant your customers would talk to          */
  /* ------------------------------------------------------------------ */
  D.register('ai-assistant', function () {
    var f = D.frame({ title: 'A customer assistant that knows your business', status: 'ask it something',
      note: 'This slice runs on rules in your browser so it works without a key; the production version uses a language model with the same guardrails: answer from your facts, book from your calendar, escalate anything it is not sure of, never invent.' });
    var key = 'physio', thread = h('div', { style: 'display:grid; gap:8px; max-height:300px; overflow:auto; padding:4px' }), input = h('input', { class: 'demo__input', placeholder: 'Type a question a customer would ask', style: 'flex:1' });
    var kb = {
      physio: { hours: 'Monday to Friday 7am to 7pm, Saturday 8am to 1pm.', price: 'Initial consult $120, follow-ups $95. Private health rebates on the spot.', book: 'Tuesday 10:30 with Priya or Wednesday 4:15 with Sam', park: 'Free parking behind the clinic, entry from George St.', who: 'Three physios: Priya (sports), Sam (backs and necks), Lee (post-surgery).' },
      cafe: { hours: 'Every day 7am to 3pm, kitchen until 2:30.', price: 'Breakfast from $14, coffee $4.80, catering boxes from $12 a head.', book: 'a table for 4 at 9:30 Saturday, or the back room for your function', park: 'Two-hour street parking on Jetty Rd; the council carpark is behind us.', who: 'Family-run since 2011.' },
      sparky: { hours: 'Weekdays 7am to 5pm; emergency call-outs 24/7.', price: 'Call-out $140 inc first half hour, then $95 per half hour. Quotes are free and fixed.', book: 'Thursday morning or next Monday afternoon', park: 'We come to you.', who: 'Two licensed electricians, fifteen years each.' }
    };
    function reply(t) {
      var k = kb[key], low = t.toLowerCase();
      if (/hour|open|close|when/.test(low)) return ['We are open ' + k.hours, 'answered from your hours'];
      if (/price|cost|how much|\$|fee|charge/.test(low)) return [k.price + ' Want me to book you in?', 'answered from your price list'];
      if (/book|appoint|table|slot|available|come out/.test(low)) return ['I can offer ' + k.book + '. Which suits? I will hold it for you.', 'offered real gaps from your calendar'];
      if (/park/.test(low)) return [k.park, 'answered from your FAQ'];
      if (/who|staff|team|physio|electric/.test(low)) return [k.who, 'answered from your team page'];
      if (/refund|complain|angry|wrong|hurt|pain.*worse|emergency/.test(low)) return ['I am sorry to hear that. I have flagged this for ' + (key === 'physio' ? 'the practice manager' : 'the owner') + ' who will call you back today. Can I take the best number?', 'escalated to a human: not something an assistant should decide'];
      return ['Good question, and not one I am sure about, so I will not guess. I have passed it to the team and you will get a straight answer within the hour. Anything else I can help with meanwhile?', 'unknown: escalated instead of inventing an answer'];
    }
    function bubble(text, who, note) {
      thread.appendChild(h('div', { style: 'justify-self:' + (who === 'you' ? 'end' : 'start') + '; max-width:85%' }, h('div', { style: 'padding:10px 14px; font-size:0.92rem; border:2px solid var(--ink); background:' + (who === 'you' ? 'var(--amber-soft)' : 'var(--bone)') }, text), note ? h('div', { class: 'dim', style: 'font-size:0.72rem; margin-top:3px' }, note) : null));
      thread.scrollTop = thread.scrollHeight;
    }
    function send(t) { t = (t || input.value).trim(); if (!t) return; input.value = ''; bubble(t, 'you'); var r = reply(t); setTimeout(function () { bubble(r[0], 'bot', r[1]); f.status(r[1], /escalat/.test(r[1]) ? 'warn' : 'ok'); }, 450); }
    var starters = { physio: ['Do you open Saturdays?', 'How much is a first visit?', 'Can I book this week?', 'My knee got worse after the last session'], cafe: ['Are you open Sunday?', 'Table for four Saturday morning?', 'Do you do catering?', 'Where do I park?'], sparky: ['Do you do emergency call-outs?', 'What is the call-out fee?', 'Can someone come Thursday?', 'Who will turn up?'] };
    function reset() { thread.innerHTML = ''; bubble('Hi, I am the ' + BIZ[key].name + ' assistant. Ask me about hours, prices, bookings or anything on the site.', 'bot'); }
    var chips = h('div', { class: 'demo__chips' });
    function drawChips() { chips.innerHTML = ''; starters[key].forEach(function (s) { chips.appendChild(h('button', { class: 'demo__chip', type: 'button', onclick: function () { send(s); } }, s)); }); }
    f.body.appendChild(h('div', { class: 'demo__row' }, ctl('Business', D.select([['physio', 'A physio clinic'], ['cafe', 'A cafe'], ['sparky', 'An electrician']], key, function (v) { key = v; reset(); drawChips(); }))));
    f.body.appendChild(chips);
    f.body.appendChild(h('div', { class: 'demo__panel', style: 'padding:12px' }, thread, h('div', { class: 'demo__row', style: 'margin-top:10px' }, input, D.btn('Send', function () { send(); }, 'demo__btn--small'))));
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
    reset(); drawChips();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Project rescue: the site after the rescue, and who owns it now      */
  /* ------------------------------------------------------------------ */
  D.register('rescue-outcome', function () {
    var f = D.frame({ title: 'A rescued project: what you end up with', status: 'toggle before and after',
      note: 'The end result of a rescue is not a report. It is the finished site, live, and every account in your name with the passwords in your hands. Both are shown here; both are the deliverable.' });
    var mode = 'before', stage = h('div', { style: 'border:2px solid var(--ink); min-height:420px; overflow:hidden' });
    var biz = BIZ.cafe;
    function draw() {
      stage.innerHTML = '';
      if (mode === 'before') {
        stage.appendChild(h('div', { style: 'background:#fff; color:#444; font-family:Arial, sans-serif; min-height:420px' },
          h('div', { style: 'background:#222; color:#fff; padding:12px 16px; display:flex; justify-content:space-between' }, h('b', {}, 'bellavista-new-site-v3'), h('span', { style: 'font-size:12px; opacity:0.7' }, 'Home · About · Menu · Blog · Shop · Contact')),
          h('div', { style: 'padding:16px' },
            h('div', { style: 'height:140px; background:repeating-linear-gradient(45deg,#eee,#eee 10px,#f7f7f7 10px,#f7f7f7 20px); display:grid; place-items:center; color:#999; font-size:13px' }, '[hero image placeholder 1920x600]'),
            h('h2', { style: 'margin:14px 0 6px' }, 'Lorem ipsum dolor sit amet'),
            h('p', { style: 'font-size:14px; line-height:1.5' }, 'Consectetur adipiscing elit, sed do eiusmod tempor. INSERT CAFE DESCRIPTION HERE. Contact us at ', h('u', {}, 'email@example.com'), ' or call 04XX XXX XXX.'),
            h('div', { style: 'display:flex; gap:10px; margin-top:10px' }, h('span', { style: 'padding:8px 12px; background:#ddd; font-size:13px' }, 'Order online (coming soon)'), h('span', { style: 'padding:8px 12px; border:1px solid #ccc; font-size:13px; color:#c00' }, 'Menu (404)')),
            h('p', { style: 'font-size:12px; color:#c00; margin-top:14px' }, 'Warning: 3 plugins need updates · SSL certificate expired · admin user: developer@agency (you are not an admin)'))));
      } else {
        stage.appendChild(miniSite(biz, { toastRoot: f.root }).root);
      }
      f.status(mode === 'before' ? 'as inherited: 60% built, developer gone' : 'after: live, finished, yours', mode === 'before' ? 'bad' : 'ok');
    }
    var own = [['Domain', 'client\'s registrar account, auto-renew on'], ['Hosting', 'client\'s account, invoices to the client'], ['Site admin', 'client is the only administrator'], ['Code and theme', 'in the client\'s repository, backed up'], ['Email', 'untouched throughout'], ['Analytics and Search Console', 'owner: client; developer removed']];
    f.body.appendChild(h('div', { class: 'demo__chips' }, [['before', 'Before: what they inherited'], ['after', 'After: what they got']].map(function (o) { return h('button', { class: 'demo__chip', type: 'button', 'aria-pressed': mode === o[0], onclick: function (e) { mode = o[0]; Array.prototype.forEach.call(e.target.parentNode.children, function (c) { c.setAttribute('aria-pressed', c === e.target); }); draw(); } }, o[1]); })));
    f.body.appendChild(stage);
    f.body.appendChild(h('div', { class: 'demo__panel' }, h('h4', {}, 'Who owns what, after'), h('div', { class: 'demo__kv' }, own.map(function (o) { return [h('span', {}, o[0]), h('b', {}, h('span', { class: 'demo__pill demo__pill--ok' }, 'you'), ' ' + o[1])]; }).reduce(function (a, b) { return a.concat(b); }, []))));
    draw();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Business analysis: the deliverables, finished and browsable         */
  /* ------------------------------------------------------------------ */
  D.register('ba-deliverables', function () {
    var f = D.frame({ title: 'The documents you actually receive', status: 'four tabs, all finished',
      note: 'Not a workshop: the outputs. A current-and-future process map, prioritised requirements, an options paper with a recommendation, and a plan with dates. Written so your board, your staff and your developer all read the same thing.' });
    var tab = 'map', out = h('div'), future = false;
    function mapSvg(fut) {
      var actors = ['Customer', 'Admin', 'Owner'], steps = fut
        ? [['Customer', 'enquires on website'], ['Customer', 'gets instant quote range'], ['Admin', 'approves quote (1 click)'], ['Customer', 'accepts online'], ['Owner', 'does the job'], ['Admin', 'invoice auto-sent']]
        : [['Customer', 'emails enquiry'], ['Admin', 'retypes to spreadsheet'], ['Admin', 'waits for owner'], ['Owner', 'prices from memory'], ['Admin', 'emails PDF quote'], ['Customer', 'chases by phone'], ['Customer', 'accepts by email'], ['Admin', 'retypes into scheduler'], ['Owner', 'does the job'], ['Admin', 'retypes into accounting']];
      var colW = Math.max(72, (760 - 120) / steps.length), W = Math.max(760, 120 + colW * steps.length), rowH = 64, H = actors.length * rowH + 16, svg = '<svg class="demo__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Process map">';
      actors.forEach(function (a, i) { svg += '<rect x="0" y="' + (i * rowH + 8) + '" width="' + W + '" height="' + rowH + '" fill="' + (i % 2 ? 'transparent' : 'rgba(0,0,0,0.035)') + '"></rect><text x="8" y="' + (i * rowH + 42) + '" font-size="12" font-weight="700" fill="currentColor">' + a + '</text>'; });
      steps.forEach(function (s, j) {
        var row = actors.indexOf(s[0]), x = 110 + j * colW, y = row * rowH + 20, bad = /retype|wait|chase|memory/.test(s[1]);
        if (j > 0) { var px = 110 + (j - 1) * colW + colW * 0.8 - 6, py = actors.indexOf(steps[j - 1][0]) * rowH + 42; svg += '<line x1="' + px + '" y1="' + py + '" x2="' + x + '" y2="' + (y + 22) + '" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"></line>'; }
        svg += '<rect x="' + x + '" y="' + y + '" width="' + (colW * 0.8 - 6) + '" height="44" fill="' + (bad ? 'oklch(0.9 0.05 30)' : fut ? 'color-mix(in oklch, var(--green) 25%, var(--bone))' : 'var(--bone)') + '" stroke="currentColor" stroke-width="1.4"></rect>';
        var w = s[1].split(' '); svg += '<text x="' + (x + 5) + '" y="' + (y + 18) + '" font-size="9.5" fill="currentColor">' + w.slice(0, 2).join(' ') + '</text><text x="' + (x + 5) + '" y="' + (y + 32) + '" font-size="9.5" fill="currentColor">' + w.slice(2, 5).join(' ') + '</text>';
      });
      return svg + '</svg>';
    }
    function draw() {
      out.innerHTML = '';
      if (tab === 'map') {
        out.appendChild(h('div', { class: 'demo__row', style: 'margin-bottom:10px' }, h('b', {}, future ? 'Future state: 6 steps, 0 retyping' : 'Current state: 10 steps, 3 retypes, 2 waits'), D.btn(future ? 'Show current state' : 'Show future state', function () { future = !future; draw(); }, 'demo__btn--small demo__btn--ghost')));
        out.appendChild(h('div', { html: mapSvg(future) }));
      } else if (tab === 'req') {
        out.appendChild(D.table(['#', 'Requirement', 'Priority', 'Done means'], [
          ['R1', 'Enquiries from the website create a quote record automatically', 'Must', 'no enquiry is ever typed twice'],
          ['R2', 'Customers see an instant price range for standard jobs', 'Must', 'range shown in under 2 seconds; fixed quote follows'],
          ['R3', 'Owner approves quotes from a phone in one tap', 'Must', 'approval takes under 30 seconds'],
          ['R4', 'Accepted quotes become scheduled jobs without retyping', 'Should', 'job appears in the schedule the moment the customer accepts'],
          ['R5', 'Completed jobs invoice themselves', 'Should', 'invoice sent within 5 minutes of "done"'],
          ['R6', 'Weekly report of quotes out, won, lost', 'Could', 'emailed Monday 7am, numbers reconcile to accounting']
        ].map(function (r) { return h('tr', { class: r[2] === 'Must' ? '' : r[2] === 'Should' ? 'is-warn' : '' }, h('td', {}, h('code', {}, r[0])), h('td', {}, r[1]), h('td', {}, h('span', { class: 'demo__pill' }, r[2])), h('td', { style: 'font-size:0.85rem; color:var(--fg-dim)' }, r[3])); })));
      } else if (tab === 'options') {
        out.appendChild(h('div', { class: 'demo__grid' }, [
          ['A. Off-the-shelf job app', '$60 to $150 / month', 'Fast, proven, but your quoting process bends to fit it. Fine if you can live with that.', 'warn'],
          ['B. Off-the-shelf plus a small custom layer (recommended)', '$4k to $7k once + subscription', 'The app runs jobs; a thin custom piece does your quoting and joins accounting. Best value for how you actually work.', 'ok'],
          ['C. Fully custom system', '$18k to $30k', 'Exactly your process, nothing else. Only worth it if the process is your competitive edge, and it is not, yet.', 'bad']
        ].map(function (o) { return h('div', { class: 'demo__panel' }, h('h4', {}, o[0]), h('span', { class: 'demo__pill demo__pill--' + o[3] }, o[1]), h('p', { style: 'margin:8px 0 0; font-size:0.9rem' }, o[2])); })));
        out.appendChild(h('p', { style: 'margin:12px 0 0; font-size:0.9rem' }, h('b', {}, 'Recommendation: B.'), ' Reasons are written down, costs are ranges you can hold me to, and the risks of A and C are named, not hidden.'));
      } else {
        var weeks = 10, tasks = [['Discovery and process map', 1, 2], ['Choose and set up the job app', 2, 3], ['Build the quoting layer', 4, 6], ['Join accounting', 6, 7], ['Staff training and parallel run', 8, 9], ['Go live and hypercare', 10, 10]];
        var W = 720, rowH = 30, H = tasks.length * rowH + 30, colW = (W - 220) / weeks, svg = '<svg class="demo__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Project plan">';
        for (var w = 1; w <= weeks; w++) svg += '<text x="' + (220 + (w - 0.5) * colW) + '" y="14" font-size="10" text-anchor="middle" fill="currentColor">W' + w + '</text>';
        tasks.forEach(function (t, i) { var y = 24 + i * rowH; svg += '<text x="4" y="' + (y + 14) + '" font-size="11" fill="currentColor">' + t[0] + '</text><rect x="' + (220 + (t[1] - 1) * colW) + '" y="' + y + '" width="' + ((t[2] - t[1] + 1) * colW - 4) + '" height="20" fill="' + (i === 5 ? 'var(--amber)' : 'var(--green)') + '"></rect>'; });
        out.appendChild(h('div', { html: svg + '</svg>' }));
        out.appendChild(h('p', { style: 'margin:10px 0 0; font-size:0.9rem' }, 'Ten weeks, fixed price, one accountable person. The parallel run in weeks 8 and 9 is where staff find what the plan missed, on purpose, before it matters.'));
      }
    }
    f.body.appendChild(h('div', { class: 'demo__chips' }, [['map', 'Process map'], ['req', 'Requirements'], ['options', 'Options paper'], ['plan', 'Project plan']].map(function (o) { return h('button', { class: 'demo__chip', type: 'button', 'aria-pressed': tab === o[0], onclick: function (e) { tab = o[0]; Array.prototype.forEach.call(e.target.parentNode.children, function (c) { c.setAttribute('aria-pressed', c === e.target); }); draw(); } }, o[1]); })));
    f.body.appendChild(out); draw();
    return f.root;
  });

})(window.Demos);
