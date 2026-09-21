/* Quote & Chase app: local store. Everything lives in this browser (localStorage), exportable as one JSON file. */
(function () {
  'use strict';
  var KEY = 'qc-app-v1';

  var PRICE_ITEMS = [
    // key, label, unit, default rate (ex GST), group, note
    ['p_walls', 'Walls, 2 coats', 'm²', 24, 'interior', 'low sheen, light prep'],
    ['p_ceilings', 'Ceilings, 2 coats', 'm²', 22, 'interior', 'flat white'],
    ['p_cornice', 'Cornice', 'lm', 6, 'interior', 'painted with the ceiling'],
    ['p_skirting', 'Skirting boards and architraves', 'lm', 11, 'interior', 'semi-gloss enamel'],
    ['p_door', 'Door, both sides incl. frame', 'each', 140, 'interior', 'flush door'],
    ['p_door_one', 'Door, one side only incl. frame', 'each', 80, 'interior', 'e.g. hallway side of bedroom doors'],
    ['p_door_panel', 'Panelled door, extra per door', 'each', 80, 'interior', 'on top of the door price'],
    ['p_window', 'Window reveal and architrave', 'each', 55, 'interior', 'aluminium window'],
    ['p_window_timber', 'Timber window, frame, sashes and sill', 'each', 130, 'interior', ''],
    ['p_wardrobe', 'Wardrobe doors, per pair', 'each', 150, 'interior', 'hinged timber; mirror and melamine are not painted'],
    ['p_feature', 'Feature wall, 3 coats', 'm²', 35, 'interior', 'colour change; taken off the wall area'],
    ['p_colour_change', 'Colour change, extra coat', 'm²', 8, 'interior', 'on top of the wall rate'],
    ['p_wallpaper', 'Wallpaper removal', 'm²', 24, 'interior', 'sealer and prep are added on top'],
    ['p_prep_mod', 'Moderate prep', 'hour', 85, 'interior', 'fair condition: fill, sand, spot prime'],
    ['p_prep_heavy', 'Heavy prep', 'hour', 100, 'interior', 'poor condition: peeling, water damage'],
    ['p_sealer', 'Sealer or stain block', 'm²', 9, 'interior', 'spot seal in poor condition, full coat after wallpaper'],
    ['p_new_plaster', 'New plaster, sealer coat', 'm²', 9, 'interior', ''],
    ['p_high_access', 'Stairwell or void access', 'each', 200, 'interior', 'per room: ladders and planks'],
    ['p_setup', 'Set-up, protection and clean-up', 'job', 150, 'interior', 'once per job'],
    ['p_weatherboard', 'Weatherboards, 2 coats', 'm²', 48, 'exterior', 'wash down priced separately'],
    ['p_render', 'Render or brick, 2 coats', 'm²', 32, 'exterior', ''],
    ['p_ext_coat', 'Extra coat, exterior walls', 'm²', 12, 'exterior', 'third coat or colour change'],
    ['p_eaves', 'Eaves and fascia', 'lm', 24, 'exterior', ''],
    ['p_gutters', 'Gutters and downpipes', 'lm', 16, 'exterior', ''],
    ['p_ext_door', 'Exterior door, both sides', 'each', 220, 'exterior', ''],
    ['p_ext_window', 'Exterior timber window, frame and sill', 'each', 180, 'exterior', ''],
    ['p_ext_window_alu', 'Exterior aluminium window, reveal', 'each', 70, 'exterior', ''],
    ['p_deck', 'Deck oil, 2 coats', 'm²', 32, 'exterior', 'includes clean'],
    ['p_fence', 'Fence, one side, 2 coats', 'm²', 22, 'exterior', 'rough sawn drinks paint'],
    ['p_pressure', 'Pressure wash', 'm²', 4, 'exterior', ''],
    ['p_tower', 'Mobile tower hire', 'day', 220, 'exterior', 'scaffold is typed per job as the scaffolder\'s quote']
  ];
  // first-release price list: installs still carrying exactly these move to the current defaults
  var FIRST_PRICES = { p_walls: 22, p_ceilings: 25, p_skirting: 9, p_door: 95, p_door_one: 55, p_window: 65, p_wardrobe: 120, p_feature: 28, p_wallpaper: 16, p_prep_mod: 65, p_prep_heavy: 80, p_sealer: 8, p_weatherboard: 38, p_render: 30, p_eaves: 16, p_gutters: 12, p_ext_door: 140, p_ext_window: 95, p_deck: 24, p_fence: 18, p_pressure: 4, p_scaffold: 350 };

  function defaults() {
    var prices = {}; PRICE_ITEMS.forEach(function (p) { prices[p[0]] = p[3]; });
    return {
      version: 1,
      details: { trading_name: '', owner_name: '', abn: '', phone: '', email: '', address: '', service_area: '', licence: '', insurance: '', state: '',
        account_name: '', bsb: '', account_number: '', other_payments: '', deposit_pct: 10, balance_days: 7, quote_valid_days: 30, gst: true,
        voice: 'friendly', sign_off: 'Cheers', logo: '', postcode: '', quote_prefix: 'Q-', invoice_prefix: 'INV-', first_name_signoff: true, contact_phone_in_texts: true, brand_colour: '', show_rates: false },
      prices: prices,
      rules: { minimum_job: 600, travel_per_km: 1.2, travel_per_day: true, premium_paint_pct: 15, ceiling_height_m: 2.4, free_radius_km: 30, travel_return: true, road_factor: 1.2,
        deposit_pct: 10, balance_days: 7, deposit_due_days: 5, deposit_terms_business_days: 14, poor_seal_pct: 30, storey_uplift_pct: 20,
        business_deposit_pct: 0, business_days: 30 }, // business terms: agents, strata, builders and commercial clients get no deposit and 30 days unless the job says otherwise
      costing: (window.QCCosting ? QCCosting.defaults() : {}),
      follow_up: { quote_days: [3, 7, 14], invoice_days: [3, 10, 21], remind_hour: 9, business_days_only: true },
      stripe: { key: '', enabled: false },
      maps: { key: '' },
      account: { email: '', joined: '', offline: false },
      sending: { server: '', token: '', server_has_creds: false, hosted: false, hosted_until: '', hosted_name: '', hosted_cancelled: false, hosted_past_due: false, renew_checked: '', twilio_sid: '', twilio_token: '', twilio_service: '', twilio_from: '', resend_key: '', resend_from: '', auto_sms: true, auto_email: true, email_quotes: true },
      booking: { start_hour: 7, end_hour: 15, quote_from: 7, quote_to: 18, visit_minutes: 30, saturdays: true, sundays: false, visit_pref: 'any', boss_on_tools: true },
      wording: {
        nudges: { quote: '', deposit: '', invoice: '' },
        included: ['Drop sheets and plastic protection for floors, fittings and any furniture left in the room.',
          'We move and cover light furniture to the middle of the room; you clear small items, pictures, curtains, blinds and wardrobe contents before we start.',
          'Preparation: filling minor holes and cracks (up to about 10 fills per room), light sanding, dusting and spot priming.',
          'Two coats of quality trade paint in the same or a similar colour; colour changes, dark colours and feature walls get a third coat where listed.',
          'Products and sheen: low sheen acrylic on walls, flat white on ceilings, semi-gloss enamel on doors and trim, or as listed on the quote.',
          'Up to 3 colours; extra colours are priced per room.',
          'Ladder and plank access. Scaffold, towers or lifts are listed separately when needed.',
          'Daily tidy-up, removal of our rubbish, and a final clean of the areas we painted.',
          'All labour, materials and equipment for the work listed.'],
        excluded: ['Moving heavy furniture, pianos, appliances or built-in items.',
          'Plaster, timber or render repairs beyond the preparation described, including cracks over 300 mm, water damage, peeling and mould.',
          'Treatment of mould, rising damp, efflorescence, nicotine or water stains beyond the stain block listed.',
          'Lead paint or asbestos testing or removal.',
          'Mirror, melamine or glass wardrobe doors, window glass and aluminium window frames.',
          'Colour consulting. Colours are to be confirmed in writing 5 working days before we start.',
          'Anything not listed in this quote. Extra work is priced and agreed in writing (text or email is fine) before it starts and shown on the final invoice as a numbered variation.'],
        included_ext: ['Wash down or pressure clean where listed, then sanding, scraping of loose paint, spot priming of bare timber and gap filling at joints.',
          'Two coats of exterior acrylic on walls and trim, or the product listed on the quote.',
          'Ladder and plank access. Scaffold, towers or lifts are listed separately when needed.',
          'Protection of paths, gardens, windows and fittings with drop sheets and masking.',
          'Daily tidy-up and removal of our rubbish.'],
        excluded_ext: ['Replacement of rotten timber, rusted gutters, cracked render or failed sealant; we point these out and price them as a variation.',
          'Removal of existing paint back to bare timber or render unless listed.',
          'Lead paint or asbestos testing or removal.',
          'Roof painting, pergola and shade-sail removal, and moving vehicles, boats or trailers.',
          'Anything not listed in this quote. Extra work is priced and agreed in writing before it starts.'],
        terms: ['This quote is valid for 30 days from the date above; paint prices are held for that period and supplier increases after it are passed on at cost.',
          'It is a fixed price for the areas and work described; quantities are for pricing and are not re-measured on completion. If the rooms measure more than 5% larger than the sizes given, we confirm any change with you in writing before starting.',
          'Payment: the deposit shown confirms the booking and is due before we start; the balance is due by the date on the invoice. Larger jobs may be invoiced in stages as set out on the quote.',
          'Variations are priced and agreed in writing before the work is done and are itemised on the final invoice.',
          'Please give us clear access to the areas being painted on the booked days, with power and water available. We are not responsible for items left in rooms being painted.',
          'Statutory warranties and your rights under the Australian Consumer Law apply and are not limited by anything in this quote.'],
        terms_ext: ['Exterior work depends on the weather. We do not paint above 35 °C, on surfaces in direct afternoon sun, below 10 °C or within 24 hours of forecast rain; days lost to weather extend the finish date and we tell you as soon as we know.'],
        warranty_years: 5,
        warranty: 'Our workmanship is guaranteed for {years} years against peeling and flaking caused by our application. This excludes substrate movement, moisture getting in, pre-existing paint failure and damage by others; decks, sills and other horizontal exterior surfaces carry 12 months.',
        accept: 'To accept, reply "Accepted" with the quote number by text or email, tell us your preferred start week and pay the deposit. Your reply and this quote together form our written agreement for this work.',
        accept_no_deposit: 'To accept, reply "Accepted" with the quote number by text or email and tell us your preferred start week. No deposit is required. Your reply and this quote together form our written agreement for this work.'
      },
      security: { pin: '', backup_include_keys: false, last_backup: '' },
      log: { sent: [] },
      jobs: [],
      next_quote: 1001,
      next_invoice: 2001,
      next_credit: 1,
      setup_done: false
    };
  }

  var state = null;
  function hydrate() {
    if (!state || typeof state !== 'object' || Array.isArray(state)) state = defaults();
    var d = defaults(), had = {};
    if (!state.maps || typeof state.maps !== 'object') state.maps = { key: '' }; if (state.details && typeof state.details === 'object' && (!state.details.site || typeof state.details.site !== 'object')) state.details.site = { lat: null, lng: null, place_id: '' };
    ['prices', 'rules', 'costing', 'follow_up', 'details', 'wording'].forEach(function (k) { had[k] = state[k] && typeof state[k] === 'object' ? state[k] : {}; });
    // an install that never edited a price still carries the first-release list: move it to the current defaults
    var firstRelease = Object.keys(FIRST_PRICES).every(function (k) { return had.prices[k] === FIRST_PRICES[k]; });
    if (firstRelease) state.prices = {};
    ['details', 'prices', 'rules', 'wording', 'costing', 'follow_up', 'stripe', 'booking', 'sending'].forEach(function (k) { state[k] = Object.assign({}, d[k], state[k] && typeof state[k] === 'object' ? state[k] : {}); });
    state.account = state.account && typeof state.account === 'object' ? state.account : {};
    state.security = Object.assign({}, d.security, state.security && typeof state.security === 'object' ? state.security : {}); state.log = state.log && typeof state.log === 'object' ? state.log : {}; if (!Array.isArray(state.log.sent)) state.log.sent = [];
    ['pending_cancels', 'local_queue', 'trash'].forEach(function (k) { if (!Array.isArray(state[k])) state[k] = []; });
    delete state.prices.p_scaffold; delete state.rules.round_up_cm;
    // rules: values still at the first-release default move to the new default; edited values stay
    var r = state.rules; if (had.rules.minimum_job === 450) r.minimum_job = 600; if (had.rules.travel_per_km === 1.5) r.travel_per_km = 1.2; if (had.rules.free_radius_km === 25) r.free_radius_km = 30; if (had.rules.road_factor === 1.3) r.road_factor = 1.2;
    if (had.rules.deposit_pct == null) { var dp = parseFloat(had.details.deposit_pct); r.deposit_pct = !isNaN(dp) && dp !== 20 ? dp : 10; }
    if (had.rules.balance_days == null) { var bd = parseInt(had.details.balance_days, 10); r.balance_days = !isNaN(bd) ? bd : 7; }
    if (had.details.deposit_pct === 20 || had.details.deposit_pct == null) state.details.deposit_pct = r.deposit_pct;
    // business terms (round two): older installs get the defaults, no deposit and 30 days for business clients
    if (had.rules.business_deposit_pct == null || isNaN(parseFloat(had.rules.business_deposit_pct))) r.business_deposit_pct = 0; if (had.rules.business_days == null || isNaN(parseInt(had.rules.business_days, 10))) r.business_days = 30;
    // costing: nested tables filled per key; first-release labour, markup, ceiling paint and tins move to the new defaults when untouched
    var c = state.costing, dc = d.costing;
    if (had.costing.charge_tins === true && (had.costing.labour_rate === 65 || had.costing.labour_rate == null) && (had.costing.margin_pct === 25 || had.costing.margin_pct == null)) c.charge_tins = false;
    if (had.costing.margin_pct === 25) c.margin_pct = 40;
    c.paint_price = Object.assign({}, dc.paint_price, c.paint_price && typeof c.paint_price === 'object' ? c.paint_price : {}); if (had.costing.paint_price && had.costing.paint_price.ceilings === 24) c.paint_price.ceilings = 16;
    if (!had.costing.coverage || typeof had.costing.coverage !== 'object') { c.coverage = Object.assign({}, dc.coverage); var cov = parseFloat(had.costing.coverage_m2_per_l); if (cov > 0 && cov !== 14) c.coverage.walls = cov; } else c.coverage = Object.assign({}, dc.coverage, had.costing.coverage);
    c.coverage_m2_per_l = c.coverage.walls;
    if (!c.tin_sizes || typeof c.tin_sizes !== 'object' || Array.isArray(c.tin_sizes)) { var ts = c.tin_sizes == null ? '' : String(c.tin_sizes).trim(); c.tin_sizes = Object.assign({}, dc.tin_sizes); if (ts && ts.replace(/\s+/g, '') !== '1,4,10,15') ['walls', 'ceilings', 'exterior'].forEach(function (k) { c.tin_sizes[k] = ts; }); } else c.tin_sizes = Object.assign({}, dc.tin_sizes, c.tin_sizes);
    c.tin_price_factor = Object.assign({}, dc.tin_price_factor, c.tin_price_factor && typeof c.tin_price_factor === 'object' ? c.tin_price_factor : {});
    // wording: arrays present; first- and second-release text that was never edited moves to the current defaults
    var w = state.wording, dw = d.wording;
    ['included', 'excluded', 'included_ext', 'excluded_ext', 'terms', 'terms_ext'].forEach(function (k) { if (!Array.isArray(w[k])) w[k] = dw[k].slice(); });
    if (/^(Reply to this quote by text or email with "accepted"|To accept, reply by text or email with your preferred start week)/.test(w.accept || '')) w.accept = dw.accept;
    if (/^(Protection of floors, furniture and fittings|Drop sheets and plastic protection for floors, furniture and fittings\.)/.test(w.included[0] || '')) w.included = dw.included.slice();
    if (/beyond the prep described|^Plaster, timber or render repairs beyond the preparation described\.$/.test(w.excluded[1] || '')) w.excluded = dw.excluded.slice();
    if (typeof w.warranty !== 'string' || !w.warranty) w.warranty = dw.warranty; if (typeof w.accept_no_deposit !== 'string' || !w.accept_no_deposit) w.accept_no_deposit = dw.accept_no_deposit;
    // follow-ups: first-release invoice days [1, 7, 21] and 8 am move to the new defaults
    var f = state.follow_up;
    if (!Array.isArray(f.quote_days) || !f.quote_days.length) f.quote_days = d.follow_up.quote_days.slice(); if (!Array.isArray(f.invoice_days) || !f.invoice_days.length) f.invoice_days = d.follow_up.invoice_days.slice();
    if (String(had.follow_up.invoice_days) === '1,7,21') f.invoice_days = d.follow_up.invoice_days.slice(); if (had.follow_up.remind_hour === 8) f.remind_hour = 9;
    if (!Array.isArray(state.jobs)) state.jobs = [];
    state.jobs = state.jobs.filter(function (j) { return j && typeof j === 'object'; }).map(normaliseJob);
    if (!state.next_quote) state.next_quote = 1001; if (!state.next_invoice) state.next_invoice = 2001; if (!state.next_credit) state.next_credit = 1;
    // W3: numbering prefixes, the first-release "Bank transfer or cash" (it duplicated the bank box on invoices), products per surface
    if (!state.details.quote_prefix) state.details.quote_prefix = 'Q-'; if (!state.details.invoice_prefix) state.details.invoice_prefix = 'INV-';
    if (state.details.other_payments === 'Bank transfer or cash') state.details.other_payments = '';
    if (!state.wording.nudges || typeof state.wording.nudges !== 'object') state.wording.nudges = { quote: '', deposit: '', invoice: '' }; ['quote', 'deposit', 'invoice'].forEach(function (k) { state.wording.nudges[k] = state.wording.nudges[k] == null ? '' : String(state.wording.nudges[k]).slice(0, 600); });
    if (!state.wording.products || typeof state.wording.products !== 'object') state.wording.products = d.wording.products && typeof d.wording.products === 'object' ? Object.assign({}, d.wording.products) : {};
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
    j.client = Object.assign({ name: '', phone: '', email: '', address: '', first_name: '', type: 'homeowner', abn: '', bill_to: '', accounts_email: '' }, j.client && typeof j.client === 'object' ? j.client : {}); ['name', 'phone', 'email', 'address', 'first_name', 'abn', 'bill_to', 'accounts_email'].forEach(function (k) { j.client[k] = j.client[k] == null ? '' : String(j.client[k]); }); j.site = Object.assign({ place_id: '', address: '', lat: null, lng: null, postcode: '', state: '', footprint_m2: null, perimeter_m: null, roof_m2: null, source: '', traced: [], storeys: 1, checked: false }, j.site && typeof j.site === 'object' ? j.site : {}); if (!Array.isArray(j.site.traced)) j.site.traced = [];
    if (['homeowner', 'agent', 'strata', 'builder', 'commercial'].indexOf(j.client.type) < 0) j.client.type = 'homeowner';
    j.summary = j.summary == null ? '' : String(j.summary); j.notes = j.notes == null ? '' : String(j.notes); j.notes_client = j.notes_client == null ? '' : String(j.notes_client);
    j.deposit_pct = (j.deposit_pct === '' || j.deposit_pct == null || isNaN(parseFloat(j.deposit_pct))) ? null : parseFloat(j.deposit_pct); j.balance_days = (j.balance_days === '' || j.balance_days == null || isNaN(parseInt(j.balance_days, 10))) ? null : parseInt(j.balance_days, 10);
    j.sent_how = ['text', 'email', 'other'].indexOf(j.sent_how) >= 0 ? j.sent_how : ''; j.sent_confirmed = j.sent_confirmed == null ? !!j.sent_date : !!j.sent_confirmed; j.sent_date = j.sent_date == null ? '' : String(j.sent_date); // A1: how the quote went out, set only by the Did-it-go step
    j.auto_follow_ups = j.auto_follow_ups !== false; j.hold = j.hold && typeof j.hold === 'object' ? { on: !!j.hold.on, note: j.hold.note == null ? '' : String(j.hold.note) } : { on: false, note: '' }; j.client_paint = !!j.client_paint;
    j.rooms = (Array.isArray(j.rooms) ? j.rooms : []).filter(function (r) { return r && typeof r === 'object'; }).map(function (r) { r.id = String(r.id || '').replace(/[^A-Za-z0-9_-]/g, '') || uid(); r.type = r.type === 'exterior' ? 'exterior' : 'interior'; r.method = r.method === 'measured' ? 'measured' : 'typed'; r.walls = (Array.isArray(r.walls) ? r.walls : []).filter(function (w) { return w && typeof w === 'object'; }).map(function (w) { w.openings = Array.isArray(w.openings) ? w.openings : []; w.width_mm = +w.width_mm || 0; w.height_mm = +w.height_mm || 0; w.paint_area_m2 = +w.paint_area_m2 || 0; w.wall = w.wall || 'Wall'; w.expected_error_pct = w.expected_error_pct == null ? '' : w.expected_error_pct; return w; }); r.surfaces = Object.assign({ walls: true, ceiling: true, skirting: true }, r.surfaces || {}); r.ext = r.ext && typeof r.ext === 'object' ? r.ext : {};
      r.colour_change = !!r.colour_change; r.cornice = !!r.cornice; r.high_access = !!r.high_access; r.exclude_m2 = r.exclude_m2 == null ? '' : r.exclude_m2; r.perimeter_m = r.perimeter_m == null ? '' : r.perimeter_m; r.ceiling_m2 = r.ceiling_m2 == null ? '' : r.ceiling_m2; r.window_kind = r.window_kind === 'timber' ? 'timber' : 'alu'; r.panelled_doors = +r.panelled_doors || 0;
      r.measured_by = r.measured_by === 'client' ? 'client' : 'us'; r.price_override = (r.price_override === '' || r.price_override == null || isNaN(parseFloat(r.price_override))) ? null : Math.max(0, parseFloat(r.price_override)); // A1: who measured typed sizes; the painter's own price for the room
      if (r.type === 'exterior') { r.ext.condition = ['good', 'fair', 'poor'].indexOf(r.ext.condition) >= 0 ? r.ext.condition : 'good'; r.ext.storeys = +r.ext.storeys === 2 ? 2 : 1; r.ext.coats = +r.ext.coats === 3 ? 3 : 2; r.ext.condition_scope = ['all', 'half', 'side'].indexOf(r.ext.condition_scope) >= 0 ? r.ext.condition_scope : 'all'; }
      return r; });
    j.extras = (Array.isArray(j.extras) ? j.extras : []).filter(function (x) { return x && typeof x === 'object'; }).map(function (x) { x.optional = !!x.optional; return x; });
    j.invoices = (Array.isArray(j.invoices) ? j.invoices : []).filter(function (i) { return i && typeof i === 'object'; }).map(function (i) {
      i.lines = Array.isArray(i.lines) ? i.lines : []; i.follow_ups = Array.isArray(i.follow_ups) ? i.follow_ups : []; i.total = Math.round((+i.total || 0) * 100) / 100; i.no = i.no || 'INV-?'; i.due = i.due || today(); i.date = i.date || i.due;
      i.kind = ['deposit', 'progress', 'final', 'full', 'variations'].indexOf(i.kind) >= 0 ? i.kind : 'final'; i.paid_date = i.paid_date || ''; i.sent_how = ['text', 'email', 'other'].indexOf(i.sent_how) >= 0 ? i.sent_how : ''; i.sent_confirmed = i.sent_confirmed == null ? true : !!i.sent_confirmed;
      i.payments = (Array.isArray(i.payments) ? i.payments : []).filter(function (p) { return p && typeof p === 'object'; }).map(function (p) { p.amount = Math.round((+p.amount || 0) * 100) / 100; p.date = p.date || today(); p.method = p.method || 'other'; p.ref = p.ref == null ? '' : String(p.ref); p.id = p.id || uid(); return p; });
      // migration: an invoice marked paid before payments existed becomes one payment for the full amount on that day
      if (i.paid_date && !i.payments.length && i.total > 0 && !i.void) i.payments.push({ id: uid(), date: i.paid_date, amount: i.total, method: i.paid_by === 'card' ? 'card' : 'other', ref: '', migrated: true });
      i.credit_notes = (Array.isArray(i.credit_notes) ? i.credit_notes : []).filter(function (c) { return c && typeof c === 'object'; }); i.void = i.void && typeof i.void === 'object' ? i.void : null;
      if (!i.client_snapshot || typeof i.client_snapshot !== 'object') i.client_snapshot = { name: j.client.name, address: j.client.address, email: j.client.email, phone: j.client.phone, abn: j.client.abn, bill_to: j.client.bill_to };
      return i; });
    j.follow_ups = Array.isArray(j.follow_ups) ? j.follow_ups : []; if (j.quote && typeof j.quote !== 'object') j.quote = null; if (j.quote && !Array.isArray(j.quote.lines)) j.quote.lines = [];
    if (j.quote) { if (!(j.quote.version >= 1)) j.quote.version = 1; if (!j.quote.number) j.quote.number = j.quote_no; if (!Array.isArray(j.quote.history)) j.quote.history = []; if (j.quote.snapshot && typeof j.quote.snapshot !== 'object') j.quote.snapshot = null; }
    j.acceptance = j.acceptance && typeof j.acceptance === 'object' ? j.acceptance : null;
    j.variations = (Array.isArray(j.variations) ? j.variations : []).filter(function (v) { return v && typeof v === 'object'; }).map(function (v, k) { v.id = v.id || uid(); v.n = v.n || k + 1; v.date = v.date || today(); v.desc = v.desc == null ? '' : String(v.desc); v.amount = Math.round((parseFloat(v.amount) || 0) * 100) / 100; v.how_agreed = v.how_agreed == null ? '' : String(v.how_agreed); v.agreed_date = v.agreed_date || ''; v.status = ['proposed', 'agreed', 'declined'].indexOf(v.status) >= 0 ? v.status : 'proposed'; v.invoiced = !!v.invoiced; return v; });
    j.photos = Array.isArray(j.photos) ? j.photos.filter(function (p) { return p && typeof p === 'object'; }) : []; j.colours = Array.isArray(j.colours) ? j.colours.filter(function (c) { return c && typeof c === 'object'; }) : [];
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
    var job = { id: uid(), quote_no: nextQuoteNo(true), created: today(), status: 'draft',
      client: { name: '', phone: '', email: '', address: '', first_name: '', type: 'homeowner', abn: '', bill_to: '', accounts_email: '' }, summary: '', notes_client: '', rooms: [], extras: [], travel_km: 0, premium_paint: false, client_paint: false,
      deposit_pct: null, balance_days: null, auto_follow_ups: true, hold: { on: false, note: '' }, colours: [], photos: [], variations: [], acceptance: null,
      quote: null, invoices: [], notes: '', last_chased: '', sent_date: '', sent_how: '', sent_confirmed: false, booking: null, follow_ups: [] };
    s.jobs.unshift(job); save(); return job;
  }
  function newRoom(type) {
    var r = { id: uid(), name: '', type: type || 'interior', method: 'typed', L: '', W: '', H: '', walls: [], ceiling_m2: '', perimeter_m: '', exclude_m2: '',
      condition: 'good', surfaces: { walls: true, ceiling: true, skirting: true }, doors: 0, doors_one_side: 0, windows: 0, wardrobe_pairs: 0, panelled_doors: 0, window_kind: 'alu',
      colour_change: false, cornice: false, high_access: false, feature_m2: 0, wallpaper_m2: 0, measured_by: 'us', price_override: null, ext: {} };
    if (r.type === 'exterior') r.ext = { condition: 'good', storeys: 1, coats: 2, condition_scope: 'all' };
    return r;
  }
  function getJob(id) { return load().jobs.filter(function (j) { return j.id === id; })[0] || null; }
  // A1: a job nobody typed anything into (New job or Quick quote backed out of) is not a job. purgeEmpty drops them and hands the quote number back when it was the last one given out.
  function roomEmpty(r) {
    if (!r || typeof r !== 'object') return true; if ((r.walls || []).length) return false; var nm = String(r.name || '').trim(); if (nm && !/^(Room \d+|Exterior|Room)$/.test(nm)) return false;
    if (['L', 'W', 'H', 'perimeter_m', 'ceiling_m2', 'doors', 'doors_one_side', 'windows', 'wardrobe_pairs', 'feature_m2', 'wallpaper_m2', 'exclude_m2', 'panelled_doors', 'price_override'].some(function (k) { return parseFloat(r[k]) > 0; })) return false;
    var e = r.ext || {}; return !Object.keys(e).some(function (k) { return ['condition', 'storeys', 'coats', 'condition_scope'].indexOf(k) < 0 && parseFloat(e[k]) > 0; });
  }
  function jobEmpty(j) {
    if (!j || j.status !== 'draft' || j.quote || (j.invoices || []).length || j.booking || j.visit || j.ballpark) return false;
    var c = j.client || {}; if (['name', 'phone', 'email', 'address', 'first_name', 'bill_to', 'abn', 'accounts_email'].some(function (k) { return String(c[k] || '').trim(); })) return false;
    if (String(j.summary || '').trim() || String(j.notes || '').trim() || String(j.notes_client || '').trim() || (j.extras || []).length || (j.photos || []).length || (j.colours || []).length || (j.variations || []).length) return false;
    return (j.rooms || []).every(roomEmpty);
  }
  function purgeEmpty(exceptId) {
    var s = load(), gone = s.jobs.filter(function (j) { return j && j.id !== exceptId && jobEmpty(j); }); if (!gone.length) return 0;
    s.jobs = s.jobs.filter(function (j) { return gone.indexOf(j) < 0; });
    var prefix = String(s.details.quote_prefix == null ? 'Q-' : s.details.quote_prefix), used = {}; s.jobs.concat((s.trash || []).map(function (t) { return t && t.job; })).forEach(function (j) { if (j) used[j.quote_no] = 1; });
    gone.map(function (j) { var m = String(j.quote_no || ''); return m.indexOf(prefix) === 0 ? parseInt(m.slice(prefix.length), 10) : NaN; }).filter(function (v) { return !isNaN(v); }).sort(function (a, b) { return b - a; })
      .forEach(function (v) { if (v === (parseInt(s.next_quote, 10) || 1001) - 1 && !used[prefix + v]) s.next_quote = v; });
    save(); return gone.length;
  }
  function deleteJob(id) { var s = load(); s.jobs = s.jobs.filter(function (j) { return j.id !== id; }); save(); }
  // Numbers: prefix from Set-up, counter never reused. noSave is for newJob, which saves once itself.
  function nextQuoteNo(noSave) { var s = load(); var no = String(s.details.quote_prefix == null ? 'Q-' : s.details.quote_prefix) + (parseInt(s.next_quote, 10) || 1001); s.next_quote = (parseInt(s.next_quote, 10) || 1001) + 1; if (!noSave) save(); return no; }
  function nextInvoiceNo() { var s = load(); var no = String(s.details.invoice_prefix == null ? 'INV-' : s.details.invoice_prefix) + (parseInt(s.next_invoice, 10) || 2001); s.next_invoice = (parseInt(s.next_invoice, 10) || 2001) + 1; save(); return no; }
  function nextCreditNo() { var s = load(); var no = 'CN-' + (parseInt(s.next_credit, 10) || 1); s.next_credit = (parseInt(s.next_credit, 10) || 1) + 1; save(); return no; }

  // The back-up leaves the sending keys out unless Set-up > Back-up says to include them (moving to a new phone): a back-up file goes through the share sheet.
  function exportAll(opts) {
    var s = load(), inc = (opts && opts.include_keys != null) ? !!opts.include_keys : !!(s.security && s.security.backup_include_keys);
    var out = JSON.parse(JSON.stringify(s)); delete out.trash;
    if (!inc) { out.stripe = Object.assign({}, out.stripe, { key: '' }); out.maps = Object.assign({}, out.maps, { key: '' }); out.sending = Object.assign({}, out.sending); ['token', 'twilio_sid', 'twilio_token', 'twilio_api_key', 'twilio_service', 'twilio_from', 'resend_key'].forEach(function (k) { if (k in out.sending) out.sending[k] = ''; }); out.keys_removed = true; }
    else delete out.keys_removed;
    return JSON.stringify(out, null, 2);
  }
  function addLog(entry) { var s = load(); s.log = s.log && typeof s.log === 'object' ? s.log : {}; if (!Array.isArray(s.log.sent)) s.log.sent = []; s.log.sent.unshift(entry); if (s.log.sent.length > 500) s.log.sent.length = 500; return save(); }
  function importAll(json) { var obj = JSON.parse(json); if (!obj || typeof obj !== 'object' || Array.isArray(obj) || !Array.isArray(obj.jobs)) throw new Error('Not a Quote & Chase backup'); var prev = state; state = obj; hydrate(); if (!save()) { state = prev; throw new Error('Could not save the restore: ' + lastError); } return state; }
  function reset() { state = defaults(); hydrate(); save(); }

  window.QCStore = { PRICE_ITEMS: PRICE_ITEMS, load: load, save: save, lastError: function () { return lastError; }, normaliseJob: normaliseJob, uid: uid, today: today, addDays: addDays, daysBetween: daysBetween,
    newJob: newJob, newRoom: newRoom, getJob: getJob, deleteJob: deleteJob, nextQuoteNo: nextQuoteNo, nextInvoiceNo: nextInvoiceNo, nextCreditNo: nextCreditNo, exportAll: exportAll, importAll: importAll, reset: reset, defaults: defaults, addLog: addLog, purgeEmpty: purgeEmpty, jobEmpty: jobEmpty };
})();
