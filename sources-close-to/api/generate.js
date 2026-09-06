import Stripe from 'stripe';
import { load, save } from './_store.js';
import { bad } from './_util.js';
import { writeIssue } from './_writer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'Method not allowed');
  const b = req.body || {};
  const doc = await load(String(b.id || ''));
  if (!doc || doc.editKey !== String(b.key || '')) return bad(res, 403, 'Not your issue');

  if (doc.magazine && !b.regenerate) return res.status(200).json({ ok: true, already: true });

  /* Confirm payment with Stripe, once. Afterwards the document remembers. */
  if (!(doc.payment && doc.payment.paid)) {
    const sessionId = String(b.session_id || (doc.payment && doc.payment.sessionId) || '');
    if (process.env.MOCK_GENERATE === '1' && !process.env.STRIPE_SECRET_KEY) {
      doc.payment = { sessionId: 'mock', paid: true, mock: true };
    } else {
      if (!sessionId || !process.env.STRIPE_SECRET_KEY) return bad(res, 402, 'Payment required');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.issue !== doc.id || session.payment_status !== 'paid') return bad(res, 402, 'Payment not confirmed yet');
      doc.payment = { sessionId, paid: true, amount: session.amount_total, ref: session.client_reference_id };
    }
    await save(doc);
  }

  /* One free rewrite. After that the issue is what it is. */
  const runs = doc.runs || 0;
  if (b.regenerate && runs >= 2) return bad(res, 429, 'You have had your rewrite. This is the issue.');

  try {
    doc.magazine = await writeIssue(doc);
  } catch (e) {
    return bad(res, e.code === 'refusal' ? 422 : 502, e.message || 'The newsroom is down. Try again in a minute.');
  }
  doc.runs = runs + 1;
  doc.status = 'printed';
  doc.printedAt = new Date().toISOString();
  await save(doc);
  return res.status(200).json({ ok: true });
}
