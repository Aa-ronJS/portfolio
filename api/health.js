'use strict';
/* GET /api/health: which settings are present, by name only, never by value.
   Open it on your phone after setting the environment variables and read the
   sentence at the top. */

const { cfg } = require('./_lib/config');
const { page } = require('./_lib/page');

const needed = [
  ['stripeKey', 'STRIPE_SECRET_KEY', 'checkout'],
  ['stripePrice', 'STRIPE_PRICE_ID', 'checkout'],
  ['stripeWebhook', 'STRIPE_WEBHOOK_SECRET', 'delivery email'],
  ['resendKey', 'RESEND_API_KEY', 'delivery email'],
  ['fromEmail', 'FROM_EMAIL', 'delivery email'],
  ['replyTo', 'REPLY_TO', 'the reply loop'],
  ['courseSecret', 'COURSE_SECRET', 'the course page'],
  ['siteUrl', 'SITE_URL', 'every link'],
  ['metaPixel', 'META_PIXEL_ID', 'the ad (optional)'],
];

module.exports = (req, res) => {
  const rows = needed.map(([k, name, why]) => ({ name, why, ok: Boolean(cfg[k]) }));
  const missing = rows.filter((r) => !r.ok && r.name !== 'META_PIXEL_ID');
  const verdict = missing.length
    ? `Not ready. ${missing.length} setting${missing.length > 1 ? 's' : ''} missing.`
    : 'Ready. Checkout, delivery and the course page are all configured.';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).end(page(verdict, `<ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px;font-family:var(--mono);font-size:.9rem">${rows.map((r) => `<li>${r.ok ? 'set' : 'MISSING'} &nbsp; ${r.name} <span class="mute">(${r.why})</span></li>`).join('')}</ul><p style="margin-top:32px">Values are never shown here. Set them in Vercel, redeploy, reload.</p>`));
};
