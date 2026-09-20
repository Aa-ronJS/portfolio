/* Quote & Chase app: views and routing. Vanilla JS, no build step. */
(function () {
  'use strict';
  var $app = document.getElementById('app'), S;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return QCPdf.money(n); }
  function rateFmt(r) { return Math.abs(r - Math.round(r)) < 0.005 ? money(r) : '$' + (Math.round(r * 100) / 100).toFixed(2); }
  var toastQ = []; function isBad(m) { return /fail|could not|cannot|couldn|can't|error|not valid|invalid|refused|too long|too small|too big|not a |no usable|missing|wrong|unexpected|not right|check the|declined|blocked|unreadable|does not look/i.test(m); }
  function toast(msg) { msg = String(msg); if (toastQ.length && isBad(toastQ[0]) && !isBad(msg) && Date.now() - (toast.at || 0) < 4000 && !((toast.userAt || 0) > (toast.at || 0))) { toastQ = [toastQ[0], msg]; return; } toastQ = [msg]; toast.at = Date.now(); showToast(); } // a failure holds the screen against a follow-on success from the same action; anything the user does after it lets the next toast through
  ['click', 'change', 'input'].forEach(function (ev) { document.addEventListener(ev, function () { toast.userAt = Date.now(); }, true); });
  function showToast() { var t = document.getElementById('toast'); if (!toastQ.length) { t.hidden = true; return; } t.textContent = toastQ[0]; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { toastQ.shift(); showToast(); }, isBad(toastQ[0]) ? 4500 : 2200); }
  function go(h) { location.hash = h; }
  var openUrl = function (u) { location.href = u; };
  // Turn each settings card into a tap-to-open section so the page is a list of headings, not a 20-screen scroll
  function sectionise(root, openTitles, setUp) {
    var pref = {}; try { pref = JSON.parse(localStorage.getItem('qc-sections') || '{}'); } catch (e) {}
    Array.prototype.slice.call(root.querySelectorAll(':scope > .card')).forEach(function (card) {
      var h = card.firstElementChild; if (!h || h.tagName !== 'H2') return; var title = h.textContent.trim();
      var det = document.createElement('details'); det.className = 'card sec'; var sum = document.createElement('summary'); sum.appendChild(h); det.appendChild(sum);
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
    S = QCStore.load();
    var h = location.hash.replace(/^#\/?/, ''), p = h.split('/');
    var navKey = { '': 'home', job: 'home', enquiry: 'home', help: '', chase: 'chase', settings: 'settings' }[p[0] || '']; if (navKey == null) navKey = 'home';
    document.querySelectorAll('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === navKey); });
    refreshPreview = function () {};
    if (!p[0]) return viewHome();
    if (p[0] === 'settings') return viewSettings();
    if (p[0] === 'chase') return viewChase();
    if (p[0] === 'help') return viewHelp();
    if (p[0] === 'enquiry') { if (p[1] && !QCStore.getJob(p[1])) return bounce('/'); return viewEnquiry(p[1] ? QCStore.getJob(p[1]) : null); }
    if (p[0] === 'job' && p[1]) {
      var job = QCStore.getJob(p[1]); if (!job) return bounce('/');
      if (p[2] === 'room' && p[3]) return viewRoom(job, p[3]);
      if (p[2] === 'quote') return viewQuote(job);
      if (p[2] === 'invoice') return viewInvoice(job);
      return viewJob(job);
    }
    bounce('/');
  }
  window.addEventListener('hashchange', route);

  // ---------- Home
  function statusPill(j) {
    var map = { enquiry: ['Enquiry', 'warn'], draft: ['Draft', ''], quoted: ['Quoted', 'ok'], accepted: ['Accepted', 'ok'], invoiced: ['Invoiced', 'warn'], paid: ['Paid', 'ok'], declined: ['Declined', 'bad'] };
    var m = map[j.status] || ['', '']; return '<span class="pill ' + m[1] + '">' + m[0] + '</span>';
  }
  function viewHome() {
    var jobs = S.jobs, setup = S.details.trading_name && Object.keys(S.prices).length;
    var html = '<div class="row between"><h1>Jobs</h1><div class="row"><button class="btn ghost sm" id="newjob">New job</button><a class="btn sm" href="#/enquiry">Phone enquiry</a><button class="btn tape" id="quick">Quick quote</button></div></div>';
    var visits = jobs.filter(function (j) { return j.visit && j.visit.date >= QCStore.today(); }).sort(function (a, b) { return (a.visit.date + QCSched.hm(a.visit.start_min)) < (b.visit.date + QCSched.hm(b.visit.start_min)) ? -1 : 1; });
    if (visits.length) html += '<div class="card"><h3>Quote visits</h3>' + visits.slice(0, 5).map(function (j) { return '<a class="row between" href="#/enquiry/' + j.id + '" style="text-decoration:none;color:inherit"><span><b>' + esc(j.client.name || j.quote_no) + '</b> <span class="hint">' + esc(j.client.address || '') + '</span></span><span class="hint">' + QCPdf.fmtDate(j.visit.date) + ' ' + QCSched.nice(j.visit.start_min) + '</span></a>'; }).join('') + '</div>';
    var todayIso = QCStore.today(), booked = jobs.filter(function (j) { return j.booking && j.booking.end >= todayIso; }).sort(function (a, b) { return a.booking.start < b.booking.start ? -1 : 1; });
    if (booked.length) html += '<div class="card"><h3>Booked</h3>' + booked.slice(0, 4).map(function (j) { return '<div class="row between"><span><b>' + esc(j.client.name || j.quote_no) + '</b> <span class="hint">' + esc(j.client.address || '') + '</span></span><span class="hint">' + QCPdf.fmtDate(j.booking.start) + (j.booking.days > 1 ? ', ' + j.booking.days + ' days' : '') + '</span></div>'; }).join('') + '</div>';
    if (!setup) html += '<div class="card"><h2>Set up first</h2><p class="muted">Business name, bank details and prices.</p><a class="btn" href="#/settings">Set up</a></div>';
    if (!jobs.length) html += '<div class="card empty">No jobs yet. Tap New job.</div>';
    else html += '<div class="joblist">' + jobs.map(function (j) {
      var total = j.quote ? money(j.quote.total) : (j.ballpark ? money(j.ballpark.low) + ' to ' + money(j.ballpark.high) : ''); return '<a class="job" href="' + (j.status === 'enquiry' ? '#/enquiry/' + j.id : '#/job/' + j.id) + '"><div><b>' + esc(j.client.name || 'New job') + '</b><span class="sub">' + esc(j.client.address || j.summary || '') + '</span></div><div style="text-align:right">' + statusPill(j) + '<div class="sub">' + esc(j.quote_no) + (total ? ' · ' + total : '') + '</div></div></a>';
    }).join('') + '</div>';
    html += '<p class="hint"><a href="#/help">How it works</a> · Everything is stored on this phone. <a href="#/settings">Back it up</a> from set-up.</p>';
    $app.innerHTML = html;
    document.getElementById('newjob').addEventListener('click', once(function () { var j = QCStore.newJob(); checkStore(); go('/job/' + j.id); }));
    document.getElementById('quick').addEventListener('click', once(function () { var j = QCStore.newJob(); var r = QCStore.newRoom('interior'); r.name = 'Room 1'; r.method = 'measured'; j.rooms.push(r); j.quick = true; save(); go('/job/' + j.id + '/room/' + r.id); }));
  }

  // ---------- Job
  // One card at the top of a job that says where it is up to and links to the next thing, so nobody hunts through screens
  function whereItsAt(job) {
    var t = QCStore.today(), q = job.quote, lines = [], btns = [];
    if (!q || job.status === 'draft' || job.status === 'enquiry') return '';
    var owing = job.invoices.filter(function (i) { return !i.paid_date; }), paid = job.invoices.filter(function (i) { return i.paid_date; });
    if (job.status === 'quoted') { var d = job.sent_date ? QCStore.daysBetween(job.sent_date, t) : 0; lines.push('Quoted ' + money(q.total) + (job.sent_date ? ', sent ' + QCPdf.fmtDate(job.sent_date) + (d > 0 ? ' (' + d + ' day' + (d === 1 ? '' : 's') + ' ago)' : '') : '') + '.'); btns.push(['#/job/' + job.id + '/quote', 'Open the quote', 'tape'], ['#/chase', 'Follow up', '']); }
    if (job.status === 'declined') { lines.push('Quote declined.'); btns.push(['#/job/' + job.id + '/quote', 'Open the quote', '']); }
    if (job.status === 'accepted') { lines.push('Accepted at ' + money(q.total) + '.' + (job.booking ? ' Booked ' + QCPdf.fmtDate(job.booking.start) + (job.booking.days > 1 ? ' for ' + job.booking.days + ' days' : '') + '.' : ' Not booked.')); btns.push(['#/job/' + job.id + '/invoice', 'Invoice', 'tape'], ['#/job/' + job.id + '/quote', job.booking ? 'Open the quote' : 'Book', '']); }
    if (job.status === 'invoiced') { owing.forEach(function (i) { var od = QCStore.daysBetween(i.due, t); lines.push(esc(i.no) + ' ' + money(i.total) + (od > 0 ? ', ' + od + ' day' + (od === 1 ? '' : 's') + ' overdue' : ', due ' + QCPdf.fmtDate(i.due)) + '.'); }); if (paid.length) lines.push(paid.map(function (i) { return esc(i.no) + ' paid'; }).join(', ') + '.'); btns.push(['#/job/' + job.id + '/invoice', 'Invoices', 'tape'], ['#/chase', 'Follow up', '']); }
    if (job.status === 'paid') { lines.push('Paid in full' + (paid.length ? ', last payment ' + QCPdf.fmtDate(paid[paid.length - 1].paid_date) : '') + '.'); btns.push(['#/job/' + job.id + '/invoice', 'Invoices', ''], ['#/job/' + job.id + '/quote', 'Open the quote', '']); }
    if (!lines.length) return '';
    return '<div class="card"><p>' + lines.join(' ') + '</p><div class="row">' + btns.map(function (b) { return '<a class="btn sm ' + b[2] + '" href="' + b[0] + '">' + b[1] + '</a>'; }).join('') + '</div>' + (job.status !== 'declined' ? '<p class="hint">Changes below do not alter the sent quote until it is sent again.</p>' : '') + '</div>';
  }
  function viewJob(job) {
    var priced = QCPricing.priceJob(job, S);
    var html = '<a class="hint" href="#/">&larr; Jobs</a><div class="row between"><h1>' + esc(job.quote_no) + '</h1>' + statusPill(job) + '</div>';
    html += whereItsAt(job);
    if (job.ballpark) html += '<p class="hint">Phone ballpark was ' + money(job.ballpark.low) + ' to ' + money(job.ballpark.high) + (job.visit ? '. Visit ' + QCPdf.fmtDate(job.visit.date) + ' ' + QCSched.nice(job.visit.start_min) : '') + '. <a href="#/enquiry/' + job.id + '">Enquiry details</a></p>';
    html += '<div class="card"><h2>Client</h2><div class="g2"><label class="f">Name<input type="text" data-bind="client.name" autocomplete="off"></label><label class="f">Mobile<input type="tel" data-bind="client.phone"></label></div>' +
      '<label class="f">Email<input type="email" data-bind="client.email"></label><label class="f">Job address<input type="text" data-bind="client.address"></label>' +
      '<label class="f">Description<input type="text" data-bind="summary" placeholder="Repaint lounge and hall"></label></div>';
    html += '<div class="card"><div class="row between"><h2>Rooms</h2><div class="row"><button class="btn sm" data-add="interior">+ Room</button><button class="btn ghost sm" data-add="exterior">+ Exterior</button></div></div>';
    if (!job.rooms.length) html += '<p class="muted">Add a room.</p>';
    html += job.rooms.map(function (r) {
      var q = QCPricing.roomQuantities(r, S.rules), walls = q.lines.filter(function (l) { return l.key === 'p_walls'; })[0];
      var how = r.type === 'exterior' ? 'exterior' : r.method === 'measured' ? (r.walls.length + ' wall' + (r.walls.length === 1 ? '' : 's') + ' measured') : (r.L && r.W ? r.L + ' × ' + r.W + ' m typed' : 'no sizes yet');
      return '<a class="job" href="#/job/' + job.id + '/room/' + r.id + '"><div><b>' + esc(r.name || (r.type === 'exterior' ? 'Exterior' : 'Room')) + '</b><span class="sub">' + esc(how) + (walls ? ' · ' + walls.qty + ' m² of wall' : '') + '</span></div><div><span class="pill ' + (q.source === 'measured' ? 'ok' : '') + '">' + (q.source === 'measured' ? 'measured' : 'estimate') + '</span></div></a>';
    }).join('') + '</div>';
    html += '<div class="card"><div class="row between"><h2>Extras</h2><button class="btn ghost sm" id="addextra">+ Line</button></div><p class="hint">Items not covered by rooms. Tick confirm if the price is a guess.</p><div id="extras"></div>' +
      '<div class="g2"><label class="f">Travel<span id="travelnote">' + esc(priced.travel && priced.travel.note ? priced.travel.note : 'Put the postcode in the job address and travel works itself out from ' + (S.details.postcode || 'your postcode') + '.') + '</span><input type="number" data-bind="travel_km" data-refresh="1" min="0" placeholder="km one way" aria-label="Travel km one way, optional"></label><label class="f">Premium paint<span>adds ' + esc(S.rules.premium_paint_pct) + '%</span><select data-bind="premium_paint" data-refresh="1"><option value="">No</option><option value="1">Yes</option></select></label></div></div>';
    html += '<div class="card"><div class="row between"><div><span class="hint">Running total' + (S.details.gst ? ' inc GST' : '') + '</span><h2 id="runtotal">' + money(priced.total) + '</h2></div><a class="btn tape" href="#/job/' + job.id + '/quote">' + (job.quote ? 'Open the quote' : 'Build the quote') + '</a></div>' + (priced.confirm.length ? '<p class="confirm">' + priced.confirm.length + ' line' + (priced.confirm.length > 1 ? 's' : '') + ' to confirm</p>' : '') + '<p class="hint" id="costline">' + costLine(priced) + '</p></div>';
    if (job.booking) html += '<div class="card"><div class="row between"><div><b>Booked</b><span class="hint"> ' + QCPdf.fmtDate(job.booking.start) + ' to ' + QCPdf.fmtDate(job.booking.end_inclusive || job.booking.start) + '</span></div><button class="btn ghost sm" id="rebook">Change</button></div></div>';
    html += '<div class="row between"><label class="f" style="flex:1">Private notes<textarea data-bind="notes" rows="2"></textarea></label></div><div class="row"><button class="btn danger sm" id="deljob">Delete job</button></div>';
    $app.innerHTML = html;
    // premium_paint select binding stores '1' or '' strings; normalise
    bindAll($app, job);
    var sel = $app.querySelector('[data-bind="premium_paint"]'); sel.value = job.premium_paint ? '1' : ''; sel.addEventListener('change', function () { job.premium_paint = sel.value === '1'; save(); refreshPreview(); });
    refreshPreview = function () { var p = QCPricing.priceJob(job, S); document.getElementById('runtotal').textContent = money(p.total); var tn = document.getElementById('travelnote'); if (tn) tn.textContent = p.travel && p.travel.note ? p.travel.note : 'Put the postcode in the job address and travel works itself out.'; var cl = document.getElementById('costline'); if (cl) cl.innerHTML = costLine(p); };
    var rb = document.getElementById('rebook'); if (rb) rb.addEventListener('click', function () { job.booking = null; save(); go('/job/' + job.id + '/quote'); });
    $app.querySelectorAll('[data-add]').forEach(function (b) { b.addEventListener('click', once(function () { var r = QCStore.newRoom(b.dataset.add); job.rooms.push(r); save(); go('/job/' + job.id + '/room/' + r.id); })); });
    function renderExtras() {
      var box = document.getElementById('extras'); box.innerHTML = job.extras.map(function (x, i) {
        return '<div class="row" data-x="' + i + '" style="border-top:1px solid var(--line);padding-top:8px"><input type="text" placeholder="Description" aria-label="Extra description" data-xk="desc" style="flex:2 1 12em" value="' + esc(x.desc) + '"><input type="number" placeholder="Qty" aria-label="Quantity" data-xk="qty" style="flex:1 1 4em" value="' + esc(x.qty) + '"><input type="text" placeholder="unit" aria-label="Unit" data-xk="unit" style="flex:1 1 4em" value="' + esc(x.unit) + '"><input type="number" placeholder="Rate $" aria-label="Rate" data-xk="rate" style="flex:1 1 5em" value="' + esc(x.rate) + '"><label class="hint"><input type="checkbox" data-xk="confirm" ' + (x.confirm ? 'checked' : '') + '> confirm</label><button class="btn ghost sm" data-xdel="' + i + '">remove</button></div>';
      }).join('');
      box.querySelectorAll('[data-x]').forEach(function (row) { var i = +row.dataset.x; row.querySelectorAll('[data-xk]').forEach(function (el) { el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () { job.extras[i][el.dataset.xk] = el.type === 'checkbox' ? el.checked : el.value; save(); refreshPreview(); }); }); });
      box.querySelectorAll('[data-xdel]').forEach(function (b) { b.addEventListener('click', function () { job.extras.splice(+b.dataset.xdel, 1); save(); renderExtras(); refreshPreview(); }); });
    }
    renderExtras();
    document.getElementById('addextra').addEventListener('click', function () { job.extras.push({ desc: '', qty: 1, unit: 'each', rate: '', confirm: false }); save(); renderExtras(); });
    document.getElementById('deljob').addEventListener('click', function () { if (confirm('Delete this job and everything in it?')) { QCStore.deleteJob(job.id); checkStore(); go('/'); } });
  }

  // ---------- Room
  function viewRoom(job, rid) {
    var room = job.rooms.filter(function (r) { return r.id === rid; })[0]; if (!room) return bounce('/job/' + job.id);
    var ext = room.type === 'exterior';
    var html = '<a class="hint" href="#/job/' + job.id + '">&larr; ' + esc(job.quote_no) + '</a><h1>' + (ext ? 'Exterior' : 'Room') + '</h1>';
    html += '<div class="card"><label class="f">Name<input type="text" data-bind="name" placeholder="' + (ext ? 'Front and side weatherboards' : 'Lounge') + '"></label>';
    if (ext) {
      html += '<p class="hint">Leave blank what you are not doing.</p><div class="g2">' +
        [['weatherboard', 'Weatherboards m²'], ['render', 'Render or brick m²'], ['eaves', 'Eaves and fascia lm'], ['gutters', 'Gutters and downpipes lm'], ['ext_door', 'Exterior doors'], ['ext_window', 'Exterior windows'], ['deck', 'Deck oil m²'], ['fence', 'Fence m²'], ['pressure', 'Pressure wash m²'], ['scaffold', 'Scaffold days']].map(function (f) { return '<label class="f">' + f[1] + '<input type="number" min="0" step="0.5" data-bind="ext.' + f[0] + '" data-refresh="1"></label>'; }).join('') + '</div></div>';
    } else {
      html += '<div class="row"><button class="btn sm ' + (room.method !== 'measured' ? 'tape' : 'ghost') + '" data-method="typed">Type sizes</button><button class="btn sm ' + (room.method === 'measured' ? 'tape' : 'ghost') + '" data-method="measured">Measure from photo</button></div>';
      html += '<div id="typed" ' + (room.method === 'measured' ? 'hidden' : '') + '><div class="g3"><label class="f">Length m<input type="number" step="0.1" min="0" data-bind="L" data-refresh="1"></label><label class="f">Width m<input type="number" step="0.1" min="0" data-bind="W" data-refresh="1"></label><label class="f">Height m<span>blank = ' + esc(S.rules.ceiling_height_m) + '</span><input type="number" step="0.1" min="0" data-bind="H" data-refresh="1"></label></div><p class="hint">Typed sizes give an estimate. Measure from a photo for exact.</p></div>';
      html += '<div id="measured" ' + (room.method === 'measured' ? '' : 'hidden') + '><div id="walls"></div><div id="measure-mount"></div><label class="f" style="margin-top:8px">Ceiling m²<span>blank = length × width</span><input type="number" step="0.1" min="0" data-bind="ceiling_m2" data-refresh="1"></label></div>';
      html += '</div><div class="card"><h3>Surfaces</h3><div class="row">' +
        [['walls', 'Walls'], ['ceiling', 'Ceiling'], ['skirting', 'Skirting and architraves']].map(function (f) { return '<label class="btn ghost sm"><input type="checkbox" data-bind="surfaces.' + f[0] + '" data-refresh="1"> ' + f[1] + '</label>'; }).join('') + '</div>' +
        '<div class="g2"><label class="f">Doors, both sides<input type="number" min="0" data-bind="doors" data-refresh="1"></label><label class="f">Doors, one side only<input type="number" min="0" data-bind="doors_one_side" data-refresh="1"></label><label class="f">Windows<input type="number" min="0" data-bind="windows" data-refresh="1"></label><label class="f">Wardrobe door pairs<input type="number" min="0" data-bind="wardrobe_pairs" data-refresh="1"></label><label class="f">Feature wall m²<input type="number" min="0" step="0.5" data-bind="feature_m2" data-refresh="1"></label><label class="f">Wallpaper to remove m²<input type="number" min="0" step="0.5" data-bind="wallpaper_m2" data-refresh="1"></label></div>' +
        '<label class="f">Wall condition<span>fair = scuffs, poor = peeling</span><select data-bind="condition" data-refresh="1"><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option></select></label></div>';
    }
    html += '<div class="card"><h3>' + (ext ? 'Area' : 'Room') + ' total</h3><div id="preview"></div></div><div class="row between"><div class="row">' + (job.quick ? '<a class="btn tape" href="#/job/' + job.id + '/quote">Done, build the quote</a><a class="btn ghost" href="#/job/' + job.id + '">Job details</a>' : '<a class="btn tape" href="#/job/' + job.id + '">Done</a>') + '</div><button class="btn danger sm" id="delroom">Remove ' + (ext ? 'area' : 'room') + '</button></div>';
    $app.innerHTML = html;
    bindAll($app, room);
    refreshPreview = function () {
      var q = QCPricing.roomQuantities(room, S.rules), box = document.getElementById('preview');
      if (!q.lines.length) { box.innerHTML = '<p class="muted">Nothing yet. ' + (ext ? 'Enter quantities.' : 'Type the sizes or measure a wall.') + '</p>'; return; }
      var tot = 0;
      box.innerHTML = '<table>' + q.lines.map(function (l) { var lab = QCPricing.label(S.prices, l.key), rate = S.prices[l.key], amt = rate == null || rate === '' ? null : Math.round(l.qty * n(rate)); if (amt != null) tot += amt; return '<tr><td>' + esc(lab.label) + '<br><span class="hint">' + esc(l.source) + '</span></td><td class="n">' + l.qty + ' ' + esc(lab.unit) + '</td><td class="n">' + (amt == null ? '<span class="confirm">no rate</span>' : money(amt)) + '</td></tr>'; }).join('') + '<tr class="total"><td colspan="2">Room subtotal ex GST</td><td class="n">' + money(tot) + '</td></tr></table>' + (q.assumptions.length ? '<p class="hint">' + q.assumptions.map(esc).join('<br>') + '</p>' : '');
    };
    refreshPreview();
    $app.querySelectorAll('[data-method]').forEach(function (b) { b.addEventListener('click', function () { room.method = b.dataset.method; save(); viewRoom(job, rid); }); });
    if (!ext) {
      function renderWalls() {
        var box = document.getElementById('walls');
        box.innerHTML = room.walls.length ? '<table><thead><tr><th>Wall</th><th class="n">W × H m</th><th class="n">Openings</th><th class="n">Paint m²</th><th></th></tr></thead><tbody>' + room.walls.map(function (w, i) { return '<tr><td>' + esc(w.wall) + '<br><span class="hint">' + (w.method === 'roomplan-lidar' ? 'LiDAR' : '±' + w.expected_error_pct + '%') + '</span></td><td class="n">' + (w.width_mm / 1000).toFixed(2) + ' × ' + (w.height_mm / 1000).toFixed(2) + '</td><td class="n">' + w.openings.length + '</td><td class="n">' + w.paint_area_m2.toFixed(2) + '</td><td class="n"><button class="btn ghost sm" data-wdel="' + i + '">remove</button></td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">Stick an A4 sheet on the wall and take a photo.</p>';
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
      var imp = document.createElement('div'); imp.className = 'row'; imp.innerHTML = '<label class="btn ghost sm">Import a LiDAR scan (RoomPlan JSON)<input type="file" accept=".json,application/json" id="lidar"></label>';
      document.getElementById('measured').appendChild(imp);
      document.getElementById('lidar').addEventListener('change', function () {
        var f = this.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { try { var added = importRoomPlan(JSON.parse(fr.result), room); if (added) { room.method = 'measured'; save(); renderWalls(); refreshPreview(); toast(added + ' wall' + (added === 1 ? '' : 's') + ' imported'); } else toast('No usable walls in that file.'); } catch (e) { toast('That file is not a RoomPlan export.'); } }; fr.readAsText(f); this.value = '';
      });
    }
    document.getElementById('delroom').addEventListener('click', function () { if (confirm('Remove this ' + (ext ? 'area' : 'room') + '?')) { job.rooms = job.rooms.filter(function (r) { return r.id !== rid; }); save(); go('/job/' + job.id); } });
  }
  function importRoomPlan(data, room) {
    var rooms = (data.rooms && data.rooms[0] && data.rooms[0].walls) ? data.rooms : [data]; var added = 0;
    rooms.forEach(function (r) {
      var walls = r.walls || [], opens = [].concat(r.doors || [], r.windows || []);
      function dims(s) { var d = s.dimensions || [0, 0, 0]; if (!Array.isArray(d)) d = [d.x, d.y, d.z]; return d.map(Number); }
      function pos(s) { var t = s.transform; if (Array.isArray(t) && t.length === 16) return [t[12], t[13], t[14]]; return null; }
      walls.forEach(function (w) {
        if (w.width_mm > 0 && w.height_mm > 0) { // already in Quote & Chase measurements.json form
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

  // ---------- Quote
  function viewQuote(job) {
    var priced = QCPricing.priceJob(job, S), det = S.details;
    var html = '<a class="hint" href="#/job/' + job.id + '">&larr; Edit job</a><div class="row between"><h1>Quote ' + esc(job.quote_no) + '</h1>' + statusPill(job) + '</div>';
    if (job.quote && job.sent_date && Math.abs(priced.total - job.quote.total) >= 1) html += '<div class="card"><p class="confirm">The quote sent on ' + QCPdf.fmtDate(job.sent_date) + ' was ' + money(job.quote.total) + '. With the changes since, it comes to ' + money(priced.total) + '. Send again to update the client.</p></div>';
    if (!det.trading_name || !det.bsb) html += '<div class="card"><p class="confirm">Business name or bank details missing. <a href="#/settings">Fill in</a></p></div>';
    if (priced.confirm.length) html += '<div class="card"><p class="confirm">Lines to confirm before sending:</p><ul class="hint">' + priced.confirm.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div>';
    if (!job.client.name || !job.client.phone) html += '<div class="card"><h3>Client</h3><div class="g2"><label class="f">Name<input type="text" data-bind="client.name"></label><label class="f">Mobile<input type="tel" data-bind="client.phone"></label></div><label class="f">Job address<span>include postcode</span><input type="text" data-bind="client.address" data-refresh="1"></label><label class="f">Description<input type="text" data-bind="summary" placeholder="Repaint lounge and hall"></label></div>';
    html += '<div class="card"><table><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Amount</th></tr></thead><tbody>' + priced.lines.map(function (l) { return '<tr><td>' + (l.room !== 'Extras' && l.room !== 'Travel' ? '<span class="tag">' + esc(l.room) + '</span><br>' : '') + esc(l.desc) + (l.confirm ? ' <span class="confirm">TO CONFIRM</span>' : '') + '<br><span class="hint">' + esc(l.source) + ' · ' + rateFmt(l.rate) + '/' + esc(l.unit) + '</span></td><td class="n">' + l.qty + ' ' + esc(l.unit) + '</td><td class="n">' + money(l.amount) + '</td></tr>'; }).join('') + '</tbody><tfoot>' +
      '<tr class="sub"><td colspan="2" class="n">Subtotal' + (priced.minimum_applied ? ' (minimum job)' : '') + '</td><td class="n">' + money(priced.subtotal) + '</td></tr>' + (priced.gst ? '<tr class="sub"><td colspan="2" class="n">GST 10%</td><td class="n">' + money(priced.gst) + '</td></tr>' : '') + '<tr class="total"><td colspan="2" class="n">Total' + (priced.gst ? ' inc GST' : '') + '</td><td class="n">' + money(priced.total) + '</td></tr></tfoot></table>';
    html += '<p class="hint">' + (priced.measured_rooms ? priced.measured_rooms + ' of ' + priced.total_rooms + ' rooms measured from photos. ' : (priced.total_rooms ? 'Estimate from typed sizes. ' : '')) + (priced.deposit > 0 ? 'Deposit ' + QCPricing.depositPct(S) + '%: ' + money(priced.deposit) + '.' : 'No deposit.') + '</p>';
    if (priced.assumptions.length) html += '<div><b style="font-size:.9rem">Based on</b><ul class="hint">' + priced.assumptions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>';
    html += '</div>';
    if (priced.cost && priced.lines.length) html += '<div class="card"><b style="font-size:.9rem">For your eyes: ' + priced.cost.hours.toFixed(1) + ' hours (' + priced.cost.days.toFixed(1) + ' days), ' + Object.keys(priced.cost.litres).map(function (k) { var t = priced.cost.tins && priced.cost.tins[k]; return priced.cost.litres[k].toFixed(1) + ' L ' + k + (t && t.label ? ' (' + t.label + ')' : ''); }).join(', ') + '</b><p class="hint">Labour ' + money(priced.cost.labour) + ', paint ' + money(priced.cost.paint) + (priced.cost.tins && S.costing.charge_tins !== false ? ' in tins' : '') + (priced.cost.other ? ', other ' + money(priced.cost.other) : '') + ' = cost ' + money(priced.cost.cost) + '. Margin ' + money(priced.cost.margin) + ' (' + priced.cost.margin_pct + '%). Not on the client PDF.</p></div>';
    var autoSend = (QCMsg.ready('email') && job.client.email && S.sending.email_quotes !== false), autoFu = (S.sending.auto_sms && QCMsg.ready('sms') && job.client.phone) || (S.sending.auto_email && QCMsg.ready('email') && job.client.email);
    html += '<div class="card"><div class="row"><button class="btn tape" id="pdf">' + (job.sent_date ? 'Send again' : 'Send quote') + '</button><button class="btn ghost" id="sharetext">Share summary</button></div><p class="hint">' + (autoSend ? 'Emails the PDF to ' + esc(job.client.email) + '. ' : 'Makes the PDF and opens the share sheet. ') + (autoFu ? 'Follow-up ' + (S.sending.auto_sms && QCMsg.ready('sms') && job.client.phone ? 'texts' : 'emails') + ' sent automatically at ' : 'Follow-ups go in your calendar at ') + (S.follow_up.quote_days || []).join(', ') + ' days.</p>' +
      '<div class="row" id="afterSend" ' + (job.sent_date ? '' : 'hidden') + '>' + ((QCMsg.ready('sms') && job.client.phone) || (QCMsg.ready('email') && job.client.email) ? '<button class="btn sm" id="autofu">Schedule follow-ups (' + (QCMsg.ready('sms') && S.sending.auto_sms && job.client.phone ? 'SMS' : 'email') + ')</button>' : (QCMsg.ready('sms') || QCMsg.ready('email') ? '<span class="hint">Add a mobile or email to schedule follow-ups.</span>' : '')) + '<button class="btn ghost sm" id="remind">Calendar reminders</button></div>' +
      (QCMsg.ready('email') && job.client.email ? '<div class="row"><button class="btn sm" id="emailq">Email to ' + esc(job.client.email) + (job.emailed_date ? ' again' : '') + '</button></div>' : '') +
      (job.follow_up_error ? '<p class="confirm">' + esc(job.follow_up_error) + '</p>' : '') + (pendingFollowUps(job).length ? '<p class="hint">Scheduled: ' + pendingFollowUps(job).map(function (x) { return QCPdf.fmtDate(x.day) + ' by ' + esc(x.channel); }).join(', ') + '. Cancelled when the quote is accepted or declined.</p>' : '') +
      '<div class="row">' + (job.status === 'draft' || job.status === 'quoted' ? '<button class="btn sm" id="accepted">Accepted</button><button class="btn ghost sm" id="declined">Declined</button>' : '') + (job.status === 'accepted' || job.status === 'invoiced' || job.status === 'paid' ? '<a class="btn sm" href="#/job/' + job.id + '/invoice">Invoice</a>' + (job.booking ? '' : '<button class="btn tape sm" id="book">Book</button>') : '') + '</div>' +
      (job.booking ? '<p class="hint">Booked ' + QCPdf.fmtDate(job.booking.start) + (job.booking.days > 1 ? ' for ' + job.booking.days + ' days' : '') + '. <a href="' + esc(job.booking.gcal) + '" target="_blank" rel="noopener">Google Calendar</a> <button class="btn ghost sm" id="rebook2">Change</button></p>' : '') +
      '<div id="bookbox" class="scalebox" hidden><b>Book</b><div class="g3"><label class="f">Start<input type="date" id="bk_start"></label><label class="f">Days<input type="number" id="bk_days" min="1" value="' + Math.max(1, Math.ceil((priced.cost ? priced.cost.days : 1) - 0.2)) + '"></label><label class="f">Start time<span>hour</span><input type="number" id="bk_hour" min="5" max="12" value="' + esc(S.booking.start_hour) + '"></label></div><div class="row"><button class="btn tape sm" id="bk_go">Add to calendar</button><span class="hint">Android: use the Google Calendar link.</span></div></div></div>';
    if (job.quote) html += '<p class="hint">Quote dated ' + QCPdf.fmtDate(job.quote.date) + (job.sent_date ? ', sent ' + QCPdf.fmtDate(job.sent_date) : '') + '.</p>';
    $app.innerHTML = html; bindAll($app, job);
    refreshPreview = function () { viewQuote(job); };
    function freeze() { var d = QCStore.today(); job.quote = { date: job.quote && job.quote.date ? job.quote.date : d, lines: priced.lines, subtotal: priced.subtotal, gst: priced.gst, total: priced.total, deposit: priced.deposit, assumptions: priced.assumptions, measured_rooms: priced.measured_rooms, total_rooms: priced.total_rooms }; if (job.status === 'draft') job.status = 'quoted'; if (!job.sent_date) job.sent_date = d; save(); }
    document.getElementById('pdf').addEventListener('click', function () {
      freeze(); var shareIt = function () { try { var d = QCPdf.quotePDF(job, S, priced); return QCPdf.deliver(d, job.quote_no + ' ' + (job.client.name || 'quote').replace(/[^\w ]+/g, '') + '.pdf').then(function (how) { toast(how === 'shared' ? 'Sent.' : 'PDF saved to your downloads'); }); } catch (e) { toast('PDF failed: ' + e.message); return Promise.resolve(); } };
      // with a relay and a client email, Send means send: it emails the PDF; the share sheet is the fallback
      var first = autoSend ? emailQuoteNow(job, priced).then(function (sent) { if (sent) { toast('Emailed to ' + job.client.email); return true; } return shareIt(); }) : shareIt();
      first.then(function () { if ((QCMsg.ready('sms') || QCMsg.ready('email')) && !pendingFollowUps(job).length) return scheduleFollowUps(job, 'quote'); }).then(function () { viewQuote(job); });
    });
    var rem = document.getElementById('remind'); if (rem) rem.addEventListener('click', function () { followUpIcs(job, 'quote'); });
    var afu = document.getElementById('autofu'); if (afu) afu.addEventListener('click', function () { freeze(); afu.disabled = true; scheduleFollowUps(job, 'quote').then(function () { viewQuote(job); }); });
    var eq = document.getElementById('emailq'); if (eq) eq.addEventListener('click', function () { freeze(); eq.disabled = true; emailQuoteNow(job, priced).then(function (sent) { if (sent && S.sending.auto_sms !== false && !pendingFollowUps(job).length) return scheduleFollowUps(job, 'quote'); }).then(function () { viewQuote(job); }); });
    var bk = document.getElementById('book'); if (bk) bk.addEventListener('click', function () { var box = document.getElementById('bookbox'); box.hidden = false; document.getElementById('bk_start').value = QCStore.addDays(QCStore.today(), 7); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    var rb2 = document.getElementById('rebook2'); if (rb2) rb2.addEventListener('click', function () { job.booking = null; save(); viewQuote(job); });
    var bg = document.getElementById('bk_go'); if (bg) bg.addEventListener('click', function () { var start = document.getElementById('bk_start').value, days = Math.max(1, parseInt(document.getElementById('bk_days').value, 10) || 1), hour = parseInt(document.getElementById('bk_hour').value, 10) || 7; if (!start) { toast('Pick a start date'); return; } bookJob(job, start, days, hour); });
    document.getElementById('sharetext').addEventListener('click', function () {
      freeze(); var t = 'Quote ' + job.quote_no + ' for ' + (job.client.name || '') + (job.summary ? ': ' + job.summary : '') + '\nTotal ' + money(priced.total) + (priced.gst ? ' inc GST' : '') + '. Deposit ' + money(priced.deposit) + ' to book.\nValid ' + det.quote_valid_days + ' days. PDF attached.\n' + det.sign_off + (det.owner_name ? ', ' + det.owner_name : '');
      if (navigator.share) navigator.share({ text: t }).catch(function () {}); else { navigator.clipboard && navigator.clipboard.writeText(t); toast('Copied'); }
    });
    var acc = document.getElementById('accepted'); if (acc) acc.addEventListener('click', function () { freeze(); job.status = 'accepted'; save(); toast('Accepted'); cancelQuoteFollowUps(job).then(function () { viewQuote(job); }); });
    var dec = document.getElementById('declined'); if (dec) dec.addEventListener('click', function () { job.status = 'declined'; save(); cancelQuoteFollowUps(job).then(function () { viewQuote(job); }); });
  }

  // ---------- Invoice
  function viewInvoice(job) {
    if (!job.quote) return bounce('/job/' + job.id + '/quote');
    if (job.status === 'declined') { toast('Quote is declined. Mark accepted first.'); return bounce('/job/' + job.id + '/quote'); }
    var det = S.details, q = job.quote, gstOn = !!det.gst, depPct = QCPricing.depositPct(S);
    var hasDeposit = job.invoices.some(function (i) { return i.kind === 'deposit'; }), unpaidDeposit = job.invoices.some(function (i) { return i.kind === 'deposit' && !i.paid_date; }), hasFull = job.invoices.some(function (i) { return i.kind === 'full' || i.kind === 'final'; });
    var depositPaid = job.invoices.filter(function (i) { return i.kind === 'deposit'; }).reduce(function (s, i) { return s + i.total; }, 0); // every deposit invoiced, paid or not, so the invoices always add up to the quote
    var html = '<a class="hint" href="#/job/' + job.id + '/quote">&larr; Quote</a><h1>Invoice</h1>';
    if (job.invoices.length) html += '<div class="card"><h3>Invoices</h3><table>' + job.invoices.map(function (i, k) { return '<tr><td>' + esc(i.no) + '<br><span class="hint">' + esc(i.kind) + ', due ' + QCPdf.fmtDate(i.due) + (i.pay_url && /^https:\/\//.test(i.pay_url) ? ' · <a href="' + esc(i.pay_url) + '" target="_blank" rel="noopener">card link</a>' : '') + (i.paid_by === 'card' ? ' · paid by card' : '') + (i.emailed_date ? ' · emailed' : '') + (i.follow_up_error ? ' · <span class="confirm">reminders not scheduled: ' + esc(i.follow_up_error) + '</span>' : '') + (function (fl) { return fl.length ? ' · ' + fl.length + ' reminder' + (fl.length > 1 ? 's' : '') + ' pending' : ''; })((i.follow_ups || []).filter(function (x) { return x.id && !x.cancelled && x.day >= QCStore.today(); })) + '</span></td><td class="n">' + money(i.total) + '</td><td class="n">' + (i.paid_date ? '<span class="pill ok">paid</span>' : '<button class="btn sm" data-paid="' + k + '">Mark paid</button> <button class="btn ghost sm" data-repdf="' + k + '">PDF</button>') + '</td></tr>'; }).join('') + '</table></div>';
    var kinds = []; if (depPct > 0 && !hasDeposit && !hasFull) kinds.push(['deposit', 'Deposit, ' + depPct + '% of the quote']); if (!hasFull) { if (hasDeposit) kinds.push(['final', 'Final, balance after deposit plus variations']); else kinds.push(['full', 'Full amount in one invoice']); if (hasDeposit && depPct > 0) {} else if (!hasDeposit) kinds.push(['final', 'Final with variations (no deposit taken)']); }
    if (!kinds.length) html += '<div class="card"><p class="muted">Fully invoiced.</p></div>';
    else html += '<div class="card">' + (unpaidDeposit ? '<p class="confirm">Deposit invoice unpaid. The final still deducts it.</p>' : '') + '<label class="f">What to invoice<select id="kind">' + kinds.map(function (k) { return '<option value="' + k[0] + '">' + esc(k[1]) + '</option>'; }).join('') + '</select></label>' +
      '<div id="vars" hidden><b style="font-size:.9rem">Variations agreed in writing</b><div id="varlist"></div><button class="btn ghost sm" id="addvar">+ Variation</button></div>' +
      '<div id="invprev"></div><div class="row"><button class="btn tape" id="mkinv">Send invoice</button>' + (S.stripe && S.stripe.enabled ? (QCStripe.keyLooksRight(S.stripe.key) ? '<span class="hint">A card payment link goes on it.</span>' : '<span class="confirm">Stripe key not valid. Fix in Set-up.</span>') : '') + '</div></div>';
    html += (job.invoices.length ? '<div class="row">' + (S.stripe && S.stripe.enabled ? '<button class="btn sm" id="checkpay">Check payments</button>' : '') + '<button class="btn ghost sm" id="invremind">Calendar reminders</button></div>' : '');
    $app.innerHTML = html;
    var vars = [];
    function build() {
      var kind = document.getElementById('kind').value, lines = [], subtotal, gst, total, kindLine;
      var toEx = function (inc) { return gstOn ? Math.round(inc / 1.1) : inc; };
      if (kind === 'deposit') { total = Math.round(q.total * depPct / 100); subtotal = toEx(total); gst = total - subtotal; lines = [{ desc: 'Deposit, ' + depPct + '% of quote ' + job.quote_no + ' (' + money(q.total) + ')', amount: subtotal }]; kindLine = 'Deposit to confirm the booking.'; }
      else if (kind === 'full') { lines = q.lines.map(function (l) { return { desc: (l.room && l.room !== 'Extras' && l.room !== 'Travel' ? l.room + ': ' : '') + l.desc, amount: l.amount }; }); subtotal = q.subtotal; gst = q.gst; total = q.total; kindLine = 'Work completed as quoted in ' + job.quote_no + '.'; }
      else { lines = [{ desc: 'Work as quoted in ' + job.quote_no, amount: q.subtotal }]; var varEx = 0; vars.forEach(function (v) { if (v.desc || v.amount) { var a = Math.round(n(v.amount)); varEx += a; lines.push({ desc: 'Variation: ' + (v.desc || ''), amount: a }); } });
        // work inc GST so that deposit + final equals the quote to the dollar
        var varInc = gstOn ? Math.round(varEx * 1.1) : varEx; total = q.total + varInc - depositPaid; gst = gstOn ? total - Math.round(total / 1.1) : 0; subtotal = total - gst;
        if (depositPaid) lines.push({ desc: 'Less deposit ' + (unpaidDeposit ? 'invoiced, still owing' : 'paid') + ' (' + money(depositPaid) + ' inc GST)', amount: subtotal - (q.subtotal + varEx) }); kindLine = 'Final invoice on completion' + (vars.length ? ', including agreed variations' : '') + '.'; }
      return { kind: kind, lines: lines, subtotal: subtotal, gst: gst, total: total, kind_line: kindLine };
    }
    function preview() { if (!document.getElementById('kind')) return; var inv = build(); document.getElementById('vars').hidden = inv.kind !== 'final'; document.getElementById('invprev').innerHTML = '<table>' + inv.lines.map(function (l) { return '<tr><td>' + esc(l.desc) + '</td><td class="n">' + money(l.amount) + '</td></tr>'; }).join('') + '<tr class="sub"><td class="n">Subtotal</td><td class="n">' + money(inv.subtotal) + '</td></tr>' + (inv.gst ? '<tr class="sub"><td class="n">GST 10%</td><td class="n">' + money(inv.gst) + '</td></tr>' : '') + '<tr class="total"><td class="n">Total</td><td class="n">' + money(inv.total) + '</td></tr></table><p class="hint">Due ' + QCPdf.fmtDate(QCStore.addDays(QCStore.today(), inv.kind === 'deposit' ? 0 : parseInt(det.balance_days, 10) || 7)) + '.</p>'; }
    function renderVars() { var box = document.getElementById('varlist'); box.innerHTML = vars.map(function (v, i) { return '<div class="row" data-v="' + i + '"><input type="text" placeholder="Variation" aria-label="Variation description" style="flex:2 1 10em" value="' + esc(v.desc) + '"><input type="number" placeholder="$ ex GST" aria-label="Variation amount" style="flex:1 1 6em" value="' + esc(v.amount) + '"></div>'; }).join(''); box.querySelectorAll('[data-v]').forEach(function (row) { var i = +row.dataset.v, ins = row.querySelectorAll('input'); ins[0].addEventListener('input', function () { vars[i].desc = ins[0].value; preview(); }); ins[1].addEventListener('input', function () { vars[i].amount = ins[1].value; preview(); }); }); }
    var kindEl = document.getElementById('kind'); if (kindEl) { kindEl.addEventListener('change', preview); document.getElementById('addvar').addEventListener('click', function () { vars.push({ desc: '', amount: '' }); renderVars(); preview(); }); preview(); }
    var mk = document.getElementById('mkinv'); if (mk) mk.addEventListener('click', function () {
      var inv = build(); if (!(inv.total > 0)) { toast('Invoice total ' + money(inv.total) + '. Check variations.'); return; } if (inv.total > q.total * 3) { toast('More than 3× the quote. Check variations.'); return; } inv.no = QCStore.nextInvoiceNo(); inv.date = QCStore.today(); inv.due = QCStore.addDays(inv.date, inv.kind === 'deposit' ? 0 : parseInt(det.balance_days, 10) || 7); inv.paid_date = '';
      job.invoices.push(inv); job.status = 'invoiced'; save();
      var send = function () { try { QCPdf.deliver(QCPdf.invoicePDF(job, inv, S), inv.no + ' ' + (job.client.name || 'invoice').replace(/[^\w ]+/g, '') + '.pdf').then(function (how) { toast(how === 'shared' ? 'Sent' : 'PDF saved to your downloads'); viewInvoice(job); }); } catch (e) { toast('PDF failed: ' + e.message); } };
      var after = function () { var p1 = (QCMsg.ready('email') && job.client.email && S.sending.email_quotes !== false) ? emailInvoiceNow(job, inv) : Promise.resolve(false); return p1.then(function () { if (QCMsg.ready('sms') || QCMsg.ready('email')) return scheduleFollowUps(job, 'invoice'); }).then(function () { send(); }); };
      if (S.stripe && S.stripe.enabled && QCStripe.keyLooksRight(S.stripe.key)) { toast('Creating card payment link'); QCStripe.createPaymentLink(S.stripe.key, { amount: inv.total, name: (S.details.trading_name || 'Invoice') + ' ' + inv.no + (job.client.name ? ' for ' + job.client.name : ''), invoiceNo: inv.no, jobId: job.id }).then(function (l) { inv.pay_url = l.url; inv.pay_link_id = l.id; save(); after(); }).catch(function (e) { toast('Card link failed: ' + e.message + '. Invoice sent without it.'); after(); }); } else after();
    });
    var chk = document.getElementById('checkpay'); if (chk) chk.addEventListener('click', function () { var pend = job.invoices.filter(function (i) { return !i.paid_date && i.pay_link_id; }); if (!pend.length) { toast('No card links to check'); return; } toast('Checking'); Promise.all(pend.map(function (i) { return QCStripe.checkPaid(S.stripe.key, i.pay_link_id).then(function (r) { if (r.paid) { i.paid_date = r.when || QCStore.today(); i.paid_by = 'card'; return cancelInvoiceFollowUps(i).then(function () { return true; }); } return r.paid; }); })).then(function (rs) { var np = rs.filter(Boolean).length; if (job.invoices.every(function (x) { return x.paid_date; }) && job.invoices.some(function (x) { return x.kind !== 'deposit'; })) job.status = 'paid'; save(); toast(np ? np + ' paid by card' : 'Nothing paid yet'); viewInvoice(job); }).catch(function (e) { toast('Stripe: ' + e.message); }); });
    var irem = document.getElementById('invremind'); if (irem) irem.addEventListener('click', function () { followUpIcs(job, 'invoice'); });
    $app.querySelectorAll('[data-paid]').forEach(function (b) { b.addEventListener('click', function () { var i = job.invoices[+b.dataset.paid]; i.paid_date = QCStore.today(); if (job.invoices.every(function (x) { return x.paid_date; }) && (i.kind === 'final' || i.kind === 'full')) job.status = 'paid'; save(); toast('Marked paid'); cancelInvoiceFollowUps(i).then(function () { viewInvoice(job); }); }); });
    $app.querySelectorAll('[data-repdf]').forEach(function (b) { b.addEventListener('click', function () { var i = job.invoices[+b.dataset.repdf]; QCPdf.deliver(QCPdf.invoicePDF(job, i, S), i.no + '.pdf'); }); });
  }

  // ---------- helpers: real sending through the relay
  function quoteEmailText(job, priced) { var det = S.details, f = first(job.client.name); return 'Hi ' + f + ',\n\nQuote ' + job.quote_no + ' is attached: ' + money(priced.total) + (priced.gst ? ' inc GST' : '') + (job.summary ? ' for ' + job.summary : '') + '. Valid ' + det.quote_valid_days + ' days.\n\n' + S.wording.accept + '\n\n' + det.sign_off + (det.owner_name ? ', ' + det.owner_name : '') + (det.trading_name ? '\n' + det.trading_name : '') + (det.phone ? ' · ' + det.phone : ''); }
  function emailQuoteNow(job, priced) {
    if (!job.client.email) { toast('No client email on the job'); return Promise.resolve(false); }
    var doc = QCPdf.quotePDF(job, S, priced);
    return QCMsg.call({ action: 'send', channel: 'email', to: job.client.email, subject: 'Quote ' + job.quote_no + (S.details.trading_name ? ' from ' + S.details.trading_name : ''), body: quoteEmailText(job, priced), reply_to: S.details.email || undefined, attachments: [{ filename: job.quote_no + '.pdf', content: QCMsg.pdfBase64(doc) }] })
      .then(function () { job.emailed_date = QCStore.today(); save(); toast('Emailed to ' + job.client.email); return true; }).catch(function (e) { toast('Email failed: ' + e.message); return false; });
  }
  function emailInvoiceNow(job, inv) {
    if (!job.client.email) return Promise.resolve(false);
    var det = S.details, doc = QCPdf.invoicePDF(job, inv, S), f = first(job.client.name);
    var body = 'Hi ' + f + ',\n\nInvoice ' + inv.no + ' for ' + money(inv.total) + ' is attached, due ' + QCPdf.fmtDate(inv.due) + '.\n\n' + (inv.pay_url ? 'Pay by card: ' + inv.pay_url + '\nBank transfer: ' : 'Bank transfer: ') + [det.account_name ? 'Account name ' + det.account_name : '', det.bsb ? 'BSB ' + det.bsb : '', det.account_number ? 'Account ' + det.account_number : ''].filter(Boolean).join(', ') + '. Reference ' + inv.no + '.\n\n' + det.sign_off + (det.owner_name ? ', ' + det.owner_name : '');
    return QCMsg.call({ action: 'send', channel: 'email', to: job.client.email, subject: 'Invoice ' + inv.no + (det.trading_name ? ' from ' + det.trading_name : ''), body: body, reply_to: det.email || undefined, attachments: [{ filename: inv.no + '.pdf', content: QCMsg.pdfBase64(doc) }] })
      .then(function () { inv.emailed_date = QCStore.today(); save(); toast('Invoice emailed'); return true; }).catch(function (e) { toast('Email failed: ' + e.message); return false; });
  }
  // Build the follow-up messages for a job (quote or unpaid invoices) at the configured days, then hand them to Twilio/Resend to hold.
  function scheduleFollowUps(job, kind) {
    var fu = S.follow_up, sd = S.sending, items = [], hr = parseInt(fu.remind_hour, 10) || 8;
    var canSms = sd.auto_sms && QCMsg.ready('sms') && job.client.phone, canEmail = sd.auto_email && QCMsg.ready('email') && job.client.email;
    if (!canSms && !canEmail) { toast(!job.client.phone && !job.client.email ? 'No mobile or email on the job, so nothing can be scheduled.' : 'No sending channel is ready for this client.'); return Promise.resolve({ scheduled: [], reason: 'no channel ready' }); }
    var have = {}; (job.follow_ups || []).forEach(function (x) { if (x.id && !x.cancelled) have[x.what] = 1; }); (job.invoices || []).forEach(function (i) { (i.follow_ups || []).forEach(function (x) { if (x.id && !x.cancelled) have[x.what] = 1; }); });
    if (kind === 'quote') { var base = job.sent_date || QCStore.today(); (fu.quote_days || [3, 7, 14]).forEach(function (d) { var day = QCStore.addDays(base, d), t = chaseText('quote', job, job.quote, d); if (canSms) items.push({ day: day, channel: 'sms', to: job.client.phone, body: t.sms, ref: 'quote+' + d }); if (canEmail && !canSms) items.push({ day: day, channel: 'email', to: job.client.email, subject: t.subject, body: t.email, ref: 'quote+' + d }); }); }
    else { job.invoices.filter(function (i) { return !i.paid_date && !(i.follow_ups && i.follow_ups.length); }).forEach(function (inv) { (fu.invoice_days || [1, 7, 21]).forEach(function (d) { var day = QCStore.addDays(inv.due, d), t = chaseText('invoice', job, inv, d); if (canSms) items.push({ day: day, channel: 'sms', to: job.client.phone, body: t.sms, ref: inv.no + '+' + d }); if (canEmail && !canSms) items.push({ day: day, channel: 'email', to: job.client.email, subject: t.subject, body: t.email, ref: inv.no + '+' + d }); }); }); }
    items = items.filter(function (it) { return !have[it.ref]; });
    if (!items.length) { toast('Follow-ups already scheduled'); return Promise.resolve({ scheduled: [] }); }
    return QCMsg.scheduleAll(items, hr).then(function (res) {
      var okRes = res.filter(function (r) { return r.ok; }), bad = res.filter(function (r) { return !r.ok; });
      if (kind === 'quote') job.follow_ups = (job.follow_ups || []).concat(okRes); else job.invoices.forEach(function (inv) { inv.follow_ups = (inv.follow_ups || []).concat(okRes.filter(function (r) { return r.what.indexOf(inv.no + '+') === 0; })); });
      if (bad.length) { var errTxt = bad.length + ' follow-up' + (bad.length > 1 ? 's' : '') + ' could not be scheduled: ' + bad[0].error; if (kind === 'quote') job.follow_up_error = errTxt; else job.invoices.forEach(function (inv) { if (bad.some(function (b) { return b.what.indexOf(inv.no + '+') === 0; })) inv.follow_up_error = errTxt; }); } else if (kind === 'quote') job.follow_up_error = ''; else job.invoices.forEach(function (inv) { if (okRes.some(function (r) { return r.what.indexOf(inv.no + '+') === 0; })) inv.follow_up_error = ''; });
      save(); if (bad.length) toast(bad.length + ' follow-up' + (bad.length > 1 ? 's' : '') + ' could not be scheduled: ' + bad[0].error); else if (okRes.length) toast(okRes.length + ' follow-ups scheduled by ' + okRes[0].channel);
      return { scheduled: okRes, failed: bad };
    });
  }
  function cancelQuoteFollowUps(job) { if (!(job.follow_ups || []).some(function (x) { return x.id && !x.cancelled; })) return Promise.resolve(); return QCMsg.cancelAll(job.follow_ups).then(function (rs) { save(); var bad = rs.filter(function (r) { return !r; }).length; toast(bad ? bad + ' follow-up' + (bad > 1 ? 's' : '') + ' could not be cancelled (' + ((job.follow_ups.filter(function (x) { return x.cancel_error; })[0] || {}).cancel_error || 'relay error') + '). Cancel them from the Follow-ups tab.' : 'Quote follow-ups cancelled'); }); }
  function cancelInvoiceFollowUps(inv) { if (!(inv.follow_ups || []).some(function (x) { return x.id && !x.cancelled; })) return Promise.resolve(); return QCMsg.cancelAll(inv.follow_ups).then(function (rs) { save(); var bad = rs.filter(function (r) { return !r; }).length; if (bad) toast(bad + ' reminder' + (bad > 1 ? 's' : '') + ' could not be cancelled. Cancel them from the Follow-ups tab.'); }); }
  function pendingFollowUps(job) { var list = (job.follow_ups || []).slice(); (job.invoices || []).forEach(function (i) { list = list.concat(i.follow_ups || []); }); var today = QCStore.today(); return list.filter(function (x) { return x.id && !x.cancelled && x.day >= today; }); }

  // ---------- helpers: costing line, follow-up reminders, booking
  function costLine(p) { if (!p.cost || !p.lines.length) return ''; return 'About ' + p.cost.hours.toFixed(1) + ' hours of work, ' + money(p.cost.paint) + ' of paint. Margin ' + money(p.cost.margin) + ' (' + p.cost.margin_pct + '%). Private.'; }
  function appUrl() { return location.href.split('#')[0] + '#/chase'; }
  function followUpIcs(job, kind) {
    var fu = S.follow_up, ev = [], name = job.client.name || job.quote_no, hr = parseInt(fu.remind_hour, 10) || 8;
    if (kind === 'quote') { var base = job.sent_date || QCStore.today(); (fu.quote_days || [3, 7, 14]).forEach(function (d) { var day = QCStore.addDays(base, d); ev.push({ uid: job.id + '-q' + d, summary: 'Follow up quote ' + job.quote_no + ': ' + name + ' (' + money(job.quote ? job.quote.total : 0) + ')', description: 'Open Quote and Chase, Follow-ups tab. The message is written. ' + (job.client.phone || ''), location: job.client.address || '', url: appUrl(), start: day, startHour: hr, endHour: hr + 1, alarmHour: hr }); }); }
    else { job.invoices.filter(function (i) { return !i.paid_date; }).forEach(function (inv) { (fu.invoice_days || [1, 7, 21]).forEach(function (d) { var day = QCStore.addDays(inv.due, d); ev.push({ uid: job.id + '-' + inv.no + '-' + d, summary: 'Chase invoice ' + inv.no + ': ' + name + ' (' + money(inv.total) + ')', description: 'Open Quote and Chase, Follow-ups tab. ' + (job.client.phone || ''), location: job.client.address || '', url: appUrl(), start: day, startHour: hr, endHour: hr + 1, alarmHour: hr }); }); }); }
    if (!ev.length) { toast('Nothing to remind about'); return; }
    job.follow_ups = ev.map(function (e) { return { uid: e.uid, day: e.start, what: e.summary }; }); save();
    QCCal.deliver(QCCal.ics(ev, 'Quote and Chase follow-ups'), (kind === 'quote' ? 'follow-up-' : 'reminders-') + job.quote_no + '.ics').then(function () { toast(ev.length + ' reminders ready for your calendar'); });
  }
  function bookJob(job, start, days, hour) {
    var endIncl = QCStore.addDays(start, days - 1), endExcl = QCStore.addDays(start, days), endHour = Math.max(hour + 1, parseInt(S.booking.end_hour, 10) || 15);
    var e = { uid: job.id + '-book-' + start, summary: 'Painting: ' + (job.client.name || job.quote_no) + (job.summary ? ' - ' + job.summary : ''), description: 'Quote ' + job.quote_no + ', ' + money(job.quote ? job.quote.total : 0) + '. ' + (job.client.phone || '') + ' ' + (job.client.email || '') + '\n' + (job.notes || ''), location: job.client.address || '', start: start, end: endExcl };
    if (days === 1) { e.startHour = hour; e.endHour = endHour; e.end = start; }
    job.booking = { start: start, days: days, end: endExcl, end_inclusive: endIncl, hour: hour, gcal: QCCal.googleUrl(e) }; save();
    QCCal.deliver(QCCal.ics([e], 'Quote and Chase bookings'), 'booking-' + job.quote_no + '.ics').then(function () { toast('Booked'); viewQuote(job); });
  }

  // ---------- Chase
  function chaseText(kind, job, item, days) {
    var det = S.details, f = first(job.client.name), so = det.sign_off + (det.owner_name ? ', ' + det.owner_name : ''), bank = [det.account_name ? 'Account name ' + det.account_name : '', det.bsb ? 'BSB ' + det.bsb : '', det.account_number ? 'Account ' + det.account_number : ''].filter(Boolean).join(', ');
    if (kind === 'quote') return { sms: 'Hi ' + f + ', following up on quote ' + job.quote_no + ' (' + money(job.quote.total) + ') for ' + (job.summary || 'the painting') + '. Any questions, or would you like to book a start date? ' + so, subject: 'Quote ' + job.quote_no, email: 'Hi ' + f + ',\n\nFollowing up on quote ' + job.quote_no + ' (' + money(job.quote.total) + ') for ' + (job.summary || 'the painting') + '. Let me know if you have any questions or would like to book a start date.\n\n' + so };
    var amt = money(item.total), due = QCPdf.fmtDate(item.due); if (item.pay_url) bank = 'Pay by card: ' + item.pay_url + ' or ' + bank;
    var idays = (S.follow_up && S.follow_up.invoice_days) || [1, 7, 21], t1 = idays[1] || 7, t2 = idays[2] || 21;
    if (days <= t1) return { sms: 'Hi ' + f + ', a reminder that invoice ' + item.no + ' for ' + amt + ' was due ' + due + '. ' + bank + '. ' + so, subject: 'Invoice ' + item.no + ' (' + amt + ')', email: 'Hi ' + f + ',\n\nA reminder that invoice ' + item.no + ' for ' + amt + ' was due ' + due + '.\n\nPayment details: ' + bank + '. Reference ' + item.no + '.\n\n' + so };
    if (days <= t2) return { sms: 'Hi ' + f + ', invoice ' + item.no + ' for ' + amt + ' was due ' + due + ' and is still outstanding. Please pay this week, or let me know if there is a problem with the work. ' + bank + '. ' + so, subject: 'Overdue: invoice ' + item.no + ' (' + amt + ')', email: 'Hi ' + f + ',\n\nInvoice ' + item.no + ' for ' + amt + ' was due ' + due + ' and is still outstanding. Please pay this week, or let me know if there is a problem with the work.\n\nPayment details: ' + bank + '. Reference ' + item.no + '.\n\n' + so };
    var by = QCPdf.fmtDate(QCStore.addDays(QCStore.today(), 7));
    return { sms: 'Hi ' + f + ', invoice ' + item.no + ' for ' + amt + ' is ' + days + ' days overdue. Please pay by ' + by + ' or contact me today to arrange a payment plan. After that it will be passed on for collection. ' + so, subject: 'Final notice: invoice ' + item.no + ' (' + amt + ')', email: 'Hi ' + f + ',\n\nInvoice ' + item.no + ' for ' + amt + ' is ' + days + ' days overdue. Please pay by ' + by + ' or contact me today to arrange a payment plan. After that date it will be passed on for collection.\n\nPayment details: ' + bank + '. Reference ' + item.no + '.\n\n' + so };
  }
  function viewChase() {
    var today = QCStore.today(), rows = [], owed = 0;
    S.jobs.forEach(function (j) {
      var fu = S.follow_up || { quote_days: [3, 7, 14], invoice_days: [1, 7, 21] };
      (j.invoices || []).forEach(function (i) { if (!i.paid_date && i.due < today) { var d = QCStore.daysBetween(i.due, today); owed += i.total; if (d >= (fu.invoice_days[0] || 1)) rows.push({ kind: 'invoice', job: j, item: i, days: d, tone: d <= (fu.invoice_days[1] || 7) ? 'First reminder' : d <= (fu.invoice_days[2] || 21) ? 'Second reminder' : 'Final reminder' }); } });
      if (j.status === 'quoted' && j.quote) { var since = QCStore.daysBetween(j.sent_date || j.quote.date, today); if (since >= (fu.quote_days[0] || 3)) rows.push({ kind: 'quote', job: j, item: j.quote, days: since, tone: since >= (fu.quote_days[2] || 14) ? 'Last follow-up' : since >= (fu.quote_days[1] || 7) ? 'Second follow-up' : 'Friendly follow-up' }); }
    });
    rows.sort(function (a, b) { return b.days - a.days; });
    var html = '<h1>Follow-ups</h1><p class="muted">Quotes at ' + (S.follow_up.quote_days || []).join(', ') + ' days and unpaid invoices at ' + (S.follow_up.invoice_days || []).join(', ') + ' days after due, set in Set-up. The message is written; tap Text or Email to send it. Calendar reminders open this page on the day.</p>';
    html += '<div class="card"><div class="row between"><span>Outstanding</span><h2>' + money(owed) + '</h2></div></div>';
    var sched = []; S.jobs.forEach(function (j) { pendingFollowUps(j).forEach(function (x) { sched.push({ job: j, x: x }); }); }); sched.sort(function (a, b) { return a.x.day < b.x.day ? -1 : 1; });
    if (sched.length) html += '<div class="card"><h3>Scheduled</h3>' + sched.slice(0, 12).map(function (s2, i) { return '<div class="row between"><span><b>' + QCPdf.fmtDate(s2.x.day) + '</b> ' + esc(s2.x.channel) + ' to ' + esc(s2.job.client.name || s2.job.quote_no) + ' <span class="hint">' + esc(s2.x.what) + '</span></span><button class="btn ghost sm" data-cancelfu="' + i + '">Cancel</button></div>'; }).join('') + '</div>';
    else if (!(QCMsg.ready('sms') || QCMsg.ready('email'))) html += '<p class="hint">For automatic sending, set up SMS and email in Set-up.</p>';
    if (!rows.length) html += '<div class="card empty">Nothing due. Good week.</div>';
    rows.forEach(function (r, k) {
      var j = r.job, t = chaseText(r.kind, j, r.item, r.days), recent = j.last_chased && QCStore.daysBetween(j.last_chased, today) < 5;
      var sms = 'sms:' + (j.client.phone || '').replace(/[^\d+]/g, '') + '?&body=' + encodeURIComponent(t.sms), mail = 'mailto:' + (j.client.email || '').replace(/[\s"'<>?#&]/g, '') + '?subject=' + encodeURIComponent(t.subject) + '&body=' + encodeURIComponent(t.email);
      html += '<div class="card"><div class="row between"><div><b>' + esc(j.client.name || j.quote_no) + '</b><span class="hint"> · ' + (r.kind === 'invoice' ? esc(r.item.no) + ', ' + money(r.item.total) + ', ' + r.days + ' days overdue' : esc(j.quote_no) + ', ' + money(j.quote.total) + ', waiting ' + r.days + ' days') + '</span></div><span class="pill ' + (r.days > 21 && r.kind === 'invoice' ? 'bad' : r.days > 7 ? 'warn' : '') + '">' + r.tone + '</span></div>' + (recent ? '<p class="hint">Chased ' + QCStore.daysBetween(j.last_chased, today) + ' day(s) ago.</p>' : '') +
        '<div class="msg">' + esc(t.sms) + '</div><div class="row">' + (QCMsg.ready('sms') && j.client.phone ? '<button class="btn tape sm" data-sendnow="' + k + '" data-ch="sms">Send SMS now</button>' : '') + (QCMsg.ready('email') && j.client.email ? '<button class="btn sm" data-sendnow="' + k + '" data-ch="email">Send email now</button>' : '') + '<a class="btn ' + (QCMsg.ready('sms') ? 'ghost ' : 'tape ') + 'sm" href="' + esc(sms) + '">Text</a><a class="btn ' + (QCMsg.ready('email') ? 'ghost ' : '') + 'sm" href="' + esc(mail) + '">Email</a><button class="btn ghost sm" data-copy="' + k + '">Copy</button><button class="btn ghost sm" data-chased="' + j.id + '">Mark chased</button><a class="btn ghost sm" href="#/job/' + j.id + '">Open job</a></div></div>';
      r.text = t;
    });
    $app.innerHTML = html;
    $app.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { var t = rows[+b.dataset.copy].text.sms; if (navigator.clipboard) navigator.clipboard.writeText(t); toast('Copied'); }); });
    $app.querySelectorAll('[data-sendnow]').forEach(function (b) { b.addEventListener('click', function () { var r = rows[+b.dataset.sendnow], ch = b.dataset.ch, j = r.job; b.disabled = true; var payload = ch === 'sms' ? { action: 'send', channel: 'sms', to: j.client.phone, body: r.text.sms } : { action: 'send', channel: 'email', to: j.client.email, subject: r.text.subject, body: r.text.email, reply_to: S.details.email || undefined }; QCMsg.call(payload).then(function () { j.last_chased = today; save(); toast('Sent by ' + ch); viewChase(); }).catch(function (e) { b.disabled = false; toast('Failed: ' + e.message); }); }); });
    $app.querySelectorAll('[data-chased]').forEach(function (b) { b.addEventListener('click', function () { var j = QCStore.getJob(b.dataset.chased); j.last_chased = today; save(); toast('Noted'); viewChase(); }); });
    $app.querySelectorAll('[data-cancelfu]').forEach(function (b) { b.addEventListener('click', function () { var s2 = sched[+b.dataset.cancelfu]; b.disabled = true; QCMsg.cancelAll([s2.x]).then(function () { save(); toast(s2.x.cancelled ? 'Cancelled' : 'Could not cancel: ' + (s2.x.cancel_error || '')); viewChase(); }); }); });
  }

  // ---------- Phone enquiry: ballpark from room presets, then a visit slot that respects travel
  function viewEnquiry(job) {
    var isNew = !job; if (isNew) { job = { client: { name: '', phone: '', email: '', address: '' }, summary: '', picks: [], condition: 'good' }; }
    job.picks = job.picks || []; job.condition = job.condition || 'good';
    var html = '<a class="hint" href="#/">&larr; Jobs</a><div class="row between"><h1>Phone enquiry</h1>' + (job.id ? statusPill(job) : '') + '</div>';
    html += '<div class="card"><div class="g2"><label class="f">Name<input type="text" data-bind="client.name" autocomplete="off"></label><label class="f">Mobile<input type="tel" data-bind="client.phone"></label></div><label class="f">Address<span>include postcode</span><input type="text" data-bind="client.address" data-refresh="1"></label><label class="f">Description<input type="text" data-bind="summary" placeholder="Repaint lounge and hall"></label></div>';
    html += '<div class="card"><h3>Rooms</h3><p class="hint">Tap to add. S / M / L = size.</p><div class="row" id="roomchips">' + Object.keys(QCSched.PRESETS).map(function (k) { return '<button class="btn ghost sm" data-room="' + k + '">' + esc(QCSched.PRESETS[k][0]) + '</button>'; }).join('') + '</div><div id="picks"></div>' +
      '<label class="f">Condition<span>fair = scuffs, poor = peeling</span><select data-bind="condition" data-refresh="1"><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option></select></label></div>';
    html += '<div class="card"><span class="hint">Ballpark' + (S.details.gst ? ' inc GST' : '') + '</span><h2 id="ballpark">' + (job.picks.length ? '' : 'Add rooms') + '</h2><p class="hint" id="bpnote"></p><div class="row"><button class="btn sm" id="textbp">Text ballpark</button><button class="btn ghost sm" id="savebp">Save as job</button></div></div>';
    html += '<div class="card"><h3>Quote visit</h3>' + (job.visit ? '<p><b>' + QCPdf.fmtDate(job.visit.date) + ' at ' + QCSched.nice(job.visit.start_min) + '</b> for ' + job.visit.minutes + ' min. ' + esc(job.visit.why || '') + '</p><div class="row"><button class="btn sm" id="visitics">Add to calendar</button><a class="btn ghost sm" href="' + esc(job.visit.gcal || '#') + '" target="_blank" rel="noopener">Google Calendar</a><button class="btn ghost sm" id="textvisit">Text confirmation</button><button class="btn ghost sm" id="unvisit">Change</button></div>' : '<p class="hint">Slots with the least driving between existing bookings.</p><div class="row"><label class="f">Visit length, min<input type="number" id="vmin" value="' + esc(S.booking.visit_minutes || 30) + '" min="10" step="5" style="width:6em"></label><button class="btn tape sm" id="findslots">Find a slot</button></div><div id="slots"></div>') + '</div>';
    $app.innerHTML = html; bindAll($app, job);
    function ensureSaved() { if (!job.id) { var j = QCStore.newJob(); Object.keys(job).forEach(function (k) { if (k !== 'id') j[k] = job[k]; }); j.status = 'enquiry'; job = j; save(); } return job; }
    function renderPicks() { var box = document.getElementById('picks'); box.innerHTML = job.picks.map(function (p, i) { return '<div class="row between" style="border-top:1px solid var(--line);padding-top:6px"><span><b>' + esc(QCSched.PRESETS[p.type][0]) + '</b>' + (p.n > 1 ? ' × ' + p.n : '') + '</span><span class="row">' + ['S', 'M', 'L'].map(function (sz) { return '<button class="btn sm ' + (p.size === sz ? 'tape' : 'ghost') + '" data-size="' + i + ':' + sz + '">' + sz + '</button>'; }).join('') + '<button class="btn ghost sm" data-less="' + i + '">−</button></span></div>'; }).join('');
      box.querySelectorAll('[data-size]').forEach(function (b) { b.addEventListener('click', function () { var a = b.dataset.size.split(':'); job.picks[+a[0]].size = a[1]; if (job.id) save(); renderPicks(); refreshPreview(); }); });
      box.querySelectorAll('[data-less]').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.less; job.picks[i].n -= 1; if (job.picks[i].n <= 0) job.picks.splice(i, 1); if (job.id) save(); renderPicks(); refreshPreview(); }); }); }
    refreshPreview = function () {
      var bp = document.getElementById('ballpark'), note = document.getElementById('bpnote'); if (!job.picks.length) { bp.textContent = 'Add rooms'; note.textContent = ''; job.ballpark = null; return; }
      var r = QCSched.ballpark(job.picks, job.condition, S, job.client.address); job.ballpark = { low: r.low, high: r.high, mid: r.mid }; if (job.id) save();
      bp.textContent = money(r.low) + ' to ' + money(r.high); var tr = r.priced.travel; if (r.priced.confirm.length) { note.textContent = r.priced.confirm.length + ' price' + (r.priced.confirm.length > 1 ? 's are' : ' is') + ' missing from your price list, so this is low. Fill them in under Set-up.'; return; } note.textContent = r.rooms.length + ' room' + (r.rooms.length > 1 ? 's' : '') + ' at typical sizes, ' + job.condition + ' condition' + (tr && tr.amount ? ', ' + money(tr.amount) + ' travel included' : '') + '. Measured on the day it firms up.';
    };
    renderPicks(); refreshPreview();
    $app.querySelectorAll('[data-room]').forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.room, ex = job.picks.filter(function (p) { return p.type === k; })[0]; if (ex) ex.n += 1; else job.picks.push({ type: k, size: 'M', n: 1 }); if (job.id) save(); renderPicks(); refreshPreview(); }); });
    function bpText() { var f = first(job.client.name), det = S.details; return 'Hi ' + f + ', ballpark for ' + (job.summary || 'the painting') + ': ' + money(job.ballpark.low) + ' to ' + money(job.ballpark.high) + (det.gst ? ' inc GST' : '') + ', confirmed when I measure on site. ' + (job.visit ? 'Quote visit ' + QCPdf.fmtDate(job.visit.date) + ' at ' + QCSched.nice(job.visit.start_min) + '. ' : '') + det.sign_off + (det.owner_name ? ', ' + det.owner_name : '') + (det.trading_name ? ', ' + det.trading_name : ''); }
    document.getElementById('textbp').addEventListener('click', function () { if (!job.ballpark) { toast('Add rooms first'); return; } ensureSaved(); var t = bpText(); if (QCMsg.ready('sms') && job.client.phone) { QCMsg.call({ action: 'send', channel: 'sms', to: job.client.phone, body: t }).then(function () { toast('Texted'); }).catch(function (e) { toast('Failed: ' + e.message); }); } else openUrl('sms:' + (job.client.phone || '').replace(/\s+/g, '') + '?&body=' + encodeURIComponent(t)); });
    document.getElementById('savebp').addEventListener('click', function () { ensureSaved(); job.rooms = QCSched.roomsFrom(job.picks, job.condition, S.rules.ceiling_height_m); job.status = 'draft'; save(); toast('Saved as job'); go('/job/' + job.id); });
    var fs2 = document.getElementById('findslots'); if (fs2) fs2.addEventListener('click', function () {
      var mins = parseInt(document.getElementById('vmin').value, 10) || 30, res = QCSched.suggest({ jobs: S.jobs.filter(function (j) { return j !== job && j.id !== job.id; }), settings: S, address: job.client.address, minutes: mins }), box = document.getElementById('slots');
      if (!res.slots.length) { box.innerHTML = '<p class="confirm">No free slot in the next two weeks. Check hours in Set-up.</p>'; return; }
      box.innerHTML = (res.known ? '' : '<p class="confirm">No postcode in the address; travel ignored.</p>') + res.slots.map(function (sl, i) { return '<button class="btn ' + (i === 0 ? 'tape' : 'ghost') + ' sm" data-slot="' + i + '" style="margin:3px 0"><b>' + QCPdf.fmtDate(sl.date).replace(/ \d{4}$/, '') + ' ' + QCSched.nice(sl.start_min) + '</b>&nbsp;<span class="hint">' + esc(sl.why) + (sl.detour ? ', +' + sl.detour + ' min driving' : '') + '</span></button>'; }).join('');
      box.querySelectorAll('[data-slot]').forEach(function (b) { b.addEventListener('click', function () { var sl = res.slots[+b.dataset.slot]; ensureSaved(); job.visit = { date: sl.date, start_min: sl.start_min, minutes: mins, why: sl.why, detour: sl.detour }; job.visit.gcal = QCCal.googleUrl(visitEvent(job)); save(); toast('Visit booked ' + QCPdf.fmtDate(sl.date) + ' ' + QCSched.nice(sl.start_min)); viewEnquiry(job); }); });
    });
    var vi = document.getElementById('visitics'); if (vi) vi.addEventListener('click', function () { QCCal.deliver(QCCal.ics([visitEvent(job)], 'Quote and Chase visits'), 'visit-' + job.quote_no + '.ics').then(function () { toast('Added to calendar'); }); });
    var tv = document.getElementById('textvisit'); if (tv) tv.addEventListener('click', function () { var f = first(job.client.name), det = S.details, t = 'Hi ' + f + ', confirming the quote visit on ' + QCPdf.fmtDate(job.visit.date) + ' at ' + QCSched.nice(job.visit.start_min) + ', about ' + job.visit.minutes + ' minutes. ' + det.sign_off + (det.owner_name ? ', ' + det.owner_name : ''); if (QCMsg.ready('sms') && job.client.phone) { QCMsg.call({ action: 'send', channel: 'sms', to: job.client.phone, body: t }).then(function () { toast('Texted'); }).catch(function (e) { toast('Failed: ' + e.message); }); } else openUrl('sms:' + (job.client.phone || '').replace(/\s+/g, '') + '?&body=' + encodeURIComponent(t)); });
    var uv = document.getElementById('unvisit'); if (uv) uv.addEventListener('click', function () { job.visit = null; save(); viewEnquiry(job); });
  }
  function visitEvent(job) { return { uid: job.id + '-visit-' + job.visit.date, summary: 'Quote visit: ' + (job.client.name || job.quote_no), description: (job.summary || '') + (job.ballpark ? '\nBallpark ' + money(job.ballpark.low) + ' to ' + money(job.ballpark.high) : '') + '\n' + (job.client.phone || ''), location: job.client.address || '', start: job.visit.date, startMin: job.visit.start_min, endMin: job.visit.start_min + (job.visit.minutes || 30), alarmBefore: 45 }; }

  // ---------- Settings
  function viewSettings() {
    var d = S.details, html = '<h1>Set-up</h1>';
    html += '<div class="card"><h2>Business</h2><div class="g2"><label class="f">Trading name<input type="text" data-bind="details.trading_name"></label><label class="f">Name<input type="text" data-bind="details.owner_name"></label><label class="f">ABN<input type="text" data-bind="details.abn"></label><label class="f">Mobile<input type="tel" data-bind="details.phone"></label><label class="f">Email<input type="email" data-bind="details.email"></label><label class="f">Service area<input type="text" data-bind="details.service_area"></label><label class="f">Postcode<input type="text" data-bind="details.postcode" inputmode="numeric"></label></div><label class="f">Business address<input type="text" data-bind="details.address"></label><div class="g2"><label class="f">Licence no.<input type="text" data-bind="details.licence"></label><label class="f">Insurance<span>e.g. Public liability $10m</span><input type="text" data-bind="details.insurance"></label></div>' +
      '<div class="row"><label class="btn ghost sm">Logo<input type="file" id="logo" accept="image/*"></label>' + (d.logo ? '<img src="' + esc(/^data:image\//.test(d.logo) ? d.logo : '') + '" alt="" style="height:36px"> <button class="btn ghost sm" id="nologo">remove</button>' : '<span class="hint">optional, goes top-left of quotes</span>') + '</div></div>';
    html += '<div class="card"><h2>Bank details</h2><div class="g3"><label class="f">Account name<input type="text" data-bind="details.account_name"></label><label class="f">BSB<input type="text" data-bind="details.bsb" inputmode="numeric"></label><label class="f">Account no.<input type="text" data-bind="details.account_number" inputmode="numeric"></label></div><label class="f">Other payment methods<input type="text" data-bind="details.other_payments"></label><div class="g3"><label class="f">Deposit %<input type="number" data-bind="details.deposit_pct" min="0" max="100"></label><label class="f">Payment terms, days<input type="number" data-bind="details.balance_days" min="0"></label><label class="f">Quote valid, days<input type="number" data-bind="details.quote_valid_days" min="1"></label></div><label class="btn ghost sm"><input type="checkbox" data-bind="details.gst"> Registered for GST (add 10%)</label></div>';
    html += '<div class="card"><h2>Sign-off</h2><p class="hint">Ends every text and email.</p><div class="g2"><label class="f">Sign-off<span>e.g. Cheers</span><input type="text" data-bind="details.sign_off"></label></div></div>';
    html += '<div class="card"><h2>Prices</h2><p class="hint">Ex GST, including labour and paint. Leave blank anything you do not offer.</p><table><thead><tr><th>Item</th><th class="n">$ per</th></tr></thead><tbody>' + QCStore.PRICE_ITEMS.map(function (p, i) { return (i === 0 || p[4] !== QCStore.PRICE_ITEMS[i - 1][4] ? '<tr><td colspan="2"><span class="tag">' + (p[4] === 'interior' ? 'Interior' : 'Exterior') + '</span></td></tr>' : '') + '<tr><td>' + esc(p[1]) + '<br><span class="hint">' + esc(p[5]) + '</span></td><td class="n"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap"><input type="number" step="0.5" min="0" aria-label="' + esc(p[1]) + ' price" data-price="' + p[0] + '" value="' + (S.prices[p[0]] == null ? '' : S.prices[p[0]]) + '" style="width:5.5em;text-align:right"><span class="hint">/' + esc(p[2]) + '</span></div></td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="g3"><label class="f">Minimum job $<input type="number" data-bind="rules.minimum_job" min="0"></label><label class="f">Travel $/km<input type="number" step="0.1" data-bind="rules.travel_per_km" min="0"></label><label class="f">Free radius, km<input type="number" data-bind="rules.free_radius_km" min="0"></label><label class="btn ghost sm"><input type="checkbox" data-bind="rules.travel_return"> Charge travel both ways</label><label class="f">Premium paint +%<input type="number" data-bind="rules.premium_paint_pct" min="0"></label><label class="f">Ceiling height m<input type="number" step="0.1" data-bind="rules.ceiling_height_m" min="2"></label></div></div>';
    html += '<div class="card"><h2>Labour and paint</h2><p class="hint">Used for the private cost breakdown. Calculate prices fills the price list from these.</p><div class="g3"><label class="f">Labour $/hour<input type="number" data-bind="costing.labour_rate" min="0"></label><label class="f">Margin %<input type="number" data-bind="costing.margin_pct" min="0"></label><label class="f">Coats<input type="number" data-bind="costing.coats" min="1" max="3"></label><label class="f">Coverage m²/L<input type="number" data-bind="costing.coverage_m2_per_l" min="6"></label><label class="f">Speed<span>1 = typical, 0.8 = faster, 1.2 = slower</span><input type="number" step="0.1" data-bind="costing.hours_scale" min="0.5"></label></div><div class="g3">' + Object.keys(QCCosting.PAINT).map(function (k) { return '<label class="f">' + esc(QCCosting.PAINT[k]) + ' $/L<input type="number" data-bind="costing.paint_price.' + k + '" min="0"></label>'; }).join('') + '</div><div class="row"><button class="btn sm" id="derive">Calculate prices</button><span class="hint">Overwrites the price list.</span></div><div class="g2"><label class="f">Tin sizes, L<input type="text" data-bind="costing.tin_sizes" placeholder="1, 4, 10, 15"></label><label class="btn ghost sm"><input type="checkbox" data-bind="costing.charge_tins"> Charge paint by full tins</label></div></div>';
    html += '<div class="card"><h2>Follow-ups</h2><p class="hint">Days after a quote is sent, and days after an invoice is due.</p><div class="g3"><label class="f">Quote follow-ups, days<input type="text" id="fu_q" value="' + esc((S.follow_up.quote_days || []).join(', ')) + '"></label><label class="f">Invoice reminders, days after due<input type="text" id="fu_i" value="' + esc((S.follow_up.invoice_days || []).join(', ')) + '"></label><label class="f">Reminder time<span>24h</span><input type="number" data-bind="follow_up.remind_hour" min="5" max="20"></label></div></div>';
    html += '<div class="card"><h2>Card payments</h2><p class="hint">Stripe restricted key with write access to Products, Prices and Payment Links, read access to Checkout Sessions. Adds a pay-by-card link to invoices.</p><label class="f">Stripe restricted key<span>rk_live_… (not sk_)</span><input type="text" data-bind="stripe.key" autocomplete="off" spellcheck="false"></label><p class="confirm" id="skwarn" ' + (S.stripe.key && !QCStripe.keyLooksRight(S.stripe.key) ? '' : 'hidden') + '>Not a restricted key (rk_live_ or rk_test_). Card links off.</p><label class="btn ghost sm"><input type="checkbox" data-bind="stripe.enabled"> Put a card payment link on invoices</label></div>';
    html += '<div class="card"><h2>SMS and email</h2><p class="hint">Needed for automatic SMS and email. SMS via Twilio, email via Resend, through the relay from the pack. Keys stay on this phone.</p>' +
      '<label class="f">Relay address<span>e.g. https://your-site.vercel.app/api/msg</span><input type="url" data-bind="sending.server" placeholder="https://" autocomplete="off"></label><label class="f">Relay token<span>RELAY_TOKEN on the relay</span><input type="password" data-bind="sending.token" autocomplete="off"></label><label class="btn ghost sm"><input type="checkbox" data-bind="sending.server_has_creds"> The relay already has my Twilio and Resend details</label>' +
      '<div class="g2" id="credbox"><label class="f">Twilio Account SID<input type="text" data-bind="sending.twilio_sid" autocomplete="off" spellcheck="false"></label><label class="f">Twilio Auth Token<input type="password" data-bind="sending.twilio_token" autocomplete="off"></label><label class="f">Twilio Messaging Service SID<span>MG…, needed for scheduled SMS</span><input type="text" data-bind="sending.twilio_service" autocomplete="off" spellcheck="false"></label><label class="f">Twilio From number<span>only if no Messaging Service</span><input type="text" data-bind="sending.twilio_from" placeholder="+61..."></label><label class="f">Resend API key<input type="password" data-bind="sending.resend_key" autocomplete="off"></label><label class="f">Email from<span>on a domain verified in Resend</span><input type="text" data-bind="sending.resend_from" placeholder="Name <you@yourdomain.com.au>"></label></div>' +
      '<div class="row"><label class="btn ghost sm"><input type="checkbox" data-bind="sending.auto_sms"> Follow-ups by SMS</label><label class="btn ghost sm"><input type="checkbox" data-bind="sending.auto_email"> By email when no mobile</label><label class="btn ghost sm"><input type="checkbox" data-bind="sending.email_quotes"> Email quotes and invoices with the PDF</label></div>' +
      '<div class="row"><input type="text" id="testto" aria-label="Test recipient" placeholder="Mobile or email" style="flex:1 1 10em"><button class="btn sm" id="testsms">Send test SMS</button><button class="btn sm" id="testemail">Send test email</button><span class="hint" id="testres"></span></div></div>';
    html += '<div class="card"><h2>Hours</h2><div class="g3"><label class="f">Job start<span>hour, 24h</span><input type="number" data-bind="booking.start_hour" min="5" max="12"></label><label class="f">Job finish<input type="number" data-bind="booking.end_hour" min="10" max="20"></label><label class="f">Quote visit, min<input type="number" data-bind="booking.visit_minutes" min="10" step="5"></label><label class="f">Earliest visit<span>hour</span><input type="number" data-bind="booking.quote_from" min="5" max="12"></label><label class="f">Latest visit start<span>hour</span><input type="number" data-bind="booking.quote_to" min="12" max="21"></label></div><div class="row"><label class="btn ghost sm"><input type="checkbox" data-bind="booking.saturdays"> Saturdays</label><label class="btn ghost sm"><input type="checkbox" data-bind="booking.sundays"> Sundays</label></div><p class="hint">Slots with the least driving between existing bookings.</p></div>';
    html += '<div class="card"><h2>Quote terms</h2><label class="f">Included<span>one per line</span><textarea id="w_inc" rows="5">' + esc(S.wording.included.join('\n')) + '</textarea></label><label class="f">Not included<span>one per line</span><textarea id="w_exc" rows="5">' + esc(S.wording.excluded.join('\n')) + '</textarea></label><div class="g2"><label class="f">Guarantee, years<input type="number" data-bind="wording.warranty_years" min="0"></label></div><label class="f">Acceptance<textarea data-bind="wording.accept" rows="3"></textarea></label></div>';
    html += '<div class="card"><h2>Back-up</h2><p class="hint">Stored on this phone only.</p><div class="row"><button class="btn sm" id="export">Save back-up</button><label class="btn ghost sm">Restore from file<input type="file" id="import" accept=".json,application/json"></label><button class="btn danger sm" id="reset">Delete all data</button></div></div>';
    $app.innerHTML = html;
    sectionise($app, ['Your business', 'Getting paid', 'Your prices'], !!(S.details.trading_name && S.details.bsb));
    bindAll($app, S);
    $app.querySelectorAll('[data-price]').forEach(function (el) { el.addEventListener('input', function () { S.prices[el.dataset.price] = el.value === '' ? null : n(el.value); save(); }); });
    ['testsms', 'testemail'].forEach(function (id) { document.getElementById(id).addEventListener('click', function () { var to = document.getElementById('testto').value.trim(), out = document.getElementById('testres'); if (!to) { out.textContent = 'Type a number or email first.'; return; } out.textContent = 'Sending…'; QCMsg.call({ action: 'test', channel: id === 'testsms' ? 'sms' : 'email', to: to }).then(function (r) { out.textContent = 'Sent (' + (r.id || 'ok') + ').'; }).catch(function (e) { out.textContent = 'Failed: ' + e.message; }); }); });
    var sk = $app.querySelector('[data-bind="stripe.key"]'); sk.addEventListener('input', function () { S.stripe.key = sk.value.trim(); save(); document.getElementById('skwarn').hidden = !(S.stripe.key && !QCStripe.keyLooksRight(S.stripe.key)); });
    document.getElementById('derive').addEventListener('click', function () { var rates = QCCosting.deriveRates(S.costing); Object.keys(rates).forEach(function (k) { S.prices[k] = rates[k]; }); save(); toast('Price list updated'); viewSettings(); });
    ['fu_q', 'fu_i'].forEach(function (id) { document.getElementById(id).addEventListener('input', function () { var arr = this.value.split(/[,\s]+/).map(function (x) { return parseInt(x, 10); }).filter(function (x, i, a) { return x >= 0 && x <= 60 && a.indexOf(x) === i; }).sort(function (a, b) { return a - b; }); if (arr.length) { S.follow_up[id === 'fu_q' ? 'quote_days' : 'invoice_days'] = arr; save(); } }); });
    document.getElementById('w_inc').addEventListener('input', function () { S.wording.included = this.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); save(); });
    document.getElementById('w_exc').addEventListener('input', function () { S.wording.excluded = this.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); save(); });
    document.getElementById('logo').addEventListener('change', function () { var f = this.files[0]; if (!f) return; createImageBitmap(f).then(function (b) { var sc = Math.min(1, 600 / Math.max(b.width, b.height)), c = document.createElement('canvas'); c.width = Math.round(b.width * sc); c.height = Math.round(b.height * sc); c.getContext('2d').drawImage(b, 0, 0, c.width, c.height); S.details.logo = c.toDataURL('image/png'); save(); viewSettings(); }).catch(function () { toast('Could not read that image'); }); });
    var nl = document.getElementById('nologo'); if (nl) nl.addEventListener('click', function () { S.details.logo = ''; save(); viewSettings(); });
    document.getElementById('export').addEventListener('click', function () { var blob = new Blob([QCStore.exportAll()], { type: 'application/json' }); var f = new File([blob], 'quote-and-chase-backup-' + QCStore.today() + '.json', { type: 'application/json' }); if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).catch(function () {}); else { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500); } });
    document.getElementById('import').addEventListener('change', function () { var f = this.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { try { QCStore.importAll(fr.result); toast('Restored'); route(); } catch (e) { toast(e.message); } }; fr.readAsText(f); });
    document.getElementById('reset').addEventListener('click', function () { if (confirm('Wipe all jobs and settings on this phone? Save a back-up first.')) { QCStore.reset(); route(); } });
  }

  function viewHelp() {
    $app.innerHTML = '<h1>How it works</h1><div class="card"><ol class="steps">' +
      '<li><span><b>Set-up.</b> Name, bank details, prices.</span></li>' +
      '<li><span><b>On site.</b> New job, add a room, stick an A4 sheet on the wall, photograph the whole wall. Confirm the page outline, confirm the wall outline, save. Next wall.</span></li>' +
      '<li><span><b>Quote.</b> Every line shows where its number came from. Fix anything marked TO CONFIRM. Send.</span></li>' +
      '<li><span><b>Accepted.</b> Mark it accepted, book the days, invoice the deposit. On completion, the final.</span></li>' +
      '<li><span><b>Follow-ups.</b> With SMS and email set up, quotes and unpaid invoices are chased automatically at the days you set, and stop when the client accepts or pays. Without it, reminders go in your calendar and you tap Text on the day.</span></li>' +
      '<li><span><b>Phone enquiry.</b> Tap the rooms and sizes for a ballpark while they are on the phone. Find a slot picks visit times with the least driving between existing bookings.</span></li></ol></div>' +
      '<div class="card"><h3>Measuring from a photo</h3><p class="muted">Any A4 sheet is 210 by 297 mm, printed or blank. The app finds it in the photo and uses it as the ruler, with the wall corners and the lens geometry doing the perspective. Expect one to two percent. No sheet: tap the corners and use a door (2.04 m) or the ceiling height. Typed sizes are estimates and the quote says so.</p></div>' +
      '<div class="card"><h3>Data</h3><p class="muted">On this phone only. Nothing is uploaded. Back up from Set-up.</p></div>';
  }

  route();
  window.__qcApp = { route: route, store: QCStore, pricing: QCPricing, openUrl: function (u) { openUrl(u); }, setOpen: function (f) { openUrl = f; } };
})();
