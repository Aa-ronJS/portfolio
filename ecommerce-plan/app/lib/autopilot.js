'use strict';
// The autopilot. Every recurring thing the business does, as a job that runs
// daily, is idempotent, and either acts on its own or leaves one row in the
// approval queue. The policy at the top says which.
//
//   node scripts/autopilot.js          # run everything for today (cron, 7am Adelaide)
//   POST /admin/autopilot/run          # same, from the admin page
//
// Design rules:
//   - Money out, promises to customers and anything irreversible go through
//     the queue unless under the caps below. Everything else just happens.
//   - A job never sends the same message twice: the outbox is the memory.
//   - Nothing here needs a phone. Every customer touch is an email with a
//     link to a page that already exists.
const db = require('./db');
const mail = require('./mail');
const fulfil = require('./fulfil');
const sched = require('./schedule');
const metrics = require('./metrics');

const POLICY = {
  auto_po_cap: parseFloat(process.env.AUTO_PO_CAP || '1500'),        // purchase orders under this go straight to the supplier
  auto_payout_cap: parseFloat(process.env.AUTO_PAYOUT_CAP || '0'),   // partner payouts under this are auto-marked paid (only if Stripe Connect pays them); 0 = always ask
  dunning_days: [1, 7, 14],                                            // emails after a failed payment
  cancel_after_past_due_days: parseInt(process.env.CANCEL_AFTER_DAYS || '21', 10),
  activation_nudge_days: [10, 30],                                     // no scan or check since signup
  onboarding_reminder_days: 2,                                         // paid but kits not named
  lead_sequence_days: [0, 3, 10],                                      // self-check follow-ups
  lead_lost_after_days: 30,
  winback_after_days: 60,
  ads: { budget_pm: parseFloat(process.env.ADS_BUDGET_PM || '600'), max_pm: parseFloat(process.env.ADS_MAX_PM || '7000'), cac_target: 150, cac_stop: 220, step_up: 0.15, step_down: 0.25 },
  stop_rules: { churn30: 0.04, activation: 0.70, stale_requests: 0 },
};

const daysSince = (iso, on) => sched.daysBetween(iso.slice(0, 10), on);
const brand = () => process.env.BRAND || 'Kit Register';
const base = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const sign = () => `\n\n${brand()}\n${process.env.CONTACT_EMAIL || ''}`.trimEnd();

async function once(kind, c, subject, text, extra = {}) {
  if (!c.email) return null;
  if (db.mailSentCount(kind, c.id, extra.since || '')) return null;
  return mail.send({ to: c.email, subject, text: text + sign(), kind, customer_id: c.id, ...extra });
}

// ---- jobs ------------------------------------------------------------------

// 30 and 7 days before an annual renewal: the certificate, the year's activity, what happens next.
async function renewals(on) {
  let sent = 0;
  for (const c of db.listCustomersByStatus('active')) {
    if (!c.plan_renewal || c.plan_billing !== 'annual') continue;
    const d = sched.daysBetween(on, c.plan_renewal);
    const cycle = c.plan_renewal; // one notice per renewal date
    const events = db.listEvents(c.id, 500);
    const shipped = events.filter((e) => e.type === 'refill_shipped' || e.type === 'scheduled_refill_shipped').length;
    const checks = events.filter((e) => e.type === 'check_ok' || e.type === 'after_use_reported').length;
    const summary = `This year on your plan: ${shipped} refill${shipped === 1 ? '' : 's'} shipped, ${checks} kit check${checks === 1 ? '' : 's'} recorded, certificate current.`;
    if (d <= 30 && d > 7) {
      const r = await once('renewal_30:' + cycle, c, `Your ${brand()} plan renews on ${c.plan_renewal}`,
        `Hi ${c.contact_name || ''},\n\nYour replenishment plan renews automatically on ${c.plan_renewal} and your card will be charged then. Nothing to do unless you want to change something.\n\n${summary}\n\nYour compliance certificate: ${base()}/c/${c.token}/certificate\nAdd or remove kits, change billing or cancel: reply to this email.`);
      if (r) sent++;
    } else if (d <= 7 && d >= 0) {
      const r = await once('renewal_7:' + cycle, c, `Renewing in ${d} day${d === 1 ? '' : 's'}: your first-aid compliance plan`,
        `Hi ${c.contact_name || ''},\n\nA reminder that your plan renews on ${c.plan_renewal}. ${summary}\n\nCertificate: ${base()}/c/${c.token}/certificate`);
      if (r) sent++;
    }
  }
  return { sent };
}

