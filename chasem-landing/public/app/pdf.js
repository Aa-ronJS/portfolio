/* Chasem app: PDF documents with jsPDF (A4, mm). Quote, invoice, receipt, statement, variation and credit note.
   Every job/invoice/settings field read here may be missing on old data; each one falls back (no snapshot -> current settings, no number -> job.quote_no). */
(function () {
  'use strict';
  var INK = [28, 26, 23], BODY = [50, 47, 43], MUTE = [74, 70, 64], FAINT = [122, 116, 107], RULE = [201, 195, 184], HAIR = [230, 225, 216], PAPER = [243, 240, 234];
  var BLUE = [27, 95, 173], ORANGE = [154, 75, 0], RED = [176, 42, 42];
  // Written-contract thresholds, inc GST, by state: at or above the figure a contract signed by both parties is expected before work starts.
  // CHECK these against the current Acts before relying on them: NSW Home Building Act (small jobs form from $5,000, full contract from $20,000),
  // SA Building Work Contractors Act ($12,000), VIC Domestic Building Contracts Act ($10,000), QLD QBCC Act ($3,300), WA Home Building Contracts Act ($7,500),
  // TAS Residential Building Work Contracts and Dispute Resolution Act ($20,000), NT and ACT ($12,000).
  var THRESHOLDS = { NSW: [5000, 20000], SA: [12000], VIC: [10000], QLD: [3300], WA: [7500], TAS: [20000], NT: [12000], ACT: [12000] };
  var EXT_KEYS = { p_weatherboard: 1, p_render: 1, p_eaves: 1, p_gutters: 1, p_ext_door: 1, p_ext_window: 1, p_deck: 1, p_fence: 1, p_pressure: 1, p_scaffold: 1, p_tower: 1 };
  var GROUP_LABEL = { Job: 'Whole job', Extras: 'Extras', Travel: 'Travel', Adjustments: 'Adjustments', Paint: 'Paint' };
  var GROUP_ORDER = { Extras: 1, Paint: 2, Job: 3, Travel: 4, Adjustments: 5 };
  var PAINT_LABEL = { walls: 'Walls', ceilings: 'Ceilings', feature: 'Feature walls', enamel: 'Doors, windows and trim', exterior: 'Exterior surfaces', oil: 'Decks', sealer: 'Sealer where needed' };
  var METHOD = { transfer: 'Bank transfer', cash: 'Cash', card: 'Card', other: 'Other', eft: 'Bank transfer' };

  // ---- small helpers -------------------------------------------------------------------------
  function num(v) { var x = parseFloat(v); return isNaN(x) ? 0 : x; }
  function r2(x) { return Math.round(num(x) * 100) / 100; }
  function hasCents(n) { var v = r2(n); return Math.abs(v - Math.round(v)) >= 0.005; }
  // $1,234 when the cents are .00, $1,234.50 otherwise; cents=true forces two decimals (a page prints all its figures the same way)
  function money(n, cents) { var v = r2(n), a = Math.abs(v), str = (cents || hasCents(v)) ? a.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(a).toLocaleString('en-AU'); return (v <= -0.005 ? '-$' : '$') + str; }
  function fmtDate(iso) { if (!iso) return ''; var d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function shortDate(iso) { if (!iso) return ''; var d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); }
  // jsPDF's built-in fonts cover Latin-1 only: map curly quotes and dashes, drop emoji and other symbols rather than print garbage
  function clean(s) { return String(s == null ? '' : s).replace(/[‘’‚]/g, "'").replace(/[“”„]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/ /g, ' ').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, ''); }
  function today() { return window.QCStore ? QCStore.today() : new Date().toISOString().slice(0, 10); }
  function addDays(iso, n) { if (window.QCStore) return QCStore.addDays(iso, n); var d = new Date((iso || today()) + 'T00:00:00'); d.setDate(d.getDate() + (parseInt(n, 10) || 0)); return d.toISOString().slice(0, 10); }
  function sum(arr, f) { var t = 0; (arr || []).forEach(function (x) { t += num(f ? f(x) : x); }); return r2(t); }
  function plural(n, one, many) { return num(n) === 1 ? one : many; }
  function qtyText(q) { var x = num(q); return x ? String(Math.round(x * 100) / 100) : ''; }
  function unitText(u, q) { u = String(u || ''); if (u === 'hour' || u === 'hours') return plural(q, 'hour', 'hours'); if (u === 'day' || u === 'days') return plural(q, 'day', 'days'); return u; }
  function lineDesc(l) { return String(l.client_desc || l.desc || '') + (l.confirm ? '  (TO CONFIRM)' : ''); }
  function lum(rgb) { return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]; }
  // brand colour: #rgb or #rrggbb; anything else, or a colour too pale to read as text, falls back to the standard blue
  function accent(s) {
    var raw = String((s && s.details && s.details.brand_colour) || '').trim(), m = /^#?([0-9a-f]{6})$/i.exec(raw), m3 = /^#?([0-9a-f]{3})$/i.exec(raw);
    if (!m && m3) m = [0, m3[1].replace(/./g, function (ch) { return ch + ch; })];
    if (!m) return BLUE.slice();
    var rgb = [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    return lum(rgb) > 190 ? BLUE.slice() : rgb;
  }
  function onAccent(rgb) { return lum(rgb) > 150 ? INK : [255, 255, 255]; }
  function imgFormat(data) { var m = /^data:image\/(png|jpe?g);base64,/i.exec(String(data || '')); return m ? (m[1].toLowerCase() === 'png' ? 'PNG' : 'JPEG') : ''; }
  function safeUrl(u) { return /^https:\/\/[^\s"'<>]+$/.test(String(u || '')) ? String(u) : ''; }

  // settings may be missing or partial (old data, tests); snapshot on the frozen quote wins over current settings
  function settingsOf(s) { s = s || (window.QCStore ? QCStore.load() : null) || {}; return { details: s.details || {}, wording: s.wording || {}, costing: s.costing || {}, rules: s.rules || {} }; }
  function snapDetails(job, s) { var snap = job && job.quote && job.quote.snapshot; return Object.assign({}, s.details, snap && snap.details && typeof snap.details === 'object' ? snap.details : {}); }
  function snapWording(job, s) { var snap = job && job.quote && job.quote.snapshot; return Object.assign({}, s.wording, snap && snap.wording && typeof snap.wording === 'object' ? snap.wording : {}); }
  function quoteNo(job) { return String((job && job.quote && job.quote.number) || (job && job.quote_no) || 'Q-?'); }
  function baseNo(job) { return quoteNo(job).replace(/-R\d+$/i, ''); }
  function stateOf(det, job) {
    var st = String(det.state || '').toUpperCase(); if (THRESHOLDS[st]) return st;
    var m = /\b(\d{4})\b\s*$/.exec(String((job && job.client && job.client.address) || '').trim()) || /\b(\d{4})\b/.exec(String(det.postcode || ''));
    if (!m) return ''; var n = parseInt(m[1], 10);
    if ((n >= 1000 && n <= 2599) || (n >= 2619 && n <= 2899) || (n >= 2921 && n <= 2999)) return 'NSW';
    if ((n >= 200 && n <= 299) || (n >= 2600 && n <= 2618) || (n >= 2900 && n <= 2920)) return 'ACT';
    if ((n >= 3000 && n <= 3999) || (n >= 8000 && n <= 8999)) return 'VIC';
    if ((n >= 4000 && n <= 4999) || (n >= 9000 && n <= 9999)) return 'QLD';
    if (n >= 5000 && n <= 5999) return 'SA'; if (n >= 6000 && n <= 6999) return 'WA'; if (n >= 7000 && n <= 7999) return 'TAS'; if (n >= 800 && n <= 999) return 'NT';
    return '';
  }
  function contractThreshold(det, job, total, state) { var st = THRESHOLDS[String(state || '').toUpperCase()] ? String(state).toUpperCase() : stateOf(det, job), list = THRESHOLDS[st] || [], hit = 0; list.forEach(function (t) { if (total >= t) hit = t; }); return hit; }
  function contractState(det, job, state) { return THRESHOLDS[String(state || '').toUpperCase()] ? String(state).toUpperCase() : stateOf(det, job); }
  // split a term into sentences so one clause can be dropped (a room clause on an exterior job, a deposit clause when there is no deposit)
  function sentences(t) { return String(t || '').match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || []; }
  function dropSentences(terms, re) { var out = []; (terms || []).forEach(function (t) { var keep = sentences(t).filter(function (s) { return !re.test(s); }).join('').trim(); if (keep) out.push(keep); }); return out; }
  function hasBank(det) { return !!(String(det.bsb || '').trim() && String(det.account_number || '').trim()); }
  function balanceDays(job, det) { var v = job && job.balance_days != null && job.balance_days !== '' ? job.balance_days : det.balance_days; var n = parseInt(v, 10); return isNaN(n) || n < 0 ? 7 : n; }
  function depositPct(s, job, det) { try { if (window.QCPricing && QCPricing.depositPct) return num(QCPricing.depositPct(s, job)); } catch (e) {} var v = job && job.deposit_pct != null && job.deposit_pct !== '' ? job.deposit_pct : det.deposit_pct; return v === '' || v == null || isNaN(parseFloat(v)) ? 10 : Math.min(100, Math.max(0, parseFloat(v))); }
  function isOptional(l, job) { if (l.optional) return true; if (l.key) return false; return ((job && job.extras) || []).some(function (x) { return x && x.optional && (x.desc || 'Extra item') === l.desc; }); }
  function isExtLine(l) { return !!(EXT_KEYS[l.key] || /^exterior/i.test(l.group || '') || l.exterior); }
  function isIntLine(l) { return !!l.key && !isExtLine(l) && !/^(Job|Travel|Adjustments|Paint)$/.test(l.group || '') && !/^(p_setup|p_high_access)$/.test(l.key); }
  function payments(inv) {
    var list = (inv.payments || []).filter(function (p) { return p && num(p.amount) !== 0; }).map(function (p) { return { date: p.date || '', amount: r2(p.amount), method: p.method || '', ref: p.ref || '' }; });
    if (!list.length && inv.paid_date) list.push({ date: inv.paid_date, amount: r2(inv.total), method: inv.paid_by || '', ref: '', legacy: true }); // old data: Mark paid set paid_date only
    return list;
  }
  function creditNotes(inv) { return (inv.credit_notes || []).filter(function (c) { return c && num(c.amount) !== 0; }); }
  function balanceOf(inv) { if (inv.void) return 0; return r2(num(inv.total) - sum(payments(inv), function (p) { return p.amount; }) - sum(creditNotes(inv), function (c) { return c.amount; })); }
  function invoiceKindWord(inv) { return { deposit: 'Deposit invoice', progress: 'Progress claim', final: 'Final invoice', full: 'Invoice' }[inv.kind] || 'Invoice'; }

  // ---- page primitives -----------------------------------------------------------------------
  function Doc(s) {
    var jsPDF = window.jspdf.jsPDF; this.d = new jsPDF({ unit: 'mm', format: 'a4' }); this.y = 16; this.L = 16; this.R = 194; this.W = 178; this.B = 281;
    this.accent = accent(s); this.cents = false; this.d.setFont('helvetica', 'normal');
  }
  Doc.prototype.m = function (n) { return money(n, this.cents); };
  Doc.prototype.need = function (h) { if (this.y + h > this.B) { this.d.addPage(); this.y = 16; } };
  Doc.prototype.gap = function (n) { this.y += n == null ? 3 : n; return this; };
  Doc.prototype.lines = function (lines, size, style, color, x, lh) { var d = this.d; d.setFontSize(size); d.setFont('helvetica', style || 'normal'); d.setTextColor.apply(d, color || INK); for (var i = 0; i < lines.length; i++) { this.need(lh); d.text(lines[i], x, this.y); this.y += lh; } return this; };
  Doc.prototype.text = function (s, size, style, color, x, w) { size = size || 9; this.d.setFontSize(size); this.d.setFont('helvetica', style || 'normal'); return this.lines(this.d.splitTextToSize(clean(s), w || this.W), size, style, color, x || this.L, size * 0.42); };
  Doc.prototype.h = function (s, x, w) { this.gap(3.2); this.need(15); this.text(String(s).toUpperCase(), 7.5, 'bold', this.accent, x, w); this.gap(1.1); return this; }; // need(15) keeps a heading with two lines of what follows
  Doc.prototype.rule = function (w, c) { this.need(2); this.d.setDrawColor.apply(this.d, c || INK); this.d.setLineWidth(w || 0.8); this.d.line(this.L, this.y, this.R, this.y); this.y += 3; return this; };
  Doc.prototype.bullets = function (arr, x, w, size) {
    var self = this, d = this.d; size = size || 8.6; x = x || this.L; w = w || this.W;
    (arr || []).forEach(function (t) { if (t == null || String(t).trim() === '') return; d.setFontSize(size); var lines = d.splitTextToSize(clean(t), w - 5), lh = size * 0.42; self.need(lh * Math.min(lines.length, 2)); d.setFillColor.apply(d, FAINT); d.circle(x + 1.6, self.y - 1.05, 0.55, 'F'); self.lines(lines, size, 'normal', BODY, x + 4.5, lh); self.gap(0.7); });
    return this;
  };
  Doc.prototype.bulletHeight = function (arr, w, size) { var d = this.d, n = 0, k = 0; size = size || 8.6; d.setFontSize(size); (arr || []).forEach(function (t) { if (t == null || String(t).trim() === '') return; n += d.splitTextToSize(clean(t), w - 5).length; k++; }); return n * size * 0.42 + k * 0.7; };
  // two bullet lists side by side (Included / Not included); each column flows on to the next page when it runs out of room
  Doc.prototype.twoCol = function (blocks) {
    var self = this, d = this.d, colW = 86, gutter = 6, size = 8.6, lh = size * 0.42, first = true;
    var cols = blocks.map(function (b, i) { return { x: self.L + i * (colW + gutter), title: b.title, items: (b.items || []).filter(function (t) { return t != null && String(t).trim() !== ''; }), idx: 0, y: 0 }; });
    var pending = function () { return cols.some(function (c) { return c.idx < c.items.length; }); };
    this.gap(3.2); this.need(15);
    while (first || pending()) {
      var top = this.y;
      cols.forEach(function (c) {
        c.y = top; if (!first && c.idx >= c.items.length) return;
        d.setFontSize(7.5); d.setFont('helvetica', 'bold'); d.setTextColor.apply(d, self.accent); d.text(String(c.title).toUpperCase() + (first ? '' : ' (CONTINUED)'), c.x, c.y); c.y += 7.5 * 0.42 + 1.1;
        var drawn = 0;
        while (c.idx < c.items.length) {
          d.setFontSize(size); var lines = d.splitTextToSize(clean(c.items[c.idx]), colW - 5), h = lines.length * lh + 0.7;
          if (c.y + h > self.B && drawn > 0) break;
          d.setFillColor.apply(d, FAINT); d.circle(c.x + 1.6, c.y - 1.05, 0.55, 'F'); d.setFont('helvetica', 'normal'); d.setTextColor.apply(d, BODY);
          for (var k = 0; k < lines.length; k++) { d.text(lines[k], c.x + 4.5, c.y); c.y += lh; }
          c.y += 0.7; c.idx++; drawn++;
        }
      });
      first = false; this.y = Math.max.apply(null, cols.map(function (c) { return c.y; }));
      if (pending()) { d.addPage(); this.y = 16; }
    }
    return this;
  };
  // rows: {cells:[...]} | {kv:[label, value]} (label right-aligned against the last column) ; flags: bold, color, size, fill, group, noline
  // geometry: text baseline at y, hairline 1.6 mm under the last line, next baseline 3.1 mm under the hairline
  Doc.prototype.table = function (cols, rows, opts) {
    opts = opts || {}; var self = this, d = this.d, x0 = this.L, size = opts.size || 8.6, last = cols.length - 1;
    function header() { if (opts.noHeader) return; self.need(8); d.setFontSize(7); d.setFont('helvetica', 'bold'); d.setTextColor.apply(d, FAINT); var x = x0; cols.forEach(function (c) { d.text(String(c.t || '').toUpperCase(), c.align === 'right' ? x + c.w - 1 : x + 1, self.y, { align: c.align === 'right' ? 'right' : 'left' }); x += c.w; }); self.y += 1.5; d.setDrawColor.apply(d, RULE); d.setLineWidth(0.3); d.line(x0, self.y, self.R, self.y); self.y += 3.8; }
    function prep(r) { var sz = r.size || size, lh = sz * 0.42, wrapped; d.setFontSize(sz); d.setFont('helvetica', r.bold ? 'bold' : 'normal');
      if (r.kv) wrapped = [d.splitTextToSize(clean(r.kv[0]), self.W - cols[last].w - 2), d.splitTextToSize(clean(r.kv[1]), cols[last].w - 2)];
      else wrapped = r.cells.slice(0, cols.length).map(function (c, i) { return d.splitTextToSize(clean(c), cols[i].w - 2); });
      var n = 1; wrapped.forEach(function (w) { if (w.length > n) n = w.length; });
      return { wrapped: wrapped, lh: lh, body: (n - 1) * lh + 1.6, h: (n - 1) * lh + 4.7 + (r.group ? 1.6 : 0) + (r.fill ? 2.2 : 0) }; }
    header();
    rows.forEach(function (r, idx) {
      var p = prep(r), needH = p.h + (r.group && rows[idx + 1] ? prep(rows[idx + 1]).h : 0);
      if (self.y + needH > self.B) { d.addPage(); self.y = 16; header(); }
      if (r.group) self.y += 1.6; if (r.fill) self.y += 1.2;
      var top = self.y, bottom = top + p.body;
      if (r.fill) { d.setFillColor.apply(d, r.fill); d.rect(x0, top - 3.4, self.W, p.body + 4.6, 'F'); }
      d.setFontSize(r.size || size); d.setFont('helvetica', r.bold ? 'bold' : 'normal'); d.setTextColor.apply(d, r.color || INK);
      if (r.kv) { d.text(p.wrapped[0], x0 + self.W - cols[last].w - 1, top, { align: 'right' }); d.text(p.wrapped[1], self.R - 1, top, { align: 'right' }); }
      else { var x = x0; p.wrapped.forEach(function (w, i) { d.text(w, cols[i].align === 'right' ? x + cols[i].w - 1 : x + 1, top, { align: cols[i].align === 'right' ? 'right' : 'left' }); x += cols[i].w; }); }
      if (!r.noline && !r.fill && !r.group) { d.setDrawColor.apply(d, HAIR); d.setLineWidth(0.2); d.line(x0, bottom, self.R, bottom); }
      self.y = bottom + 3.1 + (r.fill ? 1.0 : 0);
    });
    return this;
  };
  // boxed paragraph(s): items [{t, size, style, color, url}]
  Doc.prototype.box = function (items, fill, stroke) {
    var self = this, d = this.d, inner = this.W - 8, rows = [], h = 3.2;
    (items || []).forEach(function (it) { if (!it || !it.t) return; var sz = it.size || 9; d.setFontSize(sz); d.setFont('helvetica', it.style || 'normal'); var w = d.splitTextToSize(clean(it.t), inner), lh = sz * 0.42; rows.push({ it: it, w: w, lh: lh, sz: sz }); h += w.length * lh + 1; });
    if (!rows.length) return this; h += 1.6; this.need(h + 2);
    if (fill) { d.setFillColor.apply(d, fill); d.rect(this.L, this.y, this.W, h, 'F'); }
    if (stroke) { d.setDrawColor.apply(d, stroke); d.setLineWidth(0.5); d.rect(this.L, this.y, this.W, h); }
    var y = this.y + 3.2;
    rows.forEach(function (r) { d.setFontSize(r.sz); d.setFont('helvetica', r.it.style || 'normal'); d.setTextColor.apply(d, r.it.color || INK); r.w.forEach(function (ln, i) { y += r.lh; if (i === 0 && r.it.url) d.textWithLink(ln, self.L + 4, y, { url: r.it.url }); else d.text(ln, self.L + 4, y); }); y += 1; });
    this.y += h + 2.5; return this;
  };
  Doc.prototype.boxHeight = function (items) { var d = this.d, inner = this.W - 8, h = 3.2, any = false; (items || []).forEach(function (it) { if (!it || !it.t) return; var sz = it.size || 9; d.setFontSize(sz); d.setFont('helvetica', it.style || 'normal'); h += d.splitTextToSize(clean(it.t), inner).length * sz * 0.42 + 1; any = true; }); return any ? h + 1.6 + 2.5 : 0; };
  Doc.prototype.header = function (det, title, no, meta) {
    var d = this.d, y0 = 16, logoDone = false, fmt = imgFormat(det.logo);
    if (fmt) { try { var p = d.getImageProperties(det.logo), h = 14, w = h * p.width / p.height; if (w > 90) { w = 90; h = w * p.height / p.width; } d.addImage(det.logo, fmt, this.L, this.y - 5, w, h); this.y += h + 3; logoDone = true; } catch (e) {} } // logo replaces the trading name, with 8 mm of air below it
    if (!logoDone) { this.text(det.trading_name || 'Your business', 15, 'bold', INK, this.L, 112); this.gap(0.8); }
    var rows = [[det.owner_name, det.phone, det.email], [det.abn ? 'ABN ' + det.abn : '', det.address], [det.licence ? 'Licence ' + det.licence : '', det.insurance]];
    var self = this; rows.forEach(function (r) { var t = r.filter(Boolean).join('  ·  '); if (t) self.text(t, 8.5, 'normal', MUTE, self.L, 112); });
    d.setFontSize(8); d.setFont('helvetica', 'normal'); d.setTextColor.apply(d, FAINT); d.text(String(title).toUpperCase(), this.R, y0, { align: 'right' });
    d.setFontSize(14); d.setFont('helvetica', 'bold'); d.setTextColor.apply(d, INK); d.text(clean(no), this.R, y0 + 6.5, { align: 'right' });
    d.setFontSize(8.5); d.setFont('helvetica', 'normal'); d.setTextColor.apply(d, MUTE);
    meta.forEach(function (m, i) { d.text(clean(m), self.R, y0 + 12 + i * 4.2, { align: 'right' }); });
    this.y = Math.max(this.y, y0 + 12 + meta.length * 4.2) + 2; this.rule(0.8, this.accent); this.gap(1); return this;
  };
  Doc.prototype.signature = function (labels) {
    this.need(17); var d = this.d, y = this.y + 9; d.setDrawColor.apply(d, INK); d.setLineWidth(0.3);
    d.line(this.L, y, this.L + 104, y); d.line(this.L + 116, y, this.R, y);
    d.setFontSize(7.5); d.setFont('helvetica', 'normal'); d.setTextColor.apply(d, FAINT); d.text(labels[0], this.L, y + 3.5); d.text(labels[1], this.L + 116, y + 3.5);
    this.y = y + 7; return this;
  };
  // big rotated word across a page (PAID, VOID)
  Doc.prototype.stamp = function (word, color, page) {
    var d = this.d, cur = d.getCurrentPageInfo ? d.getCurrentPageInfo().pageNumber : 1; if (page) d.setPage(page);
    d.setFontSize(72); d.setFont('helvetica', 'bold'); d.setTextColor.apply(d, color);
    var gs = false; try { d.saveGraphicsState(); d.setGState(new d.GState({ opacity: 0.16 })); gs = true; } catch (e) {}
    d.text(word, 105, 150, { align: 'center', angle: 30 });
    if (gs) { try { d.restoreGraphicsState(); } catch (e2) {} }
    if (page) d.setPage(cur); return this;
  };
  Doc.prototype.signoff = function (det) { this.gap(2.5); this.text([det.owner_name, det.trading_name].filter(Boolean).join(', '), 8.5, 'normal', FAINT); return this; };
  Doc.prototype.finish = function (ref, watermark) {
    var d = this.d, n = d.getNumberOfPages(), i;
    for (i = 1; i <= n; i++) { d.setPage(i); if (n > 1) { d.setFontSize(7.5); d.setFont('helvetica', 'normal'); d.setTextColor.apply(d, FAINT); d.text(clean(ref) + '  ·  Page ' + i + ' of ' + n, this.R, 290, { align: 'right' }); } if (watermark) this.stamp(watermark.word, watermark.color); }
    d.setPage(1); return d;
  };

  // ---- shared blocks -------------------------------------------------------------------------
  // the address block; the site address prints here (once) when the bill goes elsewhere. opts: noSite (client-wide statement), accounts (accounts email line)
  function clientBlock(doc, title, job, snap, opts) {
    opts = opts || {}; var c = (job && job.client) || {}, name = (snap && snap.name) || c.name || '', address = (snap && snap.address) || c.address || '', abn = (snap && snap.abn) || c.abn || '';
    var billTo = (snap && snap.bill_to) || c.bill_to || '', accounts = opts.accounts ? String((snap && snap.accounts_email) || c.accounts_email || '').trim() : '';
    var contact = [(snap && snap.phone) || c.phone, (snap && snap.email) || c.email].filter(Boolean).join('  ·  '), rest = [];
    doc.h(title);
    if (billTo) { var bl = String(billTo).split(/\r?\n/).filter(function (x) { return x.trim(); }); doc.text(bl[0] || name, 9.5, 'bold'); rest = bl.slice(1); if (abn) rest.push('ABN ' + abn); if (address && !opts.noSite) rest.push('Site: ' + address); }
    else { doc.text(name, 9.5, 'bold'); if (abn) rest.push('ABN ' + abn); if (address && !opts.noSite) rest.push(address); }
    if (contact) rest.push(contact);
    if (accounts && accounts !== ((snap && snap.email) || c.email || '')) rest.push('Accounts: ' + accounts);
    if (rest.length) doc.text(rest.join('\n'), 9);
  }
  // the payment box. With no BSB and account number there is nothing to transfer to, so it says how to pay instead of printing "Pay by bank transfer" over a blank.
  function payItems(doc, det, ref, lead, payUrl) {
    var items = [];
    if (hasBank(det)) {
      var parts = [det.account_name ? 'Account name ' + det.account_name : '', 'BSB ' + det.bsb, 'Account ' + det.account_number, ref ? 'Ref ' + ref : ''].filter(Boolean);
      items.push({ t: lead + '  ·  ' + parts.join('  ·  '), size: 9, style: 'bold' });
    } else {
      var alt = 'Pay by cash, or phone us for bank details' + (det.phone ? ' on ' + det.phone : '') + '.';
      items.push({ t: /^Pay by bank transfer$/i.test(lead) ? alt : lead + '. ' + alt, size: 9, style: 'bold' });
    }
    if (det.other_payments) items.push({ t: det.other_payments, size: 8.3 });
    var u = safeUrl(payUrl); if (u) items.push({ t: 'Pay by card (no surcharge): ' + u, size: 8.6, style: 'bold', color: doc.accent, url: u });
    if (hasBank(det)) items.push({ t: 'We will never change our bank details by text or email. If you receive a message saying we have, phone us' + (det.phone ? ' on ' + det.phone : '') + ' before paying.', size: 8, color: MUTE });
    return items;
  }
  function payBox(doc, det, ref, lead, payUrl) { doc.box(payItems(doc, det, ref, lead, payUrl), PAPER); }
  function lineCols(showRates) { return showRates ? [{ t: 'Item', w: 94 }, { t: 'Qty', w: 16, align: 'right' }, { t: 'Unit', w: 16 }, { t: 'Rate', w: 24, align: 'right' }, { t: 'Amount', w: 28, align: 'right' }] : [{ t: 'Item', w: 114 }, { t: 'Qty', w: 18, align: 'right' }, { t: 'Unit', w: 18 }, { t: 'Amount', w: 28, align: 'right' }]; }
  function lineCells(doc, l, showRates) { var c = [lineDesc(l), qtyText(l.qty), unitText(l.unit, l.qty)]; if (showRates) c.push(num(l.rate) ? money(l.rate, doc.cents) : ''); c.push(doc.m(l.amount)); return c; }
  // lines grouped by room (line.group, else line.room) with a subtotal per room when there is more than one room
  function groupedRows(doc, lines, showRates, opts) {
    opts = opts || {}; var runs = [], rows = [], count = {}, seen = {};
    // A run is one room, in the order the pricing engine emitted it. Grouping by name instead would fold two
    // bedrooms into one block with one subtotal over both, and a customer reading that sees the same room
    // charged twice. Same name, two rooms: two blocks, numbered so he can tell them apart.
    lines.forEach(function (l) {
      var g = String(l.group || l.room || 'Job'), k = String(l.gkey || g), last = runs[runs.length - 1];
      if (last && last.k === k) last.lines.push(l); else runs.push({ k: k, g: g, lines: [l] });
    });
    runs.forEach(function (r, i) { r.i = i; r.o = GROUP_ORDER[r.g] || 0; count[r.g] = (count[r.g] || 0) + 1; });
    runs.forEach(function (r) {
      r.label = GROUP_LABEL[r.g] || r.g;
      if (count[r.g] > 1 && !GROUP_ORDER[r.g]) { seen[r.g] = (seen[r.g] || 0) + 1; r.label += ' ' + seen[r.g]; }
    });
    runs.sort(function (a, b) { return a.o - b.o || a.i - b.i; });
    runs.forEach(function (r) {
      var ls = r.lines; rows.push({ cells: [r.label, '', '', '', ''], group: true, bold: true });
      ls.forEach(function (l) { rows.push({ cells: lineCells(doc, l, showRates), color: l.confirm ? ORANGE : null }); });
      if (ls.length > 1 && runs.length > 1 && !GROUP_ORDER[r.g] && !opts.noSubtotals) rows.push({ kv: [r.label + ' subtotal', doc.m(sum(ls, function (l) { return l.amount; }))], noline: true, color: MUTE, size: 8.3 });
    });
    return rows;
  }
  function totalRows(doc, subtotal, gst, total, gstOn) {
    var rows = [{ kv: ['Subtotal', doc.m(subtotal)], noline: true, color: MUTE }];
    if (gstOn) rows.push({ kv: ['GST 10%', doc.m(gst)], noline: true, color: MUTE });
    rows.push({ kv: ['Total' + (gstOn ? ' inc GST' : ''), doc.m(total)], bold: true, noline: true, fill: doc.accent, color: onAccent(doc.accent), size: 10 });
    return rows;
  }
  function figuresOf(job, priced, lines, opt) {
    var all = sum(lines, function (l) { return l.amount; }), optSum = sum(opt, function (l) { return l.amount; });
    var sub = r2(priced.subtotal), gst = r2(priced.gst), total = r2(priced.total), adjusted = false;
    if (optSum && Math.abs(sub - all) < 0.011) { sub = r2(all - optSum); gst = gst ? r2(sub * 0.1) : 0; total = r2(sub + gst); adjusted = true; } // engine counted the options in: take them back out
    if (!priced.total && !priced.subtotal && lines.length) { sub = r2(all - optSum); gst = 0; total = sub; } // no totals at all (old data): add the lines
    return { subtotal: sub, gst: gst, total: total, adjusted: adjusted };
  }
  // "Walls: 2 coats, Wall paint, low sheen" per paint type in the quote; names from wording.products, else QCCosting.PAINT
  function coatsLines(job, s, lines) {
    var BASE = (window.QCCosting && QCCosting.BASE) || {}, names = Object.assign({}, (window.QCCosting && QCCosting.PAINT) || {}, s.wording.products || {});
    var coats = parseInt(s.costing.coats, 10) || 2, rooms = (job.rooms || []), used = {}, out = [];
    lines.forEach(function (l) { var b = BASE[l.key], t = b ? b[1] : (l.paint_type || ''); if (l.key === 'p_feature') t = 'feature'; if (l.key === 'p_colour_change') t = 'walls'; if (t && t !== 'none') used[t] = true; });
    var wallRooms = rooms.filter(function (r) { return r && r.type !== 'exterior' && (!r.surfaces || r.surfaces.walls !== false); }), changed = wallRooms.filter(function (r) { return r.colour_change; }).length;
    var extCoats = coats; rooms.forEach(function (r) { if (!r || r.type !== 'exterior') return; var c = parseInt(r.coats != null && r.coats !== '' ? r.coats : (r.ext && r.ext.coats), 10); if (c > extCoats) extCoats = c; }); // same field order as the engine
    ['walls', 'ceilings', 'feature', 'enamel', 'exterior', 'oil', 'sealer'].forEach(function (t) {
      if (!used[t]) return; var n = coats, note = '';
      if (t === 'walls' && changed) { if (changed === wallRooms.length) { n = coats + 1; note = ' (colour change)'; } else note = ', ' + (coats + 1) + ' where the colour changes'; }
      if (t === 'feature') n = coats + 1; if (t === 'exterior') n = extCoats; if (t === 'sealer') n = 1;
      var name = names[t === 'feature' ? 'walls' : t] || '';
      out.push(PAINT_LABEL[t] + ': ' + n + ' ' + plural(n, 'coat', 'coats') + note + (name ? ', ' + name : ''));
    });
    if (job.client_paint) out.push('Paint supplied by the client.');
    return out;
  }
  function photoStrip(doc, photos) {
    var list = (photos || []).filter(function (p) { return p && p.on_quote && imgFormat(p.data); }).slice(0, 4); if (!list.length) return;
    var d = doc.d, colW = 86, gutter = 6, maxH = 44, i = 0, first = true;
    while (i < list.length) {
      var row = list.slice(i, i + 2), dims = row.map(function (p) { try { var pr = d.getImageProperties(p.data), w = colW, h = w * pr.height / pr.width; if (h > maxH) { h = maxH; w = h * pr.width / pr.height; } return { w: w, h: h, fmt: imgFormat(p.data) }; } catch (e) { return null; } });
      var rowH = 0, caps = false; dims.forEach(function (x, k) { if (x && x.h > rowH) rowH = x.h; if (x && row[k].caption) caps = true; });
      i += 2; if (!rowH) continue;
      if (first) { doc.h('Photos'); first = false; } doc.need(rowH + (caps ? 8 : 4));
      row.forEach(function (p, k) { var dm = dims[k]; if (!dm) return; var x = doc.L + k * (colW + gutter); try { d.addImage(p.data, dm.fmt, x, doc.y, dm.w, dm.h); } catch (e) { return; } if (p.caption) { d.setFontSize(7.5); d.setFont('helvetica', 'normal'); d.setTextColor.apply(d, MUTE); d.text(d.splitTextToSize(clean(p.caption), colW).slice(0, 1), x, doc.y + dm.h + 3.6); } });
      doc.y += rowH + (caps ? 8 : 4);
    }
  }
  function colourRows(job) { return (job.colours || []).filter(function (c) { return c && [c.room, c.surface, c.product, c.colour, c.sheen].some(function (v) { return v && String(v).trim(); }); }); }

  // ---- QUOTE ---------------------------------------------------------------------------------
  function quotePDF(job, s0, priced) {
    var s = settingsOf(s0); job = job || {}; var det = snapDetails(job, s), wd = snapWording(job, s), q = job.quote || {};
    priced = priced || q; var showRates = !!s.details.show_rates, doc = new Doc(s0 && s0.details ? s0 : { details: det });
    var no = quoteNo(job), qDate = q.date || priced.date || today(), valid = addDays(qDate, parseInt(det.quote_valid_days, 10) || 30), version = parseInt(q.version, 10) || 1;
    // lines: options out, minimum job charge in as a line if the engine only flagged it
    var all = (priced.lines || []).filter(function (l) { return l && typeof l === 'object'; }), opt = all.filter(function (l) { return isOptional(l, job); }), main = all.filter(function (l) { return !isOptional(l, job); });
    var fig = figuresOf(job, priced, all, opt);
    if (priced.minimum_applied && !main.some(function (l) { return /^Minimum job/i.test(l.desc || l.client_desc || ''); })) { var gapAmt = r2(fig.subtotal - sum(main, function (l) { return l.amount; })); if (gapAmt > 0) main.push({ group: 'Adjustments', desc: 'Minimum job charge', qty: 1, unit: 'job', amount: gapAmt }); }
    var gstOn = fig.gst > 0 || (!!det.gst && !fig.total);
    var pct = priced.deposit_pct != null && priced.deposit_pct !== '' ? num(priced.deposit_pct) : depositPct(s0 || s, job, det), cap = priced.deposit_capped, deposit = priced.deposit != null && !fig.adjusted ? r2(priced.deposit) : r2(fig.total * pct / 100);
    if (cap && typeof cap === 'object' && cap.amount != null) deposit = r2(cap.amount);
    if (pct >= 100 && !cap) deposit = fig.total;
    var days = balanceDays(job, det), hasExt = priced.has_exterior != null ? !!priced.has_exterior : main.some(isExtLine), hasInt = priced.has_interior != null ? !!priced.has_interior : (main.some(isIntLine) || (!hasExt && main.length > 0));
    if (!main.length && priced.has_exterior == null) { hasExt = (job.rooms || []).some(function (r) { return r && r.type === 'exterior'; }); hasInt = !hasExt; }
    var figs = [fig.subtotal, fig.gst, fig.total, deposit].concat(all.map(function (l) { return l.amount; })); if (showRates) figs = figs.concat(all.map(function (l) { return l.rate; }));
    doc.cents = figs.some(hasCents);

    doc.header(det, 'Quote', no, ['Date ' + fmtDate(qDate), 'Valid until ' + fmtDate(valid)]);
    if (version > 1) { var prev = (q.history || []).slice(-1)[0]; doc.text('Revision ' + version + ' of ' + baseNo(job) + (prev && prev.date ? ', replaces the quote dated ' + fmtDate(prev.date) + '.' : ', replaces the earlier quote.'), 8.8, 'bold', MUTE); doc.gap(0.5); }
    clientBlock(doc, 'Prepared for', job);
    if (job.summary || job.notes_client) { doc.h('Description'); if (job.summary) doc.text(job.summary, 9.2); if (job.notes_client) { if (job.summary) doc.gap(1); doc.text(job.notes_client, 8.8, 'normal', BODY); } }

    doc.h('Price');
    var cols = lineCols(showRates), rows = groupedRows(doc, main, showRates);
    if (!main.length) rows.push({ cells: ['No priced items yet', '', '', '', ''], color: MUTE });
    doc.table(cols, rows.concat(totalRows(doc, fig.subtotal, fig.gst, fig.total, gstOn)));
    if (opt.length) {
      doc.h('Options'); doc.text('Priced separately and not included in the total above. Tell us which you would like.', 8.6, 'normal', MUTE); doc.gap(1.2);
      doc.table(cols, opt.map(function (l) { return { cells: lineCells(doc, l, showRates), color: l.confirm ? ORANGE : null }; }).concat([{ kv: ['Options subtotal' + (gstOn ? ', ex GST' : ''), doc.m(sum(opt, function (l) { return l.amount; }))], bold: true, noline: true }]), { noHeader: true });
    }

    // basis: only what the client needs to know. One sizes line per quote: measured on site by us unless a room's sizes came from the client (room.measured_by 'client').
    var based = [], sizedRooms = (job.rooms || []).filter(function (r) { return r && (num(r.L) > 0 || num(r.perimeter_m) > 0 || num(r.ceiling_m2) > 0 || r.type === 'exterior' || (r.walls && r.walls.length)); });
    var appMeasured = function (r) { return r.method === 'measured' && r.walls && r.walls.length; }, typedRooms = sizedRooms.filter(function (r) { return !appMeasured(r); }), byClient = typedRooms.filter(function (r) { return r.measured_by === 'client'; });
    var roomWord = hasInt ? 'room' : 'area', roomName = function (r, i) { return String(r.name || (roomWord === 'room' ? 'Room ' : 'Area ') + (i + 1)); };
    if (main.length && sizedRooms.length) {
      if (!byClient.length) based.push('Sizes measured on site by us.');
      else if (byClient.length === sizedRooms.length) based.push((hasInt ? 'Room sizes' : 'Sizes') + ' supplied by the client, confirmed on site before work starts.');
      else if (byClient.length === typedRooms.length) based.push(sizedRooms.length - byClient.length + ' of ' + sizedRooms.length + ' ' + roomWord + 's measured on site by us; the other sizes were supplied by the client and are confirmed on site before work starts.');
      else based.push('Sizes measured on site by us, except ' + byClient.map(function (r) { return roomName(r, sizedRooms.indexOf(r)); }).join(', ') + ' (sizes supplied by the client, confirmed on site before work starts).');
    }
    (priced.assumptions || []).forEach(function (a) { if (!/ceiling height assumed|as advised, not measured|supplied by (the )?client|sizes measured on site|measured on site by us|travel|paint in full tins|minimum job charge|premium paint requested|ceiling taken as|tins?:/i.test(String(a))) based.push(a); });
    var coats = coatsLines(job, s, main);
    if (based.length || coats.length) { doc.h(based.length && coats.length ? 'Basis, coats and products' : based.length ? 'Basis' : 'Coats and products'); doc.bullets(based.concat(coats)); }
    var colours = colourRows(job);
    if (colours.length) { doc.h('Colour schedule'); doc.table([{ t: 'Room', w: 34 }, { t: 'Surface', w: 34 }, { t: 'Product', w: 54 }, { t: 'Colour', w: 36 }, { t: 'Sheen', w: 20 }], colours.map(function (c) { return { cells: [c.room || '', c.surface || '', c.product || '', c.colour || '', c.sheen || ''] }; }), { size: 8.4 }); }
    photoStrip(doc, job.photos);

    var inc = listFor(wd, 'included', hasInt, hasExt), exc = listFor(wd, 'excluded', hasInt, hasExt);
    if (job.client_paint) { inc = inc.filter(function (t) { return !/materials/i.test(t); }); if (!based.some(function (a) { return /paint supplied by (the )?client/i.test(a); })) inc = inc.concat(['Paint supplied by the client; we supply sundries and equipment.']); }
    doc.twoCol([{ title: 'Included', items: inc }, { title: 'Not included', items: exc }]);

    // terms: the painter's standard terms, minus clauses that do not fit this job. The deposit clause is replaced by the specific line below;
    // on a job with no interior rooms every sentence about rooms goes and the exterior access clause is used instead.
    var depositApplies = pct > 0 && deposit > 0, dueTxt = days > 0 ? 'within ' + days + ' ' + plural(days, 'day', 'days') + ' of completion' : 'on completion';
    var std = dropSentences(Array.isArray(wd.terms) ? wd.terms.filter(Boolean) : [], depositApplies ? /deposit shown/i : /\bdeposit\b/i);
    if (!hasInt) std = dropSentences(std, /\brooms?\b|clear access/i);
    if (!hasInt && main.length) { var at = std.length; std.forEach(function (t, i) { if (at === std.length && /variations? are priced/i.test(t)) at = i + 1; }); std.splice(at, 0, 'Please keep the areas being painted clear on the booked days: move vehicles, pot plants, outdoor furniture and anything else near the walls, and leave power and water available.'); }
    // The validity date is in the header block, so the terms say the thing the header cannot: that the price is fixed.
    var terms = ['Fixed price for the work and areas described.'].concat(std);
    if (!depositApplies) terms.push('No deposit required. Payment ' + dueTxt + '.');
    else if (pct >= 100 && !cap) terms.push('Full payment (' + doc.m(deposit) + ') confirms the booking.');
    else if (cap) terms.push('A deposit of ' + doc.m(deposit) + ' confirms the booking, the most allowed for this work' + (cap.state ? ' under ' + cap.state + ' rules' : '') + '. The balance is due ' + dueTxt + '.');
    else terms.push('A ' + (Math.round(pct * 10) / 10) + '% deposit (' + doc.m(deposit) + ') confirms the booking. The balance is due ' + dueTxt + '.');
    if (Array.isArray(job.progress_schedule) && job.progress_schedule.length) terms.push('Payment schedule: ' + job.progress_schedule.map(function (p) { return (p.label || '') + ' ' + num(p.pct) + '%'; }).join(', ') + '. Each claim is due ' + (days > 0 ? 'within ' + days + ' ' + plural(days, 'day', 'days') : 'on receipt') + '.');
    if (hasExt) { var wx = Array.isArray(wd.terms_ext) ? wd.terms_ext.filter(Boolean) : []; terms = terms.concat(wx.length ? wx : ['Exterior dates may move with the weather. We do not paint in rain, on wet surfaces or in extreme heat; days lost this way extend the finish date.']); }
    var wy = parseInt(wd.warranty_years, 10); if (isNaN(wy)) wy = 5;
    if (wy > 0) terms.push('Workmanship guarantee: ' + wy + ' ' + plural(wy, 'year', 'years') + ' against peeling and flaking caused by our application (excludes decks, exterior horizontal surfaces, substrate movement, moisture ingress and pre-existing coating failure).' + (/statutory/i.test(std.join(' ')) ? '' : ' Statutory warranties apply and are not limited by this quote.'));
    else terms.push('Statutory warranties apply and are not limited by this quote.');
    doc.h('Terms'); doc.bullets(terms);

    // to accept: one story. At or above the state's written-contract figure the quote is signed and sent back (by both sides); below it a reply by text or email is enough.
    var thr = contractThreshold(det, job, fig.total, priced.state), thrState = thr ? contractState(det, job, priced.state) : '', acc;
    if (thr) {
      var payStep = !depositApplies ? '' : (pct >= 100 && !cap ? ' Then pay the full amount of ' + doc.m(deposit) + ' shown below.' : ' Then pay the deposit of ' + doc.m(deposit) + ' shown below.');
      acc = String(wd.accept_contract || '').trim() || ('To accept, sign and date below and send this page back to us; a photo of it by text or email is fine.' + payStep + ' Tell us your preferred start week and we will book you in.');
    } else {
      acc = String(wd.accept || ''); if (!depositApplies) acc = wd.accept_no_deposit || acc.replace(/,? and pay the deposit[^.]*(?=\.)/i, '').replace(/[^.]*pay the deposit[^.]*\.\s*/i, '');
    }
    var thrText = thr ? 'This job is over ' + money(thr) + ', so ' + (thrState ? 'in ' + thrState + ' ' : '') + 'the law needs a written contract signed by both of us before work starts. This quote, signed below by you and by us, is that contract. A reply by text or email on its own does not form the contract.' : '';
    var pay = payItems(doc, det, no, depositApplies ? (pct >= 100 && !cap ? 'Full payment of ' : 'Deposit of ') + doc.m(deposit) : 'Pay by bank transfer', q.pay_url || job.pay_url);
    // keep the To accept heading, its words, the signature lines and the payment box on one page rather than leaving the signature lines alone on a new one
    doc.d.setFontSize(8.8); var accH = (doc.d.splitTextToSize(clean(acc), doc.W).length + (thrText ? doc.d.splitTextToSize(clean(thrText), doc.W).length + 1 : 0)) * 8.8 * 0.42;
    doc.need(Math.min(3.2 + 6 + accH + 17 * (thr ? 2 : 1) + 1.5 + doc.boxHeight(pay), doc.B - 20));
    doc.h('To accept'); if (acc) doc.text(acc, 8.8);
    if (thr) { doc.gap(1); doc.text(thrText, 8.8, 'bold'); }
    doc.need(17 * (thr ? 2 : 1) + 1.5 + doc.boxHeight(pay)); doc.signature(['Accepted by (name and signature)', 'Date']);
    if (thr) doc.signature(['For ' + (det.trading_name || 'us') + ' (name and signature)', 'Date']);
    doc.gap(1.5); doc.box(pay, PAPER);
    doc.signoff(det);
    return doc.finish(no);
  }
  function listFor(wd, key, hasInt, hasExt) { var a = Array.isArray(wd[key]) ? wd[key].filter(Boolean) : [], b = Array.isArray(wd[key + '_ext']) ? wd[key + '_ext'].filter(Boolean) : []; if (hasExt && !hasInt) return b.length ? b : a; if (hasExt && hasInt) return a.concat(b.filter(function (x) { return a.indexOf(x) < 0; })); return a; }

  // ---- INVOICE -------------------------------------------------------------------------------
  function kindLine(inv, job) {
    var qn = quoteNo(job), k = inv.kind_line ? String(inv.kind_line) : '';
    if (inv.kind === 'progress' && !/progress claim/i.test(k)) return ('Progress claim' + (num(inv.pct) ? ' ' + num(inv.pct) + '% of quote ' + qn : ' on quote ' + qn) + '.' + (k ? ' ' + k : ''));
    if (k && k.toLowerCase() !== String(inv.kind || '').toLowerCase()) return k;   // a bare 'deposit' is the kind, not a sentence to print at the client
    return { deposit: 'Deposit to confirm the booking.', full: 'Work completed as quoted in ' + qn + '.', final: 'Final invoice on completion.' }[inv.kind] || '';
  }
  function findVariation(l, job) {
    var vs = (job.variations || []).filter(Boolean); if (!vs.length) return null;
    var id = l.variation_id || l.var_id || l.variation; if (id) { var hit = vs.filter(function (v) { return v.id === id; })[0]; if (hit) return hit; }
    var d = String(l.desc || '').replace(/^Variation[^:]*:\s*/i, '').trim(); return vs.filter(function (v) { return String(v.desc || '').trim() === d; })[0] || null;
  }
  function variationText(l, job) { var v = findVariation(l, job); if (!v) return String(l.desc || ''); return 'Variation ' + (v.n || '') + (v.agreed_date ? ', agreed' + (v.how_agreed ? ' by ' + v.how_agreed : '') + ' ' + shortDate(v.agreed_date) : (v.status === 'agreed' && v.how_agreed ? ', agreed by ' + v.how_agreed : '')) + ': ' + (v.desc || ''); }
  function depositInvoice(job, inv) { var invs = (job.invoices || []).filter(Boolean); if (inv.deposit_invoice_no) return invs.filter(function (i) { return i.no === inv.deposit_invoice_no; })[0] || null; return invs.filter(function (i) { return i.kind === 'deposit' && !i.void && i !== inv; })[0] || null; }
  function depositText(doc, l, job, inv) {
    var dep = depositInvoice(job, inv); if (!dep) return String(l.desc || '');
    var paid = balanceOf(dep) <= 0.005, m = doc.m.bind(doc);
    return 'Less deposit ' + (paid ? 'paid' : 'invoiced') + ', ' + dep.no + ' dated ' + fmtDate(dep.date) + (num(dep.gst) ? ' (ex GST ' + m(dep.subtotal) + ', GST ' + m(dep.gst) + ')' : ' (' + m(dep.total) + ')');
  }
  // invoice rows: quoted work itemised from the quote snapshot, variations numbered, deposit credit naming its invoice
  function invoiceRows(doc, job, inv, showRates) {
    var q = job.quote || {}, qAll = (q.lines || []).filter(Boolean), qMain = qAll.filter(function (l) { return !isOptional(l, job); }), rows = [], expanded = false, cellsOf = function (desc, l) { var c = [desc, l && l.qty != null ? qtyText(l.qty) : '', l ? unitText(l.unit, l.qty) : '']; if (showRates) c.push(l && num(l.rate) ? money(l.rate, doc.cents) : ''); c.push(doc.m(l ? l.amount : 0)); return c; };
    var src = inv.lines || [];
    if (inv.kind === 'full' && src.length && src.length === qAll.length && Math.abs(sum(src, function (l) { return l.amount; }) - sum(qAll, function (l) { return l.amount; })) < 0.011) { return groupedRows(doc, qAll, showRates, { noSubtotals: true }); }
    src.forEach(function (l) {
      if (!l) return; var desc = String(l.desc || ''), amt = r2(l.amount);
      if (!expanded && qMain.length && (l.kind === 'quote' || /^Work (completed )?as quoted/i.test(desc)) && Math.abs(amt - sum(qMain, function (x) { return x.amount; })) < 0.011) {
        expanded = true; rows = rows.concat(groupedRows(doc, qMain, showRates, { noSubtotals: true })); rows.push({ kv: ['Work as quoted in ' + quoteNo(job), doc.m(amt)], bold: true, noline: true }); return;
      }
      if (l.kind === 'variation' || /^Variation/i.test(desc)) { rows.push({ cells: cellsOf(variationText(l, job), { amount: amt }) }); return; }
      if (l.kind === 'deposit_credit' || /^Less deposit/i.test(desc)) { rows.push({ cells: cellsOf(depositText(doc, l, job, inv), { amount: amt }) }); return; }
      rows.push({ cells: cellsOf(desc, l.qty != null ? l : { amount: amt }) });
    });
    return rows;
  }
  function invoicePDF(job, inv, s0) {
    var s = settingsOf(s0); job = job || {}; inv = inv || {}; var det = Object.assign({}, s.details), showRates = !!det.show_rates, doc = new Doc(s0 && s0.details ? s0 : { details: det });
    var gstOn = num(inv.gst) > 0 || (!num(inv.total) && !!det.gst), title = gstOn && det.abn ? 'Tax invoice' : 'Invoice', isVoid = !!inv.void;
    var pays = payments(inv), credits = creditNotes(inv), received = sum(pays, function (p) { return p.amount; }), credited = sum(credits, function (c) { return c.amount; }), balance = r2(num(inv.total) - received - credited), paid = !isVoid && balance <= 0.005 && num(inv.total) > 0;
    var dep = depositInvoice(job, inv), figs = [inv.subtotal, inv.gst, inv.total, balance].concat((inv.lines || []).map(function (l) { return l && l.amount; })).concat(pays.map(function (p) { return p.amount; })).concat(credits.map(function (c) { return c.amount; }));
    if (dep) figs = figs.concat([dep.subtotal, dep.gst, dep.total]); if (/final|full/.test(inv.kind || '')) figs = figs.concat(((job.quote || {}).lines || []).map(function (l) { return l && l.amount; }));
    doc.cents = figs.some(hasCents);
    var lastPay = pays.length ? pays[pays.length - 1].date : '';
    var meta = ['Date ' + fmtDate(inv.date)]; if (isVoid) meta.push('Void ' + fmtDate(inv.void.date || inv.date)); else if (paid) meta.push('Paid ' + (lastPay ? fmtDate(lastPay) : 'in full')); else meta.push('Due ' + (inv.due ? fmtDate(inv.due) : 'on receipt')); meta.push('Quote ' + quoteNo(job));
    doc.header(det, title, inv.no || 'INV-?', meta);
    if (!gstOn) { doc.text('No GST has been charged.', 8.6, 'normal', MUTE); doc.gap(0.5); }
    clientBlock(doc, 'Bill to', job, inv.client_snapshot);
    var descr = [job.summary, kindLine(inv, job)].filter(Boolean); // the site address is in the Bill to block; it does not print again here
    var acc = job.acceptance; if (acc && acc.date && /final|full|progress/.test(inv.kind || '')) descr.push('Quote ' + quoteNo(job) + ' accepted' + (acc.how ? ' by ' + acc.how : '') + ' on ' + fmtDate(acc.date) + (acc.by ? ' (' + acc.by + ')' : '') + '.');
    doc.h('Description'); doc.text(descr.join('\n'), 9.2);
    if (isVoid) { doc.gap(1); doc.text('VOID. This invoice was cancelled on ' + fmtDate(inv.void.date || inv.date) + (inv.void.reason ? ': ' + inv.void.reason : '') + '. Nothing is owed on it.', 9, 'bold', RED); }
    doc.h('Amount');
    doc.table(lineCols(showRates), invoiceRows(doc, job, inv, showRates).concat(totalRows(doc, inv.subtotal, inv.gst, inv.total, gstOn)));
    if (!isVoid && (pays.length || credits.length)) {
      doc.h('Payments received');
      var prow = pays.map(function (p) { return { cells: [fmtDate(p.date), p.legacy ? (p.method === 'card' ? 'Card' : 'Payment') : (METHOD[p.method] || p.method || 'Payment'), p.ref || '', doc.m(p.amount)] }; })
        .concat(credits.map(function (c) { return { cells: [fmtDate(c.date), 'Credit note ' + (c.no || ''), c.reason || '', doc.m(c.amount)] }; }));
      prow.push({ kv: ['Total received', doc.m(r2(received + credited))], noline: true, color: MUTE });
      doc.table([{ t: 'Date', w: 44 }, { t: 'Method', w: 40 }, { t: 'Reference', w: 66 }, { t: 'Amount', w: 28, align: 'right' }], prow, { size: 8.6 });
    }
    doc.gap(2);
    if (isVoid) { /* nothing owed, nothing to pay */ }
    else if (paid) { doc.box([{ t: 'Paid in full' + (lastPay ? ', ' + fmtDate(lastPay) : '') + '. Thank you.' + (balance < -0.005 ? ' Overpaid by ' + doc.m(-balance) + ', held as a credit for you.' : ''), size: 10, style: 'bold' }], null, INK); }
    else { var due = [{ t: 'Balance due' + (inv.due ? ' by ' + fmtDate(inv.due) : '') + ':  ' + doc.m(balance) + '      Reference ' + (inv.no || ''), size: 10.5, style: 'bold' }], pay = payItems(doc, det, inv.no, 'Pay by bank transfer', inv.pay_url); doc.need(doc.boxHeight(due) + doc.boxHeight(pay)); doc.box(due, null, INK); doc.box(pay, PAPER); }
    doc.signoff(det);
    if (paid) doc.stamp('PAID', [120, 120, 120], 1);
    return doc.finish(inv.no || '', isVoid ? { word: 'VOID', color: RED } : null);
  }

  // ---- RECEIPT -------------------------------------------------------------------------------
  // payment: the payment object itself (matched by identity, then by id), or its index in inv.payments. Two equal payments on one day are told apart,
  // and the balance shown is the balance after THAT payment: earlier-dated payments, plus same-day payments recorded before it.
  function receiptPDF(job, inv, payment, s0) {
    var s = settingsOf(s0); job = job || {}; inv = inv || {}; var det = Object.assign({}, s.details), doc = new Doc(s0 && s0.details ? s0 : { details: det });
    var raw = (inv.payments || []), rawIdx = -1, p = null;
    if (typeof payment === 'number' && raw[payment]) rawIdx = payment;
    else if (payment && typeof payment === 'object') { rawIdx = raw.indexOf(payment); if (rawIdx < 0 && payment.id != null) raw.forEach(function (x, i) { if (rawIdx < 0 && x && x.id != null && String(x.id) === String(payment.id)) rawIdx = i; }); if (rawIdx < 0) raw.forEach(function (x, i) { if (rawIdx < 0 && x && x.date === (payment.date || '') && Math.abs(num(x.amount) - num(payment.amount)) < 0.005 && (x.ref || '') === (payment.ref || '')) rawIdx = i; }); }
    else if (payment == null) { for (var k = raw.length - 1; k >= 0; k--) { if (raw[k] && num(raw[k].amount) !== 0) { rawIdx = k; break; } } }
    var pays = payments(inv); // filtered list used for totals (old data: paid_date only)
    if (rawIdx >= 0) p = { date: raw[rawIdx].date || '', amount: r2(raw[rawIdx].amount), method: raw[rawIdx].method || '', ref: raw[rawIdx].ref || '', no: raw[rawIdx].no };
    else if (payment && typeof payment === 'object') p = { date: payment.date || '', amount: r2(payment.amount), method: payment.method || '', ref: payment.ref || '', no: payment.no };
    else p = pays[pays.length - 1] || { date: today(), amount: r2(inv.total), method: '' };
    var pDate = p.date || today(), received = 0, seq = 0, ordinal = 0;
    if (rawIdx >= 0) { raw.forEach(function (x, i) { if (!x || num(x.amount) === 0) return; var before = (x.date || '') < pDate || ((x.date || '') === pDate && i <= rawIdx); if (before) { received = r2(received + num(x.amount)); seq++; } if (i <= rawIdx) ordinal++; }); }
    else { received = r2(sum(pays, function (x) { return x.amount; }) + (pays.indexOf(p) < 0 ? num(p.amount) : 0)); ordinal = pays.length + (pays.indexOf(p) < 0 ? 1 : 0); }
    var credits = creditNotes(inv).filter(function (c) { return !c.date || c.date <= pDate; });
    var remaining = r2(num(inv.total) - received - sum(credits, function (c) { return c.amount; })), no = p.no || 'R-' + String(inv.no || '').replace(/^INV-/i, '') + (ordinal > 1 ? '-' + ordinal : '');
    doc.cents = [p.amount, inv.total, inv.gst, received, remaining].some(hasCents);
    doc.header(det, 'Receipt', no, ['Date ' + fmtDate(pDate), 'Invoice ' + (inv.no || ''), 'Quote ' + quoteNo(job)]);
    clientBlock(doc, 'Received from', job, inv.client_snapshot);
    doc.h('Payment');
    doc.box([{ t: 'Received ' + doc.m(p.amount) + ' by ' + (METHOD[p.method] || p.method || 'payment') + (p.ref ? ', reference ' + p.ref : '') + ' on ' + fmtDate(pDate) + (seq > 1 ? ' (payment ' + seq + ' on this invoice)' : '') + '.', size: 10.5, style: 'bold' }], PAPER);
    doc.h('Against');
    var rows = [{ cells: [invoiceKindWord(inv) + ' ' + (inv.no || '') + ' dated ' + fmtDate(inv.date) + (job.summary ? ', ' + job.summary : ''), doc.m(inv.total)] }];
    if (num(inv.gst)) rows.push({ cells: ['GST shown on that invoice', doc.m(inv.gst)], color: MUTE, size: 8.3 });
    rows.push({ kv: ['Paid to date, including this payment', doc.m(received)], noline: true, color: MUTE });
    rows.push({ kv: [remaining > 0.005 ? 'Balance remaining' : 'Balance remaining', remaining > 0.005 ? doc.m(remaining) : 'Nil, paid in full'], bold: true, noline: true, fill: doc.accent, color: onAccent(doc.accent), size: 10 });
    doc.table([{ t: 'Invoice', w: 150 }, { t: 'Amount', w: 28, align: 'right' }], rows);
    if (remaining > 0.005) { doc.gap(1); doc.text('The balance of ' + doc.m(remaining) + ' is due ' + (inv.due ? 'by ' + fmtDate(inv.due) : 'on receipt') + '. Reference ' + (inv.no || '') + '.', 9); }
    doc.gap(2); doc.text('Thank you for your payment.', 9);
    doc.signoff(det);
    return doc.finish(no);
  }

  // ---- STATEMENT -----------------------------------------------------------------------------
  // statementPDF(jobs, s, opts): jobs is the client's jobs (an array; a single job object is wrapped). Client-wide by default: every invoice, payment
  // and credit note across those jobs, addressed to the bill-to (or the client) with the accounts email when set. opts.perJob prints one job only.
  // opts.client (optional) overrides the address block. Old call shape statementPDF(job, s) still works.
  function statementPDF(jobs, s0, opts) {
    opts = opts || {}; var s = settingsOf(s0); jobs = (Array.isArray(jobs) ? jobs : [jobs]).filter(function (j) { return j && typeof j === 'object'; }); if (opts.perJob) jobs = jobs.slice(0, 1);
    var det = Object.assign({}, s.details), doc = new Doc(s0 && s0.details ? s0 : { details: det });
    var first = jobs[0] || {}, asAt = today(), entries = [], k = 0, multi = jobs.length > 1, perJob = !!opts.perJob;
    var billed = !!((first.client && first.client.bill_to) || (opts.client && opts.client.bill_to));
    jobs.forEach(function (job) {
      (job.invoices || []).filter(Boolean).forEach(function (inv) {
        var what = String((multi && billed && job.client && job.client.address) ? job.client.address : (job.summary || quoteNo(job))); if (what.length > 60) what = what.slice(0, 57).replace(/\s+\S*$/, '') + '...';
        if (multi && !/\bQ-?\d/.test(what)) what += ' (' + quoteNo(job) + ')';
        if (inv.void) { entries.push({ date: inv.date || '', ref: inv.no || '', detail: invoiceKindWord(inv) + ', void' + (inv.void.reason ? ' (' + inv.void.reason + ')' : ''), debit: 0, credit: 0, k: k++, muted: true }); return; }
        entries.push({ date: inv.date || '', ref: inv.no || '', detail: invoiceKindWord(inv) + ', ' + what + (inv.due ? ', due ' + shortDate(inv.due) : ''), debit: r2(inv.total), credit: 0, k: k++, inv: inv });
        payments(inv).forEach(function (p) { entries.push({ date: p.date || '', ref: p.ref || (METHOD[p.method] || ''), detail: 'Payment received, ' + (inv.no || '') + (p.method && p.ref ? ' (' + (METHOD[p.method] || p.method) + ')' : ''), debit: 0, credit: p.amount, k: k++ }); });
        creditNotes(inv).forEach(function (c) { entries.push({ date: c.date || '', ref: c.no || 'Credit', detail: 'Credit note against ' + (inv.no || '') + (c.reason ? ', ' + c.reason : ''), debit: 0, credit: r2(c.amount), k: k++ }); });
      });
    });
    entries.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.k - b.k; });
    var bal = 0, overdue = 0, oldestOpen = '';
    entries.forEach(function (e) { bal = r2(bal + e.debit - e.credit); e.bal = bal; if (e.inv) { var b = balanceOf(e.inv); if (b > 0.005) { if (!oldestOpen) oldestOpen = e.inv.no; if (e.inv.due && e.inv.due < asAt) overdue = r2(overdue + b); } } });
    doc.cents = entries.some(function (e) { return hasCents(e.debit) || hasCents(e.credit) || hasCents(e.bal); });
    var scope = perJob ? 'This job only, ' + quoteNo(first) : multi ? 'All jobs (' + jobs.length + ')' : quoteNo(first);
    doc.header(det, 'Statement', fmtDate(asAt), ['Statement of account', scope]);
    clientBlock(doc, 'For', opts.client ? { client: opts.client } : first, null, { noSite: multi, accounts: true });
    doc.h('Account');
    var rows = entries.map(function (e) { return { cells: [shortDate(e.date), e.ref, e.detail, e.debit ? doc.m(e.debit) : '', e.credit ? doc.m(e.credit) : '', e.muted ? '' : doc.m(e.bal)], color: e.muted ? FAINT : null }; });
    if (!rows.length) rows.push({ cells: ['', '', 'No invoices yet', '', '', ''], color: MUTE });
    rows.push({ kv: [bal > 0.005 ? 'Balance due' : bal < -0.005 ? 'In credit' : 'Balance', doc.m(Math.abs(bal))], bold: true, noline: true, fill: doc.accent, color: onAccent(doc.accent), size: 10 });
    doc.table([{ t: 'Date', w: 24 }, { t: 'Ref', w: 22 }, { t: 'Detail', w: 72 }, { t: 'Charged', w: 20, align: 'right' }, { t: 'Received', w: 20, align: 'right' }, { t: 'Balance', w: 20, align: 'right' }], rows, { size: entries.length > 26 ? 7.6 : 8.3 }); // smaller rows keep a long account on one page
    doc.gap(2);
    if (bal > 0.005) { doc.box([{ t: 'Balance due ' + doc.m(bal) + (overdue > 0.005 ? ', of which ' + doc.m(overdue) + ' is past its due date.' : '.'), size: 10.5, style: 'bold' }], null, INK); payBox(doc, det, oldestOpen || 'the invoice number', 'Pay by bank transfer', null); }
    else if (bal < -0.005) doc.box([{ t: 'Your account is in credit by ' + doc.m(-bal) + '. We will take it off the next invoice or refund it, whichever you prefer.', size: 10, style: 'bold' }], null, INK);
    else doc.box([{ t: 'Nothing owing. Thank you.', size: 10.5, style: 'bold' }], null, INK);
    doc.signoff(det);
    return doc.finish('Statement ' + shortDate(asAt));
  }

  // ---- VARIATION -----------------------------------------------------------------------------
  function variationPDF(job, v, s0) {
    var s = settingsOf(s0); job = job || {}; v = v || {}; var det = snapDetails(job, s), doc = new Doc(s0 && s0.details ? s0 : { details: det });
    var n = v.n || 1, qn = quoteNo(job), gstOn = !!det.gst, ex = r2(v.amount), gst = gstOn ? r2(ex * 0.1) : 0, total = r2(ex + gst), label = 'Variation ' + n;
    doc.cents = [ex, gst, total].some(hasCents);
    doc.header(det, 'Variation', label, ['Date ' + fmtDate(v.date || today()), 'Quote ' + qn]);
    clientBlock(doc, 'Prepared for', job);
    doc.h('Job'); doc.text(job.summary || qn, 9.2); // the address is already in the block above
    doc.h(label + ' to quote ' + qn); doc.text(v.desc || '', 9.5);
    doc.gap(1.5);
    var rows = gstOn ? [{ kv: ['Amount ex GST', doc.m(ex)], noline: true, color: MUTE }, { kv: ['GST 10%', doc.m(gst)], noline: true, color: MUTE }] : [];
    rows.push({ kv: ['Total' + (gstOn ? ' inc GST' : '') + (ex < 0 ? ' (credit)' : ''), doc.m(total)], bold: true, noline: true, fill: doc.accent, color: onAccent(doc.accent), size: 10 });
    doc.table([{ t: '', w: 150 }, { t: '', w: 28, align: 'right' }], rows, { noHeader: true });
    doc.text('This amount is added to the final invoice for ' + qn + '. Everything else in the quote stays as it is.', 8.8, 'normal', BODY);
    doc.h('Agreement');
    if (v.status === 'agreed') doc.text('Agreed' + (v.how_agreed ? ' by ' + v.how_agreed : '') + (v.agreed_date ? ' on ' + fmtDate(v.agreed_date) : '') + (v.agreed_by ? ' (' + v.agreed_by + ')' : '') + '.', 9, 'bold');
    else if (v.status === 'declined') doc.text('Declined' + (v.agreed_date ? ' on ' + fmtDate(v.agreed_date) : '') + '. This work will not be done and nothing is charged for it.', 9, 'bold');
    else doc.text('To agree, reply "Agreed, ' + label.toLowerCase() + '" by text or email before the work is done, or sign below. No extra work starts until we hear from you.', 9);
    if (v.status !== 'declined') doc.signature(['Agreed by (name and signature)', 'Date']);
    doc.signoff(det);
    return doc.finish(label + ' to ' + qn);
  }

  // ---- CREDIT NOTE ---------------------------------------------------------------------------
  // cn.amount is the credit inc GST (it comes off the invoice balance); the GST part is 1/11 of it when the invoice carried GST
  function creditNotePDF(job, inv, cn, s0) {
    var s = settingsOf(s0); job = job || {}; inv = inv || {}; cn = cn || {}; var det = Object.assign({}, s.details), doc = new Doc(s0 && s0.details ? s0 : { details: det });
    var gstOn = num(inv.gst) > 0, total = r2(cn.amount), ex = gstOn ? r2(total / 1.1) : total, gst = r2(total - ex), remaining = balanceOf(inv), no = cn.no || 'CN-?';
    doc.cents = [total, ex, gst, remaining, inv.total].some(hasCents);
    doc.header(det, 'Credit note', no, ['Date ' + fmtDate(cn.date || today()), 'Against ' + (inv.no || ''), 'Quote ' + quoteNo(job)]);
    doc.text(gstOn && det.abn ? 'Adjustment note for GST purposes.' : 'No GST has been charged.', 8.6, 'normal', MUTE); doc.gap(0.5);
    clientBlock(doc, 'Credit to', job, inv.client_snapshot);
    doc.h('Reason'); doc.text(cn.reason || 'Credit against ' + (inv.no || '') + '.', 9.5);
    doc.gap(1.5);
    var rows = [{ cells: ['Credit against ' + invoiceKindWord(inv).toLowerCase() + ' ' + (inv.no || '') + ' dated ' + fmtDate(inv.date) + ' (' + doc.m(inv.total) + ')', doc.m(ex)] }];
    if (gstOn) rows.push({ kv: ['GST 10%', doc.m(gst)], noline: true, color: MUTE });
    rows.push({ kv: ['Total credit' + (gstOn ? ' inc GST' : ''), doc.m(total)], bold: true, noline: true, fill: doc.accent, color: onAccent(doc.accent), size: 10 });
    doc.table([{ t: 'Description', w: 150 }, { t: 'Amount', w: 28, align: 'right' }], rows);
    doc.gap(1);
    if (cn.refund) doc.text('Refunded ' + doc.m(cn.refund.amount != null ? cn.refund.amount : total) + (cn.refund.method ? ' by ' + (METHOD[cn.refund.method] || cn.refund.method) : '') + (cn.refund.date ? ' on ' + fmtDate(cn.refund.date) : '') + '.', 9, 'bold');
    else doc.text('This credit reduces the amount owing on ' + (inv.no || 'the invoice') + (remaining > 0.005 ? ' to ' + doc.m(remaining) + (inv.due ? ', due ' + fmtDate(inv.due) : '') : ' to nil') + '.', 9, 'bold');
    doc.signoff(det);
    return doc.finish(no);
  }

  // ---- delivery ------------------------------------------------------------------------------
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

  window.QCPdf = { quotePDF: quotePDF, invoicePDF: invoicePDF, receiptPDF: receiptPDF, statementPDF: statementPDF, variationPDF: variationPDF, creditNotePDF: creditNotePDF,
    deliver: deliver, money: money, fmtDate: fmtDate, clean: clean, accent: accent, stateOf: stateOf, THRESHOLDS: THRESHOLDS };
})();
