'use strict';
// HTML templates. Plain template strings, one escape helper, no framework.

const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso.length > 10 ? iso : iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Adelaide' });
};
const fmtDateTime = (iso) => new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Adelaide' });
const pill = (state) => `<span class="pill ${h(state)}">${h(state)}</span>`;
const kitLabel = (k) => `${k.type === 'vehicle' ? 'Vehicle kit' : 'Site kit'}${k.location ? ' · ' + h(k.location) : ''}`;
const EVENT_LABELS = {
  customer_created: 'Account opened', kit_registered: 'Kit registered', after_use_reported: 'Items used, refill requested',
  check_ok: 'Kit checked, all present', problem_reported: 'Problem reported', refill_shipped: 'Refill shipped',
  scheduled_refill_shipped: 'Scheduled refill pack shipped', aed_registered: 'AED registered', aed_updated: 'AED updated',
  plan_renewed: 'Plan renewed', item_adjusted: 'Contents adjusted', referral_made: 'Referred a business',
  partner_payout_recorded: 'Partner referral fee recorded', plan_cancelled: 'Plan cancelled', payment_failed: 'Renewal payment failed',
  payment_recovered: 'Payment received', stripe_event: 'Billing event',
  obligation_added: 'Compliance item added', obligation_done: 'Compliance item completed', obligation_retired: 'Compliance item removed',
};
function obligationRows(list) {
  return list.map((o) => `<tr><td>${h(o.label)}${o.location ? '<br><span class="small muted">' + h(o.location) + '</span>' : ''}</td><td>${pill(o.state)}</td><td>${fmtDate(o.last_done)}</td><td>${fmtDate(o.next_due)}</td><td class="small">${h(o.provider || '')}</td></tr>`).join('');
}
const eventLabel = (t) => EVENT_LABELS[t] || t;

function layout({ title, body, cfg, nav = 'public', extraHead = '' }) {
  const navHtml = nav === 'admin'
    ? `<nav><a href="/admin">Due today</a><a href="/admin/customers">Customers</a><a href="/admin/customers/new">New account</a><a href="/admin/partners">Partners</a><a href="/admin/leads">Leads</a><a href="/admin/metrics">Metrics</a><a href="/admin/labels">Labels</a><a href="/admin/export.csv">Export</a></nav>`
    : nav === 'none' ? '' : `<nav><a href="/#pricing">Pricing</a><a href="/#how">How it works</a><a href="tel:${h(cfg.phone)}">${h(cfg.phone)}</a></nav>`;
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(title)} · ${h(cfg.brand)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Public+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/style.css">
${extraHead}
</head>
<body>
<div class="wrap">
<header class="top"><a class="brand" href="${nav === 'admin' ? '/admin' : '/'}"><i></i>${h(cfg.brand)}</a>${navHtml}</header>
${body}
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------- landing
function landing(cfg) {
  const cta = cfg.checkoutUrl ? `<a class="btn" href="${h(cfg.checkoutUrl)}">Get compliant this week</a>` : `<a class="btn" href="tel:${h(cfg.phone)}">Call ${h(cfg.phone)}</a>`;
  return layout({ title: 'Workplace first-aid kits, always compliant', cfg, body: `
<section class="hero">
  <p class="eyebrow">Adelaide · Site kits · Vehicle kits · AED consumables</p>
  <h1>Your first-aid kits, always compliant. Never another visit.</h1>
  <p class="lede">Every workplace and every work vehicle must have a stocked first-aid kit, and someone has to prove it. ${h(cfg.brand)} keeps your kits stocked automatically and gives you a compliance certificate you can hand to an inspector, a head contractor or your insurer.</p>
  <div class="row">${cta}<a class="btn secondary" href="/check">Free 90-second compliance check</a></div>
</section>
<section id="how">
  <h2>How it works</h2>
  <div class="steps3">
    <div class="card"><b>1 · Kits arrive labelled</b>Code of Practice compliant site and vehicle kits, each with a QR label and a full contents register.</div>
    <div class="card"><b>2 · Used something? Scan it</b>Twenty seconds on a phone: tap what was used. The refill ships the same day. No forms, no phone calls.</div>
    <div class="card"><b>3 · Refills before expiry</b>Scheduled refill packs twice a year, AED pads and batteries before they expire, and a live record of every kit.</div>
  </div>
</section>
<section id="pricing">
  <h2>Pricing</h2>
  <div class="price">
    <div class="card"><h3>Site kit</h3><div class="amount">$119</div><div class="per">once, ex GST</div><ul><li>Code of Practice contents, up to 25 people (low-risk)</li><li>QR label and full contents register</li></ul></div>
    <div class="card"><h3>Vehicle kit</h3><div class="amount">$59</div><div class="per">once, ex GST</div><ul><li>Compact, fits a glovebox or console</li><li>QR label and contents register</li></ul></div>
    <div class="card"><h3>Replenishment plan</h3><div class="amount">$144 <span class="per">/ site kit / year</span></div><div class="per">$84 per vehicle kit per year. Monthly available.</div><ul><li>Two scheduled refill packs a year</li><li>After-use refills on a QR scan</li><li>Expiry tracking and audit log</li><li>Annual compliance certificate</li></ul></div>
    <div class="card"><h3>AED consumables</h3><div class="amount">Never expired</div><div class="per">OEM pads and batteries, billed at shipment</div><ul><li>Pads and battery replaced before expiry</li><li>Serial and model on your record</li></ul></div>
    <div class="card"><h3>Compliance calendar</h3><div class="amount">$14 <span class="per">/ month</span></div><div class="per">add-on per business</div><ul><li>Test-and-tag, fire equipment, AED service, emergency plan review: every dated obligation in one place</li><li>Reminders before each is due; the record and certificate show them</li><li>Plus: inductions, SWMS and chemical register at $29</li></ul></div>
  </div>
  <p class="small muted">Kits are supplied by a TGA-listed Australian manufacturer and match the example contents in the Safe Work Australia model Code of Practice: First aid in the workplace. Your risk assessment decides your final contents; burns, eye, remote and outdoor modules are available.</p>
  <div class="row">${cta}</div>
</section>
<section>
  <h2>Who it is for</h2>
  <p>Trades with utes, allied-health and dental practices, childcare centres, cafes and small manufacturers. If you have between one and thirty kits and would rather not think about them, this is for you. If you need a technician on site every quarter, we are not the right fit.</p>
  <p class="small muted">${h(cfg.legalName)} · ABN ${h(cfg.abn)} · ${h(cfg.email)} · ${h(cfg.phone)}</p>
</section>` });
}

// ---------------------------------------------------------------- scan page
function scanPage(kit, customer, items, cfg) {
  const choices = items.map((it) => `
<label class="choice">
  <span><span class="name">${h(it.name)}</span><br><span class="have">${it.qty_present} of ${it.qty_required} in kit</span></span>
  <span class="row" style="gap:8px">
    <select class="qty" name="qty_${it.id}" aria-label="How many ${h(it.name)} used">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}">${n}</option>`).join('')}</select>
    <input type="checkbox" name="used" value="${it.id}" aria-label="Used ${h(it.name)}">
  </span>
</label>`).join('');
  return layout({ title: 'Kit ' + kit.code, cfg, nav: 'none', body: `
<div class="narrow scan">
  <div class="kithead">
    <p class="eyebrow">${h(customer.name)}</p>
    <h1>${kitLabel(kit)}</h1>
    <span class="code">Kit ${h(kit.code)} · last checked ${fmtDate(kit.last_check_at)}</span>
  </div>
  <form method="post" action="/k/${h(kit.code)}/used">
    <h2>What did you use?</h2>
    <p class="small muted">Tick each item, set how many. The refill ships the same business day.</p>
    <div class="choices">${choices}</div>
    <label class="field"><span>Your name (optional)</span><input name="reporter" autocomplete="name"></label>
    <label class="field"><span>Anything else?</span><input name="note" placeholder="e.g. the scissors are blunt"></label>
    <div class="big-actions">
      <button class="btn block" type="submit">Send refill</button>
    </div>
  </form>
  <div class="big-actions">
    <form method="post" action="/k/${h(kit.code)}/ok"><button class="btn secondary block" type="submit">Nothing used, kit checked and complete</button></form>
    <form method="post" action="/k/${h(kit.code)}/problem"><input type="hidden" name="note" value="Kit missing, damaged or needs attention"><button class="btn quiet block" type="submit">Kit is missing or damaged</button></form>
  </div>
  <p class="small muted" style="margin-top:18px">This kit is kept stocked by ${h(cfg.brand)} for ${h(customer.name)}. Questions: ${h(cfg.phone)}.</p>
</div>` });
}

function scanDone(kind, kit, cfg, extra = '') {
  const msg = {
    used: `<h1>Refill on its way</h1><p>Thanks. What you used has been recorded and a refill will ship the same business day to ${h(extra)}. Nothing else to do.</p>`,
    ok: `<h1>Recorded</h1><p>Kit ${h(kit.code)} is marked checked and complete as of today. That check now appears on the compliance record.</p>`,
    problem: `<h1>We're on it</h1><p>The problem has been logged and someone will be in touch. If it is urgent, call ${h(cfg.phone)}.</p>`,
  }[kind];
  return layout({ title: 'Thanks', cfg, nav: 'none', body: `<div class="narrow scan">${msg}<p class="small muted">${h(cfg.brand)} · ${h(cfg.phone)}</p></div>` });
}

