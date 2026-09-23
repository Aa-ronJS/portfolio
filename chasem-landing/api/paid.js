// POST /api/paid  —  Stripe telling us a painter's invoice has been paid by card.
//
// This is the Connect webhook, separate from /api/stripe-webhook (which is our own subscription). Events here
// are about a connected account: ev.account is the painter's acct_..., and the money went to him, not to us.
// All we do is write down that it happened, so the app can tick the invoice off the next time it syncs. He
// does not have to watch a bank feed, and nothing is asked of him.
//
// Stripe set-up (once): a webhook endpoint here, "Listen to events on Connected accounts", for
// checkout.session.completed and checkout.session.async_payment_succeeded; its signing secret in
// STRIPE_CONNECT_WEBHOOK_SECRET.
import { rawBody, send, stripeSigned } from "./_setup.js";
import { q, dbConfigured, ensureSchema, getSetting } from "./_db.js";
import { HOOK_KEY } from "./connect.js";

export const config = { api: { bodyParser: false } };

const PAYING = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!dbConfigured()) return send(res, 200, { ok: true, off: true });
  await ensureSchema();
  // Normally whatever Stripe handed the relay when it made this endpoint itself. The environment variable is
  // only an override, for an endpoint somebody made by hand.
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || (await getSetting(HOOK_KEY));
  // Nothing to check signatures against means no painter has turned card payments on yet, so there is nothing
  // this could legitimately be. Answer 200 rather than have Stripe retry for days.
  if (!secret) return send(res, 200, { ok: true, off: true });

  let raw; try { raw = await rawBody(req, 1_000_000); } catch (e) { return send(res, 413, { ok: false, error: e.message }); }
  if (!stripeSigned(raw, req.headers["stripe-signature"], secret)) return send(res, 400, { ok: false, error: "Bad signature" });

  let ev; try { ev = JSON.parse(raw.toString("utf8")); } catch (e) { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const type = ev && ev.type, s = (ev && ev.data && ev.data.object) || null;
  if (PAYING.indexOf(type) < 0) return send(res, 200, { ok: true, ignored: type });
  if (!s || s.payment_status !== "paid") return send(res, 200, { ok: true, ignored: "not paid yet" });

  // Only a connected account's event is a painter being paid; one of ours is a subscription and belongs to
  // the other endpoint.
  const acct = String(ev.account || "");
  if (!acct) return send(res, 200, { ok: true, ignored: "not a connected account" });

  const owner = (await q("select id from painter where stripe_account=$1", [acct])).rows[0];
  if (!owner) return send(res, 200, { ok: true, ignored: "no painter for that account" });

  const meta = s.metadata || {};
  const cents = Math.round(Number(s.amount_total) || 0);
  if (cents <= 0) return send(res, 200, { ok: true, ignored: "nothing to record" });

  // Stripe's own id is the key, so a retry, a duplicate delivery or both events firing on one payment write
  // the row once. An invoice is never paid twice by accident.
  try {
    await q(
      `insert into payment (id, painter_id, job_id, invoice_no, amount_cents, currency, paid_at)
         values ($1,$2,$3,$4,$5,$6, now())
       on conflict (id) do nothing`,
      [String(s.id), owner.id, String(meta.job || "").slice(0, 60), String(meta.invoice || "").slice(0, 40),
       cents, String(s.currency || "aud").toLowerCase()]);
  } catch (e) {
    // A 500 here makes Stripe retry for days. Ask it to come back instead, and say why in the reply.
    return send(res, 503, { ok: false, error: "Could not write that down yet" });
  }

  return send(res, 200, { ok: true, recorded: String(s.id) });
}
