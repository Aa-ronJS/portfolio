/* Quote & Chase: real sending through the relay (Twilio for SMS, Resend for email). Credentials stay on this phone
 * unless the relay has them as environment variables. Everything degrades to the share sheet and calendar reminders. */
(function () {
  'use strict';
  function cfg() { var s = window.QCStore ? QCStore.load() : {}; return s.sending || {}; }
  function ready(channel) { var c = cfg(); if (!c.server) return false; if (c.server_has_creds) return true; if (channel === 'sms') return !!(c.twilio_sid && c.twilio_token && (c.twilio_service || c.twilio_from)); return !!(c.resend_key && c.resend_from); }
  function call(payload) {
    var c = cfg(); if (!c.server) return Promise.reject(new Error('No sending server set up'));
    if (!c.server_has_creds) payload.creds = { twilio_sid: c.twilio_sid, twilio_token: c.twilio_token, twilio_service: c.twilio_service, twilio_from: c.twilio_from, resend_key: c.resend_key, resend_from: c.resend_from };
    var f = window.__qcRelayFetch || window.fetch;
    return f(c.server, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Bad reply from server' }; }); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Sending failed'); return j; });
  }
  function atHour(dayIso, hour) { return new Date(dayIso + 'T' + (hour < 10 ? '0' : '') + hour + ':00:00').toISOString(); }
  function pdfBase64(doc) { var ab = doc.output('arraybuffer'), u = new Uint8Array(ab), s = ''; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  // Schedule a list of {day, channel, to, body, subject, ref} and return the ids as they come back; failures are reported, not thrown
  function scheduleAll(items, hour) {
    return Promise.all(items.map(function (it) { return call({ action: 'schedule', channel: it.channel, to: it.to, body: it.body, subject: it.subject, send_at: atHour(it.day, hour), ref: it.ref }).then(function (r) { return { ok: true, id: r.id, channel: it.channel, day: it.day, to: it.to, what: it.ref }; }).catch(function (e) { return { ok: false, error: e.message, channel: it.channel, day: it.day, to: it.to, what: it.ref }; }); }));
  }
  function cancelAll(list) { return Promise.all((list || []).filter(function (x) { return x && x.id && !x.cancelled && !x.sent; }).map(function (x) { return call({ action: 'cancel', channel: x.channel, id: x.id }).then(function () { x.cancelled = true; return true; }).catch(function (e) { x.cancel_error = e.message; return false; }); })); }
  window.QCMsg = { cfg: cfg, ready: ready, call: call, scheduleAll: scheduleAll, cancelAll: cancelAll, pdfBase64: pdfBase64, atHour: atHour };
})();
