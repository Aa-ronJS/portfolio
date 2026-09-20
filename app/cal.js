/* Quote & Chase: calendar files (.ics) for bookings and follow-up reminders, plus a Google Calendar link. */
(function () {
  'use strict';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function icsDate(iso) { return iso.replace(/-/g, ''); } // all-day, local
  function icsStamp(d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; }
  function icsLocal(iso, hour, minute) { return icsDate(iso) + 'T' + pad(hour || 0) + pad(minute || 0) + '00'; }
  function escText(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, function (c) { return '\\' + c; }); }
  function fold(line) { var out = '', s = line; while (s.length > 72) { out += s.slice(0, 72) + '\r\n '; s = s.slice(72); } return out + s; }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  // events: [{ uid, summary, description, location, url, start (yyyy-mm-dd), end (exclusive yyyy-mm-dd) for all-day, or startHour/endHour for timed, alarmHour }]
  function ics(events, calName) {
    var now = icsStamp(new Date()), L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Quote and Chase//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + escText(calName || 'Quote and Chase')];
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
  window.QCCal = { ics: ics, deliver: deliver, googleUrl: googleUrl, addDays: addDays };
})();
