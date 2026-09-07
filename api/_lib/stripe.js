'use strict';
/* Stripe over plain fetch. Two calls and one signature check are all the
   system needs, which is not worth a dependency. */

const crypto = require('crypto');
const { cfg } = require('./config');

async function stripe(path, params) {
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    method: params ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${cfg.stripeKey}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`Stripe ${path}: ${(json.error && json.error.message) || r.status}`);
  return json;
}

/* A hosted checkout for one copy of the course. Stripe collects the email,
   sends its own receipt, and sends the buyer back to /api/watch with the
   session id so they are reading lesson one thirty seconds after paying. */
function createCheckout() {
  return stripe('/checkout/sessions', {
    mode: 'payment',
    'line_items[0][price]': cfg.stripePrice,
    'line_items[0][quantity]': '1',
    success_url: `${cfg.siteUrl}/api/watch?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${cfg.siteUrl}/course/#price`,
    allow_promotion_codes: 'true',
    'invoice_creation[enabled]': 'true',
    'metadata[product]': 'draw-it-badly',
  });
}

function getSession(id) {
  return stripe(`/checkout/sessions/${encodeURIComponent(id)}`);
}

/* Webhook signature, per Stripe's documented scheme: HMAC-SHA256 over
   "<timestamp>.<raw body>", compared against every v1 value in the header,
   with a five-minute tolerance on the timestamp. */
function verifyWebhook(rawBody, header, tolerance = 300) {
  if (!header) return false;
  const parts = Object.create(null);
  for (const kv of header.split(',')) {
    const [k, v] = kv.split('=');
    if (!k || !v) continue;
    (parts[k.trim()] = parts[k.trim()] || []).push(v.trim());
  }
  const t = parts.t && parts.t[0];
  const sigs = parts.v1 || [];
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > tolerance) return false;
  const expected = crypto.createHmac('sha256', cfg.stripeWebhook).update(`${t}.${rawBody}`).digest('hex');
  const e = Buffer.from(expected);
  return sigs.some((s) => { const b = Buffer.from(s); return b.length === e.length && crypto.timingSafeEqual(b, e); });
}

module.exports = { createCheckout, getSession, verifyWebhook };
