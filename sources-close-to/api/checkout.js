import Stripe from 'stripe';
import { load, save } from './_store.js';
import { bad, site } from './_util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'Method not allowed');
  const b = req.body || {};
  const doc = await load(String(b.id || ''));
  if (!doc || doc.editKey !== String(b.key || '')) return bad(res, 403, 'Not your issue');
  if (doc.tips.length < 5) return bad(res, 400, 'Five tips is the minimum for a readable issue. Chase the group chat.');
  if (doc.payment && doc.payment.paid) return res.status(200).json({ paid: true });
  if (!process.env.STRIPE_SECRET_KEY) {
    /* Local layout work only: no Stripe, no charge, straight to the newsroom. */
    if (process.env.MOCK_GENERATE === '1') return res.status(200).json({ paid: true });
    return bad(res, 500, 'Payments are not configured yet');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const base = site(req);
  const back = `${base}/edit?id=${doc.id}&key=${doc.editKey}`;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'aud',
        unit_amount: Number(process.env.PRICE_CENTS || 2900),
        product_data: { name: `Sources Close To ${doc.subject.name}`, description: 'One tabloid issue, written from the tips, print-ready PDF' },
      },
    }],
    client_reference_id: `${doc.id}_${(b.ref || 'direct').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 60)}`,
    metadata: { issue: doc.id },
    success_url: `${back}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: back,
    allow_promotion_codes: true,
  });
  doc.payment = { sessionId: session.id, paid: false };
  await save(doc);
  return res.status(200).json({ url: session.url });
}
