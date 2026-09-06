/* Demo framework for the live builds embedded in every service and industry
   page. Each demo renders inside a device shell so it reads as the product
   it is: a browser window for websites, an app window with a sidebar for
   software, a phone for apps, a document viewer for deliverables. */
window.Demos = (function () {
  var reg = {};

  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'style') el.style.cssText = v;
      else if (v === false || v == null) {}
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid == null || kid === false) continue;
      if (Array.isArray(kid)) kid.forEach(function (c) { if (c != null && c !== false) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
      else el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    }
    return el;
  }

  function fmt(n) { return Math.round(n).toLocaleString('en-AU'); }
  function money(n, cents) {
    return '$' + (cents ? n.toFixed(2) : Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function pct(n) { return (Math.round(n * 10) / 10) + '%'; }

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* Small inline icon set (stroke paths, 24-box). */
  var ICONS = {
    home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    list: 'M4 6h16M4 12h16M4 18h10',
    board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v7h-4z',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    cal: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
    doc: 'M6 2h9l5 5v15H6zM15 2v5h5M9 13h6M9 17h6',
    cart: 'M3 3h2l3 12h11l2-8H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
    dollar: 'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
    check: 'M20 6L9 17l-5-5',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    map: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4zM8 2v16M16 6v16',
    truck: 'M1 3h15v13H1zM16 8h4l3 5v3h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    clip: 'M9 2h6v3H9zM8 5H5v17h14V5h-3M9 12h6M9 16h6',
    inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5 3h14l3 9v9H2v-9z',
    star: 'M12 2l3 7 7 .7-5.3 4.7 1.6 7L12 17.8 5.7 21.4l1.6-7L2 9.7 9 9z'
  };
  function icon(name, size) {
    var s = size || 16;
    return h('span', { html: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (ICONS[name] || ICONS.list) + '"/></svg>', style: 'display:inline-flex; line-height:0' });
  }

  /* Device shells --------------------------------------------------- */

  function browser(opts) {
    /* opts: url, tabs [{label, active, onclick}], page (node) */
    var root = h('div', { class: 'dv dv--browser' });
    if (opts.tabs) {
      root.appendChild(h('div', { class: 'dv__tabs', role: 'tablist' }, opts.tabs.map(function (t) {
        return h('button', { class: 'dv__tab', type: 'button', role: 'tab', 'aria-selected': !!t.active, onclick: function (e) { Array.prototype.forEach.call(e.currentTarget.parentNode.children, function (c) { c.setAttribute('aria-selected', c === e.currentTarget); }); t.onclick && t.onclick(); } }, t.dot ? h('i') : null, t.label);
      })));
    }
    var url = h('span', { class: 'dv__url' }, icon('lock', 11), h('span', { class: 'dv__urltext' }, h('b', {}, opts.url || 'example.com.au'), opts.path || ''));
    root.appendChild(h('div', { class: 'dv__chrome' }, h('span', { class: 'dv__lights' }, h('i'), h('i'), h('i')), url, h('span', { class: 'dv__nav' }, '‹', '›', '↻')));
    var page = h('div', { class: 'dv__page' });
    root.appendChild(page);
    return { root: root, body: page, setUrl: function (u, p) { url.querySelector('.dv__urltext').innerHTML = ''; url.querySelector('.dv__urltext').appendChild(h('b', {}, u)); url.querySelector('.dv__urltext').appendChild(document.createTextNode(p || '')); } };
  }

  function app(opts) {
    /* opts: name, mark, accent, side, nav [[label, icon]], active (index), user, title, topRight (node) */
    var root = h('div', { class: 'dv dv--app', style: (opts.accent ? '--p-accent:' + opts.accent + ';' : '') + (opts.side ? '--p-side:' + opts.side + ';' : '') });
    var side = h('nav', { class: 'dv__side', 'aria-label': opts.name + ' navigation' },
      h('div', { class: 'dv__brand' }, h('span', { class: 'dv__mark' }, opts.mark || opts.name.charAt(0)), opts.name),
      (opts.nav || []).map(function (n, i) { return h('div', { class: 'dv__item', 'aria-current': i === (opts.active || 0) ? 'page' : null }, icon(n[1] || 'list'), h('span', {}, n[0])); }),
      h('div', { class: 'dv__user' }, h('span', { class: 'dv__avatar' }, (opts.user || 'Sam Tran').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2)), h('span', {}, opts.user || 'Sam Tran')));
    var top = h('div', { class: 'dv__top' }, h('h3', {}, opts.title || (opts.nav && opts.nav[opts.active || 0][0]) || opts.name), h('span', { class: 'dv__search' }, icon('search', 13), 'Search'), h('span', { class: 'dv__bell' }, icon('bell', 15)));
    var main = h('div', { class: 'dv__main' });
    root.appendChild(side); root.appendChild(top); root.appendChild(main);
    return { root: root, body: main, top: top };
  }

  function phone(opts) {
    /* opts: accent, title, tabs [[label, icon]], active, onTab(i), right (node) */
    var root = h('div', { class: 'dv dv--phone', style: opts.accent ? '--p-accent:' + opts.accent : '' });
    var now = new Date(), time = now.getHours() + ':' + ('0' + now.getMinutes()).slice(-2);
    var titleEl = h('h3', {}, opts.title || 'Today');
    var rightEl = h('span', {});
    var list = h('div', { class: 'list' });
    var tabbar = h('div', { class: 'dv__tabbar' }, (opts.tabs || []).map(function (t, i) {
      return h('button', { type: 'button', 'aria-pressed': i === (opts.active || 0), onclick: function (e) { Array.prototype.forEach.call(e.currentTarget.parentNode.children, function (c) { c.setAttribute('aria-pressed', c === e.currentTarget); }); opts.onTab && opts.onTab(i); } }, icon(t[1] || 'list', 22), t[0]);
    }));
    var screen = h('div', { class: 'dv__screen' },
      h('div', { class: 'dv__island' }),
      h('div', { class: 'dv__statusbar' }, h('span', {}, time), h('span', {}, '●●● ᯤ ▮')),
      opts.url ? h('div', { class: 'dv__murl' }, icon('lock', 10), opts.url) : h('div', { class: 'dv__appbar' }, titleEl, rightEl),
      list, opts.url ? h('div', { class: 'dv__mbar' }, '‹', '›', '⇧', '⧉') : tabbar, h('div', { class: 'dv__home' }));
    root.appendChild(h('div', { class: 'dv__phone' }, screen));
    return { root: root, body: list, title: function (t) { titleEl.textContent = t; }, right: rightEl, screen: screen,
      tab: function (i) { Array.prototype.forEach.call(tabbar.children, function (c, j) { c.setAttribute('aria-pressed', j === i); }); } };
  }

  function doc(opts) {
    /* opts: title, meta, files [{label, active, onclick}] */
    var root = h('div', { class: 'dv dv--doc' });
    root.appendChild(h('div', { class: 'dv__doctop' }, icon('doc', 14), h('b', {}, opts.title || 'Document.pdf'), h('span', {}, opts.meta || ''), h('span', { style: 'margin-left:auto' }, '100%')));
    var paper = h('div', { class: 'dv__paper' });
    var files = h('div', { class: 'dv__files' }, (opts.files || []).map(function (f) {
      return h('button', { class: 'dv__file', type: 'button', 'aria-selected': !!f.active, onclick: function (e) { Array.prototype.forEach.call(e.currentTarget.parentNode.children, function (c) { c.setAttribute('aria-selected', c === e.currentTarget); }); root.querySelector('.dv__doctop b').textContent = f.file || f.label; f.onclick && f.onclick(); } }, icon('doc', 14), f.label);
    }));
    root.appendChild(h('div', { class: 'dv__docbody' }, files, paper));
    return { root: root, body: paper };
  }

  /* frame(): the stage a device sits on, with the status pill and note.
     opts.kind: 'app' | 'browser' | 'phone' | 'doc' (default app).
     Device options are passed through in opts.app / opts.browser / opts.phone / opts.doc. */
  function frame(opts) {
    var kind = opts.kind || 'app', dev;
    if (kind === 'browser') dev = browser(opts.browser || {});
    else if (kind === 'phone') dev = phone(opts.phone || {});
    else if (kind === 'doc') dev = doc(opts.doc || {});
    else dev = app(opts.app || { name: opts.title || 'App' });
    var accent = (opts.app && opts.app.accent) || (opts.phone && opts.phone.accent) || opts.accent;
    var status = h('span', { class: 'demo__status', text: opts.status || 'ready' });
    var stage = h('div', { class: 'demo__stage', style: accent ? '--p-accent:' + accent : '' }, dev.root);
    if (accent) dev.root.style.setProperty('--p-accent', accent);
    var body = dev.body;
    if (kind === 'browser' && !opts.raw) { body = h('div', { class: 'demo__body' }); dev.body.appendChild(body); }
    var root = h('div', { class: 'demo__frame' }, stage,
      h('div', { class: 'demo__caption' }, h('span', { class: 'demo__live' }, h('i'), opts.title || 'Live demo'), status),
      opts.note ? h('p', { class: 'demo__note', html: opts.note }) : null);
    return {
      root: root, body: body, device: dev, stage: stage,
      status: function (t, k) { status.textContent = t; status.className = 'demo__status' + (k ? ' demo__status--' + k : ''); }
    };
  }

  function toast(root, text, kind) {
    var host = root.querySelector ? (root.querySelector('.dv__page, .dv__main, .dv__screen') || root) : root;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var t = h('div', { class: 'demo__toast' + (kind ? ' demo__toast--' + kind : ''), text: text });
    host.appendChild(t);
    setTimeout(function () { t.classList.add('on'); }, 10);
    setTimeout(function () { t.classList.remove('on'); setTimeout(function () { t.remove(); }, 300); }, 2600);
  }

  function bar(value, max, cls) {
    var w = Math.max(0, Math.min(100, (value / max) * 100));
    return h('span', { class: 'demo__meter' + (cls ? ' ' + cls : '') }, h('i', { style: 'width:' + w + '%' }));
  }

  function select(opts, value, onchange) {
    var s = h('select', { class: 'demo__select', onchange: function () { onchange(s.value); } });
    opts.forEach(function (o) {
      var v = Array.isArray(o) ? o[0] : o, label = Array.isArray(o) ? o[1] : o;
      s.appendChild(h('option', { value: v, selected: v === value }, label));
    });
    return s;
  }

  function btn(label, onclick, cls) {
    return h('button', { class: 'demo__btn' + (cls ? ' ' + cls : ''), type: 'button', onclick: onclick }, label);
  }

  function table(head, rows, cls) {
    return h('div', { class: 'demo__scroll' },
      h('table', { class: 'demo__table' + (cls ? ' ' + cls : '') },
        h('thead', {}, h('tr', {}, head.map(function (c) { return h('th', {}, c); }))),
        h('tbody', {}, rows)));
  }

  /* KPI tile, the shape every product uses. */
  function kpi(label, value, sub, kind) {
    return h('div', { class: 'demo__panel', style: 'padding:14px 16px' },
      h('div', { style: 'font-size:12px; color:var(--p-mute); font-weight:500' }, label),
      h('div', { class: 'demo__big', style: 'margin-top:4px;' + (kind === 'bad' ? 'color:var(--p-bad)' : kind === 'warn' ? 'color:var(--p-warn)' : kind === 'ok' ? 'color:var(--p-good)' : '') }, value),
      sub ? h('div', { style: 'font-size:12px; color:var(--p-mute); margin-top:2px' }, sub) : null);
  }

  function mount() {
    document.querySelectorAll('.demo[data-demo]').forEach(function (el) {
      var make = reg[el.dataset.demo];
      if (!make) return;
      try {
        var node = make(el);
        el.innerHTML = '';
        el.appendChild(node);
        el.classList.add('demo--on');
      } catch (e) { /* leave the static fallback in place */ if (window.console) console.error('demo failed', el.dataset.demo, e); }
    });
  }

  return { register: function (n, f) { reg[n] = f; }, h: h, fmt: fmt, money: money, pct: pct, rng: rng, icon: icon,
           frame: frame, browser: browser, app: app, phone: phone, doc: doc, kpi: kpi,
           toast: toast, bar: bar, select: select, btn: btn, table: table, mount: mount };
})();
document.addEventListener('DOMContentLoaded', function () { window.Demos.mount(); });
