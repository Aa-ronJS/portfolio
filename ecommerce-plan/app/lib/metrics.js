'use strict';
// Retention and acquisition metrics computed from the register's own rows.
// These are the two stop-rule numbers from the retention plan (30-day
// activation, renewal rate by cohort) plus the things that explain them.
const db = require('./db');
const { daysBetween } = require('./schedule');

function ym(iso) { return iso.slice(0, 7); }

function compute(on = db.today()) {
  const customers = db.listCustomers();
  const events = db.db.prepare('SELECT customer_id, type, created_at FROM events ORDER BY created_at').all();
  const kitsByCustomer = {};
  for (const k of db.listAllKits()) (kitsByCustomer[k.customer_id] ||= []).push(k);

  const active = customers.filter((c) => c.status !== 'cancelled');
  const cancelled = customers.filter((c) => c.status === 'cancelled');
  const pastDue = customers.filter((c) => c.status === 'past_due');

  // accounts by source, all time and last 30 days
  const bySource = {}; const bySource30 = {};
  for (const c of customers) {
    const s = c.source || 'direct';
    bySource[s] = (bySource[s] || 0) + 1;
    if (daysBetween(c.created_at.slice(0, 10), on) <= 30) bySource30[s] = (bySource30[s] || 0) + 1;
  }

  // 30-day activation: accounts >= 30 days old with a scan/check within 30 days of creation
  const firstScan = {};
  for (const e of events) {
    if ((e.type === 'after_use_reported' || e.type === 'check_ok') && !firstScan[e.customer_id]) firstScan[e.customer_id] = e.created_at;
  }
  const eligible = customers.filter((c) => daysBetween(c.created_at.slice(0, 10), on) >= 30);
  const activated = eligible.filter((c) => firstScan[c.id] && daysBetween(c.created_at.slice(0, 10), firstScan[c.id].slice(0, 10)) <= 30);
  const activation = eligible.length ? activated.length / eligible.length : null;

  // logo churn, last 30 days: cancelled in window / active at window start
  const start30 = db.addDays(on, -30);
  const cancelled30 = cancelled.filter((c) => c.cancelled_at && c.cancelled_at.slice(0, 10) > start30).length;
  const activeAtStart = customers.filter((c) => c.created_at.slice(0, 10) <= start30 && !(c.cancelled_at && c.cancelled_at.slice(0, 10) <= start30)).length;
  const churn30 = activeAtStart ? cancelled30 / activeAtStart : null;

  // renewal rate: accounts whose plan_renewal fell in the last 90 days
  const renewedIds = new Set(events.filter((e) => e.type === 'plan_renewed').map((e) => e.customer_id));
  const dueRecently = customers.filter((c) => c.plan_start && daysBetween(c.plan_start, on) >= 365 && daysBetween(c.plan_start, on) <= 455);
  const renewed = dueRecently.filter((c) => c.status !== 'cancelled' && (renewedIds.has(c.id) || (c.plan_renewal && c.plan_renewal > on)));
  const renewal = dueRecently.length ? renewed.length / dueRecently.length : null;

  // kits per account, annual share
  const kitsPerAccount = active.length ? active.reduce((a, c) => a + (kitsByCustomer[c.id] || []).length, 0) / active.length : 0;
  const vehiclePerAccount = active.length ? active.reduce((a, c) => a + (kitsByCustomer[c.id] || []).filter((k) => k.type === 'vehicle').length, 0) / active.length : 0;
  const annualShare = active.length ? active.filter((c) => c.plan_billing === 'annual').length / active.length : 0;

  // open requests older than 2 business days (approximate: 3 calendar days)
  const stale = db.listOpenRequests().filter((r) => daysBetween(r.created_at.slice(0, 10), on) > 3).length;

  // cohorts by signup month
  const cohorts = {};
  for (const c of customers) {
    const k = ym(c.created_at);
    const row = (cohorts[k] ||= { month: k, signed: 0, active: 0, activated: 0, eligible: 0, kits: 0 });
    row.signed++; if (c.status !== 'cancelled') row.active++;
    row.kits += (kitsByCustomer[c.id] || []).length;
    if (daysBetween(c.created_at.slice(0, 10), on) >= 30) { row.eligible++; if (firstScan[c.id] && daysBetween(c.created_at.slice(0, 10), firstScan[c.id].slice(0, 10)) <= 30) row.activated++; }
  }

  // cancellation reasons
  const reasons = {};
  for (const c of cancelled) { const r = (c.cancel_reason || 'not recorded').trim().toLowerCase(); reasons[r] = (reasons[r] || 0) + 1; }

  return { on, total: customers.length, active: active.length, cancelled: cancelled.length, pastDue: pastDue.length,
    bySource, bySource30, activation, activated: activated.length, eligible: eligible.length, churn30, cancelled30, activeAtStart,
    renewal, renewed: renewed.length, dueRecently: dueRecently.length, kitsPerAccount, vehiclePerAccount, annualShare, stale,
    cohorts: Object.values(cohorts).sort((a, b) => b.month.localeCompare(a.month)), reasons, leads: db.listLeads().length };
}

module.exports = { compute };