// Failed payment: emails at day 1, 7, 14; cancel at day 21 (Stripe's own retries run alongside).
async function dunning(on) {
  let sent = 0, cancelled = 0;
  for (const c of db.listCustomersByStatus('past_due')) {
    const failed = db.eventsOfType(c.id, 'payment_failed')[0];
    if (!failed) continue;
    const d = daysSince(failed.created_at, on);
    for (const day of POLICY.dunning_days) {
      if (d < day) continue;
      const r = await once(`dunning_${day}:${failed.id}`, c, day === 1 ? `Payment for your ${brand()} plan did not go through` : `Your first-aid kit plan is on hold`,
        `Hi ${c.contact_name || ''},\n\nThe renewal payment for your replenishment plan failed on ${failed.created_at.slice(0, 10)}. We retry automatically; if the card has expired or changed, update it here: ${base()}/billing?c=${c.token}\n\nUntil it goes through, refills are paused and your compliance record shows "renewal payment pending" rather than lapsed.${d >= 14 ? `\n\nIf we have not received payment by ${db.addDays(failed.created_at.slice(0, 10), POLICY.cancel_after_past_due_days)} the plan will close and the kits stay yours.` : ''}`);
      if (r) sent++;
    }
    if (d >= POLICY.cancel_after_past_due_days) {
      db.cancelCustomer(c.id, 'payment not recovered after ' + POLICY.cancel_after_past_due_days + ' days');
      await once(`dunning_cancelled:${failed.id}`, c, `Your ${brand()} plan has closed`, `Hi ${c.contact_name || ''},\n\nWe could not collect payment, so the plan has closed. The kits are yours to keep. Restart any time: ${base()}/buy`);
      cancelled++;
    }
  }
  return { sent, cancelled };
}

// Paid but has not named their kits; then no scan or check in the first weeks.
async function activation(on) {
  let sent = 0;
  for (const c of db.listCustomersByStatus('active')) {
    const age = daysSince(c.created_at, on);
    if (!c.onboarded_at && age >= POLICY.onboarding_reminder_days) {
      const r = await once('onboarding_reminder', c, 'Two minutes to finish setting up your kits',
        `Hi ${c.contact_name || ''},\n\nYour kits are on their way. Name each kit's location or vehicle rego and your compliance certificate is complete: ${base()}/c/${c.token}/welcome`);
      if (r) sent++;
    }
    const used = db.listEvents(c.id, 500).some((e) => ['check_ok', 'after_use_reported', 'problem_reported'].includes(e.type));
    if (used) continue;
    const kits = db.listKits(c.id).filter((k) => k.status === 'active');
    if (!kits.length) continue;
    for (const day of POLICY.activation_nudge_days) {
      if (age < day) continue;
      const links = kits.map((k) => `  ${k.type === 'vehicle' ? 'Vehicle' : 'Site'} · ${k.location || k.code}: ${base()}/k/${k.code}`).join('\n');
      const r = await once(`activation_${day}`, c, day === POLICY.activation_nudge_days[0] ? 'Try the scan once, then forget about it' : 'Your kits have not been checked yet',
        `Hi ${c.contact_name || ''},\n\nThe whole point of the plan is that nobody has to remember the kits. Scan the label on any lid (or tap a link below), press "Nothing used, checked and complete", and that check goes on your certificate.\n\n${links}\n\nRecord: ${base()}/c/${c.token}`);
      if (r) sent++;
    }
  }
  return { sent };
}

