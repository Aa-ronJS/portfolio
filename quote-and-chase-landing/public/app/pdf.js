/* Quote & Chase app: PDF documents with jsPDF (A4, mm). */
(function () {
  'use strict';
  function money(n) { var v = Math.round(n); return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-AU'); }
  function fmtDate(iso) { if (!iso) return ''; var d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }); }

  function Doc() {
    var jsPDF = window.jspdf.jsPDF; this.d = new jsPDF({ unit: 'mm', format: 'a4' }); this.y = 18; this.L = 16; this.R = 194; this.W = 178;
    this.d.setFont('helvetica', 'normal');
  }
  Doc.prototype.need = function (h) { if (this.y + h > 280) { this.d.addPage(); this.y = 18; } };
  Doc.prototype.text = function (s, size, style, color, x, w) {
    this.d.setFontSize(size || 10); this.d.setFont('helvetica', style || 'normal'); this.d.setTextColor.apply(this.d, color || [28, 26, 23]);
    var lines = this.d.splitTextToSize(String(s || ''), w || this.W), lh = (size || 10) * 0.42;
    this.need(lines.length * lh); this.d.text(lines, x || this.L, this.y); this.y += lines.length * lh; return this;
  };
  Doc.prototype.gap = function (n) { this.y += n || 3; return this; };
  Doc.prototype.h = function (s) { this.gap(5); this.text(s.toUpperCase(), 8.5, 'bold', [122, 116, 107]); this.gap(1.5); return this; };
  Doc.prototype.rule = function (w, c) { this.need(2); this.d.setDrawColor.apply(this.d, c || [28, 26, 23]); this.d.setLineWidth(w || 0.8); this.d.line(this.L, this.y, this.R, this.y); this.y += 3; return this; };
  Doc.prototype.bullets = function (arr) { var self = this; (arr || []).forEach(function (t) { self.text('•  ' + t, 9.5, 'normal', [60, 56, 50], self.L + 1, self.W - 2); self.gap(0.8); }); return this; };
  Doc.prototype.table = function (cols, rows, total) {
    // cols: [{t, w, align}], rows: [[...]]
    var self = this, d = this.d, x0 = this.L;
    this.need(8); d.setFontSize(7.5); d.setFont('helvetica', 'bold'); d.setTextColor(122, 116, 107);
    var x = x0; cols.forEach(function (c) { d.text(c.t.toUpperCase(), c.align === 'right' ? x + c.w - 1 : x + 1, self.y, { align: c.align === 'right' ? 'right' : 'left' }); x += c.w; });
    this.y += 1.5; d.setDrawColor(201, 195, 184); d.setLineWidth(0.3); d.line(x0, this.y, this.R, this.y); this.y += 4;
    rows.forEach(function (r) {
      d.setFontSize(9.5); d.setFont('helvetica', r.bold ? 'bold' : 'normal'); d.setTextColor.apply(d, r.color || [28, 26, 23]);
      var cells = r.cells || r, wrapped = cells.map(function (c, i) { return d.splitTextToSize(String(c == null ? '' : c), cols[i].w - 2); });
      var lines = Math.max.apply(null, wrapped.map(function (w) { return w.length; })), rh = lines * 4.2 + 1.8;
      self.need(rh); var xx = x0;
      wrapped.forEach(function (w, i) { d.text(w, cols[i].align === 'right' ? xx + cols[i].w - 1 : xx + 1, self.y, { align: cols[i].align === 'right' ? 'right' : 'left' }); xx += cols[i].w; });
      self.y += rh; if (!r.noline) { d.setDrawColor(230, 225, 216); d.setLineWidth(0.2); d.line(x0, self.y - 1.2, self.R, self.y - 1.2); }
    });
    return this;
  };
  Doc.prototype.box = function (s, size, style, fill, stroke) {
    var d = this.d, lines = d.splitTextToSize(String(s || ''), this.W - 8), lh = (size || 10) * 0.42, h = lines.length * lh + 6.5;
    this.need(h + 3);
    if (fill) { d.setFillColor.apply(d, fill); d.rect(this.L, this.y, this.W, h, 'F'); }
    if (stroke) { d.setDrawColor.apply(d, stroke); d.setLineWidth(0.5); d.rect(this.L, this.y, this.W, h); }
    d.setFontSize(size || 10); d.setFont('helvetica', style || 'normal'); d.setTextColor(28, 26, 23);
    d.text(lines, this.L + 4, this.y + 4.5 + (size || 10) * 0.2);
    this.y += h + 3; return this;
  };
  Doc.prototype.header = function (s, title, no, meta) {
    var d = this.d, det = s.details;
    if (det.logo) { try { d.addImage(det.logo, 'PNG', this.L, this.y - 4, 0, 14); this.y += 12; } catch (e) {} }
    this.text(det.trading_name || 'Your Painting Co', 16, 'bold'); this.gap(0.5);
    this.text([det.owner_name, det.phone, det.email].filter(Boolean).join('  ·  '), 9, 'normal', [74, 70, 64]);
    this.text([det.abn ? 'ABN ' + det.abn : '', det.address].filter(Boolean).join('  ·  '), 9, 'normal', [74, 70, 64]);
    var y0 = 18; d.setFontSize(8); d.setTextColor(122, 116, 107); d.text(title.toUpperCase(), this.R, y0, { align: 'right' });
    d.setFontSize(15); d.setFont('helvetica', 'bold'); d.setTextColor(28, 26, 23); d.text(no, this.R, y0 + 7, { align: 'right' });
    d.setFontSize(9); d.setFont('helvetica', 'normal'); d.setTextColor(74, 70, 64);
    meta.forEach(function (m, i) { d.text(m, 194, y0 + 13 + i * 4.5, { align: 'right' }); });
    this.y = Math.max(this.y, y0 + 13 + meta.length * 4.5) + 3; this.rule(0.9); this.gap(2); return this;
  };

  function quotePDF(job, s, priced) {
    var det = s.details, doc = new Doc(), valid = QCStore.addDays(job.quote.date, parseInt(det.quote_valid_days, 10) || 30);
    doc.header(s, 'Quote', job.quote_no, ['Date: ' + fmtDate(job.quote.date), 'Valid until: ' + fmtDate(valid)]);
    var c = job.client;
    doc.h('Prepared for'); doc.text(c.name || '', 10, 'bold'); doc.text([c.address, [c.phone, c.email].filter(Boolean).join('  ·  ')].filter(Boolean).join('\n'), 9.5);
    doc.h('The job'); doc.text(job.summary || '', 9.5);
    doc.h('Price');
    var rows = priced.lines.map(function (l) { return { cells: [(l.room && l.room !== 'Extras' && l.room !== 'Travel' ? l.room + ': ' : '') + l.desc + (l.confirm ? '  (TO CONFIRM)' : ''), l.qty, l.unit, l.rate ? money(l.rate) : '', money(l.amount)], color: l.confirm ? [154, 75, 0] : null }; });
    rows.push({ cells: ['', '', '', 'Subtotal', money(priced.subtotal)], noline: true, color: [74, 70, 64] });
    if (priced.gst) rows.push({ cells: ['', '', '', 'GST 10%', money(priced.gst)], noline: true, color: [74, 70, 64] });
    rows.push({ cells: ['', '', '', 'Total' + (priced.gst ? ' inc GST' : ''), money(priced.total)], bold: true, noline: true });
    doc.table([{ t: 'Item', w: 88 }, { t: 'Qty', w: 18, align: 'right' }, { t: 'Unit', w: 16 }, { t: 'Rate', w: 28, align: 'right' }, { t: 'Amount', w: 28, align: 'right' }], rows);
    var based = [];
    if (priced.measured_rooms) based.push(priced.measured_rooms + ' of ' + priced.total_rooms + ' rooms measured on site from photos.');
    based = based.concat(priced.assumptions);
    if (based.length) { doc.h('What this quote is based on'); doc.bullets(based); }
    doc.h('What is included'); doc.bullets(s.wording.included);
    doc.h('What is not included'); doc.bullets(s.wording.excluded);
    doc.h('Terms'); doc.bullets([
      'This quote is valid for ' + (det.quote_valid_days || 30) + ' days from the date above.',
      'A ' + (det.deposit_pct || 20) + '% deposit confirms your booking. The balance is due within ' + (det.balance_days || 7) + ' days of completion.',
      'Weather can move exterior dates. We will keep you informed.',
      'Workmanship is guaranteed for ' + (s.wording.warranty_years || 5) + ' years against peeling and flaking caused by our application.']);
    doc.h('How to accept'); doc.text(s.wording.accept, 9.5);
    doc.gap(3); doc.box('Deposit of ' + money(priced.deposit) + '  ·  ' + [det.account_name ? 'Account: ' + det.account_name : '', det.bsb ? 'BSB ' + det.bsb : '', det.account_number ? 'Acc ' + det.account_number : '', 'Ref ' + job.quote_no].filter(Boolean).join('  ·  '), 9, 'bold', [243, 240, 234]);
    doc.gap(3); doc.text('Thanks for asking us to quote. ' + [det.owner_name, det.trading_name].filter(Boolean).join(', '), 8.5, 'normal', [122, 116, 107]);
    return doc.d;
  }

  function invoicePDF(job, inv, s) {
    var det = s.details, doc = new Doc();
    doc.header(s, 'Tax invoice', inv.no, ['Date: ' + fmtDate(inv.date), 'Due: ' + fmtDate(inv.due), 'Quote ref: ' + job.quote_no]);
    var c = job.client;
    doc.h('Bill to'); doc.text(c.name || '', 10, 'bold'); doc.text([c.address, [c.phone, c.email].filter(Boolean).join('  ·  ')].filter(Boolean).join('\n'), 9.5);
    doc.h('Work'); doc.text((job.summary || '') + '\n' + inv.kind_line, 9.5);
    doc.h('Amount');
    var rows = inv.lines.map(function (l) { return { cells: [l.desc, money(l.amount)] }; });
    rows.push({ cells: ['Subtotal', money(inv.subtotal)], noline: true, color: [74, 70, 64] });
    if (inv.gst) rows.push({ cells: ['GST 10%', money(inv.gst)], noline: true, color: [74, 70, 64] });
    rows.push({ cells: ['Total' + (inv.gst ? ' inc GST' : ''), money(inv.total)], bold: true, noline: true });
    doc.table([{ t: 'Description', w: 140 }, { t: 'Amount', w: 38, align: 'right' }], rows);
    doc.gap(4); doc.box('Amount due by ' + fmtDate(inv.due) + ':  ' + money(inv.total) + '      Reference ' + inv.no, 10.5, 'bold', null, [28, 26, 23]);
    doc.box('Pay by bank transfer: ' + [det.account_name ? 'Account name ' + det.account_name : '', det.bsb ? 'BSB ' + det.bsb : '', det.account_number ? 'Account ' + det.account_number : ''].filter(Boolean).join('  ·  ') + (det.other_payments ? '\n' + det.other_payments : ''), 9, 'normal', [243, 240, 234]);
    if (inv.pay_url) { doc.need(12); doc.d.setFontSize(10); doc.d.setFont('helvetica', 'bold'); doc.d.setTextColor(27, 95, 173); doc.d.textWithLink('Pay by card online: ' + inv.pay_url, doc.L, doc.y, { url: inv.pay_url }); doc.y += 6; doc.d.setTextColor(28, 26, 23); }
    doc.gap(3); doc.text('Thank you for your business. ' + [det.owner_name, det.trading_name].filter(Boolean).join(', '), 8.5, 'normal', [122, 116, 107]);
    return doc.d;
  }

  function deliver(d, filename) {
    var blob = d.output('blob');
    var file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: filename }).then(function () { return 'shared'; }).catch(function () { return download(blob, filename); });
    }
    return Promise.resolve(download(blob, filename));
  }
  function download(blob, filename) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); return 'downloaded';
  }

  window.QCPdf = { quotePDF: quotePDF, invoicePDF: invoicePDF, deliver: deliver, money: money, fmtDate: fmtDate };
})();
