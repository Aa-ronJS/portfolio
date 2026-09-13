'use strict';
// The expiry engine. Pure functions over the database rows so they are easy
// to test and to run from a cron script.
const db = require('./db');

const EXPIRY_WINDOW_DAYS = parseInt(process.env.EXPIRY_WINDOW_DAYS || '45', 10);
const REFILL_WINDOW_DAYS = parseInt(process.env.REFILL_WINDOW_DAYS || '14', 10);
const RENEWAL_WINDOW_DAYS = parseInt(process.env.RENEWAL_WINDOW_DAYS || '30', 10);

function daysBetween(a, b) { // b - a in days, ISO dates
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

// One kit's compliance state, with the reasons. States, in order of severity:
//   compliant  everything present, nothing expiring, checks on schedule
//   due        a scheduled refill is inside its window, or an item expires soon
//   attention  an open after-use request or a short item (used, refill not yet shipped)
//   overdue    a scheduled refill or an item's expiry date has passed
function kitState(kit, items, openRequests, on = db.today()) {
  const reasons = [];
  let rank = 0; // 0 compliant, 1 due, 2 attention, 3 overdue
  const bump = (r, why) => { rank = Math.max(rank, r); reasons.push(why); };

  const refillDays = kit.next_refill_at ? daysBetween(on, kit.next_refill_at) : null;
  if (refillDays !== null && refillDays < 0) bump(3, `Scheduled refill overdue by ${-refillDays} days`);
  else if (refillDays !== null && refillDays <= REFILL_WINDOW_DAYS) bump(1, `Scheduled refill due in ${refillDays} days`);

  for (const it of items) {
    if (it.qty_present < it.qty_required) bump(2, `${it.name}: ${it.qty_present} of ${it.qty_required}`);
    if (it.expires_at) {
      const d = daysBetween(on, it.expires_at);
      if (d < 0) bump(3, `${it.name} expired ${-d} days ago`);
      else if (d <= EXPIRY_WINDOW_DAYS) bump(1, `${it.name} expires in ${d} days`);
    }
  }
  const open = openRequests.filter((r) => r.kit_id === kit.id);
  if (open.length) bump(2, `${open.length} refill request${open.length > 1 ? 's' : ''} open`);
  if (kit.last_check_at && daysBetween(kit.last_check_at, on) > 365) bump(3, 'No check recorded in 12 months');

  return { state: ['compliant', 'due', 'attention', 'overdue'][rank], rank, reasons };
}

function aedState(aed, on = db.today()) {
  const reasons = []; let rank = 0;
  for (const [label, date] of [['Pads', aed.pads_expiry], ['Battery', aed.battery_expiry]]) {
    if (!date) { rank = Math.max(rank, 2); reasons.push(`${label} expiry not recorded`); continue; }
    const d = daysBetween(on, date);
    if (d < 0) { rank = 3; reasons.push(`${label} expired ${-d} days ago`); }
    else if (d <= EXPIRY_WINDOW_DAYS) { rank = Math.max(rank, 1); reasons.push(`${label} expire in ${d} days`); }
  }
  return { state: ['compliant', 'due', 'attention', 'overdue'][rank], rank, reasons };
}

// Everything that needs shipping or attention, across all customers.
function dueReport(on = db.today()) {
  const open = db.listOpenRequests();
  const kits = db.listAllKits();
  const scheduled = [];
  const attention = [];
  for (const k of kits) {
    const s = kitState(k, db.listItems(k.id), open, on);
    if (s.rank === 0) continue;
    const row = { ...k, ...s };
    const refillDays = k.next_refill_at ? daysBetween(on, k.next_refill_at) : null;
    if (refillDays !== null && refillDays <= REFILL_WINDOW_DAYS) scheduled.push(row);
    else attention.push(row);
  }
  const aeds = db.listAllAeds().map((a) => ({ ...a, ...aedState(a, on) })).filter((a) => a.rank > 0);
  const renewals = db.listCustomers().filter((c) => c.plan_renewal && daysBetween(on, c.plan_renewal) <= RENEWAL_WINDOW_DAYS)
    .map((c) => ({ ...c, days: daysBetween(on, c.plan_renewal) }));
  return { on, open, scheduled, attention, aeds, renewals };
}

// Customer-level summary for the compliance record.
function customerSummary(customer, on = db.today()) {
  const open = db.listOpenRequests().filter((r) => r.customer_id === customer.id);
  const kits = db.listKits(customer.id).filter((k) => k.status === 'active').map((k) => {
    const items = db.listItems(k.id);
    return { ...k, items, ...kitState(k, items, open, on) };
  });
  const aeds = db.listAeds(customer.id).map((a) => ({ ...a, ...aedState(a, on) }));
  const worst = Math.max(0, ...kits.map((k) => k.rank), ...aeds.map((a) => a.rank));
  return { kits, aeds, open, overall: ['compliant', 'due', 'attention', 'overdue'][worst], rank: worst };
}

module.exports = { kitState, aedState, dueReport, customerSummary, daysBetween, EXPIRY_WINDOW_DAYS, REFILL_WINDOW_DAYS, RENEWAL_WINDOW_DAYS };
