'use strict';
/* POST /api/webhook: Stripe tells us a checkout completed. We verify it really
   was Stripe, then send the delivery email with the buyer's permanent link.
   Stripe retries on any non-2xx, so a failed email is a 500 on purpose. */

const { cfg, missing } = require('./_lib/config');
const { verifyWebhook } = require('./_lib/stripe');
const { sendDelivery } = require('./_lib/email');

function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('POST only');
  const gaps = missing(['stripeWebhook', 'resendKey', 'fromEmail', 'courseSecret']);
  if (gaps.length) { console.error('webhook not configured:', gaps.join(', ')); return res.status(500).end('not configured'); }

  const body = await rawBody(req);
  if (!verifyWebhook(body, req.headers['stripe-signature'])) return res.status(400).end('bad signature');

  let event;
  try { event = JSON.parse(body); } catch { return res.status(400).end('bad json'); }

  if (event.type !== 'checkout.session.completed') return res.status(200).end('ignored');
  const s = event.data && event.data.object;
  if (!s || s.payment_status !== 'paid') return res.status(200).end('not paid');
  const email = (s.customer_details && s.customer_details.email) || s.customer_email;
  if (!email) { console.error('paid session without email', s.id); return res.status(200).end('no email'); }

  try {
    await sendDelivery(email);
    console.log('delivered', s.id, cfg.replyTo ? 'reply-to set' : 'no reply-to');
    res.status(200).end('ok');
  } catch (err) {
    console.error('delivery failed', s.id, err.message);
    res.status(500).end('delivery failed, retry');
  }
}

/* Stripe signs the raw bytes, so the body parser must stay off. */
module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
