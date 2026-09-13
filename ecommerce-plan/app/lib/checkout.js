'use strict';
// Self-serve purchase: a configurator on the site, a Stripe Checkout Session
// created server-side (REST, no SDK), and an account built from the paid
// session's metadata. Idempotent on the session id, so the webhook and the
// success page can both try and only one wins.
const db = require('./db');

const PRICES = { site_kit: 119, vehicle_kit: 59, site_plan_pm: 12, vehicle_plan_pm: 7, min_plan_pm: 15, calendar_pm: 14, monthly_premium: 1.15 };

function quote(q) {
  const sites = Math.min(50, Math.max(0, parseInt(q.sites || '0', 10) || 0));
  const vehicles = Math.min(50, Math.max(0, parseInt(q.vehicles || '0', 10) || 0));
  const billing = q.billing === 'monthly' ? 'monthly' : 'annual';
  const calendar = q.calendar === 'yes' || q.calendar === '1' || q.calendar === 'on';
  const kits = sites * PRICES.site_kit + vehicles * PRICES.vehicle_kit;
  let plan_pm = Math.max(sites * PRICES.site_plan_pm + vehicles * PRICES.vehicle_plan_pm, (sites + vehicles) > 0 ? PRICES.min_plan_pm : 0);
  if (calendar) plan_pm += PRICES.calendar_pm;
  if (billing === 'monthly') plan_pm = Math.round(plan_pm * PRICES.monthly_premium * 100) / 100;
  const plan_period = billing === 'monthly' ? plan_pm : plan_pm * 12;
  return { sites, vehicles, billing, calendar, kits, plan_pm, plan_period, today: kits + plan_period, gst: Math.round((kits + plan_period) * 0.10 * 100) / 100 };
}

// Build the Checkout Session body (application/x-www-form-urlencoded, as Stripe wants).
function sessionParams(q, meta, cfg) {
  const p = new URLSearchParams();
  const interval = q.billing === 'monthly' ? 'month' : 'year';
  p.set('mode', 'subscription');
  p.set('success_url', `${cfg.baseUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`);
  p.set('cancel_url', `${cfg.baseUrl}/buy?cancelled=1`);
  p.set('billing_address_collection', 'required');
  p.set('phone_number_collection[enabled]', 'true');
  p.set('allow_promotion_codes', 'true');
  let i = 0;
  const line = (name, amountCents, qty, recurring) => {
    p.set(`line_items[${i}][price_data][currency]`, 'aud');
    p.set(`line_items[${i}][price_data][product_data][name]`, name);
    p.set(`line_items[${i}][price_data][unit_amount]`, String(amountCents));
    p.set(`line_items[${i}][price_data][tax_behavior]`, 'exclusive');
    if (recurring) p.set(`line_items[${i}][price_data][recurring][interval]`, interval);
    p.set(`line_items[${i}][quantity]`, String(qty));
    i++;
  };
  if (q.sites) line('Site first-aid kit (Code of Practice, QR-registered)', PRICES.site_kit * 100, q.sites, false);
  if (q.vehicles) line('Vehicle first-aid kit (QR-registered)', PRICES.vehicle_kit * 100, q.vehicles, false);
  line(`Replenishment plan (${q.sites} site, ${q.vehicles} vehicle${q.calendar ? ', compliance calendar' : ''})`, Math.round(q.plan_period * 100), 1, true);
  p.set('automatic_tax[enabled]', 'true');
  for (const [k, v] of Object.entries(meta)) if (v !== undefined && v !== null && v !== '') { p.set(`metadata[${k}]`, String(v)); p.set(`subscription_data[metadata][${k}]`, String(v)); }
  return p;
}

async function createSession(q, meta, cfg) {
  const r = await fetch(`${cfg.stripeApiBase}/v1/checkout/sessions`, {
    method: 'POST', headers: { Authorization: `Bearer ${cfg.stripeSecretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: sessionParams(q, meta, cfg).toString(),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`stripe ${r.status}: ${(j.error && j.error.message) || 'unknown'}`);
  return j;
}
async function retrieveSession(id, cfg) {
  const r = await fetch(`${cfg.stripeApiBase}/v1/checkout/sessions/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${cfg.stripeSecretKey}` } });
  const j = await r.json();
  if (!r.ok) throw new Error(`stripe ${r.status}: ${(j.error && j.error.message) || 'unknown'}`);
  return j;
}

// Create the account from a paid session. Safe to call twice.
function fulfil(session) {
  const existing = db.getCustomerBySession(session.id);
  if (existing) return { customer: existing, created: false };
  const m = session.metadata || {};
  const details = session.customer_details || {};
  const sites = parseInt(m.sites || '0', 10) || 0, vehicles = parseInt(m.vehicles || '0', 10) || 0;
  const partner = m.ref ? db.getPartnerByToken(m.ref) : null;
  const referrer = m.cref ? db.getCustomerByToken(m.cref) : null;
  const addr = details.address ? [details.address.line1, details.address.line2, details.address.city, details.address.state, details.address.postal_code].filter(Boolean).join(', ') : null;
  const c = db.createCustomer({
    name: m.business || details.name || 'New customer', contact_name: m.contact_name || details.name || null,
    email: details.email || m.email || null, phone: details.phone || m.phone || null, address: addr, industry: m.industry || null,
    plan_billing: m.billing === 'monthly' ? 'monthly' : 'annual',
    source: partner ? 'partner' : (referrer ? 'referral' : (m.source || 'site')),
    partner_id: partner ? partner.id : null, referred_by: referrer ? referrer.id : null,
  });
  db.updateCustomer(c.id, { stripe_session_id: session.id, stripe_customer_id: session.customer || null, stripe_subscription_id: session.subscription || null, calendar: m.calendar === 'yes' ? 1 : 0 });
  for (let i = 0; i < sites; i++) db.createKit({ customer_id: c.id, type: 'site', location: sites > 1 ? `Site ${i + 1} (name me)` : 'Main site (name me)' });
  for (let i = 0; i < vehicles; i++) db.createKit({ customer_id: c.id, type: 'vehicle', location: `Vehicle ${i + 1} (add rego)` });
  db.recordPartnerPayout({ ...c, partner_id: partner ? partner.id : null }, sites, vehicles);
  if (referrer) db.logEvent(referrer.id, null, 'referral_reward_due', { referred: c.name, reward: 'free refill pack' });
  db.logEvent(c.id, null, 'checkout_completed', { session: session.id, amount: session.amount_total, sites, vehicles, calendar: m.calendar === 'yes' });
  return { customer: db.getCustomer(c.id), created: true };
}

module.exports = { PRICES, quote, sessionParams, createSession, retrieveSession, fulfil };