// Self-check leads: result email with gaps, then two follow-ups, then lost.
async function leads(on) {
  let sent = 0, lost = 0;
  const check = require('./check');
  for (const l of db.listLeads()) {
    if (l.status === 'won' || l.status === 'lost' || !l.email) continue;
    const d = daysSince(l.created_at, on);
    if (d >= POLICY.lead_lost_after_days) { db.setLeadStatus(l.id, 'lost'); lost++; continue; }
    let answers = {}; try { answers = JSON.parse(l.answers || '{}'); } catch { /* ignore */ }
    const result = check.score(answers);
    const gaps = result.gaps.map((g) => `  - ${g.gap}: ${g.fix}`).join('\n');
    const partner = l.partner_id ? db.getPartner(l.partner_id) : null;
    const buy = `${base()}/buy${partner ? '?ref=' + partner.token : ''}`;
    for (const day of POLICY.lead_sequence_days) {
      if (d < day) continue;
      const kind = `lead_${day}`;
      if (db.db.prepare('SELECT 1 FROM outbox WHERE kind = ? AND lead_id = ?').get(kind, l.id)) continue;
      const subject = day === 0 ? `Your first-aid compliance check: ${result.passed} of ${result.total}` : day === 3 ? 'The three things inspectors ask for first' : 'Last note on your first-aid check';
      const text = day === 0
        ? `Hi ${l.contact_name || ''},\n\nYou scored ${result.passed} of ${result.total}. The gaps:\n${gaps || '  none'}\n\nThe fastest fix for most of them is a kit plan with a compliance certificate: ${buy}\n\nThis is a self-assessment, not legal advice; the duty to assess first-aid needs stays with the business.`
        : day === 3
          ? `Hi ${l.contact_name || ''},\n\nWhen a head contractor, insurer or inspector asks about first aid, they want three things: a stocked kit at each workplace and in each work vehicle, a record of when it was last checked, and who the trained first aider is. The plan gives you the first two on one page, from ${buy}`
          : `Hi ${l.contact_name || ''},\n\nNo more emails after this one. If you would rather sort the kits yourself, the Safe Work Australia model Code of Practice lists what a kit needs. If you would rather not think about it again: ${buy}`;
      const r = await mail.send({ to: l.email, subject, text: text + sign(), kind, lead_id: l.id });
      if (r) sent++;
      if (day === 0 && l.status === 'new') db.setLeadStatus(l.id, 'contacted');
    }
  }
  return { sent, lost };
}

// Exit survey once; win-back after 60 days.
async function cancellations(on) {
  let sent = 0;
  for (const c of db.listCustomersByStatus('cancelled')) {
    if (!c.cancelled_at) continue;
    const d = daysSince(c.cancelled_at, on);
    let r = await once('exit_survey', c, 'One question about why you left', `Hi ${c.contact_name || ''},\n\nYour plan has closed and the kits are yours. One question, reply with a number:\n\n1 too expensive  2 did not use it  3 closed or changed the business  4 went with someone else  5 something else (tell me)\n\nIt changes what we build next.`);
    if (r) sent++;
    if (d >= POLICY.winback_after_days) {
      r = await once('winback', c, 'Are the kits still stocked?', `Hi ${c.contact_name || ''},\n\nIt has been two months. If anything has been used since, the kits are probably short, and the next audit will find it before you do. Restart the plan with a free scheduled refill pack for every kit: ${base()}/buy?promo=RESTART`);
      if (r) sent++;
    }
  }
  return { sent };
}