// ---------------------------------------------------------------- compliance record
function kitRows(kits) {
  return kits.map((k) => `<tr><td>${kitLabel(k)}<br><span class="mono small muted">${h(k.code)}</span></td><td>${pill(k.state)}</td><td>${fmtDate(k.last_check_at)}</td><td>${fmtDate(k.next_refill_at)}</td><td class="small">${k.reasons.length ? k.reasons.map(h).join('<br>') : 'All items present and in date'}</td></tr>`).join('');
}
function aedRows(aeds) {
  return aeds.map((a) => `<tr><td>${h(a.location || 'AED')}<br><span class="small muted">${h(a.make_model || '')} ${a.serial ? '· ' + h(a.serial) : ''}</span></td><td>${pill(a.state)}</td><td>${fmtDate(a.pads_expiry)}</td><td>${fmtDate(a.battery_expiry)}</td><td class="small">${a.reasons.map(h).join('<br>') || 'In date'}</td></tr>`).join('');
}

function record(customer, s, events, cfg) {
  return layout({ title: customer.name + ' compliance record', cfg, nav: 'none', body: `
<div class="printbar noprint"><a class="btn secondary" href="/c/${h(customer.token)}/certificate">Print certificate</a><a class="btn quiet" href="/c/${h(customer.token)}.json">JSON</a></div>
<div class="cert">
  <div class="head"><div><div class="brand">${h(cfg.brand)}</div><div class="small muted">First-aid compliance record</div></div><div class="stamp">Generated ${fmtDateTime(new Date().toISOString())}<br>Plan ${h(customer.plan_billing)} · renews ${fmtDate(customer.plan_renewal)}</div></div>
  <h1>${h(customer.name)}</h1>
  <p class="small muted">${h(customer.address || '')}${customer.abn ? ' · ABN ' + h(customer.abn) : ''}</p>
  ${customer.status === 'past_due' ? '<div class="banner warn"><p>Renewal payment pending. The plan continues while the payment is retried; update the card or call us to keep the record current.</p></div>' : ''}
  ${customer.status === 'cancelled' ? '<div class="banner bad"><p>Plan inactive since ' + fmtDate(customer.cancelled_at) + '. Kits remain registered; refills and the certificate resume when the plan does.</p></div>' : ''}
  <div class="status ${h(s.overall)}">${s.overall === 'compliant' ? 'All kits compliant' : 'Attention required'}</div>
  <h2>Kits</h2>
  <div class="tbl"><table><tr><th>Kit</th><th>Status</th><th>Last check</th><th>Next refill</th><th>Notes</th></tr>${kitRows(s.kits) || '<tr><td colspan="5">No kits registered yet.</td></tr>'}</table></div>
  ${s.aeds.length ? `<h2>Defibrillators</h2><div class="tbl"><table><tr><th>AED</th><th>Status</th><th>Pads expire</th><th>Battery expires</th><th>Notes</th></tr>${aedRows(s.aeds)}</table></div>` : ''}
  ${s.obligations && s.obligations.length ? `<h2>Compliance calendar</h2><div class="tbl"><table><tr><th>Item</th><th>Status</th><th>Last done</th><th>Next due</th><th>Provider</th></tr>${obligationRows(s.obligations)}</table></div>` : ''}
  <h2>History</h2>
  <div class="tbl"><table><tr><th>When</th><th>Event</th><th>Detail</th></tr>${events.map((e) => { const p = JSON.parse(e.payload || '{}'); const det = p.items ? p.items.map((i) => `${i.qty} × ${i.name}`).join(', ') : (p.location || p.note || p.reporter || p.tracking || ''); return `<tr><td class="small mono">${fmtDateTime(e.created_at)}</td><td>${h(eventLabel(e.type))}${e.kit_id ? '' : ''}</td><td class="small">${h(det)}</td></tr>`; }).join('') || '<tr><td colspan="3">No events yet.</td></tr>'}</table></div>
  <p class="fine">Kits are supplied by a TGA-listed Australian manufacturer with contents aligned to the example in the Safe Work Australia model Code of Practice: First aid in the workplace, and maintained under the ${h(cfg.brand)} replenishment plan. The duty to assess first-aid needs, provide trained first aiders and keep kits accessible remains with the person conducting the business or undertaking under the Work Health and Safety Act 2012 (SA) and Regulations. This record reflects information reported to ${h(cfg.brand)} as at the time generated.</p>
</div>` });
}

