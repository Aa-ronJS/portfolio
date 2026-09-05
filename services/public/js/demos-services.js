/* Live builds for the ten service pages. Each one is the finished thing a
   buyer would get, rendered in the device it would live in: websites in a
   browser window, software in an app window, the app in a phone, the
   analysis in a document viewer. Styled as themselves, not as this site. */
(function (D) {
  var h = D.h, money = D.money, fmt = D.fmt, icon = D.icon;
  function logline(log, cls, text) { log.appendChild(h('div', { class: cls }, text)); log.scrollTop = log.scrollHeight; }
  function controls() { return h('div', { class: 'demo__controls' }, Array.prototype.slice.call(arguments)); }
  function ctl(label, node) { return h('label', {}, label, node); }
  function seg(opts, value, onchange) {
    var el = h('span', { class: 'demo__seg' });
    opts.forEach(function (o) { el.appendChild(h('button', { type: 'button', 'aria-pressed': o[0] === value, onclick: function (e) { Array.prototype.forEach.call(el.children, function (c) { c.setAttribute('aria-pressed', c === e.currentTarget); }); onchange(o[0]); } }, o[1])); });
    return el;
  }
  function aside(title) { var a = h('div', { class: 'dv demo__aside' }, h('h4', {}, title)); for (var i = 1; i < arguments.length; i++) if (arguments[i]) a.appendChild(arguments[i]); return a; }
  function asides() { return h('div', { class: 'demo__asides' }, Array.prototype.slice.call(arguments)); }
  /* A believable "photo": layered gradients in the brand's colours. */
  function photo(a, b, hgt, label, extra) {
    return h('div', { style: 'height:' + (hgt || 160) + 'px; border-radius:inherit; background:radial-gradient(120% 90% at 80% 10%, rgba(255,255,255,0.35), transparent 50%), linear-gradient(135deg,' + a + ',' + b + '); position:relative; overflow:hidden;' + (extra || '') },
      h('div', { style: 'position:absolute; inset:auto 0 0 0; height:45%; background:linear-gradient(180deg, transparent, rgba(0,0,0,0.25))' }),
      label ? h('span', { style: 'position:absolute; left:12px; bottom:10px; color:#fff; font:600 11px Inter,system-ui,sans-serif; opacity:0.85; letter-spacing:0.04em; text-transform:uppercase' }, label) : null);
  }

  /* Four example businesses, each with its own brand, so the same build
     re-skins to whoever is looking. */
  var BIZ = {
    sparky: { name: 'Hargreaves Electrical', tag: 'Licensed electricians, Adelaide hills to the coast', url: 'hargreaveselectrical.com.au',
      font: "'Oswald', Impact, sans-serif", body: "'Inter', system-ui, sans-serif", accent: '#F26B1D', ink: '#14161A', paper: '#FFFFFF', dark: '#1C1F26', p2: '#F9A03F', style: 'bold',
      services: [['Switchboard upgrades', 'Old fuse boxes replaced with compliant, safe boards.'], ['Emergency call-outs', 'Same-day for power loss, burning smells, tripping switches.'], ['EV charger installs', 'Home and workplace chargers, wired and certified.']],
      about: 'Two brothers, one van each, fifteen years on the tools. We turn up when we said, and we clean up.', suburbs: 'Stirling, Mount Barker, Norwood, Glenelg', phone: '0412 555 019', cta: 'Get a fixed quote' },
    cafe: { name: 'Bella Vista', tag: 'Breakfast, lunch and very good coffee on Jetty Road', url: 'bellavistacafe.com.au',
      font: "'Playfair Display', Georgia, serif", body: "'Inter', system-ui, sans-serif", accent: '#2F6B4F', ink: '#1E211F', paper: '#F8F3E8', dark: '#2F6B4F', p2: '#C98A3C', style: 'warm',
      services: [['All-day breakfast', 'Until 2:30, every day, no exceptions.'], ['Catering', 'Boxes and platters for offices and events, ordered online.'], ['Functions', 'The back room seats 30 for evenings and Sundays.']],
      about: 'Family-run since 2011. Beans from a local roaster, bread baked overnight, staff who remember your order.', suburbs: 'Glenelg, Brighton, Somerton Park', phone: '08 8295 0141', cta: 'Book a table' },
    physio: { name: 'Nair Physiotherapy', tag: 'Move well again, with a plan you can actually follow', url: 'nairphysio.com.au',
      font: "'Nunito', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif", accent: '#2563EB', ink: '#0F172A', paper: '#FFFFFF', dark: '#0F172A', p2: '#38BDF8', style: 'clean',
      services: [['Sports injuries', 'Assessment, rehab plans and return-to-play timelines.'], ['Back and neck pain', 'Hands-on treatment plus the exercises that actually stick.'], ['Post-surgery rehab', 'Working with your surgeon\'s protocol, not against it.']],
      about: 'Three physios, no upselling. If you need two sessions, you will be told two sessions.', suburbs: 'Norwood, Kent Town, Payneham', phone: '08 8362 7710', cta: 'Book online' },
    accountant: { name: 'Okafor & Co', tag: 'Accountants for trades and small business', url: 'okaforco.com.au',
      font: "'Playfair Display', Georgia, serif", body: "'Inter', system-ui, sans-serif", accent: '#0B3B5C', ink: '#14202B', paper: '#FFFFFF', dark: '#0B3B5C', p2: '#C8A24A', style: 'formal',
      services: [['Tax and BAS', 'Lodged on time, explained in plain words, no surprises.'], ['Bookkeeping', 'Xero kept clean monthly so year-end is a formality.'], ['Structure advice', 'Sole trader, company or trust: the right answer for you, not the fanciest.']],
      about: 'Twelve years of keeping tradies and shop owners out of trouble with the ATO. We speak human.', suburbs: 'Unley, Parkside, Mitcham', phone: '08 8272 3390', cta: 'Book a free chat' }
  };
  var BIZ_OPTS = [['sparky', 'An electrician'], ['cafe', 'A cafe'], ['physio', 'A physio clinic'], ['accountant', 'An accountant']];

  /* Render a finished small-business website. opts.narrow renders the phone layout. */
  function miniSite(biz, opts) {
    opts = opts || {};
    var page = 'home', form = {}, narrow = !!opts.narrow;
    var root = h('div', { class: 'ms', style: 'background:' + biz.paper + '; color:' + biz.ink + '; font-family:' + biz.body + '; font-size:' + (narrow ? '14px' : '15px') + '; line-height:1.5; min-height:' + (narrow ? '520px' : '540px') + '; display:flex; flex-direction:column' });
    var bold = biz.style === 'bold', warm = biz.style === 'warm', clean = biz.style === 'clean', formal = biz.style === 'formal';
    var headBg = bold ? biz.dark : warm ? biz.paper : formal ? biz.dark : '#fff', headFg = (bold || formal) ? '#fff' : biz.ink;
    function cta(label, onclick, ghost) {
      return h('button', { type: 'button', onclick: onclick, style: 'font:600 ' + (narrow ? '13px' : '14px') + ' ' + biz.body + '; cursor:pointer; padding:' + (narrow ? '10px 16px' : '12px 20px') + '; border-radius:' + (clean ? '999px' : bold ? '4px' : '8px') + ';' + (ghost ? 'background:transparent; color:inherit; border:1.5px solid currentColor' : 'background:' + biz.accent + '; color:#fff; border:1.5px solid ' + biz.accent) }, label);
    }
    function nav() {
      var links = ['home', 'services', 'about', 'contact'];
      return h('div', { style: 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:' + (narrow ? '12px 16px' : '16px 28px') + '; background:' + headBg + '; color:' + headFg + ';' + (warm ? 'border-bottom:1px solid rgba(0,0,0,0.08)' : '') },
        h('div', { style: 'display:flex; align-items:center; gap:10px; font-family:' + biz.font + '; font-weight:' + (bold ? '700' : warm ? '700' : formal ? '700' : '800') + '; font-size:' + (narrow ? '17px' : '20px') + '; letter-spacing:' + (bold ? '0.04em' : '-0.01em') + ';' + (bold ? 'text-transform:uppercase' : '') },
          h('span', { style: 'width:' + (narrow ? 22 : 26) + 'px; height:' + (narrow ? 22 : 26) + 'px; border-radius:' + (clean ? '50%' : '6px') + '; background:' + biz.accent + '; display:inline-block' }), biz.name),
        narrow ? h('span', { style: 'display:grid; gap:4px', 'aria-hidden': 'true' }, h('i', { style: 'display:block; width:22px; height:2px; background:currentColor' }), h('i', { style: 'display:block; width:22px; height:2px; background:currentColor' }), h('i', { style: 'display:block; width:22px; height:2px; background:currentColor' }))
          : h('span', { style: 'display:flex; gap:22px; align-items:center; font-size:14px; font-weight:500' }, links.map(function (p) {
            return h('a', { href: '#', style: 'color:inherit; text-decoration:none; ' + (page === p ? 'border-bottom:2px solid ' + biz.accent + '; padding-bottom:2px' : 'opacity:0.85'), onclick: function (e) { e.preventDefault(); page = p; draw(); } }, p[0].toUpperCase() + p.slice(1));
          }), h('span', { style: 'font-weight:600; color:' + ((bold || formal) ? biz.p2 : biz.accent) }, biz.phone)));
    }
    function hero() {
      var pad = narrow ? '28px 18px' : '56px 28px';
      if (bold) return h('div', { style: 'background:' + biz.dark + '; color:#fff; padding:' + pad + '; position:relative; overflow:hidden' },
        h('div', { style: 'position:absolute; right:-40px; top:-40px; width:60%; height:140%; background:linear-gradient(135deg,' + biz.accent + ',' + biz.p2 + '); transform:skewX(-12deg); opacity:0.9' }),
        h('div', { style: 'position:relative; max-width:' + (narrow ? '100%' : '55%') },
          h('div', { style: 'font:600 12px ' + biz.body + '; letter-spacing:0.14em; text-transform:uppercase; color:' + biz.p2 + '; margin-bottom:10px' }, 'Licensed · Insured · Local'),
          h('h1', { style: 'font-family:' + biz.font + '; font-weight:700; text-transform:uppercase; font-size:' + (narrow ? '32px' : '48px') + '; line-height:0.98; margin:0 0 14px; letter-spacing:0.01em' }, biz.tag),
          h('p', { style: 'margin:0 0 20px; font-size:' + (narrow ? '14px' : '16px') + '; opacity:0.9; max-width:44ch' }, biz.about),
          h('div', { style: 'display:flex; gap:10px; flex-wrap:wrap' }, cta('Call ' + biz.phone, function () { D.toast(opts.toastRoot || root, 'On a phone this dials. That is the whole point of the button.', 'ok'); }), cta(biz.cta, function () { page = 'contact'; draw(); }, true))));
      if (warm) return h('div', { style: 'padding:' + pad + '; text-align:center; background:' + biz.paper },
        h('div', { style: 'font:600 12px ' + biz.body + '; letter-spacing:0.16em; text-transform:uppercase; color:' + biz.p2 + '; margin-bottom:12px' }, 'Est. 2011 · Glenelg'),
        h('h1', { style: 'font-family:' + biz.font + '; font-weight:600; font-size:' + (narrow ? '30px' : '46px') + '; line-height:1.08; margin:0 auto 14px; max-width:22ch; letter-spacing:-0.01em' }, biz.tag),
        h('p', { style: 'margin:0 auto 22px; font-size:' + (narrow ? '14px' : '16px') + '; max-width:52ch; opacity:0.85' }, biz.about),
        h('div', { style: 'display:flex; gap:10px; justify-content:center; flex-wrap:wrap' }, cta(biz.cta, function () { page = 'contact'; draw(); }), cta('See the menu', function () { page = 'services'; draw(); }, true)),
        h('div', { style: 'display:grid; grid-template-columns:repeat(' + (narrow ? 2 : 3) + ',1fr); gap:10px; margin-top:28px' }, [['#8B5E3C', '#D9A066', 'Coffee'], ['#4B7B5E', '#A8C686', 'Breakfast'], ['#B4552D', '#E8A87C', 'The room']].slice(0, narrow ? 2 : 3).map(function (c) { return h('div', { style: 'border-radius:12px; overflow:hidden' }, photo(c[0], c[1], narrow ? 100 : 150, c[2])); })));
      if (clean) return h('div', { style: 'padding:' + pad + '; display:grid; grid-template-columns:' + (narrow ? '1fr' : '1.1fr 1fr') + '; gap:28px; align-items:center; background:linear-gradient(180deg,#F0F6FF,#fff)' },
        h('div', {},
          h('div', { style: 'display:inline-block; font:700 12px ' + biz.body + '; color:' + biz.accent + '; background:#DBEAFE; padding:5px 12px; border-radius:999px; margin-bottom:12px' }, 'Now taking new patients'),
          h('h1', { style: 'font-family:' + biz.font + '; font-weight:800; font-size:' + (narrow ? '30px' : '42px') + '; line-height:1.08; margin:0 0 12px; letter-spacing:-0.02em; color:' + biz.ink }, biz.tag),
          h('p', { style: 'margin:0 0 20px; font-size:' + (narrow ? '14px' : '16px') + '; color:#334155; max-width:46ch' }, biz.about),
          h('div', { style: 'display:flex; gap:10px; flex-wrap:wrap; align-items:center' }, cta(biz.cta, function () { page = 'contact'; draw(); }), h('span', { style: 'font-size:13px; color:#475569' }, '★★★★★ 4.9 from 112 reviews'))),
        h('div', { style: 'border-radius:20px; overflow:hidden' }, photo('#1D4ED8', '#7DD3FC', narrow ? 150 : 240, 'The clinic')));
      /* formal */
      return h('div', { style: 'padding:' + pad + '; display:grid; grid-template-columns:' + (narrow ? '1fr' : '1fr 1fr') + '; gap:28px; align-items:center; background:#fff; border-bottom:1px solid #E6E8EC' },
        h('div', {},
          h('h1', { style: 'font-family:' + biz.font + '; font-weight:600; font-size:' + (narrow ? '30px' : '42px') + '; line-height:1.1; margin:0 0 14px; color:' + biz.dark }, biz.tag),
          h('p', { style: 'margin:0 0 20px; font-size:' + (narrow ? '14px' : '16px') + '; color:#3B4754; max-width:48ch' }, biz.about),
          h('div', { style: 'display:flex; gap:10px; flex-wrap:wrap' }, cta(biz.cta, function () { page = 'contact'; draw(); }), cta('Our fees', function () { page = 'services'; draw(); }, true)),
          h('div', { style: 'margin-top:18px; font-size:12px; color:#6B7684; display:flex; gap:14px; flex-wrap:wrap' }, h('span', {}, 'Registered tax agents'), h('span', {}, 'Xero certified'), h('span', {}, 'Fixed monthly fees'))),
        h('div', { style: 'border-radius:8px; overflow:hidden' }, photo('#0B3B5C', '#5B8DB8', narrow ? 150 : 240, 'The team')));
    }
    function services() {
      var cards = biz.services.map(function (s, i) {
        return h('div', { style: (bold ? 'border-top:4px solid ' + biz.accent + '; padding-top:12px' : warm ? 'text-align:center; padding:18px; border:1px solid rgba(0,0,0,0.08); border-radius:12px; background:#fff' : clean ? 'padding:18px; border-radius:16px; background:#F8FAFC; border:1px solid #E2E8F0' : 'padding:18px 0; border-top:1px solid #E6E8EC') },
          clean ? h('div', { style: 'width:36px; height:36px; border-radius:10px; background:#DBEAFE; color:' + biz.accent + '; display:grid; place-items:center; margin-bottom:10px' }, icon(['star', 'check', 'clip'][i], 18)) : null,
          h('div', { style: 'font-family:' + biz.font + '; font-weight:700; font-size:' + (bold ? '20px' : '17px') + ';' + (bold ? 'text-transform:uppercase; letter-spacing:0.03em' : '') + ' margin-bottom:6px' }, s[0]),
          h('div', { style: 'font-size:14px; opacity:0.8' }, s[1]));
      });
      return h('div', { style: 'padding:' + (narrow ? '24px 18px' : '40px 28px') },
        page === 'services' ? h('h2', { style: 'font-family:' + biz.font + '; font-size:' + (narrow ? '24px' : '30px') + '; margin:0 0 18px;' + (bold ? 'text-transform:uppercase' : '') }, warm ? 'The menu, roughly' : 'What we do') : null,
        h('div', { style: 'display:grid; grid-template-columns:' + (narrow ? '1fr' : 'repeat(3,1fr)') + '; gap:' + (bold ? '22px' : '14px') }, cards),
        page === 'services' ? h('p', { style: 'margin:18px 0 0; font-size:14px; opacity:0.75' }, 'Fixed prices quoted before we start. No surprises on the invoice.') : null);
    }
    function about() {
      return h('div', { style: 'padding:' + (narrow ? '24px 18px' : '40px 28px') + '; display:grid; grid-template-columns:' + (narrow ? '1fr' : '1fr 1fr') + '; gap:24px; align-items:start' },
        h('div', {}, h('h2', { style: 'font-family:' + biz.font + '; font-size:' + (narrow ? '24px' : '30px') + '; margin:0 0 12px;' + (bold ? 'text-transform:uppercase' : '') }, 'About us'), h('p', { style: 'margin:0 0 10px; font-size:15px' }, biz.about), h('p', { style: 'margin:0; font-size:14px; opacity:0.8' }, 'Serving ' + biz.suburbs + '. Reviews: 4.9 from 112 Google reviews.')),
        h('div', { style: 'display:grid; grid-template-columns:1fr 1fr; gap:10px' }, [['Owner', biz.dark, biz.accent], ['Team', biz.accent, biz.p2], ['On site', biz.p2, biz.dark], ['The van', biz.dark, biz.p2]].map(function (c) { return h('div', { style: 'border-radius:10px; overflow:hidden' }, photo(c[1], c[2], 90, c[0])); })));
    }
    function contact() {
      var inputStyle = 'font:inherit; font-size:14px; padding:11px 12px; border:1px solid ' + (clean ? '#CBD5E1' : 'rgba(0,0,0,0.25)') + '; border-radius:' + (clean ? '10px' : bold ? '4px' : '8px') + '; width:100%; background:#fff; color:' + biz.ink;
      return h('div', { style: 'padding:' + (narrow ? '24px 18px' : '40px 28px') + '; display:grid; grid-template-columns:' + (narrow ? '1fr' : '1fr 1fr') + '; gap:28px' },
        h('div', {}, h('h2', { style: 'font-family:' + biz.font + '; font-size:' + (narrow ? '24px' : '30px') + '; margin:0 0 10px;' + (bold ? 'text-transform:uppercase' : '') }, 'Get in touch'), h('p', { style: 'margin:0 0 16px; font-size:14px; opacity:0.85' }, 'Call ' + biz.phone + ' or send this. Weekday enquiries are answered within the hour.'),
          h('div', { style: 'font-size:14px; display:grid; gap:6px; opacity:0.85' }, h('div', {}, '📍 ' + biz.suburbs.split(',')[0] + ', South Australia'), h('div', {}, '🕒 Mon to Fri 7am to 5pm'), h('div', {}, '✉ hello@' + biz.url))),
        form.sent ? h('div', { style: 'padding:18px; border-radius:10px; background:' + biz.accent + '14; border:1px solid ' + biz.accent }, h('b', { style: 'font-size:16px' }, 'Thanks, ' + (form.name || 'there') + '.'), h('p', { style: 'margin:8px 0 0; font-size:14px' }, 'Your message landed in our inbox and our job system at the same time. Expect a call within the hour on a weekday.'))
          : h('div', { style: 'display:grid; gap:10px' }, h('input', { placeholder: 'Your name', style: inputStyle, oninput: function (e) { form.name = e.target.value; } }), h('input', { placeholder: 'Phone or email', style: inputStyle }), h('textarea', { placeholder: 'What do you need?', rows: 3, style: inputStyle + '; resize:vertical' }), cta('Send message', function () { form.sent = true; draw(); })));
    }
    function foot() {
      return h('div', { style: 'margin-top:auto; padding:' + (narrow ? '16px 18px' : '20px 28px') + '; background:' + ((bold || formal) ? biz.dark : warm ? '#EFE7D6' : '#0F172A') + '; color:' + (warm ? biz.ink : '#fff') + '; font-size:12px; display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; opacity:0.95' },
        h('span', {}, '© ' + biz.name + ' · ABN 00 000 000 000 · ' + biz.suburbs.split(',')[0]), h('span', { style: 'opacity:0.7' }, 'Privacy · Site by Aaron Steele'));
    }
    function draw() {
      root.innerHTML = '';
      root.appendChild(nav());
      if (page === 'home') { root.appendChild(hero()); root.appendChild(services()); }
      else if (page === 'services') root.appendChild(services());
      else if (page === 'about') root.appendChild(about());
      else root.appendChild(contact());
      root.appendChild(foot());
    }
    draw();
    return { root: root, go: function (p) { page = p; draw(); } };
  }

  /* ------------------------------------------------------------------ */
  /* WordPress: the finished website, in a browser or a phone            */
  /* ------------------------------------------------------------------ */
  D.register('wordpress-site', function () {
    var key = 'sparky', view = 'desktop';
    var f = D.frame({ kind: 'browser', raw: true, browser: { url: BIZ[key].url }, title: 'A finished small-business website', status: 'click around the site',
      note: 'Five pages, a working enquiry form, fast on a phone, owned by you. Pick a business type to see the same build re-skinned; switch to the phone to see the mobile layout.' });
    var holder = f.stage;
    function draw() {
      var biz = BIZ[key], dev;
      if (view === 'desktop') { dev = D.browser({ url: biz.url }); dev.body.appendChild(miniSite(biz, { toastRoot: dev.root }).root); }
      else { dev = D.phone({ url: biz.url, accent: biz.accent }); dev.screen.classList.add('is-site'); dev.body.appendChild(miniSite(biz, { toastRoot: dev.root, narrow: true }).root); }
      holder.replaceChild(dev.root, holder.lastChild);
      holder.style.setProperty('--p-accent', biz.accent); dev.root.style.setProperty('--p-accent', biz.accent);
      f.status(biz.name + ' · ' + view, 'ok');
    }
    holder.insertBefore(controls(ctl('Business type', D.select(BIZ_OPTS, key, function (v) { key = v; draw(); })), ctl('Device', seg([['desktop', 'Desktop'], ['phone', 'Phone']], view, function (v) { view = v; draw(); }))), holder.firstChild);
    draw();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Website rebuild: before and after, same business, same URLs         */
  /* ------------------------------------------------------------------ */
  D.register('rebuild-before-after', function () {
    var biz = BIZ.accountant;
    var f = D.frame({ kind: 'browser', raw: true, browser: { url: biz.url }, accent: biz.accent, title: 'The rebuild: drag to compare', status: 'drag the handle',
      note: 'Same business, same domain, same page addresses redirected so the Google rankings the old site earned carry over. The after is a live site you can click; the before is the reason they rang.' });
    var before = h('div', { style: 'position:absolute; inset:0; background:#fff; color:#333; font-family:"Times New Roman", serif; overflow:hidden' },
      h('div', { style: 'background:#003366; color:#fff; padding:12px 16px; font-size:22px; font-weight:bold' }, 'OKAFOR & CO ACCOUNTANTS PTY LTD'),
      h('div', { style: 'display:flex; gap:12px; padding:6px 16px; background:#e6e6e6; font-size:13px; border-bottom:1px solid #bbb' }, ['Home', 'About Us', 'Services', 'Links', 'Contact Us'].map(function (t) { return h('u', { style: 'color:#00c' }, t); })),
      h('div', { style: 'padding:16px; font-size:14px; line-height:1.45; display:grid; grid-template-columns:1fr 180px; gap:16px' },
        h('div', {}, h('p', { style: 'margin:0 0 8px' }, h('b', {}, 'Welcome to our website!!')), h('p', { style: 'margin:0 0 8px' }, 'Okafor & Co has been providing quality accounting solutions since 2013. We are committed to excellence. Click ', h('u', { style: 'color:#00c' }, 'here'), ' to download our brochure (PDF, 8MB).'),
          h('table', { border: '1', cellpadding: '6', style: 'font-size:13px; border-collapse:collapse; margin-top:8px' }, h('tr', {}, h('td', {}, 'Tax Returns'), h('td', {}, 'Call for pricing')), h('tr', {}, h('td', {}, 'BAS'), h('td', {}, 'Call for pricing')), h('tr', {}, h('td', {}, 'Bookkeeping'), h('td', {}, 'Call for pricing'))),
          h('p', { style: 'margin:10px 0 0; font-size:11px; color:#888' }, 'Last updated: March 2017. Best viewed in Internet Explorer at 1024x768.'), h('p', { style: 'margin:6px 0 0; font-size:11px; color:#888' }, 'Visitors: 004213')),
        h('div', { style: 'border:1px solid #ccc; padding:8px; font-size:12px; background:#f4f4f4' }, h('b', {}, 'NEWS'), h('p', { style: 'margin:6px 0' }, 'Office closed Easter Monday 2018.'), h('div', { style: 'width:100%; height:70px; background:#ddd' }))));
    var after = h('div', { style: 'position:absolute; inset:0; overflow:hidden' }, miniSite(biz, { toastRoot: f.device.root }).root);
    var pos = 50;
    var stage = h('div', { style: 'position:relative; height:540px; overflow:hidden; background:#fff' });
    var afterClip = h('div', { style: 'position:absolute; inset:0; clip-path:inset(0 0 0 ' + pos + '%)' }, after);
    var handle = h('div', { style: 'position:absolute; top:0; bottom:0; left:' + pos + '%; width:3px; background:#fff; box-shadow:0 0 0 1px rgba(0,0,0,0.25); pointer-events:none; z-index:2' }, h('span', { style: 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:#111827; color:#fff; font:600 11px Inter,system-ui,sans-serif; padding:6px 10px; border-radius:999px; white-space:nowrap; box-shadow:0 6px 20px -6px rgba(0,0,0,0.5)' }, '◀ 2017   ·   now ▶'));
    stage.appendChild(before); stage.appendChild(afterClip); stage.appendChild(handle);
    f.body.appendChild(stage);
    var range = h('input', { type: 'range', min: 0, max: 100, value: pos, style: 'width:100%; accent-color:#111827', 'aria-label': 'Reveal before and after', oninput: function (e) { pos = +e.target.value; afterClip.style.clipPath = 'inset(0 0 0 ' + pos + '%)'; handle.style.left = pos + '%'; f.status(pos < 30 ? 'mostly the old site' : pos > 70 ? 'mostly the rebuild' : 'half and half', pos > 70 ? 'ok' : pos < 30 ? 'warn' : ''); } });
    f.stage.appendChild(h('div', { style: 'margin-top:14px' }, range));
    f.stage.appendChild(asides(
      aside('What carried over', h('div', { class: 'demo__kv' }, h('span', {}, 'Old addresses'), h('b', {}, '14 of 14 redirected'), h('span', {}, 'Google rankings'), h('b', {}, 'kept (the redirects do this)'), h('span', {}, 'Content'), h('b', {}, 'rewritten, nothing invented'), h('span', {}, 'Domain and email'), h('b', {}, 'untouched'))),
      aside('What changed', h('div', { class: 'demo__kv' }, h('span', {}, 'Load on a phone'), h('b', {}, '6.8 s → 1.2 s'), h('span', {}, 'Pricing'), h('b', {}, '"call for pricing" → fixed, published'), h('span', {}, 'Enquiries'), h('b', {}, 'a form that lands in the inbox and the CRM'), h('span', {}, 'Ownership'), h('b', {}, 'everything in the client\'s name')))));
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* E-commerce: a store that takes an order, end to end                 */
  /* ------------------------------------------------------------------ */
  D.register('store-checkout', function () {
    var f = D.frame({ kind: 'browser', raw: true, browser: { url: 'gumleafgoods.com.au' }, accent: '#3F6B4A', title: 'A working online store', status: 'add something to the cart',
      note: 'Products, cart, checkout, confirmation, and the part customers never see: stock adjusted, the sale posted to accounting, the fulfilment email queued. All in one motion, no retyping.' });
    var products = [{ id: 1, name: 'Enamel camp mug', price: 24, stock: 6, c: ['#3F6B4A', '#A9C5A0'] }, { id: 2, name: 'Wool blend beanie', price: 39, stock: 3, c: ['#6B4F3F', '#D8B89C'] }, { id: 3, name: 'Canvas tote', price: 32, stock: 11, c: ['#8C7A5B', '#E5D9BF'] }, { id: 4, name: 'Gift card $50', price: 50, stock: 99, gift: true, c: ['#B45309', '#FCD34D'] }];
    var cart = {}, step = 'shop', order = null, F = "'Playfair Display', Georgia, serif", B = "'Inter', system-ui, sans-serif", G = '#3F6B4A', paper = '#FBF9F4';
    var page = h('div', { style: 'background:' + paper + '; color:#1F2420; font-family:' + B + '; font-size:14px; min-height:520px; display:flex; flex-direction:column' });
    var log = h('pre', { class: 'demo__log' });
    function total() { return Object.keys(cart).reduce(function (a, id) { var p = products.filter(function (x) { return x.id === +id; })[0]; return a + p.price * cart[id]; }, 0); }
    function count() { return Object.keys(cart).reduce(function (a, id) { return a + cart[id]; }, 0); }
    function btn(label, onclick, ghost) { return h('button', { type: 'button', onclick: onclick, style: 'font:600 13px ' + B + '; cursor:pointer; padding:10px 16px; border-radius:6px;' + (ghost ? 'background:transparent; color:#1F2420; border:1px solid #1F2420' : 'background:#1F2420; color:#fff; border:1px solid #1F2420') }, label); }
    function header() {
      return h('div', { style: 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 28px; border-bottom:1px solid rgba(0,0,0,0.08); background:' + paper },
        h('span', { style: 'font-family:' + F + '; font-size:22px; font-weight:600; letter-spacing:-0.01em; cursor:pointer', onclick: function () { step = 'shop'; draw(); } }, 'Gum Leaf Goods'),
        h('span', { style: 'display:flex; gap:20px; font-size:13px; align-items:center' }, h('span', {}, 'Shop'), h('span', {}, 'About'), h('span', {}, 'Stockists'),
          h('button', { type: 'button', onclick: function () { if (count()) { step = 'details'; draw(); } }, style: 'font:600 13px ' + B + '; display:inline-flex; gap:8px; align-items:center; background:#fff; border:1px solid rgba(0,0,0,0.15); border-radius:999px; padding:7px 12px; cursor:pointer; color:inherit' }, icon('cart', 14), count() + ' · ' + money(total()))));
    }
    function draw() {
      page.innerHTML = '';
      page.appendChild(header());
      if (step === 'shop') {
        page.appendChild(h('div', { style: 'padding:28px 28px 8px' }, h('div', { style: 'font:600 11px ' + B + '; letter-spacing:0.16em; text-transform:uppercase; color:' + G }, 'New for autumn'), h('h1', { style: 'font-family:' + F + '; font-weight:500; font-size:34px; margin:6px 0 0; letter-spacing:-0.01em' }, 'Made to be used, made to last.')));
        page.appendChild(h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:18px; padding:20px 28px 32px' }, products.map(function (p) {
          var left = p.stock - (cart[p.id] || 0);
          return h('div', {}, h('div', { style: 'border-radius:8px; overflow:hidden; margin-bottom:10px' }, photo(p.c[0], p.c[1], 150, null)),
            h('div', { style: 'display:flex; justify-content:space-between; gap:8px; align-items:baseline' }, h('b', { style: 'font-weight:600' }, p.name), h('span', {}, money(p.price))),
            h('div', { style: 'font-size:12px; color:#6B7280; margin:2px 0 8px' }, p.gift ? 'Emailed instantly' : left > 0 ? left + ' in stock' : 'Sold out'),
            left > 0 ? h('button', { type: 'button', onclick: function () { cart[p.id] = (cart[p.id] || 0) + 1; draw(); D.toast(f.device.root, p.name + ' added to cart.', ''); }, style: 'font:600 13px ' + B + '; width:100%; padding:9px; border-radius:6px; border:1px solid #1F2420; background:#fff; cursor:pointer; color:inherit' }, 'Add to cart') : h('span', { style: 'display:block; text-align:center; font-size:12px; padding:9px; color:#9CA3AF; border:1px dashed #D1D5DB; border-radius:6px' }, 'Notify me'));
        })));
      } else if (step === 'details') {
        var inp = 'font:inherit; font-size:14px; padding:11px 12px; border:1px solid rgba(0,0,0,0.2); border-radius:6px; width:100%; background:#fff';
        page.appendChild(h('div', { style: 'display:grid; grid-template-columns:1.2fr 1fr; gap:28px; padding:28px' },
          h('div', { style: 'display:grid; gap:10px' }, h('h2', { style: 'font-family:' + F + '; font-weight:500; font-size:26px; margin:0 0 6px' }, 'Checkout'),
            h('div', { style: 'font:600 11px ' + B + '; letter-spacing:0.12em; text-transform:uppercase; color:#6B7280' }, 'Contact'), h('input', { value: 'jo@hargreaves.co', style: inp }),
            h('div', { style: 'font:600 11px ' + B + '; letter-spacing:0.12em; text-transform:uppercase; color:#6B7280; margin-top:8px' }, 'Delivery'), h('input', { value: 'Jo Hargreaves', style: inp }), h('input', { value: '12 Elm St, Prospect SA 5082', style: inp }),
            h('div', { style: 'font:600 11px ' + B + '; letter-spacing:0.12em; text-transform:uppercase; color:#6B7280; margin-top:8px' }, 'Payment'),
            h('div', { style: 'display:grid; grid-template-columns:2fr 1fr 1fr; gap:8px' }, h('input', { value: '4242 4242 4242 4242', style: inp, 'aria-label': 'Card number (test)' }), h('input', { value: '12 / 28', style: inp }), h('input', { value: '123', style: inp })),
            h('div', { style: 'display:flex; gap:10px; margin-top:8px; flex-wrap:wrap' }, btn('Pay ' + money(total() + 9.95, true), pay), btn('Back to shop', function () { step = 'shop'; draw(); }, true))),
          h('div', { style: 'background:#fff; border:1px solid rgba(0,0,0,0.08); border-radius:8px; padding:18px; align-self:start' }, h('h3', { style: 'font-family:' + F + '; font-weight:500; font-size:18px; margin:0 0 12px' }, 'Your order'),
            Object.keys(cart).map(function (id) { var p = products.filter(function (x) { return x.id === +id; })[0]; return h('div', { style: 'display:flex; justify-content:space-between; gap:8px; font-size:13px; padding:6px 0; border-bottom:1px solid rgba(0,0,0,0.06)' }, h('span', {}, cart[id] + ' × ' + p.name), h('span', {}, money(p.price * cart[id]))); }),
            h('div', { style: 'display:flex; justify-content:space-between; font-size:13px; padding:8px 0 0' }, h('span', {}, 'Shipping (Australia Post)'), h('span', {}, '$9.95')),
            h('div', { style: 'display:flex; justify-content:space-between; font-weight:600; padding:8px 0 0; font-size:15px' }, h('span', {}, 'Total inc GST'), h('span', {}, money(total() + 9.95, true))))));
      } else {
        page.appendChild(h('div', { style: 'padding:40px 28px; text-align:center; max-width:520px; margin:0 auto' },
          h('div', { style: 'width:52px; height:52px; border-radius:50%; background:' + G + '; color:#fff; display:grid; place-items:center; margin:0 auto 14px' }, icon('check', 26)),
          h('h2', { style: 'font-family:' + F + '; font-weight:500; font-size:28px; margin:0 0 8px' }, 'Thanks, Jo. Order ', h('span', { style: 'white-space:nowrap' }, order.id), ' is confirmed.'),
          h('p', { style: 'margin:0 0 18px; color:#4B5563' }, count() + ' item' + (count() === 1 ? '' : 's') + ', ' + money(order.total, true) + ' paid. Dispatching Tuesday from Adelaide; tracking will arrive by SMS.'),
          btn('Continue shopping', function () { cart = {}; step = 'shop'; draw(); }, true)));
      }
      page.appendChild(h('div', { style: 'margin-top:auto; padding:16px 28px; border-top:1px solid rgba(0,0,0,0.08); font-size:12px; color:#6B7280; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px' }, h('span', {}, '© Gum Leaf Goods · Adelaide'), h('span', {}, 'Shipping · Returns · Privacy')));
    }
    function pay() {
      var id = 'GL-' + (2040 + Math.floor(Math.random() * 900));
      log.innerHTML = '';
      logline(log, 'ok', 'Payment captured: ' + money(total() + 9.95, true) + ' (Stripe, test mode)');
      Object.keys(cart).forEach(function (cid) { var p = products.filter(function (x) { return x.id === +cid; })[0]; if (!p.gift) { p.stock -= cart[cid]; logline(log, 'ok', 'Stock: ' + p.name + ' ' + (p.stock + cart[cid]) + ' → ' + p.stock + (p.stock <= 2 ? ' (reorder alert sent to the supplier)' : '')); } else logline(log, 'warn', 'Gift card booked as a liability, not revenue, until it is redeemed'); });
      logline(log, 'ok', 'Accounting: invoice ' + id + ' posted to the Stripe clearing account, GST as its own line, fee to be booked from the payout');
      logline(log, 'ok', 'Fulfilment: picking slip printed, Australia Post label created, Tuesday run');
      logline(log, 'ok', 'Email: confirmation sent to jo@hargreaves.co');
      logline(log, 'dim', 'Things a human had to retype: 0');
      order = { id: id, total: total() + 9.95 }; step = 'done'; draw(); f.status('order ' + id + ' placed', 'ok');
    }
    f.device.body.appendChild(page); draw();
    logline(log, 'dim', 'Waiting for an order. Everything below happens automatically when one lands.');
    f.stage.appendChild(asides(aside('Meanwhile, in the back office', log)));
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Mobile apps: the app itself, in a phone                             */
  /* ------------------------------------------------------------------ */
  D.register('mobile-app', function () {
    var jobs = [
      { id: 1, who: 'Hargreaves', what: 'Switchboard upgrade', when: '8:00', where: 'Prospect', done: false, notes: [] },
      { id: 2, who: 'Nguyen', what: 'Safety switch tripping', when: '10:30', where: 'Norwood', done: false, notes: ['Tenant home after 10'] },
      { id: 3, who: 'Bella Vista Cafe', what: 'Extra circuits, kitchen', when: '13:00', where: 'Glenelg', done: false, notes: [] },
      { id: 4, who: 'Okafor', what: 'Downlights x 12', when: '15:30', where: 'Unley', done: true, notes: ['Paid on site'] }
    ];
    var view = { tab: 'today', open: null }, tabs = ['today', 'done', 'me'];
    var f = D.frame({ kind: 'phone', phone: { accent: '#F26B1D', title: 'Today', tabs: [['Today', 'cal'], ['Done', 'check'], ['Me', 'user']], onTab: function (i) { view.tab = tabs[i]; view.open = null; render(); } }, title: 'JobBook: the app, in a phone', status: 'tap around',
      note: 'One codebase, iOS and Android, your accounts, backend included. The app is real; the profile tab says who owns it, because that is part of the deliverable too.' });
    var P = f.device;
    function render() {
      P.body.innerHTML = '';
      var pending = jobs.filter(function (j) { return !j.done; }).length;
      P.title(view.open ? 'Job' : view.tab === 'today' ? 'Today' : view.tab === 'done' ? 'Done' : 'Me');
      P.right.innerHTML = ''; P.right.appendChild(h('span', { class: 'demo__pill demo__pill--' + (pending ? 'warn' : 'ok') }, pending + ' to go'));
      if (view.open) {
        var j = jobs.filter(function (x) { return x.id === view.open; })[0];
        P.body.appendChild(h('div', { class: 'demo__panel', style: 'display:grid; gap:6px' }, h('div', { style: 'font-weight:700; font-size:17px' }, j.who), h('div', {}, j.what), h('div', { class: 'dim', style: 'font-size:12px' }, j.when + ' · ' + j.where),
          h('div', { style: 'margin-top:8px; font-weight:600; font-size:12px; color:var(--p-mute)' }, 'NOTES'), j.notes.length ? h('ul', { style: 'margin:0; padding-left:1.1em; font-size:13px' }, j.notes.map(function (n) { return h('li', {}, n); })) : h('p', { class: 'dim', style: 'margin:0; font-size:13px' }, 'none yet')));
        P.body.appendChild(D.btn(j.done ? 'Reopen job' : 'Mark done', function () { j.done = !j.done; D.toast(P.root, j.done ? 'Done. Invoice drafted in accounting.' : 'Reopened.', j.done ? 'ok' : ''); view.open = null; render(); }));
        P.body.appendChild(D.btn('Add a note', function () { j.notes.push(['Parts on order', 'Customer wants a call first', 'Access via side gate'][j.notes.length % 3]); render(); }, 'demo__btn--ghost'));
        P.body.appendChild(D.btn('Back', function () { view.open = null; render(); }, 'demo__btn--ghost demo__btn--small'));
      } else if (view.tab === 'me') {
        P.body.appendChild(h('div', { class: 'demo__panel', style: 'text-align:center' }, h('span', { class: 'dv__avatar', style: 'width:56px; height:56px; font-size:20px; margin:4px auto 10px' }, 'ST'), h('div', { style: 'font-weight:700; font-size:16px' }, 'Sam Tran'), h('div', { class: 'dim', style: 'font-size:13px' }, 'Licensed electrician')));
        P.body.appendChild(h('div', { class: 'demo__panel', style: 'display:grid; gap:8px; font-size:13px' }, [['App store accounts', 'yours'], ['Source code', 'yours'], ['Backend and data', 'yours']].map(function (r) { return h('div', { style: 'display:flex; justify-content:space-between' }, h('span', {}, r[0]), h('span', { class: 'demo__pill demo__pill--ok' }, r[1])); }), h('p', { class: 'dim', style: 'margin:4px 0 0; font-size:12px' }, 'The screen nobody demos, included because you own it.')));
      } else {
        jobs.filter(function (j) { return view.tab === 'done' ? j.done : !j.done; }).forEach(function (j) { P.body.appendChild(h('div', { class: 'item', onclick: function () { view.open = j.id; render(); } }, h('span', {}, h('b', { style: 'font-weight:600' }, j.who), h('br'), h('span', { style: 'font-size:12.5px; color:var(--p-dim)' }, j.what)), h('span', { class: 'dim', style: 'font-size:12px; text-align:right' }, h('b', { style: 'color:var(--p-fg); font-weight:600' }, j.when), h('br'), j.where))); });
        if (!P.body.children.length) P.body.appendChild(h('p', { class: 'dim', style: 'padding:14px; text-align:center' }, 'Nothing here yet.'));
      }
    }
    render();
    f.stage.appendChild(asides(aside('What you are looking at', h('p', {}, 'A job list for a small crew: today\'s work, notes from the field, done with one tap, invoice drafted the moment a job closes. The same app ships to both stores from one codebase.'), h('p', {}, 'Swap the jobs for bookings, deliveries, inspections or patients and it is the same build. And if a good mobile website would do the job instead, you will hear that first.'))));
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Custom software: a working internal tool                            */
  /* ------------------------------------------------------------------ */
  D.register('internal-tool', function () {
    var f = D.frame({ kind: 'app', app: { name: 'Quoteboard', mark: 'Q', accent: '#0F766E', side: '#0B2F2C', nav: [['Overview', 'home'], ['Quotes', 'doc'], ['Jobs', 'clip'], ['Invoices', 'dollar'], ['Clients', 'users'], ['Settings', 'cog']], active: 1, title: 'Quotes', user: 'Jo Hargreaves' },
      title: 'Quotes and jobs tracker', status: 'the tool your spreadsheet wants to be',
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
    var pillFor = { quoted: '', accepted: 'ok', 'in progress': 'ok', invoiced: 'warn', paid: 'ok', lost: 'bad' };
    var tiles = h('div', { class: 'demo__grid', style: 'grid-template-columns:repeat(auto-fit,minmax(150px,1fr))' }), tbl = h('div');
    var form = { client: '', desc: '', amt: '' };
    function draw() {
      var open = rows.filter(function (r) { return r.stage === 'quoted'; }), won = rows.filter(function (r) { return ['accepted', 'in progress', 'invoiced', 'paid'].indexOf(r.stage) >= 0; }), lost = rows.filter(function (r) { return r.stage === 'lost'; });
      var owing = rows.filter(function (r) { return r.stage === 'invoiced'; }).reduce(function (a, r) { return a + r.amt; }, 0);
      tiles.innerHTML = '';
      tiles.appendChild(D.kpi('Quotes out', money(open.reduce(function (a, r) { return a + r.amt; }, 0)), open.length + ' open'));
      tiles.appendChild(D.kpi('Win rate', Math.round(won.length / Math.max(1, won.length + lost.length) * 100) + '%', won.length + ' won, ' + lost.length + ' lost'));
      tiles.appendChild(D.kpi('Work booked', money(won.filter(function (r) { return r.stage !== 'paid'; }).reduce(function (a, r) { return a + r.amt; }, 0)), 'accepted to invoiced'));
      tiles.appendChild(D.kpi('Owed to you', money(owing), owing ? 'chase on day 14' : 'nothing outstanding', owing ? 'warn' : 'ok'));
      tbl.innerHTML = '';
      tbl.appendChild(D.table(['Quote', 'Client', 'Work', 'Amount', 'Stage', ''], rows.map(function (r) {
        return h('tr', {}, h('td', {}, h('code', {}, r.id)), h('td', { style: 'font-weight:500' }, r.client), h('td', {}, r.desc), h('td', { class: 'num' }, money(r.amt)), h('td', {}, h('span', { class: 'demo__pill' + (pillFor[r.stage] ? ' demo__pill--' + pillFor[r.stage] : '') }, r.stage)),
          h('td', {}, h('span', { class: 'demo__row', style: 'gap:6px; flex-wrap:nowrap' }, next[r.stage] ? D.btn('→ ' + next[r.stage], function () { r.stage = next[r.stage]; if (r.stage === 'invoiced') D.toast(f.device.root, 'Invoice ' + r.id.replace('Q', 'INV') + ' created in accounting and emailed.', 'ok'); draw(); }, 'demo__btn--small') : '', r.stage === 'quoted' ? D.btn('lost', function () { r.stage = 'lost'; draw(); }, 'demo__btn--small demo__btn--ghost') : '')));
      })));
      f.status(rows.length + ' quotes · ' + money(owing) + ' outstanding', owing ? 'warn' : 'ok');
    }
    f.body.appendChild(tiles);
    f.body.appendChild(h('div', { class: 'demo__panel' }, h('h4', {}, 'New quote'), h('div', { class: 'demo__row' },
      h('input', { class: 'demo__input', placeholder: 'Client', oninput: function (e) { form.client = e.target.value; } }), h('input', { class: 'demo__input', placeholder: 'What for', oninput: function (e) { form.desc = e.target.value; } }), h('input', { class: 'demo__input', placeholder: 'Amount', type: 'number', style: 'max-width:130px', oninput: function (e) { form.amt = e.target.value; } }),
      D.btn('Add quote', function () { if (!form.client || !+form.amt) { D.toast(f.device.root, 'Client and amount, please. The tool refuses half a record.', 'bad'); return; } rows.unshift({ id: 'Q-' + (n++), client: form.client, desc: form.desc || 'TBC', amt: +form.amt, stage: 'quoted' }); draw(); D.toast(f.device.root, 'Quote added and PDF emailed to ' + form.client + '.', 'ok'); }))));
    f.body.appendChild(tbl); draw();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* CRM & automation: a working pipeline with automations that fire     */
  /* ------------------------------------------------------------------ */
  D.register('crm-pipeline', function () {
    var f = D.frame({ kind: 'app', app: { name: 'Pipeline', mark: 'P', accent: '#4F46E5', side: '#1E1B4B', nav: [['Deals', 'board'], ['Contacts', 'users'], ['Automations', 'cog'], ['Inbox', 'inbox'], ['Reports', 'chart']], active: 0, title: 'Deals', user: 'Dee Marsh' },
      title: 'Your CRM, moving deals and doing the chores', status: 'move a deal, watch the automations',
      note: 'A pipeline your team will actually use, because it does the work for them: every stage change fires the follow-ups, tasks and accounting entries that people used to retype. Set up in HubSpot, Zoho or a simpler tool, whichever fits.' });
    var stages = ['New', 'Contacted', 'Quoted', 'Won'];
    var deals = [{ co: 'Bella Vista Cafe', v: 4800, s: 0, who: 'Marco' }, { co: 'Marion Netball Club', v: 18400, s: 1, who: 'Dee' }, { co: 'Hargreaves Electrical', v: 2650, s: 2, who: 'Jo' }, { co: 'Okafor & Co', v: 6200, s: 2, who: 'Tom' }, { co: 'Nair Physio', v: 3100, s: 3, who: 'Priya' }];
    var board = h('div', { class: 'demo__grid', style: 'grid-template-columns:repeat(4,minmax(150px,1fr)); gap:10px' }), log = h('pre', { class: 'demo__log' });
    function fire(d, from, to) {
      var lines = { 1: ['Email drafted to ' + d.who + ' for your approval', 'Task created: call ' + d.who + ', due tomorrow 9am'], 2: ['Quote PDF generated from the deal line items, awaiting your send', 'Follow-up scheduled in 3 business days if unopened'], 3: ['Invoice drafted in accounting for ' + money(d.v) + ' with GST, deposit terms applied', 'Welcome email and next steps sent to ' + d.who, 'Kickoff proposed in the calendar: Wednesday 11:30'] };
      logline(log, 'dim', d.co + ' moved ' + stages[from] + ' → ' + stages[to]);
      (lines[to] || []).forEach(function (l, i) { setTimeout(function () { logline(log, 'ok', l); }, 180 * (i + 1)); });
    }
    function draw() {
      board.innerHTML = '';
      stages.forEach(function (s, i) {
        var col = h('div', { style: 'background:var(--p-bg); border:1px solid var(--p-line); border-radius:10px; padding:10px; min-height:200px' }, h('div', { style: 'font-weight:600; display:flex; justify-content:space-between; font-size:13px; padding:2px 4px 8px' }, h('span', {}, s, ' ', h('span', { class: 'dim' }, String(deals.filter(function (d) { return d.s === i; }).length))), h('span', { class: 'dim', style: 'font-weight:500' }, money(deals.filter(function (d) { return d.s === i; }).reduce(function (a, d) { return a + d.v; }, 0)))));
        deals.filter(function (d) { return d.s === i; }).forEach(function (d) {
          col.appendChild(h('div', { class: 'demo__panel', style: 'padding:10px 12px; margin-top:8px; font-size:13px; border-left:3px solid var(--p-accent)' }, h('b', { style: 'font-weight:600' }, d.co), h('div', { class: 'dim', style: 'font-size:12px; margin-top:2px' }, money(d.v) + ' · ' + d.who), h('div', { class: 'demo__row', style: 'gap:4px; margin-top:8px; justify-content:space-between' }, h('span', { class: 'dv__avatar', style: 'width:22px; height:22px; font-size:9px' }, d.who.slice(0, 2).toUpperCase()), i < 3 ? D.btn('Move →', function () { d.s++; fire(d, i, d.s); draw(); }, 'demo__btn--small') : h('span', { class: 'demo__pill demo__pill--ok' }, 'won'))));
        });
        board.appendChild(col);
      });
      f.status(deals.filter(function (d) { return d.s === 3; }).length + ' won · ' + money(deals.reduce(function (a, d) { return a + (d.s < 3 ? d.v : 0); }, 0)) + ' in pipeline', 'ok');
    }
    var lead = { co: '', who: '' };
    f.body.appendChild(h('div', { class: 'demo__row', style: 'justify-content:space-between' }, h('span', { class: 'demo__row' }, h('input', { class: 'demo__input', placeholder: 'Company', oninput: function (e) { lead.co = e.target.value; } }), h('input', { class: 'demo__input', placeholder: 'Contact', oninput: function (e) { lead.who = e.target.value; } }), D.btn('+ Add lead', function () { if (!lead.co) return; deals.push({ co: lead.co, v: 2500, s: 0, who: lead.who || 'them' }); logline(log, 'ok', lead.co + ' created from the web form; deduplicated against existing contacts on ABN, none found'); draw(); })), h('span', { class: 'dim', style: 'font-size:12px' }, 'Automations: 6 active')));
    f.body.appendChild(board);
    f.body.appendChild(h('div', {}, h('div', { style: 'font-weight:600; font-size:13px; margin:0 0 8px' }, 'Automation activity'), log));
    logline(log, 'dim', 'Move a deal with the arrow. Every stage change does its chores.');
    draw();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Data & reporting: the finished dashboard                            */
  /* ------------------------------------------------------------------ */
  D.register('dashboard', function () {
    var f = D.frame({ kind: 'app', app: { name: 'Insights', mark: '▮', accent: '#0EA5E9', side: '#0C1A2B', nav: [['Overview', 'chart'], ['Revenue', 'dollar'], ['Jobs', 'clip'], ['Branches', 'map'], ['Exports', 'doc']], active: 0, title: 'Overview', user: 'Priya Nair' },
      title: 'The dashboard your Monday needs', status: 'filter it',
      note: 'Pulled from where the numbers actually live, refreshed on a schedule, opened on a phone. Every figure is derived from the rows behind it, so it cannot quietly drift from the truth.' });
    var r = D.rng(3), branches = ['North', 'South', 'Online'], months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], data = [];
    branches.forEach(function (b, bi) { months.forEach(function (m, mi) { data.push({ b: b, m: m, rev: Math.round(28000 + bi * 6000 + mi * 1800 + r() * 9000), jobs: Math.round(40 + r() * 30), late: Math.round(r() * 6) }); }); });
    var fb = '', fm = 'all', tiles = h('div', { class: 'demo__grid', style: 'grid-template-columns:repeat(auto-fit,minmax(150px,1fr))' }), chart = h('div', { class: 'demo__panel' }), tbl = h('div');
    function draw() {
      var rows = data.filter(function (d) { return (!fb || d.b === fb) && (fm === 'all' || months.indexOf(d.m) >= months.length - +fm); });
      var rev = rows.reduce(function (a, d) { return a + d.rev; }, 0), jobs = rows.reduce(function (a, d) { return a + d.jobs; }, 0), late = rows.reduce(function (a, d) { return a + d.late; }, 0);
      tiles.innerHTML = '';
      tiles.appendChild(D.kpi('Revenue', money(rev), '+6.2% vs prior', 'ok')); tiles.appendChild(D.kpi('Jobs', fmt(jobs), 'completed')); tiles.appendChild(D.kpi('Avg ticket', money(rev / Math.max(1, jobs)), 'per job')); tiles.appendChild(D.kpi('Late jobs', fmt(late), late > jobs * 0.06 ? 'above the 6% target' : 'within target', late > jobs * 0.06 ? 'bad' : 'ok'));
      var byM = months.filter(function (m) { return fm === 'all' || months.indexOf(m) >= months.length - +fm; }).map(function (m) { return [m, rows.filter(function (d) { return d.m === m; }).reduce(function (a, d) { return a + d.rev; }, 0)]; });
      var W = 640, H = 200, pad = 30, bw = (W - pad * 2) / byM.length, max = Math.max.apply(null, byM.map(function (x) { return x[1]; }));
      var svg = '<svg class="demo__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Revenue by month">';
      [0.25, 0.5, 0.75, 1].forEach(function (g) { var y = H - 30 - g * (H - 60); svg += '<line x1="' + pad + '" y1="' + y + '" x2="' + (W - pad) + '" y2="' + y + '" stroke="#e5e7eb"></line>'; });
      byM.forEach(function (x, i) { var bh = x[1] / max * (H - 60); svg += '<rect rx="4" x="' + (pad + i * bw + 10) + '" y="' + (H - 30 - bh) + '" width="' + (bw - 20) + '" height="' + bh + '" fill="var(--p-accent)"></rect><text x="' + (pad + i * bw + bw / 2) + '" y="' + (H - 12) + '" font-size="11" text-anchor="middle" fill="#6b7280" font-family="Inter,sans-serif">' + x[0] + '</text><text x="' + (pad + i * bw + bw / 2) + '" y="' + (H - 36 - bh) + '" font-size="11" text-anchor="middle" fill="#111827" font-family="Inter,sans-serif" font-weight="600">' + Math.round(x[1] / 1000) + 'k</text>'; });
      chart.innerHTML = ''; chart.appendChild(h('h4', {}, 'Revenue by month')); chart.appendChild(h('div', { html: svg + '</svg>' }));
      tbl.innerHTML = '';
      tbl.appendChild(D.table(['Branch', 'Revenue', 'Jobs', 'Late', 'Share'], branches.filter(function (b) { return !fb || b === fb; }).map(function (b) { var rr = rows.filter(function (d) { return d.b === b; }), rv = rr.reduce(function (a, d) { return a + d.rev; }, 0); return h('tr', {}, h('td', { style: 'font-weight:500' }, b), h('td', { class: 'num' }, money(rv)), h('td', { class: 'num' }, fmt(rr.reduce(function (a, d) { return a + d.jobs; }, 0))), h('td', { class: 'num' }, fmt(rr.reduce(function (a, d) { return a + d.late; }, 0))), h('td', { style: 'min-width:120px' }, D.bar(rv, rev))); })));
      f.status((fb || 'all branches') + ' · ' + (fm === 'all' ? '6 months' : 'last ' + fm), 'ok');
    }
    f.body.appendChild(h('div', { class: 'demo__row', style: 'justify-content:space-between' }, h('span', { class: 'demo__row' }, D.select([['', 'All branches']].concat(branches), fb, function (v) { fb = v; draw(); }), D.select([['all', 'Last 6 months'], ['3', 'Last 3 months'], ['1', 'Last month']], fm, function (v) { fm = v; draw(); })), h('span', { class: 'dim', style: 'font-size:12px' }, 'Refreshed 06:00 from accounting and the job system')));
    f.body.appendChild(tiles); f.body.appendChild(chart); f.body.appendChild(tbl); draw();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* AI development: the assistant, live on the business's own website   */
  /* ------------------------------------------------------------------ */
  D.register('ai-assistant', function () {
    var key = 'physio';
    var f = D.frame({ kind: 'browser', raw: true, browser: { url: BIZ[key].url }, accent: BIZ[key].accent, title: 'A customer assistant on the business\'s own site', status: 'ask it something',
      note: 'This slice runs on rules in your browser so it works without a key; the production version uses a language model with the same guardrails: answer from your facts, book from your calendar, escalate anything it is not sure of, never invent.' });
    var kb = {
      physio: { hours: 'Monday to Friday 7am to 7pm, Saturday 8am to 1pm.', price: 'Initial consult $120, follow-ups $95. Private health rebates on the spot.', book: 'Tuesday 10:30 with Priya or Wednesday 4:15 with Sam', park: 'Free parking behind the clinic, entry from George St.', who: 'Three physios: Priya (sports), Sam (backs and necks), Lee (post-surgery).' },
      cafe: { hours: 'Every day 7am to 3pm, kitchen until 2:30.', price: 'Breakfast from $14, coffee $4.80, catering boxes from $12 a head.', book: 'a table for 4 at 9:30 Saturday, or the back room for your function', park: 'Two-hour street parking on Jetty Rd; the council carpark is behind us.', who: 'Family-run since 2011.' },
      sparky: { hours: 'Weekdays 7am to 5pm; emergency call-outs 24/7.', price: 'Call-out $140 inc first half hour, then $95 per half hour. Quotes are free and fixed.', book: 'Thursday morning or next Monday afternoon', park: 'We come to you.', who: 'Two licensed electricians, fifteen years each.' }
    };
    var starters = { physio: ['Do you open Saturdays?', 'How much is a first visit?', 'Can I book this week?', 'My knee got worse after the last session'], cafe: ['Are you open Sunday?', 'Table for four Saturday morning?', 'Do you do catering?', 'Where do I park?'], sparky: ['Do you do emergency call-outs?', 'What is the call-out fee?', 'Can someone come Thursday?', 'Who will turn up?'] };
    function reply(t) {
      var k = kb[key], low = t.toLowerCase();
      if (/hour|open|close|when/.test(low)) return ['We are open ' + k.hours, 'answered from your hours'];
      if (/price|cost|how much|\$|fee|charge/.test(low)) return [k.price + ' Want me to book you in?', 'answered from your price list'];
      if (/book|appoint|table|slot|available|come out|come thursday/.test(low)) return ['I can offer ' + k.book + '. Which suits? I will hold it for you.', 'offered real gaps from your calendar'];
      if (/park/.test(low)) return [k.park, 'answered from your FAQ'];
      if (/who|staff|team|physio|electric/.test(low)) return [k.who, 'answered from your team page'];
      if (/refund|complain|angry|wrong|hurt|worse|emergency/.test(low)) return ['I am sorry to hear that. I have flagged this for ' + (key === 'physio' ? 'the practice manager' : 'the owner') + ' who will call you back today. Can I take the best number?', 'escalated to a human: not something an assistant should decide'];
      return ['Good question, and not one I am sure about, so I will not guess. I have passed it to the team and you will get a straight answer within the hour. Anything else I can help with meanwhile?', 'unknown: escalated instead of inventing an answer'];
    }
    var widget, thread, input, chips;
    function bubble(text, who, note) {
      var biz = BIZ[key];
      thread.appendChild(h('div', { style: 'justify-self:' + (who === 'you' ? 'end' : 'start') + '; max-width:88%' }, h('div', { style: 'padding:9px 12px; font-size:13px; line-height:1.45; border-radius:14px;' + (who === 'you' ? 'background:' + biz.accent + '; color:#fff; border-bottom-right-radius:4px' : 'background:#F3F4F6; color:#111827; border-bottom-left-radius:4px') }, text), note ? h('div', { style: 'font-size:10.5px; color:#6B7280; margin:3px 4px 0' }, note) : null));
      thread.scrollTop = thread.scrollHeight;
    }
    function send(t) { t = (t || input.value).trim(); if (!t) return; input.value = ''; bubble(t, 'you'); var r = reply(t); setTimeout(function () { bubble(r[0], 'bot', r[1]); f.status(r[1], /escalat/.test(r[1]) ? 'warn' : 'ok'); }, 450); }
    function build() {
      var biz = BIZ[key];
      f.device.setUrl(biz.url);
      f.stage.style.setProperty('--p-accent', biz.accent); f.device.root.style.setProperty('--p-accent', biz.accent);
      f.device.body.innerHTML = '';
      f.device.body.style.minHeight = '600px';
      f.device.body.appendChild(miniSite(biz, { toastRoot: f.device.root }).root);
      thread = h('div', { style: 'display:grid; gap:8px; height:230px; overflow:auto; padding:12px' });
      input = h('input', { placeholder: 'Ask a question…', style: 'flex:1; font:inherit; font-size:13px; padding:9px 12px; border:1px solid #D1D5DB; border-radius:999px; min-width:0' });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
      chips = h('div', { style: 'display:flex; gap:6px; flex-wrap:wrap; padding:0 12px 10px' }, starters[key].map(function (s) { return h('button', { type: 'button', class: 'demo__chip', style: 'font-size:11.5px; padding:4px 10px; min-height:26px', onclick: function () { send(s); } }, s); }));
      widget = h('div', { style: 'position:absolute; right:16px; bottom:16px; width:min(340px, calc(100% - 32px)); background:#fff; border-radius:16px; box-shadow:0 20px 50px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06); font-family:Inter,system-ui,sans-serif; color:#111827; z-index:3; overflow:hidden' },
        h('div', { style: 'display:flex; align-items:center; gap:10px; padding:12px 14px; background:' + biz.accent + '; color:#fff' }, h('span', { style: 'width:30px; height:30px; border-radius:50%; background:rgba(255,255,255,0.25); display:grid; place-items:center; font-weight:700; font-size:12px' }, biz.name.charAt(0)), h('span', {}, h('b', { style: 'display:block; font-size:13px' }, biz.name + ' assistant'), h('span', { style: 'font-size:11px; opacity:0.9' }, '● Online · replies in seconds')), h('span', { style: 'margin-left:auto; opacity:0.8' }, '−')),
        thread, chips,
        h('div', { style: 'display:flex; gap:8px; padding:10px 12px; border-top:1px solid #E5E7EB' }, input, h('button', { type: 'button', onclick: function () { send(); }, style: 'font:600 13px Inter,system-ui,sans-serif; background:' + biz.accent + '; color:#fff; border:0; border-radius:999px; padding:0 14px; cursor:pointer' }, 'Send')),
        h('div', { style: 'font-size:10px; color:#9CA3AF; text-align:center; padding:0 0 8px' }, 'Answers only from ' + biz.name + '\'s own information. A person takes over when it matters.'));
      f.device.body.appendChild(widget);
      bubble('Hi, I am the ' + biz.name + ' assistant. Ask me about hours, prices, bookings or anything on the site.', 'bot');
    }
    f.stage.insertBefore(controls(ctl('Business', D.select([['physio', 'A physio clinic'], ['cafe', 'A cafe'], ['sparky', 'An electrician']], key, function (v) { key = v; build(); f.status('ask it something'); }))), f.stage.firstChild);
    build();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Project rescue: two browser tabs, before and after                  */
  /* ------------------------------------------------------------------ */
  D.register('rescue-outcome', function () {
    var biz = BIZ.cafe, mode = 'before';
    var f = D.frame({ kind: 'browser', raw: true, accent: biz.accent, browser: { url: 'staging-v3.someagency.dev', path: '/bellavista', tabs: [
      { label: 'bellavista-new-site-v3 (staging)', active: true, onclick: function () { mode = 'before'; draw(); } },
      { label: 'Bella Vista · Glenelg', dot: true, onclick: function () { mode = 'after'; draw(); } }] },
      title: 'A rescued project: what you end up with', status: 'switch tabs',
      note: 'The end result of a rescue is not a report. It is the finished site, live, and every account in your name with the passwords in your hands. Both are shown here; both are the deliverable.' });
    function draw() {
      f.device.body.innerHTML = '';
      if (mode === 'before') {
        f.device.setUrl('staging-v3.someagency.dev', '/bellavista');
        f.device.body.appendChild(h('div', { style: 'background:#fff; color:#444; font-family:Arial, sans-serif; min-height:520px' },
          h('div', { style: 'background:#222; color:#fff; padding:14px 18px; display:flex; justify-content:space-between; align-items:center' }, h('b', {}, 'bellavista-new-site-v3'), h('span', { style: 'font-size:12px; opacity:0.7' }, 'Home · About · Menu · Blog · Shop · Contact')),
          h('div', { style: 'padding:18px' },
            h('div', { style: 'height:170px; background:repeating-linear-gradient(45deg,#eee,#eee 10px,#f7f7f7 10px,#f7f7f7 20px); display:grid; place-items:center; color:#999; font-size:13px; border:1px dashed #ccc' }, '[hero image placeholder 1920x600]'),
            h('h2', { style: 'margin:16px 0 6px; font-size:28px' }, 'Lorem ipsum dolor sit amet'),
            h('p', { style: 'font-size:14px; line-height:1.5; margin:0 0 12px' }, 'Consectetur adipiscing elit, sed do eiusmod tempor. INSERT CAFE DESCRIPTION HERE. Contact us at ', h('u', {}, 'email@example.com'), ' or call 04XX XXX XXX.'),
            h('div', { style: 'display:flex; gap:10px; flex-wrap:wrap' }, h('span', { style: 'padding:9px 14px; background:#ddd; font-size:13px; border-radius:3px' }, 'Order online (coming soon)'), h('span', { style: 'padding:9px 14px; border:1px solid #ccc; font-size:13px; color:#c00; border-radius:3px' }, 'Menu (404)')),
            h('div', { style: 'margin-top:18px; padding:10px 12px; background:#FFF4E5; border:1px solid #F5C38B; font-size:12px; color:#8A4B08; display:grid; gap:4px' }, h('b', {}, 'Site health: 3 warnings'), h('span', {}, '3 plugins need updates · SSL certificate expired 41 days ago · admin user: developer@agency (you are not an administrator)')))));
        f.status('as inherited: 60% built, developer gone', 'bad');
      } else {
        f.device.setUrl(biz.url);
        f.device.body.appendChild(miniSite(biz, { toastRoot: f.device.root }).root);
        f.status('after: live, finished, yours', 'ok');
      }
    }
    var own = [['Domain', 'client\'s registrar account, auto-renew on'], ['Hosting', 'client\'s account, invoices to the client'], ['Site admin', 'client is the only administrator'], ['Code and theme', 'in the client\'s repository, backed up'], ['Email', 'untouched throughout'], ['Analytics and Search Console', 'owner: client; developer removed']];
    f.stage.appendChild(asides(aside('Who owns what, after', h('div', { class: 'demo__kv' }, own.map(function (o) { return [h('span', {}, o[0]), h('b', {}, h('span', { class: 'demo__pill demo__pill--ok' }, 'you'), ' ' + o[1])]; }).reduce(function (a, b) { return a.concat(b); }, [])))));
    draw();
    return f.root;
  });

  /* ------------------------------------------------------------------ */
  /* Business analysis: the deliverables, as documents                   */
  /* ------------------------------------------------------------------ */
  D.register('ba-deliverables', function () {
    var tab = 'map', future = false;
    var f = D.frame({ kind: 'doc', doc: { title: 'Process-map-current-and-future.pdf', meta: 'Hargreaves Electrical · v1.2 · 4 pages', files: [
      { label: 'Process map', file: 'Process-map-current-and-future.pdf', active: true, onclick: function () { tab = 'map'; draw(); } },
      { label: 'Requirements', file: 'Requirements-prioritised.xlsx', onclick: function () { tab = 'req'; draw(); } },
      { label: 'Options paper', file: 'Options-paper-and-recommendation.pdf', onclick: function () { tab = 'options'; draw(); } },
      { label: 'Delivery plan', file: 'Delivery-plan-10-weeks.pdf', onclick: function () { tab = 'plan'; draw(); } }] },
      accent: '#334155', title: 'The documents you actually receive', status: 'four documents, all finished',
      note: 'Not a workshop: the outputs. A current-and-future process map, prioritised requirements, an options paper with a recommendation, and a plan with dates. Written so your board, your staff and your developer all read the same thing.' });
    function head(title, sub) { return [h('div', { class: 'dochead' }, h('span', {}, 'Hargreaves Electrical · Quoting and scheduling review'), h('span', {}, 'Prepared by Aaron Steele · v1.2')), h('h2', {}, title), h('p', { style: 'margin:0 0 18px; color:#4b5563; font-style:italic' }, sub)]; }
    function mapSvg(fut) {
      var actors = ['Customer', 'Admin', 'Owner'], steps = fut
        ? [['Customer', 'enquires on website'], ['Customer', 'gets instant quote range'], ['Admin', 'approves quote (1 click)'], ['Customer', 'accepts online'], ['Owner', 'does the job'], ['Admin', 'invoice auto-sent']]
        : [['Customer', 'emails enquiry'], ['Admin', 'retypes to spreadsheet'], ['Admin', 'waits for owner'], ['Owner', 'prices from memory'], ['Admin', 'emails PDF quote'], ['Customer', 'chases by phone'], ['Customer', 'accepts by email'], ['Admin', 'retypes into scheduler'], ['Owner', 'does the job'], ['Admin', 'retypes into accounting']];
      var colW = Math.max(72, (760 - 120) / steps.length), W = Math.max(760, 120 + colW * steps.length), rowH = 64, H = actors.length * rowH + 16, svg = '<svg class="demo__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Process map" font-family="Inter,sans-serif">';
      actors.forEach(function (a, i) { svg += '<rect x="0" y="' + (i * rowH + 8) + '" width="' + W + '" height="' + rowH + '" fill="' + (i % 2 ? '#fff' : '#f3f4f6') + '"></rect><text x="8" y="' + (i * rowH + 42) + '" font-size="12" font-weight="600" fill="#111827">' + a + '</text>'; });
      steps.forEach(function (s, j) {
        var row = actors.indexOf(s[0]), x = 110 + j * colW, y = row * rowH + 20, bad = /retype|wait|chase|memory/.test(s[1]);
        if (j > 0) { var px = 110 + (j - 1) * colW + colW * 0.8 - 6, py = actors.indexOf(steps[j - 1][0]) * rowH + 42; svg += '<line x1="' + px + '" y1="' + py + '" x2="' + x + '" y2="' + (y + 22) + '" stroke="#6b7280" stroke-width="1.2" stroke-dasharray="4 3"></line>'; }
        svg += '<rect rx="4" x="' + x + '" y="' + y + '" width="' + (colW * 0.8 - 6) + '" height="44" fill="' + (bad ? '#fee2e2' : fut ? '#dcfce7' : '#fff') + '" stroke="' + (bad ? '#dc2626' : fut ? '#16a34a' : '#374151') + '" stroke-width="1.2"></rect>';
        var w = s[1].split(' '); svg += '<text x="' + (x + 6) + '" y="' + (y + 18) + '" font-size="9.5" fill="#111827">' + w.slice(0, 2).join(' ') + '</text><text x="' + (x + 6) + '" y="' + (y + 32) + '" font-size="9.5" fill="#111827">' + w.slice(2, 5).join(' ') + '</text>';
      });
      return svg + '</svg>';
    }
    function draw() {
      var sheet = h('div', { class: 'dv__sheet' });
      if (tab === 'map') {
        sheet.appendChild(h('div', {}, head('Process map: quote to invoice', 'How a job moves through the business today, and how it will move after the change.')));
        sheet.appendChild(h('div', { class: 'demo__row', style: 'margin-bottom:10px; font-family:Inter,sans-serif; font-size:13px' }, h('b', {}, future ? 'Future state: 6 steps, 0 retyping, 0 waits' : 'Current state: 10 steps, 3 retypes, 2 waits'), D.btn(future ? 'Show current state' : 'Show future state', function () { future = !future; draw(); }, 'demo__btn--small demo__btn--ghost')));
        sheet.appendChild(h('div', { html: mapSvg(future) }));
        sheet.appendChild(h('h4', {}, 'Reading the map'));
        sheet.appendChild(h('p', { style: 'margin:0' }, 'Red boxes are where information is retyped or waits for a person. Each one is a place a quote can be lost, and each disappears in the future state because the website, the quoting layer and accounting share one record.'));
      } else if (tab === 'req') {
        sheet.appendChild(h('div', {}, head('Requirements, prioritised', 'Must, Should and Could, each with a test for done that both sides sign.')));
        sheet.appendChild(D.table(['#', 'Requirement', 'Priority', 'Done means'], [
          ['R1', 'Enquiries from the website create a quote record automatically', 'Must', 'no enquiry is ever typed twice'],
          ['R2', 'Customers see an instant price range for standard jobs', 'Must', 'range shown in under 2 seconds; fixed quote follows'],
          ['R3', 'Owner approves quotes from a phone in one tap', 'Must', 'approval takes under 30 seconds'],
          ['R4', 'Accepted quotes become scheduled jobs without retyping', 'Should', 'job appears in the schedule the moment the customer accepts'],
          ['R5', 'Completed jobs invoice themselves', 'Should', 'invoice sent within 5 minutes of "done"'],
          ['R6', 'Weekly report of quotes out, won, lost', 'Could', 'emailed Monday 7am, numbers reconcile to accounting']
        ].map(function (r) { return h('tr', {}, h('td', {}, h('code', {}, r[0])), h('td', {}, r[1]), h('td', {}, h('span', { class: 'demo__pill' + (r[2] === 'Must' ? ' demo__pill--bad' : r[2] === 'Should' ? ' demo__pill--warn' : '') }, r[2])), h('td', { style: 'color:#4b5563' }, r[3])); })));
      } else if (tab === 'options') {
        sheet.appendChild(h('div', {}, head('Options paper', 'Three ways to solve it, costed as ranges you can hold me to, with a recommendation.')));
        sheet.appendChild(h('div', { class: 'demo__grid' }, [
          ['A. Off-the-shelf job app', '$60 to $150 / month', 'Fast, proven, but your quoting process bends to fit it. Fine if you can live with that.', 'warn'],
          ['B. Off-the-shelf plus a small custom layer', '$4k to $7k once + subscription', 'The app runs jobs; a thin custom piece does your quoting and joins accounting. Best value for how you actually work.', 'ok'],
          ['C. Fully custom system', '$18k to $30k', 'Exactly your process, nothing else. Only worth it if the process is your competitive edge, and it is not, yet.', 'bad']
        ].map(function (o) { return h('div', { class: 'demo__panel', style: o[3] === 'ok' ? 'border-color:#16a34a; box-shadow:0 0 0 2px #dcfce7' : '' }, h('h4', {}, o[0]), h('span', { class: 'demo__pill demo__pill--' + o[3] }, o[1]), h('p', { style: 'margin:8px 0 0; font-size:13px; color:#374151' }, o[2])); })));
        sheet.appendChild(h('h4', {}, 'Recommendation'));
        sheet.appendChild(h('p', { style: 'margin:0' }, h('b', {}, 'Option B.'), ' Reasons are written down, costs are ranges you can hold me to, and the risks of A and C are named, not hidden.'));
      } else {
        sheet.appendChild(h('div', {}, head('Delivery plan', 'Ten weeks, fixed price, one accountable person.')));
        var weeks = 10, tasks = [['Discovery and process map', 1, 2], ['Choose and set up the job app', 2, 3], ['Build the quoting layer', 4, 6], ['Join accounting', 6, 7], ['Staff training and parallel run', 8, 9], ['Go live and hypercare', 10, 10]];
        var W = 720, rowH = 30, H = tasks.length * rowH + 30, colW = (W - 220) / weeks, svg = '<svg class="demo__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Project plan" font-family="Inter,sans-serif">';
        for (var w = 1; w <= weeks; w++) svg += '<text x="' + (220 + (w - 0.5) * colW) + '" y="14" font-size="10" text-anchor="middle" fill="#6b7280">W' + w + '</text><line x1="' + (220 + (w - 1) * colW) + '" y1="20" x2="' + (220 + (w - 1) * colW) + '" y2="' + H + '" stroke="#f3f4f6"></line>';
        tasks.forEach(function (t, i) { var y = 24 + i * rowH; svg += '<text x="4" y="' + (y + 14) + '" font-size="11" fill="#111827">' + t[0] + '</text><rect rx="4" x="' + (220 + (t[1] - 1) * colW) + '" y="' + y + '" width="' + ((t[2] - t[1] + 1) * colW - 4) + '" height="20" fill="' + (i === 5 ? '#f59e0b' : '#334155') + '"></rect>'; });
        sheet.appendChild(h('div', { html: svg + '</svg>' }));
        sheet.appendChild(h('h4', {}, 'Why the parallel run'));
        sheet.appendChild(h('p', { style: 'margin:0' }, 'Weeks 8 and 9 are where staff find what the plan missed, on purpose, before it matters.'));
      }
      f.body.innerHTML = ''; f.body.appendChild(sheet);
    }
    draw();
    return f.root;
  });

})(window.Demos);