// Shipments: create for everything due, hand to the 3PL, and when there is no 3PL, leave them on the due list.
async function shipments(on) {
  const created = fulfil.planShipments(on);
  let dispatched = 0, failed = 0;
  for (const s of db.listShipments('pending')) {
    const r = await fulfil.dispatch(s, base());
    if (r.status === 'sent_to_3pl') dispatched++;
    if (r.status === 'failed') failed++;
  }
  // tell the customer a refill is on its way (once per shipment)
  let notified = 0;
  for (const s of db.listShipments('shipped', 500)) {
    if (s.kind === 'kits' && !JSON.parse(s.lines).length) continue;
    const c = db.getCustomer(s.customer_id);
    if (!c || !c.email) continue;
    if (db.db.prepare("SELECT 1 FROM outbox WHERE kind = ? AND customer_id = ?").get('shipped:' + s.id, c.id)) continue;
    const what = s.kind === 'kits' ? 'Your kits have shipped' : s.kind === 'aed' ? 'Your AED consumables have shipped' : 'Your refill has shipped';
    await mail.send({ to: c.email, subject: what, text: `Hi ${c.contact_name || ''},\n\n${what}${s.tracking ? ' (tracking ' + s.tracking + ')' : ''}. ${s.kind === 'kits' ? 'Each kit has a QR label on the lid; scanning it is how you report anything used. ' : 'Put the contents in the kit and it is compliant again on your record. '}\n\nRecord: ${base()}/c/${c.token}` + sign(), kind: 'shipped:' + s.id, customer_id: c.id });
    notified++;
  }
  return { created: created.length, dispatched, failed, notified };
}

// Stock: raise a purchase order at the reorder point; send it if under the cap, otherwise queue it.
async function stock(on) {
  fulfil.seedStock();
  const plan = fulfil.planPurchaseOrders();
  if (!plan) return { raised: 0 };
  if (plan.total <= POLICY.auto_po_cap) {
    const po = db.createPurchaseOrder({ ...plan, status: 'sent' });
    if (plan.supplier_email) await mail.send({ to: plan.supplier_email, subject: `Purchase order ${po.id.slice(0, 8)} from ${brand()}`, text: poText(po), kind: 'po:' + po.id });
    return { raised: 1, sent: true, total: plan.total };
  }
  const a = db.createAction({ type: 'purchase_order', title: `Purchase order A$${plan.total.toFixed(2)} to ${plan.supplier}`, detail: plan.lines.map((l) => `${l.qty} × ${l.name}`).join('; '), payload: plan });
  db.createPurchaseOrder({ ...plan, status: 'draft', action_id: a.id });
  return { raised: 1, sent: false, total: plan.total, queued: a.id };
}
const poText = (po) => `Please supply, to the address on the account:\n\n${JSON.parse(po.lines).map((l) => `  ${l.qty} × ${l.name} (${l.sku})`).join('\n')}\n\nReference ${po.id.slice(0, 8)}. Reply to this email with the invoice and ETA.` + sign();

// Partners: monthly statement; payouts go to the queue (a bank transfer is a human tap until Stripe Connect is on).
async function partners(on) {
  if (on.slice(8, 10) !== '01' && !process.env.AUTOPILOT_FORCE_MONTHLY) return { skipped: 'not the 1st' };
  const month = on.slice(0, 7);
  let statements = 0, queued = 0;
  const owedBy = {};
  for (const x of db.listAllOpenPayouts()) { (owedBy[x.partner_id] = owedBy[x.partner_id] || { partner: x, rows: [], total: 0 }).rows.push(x); owedBy[x.partner_id].total += x.amount; }
  for (const p of db.listPartners()) {
    const o = owedBy[p.id];
    if (p.email && !db.db.prepare('SELECT 1 FROM outbox WHERE kind = ? AND partner_id = ?').get('statement:' + month, p.id)) {
      await mail.send({ to: p.email, subject: `${brand()} partner statement, ${month}`, text: `Hi ${p.contact_name || p.name},\n\nReferred accounts: ${p.referred}. Owed to you: A$${(o ? o.total : 0).toFixed(2)}. Paid to date: A$${p.paid.toFixed(2)}.\n\nYour portal: ${base()}/p/${p.token}\nYour referral link: ${base()}/check?ref=${p.token}` + sign(), kind: 'statement:' + month, partner_id: p.id });
      statements++;
    }
    if (o && o.total > 0 && !db.pendingActionExists('partner_payout', p.id)) {
      const payload = { partner_id: p.id, payout_ids: o.rows.map((r) => r.id), total: o.total };
      if (POLICY.auto_payout_cap > 0 && o.total <= POLICY.auto_payout_cap) { for (const r of o.rows) db.markPayoutPaid(r.id); }
      else { db.createAction({ type: 'partner_payout', title: `Pay A$${o.total.toFixed(2)} to ${p.name}`, detail: `${o.rows.length} referred account${o.rows.length === 1 ? '' : 's'}; bank transfer, then approve here to mark paid`, payload }); queued++; }
    }
  }
  return { statements, queued };
}

