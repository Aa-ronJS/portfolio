/* Quote & Chase: real sending through the relay (Twilio for SMS, Resend for email). Credentials stay on this phone
 * unless the relay has them as environment variables. Everything degrades to the share sheet and calendar reminders.
 * Every send, schedule, cancel and failure is written to the sent log (state.log.sent, newest first, 500 kept). */
(function () {
  'use strict';
  function cfg() { var s = window.QCStore ? QCStore.load() : {}; return s.sending || {}; }
  function todayIso() { try { if (window.QCStore && QCStore.today) return QCStore.today(); } catch (e) {} var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate(); }
  // hosted = sending runs through Aaron's relay in the painter's name until hosted_until; past that day nothing is ready until he extends it or the painter connects his own accounts
  function hostedEnded(c) { c = c || cfg(); return !!(c.hosted && /^\d{4}-\d{2}-\d{2}$/.test(String(c.hosted_until || '')) && String(c.hosted_until) < todayIso()); }
  function ready(channel) { var c = cfg(); if (!c.server) return false; if (hostedEnded(c)) return false; if (c.server_has_creds) return true; if (channel === 'sms') return !!(c.twilio_sid && c.twilio_token && (c.twilio_service || c.twilio_from)); return !!(c.resend_key && c.resend_from); }
  // Australian landlines: 02, 03, 07, 08 (or +61 2/3/7/8). An SMS to one of these is silently lost, so the app warns and uses email instead.
  function isLandline(phone) { var s = String(phone || '').replace(/[^\d+]/g, ''); if (s.indexOf('+61') === 0) s = '0' + s.slice(3); else if (s.indexOf('61') === 0 && s.length === 11) s = '0' + s.slice(2); return /^0[2378]\d{8}$/.test(s); }
  function isMobile(phone) { var s = String(phone || '').replace(/[^\d+]/g, ''); if (s.indexOf('+61') === 0) s = '0' + s.slice(3); else if (s.indexOf('61') === 0 && s.length === 11) s = '0' + s.slice(2); return /^04\d{8}$/.test(s) || (/^\+/.test(s) && !isLandline(phone)); }
  function addLog(entry) {
    try {
      entry.t = entry.t || new Date().toISOString(); if (entry.text) entry.text = String(entry.text).slice(0, 300);
      if (window.QCStore && QCStore.addLog) { QCStore.addLog(entry); return; }
      var s = QCStore.load(); s.log = s.log && typeof s.log === 'object' ? s.log : {}; s.log.sent = Array.isArray(s.log.sent) ? s.log.sent : []; s.log.sent.unshift(entry); if (s.log.sent.length > 500) s.log.sent.length = 500; QCStore.save();
    } catch (e) {}
  }
  // payload.meta = { job, ref, kind } is for the log only and never leaves the phone
  function call(payload) {
    var c = cfg(), meta = payload.meta || {}; delete payload.meta;
    var logged = /^(send|schedule|cancel|test)$/.test(payload.action);
    var base = { job: meta.job || '', ref: payload.ref || meta.ref || '', channel: payload.channel || '', to: payload.to || '', kind: payload.action === 'cancel' ? 'cancel' : payload.action === 'schedule' ? 'schedule' : 'send', text: payload.body || payload.subject || (payload.action === 'cancel' ? 'cancel ' + payload.id : payload.action), send_at: payload.send_at || '' };
    if (!c.server) { if (logged) addLog(Object.assign({}, base, { kind: 'fail', ok: false, error: 'No sending server set up' })); return Promise.reject(new Error('No sending server set up')); }
    if (c.token) payload.token = c.token;
    if (!c.server_has_creds) payload.creds = { twilio_sid: c.twilio_sid, twilio_token: c.twilio_token, twilio_api_key: c.twilio_api_key, twilio_service: c.twilio_service, twilio_from: c.twilio_from, resend_key: c.resend_key, resend_from: c.resend_from };
    var f = window.__qcRelayFetch || window.fetch;
    return f(c.server, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Bad reply from server' }; }); })
      .then(function (j) {
        // every reply carries what is left of this month's messages; the app keeps it so a screen can say so without asking again
        if (j && (j.left != null || j.included != null)) balance({ left: j.left, used: j.used, included: j.included, plan: j.plan, period: j.period, at: Date.now() });
        if (!j.ok) { var err = new Error(j.error || 'Sending failed'); if (j.out_of_messages) err.outOfMessages = true; throw err; }
        if (logged) addLog(Object.assign({}, base, { id: j.id || payload.id || '', ok: true })); return j; })
      .catch(function (e) { if (logged) addLog(Object.assign({}, base, { kind: 'fail', ok: false, error: e.message })); throw e; });
  }
  // what the relay last told us about the allowance, kept on the phone so no screen has to ask before it can draw
  function balance(next) {
    try { var st = QCStore.load(); if (!st.sending || typeof st.sending !== 'object') st.sending = {};
      if (next) { ['left', 'used', 'included', 'plan', 'period', 'at'].forEach(function (k) { if (next[k] != null) st.sending['bal_' + k] = next[k]; }); QCStore.save(); }
      var c = st.sending; return { left: c.bal_left == null ? null : +c.bal_left, used: +c.bal_used || 0, included: c.bal_included == null ? null : +c.bal_included, plan: c.bal_plan || '', period: c.bal_period || '', at: +c.bal_at || 0 };
    } catch (e) { return { left: null, used: 0, included: null, plan: '', period: '', at: 0 }; }
  }
  function outOfMessages() { var b = balance(); return b.left != null && b.left <= 0; }
  function atHour(dayIso, hour) { return new Date(dayIso + 'T' + (hour < 10 ? '0' : '') + hour + ':00:00').toISOString(); }
  function pdfBase64(doc) { var ab = doc.output('arraybuffer'), u = new Uint8Array(ab), s = ''; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  // Provider windows: Twilio holds an SMS 35 days ahead, Resend an email 30 days ahead. Anything later waits in the app's local queue.
  var WINDOW_DAYS = { sms: 35, email: 30 };
  function withinWindow(sendAtIso, channel) { var ms = new Date(sendAtIso).getTime() - Date.now(); return ms <= ((WINDOW_DAYS[channel] || 30) - 0.5) * 86400000; }
  // Schedule a list of {day, channel, to, body, subject, ref, send_at?, key?, job?} and return the ids as they come back; failures are reported, not thrown
  function scheduleAll(items, hour) {
    return Promise.all(items.map(function (it) {
      var sendAt = it.send_at || atHour(it.day, hour);
      return call({ action: 'schedule', channel: it.channel, to: it.to, body: it.body, subject: it.subject, send_at: sendAt, ref: it.ref, key: it.key, reply_to: it.channel === 'email' ? (it.reply_to || undefined) : undefined, meta: { job: it.job, ref: it.ref } })
        .then(function (r) { return { ok: true, id: r.id, channel: it.channel, day: it.day, send_at: sendAt, to: it.to, what: it.ref, key: it.key, text: String(it.body || '').slice(0, 300), reused: !!r.reused }; })
        .catch(function (e) { return { ok: false, error: e.message, channel: it.channel, day: it.day, send_at: sendAt, to: it.to, what: it.ref, key: it.key, text: String(it.body || '').slice(0, 300) }; });
    }));
  }
  function cancelAll(list, jobId) { return Promise.all((list || []).filter(function (x) { return x && x.id && !x.cancelled && !x.sent; }).map(function (x) { return call({ action: 'cancel', channel: x.channel, id: x.id, meta: { job: jobId || x.job || '', ref: x.what || '' } }).then(function () { x.cancelled = true; x.cancel_error = ''; return true; }).catch(function (e) { x.cancel_error = e.message; return false; }); })); }
  window.QCMsg = { cfg: cfg, ready: ready, balance: balance, outOfMessages: outOfMessages, hostedEnded: hostedEnded, call: call, scheduleAll: scheduleAll, cancelAll: cancelAll, pdfBase64: pdfBase64, atHour: atHour, isLandline: isLandline, isMobile: isMobile, addLog: addLog, withinWindow: withinWindow, WINDOW_DAYS: WINDOW_DAYS };
})();
