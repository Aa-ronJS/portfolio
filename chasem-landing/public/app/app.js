/* Chasem app: views and routing. Vanilla JS, no build step. */
(function () {
  'use strict';
  var $app = document.getElementById('app'), S;
  // The pictures are a nicety. If pics.js did not arrive (an old cache, one bar of signal) every button still
  // has its word and works.
  var QCPics = window.QCPics || { svg: function () { return ''; }, tile: function (n, w) { return String(w).replace(/[&<>"]/g, ''); }, says: function () { return ''; }, has: function () { return false; } };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return QCPdf.money(n); }
  function rateFmt(r) { return Math.abs(r - Math.round(r)) < 0.005 ? money(r) : '$' + (Math.round(r * 100) / 100).toFixed(2); }
  var toastQ = []; function isBad(m) { return /fail|could not|cannot|couldn|can't|error|not valid|invalid|refused|too long|too small|too big|not a |no usable|missing|wrong|unexpected|not right|check the|declined|blocked|unreadable|does not look|not deleted|landline/i.test(m); }
  // toast(msg) or toast(msg, { action: 'Undo', onAction: fn, ms: 8000 }). Two lines at most on screen (app.css clamps it); put detail in the page, not the toast.
  function toast(msg, opt) { msg = String(msg); var item = { m: msg, action: opt && opt.action, onAction: opt && opt.onAction, ms: opt && opt.ms }; if (toastQ.length && isBad(toastQ[0].m) && !isBad(msg) && Date.now() - (toast.at || 0) < 4000 && !((toast.userAt || 0) > (toast.at || 0))) { toastQ = [toastQ[0], item]; return; } toastQ = [item]; toast.at = Date.now(); showToast(); } // a failure holds the screen against a follow-on success from the same action; anything the user does after it lets the next toast through
  ['click', 'change', 'input'].forEach(function (ev) { document.addEventListener(ev, function () { toast.userAt = Date.now(); }, true); });
  function showToast() { var t = document.getElementById('toast'); if (!toastQ.length) { t.hidden = true; return; } var cur = toastQ[0]; t.textContent = ''; var sp = document.createElement('span'); sp.textContent = cur.m; t.appendChild(sp); if (cur.action) { var b = document.createElement('button'); b.type = 'button'; b.className = 'toastbtn'; b.textContent = cur.action; b.addEventListener('click', function () { clearTimeout(toast.t); toastQ.shift(); showToast(); if (cur.onAction) cur.onAction(); }); t.appendChild(b); } t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { toastQ.shift(); showToast(); }, cur.ms || (isBad(cur.m) ? 4500 : 2200)); }
  // showBlock(button, msg): a message that stops an action stays on screen next to the button until the person taps OK (a toast vanishes before it is read). showBlock(button, '') removes it. Returns the box so a caller can add an input to it.
  function showBlock(el, msg, opts) { if (!el) { if (msg) toast(msg); return null; } var host = el.parentNode; if (!host) return null; var old = host.querySelector('.block[data-for]'); if (old && old.getAttribute('data-for') === (el.id || el.textContent)) old.parentNode.removeChild(old); if (!msg) return null; var box = document.createElement('div'); box.className = 'block' + (opts && opts.kind ? ' ' + opts.kind : ''); box.setAttribute('role', 'alert'); box.setAttribute('data-for', el.id || el.textContent); var sp = document.createElement('span'); sp.textContent = String(msg); box.appendChild(sp); var x = document.createElement('button'); x.type = 'button'; x.className = 'btn ghost sm x'; x.textContent = (opts && opts.dismiss) || 'OK'; x.addEventListener('click', function () { if (box.parentNode) box.parentNode.removeChild(box); if (opts && opts.onDismiss) opts.onDismiss(); }); box.appendChild(x); if (el.nextSibling) host.insertBefore(box, el.nextSibling); else host.appendChild(box); try { box.scrollIntoView({ block: 'nearest' }); } catch (e) {} return box; }
  function go(h) { location.hash = h; }
  var openUrl = function (u) { location.href = u; };
  // Turn each settings card into a tap-to-open section so the page is a list of headings, not a 20-screen scroll
  function sectionise(root, openTitles, setUp) {
    var pref = {}; try { pref = JSON.parse(localStorage.getItem('qc-sections') || '{}'); } catch (e) {}
    Array.prototype.slice.call(root.querySelectorAll(':scope > .card')).forEach(function (card) {
      var h = card.firstElementChild; if (!h || h.tagName !== 'H2') return; var title = h.textContent.trim();
      var det = document.createElement('details'); det.className = 'card sec' + (card.classList.contains('ponly') ? ' ponly' : ''); var sum = document.createElement('summary'); sum.appendChild(h); det.appendChild(sum);
      while (card.firstChild) det.appendChild(card.firstChild); card.parentNode.replaceChild(det, card);
      var open = (title in pref) ? !!pref[title] : (!setUp && openTitles.indexOf(title) >= 0); det.open = open;
      sum.addEventListener('click', function () { setTimeout(function () { pref[title] = det.open; try { localStorage.setItem('qc-sections', JSON.stringify(pref)); } catch (e) {} }, 0); }); // remember only what the user taps, not the initial state
    });
  } // sms:, mailto:, tel: hand-offs go through here so tests can watch them
  function bounce(h) { location.replace(location.href.split('#')[0] + '#' + h); }
  var creating = false; function once(fn) { return function () { if (creating) return; creating = true; setTimeout(function () { creating = false; }, 3000); fn.apply(this, arguments); }; }
  function first(name) { return (name || '').trim().split(/\s+/)[0] || 'there'; }
  function n(v, d) { var x = parseFloat(v); return isNaN(x) ? (d || 0) : x; }
  function save() { if (!QCStore.save()) toast('Could not save. Storage full or blocked. ' + QCStore.lastError()); }
  function checkStore() { if (QCStore.lastError()) toast('Could not save. Storage full or blocked. ' + QCStore.lastError()); }
  // ---------- shared text helpers: who a message is to, how it signs off, what the job is called in a text
  var BIZ_NAME = /\b(pty|ltd|limited|strata|body corporate|corporation|corp|council|real estate|realty|property|properties|trust|inc|group|holdings|builders?|constructions?|developments?|p\/l|owners corporation|management|services)\b|&/i;
  function looksBusiness(name) { return BIZ_NAME.test(String(name || '')); }
  function isBizClient(job) { var t = job && job.client && job.client.type; return t === 'agent' || t === 'strata' || t === 'builder' || t === 'commercial'; }
  // 'Hi Jane,' from client.first_name, else the first word of the name; a business name or a business client type gets 'Hello,' / 'Hi team,'
  function greet(job) { var c = (job && job.client) || {}; var fn = String(c.first_name || '').trim(); if (fn) return 'Hi ' + fn.split(/\s+/)[0] + ','; if (isBizClient(job)) return 'Hi team,'; var name = String(c.name || '').trim(); if (!name || looksBusiness(name) || /^(mr|mrs|ms|miss|dr|mr and mrs|mr & mrs|the)\b/i.test(name)) return 'Hello,'; return 'Hi ' + name.split(/\s+/)[0] + ','; }
  // 'Cheers, Dave' (first name only unless Set-up says otherwise)
  function signoff(st) { var d = (st || S).details, name = String(d.owner_name || '').trim(); if (d.first_name_signoff !== false && name) name = name.split(/\s+/)[0]; return (d.sign_off || 'Cheers') + (name ? ', ' + name : ''); }
  function fullSignoff(st) { var d = (st || S).details; var who = [String(d.owner_name || '').trim(), String(d.trading_name || '').trim()].filter(Boolean).join(', '); return 'Regards' + (who ? ', ' + who : ''); }
  // the job in a customer's words: the description if it reads like one, else 'the work'. Never the client's name or an internal label.
  function jobDesc(job) { var s = String(job.summary || '').trim(), nm = String((job.client && job.client.name) || '').trim(); if (!s) return 'the work'; var words = nm.split(/\s+/).filter(function (w) { return w.replace(/[^\w]/g, '').length > 2; }); var leak = words.some(function (w) { return new RegExp('\\b' + w.replace(/[^\w]/g, '') + '\\b', 'i').test(s); }); if (leak || /\b(person|test|draft|quoted|client)\b/i.test(s)) return 'the work'; if (/^[A-Z][a-z]/.test(s)) s = s.charAt(0).toLowerCase() + s.slice(1); return s; }
  function shortDate(iso) { if (!iso) return ''; var d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' }) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); }
  function stateCode() { return String((S.details && S.details.state) || '').toUpperCase(); }
  var SITE = '../'; // the website this app was served from; the app itself never needs it except to send someone to sign up or manage a card
  function siteUrl(h) { return SITE + (h || ''); }
  function fuHour() { var h = parseInt(S.follow_up && S.follow_up.remind_hour, 10); if (isNaN(h)) h = 9; return Math.min(18, Math.max(8, h)); }
  function addBusinessDays(iso, n, st) { var d = iso, k = 0; while (k < n) { d = QCStore.addDays(d, 1); if (QCCal.isBusinessDay(d, st == null ? stateCode() : st)) k++; } return d; }
  function invBalance(inv) { var paid = (inv.payments || []).reduce(function (s2, p) { return s2 + (parseFloat(p.amount) || 0); }, 0), cn = (inv.credit_notes || []).reduce(function (s2, c) { return s2 + (parseFloat(c.amount) || 0); }, 0); return { paid: paid, credit: cn, balance: inv.void ? 0 : Math.max(0, (parseFloat(inv.total) || 0) - paid - cn) }; }
  function invOpen(inv) { return !inv.paid_date && !inv.void && invBalance(inv).balance > 0; }
  function tribunalFor(st) { return { NSW: 'NCAT', VIC: 'VCAT', QLD: 'QCAT', SA: 'SACAT', WA: 'the Magistrates Court', TAS: 'TASCAT', ACT: 'ACAT', NT: 'NTCAT' }[st] || 'the tribunal'; }
  function lastContact(job) { var best = null; ((S.log && S.log.sent) || []).some(function (e) { if (e.job === job.id && e.ok && e.kind === 'send') { best = e; return true; } return false; }); if (best) return { date: best.t.slice(0, 10), channel: best.channel === 'sms' ? 'SMS' : best.channel === 'email' ? 'email' : 'in person' }; if (job.last_chased) return { date: job.last_chased, channel: '' }; return null; }
  function remindersSent(job, invNo) { var n = 0; ((S.log && S.log.sent) || []).forEach(function (e) { if (e.job === job.id && e.ok && e.ref && e.ref.indexOf(invNo + '+') === 0 && (e.kind === 'send' || (e.kind === 'schedule' && e.send_at && new Date(e.send_at).getTime() < Date.now()))) n++; }); return n; }
  // the next Monday at least a week out with nothing booked that week
  function nextFreeWeek() { var t = QCStore.today(), d = QCStore.addDays(t, 7), dow = new Date(d + 'T00:00:00').getDay(); d = QCStore.addDays(d, (8 - dow) % 7); for (var i = 0; i < 12; i++) { var end = QCStore.addDays(d, 5), busy = S.jobs.some(function (j) { return j.booking && j.booking.start < end && (j.booking.end || j.booking.start) > d; }); if (!busy) return d; d = QCStore.addDays(d, 7); } return d; }
  // ---------- app lock (PIN): asked on load and after five minutes in the background
  var unlocked = false, hiddenAt = 0;
  function sha256(s) { try { if (window.crypto && crypto.subtle && crypto.subtle.digest) return crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s))).then(function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join(''); }); } catch (e) {} var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return Promise.resolve('fnv:' + h.toString(16)); }
  function locked() { return !!(S.security && S.security.pin) && !unlocked; }
  // The app opens once it knows who it belongs to: an email, which brings back a set-up link carrying the sending token and
  // the twelve messages everyone starts with: three whole jobs, because a job is four (the quote, then three chases, and the
  // ones that never have to go are given back). A set-up link from an email or a receipt joins the same way, without typing anything.
  // Signed in means the inbox was proved, not that an address is sitting in storage. An account made before
  // codes existed, or one someone typed in by hand, is asked to sign in once; his jobs are in his account and
  // come back with him. 'offline' is the no-relay mode, where there is no server to prove anything against.
  function joined() { var a = S.account || {}; return !!(a.email && (a.verified === true || a.offline === true)); }
  function signupUrl() { var u = String((S.sending && S.sending.server) || window.QC_APP && window.QC_APP.signup_url || '').trim(); if (u) return u.replace(/\/[^\/]*$/, '/signup'); return (window.QC_APP && window.QC_APP.signup_url) || ''; }
  function signinUrl() { var u = signupUrl(); return u ? u.replace(/\/[^\/]*$/, '/signin') : ''; }

  // The front door: an address, then the six numbers that prove the inbox is his. The same address on any
  // phone reaches the same jobs, which is the whole of the account.
  function viewJoin(msg) {
    var url = signinUrl(), waiting = viewJoin.waiting || '';
    $app.innerHTML = '<div class="card door">' +
      '<img class="logo" src="icons/icon-192.png" alt="" width="72" height="72">' +
      '<h1>Chasem</h1>' +
      (msg ? '<p class="confirm">' + esc(msg) + '</p>' : '') +
      (waiting
        ? '<form id="codeform" novalidate><label class="f">Your code<span>emailed to ' + esc(waiting) + '</span>' +
          '<input type="text" id="join_code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" placeholder="000000" style="font-size:1.6rem;letter-spacing:.3em;text-align:center"></label>' +
          '<button class="btn tape lg" type="submit" id="code_go">Open my app</button>' +
          '<p class="hint" id="join_msg"></p>' +
          '<div class="row"><button class="btn ghost sm" id="code_again">Send another</button><button class="btn ghost sm" id="code_back">Different email</button></div></form>'
        : '<form id="joinform" novalidate><label class="f">Your email' +
          '<input type="email" id="join_email" autocomplete="email" inputmode="email" required value="' + esc((S.account && S.account.email) || '') + '"></label>' +
          '<button class="btn tape lg" type="submit" id="join_go">Send me a code</button>' +
          '<p class="hint" id="join_msg">' + (url ? '' : 'Signing in is not switched on yet.') + '</p></form>') +
      '</div>';

    var out = function () { return document.getElementById('join_msg'); };
    var call = function (body) {
      var fetcher = window.__qcRelayFetch || window.fetch;
      return fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .catch(function () { return { ok: false, error: 'No signal. Try again when you have some.' }; });
    };

    var f = document.getElementById('joinform');
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault();
      var em = String(document.getElementById('join_email').value || '').trim().toLowerCase(), btn = document.getElementById('join_go');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { out().textContent = 'That does not look like an email address.'; return; }
      if (!url) { S.account = { email: em, joined: QCStore.today(), offline: true }; save(); toast('Ready. The app writes each message; you send it.'); go('/'); return; }
      btn.disabled = true; out().textContent = 'Sending\u2026';
      call({ action: 'start', email: em }).then(function (j) {
        if (!j || !j.ok) { btn.disabled = false; out().textContent = (j && j.error) || 'That did not work.'; return; }
        viewJoin.waiting = em; viewJoin(); 
        var box = document.getElementById('join_code'); if (box) box.focus();
      });
    });

    var cf = document.getElementById('codeform');
    if (cf) cf.addEventListener('submit', function (e) {
      e.preventDefault();
      var box = document.getElementById('join_code'), btn = document.getElementById('code_go');
      var code = String(box.value || '').replace(/\D/g, '');
      if (code.length !== 6) { out().textContent = 'Six numbers.'; box.focus(); return; }
      btn.disabled = true; out().textContent = 'One moment\u2026';
      call({ action: 'check', email: waiting, code: code }).then(function (j) {
        if (!j || !j.ok || !j.token) { btn.disabled = false; out().textContent = (j && j.error) || 'That did not work.'; box.select(); return; }
        S = QCStore.load();
        S.account = { email: waiting, joined: QCStore.today(), cus: j.cus || '', verified: true };
        if (j.sending) S.sending = Object.assign({}, S.sending, j.sending);
        save();
        viewJoin.waiting = '';
        // his details, prices and jobs come back with the account when there are any
        if (j.setup) { try { applySetup(j.setup); } catch (e2) {} }
        go('/');
      });
    });
    // six numbers pasted or typed: no Enter needed on a phone keypad
    var cbox = document.getElementById('join_code');
    if (cbox) cbox.addEventListener('input', function () {
      var v = String(cbox.value || '').replace(/\D/g, '').slice(0, 6); cbox.value = v;
      if (v.length === 6) cf.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    var again = document.getElementById('code_again');
    if (again) again.addEventListener('click', function (e) {
      e.preventDefault(); again.disabled = true; out().textContent = 'Sending\u2026';
      call({ action: 'start', email: waiting }).then(function (j) { again.disabled = false; out().textContent = j && j.ok ? 'Sent. Check your email.' : (j && j.error) || 'That did not work.'; });
    });
    var back = document.getElementById('code_back');
    if (back) back.addEventListener('click', function (e) { e.preventDefault(); viewJoin.waiting = ''; viewJoin(); });
  }

  var FREE_SENDS = 12, PLAN_INCLUDED = 150, PLAN_PRICE = 99, TOPUP_MESSAGES = 100, TOPUP_PRICE = 35;
  document.addEventListener('visibilitychange', function () { if (document.hidden) { hiddenAt = Date.now(); return; } if (unlocked && hiddenAt && Date.now() - hiddenAt > 5 * 60000 && S && S.security && S.security.pin) { unlocked = false; route(); } });
  function viewLock() {
    $app.innerHTML = '<div class="card" style="max-width:360px;margin:30px auto 0"><h1>Enter your PIN</h1><form id="pinform"><label class="f">PIN<input type="password" id="pin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="6" autofocus></label><div class="row" style="margin-top:8px"><button class="btn tape" type="submit">Unlock</button></div><p class="status bad" id="pinmsg"></p></form>' +
      '<details class="adv"><summary>Forgot your PIN?</summary><p class="hint">No way back but a wipe and a restore: on iPhone, Settings, Safari, Advanced, Website Data; on Android, hold the app icon, App info, Storage, Clear data.</p></details></div>';
    document.getElementById('pinform').addEventListener('submit', function (e) { e.preventDefault(); var v = document.getElementById('pin').value; sha256(v).then(function (h) { if (h === S.security.pin) { unlocked = true; route(); } else { document.getElementById('pinmsg').textContent = 'Wrong PIN.'; document.getElementById('pin').value = ''; } }); });
  }
  // ---------- soft delete with Undo (8 seconds in state.trash), after every pending reminder is cancelled
  function deleteJob(job) {
    var pend = pendingFollowUps(job).filter(function (x) { return x.id; });
    var doIt = function () { var st = QCStore.load(); st.jobs = st.jobs.filter(function (j) { return j.id !== job.id; }); st.local_queue = (st.local_queue || []).filter(function (q) { return q.job !== job.id; }); st.trash = (st.trash || []).filter(function (t) { return t.job.id !== job.id; }); st.trash.push({ job: job, at: Date.now() }); save(); if (location.hash.indexOf('#/job/' + job.id) === 0) go('/'); else route(); toast('Job deleted', { action: 'Undo', ms: 8000, onAction: function () { restoreJob(job.id); } }); setTimeout(function () { purgeTrash(job.id); }, 8500); return true; };
    if (!pend.length) return Promise.resolve(doIt());
    return cancelJobFollowUps(job).then(function (r) { if (r.failed) { toast(r.failed + ' reminder' + (r.failed > 1 ? 's' : '') + ' could not be cancelled (' + r.error + '). Not deleted. Try again when you are online.'); return false; } return doIt(); });
  }
  function restoreJob(id) { var st = QCStore.load(), t = (st.trash || []).filter(function (x) { return x.job && x.job.id === id; })[0]; if (!t) return; st.trash = st.trash.filter(function (x) { return x !== t; }); st.jobs.unshift(QCStore.normaliseJob(t.job)); save(); toast('Restored'); route(); }
  function purgeTrash(id) { var st = QCStore.load(), before = (st.trash || []).length; st.trash = (st.trash || []).filter(function (x) { return id ? x.job.id !== id : Date.now() - x.at < 8000; }); if (st.trash.length !== before) QCStore.save(); }
  function duplicateJob(job) { var j = QCStore.newJob(); var copy = JSON.parse(JSON.stringify(job)); ['client', 'summary', 'rooms', 'extras', 'travel_km', 'premium_paint', 'notes', 'notes_client', 'colours', 'client_paint', 'deposit_pct', 'balance_days'].forEach(function (k) { if (copy[k] !== undefined) j[k] = copy[k]; }); (j.rooms || []).forEach(function (r) { r.id = QCStore.uid(); }); j.status = 'draft'; save(); toast('Copied to ' + j.quote_no); go('/job/' + j.id); return j; }
  // unique past clients for a picker: newest first
  // ---------- address lookup, satellite photo and house size (Google Maps, optional; nothing shows without a key)
  function mapsOn() { return !!(window.QCMaps && QCMaps.ready(S)); }
  function homeLatLng() { var st = (S.details && S.details.site) || {}; return st.lat ? { lat: st.lat, lng: st.lng } : null; }
  // Suggestions under an address box. onPick(place) gets {place_id, address, lat, lng, postcode, state}; the box's value is set and its input event fired so the binding saves it.
  function wireAddress(input, onPick) {
    if (!input || !window.QCMaps || input.dataset.addr) return; input.dataset.addr = '1'; input.setAttribute('autocomplete', 'off');
    var box = document.createElement('div'); box.className = 'sugg'; box.hidden = true; input.parentNode.insertBefore(box, input.nextSibling);
    var tok = QCMaps.token(), timer = null, seq = 0, last = '';
    function hide() { box.hidden = true; box.innerHTML = ''; }
    function setValue(v) { last = v; input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); }
    function pick(s) { hide(); setValue(s.text); QCMaps.details(s.id, tok, S).then(function (pl) { tok = QCMaps.token(); if (pl.address) setValue(pl.address); if (onPick) onPick(pl); }).catch(function (e) { toast('Could not look up that address: ' + e.message); }); }
    function show(list) { if (!list.length) return hide(); box.innerHTML = list.map(function (x, i) { return '<button type="button" class="sugg-item" data-i="' + i + '"><b>' + esc(x.main || x.text) + '</b>' + (x.secondary ? '<span>' + esc(x.secondary) + '</span>' : '') + '</button>'; }).join(''); box.hidden = false; box.querySelectorAll('.sugg-item').forEach(function (b) { b.addEventListener('mousedown', function (e) { e.preventDefault(); }); b.addEventListener('click', function () { pick(list[+b.dataset.i]); }); }); }
    input.addEventListener('input', function () { var v = input.value.trim(); if (v === last) return; if (!mapsOn() || v.length < 4) { hide(); return; } clearTimeout(timer); timer = setTimeout(function () { var my = ++seq; QCMaps.suggest(v, tok, homeLatLng(), S).then(function (list) { if (my === seq && document.activeElement === input) show(list); }).catch(function () { hide(); }); }, 250); });
    input.addEventListener('blur', function () { setTimeout(hide, 150); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  }
  // A picked address on a job: remember where it is, forget any old house size, and go and get the new one.
  function siteFromPlace(job, pl) { var old = job.site || {}; job.site = { place_id: pl.place_id || '', address: pl.address || '', lat: pl.lat, lng: pl.lng, postcode: pl.postcode || '', state: pl.state || '', footprint_m2: null, perimeter_m: null, roof_m2: null, source: '', traced: [], storeys: old.storeys || 1, checked: false }; }
  function siteCard(job) {
    if (!window.QCMaps) return ''; var st = job.site || {}; if (!st.lat) return '';
    var url = QCMaps.satelliteUrl(st.lat, st.lng, S), line = QCMaps.siteLine(st), est = QCMaps.estimate(st, st.storeys || 1), hasExt = (job.rooms || []).some(function (r) { return r.type === 'exterior'; });
    var status = line ? esc(line) : (st.checked ? 'Google has no building data for this address. Trace the house on the photo to get its size.' : (mapsOn() ? 'Working out the size of the house…' : 'Back online, the size of the house is worked out from the photo.'));
    return '<div class="card site"><h2>Site</h2>' + (url ? '<img class="sat" id="satimg" src="' + esc(url) + '" alt="Satellite photo of ' + esc(st.address || job.client.address || 'the site') + '" width="600" height="450">' : '') +
      '<p id="siteline">' + status + '</p>' + (line ? '<p class="hint">Outside walls about ' + est.walls_m2 + ' m² (' + est.storeys + (est.storeys === 1 ? ' storey' : ' storeys') + ' at ' + est.wall_h + ' m), eaves and gutters about ' + est.eaves_m + ' m each. Check on site.</p>' : '') +
      '<div class="row"><label class="f inline"><span>Storeys</span><select id="sitestoreys"><option value="1"' + (est.storeys === 1 ? ' selected' : '') + '>1</option><option value="2"' + (est.storeys >= 2 ? ' selected' : '') + '>2</option></select></label><button class="btn ghost sm" id="tracehouse" type="button">' + (st.source === 'traced' ? 'Trace it again' : 'Trace the house') + '</button>' + (line && !quoteLocked(job) ? '<button class="btn sm" id="siteext" type="button">' + (hasExt ? 'Add another outside area from this' : 'Add outside area from this') + '</button>' : '') + '</div></div>';
  }
  function wireSite($app, job, rerender) {
    var st = job.site; if (!st || !st.lat || !window.QCMaps) return;
    if (!st.checked && mapsOn()) { QCMaps.building(st.lat, st.lng, S).then(function (b) { st.checked = true; if (b && b.footprint_m2 > 0 && st.source !== 'traced') { st.footprint_m2 = b.footprint_m2; st.perimeter_m = b.perimeter_m; st.roof_m2 = b.roof_m2; st.source = 'google'; } save(); rerender(); }).catch(function (e) { st.checked = true; save(); var el = document.getElementById('siteline'); if (el) el.textContent = 'Could not get the house size (' + e.message + '). Trace the house on the photo instead.'; }); }
    var img = document.getElementById('satimg'); if (img) img.addEventListener('error', function () { img.hidden = true; });
    var sel = document.getElementById('sitestoreys'); if (sel) sel.addEventListener('change', function () { st.storeys = parseInt(sel.value, 10) || 1; save(); rerender(); });
    var tr = document.getElementById('tracehouse'); if (tr) tr.addEventListener('click', function () { traceHouse(job, rerender); });
    var ex = document.getElementById('siteext'); if (ex) ex.addEventListener('click', once(function () { var r = QCStore.newRoom('exterior'), est = QCMaps.estimate(st, st.storeys || 1); r.name = hasExtName(job); r.ext.storeys = est.storeys; r.ext.weatherboard = est.walls_m2; r.ext.eaves = est.eaves_m; r.ext.gutters = est.gutters_m; r.ext.from_satellite = true; r.notes = 'From the satellite photo: walls ' + est.walls_m2 + ' m² (' + est.perimeter_m + ' m around × ' + est.wall_h + ' m × ' + est.storeys + '), eaves and gutters ' + est.eaves_m + ' m. Check on site. Move the wall figure to Render or brick if the walls are not weatherboard.'; job.rooms.push(r); save(); go('/job/' + job.id + '/room/' + r.id); }));
  }
  function hasExtName(job) { var n = (job.rooms || []).filter(function (r) { return r.type === 'exterior'; }).length; return n ? 'Outside ' + (n + 1) : 'Outside'; }
  // Full-screen photo: tap the corners of the house, Done works out the ground area and the distance around.
  function traceHouse(job, done) {
    var st = job.site, url = QCMaps.satelliteUrl(st.lat, st.lng, S, { marker: false }); if (!url) return;
    var W = QCMaps.SIZE[0] * QCMaps.SCALE, H = QCMaps.SIZE[1] * QCMaps.SCALE, pts = (st.source === 'traced' && st.traced && st.traced.length) ? st.traced.slice() : [];
    var ov = document.createElement('div'); ov.className = 'trace'; ov.id = 'trace';
    ov.innerHTML = '<div class="trace-bar"><b>Tap each corner of the house</b><span class="hint" id="tracehint"></span></div><div class="trace-body" id="tracebody"><div class="trace-wrap" id="tracewrap"><img src="' + esc(url) + '" alt="Satellite photo" width="' + W + '" height="' + H + '" draggable="false"><svg id="tracesvg" viewBox="0 0 ' + W + ' ' + H + '"></svg></div></div><div class="trace-foot"><button class="btn ghost" type="button" id="traceundo">Undo</button><button class="btn ghost" type="button" id="tracecancel">Cancel</button><button class="btn tape" type="button" id="tracedone">Done</button></div>';
    document.body.appendChild(ov); document.body.classList.add('noscroll');
    var svg = ov.querySelector('#tracesvg'), wrap = ov.querySelector('#tracewrap'), body = ov.querySelector('#tracebody'), hint = ov.querySelector('#tracehint');
    body.scrollLeft = Math.max(0, (W - body.clientWidth) / 2); body.scrollTop = Math.max(0, (H - body.clientHeight) / 2);
    function draw() { var poly = pts.map(function (p) { return p.x + ',' + p.y; }).join(' '); svg.innerHTML = (pts.length > 1 ? '<polygon points="' + poly + '" fill="rgba(33,102,188,.28)" stroke="#fff" stroke-width="4"/>' : '') + pts.map(function (p, i) { return '<circle cx="' + p.x + '" cy="' + p.y + '" r="13" fill="' + (i === 0 ? '#F2B33D' : '#2166BC') + '" stroke="#fff" stroke-width="4"/>'; }).join(''); var t = QCMaps.traced(pts, st.lat); hint.textContent = pts.length < 3 ? (pts.length ? 'Keep going round the outside walls.' : 'Go round the outside walls, one tap per corner. Scroll the photo if you need to.') : 'About ' + Math.round(t.footprint_m2) + ' m² on the ground, ' + Math.round(t.perimeter_m) + ' m around. Add corners or tap Done.'; }
    wrap.addEventListener('click', function (e) { var r = wrap.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H; if (x < 0 || y < 0 || x > W || y > H) return; pts.push({ x: Math.round(x), y: Math.round(y) }); draw(); });
    function close() { ov.remove(); document.body.classList.remove('noscroll'); }
    ov.querySelector('#traceundo').addEventListener('click', function () { pts.pop(); draw(); });
    ov.querySelector('#tracecancel').addEventListener('click', close);
    ov.querySelector('#tracedone').addEventListener('click', function () { if (pts.length < 3) { toast('Tap at least three corners first.'); return; } var t = QCMaps.traced(pts, st.lat); st.traced = pts; st.footprint_m2 = t.footprint_m2; st.perimeter_m = t.perimeter_m; st.source = 'traced'; st.checked = true; save(); close(); toast('House traced: about ' + Math.round(t.footprint_m2) + ' m², ' + Math.round(t.perimeter_m) + ' m around.'); done(); });
    draw();
  }
  function clients() { var seen = {}, out = []; S.jobs.forEach(function (j) { var c = j.client || {}; var k = String(c.name || '').trim().toLowerCase(); if (!k || seen[k]) return; seen[k] = 1; out.push({ name: c.name, first_name: c.first_name || '', phone: c.phone || '', email: c.email || '', address: c.address || '', type: c.type || 'homeowner' }); }); return out; }
  // the paint order for the trade counter, from the private cost breakdown
  function materialsText(priced, job) { var c = priced && priced.cost; if (!c || !c.litres || !Object.keys(c.litres).length) return 'No paint on this job yet.'; var names = (window.QCCosting && QCCosting.PAINT) || {}; var L = ['Paint order' + (job ? ' for ' + job.quote_no + (job.client && job.client.address ? ', ' + job.client.address : '') : '')]; Object.keys(c.litres).forEach(function (k) { var t = c.tins && c.tins[k]; L.push((names[k] || k) + ': ' + c.litres[k].toFixed(1) + ' L' + (t && t.label ? ' (' + t.label + ')' : '')); }); L.push('Plus: sugar soap, filler, tape, drop sheets, rollers and sleeves, brushes, sandpaper.'); return L.join('\n'); }
  // ---------- offline queues: cancels that failed (retried on load and when back online) and follow-ups too far ahead for the provider
  function queueCancel(x, jobId) { var st = QCStore.load(); st.pending_cancels = st.pending_cancels || []; if (!st.pending_cancels.some(function (q) { return q.id === x.id; })) st.pending_cancels.push({ id: x.id, channel: x.channel, job: jobId || '', what: x.what || '', at: new Date().toISOString() }); }
  function retryPendingCancels() {
    var st = QCStore.load(), list = (st.pending_cancels || []).slice(); if (!list.length || !(QCMsg.ready('sms') || QCMsg.ready('email'))) return Promise.resolve(0);
    return Promise.all(list.map(function (q) { return QCMsg.call({ action: 'cancel', channel: q.channel, id: q.id, meta: { job: q.job, ref: q.what } }).then(function () { return q; }).catch(function () { return null; }); })).then(function (done) {
      var okd = done.filter(Boolean); if (!okd.length) return 0; var ids = {}; okd.forEach(function (q) { ids[q.id] = 1; });
      st.pending_cancels = st.pending_cancels.filter(function (q) { return !ids[q.id]; });
      st.jobs.forEach(function (j) { (j.follow_ups || []).forEach(function (x) { if (ids[x.id]) { x.cancelled = true; x.cancel_error = ''; } }); (j.invoices || []).forEach(function (i) { (i.follow_ups || []).forEach(function (x) { if (ids[x.id]) { x.cancelled = true; x.cancel_error = ''; } }); }); });
      save(); toast(okd.length + ' reminder' + (okd.length > 1 ? 's' : '') + ' cancelled'); return okd.length;
    });
  }
  function pendingBanner() { var n = (S.pending_cancels || []).length; if (!n) return ''; return '<div class="card banner"><p><b>' + n + ' reminder cancellation' + (n > 1 ? 's' : '') + ' waiting</b><span class="hint"> · could not reach the sending server. They retry when you are back online.</span></p><div class="row"><button class="btn sm" id="retrycancel">Retry now</button></div></div>'; }
  function wireBanner() { var b = document.getElementById('retrycancel'); if (b) b.addEventListener('click', function () { b.disabled = true; retryPendingCancels().then(function (n) { if (!n) toast('Still could not reach the sending server.'); route(); }); }); }
  // One booked reminder per chase at a time. A scheduled message costs a message the moment it is BOOKED, not when it
  // goes, so booking all three nudges the day a quote goes out spends three on a job that usually answers after the
  // first. Only the next reminder in a chase is ever booked; the one after it is booked when the app next opens, once
  // the one before it has gone. Nothing is lost if he never opens it: the dates are still in local_queue.
  function chaseKey(it) { return String(it.job || '') + '|' + String(it.inv || ''); }
  function chaseBooked(job, invNo) {
    var list = invNo ? ((((job && job.invoices) || []).filter(function (i) { return i.no === invNo; })[0] || {}).follow_ups || []) : ((job && job.follow_ups) || []);
    return list.some(function (x) { return x && x.id && !x.cancelled && new Date(x.send_at || (x.day + 'T12:00:00')).getTime() > Date.now(); });
  }
  function bySendAt(a, b) {
    var x = String(a.send_at || a.day), y = String(b.send_at || b.day);
    if (x !== y) return x < y ? -1 : 1;
    // Same minute: the catch-up for dates already missed goes first. It stands for money already owed, and it
    // has one date only -- lose the tie and it waits in the queue until its time passes and it is dropped,
    // which is the one message that must not go missing. A scheduled nudge comes round again by itself.
    var la = /\+late$/.test(String(a.ref || '')), lb = /\+late$/.test(String(b.ref || ''));
    return la === lb ? 0 : la ? -1 : 1;
  }
  // Split would-be reminders into the ones to book now (at most the next one in each chase, and only inside the
  // provider's window) and the ones to hold in the local queue.
  function nextInChase(items, needReady) {
    var byChase = {}, order = [], now = [], later = [];
    items.forEach(function (it) { var k = chaseKey(it); if (!byChase[k]) { byChase[k] = []; order.push(k); } byChase[k].push(it); });
    order.forEach(function (k) {
      var grp = byChase[k].slice().sort(bySendAt), head = chaseBooked(QCStore.getJob(grp[0].job), grp[0].inv) ? null : grp[0];
      grp.forEach(function (it) {
        var book = it === head && QCMsg.withinWindow(it.send_at, it.channel) && (!needReady || QCMsg.ready(it.channel));
        (book ? now : later).push(it);
      });
    });
    return { now: now, later: later };
  }

  function retryLocalQueue() {
    var st = QCStore.load(), q = st.local_queue || []; if (!q.length) return Promise.resolve();
    var wanted = [], late = []; q.forEach(function (it) {
      var job = QCStore.getJob(it.job), inv = job && it.inv ? (job.invoices || []).filter(function (i) { return i.no === it.inv; })[0] : null;
      var alive = job && !(job.hold && job.hold.on) && (it.inv ? (inv && invOpen(inv)) : (job.status === 'quoted' && job.auto_follow_ups !== false));
      if (!alive) return; // dropped: no longer wanted
      if (new Date(it.send_at).getTime() < Date.now() + 10 * 60000) { if (!/\+late$/.test(String(it.ref || ''))) return; late.push(it); } // a nudge whose day has passed is dropped (the next one in the chase stands for it); the catch-up is the only message for money or a quote already overdue, so it goes at the next send time instead
      wanted.push(it);
    });
    if (late.length) { var hr = fuHour(), stc = stateCode(), t = QCCal.nextSendTime(QCStore.today(), hr, stc); if (t.date.getTime() < Date.now() + 10 * 60000) t = QCCal.nextSendTime(QCStore.addDays(QCStore.today(), 1), hr, stc); late.forEach(function (it) { it.day = t.day; it.send_at = t.iso; }); spread(late, hr, stc); }
    var pick = nextInChase(wanted, true), keep = pick.later, now = pick.now;
    st.local_queue = keep.concat(now); if (!now.length) { if (keep.length !== q.length) save(); return Promise.resolve(); }
    return QCMsg.scheduleAll(now, fuHour()).then(function (res) {
      var okd = res.filter(function (r) { return r.ok; }); okd.forEach(function (r) { var job = QCStore.getJob(r.job || (now.filter(function (i) { return i.key === r.key; })[0] || {}).job); if (!job) return; var it = now.filter(function (i) { return i.key === r.key; })[0]; if (it && it.inv) { var inv = job.invoices.filter(function (i) { return i.no === it.inv; })[0]; if (inv) { inv.follow_ups = (inv.follow_ups || []).concat([r]); inv.follow_up_error = ''; } } else { job.follow_ups = (job.follow_ups || []).concat([r]); job.follow_up_error = ''; } });
      var full = {}; res.forEach(function (r) { if (!r.ok && r.full) full[r.key] = 1; }); nextDayFor(now.filter(function (i) { return full[i.key]; }));
      var okKeys = {}; okd.forEach(function (r) { okKeys[r.key] = 1; }); st.local_queue = st.local_queue.filter(function (i) { return !okKeys[i.key]; }); save(); if (okd.length) toast(okd.length + ' waiting follow-up' + (okd.length > 1 ? 's' : '') + ' now scheduled');
    });
  }

  // one more go a few minutes on, while the app is still open, for bookings the relay turned away (no signal, too many at once)
  function scheduleRetry() { if (scheduleRetry.t) return; scheduleRetry.t = setTimeout(function () { scheduleRetry.t = 0; retryLocalQueue().catch(function () {}); }, 11 * 60000); }
  // two-way binding: <input data-bind="path.to.key"> against a root object
  function bindAll(root, obj) {
    root.querySelectorAll('[data-bind]').forEach(function (el) {
      var path = el.dataset.bind.split('.'), o = obj; for (var i = 0; i < path.length - 1; i++) { o = o[path[i]] = o[path[i]] || {}; }
      var k = path[path.length - 1];
      if (el.type === 'checkbox') el.checked = !!o[k]; else el.value = o[k] == null ? '' : o[k];
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', function () {
        o[k] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? (el.value === '' ? '' : n(el.value)) : el.value);
        save(); if (el.dataset.refresh) refreshPreview();
      });
    });
  }
  var refreshPreview = function () {};

  // ---------- routing
  function route() {
    if (window.__qcMeasure && window.__qcMeasure.unsaved && window.__qcMeasure.unsaved()) { window.__qcMeasure.saveNow(); toast('Wall saved'); }
    window.__qcMeasure = null; creating = false;
    S = QCStore.load(); ['pending_cancels', 'local_queue', 'trash'].forEach(function (k) { if (!Array.isArray(S[k])) S[k] = []; }); if (!S.security || typeof S.security !== 'object') S.security = { pin: '', backup_include_keys: false }; if (!S.log || typeof S.log !== 'object') S.log = { sent: [] }; if (!S.ui || typeof S.ui !== 'object') S.ui = {};
    var h = location.hash.replace(/^#\/?/, ''), qs = '', qi = h.indexOf('?'); if (qi >= 0) { qs = h.slice(qi + 1); h = h.slice(0, qi); } var p = h.split('/'); // #/setup?d=... carries the set-up code after the ?
    try { if (window.event && window.event.type === 'storage') route.storageAt = Date.now(); } catch (e) {} // store.js re-routes this tab when another tab writes: Home must not purge the job that tab is typing into
    try { window.scrollTo(0, 0); } catch (e) {} // every screen opens at the top; a form never opens scrolled to its bottom
    setTimeout(afterRoute, 0);
    var navKey = { '': 'home', add: 'home', job: 'home', enquiry: 'home', help: '', chase: 'chase', settings: 'settings', setup: 'settings', scoreboard: 'home', myprices: 'settings', test: '' }[p[0] || '']; if (navKey == null) navKey = 'home';
    document.querySelectorAll('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === navKey); });
    // While he is at the door or the wall there is nowhere else to be, so the tabs are not offered.
    if (!S.details.trade && (S.security.setup_done || (typeof pricesTouched === 'function' && pricesTouched()))) { S.details.trade = 'painter'; save(); }
    try { document.body.classList.toggle('notpainter', !paintsHere()); } catch (e) {}
    try { var gated = (!joined() || !wallDone()) && p[0] !== 'setup' && p[0] !== 'help';
      var atDoor = !joined() && p[0] !== 'setup' && p[0] !== 'help' && !locked();
      var hd = document.querySelector('header.top'); if (hd) hd.hidden = atDoor; // the door is the logo, the name and the way in: nothing above it
      var nv = document.querySelector('header.top nav'); if (nv) nv.hidden = gated; } catch (e) {}
    try { testBar(); } catch (e) {}
    try { saveTrouble(troubleKind); } catch (e) {}
    refreshPreview = function () {};
    if (locked()) return viewLock();
    if (!joined() && p[0] !== 'setup' && p[0] !== 'help') return viewJoin();
    // Nothing until the four things are done. Help and a set-up link still open, so he is never stuck.
    if (!wallDone() && p[0] !== 'setup' && p[0] !== 'help') return viewWall();
    if (!route.booted) { route.booted = true; purgeTrash(); try { if (navigator.storage && navigator.storage.persist && (S.jobs.length || S.details.trading_name)) navigator.storage.persist().catch(function () {}); } catch (e) {} setTimeout(function () { retryPendingCancels().then(function () { return retryLocalQueue(); }).catch(function () {}); }, 800); setTimeout(function () { renewHosted().catch(function () {}); }, 1500);
      // A customer may have accepted, or picked a start day, while the phone was in his pocket. Pull it in and
      // show it without him asking. Best effort: no signal simply means next time.
      setTimeout(function () { syncNow(); }, 2200);
      window.addEventListener('online', function () { retryPendingCancels().then(function () { return retryLocalQueue(); }).catch(function () {}); syncNow(); });
      document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - QCSync.lastAt() > 120000) syncNow(); }); }
    if (!p[0]) { var fq = /(?:^|&)f=(\w+)/.exec(qs || ''); if (fq) homeFilter = fq[1]; return viewHome(); }
    if (p[0] === 'settings') { if (p[1] === 'log') return viewSentLog(); if (qs) calendarReturn(qs); viewSettings(); if (p[1]) openSection({ backup: 'Back-up', prices: 'Prices', bank: 'Bank details' }[p[1]] || ''); return; }
    if (p[0] === 'chase') return viewChase();
    if (p[0] === 'help') return viewHelp();
    if (p[0] === 'setup') return viewSetupLink(qs);
    if (p[0] === 'test') return viewTest();
    if (p[0] === 'scoreboard') return viewScoreboard();
    if (p[0] === 'myprices') return viewMyPrices();
    if (p[0] === 'handoff' && p[1]) { var hj = QCStore.getJob(p[1]); if (!hj) return bounce('/'); return viewHandOff(hj); }
    if (p[0] === 'add') return viewAdd(p[1] || '', qs);
    if (p[0] === 'enquiry') { if (p[1] && !QCStore.getJob(p[1])) return bounce('/'); return viewEnquiry(p[1] ? QCStore.getJob(p[1]) : null); }
    if (p[0] === 'job' && p[1]) {
      var job = QCStore.getJob(p[1]); if (!job) return bounce('/');
      if (p[2] === 'room' && p[3]) return viewRoom(job, p[3]);
      if (p[2] === 'quote') return viewQuote(job);
      if (p[2] === 'invoice') return viewInvoice(job, false, qs);
      return viewJob(job);
    }
    bounce('/');
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('storage', function (e) { if (e.key === 'qc-app-v1' || !e.key) route.storageAt = Date.now(); }, true); // fires before store.js re-routes this tab: a Home render caused by another tab's write must not purge the job that tab is typing into
  // #/settings/backup opens Set-up with that section open and on screen (the Home "Save copy" link); titles match the Set-up headings
  function openSection(title) { if (!title) return; var det = Array.prototype.filter.call($app.querySelectorAll('details.sec'), function (d) { var s = d.querySelector('summary'); return s && s.textContent.trim().toLowerCase().indexOf(title.toLowerCase()) === 0; })[0]; if (!det) return; det.open = true; setTimeout(function () { try { det.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); } catch (e) {} }, 0); }
  // after any screen renders: quote-style line tables (Item / Qty / Amount) get the two-line layout on narrow phones (app.css table.lines)
  function afterRoute() { $app.querySelectorAll('table').forEach(function (t) { var th = t.querySelectorAll('thead th'); if (th.length === 3 && /^(Qty|Quantity)$/i.test(th[1].textContent.trim())) t.classList.add('lines'); }); }

  // ---------- Home
  function depositPaidOnly(j) { if (j.status !== 'invoiced') return false; var live = liveInvoices(j); return live.some(function (i) { return i.kind === 'deposit' && i.total > 0 && invBal(i) <= 0.004; }) && live.every(function (i) { return i.kind === 'deposit' || invPaid(i) <= 0.004; }); }
  function statusPill(j) {
    var map = { enquiry: ['Enquiry', 'warn'], draft: ['Draft', ''], quoted: ['Quoted', 'ok'], accepted: ['Accepted', 'ok'], invoiced: ['Invoiced', 'warn'], paid: ['Paid', 'ok'], declined: ['Declined', 'bad'], cancelled: ['Cancelled', 'bad'] };
    var m = map[j.status] || ['', '']; if (depositPaidOnly(j)) m = ['Deposit paid', 'ok'];
    return '<span class="pill ' + m[1] + '">' + m[0] + '</span>' + (j.hold && j.hold.on ? ' <span class="pill warn">On hold</span>' : '');
  }
  var homeFilter = 'all', homeQuery = '';
  // Where a job is up to, as five pictures: asked, quoted, yes, invoiced, paid. Done steps solid, this one
  // ringed, the rest faint. The word is still there for a screen reader. A declined or cancelled job has no
  // step to be on, so it keeps its word.
  var STAGES = [['enquiry', 'phone'], ['quoted', 'quote'], ['accepted', 'yes'], ['invoiced', 'invoice'], ['paid', 'cash']];
  function stageTrack(j) {
    var at = { enquiry: 0, draft: 1, quoted: 1, accepted: 2, invoiced: 3, paid: 4 }[j.status];
    if (at == null || !window.QCPics) return statusPill(j);
    var word = statusPill(j).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    var tone = j.status === 'invoiced' && jobOwing(j) > 0 && (j.invoices || []).some(function (i) { return invOpen(i) && i.due && i.due < QCStore.today(); }) ? ' bad' : '';   // green done, yellow in hand, red when money is overdue
    var h = '<span class="track" role="img" aria-label="' + esc(word) + '">';
    STAGES.forEach(function (s, i) {
      if (i) h += '<span class="gap' + (i <= at ? ' done' : '') + '"></span>';
      // a paid job is finished: every step done, nothing still in hand
      h += '<span class="st' + (i < at || j.status === 'paid' ? ' done' : i === at ? ' now' + tone : '') + '">' + QCPics.svg(s[1]) + '</span>';
    });
    h += '</span><span class="sr">' + esc(word) + '</span>';
    return h + (j.hold && j.hold.on ? ' <span class="pill warn">On hold</span>' : '');
  }
  function jobCard(j) {
    var total = j.quote ? money(j.quote.total) : (j.ballpark ? money(j.ballpark.low) + ' to ' + money(j.ballpark.high) : ''), owing = j.status === 'invoiced' ? jobOwing(j) : 0;
    return '<a class="job" href="' + (j.status === 'enquiry' ? '#/enquiry/' + j.id : '#/job/' + j.id) + '"><div class="row between"><b>' + esc(j.client.name || 'New job') + '</b><span class="sub">' + esc(j.client.address || (jobDesc(j) === 'the work' ? '' : j.summary)) + '</span></div><div class="row between"><span>' + stageTrack(j) + '</span><span class="sub">' + esc(j.quote_no) + (owing > 0 ? ' · owing ' + money(owing) : total ? ' · ' + total : '') + '</span></div></a>';
  }
  // the three first-run steps: done when the detail is there; the card goes once all three are, or when the painter hides it
  // ---------- the wall
  // A new account does the four things that make a quote real before it can do anything else. Each is one
  // question on its own screen: a painter who is not good with phones has one thing in front of him at a time.
  function payStarted() {
    var pay = S.payment || {};
    return !!(pay.stripe_started || (String(pay.bsb || '').trim() && String(pay.account_number || '').trim()) ||
              (String(S.details.bsb || '').trim() && String(S.details.account_number || '').trim()));
  }
  // Every trade. The state building-work rules (the deposit caps) cover the building trades; a cleaner, a
  // gardener and pest control are not building work. When in doubt the cap applies: a smaller deposit than
  // asked is a safe mistake, a larger one than the law allows is not.
  var TRADES = [['painter', 'Painter', 1], ['electrician', 'Electrician', 1], ['plumber', 'Plumber', 1], ['carpenter', 'Carpenter', 1], ['builder', 'Builder', 1],
    ['tiler', 'Tiler', 1], ['plasterer', 'Plasterer', 1], ['roofer', 'Roofer', 1], ['landscaper', 'Landscaper', 1], ['concreter', 'Concreter', 1], ['fencer', 'Fencer', 1],
    ['aircon', 'Air-con', 1], ['handyman', 'Handyman', 1], ['cleaner', 'Cleaner', 0], ['gardener', 'Gardener', 0], ['pest', 'Pest control', 0], ['other', 'Something else', 1]];
  function trade() { return String((S && S.details && S.details.trade) || ''); }   // safe before the account is read
  function paintsHere() { return trade() === 'painter'; }   // the room-by-room quote builder and photo measuring are for painters
  function buildingTrade() { var t = trade(); return !TRADES.some(function (x) { return x[0] === t && x[2] === 0; }); }
  function wallSteps() {
    var d = S.details, defaults = (QCStore.defaults && QCStore.defaults().prices) || {};
    var touched = Object.keys(defaults).some(function (k) { return S.prices[k] !== defaults[k]; });
    return [
      { id: 'name',   label: 'Your business name', done: !!String(d.trading_name || '').trim() },
      { id: 'abn',    label: 'Your ABN',           done: /\d{11}/.test(String(d.abn || '').replace(/\D/g, '')) },
      { id: 'state',  label: 'Your state',         done: !!String(d.state || '').trim() },
      { id: 'trade',  label: 'Your trade',         done: !!trade() },
      { id: 'pay',    label: 'How you get paid',   done: payStarted() }
    ];
  }
  function wallDone() { return wallSteps().every(function (x) { return x.done; }); }

  function viewWall() {
    var steps = wallSteps(), at = null, i;
    for (i = 0; i < steps.length; i++) if (!steps[i].done) { at = steps[i]; break; }
    // Done: the hash is already '#/' because the wall never left it, so setting it again fires nothing.
    // Re-route by hand, or he answers the last question and the screen just sits there.
    if (!at) { if (location.hash && location.hash !== '#/' && location.hash !== '#') { go('/'); } else { route(); } return; }
    var n = steps.filter(function (x) { return x.done; }).length;

    var html = '<div class="wall"><p class="hint">' + (n + 1) + ' of ' + steps.length + '</p>';
    if (at.id === 'name') html += '<h1>Your business name</h1>' +
      '<label class="f"><input type="text" id="w_in" autocomplete="organization" placeholder="Smith & Sons" value="' + esc(S.details.trading_name || '') + '"></label>';
    else if (at.id === 'abn') html += '<h1>Your ABN</h1>' +
      '<label class="f"><input type="text" id="w_in" inputmode="numeric" placeholder="12 345 678 901" value="' + esc(S.details.abn || '') + '"></label>';
    else if (at.id === 'state') html += '<h1>Your state</h1>' +
      '<div class="row wrap" id="w_states">' + ['SA', 'NSW', 'VIC', 'QLD', 'WA', 'TAS', 'NT', 'ACT'].map(function (st) {
        return '<button class="btn' + (S.details.state === st ? ' tape' : ' ghost') + '" data-state="' + st + '">' + st + '</button>'; }).join('') + '</div>';
    else if (at.id === 'trade') html += '<h1>Your trade</h1>' +
      '<div class="tradegrid" id="w_trades">' + TRADES.map(function (t) { return '<button class="btn ghost" data-trade="' + t[0] + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>';
    else if (at.id === 'pay') html += '<h1>Getting paid</h1>' + payChoices();

    if (at.id !== 'state' && at.id !== 'pay' && at.id !== 'trade') html += '<div class="row"><button class="btn tape lg" id="w_next">Next</button></div>';
    html += '<p class="hint" id="w_msg"></p>';
    html += '<ol class="wallsteps">' + steps.map(function (x) {
      return '<li class="' + (x.done ? 'done' : x.id === at.id ? 'now' : '') + '">' + esc(x.label) + '</li>'; }).join('') + '</ol>';
    html += '<p class="hint"><a href="#/help">Help</a> &middot; <a href="#" id="w_out">Sign out</a></p></div>';
    $app.innerHTML = html;
    wireWall(at);
  }

  // The costing engine thinks in an hourly rate; a painter thinks in a day. One is the other over his hours.
  function dayRate() {
    var c = S.costing || {}, h = +c.hours_per_day || 8, r = +c.labour_rate || 0;
    return r ? Math.round(r * h) : '';
  }
  function setDayRate(n) {
    if (!S.costing || typeof S.costing !== 'object') S.costing = QCCosting.defaults();
    var h = +S.costing.hours_per_day || 8;
    S.costing.labour_rate = Math.round((n / h) * 100) / 100;
    try {
      var der = QCCosting.deriveRates(S.costing);
      Object.keys(der).forEach(function (k) { if (der[k] != null) S.prices[k] = der[k]; });
    } catch (e) {}
    S.security.setup_done = true;
    save();
  }

  function payChoices() {
    var pay = S.payment || {}, off = pay.card_off === true;
    return (off ? '<p class="hint">Card is not switched on yet.</p>' : '') +
      (off ? '' : '<div class="row"><button class="btn tape lg" id="w_card">Get paid by card</button></div>') +
      '<details class="sec sub"' + (off ? ' open' : '') + '><summary><h3>Bank transfer instead</h3></summary>' +
      '<label class="f">Account name<input type="text" id="w_an" autocomplete="off" value="' + esc(pay.account_name || S.details.account_name || '') + '"></label>' +
      '<label class="f">BSB<input type="text" id="w_bsb" inputmode="numeric" placeholder="063-000" value="' + esc(pay.bsb || S.details.bsb || '') + '"></label>' +
      '<label class="f">Account number<input type="text" id="w_acct" inputmode="numeric" value="' + esc(pay.account_number || S.details.account_number || '') + '"></label>' +
      '<div class="row"><button class="btn" id="w_bank">Use bank transfer</button></div></details>';
  }

  function wireWall(at) {
    var msg = document.getElementById('w_msg'), box = document.getElementById('w_in');
    var say = function (t) { if (msg) msg.textContent = t || ''; };
    if (box) { try { box.focus(); } catch (e) {} }
    var next = function () {
      var v = box ? String(box.value || '').trim() : '';
      if (at.id === 'name') { if (!v) return say('Type your business name.'); S.details.trading_name = v; }
      if (at.id === 'abn') { if (String(v).replace(/\D/g, '').length !== 11) return say('An ABN is 11 numbers.'); S.details.abn = v; }
      if (at.id === 'prices') {
        var n = parseFloat(v); if (!(n >= 100 && n <= 3000)) return say('Somewhere between 100 and 3000.');
        setDayRate(n);
      }
      save(); viewWall();
    };
    var nb = document.getElementById('w_next');
    if (nb) nb.addEventListener('click', next);
    if (box) box.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); next(); } });

    Array.prototype.forEach.call($app.querySelectorAll('[data-trade]'), function (b) {
      b.addEventListener('click', function () { S.details.trade = b.getAttribute('data-trade'); save(); viewWall(); });
    });
    Array.prototype.forEach.call($app.querySelectorAll('[data-state]'), function (b) {
      b.addEventListener('click', function () { S.details.state = b.getAttribute('data-state'); save(); viewWall(); });
    });

    var card = document.getElementById('w_card');
    if (card) card.addEventListener('click', function () {
      card.disabled = true; say('Opening Stripe\u2026');
      payConnect('start').then(function (r) {
        card.disabled = false;
        if (r && r.off) { S.payment = Object.assign({}, S.payment, { card_off: true }); save(); viewWall(); return; }
        if (!r || !r.ok || !r.url) { say((r && r.error) || 'That did not work.'); return; }
        S.payment = Object.assign({}, S.payment, { stripe_started: true }); save();
        location.href = r.url;
      });
    });
    var bank = document.getElementById('w_bank');
    if (bank) bank.addEventListener('click', function () {
      var an = document.getElementById('w_an').value.trim(), bsb = document.getElementById('w_bsb').value.trim(), ac = document.getElementById('w_acct').value.trim();
      if (!an) return say('Whose account is it?');
      if (String(bsb).replace(/\D/g, '').length !== 6) return say('A BSB is 6 numbers.');
      if (String(ac).replace(/\D/g, '').length < 5) return say('That account number looks short.');
      S.payment = Object.assign({}, S.payment, { account_name: an, bsb: bsb, account_number: ac });
      S.details.account_name = an; S.details.bsb = bsb; S.details.account_number = ac;
      save(); viewWall();
    });

    var out = document.getElementById('w_out');
    if (out) out.addEventListener('click', function (e) {
      e.preventDefault();
      if (!confirm('Sign out of this phone? Your jobs stay in your account.')) return;
      S.account = null; S.sending = Object.assign({}, S.sending, { token: '', hosted: false }); save(); route();
    });
  }

  function payConnect(action, extra) {
    var sd = S.sending || {}, url = String(sd.server || '').trim();
    url = url ? url.replace(/\/[^\/]*$/, '/connect') : String(((window.QC_APP || {}).signup_url) || '').replace(/\/[^\/]*$/, '/connect');
    if (!url || !sd.token) return Promise.resolve({ ok: false, error: 'Sending is not set up on this phone.' });
    var f = window.__qcRelayFetch || window.fetch, body = { token: sd.token, action: action };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) body[k] = extra[k];
    return f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: 'Could not reach the sending server.' }; });
  }

  // ---- a pay-by-card link on an invoice.
  // Connect first: his own Stripe account, opened from this phone, money straight to him, and Stripe tells the
  // relay when it is paid so the invoice ticks itself off. The restricted key stays for anyone already on one.
  function cardOn() { return (S.payment || {}).card_ready === true; }
  function keyOn() { return !!(S.stripe && S.stripe.enabled && QCStripe.keyLooksRight(S.stripe.key)); }
  function cardAnyOn() { return cardOn() || keyOn(); }
  function payLinkFor(job, inv) {
    var amount = invBal(inv), name = (S.details.trading_name || 'Invoice') + ' ' + inv.no;
    if (cardOn()) return payConnect('link', { amount: amount, invoice: inv.no, job: job.id, name: name })
      .then(function (r) { if (!r || !r.ok || !r.url) throw new Error((r && r.error) || 'Card link failed'); return { url: r.url, id: r.id }; });
    if (keyOn()) return QCStripe.createPaymentLink(S.stripe.key, { amount: amount, name: name, invoiceNo: inv.no, jobId: job.id });
    return Promise.resolve(null);
  }
  // What Stripe says about his account, kept on the phone so every screen can ask without a request.
  function paySnap() { var pay = S.payment || {}; return [pay.card_ready === true, String(pay.card_note || ''), pay.card_off === true].join('|'); }
  function payStatus(then) {
    var was = paySnap();
    return payConnect('status').then(function (r) {
      if (!r) return null;
      var pay = Object.assign({}, S.payment);
      if (r.off) pay.card_off = true;
      else {
        pay.card_off = false;
        pay.stripe_started = !!r.started || !!pay.stripe_started;
        pay.card_ready = r.ready === true;
        pay.card_note = String(r.note || '');
      }
      S.payment = pay; save();
      r.changed = paySnap() !== was;
      if (then) then(r);
      return r;
    });
  }

  // The wall already made him do his name, ABN, state, prices and how he gets paid. The only thing left that
  // he can put off is letting it chase for him, so that is all Home nudges about.
  function setupSteps() {
    return [{ label: 'Follow-ups', href: '#/settings', done: !!(S.sending.hosted === true || autoReady()) }];
  }
  // What matters most, first: money owed (red), quotes waiting on an answer (yellow), work won (green).
  // Each tile opens the list behind it. Nothing to show, no strip.
  function moneyStrip(jobs) {
    var owed = 0, late = 0, waiting = 0, nWait = 0, won = 0, today = QCStore.today();
    jobs.forEach(function (j) {
      if (j.status === 'cancelled' || j.status === 'declined') return;
      (j.invoices || []).forEach(function (i) { if (invOpen(i) && invOut(i)) { var b = invBal(i); owed = r2(owed + b); if (i.due && i.due < today) late = r2(late + b); } });
      if (j.status === 'quoted' && j.sent_date && j.quote) { waiting = r2(waiting + (+j.quote.total || 0)); nWait++; }
      if (j.status === 'accepted') won++;
    });
    if (!owed && !nWait && !won) return '';
    var tile = function (cls, icon, big, word, href, label) { return '<a class="mtile ' + cls + '" href="' + href + '" aria-label="' + esc(label) + '">' + QCPics.svg(icon) + '<b>' + big + '</b><span>' + word + '</span></a>'; };
    return '<div class="mstrip">' +
      tile(late > 0 ? 'bad' : owed > 0 ? 'warn' : 'none', 'invoice', money0(owed), 'Owed', '#/chase', 'Owed to you: ' + money(owed) + (late > 0 ? ', ' + money(late) + ' overdue' : '')) +
      tile(nWait ? 'warn' : 'none', 'quote', money0(waiting), nWait === 1 ? '1 quote' : nWait + ' quotes', '#/?f=quoted', nWait + ' quotes waiting on an answer, ' + money(waiting)) +
      tile(won ? 'ok' : 'none', 'yes', String(won), 'Won', '#/?f=accepted', won + ' won, to book or start') + '</div>';
  }
  // whole dollars, and thousands as k once the figure would not fit a third of a phone: $980, $4,378, $12.1k
  function money0(v) { v = Math.round(v); if (v >= 10000) return '$' + (v >= 100000 ? Math.round(v / 1000) : (Math.round(v / 100) / 10)) + 'k'; return '$' + v.toLocaleString('en-AU'); }
  function viewHome() {
    if (typeof QCStore.purgeEmpty === 'function' && Date.now() - (route.storageAt || 0) > 1500) { try { QCStore.purgeEmpty(); } catch (e) {} S = QCStore.load(); if (!S.ui || typeof S.ui !== 'object') S.ui = {}; } // a Quick quote or New job that was backed out of with nothing typed goes, and its number comes back
    var jobs = S.jobs, today = QCStore.today(), steps = setupSteps(), allDone = steps.every(function (s) { return s.done; });
    if (allDone && !S.security.setup_done) { S.security.setup_done = true; save(); }
    // setup_done means the wall is behind him, which is now true of everyone on this screen; the nudge is
    // about the one thing he can still put off.
    var showSetup = !allDone && !S.ui.dismissed_setup_card;
    var html = pendingBanner();
    html += '<div class="row between"><h1>Jobs</h1><div class="row"><a class="btn tape tile" id="chaseadd" href="#/add"' + QCPics.says('Chase a quote') + '>' + QCPics.tile('chase', 'Chase') + '</a><button class="btn ghost tile ponly" id="newjob"' + QCPics.says('New job') + '>' + QCPics.tile('plus', 'New') + '</button><a class="btn ghost tile ponly" href="#/enquiry"' + QCPics.says('Phone enquiry') + '>' + QCPics.tile('phone', 'Enquiry') + '</a><button class="btn ghost tile ponly" id="quick"' + QCPics.says('Quick quote') + '>' + QCPics.tile('zap', 'Quick') + '</button></div></div>';
    html += moneyStrip(jobs);
    if (window.__qcInstallPrompt) html += '<div class="card"><div class="row between"><span><b>Put it on your home screen</b><span class="hint"> · opens like an app and works offline</span></span><button class="btn sm" id="install">Install</button></div></div>';
    var visits = jobs.filter(function (j) { return j.visit && j.visit.date >= today; }).sort(function (a, b) { return (a.visit.date + QCSched.hm(a.visit.start_min)) < (b.visit.date + QCSched.hm(b.visit.start_min)) ? -1 : 1; });
    if (visits.length) html += '<div class="card"><h3>Quote visits</h3>' + visits.slice(0, 5).map(function (j) { return '<a class="row between" href="#/enquiry/' + j.id + '" style="text-decoration:none;color:inherit"><span><b>' + esc(j.client.name || j.quote_no) + '</b> <span class="hint">' + esc(j.client.address || '') + '</span></span><span class="hint">' + QCPdf.fmtDate(j.visit.date) + ' ' + QCSched.nice(j.visit.start_min) + '</span></a>'; }).join('') + '</div>';
    var booked = jobs.filter(function (j) { return j.booking && j.booking.end >= today; }).sort(function (a, b) { return a.booking.start < b.booking.start ? -1 : 1; });
    if (booked.length) html += '<div class="card"><h3>Booked</h3>' + booked.slice(0, 4).map(function (j) { return '<div class="row between"><span><b>' + esc(j.client.name || j.quote_no) + '</b> <span class="hint">' + esc(j.client.address || '') + '</span></span><span class="hint">' + QCPdf.fmtDate(j.booking.start) + (j.booking.days > 1 ? ', ' + j.booking.days + ' days' : '') + '</span></div>'; }).join('') + '</div>';
    if (showSetup) html += '<div class="card" id="setupcard"><div class="row between"><h2>Follow-ups</h2>' +
      '<a class="btn tape sm" href="#/settings" id="setupgo">Turn on</a></div>' +
      '<div class="row"><button class="btn ghost sm" id="setuphide">Not now</button></div></div>';
      '<p class="hint">Quotes and invoices followed up in your name, without you. Or keep tapping Send, free.</p>' +
      '<div class="row between"><a class="btn tape" href="#/settings" id="setupgo">Turn it on</a><button class="btn ghost sm" id="setuphide">Not now</button></div></div>';
    var counts = { all: jobs.length, enquiry: 0, quoted: 0, accepted: 0, invoiced: 0, paid: 0 }; jobs.forEach(function (j) { if (counts[j.status] != null) counts[j.status]++; });
    var chips = [['all', 'All'], ['enquiry', 'Enquiry'], ['quoted', 'Quoted'], ['accepted', 'Accepted'], ['invoiced', 'Invoiced'], ['paid', 'Paid']].filter(function (c) { return c[0] === 'all' || counts[c[0]] > 0 || homeFilter === c[0]; }); // no "Paid 0" chips
    if (!jobs.length) html += '<a class="card empty emptychase" href="#/add">' + QCPics.svg('chase') + '<span>Nothing to chase yet. <b>Add a quote you sent.</b></span></a>';
    else html += '<div class="card"><input type="search" id="q" placeholder="Search name, address or quote number" aria-label="Search jobs" value="' + esc(homeQuery) + '" autocomplete="off"><div class="chips" id="chips">' + chips.map(function (c) { return '<button class="chip' + (homeFilter === c[0] ? ' on' : '') + '" data-chip="' + c[0] + '">' + c[1] + ' <span>' + counts[c[0]] + '</span></button>'; }).join('') + '</div></div><div class="joblist" id="joblist"></div>';
    var lb = S.security && S.security.last_backup, invoiced = jobs.some(function (j) { return (j.invoices || []).length; }), stale = !lb || QCStore.daysBetween(lb, today) > 7;
    html += '<p class="hint" id="backupline">' + (invoiced && stale ? '<span class="confirm">Invoices sent since your last copy' + (lb ? ' (' + QCPdf.fmtDate(lb) + ')' : '') + '.</span> ' : lb ? 'Last copy ' + QCPdf.fmtDate(lb) + '. ' : 'Save a copy. ') + '<a href="#/settings/backup">Save copy</a> · <a href="#/help">How it works</a></p>';
    if (S.ui.scoreboard_start) html += '<div class="card" id="scorecard"><div class="row between"><span><b>How it is going</b><span class="hint"> · since ' + esc(shortDate(S.ui.scoreboard_start)) + '</span></span><a class="btn sm" href="#/scoreboard">Scoreboard</a></div></div>';
    if (S.ui.book_chase === 'ready') { var bj = bookJobs(), bc = bookCounts(bj); if (!bj.length) S.ui.book_chase = ''; else html += '<div class="card" id="bookchase"><h3>Money you are owed</h3><p class="hint">' + [bc.invoices ? bc.invoices + ' unpaid invoice' + (bc.invoices > 1 ? 's' : '') : '', bc.quotes ? bc.quotes + ' open quote' + (bc.quotes > 1 ? 's' : '') : ''].filter(Boolean).join(' and ') + ' to chase. Nothing sent yet.</p><div class="row"><button class="btn tape sm" id="bookgo">Start the chasing</button><a class="btn ghost sm" href="#/chase">Read the wording</a><button class="btn ghost sm" id="bookhide">Not for these</button></div></div>'; }
    var hs = S.sending || {};
    if (hs.hosted === true) {
      var hEnd = QCMsg.hostedEnded && QCMsg.hostedEnded(hs), hTo = /^\d{4}-\d{2}-\d{2}$/.test(String(hs.hosted_until || '')) ? shortDate(hs.hosted_until) : '', hLeft = hTo ? QCStore.daysBetween(QCStore.today(), hs.hosted_until) : 99;
      if (hEnd) html += '<div class="card" id="hostedend"><p class="confirm"><b>The chasing is off.</b> Your sending ran to ' + esc(hTo) + '. Reminders already queued still go out; nothing new is scheduled. Turn it back on at <a href="' + esc(siteUrl('#price')) + '" target="_blank" rel="noopener">the website</a>, or run your own accounts from <a href="#/settings">Set-up</a>.</p></div>';
      else if (hs.hosted_past_due === true) html += '<div class="card" id="hostedend"><p class="confirm"><b>Your card was declined.</b> The chasing keeps going for a few days. Tap Manage in <a href="#/settings">Set-up</a> to fix the card.</p></div>';
      else if (hs.hosted_cancelled === true) html += '<div class="card" id="hostedend"><p class="hint"><b>Cancelled.</b> The chasing runs to ' + esc(hTo) + ' and stops after that. Change your mind in <a href="#/settings">Set-up</a>.</p></div>';
      else if (hLeft <= 3 && !hs.token) html += '<div class="card" id="hostedend"><p class="hint">Sending is set to run out on ' + esc(hTo) + '. <a href="#/settings">Set-up</a></p></div>';
    }
    var onPhone = /Android|iPhone|iPad/i.test(navigator.userAgent), standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (onPhone && !standalone && !window.__qcInstallPrompt) html += '<p class="hint">' + (/Android/i.test(navigator.userAgent) ? 'Chrome menu \u2192 Install app.' : 'Share \u2192 Add to Home Screen.') + '</p>';
    $app.innerHTML = html; wireBanner();
    var bg = document.getElementById('bookgo'); if (bg) bg.addEventListener('click', function () { bg.disabled = true; var jobs = bookJobs(); if (!(QCMsg.ready('sms') || QCMsg.ready('email'))) { bg.disabled = false; toast('Sending is not on. Turn it on in Set-up.'); return; } queueLoadedFollowUps(jobs).then(function (r) { S.ui.book_chase = 'started'; save(); toast(r.scheduled ? r.scheduled + ' reminder' + (r.scheduled > 1 ? 's' : '') + ' queued for ' + r.jobs + ' job' + (r.jobs > 1 ? 's' : '') + ' in your book. The first goes ' + whenText(r.first) + '.' : 'Nothing to queue: every job in the book already has its reminders, or has no mobile or email.'); viewHome(); }); });
    var bh = document.getElementById('bookhide'); if (bh) bh.addEventListener('click', function () { S.ui.book_chase = 'hidden'; save(); toast('Left as they are. Each job\'s Follow-ups tab can still schedule its own.'); viewHome(); });
    function renderList() {
      var box = document.getElementById('joblist'); if (!box) return; var q = homeQuery.trim().toLowerCase();
      var list = jobs.filter(function (j) { return homeFilter === 'all' || j.status === homeFilter; }).filter(function (j) { if (!q) return true; return [j.client.name, j.client.address, j.quote_no, j.summary, j.client.phone].some(function (v) { return String(v || '').toLowerCase().indexOf(q) >= 0; }); });
      box.innerHTML = list.length ? list.map(jobCard).join('') : '<div class="card empty">Nothing matches.</div>';
    }
    renderList();
    var qEl = document.getElementById('q'); if (qEl) qEl.addEventListener('input', function () { homeQuery = qEl.value; renderList(); });
    $app.querySelectorAll('[data-chip]').forEach(function (b) { b.addEventListener('click', function () { homeFilter = b.dataset.chip; $app.querySelectorAll('[data-chip]').forEach(function (x) { x.classList.toggle('on', x === b); }); renderList(); }); });
    document.getElementById('newjob').addEventListener('click', once(function () { var j = QCStore.newJob(); checkStore(); go('/job/' + j.id); }));
    document.getElementById('quick').addEventListener('click', once(function () { var j = QCStore.newJob(); var r = QCStore.newRoom('interior'); r.name = 'Room 1'; r.method = 'typed'; j.rooms.push(r); j.quick = true; save(); go('/job/' + j.id + '/room/' + r.id); }));
    var sg = document.getElementById('setupgo');
    if (sg) sg.addEventListener('click', function () {
      // land him on the sending section open, since that is the one thing this card is about
      try { var pref = JSON.parse(localStorage.getItem('qc-sections') || '{}'); pref['Automatic texting and emailing'] = true; localStorage.setItem('qc-sections', JSON.stringify(pref)); } catch (e) {}
    });
    var sh = document.getElementById('setuphide'); if (sh) sh.addEventListener('click', function () { S.ui.dismissed_setup_card = true; save(); viewHome(); });
    var ins = document.getElementById('install'); if (ins) ins.addEventListener('click', function () { var ev = window.__qcInstallPrompt; if (!ev) return; ins.disabled = true; ev.prompt(); (ev.userChoice || Promise.resolve({})).then(function (r) { if (r && r.outcome === 'accepted') { window.__qcInstallPrompt = null; toast('Installed'); route(); } else ins.disabled = false; }).catch(function () { ins.disabled = false; }); });
  }

  // ---------- Job
  // Money, deposit and invoice helpers (W3). Cents everywhere; the engine's depositCap wins when it exists.
  function r2(x) { return Math.round((parseFloat(x) || 0) * 100) / 100; }
  function amt(x) { var v = r2(x), a = Math.abs(v); return (v < 0 ? '-$' : '$') + a.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function amtS(x) { return Math.abs(r2(x) - Math.round(r2(x))) < 0.005 ? money(x) : amt(x); }
  var BIZ_RE = /\b(pty|ltd|strata|body corporate|corporation|council|real estate|realty|property|trust|inc)\b|&/i;
  function isBiz(job) { var c = job.client || {}; return !!((c.type && c.type !== 'homeowner') || BIZ_RE.test(c.name || '')); }
  function greetLine(job) { if (typeof greet === 'function') return greet(job); var c = job.client || {}; if (c.first_name && c.first_name.trim()) return 'Hi ' + c.first_name.trim() + ','; if (!c.name || BIZ_RE.test(c.name)) return 'Hello,'; return 'Hi ' + first(c.name) + ','; }
  function signLine() { if (typeof signoff === 'function') return signoff(S); var d = S.details, nm = String(d.owner_name || '').trim(); if (d.first_name_signoff !== false && nm) nm = nm.split(/\s+/)[0]; return (d.sign_off || 'Cheers') + (nm ? ', ' + nm : ''); }
  var STATES = ['SA', 'NSW', 'VIC', 'QLD', 'WA', 'TAS', 'NT', 'ACT'], THRESH = { NSW: 5000, SA: 12000, VIC: 10000, QLD: 3300, WA: 7500 };
  function stateOf() { return String(S.details.state || '').toUpperCase(); }
  function thresholdFor(st) { var t = (window.QCPdf && QCPdf.THRESHOLDS) || THRESH, v = t[st]; if (typeof v === 'number') return v; if (Array.isArray(v)) return +v[0] || 0; if (v && typeof v === 'object') return +(v.written || v.small || v.min) || 0; return 0; }
  // deposit cap for the state at this total: {pct, amount, reason} or null
  function depCapFor(total, st) {
    if (window.QCPricing && QCPricing.depositCap) { try { var c = QCPricing.depositCap(total, st); return c && (c.pct != null || c.amount != null) ? c : null; } catch (e) {} }
    total = r2(total);
    if (st === 'NSW') return { pct: 10, amount: r2(total * 0.1), reason: 'NSW cap 10%' };
    if (st === 'SA') return total > 20000 ? { pct: 5, amount: r2(total * 0.05), reason: 'SA cap 5% over $20,000' } : { pct: total > 0 ? Math.min(100, r2(100000 / total)) : 100, amount: 1000, reason: 'SA cap $1,000 up to $20,000' };
    if (st === 'VIC' || st === 'QLD') return total > 20000 ? { pct: 5, amount: r2(total * 0.05), reason: st + ' cap 5% over $20,000' } : { pct: 10, amount: r2(total * 0.1), reason: st + ' cap 10%' };
    if (st === 'WA') return total >= 7500 ? { pct: 6.5, amount: r2(total * 0.065), reason: 'WA cap 6.5% from $7,500' } : null;
    return null;
  }
  function defaultDepPct() { var v = S.details.deposit_pct; if ((v === '' || v == null) && S.rules) v = S.rules.deposit_pct; if (v === '' || v == null || isNaN(parseFloat(v))) return 10; return Math.min(100, Math.max(0, parseFloat(v))); }
  // A1: business clients (agent, strata, builder, commercial) take the business terms from Set-up unless the job says otherwise
  function bizTerms() { var r = S.rules || {}, p = parseFloat(r.business_deposit_pct), d = parseInt(r.business_days, 10); return { pct: isNaN(p) ? 0 : Math.min(100, Math.max(0, p)), days: isNaN(d) ? 30 : Math.max(0, d) }; }
  function depDefaultFor(job) { return isBizClient(job) ? bizTerms().pct : defaultDepPct(); }
  // a cap the engine reports as "no legal cap" (TAS, NT, ACT, small WA jobs) is not a cap: the typed % stands
  function realCap(cap) { if (!cap) return null; if (cap.pct >= 100 || /no (legal|statutory|specific) cap|conservative default|no state set/i.test(cap.reason || '')) return null; return cap; }
  var STATE_NAMES = { NSW: 'NSW', VIC: 'Victoria', QLD: 'Queensland', SA: 'South Australia', WA: 'WA', TAS: 'Tasmania', NT: 'the NT', ACT: 'the ACT' };
  var LICENSED = { NSW: 'contractor licence', VIC: 'building practitioner registration', QLD: 'QBCC licence', SA: 'building work contractor licence', WA: 'painter registration' }; // states that license painters; TAS, NT and ACT do not
  // WA registers painters by name; for any other trade there the field is just the licence
  function licenceWord(st) { return st === 'WA' && !paintsHere() ? 'licence' : LICENSED[st]; }
  function stateName(st) { return STATE_NAMES[st] || st || 'your state'; }
  // the legal deposit limit in plain words, for the job page and the quote page
  function capLimitPhrase(st, total) {
    if (st === 'NSW') return 'the legal limit in NSW';
    if (st === 'VIC' || st === 'QLD') return 'the legal limit in ' + stateName(st) + (total >= 20000 ? ' on jobs of $20,000 and over' : ' on jobs under $20,000');
    if (st === 'SA') return 'the legal limit in South Australia' + (total > 20000 ? ' on jobs over $20,000' : ' on jobs up to $20,000');
    if (st === 'WA') return 'the legal limit in WA on jobs of $7,500 and over';
    return 'the limit in ' + stateName(st);
  }
  function heldAt(p) { var pc = p.deposit_pct; return 'Held at ' + (Math.abs(pc - Math.round(pc)) < 0.05 ? Math.round(pc) + '% (' + amtS(p.deposit) + ')' : amtS(p.deposit) + ' (' + pc + '%)') + ', ' + capLimitPhrase(stateOf(), p.total) + '; you typed ' + p.deposit_asked + '%.'; }
  // effective deposit for a job at a total: {asked, pct, amount, capped, cap}
  function depositFor(job, total) {
    total = r2(total); var asked = job && job.deposit_pct != null && job.deposit_pct !== '' && !isNaN(parseFloat(job.deposit_pct)) ? Math.min(100, Math.max(0, parseFloat(job.deposit_pct))) : depDefaultFor(job);
    var out = { asked: asked, pct: asked, amount: r2(total * asked / 100), capped: false, cap: null }, ct = job && job.client ? job.client.type : '';
    if (ct === 'commercial' || ct === 'builder' || !(total > 0) || !buildingTrade()) return out;
    var cap = realCap(depCapFor(total, stateOf())); out.cap = cap; if (!cap) return out;
    var capAmt = cap.amount != null ? r2(cap.amount) : (cap.pct != null ? r2(total * cap.pct / 100) : null);
    if (capAmt != null && out.amount > capAmt + 0.004) { out.amount = capAmt; out.pct = r2(capAmt / total * 100); out.capped = true; }
    return out;
  }
  function balDaysFor(job) { if (job && job.balance_days != null && job.balance_days !== '' && !isNaN(parseInt(job.balance_days, 10))) return Math.max(0, parseInt(job.balance_days, 10)); if (job && isBizClient(job)) return bizTerms().days; var v = S.details.balance_days; if ((v === '' || v == null) && S.rules) v = S.rules.balance_days; v = parseInt(v, 10); return isNaN(v) ? 7 : Math.max(0, v); }
  // Accepted: the deposit invoice is written on the spot (unsent, numbered, due in the deposit days) so asking for the money is one tap, not a form
  function draftDepositInvoice(job) {
    var q = job.quote; if (!q || !(q.total > 0) || !Array.isArray(job.invoices)) return null;
    var det = S.details, gstOn = !!det.gst; if (gstOn && !det.abn) return null; if (liveInvoices(job).length) return null;
    var dep = depositFor(job, q.total); if (!(dep.pct > 0) || !(dep.amount > 0)) return null;
    var today = QCStore.today(), total = r2(dep.amount), subtotal = gstOn ? r2(total / 1.1) : total, gst = r2(total - subtotal);
    var inv = { kind: 'deposit', pct: dep.pct, lines: [{ desc: 'Deposit, ' + dep.pct + '% of quote ' + (q.number || job.quote_no) + ' (' + amt(q.total) + ')', amount: subtotal }], subtotal: subtotal, gst: gst, total: total, kind_line: 'Deposit to confirm your booking. Payable before we start.', var_ids: [], no: QCStore.nextInvoiceNo(), date: today, due: QCStore.addDays(today, depDueDays()), paid_date: '', payments: [], credit_notes: [], void: null, follow_ups: [], sent_date: '', sent_how: '', sent_confirmed: false, handed_at: '', drafted: 'accepted', client_snapshot: { name: job.client.name, address: job.client.address, email: job.client.email, phone: job.client.phone, abn: job.client.abn, bill_to: job.client.bill_to, type: job.client.type, accounts_email: job.client.accounts_email || '' } };
    job.invoices.push(inv); settle(job); save(); return inv;
  }
  function isDraft(i) { return !!(i && i.drafted && !i.void && !invOut(i) && !i.handed_at); }
  // a drafted deposit that was never sent goes when the painter issues a different invoice instead; its number is reused when it was the last one given out
  function dropDraft(job) { var d = (job.invoices || []).filter(isDraft)[0]; if (!d) return null; job.invoices.splice(job.invoices.indexOf(d), 1); var pre = String(S.details.invoice_prefix == null ? 'INV-' : S.details.invoice_prefix), num = d.no.indexOf(pre) === 0 ? parseInt(d.no.slice(pre.length), 10) : NaN; if (num && num === (parseInt(S.next_invoice, 10) || 2001) - 1) S.next_invoice = num; return d; }
  function draftedDeposit(job) { return (job.invoices || []).filter(function (i) { return i.kind === 'deposit' && i.drafted && !i.void && !i.sent_date && !i.emailed_date && i.sent_confirmed === false && !i.handed_at && !i.draft_dismissed && invPaid(i) <= 0; })[0] || null; }
  function depDueDays() { var v = parseInt(S.rules && S.rules.deposit_due_days, 10); return isNaN(v) ? 5 : Math.max(0, v); }
  // live pricing with optional extras kept out of the total and listed under options; deposit per job
  function priceLive(job) {
    var opt = (job.extras || []).filter(function (x) { return x.optional; }), p;
    p = opt.length ? QCPricing.priceJob(Object.assign({}, job, { extras: (job.extras || []).filter(function (x) { return !x.optional; }) }), S) : QCPricing.priceJob(job, S);
    p.options = opt.map(function (x) { var qty = n(x.qty, 1), ok = x.rate !== '' && x.rate != null && !isNaN(parseFloat(x.rate)), rate = ok ? n(x.rate) : 0; return { desc: x.desc || 'Option', qty: qty, unit: x.unit || 'each', rate: rate, amount: r2(qty * rate), confirm: !!x.confirm || !ok }; });
    var dep = depositFor(job, p.total); p.deposit = dep.amount; p.deposit_pct = dep.pct; p.deposit_capped = dep.capped; p.deposit_cap = dep.cap; p.deposit_asked = dep.asked;
    return p;
  }
  // A1: what stands between this job and a quote going out, in plain words. kind lets each screen pick what to show: abn, licence, contract, deposit, bank
  function warnList(job, priced) {
    var w = [], det = S.details, st = stateOf(), total = r2(priced.total), th = thresholdFor(st), lic = licenceWord(st);
    if (!det.abn) w.push({ kind: 'abn', text: 'Add your ABN. It goes on every ' + (det.gst ? 'tax invoice, and a business client can hold back 47% of a payment without it' : 'invoice') + '.' });
    if (th && total >= th) {
      if (lic && !det.licence) w.push({ kind: 'licence', text: 'Add your ' + lic + ' number in Set-up. In ' + st + ' it goes on quotes over ' + money(th) + '.' });
      w.push({ kind: 'contract', text: 'This job is over ' + money(th) + ', so in ' + st + ' you and the client should both sign the quote. It has a signature line on the last page: ask them to sign it and take a photo. That is the contract.' });
    }
    if (priced.deposit_capped && priced.deposit_cap) w.push({ kind: 'deposit', text: 'Deposit ' + heldAt(priced).charAt(0).toLowerCase() + heldAt(priced).slice(1) });
    if (!det.bsb || !det.account_number) w.push({ kind: 'bank', text: 'Add your bank details in Set-up so the invoice says where to pay. They are only ever printed on your own invoices.' });
    return w;
  }
  function jobWarnings(job, priced) { return warnList(job, priced).filter(function (x) { return x.kind !== 'bank'; }).map(function (x) { return x.text; }); } // the quote page names missing bank details next to its Send button
  function invPaid(inv) { if (!Array.isArray(inv.payments)) return inv.paid_date && !inv.void ? r2(inv.total) : 0; return r2(inv.payments.reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0)); } // no payments array = a record from before payments existed: paid_date alone says it was paid
  function invCredits(inv) { return r2((inv.credit_notes || []).reduce(function (s, c) { return s + (parseFloat(c.amount) || 0); }, 0)); }
  function invBal(inv) { return inv.void ? 0 : r2(inv.total - invCredits(inv) - invPaid(inv)); }
  function liveInvoices(job) { return (job.invoices || []).filter(function (i) { return !i.void; }); }
  function jobCredit(job) { return r2(liveInvoices(job).reduce(function (s, i) { var b = invBal(i); return s + (b < 0 ? -b : 0); }, 0)); }
  function jobOwing(job) { return r2(liveInvoices(job).reduce(function (s, i) { var b = invBal(i); return s + (b > 0 ? b : 0); }, 0)); }
  function kindLabel(i) { return i.kind === 'deposit' ? 'Deposit' : i.kind === 'progress' ? 'Part payment' + (i.pct ? ' ' + i.pct + '%' : '') : i.kind === 'variations' ? 'Variations' : 'Final'; }
  // paid_date follows the balance, job status follows the invoices
  // an invoice counts as "out" once it is confirmed sent, has a payment on it, or dates from before the Did-it-go step (no sent_confirmed field at all)
  function invOut(i) { return i.sent_confirmed !== false || !!i.sent_date || invPaid(i) > 0; }
  function settle(job) {
    liveInvoices(job).forEach(function (i) { var b = invBal(i); if (b <= 0.004 && (i.total > 0 || invPaid(i) > 0)) { if (!i.paid_date) { var last = (i.payments || []).slice().sort(function (a, c) { return a.date < c.date ? -1 : 1; }).pop(); i.paid_date = last ? last.date : QCStore.today(); } } else i.paid_date = ''; });
    // status follows the invoices that are actually out: accepted until one is confirmed sent or paid, invoiced while any is owing, paid when the final and everything out is settled
    if (job.status === 'accepted' || job.status === 'invoiced' || job.status === 'paid') { var out = liveInvoices(job).filter(invOut), done = out.length && out.every(function (i) { return invBal(i) <= 0.004; }) && out.some(function (i) { return i.kind === 'final' || i.kind === 'full'; }); job.status = done ? 'paid' : (out.length ? 'invoiced' : 'accepted'); }
  }
  function cancelAllReminders(job) { if (typeof cancelJobFollowUps === 'function') return cancelJobFollowUps(job); return cancelQuoteFollowUps(job).then(function () { return Promise.all((job.invoices || []).map(function (i) { return cancelInvoiceFollowUps(i); })); }); }
  // A1: the client's name the way you would say it: first name, else the first word, else the whole business name
  function whoName(job) { var c = (job && job.client) || {}; var fn = String(c.first_name || '').trim(); if (fn) return fn.split(/\s+/)[0]; var nm = String(c.name || '').trim(); if (!nm) return 'the client'; return looksBusiness(nm) ? nm : nm.split(/\s+/)[0]; }
  function sentBy(how) { return how === 'text' ? ' by text' : how === 'email' ? ' by email' : ''; }
  // One card at the top of a job that says where it is up to and links to the next thing, so nobody hunts through screens
  function whereItsAt(job) {
    var t = QCStore.today(), q = job.quote, lines = [], btns = [], st = job.status, who = esc(whoName(job));
    if (!q || st === 'draft' || st === 'enquiry') return '';
    var live = liveInvoices(job), owing = live.filter(function (i) { return invBal(i) > 0.004; }), paid = live.filter(function (i) { return i.paid_date; }), credit = jobCredit(job), quoteH = '#/job/' + job.id + '/quote', invH = '#/job/' + job.id + '/invoice';
    var acc = job.acceptance && job.acceptance.how ? ' Accepted by ' + esc(job.acceptance.how) + (job.acceptance.date ? ' ' + QCPdf.fmtDate(job.acceptance.date) : '') + '.' : '';
    if (st === 'quoted') {
      if (job.sent_date) { var d = QCStore.daysBetween(job.sent_date, t); lines.push('Quoted ' + money(q.total) + (q.version > 1 ? ', revision ' + q.version : '') + '. Sent to ' + who + sentBy(job.sent_how) + ', ' + shortDate(job.sent_date) + (d > 0 ? ' (' + d + ' day' + (d === 1 ? '' : 's') + ' ago)' : '') + '.'); btns.push([quoteH, 'Open the quote', 'tape'], ['#/chase', 'Follow up', '']); }
      else { lines.push('Quote ' + money(q.total) + ' is ready. Not sent yet.'); btns.push([quoteH, 'Send to ' + who, 'tape']); }
    }
    if (st === 'declined') { lines.push('Quote declined. Reopen it from the quote page if they come back.'); btns.push([quoteH, 'Open the quote', '']); }
    var dd0 = st === 'accepted' ? draftedDeposit(job) : null; if (dd0) lines.push('Deposit invoice ' + esc(dd0.no) + ' (' + amtS(dd0.total) + ') written, not sent.');
    if (st === 'accepted') { lines.push('Accepted at ' + money(q.total) + '.' + acc + (job.booking ? ' Booked ' + niceDay(job.booking.start) + (job.booking.days > 1 ? ' for ' + job.booking.days + ' days' : '') + '.' : ' Not booked yet.')); btns.push([invH, 'Invoice', 'tape'], [quoteH, job.booking ? 'Open the quote' : 'Book', '']); }
    if (st === 'invoiced') { owing.forEach(function (i) { var od = QCStore.daysBetween(i.due, t), b = invBal(i); lines.push(esc(i.no) + ' ' + amtS(b) + (b < i.total - 0.004 ? ' left of ' + amtS(i.total) : '') + (od > 0 ? ', ' + od + ' day' + (od === 1 ? '' : 's') + ' overdue' : ', due ' + QCPdf.fmtDate(i.due)) + '.'); }); if (paid.length) lines.push(paid.map(function (i) { return esc(i.no) + ' paid'; }).join(', ') + '.'); btns.push([invH, 'Invoices', 'tape'], ['#/chase', 'Follow up', '']); }
    if (st === 'paid') { lines.push('Paid in full' + (paid.length ? ', last payment ' + QCPdf.fmtDate(paid[paid.length - 1].paid_date) : '') + '.'); btns.push([invH, 'Invoices', ''], [quoteH, 'Open the quote', '']); }
    if (st === 'cancelled') { lines.push('Job cancelled' + (job.cancelled_date ? ' ' + QCPdf.fmtDate(job.cancelled_date) : '') + '.' + (owing.length ? ' ' + owing.length + ' invoice' + (owing.length > 1 ? 's' : '') + ' still open.' : '')); if (live.length) btns.push([invH, 'Invoices', '']); btns.push([quoteH, 'Open the quote', '']); }
    var depPaid = live.some(function (i) { return i.kind === 'deposit' && i.paid_date; });
    if (depPaid && !job.booking && (st === 'accepted' || st === 'invoiced')) { lines.push('Deposit paid, not booked yet.'); btns.unshift([quoteH, 'Book', 'tape']); }
    if (credit > 0) lines.push('Credit ' + amt(credit) + ' on account. Refund it or take it off the next invoice.');
    if (job.hold && job.hold.on) lines.push('Reminders on hold' + (job.hold.note ? ': ' + esc(job.hold.note) : '') + '.');
    if (!lines.length) return '';
    var locked = st === 'accepted' || st === 'invoiced' || st === 'paid';
    return '<div class="card"><p>' + lines.join(' ') + '</p><div class="row">' + btns.map(function (b) { return '<a class="btn sm ' + b[2] + '" href="' + b[0] + '">' + b[1] + '</a>'; }).join('') + '</div>' + (st === 'quoted' && job.sent_date ? '<p class="hint">' + who + ' has the sent quote until you send again.</p>' : locked ? '<p class="hint">Locked. Revise quote reopens it.</p>' : '') + '</div>';
  }
  var SURFACES = ['Walls', 'Ceiling', 'Trim', 'Doors', 'Feature wall', 'Exterior walls', 'Eaves and fascia', 'Gutters', 'Deck', 'Fence', 'Other'], SHEENS = ['Low sheen', 'Matt', 'Flat', 'Satin', 'Semi-gloss', 'Gloss'], HOWS = ['text', 'email', 'phone', 'in person', 'signed'];
  var TYPE_WORD = { agent: 'Agency', strata: 'Strata', builder: 'Builder', commercial: 'Commercial' };
  // A1: C decides when sending is truly automatic (window.__qcApp.autoSendReady); until then reminders are things you tap
  function messagesLeft() { var b = QCMsg.balance(); return b.left; }
  function balanceLine() {
    var b = QCMsg.balance(); if (b.left == null) return '';
    var plan = b.plan === 'paid' ? 'this month' : 'to start';
    if (b.left <= 0) return 'No messages left' + (b.plan === 'paid' ? ' this month' : '') + '. The app still writes every message; you send it.';
    return b.left + ' of ' + (b.included == null ? b.left : b.included) + ' messages left ' + plan + '.';
  }
  function topUpLink() { return siteUrl('#price'); }
  function autoReady() { var a = window.__qcApp; if (a && typeof a.autoSendReady === 'function') { try { return !!a.autoSendReady(); } catch (e) {} } return !!(S.sending && S.sending.server && (QCMsg.ready('sms') || QCMsg.ready('email'))); }
  function fuLabel() { var a = window.__qcApp; if (a && typeof a.followUpLabel === 'function') { try { return String(a.followUpLabel()); } catch (e) {} } return autoReady() ? 'Automatic follow-ups' : 'Remind me to follow up'; }
  function fuHint() { return autoReady() ? 'Sent on the day. Hold reminders stops them.' : 'Written on the day. You tap Send.'; }
  function viewJob(job) {
    var priced = priceLive(job), biz = isBizClient(job), after = ['accepted', 'invoiced', 'paid', 'cancelled'].indexOf(job.status) >= 0, det = S.details;
    var html = '<a class="hint" href="#/">&larr; Jobs</a><div class="row between"><h1>' + esc(job.quote_no) + '</h1>' + statusPill(job) + '</div>';
    html += whereItsAt(job);
    if (job.ballpark) html += '<p class="hint">Phone ballpark was ' + money(job.ballpark.low) + ' to ' + money(job.ballpark.high) + (job.visit ? '. Visit ' + QCPdf.fmtDate(job.visit.date) + ' ' + QCSched.nice(job.visit.start_min) : '') + '. <a href="#/enquiry/' + job.id + '">Enquiry details</a></p>';
    // one calm box: what to sort out before the quote goes, with the ABN box right here. The deposit line sits by the deposit field instead.
    var warn = warnList(job, priced).filter(function (x) { return x.kind !== 'deposit'; });
    if (warn.length && priced.lines.length) html += '<div class="card" id="beforebox"><h3>Before this goes out</h3><ul class="hint" style="margin:0;padding-left:1.2em">' + warn.map(function (x) { return '<li>' + esc(x.text) + '</li>'; }).join('') + '</ul>' + (!det.abn ? '<label class="f">Your ABN<span>11 digits; saved to Set-up</span><input type="text" id="abninline" inputmode="numeric" placeholder="12 345 678 901" autocomplete="off"></label>' : '') + (warn.some(function (x) { return x.kind !== 'abn' && x.kind !== 'contract'; }) ? '<div class="row"><a class="btn ghost sm" href="#/settings">Open Set-up</a></div>' : '') + '</div>';
    var effPct = job.deposit_pct != null ? job.deposit_pct : depDefaultFor(job), effDays = balDaysFor(job), fromSetup = job.deposit_pct == null && job.balance_days == null;
    var typeLine = biz ? (TYPE_WORD[job.client.type] || 'Business') + ' terms: ' + (effPct > 0 ? effPct + '% deposit' : 'no deposit') + ', payment in ' + effDays + ' days.' + (fromSetup ? ' From Set-up; change them under Deposit and terms if this job is different.' : ' Set on this job.') : '';
    html += '<div class="card"><h2>Client</h2><div class="g2"><label class="f">Client type<select data-bind="client.type" id="ctype"><option value="homeowner">Homeowner</option><option value="agent">Agent</option><option value="strata">Strata</option><option value="builder">Builder</option><option value="commercial">Commercial</option></select></label><label class="f">Name<span>person or business</span><input type="text" data-bind="client.name" autocomplete="off"></label><label class="f">Contact first name<span>for texts</span><input type="text" data-bind="client.first_name" autocomplete="off"></label><label class="f">Mobile<input type="tel" data-bind="client.phone"></label></div>' + (typeLine ? '<p class="hint" id="ctypeline">' + esc(typeLine) + '</p>' : '') +
      '<label class="f">Email<input type="email" data-bind="client.email"></label><div id="bizf" class="g2" ' + (biz ? '' : 'hidden') + '><label class="f">Accounts email<span>if not the contact</span><input type="email" data-bind="client.accounts_email"></label><label class="f">Client ABN<span>only if they ask</span><input type="text" data-bind="client.abn" inputmode="numeric"></label></div>' +
      '<label class="f">Bill to<span>optional, if different from the site</span><input type="text" data-bind="client.bill_to" placeholder="Agency or owner name and address"></label>' +
      '<label class="f"><span id="addrlab" style="color:inherit;font-size:inherit;font-weight:600">' + (job.client.bill_to ? 'Site address' : 'Job address') + '</span><span>include postcode</span><input type="text" data-bind="client.address" data-refresh="1"></label>' +
      '<label class="f">Description<span>the client sees this</span><input type="text" data-bind="summary" placeholder="Repaint lounge and hall"></label><label class="f">Notes for the client<textarea data-bind="notes_client" rows="2" placeholder="Colours, access, parking, furniture"></textarea></label></div>';
    html += siteCard(job);
    html += '<div class="card"><div class="row between"><h2>Rooms and outside areas</h2><div class="row"><button class="btn sm" data-add="interior">+ Room</button><button class="btn ghost sm" data-add="exterior">+ Exterior</button></div></div>';
    if (!job.rooms.length) html += '<p class="muted">Add a room, or tap + Exterior for outside work.</p>';
    html += job.rooms.map(function (r) {
      var q = QCPricing.roomQuantities(r, S.rules), walls = q.lines.filter(function (l) { return l.key === 'p_walls'; })[0], ext = r.type === 'exterior', measured = q.source === 'measured';
      var sized = !!((r.L && r.W) || r.perimeter_m), how = ext ? (q.lines.length ? 'outside work' : 'nothing typed yet') : measured ? (r.walls.length + ' wall' + (r.walls.length === 1 ? '' : 's') + ' measured from photos') : (r.L && r.W ? r.L + ' × ' + r.W + ' m' : (r.perimeter_m ? r.perimeter_m + ' m around' : 'no sizes yet'));
      if (!measured && (sized || (ext && q.lines.length))) how += r.measured_by === 'client' ? ', sizes from the client' : ', your tape';
      var pill = ext ? '' : '<span class="pill ' + (measured ? 'ok' : '') + '">' + (measured ? 'measured' : 'typed sizes') + '</span>';
      return '<a class="job" href="#/job/' + job.id + '/room/' + r.id + '"><div><b>' + esc(r.name || (ext ? 'Exterior' : 'Room')) + '</b><span class="sub">' + esc(how) + (walls ? ' · ' + walls.qty + ' m² of wall' : '') + (r.price_override != null ? ' · your price ' + money(r.price_override) : '') + '</span></div><div>' + pill + '</div></a>';
    }).join('') + '</div>';
    html += (typeof photosCard === 'function' ? photosCard(job, '') : '');
    html += '<div class="card"><div class="row between"><h2>Extras</h2><button class="btn ghost sm" id="addextra">+ Line</button></div><p class="hint">Not in a room.</p><div id="extras"></div>' +
      '<div class="g2"><label class="f">Travel<span id="travelnote">' + esc(priced.travel && priced.travel.note ? priced.travel.note : 'Put the postcode in the job address and travel works itself out from ' + (S.details.postcode || 'your postcode') + '.') + '</span><input type="number" data-bind="travel_km" data-refresh="1" min="0" placeholder="km one way" aria-label="Travel km one way, optional"></label><label class="f">Premium paint<span>adds ' + esc(S.rules.premium_paint_pct) + '%</span><select data-bind="premium_paint" data-refresh="1"><option value="">No</option><option value="1">Yes</option></select></label></div></div>';
    var dp = depDefaultFor(job), bd = balDaysFor(Object.assign({}, job, { balance_days: null }));
    html += '<div class="card"><h2>Deposit and terms</h2><div class="g3"><label class="f">Deposit %<span>blank = ' + dp + '%' + (biz ? ', business terms' : '') + '</span><input type="number" data-bind="deposit_pct" data-refresh="1" min="0" max="100" step="0.5" placeholder="' + dp + '"></label><label class="f">Payment days<span>blank = ' + bd + (biz ? ', business terms' : '') + '</span><input type="number" data-bind="balance_days" data-refresh="1" min="0" placeholder="' + bd + '"></label><label class="f">Deposit<span id="depinfo">' + esc(depInfo(priced, job)) + '</span></label></div>' +
      '<div class="row"><label class="btn ghost sm"><input type="checkbox" data-bind="auto_follow_ups"> ' + esc(fuLabel()) + '</label><label class="btn ghost sm"><input type="checkbox" data-bind="client_paint" data-refresh="1"> Client supplies paint</label><label class="btn ghost sm"><input type="checkbox" data-bind="hold.on" id="holdon"> Hold reminders</label></div><p class="hint">' + esc(fuHint()) + '</p>' +
      '<div id="holdbox" ' + (job.hold && job.hold.on ? '' : 'hidden') + '><label class="f">Why on hold<span>nothing goes out while this is on</span><input type="text" data-bind="hold.note" placeholder="Dispute, in hospital, waiting on the insurer"></label></div></div>';
    html += '<div class="card"><div class="row between"><h2>Colours</h2><button class="btn ghost sm" id="addcol">+ Colour</button></div><div id="cols"></div></div>';
    if (after) html += '<div class="card"><div class="row between"><h2>Variations</h2>' + (job.status !== 'cancelled' ? '<button class="btn ghost sm" id="addvar">+ Variation</button>' : '') + '</div><p class="hint">Goes on the final invoice, numbered.</p><div id="varlist"></div></div>';
    html += '<div class="card"><div class="row between"><div><span class="hint">Running total' + (S.details.gst ? ' inc GST' : '') + '</span><h2 id="runtotal">' + money(priced.total) + '</h2></div><a class="btn tape" href="#/job/' + job.id + '/quote">' + (job.quote ? 'Open the quote' : 'Build the quote') + '</a></div>' + (priced.confirm.length ? '<p class="confirm">' + priced.confirm.length + ' line' + (priced.confirm.length > 1 ? 's' : '') + ' to confirm</p>' : '') + (priced.options.length ? '<p class="hint">' + priced.options.length + ' option' + (priced.options.length > 1 ? 's' : '') + ' priced outside the total.</p>' : '') + '<div class="row"><button class="btn ghost sm" id="showcost">Show my costs</button></div><p class="hint" id="costline" hidden>' + costLine(priced) + '</p></div>';
    if (job.booking) html += '<div class="card"><div class="row between"><div><b>Booked</b><span class="hint"> ' + niceDay(job.booking.start) + ' to ' + niceDay(job.booking.end_inclusive || job.booking.start) + '</span></div><button class="btn ghost sm" id="rebook">Change</button></div></div>';
    html += '<div class="row between"><label class="f" style="flex:1">Private notes<textarea data-bind="notes" rows="2"></textarea></label></div><div class="row">' + (job.status === 'draft' || job.status === 'enquiry' ? '<button class="btn danger sm" id="deljob">Delete job</button>' : job.status === 'cancelled' ? '<button class="btn ghost sm" id="reopenjob">Reopen job</button>' : '<button class="btn danger sm" id="canceljob">Cancel job</button><span class="hint">Keeps the paperwork, stops the reminders.</span>') + '<button class="btn ghost sm" id="dupjob">Duplicate job</button></div>';
    $app.innerHTML = html;
    // premium_paint select binding stores '1' or '' strings; normalise
    bindAll($app, job);
    wireAddress($app.querySelector('[data-bind="client.address"]'), function (pl) { siteFromPlace(job, pl); save(); viewJob(job); }); wireSite($app, job, function () { viewJob(job); });
    if (typeof wirePhotos === 'function') wirePhotos($app, job, '', function () { viewJob(job); });
    var dup = document.getElementById('dupjob'); if (dup) dup.addEventListener('click', function () { if (typeof duplicateJob === 'function') duplicateJob(job); });
    var abn = document.getElementById('abninline'); if (abn) { abn.addEventListener('input', function () { S.details.abn = abn.value.trim(); save(); }); abn.addEventListener('change', function () { if (S.details.abn) { toast('ABN saved to Set-up'); viewJob(job); } }); }
    var cn = $app.querySelector('[data-bind="client.name"]'); if (cn) cn.addEventListener('change', function () { var want = cn.value.trim().toLowerCase(); if (!want) return; var hit = null; S.jobs.forEach(function (o) { if (hit || o === job || o.id === job.id || !o.client) return; if (String(o.client.name || '').trim().toLowerCase() === want) hit = o.client; }); if (!hit) return; var filled = 0; ['phone', 'email', 'address', 'first_name', 'type', 'abn', 'bill_to', 'accounts_email'].forEach(function (k) { if (!job.client[k] && hit[k]) { job.client[k] = hit[k]; filled++; } }); if (!filled) return; save(); viewJob(job); toast('Client details filled in from the last job'); });
    var sel = $app.querySelector('[data-bind="premium_paint"]'); sel.value = job.premium_paint ? '1' : ''; sel.addEventListener('change', function () { job.premium_paint = sel.value === '1'; save(); refreshPreview(); });
    refreshPreview = function () { var p = priceLive(job); document.getElementById('runtotal').textContent = money(p.total); var tn = document.getElementById('travelnote'); if (tn) tn.textContent = p.travel && p.travel.note ? p.travel.note : 'Put the postcode in the job address and travel works itself out.'; var cl = document.getElementById('costline'); if (cl) cl.innerHTML = costLine(p); var di = document.getElementById('depinfo'); if (di) di.textContent = depInfo(p, job); };
    document.getElementById('ctype').addEventListener('change', function () { viewJob(job); }); // the terms sentence, the accounts fields and the deposit default all follow the type
    $app.querySelector('[data-bind="client.bill_to"]').addEventListener('input', function () { document.getElementById('addrlab').textContent = job.client.bill_to ? 'Site address' : 'Job address'; });
    document.getElementById('holdon').addEventListener('change', function () { document.getElementById('holdbox').hidden = !job.hold.on; if (job.hold.on) cancelAllReminders(job).then(function () { toast('Reminders on hold'); }); else toast('Reminders back on'); });
    document.getElementById('showcost').addEventListener('click', function () { var cl = document.getElementById('costline'); cl.hidden = !cl.hidden; this.textContent = cl.hidden ? 'Show my costs' : 'Hide my costs'; });
    var rb = document.getElementById('rebook'); if (rb) rb.addEventListener('click', function () { bookEdit = job.id; go('/job/' + job.id + '/quote'); }); // the old booking stays until new dates are saved
    $app.querySelectorAll('[data-add]').forEach(function (b) { b.addEventListener('click', once(function () { var r = QCStore.newRoom(b.dataset.add); job.rooms.push(r); save(); go('/job/' + job.id + '/room/' + r.id); })); });
    function renderExtras() {
      var box = document.getElementById('extras'); box.innerHTML = job.extras.map(function (x, i) {
        return '<div class="row" data-x="' + i + '" style="border-top:1px solid var(--line);padding-top:8px"><input type="text" placeholder="Description" aria-label="Extra description" data-xk="desc" style="flex:2 1 12em" value="' + esc(x.desc) + '"><input type="number" placeholder="Qty" aria-label="Quantity" data-xk="qty" style="flex:1 1 4em" value="' + esc(x.qty) + '"><input type="text" placeholder="unit" aria-label="Unit" data-xk="unit" style="flex:1 1 4em" value="' + esc(x.unit) + '"><input type="number" step="0.01" placeholder="Rate $" aria-label="Rate" data-xk="rate" style="flex:1 1 5em" value="' + esc(x.rate) + '"><label class="hint"><input type="checkbox" data-xk="confirm" ' + (x.confirm ? 'checked' : '') + '> confirm</label><label class="hint"><input type="checkbox" data-xk="optional" ' + (x.optional ? 'checked' : '') + '> optional</label><button class="btn ghost sm" data-xdel="' + i + '">remove</button></div>';
      }).join('');
      box.querySelectorAll('[data-x]').forEach(function (row) { var i = +row.dataset.x; row.querySelectorAll('[data-xk]').forEach(function (el) { el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () { job.extras[i][el.dataset.xk] = el.type === 'checkbox' ? el.checked : el.value; save(); refreshPreview(); }); }); });
      box.querySelectorAll('[data-xdel]').forEach(function (b) { b.addEventListener('click', function () { job.extras.splice(+b.dataset.xdel, 1); save(); renderExtras(); refreshPreview(); }); });
    }
    renderExtras();
    document.getElementById('addextra').addEventListener('click', function () { job.extras.push({ desc: '', qty: 1, unit: 'each', rate: '', confirm: false, optional: false }); save(); renderExtras(); });
    function renderCols() {
      var box = document.getElementById('cols'), names = job.rooms.map(function (r) { return r.name; }).filter(Boolean);
      box.innerHTML = (job.colours.length ? '<datalist id="roomnames">' + names.map(function (nm) { return '<option value="' + esc(nm) + '">'; }).join('') + '</datalist>' : '') + job.colours.map(function (c, i) {
        return '<div class="row" data-c="' + i + '" style="border-top:1px solid var(--line);padding-top:8px"><input type="text" list="roomnames" placeholder="Room" aria-label="Room" data-ck="room" style="flex:1 1 6em" value="' + esc(c.room) + '"><select aria-label="Surface" data-ck="surface" style="flex:1 1 7em">' + SURFACES.map(function (s) { return '<option' + (c.surface === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select><input type="text" placeholder="Product" aria-label="Product" data-ck="product" style="flex:1 1 7em" value="' + esc(c.product) + '"><input type="text" placeholder="Colour" aria-label="Colour" data-ck="colour" style="flex:1 1 7em" value="' + esc(c.colour) + '"><select aria-label="Sheen" data-ck="sheen" style="flex:1 1 6em">' + SHEENS.map(function (s) { return '<option' + (c.sheen === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select><button class="btn ghost sm" data-cdel="' + i + '">remove</button></div>';
      }).join('');
      box.querySelectorAll('[data-c]').forEach(function (row) { var i = +row.dataset.c; row.querySelectorAll('[data-ck]').forEach(function (el) { el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () { job.colours[i][el.dataset.ck] = el.value; save(); }); }); });
      box.querySelectorAll('[data-cdel]').forEach(function (b) { b.addEventListener('click', function () { job.colours.splice(+b.dataset.cdel, 1); save(); renderCols(); }); });
    }
    renderCols();
    document.getElementById('addcol').addEventListener('click', function () { var last = job.colours[job.colours.length - 1]; job.colours.push({ room: last ? last.room : (job.rooms[0] ? job.rooms[0].name : ''), surface: 'Walls', product: '', colour: '', sheen: 'Low sheen' }); save(); renderCols(); });
    if (after) {
      var renderVars = function () {
        var box = document.getElementById('varlist'), today = QCStore.today();
        box.innerHTML = job.variations.length ? job.variations.map(function (v, i) {
          var pill = v.status === 'agreed' ? '<span class="pill ok">agreed' + (v.agreed_date ? ' ' + QCPdf.fmtDate(v.agreed_date) : '') + '</span>' : v.status === 'declined' ? '<span class="pill bad">declined</span>' : '<span class="pill warn">proposed</span>';
          return '<div data-v="' + i + '" style="border-top:1px solid var(--line);padding-top:8px;display:grid;gap:8px"><div class="row between"><b>Variation ' + v.n + '</b>' + pill + '</div><label class="f">What<input type="text" data-vk="desc" value="' + esc(v.desc) + '" placeholder="Extra coat, feature wall" ' + (v.invoiced ? 'disabled' : '') + '></label><div class="g3"><label class="f">Amount ex GST<input type="number" step="0.01" min="0" data-vk="amount" value="' + esc(v.amount) + '" ' + (v.invoiced ? 'disabled' : '') + '></label><label class="f">How agreed<select data-vk="how_agreed"><option value="">not yet</option>' + HOWS.map(function (h) { return '<option value="' + h + '"' + (v.how_agreed === h ? ' selected' : '') + '>' + h + '</option>'; }).join('') + '</select></label><label class="f">Date<input type="date" data-vk="date" value="' + esc(v.date) + '"></label></div>' +
            '<div class="row"><button class="btn ghost sm" data-vsend="' + i + '">Send variation</button>' + (v.status === 'proposed' ? '<button class="btn sm" data-vagree="' + i + '">Mark agreed</button><button class="btn ghost sm" data-vdecl="' + i + '">Declined</button>' : (!v.invoiced ? '<button class="btn ghost sm" data-vundo="' + i + '">Back to proposed</button>' : '')) + (v.invoiced ? '<span class="hint">On ' + esc(v.invoice_no || 'the invoice') + '</span>' : '<button class="btn ghost sm" data-vdel="' + i + '">remove</button>') + '</div></div>';
        }).join('') : '<p class="muted">None yet.</p>';
        box.querySelectorAll('[data-v]').forEach(function (row) { var i = +row.dataset.v; row.querySelectorAll('[data-vk]').forEach(function (el) { el.addEventListener(el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input', function () { var k = el.dataset.vk; job.variations[i][k] = k === 'amount' ? (el.value === '' ? 0 : r2(el.value)) : el.value; save(); }); }); });
        box.querySelectorAll('[data-vagree]').forEach(function (b) { b.addEventListener('click', function () { var v = job.variations[+b.dataset.vagree]; if (!v.desc) { toast('Say what the variation is first'); return; } v.status = 'agreed'; v.agreed_date = v.date || today; if (!v.how_agreed) v.how_agreed = 'text'; save(); renderVars(); toast('Variation ' + v.n + ' agreed'); }); });
        box.querySelectorAll('[data-vdecl]').forEach(function (b) { b.addEventListener('click', function () { job.variations[+b.dataset.vdecl].status = 'declined'; save(); renderVars(); }); });
        box.querySelectorAll('[data-vundo]').forEach(function (b) { b.addEventListener('click', function () { var v = job.variations[+b.dataset.vundo]; v.status = 'proposed'; v.agreed_date = ''; save(); renderVars(); }); });
        box.querySelectorAll('[data-vdel]').forEach(function (b) { b.addEventListener('click', function () { if (!confirm('Remove this variation?')) return; job.variations.splice(+b.dataset.vdel, 1); job.variations.forEach(function (v, k) { if (!v.invoiced) v.n = k + 1; }); save(); renderVars(); }); });
        box.querySelectorAll('[data-vsend]').forEach(function (b) { b.addEventListener('click', function () { var v = job.variations[+b.dataset.vsend]; if (!v.desc || !(v.amount > 0)) { toast('Add a description and amount first'); return; } sendVariation(job, v); }); });
      };
      renderVars();
      var av = document.getElementById('addvar'); if (av) av.addEventListener('click', function () { job.variations.push({ id: QCStore.uid(), n: job.variations.length + 1, date: QCStore.today(), desc: '', amount: 0, how_agreed: '', agreed_date: '', status: 'proposed', invoiced: false }); save(); renderVars(); });
    }
    var dj = document.getElementById('deljob'); if (dj) dj.addEventListener('click', function () { if (!confirm('Delete this job and everything in it?')) return; if (typeof deleteJob === 'function') { deleteJob(job); return; } QCStore.deleteJob(job.id); checkStore(); go('/'); });
    var cj = document.getElementById('canceljob'); if (cj) cj.addEventListener('click', function () { if (!confirm('Cancel this job? The quote and invoices stay, reminders stop.')) return; job.prev_status = job.status; job.status = 'cancelled'; job.cancelled_date = QCStore.today(); save(); cancelAllReminders(job).then(function () { toast('Job cancelled'); viewJob(job); }); });
    var rj = document.getElementById('reopenjob'); if (rj) rj.addEventListener('click', function () { job.status = job.prev_status && job.prev_status !== 'cancelled' ? job.prev_status : (job.quote ? 'quoted' : 'draft'); job.cancelled_date = ''; settle(job); save(); toast('Job reopened'); viewJob(job); });
  }
  // A1: the deposit in one line. Honours the typed % where the state has no legal limit; otherwise says what it is held at and why.
  function depInfo(p, job) { if (!(p.total > 0)) return ''; if (p.deposit_capped && p.deposit_cap) return heldAt(p); if (!(p.deposit > 0)) return 'None' + (job && isBizClient(job) && job.deposit_pct == null ? ' (business terms)' : ''); return amtS(p.deposit) + ' (' + p.deposit_pct + '%)' + (job && isBizClient(job) && job.deposit_pct == null ? ', business terms' : ''); }
  function variationText(job, v) { var gst = S.details.gst ? r2(v.amount * 0.1) : 0; return 'Variation ' + v.n + ' to quote ' + ((job.quote && job.quote.number) || job.quote_no) + ' for ' + (job.client.name || '') + '\n' + v.desc + '\n' + amt(v.amount) + ' ex GST' + (gst ? ', ' + amt(r2(v.amount + gst)) + ' inc GST' : '') + '.\nReply "agreed" and it goes on the final invoice as Variation ' + v.n + '.\n' + signLine(); }
  // A2: variations go out through handOff like every other document: look first, hand to the phone, then "Did it go?". sent_date only on Yes.
  function sendVariation(job, v) {
    var who = dispName(job), done = function (r) { if (r && r.sent) { v.sent_date = QCStore.today(); v.sent_how = r.how; save(); logSend(job, 'variation-' + v.n, r.how, 'Variation ' + v.n + ' sent to ' + (job.client.name || 'the client')); } if (typeof refreshPreview === 'function') refreshPreview(); };
    if (window.QCPdf && QCPdf.variationPDF) { try { var d = QCPdf.variationPDF(job, v, S); handOff({ kind: 'variation', doc: d, title: 'Variation ' + v.n, filename: 'Variation ' + v.n + ' ' + job.quote_no + '.pdf', whoName: who, whoPhone: job.client.phone, whoEmail: job.client.email, job: job, ref: 'variation-' + v.n, onResult: done }); return; } catch (e) { toast('Could not make the variation: ' + e.message); return; } }
    handOff({ kind: 'variation', text: variationText(job, v), whoName: who, whoPhone: job.client.phone, whoEmail: job.client.email, job: job, ref: 'variation-' + v.n, onResult: done });
  }
  // ---------- Room
  var presetPending = null;
  // after a typical-room chip: what it filled in, as a line to keep or clear (a toast vanishes before it is read). Fills #presetline under the chips, making it when the markup has none.
  function presetLine(job, rid, room, rerender) { var chips = document.getElementById('presets'); if (!chips) return; var el = document.getElementById('presetline'); if (!el) { el = document.createElement('p'); el.id = 'presetline'; el.className = 'hint'; chips.parentNode.insertBefore(el, chips.nextSibling); } if (!presetPending || presetPending.rid !== rid) { el.textContent = ''; el.hidden = true; return; }
    var items = [], cnt = function (v, one, many) { v = n(v); if (v) items.push(v + ' ' + (v > 1 ? many : one)); }; if (n(room.L) && n(room.W)) items.push(n(room.L) + ' × ' + n(room.W) + ' m'); cnt(room.doors, 'door', 'doors'); cnt(room.doors_one_side, 'one-side door', 'one-side doors'); cnt(room.windows, 'window', 'windows'); cnt(room.wardrobe_pairs, 'wardrobe pair', 'wardrobe pairs'); if (room.surfaces && room.surfaces.skirting) items.push('skirting');
    el.hidden = false; el.className = 'hint presetline'; el.innerHTML = '<span><b>Filled in:</b> ' + esc(items.join(', ')) + '.</span> <button type="button" class="btn ghost sm" id="presetkeep">Keep</button><button type="button" class="btn ghost sm" id="presetclear">Clear</button><span class="hint">Clear takes off doors, windows, skirting.</span>';
    document.getElementById('presetkeep').addEventListener('click', function () { presetPending = null; el.hidden = true; });
    document.getElementById('presetclear').addEventListener('click', function () { room.doors = 0; room.windows = 0; room.doors_one_side = 0; room.wardrobe_pairs = 0; if (room.surfaces) room.surfaces.skirting = false; presetPending = null; save(); rerender(); }); }
  // A1: units the way a painter says them on screen
  function unitWord(u) { return u === 'lm' ? 'm' : (u || ''); }
  // one room's priced lines from the engine, so the room screen agrees with the quote (storey loading, scaffold at the typed price, premium paint, client paint)
  function roomLines(room, job) {
    var plain = Object.assign({}, room, { price_override: null }), out = { lines: [], subtotal: 0, assumptions: [], confirm: [] }, res = null, q = QCPricing.roomQuantities(plain, S.rules);
    if (window.QCPricing && typeof QCPricing.roomTotal === 'function') { try { res = QCPricing.roomTotal(plain, S, job); } catch (e) { res = null; } }
    if (!res || !Array.isArray(res.lines)) { try { var one = Object.assign({}, job, { rooms: [plain], extras: [], travel_km: 0, client: Object.assign({}, job.client, { address: '' }) }), p = QCPricing.priceJob(one, S); res = { lines: p.lines.filter(function (l) { return l.room === q.room; }), confirm: p.confirm }; } catch (e2) { res = { lines: [] }; } }
    out.lines = res.lines; out.subtotal = res.subtotal != null ? r2(res.subtotal) : r2(out.lines.reduce(function (s, l) { return s + (parseFloat(l.amount) || 0); }, 0));
    out.assumptions = q.assumptions || []; out.confirm = (res.confirm || []).filter(function (c) { return String(c).indexOf(q.room + ':') === 0; });
    return out;
  }
  var EXT_FIELDS = [['weatherboard', 'Weatherboards m²', 'square metres of wall'], ['render', 'Render or brick m²', ''], ['eaves', 'Eaves and fascia, metres', ''], ['gutters', 'Gutters and downpipes, metres', ''], ['ext_door', 'Outside doors', 'how many'], ['ext_window', 'Timber windows', 'how many'], ['ext_window_alu', 'Aluminium windows', 'how many'], ['deck', 'Deck oil m²', ''], ['fence', 'Fence m²', 'one side'], ['pressure', 'Pressure wash m²', ''], ['tower', 'Tower hire, days', ''], ['scaffold', 'Scaffold, tower or lift', 'your scaffolder\'s price $']];
  function viewRoom(job, rid) {
    var room = job.rooms.filter(function (r) { return r.id === rid; })[0]; if (!room) return bounce('/job/' + job.id);
    var ext = room.type === 'exterior', blank = !room.name && !room.L && !room.W && !(room.walls || []).length;
    var mbyRow = function () { var us = room.measured_by !== 'client'; return '<div class="row" id="mby"><span class="hint" style="align-self:center">Who measured?</span><label class="btn ghost sm' + (us ? ' active' : '') + '"><input type="radio" name="mby" value="us"' + (us ? ' checked' : '') + '> I measured on site</label><label class="btn ghost sm' + (us ? '' : ' active') + '"><input type="radio" name="mby" value="client"' + (us ? '' : ' checked') + '> Sizes from the client</label></div><p class="hint" id="mbyline">' + (us ? '' : 'The quote says the sizes came from the client.') + '</p>'; };
    var html = '<a class="hint" href="#/job/' + job.id + '">&larr; ' + esc(job.quote_no) + '</a><h1>' + (ext ? 'Outside area' : 'Room') + '</h1>';
    html += '<div class="card"><label class="f">Name<input type="text" data-bind="name" placeholder="' + (ext ? 'Front and side weatherboards' : 'Lounge') + '"></label>';
    if (ext) {
      var scopeOn = room.ext.condition === 'fair' || room.ext.condition === 'poor', two = +room.ext.storeys === 2;
      html += '<div class="g3"><label class="f">Condition<span>fair = chalky, poor = peeling</span><select data-bind="ext.condition" data-refresh="1" id="extcond"><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option></select></label><label class="f">Storeys<select data-bind="ext.storeys" data-refresh="1" id="extstoreys"><option value="1">Single storey</option><option value="2">Two storey</option></select></label><label class="f">Coats<select data-bind="ext.coats" data-refresh="1"><option value="2">2</option><option value="3">3</option></select></label></div>' +
        '<div id="scopebox" ' + (scopeOn ? '' : 'hidden') + '><label class="f">How much of it is like that<span>how much of the house is the worst of it</span><select data-bind="ext.condition_scope" data-refresh="1"><option value="all">All of it</option><option value="half">About half</option><option value="side">One side</option></select></label></div>' +
        '<p class="hint" id="storeyline" ' + (two ? '' : 'hidden') + '>Two storey adds ' + esc(n(S.rules.storey_uplift_pct, 20)) + '% to boards, eaves, gutters and windows for the height. The Area total below shows the loaded price.</p>' +
        (room.ext && room.ext.from_satellite ? '<p class="hint" id="satnote">These sizes came from the satellite photo of the house. Check them on site.</p>' : '') + '<p class="hint">Leave blank what you are not doing.</p><div class="g2">' + EXT_FIELDS.map(function (f) { return '<label class="f">' + f[1] + (f[2] ? '<span>' + esc(f[2]) + '</span>' : '') + '<input type="number" min="0" step="0.5" data-bind="ext.' + f[0] + '" data-refresh="1"></label>'; }).join('') + '</div>' + mbyRow() + '</div>';
    } else {
      html += '<div class="row"><button class="btn sm ' + (room.method !== 'measured' ? 'tape' : 'ghost') + '" data-method="typed">Type sizes</button><button class="btn sm ' + (room.method === 'measured' ? 'tape' : 'ghost') + '" data-method="measured">Measure from photo</button></div>';
      html += '<div class="chips" id="presets"><span class="hint" style="align-self:center">Typical room:</span>' + Object.keys(QCSched.PRESETS).map(function (k) { return '<button class="chip" data-preset="' + k + '">' + esc(QCSched.PRESETS[k][0]) + '</button>'; }).join('') + '</div>';
      html += '<p id="presetline" class="hint"></p>'; // C fills this: "Filled in: 1 door, 2 windows, skirting. Keep / Clear"
      html += '<div id="typed" ' + (room.method === 'measured' ? 'hidden' : '') + '><div class="g3"><label class="f">Length m<input type="number" step="0.1" min="0" data-bind="L" data-refresh="1"></label><label class="f">Width m<input type="number" step="0.1" min="0" data-bind="W" data-refresh="1"></label><label class="f">Height m<span>blank = ' + esc(S.rules.ceiling_height_m) + '</span><input type="number" step="0.1" min="0" data-bind="H" data-refresh="1"></label></div>' + mbyRow() + '<details class="adv"><summary>Odd shape? Tap here to type the perimeter and ceiling instead</summary><div class="g2"><label class="f">Wall perimeter m<span>instead of length × width</span><input type="number" step="0.1" min="0" data-bind="perimeter_m" data-refresh="1"></label><label class="f">Ceiling m²<input type="number" step="0.1" min="0" data-bind="ceiling_m2" data-refresh="1"></label></div></details></div>';
      html += '<div id="measured" ' + (room.method === 'measured' ? '' : 'hidden') + '><div id="walls"></div><div id="measure-mount"></div><label class="f" style="margin-top:8px">Ceiling m²<span>blank = length × width</span><input type="number" step="0.1" min="0" data-bind="ceiling_m2" data-refresh="1"></label></div>';
      var wallsOnly = !room.surfaces.ceiling && !room.surfaces.skirting && !(room.doors > 0) && !(room.doors_one_side > 0) && !(room.windows > 0) && !(room.wardrobe_pairs > 0), others = job.rooms.filter(function (r) { return r.type !== 'exterior' && r.id !== rid; }).length;
      html += '</div><div class="card"><div class="row between"><h3>Surfaces</h3><div class="row"><button class="btn ghost sm' + (wallsOnly ? ' active' : '') + '" id="wallsonly">Walls only</button>' + (wallsOnly && others ? '<button class="btn ghost sm" id="wallsall">Copy to all rooms</button>' : '') + '</div></div>' + (wallsOnly ? '<p class="hint">No ceiling, skirting, doors or windows. Tap again to put them back.</p>' : '') + '<div class="row">' +
        [['walls', 'Walls'], ['ceiling', 'Ceiling'], ['skirting', 'Skirting and architraves']].map(function (f) { return '<label class="btn ghost sm"><input type="checkbox" data-bind="surfaces.' + f[0] + '" data-refresh="1"> ' + f[1] + '</label>'; }).join('') + '</div>' +
        '<div class="g2"><label class="f">Doors, both sides<input type="number" min="0" data-bind="doors" data-refresh="1"></label><label class="f">Doors, one side only<input type="number" min="0" data-bind="doors_one_side" data-refresh="1"></label><label class="f">Windows<input type="number" min="0" data-bind="windows" data-refresh="1"></label><label class="f">Wardrobe door pairs<input type="number" min="0" data-bind="wardrobe_pairs" data-refresh="1"></label><label class="f">Feature wall m²<input type="number" min="0" step="0.5" data-bind="feature_m2" data-refresh="1"></label><label class="f">Wallpaper to remove m²<input type="number" min="0" step="0.5" data-bind="wallpaper_m2" data-refresh="1"></label>' +
        '<label class="f">Panelled doors<span>of the doors above</span><input type="number" min="0" data-bind="panelled_doors" data-refresh="1"></label><label class="f">Window frames<select data-bind="window_kind" data-refresh="1"><option value="alu">Aluminium, reveals only</option><option value="timber">Timber</option></select></label><label class="f">Wall not painted m²<span>behind robes, tiles</span><input type="number" min="0" step="0.5" data-bind="exclude_m2" data-refresh="1"></label></div>' +
        '<div class="row"><label class="btn ghost sm"><input type="checkbox" data-bind="colour_change" data-refresh="1"> Colour change, 3 coats</label><label class="btn ghost sm"><input type="checkbox" data-bind="cornice" data-refresh="1"> Cornice</label><label class="btn ghost sm"><input type="checkbox" data-bind="high_access" data-refresh="1"> Stairwell or void</label></div>' +
        '<label class="f">Wall condition<span>fair = scuffs, poor = peeling</span><select data-bind="condition" data-refresh="1"><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option></select></label></div>';
    }
    html += photosCard(job, rid);
    html += '<div class="card"><h3>' + (ext ? 'Area' : 'Room') + ' total</h3><div id="preview"></div><label class="f">Charge this ' + (ext ? 'area' : 'room') + ' at $___ instead<span>before GST</span><input type="number" min="0" step="1" data-bind="price_override" data-refresh="1" placeholder="e.g. 1500"></label></div><div class="row between"><div class="row">' + (job.quick ? '<a class="btn tape" href="#/job/' + job.id + '/quote">Done, build the quote</a><button class="btn ghost" id="addanother">Save and add another</button><a class="btn ghost" href="#/job/' + job.id + '">Job details</a>' : '<a class="btn tape" href="#/job/' + job.id + '">Done</a><button class="btn ghost" id="addanother">Save and add another</button>') + '</div><button class="btn danger sm" id="delroom">Remove ' + (ext ? 'area' : 'room') + '</button></div>';
    $app.innerHTML = html;
    bindAll($app, room);
    $app.querySelectorAll('[data-preset]').forEach(function (b) { b.addEventListener('click', function () { var pr = QCSched.PRESETS[b.dataset.preset]; if (!pr) return; room.L = pr[1]; room.W = pr[2]; room.doors = pr[3]; room.windows = pr[4]; room.doors_one_side = pr[5]; room.wardrobe_pairs = pr[6]; if (!room.name || /^Room \d+$/.test(room.name)) room.name = pr[0]; room.method = 'typed'; save(); toast(pr[0] + ' sizes filled in. Fix any that differ.'); viewRoom(job, rid); }); });
    var addAnother = document.getElementById('addanother'); if (addAnother) addAnother.addEventListener('click', once(function () { var r = QCStore.newRoom(room.type); if (job.quick) r.name = 'Room ' + (job.rooms.length + 1); job.rooms.push(r); save(); toast((room.name || (ext ? 'Area' : 'Room')) + ' saved'); go('/job/' + job.id + '/room/' + r.id); }));
    $app.querySelectorAll('input[name="mby"]').forEach(function (r) { r.addEventListener('change', function () { room.measured_by = r.value === 'client' ? 'client' : 'us'; save(); $app.querySelectorAll('input[name="mby"]').forEach(function (x) { x.parentNode.classList.toggle('active', x.checked); }); var ml = document.getElementById('mbyline'); if (ml) ml.textContent = room.measured_by === 'client' ? 'The quote says the sizes came from the client and are confirmed on site.' : 'The quote says the sizes were measured on site by you.'; }); });
    wirePhotos($app, job, rid, function () { viewRoom(job, rid); });
    refreshPreview = function () {
      var box = document.getElementById('preview'), rt = roomLines(room, job), ov = room.price_override, ovOn = ov !== '' && ov != null && !isNaN(parseFloat(ov)) && parseFloat(ov) >= 0;
      var sl = document.getElementById('storeyline'); if (sl) sl.hidden = +room.ext.storeys !== 2; var sb = document.getElementById('scopebox'); if (sb) sb.hidden = !(room.ext.condition === 'fair' || room.ext.condition === 'poor');
      if (!rt.lines.length) { box.innerHTML = '<p class="muted">Nothing yet. ' + (ext ? 'Type the sizes above.' : 'Type the sizes or measure a wall.') + '</p>'; return; }
      box.innerHTML = '<table>' + rt.lines.map(function (l) { return '<tr><td>' + esc(l.desc) + (l.confirm ? ' <span class="confirm">TO CONFIRM</span>' : '') + '<br><span class="hint">' + esc(l.source || '') + (l.rate > 0 ? ' · ' + rateFmt(l.rate) + ' per ' + esc(unitWord(l.unit)) : '') + '</span></td><td class="n">' + l.qty + ' ' + esc(unitWord(l.unit)) + '</td><td class="n">' + (l.confirm && !(l.amount > 0) ? '<span class="confirm">no price yet</span>' : money(l.amount)) + '</td></tr>'; }).join('') +
        (ovOn ? '<tr class="sub"><td colspan="2" class="n">The lines above come to</td><td class="n">' + money(rt.subtotal) + '</td></tr><tr class="total"><td colspan="2">Charged at your price, ex GST</td><td class="n">' + money(r2(ov)) + '</td></tr>' : '<tr class="total"><td colspan="2">' + (ext ? 'Area' : 'Room') + ' subtotal ex GST</td><td class="n">' + money(rt.subtotal) + '</td></tr>') + '</table>' +
        (rt.assumptions.length ? '<p class="hint">' + rt.assumptions.map(esc).join('<br>') + '</p>' : '') + (rt.confirm.length ? '<p class="confirm">' + esc(rt.confirm.join(' ')) + ' Put a price on it in Set-up, or type your own price for this ' + (ext ? 'area' : 'room') + ' below.</p>' : '');
    };
    refreshPreview();
    $app.querySelectorAll('[data-method]').forEach(function (b) { b.addEventListener('click', function () { room.method = b.dataset.method; save(); viewRoom(job, rid); }); });
    var wo = document.getElementById('wallsonly'); if (wo) wo.addEventListener('click', function () {
      var on = !room.surfaces.ceiling && !room.surfaces.skirting && !(room.doors > 0) && !(room.doors_one_side > 0) && !(room.windows > 0) && !(room.wardrobe_pairs > 0);
      if (on) { room.surfaces.ceiling = true; room.surfaces.skirting = true; toast('Ceiling and skirting back on'); } else { room.surfaces.walls = true; room.surfaces.ceiling = false; room.surfaces.skirting = false; room.doors = 0; room.doors_one_side = 0; room.windows = 0; room.wardrobe_pairs = 0; room.panelled_doors = 0; toast('Walls only for this room'); }
      save(); viewRoom(job, rid);
    });
    var wa = document.getElementById('wallsall'); if (wa) wa.addEventListener('click', function () { var k = 0; job.rooms.forEach(function (r) { if (r.type === 'exterior') return; r.surfaces = Object.assign({}, r.surfaces, { walls: true, ceiling: false, skirting: false }); r.doors = 0; r.doors_one_side = 0; r.windows = 0; r.wardrobe_pairs = 0; r.panelled_doors = 0; k++; }); save(); toast('Walls only on all ' + k + ' rooms'); viewRoom(job, rid); });
    if (!ext) {
      function renderWalls() {
        var box = document.getElementById('walls');
        box.innerHTML = room.walls.length ? '<table><thead><tr><th>Wall</th><th class="n">W × H m</th><th class="n">Openings</th><th class="n">Paint m²</th><th></th></tr></thead><tbody>' + room.walls.map(function (w, i) { return '<tr><td>' + esc(w.wall) + '<br><span class="hint">' + (w.method === 'roomplan-lidar' ? 'LiDAR' : '±' + w.expected_error_pct + '%') + '</span></td><td class="n">' + (w.width_mm / 1000).toFixed(2) + ' × ' + (w.height_mm / 1000).toFixed(2) + '</td><td class="n">' + w.openings.length + '</td><td class="n">' + w.paint_area_m2.toFixed(2) + '</td><td class="n"><button class="btn ghost sm" data-wdel="' + i + '">remove</button></td></tr>'; }).join('') + '</tbody></table>' : '';
        box.querySelectorAll('[data-wdel]').forEach(function (b) { b.addEventListener('click', function () { room.walls.splice(+b.dataset.wdel, 1); save(); renderWalls(); refreshPreview(); }); });
      }
      renderWalls();
      var mount = document.getElementById('measure-mount');
      var mopts = { count: function () { return room.walls.length; }, ceiling: function () { return { m: n(room.H) || n(S.rules.ceiling_height_m) || 2.4, assumed: !n(room.H) }; }, roundUpMm: function () { return 0; }, onHeight: function (m, how, err) { if (room.H_err != null && err > room.H_err) return; room.H = Math.round(m * 100) / 100; room.H_from = how; room.H_err = err; save(); },
        onSave: function (rec) { room.walls.push(rec); room.method = 'measured'; save(); renderWalls(); refreshPreview(); toast('Wall saved'); } };
      var mounted = false;
      function ensureMount() { if (!mounted && room.method === 'measured') { window.__qcMeasure = QCMeasure.mount(mount, mopts); mounted = true; } }
      ensureMount();
      // LiDAR import
      var imp = document.createElement('div'); imp.className = 'row'; imp.innerHTML = '<details class="adv" style="width:100%"><summary>Other ways to measure</summary><p class="hint">An iPhone Pro room scan comes in measured. Otherwise type the sizes.</p><label class="btn ghost sm">Import a room scan (RoomPlan JSON)<input type="file" accept=".json,application/json" id="lidar"></label></details>';
      document.getElementById('measured').appendChild(imp);
      document.getElementById('lidar').addEventListener('change', function () {
        var f = this.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { try { var added = importRoomPlan(JSON.parse(fr.result), room); if (added) { room.method = 'measured'; save(); renderWalls(); refreshPreview(); toast(added + ' wall' + (added === 1 ? '' : 's') + ' imported'); } else toast('No usable walls in that file.'); } catch (e) { toast('That file is not a RoomPlan export.'); } }; fr.readAsText(f); this.value = '';
      });
    }
    document.getElementById('delroom').addEventListener('click', function () { if (confirm('Remove this ' + (ext ? 'area' : 'room') + '?')) { job.rooms = job.rooms.filter(function (r) { return r.id !== rid; }); save(); go('/job/' + job.id); } });
    if (blank && room.method !== 'measured') { var nm = $app.querySelector('[data-bind="name"]'); if (nm) { try { nm.focus({ preventScroll: true }); } catch (e) { nm.focus(); } } } // a fresh room opens on its name, top of the page
  }
  function importRoomPlan(data, room) {
    var rooms = (data.rooms && data.rooms[0] && data.rooms[0].walls) ? data.rooms : [data]; var added = 0;
    rooms.forEach(function (r) {
      var walls = r.walls || [], opens = [].concat(r.doors || [], r.windows || []);
      function dims(s) { var d = s.dimensions || [0, 0, 0]; if (!Array.isArray(d)) d = [d.x, d.y, d.z]; return d.map(Number); }
      function pos(s) { var t = s.transform; if (Array.isArray(t) && t.length === 16) return [t[12], t[13], t[14]]; return null; }
      walls.forEach(function (w) {
        if (w.width_mm > 0 && w.height_mm > 0) { // already in Chasem measurements.json form
          if (!(w.width_mm >= 300 && w.width_mm <= 30000 && w.height_mm >= 1000 && w.height_mm <= 8000)) return;
          w.openings = (w.openings || []).filter(function (o) { return o && o.width_mm > 0 && o.height_mm > 0 && o.width_mm <= w.width_mm && o.height_mm <= w.height_mm; }); w.paint_area_m2 = 0;
          var ga = w.gross_area_m2 || +(w.width_mm * w.height_mm / 1e6).toFixed(3), ops = (w.openings || []).map(function (o) { return { type: o.type === 'window' ? 'window' : 'door', width_mm: Math.round(o.width_mm), height_mm: Math.round(o.height_mm), area_m2: +(o.area_m2 || o.width_mm * o.height_mm / 1e6).toFixed(3) }; });
          room.walls.push({ wall: w.wall || ('Scanned wall ' + (room.walls.length + 1)), width_mm: Math.round(w.width_mm), height_mm: Math.round(w.height_mm), gross_area_m2: ga, openings: ops, paint_area_m2: +Math.max(0, ga - ops.reduce(function (s, o) { return s + o.area_m2; }, 0)).toFixed(3), method: w.method || 'roomplan-lidar', expected_error_pct: w.expected_error_pct || 2, measured_at: new Date().toISOString() });
          added++; return;
        }
        var d = dims(w); if (!(d[0] >= 0.3 && d[0] <= 30 && d[1] >= 1 && d[1] <= 8)) return; var wp = pos(w);
        var o = opens.filter(function (x) { if (x.parentIdentifier) return x.parentIdentifier === w.identifier; var xp = pos(x); return wp && xp && Math.hypot(xp[0] - wp[0], xp[1] - wp[1], xp[2] - wp[2]) < Math.max(0.6, d[0] / 2 + 0.3); })
          .map(function (x) { var xd = dims(x); return { type: (x.category && x.category.window) || (r.windows || []).indexOf(x) >= 0 ? 'window' : 'door', width_mm: Math.round(xd[0] * 1000), height_mm: Math.round(xd[1] * 1000), area_m2: +(xd[0] * xd[1]).toFixed(3) }; }).filter(function (o) { return o.width_mm > 0 && o.height_mm > 0 && o.width_mm <= d[0] * 1000 && o.height_mm <= d[1] * 1000; });
        var gross = d[0] * d[1], oa = Math.min(gross, o.reduce(function (s, x) { return s + x.area_m2; }, 0));
        room.walls.push({ wall: 'Scanned wall ' + (room.walls.length + 1), width_mm: Math.round(d[0] * 1000), height_mm: Math.round(d[1] * 1000), gross_area_m2: +gross.toFixed(3), openings: o, paint_area_m2: +(gross - oa).toFixed(3), method: 'roomplan-lidar', expected_error_pct: 2, measured_at: new Date().toISOString() });
        added++;
      });
      var fl = (r.floors || [])[0]; if (fl) { var fd = dims(fl); if (fd[0] > 0 && fd[2] > 0 && !room.ceiling_m2) room.ceiling_m2 = +(fd[0] * fd[2]).toFixed(2); }
      if (r.ceiling_area_m2_estimate > 0 && !room.ceiling_m2) room.ceiling_m2 = +(+r.ceiling_area_m2_estimate).toFixed(2);
    });
    return added;
  }

  // ---------- Booking (A1). A2's viewQuote drops bookBox(job) into its card and calls wireBooking($app, job) after rendering.
  var bookEdit = ''; // job id whose booking is being changed: the old dates stay until the new ones are saved
  var DAYS3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MONS3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function niceDay(iso) { if (!/^\d{4}-\d{2}-\d{2}/.test(iso || '')) return ''; var d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); if (isNaN(d.getTime())) return ''; return DAYS3[d.getDay()] + ' ' + d.getDate() + ' ' + MONS3[d.getMonth()] + ' ' + d.getFullYear(); }
  // bookBox(job): the booked line with Change and Google Calendar, plus the (hidden) booking form; keeps the ids #bookbox #bk_start #bk_days #bk_hour #bk_go #rebook2
  function bookBox(job) {
    var live = priceLive(job), days = bookDays(job, live), crew = crewSize(), b = job.booking, editing = bookEdit === job.id && !!b; bookEdit = '';
    var html = b ? '<p id="bookedline"><b>Booked ' + niceDay(b.start) + (b.days > 1 ? ' for ' + b.days + ' days' : '') + '.</b> <a href="' + esc(b.gcal) + '" target="_blank" rel="noopener">Also add to Google Calendar</a> <button class="btn ghost sm" id="rebook2">Change</button></p>' : '';
    html += '<div id="bookbox" class="scalebox" ' + (editing ? '' : 'hidden') + '><b id="bk_title">' + (editing ? 'Change the booking' : 'Book these days') + '</b><div class="g3"><label class="f">Start<span id="bk_nice">' + esc(niceDay(editing ? b.start : QCStore.addDays(QCStore.today(), 7))) + '</span><input type="date" id="bk_start" value="' + esc(editing ? b.start : '') + '"></label><label class="f">Days<input type="number" id="bk_days" min="1" value="' + (editing ? b.days : days) + '"></label><label class="f">Start time<span>hour, e.g. 7</span><input type="number" id="bk_hour" min="5" max="12" value="' + esc(editing && b.hour ? b.hour : S.booking.start_hour) + '"></label></div>' +
      '<p>' + (job.booking_days >= 1 ? 'Days as you set them last time.' : 'The app reckons ' + days + ' day' + (days === 1 ? '' : 's') + ' at ' + hoursPerDay() + ' hours a day with ' + crew + ' painter' + (crew === 1 ? '' : 's') + '. Change it if you know better.') + '</p>' +
      '<div class="row"><button class="btn tape sm" id="bk_go">' + (editing ? 'Save the new dates' : 'Book these days') + '</button><button class="btn ghost sm" id="bk_cancel">' + (editing ? 'Keep the old booking' : 'Cancel') + '</button></div><p class="hint">Goes on this job. Then your phone\'s menu opens so you can add it to your calendar. Nothing is sent to ' + esc(whoName(job)) + '.</p></div>';
    return html;
  }
  // wireBooking(root, job): hooks #book (A2's button, if present), Change, the day preview, the days memory, Cancel and Book
  function wireBooking(root, job) {
    var box = root.querySelector('#bookbox'); if (!box) return;
    var nice = function () { var st = root.querySelector('#bk_start'), sp = root.querySelector('#bk_nice'); if (st && sp) sp.textContent = niceDay(st.value) || 'pick a day'; };
    var openBox = function (title, goLabel, cancelLabel) { box.hidden = false; var t = root.querySelector('#bk_title'); if (t) t.textContent = title; var g = root.querySelector('#bk_go'); if (g) g.textContent = goLabel; var c = root.querySelector('#bk_cancel'); if (c) c.textContent = cancelLabel; var st = root.querySelector('#bk_start'); if (st && !st.value) st.value = QCStore.addDays(QCStore.today(), 7); nice(); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
    var bk = root.querySelector('#book'); if (bk) bk.addEventListener('click', function () { openBox('Book these days', 'Book these days', 'Cancel'); });
    var rb = root.querySelector('#rebook2'); if (rb) rb.addEventListener('click', function () { var b = job.booking; if (b) { root.querySelector('#bk_start').value = b.start; root.querySelector('#bk_days').value = b.days; if (b.hour) root.querySelector('#bk_hour').value = b.hour; } openBox('Change the booking', 'Save the new dates', 'Keep the old booking'); });
    var st = root.querySelector('#bk_start'); if (st) { st.addEventListener('change', nice); st.addEventListener('input', nice); }
    var bd = root.querySelector('#bk_days'); if (bd) bd.addEventListener('input', function () { var v = parseInt(bd.value, 10); if (v >= 1) { job.booking_days = v; save(); } });
    var cb = root.querySelector('#bk_cancel'); if (cb) cb.addEventListener('click', function () { box.hidden = true; });
    var bg = root.querySelector('#bk_go'); if (bg) bg.addEventListener('click', function () { var start = root.querySelector('#bk_start').value, days = Math.max(1, parseInt(root.querySelector('#bk_days').value, 10) || 1), hour = parseInt(root.querySelector('#bk_hour').value, 10) || 7; if (!start) { toast('Pick a start day first'); return; } job.booking_days = days; bookJob(job, start, days, hour); });
  }

  // ---------- Quote
  // The frozen quote is what the client holds. Locked once accepted or invoiced: the page renders the snapshot and only Revise quote reopens it.
  function fromBook(job) { return !!(job && job.quote && parseFloat(job.manual_total) > 0 && !(job.rooms || []).length); } // loaded from the painter's own book by a set-up link: a figure, no rooms
  function quoteLocked(job) { return !!(job.quote && (['accepted', 'invoiced', 'paid', 'cancelled'].indexOf(job.status) >= 0 || fromBook(job))); }
  function quoteDiffers(q, p) {
    if (!q) return true; if (Math.abs(r2(q.total) - r2(p.total)) >= 0.005) return true;
    var key = function (arr) { return JSON.stringify((arr || []).map(function (l) { return [l.desc, +l.qty || 0, r2(l.amount)]; })); };
    return key(q.lines) !== key(p.lines) || key(q.options) !== key(p.options);
  }
  function detailsSubset() { var d = S.details, o = {}; ['trading_name', 'owner_name', 'abn', 'licence', 'insurance', 'phone', 'email', 'address', 'bsb', 'account_number', 'account_name', 'other_payments', 'gst', 'deposit_pct', 'balance_days', 'quote_valid_days', 'state', 'brand_colour', 'show_rates'].forEach(function (k) { o[k] = d[k]; }); return o; }
  // First send = version 1 under the job's number. A later send with different lines or totals = a new revision (Q-1001-R2, today's date, the old one kept in history).
  // Returns {ok} ; ok false when the painter declined the revision confirm. opts.revise forces a new revision, opts.confirm false skips the prompt.
  // A2: freeze only snapshots. Nothing here marks the quote sent; that is markQuoteSent, called from the Did-it-go answer or a real email through the relay.
  function quoteSentDate(job) { var q = job.quote; if (!q) return ''; return q.sent_date !== undefined ? (q.sent_date || '') : (job.sent_date || ''); } // per version; a record from before this step only has the job-level date
  function freeze(job, priced, opts) {
    opts = opts || {}; var d = QCStore.today(), q = job.quote, revised = false;
    if (q && quoteLocked(job) && !opts.revise) return { ok: true, locked: true };
    var snap = function (base) { return Object.assign(base, { lines: priced.lines, options: priced.options || [], subtotal: priced.subtotal, gst: priced.gst, total: priced.total, deposit: priced.deposit, deposit_pct: priced.deposit_pct, assumptions: priced.assumptions, measured_rooms: priced.measured_rooms, total_rooms: priced.total_rooms, snapshot: { wording: JSON.parse(JSON.stringify(S.wording)), details: Object.assign(detailsSubset(), { deposit_pct: priced.deposit_pct, deposit: priced.deposit, balance_days: balDaysFor(job) }), generated_at: new Date().toISOString() } }); };
    if (!q) job.quote = snap({ date: d, version: 1, number: job.quote_no, history: [], sent_date: '' });
    else if (!quoteSentDate(job)) job.quote = snap({ date: q.date || d, version: q.version || 1, number: q.number || job.quote_no, history: q.history || [], sent_date: '' }); // this version never went out: refresh it in place, same number
    else if (opts.revise || quoteDiffers(q, priced)) {
      var v = (q.version || 1) + 1;
      if (opts.confirm !== false && !confirm('Issue revision ' + v + '? The client keeps the old quote too.')) return { ok: false };
      q.history = q.history || []; q.history.push({ version: q.version || 1, number: q.number || job.quote_no, date: q.date, sent_date: quoteSentDate(job), total: q.total, subtotal: q.subtotal, gst: q.gst, lines: q.lines, options: q.options || [] });
      job.quote = snap({ date: d, version: v, number: job.quote_no + '-R' + v, history: q.history, sent_date: '' }); revised = true; if (job.manual_total != null) job.manual_total = null; // revised in the app: the figure from the book no longer holds the quote
    }
    save(); return { ok: true, revised: revised };
  }
  function dispName(job) { var c = (job && job.client) || {}; return String(c.first_name || c.name || '').trim(); }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function fmtShort(iso) { if (!iso) return ''; var d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); }
  function howWord(how) { return how === 'text' ? 'by text' : how === 'email' ? 'by email' : how === 'other' ? 'in person' : ''; }
  function logSend(job, ref, how, text, to) { try { QCStore.addLog({ t: new Date().toISOString(), kind: 'send', channel: how === 'text' ? 'sms' : how === 'email' ? 'email' : 'other', job: job.id, ref: ref, to: to || (how === 'email' ? job.client.email : job.client.phone) || '', text: text, ok: true, by: 'you' }); } catch (e) {} }
  // The only place a quote becomes "sent": date, how, status quoted, and a line in the Sent log. quiet = the relay already logged the email.
  function markQuoteSent(job, how, quiet) { var d = QCStore.today(); job.sent_date = d; job.sent_how = how || 'other'; job.sent_confirmed = true; job.handed_at = ''; if (job.quote) job.quote.sent_date = d; if (job.status === 'draft') job.status = 'quoted'; save(); if (!quiet) logSend(job, 'quote-' + ((job.quote && job.quote.number) || job.quote_no), how, 'Quote ' + ((job.quote && job.quote.number) || job.quote_no) + ' sent to ' + (job.client.name || 'the client')); }
  function markInvoiceSent(job, inv, how, quiet) { var d = QCStore.today(); inv.sent_date = d; inv.sent_how = how || 'other'; inv.sent_confirmed = true; inv.handed_at = ''; settle(job); save(); if (!quiet) logSend(job, 'invoice-' + inv.no, how, kindLabel(inv) + ' ' + inv.no + ' sent to ' + (job.client.name || 'the client')); }

  // ---------- A2: the "Did it go?" step. Every document leaves the phone through handOff: look at it first, hand it to the phone's share menu (or save it as a file),
  // then ask "Did it go to <Name>?" inline. Nothing is marked sent until the answer is Yes. window.__qcApp.handOff for the chase cards.
  // handOff({ kind, doc (jsPDF) | file (Blob) | text, filename, title, whoName, whoPhone, whoEmail, job, ref, anchor (element or id the question sits under),
  //           look (false skips the viewer), ask (false skips the question), canSend (false: viewer with Close only), onHanded({how}), onResult({sent, how, handed}) })
  // how: 'shared' (the phone's menu came back) | 'downloaded' (saved as a file) | 'copied' (words on the clipboard) | 'cancelled' (menu dismissed)
  var HAND_WORDS = { quote: 'quote', invoice: 'invoice', receipt: 'receipt', statement: 'statement', variation: 'variation', summary: 'summary', backup: 'back-up copy', calendar: 'calendar entry', credit: 'credit note' };
  window.addEventListener('hashchange', function () { closeViewer(); var dg = document.getElementById('didgo'); if (dg && dg.parentNode) dg.parentNode.removeChild(dg); }); // leaving the screen closes the viewer; an unanswered question comes back from handed_at on the next render
  function closeViewer() { var v = document.getElementById('qcview'); if (v) { try { if (v.getAttribute('data-url')) URL.revokeObjectURL(v.getAttribute('data-url')); } catch (e) {} v.parentNode.removeChild(v); } document.body.classList.remove('viewing'); }
  function downloadBlob(blob, filename) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); return 'downloaded'; }
  function copyText(t) { try { if (navigator.clipboard) navigator.clipboard.writeText(t); } catch (e) {} return 'copied'; }
  function logHanded(o, word, who, how) { try { QCStore.addLog({ t: new Date().toISOString(), kind: 'handed', channel: how === 'downloaded' ? 'file' : how === 'copied' ? 'clipboard' : 'phone', job: (o.job && o.job.id) || o.jobId || '', ref: o.ref || '', to: who || '', text: cap(word) + (o.title ? ' ' + o.title : '') + (how === 'downloaded' ? ' saved on the phone as a file' : how === 'copied' ? ' copied, ready to paste' : ' handed to your phone to send'), ok: true }); } catch (e) {} }
  function handOff(o) {
    o = o || {}; var kind = o.kind || 'quote', word = HAND_WORDS[kind] || 'file', who = String(o.whoName || '').trim(), filename = o.filename || (word + (o.doc ? '.pdf' : '.txt')), blob = null, file = null, text = o.text != null ? String(o.text) : '';
    try { if (o.doc) blob = o.doc.output('blob'); else if (o.file) blob = o.file; } catch (e) { toast('Could not make the ' + word + ': ' + e.message); return; }
    if (blob) { try { file = new File([blob], filename, { type: blob.type || 'application/pdf' }); } catch (e) { file = blob; } }
    function finish(how) {
      closeViewer(); if (how !== 'cancelled') logHanded(o, word, who, how); if (how === 'copied') toast('Copied. Paste it into a text or an email.');
      if (o.onHanded) { try { o.onHanded({ how: how }); } catch (e) {} }
      if (o.ask === false) { if (o.onResult) o.onResult({ sent: null, how: '', handed: how }); return; }
      didItGo({ whoName: who, word: word, handed: how, anchor: o.anchor, onResult: o.onResult });
    }
    function send() {
      var p;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) p = navigator.share({ files: [file], title: filename, text: text || undefined }).then(function () { return 'shared'; }).catch(function (e) { return e && e.name === 'AbortError' ? 'cancelled' : downloadBlob(blob, filename); });
      else if (!file && text && navigator.share) p = navigator.share({ text: text }).then(function () { return 'shared'; }).catch(function (e) { return e && e.name === 'AbortError' ? 'cancelled' : copyText(text); });
      else if (file) p = Promise.resolve(downloadBlob(blob, filename));
      else p = Promise.resolve(copyText(text));
      p.then(finish);
    }
    if (blob && o.look !== false && kind !== 'backup' && kind !== 'calendar') showViewer(blob, word, who, o.canSend === false ? null : send, o.title, o.note); else send(); // a back-up file or calendar entry is not something to read: straight to the phone's menu
  }
  // full-screen look at a document before it goes anywhere. Close = nothing happens. Send = the phone's menu, then the question.
  function showViewer(blob, word, who, onSend, title, note) {
    closeViewer(); var url = URL.createObjectURL(blob), v = document.createElement('div'); v.id = 'qcview'; v.className = 'qcview'; v.setAttribute('data-url', url);
    v.innerHTML = '<div class="qcview-bar"><div><b>' + esc(cap(word)) + (title ? ' ' + esc(title) : '') + '</b><br><span class="hint">' + esc(note || (onSend ? 'Have a look. Nothing has gone anywhere yet.' : 'Just a look. Close it when you are done.')) + ' <a href="' + url + '" target="_blank" rel="noopener">Not showing? Open it in a new tab.</a></span></div></div>' +
      '<div class="qcview-body"><iframe class="qcview-frame" src="' + url + '" title="' + esc(cap(word)) + '"></iframe></div>' +
      '<div class="qcview-foot"><button class="btn ghost" id="qcv_close">Close</button>' + (onSend ? '<button class="btn tape" id="qcv_send">Send' + (who ? ' to ' + esc(who) : '') + '</button>' : '') + '</div>';
    document.body.appendChild(v); document.body.classList.add('viewing');
    document.getElementById('qcv_close').addEventListener('click', function () { closeViewer(); });
    var sb = document.getElementById('qcv_send'); if (sb) sb.addEventListener('click', function () { sb.disabled = true; onSend(); });
  }
  // the question, inline under the button that started it (or a fixed panel when that button is gone). It stays until answered.
  function didItGo(o) {
    o = o || {}; var who = String(o.whoName || '').trim() || 'them', word = o.word || 'it', old = document.getElementById('didgo'); if (old) old.parentNode.removeChild(old);
    var box = document.createElement('div'); box.id = 'didgo'; box.className = 'didgo';
    box.innerHTML = (o.handed === 'downloaded' ? '<p>Your phone saved the ' + esc(word) + ' as a file. Open it from your Files app to send it, or tap Send and choose Messages or Mail.</p>' : o.handed === 'copied' ? '<p>Copied.</p>' : o.handed === 'cancelled' ? '<p>Closed without sending, as far as the app can tell.</p>' : '') +
      '<p><b>Did it go to ' + esc(who) + '?</b></p><div class="row"><button class="btn sm" data-didgo="text">Yes, by text</button><button class="btn sm" data-didgo="email">Yes, by email</button><button class="btn ghost sm" data-didgo="">Not yet</button></div><p class="hint"><a href="#" data-didgo="other">Handed over another way (in person, printed)</a></p>';
    var anchor = typeof o.anchor === 'string' ? document.getElementById(o.anchor) : o.anchor, host = anchor && anchor.parentNode && document.body.contains(anchor) ? anchor : null;
    if (host) { var row = host.closest ? host.closest('.row') : null, at = row || host; at.parentNode.insertBefore(box, at.nextSibling); try { box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} } else { box.className += ' fixed'; document.body.appendChild(box); }
    box.querySelectorAll('[data-didgo]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); var how = b.getAttribute('data-didgo'); if (box.parentNode) box.parentNode.removeChild(box); if (o.onResult) o.onResult({ sent: !!how, how: how || '', handed: o.handed || '' }); }); });
    return box;
  }
  // a blocking condition sits next to the button and stays; C's showBlock when present, else a plain block paragraph
  function blockNext(host, id, msg, extraHtml) {
    var old = document.getElementById(id); if (old && old.parentNode) old.parentNode.removeChild(old); if (!msg || !host) return null;
    var el = null; if (typeof showBlock === 'function') { try { var r = showBlock(host, msg); if (r && r.nodeType === 1) el = r; else if (host.nextElementSibling && /\bblock\b/.test(host.nextElementSibling.className || '')) el = host.nextElementSibling; } catch (e) { el = null; } }
    if (!el) { el = document.createElement('p'); el.className = 'block confirm'; el.textContent = msg; host.parentNode.insertBefore(el, host.nextSibling); }
    el.id = id; if (extraHtml) { var x = el.querySelector('button.x'); if (x) x.insertAdjacentHTML('beforebegin', extraHtml); else el.insertAdjacentHTML('beforeend', extraHtml); } return el;
  }

  function viewQuote(job, keep) {
    if (!keep) window.scrollTo(0, 0);
    var live = priceLive(job), det = S.details, locked = quoteLocked(job), q = job.quote, view = locked ? q : live, qSent = quoteSentDate(job), sent = !!qSent;
    var qno = (q && q.number) || job.quote_no, changed = !!(q && sent && !locked && quoteDiffers(q, live)), cancelled = job.status === 'cancelled', whoShort = dispName(job) || 'them', who = dispName(job) || 'the client', posName = who + (/s$/i.test(who) ? '’' : '’s');
    var html = '<a class="hint" href="#/job/' + job.id + '">&larr; Edit job</a><div class="row between"><h1>Quote ' + esc(qno) + '</h1>' + statusPill(job) + '</div>';
    if (q && q.version > 1 && q.history && q.history.length) html += '<p class="hint">Revision ' + q.version + ' of ' + esc(job.quote_no) + ', replaces the quote dated ' + QCPdf.fmtDate(q.history[q.history.length - 1].date) + '. Earlier: ' + q.history.map(function (h) { return esc(h.number) + ' ' + money(h.total); }).join(', ') + '.</p>';
    if (changed) html += '<div class="card"><p class="confirm">The quote sent on ' + QCPdf.fmtDate(qSent) + ' was ' + money(q.total) + '. With the changes since, it comes to ' + money(live.total) + '. Sending issues revision ' + ((q.version || 1) + 1) + '; ' + esc(who) + ' keeps the old one.</p></div>';
    if (locked) html += '<div class="card"><p class="hint">' + (fromBook(job) && job.status === 'quoted' ? 'From your book, loaded when you set up. Showing the quote as ' + (sent ? 'sent on ' + QCPdf.fmtDate(qSent) : 'written down') + '. To price it in the app, add rooms on the job, then Revise quote.' : (cancelled ? 'Job cancelled. ' : job.status === 'accepted' ? 'Accepted. ' : 'Invoiced. ') + 'Showing the quote as ' + (sent ? 'sent on ' + QCPdf.fmtDate(qSent) : 'accepted') + '. Prices in Set-up or on the job do not change it.' + (cancelled ? '' : ' Revise quote reopens it as the next revision.')) + '</p></div>';
    var warn = jobWarnings(job, view); if (warn.length && (view.lines || []).length) html += '<div class="card"><ul class="hint" style="margin:0;padding-left:1.2em">' + warn.map(function (x) { return '<li class="confirm">' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    if (!job.client.name || !(job.client.phone || job.client.email)) html += '<div class="card"><h3>Client</h3><div class="g2"><label class="f">Name<input type="text" data-bind="client.name"></label><label class="f">Mobile<input type="tel" data-bind="client.phone"></label></div><label class="f">Email<input type="email" data-bind="client.email"></label><label class="f">Job address<span>include postcode</span><input type="text" data-bind="client.address" data-refresh="1"></label><label class="f">Description<input type="text" data-bind="summary" placeholder="Repaint lounge and hall"></label></div>';
    var showRates = !!det.show_rates;
    html += '<div class="card"><p class="hint" id="copynote">Your copy. ' + esc(who) + ' sees ' + (showRates ? 'the same lines and prices.' : 'room totals only.') + '</p><table><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Amount</th></tr></thead><tbody>' + (view.lines || []).map(function (l) { return '<tr><td>' + (l.room && l.room !== 'Extras' && l.room !== 'Travel' && l.room !== 'Adjustments' ? '<span class="tag">' + esc(l.group || l.room) + '</span><br>' : '') + esc(l.client_desc || l.desc) + (l.confirm ? ' <span class="confirm">TO CONFIRM</span>' : '') + '<br><span class="hint">' + esc(l.source || '') + (l.rate ? ' · ' + rateFmt(l.rate) + '/' + esc(l.unit) : '') + '</span></td><td class="n">' + l.qty + ' ' + esc(l.unit) + '</td><td class="n">' + money(l.amount) + '</td></tr>'; }).join('') + '</tbody><tfoot>' +
      '<tr class="sub"><td colspan="2" class="n">Subtotal' + (view.minimum_applied ? ' (minimum job)' : '') + '</td><td class="n">' + money(view.subtotal) + '</td></tr>' + (view.gst ? '<tr class="sub"><td colspan="2" class="n">GST 10%</td><td class="n">' + money(view.gst) + '</td></tr>' : '') + '<tr class="total"><td colspan="2" class="n">Total' + (view.gst ? ' inc GST' : '') + '</td><td class="n">' + money(view.total) + '</td></tr></tfoot></table>';
    if ((view.options || []).length) html += '<div><b style="font-size:.9rem">Options, not in the total</b><table>' + view.options.map(function (o) { return '<tr><td>' + esc(o.desc) + (o.confirm ? ' <span class="confirm">TO CONFIRM</span>' : '') + '</td><td class="n">' + o.qty + ' ' + esc(o.unit) + '</td><td class="n">' + money(o.amount) + (view.gst ? ' + GST' : '') + '</td></tr>'; }).join('') + '</table></div>';
    var depTxt = view.deposit > 0 ? 'Deposit' + (view.deposit_pct != null ? ' ' + view.deposit_pct + '%' : '') + ': ' + amtS(view.deposit) + (view.deposit_capped && view.deposit_cap ? ' (held at the legal limit, ' + esc(view.deposit_cap.reason || '') + ')' : '') + '. Balance ' + balDaysFor(job) + ' days after completion.' : 'No deposit. Payment ' + balDaysFor(job) + ' days after completion.';
    html += '<p class="hint">' + (view.measured_rooms ? view.measured_rooms + ' of ' + view.total_rooms + ' rooms measured from photos. ' : (view.total_rooms ? 'Fixed price. ' : '')) + depTxt + '</p>';
    if ((view.assumptions || []).length) html += '<div><b style="font-size:.9rem">Based on</b><ul class="hint">' + view.assumptions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>';
    html += '</div>';
    // private costing stays behind a tap: the phone is often turned round to show the client the total
    if (live.cost && live.lines.length) html += '<div class="card"><div class="row"><button class="btn ghost sm" id="showcost">Show my costs</button></div><div id="costcard" hidden><b style="font-size:.9rem">' + live.cost.hours.toFixed(1) + ' hours (' + bookDays(job, live) + ' day' + (bookDays(job, live) === 1 ? '' : 's') + ' with ' + crewSize() + ' on the tools), ' + Object.keys(live.cost.litres || {}).map(function (k) { var t = live.cost.tins && live.cost.tins[k]; return live.cost.litres[k].toFixed(1) + ' L ' + k + (t && t.label ? ' (' + t.label + ')' : ''); }).join(', ') + '</b><p class="hint">Labour ' + money(live.cost.labour) + ', paint ' + money(live.cost.paint) + (live.cost.tins && S.costing.charge_tins ? ' in tins' : '') + (live.cost.other ? ', other ' + money(live.cost.other) : '') + ' = cost ' + money(live.cost.cost) + '. Margin ' + money(live.cost.margin) + ' (' + live.cost.margin_pct + '% of price). Not on ' + esc(posName) + ' copy.</p><div class="row"><button class="btn ghost sm" id="sharemat">Share paint list</button></div></div></div>';
    var ddep = job.status === 'accepted' ? draftedDeposit(job) : null;
    if (ddep) html += '<div class="card" id="depdraft"><h3>Deposit invoice ' + esc(ddep.no) + ', ' + amtS(ddep.total) + '</h3><p class="hint">Written when you marked it accepted, due ' + QCPdf.fmtDate(ddep.due) + '. Not sent yet.</p><div class="row"><a class="btn tape sm" href="#/job/' + job.id + '/invoice?send=' + encodeURIComponent(ddep.no) + '">Send it to ' + esc(whoShort) + '</a><button class="btn ghost sm" id="depnotyet">Not yet</button></div></div>';
    if (job.acceptance) html += '<div class="card"><h3>Acceptance</h3><div class="g3"><label class="f">How<select data-bind="acceptance.how">' + HOWS.map(function (h) { return '<option value="' + h + '">' + h + '</option>'; }).join('') + '</select></label><label class="f">Date<input type="date" data-bind="acceptance.date"></label><label class="f">By<input type="text" data-bind="acceptance.by" placeholder="who said yes"></label></div><label class="f">Their words<span>paste it, or note the call</span><textarea data-bind="acceptance.note" rows="2"></textarea></label></div>';
    var autoSend = (QCMsg.ready('email') && job.client.email && S.sending.email_quotes !== false), autoFu = job.auto_follow_ups !== false && !(job.hold && job.hold.on) && ((S.sending.auto_sms && QCMsg.ready('sms') && job.client.phone) || (S.sending.auto_email && QCMsg.ready('email') && job.client.email));
    var sendLabel = !sent ? 'Send to ' + esc(whoShort) : (changed ? 'Send revision ' + ((q.version || 1) + 1) + ' to ' + esc(whoShort) : 'Send again to ' + esc(whoShort));
    var sendNote = locked ? 'Send again sends the quote exactly as accepted. ' : autoSend ? 'Emails the quote to ' + esc(job.client.email) + ' from here. ' : 'You press send in <b>Messages</b> or <b>Mail</b>. ';
    if (!locked && !cancelled && (job.status === 'quoted' || job.status === 'draft')) { if (job.hold && job.hold.on) sendNote += 'Reminders on hold. '; else if (autoFu) sendNote += 'Follow-up ' + (S.sending.auto_sms && QCMsg.ready('sms') && job.client.phone ? 'texts' : 'emails') + ' go out by themselves ' + (S.follow_up.quote_days || []).join(', ') + ' days after it is sent. '; }
    html += '<div class="card"><div class="row" id="sendrow">' + (cancelled ? '' : '<button class="btn ghost" id="lookq">Look at the quote</button><button class="btn tape" id="pdf">' + sendLabel + '</button>') + '</div><p class="hint">' + sendNote + '</p>' +
      '<div class="row" id="afterSend" ' + (sent && job.status === 'quoted' ? '' : 'hidden') + '>' + ((QCMsg.ready('sms') && job.client.phone) || (QCMsg.ready('email') && job.client.email) ? '<button class="btn sm" id="autofu">Schedule follow-ups (' + (QCMsg.ready('sms') && S.sending.auto_sms && job.client.phone ? 'SMS' : 'email') + ')</button>' : (QCMsg.ready('sms') || QCMsg.ready('email') ? '<span class="hint">Add a mobile or email to schedule follow-ups.</span>' : '')) + '<button class="btn ghost sm" id="remind">Calendar reminders</button></div>' +
      (QCMsg.ready('email') && job.client.email && !cancelled ? '<div class="row"><button class="btn sm" id="emailq">Email to ' + esc(job.client.email) + (job.emailed_date ? ' again' : '') + '</button></div>' : '') +
      (job.follow_up_error ? '<p class="confirm">' + esc(job.follow_up_error) + '</p>' : '') + (function () { var pd = pendingFollowUps(job), wt = waitingFollowUps(job).filter(function (q) { return !q.inv; }).sort(bySendAt); if (!pd.length && !wt.length) return ''; return '<p class="hint">' + (pd.length ? 'Booked: ' + pd.map(function (x) { return QCPdf.fmtDate(x.day) + ' by ' + esc(x.channel); }).join(', ') + '. ' : '') + (wt.length ? 'Then ' + wt.map(function (q) { return QCPdf.fmtDate(q.day); }).join(' and ') + ', booked as each one falls due, so each costs a message only when it is needed. ' : '') + 'All of it stops when the quote is accepted or declined.</p>'; })() +
      '<div class="row"><button class="btn ghost" id="sharetext">Share summary</button>' + (locked && !cancelled ? '<button class="btn ghost" id="revise">Revise quote</button>' : '') + '</div>' +
      '<div class="row">' + (seats().seats > 1 ? '<button class="btn ghost sm" id="handoff">Send to the other phone</button>' : '') + (job.status === 'quoted' ? '<button class="btn sm" id="accepted">Accepted</button><button class="btn ghost sm" id="declined">Declined</button>' : job.status === 'draft' ? '<span class="hint">Once it has gone to ' + esc(whoShort) + ', mark it accepted here.</span>' : job.status === 'declined' ? '<button class="btn sm" id="reopen">Reopen quote</button>' : '') + (job.status === 'accepted' || job.status === 'invoiced' || job.status === 'paid' ? '<a class="btn sm" href="#/job/' + job.id + '/invoice">Invoice</a>' + (job.booking ? '' : '<button class="btn tape sm" id="book">Book</button>') : '') + '</div>';
    // booking: A1 owns the form (bookBox / wireBooking); the old markup stays as the fallback
    var canBook = job.status === 'accepted' || job.status === 'invoiced' || job.status === 'paid';
    if (canBook && typeof bookBox === 'function') { try { html += bookBox(job) || ''; } catch (e) { html += '<p class="confirm">Booking box failed: ' + esc(e.message) + '</p>'; } }
    else html += (job.booking ? '<p class="hint">Booked ' + QCPdf.fmtDate(job.booking.start) + (job.booking.days > 1 ? ' for ' + job.booking.days + ' days' : '') + '. <a href="' + esc(job.booking.gcal) + '" target="_blank" rel="noopener">Google Calendar</a> <button class="btn ghost sm" id="rebook2">Change</button></p>' : '') +
      '<div id="bookbox" class="scalebox" hidden><b>Book</b><div class="g3"><label class="f">Start<input type="date" id="bk_start"></label><label class="f">Days<span>' + crewSize() + ' on the tools, ' + hoursPerDay() + ' h a day</span><input type="number" id="bk_days" min="1" value="' + bookDays(job, live) + '"></label><label class="f">Start time<span>hour</span><input type="number" id="bk_hour" min="5" max="12" value="' + esc(S.booking.start_hour) + '"></label></div><div class="row"><button class="btn tape sm" id="bk_go">Book these days</button><span class="hint">Goes into your phone calendar. Nothing is sent to ' + esc(whoShort) + '.</span></div></div>';
    html += '</div>';
    // footer: the truth about sending
    var foot = sent ? 'Sent to ' + esc(who) + (howWord(job.sent_how) ? ' ' + howWord(job.sent_how) : '') + ', ' + fmtShort(qSent) + '.' : (job.handed_at ? 'Handed to your phone ' + fmtShort(job.handed_at) + '. Not sent yet.' : 'Not sent yet.');
    if (q && !sent && q.version > 1 && job.sent_date) foot += ' Revision ' + (q.version - 1) + ' went to ' + esc(who) + ' ' + howWord(job.sent_how) + ', ' + fmtShort(job.sent_date) + '.';
    if (q && !sent) foot += ' ' + esc(q.number || job.quote_no) + ', ' + QCPdf.fmtDate(q.date) + '.';
    html += '<p class="hint" id="sentfoot">' + foot + '</p>';
    $app.innerHTML = html; bindAll($app, job); wireAddress($app.querySelector('[data-bind="client.address"]'), function (pl) { if (job.id) { siteFromPlace(job, pl); save(); } });
    refreshPreview = function () { viewQuote(job, true); };
    var sm = document.getElementById('sharemat'); if (sm) sm.addEventListener('click', function () { var t = typeof materialsText === 'function' ? materialsText(live, job) : ''; if (navigator.share) navigator.share({ text: t }).catch(function () {}); else { navigator.clipboard && navigator.clipboard.writeText(t); toast('Copied'); } });
    var sc = document.getElementById('showcost'); if (sc) sc.addEventListener('click', function () { var c = document.getElementById('costcard'); c.hidden = !c.hidden; sc.textContent = c.hidden ? 'Show my costs' : 'Hide my costs'; });
    // what stops a quote going out: nobody to send it to, nothing on it, unpriced lines, no ABN on a GST quote, no business name. Shown inline next to Send and it stays.
    function sendBlock() {
      if (!job.client.name) return { msg: 'Add the client name before sending.' }; if (!job.client.phone && !job.client.email) return { msg: 'Add a mobile or email for ' + who + ' before sending.' };
      if (!det.trading_name) return { msg: 'Your business name is missing from the quote. Type it here:', field: 'trading_name', ph: 'Business or trading name' };
      if (locked) return null;
      if (!live.lines.length || !(live.total > 0)) return { msg: 'Nothing to quote yet. Add a room or an extra.' };
      if (live.confirm.length) return { msg: live.confirm.length + ' line' + (live.confirm.length > 1 ? 's' : '') + ' marked TO CONFIRM: ' + live.confirm.join('; ') + '. Price ' + (live.confirm.length > 1 ? 'them' : 'it') + ' on the job or remove ' + (live.confirm.length > 1 ? 'them' : 'it') + ' before sending.' };
      if (det.gst && !det.abn) return { msg: 'ABN missing. A GST quote needs it. Type it here:', field: 'abn', ph: '12 345 678 901' }; return null;
    }
    function showSendBlock(b) {
      var el = blockNext(document.getElementById('sendrow'), 'sendblock', b ? b.msg : '', b && b.field ? '<span class="row" style="margin-top:6px"><input type="text" id="blk_in" placeholder="' + esc(b.ph) + '" style="flex:1 1 10em"><button class="btn sm" id="blk_save">Save</button></span>' : '');
      if (el && b && b.field) { var inp = document.getElementById('blk_in'), sv = document.getElementById('blk_save'); var doSave = function () { var v = inp.value.trim(); if (!v) { inp.focus(); return; } S.details[b.field] = v; save(); toast('Saved'); viewQuote(job, true); }; sv.addEventListener('click', doSave); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSave(); }); }
      return el;
    }
    var bankNote = document.getElementById('sendrow'); if (bankNote && !cancelled && !det.bsb && !det.account_number) { var bn = document.createElement('p'); bn.className = 'hint'; bn.id = 'banknote'; bn.innerHTML = 'Bank details missing, so the quote and invoices cannot say where to pay. <a href="#/settings">Add them in Set-up</a>.'; bankNote.parentNode.insertBefore(bn, bankNote.nextSibling); }
    if (!cancelled) showSendBlock(sendBlock());
    // A job is not one message: the quote goes, and the first chase-up is booked behind it. Say so before he sends,
    // so he is never surprised by a quote that went out with no chasing behind it.
    (function () {
      var row = document.getElementById('sendrow'); if (!row || cancelled || locked) return;
      var chasing = job.status !== 'accepted' && job.auto_follow_ups !== false && !(job.hold && job.hold.on) && (QCMsg.ready('sms') || QCMsg.ready('email'));
      var left = messagesLeft(); if (!chasing || left == null || left >= 2 || pendingFollowUps(job).length) return;
      var paid = QCMsg.balance().plan === 'paid';
      var n = document.createElement('p'); n.className = 'hint'; n.id = 'shortnote';
      n.innerHTML = (left <= 0 ? 'No messages left. ' : 'One message left, and this job needs two: the quote, then the first chase-up behind it. ')
        + 'Send it and ' + (left <= 0 ? 'the quote and every chase-up wait for you to tap Send yourself' : 'the quote goes, but the chase-up waits for you to tap Send yourself')
        + '. That never stops working and never costs anything. ' + (paid ? '<a href="#" id="shortup">Top up ' + TOPUP_MESSAGES + ' for $' + TOPUP_PRICE + '</a> and it chases her by itself.' : '<a href="#/settings">Set-up</a> if you want it chasing by itself.');
      row.parentNode.insertBefore(n, row.nextSibling);
      var up = document.getElementById('shortup'); if (up) up.addEventListener('click', function (e) {
        e.preventDefault(); toast('Charging your card\u2026');
        topUp({ buy: true }).then(function (j) { toast(j.messages + ' messages added, $' + j.charged + ' charged.'); viewQuote(job, true); }).catch(function (err) { toast(err.needsCard ? 'Your card needs a look. Set-up, then Manage.' : err.message); });
      });
    })();
    function quoteDoc() { return QCPdf.quotePDF(job, S, job.quote || live); }
    function afterSend() { if (job.status === 'quoted' && job.auto_follow_ups !== false && !(job.hold && job.hold.on) && (QCMsg.ready('sms') || QCMsg.ready('email')) && !pendingFollowUps(job).length) return scheduleFollowUps(job, 'quote'); }
    function onQuoteResult(r) { job.handed_at = ''; job.handed_how = ''; if (r && r.sent) { markQuoteSent(job, r.how); Promise.resolve(afterSend()).then(function () { viewQuote(job, true); }); } else { save(); viewQuote(job, true); } }
    function handQuote(opts) {
      opts = opts || {}; var d; try { d = quoteDoc(); } catch (e) { toast('Could not make the quote: ' + e.message); return; }
      handOff({ kind: 'quote', doc: d, title: (job.quote && job.quote.number) || job.quote_no, filename: ((job.quote && job.quote.number) || job.quote_no) + ' ' + (job.client.name || 'quote').replace(/[^\w ]+/g, '') + '.pdf', whoName: whoShort, whoPhone: job.client.phone, whoEmail: job.client.email, job: job, ref: 'quote-' + ((job.quote && job.quote.number) || job.quote_no), anchor: 'pdf', canSend: opts.canSend !== false, note: opts.note,
        onHanded: function (r) { job.handed_at = new Date().toISOString(); job.handed_how = r.how; save(); }, onResult: onQuoteResult });
    }
    var sendQuote = function () {
      var b = sendBlock(); if (b) { var el = showSendBlock(b); if (el) { try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} } return; }
      if (!freeze(job, live).ok) return; // snapshot or revision; nothing is marked sent here
      // with a relay and a client email, Send means send: it emails the quote; the phone's menu is the fallback
      if (autoSend) { emailQuoteNow(job, job.quote).then(function (ok) { if (ok) return Promise.resolve(afterSend()).then(function () { viewQuote(job, true); }); handQuote(); }); return; }
      handQuote();
    };
    var pdfBtn = document.getElementById('pdf'); if (pdfBtn) pdfBtn.addEventListener('click', sendQuote);
    var lk = document.getElementById('lookq'); if (lk) lk.addEventListener('click', function () {
      if (!locked && !(live.lines || []).length) { showSendBlock({ msg: 'Nothing to show yet. Add a room or an extra.' }); return; }
      var b = sendBlock();
      if (b) { showSendBlock(b); if (!job.quote) { try { freeze(job, live); } catch (e) {} } if (!job.quote) return; handQuote({ canSend: false, note: 'Just a look. ' + b.msg.replace(/ Type it here:$/, '') }); return; }
      if (changed) { handQuote({ canSend: false, note: 'This is the quote as sent on ' + fmtShort(qSent) + '. Close, then tap Send to issue revision ' + ((q.version || 1) + 1) + ' with the changes.' }); return; }
      if (!freeze(job, live).ok) return; handQuote();
    });
    var rv = document.getElementById('revise'); if (rv) rv.addEventListener('click', function () { if (!confirm('Revise the quote? It reopens for changes and the next send goes out as revision ' + ((q.version || 1) + 1) + '. Invoices already issued stay as they are.')) return; job.status = 'quoted'; save(); toast('Quote reopened'); viewQuote(job, true); });
    var rem = document.getElementById('remind'); if (rem) rem.addEventListener('click', function () { followUpIcs(job, 'quote'); });
    var afu = document.getElementById('autofu'); if (afu) afu.addEventListener('click', function () { if (job.hold && job.hold.on) { toast('Reminders are on hold for this job.'); return; } if (!freeze(job, live).ok) return; afu.disabled = true; scheduleFollowUps(job, 'quote').then(function () { viewQuote(job, true); }); });
    var eq = document.getElementById('emailq'); if (eq) eq.addEventListener('click', function () { var b = sendBlock(); if (b) { showSendBlock(b); return; } if (!freeze(job, live).ok) return; eq.disabled = true; emailQuoteNow(job, job.quote).then(function (ok) { if (ok) return afterSend(); }).then(function () { viewQuote(job, true); }); });
    if (canBook && typeof wireBooking === 'function') { try { wireBooking($app, job); } catch (e) { toast('Booking box failed: ' + e.message); } }
    else {
      var bk = document.getElementById('book'); if (bk) bk.addEventListener('click', function () { var box = document.getElementById('bookbox'); box.hidden = false; document.getElementById('bk_start').value = QCStore.addDays(QCStore.today(), 7); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
      var bd = document.getElementById('bk_days'); if (bd) bd.addEventListener('input', function () { var v = parseInt(bd.value, 10); if (v >= 1) { job.booking_days = v; save(); } });
      var rb2 = document.getElementById('rebook2'); if (rb2) rb2.addEventListener('click', function () { job.booking = null; save(); viewQuote(job, true); });
      var bg = document.getElementById('bk_go'); if (bg) bg.addEventListener('click', function () { var start = document.getElementById('bk_start').value, days = Math.max(1, parseInt(document.getElementById('bk_days').value, 10) || 1), hour = parseInt(document.getElementById('bk_hour').value, 10) || 7; if (!start) { toast('Pick a start date'); return; } job.booking_days = days; bookJob(job, start, days, hour); });
    }
    document.getElementById('sharetext').addEventListener('click', function () {
      if (!locked && !sendBlock()) { if (!freeze(job, live).ok) return; }
      var v2 = job.quote || live, valid = QCStore.addDays((job.quote && job.quote.date) || QCStore.today(), parseInt(det.quote_valid_days, 10) || 30);
      var t = 'Quote ' + ((job.quote && job.quote.number) || job.quote_no) + (job.summary ? ' for ' + job.summary : '') + '\nTotal ' + money(v2.total) + (v2.gst ? ' inc GST' : '') + '.' + (v2.deposit > 0 ? ' Deposit ' + amtS(v2.deposit) + ' to book.' : ' No deposit.') + '\nValid until ' + QCPdf.fmtDate(valid) + '.\n' + signLine();
      handOff({ kind: 'summary', text: t, whoName: whoShort, whoPhone: job.client.phone, whoEmail: job.client.email, job: job, ref: 'summary-' + job.quote_no, look: false, ask: false });
    });
    var acc = document.getElementById('accepted'); if (acc) acc.addEventListener('click', function () { job.status = 'accepted'; job.acceptance = { date: QCStore.today(), how: job.sent_how === 'email' ? 'email' : 'text', note: '', by: job.client.first_name || job.client.name || '' }; save(); var dinv = draftDepositInvoice(job); cancelQuoteFollowUps(job).then(function () { viewQuote(job, true); toast(dinv ? 'Accepted. Deposit invoice ' + dinv.no + ' for ' + amtS(dinv.total) + ' is written.' : (S.details.gst && !S.details.abn && depositFor(job, (job.quote || {}).total || 0).amount > 0 ? 'Accepted. Add your ABN in Set-up and the deposit invoice can be written.' : 'Accepted. Note how they said yes.')); }); });
    var hof = document.getElementById('handoff'); if (hof) hof.addEventListener('click', function () { go('/handoff/' + job.id); });
    var dny = document.getElementById('depnotyet'); if (dny && ddep) dny.addEventListener('click', function () { ddep.draft_dismissed = true; save(); toast('It is on the Invoice page when you want it.'); viewQuote(job, true); });
    var dec = document.getElementById('declined'); if (dec) dec.addEventListener('click', function () { job.status = 'declined'; save(); cancelQuoteFollowUps(job).then(function () { viewQuote(job, true); }); });
    var ro = document.getElementById('reopen'); if (ro) ro.addEventListener('click', function () { job.status = 'quoted'; save(); toast('Quote reopened'); viewQuote(job, true); });
    // handed to the phone but never answered (the app was left mid-way): ask again
    if (job.handed_at && !cancelled && document.getElementById('pdf')) didItGo({ whoName: whoShort, word: 'quote', handed: job.handed_how || 'shared', anchor: 'pdf', onResult: onQuoteResult });
    if (!keep) window.scrollTo(0, 0); // the quote screen opens at the top, whatever scrolled itself into view while drawing
  }
  function crewSize() { var c = parseFloat(S.costing && S.costing.crew); return c >= 1 ? Math.round(c) : 1; }
  function hoursPerDay() { var h = parseFloat(S.costing && S.costing.hours_per_day); return h > 0 ? h : 8; }
  // days on site: the painter's last edit if any, else hours over crew and hours per day
  function bookDays(job, priced) { if (job.booking_days >= 1) return job.booking_days; var hrs = priced && priced.cost ? priced.cost.hours : 0; if (!(hrs > 0)) return 1; return Math.max(1, Math.ceil(hrs / (hoursPerDay() * crewSize()) - 0.2)); }

  // ---------- Invoice
  // Deposit, any number of progress claims, then the final (quote lines + numbered variations, less what was invoiced before). Cents kept. Numbers are never reused: void keeps the number.
  var PAY_METHODS = [['transfer', 'Bank transfer'], ['cash', 'Cash'], ['card', 'Card'], ['other', 'Other']];
  function methodLabel(m) { var f = PAY_METHODS.filter(function (x) { return x[0] === m; })[0]; return f ? f[1] : (m === 'refund' ? 'Refund' : m === 'credit' ? 'Credit' : 'Other'); }
  function invPill(i) { if (i.void) return '<span class="pill bad">void</span>'; var b = invBal(i); if (b <= 0.004 && (i.total > 0 || invPaid(i) > 0)) return '<span class="pill ok">paid</span>'; if (invPaid(i) > 0) return '<span class="pill warn">part paid</span>'; return i.due < QCStore.today() ? '<span class="pill bad">overdue</span>' : '<span class="pill">unpaid</span>'; }
  function viewInvoice(job, keep, qs) {
    if (!job.quote) return bounce('/job/' + job.id + '/quote');
    if (job.status === 'declined') { toast('Quote is declined. Reopen it and mark it accepted first.'); return bounce('/job/' + job.id + '/quote'); }
    if (job.status === 'draft' || job.status === 'quoted') { toast('Mark the quote accepted first.'); return bounce('/job/' + job.id + '/quote'); }
    if (!keep) window.scrollTo(0, 0);
    var det = S.details, q = job.quote, gstOn = !!det.gst, live = liveInvoices(job), today = QCStore.today(), cancelled = job.status === 'cancelled', whoShort = dispName(job) || 'them', who = dispName(job) || 'the client';
    var issued = live.filter(function (i) { return !isDraft(i); }), draft = live.filter(isDraft)[0] || null;
    var deps = issued.filter(function (i) { return i.kind === 'deposit'; }), progs = issued.filter(function (i) { return i.kind === 'progress'; }), finals = live.filter(function (i) { return i.kind === 'final' || i.kind === 'full'; }), hasFinal = finals.length > 0;
    var agreed = (job.variations || []).filter(function (v) { return v.status === 'agreed'; }), unInv = agreed.filter(function (v) { return !v.invoiced; });
    var dep = depositFor(job, q.total), credit = jobCredit(job), owing = jobOwing(job);
    var varInc = r2(unInv.reduce(function (s2, v) { return s2 + v.amount; }, 0) * (gstOn ? 1.1 : 1)), jobTotal = r2(q.total + varInc), billed = r2(issued.reduce(function (s2, i) { return s2 + i.total; }, 0)), leftToBill = hasFinal ? 0 : Math.max(0, r2(jobTotal - billed));
    var clientKey = function (j) { return String((j.client && j.client.name) || '').trim().toLowerCase(); }, myKey = clientKey(job);
    var clientJobs = myKey ? S.jobs.filter(function (j) { return clientKey(j) === myKey && (j.invoices || []).length; }) : [job]; if (!clientJobs.length) clientJobs = [job];
    var html = '<a class="hint" href="#/job/' + job.id + '/quote">&larr; Quote</a><div class="row between"><h1>Invoices</h1>' + statusPill(job) + '</div>';
    if (cancelled) html += '<p class="hint">Cancelled. Invoices stay on record.</p>';
    if (credit > 0) html += '<div class="card"><div class="row between"><div><b>Credit on account ' + amt(credit) + '</b><span class="hint"> overpaid, or a credit</span></div><button class="btn sm" id="refund">Refund</button></div><div id="refundbox" class="scalebox" hidden><div class="g3"><label class="f">Amount<input type="number" step="0.01" id="rf_amt" value="' + credit + '"></label><label class="f">Date<input type="date" id="rf_date" value="' + today + '"></label><label class="f">Reference<input type="text" id="rf_ref" placeholder="bank ref"></label></div><div class="row"><button class="btn tape sm" id="rf_go">Record refund</button></div></div>' + (hasFinal || cancelled ? '' : '<p class="hint">Or tick Apply credit on the next invoice.</p>') + '</div>';
    if (job.invoices.length) {
      html += '<div class="card"><h3>Invoices</h3>' + job.invoices.map(function (i, k) {
        var bal = invBal(i), paid = invPaid(i), cr = invCredits(i), pend = (i.follow_ups || []).filter(function (x) { return x.id && !x.cancelled && x.day >= today; }).length;
        var s = '<div data-inv="' + k + '" style="border-top:1px solid var(--line);padding-top:8px;display:grid;gap:6px"><div class="row between"><div><b>' + esc(i.no) + '</b> <span class="hint">' + kindLabel(i) + ', ' + QCPdf.fmtDate(i.date) + ', due ' + QCPdf.fmtDate(i.due) + '</span></div><div style="text-align:right"><b>' + amt(i.total) + '</b><br>' + invPill(i) + '</div></div>';
        var bits = []; if (i.void) bits.push('Cancelled (void) ' + QCPdf.fmtDate(i.void.date) + (i.void.reason ? ': ' + esc(i.void.reason) : '')); else { if (paid > 0) bits.push('Paid ' + amt(paid)); if (cr > 0) bits.push('Credited ' + amt(cr)); if (bal > 0.004) bits.push('Balance ' + amt(bal)); if (bal < -0.004) bits.push('Overpaid ' + amt(-bal)); }
        if (i.deposit_invoice_no) bits.push('Less deposit ' + esc(i.deposit_invoice_no)); if (i.pay_url && /^https:\/\//.test(i.pay_url)) bits.push('<a href="' + esc(i.pay_url) + '" target="_blank" rel="noopener">card link</a>'); if (i.follow_up_error) bits.push('<span class="confirm">reminders not scheduled: ' + esc(i.follow_up_error) + '</span>'); if (pend) bits.push(pend + ' reminder' + (pend > 1 ? 's' : '') + ' pending');
        if (bits.length) s += '<p class="hint">' + bits.join(' · ') + '</p>';
        if (!i.void) s += '<p class="hint" id="sentline_' + k + '">' + (i.sent_date ? 'Sent to ' + esc(who) + (howWord(i.sent_how) ? ' ' + howWord(i.sent_how) : '') + ', ' + fmtShort(i.sent_date) + '.' : i.emailed_date ? 'Emailed to ' + esc(who) + ' ' + fmtShort(i.emailed_date) + '.' : i.sent_confirmed === false ? (i.handed_at ? 'Handed to your phone ' + fmtShort(i.handed_at) + '. Not sent yet.' : i.drafted ? 'Written when the quote was accepted. Not sent yet.' : 'Not sent yet.') : '') + (i.kind === 'deposit' && !i.paid_date && bal > 0.004 ? ' Deposit not paid yet. When it is, tap Record payment.' : '') + '</p>';
        s += (i.payments || []).map(function (p, pi) { return '<div class="row between hint"><span class="row">' + QCPdf.fmtDate(p.date) + ' ' + methodLabel(p.method) + (p.ref ? ', ' + esc(p.ref) : '') + ' · ' + amt(p.amount) + (p.amount > 0 && p.method !== 'credit' ? '<button class="btn ghost sm" data-rcpt="' + k + ':' + pi + '">Receipt</button>' : '') + '</span>' + (i.void || p.method === 'credit' ? '' : '<button class="btn ghost sm" data-payrm="' + k + ':' + pi + '" style="margin-left:auto">Undo payment</button>') + '</div>'; }).join('');
        s += (i.credit_notes || []).map(function (c, ci) { return '<div class="row between hint"><span>' + esc(c.no) + ' credit ' + QCPdf.fmtDate(c.date) + (c.reason ? ', ' + esc(c.reason) : '') + '</span><span class="row">-' + amt(c.amount) + '<button class="btn ghost sm" data-cnpdf="' + k + ':' + ci + '">Look at it</button></span></div>'; }).join('');
        s += '<div class="row" id="invrow_' + k + '"><button class="btn ghost sm" data-repdf="' + k + '">Look at the invoice</button>' + (!i.void && !cancelled ? '<button class="btn sm" id="sendinv_' + k + '" data-sendinv="' + k + '">' + (i.sent_date || i.emailed_date ? 'Send again' : 'Send') + ' to ' + esc(whoShort) + '</button>' : '') + (!i.void && bal > 0.004 ? '<button class="btn sm" data-paid="' + k + '">Record payment</button>' : '') + (!i.void && !(i.payments || []).length && !(i.credit_notes || []).length ? '<button class="btn ghost sm" data-void="' + k + '">Cancel this invoice</button>' : '') + (!i.void && i.paid_date && !(i.credit_notes || []).length ? '<button class="btn ghost sm" data-cn="' + k + '">Refund or credit</button>' : '') + '</div>';
        s += '<div id="payform_' + k + '" class="scalebox" hidden><b>Record payment on ' + esc(i.no) + '</b><div class="g2"><label class="f">Date<input type="date" id="pay_date_' + k + '" value="' + today + '"></label><label class="f">Amount<input type="number" step="0.01" id="pay_amt_' + k + '" value="' + (bal > 0 ? bal : '') + '"></label><label class="f">How<select id="pay_how_' + k + '">' + PAY_METHODS.map(function (m) { return '<option value="' + m[0] + '">' + m[1] + '</option>'; }).join('') + '</select></label><label class="f">Reference<input type="text" id="pay_ref_' + k + '" placeholder="bank ref, receipt no"></label></div><div class="row"><button class="btn tape sm" data-paygo="' + k + '">Save payment</button></div><div id="split_' + k + '" hidden></div></div>';
        s += '<div id="voidform_' + k + '" class="scalebox" hidden><b>Cancel invoice ' + esc(i.no) + '</b><span class="hint">Stamped VOID, number kept. Nothing is sent to ' + esc(whoShort) + '.</span><label class="f">Why<input type="text" id="void_why_' + k + '" placeholder="Wrong amount, reissued as INV-..."></label><div class="row"><button class="btn danger sm" data-voidgo="' + k + '">Yes, cancel this invoice</button></div></div>';
        s += '<div id="cnform_' + k + '" class="scalebox" hidden><b>Refund or credit on ' + esc(i.no) + '</b><span class="hint">Becomes a credit on the job.</span><div class="g2"><label class="f">Amount inc GST<input type="number" step="0.01" min="0.01" id="cn_amt_' + k + '" value="' + i.total + '"></label><label class="f">Why<input type="text" id="cn_why_' + k + '" placeholder="Work not done, agreed discount"></label></div><div class="row"><button class="btn tape sm" data-cngo="' + k + '">Issue the credit</button></div></div>';
        return s + '</div>';
      }).join('') + (owing > 0 ? '<p class="hint">Owing on this job: ' + amt(owing) + (leftToBill > 0 ? ' (plus ' + amt(leftToBill) + ' not invoiced yet)' : '') + '.</p>' : '') + '</div>';
    }
    var kinds = [];
    if (!cancelled) {
      if (!hasFinal) { if (dep.pct > 0 && !deps.length && !progs.length && !draft) kinds.push(['deposit', 'Deposit, ' + dep.pct + '% of the quote (' + amt(dep.amount) + ')']); kinds.push(['progress', 'Part payment (progress claim)' + (progs.length ? ' ' + (progs.length + 1) : '')]); kinds.push(['final', 'Final' + (deps.length || progs.length ? ', the balance' : ', the full amount') + (unInv.length ? ' plus ' + unInv.length + ' variation' + (unInv.length > 1 ? 's' : '') : '')]); }
      else if (unInv.length) kinds.push(['variations', unInv.length + ' agreed variation' + (unInv.length > 1 ? 's' : '') + ' not yet invoiced']);
    }
    var defKind = kinds.some(function (k) { return k[0] === 'deposit'; }) ? 'deposit' : kinds.some(function (k) { return k[0] === 'final'; }) ? 'final' : (kinds[0] ? kinds[0][0] : ''), formOpen = !issued.length;
    if (!kinds.length) html += '<div class="card"><p class="muted">' + (cancelled ? 'No new invoices on a cancelled job.' : 'Final invoice ' + esc(finals[finals.length - 1].no) + ' issued.') + '</p></div>';
    else html += (formOpen ? '' : '<div class="row" id="nextrow"><button class="btn sm" id="nextinv">Next invoice</button></div>') + '<div class="card" id="newinv"' + (formOpen ? '' : ' hidden') + '><h3>New invoice</h3><label class="f">What to invoice<select id="kind">' + kinds.map(function (k) { return '<option value="' + k[0] + '"' + (k[0] === defKind ? ' selected' : '') + '>' + esc(k[1]) + '</option>'; }).join('') + '</select></label>' +
      '<div id="progbox" hidden><div class="g2"><label class="f">Percent of the quote<input type="number" id="prog_pct" min="1" max="100" step="1" value="' + (progs.length ? 30 : 40) + '"></label><label class="f">or amount inc GST<input type="number" id="prog_amt" step="0.01" min="0" placeholder="overrides the percent"></label></div></div>' +
      (credit > 0 ? '<label class="btn ghost sm"><input type="checkbox" id="applycredit" checked> Apply credit ' + amt(credit) + '</label>' : '') +
      '<div id="invprev"></div><p id="billline"></p><div class="row" id="mkrow"><button class="btn tape" id="mkinv">Send invoice</button>' + (cardAnyOn() ? '<span class="hint">With a Pay by card button.</span>' : (S.stripe && S.stripe.enabled ? '<span class="confirm">Card payments key not valid. Fix in Set-up.</span>' : '')) + '</div><p class="hint">You press send in Messages or Mail.</p></div>';
    var multi = clientJobs.length > 1;
    html += '<div class="row">' + (job.invoices.length ? '<button class="btn ghost sm" id="stmt">' + (multi ? 'Statement for ' + esc(job.client.name || who) + ' (' + clientJobs.length + ' jobs)' : 'Statement') + '</button>' + (multi ? '<button class="btn ghost sm" id="stmtjob">This job only</button>' : '') : '') + (job.invoices.length && S.stripe && S.stripe.enabled ? '<button class="btn sm" id="checkpay">Check payments</button>' : '') + (live.some(function (i) { return invBal(i) > 0.004; }) ? '<button class="btn ghost sm" id="invremind">Calendar reminders</button>' : '') + '</div>';
    $app.innerHTML = html;
    var exGst = function (inc) { return gstOn ? r2(inc / 1.1) : r2(inc); };
    function build() {
      var kind = document.getElementById('kind').value, lines = [], subtotal, gst, total, kindLine, varIds = [], out = { kind: kind };
      if (kind === 'deposit') { total = dep.amount; subtotal = exGst(total); gst = r2(total - subtotal); lines = [{ desc: 'Deposit, ' + dep.pct + '% of quote ' + (q.number || job.quote_no) + ' (' + amt(q.total) + ')', amount: subtotal }]; kindLine = 'Deposit to confirm your booking. Payable before we start.'; out.pct = dep.pct; }
      else if (kind === 'progress') {
        var pa = parseFloat((document.getElementById('prog_amt') || {}).value), pp = parseFloat((document.getElementById('prog_pct') || {}).value); if (!(pp > 0)) pp = 40;
        total = pa > 0 ? r2(pa) : r2(q.total * pp / 100); var pct = pa > 0 ? r2(pa / q.total * 100) : pp; subtotal = exGst(total); gst = r2(total - subtotal);
        lines = [{ desc: 'Progress claim ' + (progs.length + 1) + ', ' + pct + '% of quote ' + (q.number || job.quote_no) + ' (' + amt(q.total) + ')', amount: subtotal }]; kindLine = 'Progress claim ' + (progs.length + 1) + ' for work to date.'; out.pct = pct; out.n = progs.length + 1;
      } else {
        var varEx = 0, vars = unInv;
        if (kind === 'final') lines = (q.lines || []).map(function (l) { return { desc: (l.room && l.room !== 'Extras' && l.room !== 'Travel' && l.room !== 'Adjustments' ? l.room + ': ' : '') + (l.client_desc || l.desc), amount: r2(l.amount) }; });
        vars.forEach(function (v) { varEx = r2(varEx + v.amount); varIds.push(v.id); lines.push({ desc: 'Variation ' + v.n + ': ' + v.desc + (v.how_agreed ? ', agreed by ' + v.how_agreed : '') + (v.agreed_date ? ' ' + QCPdf.fmtDate(v.agreed_date) : ''), amount: r2(v.amount) }); });
        var varGst = gstOn ? r2(varEx * 0.1) : 0;
        if (kind === 'final') {
          var prior = deps.concat(progs), priorEx = 0, priorInc = 0;
          // the client paid the inc-GST figure; the line takes off the ex-GST part and GST is worked out on what is left, so both numbers are shown
          prior.forEach(function (i) { var ex = r2(i.subtotal != null ? i.subtotal : exGst(i.total)); priorEx = r2(priorEx + ex); priorInc = r2(priorInc + i.total); lines.push({ desc: 'Less ' + (i.kind === 'deposit' ? 'deposit' : 'progress claim') + (i.paid_date ? ' paid' : ' invoiced') + ', ' + i.no + ' dated ' + QCPdf.fmtDate(i.date) + ' (' + amt(i.total) + (gstOn ? ' inc GST, ' + amt(ex) + ' before GST' : '') + ')', amount: -ex }); });
          subtotal = r2(q.subtotal + varEx - priorEx); total = r2(q.total + varEx + varGst - priorInc); gst = gstOn ? r2(total - subtotal) : 0; if (!gstOn) total = subtotal;
          kindLine = 'Final invoice on completion' + (vars.length ? ', including agreed variations' : '') + '.'; if (deps.length) out.deposit_invoice_no = deps.map(function (i) { return i.no; }).join(', ');
        } else { subtotal = varEx; gst = varGst; total = r2(subtotal + gst); kindLine = 'Agreed variations to quote ' + (q.number || job.quote_no) + '.'; }
      }
      out.lines = lines; out.subtotal = r2(subtotal); out.gst = r2(gst); out.total = r2(total); out.kind_line = kindLine; out.var_ids = varIds; return out;
    }
    function preview() {
      if (!document.getElementById('kind')) return; var inv = build(); document.getElementById('progbox').hidden = inv.kind !== 'progress'; var due = QCStore.addDays(today, inv.kind === 'deposit' ? depDueDays() : balDaysFor(job)); var ap = document.getElementById('applycredit'), cr = ap && ap.checked ? Math.min(credit, inv.total) : 0;
      document.getElementById('invprev').innerHTML = '<table>' + inv.lines.map(function (l) { return '<tr><td>' + esc(l.desc) + '</td><td class="n">' + amt(l.amount) + '</td></tr>'; }).join('') + '<tr class="sub"><td class="n">Subtotal</td><td class="n">' + amt(inv.subtotal) + '</td></tr>' + (inv.gst ? '<tr class="sub"><td class="n">GST 10%</td><td class="n">' + amt(inv.gst) + '</td></tr>' : '') + '<tr class="total"><td class="n">Total</td><td class="n">' + amt(inv.total) + '</td></tr>' + (cr > 0 ? '<tr class="sub"><td class="n">Less credit</td><td class="n">-' + amt(cr) + '</td></tr><tr class="sub"><td class="n">To pay</td><td class="n">' + amt(r2(inv.total - cr)) + '</td></tr>' : '') + '</table><p class="hint">Due ' + QCPdf.fmtDate(due) + (inv.kind === 'deposit' ? ' (' + depDueDays() + ' days)' : ' (' + balDaysFor(job) + ' days)') + '.</p>';
      var bl = document.getElementById('billline'), whole = Math.abs(inv.total - jobTotal) < 0.005 && !billed;
      bl.innerHTML = whole || inv.kind === 'variations' ? '' : '<b>This will bill ' + amt(inv.total) + ' of ' + amt(jobTotal) + (inv.kind === 'deposit' ? ' (the deposit)' : inv.kind === 'progress' ? ' (a part payment)' : billed ? ' (the rest, after ' + amt(billed) + ' already invoiced)' : '') + '.</b>';
    }
    var kindEl = document.getElementById('kind'); if (kindEl) { kindEl.addEventListener('change', preview); ['prog_pct', 'prog_amt', 'applycredit'].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener(id === 'applycredit' ? 'change' : 'input', preview); }); preview(); }
    var ni = document.getElementById('nextinv'); if (ni) ni.addEventListener('click', function () { var c = document.getElementById('newinv'); c.hidden = false; ni.parentNode.removeChild(ni); try { c.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {} });
    function invBlock(msg, extra) { var el = blockNext(document.getElementById('mkrow'), 'invblock', msg, extra); if (el && msg) { try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} } return el; }
    if (kinds.length && gstOn && !det.abn) { var ab = invBlock('ABN missing. A tax invoice needs it. Type it here:', '<span class="row" style="margin-top:6px"><input type="text" id="blk_in" placeholder="12 345 678 901" style="flex:1 1 10em"><button class="btn sm" id="blk_save">Save</button></span>'); if (ab) { var abIn = document.getElementById('blk_in'), abSave = function () { var v = abIn.value.trim(); if (!v) { abIn.focus(); return; } S.details.abn = v; save(); toast('Saved'); viewInvoice(job, true); }; document.getElementById('blk_save').addEventListener('click', abSave); abIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') abSave(); }); } }
    function afterInvoiceSent(inv) { if (invBal(inv) > 0.004 && job.auto_follow_ups !== false && !(job.hold && job.hold.on) && (QCMsg.ready('sms') || QCMsg.ready('email'))) return scheduleFollowUps(job, 'invoice'); return Promise.resolve(); }
    function invResult(inv) { return function (r) { inv.handed_at = ''; inv.handed_how = ''; if (r && r.sent) { markInvoiceSent(job, inv, r.how); afterInvoiceSent(inv).then(function () { viewInvoice(job, true); }); } else { save(); viewInvoice(job, true); } }; }
    function handInvoice(inv) {
      var k = job.invoices.indexOf(inv), d; try { d = QCPdf.invoicePDF(job, inv, S); } catch (e) { toast('Could not make the invoice: ' + e.message); return; }
      handOff({ kind: 'invoice', doc: d, title: inv.no, filename: inv.no + ' ' + (job.client.name || 'invoice').replace(/[^\w ]+/g, '') + '.pdf', whoName: whoShort, whoPhone: job.client.phone, whoEmail: job.client.email, job: job, ref: 'invoice-' + inv.no, anchor: 'sendinv_' + k,
        onHanded: function (r) { inv.handed_at = new Date().toISOString(); inv.handed_how = r.how; save(); }, onResult: invResult(inv) });
    }
    function withLink(inv) { if (!(invBal(inv) > 0.004) || inv.pay_url || !cardAnyOn()) return Promise.resolve(); toast('Adding the card button'); return payLinkFor(job, inv).then(function (l) { if (!l) return; inv.pay_url = l.url; inv.pay_link_id = l.id; save(); }).catch(function (e) { toast('No card button: ' + e.message + '. The invoice goes without it.'); }); }
    function sendNow(inv) { return withLink(inv).then(function () { return sendNow0(inv); }); }
    function sendNow0(inv) { var p1 = (QCMsg.ready('email') && job.client.email && S.sending.email_quotes !== false) ? emailInvoiceNow(job, inv) : Promise.resolve(false); return p1.then(function (ok) { if (ok) return afterInvoiceSent(inv).then(function () { viewInvoice(job, true); }); handInvoice(inv); }); }
    var sendQ = /(?:^|&)send=([^&]*)/.exec(qs || ''); if (sendQ) { try { history.replaceState(null, '', '#/job/' + job.id + '/invoice'); } catch (e) {} var target = job.invoices.filter(function (i) { return i.no === decodeURIComponent(sendQ[1]) && !i.void; })[0]; if (target) setTimeout(function () { sendNow(target); }, 50); }
    var mk = document.getElementById('mkinv'); if (mk) mk.addEventListener('click', function () {
      var inv = build();
      if (gstOn && !det.abn) { invBlock('ABN missing. A tax invoice needs it. Add it in Set-up.', ' <a href="#/settings">Set-up</a>'); return; }
      if (!(inv.total > 0)) { invBlock('Invoice total ' + amt(inv.total) + '. Check the variations and earlier invoices.'); return; }
      if (inv.total > q.total * 3) { invBlock('More than 3× the quote. Check the variations.'); return; }
      if (inv.kind === 'progress') { var room = r2(q.total - deps.concat(progs).reduce(function (s2, i) { return s2 + i.total; }, 0)); if (inv.total > room + 0.004) { invBlock('Only ' + amt(room) + ' of the quote is left to claim. Use Final for the rest.'); return; } }
      invBlock(''); if (draft) dropDraft(job);
      inv.no = QCStore.nextInvoiceNo(); inv.date = today; inv.due = QCStore.addDays(today, inv.kind === 'deposit' ? depDueDays() : balDaysFor(job)); inv.paid_date = ''; inv.payments = []; inv.credit_notes = []; inv.void = null; inv.follow_ups = []; inv.sent_date = ''; inv.sent_how = ''; inv.sent_confirmed = false; inv.handed_at = '';
      inv.client_snapshot = { name: job.client.name, address: job.client.address, email: job.client.email, phone: job.client.phone, abn: job.client.abn, bill_to: job.client.bill_to, type: job.client.type, accounts_email: job.client.accounts_email || '' };
      (inv.var_ids || []).forEach(function (id) { var v = job.variations.filter(function (x) { return x.id === id; })[0]; if (v) { v.invoiced = true; v.invoice_no = inv.no; } });
      job.invoices.push(inv);
      var ap = document.getElementById('applycredit'); if (ap && ap.checked && credit > 0) { var left = Math.min(credit, inv.total); live.filter(function (i) { return invBal(i) < -0.004; }).forEach(function (src) { if (left <= 0) return; var take = Math.min(left, -invBal(src)); src.payments.push({ id: QCStore.uid(), date: today, amount: -take, method: 'credit', ref: 'to ' + inv.no }); inv.payments.push({ id: QCStore.uid(), date: today, amount: take, method: 'credit', ref: 'from ' + src.no }); left = r2(left - take); }); }
      settle(job); save(); // status stays accepted until the invoice is confirmed sent or paid
      var hand = function () { viewInvoice(job, true); handInvoice(inv); };
      var after = function () { var p1 = (QCMsg.ready('email') && job.client.email && S.sending.email_quotes !== false) ? emailInvoiceNow(job, inv) : Promise.resolve(false); return p1.then(function (ok) { if (ok) return afterInvoiceSent(inv).then(function () { viewInvoice(job, true); }); hand(); }); };
      if (invBal(inv) > 0.004 && cardAnyOn()) { toast('Adding the card button'); payLinkFor(job, inv).then(function (l) { if (l) { inv.pay_url = l.url; inv.pay_link_id = l.id; save(); } after(); }).catch(function (e) { toast('No card button: ' + e.message + '. The invoice goes without it.'); after(); }); } else after();
    });
    function addPayment(i, p) { i.payments = i.payments || []; p.id = p.id || QCStore.uid(); i.payments.push(p); settle(job); save(); var b = invBal(i); if (b <= 0.004) return cancelInvoiceFollowUps(i).then(function () { return b; }); return Promise.resolve(b); }
    function stillOwing() { return r2(jobOwing(job) + (hasFinal ? 0 : Math.max(0, r2(jobTotal - r2(liveInvoices(job).reduce(function (s2, i) { return s2 + i.total; }, 0)))))); }
    function paidToast(i, a, left) { if (left > 0.004) return amt(a) + ' recorded, ' + amt(left) + ' to go on ' + i.no; if (left < -0.004) return i.no + ' paid. Overpaid by ' + amt(-left) + ', shown as credit on the job.'; var so = stillOwing(); return so > 0.004 ? (i.kind === 'deposit' ? 'Deposit ' : '') + i.no + ' paid. Job still owing ' + amt(so) + '.' : 'Paid in full, nothing owing on this job.'; }
    // other unpaid invoices for the same client, across all their jobs: a lump payment can be split over them
    function openForClient(exceptInv) { var out = []; if (!myKey) return out; S.jobs.forEach(function (j) { if (clientKey(j) !== myKey || j.status === 'cancelled') return; (j.invoices || []).forEach(function (i) { if (i !== exceptInv && !i.void && invBal(i) > 0.004) out.push({ job: j, inv: i }); }); }); out.sort(function (a, b) { return (a.inv.due || '') < (b.inv.due || '') ? -1 : 1; }); return out; }
    function recordOne(i, p) { i.payments = i.payments || []; p.id = QCStore.uid(); i.payments.push(p); }
    $app.querySelectorAll('[data-paid]').forEach(function (b) { b.addEventListener('click', function () { var f = document.getElementById('payform_' + b.dataset.paid); f.hidden = !f.hidden; if (!f.hidden) f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }); });
    $app.querySelectorAll('[data-paygo]').forEach(function (b) { b.addEventListener('click', function () {
      var k = b.dataset.paygo, i = job.invoices[+k], a = r2(document.getElementById('pay_amt_' + k).value), d = document.getElementById('pay_date_' + k).value || today, how = document.getElementById('pay_how_' + k).value, ref = document.getElementById('pay_ref_' + k).value.trim();
      if (!(a > 0)) { toast('Type the amount received.'); return; } var bal = invBal(i), others = a > bal + 0.004 ? openForClient(i) : [];
      if (others.length) {
        var sb = document.getElementById('split_' + k); sb.hidden = false;
        sb.innerHTML = '<p><b>That is ' + amt(r2(a - bal)) + ' more than this invoice. Was this one payment for several invoices?</b></p><p class="hint">Tick the ones it covers. ' + esc(i.no) + ' takes its ' + amt(bal) + ' first, then the rest goes to these in order of due date.</p>' + others.map(function (o, n) { return '<label class="btn ghost sm" style="justify-content:flex-start"><input type="checkbox" data-splitinv="' + n + '" checked> ' + esc(o.inv.no) + ', ' + amt(invBal(o.inv)) + ' owing, due ' + fmtShort(o.inv.due) + (o.job !== job ? ' (' + esc(o.job.quote_no) + (o.job.summary ? ', ' + esc(o.job.summary) : '') + ')' : '') + '</label>'; }).join('') + '<div class="row"><button class="btn tape sm" data-splitgo="' + k + '">Yes, split it across these</button><button class="btn ghost sm" data-splitno="' + k + '">No, it is all for ' + esc(i.no) + '</button></div>';
        try { sb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
        var finishSplit = function (split) {
          var group = QCStore.uid(), left = a, touched = [job], n = 0;
          if (split) { var first = Math.min(left, bal); recordOne(i, { date: d, amount: r2(first), method: how, ref: ref, split: group }); left = r2(left - first); n = 1;
            others.forEach(function (o, idx) { var cb = sb.querySelector('[data-splitinv="' + idx + '"]'); if (!cb || !cb.checked || left <= 0.004) return; var take = Math.min(left, invBal(o.inv)); recordOne(o.inv, { date: d, amount: r2(take), method: how, ref: ref, split: group }); left = r2(left - take); n++; if (touched.indexOf(o.job) < 0) touched.push(o.job); });
            if (left > 0.004) { i.payments[i.payments.length - 1].amount = r2(i.payments[i.payments.length - 1].amount + left); } // whatever is not covered stays on this invoice as an overpayment (credit)
          } else recordOne(i, { date: d, amount: a, method: how, ref: ref });
          touched.forEach(settle); save();
          Promise.all(touched.reduce(function (acc, j) { return acc.concat((j.invoices || []).filter(function (x) { return !x.void && invBal(x) <= 0.004 && (x.follow_ups || []).some(function (f) { return f.id && !f.cancelled; }); })); }, []).map(function (x) { return cancelInvoiceFollowUps(x); })).then(function () {
            toast(split ? amt(a) + ' recorded across ' + n + ' invoice' + (n > 1 ? 's' : '') + (left > 0.004 ? '. ' + amt(left) + ' over, shown as credit on this job.' : '.') + (stillOwing() <= 0.004 ? ' Nothing owing on this job.' : '') : paidToast(i, a, invBal(i))); viewInvoice(job, true);
          });
        };
        sb.querySelector('[data-splitgo]').addEventListener('click', function () { finishSplit(true); }); sb.querySelector('[data-splitno]').addEventListener('click', function () { finishSplit(false); });
        return;
      }
      b.disabled = true;
      addPayment(i, { date: d, amount: a, method: how, ref: ref }).then(function (left) { toast(paidToast(i, a, left)); viewInvoice(job, true); });
    }); });
    $app.querySelectorAll('[data-payrm]').forEach(function (b) { b.addEventListener('click', function () { var a = b.dataset.payrm.split(':'), i = job.invoices[+a[0]], p = i.payments[+a[1]]; if (!confirm('Undo the ' + amt(p.amount) + ' payment of ' + QCPdf.fmtDate(p.date) + ' on ' + i.no + '? The invoice will show that amount owing again.')) return; i.payments.splice(+a[1], 1); settle(job); save(); toast('Payment undone. ' + i.no + ' owing ' + amt(invBal(i)) + '.'); viewInvoice(job, true); }); });
    $app.querySelectorAll('[data-void]').forEach(function (b) { b.addEventListener('click', function () { var f = document.getElementById('voidform_' + b.dataset.void); f.hidden = !f.hidden; }); });
    $app.querySelectorAll('[data-voidgo]').forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.voidgo, i = job.invoices[+k], why = document.getElementById('void_why_' + k).value.trim(); if ((i.payments || []).length) { toast('Undo the payments first, or use Refund or credit.'); return; } i.void = { date: today, reason: why }; i.paid_date = ''; job.variations.forEach(function (v) { if (v.invoice_no === i.no) { v.invoiced = false; v.invoice_no = ''; } }); settle(job); save(); cancelInvoiceFollowUps(i).then(function () { toast(i.no + ' cancelled. The number stays used.'); viewInvoice(job, true); }); }); });
    $app.querySelectorAll('[data-cn]').forEach(function (b) { b.addEventListener('click', function () { var f = document.getElementById('cnform_' + b.dataset.cn); f.hidden = !f.hidden; }); });
    $app.querySelectorAll('[data-cngo]').forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.cngo, i = job.invoices[+k], a = r2(document.getElementById('cn_amt_' + k).value), why = document.getElementById('cn_why_' + k).value.trim(); if (!(a > 0) || a > i.total + 0.004) { toast('Credit between $0.01 and ' + amt(i.total) + '.'); return; } var cn = { no: QCStore.nextCreditNo(), date: today, amount: a, reason: why, gst: gstOn ? r2(a - r2(a / 1.1)) : 0 }; i.credit_notes = i.credit_notes || []; i.credit_notes.push(cn); settle(job); save(); toast(cn.no + ' issued. ' + amt(a) + ' credit on the job.'); viewInvoice(job, true); if (window.QCPdf && QCPdf.creditNotePDF) { try { handOff({ kind: 'credit', doc: QCPdf.creditNotePDF(job, i, cn, S), title: cn.no, filename: cn.no + '.pdf', whoName: whoShort, whoPhone: job.client.phone, whoEmail: job.client.email, job: job, ref: 'credit-' + cn.no, anchor: 'invrow_' + k, onResult: function (r) { if (r && r.sent) { cn.sent_date = today; cn.sent_how = r.how; save(); logSend(job, 'credit-' + cn.no, r.how, 'Credit note ' + cn.no + ' sent to ' + (job.client.name || 'the client')); } } }); } catch (e) { toast('Could not make the credit note: ' + e.message); } } }); });
    $app.querySelectorAll('[data-cnpdf]').forEach(function (b) { b.addEventListener('click', function () { var a = b.dataset.cnpdf.split(':'), i = job.invoices[+a[0]], cn = i.credit_notes[+a[1]]; if (!(window.QCPdf && QCPdf.creditNotePDF)) { toast('Credit notes cannot be printed in this version yet.'); return; } try { handOff({ kind: 'credit', doc: QCPdf.creditNotePDF(job, i, cn, S), title: cn.no, filename: cn.no + '.pdf', whoName: whoShort, whoPhone: job.client.phone, whoEmail: job.client.email, job: job, ref: 'credit-' + cn.no, anchor: 'invrow_' + a[0], onResult: function (r) { if (r && r.sent) { cn.sent_date = today; cn.sent_how = r.how; save(); } } }); } catch (e) { toast('Could not make the credit note: ' + e.message); } }); });
    // receipt: the payment is identified by its id (or its position), so the second of two equal payments gets its own receipt
    $app.querySelectorAll('[data-rcpt]').forEach(function (b) { b.addEventListener('click', function () { var a = b.dataset.rcpt.split(':'), i = job.invoices[+a[0]], p = i.payments[+a[1]]; if (!(window.QCPdf && QCPdf.receiptPDF)) { toast('Receipts cannot be printed in this version yet.'); return; } if (!p.id) { p.id = QCStore.uid(); save(); } try { var pr = Object.assign({}, p, { index: +a[1] }); handOff({ kind: 'receipt', doc: QCPdf.receiptPDF(job, i, pr, S), title: 'for ' + amt(p.amount) + ' on ' + i.no, filename: 'Receipt ' + i.no + ' ' + amt(p.amount).replace(/[^\d.]/g, '') + '.pdf', whoName: whoShort, whoPhone: job.client.phone, whoEmail: job.client.email, job: job, ref: 'receipt-' + i.no + '-' + a[1], anchor: 'invrow_' + a[0], onResult: function (r) { if (r && r.sent) { p.receipt_sent = today; p.receipt_how = r.how; save(); logSend(job, 'receipt-' + i.no, r.how, 'Receipt for ' + amt(p.amount) + ' on ' + i.no + ' sent to ' + (job.client.name || 'the client')); } } }); } catch (e) { toast('Could not make the receipt: ' + e.message); } }); });
    // statement: the client's account across all their jobs (B's statementPDF(jobsArray, S, {client})), or this job only
    function statement(jobs, label) { if (!(window.QCPdf && QCPdf.statementPDF)) { toast('Statements cannot be printed in this version yet.'); return; } try { var d = QCPdf.statementPDF(jobs, S, { client: job.client, job: jobs.length === 1 ? jobs[0] : null }); handOff({ kind: 'statement', doc: d, title: label, filename: 'Statement ' + (job.client.name || job.quote_no).replace(/[^\w ]+/g, '') + '.pdf', whoName: whoShort, whoPhone: job.client.phone, whoEmail: job.client.accounts_email || job.client.email, job: job, ref: 'statement-' + (jobs.length === 1 ? job.quote_no : 'client'), anchor: 'stmt', onResult: function (r) { if (r && r.sent) { job.statement_sent = today; save(); logSend(job, 'statement', r.how, 'Statement' + (jobs.length > 1 ? ' (' + jobs.length + ' jobs)' : ' for ' + job.quote_no) + ' sent to ' + (job.client.name || 'the client'), job.client.accounts_email || ''); } } }); } catch (e) { toast('Could not make the statement: ' + e.message); } }
    var stmt = document.getElementById('stmt'); if (stmt) stmt.addEventListener('click', function () { statement(multi ? clientJobs : [job], multi ? 'for ' + (job.client.name || who) : 'for ' + job.quote_no); });
    var stj = document.getElementById('stmtjob'); if (stj) stj.addEventListener('click', function () { statement([job], 'for ' + job.quote_no); });
    var rf = document.getElementById('refund'); if (rf) rf.addEventListener('click', function () { var f = document.getElementById('refundbox'); f.hidden = !f.hidden; });
    var rfg = document.getElementById('rf_go'); if (rfg) rfg.addEventListener('click', function () { var a = r2(document.getElementById('rf_amt').value), d = document.getElementById('rf_date').value || today, ref = document.getElementById('rf_ref').value.trim(); if (!(a > 0) || a > credit + 0.004) { toast('Refund between $0.01 and ' + amt(credit) + '.'); return; } var left = a; live.filter(function (i) { return invBal(i) < -0.004; }).forEach(function (i) { if (left <= 0) return; var take = Math.min(left, -invBal(i)); i.payments.push({ id: QCStore.uid(), date: d, amount: -take, method: 'refund', ref: ref }); left = r2(left - take); }); settle(job); save(); toast('Refund of ' + amt(a) + ' recorded'); viewInvoice(job, true); });
    var chk = document.getElementById('checkpay'); if (chk) chk.addEventListener('click', function () { var pend = job.invoices.filter(function (i) { return !i.void && invBal(i) > 0.004 && i.pay_link_id; }); if (!pend.length) { toast('No card links to check'); return; } toast('Checking'); Promise.all(pend.map(function (i) { return QCStripe.checkPaid(S.stripe.key, i.pay_link_id).then(function (r) { if (r.paid && !(i.payments || []).some(function (p) { return p.ref === 'Stripe ' + i.pay_link_id; })) { i.paid_by = 'card'; return addPayment(i, { date: r.when || today, amount: r.amount > 0 ? r2(r.amount) : invBal(i), method: 'card', ref: 'Stripe ' + i.pay_link_id }).then(function () { return true; }); } return false; }); })).then(function (rs) { var np = rs.filter(Boolean).length; settle(job); save(); toast(np ? np + ' paid by card' : 'Nothing paid yet'); viewInvoice(job, true); }).catch(function (e) { toast('Card payments: ' + e.message); }); });
    var irem = document.getElementById('invremind'); if (irem) irem.addEventListener('click', function () { followUpIcs(job, 'invoice'); });
    $app.querySelectorAll('[data-repdf]').forEach(function (b) { b.addEventListener('click', function () { var i = job.invoices[+b.dataset.repdf]; try { handOff({ kind: 'invoice', doc: QCPdf.invoicePDF(job, i, S), title: i.no, filename: i.no + '.pdf', whoName: whoShort, whoPhone: job.client.phone, whoEmail: job.client.email, job: job, ref: 'invoice-' + i.no, anchor: 'sendinv_' + b.dataset.repdf, canSend: !i.void && !cancelled, onHanded: function (r) { i.handed_at = new Date().toISOString(); i.handed_how = r.how; save(); }, onResult: invResult(i) }); } catch (e) { toast('Could not make the invoice: ' + e.message); } }); });
    $app.querySelectorAll('[data-sendinv]').forEach(function (b) { b.addEventListener('click', function () { var iv = job.invoices[+b.dataset.sendinv]; withLink(iv).then(function () { handInvoice(iv); }); }); });
    // handed to the phone but never answered: ask again
    job.invoices.forEach(function (i, k) { if (i.handed_at && !i.void && document.getElementById('sendinv_' + k)) didItGo({ whoName: whoShort, word: 'invoice', handed: i.handed_how || 'shared', anchor: 'sendinv_' + k, onResult: invResult(i) }); });
    if (!keep) window.scrollTo(0, 0);
  }
  // ---------- helpers: real sending through the relay
  // Email bodies are written for the client: greeting from the contact name, the quote number and a real valid-until date, no internal summary.
  function quoteEmailText(job, priced) {
    var det = S.details, q = job.quote || {}, qno = q.number || job.quote_no, v = priced || q, valid = QCStore.addDays(q.date || QCStore.today(), parseInt(det.quote_valid_days, 10) || 30);
    var desc = typeof jobDesc === 'function' ? jobDesc(job) : (job.summary || 'the work'), accept = (q.snapshot && q.snapshot.wording && q.snapshot.wording.accept) || S.wording.accept || '';
    return greetLine(job) + '\n\nQuote ' + qno + ' for ' + desc + ' is attached: ' + money(v.total) + (v.gst ? ' inc GST' : '') + ', valid until ' + QCPdf.fmtDate(valid) + '.' + (q.version > 1 ? ' It replaces the earlier ' + job.quote_no + '.' : '') + ' The quote lists what is and is not included; please read it before accepting.\n\n' + accept + '\n\n' + signLine() + (det.trading_name ? '\n' + det.trading_name : '') + (det.phone ? ' · ' + det.phone : '');
  }
  function emailQuoteNow(job, priced) {
    if (!job.client.email) { toast('No client email on the job'); return Promise.resolve(false); }
    var qno = (job.quote && job.quote.number) || job.quote_no, doc;
    try { doc = QCPdf.quotePDF(job, S, priced || job.quote); } catch (e) { toast('Could not make the quote: ' + e.message); return Promise.resolve(false); }
    return QCMsg.call({ action: 'send', channel: 'email', to: job.client.email, subject: 'Quote ' + qno + (S.details.trading_name ? ' from ' + S.details.trading_name : ''), body: quoteEmailText(job, priced), reply_to: S.details.email || undefined, attachments: [{ filename: qno + '.pdf', content: QCMsg.pdfBase64(doc) }], meta: { job: job.id, ref: 'quote-' + qno, kind: 'quote' } })
      .then(function () { job.emailed_date = QCStore.today(); markQuoteSent(job, 'email', true); toast('Emailed to ' + job.client.email); return true; }).catch(function (e) { toast('Email failed: ' + e.message); return false; });
  }
  function emailInvoiceNow(job, inv) {
    if (!job.client.email) return Promise.resolve(false);
    var det = S.details, doc; try { doc = QCPdf.invoicePDF(job, inv, S); } catch (e) { toast('Could not make the invoice: ' + e.message); return Promise.resolve(false); }
    var bal = invBal(inv), what = inv.kind === 'deposit' ? 'the deposit' : inv.kind === 'progress' ? 'progress claim ' + (inv.n || '') : inv.kind === 'variations' ? 'the agreed variations' : 'the final balance';
    var bank = [det.account_name ? 'Account name ' + det.account_name : '', det.bsb ? 'BSB ' + det.bsb : '', det.account_number ? 'Account ' + det.account_number : ''].filter(Boolean).join(', ');
    var body = greetLine(job) + '\n\n' + (det.gst && det.abn ? 'Tax invoice ' : 'Invoice ') + inv.no + ' for ' + what.replace(/\s+$/, '') + ' is attached: ' + amt(inv.total) + (inv.gst ? ' inc GST' : '') + (bal < inv.total - 0.004 ? ', ' + amt(bal) + ' to pay after credit' : '') + ', due ' + QCPdf.fmtDate(inv.due) + '.' + (inv.kind === 'deposit' ? ' Your start date is held once it lands.' : '') + (inv.deposit_invoice_no ? ' The deposit on ' + inv.deposit_invoice_no + ' is already taken off.' : '') +
      '\n\n' + (inv.pay_url ? 'Pay by card (no surcharge): ' + inv.pay_url + '\n' + (bank ? 'Or by bank transfer: ' : '') : (bank ? 'Pay by bank transfer: ' : '')) + (bank ? bank + '. Reference ' + inv.no + '.' : 'Pay by cash, or phone us for bank details on ' + (det.phone || 'the number above') + '. Reference ' + inv.no + '.') + '\n\nWe will never change these bank details by text or email. If you get a message saying we have, phone ' + (det.phone || 'us') + ' before paying.\n\n' + signLine() + (det.trading_name ? '\n' + det.trading_name : '');
    return QCMsg.call({ action: 'send', channel: 'email', to: job.client.email, subject: 'Invoice ' + inv.no + (det.trading_name ? ' from ' + det.trading_name : ''), body: body, reply_to: det.email || undefined, attachments: [{ filename: inv.no + '.pdf', content: QCMsg.pdfBase64(doc) }], meta: { job: job.id, ref: 'invoice-' + inv.no, kind: 'invoice' } })
      .then(function () { inv.emailed_date = QCStore.today(); markInvoiceSent(job, inv, 'email', true); toast('Invoice emailed'); return true; }).catch(function (e) { toast('Email failed: ' + e.message); return false; });
  }
  // Build the follow-up messages for a job (quote or unpaid invoices) at the configured days, then hand them to Twilio/Resend to hold.
  // Build the follow-up messages for a job (quote or unpaid invoices) at the configured days, then hand them to Twilio/Resend to hold.
  // Rules: quote follow-ups only while the quote is waiting (status quoted) and the job allows them; nothing while on hold; never a time in the
  // past; weekends and public holidays roll forward to the next business day at remind_hour; deposit reminders wait 3 business days after due;
  // the final notice is never automatic (auto texts cap at the second tier). Only the NEXT reminder in a chase is booked
  // with the sender -- a booked message is a spent message, so the one after it waits in state.local_queue and is booked
  // the next time the app opens, once the one before it has gone.
  function outOfMessagesToast() { var paid = QCMsg.balance().plan === 'paid'; toast('Out of messages. The app still writes them; you tap Send.', { action: paid ? 'Top up $' + TOPUP_PRICE : 'Set-up', onAction: function () { if (!paid) return go('/settings'); toast('Charging your card…'); topUp({ buy: true }).then(function (j) { toast(j.messages + ' messages added, $' + j.charged + ' charged. Try that again.'); }).catch(function (e) { toast(e.needsCard ? 'Your card needs a look. Set-up, then Manage.' : e.message); }); } }); }
  // Pacing. Every tradie texts through one shared number, and a burst of catch-up texts to people who have not
  // heard from him in weeks is what gets a number reported as spam and filtered for everybody. So the app never
  // books more than CHASE_PER_DAY automatic messages on one business day, spaces them CHASE_GAP_MIN minutes apart,
  // and rolls the rest to the next business day -- pushing the later nudges in the same chase back by as much, so a
  // chase keeps its gaps. A quote older than STALE_QUOTE_DAYS is not chased by itself at all: that far out it reads
  // as a cold text. It stays on Follow-ups with Text and Email for him to send one himself.
  var CHASE_PER_DAY = 20, CHASE_GAP_MIN = 5, STALE_QUOTE_DAYS = 90;
  function staleQuote(dateIso) { return /^\d{4}-\d{2}-\d{2}$/.test(String(dateIso || '')) && QCStore.daysBetween(dateIso, QCStore.today()) > STALE_QUOTE_DAYS; }
  // automatic messages already booked with the sender or waiting on the phone, counted by the day they go
  function dayLoad() {
    var load = {}, now = Date.now(), put = function (x) { if (!x || x.cancelled || x.sent) return; var at = new Date(x.send_at || (x.day + 'T12:00:00')).getTime(); if (!(at > now)) return; var d = String(x.day || '').slice(0, 10) || QCStore.today(); load[d] = (load[d] || 0) + 1; };
    (S.jobs || []).forEach(function (j) { (j.follow_ups || []).forEach(function (x) { if (x.id) put(x); }); (j.invoices || []).forEach(function (i) { (i.follow_ups || []).forEach(function (x) { if (x.id) put(x); }); }); });
    (S.local_queue || []).forEach(put);
    return load;
  }
  // give each would-be reminder its day and minute under the daily cap; changes items in place
  function spread(items, hr, st) {
    var load = dayLoad(), moved = {}, last = {};
    items.slice().sort(bySendAt).forEach(function (it) {
      var k = chaseKey(it), day = it.day, push = moved[k] || 0;
      if (push) day = QCCal.nextSendTime(QCStore.addDays(day, push), hr, st).day;
      // two messages in one chase are never less than two days apart (a catch-up and the day-7 nudge can fall together)
      if (last[k] && day < QCStore.addDays(last[k], 2)) day = QCCal.nextSendTime(QCStore.addDays(last[k], 2), hr, st).day;
      while ((load[day] || 0) >= CHASE_PER_DAY) day = QCCal.nextSendTime(QCStore.addDays(day, 1), hr, st).day;
      var slot = load[day] || 0; load[day] = slot + 1;
      var total = QCStore.daysBetween(it.day, day); if (total > push) moved[k] = total;
      var w = QCCal.nextSendTime(day, hr, st); it.day = w.day; last[k] = w.day; it.send_at = new Date(w.date.getTime() + slot * CHASE_GAP_MIN * 60000).toISOString();
    });
    return items;
  }
  // the relay said that day is already full for this account: the message moves to the next business day, never away
  function nextDayFor(list) { var hr = fuHour(), st = stateCode(); list.forEach(function (it) { it.day = QCCal.nextSendTime(QCStore.addDays(it.day || QCStore.today(), 1), hr, st).day; }); return spread(list, hr, st); }
  function scheduleFollowUps(job, kind, opts) {
    opts = opts || {}; var say = opts.quiet ? function () {} : toast;
    if (QCMsg.outOfMessages()) return (function () { if (!opts.quiet) outOfMessagesToast(); return Promise.resolve({ scheduled: [], failed: [], waiting: [], skipped: [], reason: 'out of messages' }); })();
    var fu = S.follow_up, sd = S.sending, items = [], hr = fuHour(), st = stateCode(), skipped = [], late = [], today = QCStore.today(), nowMs = Date.now();
    var stop = function (msg, why) { say(msg); return Promise.resolve({ scheduled: [], failed: [], waiting: [], skipped: [], reason: why }); };
    if (job.hold && job.hold.on) return stop('Reminders are on hold for this job.', 'hold');
    if (kind === 'quote' && job.status !== 'quoted') return stop('Quote follow-ups only go while the quote is waiting on the client.', 'status');
    if (kind === 'quote' && job.auto_follow_ups === false) return stop('Automatic follow-ups are off for this job.', 'off');
    if (kind === 'quote' && staleQuote(job.sent_date || (job.quote && job.quote.date))) return stop('Over three months since that quote, so it is not chased by itself. Send one yourself from Follow-ups.', 'stale');
    var landline = !!job.client.phone && QCMsg.isLandline(job.client.phone);
    var canSms = sd.auto_sms && QCMsg.ready('sms') && job.client.phone && !landline, canEmail = sd.auto_email && QCMsg.ready('email') && job.client.email;
    if (!canSms && !canEmail) return stop(landline && !job.client.email ? 'That number is a landline, so no SMS. Add an email to schedule reminders.' : (!job.client.phone && !job.client.email ? 'No mobile or email on the job, so nothing can be scheduled.' : 'No sending channel is ready for this client.'), 'no channel ready');
    var have = {}; (job.follow_ups || []).forEach(function (x) { if (x.id && !x.cancelled) have[x.what] = 1; }); (job.invoices || []).forEach(function (i) { (i.follow_ups || []).forEach(function (x) { if (x.id && !x.cancelled) have[x.what] = 1; }); }); (S.local_queue || []).forEach(function (q) { if (q.job === job.id) have[q.ref] = 1; });
    var ver = (job.quote && job.quote.version) || 1;
    // a date already past is skipped; when every date for an item has passed (a book loaded weeks after the invoice fell due) one reminder goes at the next send time instead, so money already owed is chased tomorrow morning, not never
    function soon() { var w = QCCal.nextSendTime(today, hr, st); if (w.date.getTime() < nowMs + 10 * 60000) w = QCCal.nextSendTime(QCStore.addDays(today, 1), hr, st); return w.day; }
    function add(day, t, ref, invNo) { if (have[ref]) return 'have'; var when = QCCal.nextSendTime(day, hr, st); if (when.date.getTime() < nowMs + 10 * 60000) { skipped.push(ref); return 'skipped'; } var it = { day: when.day, send_at: when.iso, ref: ref, key: job.id + ':' + ref + ':v' + ver, job: job.id, inv: invNo || '' }; if (canSms) { it.channel = 'sms'; it.to = job.client.phone; it.body = t.sms; } else { it.channel = 'email'; it.to = job.client.email; it.subject = t.subject; it.body = t.email; it.reply_to = String(S.details.email || '').trim() || undefined; } items.push(it); return 'ok'; }
    function allPast(rs) { return rs.length && rs.every(function (r) { return r === 'skipped'; }); } function anyPast(rs) { return rs.some(function (r) { return r === 'skipped'; }); }
    // a date already passed and nothing sent yet: the first reminder goes at the next send time (friendly), the later dates stay; when every date has passed, that one reminder is all
    if (kind === 'quote') { var base = job.sent_date || today, qChased = (job.follow_ups || []).some(function (x) { return x.sent; }) || !!(job.last_chased && job.last_chased >= base), qr = (fu.quote_days || [3, 7, 14]).map(function (d) { return add(QCStore.addDays(base, d), chaseText('quote', job, job.quote, d, { auto: true }), 'quote+' + d); }); if (anyPast(qr) && !qChased && add(soon(), chaseText('quote', job, job.quote, QCStore.daysBetween(base, today), { auto: true, tier: allPast(qr) ? 2 : 1 }), 'quote+late') === 'ok') late.push('quote+late'); }
    else { (job.invoices || []).filter(function (i) { return invOpen(i) && invOut(i); }).forEach(function (inv) { var floor = inv.kind === 'deposit' ? addBusinessDays(inv.due, 3, st) : inv.due; var ir = (fu.invoice_days || [3, 10, 21]).map(function (d) { var day = QCStore.addDays(inv.due, d); if (day < floor) day = floor; return add(day, chaseText('invoice', job, inv, d, { auto: true }), inv.no + '+' + d, inv.no); }); if (anyPast(ir) && !invChased(job, inv) && add(soon(), chaseText('invoice', job, inv, Math.max(0, QCStore.daysBetween(inv.due, today)), { auto: true }), inv.no + '+late', inv.no) === 'ok') late.push(inv.no + '+late'); }); }
    spread(items, hr, st);
    var pick = nextInChase(items, false), later = pick.later, now = pick.now;
    if (later.length) S.local_queue = (S.local_queue || []).concat(later.map(function (it) { return Object.assign({ kind: kind, queued: today }, it); }));
    if (landline && canEmail) toast('Landline number, so reminders go by email.');
    var summary = function (okRes, bad, waiting) { var bits = []; if (bad.length) bits.push(bad.length + ' follow-up' + (bad.length > 1 ? 's' : '') + ' could not be scheduled: ' + bad[0].error); if (waiting) bits.push(waiting + ' not booked yet, it tries again by itself'); if (okRes.length) bits.push(okRes.length + ' follow-up' + (okRes.length > 1 ? 's' : '') + ' scheduled by ' + (okRes[0].channel === 'sms' ? 'SMS' : 'email')); if (later.length) bits.push(later.length + ' after that, booked as each one falls due'); if (skipped.length) bits.push(late.length ? skipped.length + ' past date' + (skipped.length > 1 ? 's' : '') + ' folded into one reminder at the next send time' : skipped.length + ' skipped, the date has passed'); return bits.join('. ') + '.'; };
    if (!now.length) { if (!later.length && !skipped.length) return stop('Follow-ups already scheduled', 'have'); save(); say(summary([], [])); return Promise.resolve({ scheduled: [], failed: [], waiting: later, skipped: skipped }); }
    return QCMsg.scheduleAll(now, hr).then(function (res) {
      var okRes = res.filter(function (r) { return r.ok; }), bad = res.filter(function (r) { return !r.ok; }), gone = bad.filter(function (r) { return r.out; });
      // no signal, a busy relay: nothing is lost, it waits on the phone with its day and is booked on the next try
      var retry = bad.filter(function (r) { return !r.out; }).map(function (r) { return now.filter(function (i) { return i.key === r.key; })[0]; }).filter(Boolean);
      nextDayFor(retry.filter(function (it) { return bad.some(function (r) { return r.key === it.key && r.full; }); }));
      if (retry.length) { S.local_queue = (S.local_queue || []).concat(retry.map(function (it) { return Object.assign({ kind: kind, queued: today }, it); })); scheduleRetry(); }
      okRes.forEach(function (r) { r.job = job.id; });
      if (kind === 'quote') job.follow_ups = (job.follow_ups || []).concat(okRes); else job.invoices.forEach(function (inv) { var mine = okRes.filter(function (r) { return r.what.indexOf(inv.no + '+') === 0; }); if (mine.length) inv.follow_ups = (inv.follow_ups || []).concat(mine); });
      var errTxt = gone.length ? gone.length + ' follow-up' + (gone.length > 1 ? 's' : '') + ' could not be scheduled: ' + gone[0].error : bad.length ? bad.length + ' follow-up' + (bad.length > 1 ? 's' : '') + ' not booked yet (' + bad[0].error + '). It tries again by itself.' : '';
      if (kind === 'quote') job.follow_up_error = errTxt; else job.invoices.forEach(function (inv) { if (bad.some(function (b) { return b.what.indexOf(inv.no + '+') === 0; })) inv.follow_up_error = errTxt; else if (okRes.some(function (r) { return r.what.indexOf(inv.no + '+') === 0; })) inv.follow_up_error = ''; });
      save(); say(summary(okRes, gone, retry.length));
      return { scheduled: okRes, failed: bad, waiting: later.concat(retry), skipped: skipped, late: late };
    });
  }
  // Pulls in what happened while he was away and tells him, in his words, what changed.
  function syncNow(opts) {
    if (!window.QCSync) return Promise.resolve(null);
    return QCSync.now({ onChange: function (n, res) {
      // A card that was paid while he was on a ladder: settle the invoice and the job, stop its reminders,
      // and say so in money, not in jargon.
      var paid = (res.payments || []), said = '';
      paid.forEach(function (pay) {
        var j = QCStore.getJob(pay.job_id); if (!j) return;
        var inv = (j.invoices || []).filter(function (i) { return i.no === pay.invoice_no && !i.void; })[0];
        if (!inv) return;
        settle(j); save();
        if (invBal(inv) <= 0.004) cancelInvoiceFollowUps(inv, j);
        said = whoName(j) + ' paid ' + inv.no + ', ' + money(Math.round(Number(pay.amount_cents) || 0) / 100) + '.';
      });
      if (said) { toast(said); S = QCStore.load(); route(); return; }
      var b = (res.bookings || [])[0];
      if (b) {
        var j = QCStore.getJob(b.job_id), who = j && j.client && (j.client.first_name || j.client.name) ? (j.client.first_name || String(j.client.name).split(' ')[0]) : 'Your customer';
        toast(who + ' booked ' + QCPdf.fmtDate(String(b.start_day).slice(0, 10)) + '.', { action: 'Open', onAction: function () { if (j) go('/job/' + j.id); } });
      } else toast(n + ' update' + (n > 1 ? 's' : '') + ' from your customers.');
      S = QCStore.load(); route();
    } }).catch(function () { return null; });
  }
  function chaseable(job) { return (job.status === 'quoted' && job.sent_date && job.sent_confirmed) || (job.invoices || []).some(function (i) { return invOpen(i) && invOut(i); }); }
  function bookJobs() { return S.jobs.filter(function (j) { return j.from_book && j.status !== 'cancelled' && chaseable(j); }); }
  function bookCounts(jobs) { var inv = 0, q = 0; jobs.forEach(function (j) { if (j.status === 'quoted' && j.sent_date && j.sent_confirmed) q++; inv += (j.invoices || []).filter(function (i) { return invOpen(i) && invOut(i); }).length; }); return { invoices: inv, quotes: q }; }
  // ---- the subscription looks after itself: near the end of the paid period (or past it) the app swaps its own token for a fresh one.
  // Nothing is asked of the painter, and a cancelled or unpaid account simply stops when the token runs out.
  function hostedApi(which) { var u = String((S.sending && S.sending.server) || '').trim(); if (!u) return ''; return u.replace(/\/[^\/]*$/, '/' + which); }
  function renewHosted(force) {
    var sd = S.sending || {}, tok = String(sd.token || '');
    if (sd.hosted !== true || tok.slice(0, 4) !== 'qc1.') return Promise.resolve(null);
    var url = hostedApi('renew'); if (!url) return Promise.resolve(null);
    var left = /^\d{4}-\d{2}-\d{2}$/.test(String(sd.hosted_until || '')) ? QCStore.daysBetween(QCStore.today(), sd.hosted_until) : 0;
    var today = QCStore.today(); if (!force && (left > 7 || sd.renew_checked === today)) return Promise.resolve(null);
    var f = window.__qcRelayFetch || window.fetch;
    return f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) return null;
        S = QCStore.load(); S.sending.renew_checked = today;
        if (j.active) { if (j.token) S.sending.token = j.token; if (j.until) S.sending.hosted_until = j.until; S.sending.hosted_cancelled = false; S.sending.hosted_past_due = j.status === 'past_due'; }
        else { S.sending.hosted_cancelled = true; S.sending.hosted_past_due = false; if (j.until) S.sending.hosted_until = j.until; }
        save();
        // the answer can change what Home should be saying, and it lands a second after the screen was drawn
        if (!j.active || j.status === 'past_due') { var h = location.hash.replace(/^#\/?/, ''); if (!h) route(); }
        return j;
      }).catch(function () { return null; });
  }
  function topUp(opts) {
    var url = hostedApi('topup'), tok = String((S.sending || {}).token || '');
    if (!url || tok.slice(0, 4) !== 'qc1.') return Promise.reject(new Error('Top-ups need sending to be running through our system.'));
    var f = window.__qcRelayFetch || window.fetch, body = { token: tok };
    if (opts && opts.auto != null) body.auto = !!opts.auto; if (opts && opts.buy) body.buy = true;
    return f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.left != null) QCMsg.balance({ left: j.left, used: j.used, included: j.included, at: Date.now() });
        if (!j || !j.ok) { var e = new Error((j && j.error) || 'Could not top up'); e.needsCard = !!(j && j.needs_card); throw e; }
        return j;
      });
  }
  function addSeat() {
    var url = hostedApi('seat'), tok = String((S.sending || {}).token || '');
    if (!url || tok.slice(0, 4) !== 'qc1.') return Promise.reject(new Error('The second phone needs sending to be running through our system.'));
    var f = window.__qcRelayFetch || window.fetch;
    return f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j || !j.ok || !j.link) { var e = new Error((j && j.error) || 'Could not set up the second phone'); e.needsUpgrade = !!(j && j.needs_upgrade); throw e; } return j.link; });
  }
  function seats() { var b = QCMsg.balance(); return { seats: +(b.seats || (S.sending && S.sending.seats) || 1), seat: +(b.seat || (S.sending && S.sending.seat) || 1) }; }
  function hostedPortal() {
    var url = hostedApi('portal'), tok = String((S.sending || {}).token || '');
    if (!url || tok.slice(0, 4) !== 'qc1.') return Promise.reject(new Error('Manage is only for sending that runs through our system.'));
    var f = window.__qcRelayFetch || window.fetch;
    return f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok, return_url: location.href }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j || !j.ok || !j.url) throw new Error((j && j.error) || 'Could not open the billing page'); return j.url; });
  }
  // after a set-up link loads a painter's book, nothing is sent by itself: Home shows the book and "Start the chasing" queues the reminders for every open quote and unpaid invoice in it, quietly, one summary at the end
  function queueLoadedFollowUps(jobs) {
    var out = { scheduled: 0, first: '', last: '', jobs: 0 }; if (!(jobs || []).length || !(QCMsg.ready('sms') || QCMsg.ready('email'))) return Promise.resolve(out);
    var chain = Promise.resolve();
    jobs.forEach(function (job) {
      var kinds = []; if (job.status === 'quoted' && job.sent_date && job.sent_confirmed) kinds.push('quote'); if ((job.invoices || []).some(function (i) { return invOpen(i) && invOut(i); })) kinds.push('invoice');
      kinds.forEach(function (k) { chain = chain.then(function () { return scheduleFollowUps(job, k, { quiet: true }); }).then(function (r) { var got = (r && r.scheduled) || []; if (got.length) out.jobs++; got.forEach(function (x) { out.scheduled++; if (!out.first || x.send_at < out.first) out.first = x.send_at; if (x.send_at > out.last) out.last = x.send_at; }); }).catch(function () {}); });
    });
    return chain.then(function () { return out; });
  }
  function whenText(iso) { if (!iso) return ''; var d = new Date(iso), day = d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate(), t = QCStore.today(); var h = d.getHours(), hh = (h % 12 || 12) + (h < 12 ? 'am' : 'pm'); return (day === t ? 'today' : day === QCStore.addDays(t, 1) ? 'tomorrow' : niceDay(day).replace(new RegExp(' ' + new Date().getFullYear() + '$'), '')) + ' at ' + hh; }
  // cancel a list of relay-held reminders; anything that fails is queued in state.pending_cancels and retried on load and when back online
  function cancelList(list, jobId) {
    var todo = (list || []).filter(function (x) { return x.id && !x.cancelled && !x.sent; }); if (!todo.length) return Promise.resolve({ failed: 0, done: 0, error: '' });
    return QCMsg.cancelAll(todo, jobId).then(function () { var bad = todo.filter(function (x) { return !x.cancelled; }); bad.forEach(function (x) { queueCancel(x, jobId); }); save(); return { failed: bad.length, done: todo.length - bad.length, error: (bad[0] && bad[0].cancel_error) || 'relay error' }; });
  }


  function cancelJobFollowUps(job) { var all = (job.follow_ups || []).slice(); (job.invoices || []).forEach(function (i) { all = all.concat(i.follow_ups || []); }); return cancelList(all, job.id).then(function (r) { S.local_queue = (S.local_queue || []).filter(function (q) { return q.job !== job.id; }); save(); return r; }); }

  function waitingFollowUps(job) { return (S.local_queue || []).filter(function (q) { return q.job === job.id; }); }
  function cancelQuoteFollowUps(job) { return cancelList(job.follow_ups, job.id).then(function (r) { S.local_queue = (S.local_queue || []).filter(function (q) { return !(q.job === job.id && !q.inv); }); save(); if (r.failed) toast(r.failed + ' follow-up' + (r.failed > 1 ? 's' : '') + ' could not be cancelled (' + r.error + '). It retries when you are back online.'); else if (r.done) toast('Quote follow-ups cancelled'); return r; }); }
  function cancelInvoiceFollowUps(inv, job) { var jid = job ? job.id : ((inv.follow_ups || []).filter(function (x) { return x.job; })[0] || {}).job || ''; return cancelList(inv.follow_ups, jid).then(function (r) { S.local_queue = (S.local_queue || []).filter(function (q) { return q.inv !== inv.no; }); save(); if (r.failed) toast(r.failed + ' reminder' + (r.failed > 1 ? 's' : '') + ' could not be cancelled (' + r.error + '). It retries when you are back online.'); return r; }); }
  function pendingFollowUps(job) { var list = (job.follow_ups || []).slice(); (job.invoices || []).forEach(function (i) { list = list.concat(i.follow_ups || []); }); var today = QCStore.today(); return list.filter(function (x) { return x.id && !x.cancelled && !x.sent && x.day >= today; }); }
  // ---------- helpers: costing line, follow-up reminders, booking
  function costLine(p) { if (!p.cost || !p.lines.length) return ''; return 'About ' + p.cost.hours.toFixed(1) + ' hours of work, ' + money(p.cost.paint) + ' of paint. Margin ' + money(p.cost.margin) + ' (' + p.cost.margin_pct + '%). Private.'; }
  function appUrl() { return location.href.split('#')[0] + '#/chase'; }
  function followUpIcs(job, kind) {
    var fu = S.follow_up, ev = [], name = job.client.name || job.quote_no, hr = fuHour(), st = stateCode(), today = QCStore.today();
    if (kind === 'quote') { if (job.status !== 'quoted' && job.status !== 'draft') { toast('Only while the quote is waiting.'); return; } var base = job.sent_date || today; (fu.quote_days || [3, 7, 14]).forEach(function (d) { var w = QCCal.nextSendTime(QCStore.addDays(base, d), hr, st); if (w.day < today) return; ev.push({ uid: job.id + '-q' + d, summary: 'Follow up quote ' + job.quote_no + ': ' + name + ' (' + money(job.quote ? job.quote.total : 0) + ')', description: 'Open Chasem, Follow-ups tab. The message is written. ' + (job.client.phone || ''), location: job.client.address || '', url: appUrl(), start: w.day, startHour: hr, endHour: hr + 1, alarmHour: hr }); }); }
    else { (job.invoices || []).filter(function (i) { return invOpen(i) && invOut(i); }).forEach(function (inv) { var floor = inv.kind === 'deposit' ? addBusinessDays(inv.due, 3, st) : inv.due; (fu.invoice_days || [3, 10, 21]).forEach(function (d) { var day = QCStore.addDays(inv.due, d); if (day < floor) day = floor; var w = QCCal.nextSendTime(day, hr, st); if (w.day < today) return; ev.push({ uid: job.id + '-' + inv.no + '-' + d, summary: 'Chase invoice ' + inv.no + ': ' + name + ' (' + money(invBalance(inv).balance) + ')', description: 'Open Chasem, Follow-ups tab. ' + (job.client.phone || ''), location: job.client.address || '', url: appUrl(), start: w.day, startHour: hr, endHour: hr + 1, alarmHour: hr }); }); }); }
    if (!ev.length) { toast('Nothing to remind about'); return; }
    if (kind === 'quote') { job.follow_ups = (job.follow_ups || []).filter(function (x) { return x.id; }).concat(ev.map(function (e) { return { uid: e.uid, day: e.start, what: e.summary }; })); save(); }
    QCCal.deliver(QCCal.ics(ev, 'Chasem follow-ups'), (kind === 'quote' ? 'follow-up-' : 'reminders-') + job.quote_no + '.ics').then(function () { toast(ev.length + ' reminders ready for your calendar'); });
  }
  function bookJob(job, start, days, hour) {
    var endIncl = QCStore.addDays(start, days - 1), endExcl = QCStore.addDays(start, days), endHour = Math.max(hour + 1, parseInt(S.booking.end_hour, 10) || 15);
    var e = { uid: job.id + '-book-' + start, summary: 'Painting: ' + (job.client.name || job.quote_no) + (job.summary ? ' - ' + job.summary : ''), description: 'Quote ' + job.quote_no + ', ' + money(job.quote ? job.quote.total : 0) + '. ' + (job.client.phone || '') + ' ' + (job.client.email || '') + '\n' + (job.notes || ''), location: job.client.address || '', start: start, end: endExcl };
    if (days === 1) { e.startHour = hour; e.endHour = endHour; e.end = start; }
    job.booking = { start: start, days: days, end: endExcl, end_inclusive: endIncl, hour: hour, gcal: QCCal.googleUrl(e) }; save();
    QCCal.deliver(QCCal.ics([e], 'Chasem bookings'), 'booking-' + job.quote_no + '.ics').then(function () { toast('Booked'); viewQuote(job); });
  }



  // ---------- Chase
  // Tiers use strict boundaries on the configured days: quote days < q[1] first, < q[2] second, else last; invoice days < i[1] first, < i[2] second, else final.
  // opts.auto caps invoices at the second tier: the final notice is only ever sent by hand. Business clients (agent, strata, builder, commercial)
  // get statement-style wording with no payment-plan or collection line.
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dayDate(iso) { if (!iso) return ''; var d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); if (isNaN(d.getTime())) return ''; return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); } // "Wed 30 Sep"
  // has this invoice ever been chased? a sent reminder (relay log or a scheduled one that went), or Mark chased / Send now after the invoice was issued
  function invChased(job, inv) { return remindersSent(job, inv.no) > 0 || (inv.follow_ups || []).some(function (x) { return x.sent; }) || !!(job.last_chased && inv.date && job.last_chased >= inv.date); }
  // chaseText('quote'|'invoice'|'statement', job, item, daysOverdue, opts). opts.auto: written for the scheduler (never the final notice). opts.tier: ask for that reminder. opts.chased: override the never-chased check.
  // Nudge templates: S.wording.nudges.{quote,deposit,invoice}. Blank = the app's own words. Tokens: {name} {job} {quote} {total} {week} {valid} {invoice} {amount} {due} {card} {phone}.
  var NUDGE_TOKENS = ['name', 'job', 'quote', 'total', 'week', 'valid', 'invoice', 'amount', 'due', 'card', 'phone'];
  function nudgeTemplate(key) { var t = S.wording && S.wording.nudges && S.wording.nudges[key]; return t && String(t).trim() ? String(t).trim() : ''; }
  function fillNudge(tpl, v) { return tpl.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? String(v[k]) : m; }).replace(/\s+/g, ' ').trim(); }
  function chaseText(kind, job, item, days, opts) {
    opts = opts || {};
    var det = S.details, hi = greet(job), so = signoff(S), biz = isBizClient(job), rawPhone = det.phone ? String(det.phone).trim() : '', phone = det.contact_phone_in_texts !== false ? rawPhone : '', callMe = phone ? 'call me on ' + phone : 'give me a call', today = QCStore.today(), what = jobDesc(job);
    // hosted texts come from a number that is not the painter's: every one says so, whatever the phone-in-texts setting
    var backTo = rawPhone ? 'text or call me on ' + rawPhone : (String(det.email || '').trim() ? 'reply to my email at ' + String(det.email).trim() : 'reply to the email on your quote');
    var noReply = S.sending && S.sending.hosted === true ? ' This number does not take replies: ' + backTo + '.' : '';
    var tokens = { name: (job.client && (String(job.client.first_name || '').trim() || String(job.client.name || '').trim().split(/\s+/)[0])) || '', job: what, phone: rawPhone };
    var tail = (det.trading_name ? '\n' + det.trading_name : '') + (phone ? (det.trading_name ? ' · ' : '\n') + phone : ''), cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }, body, subject;
    if (kind === 'quote') {
      var q = item || job.quote || {}, qd = S.follow_up.quote_days || [3, 7, 14], t1 = qd.length > 1 ? qd[1] : 7, t2 = qd.length > 2 ? qd[2] : (qd.length > 1 ? qd[1] : 14), tier = opts.tier || (days < t1 ? 1 : days < t2 ? 2 : 3);
      // a quote made somewhere else without a number is "my quote": never a number the customer has not seen
      var total = money(q.total || 0), no = job.no_number ? '' : job.quote_no, ref = no ? 'quote ' + no : 'my quote', valid = shortDate(QCStore.addDays(q.date || job.sent_date || today, parseInt(det.quote_valid_days, 10) || 30)), week = shortDate(nextFreeWeek());
      if (tier === 1) { body = 'just checking ' + ref + ' (' + total + ') for ' + what + ' came through OK. If there is anything you would like me to explain, just ask.'; subject = 'Checking in on your quote' + (no ? ' ' + no : ''); }
      else if (tier === 2) { body = 'following up on ' + ref + ' (' + total + ') for ' + what + '. I have a start slot the week of ' + week + ' if that suits, and I am happy to answer any questions first.'; subject = (no ? 'Quote ' + no + ': a' : 'A') + ' start slot is open'; }
      else { body = 'last note from me on ' + ref + ' (' + total + ') for ' + what + '. It is valid until ' + valid + '. If the timing is not right, no problem at all, just let me know either way.'; subject = (no ? 'Quote ' + no : 'Your quote') + ', valid until ' + valid; }
      var qt = nudgeTemplate('quote'); if (qt) body = fillNudge(qt, Object.assign(tokens, { quote: no, total: total, week: week, valid: valid }));
      return { tier: tier, sms: hi + ' ' + body + ' ' + so + noReply, subject: subject, email: hi + '\n\n' + cap(body) + '\n\n' + so + tail };
    }
    if (kind === 'statement') { // one message for a business client, every open invoice on it
      var c = item, cnt = c.invs.length, list = c.invs.map(function (x) { return x.inv.no + ' due ' + shortDate(x.inv.due); }).join(', ');
      body = 'statement for ' + (c.name || 'your account') + ': ' + cnt + ' invoice' + (cnt > 1 ? 's' : '') + ', ' + money(c.total) + ' owing (' + list + '). Could accounts let me know when ' + (cnt > 1 ? 'these are' : 'this is') + ' scheduled for payment?' + (phone ? ' Any query, ' + callMe + '.' : '');
      return { tier: c.days >= 21 ? 3 : c.days >= 10 ? 2 : 1, biz: true, statement: true, sms: hi + ' ' + body + ' ' + so, subject: 'Statement of account: ' + (c.name || '') + ' (' + money(c.total) + ' owing)', email: hi + '\n\n' + cap(body) + '\n\n' + so + tail };
    }
    var inv = item, idays = S.follow_up.invoice_days || [3, 10, 21], i1 = idays.length > 1 ? idays[1] : 10, i2 = idays.length > 2 ? idays[2] : (idays.length > 1 ? idays[1] : 21), itier = days < i1 ? 1 : days < i2 ? 2 : 3;
    var chased = opts.chased != null ? !!opts.chased : invChased(job, inv); if (!chased && !biz) itier = 1; // the first note anyone gets is the friendly one, however late it is
    if (opts.auto && itier > 2) itier = 2; if (opts.tier) itier = opts.tier;
    var bal = invBalance(inv), amt = money(bal.balance), ino = inv.no, due = shortDate(inv.due), amtText = bal.paid > 0 ? amt + ' still owing after your payment of ' + money(bal.paid) : amt;
    if (biz) {
      body = 'Statement of account: ' + ino + ' ' + amt + (bal.paid > 0 ? ' (after ' + money(bal.paid) + ' received)' : '') + ' due ' + due + (itier >= 2 ? ', now ' + days + ' days past due' : '') + '. Could accounts let me know when it is scheduled for payment' + (itier >= 2 && phone ? ', or ' + callMe + ' if there is a query' : '') + '?' + (inv.pay_url ? ' Pay by card: ' + inv.pay_url : '') + ' Ref ' + ino + '.';
      return { tier: itier, biz: true, sms: hi + ' ' + body + ' ' + so + noReply, subject: 'Statement of account: ' + ino + ' (' + amt + ')', email: hi + '\n\n' + body + '\n\n' + so + tail };
    }
    var card = inv.pay_url ? 'Pay by card: ' + inv.pay_url + ', or by transfer to the account on the invoice, ref ' + ino + '.' : 'Bank details are on the invoice, ref ' + ino + '.';
    if (inv.kind === 'deposit') { // an unpaid deposit means the job has not started: ask gently, never threaten
      var bk = job.booking && job.booking.start ? ' for the booking on ' + shortDate(job.booking.start) : ' for your job';
      if (itier === 1) { body = 'a friendly reminder that the deposit' + bk + ' (invoice ' + ino + ', ' + amtText + ') was due on ' + due + '. If it is already on its way, thank you and please ignore this. ' + card; subject = 'Deposit' + bk + ' (' + amt + ')'; }
      else { body = 'we have not received the deposit' + bk + ' (invoice ' + ino + ', ' + amtText + '). The dates are held for you once it arrives. If you would rather not go ahead, just let me know, no problem at all. ' + card; subject = 'Deposit' + bk; }
      var dt = nudgeTemplate('deposit'); if (dt) body = fillNudge(dt, Object.assign(tokens, { invoice: ino, amount: amt, due: due, card: card, total: money(job.quote ? job.quote.total : 0) }));
      return { tier: Math.min(itier, 2), deposit: true, sms: hi + ' ' + body + ' ' + so + noReply, subject: subject, email: hi + '\n\n' + cap(body) + '\n\n' + so + tail };
    }
    if (itier === 1) { body = 'a friendly reminder that invoice ' + ino + ' (' + amtText + ') was due on ' + due + '. If it is already on its way, thank you and please ignore this. ' + card; subject = 'Invoice ' + ino + ' (' + amt + ')'; }
    else if (itier === 2) { body = 'invoice ' + ino + ' (' + amtText + ') was due ' + due + ' and we have not received it. Could you pay by ' + shortDate(addBusinessDays(today, 5)) + ', or ' + callMe + ' if there is a problem or you need more time? Ref ' + ino + '.' + (inv.pay_url ? ' Pay by card: ' + inv.pay_url : ''); subject = 'Overdue: invoice ' + ino + ' (' + amt + ')'; }
    else {
      var n = remindersSent(job, ino), times = n >= 3 ? n + ' times' : n === 2 ? 'twice' : 'before', by = shortDate(inv.final_by || QCStore.addDays(today, 7));
      body = 'invoice ' + ino + ' (' + amtText + ') is now ' + days + ' days overdue and we have reminded you ' + times + '. Please pay by ' + by + ' or ' + callMe + ' before then to arrange a payment plan. If we do not hear from you by that date we intend to refer the account to a collection agency or lodge a claim at ' + tribunalFor(stateCode()) + ', either of which can add costs to the amount owed. Ref ' + ino + '.';
      return { tier: 3, final: true, sms: hi + ' ' + body + ' ' + fullSignoff(S), subject: 'Final notice: invoice ' + ino + ' (' + amt + ')', email: hi + '\n\n' + cap(body) + '\n\n' + fullSignoff(S) + (phone ? '\n' + phone : '') };
    }
    var it2 = nudgeTemplate('invoice'); if (it2) body = fillNudge(it2, Object.assign(tokens, { invoice: ino, amount: amt, due: due, card: card, total: money(job.quote ? job.quote.total : 0) }));
    return { tier: itier, sms: hi + ' ' + body + ' ' + so + noReply, subject: subject, email: hi + '\n\n' + cap(body) + '\n\n' + so + tail };
  }
  function refLabel(ref) { var m = /^(.*)\+(\d+)$/.exec(ref || ''); if (!m) return ref || ''; return (m[1] === 'quote' ? 'quote' : m[1]) + ', day ' + m[2]; }
  function textForRef(job, ref) { var m = /^(.*)\+(\d+)$/.exec(ref || ''); if (!m) return ''; try { if (m[1] === 'quote') return chaseText('quote', job, job.quote, +m[2], { auto: true }).sms; var inv = (job.invoices || []).filter(function (i) { return i.no === m[1]; })[0]; return inv ? chaseText('invoice', job, inv, +m[2], { auto: true }).sms : ''; } catch (e) { return ''; } }
  function fmtTime(iso) { var d = new Date(iso); if (isNaN(d.getTime())) return ''; var h = d.getHours(), m = d.getMinutes(); return (h % 12 || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + (h >= 12 ? 'pm' : 'am'); }
  // "Automatic follow-ups" on a job is only true when a sender is set up; otherwise the app writes the words and the painter taps Text
  function autoSendReady() { var sd = S.sending || {}; return !!((sd.auto_sms !== false && QCMsg.ready('sms')) || (sd.auto_email !== false && QCMsg.ready('email'))); }
  function autoSendLabel() { return autoSendReady() ? 'Automatic follow-ups (they go by themselves on the day)' : 'Remind me to follow up (nothing is sent without you; the message waits under Follow-ups on the day)'; }
  var chaseShowFinal = {};
  function viewChase() {
    var dirty = false;
    var today = QCStore.today(), rows = [], owed = 0, fu = S.follow_up || {}, qd = fu.quote_days || [3, 7, 14], idays = fu.invoice_days || [3, 10, 21];
    var q0 = qd[0] == null ? 3 : qd[0], q1 = qd.length > 1 ? qd[1] : 7, q2 = qd.length > 2 ? qd[2] : (qd.length > 1 ? qd[1] : 14), i0 = idays[0] == null ? 3 : idays[0], i1 = idays.length > 1 ? idays[1] : 10, i2 = idays.length > 2 ? idays[2] : (idays.length > 1 ? idays[1] : 21);
    var byDay = function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : 0; }, bizMap = {}, bizOrder = [];
    S.jobs.forEach(function (j) {
      if (j.status === 'cancelled') return;
      var biz = isBizClient(j), c = j.client || {};
      (j.invoices || []).forEach(function (i) {
        if (!(invOpen(i) && invOut(i))) return; var d = i.due < today ? QCStore.daysBetween(i.due, today) : 0; if (d > 0) owed += invBalance(i).balance;
        if (biz) { var key = String(c.accounts_email || c.bill_to || c.name || j.id).trim().toLowerCase(); var g = bizMap[key]; if (!g) { g = bizMap[key] = { kind: 'statement', name: c.bill_to || c.name || j.quote_no, job: j, jobs: [], invs: [], total: 0, days: 0, accounts_email: c.accounts_email || '', email: c.email || '', phone: c.phone || '' }; bizOrder.push(g); } if (g.jobs.indexOf(j) < 0) g.jobs.push(j); g.invs.push({ job: j, inv: i }); g.total += invBalance(i).balance; if (d > g.days) g.days = d; if (!g.accounts_email && c.accounts_email) g.accounts_email = c.accounts_email; return; }
        if (d < i0) return; var chased = invChased(j, i), tier = !chased ? 1 : d < i1 ? 1 : d < i2 ? 2 : 3; if (i.kind === 'deposit') tier = Math.min(tier, 2);
        rows.push({ kind: 'invoice', job: j, item: i, days: d, chased: chased, tier: tier, tone: i.kind === 'deposit' ? (tier === 1 ? 'Deposit reminder' : 'Deposit, second note') : tier === 1 ? 'First reminder' : tier === 2 ? 'Second reminder' : 'Final reminder' });
      });
      if (j.status === 'quoted' && j.quote) { var since = QCStore.daysBetween(j.sent_date || j.quote.date, today); if (since >= q0) rows.push({ kind: 'quote', job: j, item: j.quote, days: since, tier: since < q1 ? 1 : since < q2 ? 2 : 3, tone: since < q1 ? 'Friendly follow-up' : since < q2 ? 'Second follow-up' : 'Last follow-up' }); }
    });
    bizOrder.forEach(function (g) { if (g.days >= i0) { g.item = g; g.tier = g.days >= i2 ? 3 : g.days >= i1 ? 2 : 1; g.tone = 'Statement'; g.invs.sort(function (a, b) { return a.inv.due < b.inv.due ? -1 : 1; }); rows.push(g); } });
    rows.sort(function (a, b) { return b.days - a.days; });
    var relay = QCMsg.ready('sms') || QCMsg.ready('email');
    var html = pendingBanner() + '<h1>Follow-ups</h1>';
    if (!relay) html += '<p class="hint"><b>Nothing sends by itself.</b> You press send.</p>';
    else { var bl = QCMsg.balance(); if (bl.left != null) html += '<p class="hint" id="balline">' + (bl.left <= 0 ? '<span class="confirm"><b>' + esc(balanceLine()) + '</b></span> <a href="' + esc(topUpLink()) + '" target="_blank" rel="noopener">Top up or go monthly</a>' : esc(balanceLine()) + (bl.left <= 3 ? ' <a href="' + esc(topUpLink()) + '" target="_blank" rel="noopener">Top up</a>' : '')) + '</p>'; }
    html += '<div class="card"><div class="row between"><span>Overdue</span><h2>' + money(owed) + '</h2></div></div>';
    var groups = [], flat = []; S.jobs.forEach(function (j) { var pend = pendingFollowUps(j).sort(byDay), wait = waitingFollowUps(j); if (pend.length || wait.length) groups.push({ job: j, pend: pend, wait: wait }); });
    if (groups.length) html += '<div class="card"><h3>Scheduled</h3><p class="hint">These go by themselves.</p>' + groups.map(function (g) {
      return '<div class="sgroup"><b>' + esc(g.job.client.name || g.job.quote_no) + '</b> <span class="hint">' + esc(g.job.quote_no) + (g.job.hold && g.job.hold.on ? ' · on hold' : '') + '</span>' +
        g.pend.map(function (x) { var k = flat.push({ job: g.job, x: x }) - 1; return '<div class="sitem"><div class="row between"><span><b>' + QCPdf.fmtDate(x.day) + '</b>' + (x.send_at ? ' ' + fmtTime(x.send_at) : '') + ' by ' + (x.channel === 'sms' ? 'text' : 'email') + ' <span class="hint">' + esc(refLabel(x.what)) + '</span></span><button class="btn ghost sm" data-cancelfu="' + k + '">Cancel</button></div><div class="msg small">' + esc(x.text || textForRef(g.job, x.what)) + '</div></div>'; }).join('') +
        g.wait.map(function (w) { var k = flat.push({ job: g.job, w: w }) - 1; return '<div class="sitem"><div class="row between"><span><b>' + QCPdf.fmtDate(w.day) + '</b> by ' + (w.channel === 'sms' ? 'text' : 'email') + ' <span class="pill warn">waiting to schedule</span> <span class="hint">' + esc(refLabel(w.ref)) + '</span></span><button class="btn ghost sm" data-cancelfu="' + k + '">Cancel</button></div><div class="msg small">' + esc(w.body || '') + '</div></div>'; }).join('') + '</div>';
    }).join('') + (groups.some(function (g) { return g.wait.length; }) ? '<p class="hint">Too far ahead to book yet. Books itself when it is close enough.</p>' : '') + '</div>';
    if (!rows.length) {
      var nx = null; S.jobs.forEach(function (j) { if (j.status === 'cancelled') return; (j.invoices || []).forEach(function (i) { if (!(invOpen(i) && invOut(i))) return; var when = QCStore.addDays(i.due, i0); if (when >= today && (!nx || when < nx.day)) nx = { day: when, job: j, what: i.kind === 'deposit' ? 'deposit reminder' : 'invoice ' + i.no + ' reminder' }; }); if (j.status === 'quoted' && j.quote) { var w2 = QCStore.addDays(j.sent_date || j.quote.date, q0); if (w2 >= today && (!nx || w2 < nx.day)) nx = { day: w2, job: j, what: 'quote follow-up' }; } });
      html += '<div class="card empty">Nothing due. Good week.' + (nx ? '<br><span class="hint">Next: ' + esc(nx.job.client.name || nx.job.quote_no) + ', ' + esc(nx.what) + ', ' + dayDate(nx.day) + (relay && pendingFollowUps(nx.job).length ? ' (goes by itself)' : ' (you tap Text on the day)') + '.</span>' : '') + '</div>';
    }
    var ho = window.__qcApp && typeof window.__qcApp.handOff === 'function' ? window.__qcApp.handOff : null;
    rows.forEach(function (r, k) {
      var j = r.job, hold = j.hold && j.hold.on, key = r.kind === 'invoice' ? r.item.no : r.kind === 'statement' ? 'st:' + r.name : 'q:' + j.id, showFinal = r.tier === 3 && r.kind === 'invoice' && !!chaseShowFinal[key];
      if (r.kind === 'invoice' && r.tier === 3 && !r.item.final_by) { r.item.final_by = QCStore.addDays(today, 7); dirty = true; } // saved once after the loop, not per job
      var t = chaseText(r.kind, j, r.item, r.days, r.kind === 'invoice' && r.tier === 3 && !showFinal ? { tier: 2, chased: true } : r.kind === 'invoice' ? { chased: r.chased } : {}); r.text = t;
      var lc = lastContact(j), lcDays = lc ? QCStore.daysBetween(lc.date, today) : null;
      var toPhone = r.kind === 'statement' ? r.phone : j.client.phone, toEmail = r.kind === 'statement' ? (r.accounts_email || r.email) : j.client.email;
      var landline = QCMsg.isLandline(toPhone), phoneOk = toPhone && !landline;
      var auto = r.kind === 'statement' ? null : pendingFollowUps(j).filter(function (x) { return r.kind === 'quote' ? x.what.indexOf('quote+') === 0 : x.what.indexOf(r.item.no + '+') === 0; }).sort(byDay)[0];
      var sms = 'sms:' + (toPhone || '').replace(/[^\d+]/g, '') + '?&body=' + encodeURIComponent(t.sms), mail = 'mailto:' + (toEmail || '').replace(/[\s"'<>?#&]/g, '') + '?subject=' + encodeURIComponent(t.subject) + '&body=' + encodeURIComponent(t.email);
      var head = r.kind === 'invoice' ? esc(r.item.no) + ', ' + money(invBalance(r.item).balance) + ' owing, ' + r.days + ' days overdue' : r.kind === 'statement' ? r.invs.length + ' invoice' + (r.invs.length > 1 ? 's' : '') + ', ' + money(r.total) + ' owing, oldest ' + r.days + ' days overdue' : esc(j.quote_no) + ', ' + money(j.quote.total) + ', waiting ' + r.days + ' days';
      var note = (lc ? 'Last contact: ' + QCPdf.fmtDate(lc.date) + (lc.channel ? ' by ' + lc.channel : '') + (lcDays === 0 ? ', chased today. ' : lcDays === 1 ? ', chased yesterday. ' : '. ') : '') + (auto ? 'Goes by itself on ' + QCPdf.fmtDate(auto.day) + '. ' : '') + (landline ? 'Landline number, so no text. ' : '') +
        (r.kind === 'invoice' && r.tier === 3 && !showFinal ? 'The final notice is behind Show final notice. ' : '') +
        (r.kind === 'statement' ? 'One statement, not one per invoice. ' + (r.accounts_email ? 'Goes to accounts: ' + esc(r.accounts_email) + '. ' : 'Goes to ' + esc(r.email || 'the contact') + '. ') : t.biz ? 'Statement wording. ' : '');
      html += '<div class="card chase' + (hold ? ' held' : '') + '"><div class="row between"><div><b>' + esc(r.kind === 'statement' ? r.name : (j.client.name || j.quote_no)) + '</b><span class="hint"> · ' + head + '</span></div><span class="pill ' + (showFinal ? 'bad' : r.tier >= 2 ? 'warn' : '') + '">' + (hold ? 'On hold' : showFinal ? 'Final notice' : r.tone) + '</span></div>' +
        '<p class="hint">' + note + '</p>' +
        (hold ? '<p class="muted">Reminders are on hold' + (j.hold.note ? ': ' + esc(j.hold.note) : '') + '.</p><div class="row"><button class="btn sm" data-hold="' + k + '">Resume reminders</button><a class="btn ghost sm" href="#/job/' + j.id + '">Open job</a></div>' :
          (showFinal ? '<p class="legal">This threatens legal action. Send it only if you mean it.</p>' : '') + '<div class="msg">' + esc(t.sms) + '</div>' +
          '<div class="row">' + (QCMsg.ready('sms') && phoneOk ? '<button class="btn tape" data-sendnow="' + k + '" data-ch="sms">Send text now</button>' : '') + (QCMsg.ready('email') && toEmail ? '<button class="btn" data-sendnow="' + k + '" data-ch="email">Send email now</button>' : '') + (phoneOk ? '<a class="btn tile ' + (QCMsg.ready('sms') ? 'ghost' : 'tape') + '" href="' + esc(sms) + '"' + QCPics.says('Text') + '>' + QCPics.tile('text', 'Text') + '</a>' : '') + (toEmail ? '<a class="btn tile ' + (QCMsg.ready('email') || phoneOk ? 'ghost' : '') + '" href="' + esc(mail) + '"' + QCPics.says('Email') + '>' + QCPics.tile('mail', 'Email') + '</a>' : '') +
          (r.kind === 'statement' && ho && window.QCPdf && QCPdf.statementPDF ? '<button class="btn ghost tile" data-stmt="' + k + '"' + QCPics.says('Send the statement') + '>' + QCPics.tile('doc', 'Statement') + '</button>' : '') + (r.kind === 'invoice' && ho && window.QCPdf && QCPdf.invoicePDF ? '<button class="btn ghost tile" data-invcopy="' + k + '"' + QCPics.says('Send a copy of the invoice') + '>' + QCPics.tile('invoice', 'Invoice') + '</button>' : '') +
          (r.kind === 'invoice' && r.tier === 3 ? '<button class="btn ghost" data-final="' + k + '">' + (showFinal ? 'Back to the reminder' : 'Show final notice') + '</button>' : '') + '</div>' +
          '<div class="row second tiles"><button class="btn ghost tile" data-share="' + k + '"' + QCPics.says('Share') + '>' + QCPics.tile('share', 'Share') + '</button><button class="btn ghost tile" data-copy="' + k + '"' + QCPics.says('Copy the message') + '>' + QCPics.tile('copy', 'Copy') + '</button><button class="btn ghost tile" data-chased="' + (r.kind === 'statement' ? r.jobs.map(function (x) { return x.id; }).join(',') : j.id) + '"' + QCPics.says('Mark chased') + '>' + QCPics.tile('check', 'Chased') + '</button><button class="btn ghost tile" data-hold="' + k + '"' + QCPics.says('Hold the reminders') + '>' + QCPics.tile('pause', 'Hold') + '</button><a class="btn ghost tile" href="#/job/' + j.id + '"' + QCPics.says('Open job') + '>' + QCPics.tile('open', 'Job') + '</a></div>') + '</div>';
    });
    if (dirty) save();
    $app.innerHTML = html; wireBanner();
    $app.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { var t = rows[+b.dataset.copy].text.sms; if (navigator.clipboard) navigator.clipboard.writeText(t); toast('Copied'); }); });
    $app.querySelectorAll('[data-share]').forEach(function (b) { b.addEventListener('click', function () { var t = rows[+b.dataset.share].text.sms; if (navigator.share) navigator.share({ text: t }).catch(function () {}); else { if (navigator.clipboard) navigator.clipboard.writeText(t); toast('Copied. Paste it into WhatsApp or Messages.'); } }); });
    $app.querySelectorAll('[data-final]').forEach(function (b) { b.addEventListener('click', function () { var r = rows[+b.dataset.final]; chaseShowFinal[r.item.no] = !chaseShowFinal[r.item.no]; var y = window.scrollY; viewChase(); window.scrollTo(0, y); }); });
    $app.querySelectorAll('[data-sendnow]').forEach(function (b) { b.addEventListener('click', function () {
      var r = rows[+b.dataset.sendnow], ch = b.dataset.ch, j = r.job, name = r.kind === 'statement' ? r.name : (j.client.name || j.quote_no), lc = lastContact(j), lcDays = lc ? QCStore.daysBetween(lc.date, today) : null;
      if (lcDays != null && lcDays < 2 && !confirm('You contacted ' + name + ' ' + (lcDays === 0 ? 'today' : 'yesterday') + '. Send this as well?')) return;
      if (r.text.final && !confirm('This is the final notice. It names a collection agency or the tribunal. Send it?')) return;
      b.disabled = true; var ref = r.kind === 'invoice' ? r.item.no + '+' + r.days : r.kind === 'statement' ? 'statement+' + r.days : 'quote+' + r.days, toEmail = r.kind === 'statement' ? (r.accounts_email || r.email) : j.client.email, toPhone = r.kind === 'statement' ? r.phone : j.client.phone;
      var payload = ch === 'sms' ? { action: 'send', channel: 'sms', to: toPhone, body: r.text.sms, meta: { job: j.id, ref: ref } } : { action: 'send', channel: 'email', to: toEmail, subject: r.text.subject, body: r.text.email, reply_to: S.details.email || undefined, meta: { job: j.id, ref: ref } };
      QCMsg.call(payload).then(function () { (r.jobs || [j]).forEach(function (x) { x.last_chased = today; }); save(); toast('Sent by ' + (ch === 'sms' ? 'text' : 'email')); viewChase(); }).catch(function (e) { b.disabled = false; showBlock(b, 'Could not send: ' + e.message, { kind: 'bad' }); });
    }); });
    $app.querySelectorAll('[data-chased]').forEach(function (b) { b.addEventListener('click', function () { b.dataset.chased.split(',').forEach(function (id) { var j = QCStore.getJob(id); if (j) j.last_chased = today; }); save(); toast('Noted'); viewChase(); }); });
    var handDoc = function (b, r, kind, doc, filename, who) { if (!doc) return; var done = function (res) { if (res && res.sent) { (r.jobs || [r.job]).forEach(function (x) { x.last_chased = today; }); save(); viewChase(); } }; if (ho) ho({ kind: kind, doc: doc, filename: filename, whoName: who.name, whoPhone: who.phone, whoEmail: who.email, onResult: done }); else if (QCPdf.deliver) QCPdf.deliver(doc, filename); };
    $app.querySelectorAll('[data-stmt]').forEach(function (b) { b.addEventListener('click', function () { var r = rows[+b.dataset.stmt], doc = null; try { doc = QCPdf.statementPDF(r.jobs, S, { client: r.job.client }); } catch (e) { showBlock(b, 'Could not make the statement: ' + e.message, { kind: 'bad' }); return; } handDoc(b, r, 'statement', doc, 'Statement ' + String(r.name || '').replace(/[^\w ]+/g, '') + '.pdf', { name: r.name, phone: r.phone, email: r.accounts_email || r.email }); }); });
    $app.querySelectorAll('[data-invcopy]').forEach(function (b) { b.addEventListener('click', function () { var r = rows[+b.dataset.invcopy], doc = null; try { doc = QCPdf.invoicePDF(r.job, r.item, S); } catch (e) { showBlock(b, 'Could not make the invoice: ' + e.message, { kind: 'bad' }); return; } handDoc(b, r, 'invoice', doc, r.item.no + '.pdf', { name: r.job.client.name, phone: r.job.client.phone, email: r.job.client.email }); }); });
    $app.querySelectorAll('[data-hold]').forEach(function (b) { b.addEventListener('click', function () {
      var r = rows[+b.dataset.hold], j = r.job, name = r.kind === 'statement' ? r.name : (j.client.name || j.quote_no);
      if (j.hold && j.hold.on) { j.hold.on = false; save(); toast('Reminders resume.'); viewChase(); return; }
      var note = prompt('Hold reminders for ' + name + '. Why? (optional, kept on the job)', ''); if (note === null) return;
      j.hold = { on: true, note: String(note).slice(0, 200) }; save(); b.disabled = true;
      cancelJobFollowUps(j).then(function (res) { toast(res.failed ? 'On hold. ' + res.failed + ' reminder' + (res.failed > 1 ? 's' : '') + ' still to cancel when you are back online.' : 'On hold' + (res.done ? ', ' + res.done + ' reminder' + (res.done > 1 ? 's' : '') + ' cancelled' : '') + '.'); viewChase(); });
    }); });
    $app.querySelectorAll('[data-cancelfu]').forEach(function (b) { b.addEventListener('click', function () {
      var f = flat[+b.dataset.cancelfu]; b.disabled = true;
      if (f.w) { S.local_queue = (S.local_queue || []).filter(function (q) { return q.key !== f.w.key; }); save(); toast('Removed'); viewChase(); return; }
      cancelList([f.x], f.job.id).then(function () { toast(f.x.cancelled ? 'Cancelled' : 'Could not cancel: ' + (f.x.cancel_error || 'relay error') + '. It retries when you are back online.'); viewChase(); });
    }); });
  }

  // ---------- Phone enquiry: ballpark from room presets, then a visit slot that respects travel
  function viewEnquiry(job) {
    var isNew = !job; if (isNew) { job = { client: { name: '', phone: '', email: '', address: '' }, summary: '', picks: [], condition: 'good' }; }
    job.picks = job.picks || []; job.condition = job.condition || 'good'; job.scope = { walls: 1, walls_ceilings: 1, all: 1 }[job.scope] ? job.scope : 'all';
    var SCOPE_OPTS = [['walls', 'Walls only'], ['walls_ceilings', 'Walls and ceilings'], ['all', 'Full repaint']], SCOPE_SAY = { walls: 'walls only', walls_ceilings: 'walls and ceilings', all: 'walls, ceilings, doors and trim' };
    var html = '<a class="hint" href="#/">&larr; Jobs</a><div class="row between"><h1>Phone enquiry</h1>' + (job.id ? statusPill(job) : '') + '</div>';
    html += '<div class="card"><div class="g2"><label class="f">Name<input type="text" data-bind="client.name" autocomplete="off" list="clientlist"><datalist id="clientlist">' + (typeof clients === 'function' ? clients().map(function (c) { return '<option value="' + esc(c.name) + '">' + esc([c.address, c.phone].filter(Boolean).join(' · ')) + '</option>'; }).join('') : '') + '</datalist></label><label class="f">Mobile<input type="tel" data-bind="client.phone"></label></div><label class="f">Address<span>include postcode</span><input type="text" data-bind="client.address" data-refresh="1"></label><label class="f">Description<span>what the customer will see</span><input type="text" data-bind="summary" placeholder="Repaint lounge and hall"></label></div>';
    html += '<div class="card"><h3>Rooms</h3><label class="f">What</label><div class="chips" id="scopechips">' + SCOPE_OPTS.map(function (o) { return '<button class="chip' + (job.scope === o[0] ? ' on' : '') + '" data-scope="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div><div class="row" id="roomchips">' + Object.keys(QCSched.PRESETS).map(function (k) { return '<button class="btn ghost sm" data-room="' + k + '">' + esc(QCSched.PRESETS[k][0]) + '</button>'; }).join('') + '</div><div id="picks"></div>' +
      '<label class="f">Condition<span>fair = scuffs, poor = peeling</span><select data-bind="condition" data-refresh="1"><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option></select></label></div>';
    html += '<div class="card"><span class="hint">Ballpark' + (S.details.gst ? ' inc GST' : '') + '</span><h2 id="ballpark">' + (job.picks.length ? '' : 'Add rooms') + '</h2><p class="hint" id="bpnote"></p><div class="row"><button class="btn sm" id="textbp">Text ballpark</button><button class="btn ghost sm" id="savebp">Save as job</button></div><p class="status" id="bpstatus"></p></div>';
    html += '<div class="card"><h3>Quote visit</h3>' + (job.visit ? '<p><b>' + dayDate(job.visit.date) + ' at ' + QCSched.nice(job.visit.start_min) + '</b> for ' + job.visit.minutes + ' min. ' + esc(whyText(job.visit.why, job.visit.detour)) + '</p><div class="row"><button class="btn sm" id="visitics">Add to calendar</button><a class="btn ghost sm" href="' + esc(job.visit.gcal || '#') + '" target="_blank" rel="noopener">Google Calendar</a><button class="btn ghost sm" id="textvisit">Text confirmation</button><button class="btn ghost sm" id="unvisit">Change</button></div>' :
      '<p class="hint">' + (S.booking.visit_pref === 'after_work' ? 'After work and Saturday mornings first.' : S.booking.visit_pref === 'mornings' ? 'Mornings first.' : 'Least driving.') + '</p><div class="row"><label class="f">Visit length, min<input type="number" id="vmin" value="' + esc(S.booking.visit_minutes || 30) + '" min="10" step="5" style="width:6em"></label><button class="btn tape sm" id="findslots">Find a slot</button></div><div id="slots"></div>' +
      '<details class="adv"><summary>Or pick a time</summary><div class="row"><label class="f">Date<input type="date" id="vdate"></label><label class="f">Time<input type="time" id="vtime" value="16:30"></label><button class="btn sm" id="vpick" style="align-self:end">Book it</button></div></details>') + '</div>';
    $app.innerHTML = html; bindAll($app, job); wireAddress($app.querySelector('[data-bind="client.address"]'), function (pl) { if (job.id) { siteFromPlace(job, pl); save(); } });
    function ensureSaved() { if (!job.id) { var j = QCStore.newJob(); Object.keys(job).forEach(function (k) { if (k !== 'id') j[k] = job[k]; }); j.status = 'enquiry'; job = j; save(); } return job; }
    function renderPicks() { var box = document.getElementById('picks'); box.innerHTML = job.picks.map(function (p, i) { return '<div class="row between" style="border-top:1px solid var(--line);padding-top:6px"><span><b>' + esc(QCSched.PRESETS[p.type][0]) + '</b>' + (p.n > 1 ? ' × ' + p.n : '') + '</span><span class="row">' + ['S', 'M', 'L'].map(function (sz) { return '<button class="btn sm ' + (p.size === sz ? 'tape' : 'ghost') + '" data-size="' + i + ':' + sz + '">' + sz + '</button>'; }).join('') + '<button class="btn ghost sm" data-less="' + i + '">−</button></span></div>'; }).join('');
      box.querySelectorAll('[data-size]').forEach(function (b) { b.addEventListener('click', function () { var a = b.dataset.size.split(':'); job.picks[+a[0]].size = a[1]; if (job.id) save(); renderPicks(); refreshPreview(); }); });
      box.querySelectorAll('[data-less]').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.less; job.picks[i].n -= 1; if (job.picks[i].n <= 0) job.picks.splice(i, 1); if (job.id) save(); renderPicks(); refreshPreview(); }); }); }
    refreshPreview = function () {
      var bp = document.getElementById('ballpark'), note = document.getElementById('bpnote'); if (!job.picks.length) { bp.textContent = 'Add rooms'; note.textContent = ''; job.ballpark = null; return; }
      var r = QCSched.ballpark(job.picks, job.condition, S, job.client.address, { scope: job.scope }); if (r.scope && r.scope !== job.scope) { try { var r2 = QCSched.ballpark(job.picks, job.condition, S, job.client.address, job.scope); if (r2 && r2.scope === job.scope) r = r2; } catch (e) {} } // the engine takes the scope either way
      job.ballpark = { low: r.low, high: r.high, mid: r.mid, scope: job.scope }; if (job.id) save();
      bp.textContent = money(r.low) + ' to ' + money(r.high); var tr = r.priced.travel; if (r.priced.confirm.length) { note.textContent = r.priced.confirm.length + ' price' + (r.priced.confirm.length > 1 ? 's are' : ' is') + ' missing from your price list, so this is low. Fill them in under Set-up.'; return; } note.textContent = r.rooms.length + ' room' + (r.rooms.length > 1 ? 's' : '') + ' at typical sizes, ' + SCOPE_SAY[job.scope] + ', ' + job.condition + ' condition' + (tr && tr.amount ? ', ' + money(tr.amount) + ' travel included' : '') + '. An estimate, not a quote; measured on the day it firms up.';
    };
    renderPicks(); refreshPreview();
    $app.querySelectorAll('[data-scope]').forEach(function (b) { b.addEventListener('click', function () { job.scope = b.dataset.scope; $app.querySelectorAll('[data-scope]').forEach(function (x) { x.classList.toggle('on', x === b); }); if (job.id) save(); refreshPreview(); }); });
    $app.querySelectorAll('[data-room]').forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.room, ex = job.picks.filter(function (p) { return p.type === k; })[0]; if (ex) ex.n += 1; else job.picks.push({ type: k, size: 'M', n: 1 }); if (job.id) save(); renderPicks(); refreshPreview(); }); });
    function bpText() { var det = S.details; return greet(job) + ' the rough range for ' + jobDesc(job) + (job.scope === 'walls' ? ' (walls only)' : job.scope === 'walls_ceilings' ? ' (walls and ceilings)' : '') + ' is ' + money(job.ballpark.low) + ' to ' + money(job.ballpark.high) + (det.gst ? ' inc GST' : '') + '. That is an estimate from the room sizes you gave me, not a quote; I will give you a fixed price after I measure on site. ' + (job.visit ? 'Quote visit ' + QCPdf.fmtDate(job.visit.date) + ' at ' + QCSched.nice(job.visit.start_min) + '. ' : '') + signoff(S) + (det.trading_name ? ', ' + det.trading_name : ''); }
    // text through the relay when it is set up and the number is a mobile; a landline gets email or the share sheet instead
    var bpStatus = function (m, cls) { var el = document.getElementById('bpstatus'); if (el) { el.textContent = m; el.className = 'status ' + (cls || ''); } else toast(m); };
    function sendText(t, ref) {
      var phone = job.client.phone || '', landline = QCMsg.isLandline(phone);
      if (landline) { if (job.client.email) { bpStatus('That is a landline, so no text. Mail is opening with the words ready; press send there.', 'ok'); openUrl('mailto:' + job.client.email.replace(/[\s"'<>?#&]/g, '') + '?subject=' + encodeURIComponent('Your quote') + '&body=' + encodeURIComponent(t)); } else if (navigator.share) { bpStatus('That is a landline, so no text. Pick where to send it.', 'ok'); navigator.share({ text: t }).catch(function () {}); } else bpStatus('That is a landline number, so no text. Add an email address to send it.', 'warn'); return; }
      if (QCMsg.ready('sms') && phone) { QCMsg.call({ action: 'send', channel: 'sms', to: phone, body: t, meta: { job: job.id, ref: ref } }).then(function () { job.last_chased = QCStore.today(); save(); bpStatus('Texted to ' + phone + '.', 'ok'); }).catch(function (e) { bpStatus('Could not send: ' + e.message, 'bad'); }); }
      else { if (!phone) { bpStatus('Type their mobile number first.', 'warn'); return; } bpStatus('Messages is opening with the text ready. Press send there.', 'ok'); openUrl('sms:' + phone.replace(/\s+/g, '') + '?&body=' + encodeURIComponent(t)); }
    }
    document.getElementById('textbp').addEventListener('click', function () { if (!job.ballpark) { bpStatus('Add rooms first.', 'warn'); return; } ensureSaved(); sendText(bpText(), 'ballpark'); });
    document.getElementById('savebp').addEventListener('click', function () { ensureSaved(); job.rooms = QCSched.roomsFrom(job.picks, job.condition, S.rules.ceiling_height_m, job.scope); job.status = 'draft'; save(); toast('Saved as job'); go('/job/' + job.id); });
    function bookVisit(date, startMin, mins, why, detour) { ensureSaved(); job.visit = { date: date, start_min: startMin, minutes: mins, why: why || '', detour: detour || 0 }; job.visit.gcal = QCCal.googleUrl(visitEvent(job)); save(); toast('Visit booked ' + QCPdf.fmtDate(date) + ' ' + QCSched.nice(startMin)); viewEnquiry(job); }
    var fs2 = document.getElementById('findslots'); if (fs2) fs2.addEventListener('click', function () {
      var mins = parseInt(document.getElementById('vmin').value, 10) || 30, res = QCSched.suggest({ jobs: S.jobs.filter(function (j) { return j !== job && j.id !== job.id; }), settings: S, address: job.client.address, minutes: mins, count: 20 }), box = document.getElementById('slots');
      if (!res.slots.length) { box.innerHTML = '<p class="confirm">No free slot in the next two weeks. Check hours in Set-up, or pick a time below.</p>'; return; }
      // at most one morning and one afternoon per day, in the engine's order; after-work preference puts 4pm+ and Saturday mornings first
      var seen = {}, slots = res.slots.filter(function (sl) { var k = sl.date + (sl.start_min < 12 * 60 ? 'am' : 'pm'); if (seen[k]) return false; seen[k] = 1; return true; });
      var pref = S.booking.visit_pref, isBiz = isBizClient(job), late = function (sl) { return sl.start_min >= 16 * 60 || (new Date(sl.date + 'T00:00:00').getDay() === 6 && sl.start_min < 12 * 60); };
      if (pref === 'after_work' && !isBiz) slots = slots.filter(late).concat(slots.filter(function (sl) { return !late(sl); })); else if (pref === 'mornings') slots = slots.filter(function (sl) { return sl.start_min < 12 * 60; }).concat(slots.filter(function (sl) { return sl.start_min >= 12 * 60; }));
      slots.forEach(function (sl) { if (!sl.after && !sl.before && sl.start_min < 8 * 60) sl.start_min = 8 * 60; }); // a free morning: offer 8am, not the 7am job start
      var early = function (sl) { return sl.start_min < 8 * 60; }; if (slots.some(function (sl) { return !early(sl); })) slots = slots.filter(function (sl) { return !early(sl); }).concat(slots.filter(early)); // nobody wants a 7am knock unless there is nothing else
      slots = slots.slice(0, 6);
      var clear = slots.every(function (sl) { return /clear day/.test(sl.why || ''); }), drive = Math.round((slots[0].detour || 0) / 2) || QCSched.travelMin(String(S.details.postcode || ''), res.postcode);
      var hint = function (sl) { if (/clear day/.test(sl.why || '')) return (Math.round((sl.detour || 0) / 2) || drive) + ' min drive each way'; return sl.why + (sl.detour ? ', adds ' + sl.detour + ' min driving' : ''); };
      box.innerHTML = (res.known ? '' : '<p class="confirm">No postcode in the address, so driving time is not counted.</p>') + (clear ? '<p class="hint">Nothing else booked. Pick one:</p>' : '') +
        slots.map(function (sl, i) { return '<button class="btn ' + (i === 0 ? 'tape' : 'ghost') + ' sm slot" data-slot="' + i + '"><b>' + dayDate(sl.date) + ', ' + QCSched.nice(sl.start_min) + '</b>&nbsp;<span class="hint">(' + mins + ' min, ' + esc(hint(sl)) + ')</span></button>'; }).join('');
      box.querySelectorAll('[data-slot]').forEach(function (b) { b.addEventListener('click', function () { var sl = slots[+b.dataset.slot]; bookVisit(sl.date, sl.start_min, mins, sl.why, sl.detour); }); });
    });
    var vp = document.getElementById('vpick'); if (vp) vp.addEventListener('click', function () { var d = document.getElementById('vdate').value, t = document.getElementById('vtime').value || '16:30', mins = parseInt((document.getElementById('vmin') || {}).value, 10) || 30; if (!d) { showBlock(vp, 'Pick a date first.'); return; } var p = t.split(':'); bookVisit(d, (+p[0]) * 60 + (+p[1] || 0), mins, 'picked by hand', 0); });
    var vmEl = document.getElementById('vmin'); if (vmEl) vmEl.addEventListener('change', function () { var v = parseInt(vmEl.value, 10); if (v >= 5 && v <= 480) { S.booking.visit_minutes = v; save(); toast('Visit length remembered'); } else toast('Visit length is in minutes, 5 to 480.'); });
    var vi = document.getElementById('visitics'); if (vi) vi.addEventListener('click', function () { QCCal.deliver(QCCal.ics([visitEvent(job)], 'Chasem visits'), 'visit-' + job.quote_no + '.ics').then(function () { toast('Added to calendar'); }); });
    var tv = document.getElementById('textvisit'); if (tv) tv.addEventListener('click', function () { var t = greet(job) + ' confirming the quote visit on ' + QCPdf.fmtDate(job.visit.date) + ' at ' + QCSched.nice(job.visit.start_min) + ', about ' + job.visit.minutes + ' minutes. ' + signoff(S); sendText(t, 'visit'); });
    var uv = document.getElementById('unvisit'); if (uv) uv.addEventListener('click', function () { job.visit = null; save(); viewEnquiry(job); });
  }
  function whyText(why, detour) { why = String(why || ''); var m = /clear day, (\d+) min/.exec(why); if (m) return 'Nothing else on that day. About ' + m[1] + ' min from home.'; if (/clear day/.test(why)) return 'Nothing else on that day.'; if (/nothing else near it/.test(why)) return 'Nothing else near it that day.'; if (/picked by hand/.test(why)) return 'Picked by hand.'; if (/first free slot/.test(why)) return 'First free time.'; return why ? why.charAt(0).toUpperCase() + why.slice(1) + (detour ? ', about ' + detour + ' min extra driving' : '') + '.' : ''; }
  function visitEvent(job) { return { uid: job.id + '-visit-' + job.visit.date, summary: 'Quote visit: ' + (job.client.name || job.quote_no), description: (job.summary || '') + (job.ballpark ? '\nBallpark ' + money(job.ballpark.low) + ' to ' + money(job.ballpark.high) : '') + '\n' + (job.client.phone || ''), location: job.client.address || '', start: job.visit.date, startMin: job.visit.start_min, endMin: job.visit.start_min + (job.visit.minutes || 30), alarmBefore: 45 }; }
  // ---------- photos on the job: camera or library, squeezed to 1024 px JPEG, up to 8, with a caption and an "on quote" tick (up to 4 print)
  function photosCard(job, roomId) {
    var all = job.photos || [], list = roomId ? all.filter(function (p) { return p.room === roomId; }) : all;
    return '<div class="card" id="photos"><div class="row between"><h3>Photos</h3><div class="row"><label class="btn ghost tile"' + QCPics.says('Take a photo') + '>' + QCPics.tile('camera', 'Camera') + '<input type="file" accept="image/*" capture="environment" data-photo="cam"></label><label class="btn ghost tile"' + QCPics.says('Choose photos') + '>' + QCPics.tile('image', 'Photos') + '<input type="file" accept="image/*" multiple data-photo="lib"></label></div></div>' +
      (list.length ? '<div class="pgrid">' + list.map(function (p) { return '<figure class="ph"><img src="' + esc(/^data:image\//.test(p.data) ? p.data : '') + '" alt=""><input type="text" placeholder="Caption" aria-label="Photo caption" data-pcap="' + esc(p.id) + '" value="' + esc(p.caption || '') + '"><div class="row between"><label class="hint"><input type="checkbox" data-pq="' + esc(p.id) + '" ' + (p.on_quote ? 'checked' : '') + '> on quote</label><button class="btn ghost sm" data-pdel="' + esc(p.id) + '">Delete</button></div></figure>'; }).join('') + '</div>' : '<p class="hint">Up to 4 go on the quote.</p>') +
      (all.length >= 8 ? '<p class="hint">8 photos is the limit per job.</p>' : '') + '</div>';
  }
  function photoById(job, id) { return (job.photos || []).filter(function (p) { return p.id === id; })[0]; }
  function compressImage(file, maxPx, q) {
    var load; try { load = window.createImageBitmap ? createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(file); }) : null; } catch (e) { load = null; }
    if (!load) load = new Promise(function (res, rej) { var img = new Image(); img.onload = function () { res(img); }; img.onerror = rej; img.src = URL.createObjectURL(file); });
    return load.then(function (b) { var w = b.width || b.naturalWidth, h = b.height || b.naturalHeight, sc = Math.min(1, maxPx / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc)); c.getContext('2d').drawImage(b, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); });
  }
  function addPhotos(job, files, roomId) {
    job.photos = job.photos || []; var room = Math.max(0, 8 - job.photos.length); if (!room) { toast('8 photos is the limit per job. Delete one first.'); return Promise.resolve(0); }
    var todo = files.slice(0, room), n = 0;
    return todo.reduce(function (p, f) { return p.then(function () { return compressImage(f, 1024, 0.72).then(function (data) { if (data) { job.photos.push({ id: QCStore.uid(), data: data, caption: '', room: roomId || '', on_quote: false, taken: QCStore.today() }); n++; } }).catch(function () {}); }); }, Promise.resolve())
      .then(function () { if (n) { save(); if (QCStore.lastError()) toast('Could not save the photos. Storage is full.'); } return n; });
  }
  function wirePhotos(root, job, roomId, rerender) {
    root.querySelectorAll('[data-photo]').forEach(function (inp) { inp.addEventListener('change', function () { var files = Array.prototype.slice.call(inp.files || []); inp.value = ''; if (!files.length) return; addPhotos(job, files, roomId).then(function (n) { if (n) toast(n + ' photo' + (n > 1 ? 's' : '') + ' added'); else toast('Could not read that photo.'); rerender(); }); }); });
    root.querySelectorAll('[data-pcap]').forEach(function (el) { el.addEventListener('input', function () { var p = photoById(job, el.dataset.pcap); if (p) { p.caption = el.value; save(); } }); });
    root.querySelectorAll('[data-pq]').forEach(function (el) { el.addEventListener('change', function () { var p = photoById(job, el.dataset.pq); if (!p) return; if (el.checked && (job.photos || []).filter(function (x) { return x.on_quote; }).length >= 4) { el.checked = false; toast('Up to 4 photos go on the quote.'); return; } p.on_quote = el.checked; save(); }); });
    root.querySelectorAll('[data-pdel]').forEach(function (b) { b.addEventListener('click', function () { job.photos = (job.photos || []).filter(function (x) { return x.id !== b.dataset.pdel; }); save(); toast('Photo deleted'); rerender(); }); });
  }

  // ---------- Settings
  var FIVE = { p_walls: '', p_ceilings: '', p_door: '', p_prep_mod: 'walls in fair condition', p_setup: 'drop sheets, masking, clean-up' };
  // ---- a connected calendar. Nothing is written to it: the app asks the relay which days already have
  // something on them, and those days stop being offered to a customer picking a start day.
  function calendarState() { return (window.QCSync && QCSync.calendar && QCSync.calendar()) || null; }
  function calendarCard() {
    var hosted = S.sending && S.sending.hosted === true && String(S.sending.token || '').slice(0, 4) === 'qc1.';
    if (!hosted) return '';
    var c = calendarState(); if (c && c.off) return '';   // the relay has no Google credentials; nothing to offer
    var on = !!(c && c.connected);
    var line = !c ? 'Checking\u2026'
      : on ? (c.account ? esc(c.account) : 'Connected') + (c.days ? ' \u00b7 ' + c.days + ' day' + (c.days > 1 ? 's' : '') + ' blocked out' : ' \u00b7 nothing booked in the next three months')
      : 'Not connected.';
    return '<div class="card" id="calcard"><h2>Your calendar</h2>' +
      '<p class="hint">Days you are busy stop being offered. Reads free or busy only; never writes.</p>' +
      '<p class="hint" id="calline"><b>' + line + '</b></p>' +
      (on && c.error ? '<p class="confirm">' + esc(c.error) + ' Connect it again.</p>' : '') +
      '<div class="row">' + (on
        ? '<button class="btn ghost sm" id="calsync">Check it now</button><button class="btn danger sm" id="caloff">Disconnect</button>'
        : '<button class="btn sm" id="calon">Connect Google Calendar</button>') + '</div></div>';
  }
  // Google sends him back to #/settings?calendar=... Say what happened in his words, then drop the query so a
  // reload does not say it twice.
  function calendarReturn(qs) {
    var m = String(qs || '').match(/(?:^|&)calendar=([^&]*)/); if (!m) return;
    var what = decodeURIComponent(m[1] || ''), why = (String(qs).match(/(?:^|&)why=([^&]*)/) || [])[1];
    why = why ? decodeURIComponent(why) : '';
    var say = { on: 'Calendar connected. Days you are already busy will not be offered.',
                no: 'Calendar not connected. ' + (why || 'You can try again any time.'),
                expired: 'That took too long. Tap Connect again.',
                off: 'Calendars are not switched on for your account yet.',
                failed: 'That did not work. ' + (why || 'Try again.') }[what];
    if (say) toast(say);
    if (what === 'on' && window.QCSync && QCSync.gcal) QCSync.gcal('status').then(function (r) { if (r && r.ok) viewSettings(); });
    try { history.replaceState(null, '', location.pathname + location.search + '#/settings'); } catch (e) {}
  }

  function wireCalendar() {
    var line = document.getElementById('calline');
    var say = function (t) { if (line) line.innerHTML = '<b>' + esc(t) + '</b>'; };
    var on = document.getElementById('calon');
    if (on) on.addEventListener('click', function () {
      on.disabled = true; say('Opening Google\u2026');
      QCSync.gcal('start').then(function (r) {
        if (!r || !r.ok || !r.url) { on.disabled = false; say((r && r.error) || 'That did not work.'); return; }
        location.href = r.url;   // he comes back to #/settings?calendar=on
      });
    });
    var sync = document.getElementById('calsync');
    if (sync) sync.addEventListener('click', function () {
      sync.disabled = true; say('Reading your calendar\u2026');
      QCSync.gcal('sync').then(function (r) {
        sync.disabled = false;
        if (!r || !r.ok) { say((r && r.error) || 'Could not read it. Connect it again.'); return; }
        viewSettings();
      });
    });
    var off = document.getElementById('caloff');
    if (off) off.addEventListener('click', function () {
      if (!confirm('Disconnect your calendar? The days it was blocking out become available again.')) return;
      off.disabled = true;
      QCSync.gcal('disconnect').then(function () { toast('Calendar disconnected.'); viewSettings(); });
    });
    // fresh from Google, or opening Set-up cold: ask the relay where things stand
    if (!calendarState() && window.QCSync && QCSync.gcal) QCSync.gcal('status').then(function (r) { if (r && (r.ok || r.off)) viewSettings(); });
  }

  // ---------- test drive: the whole job, walked through on purpose, with somewhere to put what breaks
  // ---------- when the phone will not keep his work
  // The one thing that must never happen quietly. This bar stays until a save works, and the way out is to get
  // the data off the phone, which needs no storage at all.
  var troubleKind = '';
  function exportBackup() {
    var blob = new Blob([QCStore.exportAll()], { type: 'application/json' });
    var name = 'chasem-backup-' + QCStore.today() + '.json';
    try {
      var f = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: name });
    } catch (e) {}
    var u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(u); } catch (e) {} }, 4000);
    return null;
  }
  function saveTrouble(kind) {
    troubleKind = kind || '';
    var el = document.getElementById('savebar'); if (!el) return;
    if (!troubleKind) { el.hidden = true; el.innerHTML = ''; return; }
    var says = troubleKind === 'full' ? '<b>This phone is full.</b> Your last change was not saved.'
      : troubleKind === 'blocked' ? '<b>Not saving.</b> This is a private window, so nothing can be kept.'
      : '<b>Not saving.</b> Your last change was not kept.';
    el.hidden = false;
    el.innerHTML = '<span>' + says + '</span><span><button class="btn sm" id="savebarout">Save a copy</button></span>';
    var out = document.getElementById('savebarout');
    if (out) out.addEventListener('click', function () { try { exportBackup(); } catch (e) { toast('Could not make the file.'); } });
  }

  function testBar() {
    var el = document.getElementById('testbar'); if (!el) return;
    var t = window.QCTest && QCTest.state();
    if (!t || !t.on) { el.hidden = true; el.innerHTML = ''; return; }
    var mine = [String(S.details.phone || '').trim(), String(S.details.email || '').trim()].filter(Boolean).join(' and ');
    el.hidden = false;
    el.innerHTML = '<span><b>Test drive.</b> ' + (t.divert === false ? 'Sending to real numbers.'
      : (mine ? 'Everything comes to ' + esc(mine) + '.' : 'No mobile or email of yours yet.')) + '</span>' +
      '<span><a href="#/test">Steps</a> &nbsp; <a href="#" id="testoff">Off</a></span>';
    var off = document.getElementById('testoff');
    if (off) off.addEventListener('click', function (e) { e.preventDefault(); QCTest.set({ on: false }); toast('Test drive off.'); route(); });
  }

  function viewTest() {
    var t = QCTest.state(), found = t.found || [], steps = QCTest.STEPS;
    var byStep = {}; found.forEach(function (f) { if (f.step_id) byStep[f.step_id] = f; });
    var done = steps.filter(function (x) { return byStep[x.id]; }).length;
    var broken = found.filter(function (f) { return f.verdict === 'broken'; }).length;
    var mineOk = !!(String(S.details.phone || '').trim() || String(S.details.email || '').trim());

    var html = '<div class="row between"><h1>Test drive</h1><span class="pill' + (t.on ? ' warn' : '') + '">' + (t.on ? 'On' : 'Off') + '</span></div>';
    html += '<div class="card"><div class="row"><button class="btn ' + (t.on ? 'ghost' : 'tape') + '" id="tdtoggle">' + (t.on ? 'Turn off' : 'Turn on') + '</button>' +
      (t.on ? '<label class="btn ghost sm"><input type="checkbox" id="tddivert"' + (t.divert === false ? '' : ' checked') + '> Send everything to me</label>' : '') + '</div>' +
      (t.on && t.divert === false ? '<p class="confirm">Messages go to the real numbers on the jobs.</p>' : '') +
      (t.on && !mineOk ? '<p class="confirm">No mobile or email of yours yet, so nothing can send.</p>' : '') + '</div>';

    html += '<div class="card"><div class="row"><button class="btn tape" id="tdseed">Load a busy week</button><button class="btn ghost" id="tdempty">Start empty</button></div>' +
      '<p class="hint">Both wipe this phone.</p></div>';

    html += '<div class="row between"><h2>Walk it through</h2><span class="hint">' + done + ' of ' + steps.length + (broken ? ' \u00b7 ' + broken + ' broken' : '') + '</span></div>';
    steps.forEach(function (st, i) {
      var f = byStep[st.id], cls = f ? (f.verdict === 'broken' ? ' bad' : f.verdict === 'works' ? ' done' : '') : '';
      html += '<details class="step' + cls + '" data-step="' + st.id + '"' + (f ? '' : ' open') + '>' +
        '<summary><h3><span>' + (f ? (f.verdict === 'broken' ? '\u2715 ' : '\u2713 ') : '') + esc(st.t) + '</span><span class="n">' + (i + 1) + '/' + steps.length + '</span></h3></summary>' +
        '<p>' + esc(st.d) + '</p>' +
        '<div class="row"><a class="btn sm" href="' + esc(st.go) + '">Open it</a>' +
        '<button class="btn ghost sm" data-td="works" data-for="' + st.id + '">Works</button>' +
        '<button class="btn danger sm" data-td="broken" data-for="' + st.id + '">Broken</button></div>' +
        '<textarea data-note="' + st.id + '" rows="2" placeholder="What happened?"' + (f && f.note ? '' : ' hidden') + '>' + esc(f ? f.note : '') + '</textarea>' +
        '</details>';
    });

    html += '<div class="card"><h2>Anything else</h2><textarea id="tdloose" rows="3" placeholder="An idea, a word that reads wrong, a slow screen."></textarea>' +
      '<div class="row"><button class="btn sm" id="tdadd">Add</button></div></div>';

    if (found.length) {
      html += '<div class="card"><div class="row between"><h2>Found</h2><span class="hint">' + found.length + '</span></div><ul class="found">' +
        found.slice().reverse().map(function (f) {
          return '<li>' + (f.verdict === 'broken' ? '<span class="b">\u2715</span> ' : '') +
            '<b>' + esc(f.step || 'Note') + '</b>' + (f.note ? ' \u2014 ' + esc(f.note) : '') + (f.sent ? ' <span class="hint">sent</span>' : '') + '</li>';
        }).join('') + '</ul>' +
        '<div class="row"><button class="btn tape" id="tdsend">Send them in</button><button class="btn ghost sm" id="tdcopy">Copy</button><button class="btn ghost sm" id="tdclear">Clear</button></div>' +
        '<p class="hint" id="tdres"></p></div>';
    }

    $app.innerHTML = html;
    wireTest();
  }

  function wireTest() {
    var t = QCTest.state();
    var tog = document.getElementById('tdtoggle');
    if (tog) tog.addEventListener('click', function () { QCTest.set({ on: !QCTest.state().on }); toast(QCTest.state().on ? 'Test drive on. Nothing reaches a customer.' : 'Test drive off.'); route(); });
    var dv = document.getElementById('tddivert');
    if (dv) dv.addEventListener('change', function () { QCTest.set({ divert: dv.checked }); route(); });

    var seed = document.getElementById('tdseed');
    if (seed) seed.addEventListener('click', function () {
      if (!confirm('Wipe this phone and load eight test jobs?')) return;
      var mine = { phone: S.details.phone, email: S.details.email };
      QCTest.wipe(); S = QCStore.load(); QCTest.seedSettings(mine); QCTest.set({ on: true });
      S = QCStore.load(); QCTest.seedBook(); S = QCStore.load();
      toast('Eight jobs loaded.'); go('/');
    });
    var empty = document.getElementById('tdempty');
    if (empty) empty.addEventListener('click', function () {
      if (!confirm('Wipe this phone and start empty?')) return;
      var mine = { phone: S.details.phone, email: S.details.email };
      QCTest.wipe(); S = QCStore.load(); QCTest.seedSettings(mine); QCTest.set({ on: true }); S = QCStore.load();
      toast('Empty, and set up.'); go('/');
    });

    Array.prototype.forEach.call($app.querySelectorAll('[data-td]'), function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-for'), ta = $app.querySelector('[data-note="' + id + '"]');
        var note = ta ? ta.value : '', broken = b.getAttribute('data-td') === 'broken';
        // the box appears when there is something to say, not on all fourteen at once
        if (broken && ta && ta.hidden) { ta.hidden = false; ta.focus(); b.textContent = 'Save'; return; }
        if (broken && !String(note).trim()) { showBlock(b, 'Say what went wrong.', { kind: 'warn' }); if (ta) ta.focus(); return; }
        QCTest.record(id, broken ? 'broken' : 'works', note);
        viewTest();
      });
    });

    var add = document.getElementById('tdadd');
    if (add) add.addEventListener('click', function () {
      var ta = document.getElementById('tdloose'), v = String(ta.value || '').trim();
      if (!v) { showBlock(add, 'Type it first.', { kind: 'warn' }); return; }
      QCTest.record('', 'note', v); ta.value = ''; toast('Added.'); viewTest();
    });

    var send = document.getElementById('tdsend');
    if (send) send.addEventListener('click', function () {
      var out = document.getElementById('tdres'); send.disabled = true; out.textContent = 'Sending\u2026';
      QCTest.sendFound().then(function (r) {
        var msg = r && r.ok ? 'Sent' + (r.mailed ? ' and emailed' : '') + '. Thanks.' : (r && r.error) || 'That did not work.';
        if (r && r.ok) viewTest();                       // redraw first, then say so on the fresh screen
        var el = document.getElementById('tdres'); if (el) el.textContent = msg;
        var btn = document.getElementById('tdsend'); if (btn) btn.disabled = false;
      });
    });
    var copy = document.getElementById('tdcopy');
    if (copy) copy.addEventListener('click', function () {
      var txt = QCTest.asText();
      try { navigator.clipboard.writeText(txt); toast('Copied.'); }
      catch (e) { var out = document.getElementById('tdres'); out.textContent = txt; }
    });
    var clr = document.getElementById('tdclear');
    if (clr) clr.addEventListener('click', function () { if (confirm('Clear the list?')) { QCTest.clearFound(); viewTest(); } });
  }

  function viewSettings() {
    var d = S.details, html = '<h1>Set-up</h1><p class="hint">Saves as you type.</p>', dirty = false;
    if (S.booking.boss_on_tools == null) { S.booking.boss_on_tools = true; dirty = true; } if (!S.booking.visit_pref) { S.booking.visit_pref = 'any'; dirty = true; } if (!d.state && d.postcode && stateFromPostcode(d.postcode)) { d.state = stateFromPostcode(d.postcode); dirty = true; } if (dirty) save();
    var lic = licenceWord(stateOf()), fn = String(d.owner_name || '').trim().split(/\s+/)[0] || '', full = String(d.owner_name || '').trim();
    function priceRow(p, hint) { return '<tr><td>' + esc(p[1]) + '<br><span class="hint">' + esc(hint != null ? hint : p[5]) + '</span></td><td class="n"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap"><input type="number" step="0.5" min="0" aria-label="' + esc(p[1]) + ' price" data-price="' + p[0] + '" value="' + (S.prices[p[0]] == null ? '' : S.prices[p[0]]) + '" style="width:5.5em;text-align:right"><span class="hint">per ' + esc(unitWord(p[2])) + '</span></div></td></tr>'; }
    var licField = '<label class="f">' + (lic ? lic.charAt(0).toUpperCase() + lic.slice(1) : 'Licence') + ' no.<span>' + (lic ? 'printed on quotes and invoices' : 'if you hold one; printed on quotes') + '</span><input type="text" data-bind="details.licence"></label>';
    // Business: what every quote needs, then the rest behind More (optional)
    html += '<div class="card"><h2>Business</h2><div class="g2"><label class="f">Trading name<input type="text" data-bind="details.trading_name"></label><label class="f">Your name<input type="text" data-bind="details.owner_name"></label><label class="f">ABN<span>goes on every quote and invoice</span><input type="text" data-bind="details.abn" inputmode="numeric"></label><label class="f">Mobile<input type="tel" data-bind="details.phone"></label><label class="f">Email<input type="email" data-bind="details.email"></label><label class="f">State<span>sets the deposit limit</span><select data-bind="details.state" id="st_state"><option value="">Pick one</option>' + STATES.map(function (st) { return '<option value="' + st + '">' + st + '</option>'; }).join('') + '</select></label><label class="f">Postcode<span>where you start the day</span><input type="text" data-bind="details.postcode" id="st_pc" inputmode="numeric" placeholder="e.g. 5000"></label>' + (lic ? licField : '') + '</div>' +
      '<details class="sec sub"><summary><h3>More (optional)</h3></summary><div class="g2">' + (lic ? '' : licField) + '<label class="f">Insurance<span>e.g. Public liability $10m</span><input type="text" data-bind="details.insurance"></label><label class="f">Service area<span>e.g. Bendigo and district</span><input type="text" data-bind="details.service_area"></label><label class="f">Sign-off<span>ends every text, e.g. Cheers</span><input type="text" data-bind="details.sign_off"></label></div><label class="f">Business address<input type="text" data-bind="details.address"></label>' +
      '<div class="g2"><label class="f">Quote numbers start with<span>e.g. Q-1001.</span><input type="text" data-bind="details.quote_prefix" placeholder="Q-"></label><label class="f">Next quote number<input type="number" data-bind="next_quote" min="1"></label><label class="f">Invoice numbers start with<input type="text" data-bind="details.invoice_prefix" placeholder="INV-"></label><label class="f">Next invoice number<span>match your books</span><input type="number" data-bind="next_invoice" min="1"></label></div>' +
      '<div class="row"><label class="f">Colour on your quotes<span>blank = blue</span></label><input type="color" id="brandcol" value="' + (/^#[0-9a-f]{6}$/i.test(d.brand_colour || '') ? esc(d.brand_colour) : '#2468C8') + '" aria-label="Colour on your quotes" style="width:64px;height:44px;padding:2px;border:1.5px solid var(--line);border-radius:10px;background:var(--ground)">' + (d.brand_colour ? '<button class="btn ghost sm" id="brandreset">Back to blue</button>' : '') + '</div>' +
      '<div class="row"><label class="btn ghost sm"><input type="checkbox" data-bind="details.first_name_signoff"> Texts end with ' + (fn && fn !== full ? '"' + esc(fn) + '", not "' + esc(full) + '"' : 'your first name only') + '</label><label class="btn ghost sm"><input type="checkbox" data-bind="details.show_rates"> Show the per-metre prices on the quote</label></div>' +
      '<div class="row"><label class="btn ghost sm">Logo<input type="file" id="logo" accept="image/*"></label>' + (d.logo ? '<img src="' + esc(/^data:image\//.test(d.logo) ? d.logo : '') + '" alt="" style="height:36px"> <button class="btn ghost sm" id="nologo">remove</button>' : '<span class="hint">optional, goes top-left of quotes</span>') + '</div></details></div>';
    html += '<div class="card"><h2>Bank details</h2><p class="hint">Printed on your invoices.</p><div class="g3"><label class="f">Account name<input type="text" data-bind="details.account_name"></label><label class="f">BSB<input type="text" data-bind="details.bsb" inputmode="numeric"></label><label class="f">Account no.<input type="text" data-bind="details.account_number" inputmode="numeric"></label></div><label class="f">Other payment methods<span>optional, printed under the bank box</span><input type="text" data-bind="details.other_payments" placeholder="Cash on the day"></label><label class="btn ghost sm"><input type="checkbox" data-bind="details.gst"> Registered for GST (add 10%)</label></div>';
    html += '<div class="card"><h2>Deposit and payment terms</h2><div class="g3"><label class="f">Deposit %<span>homeowners; change per job</span><input type="number" data-bind="details.deposit_pct" id="st_dep" min="0" max="100" step="0.5"></label><label class="f">Deposit due, days<span>after they accept</span><input type="number" data-bind="rules.deposit_due_days" min="0" placeholder="5"></label><label class="f">Payment days<span>after the invoice</span><input type="number" data-bind="details.balance_days" id="st_days" min="0"></label><label class="f">Quote valid, days<input type="number" data-bind="details.quote_valid_days" min="1"></label></div><p class="hint" id="depcap">' + esc(depCapNote()) + '</p>' +
      '<h3>Business clients</h3><p class="hint">Agents, strata, builders, commercial.</p><div class="g2"><label class="f">Deposit %<span>0 = no deposit</span><input type="number" data-bind="rules.business_deposit_pct" min="0" max="100" step="0.5" placeholder="0"></label><label class="f">Payment days<input type="number" data-bind="rules.business_days" min="0" placeholder="30"></label></div></div>';
    var items = QCStore.PRICE_ITEMS, five = Object.keys(FIVE).map(function (k) { return items.filter(function (p) { return p[0] === k; })[0]; }).filter(Boolean), rest = items.filter(function (p) { return !FIVE[p[0]]; });
    html += '<div class="card ponly"><h2>Prices</h2><p class="hint">Before GST, labour and paint in.</p><table><thead><tr><th>Item</th><th class="n">$</th></tr></thead><tbody>' + five.map(function (p) { return priceRow(p, FIVE[p[0]]); }).join('') + '</tbody></table>' +
      '<details class="sec sub"><summary><h3>More prices</h3></summary><p class="hint">Leave blank anything you do not offer.</p><table><thead><tr><th>Item</th><th class="n">$</th></tr></thead><tbody>' + rest.map(function (p, i) { return (i === 0 || p[4] !== rest[i - 1][4] ? '<tr><td colspan="2"><span class="tag">' + (p[4] === 'interior' ? 'Inside' : p[4] === 'exterior' ? 'Outside' : 'Job') + '</span></td></tr>' : '') + priceRow(p); }).join('') + '</tbody></table>' +
      '<div class="g3"><label class="f">Minimum job $<input type="number" data-bind="rules.minimum_job" min="0"></label><label class="f">Travel $ per km<input type="number" step="0.1" data-bind="rules.travel_per_km" min="0"></label><label class="f">No travel charge within, km<input type="number" data-bind="rules.free_radius_km" min="0"></label><label class="btn ghost sm"><input type="checkbox" data-bind="rules.travel_return"> Charge travel both ways</label><label class="btn ghost sm"><input type="checkbox" data-bind="rules.travel_per_day"> Travel for each day on site</label><label class="f">Premium paint +%<input type="number" data-bind="rules.premium_paint_pct" min="0"></label><label class="f">Ceiling height m<input type="number" step="0.1" data-bind="rules.ceiling_height_m" min="2"></label></div></details></div>';
    html += '<p class="hint">Optional.</p>';
    html += '<div class="card"><h2>Follow-ups</h2><p class="hint">Working days only' + (stateCode() ? ', ' + esc(stateCode()) + ' holidays' : '') + '. The final notice never goes without you.</p><div class="g3"><label class="f">Quote follow-ups, days<input type="text" id="fu_q" value="' + esc((S.follow_up.quote_days || []).join(', ')) + '"></label><label class="f">Invoice reminders, days after due<input type="text" id="fu_i" value="' + esc((S.follow_up.invoice_days || []).join(', ')) + '"></label><label class="f">Reminder time<span>8am to 6pm</span><input type="number" data-bind="follow_up.remind_hour" min="8" max="18"></label></div>' + (stateCode() ? '' : '<p class="hint">Set your state for the right holidays.</p>') + '</div>';
    html += '<div class="card"><h2>Hours</h2><div class="g3"><label class="f">Job start<span>hour, 24h</span><input type="number" data-bind="booking.start_hour" min="5" max="12"></label><label class="f">Job finish<input type="number" data-bind="booking.end_hour" min="10" max="20"></label><label class="f">Quote visit, min<input type="number" data-bind="booking.visit_minutes" min="10" step="5"></label><label class="f">Earliest visit<span>hour</span><input type="number" data-bind="booking.quote_from" min="5" max="12"></label><label class="f">Latest visit start<span>hour</span><input type="number" data-bind="booking.quote_to" min="12" max="21"></label><label class="f">Quote visits, best time<span>offered first</span><select data-bind="booking.visit_pref"><option value="any">Any time</option><option value="after_work">After work</option><option value="mornings">Mornings</option></select></label></div><div class="row"><label class="btn ghost sm"><input type="checkbox" data-bind="booking.saturdays"> Saturdays</label><label class="btn ghost sm"><input type="checkbox" data-bind="booking.sundays"> Sundays</label><label class="btn ghost sm"><input type="checkbox" data-bind="booking.boss_on_tools"> I paint on booked days (no quote visits those days)</label></div><p class="hint">Least driving between what is booked.</p></div>';
    // A way in that is hard to miss while he is testing, and easy to ignore once he is working.
    (function () {
      var t = window.QCTest && QCTest.state();
      // in the same shape as the sections around it, so it reads as one list rather than a card wedged in
      html += '<a class="sec link" href="#/test"><h3>Test drive</h3>' + (t && t.on ? '<span class="pill warn">On</span>' : '') + '</a>';
    })();
    html += calendarCard();
    html += '<div class="card"><h2>Quote terms</h2><p class="hint">One per line.</p><label class="f ponly">Included, inside work<textarea id="w_inc" rows="5">' + esc(S.wording.included.join('\n')) + '</textarea></label><label class="f ponly">Not included, inside work<textarea id="w_exc" rows="5">' + esc(S.wording.excluded.join('\n')) + '</textarea></label><label class="f ponly">Included, outside work<textarea id="w_inc_ext" rows="4">' + esc((S.wording.included_ext || []).join('\n')) + '</textarea></label><label class="f ponly">Not included, outside work<textarea id="w_exc_ext" rows="4">' + esc((S.wording.excluded_ext || []).join('\n')) + '</textarea></label><label class="f">Terms<span>after the validity and deposit lines</span><textarea id="w_terms" rows="4">' + esc((S.wording.terms || []).join('\n')) + '</textarea></label><div class="g2"><label class="f">Guarantee, years<input type="number" data-bind="wording.warranty_years" min="0"></label></div><label class="f">How to accept<textarea data-bind="wording.accept" rows="3"></textarea></label>' +
      '<h3>Your nudges</h3><p class="hint">Blank uses the app\'s words. {name} {job} {quote} {total} {week} {valid} {invoice} {amount} {due} {card} {phone} fill themselves in.</p><label class="f">Quote nudge<span>after a quote has gone quiet</span><textarea data-bind="wording.nudges.quote" rows="3" placeholder="just checking quote {quote} ({total}) for {job} came through OK. If there is anything you would like me to explain, just ask."></textarea></label><label class="f">Deposit nudge<span>a deposit not yet paid</span><textarea data-bind="wording.nudges.deposit" rows="3" placeholder="a friendly reminder that the deposit for your job (invoice {invoice}, {amount}) was due on {due}. If it is already on its way, thank you and please ignore this. {card}"></textarea></label><label class="f">Overdue nudge<span>an invoice past its due date</span><textarea data-bind="wording.nudges.invoice" rows="3" placeholder="a friendly reminder that invoice {invoice} ({amount}) was due on {due}. If it is already on its way, thank you and please ignore this. {card}"></textarea></label>' +
      '<div class="ponly"><h3>Products</h3><p class="hint">Printed with the coats.</p><div class="g2">' + Object.keys(QCCosting.PAINT).map(function (k) { return '<label class="f">' + esc(QCCosting.PAINT[k]) + '<input type="text" data-bind="wording.products.' + k + '" placeholder="Brand and product"></label>'; }).join('') + '</div></div></div>';
    html += '<div class="card ponly"><h2>Advanced: work prices out from my costs</h2><p class="hint">What an hour and a litre cost you.</p><div class="g3"><label class="f">An hour costs you $<input type="number" data-bind="costing.labour_rate" min="0"></label><label class="f">Markup on cost %<span id="mkhint">' + esc(markupNote()) + '</span><input type="number" data-bind="costing.margin_pct" id="st_markup" min="0"></label><label class="f">Painters on a job<input type="number" data-bind="costing.crew" min="1" max="20" placeholder="1"></label><label class="f">Hours per day<input type="number" data-bind="costing.hours_per_day" min="1" max="14" step="0.5" placeholder="8"></label><label class="f">Coats<input type="number" data-bind="costing.coats" min="1" max="3"></label><label class="f">Speed<span>1 = typical, 0.8 = faster, 1.2 = slower</span><input type="number" step="0.1" data-bind="costing.hours_scale" min="0.5"></label><label class="f">Spare paint %<span>extra paint built into the rates</span><input type="number" data-bind="costing.wastage_pct" min="0" max="50" placeholder="8"></label><label class="f">Set-up hours per job<input type="number" step="0.25" data-bind="costing.setup_hours" min="0" placeholder="1.5"></label><label class="f">Extra hours per day<span>set-up, clean-up</span><input type="number" step="0.25" data-bind="costing.daily_hours" min="0" placeholder="0.75"></label></div>' +
      '<h3>Paint</h3><table><thead><tr><th>Paint</th><th class="n">$ a litre</th><th class="n">m² a litre</th><th>Tin sizes, litres</th></tr></thead><tbody>' + Object.keys(QCCosting.PAINT).map(function (k) { return '<tr><td>' + esc(QCCosting.PAINT[k]) + '</td><td class="n"><input type="number" data-bind="costing.paint_price.' + k + '" min="0" aria-label="' + esc(QCCosting.PAINT[k]) + ' $ per litre" style="width:4.5em;padding:.5em .4em"></td><td class="n"><input type="number" data-bind="costing.coverage.' + k + '" min="1" aria-label="' + esc(QCCosting.PAINT[k]) + ' coverage" style="width:4.5em;padding:.5em .4em"></td><td><input type="text" data-bind="costing.tin_sizes.' + k + '" placeholder="4, 10, 15" aria-label="' + esc(QCCosting.PAINT[k]) + ' tin sizes" style="min-width:5.5em;padding:.5em .4em"></td></tr>'; }).join('') + '</tbody></table>' +
      '<label class="btn ghost sm"><input type="checkbox" data-bind="costing.charge_tins"> Add a line for whole tins on quotes (off: spare paint is in the rates)</label>' +
      '<div class="row"><button class="btn sm" id="derive">Calculate prices</button><span class="hint">Shows each change first.</span></div></div>';
    html += '<div class="card"><h2>' + (paintsHere() ? 'Maps and house size' : 'Maps') + '</h2><p class="hint">Addresses fill in as you type.' + (mapsOn() ? ' On.' : (QCMaps.key(S) ? ' Key saved; works when you are online.' : '')) + '</p><details class="sec sub"><summary><h3>Show me the set-up steps</h3></summary><p class="hint">On a computer, go to console.cloud.google.com, make a project, turn on Places API (New), Maps Static API and Solar API, then make an API key and restrict it to this app\'s web address. Google gives a free monthly amount that covers a tradie\'s use; the Solar API (house size) is charged per look-up beyond it, so check the pricing page.</p><label class="f">Google Maps key<input type="text" data-bind="maps.key" autocomplete="off" spellcheck="false" placeholder="AIza…"></label></details></div>';
    var pay = S.payment || {}, cardLine, cardBtns;
    if (pay.card_off === true) { cardLine = 'Not switched on yet.'; cardBtns = ''; }
    else if (pay.card_ready === true) { cardLine = 'On. Paying the invoice ticks it off here.'; cardBtns = '<button class="btn ghost sm" id="card_manage">Change my bank account</button>'; }
    else if (pay.stripe_started) { cardLine = String(pay.card_note || 'Stripe is checking your details.'); cardBtns = '<button class="btn sm" id="card_go">Finish with Stripe</button><button class="btn ghost sm" id="card_check">Check again</button>'; }
    else { cardLine = 'Stripe asks for your bank account. The money goes straight to you.'; cardBtns = '<button class="btn tape sm" id="card_go">Turn on card payments</button>'; }
    html += '<div class="card" id="cardcard"><h2>Card payments</h2><p class="hint" id="cardline">' + esc(cardLine) + '</p>' +
      (cardBtns ? '<div class="row">' + cardBtns + '<span class="hint" id="cardres"></span></div>' : '') +
      '<details class="sec sub"><summary><h3>Use my own Stripe key instead</h3></summary><p class="hint">A restricted key that can write Products, Prices, Payment Links and read Checkout Sessions.</p><label class="f">Stripe restricted key<span>starts with rk_live_</span><input type="text" data-bind="stripe.key" autocomplete="off" spellcheck="false"></label><p class="confirm" id="skwarn" ' + (S.stripe.key && !QCStripe.keyLooksRight(S.stripe.key) ? '' : 'hidden') + '>Not a restricted key (rk_live_ or rk_test_). Card links are off until it is.</p><label class="btn ghost sm"><input type="checkbox" data-bind="stripe.enabled"> Put a card payment link on invoices</label></details></div>';
    var relayOn = !!S.sending.server, dis = relayOn ? '' : ' disabled';
    var hosted = S.sending.hosted === true, hostedEnded = hosted && QCMsg.hostedEnded && QCMsg.hostedEnded(S.sending), hostedStopped = hosted && !hostedEnded && S.sending.hosted_cancelled === true, hostedTo = /^\d{4}-\d{2}-\d{2}$/.test(String(S.sending.hosted_until || '')) ? shortDate(S.sending.hosted_until) : '';
    html += '<div class="card"><h2>Automatic texting and emailing</h2><p class="hint">' + (hostedEnded ? '<span class="confirm">Off since ' + esc(hostedTo) + '. <a href="' + esc(SITE + '#price') + '" target="_blank" rel="noopener">Turn it back on</a>. Nothing here is lost.</span>' : hostedStopped ? '<span class="confirm">Cancelled. Runs to ' + esc(hostedTo) + '. Manage below to change your mind.</span>' : hosted ? 'On, paid' + (hostedTo ? ' to ' + esc(hostedTo) : '') + '. ' + (String(S.details.phone || '').trim() ? 'Texts end with your number, ' + esc(String(S.details.phone).trim()) + '.' : 'Texts come from a number that cannot take replies. <span class="confirm">Add your mobile in Business above.</span>') : 'Your own accounts instead of ours: a computer and an hour.' + (autoReady() ? ' Set up and working.' : ' Or <a href="' + esc(SITE + '#price') + '" target="_blank" rel="noopener">turn the chasing on</a> instead.')) + '</p>' +
      (hosted && QCMsg.balance().left != null ? '<p class="hint" id="balcard"><b>' + esc(balanceLine()) + '</b></p>' +
        (QCMsg.balance().plan === 'paid' ? '<div class="row" id="toprow"><button class="btn ghost sm" id="topnow">Top up ' + TOPUP_MESSAGES + ' messages, $' + TOPUP_PRICE + '</button><label class="btn ghost sm"><input type="checkbox" id="topauto"' + (S.sending.auto_topup ? ' checked' : '') + '> Top up by itself when I run out</label><span class="hint" id="topres"></span></div>' : '<p class="hint"><a href="' + esc(topUpLink()) + '" target="_blank" rel="noopener">Go monthly: ' + PLAN_INCLUDED + ' messages for $' + PLAN_PRICE + ' a month</a></p>') : '') +
      (hosted && QCMsg.balance().plan === 'paid' ? (function () { var st2 = seats();
        if (st2.seat > 1) return '<p class="hint" id="seatcard">Second phone. Same name, same messages; jobs stay on the phone they were made on.</p>';
        if (st2.seats > 1) return '<div class="card sub" id="seatcard"><h3>Your second phone</h3><p class="hint">Same name, same messages, its own jobs.</p><div class="row"><button class="btn ghost sm" id="seatgo">Set up the second phone</button><span class="hint" id="seatres"></span></div><div id="seatout" hidden></div></div>';
        return ''; })() : '') +
      (hosted || hostedStopped ? '<div class="row" id="hostedrow"><button class="btn ghost sm" id="hostedmanage">Manage or cancel</button><button class="btn ghost sm" id="hostedcheck">Check my subscription</button><span class="hint" id="hostedres"></span></div>' : '') +
      '<label class="f">Paste a set-up code<span>or the whole set-up link from your welcome email</span><textarea id="setupcode" rows="2" autocomplete="off" spellcheck="false" autocapitalize="off" placeholder="j:… or z:…"></textarea></label><div class="row"><button class="btn sm" id="setupcodego">Load</button><span class="hint" id="setupcoderes"></span></div>' +
      '<details class="sec sub"><summary><h3>Show me the set-up steps</h3></summary>' + (hosted ? '<p class="hint">Only for running your own accounts instead.</p>' : '') + '<p class="hint">Twilio for texts, Resend for email, through your own relay. Keys stay on this phone and out of back-ups unless you tick the box under Back-up.</p>' +
      '<label class="f">Relay address<span>e.g. https://your-site.vercel.app/api/msg</span><input type="url" data-bind="sending.server" placeholder="https://" autocomplete="off"></label><label class="f">Relay token<span>the RELAY_TOKEN set on the relay</span><input type="password" data-bind="sending.token" autocomplete="off"></label>' + (S.sending.server && !S.sending.token ? '<p class="confirm">No relay token. Anyone who finds the address could send as you. Set one on the relay and here.</p>' : '') + '<label class="btn ghost sm"><input type="checkbox" data-bind="sending.server_has_creds"> The relay already has my Twilio and Resend details</label>' +
      '<div class="g2" id="credbox"><label class="f">Twilio Account SID<span>AC…</span><input type="text" data-bind="sending.twilio_sid" autocomplete="off" spellcheck="false"></label><label class="f">Twilio API key SID<span>SK…, safer than the account token; optional</span><input type="text" data-bind="sending.twilio_api_key" autocomplete="off" spellcheck="false"></label><label class="f">Twilio secret<span>the API key secret, or the account auth token</span><input type="password" data-bind="sending.twilio_token" autocomplete="off"></label><label class="f">Twilio Messaging Service SID<span>MG…, needed for texts that send later</span><input type="text" data-bind="sending.twilio_service" autocomplete="off" spellcheck="false"></label><label class="f">Twilio From number<span>only if no Messaging Service</span><input type="text" data-bind="sending.twilio_from" placeholder="+61..."></label><label class="f">Resend API key<span>make a sending-only key</span><input type="password" data-bind="sending.resend_key" autocomplete="off"></label><label class="f">Email from<span>on a domain verified in Resend</span><input type="text" data-bind="sending.resend_from" placeholder="Name <you@yourdomain.com.au>"></label></div>' +
      '<div class="row"><label class="btn ghost sm"><input type="checkbox" data-bind="sending.auto_sms"' + dis + '> Follow-ups by text</label><label class="btn ghost sm"><input type="checkbox" data-bind="sending.auto_email"' + dis + '> By email when no mobile</label><label class="btn ghost sm"><input type="checkbox" data-bind="sending.email_quotes"' + dis + '> Email quotes and invoices straight to the client</label></div>' + (relayOn ? '' : '<p class="hint">Needs the boxes above.</p>') +
      '<div class="row"><input type="text" id="testto" aria-label="Test recipient" placeholder="Mobile or email" style="flex:1 1 10em"><button class="btn sm" id="testsms">Send test text</button><button class="btn sm" id="testemail">Send test email</button><span class="hint" id="testres"></span></div></details>' +
      '<div class="row"><a class="btn ghost sm" href="#/settings/log">Sent log</a><span class="hint">' + ((S.log && S.log.sent) || []).length + ' sent</span></div></div>';
    var hasKeys = !!(S.sending.token || S.sending.twilio_token || S.sending.twilio_sid || S.sending.resend_key || S.stripe.key);
    html += '<div class="card"><h2>Back-up</h2><p class="hint">One file. Email it to yourself. Last saved: ' + (S.security.last_backup ? QCPdf.fmtDate(S.security.last_backup) : 'never') + '.</p><div class="row"><button class="btn sm" id="export">Save a copy</button><label class="btn ghost sm">Restore from a saved copy<input type="file" id="import" accept=".json,application/json"></label></div>' + (hasKeys ? '<label class="btn ghost sm"><input type="checkbox" data-bind="security.backup_include_keys"> Passwords in the file too, for a new phone</label>' : '') +
      '<div class="row"><button class="btn ghost sm" id="csvinv">Invoices spreadsheet</button><button class="btn ghost sm" id="csvpay">Payments spreadsheet</button><button class="btn ghost sm" id="csvjobs">Jobs spreadsheet</button><span class="hint">for your bookkeeper</span></div><div class="row"><button class="btn danger sm" id="reset">Delete all data</button></div></div>';
    html += '<div class="card"><h2>App lock</h2><p class="hint">' + (S.security.pin ? 'Asked when the app opens, and after five minutes away.' : 'No PIN. Anyone holding your phone can send as you.') + '</p><div class="row"><input type="password" id="pin1" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="4 to 6 digits" aria-label="New PIN" autocomplete="off" style="flex:1 1 8em"><button class="btn sm" id="pinset">' + (S.security.pin ? 'Change PIN' : 'Set PIN') + '</button>' + (S.security.pin ? '<button class="btn ghost sm" id="pinoff">Remove PIN</button>' : '') + '</div><p class="hint">Save a copy first.</p></div>';
    html += '<div class="a1done"><button class="btn tape" id="setupdone">Done</button></div>';
    $app.innerHTML = html;
    wireAddress($app.querySelector('[data-bind="details.address"]'), function (pl) { S.details.site = { lat: pl.lat, lng: pl.lng, place_id: pl.place_id || '' }; var pc = document.getElementById('st_pc'); if (pl.postcode && pc && !pc.value) { pc.value = pl.postcode; pc.dispatchEvent(new Event('input', { bubbles: true })); } if (pl.state && !S.details.state) S.details.state = pl.state; save(); });
    sectionise($app, ['Business', 'Bank details', 'Prices'], !!(S.details.trading_name && S.details.bsb));
    bindAll($app, S);
    // a two-second "Saved" beside the heading of whichever section was just changed
    function tick(el) { var det = el && el.closest ? el.closest('details.sec') : null; while (det && det.classList.contains('sub')) det = det.parentElement ? det.parentElement.closest('details.sec') : null; var sum = det ? det.firstElementChild : null; if (!sum || sum.tagName !== 'SUMMARY') return; var sp = sum.querySelector('.tick'); if (!sp) { sp = document.createElement('span'); sp.className = 'tick'; sum.appendChild(sp); } sp.textContent = QCStore.lastError() ? 'Not saved' : 'Saved'; clearTimeout(sp._t); sp._t = setTimeout(function () { sp.textContent = ''; }, 2000); }
    $app.addEventListener('input', function (e) { tick(e.target); }); $app.addEventListener('change', function (e) { tick(e.target); });
    document.getElementById('setupdone').addEventListener('click', function () { if (QCStore.lastError()) { checkStore(); return; } this.textContent = 'Saved'; this.disabled = true; setTimeout(function () { go('/'); }, 600); });
    $app.querySelectorAll('[data-price]').forEach(function (el) { el.addEventListener('input', function () { S.prices[el.dataset.price] = el.value === '' ? null : n(el.value); save(); }); });
    var bc = document.getElementById('brandcol'); if (bc) bc.addEventListener('input', function () { S.details.brand_colour = /^#[0-9a-f]{6}$/i.test(bc.value) ? bc.value : ''; save(); });
    var br = document.getElementById('brandreset'); if (br) br.addEventListener('click', function () { S.details.brand_colour = ''; save(); viewSettings(); });
    ['testsms', 'testemail'].forEach(function (id) { document.getElementById(id).addEventListener('click', function () { var to = document.getElementById('testto').value.trim(), out = document.getElementById('testres'); if (!to) { out.textContent = 'Type a number or email first.'; return; } out.textContent = 'Sending…'; QCMsg.call({ action: 'test', channel: id === 'testsms' ? 'sms' : 'email', to: to }).then(function (r) { out.textContent = 'Sent (' + (r.id || 'ok') + ').'; }).catch(function (e) { out.textContent = 'Failed: ' + e.message; }); }); });
    var sg = document.getElementById('seatgo'); if (sg) sg.addEventListener('click', function () { var o = document.getElementById('seatres'), box = document.getElementById('seatout'); o.textContent = 'Making the link…'; sg.disabled = true; addSeat().then(function (link) { sg.disabled = false; o.textContent = ''; box.hidden = false; box.innerHTML = '<p class="hint">Open it on the other phone and tap Load.</p><textarea id="seatlink" rows="3" readonly onclick="this.select()">' + esc(link) + '</textarea><div class="row"><button class="btn sm" id="seatcopy">Copy the link</button><a class="btn ghost sm" id="seatshare" href="#">Send it</a></div>'; document.getElementById('seatcopy').addEventListener('click', function () { var ta = document.getElementById('seatlink'); ta.select(); try { navigator.clipboard.writeText(link); } catch (e) { document.execCommand('copy'); } toast('Copied. Open it on the other phone.'); }); var sh = document.getElementById('seatshare'); sh.addEventListener('click', function (e) { e.preventDefault(); if (navigator.share) navigator.share({ title: 'Set up the second phone', text: link }).catch(function () {}); else { sh.setAttribute('href', 'sms:?&body=' + encodeURIComponent(link)); location.href = sh.getAttribute('href'); } }); }).catch(function (e) { sg.disabled = false; o.textContent = e.message; }); });
    var tn = document.getElementById('topnow'); if (tn) tn.addEventListener('click', function () { var o = document.getElementById('topres'); o.textContent = 'Charging your card…'; tn.disabled = true; topUp({ buy: true }).then(function (j) { tn.disabled = false; o.textContent = ''; toast(j.messages + ' messages added, $' + j.charged + ' charged to your card.'); viewSettings(); }).catch(function (e) { tn.disabled = false; o.textContent = e.needsCard ? 'Your card needs a look. Tap Manage to fix it.' : e.message; }); });
    var ta = document.getElementById('topauto'); if (ta) ta.addEventListener('click', function () { var on = ta.checked, o = document.getElementById('topres'); o.textContent = 'Saving…'; topUp({ auto: on }).then(function () { S = QCStore.load(); S.sending.auto_topup = on; save(); o.textContent = on ? 'On. Up to three packs a month, never more.' : 'Off.'; }).catch(function (e) { ta.checked = !on; o.textContent = e.message; }); });
    var hm = document.getElementById('hostedmanage'); if (hm) hm.addEventListener('click', function () { var o = document.getElementById('hostedres'); o.textContent = 'Opening…'; hm.disabled = true; hostedPortal().then(function (u) { o.textContent = ''; hm.disabled = false; window.open(u, '_blank', 'noopener'); }).catch(function (e) { hm.disabled = false; o.textContent = e.message; }); });
    var hc = document.getElementById('hostedcheck'); if (hc) hc.addEventListener('click', function () { var o = document.getElementById('hostedres'); o.textContent = 'Checking…'; hc.disabled = true; renewHosted(true).then(function (j) { hc.disabled = false; if (!j) { o.textContent = 'Could not reach the sending system. Try again later.'; return; } o.textContent = j.active ? (j.status === 'past_due' ? 'Your card needs fixing. Tap Manage.' : 'Paid up to ' + shortDate(j.until)) : 'Cancelled. Runs to ' + shortDate(j.until || S.sending.hosted_until) + '.'; setTimeout(function () { viewSettings(); }, 1200); }).catch(function () { hc.disabled = false; o.textContent = 'Could not reach the sending system.'; }); });
    var scg = document.getElementById('setupcodego'); if (scg) scg.addEventListener('click', function () { var v = document.getElementById('setupcode').value, out = document.getElementById('setupcoderes'), code = setupCode(v); if (!v.trim()) { out.textContent = 'Paste the code first.'; return; } if (!code) { out.textContent = 'That does not look like a set-up code. Copy the whole thing and try again.'; return; } out.textContent = ''; go('/setup?d=' + code); });
    // Card payments: one tap out to Stripe, one tap back. Nothing to paste, nothing to read.
    var cres = function () { return document.getElementById('cardres'); };
    var cgo = document.getElementById('card_go');
    if (cgo) cgo.addEventListener('click', function () {
      cgo.disabled = true; if (cres()) cres().textContent = 'Opening Stripe\u2026';
      payConnect('start').then(function (r) {
        cgo.disabled = false;
        if (r && r.off) { S.payment = Object.assign({}, S.payment, { card_off: true }); save(); return viewSettings(); }
        if (!r || !r.ok || !r.url) { if (cres()) cres().textContent = (r && r.error) || 'That did not work.'; return; }
        S.payment = Object.assign({}, S.payment, { stripe_started: true, card_off: false }); save();
        location.href = r.url;
      });
    });
    var cchk = document.getElementById('card_check');
    if (cchk) cchk.addEventListener('click', function () {
      cchk.disabled = true; if (cres()) cres().textContent = 'Asking Stripe\u2026';
      payStatus().then(function (r) { cchk.disabled = false; if (!r) { if (cres()) cres().textContent = 'Could not reach Stripe.'; return; } viewSettings(); });
    });
    var cman = document.getElementById('card_manage');
    if (cman) cman.addEventListener('click', function () {
      cman.disabled = true; if (cres()) cres().textContent = 'Opening Stripe\u2026';
      payConnect('manage').then(function (r) {
        cman.disabled = false;
        if (!r || !r.ok || !r.url) { if (cres()) cres().textContent = (r && r.error) || 'That did not work.'; return; }
        openUrl(r.url);
      });
    });
    // Back from Stripe with it half done: ask again, quietly, and no more than once a minute.
    var pnow = Date.now();
    if (S.payment && S.payment.stripe_started && S.payment.card_ready !== true && S.payment.card_off !== true &&
        pnow - (payStatus.at || 0) > 60000) {
      payStatus.at = pnow;
      payStatus().then(function (r) { if (r && r.changed) viewSettings(); });
    }
    var sk = $app.querySelector('[data-bind="stripe.key"]'); sk.addEventListener('input', function () { S.stripe.key = sk.value.trim(); save(); document.getElementById('skwarn').hidden = !(S.stripe.key && !QCStripe.keyLooksRight(S.stripe.key)); });
    wireCalendar();
    document.getElementById('derive').addEventListener('click', function () {
      // before/after per rate, in a confirm, before the price list is changed
      var rates = null, rows = null, res = null; try { res = QCCosting.deriveDiff ? QCCosting.deriveDiff(S.costing, S.prices) : null; } catch (e) { res = null; }
      if (res && Array.isArray(res.changes)) { rows = res.changes; rates = res.rates || null; } else if (Array.isArray(res)) rows = res;
      if (!rates) rates = QCCosting.deriveRates(S.costing);
      if (!rows) rows = Object.keys(rates).filter(function (k) { return S.prices[k] !== rates[k]; }).map(function (k) { return { key: k, from: S.prices[k], to: rates[k] }; });
      rows = rows.filter(function (c) { return c && (c.from !== c.to); });
      if (!rows.length) { toast('Price list already matches'); return; }
      var txt = rows.map(function (c) { var lab = c.label || (QCPricing.label(S.prices, c.key) || {}).label || c.key, unit = (QCPricing.label(S.prices, c.key) || {}).unit; return lab + ': ' + (c.from == null || c.from === '' ? 'blank' : '$' + c.from) + ' to $' + c.to + (unit ? ' per ' + unitWord(unit) : ''); });
      if (!confirm('Calculate prices changes ' + rows.length + ' price' + (rows.length > 1 ? 's' : '') + ':\n' + txt.slice(0, 16).join('\n') + (txt.length > 16 ? '\n... and ' + (txt.length - 16) + ' more' : '') + '\n\nPut these in the price list?')) return;
      rows.forEach(function (c) { S.prices[c.key] = c.to; }); save(); toast('Price list updated'); viewSettings();
    });
    var mk = document.getElementById('st_markup'); if (mk) mk.addEventListener('input', function () { document.getElementById('mkhint').textContent = markupNote(); });
    var sd = document.getElementById('st_dep'); if (sd) sd.addEventListener('input', function () { S.rules.deposit_pct = S.details.deposit_pct; save(); document.getElementById('depcap').textContent = depCapNote(); }); // the engine reads rules.deposit_pct; keep both in step
    var sdy = document.getElementById('st_days'); if (sdy) sdy.addEventListener('input', function () { S.rules.balance_days = S.details.balance_days; save(); });
    var ss = document.getElementById('st_state'); if (ss) ss.addEventListener('change', function () { document.getElementById('depcap').textContent = depCapNote(); });
    var spc = document.getElementById('st_pc'); if (spc) spc.addEventListener('input', function () { if (!S.details.state) { var st = stateFromPostcode(spc.value); if (st) { S.details.state = st; save(); if (ss) ss.value = st; document.getElementById('depcap').textContent = depCapNote(); } } });
    ['fu_q', 'fu_i'].forEach(function (id) { document.getElementById(id).addEventListener('input', function () { var arr = this.value.split(/[,\s]+/).map(function (x) { return parseInt(x, 10); }).filter(function (x, i, a) { return x >= 0 && x <= 60 && a.indexOf(x) === i; }).sort(function (a, b) { return a - b; }); if (arr.length) { S.follow_up[id === 'fu_q' ? 'quote_days' : 'invoice_days'] = arr; save(); } }); });
    document.getElementById('w_inc').addEventListener('input', function () { S.wording.included = this.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); save(); });
    document.getElementById('w_exc').addEventListener('input', function () { S.wording.excluded = this.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); save(); });
    [['w_inc_ext', 'included_ext'], ['w_exc_ext', 'excluded_ext'], ['w_terms', 'terms']].forEach(function (pair) { var el = document.getElementById(pair[0]); if (el) el.addEventListener('input', function () { S.wording[pair[1]] = this.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); save(); }); });
    document.getElementById('logo').addEventListener('change', function () { var f = this.files[0]; if (!f) return; createImageBitmap(f).then(function (b) { var sc = Math.min(1, 600 / Math.max(b.width, b.height)), c = document.createElement('canvas'); c.width = Math.round(b.width * sc); c.height = Math.round(b.height * sc); c.getContext('2d').drawImage(b, 0, 0, c.width, c.height); S.details.logo = c.toDataURL('image/png'); save(); viewSettings(); }).catch(function () { toast('Could not read that image'); }); });
    var nl = document.getElementById('nologo'); if (nl) nl.addEventListener('click', function () { S.details.logo = ''; save(); viewSettings(); });
    // Save a copy: through A2's Did-it-go step when it exists, else the phone's menu, else a plain file
    document.getElementById('export').addEventListener('click', function () { var blob = new Blob([QCStore.exportAll()], { type: 'application/json' }); var f = new File([blob], 'chasem-backup-' + QCStore.today() + '.json', { type: 'application/json' }); S.security.last_backup = QCStore.today(); save(); var keysNote = S.security.backup_include_keys ? ' Your passwords are in it: delete the file once it is on the new phone.' : ''; var a = window.__qcApp; if (a && typeof a.handOff === 'function') { try { a.handOff({ kind: 'backup', file: f, filename: f.name, whoName: 'yourself', onResult: function () {} }); return; } catch (e) {} } if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(function () {}); toast('Your phone\'s menu is open. Pick Mail and send the file to yourself: that email is your back-up.' + keysNote); } else { var el = document.createElement('a'); el.href = URL.createObjectURL(blob); el.download = f.name; document.body.appendChild(el); el.click(); setTimeout(function () { el.remove(); }, 500); toast('Copy saved. Email it to yourself.' + keysNote); } });
    document.getElementById('import').addEventListener('change', function () { var f = this.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { try { var st = QCStore.importAll(fr.result); unlocked = true; toast(st && st.keys_removed ? 'Restored. Your texting and emailing passwords were not in the file; enter them under Automatic texting and emailing.' : 'Restored'); route(); } catch (e) { toast(e.message); } }; fr.readAsText(f); });
    document.getElementById('reset').addEventListener('click', function () { if (confirm('Wipe all jobs and settings on this phone? Save a copy first.')) { QCStore.reset(); route(); } });
    var ps = document.getElementById('pinset'); if (ps) ps.addEventListener('click', function () { var v = document.getElementById('pin1').value.trim(); if (!/^\d{4,6}$/.test(v)) { toast('PIN must be 4 to 6 digits.'); return; } sha256(v).then(function (h) { S.security.pin = h; unlocked = true; save(); toast('PIN set'); viewSettings(); }); });
    var po = document.getElementById('pinoff'); if (po) po.addEventListener('click', function () { if (!confirm('Remove the PIN?')) return; S.security.pin = ''; save(); toast('PIN removed'); viewSettings(); });
    [['csvinv', 'exportInvoicesCsv'], ['csvpay', 'exportPaymentsCsv'], ['csvjobs', 'exportJobsCsv']].forEach(function (pair) { var b = document.getElementById(pair[0]); if (b) b.addEventListener('click', function () { var fn2 = window.__qcApp && window.__qcApp[pair[1]]; if (typeof fn2 !== 'function') { toast('Spreadsheets are not available in this version.'); return; } try { var csv = fn2(); if (typeof csv !== 'string' || !csv.trim()) { toast('Nothing to export yet'); return; } var name = pair[0].replace('csv', '') + '-' + QCStore.today() + '.csv', blob = new Blob([csv], { type: 'text/csv' }), file = new File([blob], name, { type: 'text/csv' }); if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file] }).catch(function () {}); else { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500); } toast('Spreadsheet ready.'); } catch (e) { toast('Spreadsheet failed: ' + e.message); } }); });
    var pinEl = document.getElementById('pin1'); if (pinEl) pinEl.addEventListener('change', function () { if (pinEl.value && !/^\d{4,6}$/.test(pinEl.value.trim())) toast('PIN must be 4 to 6 digits.'); });
    var tt = document.getElementById('testto'); if (tt) tt.addEventListener('change', function () { var v = tt.value.trim(); if (!v) return; toast(QCMsg.isLandline(v) ? 'That is a landline. Test with a mobile or an email.' : 'Now tap Send test text or Send test email.'); });
    ['fu_q', 'fu_i'].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener('change', function () { if (!/\d/.test(el.value)) toast('Days as numbers, e.g. 3, 7, 14.'); }); });
  }

  function stateFromPostcode(pc) { var v = parseInt(String(pc || '').trim(), 10); if (isNaN(v)) return ''; if ((v >= 200 && v <= 299) || (v >= 2600 && v <= 2618) || (v >= 2900 && v <= 2920)) return 'ACT'; if ((v >= 1000 && v <= 2599) || (v >= 2619 && v <= 2899) || (v >= 2921 && v <= 2999)) return 'NSW'; if ((v >= 3000 && v <= 3999) || (v >= 8000 && v <= 8999)) return 'VIC'; if ((v >= 4000 && v <= 4999) || (v >= 9000 && v <= 9999)) return 'QLD'; if (v >= 5000 && v <= 5799) return 'SA'; if (v >= 6000 && v <= 6797) return 'WA'; if (v >= 7000 && v <= 7799) return 'TAS'; if (v >= 800 && v <= 899) return 'NT'; return ''; }
  function markupNote() { var m = parseFloat(S.costing && S.costing.margin_pct); if (!(m >= 0)) return 'cost plus this much'; return 'cost plus ' + m + '% (' + Math.round(m / (100 + m) * 100) + '% of the price)'; }
  // A1: one calm line per state about the deposit limit, for Set-up
  function depCapNote() {
    if (!buildingTrade()) return '';   // not building work: no state limit to state
    var st = stateOf(), line = { NSW: 'NSW caps deposits at 10%.', VIC: 'Victoria caps deposits at 10%, 5% over $20,000.', QLD: 'Queensland caps deposits at 10%, 5% over $20,000.', SA: 'SA caps deposits at $1,000 under $20,000, 5% over.', WA: 'WA caps deposits at 6.5% from $7,500 up.' }[st];
    if (!st) return 'Pick your state under Business for the limit there.';
    if (!line) return 'No deposit limit in ' + stateName(st) + '.';
    return line + ' Your quotes stay under it.';
  }
  // ---------- the set-up link (welcome email, or one you made yourself): <app>#/setup?d=<code>. code = 'j:' + base64url(UTF-8 JSON) or 'z:' + base64url(deflate-raw of it). Loading MERGES; nothing on the phone is wiped.
  var SETUP_SECTIONS = ['details', 'prices', 'rules', 'wording', 'costing', 'sending', 'follow_up', 'booking'], SETUP_MAX = 200 * 1024;
  function b64uDecode(str) { str = String(str || '').replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; var bin = atob(str), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function b64uEncode(u) { var str = ''; for (var i = 0; i < u.length; i += 0x8000) str += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function utf8Decode(u) { if (window.TextDecoder) return new TextDecoder().decode(u); var str = ''; for (var i = 0; i < u.length; i++) str += String.fromCharCode(u[i]); return decodeURIComponent(escape(str)); }
  function utf8Encode(str) { if (window.TextEncoder) return new TextEncoder().encode(str); var b = unescape(encodeURIComponent(str)), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  // the whole link, a bare code, or the code with spaces from a text message -> 'j:...' / 'z:...', or '' when it is nothing of the kind
  function setupCode(raw) { var str = String(raw || '').trim(), m = /[?&]d=([^&#\s]+)/.exec(str); if (m) str = m[1]; try { str = decodeURIComponent(str); } catch (e) {} str = str.replace(/\s+/g, ''); return /^[jz]:[A-Za-z0-9_-]+$/.test(str) ? str : ''; }
  var CANT_READ = 'This phone\'s browser cannot read that code. Open the link in Chrome or Safari.';
  function inflateRaw(u) { if (!window.DecompressionStream || !window.Response) return Promise.reject(new Error(CANT_READ)); try { var ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(u).catch(function () {}); w.close().catch(function () {}); return new Response(ds.readable).arrayBuffer().then(function (ab) { return new Uint8Array(ab); }, function () { throw new Error('That code is not complete. Copy the whole thing and try again.'); }); } catch (e) { return Promise.reject(new Error(CANT_READ)); } }
  // Promise of the payload object; rejects with a sentence for the screen
  function decodeSetup(raw) {
    var code = setupCode(raw); if (!code) return Promise.reject(new Error('That does not look like a set-up code.'));
    if (code.length > SETUP_MAX * 1.4) return Promise.reject(new Error('That set-up is too big to load.'));
    var bytes; try { bytes = b64uDecode(code.slice(2)); } catch (e) { return Promise.reject(new Error('That code is not complete. Copy the whole thing and try again.')); }
    return (code.charAt(0) === 'z' ? inflateRaw(bytes) : Promise.resolve(bytes)).then(function (u) {
      if (u.length > SETUP_MAX) throw new Error('That set-up is too big to load.');
      var obj; try { obj = JSON.parse(utf8Decode(u)); } catch (e) { throw new Error('That code is not complete. Copy the whole thing and try again.'); }
      if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.v !== 1) throw new Error('That code is for a different version of the app. Open the link in your welcome email instead.');
      return obj;
    });
  }
  function encodeSetup(obj) { return 'j:' + b64uEncode(utf8Encode(JSON.stringify(obj))); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function blank(v) { return v == null || v === '' || (Array.isArray(v) && !v.length); }
  // copy only the keys the payload has; a blank never replaces something already filled in; nested objects merge the same way
  function mergeSection(dst, src) { var n = 0; if (!isObj(src)) return 0; Object.keys(src).forEach(function (k) { var v = src[k]; if (v === undefined) return; if (blank(v) && !blank(dst[k])) return; if (isObj(v) && isObj(dst[k])) { n += mergeSection(dst[k], v); return; } if (isObj(v)) v = JSON.parse(JSON.stringify(v)); else if (Array.isArray(v)) v = v.slice(); if (JSON.stringify(dst[k]) === JSON.stringify(v)) return; dst[k] = v; n++; }); return n; }
  // what a payload holds, for the confirm screen and the toast
  function setupContents(obj) {
    var st = isObj(obj.settings) ? obj.settings : {}, d = isObj(st.details) ? st.details : {}, out = {};
    out.details = Object.keys(d).some(function (k) { return !blank(d[k]); }); out.prices = isObj(st.prices) ? Object.keys(st.prices).length : 0;
    out.other = ['rules', 'wording', 'costing', 'follow_up', 'booking'].filter(function (k) { return isObj(st[k]) && Object.keys(st[k]).length; });
    out.jobs = Array.isArray(obj.jobs) ? obj.jobs.filter(isObj).length : 0; var sd = isObj(st.sending) ? st.sending : {};
    out.to_chase = { invoices: 0, quotes: 0 }; (Array.isArray(obj.jobs) ? obj.jobs.filter(isObj) : []).forEach(function (j) { if (j.status === 'quoted' && j.sent_date) out.to_chase.quotes++; (Array.isArray(j.invoices) ? j.invoices : []).forEach(function (i) { if (isObj(i) && !i.paid_date && (i.sent_date || i.sent_confirmed !== false)) out.to_chase.invoices++; }); });
    out.sending = sd.hosted === true ? 'hosted' : sd.server ? 'own' : ''; out.hosted_until = /^\d{4}-\d{2}-\d{2}$/.test(String(sd.hosted_until || '')) ? String(sd.hosted_until) : '';
    out.scoreboard_start = /^\d{4}-\d{2}-\d{2}$/.test(String(obj.scoreboard_start || '')) ? String(obj.scoreboard_start) : ''; out.note = String(obj.note || '').slice(0, 200);
    return out;
  }
  // ---------- Chase a quote made anywhere ----------
  // One quote or invoice made somewhere else, as a job the app chases exactly like its own. The figure is what
  // he quoted, with GST; nothing about rooms or rates is invented, and a number the customer never saw is
  // never used.
  function itemToJob(it) {
    var today = QCStore.today(), gstOn = S.details.gst !== false, total = r2(Math.abs(+it.amount || 0)), sub = gstOn ? r2(total / 1.1) : total;
    var name = String(it.name || '').trim(), first = looksBusiness(name) ? '' : name.split(/\s+/)[0];
    var sent = /^\d{4}-\d{2}-\d{2}$/.test(it.date || '') && it.date <= today ? it.date : today, num = String(it.number || '').trim();
    var j = { id: QCStore.uid(), created: sent, status: it.accepted ? 'accepted' : 'quoted', quote_no: num, no_number: !num, source: it.source || 'typed',
      client: { name: name, first_name: first, phone: String(it.phone || '').trim(), email: String(it.email || '').trim(), address: String(it.address || '').trim(), type: it.business || looksBusiness(name) ? 'commercial' : 'homeowner', bill_to: String(it.business || '').trim(), abn: '', accounts_email: '' },
      summary: String(it.what || '').trim(), manual_total: sub, sent_date: sent, sent_how: 'other', sent_confirmed: true,
      quote: { number: num, total: total, subtotal: sub, sent_date: sent, date: sent }, photos: [], invoices: [] };
    if (it.kind === 'invoice') {
      var due = /^\d{4}-\d{2}-\d{2}$/.test(it.due || '') ? it.due : QCStore.addDays(sent, parseInt(S.details.balance_days, 10) || 7), paid = r2(Math.max(0, +it.paid || 0));
      j.status = 'invoiced';
      j.invoices = [{ no: num, kind: 'full', date: sent, due: due, total: total, subtotal: sub, gst: r2(total - sub), lines: [{ desc: j.summary || 'Work as invoiced', amount: sub }],
        payments: paid > 0 ? [{ id: QCStore.uid(), date: today, amount: Math.min(paid, total), method: 'other', ref: 'Before Chasem' }] : [], credit_notes: [], sent_date: sent, sent_how: 'other', sent_confirmed: true, follow_ups: [] }];
    }
    if (it.photo) j.photos.push({ id: QCStore.uid(), data: it.photo, caption: 'The quote', room: '' });
    return j;
  }
  // Already in the app? The same number, or the same person for the same money.
  function alreadyHave(it) {
    var num = String(it.number || '').trim().toLowerCase(), nm = String(it.name || '').trim().toLowerCase(), amt = r2(+it.amount || 0);
    // A number alone is not enough: the app numbers its own quotes Q-1001 too, and so does half the software
    // in the country. The same number AND the same person or money, or the same person for the same money.
    return S.jobs.some(function (j) {
      if (j.status === 'cancelled') return false;
      var jn = String((j.client || {}).name || '').trim().toLowerCase(), jt = j.quote ? r2(j.quote.total) : 0, sameName = nm && jn === nm;
      var sameMoney = Math.abs(jt - amt) < 0.01 || (j.invoices || []).some(function (i) { return Math.abs(r2(i.total) - amt) < 0.01; });
      var sameNum = num && ((!j.no_number && String(j.quote_no || '').toLowerCase() === num) || (j.invoices || []).some(function (i) { return String(i.no || '').toLowerCase() === num; }));
      return (sameNum && (sameName || sameMoney)) || (sameName && sameMoney);
    });
  }
  // Brings them in, starts the chasing where sending is on, and says what happened in one line.
  function chaseThese(items) {
    items = items.filter(function (it) { return !alreadyHave(it); });
    if (!items.length) return Promise.resolve({ added: 0, jobs: [] });
    var got = importJobs(items.map(itemToJob)); save();
    var live = got.loaded.filter(chaseable), send = QCMsg.ready('sms') || QCMsg.ready('email');
    var queued = send && live.length ? queueLoadedFollowUps(live).catch(function () { return null; }) : Promise.resolve(null);
    return queued.then(function (r) { return { added: got.jobs, jobs: got.loaded, queued: r }; });
  }

  // A list of quotes and invoices from somewhere else, each ticked, with what was left out and why in one line.
  // He unticks what he does not want and taps Chase.
  function pickList(out, items, sk, source, heading) {
    var oldQuote = function (it) { return it.kind !== 'invoice' && !it.accepted && staleQuote(it.date); };
    var fresh = items.filter(function (it) { return !alreadyHave(it); }), had = items.length - fresh.length;
    var left = [sk.paid ? sk.paid + ' paid' : '', sk.closed ? sk.closed + ' declined or void' : '', sk.draft ? sk.draft + ' never sent' : '', had ? had + ' already here' : '', sk.incomplete ? sk.incomplete + ' with no name or amount' : ''].filter(Boolean).join(' · ');
    if (!fresh.length) { out.innerHTML = '<div class="card"><p class="confirm">' + (items.length ? 'Everything found is already here.' : 'No quotes or invoices found.') + '</p>' + (!items.length && source === 'sheet' ? '<p class="hint">From Tradify, ServiceM8, Xero and the like: export quotes as CSV.</p>' : '') + (left ? '<p class="hint">' + esc(left) + '</p>' : '') + '</div>'; return; }
    out.innerHTML = '<div class="card">' + (heading ? '<p class="hint">' + esc(heading) + '</p>' : '') + '<h3>' + fresh.length + ' to chase</h3>' + (left ? '<p class="hint">Left out: ' + esc(left) + '</p>' : '') +
      '<div class="sheetlist">' + fresh.map(function (it, i) { var old = oldQuote(it); return '<label class="sheetrow"><input type="checkbox" data-i="' + i + '"' + (old ? '' : ' checked') + '><span><b>' + esc(it.name) + '</b> <span class="hint">' + esc([it.number, it.kind === 'invoice' ? 'invoice' : it.accepted ? 'won' : '', it.date ? shortDate(it.date) : '', it.phone || it.email || 'no mobile or email', old ? 'over 3 months: you send it' : ''].filter(Boolean).join(' · ')) + '</span></span><span>' + money(it.amount) + '</span></label>'; }).join('') + '</div>' + '<p class="hint" id="sheetpace"' + (fresh.filter(function (it) { return !oldQuote(it); }).length > CHASE_PER_DAY ? '' : ' hidden') + '>' + CHASE_PER_DAY + ' a day at most</p>' +
      '<button class="btn tape lg" id="sheetgo">Chase ' + fresh.length + '</button></div>';
    var boxes = out.querySelectorAll('input[data-i]'), go2 = document.getElementById('sheetgo');
    var pace = document.getElementById('sheetpace'), count = function () { var k = Array.prototype.filter.call(boxes, function (b) { return b.checked; }).length; go2.textContent = 'Chase ' + k; go2.disabled = !k; if (pace) pace.hidden = k <= CHASE_PER_DAY; };
    Array.prototype.forEach.call(boxes, function (b) { b.addEventListener('change', count); });
    count();
    go2.addEventListener('click', function () {
      go2.disabled = true;
      var pick = Array.prototype.filter.call(boxes, function (b) { return b.checked; }).map(function (b) { var it = fresh[+b.getAttribute('data-i')]; it.source = it.source || source; return it; });
      chaseThese(pick).then(function (res) { var q = res.queued || {}; toast(res.added + ' added to Follow-ups.' + (q.last && q.last.slice(0, 10) !== String(q.first || '').slice(0, 10) ? ' The last goes ' + whenText(q.last) + '.' : '')); go('/chase'); });
    });
  }
  // Finding quotes by logging in to his email or Xero goes through the relay he already sends through.
  function findCall(body) { return relayCall('find', body); }
  function relayCall(which, body) {
    var sd = S.sending || {}, url = String(sd.server || '').trim();
    url = url ? url.replace(/\/[^\/]*$/, '/' + which) : '';
    if (!url || !sd.token) return Promise.resolve({ ok: false, off: true });
    var fetcher = window.__qcRelayFetch || window.fetch; body.token = sd.token;
    return fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'No signal. Try again when you have some.' }; });
  }
  var FINDERS = { microsoft: ['mail', 'Outlook'], google: ['mail', 'Gmail'], xero: ['invoice', 'Xero'] };
  function viewFound(qs) {
    var k = (/(?:^|&)k=([\w-]+)/.exec(qs || '') || [])[1] || '';
    $app.innerHTML = '<a class="hint" href="#/">&larr; Jobs</a><h1>Chase a quote</h1><div class="card"><p class="hint">Reading what you sent…</p></div>';
    // Collected once. A reload after that finds nothing, so the list is kept on the phone until it is used.
    var kept = null; try { kept = JSON.parse(sessionStorage.getItem('qc-found-' + k) || 'null'); } catch (e) {}
    var got = kept ? Promise.resolve(kept) : findCall({ action: 'collect', id: k }).then(function (r) { if (r && r.ok) { try { sessionStorage.setItem('qc-found-' + k, JSON.stringify(r)); } catch (e) {} } return r; });
    got.then(function (r) {
      if (!r || !r.ok) { $app.innerHTML = '<a class="hint" href="#/">&larr; Jobs</a><h1>Chase a quote</h1><div class="card"><p class="confirm">' + esc((r && r.error) || 'That did not work.') + '</p><a class="btn tape lg" href="#/add/find">Log in again</a></div>'; return; }
      var head = 'From ' + (r.name || 'your account') + (r.account ? ', ' + r.account : '') + ': ' + (r.scanned || 0) + ' looked at.';
      $app.innerHTML = '<a class="hint" href="#/">&larr; Jobs</a><h1>Chase a quote</h1><div id="foundout"></div>';
      pickList(document.getElementById('foundout'), r.items || [], {}, r.provider || 'email', head);
    });
  }
  // A whole texts backup, read in pieces so a big one with photos in it does not run the phone out of memory.
  function readTextsFile(f, out) {
    out.innerHTML = '<div class="card"><p class="hint" id="readpct">Reading…</p></div>';
    var rd = QCIngest.textsReader(), size = f.size || 0, at = 0, STEP = 2 * 1048576, dec = null;
    try { dec = new TextDecoder('utf-8'); } catch (e) {}
    var fail = function () { out.innerHTML = '<div class="card"><p class="confirm">That file would not open. Choose it again.</p></div>'; };
    var finish = function () {
      var r; try { r = rd.done(); } catch (e) { return fail(); }
      if (document.body.contains(out)) pickList(out, r.items, r.skipped || {}, 'texts', r.scanned + ' texts looked at.');
    };
    if (!dec || !f.slice) { var one = new FileReader(); one.onerror = fail; one.onload = function () { try { rd.push(String(one.result || '')); } catch (e) { return fail(); } finish(); }; one.readAsText(f); return; }
    var next = function () {
      if (at >= size) { try { rd.push(dec.decode()); } catch (e) {} return finish(); }
      var fr = new FileReader(); fr.onerror = fail;
      fr.onload = function () {
        try { rd.push(dec.decode(new Uint8Array(fr.result), { stream: true })); } catch (e) { return fail(); }
        at += STEP; var el = document.getElementById('readpct'); if (el) el.textContent = 'Reading… ' + Math.min(99, Math.round(at / size * 100)) + '%';
        setTimeout(next, 0);
      };
      fr.readAsArrayBuffer(f.slice(at, at + STEP));
    };
    next();
  }
  var ANDROID = /Android/i.test(navigator.userAgent || '');
  // His texts. No web app can read a phone's texts, and on iPhone no app at all can. Android lets him share
  // any text into Chasem once it is on the home screen: hold it, Share, Chasem. Everywhere else, copy and paste.
  function viewTexts() {
    if (!ANDROID) return bounce('/add/paste');
    var installed = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    var way = [['text', 'Hold a text'], ['share', 'Share'], ['', 'Chasem']].map(function (w) {
      return '<span class="swstep">' + (w[0] ? QCPics.svg(w[0]) : '<img src="icons/icon-192.png" alt="" width="34" height="34">') + '<span>' + w[1] + '</span></span>'; }).join('<span class="swto" aria-hidden="true">→</span>');
    var html = '<a class="hint" href="#/add/find">&larr; Back</a><h1>Your texts</h1>';
    if (!installed) html += '<div class="card">' + (window.__qcInstallPrompt ? '<button class="btn tape lg tile" id="instapp"' + QCPics.says('Add Chasem to this phone') + '>' + QCPics.tile('plus', 'Add to this phone') + '</button>' : '<p class="confirm">Chrome menu → Install app.</p>') + '</div>';
    html += '<div class="card shareway' + (installed ? '' : ' later') + '" role="img" aria-label="Hold a text, tap Share, then Chasem">' + way + '</div>' +
      '<a class="btn ghost lg tile" href="#/add/paste"' + QCPics.says('Or paste it') + '>' + QCPics.tile('paste', 'Or paste it') + '</a>';
    $app.innerHTML = html;
    var ins = document.getElementById('instapp');
    if (ins) ins.addEventListener('click', function () { var ev = window.__qcInstallPrompt; if (!ev) return; ins.disabled = true; ev.prompt(); (ev.userChoice || Promise.resolve({})).then(function (r) { if (r && r.outcome === 'accepted') { window.__qcInstallPrompt = null; toast('Added'); viewTexts(); } else ins.disabled = false; }).catch(function () { ins.disabled = false; }); });
  }
  // What a pasted or shared text or email says, ready to check on Type.
  function draftFrom(t) {
    var f = QCIngest.parseText(t);
    viewAdd.draft = { kind: f.kind, name: f.name, phone: f.phone, email: f.email, amount: f.amount > 0 ? f.amount : '', date: f.date, number: f.number, what: f.what, found: true };
    try { localStorage.setItem('qc-add-draft', JSON.stringify(viewAdd.draft)); } catch (e) {}
  }
  // A file exported from the app he quotes with (Tradify, ServiceM8, Xero...) or a file of his texts.
  function wireFile() {
    document.getElementById('sheetfile').addEventListener('change', function () {
      var f = this.files && this.files[0], out = document.getElementById('sheetout'); if (!f) return;
      if (/\.xml$/i.test(f.name || '') || /xml/.test(f.type || '')) return readTextsFile(f, out);
      var rd = new FileReader();
      rd.onerror = function () { out.innerHTML = '<p class="confirm">That file would not open. Save it as CSV and try again.</p>'; };
      rd.onload = function () {
        var r, t; try { r = QCIngest.readSheet(String(rd.result || '')); } catch (e) { r = { items: [], skipped: {} }; }
        // not quotes, but a file of messages (an iPhone export): read it as texts
        if (!r.items.length) { try { t = QCIngest.readTexts(String(rd.result || '')); if (t.items.length) r = t; } catch (e) {} }
        pickList(out, r.items, r.skipped || {}, t && r === t ? 'texts' : 'sheet');
      };
      rd.readAsText(f);
    });
  }
  // ---- a photo or a PDF of a quote, read ----------------------------------------------------------------------
  // A PDF from a quoting app has its words in it, and the phone reads those itself, with no signal and at no cost.
  // A photo, or a scanned PDF with no words in it, goes to the relay to be read. Whatever is found only fills the
  // boxes he has not typed in, and he checks it before anything is chased.
  var pdfLib = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfLib) return pdfLib;
    pdfLib = new Promise(function (res, rej) {
      var sc = document.createElement('script'); sc.src = 'lib/pdf.min.js';
      sc.onload = function () { if (!window.pdfjsLib) { pdfLib = null; return rej(new Error('no pdf reader')); } window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js'; res(window.pdfjsLib); };
      sc.onerror = function () { pdfLib = null; rej(new Error('offline')); };
      document.head.appendChild(sc);
    });
    return pdfLib;
  }
  function fileBytes(f) {
    if (f.arrayBuffer) return f.arrayBuffer();
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsArrayBuffer(f); });
  }
  function toB64(buf) { var b = new Uint8Array(buf), out = '', i; for (i = 0; i < b.length; i += 32768) out += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return btoa(out); }
  // The words on the first pages, a line at a time: pieces at the same height are one line, left to right.
  function pdfWords(pdf) {
    var lines = [], n = Math.min(pdf.numPages || 1, 3), chain = Promise.resolve();
    for (var i = 1; i <= n; i++) (function (i) { chain = chain.then(function () { return pdf.getPage(i); }).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
      var rows = {};
      (tc.items || []).forEach(function (it) { if (!it.str || !String(it.str).trim()) return; var y = Math.round(it.transform[5] / 3); (rows[y] = rows[y] || []).push(it); });
      Object.keys(rows).map(Number).sort(function (a, b) { return b - a; }).forEach(function (y) { lines.push(rows[y].sort(function (a, b) { return a.transform[4] - b.transform[4]; }).map(function (it) { return it.str; }).join(' ')); });
    }); })(i);
    return chain.then(function () { return lines.join('\n'); });
  }
  // Page one as a picture, kept with the job like a photo would be.
  function pdfPicture(pdf) {
    return pdf.getPage(1).then(function (pg) {
      var v1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: Math.min(2, 1100 / v1.width) }), c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height); var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      return pg.render({ canvasContext: ctx, viewport: vp }).promise.then(function () { return c.toDataURL('image/jpeg', 0.72); });
    });
  }
  function ownDetails() { var d = S.details || {}; return { trading_name: d.trading_name || '', owner_name: d.owner_name || '', abn: d.abn || '', phone: d.phone || '', email: d.email || '', address: d.address || '' }; }
  function readByRelay(media_type, b64) {
    return relayCall('read', { media_type: media_type, data: b64, own: ownDetails() }).then(function (r) { return r && r.ok && r.item ? { item: r.item } : { error: (r && r.error) || '', off: !!(r && r.off) }; });
  }
  // Read a picked file. Resolves { item, photo } or { error, photo }; never rejects.
  function readQuoteFile(f) {
    var isPdf = /pdf/i.test(f.type || '') || /\.pdf$/i.test(f.name || '');
    if (!isPdf) return compressImage(f, 1400, 0.75).then(function (photo) {
      if (!photo) return { error: 'That photo would not open.' };
      return readByRelay('image/jpeg', photo.split(',')[1]).then(function (r) { r.photo = photo; return r; });
    }).catch(function () { return { error: 'That photo would not open.' }; });
    var bytes;
    return fileBytes(f).then(function (b) { bytes = b; return loadPdfJs(); }).then(function (lib) {
      return lib.getDocument({ data: new Uint8Array(bytes.slice(0)), isEvalSupported: false }).promise;
    }).then(function (pdf) {
      return Promise.all([pdfWords(pdf).catch(function () { return ''; }), pdfPicture(pdf).catch(function () { return ''; })]);
    }).then(function (got) {
      var words = got[0], photo = got[1], item = QCIngest.parseDoc(words, ownDetails());
      if (item.name && item.amount > 0) return { item: item, photo: photo };
      // no words (a scan) or not enough of them: the relay reads the page itself
      if (bytes.byteLength > 2.5 * 1024 * 1024) return { item: words.trim() ? item : null, photo: photo, error: words.trim() ? '' : 'That PDF is too big to read. Type it in.' };
      return readByRelay('application/pdf', toB64(bytes)).then(function (r) { r.photo = photo; if (!r.item && words.trim()) r.item = item; return r; });
    }).catch(function () {
      // the PDF reader could not load (no signal the first time) or the file is not a PDF it can open
      if (!bytes) return { error: 'That file would not open.' };
      if (bytes.byteLength > 2.5 * 1024 * 1024) return { error: 'That file would not open. Type it in.' };
      return readByRelay('application/pdf', toB64(bytes));
    });
  }
  var ADD_TABS = [['find', 'send', 'Find'], ['type', 'pen', 'Type'], ['paste', 'paste', 'Paste'], ['photo', 'camera', 'Photo']];
  function viewAdd(tab, qs) {
    // Which logins are switched on is asked once. Until the answer comes, and if there are none, Find has Texts and File.
    if (viewAdd.finders == null) { viewAdd.finders = []; findCall({ action: 'which' }).then(function (r) { viewAdd.finders = (r && r.ok && r.providers) || (r && r.off ? [] : null); if (!viewAdd.finders) return; var so = document.getElementById('sheetout'); if (viewAdd.finders.length && /^#\/add\/?(?:find|sheet)?$/.test(location.hash) && so && !so.innerHTML) viewAdd('find'); }); }
    var logins = (viewAdd.finders || []).filter(function (k) { return FINDERS[k]; });
    if (tab === 'found') return viewFound(qs);
    if (tab === 'texts') return viewTexts();
    if (!tab || tab === 'sheet') tab = 'find';
    if (ADD_TABS.every(function (t) { return t[0] !== tab; })) tab = 'type';
    if (!viewAdd.draft) { try { viewAdd.draft = JSON.parse(localStorage.getItem('qc-add-draft') || 'null'); } catch (e) {} }
    var draft = viewAdd.draft || { kind: 'quote' }, today = QCStore.today();
    var tabs = '<div class="row tiles addtabs" role="tablist">' + ADD_TABS.map(function (t) { return '<a class="btn tile ' + (t[0] === tab ? 'tape' : 'ghost') + '" role="tab" aria-selected="' + (t[0] === tab) + '" href="#/add/' + t[0] + '"' + QCPics.says(t[2]) + '>' + QCPics.tile(t[1], t[2]) + '</a>'; }).join('') + '</div>';
    var html = '<a class="hint" href="#/">&larr; Jobs</a><h1>Chase a quote</h1>' + tabs;

    if (tab === 'find') {
      var why = (/(?:^|&)why=(\w+)/.exec(qs || '') || [])[1] || '';
      var said = { no: 'You said no, so nothing was read. Try again, or add them another way.', expired: 'That took too long. Log in again.', failed: 'That did not work. Log in again, or add them another way.', off: 'That is not switched on yet.' }[why] || '';
      html += (said ? '<p class="confirm">' + esc(said) + '</p>' : '') + '<div class="finders">' + logins.map(function (k) {
        return '<button class="btn ghost finder" data-find="' + k + '"' + QCPics.says('Log in to ' + FINDERS[k][1]) + '>' + QCPics.svg(FINDERS[k][0]) + '<span>' + FINDERS[k][1] + '</span></button>'; }).join('') +
        '<a class="btn ghost finder" href="#/add/texts"' + QCPics.says('Texts') + '>' + QCPics.svg('text') + '<span>Texts</span></a>' +
        '<label class="btn ghost finder"' + QCPics.says('Choose a file') + '>' + QCPics.svg('sheet') + '<span>File</span><input type="file" id="sheetfile" accept=".csv,.txt,.xml,text/csv,text/plain,text/xml,application/xml"></label>' +
        '</div>' + (logins.length ? '<p class="hint">Log in, tap Allow. It reads what you sent, once, and keeps only the quotes.</p>' : '') + '<p class="hint" id="findmsg"></p><div id="sheetout"></div>';
      $app.innerHTML = html;
      wireFile();
      Array.prototype.forEach.call($app.querySelectorAll('[data-find]'), function (b) { b.addEventListener('click', function () {
        b.disabled = true; document.getElementById('findmsg').textContent = 'Opening the login\u2026';
        findCall({ action: 'start', provider: b.getAttribute('data-find') }).then(function (r) {
          if (!r || !r.ok || !r.url) { b.disabled = false; document.getElementById('findmsg').textContent = (r && r.error) || 'That did not work.'; return; }
          location.href = r.url;
        });
      }); });
      return;
    }

    if (tab === 'paste') {
      var clip = !!(navigator.clipboard && navigator.clipboard.readText);
      html += '<div class="card">' + (clip ? '<button class="btn tape lg tile" id="pasteclip"' + QCPics.says('Paste') + '>' + QCPics.tile('paste', 'Paste') + '</button>' : '') + '<label class="f">The text or email you sent<textarea id="pastebox" rows="7" placeholder="Hi Jane, quote for the deck is $2,450 inc GST..."></textarea></label><button class="btn tape lg" id="pastego">Read it</button><p class="hint" id="pastemsg"></p></div>';
      $app.innerHTML = html;
      document.getElementById('pastego').addEventListener('click', function () {
        var t = document.getElementById('pastebox').value;
        if (!String(t).trim()) { document.getElementById('pastemsg').textContent = 'Hold a text, tap Copy, then Paste.'; return; }
        draftFrom(t); go('/add/type');
      });
      if (clip) document.getElementById('pasteclip').addEventListener('click', function () {
        var box = document.getElementById('pastebox'), msg = document.getElementById('pastemsg');
        navigator.clipboard.readText().then(function (t) {
          if (!String(t || '').trim()) { msg.textContent = 'Nothing copied yet. Hold a text, tap Copy, come back.'; return; }
          box.value = t; document.getElementById('pastego').click();
        }).catch(function () { box.focus(); msg.textContent = 'Hold in the box, tap Paste.'; });
      });
      return;
    }

    // Type, and what Paste and Photo found
    var v = function (k) { return draft[k] == null ? '' : esc(draft[k]); };
    var kindChips = '<div class="row chips kindchips"><button class="chip' + (draft.kind !== 'invoice' ? ' on' : '') + '" data-kind="quote">' + QCPics.svg('quote') + ' Quote</button><button class="chip' + (draft.kind === 'invoice' ? ' on' : '') + '" data-kind="invoice">' + QCPics.svg('invoice') + ' Invoice</button></div>';
    var photoRow = tab === 'photo' ? '<div class="card"><div class="row tiles readtiles"><label class="btn tape lg tile"' + QCPics.says('Take a photo of the quote') + '>' + QCPics.tile('camera', draft.photo ? 'Retake' : 'Photo') + '<input type="file" id="addphoto" accept="image/*" capture="environment"></label>' +
      '<label class="btn ghost lg tile"' + QCPics.says('Choose a PDF or a picture of the quote') + '>' + QCPics.tile('doc', 'PDF or picture') + '<input type="file" id="addfile" accept="application/pdf,.pdf,image/*"></label></div>' +
      '<p class="hint" id="readmsg">' + esc(viewAdd.readMsg || '') + '</p>' + (draft.photo ? '<img class="addthumb" src="' + draft.photo + '" alt="">' : '') + '</div>' : '';
    html += photoRow + '<div class="card addform">' + (draft.found ? '<p class="hint">Check what it found.</p>' : '') + kindChips +
      '<label class="f">Name<input type="text" id="a_name" autocomplete="off" value="' + v('name') + '"></label>' +
      '<div class="g2"><label class="f">Mobile<input type="tel" id="a_phone" inputmode="tel" value="' + v('phone') + '"></label><label class="f">Email<input type="email" id="a_email" inputmode="email" value="' + v('email') + '"></label></div>' +
      '<label class="f">$ with GST<input type="text" id="a_amount" inputmode="decimal" placeholder="0" value="' + v('amount') + '" style="font-size:1.4rem"></label>' +
      '<div class="g2"><label class="f">Sent<input type="date" id="a_date" max="' + today + '" value="' + (v('date') || today) + '"></label>' + (draft.kind === 'invoice' ? '<label class="f">Due<input type="date" id="a_due" value="' + (v('due') || QCStore.addDays(v('date') || today, 7)) + '"></label>' : '<label class="f">Number<input type="text" id="a_number" value="' + v('number') + '"></label>') + '</div>' +
      (draft.kind === 'invoice' ? '<label class="f">Number<input type="text" id="a_number" value="' + v('number') + '"></label>' : '') +
      '<label class="f">What for<input type="text" id="a_what" placeholder="Bathroom regrout" value="' + v('what') + '"></label>' +
      '<button class="btn tape lg" id="a_go" disabled>' + QCPics.svg('chase') + ' Chase it</button><p class="hint" id="a_msg"></p></div>';
    $app.innerHTML = html;

    var el = function (id) { return document.getElementById(id); };
    var read = function () {
      var d = { kind: draft.kind || 'quote', name: el('a_name').value.trim(), phone: QCIngest.tidyPhone(el('a_phone').value), email: el('a_email').value.trim(),
        amount: QCIngest.parseMoney(el('a_amount').value), date: el('a_date').value || today, number: el('a_number').value.trim(), what: el('a_what').value.trim(), photo: draft.photo || '' };
      if (el('a_due')) d.due = el('a_due').value;
      return d;
    };
    // The button only lights up once there is someone to chase and something to chase them for.
    var check = function () {
      var d = read(), okMail = !d.email || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email), ready = d.name && (d.phone || d.email) && okMail && d.amount > 0;
      el('a_go').disabled = !ready;
      el('a_msg').textContent = !d.name ? '' : !(d.phone || d.email) ? 'A mobile or an email to chase.' : !okMail ? 'That email does not look right.' : !(d.amount > 0) ? 'How much?' : '';
      viewAdd.draft = Object.assign({}, draft, d, { amount: el('a_amount').value, found: draft.found });
      try { localStorage.setItem('qc-add-draft', JSON.stringify(viewAdd.draft)); } catch (e) {}   // a lost tab keeps what he typed
    };
    ['a_name', 'a_phone', 'a_email', 'a_amount', 'a_date', 'a_number', 'a_what', 'a_due'].forEach(function (id) { var x = el(id); if (x) x.addEventListener('input', check); });
    Array.prototype.forEach.call($app.querySelectorAll('[data-kind]'), function (b) { b.addEventListener('click', function () { check(); viewAdd.draft.kind = b.getAttribute('data-kind'); viewAdd.draft.kindSet = true; viewAdd(tab); }); });
    var pick = function () {
      var f = this.files && this.files[0]; if (!f) return;
      check(); el('readmsg').textContent = 'Reading it\u2026';
      Array.prototype.forEach.call($app.querySelectorAll('.readtiles input'), function (x) { x.disabled = true; });
      readQuoteFile(f).then(function (r) {
        var d = viewAdd.draft || {}, it = r.item;
        if (r.photo) d.photo = r.photo;
        if (it) {
          // only the boxes he has not filled
          ['name', 'phone', 'email', 'number', 'what', 'due'].forEach(function (k) { if (!String(d[k] || '').trim() && it[k]) d[k] = it[k]; });
          if (!(QCIngest.parseMoney(d.amount) > 0) && it.amount > 0) d.amount = it.amount;
          if (it.date && (!d.date || d.date === QCStore.today())) d.date = it.date;
          if (it.kind && !d.kindSet) d.kind = it.kind;   // unless he has already said which it is
          d.found = true;
        }
        viewAdd.readMsg = it ? '' : (r.error || 'Type the name and amount.');
        viewAdd.draft = d; try { localStorage.setItem('qc-add-draft', JSON.stringify(d)); } catch (e) {}
        if (/^#\/add\/photo/.test(location.hash)) viewAdd(tab);
      });
    };
    ['addphoto', 'addfile'].forEach(function (id) { var x = el(id); if (x) x.addEventListener('change', pick); });
    check();
    el('a_go').addEventListener('click', function () {
      var d = read(); el('a_go').disabled = true;
      chaseThese([d]).then(function (res) {
        viewAdd.draft = null; viewAdd.readMsg = ''; try { localStorage.removeItem('qc-add-draft'); } catch (e) {}
        if (!res.added) { toast('That one is already here.'); go('/chase'); return; }
        var who = d.name.split(/\s+/)[0], when = res.queued && res.queued.first ? ' First nudge ' + whenText(res.queued.first) + '.' : '';
        var old = d.kind !== 'invoice' && staleQuote(d.date);
        toast(old ? who + ' added. Over three months old, so you send it: tap Text.' : 'Chasing ' + who + '.' + when, { action: 'Another', onAction: function () { go('/add/' + tab); } });
        go('/chase');
      });
    });
  }
  // Jobs whose quote or invoice was made somewhere else -- a set-up link, a quote typed in, a text pasted, a
  // spreadsheet exported from another app -- all come in here and are chased exactly like the app's own.
  function importJobs(list) {
    var res = { jobs: 0, skipped: 0, loaded: [] };
    var have = {}; S.jobs.forEach(function (j) { have[j.id] = 1; }); var prefix = String(S.details.quote_prefix == null ? 'Q-' : S.details.quote_prefix);
    (Array.isArray(list) ? list : []).forEach(function (j) {
      if (!isObj(j)) return; var id = String(j.id || '').replace(/[^A-Za-z0-9_-]/g, ''); if (id && have[id]) { res.skipped++; return; }
      var raw = JSON.parse(JSON.stringify(j)); if (!raw.quote_no || raw.quote_no === 'Q-?') raw.quote_no = QCStore.nextQuoteNo(true); if (raw.quote && isObj(raw.quote) && !raw.quote.number) raw.quote.number = raw.quote_no;
      (Array.isArray(raw.invoices) ? raw.invoices : []).forEach(function (inv) { if (!isObj(inv)) return; if (!inv.no || inv.no === 'INV-?') inv.no = QCStore.nextInvoiceNo(); if (inv.gst == null && inv.total != null && inv.subtotal != null) inv.gst = r2((+inv.total || 0) - (+inv.subtotal || 0)); if (inv.sent_confirmed == null) inv.sent_confirmed = !!inv.sent_date; });
      var job = QCStore.normaliseJob(raw); if (job.quote && parseFloat(job.manual_total) > 0) bookQuote(job);
      var num = job.quote_no.indexOf(prefix) === 0 ? parseInt(job.quote_no.slice(prefix.length), 10) : NaN; if (num >= (parseInt(S.next_quote, 10) || 1001)) S.next_quote = num + 1; // the painter's next quote number never repeats one a set-up link loaded
      job.from_book = true; have[job.id] = 1; S.jobs.push(job); res.jobs++; res.loaded.push(job);
    });
    return res;
  }
  // merge into S and save; returns counts for the toast. Throws a plain sentence when the payload is not one of ours.
  function applySetup(obj) {
    if (!isObj(obj) || obj.v !== 1) throw new Error('That code is for a different version of the app. Open the link in your welcome email instead.');
    if (JSON.stringify(obj).length > SETUP_MAX) throw new Error('That set-up is too big to load.');
    var st = isObj(obj.settings) ? obj.settings : {}, res = { details: 0, prices: 0, settings: 0, jobs: 0, skipped: 0, loaded: [] };
    SETUP_SECTIONS.forEach(function (k) { if (!isObj(st[k])) return; if (!isObj(S[k])) S[k] = {}; var n = mergeSection(S[k], st[k]); res.settings += n; if (k === 'details') res.details = n; if (k === 'prices') res.prices = n; });
    if (st.details && S.rules) { if (!blank(st.details.deposit_pct)) S.rules.deposit_pct = S.details.deposit_pct; if (!blank(st.details.balance_days)) S.rules.balance_days = S.details.balance_days; } // the engine reads rules.*; Set-up keeps both in step, so does this
    var got = importJobs(obj.jobs); res.jobs = got.jobs; res.skipped = got.skipped; res.loaded = got.loaded;
    if (res.loaded.some(chaseable)) { if (!isObj(S.ui)) S.ui = {}; S.ui.book_chase = 'ready'; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(obj.scoreboard_start || ''))) { if (!isObj(S.ui)) S.ui = {}; S.ui.scoreboard_start = String(obj.scoreboard_start); }
    save(); return res;
  }
  // the link-builder sends {number, total, subtotal, sent_date} and manual_total (ex GST): fill in what the quote screen, PDF and follow-ups read from a snapshot
  function bookQuote(job) {
    var q = job.quote, gstOn = S.details.gst !== false, sub = r2(parseFloat(q.subtotal) || parseFloat(job.manual_total) || 0), tot = r2(parseFloat(q.total) || 0); if (!tot && sub) tot = gstOn ? r2(sub * 1.1) : sub; if (!sub && tot) sub = gstOn ? r2(tot / 1.1) : tot;
    var desc = String(job.summary || '').trim() || 'Work as quoted';
    if (!(q.lines || []).length) q.lines = [{ key: 'room_price', room: 'Job', group: 'Job', desc: desc, client_desc: desc, qty: 1, unit: 'job', rate: sub, base_rate: sub, loading: 0, loading_desc: '', amount: sub, source: 'from your book', provenance: 'from your book', confirm: false, override: true }];
    q.subtotal = sub; q.gst = r2(tot - sub); q.total = tot; q.sent_date = q.sent_date || job.sent_date || ''; q.date = q.date || q.sent_date || job.created; q.version = q.version || 1; q.number = q.number || job.quote_no; q.history = q.history || []; q.options = q.options || []; q.assumptions = q.assumptions || []; q.measured_rooms = 0; q.total_rooms = 0;
    if (q.deposit == null) { try { var dp = depositFor(job, tot); q.deposit = dp.amount; q.deposit_pct = dp.pct; } catch (e) { q.deposit = 0; } }
    if (!job.sent_date && q.sent_date) { job.sent_date = q.sent_date; job.sent_how = job.sent_how || 'other'; job.sent_confirmed = true; }
  }
  function setupToast(res) { if (!res.settings && !res.jobs) return 'Already loaded: nothing new in that code.'; var bits = []; if (res.prices) bits.push('your prices'); if (res.details) bits.push('details'); bits.push(res.jobs + ' job' + (res.jobs === 1 ? '' : 's')); return 'Loaded: ' + bits.join(bits.length > 2 ? ', ' : ' and ').replace(/, (\d+ jobs?)$/, ' and $1'); }
  function viewSetupLink(qs) {
    var m = /(?:^|&)d=([^&]*)/.exec(qs || ''), code = m ? setupCode(m[1]) : '', badLink = !!(m && m[1] && !code);
    function paste(msg) { $app.innerHTML = '<h1>Set up your app</h1>' + (msg ? '<p class="confirm">' + esc(msg) + '</p>' : '') + '<div class="card"><label class="f">Paste your set-up code<span>or the whole set-up link from your welcome email</span><textarea id="setupcode" rows="3" autocomplete="off" spellcheck="false" autocapitalize="off" placeholder="j:… or z:…"></textarea></label><div class="row between"><button class="btn tape" id="setupcodego">Load</button><a class="btn ghost sm" href="#/">Not now</a></div></div>'; document.getElementById('setupcodego').addEventListener('click', function () { var c = setupCode(document.getElementById('setupcode').value); if (!c) { paste('That does not look like a set-up code. Copy the whole thing and try again.'); return; } show(c); }); }
    function show(c) {
      $app.innerHTML = '<h1>Set up your app</h1><p class="hint">Reading the code…</p>';
      decodeSetup(c).then(function (obj) {
        var w = setupContents(obj), rows = [];
        rows.push(['Business details', w.details ? 'yes' : 'no']); rows.push(['Prices', w.prices ? String(w.prices) : 'none']); rows.push(['Jobs', w.jobs ? String(w.jobs) : 'none']);
        rows.push(['Sending', w.sending === 'hosted' ? 'on, in your name' + (w.hosted_until ? ', paid to ' + shortDate(w.hosted_until) : '') : w.sending === 'own' ? 'your own relay' : 'not included']);
        if (w.other.length) rows.push(['Also', w.other.map(function (k) { return { rules: 'quote rules', wording: 'wording', costing: 'costing', follow_up: 'follow-up days', booking: 'working hours' }[k]; }).join(', ')]);
        if (w.to_chase.invoices || w.to_chase.quotes) rows.push(['To chase', [w.to_chase.invoices ? w.to_chase.invoices + ' unpaid invoice' + (w.to_chase.invoices > 1 ? 's' : '') : '', w.to_chase.quotes ? w.to_chase.quotes + ' open quote' + (w.to_chase.quotes > 1 ? 's' : '') : ''].filter(Boolean).join(', ') + '. Nothing is sent until you tap Start the chasing.']);
        if (w.scoreboard_start) rows.push(['Scoreboard', 'counts from ' + shortDate(w.scoreboard_start)]);
        $app.innerHTML = '<h1>Set up your app?</h1>' + (w.note ? '<p class="hint">' + esc(w.note) + '</p>' : '') + '<div class="card"><h3>What is in it</h3>' + rows.map(function (r) { return '<div class="row between" style="border-top:1px solid var(--line);padding-top:6px"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '<p class="hint">Adds to this phone. Nothing already here is replaced.</p><div class="row between"><button class="btn tape" id="setupload">Load</button><a class="btn ghost sm" href="#/">Not now</a></div></div>';
        document.getElementById('setupload').addEventListener('click', function () { var b = this; b.disabled = true; try { var res = applySetup(obj); if (!isObj(S.account)) S.account = {}; if (!S.account.email) { S.account.email = String((((obj.settings || {}).details) || {}).email || (S.sending && S.sending.hosted_name) || 'set-up link'); S.account.joined = QCStore.today(); S.account.verified = true; save(); } toast(setupToast(res).replace(/\.?$/, '') + (res.loaded.some(chaseable) ? '. Nothing is sent until you tap Start the chasing.' : '.')); go('/'); } catch (e) { b.disabled = false; showBlock(b, e.message, { kind: 'bad' }); } });
      }).catch(function (e) { paste(e.message); });
    }
    if (code) show(code); else paste(badLink ? 'That does not look like a set-up code. Copy the whole link from your welcome email and try again.' : '');
  }
  // ---------- Make the prices yours: the two questions that used to be a phone call. One day rate, or one job he has
  // already quoted, and every price in the list moves to match. Nothing is sent anywhere and he can go back to the starter prices.
  function priceScale(factor) { var out = {}, items = (QCStore.PRICE_ITEMS || []); (items.length ? items.map(function (i) { return i.key || i[0]; }) : Object.keys(S.prices)).forEach(function (k) { var v = parseFloat(S.prices[k]); if (v > 0) out[k] = Math.round(v * factor * 100) / 100; }); return out; }
  function starterPrices() { return (QCStore.defaults && QCStore.defaults().prices) || {}; }
  function pricesTouched() { var d = starterPrices(); return Object.keys(d).some(function (k) { return +S.prices[k] !== +d[k]; }); }
  function viewMyPrices() {
    var d = starterPrices(), day = parseInt((S.costing && S.costing.labour_rate) || 0, 10) * 8;
    var html = '<a class="hint" href="#/settings">&larr; Set-up</a><h1>Make the prices yours</h1>' +
      '<p class="hint">Average Australian rates until you answer. One is enough.</p>';
    html += '<div class="card"><h3>1. What do you charge for a day on the tools?</h3>' +
      '<div class="g2"><label class="f">A day, one painter<span>before GST, e.g. 520</span><input type="number" id="mp_day" min="0" step="10" value="' + (day > 0 ? day : '') + '" inputmode="numeric"></label>' +
      '<label class="f">Markup on your costs %<span>ute, insurance, time quoting</span><input type="number" id="mp_margin" min="0" max="300" step="5" value="' + esc(String((S.costing && S.costing.margin_pct) != null ? S.costing.margin_pct : 40)) + '"></label></div>' +
      '<div class="row"><button class="btn tape sm" id="mp_daygo">Work my prices out</button><span class="hint" id="mp_dayres"></span></div></div>';
    html += '<div class="card"><h3>2. Or: a job you have already quoted</h3><p class="hint">Every price moves to match.</p>' +
      '<div class="g3"><label class="f">Room width m<input type="number" id="mp_w" min="0" step="0.1" inputmode="decimal" placeholder="4"></label><label class="f">Room length m<input type="number" id="mp_l" min="0" step="0.1" inputmode="decimal" placeholder="5"></label><label class="f">Ceiling height m<input type="number" id="mp_h" min="0" step="0.1" inputmode="decimal" value="2.7"></label></div>' +
      '<div class="g2"><label class="f">What you charged, before GST<input type="number" id="mp_price" min="0" step="10" inputmode="numeric" placeholder="1200"></label><label class="btn ghost sm" style="align-self:end"><input type="checkbox" id="mp_ceiling" checked> Ceiling painted too</label></div>' +
      '<div class="row"><button class="btn tape sm" id="mp_jobgo">Match my price</button><span class="hint" id="mp_jobres"></span></div></div>';
    html += '<div class="card"><h3>3. Or type them in</h3><div class="row"><a class="btn ghost sm" href="#/settings/prices">Open the price list</a>' + (pricesTouched() ? '<button class="btn ghost sm" id="mp_reset">Back to the starter prices</button>' : '') + '</div></div>';
    $app.innerHTML = html;
    document.getElementById('mp_daygo').addEventListener('click', function () {
      var dayRate = parseFloat(document.getElementById('mp_day').value), mg = parseFloat(document.getElementById('mp_margin').value);
      if (!(dayRate > 0)) { document.getElementById('mp_dayres').textContent = 'Put your day rate in first.'; return; }
      if (!isObj(S.costing)) S.costing = {};
      S.costing.labour_rate = Math.round(dayRate / 8 * 100) / 100; if (mg >= 0) S.costing.margin_pct = mg;
      var der = QCCosting.deriveRates(S.costing), k = 0; Object.keys(der).forEach(function (key) { if (der[key] > 0) { S.prices[key] = der[key]; k++; } });
      S.security.setup_done = true; save(); toast(k + ' prices worked out from ' + money(dayRate) + ' a day. Change any of them on the price list.'); go('/settings/prices');
    });
    document.getElementById('mp_jobgo').addEventListener('click', function () {
      var w = parseFloat(document.getElementById('mp_w').value), l = parseFloat(document.getElementById('mp_l').value), h = parseFloat(document.getElementById('mp_h').value) || 2.7, want = parseFloat(document.getElementById('mp_price').value), ceil = document.getElementById('mp_ceiling').checked, out = document.getElementById('mp_jobres');
      if (!(w > 0 && l > 0 && want > 0)) { out.textContent = 'Room size and what you charged, then tap again.'; return; }
      var room = { id: 'mp', name: 'Room', type: 'interior', method: 'typed', width_m: w, length_m: l, height_m: h, walls: [], surfaces: { walls: true, ceiling: ceil, skirting: true }, doors: 1, windows: 1, ext: {} };
      var probe = { id: 'mp', client: { name: '', address: '' }, rooms: [room], extras: [], travel_km: 0, status: 'draft' }, now = 0;
      try { now = QCPricing.priceJob(probe, Object.assign({}, S, { details: Object.assign({}, S.details, { gst: false }) })).subtotal; } catch (e) { now = 0; }
      if (!(now > 0)) { out.textContent = 'Could not price that room. Try the day rate instead.'; return; }
      var factor = want / now;
      if (factor < 0.3 || factor > 4) { out.textContent = 'That is ' + (factor < 1 ? 'a lot lower' : 'a lot higher') + ' than the app makes it (' + money(now) + '). Check the size, or type the prices in yourself.'; return; }
      var scaled = priceScale(factor); Object.keys(scaled).forEach(function (k2) { S.prices[k2] = scaled[k2]; });
      S.security.setup_done = true; save();
      toast('Prices moved ' + (factor >= 1 ? 'up ' : 'down ') + Math.abs(Math.round((factor - 1) * 100)) + '% so that room comes to ' + money(want) + '.'); go('/settings/prices');
    });
    var rs = document.getElementById('mp_reset'); if (rs) rs.addEventListener('click', function () { var dd = starterPrices(); Object.keys(dd).forEach(function (k) { S.prices[k] = dd[k]; }); save(); toast('Back to the starter prices.'); viewMyPrices(); });
  }
  // ---------- Hand a job to the other phone. The set-up link already carries jobs, so this is the same code with one job in it.
  // The job is copied, not moved: the other phone gains it, this one keeps it until the painter deletes it.
  function handOffJob(job) {
    var one = JSON.parse(JSON.stringify(job));
    return encodeSetup({ v: 1, settings: {}, jobs: [one], note: 'A job from the other phone: ' + (dispName(job) || job.quote_no) + '.' });
  }
  function viewHandOff(job) {
    var code = handOffJob(job), link = location.href.split('#')[0] + '#/setup?d=' + code;
    $app.innerHTML = '<a class="hint" href="#/job/' + job.id + '">&larr; ' + esc(dispName(job) || 'Job') + '</a><h1>Send this job to the other phone</h1>' +
      '<div class="card"><p class="hint">Open on the other phone and tap Load. Both phones keep a copy, so only one of you works ' + esc(dispName(job) || 'the job') + ' at a time.</p>' +
      '<textarea id="hoff" rows="4" readonly onclick="this.select()">' + esc(link) + '</textarea>' +
      '<div class="row"><button class="btn tape sm" id="hoffcopy">Copy the link</button><button class="btn ghost sm" id="hoffshare">Send it</button></div></div>';
    document.getElementById('hoffcopy').addEventListener('click', function () { var ta = document.getElementById('hoff'); ta.select(); try { navigator.clipboard.writeText(link); } catch (e) { document.execCommand('copy'); } toast('Copied. Open it on the other phone.'); });
    document.getElementById('hoffshare').addEventListener('click', function () { if (navigator.share) navigator.share({ title: 'A job from the other phone', text: link }).catch(function () {}); else location.href = 'sms:?&body=' + encodeURIComponent(link); });
  }
  // ---------- Scoreboard: what happened since the start date the set-up link gave, counted from this phone only. Nothing leaves it unless the painter taps Share.
  function scoreboardData(start) {
    var now = Date.now(), log = (S.log && S.log.sent) || [], cancelled = {}; log.forEach(function (e) { if (e && e.kind === 'cancel' && e.ok && e.id) cancelled[e.id] = 1; });
    var named = S.jobs.filter(function (j) { return String(j.client && j.client.name || '').trim(); });
    var quoted = named.filter(function (j) { return j.sent_confirmed && j.sent_date && j.sent_date >= start; });
    var measured = quoted.filter(function (j) { return (j.rooms || []).some(function (r) { return r.method === 'measured' && r.walls && r.walls.length; }); });
    var auto = log.filter(function (e) { if (!e || !e.ok) return false; var day = String(e.send_at || e.t || '').slice(0, 10); if (!day || day < start) return false; if (e.kind === 'send' && e.auto) return true; return e.kind === 'schedule' && e.send_at && new Date(e.send_at).getTime() <= now && !(e.id && cancelled[e.id]); });
    var paid = [], deposits = [];
    named.forEach(function (j) { (j.invoices || []).forEach(function (i) { if (i.void) return; if (i.paid_date && i.paid_date >= start) paid.push({ no: i.no, date: i.paid_date, total: +i.total || 0, job: j }); if (i.kind === 'deposit' && invOut(i) && i.date && i.date >= start) deposits.push({ no: i.no, date: i.date, total: +i.total || 0 }); }); });
    paid.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var first = paid[0] || null, depTotal = deposits.reduce(function (t, d) { return t + d.total; }, 0), paidTotal = paid.reduce(function (t, d) { return t + d.total; }, 0);
    var text = 'Since ' + shortDate(start) + ': ' + (quoted.length ? quoted.length + ' quote' + (quoted.length === 1 ? '' : 's') + ' sent, ' + measured.length + ' measured with the sheet.' : 'no quotes sent yet.') + ' ' + (auto.length ? auto.length + ' follow-up' + (auto.length === 1 ? '' : 's') + ' went by ' + (auto.length === 1 ? 'itself' : 'themselves') + '.' : 'No follow-ups have gone by themselves yet.') + ' ' + (first ? 'First invoice paid ' + shortDate(first.date) + ', ' + QCStore.daysBetween(start, first.date) + ' days in' + (paid.length > 1 ? '; ' + paid.length + ' paid so far, ' + money(paidTotal) : '') + '.' : 'No invoice paid yet.') + (deposits.length ? ' ' + deposits.length + ' deposit invoice' + (deposits.length === 1 ? '' : 's') + ' sent, ' + money(depTotal) + '.' : '');
    return { start: start, quotes: quoted.length, measured: measured.length, auto: auto.length, paid: paid, first_paid: first, first_paid_days: first ? QCStore.daysBetween(start, first.date) : null, paid_total: paidTotal, deposits: deposits.length, deposit_total: depTotal, text: text };
  }
  function viewScoreboard() {
    var start = S.ui && S.ui.scoreboard_start; if (!/^\d{4}-\d{2}-\d{2}$/.test(String(start || ''))) { $app.innerHTML = '<h1>Scoreboard</h1><div class="card empty">No start date yet. It is set when a set-up link is loaded.</div><p><a class="btn ghost sm" href="#/">Back to jobs</a></p>'; return; }
    var d = scoreboardData(start), row = function (label, val, hint) { return '<div class="row between" style="border-top:1px solid var(--line);padding-top:6px"><span>' + esc(label) + (hint ? '<br><span class="hint">' + esc(hint) + '</span>' : '') + '</span><b>' + esc(val) + '</b></div>'; };
    var html = '<h1>Scoreboard</h1><p class="hint">Since ' + esc(shortDate(start)) + '. Counted on this phone; nothing leaves it unless you tap Share.</p><div class="card">';
    html += row('Quotes sent to customers', String(d.quotes)) + row('Measured with the sheet', String(d.measured), 'of those quotes, at least one room measured from a photo') + row('Follow-ups that went by themselves', String(d.auto)) + row('First invoice paid', d.first_paid ? shortDate(d.first_paid.date) : 'not yet', d.first_paid ? d.first_paid_days + ' days in' + (d.first_paid.job && d.first_paid.job.client.name ? ' · ' + d.first_paid.job.client.name : '') : '') + row('Invoices paid', d.paid.length ? d.paid.length + ' · ' + money(d.paid_total) : '0') + row('Deposit invoices sent', d.deposits ? d.deposits + ' · ' + money(d.deposit_total) : '0');
    html += '</div><div class="card"><p id="sbtext">' + esc(d.text) + '</p><div class="row between"><button class="btn tape" id="sbshare">Share</button><a class="btn ghost sm" href="#/">Back to jobs</a></div></div>';
    $app.innerHTML = html;
    document.getElementById('sbshare').addEventListener('click', function () { handOff({ kind: 'summary', text: d.text, filename: 'scoreboard.txt', whoName: '', ask: false, anchor: this }); });
  }

  function viewHelp() {
    $app.innerHTML = '<h1>How it works</h1><div class="card"><ol class="steps">' +
      '<li><span><b>Set-up.</b> Name, bank details, a look at the prices.</span></li>' +
      '<li><span><b>New job.</b> The client, then each room.</span></li>' +
      '<li><span><b>Measure.</b> A4 on the wall, one photo, confirm the corners.</span></li>' +
      '<li><span><b>Quote.</b> Read it, then Send. A missing price says TO CONFIRM.</span></li>' +
      '<li><span><b>Follow up.</b> 3, 7 and 14 days. Nothing goes without you unless you switch on sending.</span></li>' +
      '<li><span><b>Accepted.</b> Book the days, send the deposit. Then the final.</span></li>' +
      '<li><span><b>Get paid.</b> Reminders on working days. The final notice never goes without you.</span></li>' +
      '<li><span><b>Back up.</b> One file, after every invoice.</span></li></ol></div>' +
      '<div class="card"><h3>New phone</h3><p class="muted">Set-up, Back-up, Restore from file. Everything comes back.</p></div>' +
      '<div class="card"><h3>Lost phone</h3><p class="muted">The app lock keeps them out. Your last saved copy puts everything on the new one.</p></div>' +
      '<div class="row"><a class="btn tape" href="#/">Back to jobs</a><a class="btn ghost" href="#/settings">Set-up</a></div>';
  }
  function viewSentLog() {
    var log = (S.log && S.log.sent) || [], kindLabel = function (e) { if (e.kind === 'handed') return 'Handed to your phone to send'; return (e.channel === 'sms' ? 'text' : e.channel === 'email' ? 'email' : e.channel || '') + (e.kind === 'schedule' ? ' scheduled' : e.kind === 'cancel' ? ' cancel' : ''); }, stamp = function (t) { var d = new Date(t); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) + ' ' + fmtTime(t); };
    var status = function (e) { if (e.kind === 'handed') return '<span class="pill">handed over</span>'; if (e.ok) return '<span class="pill ok">' + (e.kind === 'schedule' ? 'scheduled' : e.kind === 'cancel' ? 'cancelled' : 'sent') + '</span>'; return '<span class="pill bad">failed</span><br><span class="hint">' + esc(e.error || '') + '</span>'; };
    var html = '<a class="hint" href="#/settings">&larr; Set-up</a><h1>Sent log</h1><p class="muted">Newest first. The last 500.</p>';
    if (!log.length) html += '<div class="card empty">Nothing sent yet.</div>';
    else html += '<div class="card"><div class="tw"><table><thead><tr><th>When</th><th>Job</th><th>How</th><th>To</th><th>Message</th><th>Status</th></tr></thead><tbody>' + log.slice(0, 200).map(function (e) { var j = QCStore.getJob(e.job); return '<tr><td style="white-space:nowrap">' + esc(stamp(e.t)) + '</td><td>' + esc(j ? (j.client.name || j.quote_no) : '') + (e.ref ? '<br><span class="hint">' + esc(e.ref) + '</span>' : '') + '</td><td>' + esc(kindLabel(e)) + (e.send_at ? '<br><span class="hint">for ' + esc(QCPdf.fmtDate(String(e.send_at).slice(0, 10))) + '</span>' : '') + '</td><td>' + esc(e.to || '') + '</td><td>' + esc(String(e.text || e.filename || '').split('\n')[0].slice(0, 90)) + '</td><td>' + status(e) + '</td></tr>'; }).join('') + '</tbody></table></div>' + (log.length > 200 ? '<p class="hint">Showing the latest 200 of ' + log.length + '.</p>' : '') + '<div class="row"><button class="btn ghost sm" id="logcsv">Save as a spreadsheet</button></div></div>';
    $app.innerHTML = html;
    var lc = document.getElementById('logcsv'); if (lc) lc.addEventListener('click', function () { var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }; var csv = ['When,Job,Ref,Kind,Channel,To,Status,Error,Message'].concat(log.map(function (e) { var j = QCStore.getJob(e.job); return [e.t, j ? (j.client.name || j.quote_no) : '', e.ref, e.kind, e.channel, e.to, e.kind === 'handed' ? 'handed' : e.ok ? 'ok' : 'failed', e.error, e.text || e.filename].map(q).join(','); })).join('\r\n'); var blob = new Blob([csv], { type: 'text/csv' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sent-log-' + QCStore.today() + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); toast('Saved'); });
  }

  // A save that fails raises the bar straight away, not on the next screen.
  if (QCStore.onTrouble) QCStore.onTrouble(function (kind) { saveTrouble(kind); });
  // A private window cannot keep anything, and he should know before he types a job into it, not after.
  try { if (QCStore.storageOk && !QCStore.storageOk()) saveTrouble('blocked'); } catch (e) {}

  // Shared in from another app (on Android: hold a text, Share, Chasem). Read it and open it ready to check.
  (function () { try {
    var sq = location.search || '', part = function (k) { var m = new RegExp('[?&]' + k + '=([^&]*)').exec(sq); return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; };
    var shared = [part('share_title'), part('share_text'), part('share_url')].filter(Boolean).join('\n');
    if (!/[?&]share_/.test(sq)) return;
    if (shared.trim()) draftFrom(shared);
    history.replaceState(null, '', location.pathname + '#/add/' + (shared.trim() ? 'type' : 'paste'));
  } catch (e) {} })();
  route();
  // The tabs: picture over its word. Done here so the pictures have one source.
  try { [['home', 'jobs'], ['chase', 'bell'], ['settings', 'setup']].forEach(function (t) {
    var a = document.querySelector('[data-nav="' + t[0] + '"]'); if (!a || a.querySelector('.ico')) return;
    a.innerHTML = QCPics.svg(t[1]) + '<span class="w">' + esc(a.textContent) + '</span>';
  }); } catch (e) {}
  window.__qcApp = { route: route, store: QCStore, pricing: QCPricing, sync: syncNow, openUrl: function (u) { openUrl(u); }, setOpen: function (f) { openUrl = f; } };
  // W4 helpers for other screens: soft delete with Undo, duplicate, client picker data, paint order text, photo card, message text and greeting
  Object.assign(window.__qcApp, { syncNow: syncNow, retryLocalQueue: retryLocalQueue, showBlock: showBlock, autoSendReady: autoSendReady, autoSendLabel: autoSendLabel, dayDate: dayDate, statusPill: statusPill, deleteJob: deleteJob, restoreJob: restoreJob, duplicateJob: duplicateJob, clients: clients, materialsText: materialsText, photosCard: photosCard, wirePhotos: wirePhotos, chaseText: chaseText, greet: greet, signoff: signoff, jobDesc: jobDesc, scheduleFollowUps: scheduleFollowUps, cancelJobFollowUps: cancelJobFollowUps, cancelQuoteFollowUps: cancelQuoteFollowUps, cancelInvoiceFollowUps: cancelInvoiceFollowUps, pendingFollowUps: pendingFollowUps, waitingFollowUps: waitingFollowUps, lastContact: lastContact, isLandline: QCMsg.isLandline, nextSendTime: function (d, h, st) { return QCCal.nextSendTime(d, h == null ? fuHour() : h, st == null ? stateCode() : st); } });
  // ---------- CSV for the bookkeeper (W3): Xero and MYOB sales-invoice style columns. W4 wires the buttons in Back-up.
  function csvCell(v) { var t = v == null ? '' : String(v); return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }
  function csvRows(head, rows) { return [head].concat(rows).map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n'; }
  function csvDate(iso) { if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return ''; var p = iso.slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function taxType(inv) { return inv.gst > 0 ? 'GST on Income' : 'BAS Excluded'; }
  function exportInvoicesCsv() {
    var st = QCStore.load(), rows = [];
    st.jobs.forEach(function (job) { (job.invoices || []).forEach(function (inv) {
      var c = inv.client_snapshot || job.client || {}, name = c.bill_to || c.name || '', pay = (inv.payments || []).filter(function (p) { return p.amount > 0; }), last = pay[pay.length - 1];
      var lines = (inv.lines || []).length ? inv.lines : [{ desc: inv.kind_line || kindLabel(inv), amount: inv.subtotal }];
      lines.forEach(function (l) { rows.push([inv.no, name, c.abn || '', csvDate(inv.date), csvDate(inv.due), (inv.void ? 'VOID ' : '') + (l.desc || ''), 1, r2(l.amount), '200', inv.void ? 'BAS Excluded' : taxType(inv), inv.void ? 0 : r2(inv.total), inv.void ? 'void' : (inv.paid_date ? 'paid' : 'open'), csvDate(inv.paid_date), inv.void ? 0 : invPaid(inv), last ? last.method : '', last ? last.ref : '', job.quote_no, job.client && job.client.address || '']); });
    }); });
    return csvRows(['InvoiceNumber', 'ContactName', 'ContactABN', 'InvoiceDate', 'DueDate', 'Description', 'Quantity', 'UnitAmount', 'AccountCode', 'TaxType', 'Total', 'Status', 'PaidDate', 'PaidAmount', 'PaymentMethod', 'PaymentReference', 'QuoteNumber', 'SiteAddress'], rows);
  }
  function exportPaymentsCsv() {
    var st = QCStore.load(), rows = [];
    st.jobs.forEach(function (job) { (job.invoices || []).forEach(function (inv) { var c = inv.client_snapshot || job.client || {};
      (inv.payments || []).forEach(function (p) { rows.push([csvDate(p.date), inv.no, c.bill_to || c.name || '', r2(p.amount), methodLabel(p.method), p.ref || '', inv.void ? 'void invoice' : '', job.quote_no]); });
      (inv.credit_notes || []).forEach(function (cn) { rows.push([csvDate(cn.date), inv.no, c.bill_to || c.name || '', -r2(cn.amount), 'Credit note ' + cn.no, cn.reason || '', '', job.quote_no]); });
    }); });
    rows.sort(function (a, b) { var da = a[0].split('/').reverse().join(''), db = b[0].split('/').reverse().join(''); return da < db ? -1 : da > db ? 1 : 0; });
    return csvRows(['Date', 'InvoiceNumber', 'ContactName', 'Amount', 'Method', 'Reference', 'Note', 'QuoteNumber'], rows);
  }
  function exportJobsCsv() {
    var st = QCStore.load(), rows = [];
    st.jobs.forEach(function (job) { var c = job.client || {}, q = job.quote, live = liveInvoices(job), invoiced = r2(live.reduce(function (s2, i) { return s2 + i.total; }, 0)), paid = r2(live.reduce(function (s2, i) { return s2 + invPaid(i); }, 0));
      rows.push([job.quote_no, q && q.number || '', job.status, c.type || 'homeowner', c.name || '', c.first_name || '', c.phone || '', c.email || '', c.address || '', c.bill_to || '', c.abn || '', job.summary || '', csvDate(job.created), csvDate(q && q.date), csvDate(job.sent_date), q ? r2(q.subtotal) : '', q ? r2(q.gst) : '', q ? r2(q.total) : '', job.acceptance ? csvDate(job.acceptance.date) : '', job.acceptance ? job.acceptance.how || '' : '', job.booking ? csvDate(job.booking.start) : '', job.booking ? job.booking.days : '', invoiced, paid, r2(invoiced - paid), (job.variations || []).filter(function (v) { return v.status === 'agreed'; }).length, live.map(function (i) { return i.no; }).join(' ')]);
    });
    return csvRows(['QuoteNumber', 'QuoteVersion', 'Status', 'ClientType', 'Client', 'ContactFirstName', 'Phone', 'Email', 'SiteAddress', 'BillTo', 'ClientABN', 'Description', 'Created', 'QuoteDate', 'SentDate', 'QuoteExGST', 'QuoteGST', 'QuoteTotal', 'AcceptedDate', 'AcceptedHow', 'BookedStart', 'BookedDays', 'Invoiced', 'Paid', 'Owing', 'AgreedVariations', 'Invoices'], rows);
  }
  window.__qcApp = window.__qcApp || {}; Object.assign(window.__qcApp, { exportInvoicesCsv: exportInvoicesCsv, exportPaymentsCsv: exportPaymentsCsv, exportJobsCsv: exportJobsCsv, priceLive: priceLive, depositFor: depositFor, freeze: freeze });
  Object.assign(window.__qcApp, { applySetup: applySetup, encodeSetup: encodeSetup, decodeSetup: decodeSetup, setupCode: setupCode, setupContents: setupContents, scoreboardData: scoreboardData, queueLoadedFollowUps: queueLoadedFollowUps, bookJobs: bookJobs, renewHosted: renewHosted, hostedPortal: hostedPortal, hostedApi: hostedApi, topUp: topUp, addSeat: addSeat, seats: seats, handOffJob: handOffJob, draftDepositInvoice: draftDepositInvoice, draftedDeposit: draftedDeposit, whenText: whenText });
  Object.assign(window.__qcApp, { handOff: handOff, didItGo: didItGo, markQuoteSent: markQuoteSent, markInvoiceSent: markInvoiceSent, quoteSentDate: quoteSentDate, invOut: invOut, dispName: dispName }); // A2 exports
})();
