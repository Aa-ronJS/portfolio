/* Quote & Chase: the phone talking to the server.
   The phone is still the thing he works on, and it still works with no signal. This is what lets a customer
   accept a quote and pick a start day while the phone is in his pocket, and lets him see it when he next opens it.
   Nothing here blocks the app: every call is best effort, and a failure just means we try again next time. */
(function () {
  var KEY_STATE = 'qc-sync-v1';

  // A cheap fingerprint, so only what actually changed gets pushed.
  function hash(s) { var h = 5381, i = s.length; while (i) h = (h * 33 ^ s.charCodeAt(--i)) >>> 0; return h.toString(36); }
  function api(which) { var u = String(((QCStore.load().sending) || {}).server || '').trim(); return u ? u.replace(/\/[^\/]*$/, '/' + which) : ''; }
  function mem() { try { return JSON.parse(localStorage.getItem(KEY_STATE) || '{}') || {}; } catch (e) { return {}; } }
  function remember(v) { try { localStorage.setItem(KEY_STATE, JSON.stringify(v)); } catch (e) {} }

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
      if (!j) return;                                   // a job from another phone: left alone until seats are wired
      if (c.body && c.body.status && c.body.status !== j.status &&
          ['accepted', 'declined'].indexOf(c.body.status) >= 0) { j.status = c.body.status; touched++; }
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
    (S.jobs || []).forEach(function (j) {
      if (!j || !j.id) return;
      var body = JSON.stringify(j), h = hash(body);
      fresh[j.id] = h;
      if (sent[j.id] !== h) push.push({ kind: 'job', id: j.id, rev: (S.rev || 1), body: JSON.parse(body) });
    });
    Object.keys(sent).forEach(function (id) {
      if (fresh[id]) return;
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
        remember({ since: res.now, sent: fresh, at: Date.now() });
        if (touched) { QCStore.save(); if (opts.onChange) opts.onChange(touched, res); }
        return res;
      })
      .catch(function (e) { running = false; return null; });
  }

  function lastAt() { return mem().at || 0; }
  window.QCSync = { now: now, busyDays: busyDays, rules: rules, applyChanges: applyChanges, lastAt: lastAt, hash: hash };
})();
