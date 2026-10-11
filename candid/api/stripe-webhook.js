// POST /api/stripe-webhook   checkout.session.completed and checkout.session.async_payment_succeeded → credit the business.
// Signing secret in STRIPE_WEBHOOK_SECRET. A retry of an already-credited session is a no-op.
import { send, rawBody } from "./_http.js";
import { ensureSchema } from "./_db.js";
import { stripeSigned } from "./_stripe.js";
import { creditSession } from "./checkout.js";

export default async function handler(req, res) {
  await ensureSchema();
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST" });
  const raw = await rawBody(req, 1_000_000);
  if (!stripeSigned(raw, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET)) return send(res, 400, { ok: false, error: "Bad signature" });
  let ev; try { ev = JSON.parse(raw.toString("utf8")); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    try { const credited = await creditSession(ev.data && ev.data.object, Date.now()); return send(res, 200, { ok: true, credited }); }
    catch (e) { console.error("webhook:", e.message); return send(res, 500, { ok: false, error: "Try again" }); }
  }
  return send(res, 200, { ok: true, ignored: ev.type });
}
