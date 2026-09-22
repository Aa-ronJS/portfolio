// PDF edge cases: names with markup/emoji/accents/200 chars, 60 lines, logos, GST off, zero total, negative final, deposit edge settings.
const { boot, loadPdfjs, OUT, fs } = require('./h.cjs');
(async () => {
  const t = await boot({ desktop: true }); const { p, ok } = t;
  await loadPdfjs(p);
  await p.evaluate(() => { const S = window.__qcApp.store.load(); Object.assign(S.details, { trading_name: 'Test Painting Co', owner_name: 'Sam', bsb: '063-000', account_number: '12345678', account_name: 'Test Painting Co', phone: '0400 000 000', email: 'sam@example.com' }); window.__qcApp.store.save(); });
  // Build a job with rooms; returns {pages, err, bytes}
  const gen = (spec) => p.evaluate(async (spec) => {
    const S = JSON.parse(JSON.stringify(window.__qcApp.store.load())); if (spec.details) Object.assign(S.details, spec.details); if (spec.prices) Object.assign(S.prices, spec.prices);
    const base = window.__qcApp.store.newRoom('interior');
    const job = window.__qcApp.store.newJob(); // persisted, fine
    job.client = Object.assign({ name: 'Jane', phone: '0411 222 333', email: 'j@x.com', address: '12 Main St Gawler 5118' }, spec.client || {});
    if (spec.job) { Object.assign(job, spec.job); if (spec.job.client) job.client = Object.assign({}, job.client, spec.job.client); } job.summary = spec.summary || 'Repaint lounge'; job.rooms = (spec.rooms || [{ L: 4, W: 3, name: 'Lounge' }]).map(r => Object.assign({}, base, r)); job.extras = spec.extras || [];
    const pr = window.__qcApp.pricing.priceJob(job, S);
    job.quote = { date: QCStore.today(), lines: pr.lines, subtotal: pr.subtotal, gst: pr.gst, total: pr.total, deposit: pr.deposit, assumptions: pr.assumptions };
    const out = { lines: pr.lines.length, total: pr.total, deposit: pr.deposit };
    try {
      let d; if (spec.invoice) { d = QCPdf.invoicePDF(job, spec.invoice, S); } else d = QCPdf.quotePDF(job, S, pr);
      const data = new Uint8Array(d.output('arraybuffer')); out.bytes = data.length;
      const pdf = await window.pdfjs.getDocument({ data: data.slice() }).promise; out.pages = pdf.numPages; out.text = [];
      for (let i = 1; i <= pdf.numPages; i++) { const pg = await pdf.getPage(i); const tc = await pg.getTextContent(); out.text.push(tc.items.map(x => x.str).join(' ')); }
      if (spec.shot) { const pg = await pdf.getPage(spec.shotPage || 1), vp = pg.getViewport({ scale: 1.4 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; out.png = c.toDataURL('image/png'); }
    } catch (e) { out.err = e.message; }
    return out;
  }, spec);
  const save = (r, name) => { if (r.png) fs.writeFileSync(OUT + '/' + name + '.png', Buffer.from(r.png.split(',')[1], 'base64')); };

  let r = await gen({ client: { name: '<b>Jane</b> & "Co" \'x\' <script>alert(1)</script>' }, shot: true }); save(r, 'pdf-markup-name');
  ok(!r.err && r.pages >= 1 && /<b>Jane<\/b> & "Co"/.test(r.text[0]), 'quote: markup name rendered literally (' + r.pages + ' pages)');
  r = await gen({ client: { name: 'Zoë Müller-Étienne 🎨🏠 café' }, shot: true }); save(r, 'pdf-emoji-name');
  ok(!r.err && /Zoë Müller-Étienne/.test(r.text[0]), 'quote: accented name renders (é ü ë)'); t.note('emoji in name extracted as: ' + JSON.stringify((r.text[0].match(/Étienne (.{0,12})/) || [])[1]));
  const long = 'Alexandrina Wolfeschlegelsteinhausenbergerdorff-Featherstonehaugh de la Fontaine y Villanueva-Montgomery-Smythe-Worthington III and Associates Pty Ltd trading as The Very Long Name Co'; // 200-ish
  r = await gen({ client: { name: long.slice(0, 200), address: 'Unit 47B, Level 12, 1234 Very Long Boulevard Name Extension, Some Suburb With A Long Name SA 5118' }, shot: true }); save(r, 'pdf-long-name');
  ok(!r.err && r.pages >= 1, 'quote: 200-char name generates (' + r.pages + ' page)');
  // 60 lines
  const rooms = []; for (let i = 0; i < 12; i++) rooms.push({ L: 4 + i * 0.1, W: 3, name: 'Room ' + (i + 1), doors: 1, windows: 1, condition: 'poor' });
  r = await gen({ rooms, shot: true, shotPage: 1 }); save(r, 'pdf-60lines-p1');
  ok(!r.err && r.lines >= 60 && r.pages >= 2, `quote: ${r.lines} lines -> ${r.pages} pages (must be >1)`);
  const r2 = await gen({ rooms, shot: true, shotPage: 2 }); save(r2, 'pdf-60lines-p2');
  ok(r2.text && r2.text.every(x => x.length > 50), '60-line quote: every page has text');
  const one = await gen({ rooms: [{ L: 4, W: 3 }] }); t.note('1-line quote pages=' + one.pages + ', 60-line pages=' + r.pages);
  // page-fit: very long included wording -> does text overflow the page?
  const wording = await p.evaluate(() => { const S = window.__qcApp.store.load(); const w = S.wording.included.slice(); S.wording.included = w.concat(Array.from({ length: 90 }, (_, i) => 'Included clause number ' + (i + 1) + ' which is a long sentence to make the bullets wrap onto a second line in the PDF layout so we can see if it paginates.')); window.__qcApp.store.save(); return w; });
  r = await gen({ shot: true, shotPage: 2 }); save(r, 'pdf-longwording-p2'); ok(!r.err && r.pages >= 3, 'quote with 95 included bullets paginates (' + r.pages + ' pages)');
  await p.evaluate(w => { const S = window.__qcApp.store.load(); S.wording.included = w; window.__qcApp.store.save(); }, wording);
  // a single very long paragraph (accept wording) longer than one page
  const acc = await p.evaluate(() => { const S = window.__qcApp.store.load(); const a = S.wording.accept; S.wording.accept = Array.from({ length: 120 }, (_, i) => 'Line ' + i + ' of a very long acceptance paragraph that goes on.').join('\n'); window.__qcApp.store.save(); return a; });
  r = await gen({ shot: true, shotPage: 2 }); save(r, 'pdf-longpara-p2');
  ok(!r.err, 'quote with 120-line accept paragraph generates (' + r.pages + ' pages)'); t.note('long paragraph: pages=' + r.pages + ' last page text length=' + (r.text ? r.text[r.text.length - 1].length : 'n/a'));
  await p.evaluate(a => { const S = window.__qcApp.store.load(); S.wording.accept = a; window.__qcApp.store.save(); }, acc);
  // logos
  const png1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP4z8DwHwyBNAMDAC7eBf1jNiFbAAAAAElFTkSuQmCC';
  r = await gen({ details: { logo: png1 }, shot: true }); save(r, 'pdf-logo-small'); ok(!r.err && r.pages >= 1 && /QUOTE/.test(r.text[0]), 'quote with tiny PNG logo renders');
  r = await gen({ details: { logo: 'data:image/png;base64,xxx' } }); ok(!r.err && r.pages >= 1, 'quote with garbage logo does not throw');
  r = await gen({ details: { logo: 'not a data url at all' } }); ok(!r.err, 'quote with non-data-url logo does not throw');
  r = await gen({ details: { logo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=' } }); ok(!r.err, 'quote with a JPEG data-url logo (declared PNG in code) does not throw');
  // GST off / zero total
  r = await gen({ details: { gst: false } }); ok(!r.err && !/GST/.test(r.text[0].replace(/inc GST/g, '')) && /Total/.test(r.text[0]), 'quote GST off: no GST row');
  r = await gen({ rooms: [] }); ok(!r.err && /Total/.test(r.text[0]), 'quote with zero rooms renders a Total row without throwing'); t.note('zero-room quote total text: ' + JSON.stringify((r.text[0].match(/Total[^$]*\$[\d,.]+/) || [''])[0]) + ' (engine may add travel and minimum job charge with no rooms)');
  // invoices
  const inv = (o) => Object.assign({ no: 'INV-2001', date: QCStore_today(), due: QCStore_today(), kind: 'final', kind_line: 'Final invoice on completion.', lines: [], subtotal: 0, gst: 0, total: 0 }, o);
  function QCStore_today() { return new Date().toISOString().slice(0, 10); }
  r = await gen({ invoice: inv({ lines: [{ desc: 'Work as quoted in Q-1', amount: 1000 }, { desc: 'Variation: credit for unpainted room', amount: -1800 }, { desc: 'Less deposit paid', amount: -200 }], subtotal: -1000, gst: -100, total: -1100 }), shot: true }); save(r, 'pdf-negative-final');
  ok(!r.err && /-\$1,100/.test(r.text[0]), 'negative final invoice renders -$1,100 (no throw)');
  r = await gen({ invoice: inv({ kind: 'deposit', lines: [{ desc: 'Deposit, 0% of quote', amount: 0 }], total: 0 }) }); ok(!r.err && /\$0/.test(r.text[0]), 'deposit invoice at 0% renders $0');
  r = await gen({ invoice: inv({ pay_url: 'https://buy.stripe.com/x"><script>' }) }); ok(!r.err, 'invoice with odd pay_url does not throw');
  r = await gen({ invoice: inv({ due: '' }) }); ok(!r.err, 'invoice with blank due date does not throw'); t.note('blank due text: ' + JSON.stringify((r.text[0].match(/Amount due by[^$]{0,20}/) || [''])[0]));
  r = await gen({ details: { deposit_pct: 0, balance_days: '' } }); ok(!r.err, 'quote terms with deposit_pct 0 / blank balance_days generate');
  const terms = (r.text[0].match(/A \d+% deposit[^.]*\./) || [''])[0], depbox = (r.text[0].match(/Deposit of \$[\d,]+/) || [''])[0];
  ok(/A 0% deposit/.test(terms) || !/A 20% deposit/.test(terms), 'deposit_pct=0: terms line must not say 20% (got "' + terms + '", box "' + depbox + '")');
  r = await gen({ details: { deposit_pct: '' } }); t.note('deposit_pct blank: terms "' + (r.text[0].match(/A \d*% deposit[^.]*\./) || [''])[0] + '"; box "' + (r.text[0].match(/Deposit of \$[\d,]+/) || [''])[0] + '"');
  r = await gen({ details: { deposit_pct: 100 }, job: { deposit_pct: 100, client: { type: 'commercial' } } }); const all100 = r.text.join(' '); ok(/Full payment \(\$[\d,.]+\) confirms the booking/.test(all100) && /Full payment of \$[\d,.]+/.test(all100), 'deposit_pct=100 terms + box render (' + JSON.stringify((all100.match(/Full payment[^.]*\./) || [''])[0]) + ')');
  r = await gen({ details: { quote_valid_days: '' } }); ok(!r.err && /Valid until:? \d/.test(r.text[0]), 'blank quote_valid_days -> falls back to 30');
  r = await gen({ details: { quote_valid_days: 'abc', balance_days: -5 } }); ok(!r.err, 'garbage quote_valid_days / negative balance_days do not throw');
  // Rate column rounding
  r = await gen({ rooms: [{ L: 4, W: 3, name: 'L' }], premium: true, details: {} });
  const prem = await p.evaluate(() => { const S = JSON.parse(JSON.stringify(window.__qcApp.store.load())); const job = { rooms: [Object.assign(window.__qcApp.store.newRoom(), { L: 4, W: 3 })], extras: [], premium_paint: true, client: { name: 'x', address: '' }, summary: '', quote_no: 'Q-9' }; const pr = window.__qcApp.pricing.priceJob(job, S); job.quote = { date: QCStore.today() }; const d = QCPdf.quotePDF(job, S, pr); return { rate: pr.lines[0].rate, qty: pr.lines[0].qty, amount: pr.lines[0].amount }; });
  t.note(`rate column: premium walls ${prem.qty} x $${prem.rate} = $${prem.amount}; rates print with cents (only when details.show_rates is on)`);
  // quotePDF on job with no frozen quote
  const nq = await p.evaluate(() => { const S = window.__qcApp.store.load(); const job = window.__qcApp.store.newJob(); try { QCPdf.quotePDF(job, S, window.__qcApp.pricing.priceJob(job, S)); return 'ok'; } catch (e) { return e.message; } }); t.note('quotePDF on unfrozen job (job.quote null): ' + nq);
  ok(t.errors.length === 0, 'no page errors during PDF tests');
  await t.done();
})().catch(e => { console.error(e); process.exit(1); });