// Monday: read the numbers, apply the rules, write the one email you get.
async function review(on) {
  const dow = new Date(on + 'T00:00:00Z').getUTCDay();
  if (dow !== 1 && !process.env.AUTOPILOT_FORCE_WEEKLY) return { skipped: 'not Monday' };
  if (db.jobRanOn('review', on)) return { skipped: 'already ran' };
  const m = metrics.compute();
  const flags = [];
  if (m.churn30 !== null && m.churn30 > POLICY.stop_rules.churn30) flags.push(`Logo churn ${(m.churn30 * 100).toFixed(1)}% in 30 days is over the ${POLICY.stop_rules.churn30 * 100}% stop rule`);
  if (m.activation !== null && m.activation < POLICY.stop_rules.activation) flags.push(`30-day activation ${(m.activation * 100).toFixed(0)}% is under the ${POLICY.stop_rules.activation * 100}% target`);
  if (m.stale > POLICY.stop_rules.stale_requests) flags.push(`${m.stale} refill request${m.stale === 1 ? '' : 's'} older than two business days`);
  if (m.pastDue) flags.push(`${m.pastDue} account${m.pastDue === 1 ? '' : 's'} past due`);
  const failedShip = db.listShipments('failed').length;
  if (failedShip) flags.push(`${failedShip} shipment${failedShip === 1 ? '' : 's'} failed to reach the 3PL`);
  const queuedMail = db.db.prepare("SELECT COUNT(*) AS n FROM outbox WHERE status IN ('queued','failed')").get().n;
  if (queuedMail) flags.push(`${queuedMail} email${queuedMail === 1 ? '' : 's'} not delivered (mail provider not configured or failing)`);
  // ads budget rule: paid accounts in the last 30 days against spend
  const paid30 = m.bySource30.paid || 0;
  const spend = POLICY.ads.budget_pm;
  const cac = paid30 ? spend / paid30 : null;
  let ads = null;
  if (cac !== null && cac <= POLICY.ads.cac_target && spend < POLICY.ads.max_pm) ads = { to: Math.min(POLICY.ads.max_pm, Math.round(spend * (1 + POLICY.ads.step_up))), why: `CAC A$${cac.toFixed(0)} is under the A$${POLICY.ads.cac_target} target` };
  else if (cac !== null && cac > POLICY.ads.cac_stop) ads = { to: Math.round(spend * (1 - POLICY.ads.step_down)), why: `CAC A$${cac.toFixed(0)} is over the A$${POLICY.ads.cac_stop} stop level` };
  else if (cac === null && spend > 0 && m.active > 0) ads = { to: Math.round(spend * (1 - POLICY.ads.step_down)), why: 'no paid accounts in 30 days' };
  if (ads && !db.pendingActionExists('ads_budget', 'to')) db.createAction({ type: 'ads_budget', title: `Google Ads budget A$${spend} → A$${ads.to} a month`, detail: ads.why, payload: { from: spend, to: ads.to, cac, paid30 } });
  const pending = db.listActions('pending');
  const lines = [
    `Week of ${on}`,
    '',
    `Active accounts ${m.active} · new in 30 days ${Object.values(m.bySource30).reduce((a, b) => a + b, 0)} · past due ${m.pastDue}`,
    `30-day activation ${m.activation === null ? 'n/a' : (m.activation * 100).toFixed(0) + '%'} · logo churn ${m.churn30 === null ? 'n/a' : (m.churn30 * 100).toFixed(1) + '%'} · renewal rate ${m.renewal === null ? 'n/a' : (m.renewal * 100).toFixed(0) + '%'} · annual share ${(m.annualShare * 100).toFixed(0)}%`,
    `Paid accounts in 30 days ${paid30} at A$${spend} spend${cac !== null ? ' → CAC A$' + cac.toFixed(0) : ''}`,
    '',
    flags.length ? 'Needs a look:\n' + flags.map((f) => '  - ' + f).join('\n') : 'Nothing is outside its rule.',
    '',
    pending.length ? `Waiting for your tap (${pending.length}): ${base()}/admin/autopilot\n` + pending.map((a) => '  - ' + a.title).join('\n') : 'Nothing waiting for approval.',
    '',
    `Metrics: ${base()}/admin/metrics`,
  ];
  const text = lines.join('\n');
  const to = process.env.FOUNDER_EMAIL || process.env.CONTACT_EMAIL;
  if (to) await mail.send({ to, subject: `${brand()} weekly: ${m.active} active, ${flags.length} flag${flags.length === 1 ? '' : 's'}, ${pending.length} to approve`, text, kind: 'digest:' + on });
  db.recordJobRun('review', on, { flags, ads, pending: pending.length });
  return { flags: flags.length, ads: !!ads, pending: pending.length, text };
}

