/* Chasem: reading quotes and invoices that were made somewhere else.
 *
 * A tradie already has quotes out: in texts he sent, in emails, in Tradify or ServiceM8 or Xero, on paper.
 * None of that should have to be typed again. This file turns what he pastes or exports into plain items
 * the app can chase:
 *
 *   { kind: 'quote' | 'invoice', name, phone, email, amount, date, due, number, what, paid }
 *
 * Pure functions, no DOM, no network: the same code runs on the phone and in the tests. Everything here
 * guesses, so the app always shows what it found and lets him fix it before anything is chased. */
(function (root) {
  'use strict';

  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) {
    if (y < 100) y += 2000;
    if (!(y > 1990 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return '';
    var t = new Date(Date.UTC(y, m - 1, d)); if (t.getUTCMonth() !== m - 1) return '';
    return y + '-' + pad(m) + '-' + pad(d);
  }
  // Australian first: 3/9/2026 is the 3rd of September. A four-digit year first is always ISO.
  function parseDate(s) {
    s = String(s == null ? '' : s).trim(); if (!s) return '';
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return iso(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/); if (m) return iso(+m[3], +m[2], +m[1]);
    var mon = function (w) { w = String(w).toLowerCase(); return MONTHS[w.slice(0, 4)] || MONTHS[w.slice(0, 3)] || 0; };
    m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{2,4})\b/); if (m && mon(m[2])) return iso(+m[3], mon(m[2]), +m[1]);
    m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/); if (m && mon(m[1])) return iso(+m[3], mon(m[1]), +m[2]);
    // a spreadsheet date serial (Excel counts days from 1900)
    if (/^\d{5}(\.\d+)?$/.test(s)) { var t = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 86400000); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
    return '';
  }

  // "$4,200.50", "4200", "AUD 4,200", "$4.2k". Returns a number of dollars or NaN.
  function parseMoney(s) {
    s = String(s == null ? '' : s).trim(); if (!s) return NaN;
    var neg = /^\(.*\)$/.test(s) || /^-/.test(s);
    var k = /\d\s*k\b/i.test(s);
    var t = s.replace(/[^0-9.,]/g, '');
    if (/,\d{2}$/.test(t) && t.indexOf('.') < 0) t = t.replace(/\./g, '').replace(',', '.'); // 4.200,50
    t = t.replace(/,/g, '');
    var v = parseFloat(t); if (!isFinite(v)) return NaN;
    if (k) v *= 1000;
    v = Math.round(v * 100) / 100;
    return neg ? -v : v;
  }

  // Australian numbers, written the way a tradie reads them. Anything else is kept as typed.
  function tidyPhone(s) {
    var raw = String(s == null ? '' : s).trim(); if (!raw) return '';
    var d = raw.replace(/[^\d+]/g, '');
    if (/^\+?61/.test(d)) d = '0' + d.replace(/^\+?61/, '');
    d = d.replace(/\D/g, '');
    if (/^04\d{8}$/.test(d)) return d.slice(0, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7);
    if (/^0[2378]\d{8}$/.test(d)) return d.slice(0, 2) + ' ' + d.slice(2, 6) + ' ' + d.slice(6);
    if (/^4\d{8}$/.test(d)) return tidyPhone('0' + d);
    return raw;
  }
  var EMAIL = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  var MOBILE = /(?:\+?61[\s-]?|\b0)4\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/;
  var LANDLINE = /(?:\+?61[\s-]?|\b0)[2378][\s-]?\d{4}[\s-]?\d{4}\b/;
  var NUMBER = /\b(?:quote|quotation|invoice|inv|qu|qt|q)\s*(?:no\.?|number|#)?\s*[:#-]?\s*([A-Z]{0,4}-?\d{2,8})\b/i;
  function titleCase(s) { return String(s || '').toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }

  // ---- a text or an email he already sent -------------------------------------------------------------
  // Finds who it went to, the amount, the date, the quote number and what it was for. Guesses are fine:
  // the app puts them in front of him to check before anything is chased.
  function parseText(text) {
    var t = String(text == null ? '' : text).replace(/\r/g, ''), out = { kind: 'quote', name: '', phone: '', email: '', amount: NaN, date: '', number: '', what: '' };
    if (/\binvoice\b/i.test(t) && !/\bquote\b/i.test(t)) out.kind = 'invoice';
    // headers of a forwarded or copied email
    var to = t.match(/^\s*to:\s*(.+)$/im), sent = t.match(/^\s*(?:sent|date):\s*(.+)$/im), subj = t.match(/^\s*subject:\s*(.+)$/im);
    if (to) {
      var em = to[1].match(EMAIL); if (em) out.email = em[0].toLowerCase();
      var nm = to[1].replace(/<[^>]*>/g, '').replace(EMAIL, '').replace(/["']/g, '').replace(/[;,].*$/, '').trim(); if (nm && /[A-Za-z]/.test(nm)) out.name = nm;
    }
    if (sent) out.date = parseDate(sent[1]);
    // the body: everything after the headers
    var body = t.replace(/^\s*(from|to|cc|bcc|sent|date|subject):.*$/gim, '');
    if (!out.email) { var e2 = body.match(EMAIL); if (e2) out.email = e2[0].toLowerCase(); }
    var ph = body.match(MOBILE) || t.match(MOBILE) || body.match(LANDLINE); if (ph) out.phone = tidyPhone(ph[0]);
    if (!out.name) {
      // the greeting word in any case; the name after it must start with a capital, or "hi there" is a name
      var hi = body.match(/(?:^|\n)\s*(?:[Hh]i|[Hh]ey|[Hh]ello|[Dd]ear|[Gg]'?day|[Mm]orning|[Aa]fternoon)\s+([A-Z][a-z'\-]+(?:\s+(?:and|&)\s+[A-Z][a-z'\-]+|\s+[A-Z][a-z'\-]+(?=[,.!\s]))?)/);
      if (hi) out.name = hi[1];
    }
    if (!out.name && out.email) out.name = titleCase(out.email.split('@')[0].replace(/[._\d]+/g, ' ').trim());
    // "Q-311", "INV-1006", "QU-0042" are numbers whole; otherwise the word quote or invoice then a number
    var TAG = /\b((?:QUO|QU|QT|Q|INV|IN|EST|JOB|J)-\d{2,8})\b/i;
    var num = (subj && (subj[1].match(TAG) || subj[1].match(NUMBER))) || body.match(TAG) || body.match(NUMBER); if (num) out.number = num[1].toUpperCase();
    // amounts: a line that says total wins; otherwise the largest figure, which on a quote is nearly always it
    var best = NaN, labelled = NaN, re = /(?:A?\$|AUD\s?)\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?k\b)?|\b\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\b/gi, m;
    body.split('\n').forEach(function (line) {
      var mm; re.lastIndex = 0;
      while ((mm = re.exec(line))) {
        var v = parseMoney(mm[0]); if (!(v > 0)) continue;
        if (/total|inc(?:l|luding)?\.?\s*gst|all up|comes to|price is|quote is|quote of|balance|owing|due/i.test(line) && !(labelled >= v)) labelled = v;
        if (!(best >= v)) best = v;
      }
    });
    out.amount = labelled > 0 ? labelled : best;
    // what it was for: "quote for the deck", "painting the lounge", or the subject line
    var w = body.match(/\b(?:quote|price|quotation|invoice)\s+(?:for|to)\s+(?:the\s+|your\s+)?([^.,;!\n$]{3,60})/i);
    if (w) out.what = w[1].trim().replace(/\s+(?:at|on|is|comes|which|as)\b.*$/i, '');
    else if (subj) out.what = subj[1].replace(NUMBER, '').replace(/^(re|fw|fwd):\s*/i, '').replace(/^\W+|\W+$/g, '').trim();
    if (!out.date) { var d2 = body.match(/\b\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4}\b/); if (d2) out.date = parseDate(d2[0]); }
    return out;
  }

  // ---- a spreadsheet export ------------------------------------------------------------------------------
  // CSV as Excel, Numbers, Google Sheets and every job app write it: quoted fields, commas inside quotes,
  // doubled quotes, CRLF, a byte-order mark, and semicolon or tab files from other locales.
  function parseCSV(text) {
    var s = String(text == null ? '' : text).replace(/^﻿/, ''), first = s.split(/\r?\n/, 1)[0] || '';
    var delim = [',', ';', '\t'].map(function (d) { return [d, first.split(d).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0];
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"') { q = true; continue; }
      if (c === delim) { row.push(cell); cell = ''; continue; }
      if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; continue; }
      cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
  }

  // What each column is, from its heading, across the exports tradies actually have: Tradify, ServiceM8,
  // Fergus, simPRO, AroFlo, Xero, MYOB, QuickBooks, and spreadsheets people keep by hand.
  var FIELDS = {
    // the person to say hello to, and the business the work was for; a chase greets the person
    name: ['contactname', 'contactperson', 'clientname', 'name', 'contact', 'attention', 'attn'],
    company: ['customername', 'customer', 'client', 'companyname', 'company', 'businessname', 'accountname', 'account', 'billto', 'to'],
    first: ['firstname', 'contactfirstname', 'contactfirst', 'first', 'givenname'],
    last: ['lastname', 'contactlastname', 'contactlast', 'last', 'surname', 'familyname'],
    phone: ['mobile', 'mobilephone', 'mobilenumber', 'contactmobile', 'cell', 'cellphone', 'phone', 'phonenumber', 'contactphone', 'telephone', 'ph', 'mob'],
    email: ['email', 'emailaddress', 'contactemail', 'customeremail', 'clientemail', 'billingemail', 'mail'],
    due: ['duedate', 'paymentdue', 'datedue', 'due'],
    owing: ['amountdue', 'balancedue', 'balance', 'owing', 'outstanding', 'invoiceamountdue', 'amountoutstanding', 'unpaid'],
    paid: ['amountpaid', 'invoiceamountpaid', 'paid', 'paidamount', 'totalpaid'],
    amount: ['totalincgst', 'totalinclgst', 'totalinctax', 'totalincltax', 'grandtotal', 'quotetotal', 'invoicetotal', 'jobtotal', 'total', 'totalamount', 'amountincgst', 'amount', 'value', 'price', 'quotevalue', 'totalinc'],
    date: ['datesent', 'sentdate', 'sent', 'quotedate', 'invoicedate', 'issuedate', 'dateissued', 'date', 'created', 'datecreated', 'createddate', 'quotedon', 'issued'],
    number: ['quotenumber', 'quoteno', 'quote', 'invoicenumber', 'invoiceno', 'invoice', 'jobnumber', 'jobno', 'number', 'no', 'docnumber', 'documentnumber', 'ref', 'reference', 'id'],
    status: ['status', 'quotestatus', 'invoicestatus', 'jobstatus', 'stage', 'state'],
    kind: ['type', 'documenttype', 'doctype', 'kind'],
    what: ['description', 'jobdescription', 'title', 'jobtitle', 'summary', 'subject', 'jobname', 'details', 'scope', 'workdescription', 'reference']
  };
  function key(h) { return String(h || '').toLowerCase().replace(/\(.*?\)/g, function (x) { return x.replace(/[^a-z]/g, ''); }).replace(/[^a-z0-9]/g, ''); }
  function mapColumns(headers) {
    var keys = headers.map(key), map = {}, used = {};
    // exact matches first, in order of how sure a heading is; then headings that contain the word
    Object.keys(FIELDS).forEach(function (f) {
      FIELDS[f].some(function (w) { var i = keys.indexOf(w); if (i >= 0 && !used[i]) { map[f] = i; used[i] = 1; return true; } return false; });
    });
    Object.keys(FIELDS).forEach(function (f) {
      if (map[f] != null) return;
      FIELDS[f].some(function (w) { if (w.length < 4) return false; for (var i = 0; i < keys.length; i++) if (!used[i] && keys[i].indexOf(w) >= 0) { map[f] = i; used[i] = 1; return true; } return false; });
    });
    // "Reference" is Xero's description when there is already a number column, and the number when there is not
    return map;
  }
  // A heading row is one with at least two cells that look like headings we know.
  function headerRow(rows) {
    for (var r = 0; r < Math.min(rows.length, 6); r++) { var m = mapColumns(rows[r]); if (Object.keys(m).length >= 2 && (m.name != null || m.first != null || m.company != null) && (m.amount != null || m.owing != null)) return r; }
    return 0;
  }

  // Which rows are worth chasing. A quote that was sent and not answered; an invoice not paid.
  // Drafts were never sent, so there is nothing to chase; declined and paid are finished.
  function classify(statusText, kindText, fileKind) {
    var s = String(statusText || '').toLowerCase(), k = String(kindText || '').toLowerCase();
    var kind = /invoice|bill|accrec|receivable/.test(k) ? 'invoice' : /quote|estimate|proposal/.test(k) ? 'quote' : fileKind;
    if (/void|deleted|cancel|declin|reject|lost|expired|archiv/.test(s)) return { kind: kind, skip: 'closed' };
    if (/draft|not sent|unsent/.test(s)) return { kind: kind, skip: 'draft' };
    if (/^paid|fully paid|\bpaid\b(?! ?part)/.test(s) && !/unpaid|part/.test(s)) return { kind: kind, skip: 'paid' };
    if (/accept|approv|won|work ?order|scheduled|booked|in progress/.test(s) && kind === 'quote') return { kind: kind, accepted: true };
    if (/invoice|awaiting payment|authori[sz]ed|overdue|unpaid|outstanding|part/.test(s) && kind !== 'invoice' && !/quote/.test(s)) return { kind: 'invoice' };
    return { kind: kind };
  }

  // Rows to items, with the reasons some were left out so the app can say so plainly.
  function readSheet(text, opts) {
    opts = opts || {};
    var rows = parseCSV(text); if (!rows.length) return { items: [], skipped: {}, map: {}, headers: [] };
    var h = headerRow(rows), headers = rows[h], map = opts.map || mapColumns(headers), body = rows.slice(h + 1);
    var heads = headers.map(key).join(' '), fileKind = /invoice/.test(heads) && !/quote/.test(heads) ? 'invoice' : 'quote';
    if (map.owing != null && map.amount == null) fileKind = 'invoice';
    var items = [], skipped = {}, get = function (r, f) { return map[f] != null ? String(r[map[f]] == null ? '' : r[map[f]]).trim() : ''; };
    body.forEach(function (r) {
      var business = get(r, 'company'), name = get(r, 'name') || [get(r, 'first'), get(r, 'last')].filter(Boolean).join(' ') || business;
      var cls = classify(get(r, 'status'), get(r, 'kind'), fileKind);
      if (cls.skip) { skipped[cls.skip] = (skipped[cls.skip] || 0) + 1; return; }
      var total = parseMoney(get(r, 'amount')), owing = parseMoney(get(r, 'owing')), paid = parseMoney(get(r, 'paid'));
      if (cls.kind === 'invoice' && owing === 0 && (total > 0 || paid > 0)) { skipped.paid = (skipped.paid || 0) + 1; return; }
      var amount = total > 0 ? total : owing > 0 ? owing : NaN;
      if (!name || !(amount > 0)) { skipped.incomplete = (skipped.incomplete || 0) + 1; return; }
      var item = { kind: cls.kind, name: name, business: business && business !== name ? business : '', phone: tidyPhone(get(r, 'phone')), email: (get(r, 'email').match(EMAIL) || [''])[0].toLowerCase(), amount: amount,
        date: parseDate(get(r, 'date')), due: parseDate(get(r, 'due')), number: get(r, 'number'), what: get(r, 'what'), accepted: !!cls.accepted,
        paid: cls.kind === 'invoice' ? (paid > 0 ? paid : (total > 0 && owing > 0 && owing < total ? Math.round((total - owing) * 100) / 100 : 0)) : 0 };
      if (item.what === item.number) item.what = '';
      items.push(item);
    });
    return { items: items, skipped: skipped, map: map, headers: headers };
  }

  // ---- a quote or invoice document (the text of a PDF, or what a photo of one says) -----------------------------
  // A document carries his own name, phone, email and ABN at the top, so those are never taken for the customer's.
  // Labels win over guesses: "Prepared for", "Bill to", "Quote date", "Due date", "Total".
  var DATE_RE = /\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9},?\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/;
  function digits(s) { return String(s || '').replace(/\D/g, '').replace(/^61/, '0'); }
  function parseDoc(text, own) {
    own = own || {};
    var t = String(text == null ? '' : text).replace(/\r/g, '').replace(/[ \t ]+/g, ' ');
    var lines = t.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var ownPhones = [own.phone, own.mobile].map(digits).filter(function (d) { return d.length >= 8; });
    var ownEmail = String(own.email || '').trim().toLowerCase(), ownNames = [own.name, own.trading_name, own.owner_name].map(function (n) { return String(n || '').trim().toLowerCase(); }).filter(Boolean);
    var isOwnName = function (n) { n = String(n || '').trim().toLowerCase(); return !!n && ownNames.some(function (o) { return o === n || (o.length > 3 && (o.indexOf(n) >= 0 || n.indexOf(o) >= 0)); }); };
    // what the plain reader makes of it, before anything of his own is removed
    var base = parseText(lines.join('\n'));
    var out = { kind: base.kind, name: '', phone: '', email: '', amount: base.amount, date: '', due: '', number: base.number, what: '' };
    if (/\bquot(?:e|ation)\b|\bestimate\b/i.test(t)) out.kind = 'quote';
    else if (/\b(?:tax )?invoice\b/i.test(t)) out.kind = 'invoice';
    // contact details that are not his
    var emails = t.match(new RegExp(EMAIL.source, 'g')) || [];
    for (var i = 0; i < emails.length; i++) { var e = emails[i].toLowerCase(); if (e !== ownEmail) { out.email = e; break; } }
    var mob = t.match(new RegExp(MOBILE.source, 'g')) || [], land = t.match(new RegExp(LANDLINE.source, 'g')) || [];
    var phones = mob.concat(land);
    for (i = 0; i < phones.length; i++) if (ownPhones.indexOf(digits(phones[i])) < 0) { out.phone = tidyPhone(phones[i]); break; }
    // who it is for: a labelled line, or the line under a label on its own
    var LABEL = /^(?:quote|quotation|estimate|invoice|tax invoice)?\s*(?:prepared for|quoted? for|estimate for|bill(?:ed)? to|invoice to|sold to|customer(?: name)?|client(?: name)?|attention|attn|to|for|name)\s*[:\-]?\s*(.*)$/i;
    for (i = 0; i < lines.length && !out.name; i++) {
      var m = lines[i].match(LABEL); if (!m || /^(?:total|date|due)/i.test(lines[i])) continue;
      var v = m[1] || lines[i + 1] || '';
      v = v.replace(EMAIL, '').replace(MOBILE, '').replace(LANDLINE, '').replace(/\b(?:ph|phone|mob|mobile|email|e)\s*:?\s*$/i, '').replace(/[,;|].*$/, '').trim();
      if (v && /[A-Za-z]{2}/.test(v) && !/\d{3,}/.test(v) && v.length <= 60 && !isOwnName(v) && !LABEL.test(v)) out.name = v;
    }
    if (!out.name && base.name && !isOwnName(base.name)) out.name = base.name;
    if (!out.name && out.email) out.name = titleCase(out.email.split('@')[0].replace(/[._\d]+/g, ' ').trim());
    // dates: each read from right after its own label. "Due date", "Payment due" and "Pay by" are the due date;
    // any other "date" is the date it was issued. "Valid until" is neither.
    var labelled = new RegExp('\\b(due\\s+date|payment\\s+due|pay\\s+by|due(?:\\s+(?:on|by))?|(?:quote|quotation|invoice|issue|estimate)?\\s*date[d]?)\\s*[:\\-]?\\s*(' + DATE_RE.source + ')', 'ig'), dm;
    while ((dm = labelled.exec(t))) {
      if (/due|pay/i.test(dm[1])) { if (!out.due) out.due = parseDate(dm[2]); }
      else if (!out.date) out.date = parseDate(dm[2]);
    }
    if (!out.date) { var any = t.match(DATE_RE); if (any) out.date = parseDate(any[0]); }
    // what for: a labelled line, else what the plain reader found
    for (i = 0; i < lines.length && !out.what; i++) {
      var w = lines[i].match(/^(?:description|job|project|re|subject|scope(?: of works?)?|works?|site)\s*[:\-]\s*(.{3,80})$/i);
      if (w && !/\$\s?\d/.test(w[1])) out.what = w[1].trim();
    }
    if (!out.what) out.what = base.what;
    return out;
  }

  // ---- every text he sent, from a backup of the phone ---------------------------------------------------------
  // Android lets a texts app read them, and "SMS Backup & Restore" (free, the one most people already have)
  // writes them all to one XML file. iPhone texts only come out through a computer, as a CSV with a column of
  // message text. Either way: the texts he sent that put a price on a job, the latest for each person, and what
  // the customer said after it. A backup with photos in it can be hundreds of megabytes, so it is fed in pieces
  // and photos are stepped over rather than read.
  var ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  function chr(n) { return n > 0xFFFF && String.fromCodePoint ? String.fromCodePoint(n) : String.fromCharCode(n > 0xFFFF ? 0xFFFD : n); }
  function unent(s) { return String(s).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, function (m, e) { e = e.toLowerCase(); return e.charAt(0) === '#' ? chr(e.charAt(1) === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e]; }); }
  function attrs(tag) { var o = {}, re = /([\w:-]+)="([^"]*)"/g, m; while ((m = re.exec(tag))) o[m[1]] = unent(m[2]); return o; }
  var PRICEY = /quot|estimat|invoice|price|\bcost|\$|\binc(?:l|luding)?\.?\s*gst|all up|total/i;
  var SAID_YES = /\b(yes|yep|yeah|yes please|go ahead|sounds good|happy (?:to go|with that|with the)|let'?s do it|book (?:it|us|me) in|accept(?:ed)?|go for it|deal|when can you start)\b/i;
  var SAID_NO = /\b(no thanks|not going ahead|won'?t be going ahead|gone with (?:someone|another)|went with (?:someone|another)|too (?:expensive|dear)|declin)/i;
  var SAID_PAID = /\b(paid|transferred|payment (?:sent|made|done)|sent (?:the|you the) (?:money|payment))\b/i;
  function textsReader(opts) {
    opts = opts || {};
    var now = opts.now || Date.now(), since = now - (opts.days || 180) * 86400000;
    var buf = '', from = 0, csv = null, mms = null, threads = {}, scanned = 0;
    function add(addr, name, out, when, body) {
      if (!addr || /[~,;]/.test(addr) || String(addr).replace(/\D/g, '').length < 8) return;   // group texts and short codes are not customers
      when = +when || 0; if (when && when < since) return;
      var ph = tidyPhone(addr), k = ph.replace(/\D/g, '');
      var th = threads[k] || (threads[k] = { phone: ph, name: '', msgs: [] });
      if (name && name !== '(Unknown)' && !/^\+?[\d\s()-]+$/.test(name)) th.name = name;
      th.msgs.push({ out: out, when: when, body: String(body || '') }); scanned++;
    }
    function tags() {
      for (;;) {
        var lt = buf.indexOf('<', from); if (lt < 0) { buf = ''; from = 0; return; }
        var gt = buf.indexOf('>', lt); if (gt < 0) { buf = buf.slice(lt); from = 0; return; }
        var head = buf.substr(lt, 8), tag;
        if (/^<sms[\s/>]/.test(head)) { var a = attrs(buf.slice(lt, gt)); add(a.address, a.contact_name, a.type === '2', a.date, a.body); }
        else if (/^<mms[\s/>]/.test(head)) { mms = attrs(buf.slice(lt, gt)); mms.text = ''; }
        else if (/^<part[\s/>]/.test(head) && mms) {
          tag = buf.slice(lt, gt); var cut = tag.indexOf(' data="'); if (cut > 0) tag = tag.slice(0, cut);   // a photo: step over it
          if (/\bct="text\/plain"/.test(tag)) { var pa = attrs(tag); if (pa.text && pa.text !== 'null') mms.text += (mms.text ? '\n' : '') + pa.text; }
        }
        else if (/^<\/mms>/.test(head) && mms) { add(mms.address, mms.contact_name, mms.msg_box === '2', mms.date, mms.text); mms = null; }
        from = gt + 1;
      }
    }
    function push(chunk) {
      chunk = String(chunk || '');
      if (csv === null && buf === '' && /\S/.test(chunk)) csv = !/^\s*(?:﻿)?</.test(chunk);
      if (csv) { buf += chunk; return; }
      buf = buf.slice(from) + chunk; from = 0; tags();
    }
    // A CSV of messages: a column of text, a column saying which way it went, and who the chat was with.
    function readCsv() {
      var rows = parseCSV(buf); buf = ''; if (rows.length < 2) return;
      var hs = rows[0].map(key), col = function (re) { for (var i = 0; i < hs.length; i++) if (re.test(hs[i])) return i; return -1; };
      var tx = col(/^(text|body|message|messagetext|messagebody|content)$/), dir = col(/^(type|direction|messagetype|folder|box|sentreceived|isfromme|fromme|isoutgoing)$/);
      var who = col(/^(chatsession|conversation|thread|chat|contact|contactname|name|recipient|to|address|phonenumber|phone|number)$/);
      var sid = col(/^(senderid|sender|from|fromaddress|handle)$/), dt = col(/^(messagedate|date|datetime|sentdate|timestamp|time)$/);
      if (tx < 0 || (who < 0 && sid < 0)) return;
      var phones = {};
      rows.slice(1).forEach(function (r) { var w = r[who] || '', s = r[sid] || '', p = (String(w).match(MOBILE) || String(s).match(MOBILE) || [''])[0]; if (w && p && !phones[w]) phones[w] = p; });
      rows.slice(1).forEach(function (r) {
        var d = dir >= 0 ? String(r[dir] || '').toLowerCase() : '', out = /out|sent|^2$|true|yes|from me/.test(d) && !/incom|receiv|inbox/.test(d);
        if (dir >= 0 && /^(isfromme|fromme|isoutgoing)$/.test(hs[dir])) out = /^(1|true|yes)$/.test(d);
        var w = who >= 0 ? String(r[who] || '') : '', addr = phones[w] || (String(w).match(MOBILE) || [''])[0] || (!out && sid >= 0 ? r[sid] : '');
        var when = dt >= 0 ? Date.parse(parseDate(r[dt]) || r[dt]) : 0;
        add(addr, w && !MOBILE.test(w) ? w : '', out, when, r[tx]);
      });
    }
    function done() {
      if (csv) readCsv();
      var items = [], skipped = {};
      Object.keys(threads).forEach(function (k) {
        var th = threads[k], msgs = th.msgs.sort(function (a, b) { return a.when - b.when; }), q = null, it = null;
        for (var i = msgs.length - 1; i >= 0 && !q; i--) {
          var m = msgs[i]; if (!m.out || !PRICEY.test(m.body)) continue;
          var p = parseText(m.body); if (p.amount >= 50 && p.amount <= 5000000) { q = m; it = p; }
        }
        if (!q) return;
        var after = msgs.filter(function (m) { return !m.out && m.when > q.when; }).map(function (m) { return m.body; }).join('\n');
        if (SAID_NO.test(after)) { skipped.closed = (skipped.closed || 0) + 1; return; }
        if (it.kind === 'invoice' && SAID_PAID.test(after)) { skipped.paid = (skipped.paid || 0) + 1; return; }
        var d = q.when ? new Date(q.when) : null;
        items.push({ kind: it.kind, name: th.name || it.name || th.phone, business: '', phone: th.phone, email: it.email, amount: it.amount, date: d ? iso(d.getFullYear(), d.getMonth() + 1, d.getDate()) : it.date,
          due: '', number: it.number, what: it.what, accepted: it.kind === 'quote' && SAID_YES.test(after), paid: 0, source: 'texts' });
      });
      items.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      return { items: items, skipped: skipped, scanned: scanned, people: Object.keys(threads).length };
    }
    return { push: push, done: done };
  }
  function readTexts(text, opts) { var r = textsReader(opts); r.push(text); return r.done(); }

  var api = { parseText: parseText, parseDoc: parseDoc, parseCSV: parseCSV, readSheet: readSheet, textsReader: textsReader, readTexts: readTexts, mapColumns: mapColumns, parseDate: parseDate, parseMoney: parseMoney, tidyPhone: tidyPhone, FIELDS: FIELDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.QCIngest = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this);   // the phone, node tests, and the relay (an ES module, where `this` is undefined)
