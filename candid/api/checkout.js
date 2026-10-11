// Credits by card, through Stripe Checkout.
//
//   POST /api/checkout { id, pack }                      → { url }  send the browser there
//   POST /api/checkout { action: "confirm", id, session_id }   on return: credit if paid and not yet credited
//
// The webhook credits too. Both go through creditSession, which records the session id first, so whichever
// arrives second does nothing.
import { send, readJson, owner, APP_URL } from "./_http.js";
import { ensureSchema } from "./_db.js";
import * as S from "./_store.js";
import * as E from "./_engine.js";
import { stripe, stripeOn, PACKS } from "./_stripe.js";
import { views } from "./business.js";

export async function creditSession(sess, now) {
  if (!sess || sess.payment_status !== "paid") return false;
  const id = String((sess.metadata || {}).business || ""), amount = Math.round(Number((sess.metadata || {}).amount));
  if (!id || !(amount > 0)) return false;
  if (!(await S.recordPayment(sess.id, id, amount))) return false;
  await S.withBusiness(id, now, (s) => { E.addCredits(s, now, amount, "Card payment"); (s.outbox = s.outbox || []).push({ kind: "paid", owner: true, amount }); });
  return true;
}

export default async function handler(req, res) {
  await ensureSchema();
  const session = owner(req); if (!session) return send(res, 401, { ok: false, error: "Sign in" });
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST" });
  if (!stripeOn()) return send(res, 503, { ok: false, error: "Card payments are not set up" });
  const now = Date.now();
  try {
    const body = await readJson(req, 4000);
    const id = String(body.id || ""); const b = await S.loadBusiness(id);
    if (!S.canSee(session, b)) return send(res, 404, { ok: false, error: "No such business" });
    if (body.action === "confirm") {
      const sess = await stripe("checkout/sessions/" + encodeURIComponent(String(body.session_id || "")));
      const credited = await creditSession(sess, now);
      const fresh = await S.readBusiness(id, now);
      return send(res, 200, { ...views(id, fresh.state, await S.tokensFor(id), session), credited, paid: sess.payment_status === "paid" });
    }
    const pack = Number(body.pack); if (!PACKS.includes(pack)) return send(res, 400, { ok: false, error: "Choose a pack" });
    const sess = await stripe("checkout/sessions", {
      mode: "payment", "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "aud", "line_items[0][price_data][unit_amount]": String(pack * 100),
      "line_items[0][price_data][product_data][name]": `Candid credits · $${pack} for ${b.state.name}`,
      success_url: `${APP_URL()}app?paid=1&b=${encodeURIComponent(id)}&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${APP_URL()}app?b=${encodeURIComponent(id)}`,
      customer_email: session.email, "metadata[business]": id, "metadata[amount]": String(pack),
    });
    return send(res, 200, { ok: true, url: sess.url });
  } catch (e) {
    const status = e instanceof E.EngineError ? e.status : 500;
    if (status === 500) console.error("checkout:", e && e.message);
    return send(res, status, { ok: false, error: status === 500 ? "Payment could not be started. Try again." : e.message });
  }
}
