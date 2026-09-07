'use strict';
/* Every setting the system needs, read once. Nothing here is secret in the
   code; all of it comes from Vercel environment variables. `missing()` is what
   the endpoints call so a half-configured deploy fails with a sentence, not a
   stack trace. */

const env = (k, fallback) => (process.env[k] && process.env[k].trim()) || fallback || '';

const cfg = {
  siteUrl:        env('SITE_URL', 'https://aaronsteele.vercel.app'),
  stripeKey:      env('STRIPE_SECRET_KEY'),
  stripePrice:    env('STRIPE_PRICE_ID'),
  stripeWebhook:  env('STRIPE_WEBHOOK_SECRET'),
  resendKey:      env('RESEND_API_KEY'),
  fromEmail:      env('FROM_EMAIL'),          // e.g. "Aaron Steele <aaron@yourdomain>"
  replyTo:        env('REPLY_TO', ''),        // where the "I finished it" replies land
  courseSecret:   env('COURSE_SECRET'),       // signs the access links; 32+ random chars
  metaPixel:      env('META_PIXEL_ID'),       // optional; the ad needs it to optimise for purchases
};

function missing(keys) {
  return keys.filter((k) => !cfg[k]);
}

module.exports = { cfg, missing };
