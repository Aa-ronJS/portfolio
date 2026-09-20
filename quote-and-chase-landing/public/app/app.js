/* Quote & Chase app: views and routing. Vanilla JS, no build step. */
(function () {
  'use strict';
  var $app = document.getElementById('app'), S;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return QCPdf.money(n); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2200); }
  function go(h) { location.hash = h; }
  function first(name) { return (name || '').trim().split(/\s+/)[0] || 'there'; }
  function n(v, d) { var x = parseFloat(v); return isNaN(x) ? (d || 0) : x; }
  function save() { if (!QCStore.save()) toast('Could not save. Storage full or blocked.'); }

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
    S = QCStore.load();
    var h = location.hash.replace(/^#\/?/, ''), p = h.split('/');
    document.querySelectorAll('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === (p[0] || 'home')); });
    refreshPreview = function () {};
    if (!p[0]) return viewHome();
    if (p[0] === 'settings') return viewSettings();
    if (p[0] === 'chase') return viewChase();
    if (p[0] === 'help') return viewHelp();
    if (p[0] === 'job' && p[1]) {
      var job = QCStore.getJob(p[1]); if (!job) return go('/');
      if (p[2] === 'room' && p[3]) return viewRoom(job, p[3]);
      if (p[2] === 'quote') return viewQuote(job);
      if (p[2] === 'invoice') return viewInvoice(job);
      return viewJob(job);
    }
    go('/');
  }
  window.addEventListener('hashchange', route);

  // ---------- Home
  function statusPill(j) {
    var map = { draft: ['Draft', ''], quoted: ['Quoted', 'ok'], accepted: ['Accepted', 'ok'], invoiced: ['Invoiced', 'warn'], paid: ['Paid', 'ok'], declined: ['Declined', 'bad'] };
    var m = map[j.status] || ['', '']; return '<span class="pill ' + m[1] + '">' + m[0] + '</span>';
  }
  function viewHome() {
    var jobs = S.jobs, setup = S.details.trading_name && Object.keys(S.prices).length;
    var html = '<div class="row between"><h1>Jobs</h1><button class="btn tape" id="newjob">New job</button></div>';
    if (!setup) html += '<div class="card"><h2>Three minutes of set-up first</h2><p class="muted">Your business name, bank details and your prices. They go on every quote.</p><a class="btn" href="#/settings">Set up</a></div>';
    if (!jobs.length) html += '<div class="card empty">No jobs yet. Tap New job.</div>';
    else html += '<div class="joblist">' + jobs.map(function (j) {
      var total = j.quote ? money(j.quote.total) : ''; return '<a class="job" href="#/job/' + j.id + '"><div><b>' + esc(j.client.name || 'New job') + '</b><span class="sub">' + esc(j.client.address || j.summary || '') + '</span></div><div style="text-align:right">' + statusPill(j) + '<div class="sub">' + esc(j.quote_no) + (total ? ' · ' + total : '') + '</div></div></a>';
    }).join('') + '</div>';
    html += '<p class="hint"><a href="#/help">How it works</a> · Everything is stored on this phone. <a href="#/settings">Back it up</a> from set-up.</p>';
    $app.innerHTML = html;
    document.getElementById('newjob').addEventListener('click', function () { var j = QCStore.newJob(); go('/job/' + j.id); });
  }

  // ---------- Job
  function viewJob(job) {
    var priced = QCPricing.priceJob(job, S);
    var html = '<a class="hint" href="#/">&larr; Jobs</a><div class="row between"><h1>' + esc(job.quote_no) + '</h1>' + statusPill(job) + '</div>';
    html += '<div class="card"><h2>Client</h2><div class="g2"><label class="f">Name<input type="text" data-bind="client.name" autocomplete="off"></label><label class="f">Mobile<input type="tel" data-bind="client.phone"></label></div>' +
      '<label class="f">Email<input type="email" data-bind="client.email"></label><label class="f">Job address<input type="text" data-bind="client.address"></label>' +
      '<label class="f">The job, in a sentence<span>goes on the quote</span><input type="text" data-bind="summary" placeholder="Repaint lounge, main bedroom and hallway before sale"></label></div>';
    html += '<div class="card"><div class="row between"><h2>Rooms and surfaces</h2><div class="row"><button class="btn sm" data-add="interior">+ Room</button><button class="btn ghost sm" data-add="exterior">+ Exterior</button></div></div>';
    if (!job.rooms.length) html += '<p class="muted">Add a room, then measure it from a photo or type the sizes.</p>';
    html += job.rooms.map(function (r) {
      var q = QCPricing.roomQuantities(r, S.rules), walls = q.lines.filter(function (l) { return l.key === 'p_walls'; })[0];
      var how = r.type === 'exterior' ? 'exterior' : r.method === 'measured' ? (r.walls.length + ' wall' + (r.walls.length === 1 ? '' : 's') + ' measured') : (r.L && r.W ? r.L + ' × ' + r.W + ' m typed' : 'no sizes yet');
      return '<a class="job" href="#/job/' + job.id + '/room/' + r.id + '"><div><b>' + esc(r.name || (r.type === 'exterior' ? 'Exterior' : 'Room')) + '</b><span class="sub">' + esc(how) + (walls ? ' · ' + walls.qty + ' m² of wall' : '') + '</span></div><div><span class="pill ' + (q.source === 'measured' ? 'ok' : '') + '">' + (q.source === 'measured' ? 'measured' : 'estimate') + '</span></div></a>';
    }).join('') + '</div>';
    html += '<div class="card"><div class="row between"><h2>Extras</h2><button class="btn ghost sm" id="addextra">+ Line</button></div><p class="hint">Anything not covered by the rooms: garage door, ceiling roses, a repair. Tick "confirm" if the price is a guess.</p><div id="extras"></div>' +
      '<div class="g2"><label class="f">Travel beyond your area<span>km, one way</span><input type="number" data-bind="travel_km" data-refresh="1" min="0"></label><label class="f">Premium paint requested<span>adds ' + esc(S.rules.premium_paint_pct) + '%</span><select data-bind="premium_paint" data-refresh="1"><option value="">No</option><option value="1">Yes</option></select></label></div></div>';
    html += '<div class="card"><div class="row between"><div><span class="hint">Running total' + (S.details.gst ? ' inc GST' : '') + '</span><h2 id="runtotal">' + money(priced.total) + '</h2></div><a class="btn tape" href="#/job/' + job.id + '/quote">Build the quote</a></div>' + (priced.confirm.length ? '<p class="confirm">' + priced.confirm.length + ' line' + (priced.confirm.length > 1 ? 's' : '') + ' to confirm</p>' : '') + '</div>';
    html += '<div class="row between"><label class="f" style="flex:1">Private notes<textarea data-bind="notes" rows="2"></textarea></label></div><div class="row"><button class="btn danger sm" id="deljob">Delete job</button></div>';
    $app.innerHTML = html;
    // premium_paint select binding stores '1' or '' strings; normalise
    bindAll($app, job);
    var sel = $app.querySelector('[data-bind="premium_paint"]'); sel.value = job.premium_paint ? '1' : ''; sel.addEventListener('change', function () { job.premium_paint = sel.value === '1'; save(); refreshPreview(); });
    refreshPreview = function () { var p = QCPricing.priceJob(job, S); document.getElementById('runtotal').textContent = money(p.total); };
    $app.querySelectorAll('[data-add]').forEach(function (b) { b.addEventListener('click', function () { var r = QCStore.newRoom(b.dataset.add); job.rooms.push(r); save(); go('/job/' + job.id + '/room/' + r.id); }); });
    function renderExtras() {
      var box = document.getElementById('extras'); box.innerHTML = job.extras.map(function (x, i) {
        return '<div class="row" data-x="' + i + '" style="border-top:1px solid var(--line);padding-top:8px"><input type="text" placeholder="Description" data-xk="desc" style="flex:2 1 12em" value="' + esc(x.desc) + '"><input type="number" placeholder="Qty" data-xk="qty" style="flex:1 1 4em" value="' + esc(x.qty) + '"><input type="text" placeholder="unit" data-xk="unit" style="flex:1 1 4em" value="' + esc(x.unit) + '"><input type="number" placeholder="Rate $" data-xk="rate" style="flex:1 1 5em" value="' + esc(x.rate) + '"><label class="hint"><input type="checkbox" data-xk="confirm" ' + (x.confirm ? 'checked' : '') + '> confirm</label><button class="btn ghost sm" data-xdel="' + i + '">remove</button></div>';
      }).join('');
      box.querySelectorAll('[data-x]').forEach(function (row) { var i = +row.dataset.x; row.querySelectorAll('[data-xk]').forEach(function (el) { el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () { job.extras[i][el.dataset.xk] = el.type === 'checkbox' ? el.checked : el.value; save(); refreshPreview(); }); }); });
      box.querySelectorAll('[data-xdel]').forEach(function (b) { b.addEventListener('click', function () { job.extras.splice(+b.dataset.xdel, 1); save(); renderExtras(); refreshPreview(); }); });
    }
    renderExtras();
    document.getElementById('addextra').addEventListener('click', function () { job.extras.push({ desc: '', qty: 1, unit: 'each', rate: '', confirm: false }); save(); renderExtras(); });
    document.getElementById('deljob').addEventListener('click', function () { if (confirm('Delete this job and everything in it?')) { QCStore.deleteJob(job.id); go('/'); } });
  }

  // ---------- Room
  function viewRoom(job, rid) {
    var room = job.rooms.filter(function (r) { return r.id === rid; })[0]; if (!room) return go('/job/' + job.id);
    var ext = room.type === 'exterior';
    var html = '<a class="hint" href="#/job/' + job.id + '">&larr; ' + esc(job.quote_no) + '</a><h1>' + (ext ? 'Exterior' : 'Room') + '</h1>';
    html += '<div class="card"><label class="f">Name<input type="text" data-bind="name" placeholder="' + (ext ? 'Front and side weatherboards' : 'Lounge') + '"></label>';
    if (ext) {
      html += '<p class="hint">Quantities for the outside. Leave blank what you are not doing.</p><div class="g2">' +
        [['weatherboard', 'Weatherboards m²'], ['render', 'Render or brick m²'], ['eaves', 'Eaves and fascia lm'], ['gutters', 'Gutters and downpipes lm'], ['ext_door', 'Exterior doors'], ['ext_window', 'Exterior windows'], ['deck', 'Deck oil m²'], ['fence', 'Fence m²'], ['pressure', 'Pressure wash m²'], ['scaffold', 'Scaffold days']].map(function (f) { return '<label class="f">' + f[1] + '<input type="number" min="0" step="0.5" data-bind="ext.' + f[0] + '" data-refresh="1"></label>'; }).join('') + '</div></div>';
    } else {
      html += '<div class="row"><button class="btn sm ' + (room.method !== 'measured' ? 'tape' : 'ghost') + '" data-method="typed">Type the sizes</button><button class="btn sm ' + (room.method === 'measured' ? 'tape' : 'ghost') + '" data-method="measured">Measure from a photo</button></div>';
      html += '<div id="typed" ' + (room.method === 'measured' ? 'hidden' : '') + '><div class="g3"><label class="f">Length m<input type="number" step="0.1" min="0" data-bind="L" data-refresh="1"></label><label class="f">Width m<input type="number" step="0.1" min="0" data-bind="W" data-refresh="1"></label><label class="f">Height m<span>blank = ' + esc(S.rules.ceiling_height_m) + '</span><input type="number" step="0.1" min="0" data-bind="H" data-refresh="1"></label></div><p class="hint">Typed sizes make an estimate. The quote says so. Measuring from a photo takes a minute per wall.</p></div>';
      html += '<div id="measured" ' + (room.method === 'measured' ? '' : 'hidden') + '><div id="walls"></div><div id="measure-mount"></div><label class="f" style="margin-top:8px">Ceiling m²<span>blank = longest two walls multiplied</span><input type="number" step="0.1" min="0" data-bind="ceiling_m2" data-refresh="1"></label></div>';
      html += '</div><div class="card"><h3>What we are painting</h3><div class="row">' +
        [['walls', 'Walls'], ['ceiling', 'Ceiling'], ['skirting', 'Skirting and architraves']].map(function (f) { return '<label class="btn ghost sm"><input type="checkbox" data-bind="surfaces.' + f[0] + '" data-refresh="1"> ' + f[1] + '</label>'; }).join('') + '</div>' +
        '<div class="g2"><label class="f">Doors, both sides<input type="number" min="0" data-bind="doors" data-refresh="1"></label><label class="f">Doors, one side only<input type="number" min="0" data-bind="doors_one_side" data-refresh="1"></label><label class="f">Windows<input type="number" min="0" data-bind="windows" data-refresh="1"></label><label class="f">Wardrobe door pairs<input type="number" min="0" data-bind="wardrobe_pairs" data-refresh="1"></label><label class="f">Feature wall m²<input type="number" min="0" step="0.5" data-bind="feature_m2" data-refresh="1"></label><label class="f">Wallpaper to remove m²<input type="number" min="0" step="0.5" data-bind="wallpaper_m2" data-refresh="1"></label></div>' +
        '<label class="f">Wall condition<span>good: clean. fair: scuffs, small dents. poor: peeling, damage.</span><select data-bind="condition" data-refresh="1"><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option></select></label></div>';
    }
    html += '<div class="card"><h3>This ' + (ext ? 'area' : 'room') + ' on the quote</h3><div id="preview"></div></div><div class="row between"><a class="btn tape" href="#/job/' + job.id + '">Done</a><button class="btn danger sm" id="delroom">Remove ' + (ext ? 'area' : 'room') + '</button></div>';
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
        box.innerHTML = room.walls.length ? '<table><thead><tr><th>Wall</th><th class="n">W × H m</th><th class="n">Openings</th><th class="n">Paint m²</th><th></th></tr></thead><tbody>' + room.walls.map(function (w, i) { return '<tr><td>' + esc(w.wall) + '<br><span class="hint">' + (w.method === 'roomplan-lidar' ? 'LiDAR' : '±' + w.expected_error_pct + '%') + '</span></td><td class="n">' + (w.width_mm / 1000).toFixed(2) + ' × ' + (w.height_mm / 1000).toFixed(2) + '</td><td class="n">' + w.openings.length + '</td><td class="n">' + w.paint_area_m2.toFixed(2) + '</td><td class="n"><button class="btn ghost sm" data-wdel="' + i + '">remove</button></td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">No walls measured yet. Photograph the wall below, tap its corners.</p>';
        box.querySelectorAll('[data-wdel]').forEach(function (b) { b.addEventListener('click', function () { room.walls.splice(+b.dataset.wdel, 1); save(); renderWalls(); refreshPreview(); }); });
      }
      renderWalls();
      var mount = document.getElementById('measure-mount');
      var mopts = { count: function () { return room.walls.length; }, ceiling: function () { return { m: n(room.H) || n(S.rules.ceiling_height_m) || 2.4, assumed: !n(room.H) }; }, onCeiling: function (m) { room.H = Math.round(m * 100) / 100; save(); },
        onSave: function (rec) { room.walls.push(rec); room.method = 'measured'; save(); renderWalls(); refreshPreview(); toast('Wall saved'); } };
      var mounted = false;
      function ensureMount() { if (!mounted && room.method === 'measured') { window.__qcMeasure = QCMeasure.mount(mount, mopts); mounted = true; } }
      ensureMount();
      // LiDAR import
      var imp = document.createElement('div'); imp.className = 'row'; imp.innerHTML = '<label class="btn ghost sm">Import a LiDAR scan (RoomPlan JSON)<input type="file" accept=".json,application/json" id="lidar"></label><span class="hint">From an iPhone Pro room-scanning app.</span>';
      document.getElementById('measured').appendChild(imp);
      document.getElementById('lidar').addEventListener('change', function () {
        var f = this.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { try { var added = importRoomPlan(JSON.parse(fr.result), room); room.method = 'measured'; save(); renderWalls(); refreshPreview(); toast(added + ' wall' + (added === 1 ? '' : 's') + ' imported'); } catch (e) { toast('That file is not a RoomPlan export.'); } }; fr.readAsText(f); this.value = '';
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
          var ga = w.gross_area_m2 || +(w.width_mm * w.height_mm / 1e6).toFixed(3), ops = (w.openings || []).map(function (o) { return { type: o.type === 'window' ? 'window' : 'door', width_mm: Math.round(o.width_mm), height_mm: Math.round(o.height_mm), area_m2: +(o.area_m2 || o.width_mm * o.height_mm / 1e6).toFixed(3) }; });
          room.walls.push({ wall: w.wall || ('Scanned wall ' + (room.walls.length + 1)), width_mm: Math.round(w.width_mm), height_mm: Math.round(w.height_mm), gross_area_m2: ga, openings: ops, paint_area_m2: +(w.paint_area_m2 || (ga - ops.reduce(function (s, o) { return s + o.area_m2; }, 0))).toFixed(3), method: w.method || 'roomplan-lidar', expected_error_pct: w.expected_error_pct || 2, measured_at: new Date().toISOString() });
          added++; return;
        }
        var d = dims(w); if (!(d[0] > 0 && d[1] > 0)) return; var wp = pos(w);
        var o = opens.filter(function (x) { if (x.parentIdentifier) return x.parentIdentifier === w.identifier; var xp = pos(x); return wp && xp && Math.hypot(xp[0] - wp[0], xp[1] - wp[1], xp[2] - wp[2]) < Math.max(0.6, d[0] / 2 + 0.3); })
          .map(function (x) { var xd = dims(x); return { type: (x.category && x.category.window) || (r.windows || []).indexOf(x) >= 0 ? 'window' : 'door', width_mm: Math.round(xd[0] * 1000), height_mm: Math.round(xd[1] * 1000), area_m2: +(xd[0] * xd[1]).toFixed(3) }; });
        var gross = d[0] * d[1], oa = o.reduce(function (s, x) { return s + x.area_m2; }, 0);
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
    if (!det.trading_name || !det.bsb) html += '<div class="card"><p class="confirm">Your business name or bank details are missing. <a href="#/settings">Fill them in</a> before this goes to a client.</p></div>';
    if (priced.confirm.length) html += '<div class="card"><p class="confirm">Lines to confirm before sending:</p><ul class="hint">' + priced.confirm.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div>';
    html += '<div class="card"><table><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Amount</th></tr></thead><tbody>' + priced.lines.map(function (l) { return '<tr><td>' + (l.room !== 'Extras' && l.room !== 'Travel' ? '<span class="tag">' + esc(l.room) + '</span><br>' : '') + esc(l.desc) + (l.confirm ? ' <span class="confirm">TO CONFIRM</span>' : '') + '<br><span class="hint">' + esc(l.source) + ' · ' + money(l.rate) + '/' + esc(l.unit) + '</span></td><td class="n">' + l.qty + ' ' + esc(l.unit) + '</td><td class="n">' + money(l.amount) + '</td></tr>'; }).join('') + '</tbody><tfoot>' +
      '<tr class="sub"><td colspan="2" class="n">Subtotal' + (priced.minimum_applied ? ' (minimum job)' : '') + '</td><td class="n">' + money(priced.subtotal) + '</td></tr>' + (priced.gst ? '<tr class="sub"><td colspan="2" class="n">GST 10%</td><td class="n">' + money(priced.gst) + '</td></tr>' : '') + '<tr class="total"><td colspan="2" class="n">Total' + (priced.gst ? ' inc GST' : '') + '</td><td class="n">' + money(priced.total) + '</td></tr></tfoot></table>';
    html += '<p class="hint">' + (priced.measured_rooms ? priced.measured_rooms + ' of ' + priced.total_rooms + ' rooms measured from photos. ' : (priced.total_rooms ? 'Nothing measured yet; this is an estimate from typed sizes. ' : '')) + 'Deposit ' + esc(det.deposit_pct) + '%: ' + money(priced.deposit) + '.</p>';
    if (priced.assumptions.length) html += '<div><b style="font-size:.9rem">Based on</b><ul class="hint">' + priced.assumptions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>';
    html += '</div>';
    html += '<div class="card"><div class="row"><button class="btn tape" id="pdf">Make the PDF</button><button class="btn ghost" id="sharetext">Share a summary</button></div><p class="hint">The PDF opens your share sheet: text it, WhatsApp it, email it. Nothing is sent by the app itself.</p>' +
      '<div class="row">' + (job.status === 'draft' || job.status === 'quoted' ? '<button class="btn sm" id="accepted">Client said yes</button><button class="btn ghost sm" id="declined">Declined</button>' : '') + (job.status === 'accepted' || job.status === 'invoiced' ? '<a class="btn sm" href="#/job/' + job.id + '/invoice">Invoice</a>' : '') + '</div></div>';
    if (job.quote) html += '<p class="hint">Quote dated ' + QCPdf.fmtDate(job.quote.date) + (job.sent_date ? ', sent ' + QCPdf.fmtDate(job.sent_date) : '') + '.</p>';
    $app.innerHTML = html;
    function freeze() { var d = QCStore.today(); job.quote = { date: job.quote && job.quote.date ? job.quote.date : d, lines: priced.lines, subtotal: priced.subtotal, gst: priced.gst, total: priced.total, deposit: priced.deposit, assumptions: priced.assumptions, measured_rooms: priced.measured_rooms, total_rooms: priced.total_rooms }; if (job.status === 'draft') job.status = 'quoted'; if (!job.sent_date) job.sent_date = d; save(); }
    document.getElementById('pdf').addEventListener('click', function () {
      freeze(); try { var d = QCPdf.quotePDF(job, S, priced); QCPdf.deliver(d, job.quote_no + ' ' + (job.client.name || 'quote').replace(/[^\w ]+/g, '') + '.pdf').then(function (how) { toast(how === 'shared' ? 'Shared' : 'PDF saved to your downloads'); viewQuote(job); }); } catch (e) { toast('PDF failed: ' + e.message); }
    });
    document.getElementById('sharetext').addEventListener('click', function () {
      freeze(); var t = 'Quote ' + job.quote_no + ' for ' + (job.client.name || '') + (job.summary ? ': ' + job.summary : '') + '\nTotal ' + money(priced.total) + (priced.gst ? ' inc GST' : '') + '. Deposit ' + money(priced.deposit) + ' to book.\nValid ' + det.quote_valid_days + ' days. Full PDF attached separately.\n' + det.sign_off + (det.owner_name ? ', ' + det.owner_name : '');
      if (navigator.share) navigator.share({ text: t }).catch(function () {}); else { navigator.clipboard && navigator.clipboard.writeText(t); toast('Copied'); }
    });
    var acc = document.getElementById('accepted'); if (acc) acc.addEventListener('click', function () { freeze(); job.status = 'accepted'; save(); toast('Marked accepted'); viewQuote(job); });
    var dec = document.getElementById('declined'); if (dec) dec.addEventListener('click', function () { job.status = 'declined'; save(); viewQuote(job); });
  }

  // ---------- Invoice
  function viewInvoice(job) {
    if (!job.quote) return go('/job/' + job.id + '/quote');
    var det = S.details, q = job.quote, gstOn = !!det.gst;
    var depositPaid = job.invoices.filter(function (i) { return i.kind === 'deposit' && i.paid_date; }).reduce(function (s, i) { return s + i.total; }, 0);
    var html = '<a class="hint" href="#/job/' + job.id + '/quote">&larr; Quote</a><h1>Invoice</h1>';
    if (job.invoices.length) html += '<div class="card"><h3>Invoices so far</h3><table>' + job.invoices.map(function (i, k) { return '<tr><td>' + esc(i.no) + '<br><span class="hint">' + esc(i.kind) + ', due ' + QCPdf.fmtDate(i.due) + '</span></td><td class="n">' + money(i.total) + '</td><td class="n">' + (i.paid_date ? '<span class="pill ok">paid</span>' : '<button class="btn sm" data-paid="' + k + '">Mark paid</button> <button class="btn ghost sm" data-repdf="' + k + '">PDF</button>') + '</td></tr>'; }).join('') + '</table></div>';
    html += '<div class="card"><label class="f">What to invoice<select id="kind"><option value="deposit">Deposit, ' + esc(det.deposit_pct) + '% of the quote</option><option value="final">Final, balance after deposit plus variations</option><option value="full">Full amount in one invoice</option></select></label>' +
      '<div id="vars" hidden><b style="font-size:.9rem">Variations agreed in writing</b><div id="varlist"></div><button class="btn ghost sm" id="addvar">+ Variation</button></div>' +
      '<div id="invprev"></div><button class="btn tape" id="mkinv">Make invoice PDF</button></div>';
    $app.innerHTML = html;
    var vars = [];
    function build() {
      var kind = document.getElementById('kind').value, lines = [], subtotal, gst, total, kindLine;
      var toEx = function (inc) { return gstOn ? Math.round(inc / 1.1) : inc; };
      if (kind === 'deposit') { total = Math.round(q.total * n(det.deposit_pct, 20) / 100); subtotal = toEx(total); gst = total - subtotal; lines = [{ desc: 'Deposit, ' + det.deposit_pct + '% of quote ' + job.quote_no + ' (' + money(q.total) + ')', amount: subtotal }]; kindLine = 'Deposit to confirm the booking.'; }
      else if (kind === 'full') { lines = q.lines.map(function (l) { return { desc: (l.room && l.room !== 'Extras' && l.room !== 'Travel' ? l.room + ': ' : '') + l.desc, amount: l.amount }; }); subtotal = q.subtotal; gst = q.gst; total = q.total; kindLine = 'Work completed as quoted in ' + job.quote_no + '.'; }
      else { lines = [{ desc: 'Work as quoted in ' + job.quote_no, amount: q.subtotal }]; vars.forEach(function (v) { if (v.desc || v.amount) lines.push({ desc: 'Variation: ' + (v.desc || ''), amount: Math.round(n(v.amount)) }); }); subtotal = lines.reduce(function (s, l) { return s + l.amount; }, 0); if (depositPaid) { var depEx = toEx(depositPaid); lines.push({ desc: 'Less deposit paid', amount: -depEx }); subtotal -= depEx; } gst = gstOn ? Math.round(subtotal * 0.1) : 0; total = subtotal + gst; kindLine = 'Final invoice on completion' + (vars.length ? ', including agreed variations' : '') + '.'; }
      return { kind: kind, lines: lines, subtotal: subtotal, gst: gst, total: total, kind_line: kindLine };
    }
    function preview() { var inv = build(); document.getElementById('vars').hidden = inv.kind !== 'final'; document.getElementById('invprev').innerHTML = '<table>' + inv.lines.map(function (l) { return '<tr><td>' + esc(l.desc) + '</td><td class="n">' + money(l.amount) + '</td></tr>'; }).join('') + '<tr class="sub"><td class="n">Subtotal</td><td class="n">' + money(inv.subtotal) + '</td></tr>' + (inv.gst ? '<tr class="sub"><td class="n">GST 10%</td><td class="n">' + money(inv.gst) + '</td></tr>' : '') + '<tr class="total"><td class="n">Total</td><td class="n">' + money(inv.total) + '</td></tr></table><p class="hint">Due ' + QCPdf.fmtDate(QCStore.addDays(QCStore.today(), inv.kind === 'deposit' ? 0 : parseInt(det.balance_days, 10) || 7)) + '.</p>'; }
    function renderVars() { var box = document.getElementById('varlist'); box.innerHTML = vars.map(function (v, i) { return '<div class="row" data-v="' + i + '"><input type="text" placeholder="What was added" style="flex:2 1 10em" value="' + esc(v.desc) + '"><input type="number" placeholder="$ ex GST" style="flex:1 1 6em" value="' + esc(v.amount) + '"></div>'; }).join(''); box.querySelectorAll('[data-v]').forEach(function (row) { var i = +row.dataset.v, ins = row.querySelectorAll('input'); ins[0].addEventListener('input', function () { vars[i].desc = ins[0].value; preview(); }); ins[1].addEventListener('input', function () { vars[i].amount = ins[1].value; preview(); }); }); }
    document.getElementById('kind').addEventListener('change', preview); document.getElementById('addvar').addEventListener('click', function () { vars.push({ desc: '', amount: '' }); renderVars(); preview(); });
    preview();
    document.getElementById('mkinv').addEventListener('click', function () {
      var inv = build(); inv.no = QCStore.nextInvoiceNo(); inv.date = QCStore.today(); inv.due = QCStore.addDays(inv.date, inv.kind === 'deposit' ? 0 : parseInt(det.balance_days, 10) || 7); inv.paid_date = '';
      job.invoices.push(inv); job.status = 'invoiced'; save();
      try { QCPdf.deliver(QCPdf.invoicePDF(job, inv, S), inv.no + ' ' + (job.client.name || 'invoice').replace(/[^\w ]+/g, '') + '.pdf').then(function (how) { toast(how === 'shared' ? 'Shared' : 'PDF saved to your downloads'); viewInvoice(job); }); } catch (e) { toast('PDF failed: ' + e.message); }
    });
    $app.querySelectorAll('[data-paid]').forEach(function (b) { b.addEventListener('click', function () { var i = job.invoices[+b.dataset.paid]; i.paid_date = QCStore.today(); if (job.invoices.every(function (x) { return x.paid_date; }) && (i.kind === 'final' || i.kind === 'full')) job.status = 'paid'; save(); toast('Marked paid'); viewInvoice(job); }); });
    $app.querySelectorAll('[data-repdf]').forEach(function (b) { b.addEventListener('click', function () { var i = job.invoices[+b.dataset.repdf]; QCPdf.deliver(QCPdf.invoicePDF(job, i, S), i.no + '.pdf'); }); });
  }

  // ---------- Chase
  function chaseText(kind, job, item, days) {
    var det = S.details, f = first(job.client.name), so = det.sign_off + (det.owner_name ? ', ' + det.owner_name : ''), bank = [det.account_name ? 'Account name ' + det.account_name : '', det.bsb ? 'BSB ' + det.bsb : '', det.account_number ? 'Account ' + det.account_number : ''].filter(Boolean).join(', ');
    if (kind === 'quote') return { sms: 'Hi ' + f + ', just checking in on the quote (' + job.quote_no + ', ' + money(job.quote.total) + ') for ' + (job.summary || 'the painting') + '. Any questions, or keen to lock in a date? ' + so, subject: 'Checking in on your quote ' + job.quote_no, email: 'Hi ' + f + ',\n\nJust checking in on the quote I sent for ' + (job.summary || 'the painting') + ' (' + job.quote_no + ', ' + money(job.quote.total) + '). No rush, but if you have any questions or want to get a start date in the diary, let me know.\n\n' + so };
    var amt = money(item.total), due = QCPdf.fmtDate(item.due);
    if (days <= 7) return { sms: 'Hi ' + f + ', a quick nudge on invoice ' + item.no + ' for ' + amt + ', due ' + due + '. Could you send it through when you get a sec? ' + bank + '. ' + so, subject: 'Invoice ' + item.no + ' (' + amt + ')', email: 'Hi ' + f + ',\n\nJust a quick nudge on invoice ' + item.no + ' for ' + amt + ', which was due ' + due + '. Easy to miss, so no stress. Payment details: ' + bank + '. Reference ' + item.no + '.\n\n' + so };
    if (days <= 21) return { sms: 'Hi ' + f + ', following up on invoice ' + item.no + ' for ' + amt + ', due ' + due + ' and still outstanding. If there is a problem with the work please tell me, otherwise could you pay it this week? ' + bank + '. ' + so, subject: 'Following up: invoice ' + item.no + ' (' + amt + ')', email: 'Hi ' + f + ',\n\nFollowing up on invoice ' + item.no + ' for ' + amt + ', which was due ' + due + ' and is still outstanding. If there is anything about the work holding this up, tell me and I will sort it. Otherwise, could you get it paid this week?\n\nPayment details: ' + bank + '. Reference ' + item.no + '.\n\n' + so };
    var by = QCPdf.fmtDate(QCStore.addDays(QCStore.today(), 7));
    return { sms: 'Hi ' + f + ', invoice ' + item.no + ' for ' + amt + ' is now ' + days + ' days overdue. Please pay by ' + by + ', or let me know today if we need a payment plan. After that I will have to pass it on. ' + so, subject: 'Final reminder: invoice ' + item.no + ' (' + amt + ')', email: 'Hi ' + f + ',\n\nInvoice ' + item.no + ' for ' + amt + ' is now ' + days + ' days overdue. Please pay by ' + by + ', or contact me today if you need a payment plan. If I have not heard from you by then I will have to pass it on for collection, which I would rather not do.\n\nPayment details: ' + bank + '. Reference ' + item.no + '.\n\n' + so };
  }
  function viewChase() {
    var today = QCStore.today(), rows = [], owed = 0;
    S.jobs.forEach(function (j) {
      (j.invoices || []).forEach(function (i) { if (!i.paid_date && i.due < today) { var d = QCStore.daysBetween(i.due, today); owed += i.total; rows.push({ kind: 'invoice', job: j, item: i, days: d, tone: d <= 7 ? 'First reminder' : d <= 21 ? 'Second reminder' : 'Final reminder' }); } });
      if (j.status === 'quoted' && j.quote) { var since = QCStore.daysBetween(j.sent_date || j.quote.date, today); if (since >= 7) rows.push({ kind: 'quote', job: j, item: j.quote, days: since, tone: 'Friendly follow-up' }); }
    });
    rows.sort(function (a, b) { return b.days - a.days; });
    var html = '<h1>Monday morning</h1><p class="muted">Who owes you, and quotes waiting on an answer. Tap Text or Email and the message is written for you. Nothing sends until you press send.</p>';
    html += '<div class="card"><div class="row between"><span>Outstanding</span><h2>' + money(owed) + '</h2></div></div>';
    if (!rows.length) html += '<div class="card empty">Nothing overdue and no quotes waiting. Good week.</div>';
    rows.forEach(function (r, k) {
      var j = r.job, t = chaseText(r.kind, j, r.item, r.days), recent = j.last_chased && QCStore.daysBetween(j.last_chased, today) < 5;
      var sms = 'sms:' + (j.client.phone || '').replace(/\s+/g, '') + '?&body=' + encodeURIComponent(t.sms), mail = 'mailto:' + (j.client.email || '') + '?subject=' + encodeURIComponent(t.subject) + '&body=' + encodeURIComponent(t.email);
      html += '<div class="card"><div class="row between"><div><b>' + esc(j.client.name || j.quote_no) + '</b><span class="hint"> · ' + (r.kind === 'invoice' ? esc(r.item.no) + ', ' + money(r.item.total) + ', ' + r.days + ' days overdue' : esc(j.quote_no) + ', ' + money(j.quote.total) + ', waiting ' + r.days + ' days') + '</span></div><span class="pill ' + (r.days > 21 && r.kind === 'invoice' ? 'bad' : r.days > 7 ? 'warn' : '') + '">' + r.tone + '</span></div>' + (recent ? '<p class="hint">Chased ' + QCStore.daysBetween(j.last_chased, today) + ' day(s) ago. Maybe give it a moment.</p>' : '') +
        '<div class="msg">' + esc(t.sms) + '</div><div class="row"><a class="btn tape sm" href="' + sms + '">Text</a><a class="btn sm" href="' + mail + '">Email</a><button class="btn ghost sm" data-copy="' + k + '">Copy</button><button class="btn ghost sm" data-chased="' + j.id + '">Mark chased today</button><a class="btn ghost sm" href="#/job/' + j.id + '">Open job</a></div></div>';
      r.text = t;
    });
    $app.innerHTML = html;
    $app.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { var t = rows[+b.dataset.copy].text.sms; if (navigator.clipboard) navigator.clipboard.writeText(t); toast('Copied'); }); });
    $app.querySelectorAll('[data-chased]').forEach(function (b) { b.addEventListener('click', function () { var j = QCStore.getJob(b.dataset.chased); j.last_chased = today; save(); toast('Noted'); viewChase(); }); });
  }

  // ---------- Settings
  function viewSettings() {
    var d = S.details, html = '<h1>Set-up</h1>';
    html += '<div class="card"><h2>Your business</h2><div class="g2"><label class="f">Trading name<input type="text" data-bind="details.trading_name"></label><label class="f">Your name<input type="text" data-bind="details.owner_name"></label><label class="f">ABN<input type="text" data-bind="details.abn"></label><label class="f">Mobile<input type="tel" data-bind="details.phone"></label><label class="f">Email<input type="email" data-bind="details.email"></label><label class="f">Service area<input type="text" data-bind="details.service_area"></label></div><label class="f">Address for invoices<input type="text" data-bind="details.address"></label><div class="g2"><label class="f">Licence no.<span>if any</span><input type="text" data-bind="details.licence"></label><label class="f">Insurance line<span>e.g. Public liability $10m</span><input type="text" data-bind="details.insurance"></label></div>' +
      '<div class="row"><label class="btn ghost sm">Logo<input type="file" id="logo" accept="image/*"></label>' + (d.logo ? '<img src="' + d.logo + '" alt="" style="height:36px"> <button class="btn ghost sm" id="nologo">remove</button>' : '<span class="hint">optional, goes top-left of quotes</span>') + '</div></div>';
    html += '<div class="card"><h2>Getting paid</h2><div class="g3"><label class="f">Account name<input type="text" data-bind="details.account_name"></label><label class="f">BSB<input type="text" data-bind="details.bsb" inputmode="numeric"></label><label class="f">Account no.<input type="text" data-bind="details.account_number" inputmode="numeric"></label></div><label class="f">Other ways you accept payment<input type="text" data-bind="details.other_payments"></label><div class="g3"><label class="f">Deposit %<input type="number" data-bind="details.deposit_pct" min="0" max="100"></label><label class="f">Balance due, days<input type="number" data-bind="details.balance_days" min="0"></label><label class="f">Quote valid, days<input type="number" data-bind="details.quote_valid_days" min="1"></label></div><label class="btn ghost sm"><input type="checkbox" data-bind="details.gst"> Registered for GST (add 10%)</label></div>';
    html += '<div class="card"><h2>How you sign off</h2><p class="hint">Reminder texts and emails end with this.</p><div class="g2"><label class="f">Sign-off<span>e.g. Cheers</span><input type="text" data-bind="details.sign_off"></label></div></div>';
    html += '<div class="card"><h2>Your prices</h2><p class="hint">Ex GST, labour and mid-range paint included. Blank a line you never do; it will show as "no rate" if a job needs it.</p><table><thead><tr><th>Item</th><th class="n">$ per</th></tr></thead><tbody>' + QCStore.PRICE_ITEMS.map(function (p, i) { return (i === 0 || p[4] !== QCStore.PRICE_ITEMS[i - 1][4] ? '<tr><td colspan="2"><span class="tag">' + (p[4] === 'interior' ? 'Interior' : 'Exterior') + '</span></td></tr>' : '') + '<tr><td>' + esc(p[1]) + '<br><span class="hint">' + esc(p[5]) + '</span></td><td class="n"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap"><input type="number" step="0.5" min="0" data-price="' + p[0] + '" value="' + (S.prices[p[0]] == null ? '' : S.prices[p[0]]) + '" style="width:5.5em;text-align:right"><span class="hint">/' + esc(p[2]) + '</span></div></td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="g3"><label class="f">Minimum job $<input type="number" data-bind="rules.minimum_job" min="0"></label><label class="f">Travel $/km<input type="number" step="0.1" data-bind="rules.travel_per_km" min="0"></label><label class="f">Premium paint +%<input type="number" data-bind="rules.premium_paint_pct" min="0"></label><label class="f">Usual ceiling m<input type="number" step="0.1" data-bind="rules.ceiling_height_m" min="2"></label></div></div>';
    html += '<div class="card"><h2>Quote wording</h2><label class="f">Included<span>one per line</span><textarea id="w_inc" rows="5">' + esc(S.wording.included.join('\n')) + '</textarea></label><label class="f">Not included<span>one per line</span><textarea id="w_exc" rows="5">' + esc(S.wording.excluded.join('\n')) + '</textarea></label><div class="g2"><label class="f">Workmanship guarantee, years<input type="number" data-bind="wording.warranty_years" min="0"></label></div><label class="f">How to accept<textarea data-bind="wording.accept" rows="3"></textarea></label></div>';
    html += '<div class="card"><h2>Back-up</h2><p class="hint">Everything lives on this phone. Save a copy now and then; email it to yourself.</p><div class="row"><button class="btn sm" id="export">Save back-up file</button><label class="btn ghost sm">Restore from file<input type="file" id="import" accept=".json,application/json"></label><button class="btn danger sm" id="reset">Wipe everything</button></div></div>';
    $app.innerHTML = html;
    bindAll($app, S);
    $app.querySelectorAll('[data-price]').forEach(function (el) { el.addEventListener('input', function () { S.prices[el.dataset.price] = el.value === '' ? null : n(el.value); save(); }); });
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
      '<li><span><b>Set-up once.</b> Your name, bank details, your prices. Three minutes.</span></li>' +
      '<li><span><b>On site:</b> new job, add a room, photograph the whole wall corner to corner, tap its four corners. Type the ceiling height once (or tap a door: they are 2.04 m). Then tap the doors and windows. Save. Next wall.</span></li>' +
      '<li><span><b>Build the quote.</b> Every line shows where its number came from. Fix anything marked TO CONFIRM. Make the PDF and send it from your phone.</span></li>' +
      '<li><span><b>Client says yes:</b> tap it, then invoice the deposit. On completion, the final.</span></li>' +
      '<li><span><b>Monday:</b> the Chase tab writes the reminders. You tap Text.</span></li></ol></div>' +
      '<div class="card"><h3>How can a photo measure a wall?</h3><p class="muted">The four corners tell the phone the wall\'s exact shape (the camera\'s own lens geometry does the perspective maths). One known size then sets the scale: your ceiling height, a standard door, a power point plate, or anything you put a tape on. Expect about two percent. Typed sizes are estimates, and the quote says so.</p></div>' +
      '<div class="card"><h3>Where is my data?</h3><p class="muted">On this phone, in the browser. Nothing is uploaded anywhere. Save a back-up from Set-up now and then, and email it to yourself.</p></div>';
  }

  route();
  window.__qcApp = { route: route, store: QCStore, pricing: QCPricing };
})();
