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
        voice: 'friendly', sign_off: 'Cheers', logo: '' },
      prices: prices,
      rules: { minimum_job: 450, travel_per_km: 1.5, premium_paint_pct: 15, ceiling_height_m: 2.4, round_up_cm: 10 },
      wording: {
        included: ['Protection of floors, furniture and fittings with drop sheets and plastic before work starts.',
          'Preparation as described: filling minor holes and cracks, light sanding, dusting and spot priming.',
          'Two full coats of quality trade paint in the colours you choose.',
          'Daily clean up and removal of all our rubbish at the end of the job.',
          'All labour, materials, ladders and equipment.'],
        excluded: ['Moving heavy furniture, pianos or built-in items.',
          'Repairs to plaster, timber or render beyond the prep described.',
          'Testing or removal of lead paint or asbestos.',
          'Colour consulting. Please have colours chosen before we start.',
          'Anything not written in this quote. Extra work is agreed in writing before it starts.'],
        warranty_years: 5,
        accept: 'Reply to this quote by text or email with "accepted" and your preferred start week, and pay the deposit to the account below. We will confirm your date within one business day.'
      },
      jobs: [],
      next_quote: 1001,
      next_invoice: 2001,
      setup_done: false
    };
  }

  var state = null;
  function load() {
    if (state) return state;
    try { var raw = localStorage.getItem(KEY); state = raw ? JSON.parse(raw) : defaults(); } catch (e) { state = defaults(); }
    // fill any missing keys from defaults (upgrades)
    var d = defaults();
    ['details', 'prices', 'rules', 'wording'].forEach(function (k) { state[k] = Object.assign({}, d[k], state[k] || {}); });
    if (!Array.isArray(state.jobs)) state.jobs = [];
    if (!state.next_quote) state.next_quote = 1001; if (!state.next_invoice) state.next_invoice = 2001;
    return state;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }

  function newJob() {
    var s = load();
    var job = { id: uid(), quote_no: 'Q-' + s.next_quote, created: today(), status: 'draft',
      client: { name: '', phone: '', email: '', address: '' }, summary: '', rooms: [], extras: [], travel_km: 0, premium_paint: false,
      quote: null, invoices: [], notes: '', last_chased: '', sent_date: '' };
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
  function importAll(json) { var obj = JSON.parse(json); if (!obj || !Array.isArray(obj.jobs)) throw new Error('Not a Quote & Chase backup'); state = obj; save(); state = null; return load(); }
  function reset() { state = defaults(); save(); }

  window.QCStore = { PRICE_ITEMS: PRICE_ITEMS, load: load, save: save, uid: uid, today: today, addDays: addDays, daysBetween: daysBetween,
    newJob: newJob, newRoom: newRoom, getJob: getJob, deleteJob: deleteJob, nextInvoiceNo: nextInvoiceNo, exportAll: exportAll, importAll: importAll, reset: reset, defaults: defaults };
})();
