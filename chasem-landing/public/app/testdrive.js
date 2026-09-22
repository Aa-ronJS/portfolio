/* Chasem: test drive.
 *
 * A painter's whole week, on demand, so the app can be walked end to end and broken on purpose. Three parts:
 *
 *   a book      eight jobs at every stage, dated so the follow-ups are due today and the invoice is overdue
 *   a net       while test drive is on, every text and email goes to HIM, never to the name on the job
 *   a list      the fourteen steps of the job, each one openable, each one markable, each one with a note
 *
 * The notes are kept on the phone first and sent afterwards, so a finding is never lost to a flat battery or a
 * dead patch of signal. Nothing here is loaded unless he asks for it.
 */
(function () {
  'use strict';
  var KEY = 'testdrive';

  function S() { return QCStore.load(); }
  function state() { var s = S()[KEY]; return (s && typeof s === 'object') ? s : { on: false, divert: true, found: [] }; }
  function set(patch) {
    var s = S(), cur = state(), k;
    for (k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) cur[k] = patch[k];
    s[KEY] = cur; QCStore.save(); return cur;
  }
  function uid() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- the fourteen steps
  // Each is a thing a painter actually does, in the order he does it, with the screen it starts on.
  var STEPS = [
    { id: 'setup',    go: '#/settings',        t: 'Set yourself up', d: 'Name, ABN, bank. Your mobile and email are where the test messages land.' },
    { id: 'prices',   go: '#/settings/prices', t: 'Your prices',     d: 'Change a rate. Then Work out my rates.' },
    { id: 'enquiry',  go: '#/enquiry',         t: 'Phone enquiry',   d: 'Tap rooms, read the range, book a visit.' },
    { id: 'measure',  go: '#/',                t: 'Measure a room',  d: 'A4 on the wall. Check it against your tape. Then try it crooked and dark.' },
    { id: 'quick',    go: '#/',                t: 'Quick quote',     d: 'Photo to sent. Time yourself.' },
    { id: 'quote',    go: '#/',                t: 'The quote',       d: 'Read the PDF as the customer would.' },
    { id: 'send',     go: '#/',                t: 'Send it',         d: 'Text and email. Both land on your phone.' },
    { id: 'yes',      go: '#/chase',           t: 'They say YES',    d: 'Reply to the text. Try a no, and STOP.' },
    { id: 'book',     go: '#/',                t: 'They pick a day', d: 'Open the link. Then try to take the same day twice.' },
    { id: 'follow',   go: '#/chase',           t: 'Follow-ups',      d: 'Read the wording. Hold one, chase one by hand.' },
    { id: 'invoice',  go: '#/',                t: 'Invoice',         d: 'Deposit, then final. Check the GST and the bank details.' },
    { id: 'overdue',  go: '#/chase',           t: 'Chase the money', d: 'Three reminders, then the final notice. Would you send it?' },
    { id: 'offline',  go: '#/',                t: 'No signal',       d: 'Flight mode. Keep working.' },
    { id: 'second',   go: '#/settings',        t: 'Second phone',    d: 'Make the link. Open it somewhere else.' }
  ];
  function stepById(id) { for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return STEPS[i]; return null; }

  // ---------- the book
  // Dated backwards from today so the chasing is live the moment it loads: a quote waiting 12 days, an invoice
  // 21 days overdue, a deposit unpaid, a job booked for next week.
  function seedBook() {
    var st = QCStore.load(), store = QCStore, today = QCStore.today(), P = window.__qcApp.pricing;
    var back = function (n) { return QCStore.addDays(today, -n); }, on = function (n) { return QCStore.addDays(today, n); };

    function room(name, L, W, opts) {
      var r = store.newRoom('interior'); r.name = name; r.L = L; r.W = W; r.doors = (opts && opts.doors) || 1; r.windows = (opts && opts.windows) || 1;
      if (opts && opts.ceiling === false) r.do_ceiling = false;
      return r;
    }
    function mk(name, phone, email, addr, summary, rooms) {
      var j = store.newJob();
      j.client = { name: name, phone: phone, email: email, address: addr, first_name: String(name).split(' ')[0], type: 'homeowner', abn: '', bill_to: '', accounts_email: '' };
      j.summary = summary; (rooms || []).forEach(function (r) { j.rooms.push(r); });
      j.from_book = true;   // it came from here, not from him: the "start the chasing" banner knows the difference
      return j;
    }
    function price(j, sentDaysAgo) {
      var pr = P.priceJob(j, st);
      j.quote = { date: back(sentDaysAgo), number: j.quote_no, lines: pr.lines, subtotal: pr.subtotal, gst: pr.gst, total: pr.total, deposit: pr.deposit, assumptions: pr.assumptions, measured_rooms: 0, total_rooms: j.rooms.length };
      j.sent_date = back(sentDaysAgo); j.sent_confirmed = true; j.handed_at = back(sentDaysAgo); j.handed_how = 'text';
      return pr;
    }
    function invoice(j, kind, no, dateAgo, dueAgo, paid) {
      var total = kind === 'deposit' ? Math.round(j.quote.total * 0.1) : j.quote.total;
      var sub = Math.round((total / 1.1) * 100) / 100;
      return { kind: kind, kind_line: kind, no: no, date: back(dateAgo), due: back(dueAgo), paid_date: paid ? back(Math.max(0, dueAgo - 2)) : '',
        lines: [{ desc: (kind === 'deposit' ? 'Deposit for ' : 'Painting, ') + j.quote_no, amount: sub }],
        subtotal: sub, gst: Math.round((total - sub) * 100) / 100, total: total, follow_ups: [] };
    }

    // 1 a phone enquiry with a visit booked for the day after tomorrow
    var a = mk('Kate Caller', '0400 111 222', 'kate@example.com', '9 Near St Willaston SA 5118', 'Lounge and two bedrooms', []);
    a.status = 'enquiry'; a.picks = [{ type: 'lounge', size: 'M', n: 1 }, { type: 'bedroom', size: 'S', n: 2 }];
    a.ballpark = { low: 1250, high: 1750, mid: 1500 };
    a.visit = { date: on(2), start_min: 9 * 60, minutes: 30, why: 'first free slot', detour: 0 };

    // 2 a draft he has not finished
    var b = mk('Tony Draft', '0400 222 333', 'tony@example.com', '3 Second St Gawler SA 5118', 'Hallway and stairs', [room('Hallway', 6, 1.4), room('Stairwell', 3, 2.2, { doors: 0, windows: 0 })]);
    b.status = 'draft';

    // 3 a quote sent 12 days ago, nothing back: this is what the chasing is for
    var c = mk('Margaret Hill', '0400 333 444', 'margaret@example.com', '17 Hill Rd Elizabeth SA 5112', 'Whole inside repaint', [room('Lounge', 5.5, 4.4, { windows: 2 }), room('Kitchen', 4, 3.2), room('Bedroom 1', 3.6, 3.2), room('Bedroom 2', 3.3, 3)]);
    c.status = 'quoted'; price(c, 12);

    // 4 a quote sent three days ago, too new to chase
    var d = mk('Priya Nair', '0400 444 555', 'priya@example.com', '8 Park Ave Salisbury SA 5108', 'Two bedrooms and a hallway', [room('Bedroom', 3.6, 3.4), room('Bedroom', 3.2, 3), room('Hallway', 5, 1.2, { windows: 0 })]);
    d.status = 'quoted'; price(d, 3);

    // 5 accepted, booked for next week
    var e = mk('Sione Tui', '0400 555 666', 'sione@example.com', '22 Bay Rd Largs Bay SA 5016', 'Exterior weatherboard', [room('Lounge', 5, 4), room('Dining', 4, 3.5)]);
    e.status = 'accepted'; price(e, 20);
    e.booking = { start: on(6), days: 3, end: on(9), end_inclusive: on(8), hour: 7 };

    // 6 deposit invoice sent, not paid
    var f = mk('Ruth Baker', '0400 666 777', 'ruth@example.com', '5 Vine St Prospect SA 5082', 'Kitchen and laundry', [room('Kitchen', 4.2, 3.6), room('Laundry', 2.4, 2)]);
    f.status = 'invoiced'; price(f, 26);
    f.invoices = [invoice(f, 'deposit', 'INV-2001', 8, 1, false)];

    // 7 the job that is 21 days overdue: the whole point of the app
    var g = mk('Dennis Ward', '0400 777 888', 'dennis@example.com', '41 Long St Woodville SA 5011', 'Whole house, inside', [room('Lounge', 6, 4.5, { windows: 3 }), room('Kitchen', 4.5, 3.8), room('Bedroom 1', 4, 3.6), room('Bedroom 2', 3.4, 3.2), room('Bathroom', 2.6, 2.2, { windows: 1 })]);
    g.status = 'invoiced'; price(g, 60);
    g.invoices = [invoice(g, 'deposit', 'INV-1998', 55, 50, true), invoice(g, 'final', 'INV-1999', 35, 21, false)];

    // 8 paid and done, so the book is not all trouble
    var h = mk('Alice Png', '0400 888 999', 'alice@example.com', '12 Short St Norwood SA 5067', 'Bedroom and ensuite', [room('Bedroom', 3.8, 3.4), room('Ensuite', 2.2, 1.8, { windows: 1 })]);
    h.status = 'paid'; price(h, 70);
    h.invoices = [invoice(h, 'full', 'INV-1997', 60, 50, true)];

    st.next_invoice = 2002;
    QCStore.save();
    return { jobs: 8 };
  }

  // Everything a painter types once, so the book is usable the moment it lands. His own mobile and email are
  // left alone if he has already put them in: that is where the test messages go.
  function seedSettings(mine) {
    var s = QCStore.load();
    var d = s.details;
    if (!String(d.trading_name || '').trim()) d.trading_name = 'Test Painting Co';
    if (!String(d.owner_name || '').trim()) d.owner_name = 'Sam';
    if (!String(d.abn || '').trim()) d.abn = '12 345 678 901';
    if (!String(d.state || '').trim()) d.state = 'SA';
    if (!String(d.postcode || '').trim()) d.postcode = '5000';
    if (!String(d.account_name || '').trim()) { d.account_name = d.trading_name; d.bsb = '063-000'; d.account_number = '12345678'; }
    if (mine && mine.phone) d.phone = mine.phone;
    if (mine && mine.email) d.email = mine.email;
    QCStore.save();
    return d;
  }

  function wipe() {
    var keep = state();
    QCStore.reset();
    var s = QCStore.load();
    s[KEY] = { on: keep.on, divert: keep.divert !== false, found: keep.found || [] };
    s.account = { email: (keep.email || 'test@example.com'), joined: QCStore.today(), offline: true };
    QCStore.save();
  }

  // ---------- findings
  function record(stepId, verdict, note) {
    var f = (state().found || []).slice();
    var step = stepById(stepId), title = step ? step.t : (stepId || '');
    // one verdict per step, replaced rather than stacked; loose notes are always new
    var i = stepId ? f.map(function (x) { return x.step_id; }).indexOf(stepId) : -1;
    var item = { id: uid(), step_id: stepId || '', step: title, verdict: verdict || 'note', note: String(note || '').slice(0, 4000),
      screen: location.hash || '#/', app: window.QC_VERSION || '', at: new Date().toISOString(), sent: false };
    if (i >= 0) { item.id = f[i].id; f[i] = item; } else f.push(item);
    set({ found: f });
    return item;
  }
  function clearFound() { set({ found: [] }); }

  function sendFound() {
    // everything, including the bare "this works" ticks: knowing a step was walked and came out fine is half
    // of what a test drive is for
    var s = QCStore.load(), sd = s.sending || {}, f = (state().found || []).slice();
    if (!f.length) return Promise.resolve({ ok: false, error: 'Nothing written down yet.' });
    // His own relay if he has one, otherwise the one this copy of the app was served from: a tester who has
    // not switched sending on still has something worth saying.
    var url = String(sd.server || '').trim();
    url = url ? url.replace(/\/[^\/]*$/, '/feedback')
              : String(((window.QC_APP || {}).signup_url) || '').replace(/\/[^\/]*$/, '/feedback');
    if (!url) return Promise.resolve({ ok: false, error: 'Nowhere to send them from this copy of the app. Copy them instead.' });
    var body = { token: sd.token || undefined, who: s.details.owner_name || s.details.trading_name || '', reply_to: s.details.email || '',
      items: f.map(function (x) { return { id: x.id, step: x.step, verdict: x.verdict, note: x.note, screen: x.screen, app: x.app, ua: navigator.userAgent.slice(0, 200) }; }) };
    var fetcher = window.__qcRelayFetch || window.fetch;
    return fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) {
          var all = (state().found || []).map(function (x) { var hit = f.filter(function (y) { return y.id === x.id; })[0]; return hit ? Object.assign({}, x, { sent: true }) : x; });
          set({ found: all });
        }
        return res || { ok: false, error: 'No answer from the sending server.' };
      })
      .catch(function () { return { ok: false, error: 'Could not reach the sending server. They are still on your phone; try again later or copy them.' }; });
  }

  function asText() {
    var f = state().found || [];
    return f.map(function (x) {
      return (x.verdict === 'broken' ? 'BROKEN' : x.verdict === 'works' ? 'works ' : 'note  ') + '  ' + (x.step || '') + (x.note ? '\n        ' + x.note : '');
    }).join('\n') + '\n\n' + (window.QC_VERSION || '') + '\n' + navigator.userAgent;
  }

  window.QCTest = { STEPS: STEPS, stepById: stepById, state: state, set: set, seedBook: seedBook, seedSettings: seedSettings,
    wipe: wipe, record: record, clearFound: clearFound, sendFound: sendFound, asText: asText, esc: esc };
})();
