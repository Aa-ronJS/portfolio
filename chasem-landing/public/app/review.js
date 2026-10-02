/* Chasem: feedback mode. Point at anything on the screen and say what is wrong with it.
   Off unless this phone has opened #/review (and #/review/off turns it off again). When on, a small Feedback
   button sits at the bottom of every screen. Tap it, tap the thing (a button, a picture, a heading, a whole card),
   make the pick bigger or smaller, say what is wrong, send. What goes: the note, what kind of note, which element
   (a selector, its words, its HTML), a copy of the screen as it was, the screen size and the app version, so the
   screen can be drawn again exactly as it was seen. A note that cannot send waits on the phone and goes later. */
(function () {
  var KEY = 'qc-review', QUEUE = 'qc-review-queue';
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} } };
  function on() { return store.get(KEY) === 'on'; }
  function mk(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ours(el) { return !!(el && el.closest && el.closest('.rv-ui')); }
  function url() { var s = String(((window.QC_APP || {}).signup_url) || '/api/signup'); return s.replace(/\/[^\/]*$/, '/feedback'); }
  function token() { try { return ((window.__qcApp && window.__qcApp.store.load().sending) || {}).token || ''; } catch (e) { return ''; } }
  function say(t) { var x = mk('div', 'rv-ui rv-toast', esc(t)); document.body.appendChild(x); setTimeout(function () { if (x.parentNode) x.parentNode.removeChild(x); }, 2600); }

  // a selector that finds this element again in a copy of the page
  function selector(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body && parts.length < 12) {
      if (el.id && !/^\d/.test(el.id)) { parts.unshift('#' + el.id.replace(/([^\w-])/g, '\\$1')); break; }
      var tag = el.tagName.toLowerCase(), i = 1, sib = el;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === el.tagName) i++;
      parts.unshift(tag + ':nth-of-type(' + i + ')');
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  function describe(el) {
    var words = String(el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim();
    var kind = { BUTTON: 'Button', A: 'Link', IMG: 'Picture', svg: 'Picture', INPUT: 'Box', TEXTAREA: 'Box', SELECT: 'List', H1: 'Heading', H2: 'Heading', H3: 'Heading', LABEL: 'Label', P: 'Text' }[el.tagName] || (el.tagName === 'svg' ? 'Picture' : 'Area');
    return kind + (words ? ': ' + (words.length > 60 ? words.slice(0, 57) + '...' : words) : '');
  }

  var fab = null, hl = null, banner = null, sheet = null, picking = false, target = null, history = [];
  function sync() {
    if (!on()) { [fab, hl, banner, sheet].forEach(function (x) { if (x && x.parentNode) x.parentNode.removeChild(x); }); fab = hl = banner = sheet = null; stopPick(); return; }
    if (!fab) { fab = mk('button', 'rv-ui rv-fab', 'Feedback'); fab.type = 'button'; fab.setAttribute('aria-label', 'Leave feedback on something on this screen'); fab.addEventListener('click', startPick); document.body.appendChild(fab); }
    flush();
  }
  function box(el) {
    if (!hl) { hl = mk('div', 'rv-ui rv-hl'); document.body.appendChild(hl); }
    if (!el) { hl.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    hl.style.display = 'block'; hl.style.left = (r.left - 3) + 'px'; hl.style.top = (r.top - 3) + 'px'; hl.style.width = (r.width + 6) + 'px'; hl.style.height = (r.height + 6) + 'px';
  }
  function swallow(e) { if (picking && !ours(e.target)) { e.preventDefault(); e.stopPropagation(); } }
  function hover(e) { if (picking && !ours(e.target)) box(e.target); }
  function choose(e) { if (!picking || ours(e.target)) return; e.preventDefault(); e.stopPropagation(); history = []; target = e.target; stopPick(); openSheet(); }
  function startPick() {
    if (sheet) closeSheet();
    picking = true; if (fab) fab.hidden = true;
    banner = mk('div', 'rv-ui rv-banner', '<span>Tap the part you want to comment on</span><button type="button" class="rv-b" data-rv="whole">Whole screen</button><button type="button" class="rv-b" data-rv="cancel">Cancel</button>');
    document.body.appendChild(banner);
    banner.querySelector('[data-rv=cancel]').addEventListener('click', function () { stopPick(); if (fab) fab.hidden = false; });
    banner.querySelector('[data-rv=whole]').addEventListener('click', function () { stopPick(); target = document.getElementById('app') || document.body; history = []; openSheet(); });
    document.addEventListener('click', choose, true);
    ['pointerdown', 'mousedown', 'submit'].forEach(function (t) { document.addEventListener(t, swallow, true); });
    document.addEventListener('pointermove', hover, true); document.addEventListener('pointerdown', hover, true);
  }
  function stopPick() {
    picking = false;
    document.removeEventListener('click', choose, true);
    ['pointerdown', 'mousedown', 'submit'].forEach(function (t) { document.removeEventListener(t, swallow, true); });
    document.removeEventListener('pointermove', hover, true); document.removeEventListener('pointerdown', hover, true);
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner); banner = null;
  }
  var KINDS = [['broken', 'Broken'], ['looks', 'Looks wrong'], ['confusing', 'Confusing'], ['idea', 'Idea']];
  function openSheet() {
    box(target);
    sheet = mk('div', 'rv-ui rv-sheet');
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Leave feedback');
    sheet.innerHTML = '<div class="rv-pick"><b id="rv_what"></b><span class="rv-row"><button type="button" class="rv-b" data-rv="bigger">Bigger</button><button type="button" class="rv-b" data-rv="smaller">Smaller</button><button type="button" class="rv-b" data-rv="again">Pick again</button></span></div>' +
      '<div class="rv-kinds" role="group" aria-label="What kind of note">' + KINDS.map(function (k, i) { return '<button type="button" class="rv-k' + (i === 0 ? ' on' : '') + '" data-kind="' + k[0] + '" aria-pressed="' + (i === 0) + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      '<label class="rv-l" for="rv_note">What is wrong, or what would you change?</label><textarea id="rv_note" rows="3"></textarea>' +
      '<div class="rv-row end"><button type="button" class="rv-b" data-rv="close">Cancel</button><button type="button" class="rv-send" data-rv="send">Send</button></div>' +
      '<p class="rv-fine"><a href="#/review/off" data-rv="off">Turn feedback mode off on this phone</a></p>';
    document.body.appendChild(sheet);
    var what = function () { sheet.querySelector('#rv_what').textContent = describe(target); box(target); };
    what();
    sheet.querySelector('[data-rv=bigger]').addEventListener('click', function () { if (target.parentElement && target !== document.body) { history.push(target); target = target.parentElement; what(); } });
    sheet.querySelector('[data-rv=smaller]').addEventListener('click', function () { if (history.length) { target = history.pop(); what(); } });
    sheet.querySelector('[data-rv=again]').addEventListener('click', function () { closeSheet(); startPick(); });
    sheet.querySelector('[data-rv=close]').addEventListener('click', function () { closeSheet(); });
    Array.prototype.forEach.call(sheet.querySelectorAll('[data-kind]'), function (b) { b.addEventListener('click', function () { Array.prototype.forEach.call(sheet.querySelectorAll('[data-kind]'), function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); }); });
    sheet.querySelector('[data-rv=send]').addEventListener('click', function () {
      var note = String(sheet.querySelector('#rv_note').value || '').trim();
      if (!note) { sheet.querySelector('#rv_note').focus(); sheet.querySelector('.rv-l').textContent = 'Type a few words first.'; return; }
      var kind = (sheet.querySelector('[data-kind].on') || {}).getAttribute ? sheet.querySelector('[data-kind].on').getAttribute('data-kind') : 'note';
      queue(capture(target, kind, note)); closeSheet(); flush(true);
    });
    setTimeout(function () { var t = sheet && sheet.querySelector('#rv_note'); if (t) t.focus(); }, 50);
  }
  function closeSheet() { if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet); sheet = null; box(null); if (fab) fab.hidden = false; }

  // the screen as it was, without the feedback tool on top of it
  function capture(el, kind, note) {
    var r = el.getBoundingClientRect(), page = '';
    try { var clone = document.body.cloneNode(true); Array.prototype.forEach.call(clone.querySelectorAll('.rv-ui, script'), function (x) { x.parentNode.removeChild(x); });
      Array.prototype.forEach.call(clone.querySelectorAll('input, textarea'), function (x, i) { var live = document.querySelectorAll('body input, body textarea')[i]; if (live && live.type !== 'password' && !ours(live)) x.setAttribute('value', live.value); if (x.type === 'password') x.setAttribute('value', ''); });
      page = clone.innerHTML; } catch (e) {}
    return {
      id: 'rv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), verdict: kind, note: note,
      screen: location.hash || '#/', app: window.QC_VERSION || '', ua: navigator.userAgent,
      target: selector(el), target_text: describe(el), html: String(el.outerHTML || '').slice(0, 20000), page: page.slice(0, 500000),
      rect: { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1, scroll: Math.round(window.scrollY), dark: !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) }
    };
  }
  function queued() { try { return JSON.parse(store.get(QUEUE) || '[]'); } catch (e) { return []; } }
  function queue(item) { var q = queued(); q.push(item); while (q.length > 20) q.shift(); store.set(QUEUE, JSON.stringify(q)); }
  var sending = false;
  function flush(loud) {
    var q = queued(); if (!q.length || sending) return;
    sending = true;
    var fetcher = window.__qcRelayFetch || window.fetch;
    fetcher(url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token(), items: q }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        sending = false;
        if (j && j.ok) { var left = queued().filter(function (x) { return !q.some(function (y) { return y.id === x.id; }); }); store.set(QUEUE, left.length ? JSON.stringify(left) : null); if (loud) say('Sent. Thanks.'); }
        else if (loud) say('Saved on this phone. It will send when Chasem answers.');
      }, function () { sending = false; if (loud) say(navigator.onLine === false ? 'No signal. Saved on this phone; it sends when you have some.' : 'Saved on this phone. It will send when Chasem answers.'); });
  }

  // switching it on and off is the app's job (#/review and #/review/off in app.js route); this only draws it
  window.addEventListener('online', function () { if (on()) flush(); });
  window.addEventListener('resize', function () { if (target && sheet) box(target); });
  window.QCReview = { on: on, sync: sync, flush: flush };
  window.addEventListener('hashchange', function () { setTimeout(sync, 0); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();