function certificate(customer, s, cfg) {
  const kitsCount = s.kits.length; const vehicles = s.kits.filter((k) => k.type === 'vehicle').length;
  return layout({ title: 'Certificate · ' + customer.name, cfg, nav: 'none', extraHead: '<script>addEventListener("load",()=>{if(location.search.includes("print"))print()})</script>', body: `
<div class="printbar noprint"><a class="btn quiet" href="/c/${h(customer.token)}">Back to record</a><button class="btn" onclick="print()">Print / save PDF</button></div>
<div class="cert">
  <div class="head"><div><div class="brand">${h(cfg.brand)}</div><div class="small muted">Workplace first-aid compliance certificate</div></div><div class="stamp">Issued ${fmtDate(new Date().toISOString().slice(0, 10))}<br>Certificate ref ${h(customer.token.slice(0, 8))}-${h(new Date().toISOString().slice(0, 10).replace(/-/g, ''))}</div></div>
  <h1>${h(customer.name)}</h1>
  <p class="small muted">${h(customer.address || '')}${customer.abn ? ' · ABN ' + h(customer.abn) : ''}</p>
  <div class="status ${h(s.overall)}">${s.overall === 'compliant' ? 'COMPLIANT' : s.overall.toUpperCase()}</div>
  <p>This certifies that <strong>${h(customer.name)}</strong> maintains <strong>${kitsCount} first-aid kit${kitsCount === 1 ? '' : 's'}</strong> (${kitsCount - vehicles} site, ${vehicles} vehicle)${s.aeds.length ? ` and ${s.aeds.length} defibrillator${s.aeds.length === 1 ? '' : 's'}` : ''} under a ${h(cfg.brand)} replenishment plan. Kit contents are aligned to the example list in the Safe Work Australia model Code of Practice: First aid in the workplace; sterile and dated items are replaced on a scheduled cycle and after reported use; every check, use and refill is logged on the customer's compliance record.</p>
  <div class="tbl"><table><tr><th>Kit</th><th>Status</th><th>Last check</th><th>Next refill</th></tr>${s.kits.map((k) => `<tr><td>${kitLabel(k)}<br><span class="mono small muted">${h(k.code)}</span></td><td>${pill(k.state)}</td><td>${fmtDate(k.last_check_at)}</td><td>${fmtDate(k.next_refill_at)}</td></tr>`).join('')}</table></div>
  ${s.aeds.length ? `<div class="tbl"><table><tr><th>AED</th><th>Status</th><th>Pads expire</th><th>Battery expires</th></tr>${s.aeds.map((a) => `<tr><td>${h(a.location || 'AED')} <span class="small muted">${h(a.make_model || '')}</span></td><td>${pill(a.state)}</td><td>${fmtDate(a.pads_expiry)}</td><td>${fmtDate(a.battery_expiry)}</td></tr>`).join('')}</table></div>` : ''}
  ${s.obligations && s.obligations.length ? `<p class="small" style="margin-top:14px"><strong>Compliance calendar</strong>: ${s.obligations.length} scheduled item${s.obligations.length === 1 ? '' : 's'} tracked (${s.obligations.filter((o) => o.state === 'compliant').length} current).</p><div class="tbl"><table><tr><th>Item</th><th>Status</th><th>Last done</th><th>Next due</th></tr>${s.obligations.map((o) => `<tr><td>${h(o.label)}</td><td>${pill(o.state)}</td><td>${fmtDate(o.last_done)}</td><td>${fmtDate(o.next_due)}</td></tr>`).join('')}</table></div>` : ''}
  <p class="small">Live record: <span class="mono">${h(cfg.baseUrl)}/c/${h(customer.token)}</span></p>
  <p class="fine">Issued by ${h(cfg.legalName)} (ABN ${h(cfg.abn)}). Kits are supplied by a TGA-listed Australian manufacturer. This certificate records the replenishment and check history reported to ${h(cfg.brand)}; the duty to assess first-aid needs, provide trained first aiders and keep kits accessible remains with the person conducting the business or undertaking under the Work Health and Safety Act 2012 (SA) and Regulations. Valid while the plan is current (renews ${fmtDate(customer.plan_renewal)}).</p>
</div>` });
}

// ---------------------------------------------------------------- admin
function dashboard(r, cfg) {
  const req = r.open.map((q) => `<tr><td><a href="/admin/customers/${h(q.customer_id)}">${h(q.customer_name)}</a><br><span class="small muted">${q.type === 'vehicle' ? 'Vehicle' : 'Site'} · ${h(q.location || '')} · ${h(q.code)}</span></td><td>${h(q.kind.replace('_', ' '))}</td><td class="small">${JSON.parse(q.items || '[]').map((i) => `${i.qty} × ${h(i.name)}`).join('<br>')}${q.note ? `<br><em>${h(q.note)}</em>` : ''}${q.reporter ? `<br><span class="muted">by ${h(q.reporter)}</span>` : ''}</td><td class="small mono">${fmtDateTime(q.created_at)}</td><td><form method="post" action="/admin/refills/${h(q.id)}/ship" class="row"><input name="tracking" placeholder="Tracking (optional)" style="min-width:150px"><button class="btn secondary" type="submit">Shipped</button></form></td></tr>`).join('');
  const sched = r.scheduled.map((k) => `<tr><td><a href="/admin/kits/${h(k.id)}">${h(k.customer_name)}</a><br><span class="small muted">${kitLabel(k)} · ${h(k.code)}</span></td><td>${pill(k.state)}</td><td>${fmtDate(k.next_refill_at)}</td><td class="small">${k.reasons.map(h).join('<br>')}</td><td><form method="post" action="/admin/kits/${h(k.id)}/refill" class="row"><input name="tracking" placeholder="Tracking" style="min-width:130px"><button class="btn secondary" type="submit">Pack shipped</button></form></td></tr>`).join('');
  const att = r.attention.map((k) => `<tr><td><a href="/admin/kits/${h(k.id)}">${h(k.customer_name)}</a><br><span class="small muted">${kitLabel(k)} · ${h(k.code)}</span></td><td>${pill(k.state)}</td><td class="small">${k.reasons.map(h).join('<br>')}</td></tr>`).join('');
  const aeds = r.aeds.map((a) => `<tr><td><a href="/admin/customers/${h(a.customer_id)}">${h(a.customer_name)}</a><br><span class="small muted">${h(a.location || 'AED')} · ${h(a.make_model || '')}</span></td><td>${pill(a.state)}</td><td class="small">${a.reasons.map(h).join('<br>')}</td></tr>`).join('');
  const ren = r.renewals.map((c) => `<tr><td><a href="/admin/customers/${h(c.id)}">${h(c.name)}</a></td><td>${fmtDate(c.plan_renewal)}</td><td class="n">${c.days}</td><td>${h(c.plan_billing)}</td></tr>`).join('');
  const empty = (cols, msg) => `<tr><td colspan="${cols}" class="muted">${msg}</td></tr>`;
  return layout({ title: 'Due today', cfg, nav: 'admin', body: `
<p class="eyebrow">${fmtDate(r.on)}</p>
<h1>What ships today</h1>
<h2>Refill requests (${r.open.length})</h2>
<div class="tbl"><table><tr><th>Customer / kit</th><th>Kind</th><th>Items</th><th>Reported</th><th>Ship</th></tr>${req || empty(5, 'Nothing reported. Good.')}</table></div>
<h2>Scheduled refill packs due (${r.scheduled.length})</h2>
<div class="tbl"><table><tr><th>Customer / kit</th><th>State</th><th>Due</th><th>Why</th><th>Ship</th></tr>${sched || empty(5, 'None due in the next ' + cfg.refillWindow + ' days.')}</table></div>
<h2>Kits needing attention (${r.attention.length})</h2>
<div class="tbl"><table><tr><th>Customer / kit</th><th>State</th><th>Why</th></tr>${att || empty(3, 'All kits compliant.')}</table></div>
<h2>AED consumables (${r.aeds.length})</h2>
<div class="tbl"><table><tr><th>Customer / AED</th><th>State</th><th>Why</th></tr>${aeds || empty(3, 'Nothing expiring.')}</table></div>
<h2>Compliance calendar items due (${(r.obligations || []).length})</h2>
<div class="tbl"><table><tr><th>Customer / item</th><th>State</th><th>Due</th><th>Provider</th><th></th></tr>${(r.obligations || []).map((o) => `<tr><td><a href="/admin/customers/${h(o.customer_id)}">${h(o.customer_name)}</a><br><span class="small muted">${h(o.label)}${o.location ? ' · ' + h(o.location) : ''}</span></td><td>${pill(o.state)}</td><td>${fmtDate(o.next_due)}</td><td class="small">${h(o.provider || '')}</td><td><form method="post" action="/admin/obligations/${h(o.id)}/done" class="row"><input type="date" name="date" value="${h(r.on)}" style="min-height:36px;padding:4px 8px"><button class="btn quiet" type="submit">Done</button></form></td></tr>`).join('') || empty(5, 'Nothing due in the next ' + (cfg.obligationWindow || 30) + ' days.')}</table></div>
<h2>Plan renewals in ${cfg.renewalWindow} days (${r.renewals.length})</h2>
<div class="tbl"><table><tr><th>Customer</th><th>Renews</th><th class="n">Days</th><th>Billing</th></tr>${ren || empty(4, 'None.')}</table></div>` });
}

