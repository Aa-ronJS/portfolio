/* Demo framework for the live builds embedded in every service and industry
   page. Tiny on purpose: element helper, chrome, formatting, seeded random,
   mount-by-attribute. Each demo registers a function that returns a DOM node. */
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

  /* Chrome: title bar with a live pill, a body, a status line, a footnote. */
  function frame(opts) {
    var status = h('span', { class: 'demo__status', text: opts.status || 'ready' });
    var body = h('div', { class: 'demo__body' });
    var root = h('div', { class: 'demo__frame' },
      h('div', { class: 'demo__bar' },
        h('span', { class: 'demo__live' }, h('i'), 'live demo'),
        h('span', { class: 'demo__title', text: opts.title }),
        status),
      body,
      opts.note ? h('p', { class: 'demo__note', html: opts.note }) : null);
    return {
      root: root, body: body,
      status: function (t, kind) { status.textContent = t; status.className = 'demo__status' + (kind ? ' demo__status--' + kind : ''); }
    };
  }

  function toast(root, text, kind) {
    var t = h('div', { class: 'demo__toast' + (kind ? ' demo__toast--' + kind : ''), text: text });
    root.appendChild(t);
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

  function mount() {
    document.querySelectorAll('.demo[data-demo]').forEach(function (el) {
      var make = reg[el.dataset.demo];
      if (!make) return;
      try {
        var node = make(el);
        el.innerHTML = '';
        el.appendChild(node);
        el.classList.add('demo--on');
      } catch (e) { /* leave the static fallback in place */ }
    });
  }

  return { register: function (n, f) { reg[n] = f; }, h: h, fmt: fmt, money: money, pct: pct, rng: rng,
           frame: frame, toast: toast, bar: bar, select: select, btn: btn, table: table, mount: mount };
})();
document.addEventListener('DOMContentLoaded', function () { window.Demos.mount(); });
