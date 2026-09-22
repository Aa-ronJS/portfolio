/* Chasem: calendar files (.ics) for bookings and follow-up reminders, a Google Calendar link,
 * and the business-day rules for reminder send times (weekends and public holidays roll forward). */
(function () {
  'use strict';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function icsDate(iso) { return iso.replace(/-/g, ''); } // all-day, local
  function icsStamp(d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; }
  function icsLocal(iso, hour, minute) { var p = String(iso).split('-'), d = new Date(+p[0], +p[1] - 1, +p[2], hour || 0, minute || 0); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function escText(s) { return String(s == null ? '' : s).replace(/\r/g, '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, function (c) { return '\\' + c; }); }
  function bytes(s) { try { return new TextEncoder().encode(s).length; } catch (e) { return s.length; } }
  function fold(line) { // 75 octets per line, never splitting a surrogate pair
    var out = '', cur = ''; var chars = Array.from(line);
    for (var i = 0; i < chars.length; i++) { var ch = chars[i]; if (bytes(cur + ch) > (out ? 74 : 75)) { out += cur + '\r\n '; cur = ch; } else cur += ch; }
    return out + cur; }
  function addDays(iso, n) { var p = String(iso).split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  // events: [{ uid, summary, description, location, url, start (yyyy-mm-dd), end (exclusive yyyy-mm-dd) for all-day, or startHour/endHour for timed, alarmHour }]
  function ics(events, calName) {
    var now = icsStamp(new Date()), L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chasem//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + escText(calName || 'Chasem')];
    events.forEach(function (e) {
      L.push('BEGIN:VEVENT', 'UID:' + e.uid + '@quote-and-chase', 'DTSTAMP:' + now, 'SUMMARY:' + escText(e.summary));
      if (e.startMin != null) { L.push('DTSTART:' + icsLocal(e.start, Math.floor(e.startMin / 60), e.startMin % 60), 'DTEND:' + icsLocal(e.end || e.start, Math.floor((e.endMin || e.startMin + 30) / 60), (e.endMin || e.startMin + 30) % 60)); }
      else if (e.startHour != null) { L.push('DTSTART:' + icsLocal(e.start, e.startHour, 0), 'DTEND:' + icsLocal(e.end || e.start, e.endHour != null ? e.endHour : e.startHour + 1, 0)); }
      else { L.push('DTSTART;VALUE=DATE:' + icsDate(e.start), 'DTEND;VALUE=DATE:' + icsDate(e.end || addDays(e.start, 1))); }
      if (e.description) L.push('DESCRIPTION:' + escText(e.description)); if (e.location) L.push('LOCATION:' + escText(e.location)); if (e.url) L.push('URL:' + e.url);
      if (e.alarmBefore != null) { L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escText(e.summary), 'TRIGGER:-PT' + e.alarmBefore + 'M', 'END:VALARM'); }
      else if (e.alarmHour != null) { L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escText(e.summary), 'TRIGGER;VALUE=DATE-TIME:' + icsStamp(new Date(e.start + 'T' + pad(e.alarmHour) + ':00:00')), 'END:VALARM'); }
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR'); return L.map(fold).join('\r\n') + '\r\n';
  }
  function deliver(text, filename) {
    var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    try { var f = new File([blob], filename, { type: 'text/calendar' }); if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: filename }).then(function () { return 'shared'; }).catch(function () { return download(blob, filename); }); } catch (e) {}
    return Promise.resolve(download(blob, filename));
  }
  function download(blob, filename) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); return 'downloaded'; }
  function googleUrl(e) { var dates = e.startMin != null ? icsLocal(e.start, Math.floor(e.startMin / 60), e.startMin % 60) + '/' + icsLocal(e.end || e.start, Math.floor((e.endMin || e.startMin + 30) / 60), (e.endMin || e.startMin + 30) % 60) : e.startHour != null ? icsLocal(e.start, e.startHour, 0) + '/' + icsLocal(e.end || e.start, e.endHour != null ? e.endHour : e.startHour + 1, 0) : icsDate(e.start) + '/' + icsDate(e.end || addDays(e.start, 1)); return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(e.summary) + '&dates=' + dates + '&details=' + encodeURIComponent(e.description || '') + '&location=' + encodeURIComponent(e.location || ''); }

  // ---------- public holidays, 2026 and 2027
  // VERIFY YEARLY against the state government gazettes (all on data.gov.au). Written from memory in September 2026;
  // the 2027 dates for the Grand Final Friday (VIC) and anything proclaimed late are the usual pattern, not the gazette.
  // Substitute days: Boxing Day 2026 (Sat) -> Mon 28 Dec everywhere; Christmas 2027 (Sat) -> Mon 27 Dec and Boxing Day 2027 (Sun) -> Tue 28 Dec everywhere;
  // Anzac Day 2026 (Sat) has a Monday substitute in WA and the ACT only.
  var NATIONAL = {
    2026: ['2026-01-01', '2026-01-26', '2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06', '2026-04-25', '2026-12-25', '2026-12-26', '2026-12-28'],
    2027: ['2027-01-01', '2027-01-26', '2027-03-26', '2027-03-27', '2027-03-28', '2027-03-29', '2027-04-25', '2027-12-25', '2027-12-26', '2027-12-27', '2027-12-28']
  };
  var STATE = {
    NSW: ['2026-06-08', '2026-10-05', '2027-06-14', '2027-10-04'],
    VIC: ['2026-03-09', '2026-06-08', '2026-09-25', '2026-11-03', '2027-03-08', '2027-06-14', '2027-09-24', '2027-11-02'],
    QLD: ['2026-05-04', '2026-10-05', '2027-05-03', '2027-10-04'],
    SA: ['2026-03-09', '2026-06-08', '2026-10-05', '2027-03-08', '2027-06-14', '2027-10-04'],
    WA: ['2026-03-02', '2026-04-27', '2026-06-01', '2026-09-28', '2027-03-01', '2027-06-07', '2027-09-27'],
    TAS: ['2026-02-09', '2026-03-09', '2026-06-08', '2026-11-02', '2027-02-08', '2027-03-08', '2027-06-14', '2027-11-01'],
    NT: ['2026-05-04', '2026-06-08', '2026-08-03', '2027-05-03', '2027-06-14', '2027-08-02'],
    ACT: ['2026-03-09', '2026-04-27', '2026-06-01', '2026-06-08', '2026-10-05', '2027-03-08', '2027-05-31', '2027-06-14', '2027-10-04']
  };
  var HOL_CACHE = {};
  function holidays(state) { var st = String(state || '').toUpperCase(); if (HOL_CACHE[st]) return HOL_CACHE[st]; var out = {}; Object.keys(NATIONAL).forEach(function (y) { NATIONAL[y].forEach(function (d) { out[d] = 1; }); }); (STATE[st] || []).forEach(function (d) { out[d] = 1; }); HOL_CACHE[st] = out; return out; }
  function isHoliday(iso, state) { return !!holidays(state)[iso]; }
  function isBusinessDay(iso, state) { var p = String(iso).split('-'), dow = new Date(+p[0], +p[1] - 1, +p[2]).getDay(); return dow !== 0 && dow !== 6 && !isHoliday(iso, state); }
  function nextBusinessDay(iso, state) { var d = iso, n = 0; while (!isBusinessDay(d, state) && n < 14) { d = addDays(d, 1); n++; } return d; }
  // When a reminder dated `iso` should actually go: the next business day at `hour` (floored at 8, capped at 18, default 9).
  // Local time; the phone's zone. Note DST: a time scheduled in September for October (NSW/VIC/SA/TAS/ACT change on the
  // first Sunday of October) is converted to UTC at scheduling time by the browser, so 9:00 stays 9:00 local.
  function nextSendTime(iso, hour, state) {
    var h = parseInt(hour, 10); if (isNaN(h)) h = 9; h = Math.min(18, Math.max(8, h));
    var day = nextBusinessDay(String(iso || '').slice(0, 10), state), p = day.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2], h, 0, 0);
    return { day: day, hour: h, date: d, iso: d.toISOString(), moved: day !== iso };
  }
  window.QCCal = { ics: ics, deliver: deliver, googleUrl: googleUrl, addDays: addDays, holidays: holidays, isHoliday: isHoliday, isBusinessDay: isBusinessDay, nextBusinessDay: nextBusinessDay, nextSendTime: nextSendTime, HOLIDAYS: { national: NATIONAL, state: STATE } };
})();