// ---- the queue: approving an action executes it -------------------------------
async function execute(action) {
  const p = JSON.parse(action.payload || '{}');
  switch (action.type) {
    case 'send_email': {
      const r = await mail.send({ to: p.to, subject: p.subject, text: p.text, kind: p.kind || 'inbox_reply', customer_id: p.customer_id || null });
      if (p.inbox_id) db.updateInbound(p.inbox_id, { status: 'auto_replied' });
      return r ? `sent to ${p.to} (${r.status})` : 'no recipient';
    }
    case 'purchase_order': {
      const po = db.db.prepare('SELECT * FROM purchase_orders WHERE action_id = ?').get(action.id);
      if (po) db.setPurchaseOrderStatus(po.id, 'sent');
      if (p.supplier_email) await mail.send({ to: p.supplier_email, subject: `Purchase order ${po ? po.id.slice(0, 8) : ''} from ${brand()}`, text: poText(po || { id: action.id, lines: JSON.stringify(p.lines) }), kind: 'po:' + (po ? po.id : action.id) });
      return 'purchase order sent';
    }
    case 'partner_payout':
      for (const id of p.payout_ids || []) db.markPayoutPaid(id);
      return `marked A$${(p.total || 0).toFixed(2)} paid`;
    case 'ads_budget':
      db.recordJobRun('ads_budget', db.today(), p);
      return `budget noted: change it to A$${p.to} in Google Ads (or let the Ads API script do it)`;
    case 'cancel_customer':
      db.cancelCustomer(p.customer_id, p.reason || 'approved cancellation');
      return 'cancelled';
    case 'refund':
      return 'refund approved: issue it in Stripe';
    default:
      return 'noted';
  }
}
async function approve(aid) {
  const a = db.getAction(aid);
  if (!a || a.status !== 'pending') return null;
  try { const r = await execute(a); db.decideAction(aid, 'done', r); return r; }
  catch (e) { db.decideAction(aid, 'failed', e.message); return e.message; }
}
function reject(aid, why) {
  const a = db.getAction(aid);
  if (!a || a.status !== 'pending') return null;
  const p = JSON.parse(a.payload || '{}');
  if (a.type === 'purchase_order') { const po = db.db.prepare('SELECT id FROM purchase_orders WHERE action_id = ?').get(aid); if (po) db.db.prepare("UPDATE purchase_orders SET status='rejected' WHERE id = ?").run(po.id); }
  if (p.inbox_id) db.updateInbound(p.inbox_id, { status: 'ignored' });
  db.decideAction(aid, 'rejected', why || null);
  return true;
}

// ---- run everything --------------------------------------------------------
const JOBS = { shipments, stock, renewals, dunning, activation, leads, cancellations, partners, review };
async function runAll(on = db.today()) {
  const out = { on };
  for (const [name, fn] of Object.entries(JOBS)) {
    try { out[name] = await fn(on); }
    catch (e) { out[name] = { error: e.message }; console.error('autopilot', name, e); }
  }
  out.mail = await mail.flush();
  db.recordJobRun('all', on, out);
  return out;
}

module.exports = { POLICY, JOBS, runAll, approve, reject, execute };