function customers(list, cfg) {
  return layout({ title: 'Customers', cfg, nav: 'admin', body: `
<div class="row" style="justify-content:space-between"><h1>Customers (${list.length})</h1><a class="btn" href="/admin/customers/new">New account</a></div>
<div class="tbl"><table><tr><th>Name</th><th>Contact</th><th>Industry</th><th>Plan</th><th>Renews</th><th>Record</th></tr>
${list.map((c) => `<tr><td><a href="/admin/customers/${h(c.id)}">${h(c.name)}</a></td><td class="small">${h(c.contact_name || '')}<br>${h(c.phone || '')} ${h(c.email || '')}</td><td>${h(c.industry || '')}</td><td>${h(c.plan_billing)}</td><td>${fmtDate(c.plan_renewal)}</td><td><a class="small" href="/c/${h(c.token)}" target="_blank">open</a></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No customers yet. Create the first one.</td></tr>'}
</table></div>` });
}

const INDUSTRIES = ['Trades (plumbing, electrical, building)', 'Landscaping / outdoor', 'Allied health / dental', 'Childcare / education', 'Hospitality', 'Manufacturing / workshop', 'Office / retail', 'Other'];
const SOURCES = ['direct', 'paid', 'partner', 'referral', 'seo', 'check', 'other'];
function customerNew(cfg, err = '', partners = [], customers = []) {
  return layout({ title: 'New account', cfg, nav: 'admin', body: `
<h1>New account</h1>
<p class="small muted">Do this with the customer in front of you. Kits get registered on the next screen; the certificate exists the moment they are.</p>
${err ? `<div class="banner bad"><p>${h(err)}</p></div>` : ''}
<form method="post" action="/admin/customers/new" class="stack">
  <label class="field"><span class="req">Business name</span><input name="name" required></label>
  <label class="field"><span>ABN</span><input name="abn" inputmode="numeric"></label>
  <label class="field"><span>Contact name</span><input name="contact_name"></label>
  <label class="field"><span>Mobile</span><input name="phone" type="tel"></label>
  <label class="field"><span>Email</span><input name="email" type="email"></label>
  <label class="field"><span>Delivery address</span><input name="address"></label>
  <label class="field"><span>Industry</span><select name="industry">${INDUSTRIES.map((i) => `<option>${h(i)}</option>`).join('')}</select></label>
  <label class="field"><span>Plan billing</span><select name="plan_billing"><option value="annual">Annual (default)</option><option value="monthly">Monthly (+15%)</option></select></label>
  <div class="grid2">
    <label class="field"><span>How did they come to us?</span><select name="source">${SOURCES.map((x) => `<option value="${x}">${x}</option>`).join('')}</select></label>
    <label class="field"><span>Partner (if referred by one)</span><select name="partner_id"><option value="">None</option>${partners.map((p) => `<option value="${h(p.id)}">${h(p.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Referred by a customer</span><select name="referred_by"><option value="">None</option>${customers.map((c) => `<option value="${h(c.id)}">${h(c.name)}</option>`).join('')}</select></label>
  </div>
  <label class="field"><span>Kits to register now</span><span class="row"><label class="row small">Site <input name="site_kits" type="number" min="0" max="50" value="1" style="width:80px"></label><label class="row small">Vehicle <input name="vehicle_kits" type="number" min="0" max="50" value="1" style="width:80px"></label></span></label>
  <label class="field"><span>Notes</span><textarea name="notes"></textarea></label>
  <button class="btn" type="submit">Create account and register kits</button>
</form>` });
}

function customerDetail(c, s, events, cfg) {
  const kits = s.kits.map((k) => `<tr><td><a href="/admin/kits/${h(k.id)}">${kitLabel(k)}</a><br><span class="mono small muted">${h(k.code)}</span></td><td>${pill(k.state)}</td><td>${fmtDate(k.last_check_at)}</td><td>${fmtDate(k.next_refill_at)}</td><td class="small">${k.reasons.map(h).join('<br>')}</td></tr>`).join('');
  const aeds = s.aeds.map((a) => `<tr><td>${h(a.location || 'AED')}<br><span class="small muted">${h(a.make_model || '')} ${h(a.serial || '')}</span></td><td>${pill(a.state)}</td>
    <td><form method="post" action="/admin/aeds/${h(a.id)}" class="row"><input type="date" name="pads_expiry" value="${h(a.pads_expiry || '')}" aria-label="Pads expiry"><input type="date" name="battery_expiry" value="${h(a.battery_expiry || '')}" aria-label="Battery expiry"><button class="btn quiet" type="submit">Save</button></form></td></tr>`).join('');
  return layout({ title: c.name, cfg, nav: 'admin', body: `
<p class="eyebrow">${h(c.industry || 'Customer')}</p>
<div class="row" style="justify-content:space-between;align-items:flex-start"><div><h1>${h(c.name)}</h1><p class="small muted">${h(c.contact_name || '')} · ${h(c.phone || '')} · ${h(c.email || '')}<br>${h(c.address || '')}${c.abn ? ' · ABN ' + h(c.abn) : ''}</p></div>
<div class="row"><a class="btn secondary" href="/c/${h(c.token)}" target="_blank">Compliance record</a><a class="btn secondary" href="/c/${h(c.token)}/certificate" target="_blank">Certificate</a><a class="btn quiet" href="/admin/labels?customer=${h(c.id)}">Labels</a></div></div>
<div class="banner ${s.overall === 'compliant' && c.status === 'active' ? '' : (c.status === 'cancelled' ? 'bad' : 'warn')}"><p>Overall: <strong>${h(s.overall)}</strong> · Billing: <strong>${h(c.status || 'active')}</strong> · Plan ${h(c.plan_billing)}, started ${fmtDate(c.plan_start)}, renews ${fmtDate(c.plan_renewal)} · Source: ${h(c.source || 'direct')}${c.partner_id ? ' via partner' : ''}${c.referred_by ? ' (customer referral)' : ''}</p></div>
<h2>Kits (${s.kits.length})</h2>
<div class="tbl"><table><tr><th>Kit</th><th>State</th><th>Last check</th><th>Next refill</th><th>Why</th></tr>${kits || '<tr><td colspan="5" class="muted">No kits yet.</td></tr>'}</table></div>
<form method="post" action="/admin/customers/${h(c.id)}/kits" class="card" style="max-width:640px">
  <h3>Register a kit</h3>
  <div class="row">
    <label class="field"><span>Type</span><select name="type"><option value="site">Site kit</option><option value="vehicle">Vehicle kit</option></select></label>
    <label class="field" style="flex:1;min-width:200px"><span>Location or vehicle rego</span><input name="location" placeholder="Workshop, near roller door / Ute S123 ABC"></label>
  </div>
  <div class="row small" style="margin:10px 0">Modules: ${['burns', 'eye', 'remote', 'outdoor'].map((m) => `<label class="row"><input type="checkbox" name="modules" value="${m}" style="width:20px;min-height:0"> ${m}</label>`).join('')}</div>
  <button class="btn secondary" type="submit">Register kit</button>
</form>
<h2>Defibrillators (${s.aeds.length})</h2>
<div class="tbl"><table><tr><th>AED</th><th>State</th><th>Expiries</th></tr>${aeds || '<tr><td colspan="3" class="muted">None registered.</td></tr>'}</table></div>
<form method="post" action="/admin/customers/${h(c.id)}/aeds" class="card" style="max-width:640px">
  <h3>Register an AED</h3>
  <div class="grid2">
    <label class="field"><span>Location</span><input name="location"></label>
    <label class="field"><span>Make and model</span><input name="make_model" placeholder="HeartSine 350P"></label>
    <label class="field"><span>Serial</span><input name="serial"></label>
    <label class="field"><span>Pads expire</span><input type="date" name="pads_expiry"></label>
    <label class="field"><span>Battery expires</span><input type="date" name="battery_expiry"></label>
  </div>
  <button class="btn secondary" type="submit" style="margin-top:10px">Register AED</button>
</form>
<h2>Compliance calendar (${(s.obligations || []).length})</h2>
<p class="small muted">The add-on: every dated obligation this business has, with the reminder and the record. Test-and-tag, fire equipment, AED service, emergency plan review, inductions, chemical register, licences.</p>
<div class="tbl"><table><tr><th>Item</th><th>State</th><th>Last done</th><th>Next due</th><th>Provider</th><th></th></tr>${(s.obligations || []).map((o) => `<tr><td>${h(o.label)}${o.location ? '<br><span class="small muted">' + h(o.location) + '</span>' : ''}<br><span class="small muted">every ${o.interval_months} months</span></td><td>${pill(o.state)}</td><td>${fmtDate(o.last_done)}</td><td>${fmtDate(o.next_due)}</td><td class="small">${h(o.provider || '')}</td><td><form method="post" action="/admin/obligations/${h(o.id)}/done" class="row"><input type="date" name="date" style="min-height:36px;padding:4px 8px"><button class="btn quiet" type="submit">Done</button><button class="btn quiet" type="submit" formaction="/admin/obligations/${h(o.id)}/retire">Remove</button></form></td></tr>`).join('') || '<tr><td colspan="6" class="muted">None tracked. Add the items below; they appear on the record and the certificate.</td></tr>'}</table></div>
<form method="post" action="/admin/customers/${h(c.id)}/obligations" class="card" style="max-width:680px">
  <h3>Add a compliance item</h3>
  <div class="grid2">
    <label class="field"><span>Category</span><select name="category">${Object.entries(cfg.obligationCategories || {}).map(([k, v]) => `<option value="${h(k)}">${h(v.label)}</option>`).join('')}</select></label>
    <label class="field"><span>Label</span><input name="label" placeholder="Fire extinguishers x4, workshop"></label>
    <label class="field"><span>Location</span><input name="location"></label>
    <label class="field"><span>Every (months)</span><input name="interval_months" type="number" min="1" max="120" placeholder="default for category"></label>
    <label class="field"><span>Last done</span><input type="date" name="last_done"></label>
    <label class="field"><span>Provider (who does it)</span><input name="provider" placeholder="ABC Test & Tag"></label>
  </div>
  <button class="btn secondary" type="submit" style="margin-top:10px">Add item</button>
</form>
<h2>Account</h2>
<form method="post" action="/admin/customers/${h(c.id)}" class="stack">
  <div class="grid2">
    <label class="field"><span>Business name</span><input name="name" value="${h(c.name)}"></label>
    <label class="field"><span>ABN</span><input name="abn" value="${h(c.abn || '')}"></label>
    <label class="field"><span>Contact</span><input name="contact_name" value="${h(c.contact_name || '')}"></label>
    <label class="field"><span>Mobile</span><input name="phone" value="${h(c.phone || '')}"></label>
    <label class="field"><span>Email</span><input name="email" value="${h(c.email || '')}"></label>
    <label class="field"><span>Address</span><input name="address" value="${h(c.address || '')}"></label>
    <label class="field"><span>Plan billing</span><select name="plan_billing"><option value="annual" ${c.plan_billing === 'annual' ? 'selected' : ''}>Annual</option><option value="monthly" ${c.plan_billing === 'monthly' ? 'selected' : ''}>Monthly</option></select></label>
    <label class="field"><span>Plan renews</span><input type="date" name="plan_renewal" value="${h(c.plan_renewal || '')}"></label>
  </div>
  <label class="field"><span>Notes</span><textarea name="notes">${h(c.notes || '')}</textarea></label>
  <div class="row"><button class="btn secondary" type="submit">Save</button><button class="btn quiet" type="submit" formaction="/admin/customers/${h(c.id)}/renew">Mark plan renewed (+12 months)</button></div>
</form>
${c.status !== 'cancelled' ? `<form method="post" action="/admin/customers/${h(c.id)}/cancel" class="row" style="margin-top:12px"><label class="field" style="flex:1;min-width:220px"><span>Cancel plan: reason (required, one line)</span><input name="reason" required placeholder="e.g. closed the business / went with a visit service / cost"></label><button class="btn danger" type="submit" style="align-self:end">Cancel plan</button></form>` : `<p class="small muted">Cancelled ${fmtDate(c.cancelled_at)}: ${h(c.cancel_reason || 'no reason recorded')}</p>`}
<h2>History</h2>
<div class="tbl"><table><tr><th>When</th><th>Event</th><th>Detail</th></tr>${events.map((e) => { const p = JSON.parse(e.payload || '{}'); const det = p.items ? p.items.map((i) => `${i.qty} × ${i.name}`).join(', ') : (p.location || p.note || p.tracking || p.code || ''); return `<tr><td class="small mono">${fmtDateTime(e.created_at)}</td><td>${h(eventLabel(e.type))}</td><td class="small">${h(det)}</td></tr>`; }).join('')}</table></div>` });
}

function kitDetail(k, c, items, requests, events, state, cfg) {
  const rows = items.map((it) => `<tr><td>${h(it.name)}</td><td class="n">${it.qty_required}</td><td class="n"><input name="qty_${it.id}" type="number" min="0" value="${it.qty_present}" style="width:70px;min-height:36px;padding:4px 8px"></td><td><input name="exp_${it.id}" type="date" value="${h(it.expires_at || '')}" style="min-height:36px;padding:4px 8px"></td></tr>`).join('');
  return layout({ title: 'Kit ' + k.code, cfg, nav: 'admin', body: `
<p class="eyebrow"><a href="/admin/customers/${h(c.id)}">${h(c.name)}</a></p>
<div class="row" style="justify-content:space-between"><h1>${kitLabel(k)}</h1>${pill(state.state)}</div>
<p class="small muted mono">${h(k.code)} · installed ${fmtDate(k.installed_at)} · last refill ${fmtDate(k.last_refill_at)} · next refill ${fmtDate(k.next_refill_at)} · last check ${fmtDate(k.last_check_at)}${k.modules ? ' · modules: ' + h(k.modules) : ''}</p>
${state.reasons.length ? `<div class="banner warn"><p>${state.reasons.map(h).join('<br>')}</p></div>` : ''}
<div class="row">
  <a class="btn secondary" href="/admin/kits/${h(k.id)}/label" target="_blank">Print label</a>
  <a class="btn quiet" href="/k/${h(k.code)}" target="_blank">Open scan page</a>
  <form method="post" action="/admin/kits/${h(k.id)}/refill" class="row"><input name="tracking" placeholder="Tracking" style="min-width:140px"><button class="btn" type="submit">Scheduled refill pack shipped</button></form>
</div>
<form method="post" action="/admin/kits/${h(k.id)}" class="row" style="margin-top:14px"><label class="field" style="flex:1;min-width:220px"><span>Location / rego</span><input name="location" value="${h(k.location || '')}"></label><label class="field"><span>Status</span><select name="status"><option value="active" ${k.status === 'active' ? 'selected' : ''}>Active</option><option value="retired" ${k.status === 'retired' ? 'selected' : ''}>Retired</option></select></label><button class="btn quiet" type="submit" style="align-self:end">Save</button></form>
<h2>Contents</h2>
<form method="post" action="/admin/kits/${h(k.id)}/items">
<div class="tbl"><table><tr><th>Item</th><th class="n">Required</th><th class="n">Present</th><th>Expires</th></tr>${rows}</table></div>
<button class="btn secondary" type="submit">Save contents</button>
</form>
<h2>Refill requests</h2>
<div class="tbl"><table><tr><th>When</th><th>Kind</th><th>Items</th><th>Status</th></tr>${requests.map((q) => `<tr><td class="small mono">${fmtDateTime(q.created_at)}</td><td>${h(q.kind.replace('_', ' '))}</td><td class="small">${JSON.parse(q.items || '[]').map((i) => `${i.qty} × ${h(i.name)}`).join('<br>')}${q.note ? `<br><em>${h(q.note)}</em>` : ''}</td><td>${pill(q.status)}${q.status === 'open' ? `<form method="post" action="/admin/refills/${h(q.id)}/ship" class="row" style="margin-top:6px"><input name="tracking" placeholder="Tracking" style="min-width:120px"><button class="btn quiet" type="submit">Shipped</button></form>` : (q.tracking ? `<br><span class="small mono">${h(q.tracking)}</span>` : '')}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">None.</td></tr>'}</table></div>
<h2>History</h2>
<div class="tbl"><table><tr><th>When</th><th>Event</th><th>Detail</th></tr>${events.map((e) => { const p = JSON.parse(e.payload || '{}'); const det = p.items ? p.items.map((i) => `${i.qty} × ${i.name}`).join(', ') : (p.note || p.tracking || p.reporter || ''); return `<tr><td class="small mono">${fmtDateTime(e.created_at)}</td><td>${h(eventLabel(e.type))}</td><td class="small">${h(det)}</td></tr>`; }).join('')}</table></div>` });
}

function labels(kits, cfg) {
  return layout({ title: 'Labels', cfg, nav: 'admin', body: `
<div class="row noprint" style="justify-content:space-between"><h1>Labels (${kits.length})</h1><button class="btn" onclick="print()">Print</button></div>
<p class="small muted noprint">Print on A4 polyester label stock (e.g. Avery L7165-style 8 per sheet, or 2-per-row on a plain sheet and cut). Each label is 96 px square QR plus text; the QR links to the kit's scan page.</p>
<div class="labels">${kits.map((k) => `<div class="label">${k.svg}<div><div class="t">${h(cfg.brand)}</div><div class="s"><strong>Used something? Scan me.</strong><br>${k.type === 'vehicle' ? 'Vehicle kit' : 'Site kit'}${k.location ? ' · ' + h(k.location) : ''}<br>${h(k.customer_name)}</div><div class="c">${h(k.code)} · ${h(cfg.phone)}</div></div></div>`).join('') || '<p class="muted">No kits to print.</p>'}</div>` });
}

// ---------------------------------------------------------------- partners
const PARTNER_TYPES = ['whs_consultant', 'trainer', 'bookkeeper', 'accountant', 'association', 'broker', 'other'];
function partnersList(list, cfg) {
  return layout({ title: 'Partners', cfg, nav: 'admin', body: `
<div class="row" style="justify-content:space-between"><h1>Partners (${list.length})</h1></div>
<div class="tbl"><table><tr><th>Partner</th><th>Type</th><th class="n">Referred</th><th class="n">Owed</th><th class="n">Paid</th><th>Portal</th></tr>
${list.map((p) => `<tr><td><a href="/admin/partners/${h(p.id)}">${h(p.name)}</a><br><span class="small muted">${h(p.contact_name || '')} ${h(p.phone || '')}</span></td><td>${h(p.type)}</td><td class="n">${p.referred}</td><td class="n">${p.owed.toFixed(2)}</td><td class="n">${p.paid.toFixed(2)}</td><td><a class="small" href="/p/${h(p.token)}" target="_blank">open</a></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No partners yet.</td></tr>'}
</table></div>
<form method="post" action="/admin/partners" class="card" style="max-width:640px">
  <h3>Add a partner</h3>
  <div class="grid2">
    <label class="field"><span class="req">Name (business or person)</span><input name="name" required></label>
    <label class="field"><span>Type</span><select name="type">${PARTNER_TYPES.map((t) => `<option>${t}</option>`).join('')}</select></label>
    <label class="field"><span>Contact</span><input name="contact_name"></label>
    <label class="field"><span>Email</span><input name="email" type="email"></label>
    <label class="field"><span>Phone</span><input name="phone" type="tel"></label>
    <label class="field"><span>Fee share of first-year plan revenue</span><input name="fee_share" value="0.15"></label>
  </div>
  <button class="btn secondary" type="submit" style="margin-top:10px">Add partner</button>
</form>` });
}
function partnerDetail(p, customers, payouts, cfg) {
  return layout({ title: p.name, cfg, nav: 'admin', body: `
<p class="eyebrow">${h(p.type)}</p>
<div class="row" style="justify-content:space-between"><h1>${h(p.name)}</h1><a class="btn secondary" href="/p/${h(p.token)}" target="_blank">Partner portal</a></div>
<p class="small muted">${h(p.contact_name || '')} · ${h(p.email || '')} · ${h(p.phone || '')} · fee share ${(p.fee_share * 100).toFixed(0)}%</p>
<div class="banner"><p>Referral link for this partner: <span class="mono">${h(cfg.baseUrl)}/check?ref=${h(p.token)}</span><br>Portal: <span class="mono">${h(cfg.baseUrl)}/p/${h(p.token)}</span></p></div>
<h2>Referred accounts (${customers.length})</h2>
<div class="tbl"><table><tr><th>Business</th><th>Opened</th><th>Billing</th><th>Renews</th></tr>${customers.map((c) => `<tr><td><a href="/admin/customers/${h(c.id)}">${h(c.name)}</a></td><td>${fmtDate(c.created_at)}</td><td>${h(c.status || 'active')}</td><td>${fmtDate(c.plan_renewal)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">None yet.</td></tr>'}</table></div>
<h2>Payouts</h2>
<div class="tbl"><table><tr><th>Account</th><th class="n">Amount</th><th>Status</th><th>When</th><th></th></tr>${payouts.map((x) => `<tr><td>${h(x.customer_name)}</td><td class="n">${x.amount.toFixed(2)}</td><td>${pill(x.status === 'paid' ? 'compliant' : 'due')} ${h(x.status)}</td><td class="small mono">${fmtDate(x.paid_at || x.created_at)}</td><td>${x.status === 'owed' ? `<form method="post" action="/admin/payouts/${h(x.id)}/paid"><button class="btn quiet" type="submit">Mark paid</button></form>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Nothing owed.</td></tr>'}</table></div>` });
}
function partnerPortal(p, rows, payouts, cfg) {
  const owed = payouts.filter((x) => x.status === 'owed').reduce((a, x) => a + x.amount, 0);
  const paid = payouts.filter((x) => x.status === 'paid').reduce((a, x) => a + x.amount, 0);
  return layout({ title: 'Partner view', cfg, nav: 'none', body: `
<p class="eyebrow">Partner view · ${h(p.name)}</p>
<h1>Your referred clients</h1>
<div class="tiles" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);margin:14px 0 22px">
  <div class="tile" style="background:var(--surface);padding:14px 16px"><div class="mono" style="font-size:26px;font-weight:700">${rows.length}</div><div class="small muted">clients referred</div></div>
  <div class="tile" style="background:var(--surface);padding:14px 16px"><div class="mono" style="font-size:26px;font-weight:700">${rows.filter((r) => r.overall === 'compliant').length}</div><div class="small muted">fully compliant today</div></div>
  <div class="tile" style="background:var(--surface);padding:14px 16px"><div class="mono" style="font-size:26px;font-weight:700">A$${owed.toFixed(0)}</div><div class="small muted">owed to you</div></div>
  <div class="tile" style="background:var(--surface);padding:14px 16px"><div class="mono" style="font-size:26px;font-weight:700">A$${paid.toFixed(0)}</div><div class="small muted">paid to date</div></div>
</div>
<div class="tbl"><table><tr><th>Client</th><th>Kits</th><th>Compliance</th><th>Plan</th><th>Renews</th></tr>${rows.map((r) => `<tr><td>${h(r.name)}</td><td class="n">${r.kits}</td><td>${pill(r.overall)}</td><td>${h(r.status || 'active')}</td><td>${fmtDate(r.plan_renewal)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No referred clients yet. Send the link below.</td></tr>'}</table></div>
<div class="banner"><p>Your referral link: <span class="mono">${h(cfg.baseUrl)}/check?ref=${h(p.token)}</span><br>Anyone who completes the 90-second check from this link is attributed to you. You earn ${(p.fee_share * 100).toFixed(0)}% of their first year's plan when they sign up.</p></div>
<p class="small muted">Business names and compliance states only; client contact details are not shown here. Questions: ${h(cfg.phone)}.</p>` });
}

// ---------------------------------------------------------------- self-check
function checkForm(questions, cfg, ref = '') {
  return layout({ title: 'Compliance check', cfg, body: `
<div class="narrow">
  <p class="eyebrow">Free · 90 seconds · no obligation</p>
  <h1>Is your first-aid setup compliant?</h1>
  <p class="muted">Eight questions a WHS inspector or a head contractor would ask. Answer honestly; the result shows the gaps and what fixes each.</p>
  <form method="post" action="/check" class="stack">
    <input type="hidden" name="ref" value="${h(ref)}">
    ${questions.map((q, i) => `<fieldset class="card" style="border:1px solid var(--line);margin:0"><legend class="small muted">${i + 1} of ${questions.length}</legend><p style="font-weight:600;margin:0 0 8px">${h(q.q)}</p><div class="row"><label class="row"><input type="radio" name="${q.id}" value="yes" required style="width:20px;min-height:0"> Yes</label><label class="row"><input type="radio" name="${q.id}" value="no" style="width:20px;min-height:0"> No</label><label class="row"><input type="radio" name="${q.id}" value="unsure" style="width:20px;min-height:0"> Not sure</label></div></fieldset>`).join('')}
    <h3>Where should we send the result?</h3>
    <label class="field"><span class="req">Business name</span><input name="business" required></label>
    <label class="field"><span>Your name</span><input name="contact_name"></label>
    <label class="field"><span class="req">Mobile</span><input name="phone" type="tel" required></label>
    <label class="field"><span>Email</span><input name="email" type="email"></label>
    <label class="field"><span>Industry</span><select name="industry">${INDUSTRIES.map((i) => `<option>${h(i)}</option>`).join('')}</select></label>
    <button class="btn block" type="submit">Show my result</button>
    <p class="small muted">This is a general self-check based on the Safe Work Australia model Code of Practice, not legal advice. A passing score does not certify compliance; your risk assessment and first-aider training remain your responsibility.</p>
  </form>
</div>` });
}
function checkResult(result, lead, cfg) {
  const cta = cfg.checkoutUrl ? `<a class="btn" href="${h(cfg.checkoutUrl)}">Get compliant this week</a>` : `<a class="btn" href="tel:${h(cfg.phone)}">Call ${h(cfg.phone)}</a>`;
  return layout({ title: 'Your result', cfg, body: `
<div class="narrow">
  <p class="eyebrow">${h(lead.business || 'Your business')}</p>
  <h1>${result.passed} of ${result.total}</h1>
  <p class="muted">${result.passed === result.total ? 'Everything an inspector would ask about is in place. Keep it that way: the hard part is staying there.' : `${result.gaps.length} gap${result.gaps.length === 1 ? '' : 's'} an inspector, a head contractor or your insurer would find. Each one has a fix.`}</p>
  ${result.gaps.map((g) => `<div class="card" style="margin-bottom:10px"><h3 style="margin:0 0 6px;font-size:15px">${h(g.q)}</h3><p class="small" style="margin:0 0 6px">${h(g.gap)}</p><p class="small" style="margin:0"><strong>Fix:</strong> ${h(g.fix)}</p></div>`).join('')}
  <div class="banner" style="margin-top:18px"><p><strong>We keep kits compliant automatically</strong>: site and vehicle kits with QR labels, refills the same day something is used, scheduled packs before expiry, and a certificate you can forward. Site kit A$119, vehicle kit A$59, plan from A$84 a year per kit.</p></div>
  <div class="row">${cta}<a class="btn secondary" href="/#pricing">See pricing</a></div>
  <p class="small muted" style="margin-top:16px">We'll text this result to ${h(lead.phone || 'you')}. No spam, and every message has an unsubscribe. General information only, not legal advice.</p>
</div>` });
}
function leadsList(leads, cfg) {
  return layout({ title: 'Leads', cfg, nav: 'admin', body: `
<h1>Leads (${leads.length})</h1>
<div class="tbl"><table><tr><th>When</th><th>Business</th><th>Contact</th><th class="n">Score</th><th>Source</th><th>Status</th></tr>
${leads.map((l) => `<tr><td class="small mono">${fmtDateTime(l.created_at)}</td><td>${h(l.business || '')}<br><span class="small muted">${h(l.industry || '')}</span></td><td class="small">${h(l.contact_name || '')}<br>${h(l.phone || '')} ${h(l.email || '')}</td><td class="n">${l.score ?? ''}/8</td><td>${h(l.source)}${l.partner_name ? ' · ' + h(l.partner_name) : ''}</td><td><form method="post" action="/admin/leads/${h(l.id)}" class="row"><select name="status" style="min-height:36px;padding:4px 8px;width:auto">${['new', 'contacted', 'won', 'lost'].map((x) => `<option ${l.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select><button class="btn quiet" type="submit">Save</button></form></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No leads yet. Put /check on the landing page and in the ads.</td></tr>'}
</table></div>` });
}

// ---------------------------------------------------------------- metrics
function metrics(m, cfg) {
  const pct = (v) => v === null || v === undefined ? '—' : (v * 100).toFixed(0) + '%';
  const tile = (v, l) => `<div class="tile" style="background:var(--surface);padding:14px 16px"><div class="mono" style="font-size:26px;font-weight:700">${v}</div><div class="small muted">${l}</div></div>`;
  return layout({ title: 'Metrics', cfg, nav: 'admin', body: `
<p class="eyebrow">${fmtDate(m.on)}</p>
<h1>Retention and acquisition</h1>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);margin:14px 0 22px">
  ${tile(m.active, 'active accounts')}
  ${tile(pct(m.activation), `30-day activation (${m.activated} of ${m.eligible} eligible) · target 70%`)}
  ${tile(pct(m.churn30), `logo churn, last 30 days (${m.cancelled30} of ${m.activeAtStart}) · stop rule 4%`)}
  ${tile(pct(m.renewal), `renewal rate, due in last 90 days (${m.renewed} of ${m.dueRecently}) · target 85%`)}
  ${tile(m.kitsPerAccount.toFixed(1), `kits per account (${m.vehiclePerAccount.toFixed(1)} vehicle)`)}
  ${tile(pct(m.annualShare), 'annual billing share · target 70%+')}
  ${tile(m.pastDue, 'past due (dunning running)')}
  ${tile(m.stale, 'open requests older than 2 business days · target 0')}
  ${tile(m.leads, 'self-check leads')}
  ${tile(pct(m.calendarTake), `compliance calendar take-rate (${m.withCalendar} accounts) · target 35%`)}
</div>
<h2>Accounts by source</h2>
<div class="tbl"><table><tr><th>Source</th><th class="n">All time</th><th class="n">Last 30 days</th></tr>${Object.keys(m.bySource).sort().map((k) => `<tr><td>${h(k)}</td><td class="n">${m.bySource[k]}</td><td class="n">${m.bySource30[k] || 0}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">No accounts yet.</td></tr>'}</table></div>
<h2>Cohorts by signup month</h2>
<div class="tbl"><table><tr><th>Month</th><th class="n">Signed</th><th class="n">Still active</th><th class="n">Retention</th><th class="n">Activated in 30 days</th><th class="n">Kits per account</th></tr>${m.cohorts.map((c) => `<tr><td class="mono">${h(c.month)}</td><td class="n">${c.signed}</td><td class="n">${c.active}</td><td class="n">${(c.active / c.signed * 100).toFixed(0)}%</td><td class="n">${c.eligible ? (c.activated / c.eligible * 100).toFixed(0) + '%' : '—'}</td><td class="n">${(c.kits / c.signed).toFixed(1)}</td></tr>`).join('')}</table></div>
<h2>Cancellation reasons</h2>
<div class="tbl"><table><tr><th>Reason</th><th class="n">Count</th></tr>${Object.entries(m.reasons).sort((a, b) => b[1] - a[1]).map(([r, n]) => `<tr><td>${h(r)}</td><td class="n">${n}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">No cancellations.</td></tr>'}</table></div>` });
}

module.exports = { h, layout, landing, scanPage, scanDone, record, certificate, dashboard, customers, customerNew, customerDetail, kitDetail, labels,
  partnersList, partnerDetail, partnerPortal, checkForm, checkResult, leadsList, metrics };
