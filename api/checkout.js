'use strict';
/* GET /api/checkout: create a Stripe Checkout session and send the buyer to it.
   Every "Get the course" button on the sales page points here. If the deploy
   is not configured, say so in a sentence, so the page never shows a broken
   checkout without also saying why. */

const { missing } = require('./_lib/config');
const { createCheckout } = require('./_lib/stripe');
const { page } = require('./_lib/page');

module.exports = async (req, res) => {
  const gaps = missing(['stripeKey', 'stripePrice', 'siteUrl']);
  if (gaps.length) {
    res.status(503).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(page('Checkout is not open yet', `<p>The course is not on sale yet. The page you came from is live so it can be read and checked before it is.</p><p><a class="link" href="/course/">Back to the course page</a></p>`));
  }
  try {
    const session = await createCheckout();
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(303, session.url);
  } catch (err) {
    console.error('checkout', err.message);
    res.status(502).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(page('Checkout did not open', `<p>Stripe did not answer. Nothing was charged. Please try again in a minute, and if it happens twice, tell me.</p><p><a class="link" href="/course/#price">Back</a></p>`));
  }
};
