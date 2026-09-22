/* Chasem: the phone talking to the server.
   The phone is still the thing he works on, and it still works with no signal. This is what lets a customer
   accept a quote and pick a start day while the phone is in his pocket, and lets him see it when he next opens it.
   Nothing here blocks the app: every call is best effort, and a failure just means we try again next time. */
(function () {
  var KEY_STATE = 'qc-sync-v1';

  // A cheap fingerprint, so only what actually changed gets pushed.
  function hash(s) { var h = 5381, i = s.length; while (i) h = (h * 33 ^ s.charCodeAt(--i)) >>> 0; return h.toString(36); }
  function api(which) { var u = String(((QCStore.load().sending) || {}).server || '').trim(); return u ? u.replace(/\/[^\/]*$/, '/' + which) : ''; }
  function mem() { try { return JSON.parse(localStorage.getItem(KEY_STATE) || '{}') || {}; } catch (e) { return {}; } }
  // Merges. Writing one field must not lose `since`: a sync that forgets where it was up to pulls the whole
  // history back and pushes everything again.
  function remember(v) {
    try { var cur = mem(), k; for (k in v) if (Object.prototype.hasOwnProperty.call(v, k)) cur[k] = v[k];
      localStorage.setItem(KEY_STATE, JSON.stringify(cur)); } catch (e) {}
  }

  // The days a customer must not be offered: days he is already on a job, and his state's public holidays.
  // Working this out here rather than on the server keeps one holiday calendar in the product instead of two.
  function busyDays(S) {
    var out = {}, today = QCStore.today(), horizon = QCStore.addDays(today, 120);
    (S.jobs || []).forEach(function (j) {
      if (!j || j.status === 'cancelled' || j.status === 'declined') return;
      var b = j.booking && j.booking.start_day ? j.booking : null;
      if (b) { var d = b.start_day, n = Math.max(1, parseInt(b.days, 10) || 1), k = 0;
        while (k < n && d <= horizon) { out[d] = 1; d = QCStore.addDays(d, 1); k++; } }
      if (j.start_date) out[j.start_date] = 1;
    });
    var hol = QCCal.holidays((S.details && S.details.state) || ''), d2;
    for (d2 in hol) if (d2 >= today && d2 <= horizon) out[d2] = 1;
    (S.days_off || []).forEach(function (d) { if (d >= today) out[d] = 1; });
    return Object.keys(out).sort();
  }

  function rules(S) {
    var fu = S.follow_up || {}, h = parseInt(fu.remind_hour, 10);
    return { days: [1, 2, 3, 4, 5], hour: isNaN(h) ? 8 : Math.max(5, Math.min(18, h)),
             notice_days: S.booking && S.booking.notice_days != null ? S.booking.notice_days : 3,
             offer: S.booking && S.booking.offer != null ? S.booking.offer : 6, window_days: 28 };
  }

  // What the server is allowed to change under us: a customer accepted, or picked a day. Never his prices.
  function applyChanges(S, res) {
    var touched = 0;
    (res.changes || []).forEach(function (c) {
      if (c.kind !== 'job' || !c.id) return;
      var j = (S.jobs || []).filter(function (x) { return x.id === c.id; })[0];
      if (!j) {
        // A job from his other phone, or from the server after he wiped this one. Both phones on an account
        // are the same business, so the work belongs on both.
        if (c.deleted || !c.body || !c.body.id) return;
        S.jobs = (S.jobs || []).concat([c.body]); touched++; return;
      }
      if (c.deleted) { S.jobs = S.jobs.filter(function (x) { return x.id !== c.id; }); touched++; return; }
      // the server only ever has stubs for photos; never let one overwrite the pictures held here
      // His own edits win on his own phone; what the server may change is what a customer did.
      if (c.body && c.body.status && c.body.status !== j.status &&
          ['accepted', 'declined'].indexOf(c.body.status) >= 0) { j.status = c.body.status; touched++; }
    });
    var blank = !(S.details && S.details.trading_name) && !(S.jobs || []).length;
    if (blank) (res.changes || []).forEach(function (c) {
      if (c.kind !== 'settings' || !c.body || c.deleted) return;
      ['details', 'prices', 'rules', 'wording', 'follow_up', 'booking'].forEach(function (k) {
        if (c.body[k] && typeof c.body[k] === 'object') S[k] = Object.assign(S[k] || {}, c.body[k]);
      });
      if (Array.isArray(c.body.days_off)) S.days_off = c.body.days_off;
      touched++;                                   // a fresh phone, filled from what the server had
    });
    (res.bookings || []).forEach(function (b) {
      var j = (S.jobs || []).filter(function (x) { return x.id === b.job_id; })[0];
      if (!j) return;
      var day = String(b.start_day || '').slice(0, 10);
      if (!day || (j.booking && j.booking.start_day === day)) return;
      j.booking = { start_day: day, days: parseInt(b.days, 10) || 1, hour: parseInt(b.start_hour, 10) || 8, by: b.made_by || 'client' };
      if (j.status === 'quoted') j.status = 'accepted';
      touched++;
    });
    if ((res.replies || []).length) {
      S.replies = (S.replies || []).concat(res.replies.map(function (r) {
        return { id: r.id, job: r.job_id, from: r.from_addr, text: r.body, action: r.action, at: r.received_at };
      })).filter(function (r, i, a) { return a.findIndex(function (x) { return x.id === r.id; }) === i; }).slice(-100);
      touched++;
    }
    return touched;
  }

  var running = false;
  function now(opts) {
    opts = opts || {};
    var url = api('sync'), S = QCStore.load(), sd = S.sending || {};
    if (!url || !sd.token || String(sd.token).slice(0, 4) !== 'qc1.') return Promise.resolve(null);
    if (running) return Promise.resolve(null);
    running = true;

    var m = mem(), sent = m.sent || {}, push = [], fresh = {};

    // His settings travel too, so a new or wiped phone comes back with his prices and his wording rather than
    // a blank app. Credentials never travel: his own Twilio, Resend and Stripe keys, the sending token and the
    // hash of his PIN all stay on the handset he typed them into.
    var settings = { details: S.details, prices: S.prices, rules: S.rules, wording: S.wording,
                     follow_up: S.follow_up, booking: S.booking, days_off: S.days_off || [] };
    var sBody = JSON.stringify(settings), sHash = hash(sBody);
    fresh.__settings = sHash;
    if (sent.__settings !== sHash) push.push({ kind: 'settings', id: 'settings', rev: (S.rev || 1), body: JSON.parse(sBody) });
    // Photos are held as base64 inside the job, and eight of them is well over a megabyte. Sending that through
    // document sync would blow the request on two or three jobs and bloat every pull afterwards, so the picture
    // data stays on the phone and only the fact of it travels. Proper photo sync needs object storage, not a
    // jsonb column.
    function forWire(j) {
      if (!j.photos || !j.photos.length) return j;
      var copy = {}, k;
      for (k in j) if (Object.prototype.hasOwnProperty.call(j, k)) copy[k] = j[k];
      copy.photos = j.photos.map(function (p) { return { id: p.id, caption: p.caption || '', room: p.room || '', stored: !!p.stored }; });
      return copy;
    }
    (S.jobs || []).forEach(function (j) {
      if (!j || !j.id) return;
      var body = JSON.stringify(forWire(j)), h = hash(body);
      fresh[j.id] = h;
      if (sent[j.id] !== h) push.push({ kind: 'job', id: j.id, rev: (S.rev || 1), body: JSON.parse(body) });
    });
    Object.keys(sent).forEach(function (id) {
      if (fresh[id] || id === '__settings') return;
      push.push({ kind: 'job', id: id, rev: (S.rev || 1), deleted: true, body: {} });  // deleted here, so delete there
    });

    var payload = { token: sd.token, since: m.since || '', push: push.slice(0, 300),
      me: { trading_name: S.details.trading_name || '', reply_to: S.details.email || '', phone: S.details.phone || '', state: S.details.state || '' },
      busy: busyDays(S), rules: rules(S) };

    var f = window.__qcRelayFetch || window.fetch;
    return f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        running = false;
        if (!res || !res.ok) { if (res && res.off) remember({ off: true }); return res || null; }
        var S2 = QCStore.load(), touched = applyChanges(S2, res);
        remember({ since: res.now, sent: fresh, at: Date.now(), calendar: res.calendar || null });
        if (touched) { QCStore.save(); if (opts.onChange) opts.onChange(touched, res); }
        pushPhotos(3);                                   // after the words are through, a few pictures
        return res;
      })
      .catch(function (e) { running = false; return null; });
  }

  // Photos go up on their own, a few at a time, after the documents are through. Each one is marked as stored
  // so it is never sent twice, and the picture stays on this phone either way: this is a copy, not a move.
  function pushPhotos(limit) {
    var S = QCStore.load(), sd = S.sending || {}, url = api('photo');
    if (!url || !sd.token) return Promise.resolve(0);
    var todo = [];
    (S.jobs || []).forEach(function (j) {
      (j.photos || []).forEach(function (ph) {
        if (ph && ph.data && !ph.stored && todo.length < (limit || 3)) todo.push({ job: j.id, ph: ph });
      });
    });
    if (!todo.length) return Promise.resolve(0);
    var f = window.__qcRelayFetch || window.fetch, done = 0;
    return todo.reduce(function (chain, t) {
      return chain.then(function () {
        return f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: sd.token, action: 'put', job: t.job, id: t.ph.id, data: t.ph.data }) })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (!res || !res.ok) return;
            var S2 = QCStore.load(), j2 = (S2.jobs || []).filter(function (x) { return x.id === t.job; })[0];
            var p2 = j2 && (j2.photos || []).filter(function (x) { return x.id === t.ph.id; })[0];
            if (p2) { p2.stored = true; QCStore.save(); done++; }
          })
          .catch(function () {});
      });
    }, Promise.resolve()).then(function () { return done; });
  }

  // A photo this phone has never held: fetch a URL good for an hour. Used when a second phone, or a new one,
  // opens a job whose pictures were taken somewhere else.
  function photoUrl(jobId, photoId) {
    var S = QCStore.load(), sd = S.sending || {}, url = api('photo');
    if (!url || !sd.token) return Promise.resolve('');
    var f = window.__qcRelayFetch || window.fetch;
    return f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: sd.token, action: 'url', job: jobId, id: photoId }) })
      .then(function (r) { return r.json(); })
      .then(function (res) { return (res && res.ok && res.url) || ''; })
      .catch(function () { return ''; });
  }

  function lastAt() { return mem().at || 0; }
  function calendar() { return mem().calendar || null; }

  // Connecting, checking and disconnecting a calendar. The relay does the talking to Google; this only ever
  // sends the token it already has and gets back a link to open or a plain yes/no.
  function gcal(action, extra) {
    var S = QCStore.load(), sd = S.sending || {}, url = api('gcal');
    if (!url || !sd.token) return Promise.resolve({ ok: false, error: 'Sending is not set up on this phone.' });
    var f = window.__qcRelayFetch || window.fetch, body = { token: sd.token, action: action };
    if (action === 'start') body.me = { trading_name: S.details.trading_name || '', reply_to: S.details.email || '', phone: S.details.phone || '', state: S.details.state || '' };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) body[k] = extra[k];
    return f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        // "off" means calendars are not switched on for this relay at all: worth remembering, so the app can
        // leave the whole card out rather than showing one that cannot do anything.
        if (res && res.off) remember({ calendar: { off: true, connected: false } });
        else if (res && res.ok && (action === 'status' || action === 'sync' || action === 'disconnect')) {
          remember({ calendar: { connected: !!res.connected, account: res.account || '', synced_at: res.synced_at || null, error: res.error || '', days: res.days || 0 } });
        }
        return res || { ok: false, error: 'No answer from the sending server.' };
      })
      .catch(function () { return { ok: false, error: 'Could not reach the sending server.' }; });
  }

  window.QCSync = { now: now, busyDays: busyDays, rules: rules, applyChanges: applyChanges, lastAt: lastAt, hash: hash, pushPhotos: pushPhotos, photoUrl: photoUrl, calendar: calendar, gcal: gcal };
})();
