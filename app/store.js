/* Quote & Chase app: local store. Everything lives in this browser (localStorage), exportable as one JSON file. */
(function () {
  'use strict';
  var KEY = 'qc-app-v1';

  var PRICE_ITEMS = [
    // key, label, unit, default rate, group, note
    ['p_walls', 'Walls, 2 coats, light prep', 'm²', 22, 'interior', 'standard low-sheen acrylic'],
    ['p_ceilings', 'Ceilings, 2 coats', 'm²', 25, 'interior', 'flat ceiling white'],
    ['p_skirting', 'Skirting boards and architraves', 'lm', 9, 'interior', 'gloss or semi-gloss enamel'],
    ['p_door', 'Door, both sides incl. frame', 'each', 95, 'interior', 'flush door; add 30 for panelled'],
    ['p_door_one', 'Door, one side only incl. frame', 'each', 55, 'interior', 'e.g. hallway side of bedroom doors'],
    ['p_window', 'Window frame, interior', 'each', 65, 'interior', ''],
    ['p_wardrobe', 'Wardrobe doors, per pair', 'each', 120, 'interior', ''],
    ['p_feature', 'Feature wall, colour change', 'm²', 28, 'interior', 'extra coat allowed'],
    ['p_wallpaper', 'Wallpaper removal', 'm²', 16, 'interior', ''],
    ['p_prep_mod', 'Moderate prep (patching, sanding)', 'hour', 65, 'interior', ''],
    ['p_prep_heavy', 'Heavy prep (water damage, peeling)', 'hour', 80, 'interior', ''],
    ['p_sealer', 'Stain block or sealer coat', 'm²', 8, 'interior', ''],
    ['p_weatherboard', 'Weatherboards, 2 coats', 'm²', 38, 'exterior', 'includes wash down'],
    ['p_render', 'Render or brick, 2 coats', 'm²', 30, 'exterior', ''],
    ['p_eaves', 'Eaves and fascia', 'lm', 16, 'exterior', ''],
    ['p_gutters', 'Gutters and downpipes', 'lm', 12, 'exterior', ''],
    ['p_ext_door', 'Exterior door, both sides', 'each', 140, 'exterior', ''],
    ['p_ext_window', 'Exterior window, frame and sill', 'each', 95, 'exterior', ''],
    ['p_deck', 'Deck oil, 2 coats', 'm²', 24, 'exterior', 'includes clean'],
    ['p_fence', 'Fence, one side, 2 coats', 'm²', 18, 'exterior', ''],
    ['p_pressure', 'Pressure wash before painting', 'm²', 4, 'exterior', ''],
    ['p_scaffold', 'Scaffold or high-access allowance', 'day', 350, 'exterior', 'two storey and above']
  ];

  function defaults() {
    var prices = {}; PRICE_ITEMS.forEach(function (p) { prices[p[0]] = p[3]; });
    return {
      version: 1,
      details: { trading_name: '', owner_name: '', abn: '', phone: '', email: '', address: '', service_area: '', licence: '', insurance: '',
        account_name: '', bsb: '', account_number: '', other_payments: 'Bank transfer or cash', deposit_pct: 20, balance_days: 7, quote_valid_days: 30, gst: true,
        voice: 'friendly', sign_off: 'Cheers', logo: '', postcode: '5000' },
      prices: prices,
      rules: { minimum_job: 450, travel_per_km: 1.5, premium_paint_pct: 15, ceiling_height_m: 2.4, round_up_cm: 0, free_radius_km: 25, travel_return: true, road_factor: 1.3 },
      costing: (window.QCCosting ? QCCosting.defaults() : {}),
      follow_up: { quote_days: [3, 7, 14], invoice_days: [1, 7, 21], remind_hour: 8 },
      stripe: { key: '', enabled: false },
      sending: { server: '', token: '', server_has_creds: false, twilio_sid: '', twilio_token: '', twilio_service: '', twilio_from: '', resend_key: '', resend_from: '', auto_sms: true, auto_email: true, email_quotes: true },
      booking: { start_hour: 7, end_hour: 15, quote_from: 7, quote_to: 18, visit_minutes: 30, saturdays: true, sundays: false },
      wording: {
        included: ['Drop sheets and plastic protection for floors, furniture and fittings.',
          'Preparation: filling minor holes and cracks, light sanding, dusting and spot priming.',
          'Two coats of quality trade paint in your chosen colours.',
          'Daily clean-up and rubbish removal.',
          'All labour, materials and equipment.'],
        excluded: ['Moving heavy furniture, pianos or built-in items.',
          'Plaster, timber or render repairs beyond the preparation described.',
          'Lead paint or asbestos testing or removal.',
          'Colour consulting. Colours to be chosen before work starts.',
          'Anything not listed in this quote. Extra work is agreed in writing before it starts.'],
        warranty_years: 5,
        accept: 'To accept, reply by text or email with your preferred start week and pay the deposit to the account below. We will confirm the date within one business day.'
      },
      jobs: [],
      next_quote: 1001,
      next_invoice: 2001,
      setup_done: false
    };
  }

  var state = null;
  function hydrate() {
    if (!state || typeof state !== 'object' || Array.isArray(state)) state = defaults();
    var d = defaults();
    ['details', 'prices', 'rules', 'wording', 'costing', 'follow_up', 'stripe', 'booking', 'sending'].forEach(function (k) { state[k] = Object.assign({}, d[k], state[k] && typeof state[k] === 'object' ? state[k] : {}); });
    if (!state.costing.paint_price) state.costing.paint_price = d.costing.paint_price;
    if (!Array.isArray(state.wording.included)) state.wording.included = d.wording.included; if (!Array.isArray(state.wording.excluded)) state.wording.excluded = d.wording.excluded;
    // older installs carry the first-release wording; if it was never edited, move it to the current defaults
    if (/^Reply to this quote by text or email with "accepted"/.test(state.wording.accept || '')) state.wording.accept = d.wording.accept;
    if (/^Protection of floors, furniture and fittings/.test(state.wording.included[0] || '')) state.wording.included = d.wording.included;
    if (/beyond the prep described/.test(state.wording.excluded[1] || '')) state.wording.excluded = d.wording.excluded;
    if (!Array.isArray(state.follow_up.quote_days) || !state.follow_up.quote_days.length) state.follow_up.quote_days = d.follow_up.quote_days; if (!Array.isArray(state.follow_up.invoice_days) || !state.follow_up.invoice_days.length) state.follow_up.invoice_days = d.follow_up.invoice_days;
    if (!Array.isArray(state.jobs)) state.jobs = [];
    state.jobs = state.jobs.filter(function (j) { return j && typeof j === 'object'; }).map(normaliseJob);
    if (!state.next_quote) state.next_quote = 1001; if (!state.next_invoice) state.next_invoice = 2001;
    return state;
  }
  function load() {
    if (state) return state;
    try { var raw = localStorage.getItem(KEY); state = raw ? JSON.parse(raw) : defaults(); } catch (e) { state = defaults(); }
    return hydrate();
  }
  var lastError = '';
  function save() { try { if (state && Array.isArray(state.jobs)) state.jobs.forEach(function (j) { if (j && typeof j === 'object') { j.id = String(j.id || '').replace(/[^A-Za-z0-9_-]/g, '') || uid(); (Array.isArray(j.rooms) ? j.rooms : []).forEach(function (r) { if (r && typeof r === 'object') r.id = String(r.id || '').replace(/[^A-Za-z0-9_-]/g, '') || uid(); }); } });
    state.rev = (state.rev || 0) + 1; state.saved_at = Date.now(); localStorage.setItem(KEY, JSON.stringify(state)); lastError = ''; return true; } catch (e) { lastError = (e && e.message) || 'save failed'; return false; } }
  // Fill anything a job record may be missing (old backups, hand-edited files) so no screen can trip on it
  function normaliseJob(j) {
    j.id = String(j.id || '').replace(/[^A-Za-z0-9_-]/g, '') || uid(); j.quote_no = String(j.quote_no || 'Q-?'); j.status = j.status || 'draft'; j.created = j.created || today();
    j.client = Object.assign({ name: '', phone: '', email: '', address: '' }, j.client && typeof j.client === 'object' ? j.client : {}); ['name', 'phone', 'email', 'address'].forEach(function (k) { j.client[k] = j.client[k] == null ? '' : String(j.client[k]); });
    j.summary = j.summary == null ? '' : String(j.summary); j.notes = j.notes == null ? '' : String(j.notes);
    j.rooms = (Array.isArray(j.rooms) ? j.rooms : []).filter(function (r) { return r && typeof r === 'object'; }).map(function (r) { r.id = String(r.id || '').replace(/[^A-Za-z0-9_-]/g, '') || uid(); r.type = r.type === 'exterior' ? 'exterior' : 'interior'; r.method = r.method === 'measured' ? 'measured' : 'typed'; r.walls = (Array.isArray(r.walls) ? r.walls : []).filter(function (w) { return w && typeof w === 'object'; }).map(function (w) { w.openings = Array.isArray(w.openings) ? w.openings : []; w.width_mm = +w.width_mm || 0; w.height_mm = +w.height_mm || 0; w.paint_area_m2 = +w.paint_area_m2 || 0; w.wall = w.wall || 'Wall'; w.expected_error_pct = w.expected_error_pct == null ? '' : w.expected_error_pct; return w; }); r.surfaces = Object.assign({ walls: true, ceiling: true, skirting: true }, r.surfaces || {}); r.ext = r.ext && typeof r.ext === 'object' ? r.ext : {}; return r; });
    j.extras = (Array.isArray(j.extras) ? j.extras : []).filter(function (x) { return x && typeof x === 'object'; });
    j.invoices = (Array.isArray(j.invoices) ? j.invoices : []).filter(function (i) { return i && typeof i === 'object'; }).map(function (i) { i.lines = Array.isArray(i.lines) ? i.lines : []; i.follow_ups = Array.isArray(i.follow_ups) ? i.follow_ups : []; i.total = +i.total || 0; i.no = i.no || 'INV-?'; i.due = i.due || today(); return i; });
    j.follow_ups = Array.isArray(j.follow_ups) ? j.follow_ups : []; if (j.quote && typeof j.quote !== 'object') j.quote = null; if (j.quote && !Array.isArray(j.quote.lines)) j.quote.lines = [];
    if (j.booking && (typeof j.booking !== 'object' || !j.booking.start)) j.booking = null; if (j.visit && (typeof j.visit !== 'object' || !j.visit.date)) j.visit = null; if (j.picks && !Array.isArray(j.picks)) j.picks = [];
    return j;
  }
  // another tab or window wrote: drop the cached copy so the next load reads theirs, and re-render if the app is up
  if (typeof window.addEventListener === 'function') window.addEventListener('storage', function (e) { if (e.key !== KEY) return; state = null; if (window.__qcApp && window.__qcApp.route) { try { window.__qcApp.route(); } catch (err) {} } });
  function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }
  // Dates are LOCAL calendar dates (yyyy-mm-dd), never UTC: a painter in Adelaide is 9.5 hours ahead of UTC.
  function localIso(d) { return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate(); }
  function today() { return localIso(new Date()); }
  function addDays(iso, n) { var p = String(iso || today()).split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + (parseInt(n, 10) || 0)); return localIso(d); }
  function daysBetween(a, b) { var pa = String(a).split('-'), pb = String(b).split('-'); return Math.round((new Date(+pb[0], +pb[1] - 1, +pb[2]) - new Date(+pa[0], +pa[1] - 1, +pa[2])) / 86400000); }

  function newJob() {
    var s = load();
    var job = { id: uid(), quote_no: 'Q-' + s.next_quote, created: today(), status: 'draft',
      client: { name: '', phone: '', email: '', address: '' }, summary: '', rooms: [], extras: [], travel_km: 0, premium_paint: false,
      quote: null, invoices: [], notes: '', last_chased: '', sent_date: '', booking: null, follow_ups: [] };
    s.next_quote += 1; s.jobs.unshift(job); save(); return job;
  }
  function newRoom(type) {
    return { id: uid(), name: '', type: type || 'interior', method: 'typed', L: '', W: '', H: '', walls: [], ceiling_m2: '',
      condition: 'good', surfaces: { walls: true, ceiling: true, skirting: true }, doors: 0, doors_one_side: 0, windows: 0, wardrobe_pairs: 0,
      feature_m2: 0, wallpaper_m2: 0, ext: {} };
  }
  function getJob(id) { return load().jobs.filter(function (j) { return j.id === id; })[0] || null; }
  function deleteJob(id) { var s = load(); s.jobs = s.jobs.filter(function (j) { return j.id !== id; }); save(); }
  function nextInvoiceNo() { var s = load(); var n = 'INV-' + s.next_invoice; s.next_invoice += 1; save(); return n; }

  function exportAll() { return JSON.stringify(load(), null, 2); }
  function importAll(json) { var obj = JSON.parse(json); if (!obj || typeof obj !== 'object' || Array.isArray(obj) || !Array.isArray(obj.jobs)) throw new Error('Not a Quote & Chase backup'); var prev = state; state = obj; hydrate(); if (!save()) { state = prev; throw new Error('Could not save the restore: ' + lastError); } return state; }
  function reset() { state = defaults(); hydrate(); save(); }

  window.QCStore = { PRICE_ITEMS: PRICE_ITEMS, load: load, save: save, lastError: function () { return lastError; }, normaliseJob: normaliseJob, uid: uid, today: today, addDays: addDays, daysBetween: daysBetween,
    newJob: newJob, newRoom: newRoom, getJob: getJob, deleteJob: deleteJob, nextInvoiceNo: nextInvoiceNo, exportAll: exportAll, importAll: importAll, reset: reset, defaults: defaults };
})();
