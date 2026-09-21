// POST /api/topup  { token, auto? }  —  one tap, no browser. Buys a pack of messages on the card Stripe already holds and
// credits them at once. { auto: true } is the painter turning on "top up by itself when I run out", or turning it off with
// { auto: false }. There is a cap on how many packs we will ever buy without asking, so nothing can run away.
import { cors, send, readJson, readToken, stripe, chargeTopUp, readBalance, TOPUP_MESSAGES, TOPUP_PRICE, AUTO_TOPUP_CAP } from "./_setup.js";

const hits = new Map();
export default async function handler(req, res) {
  const okOrigin = cors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = okOrigin ? 204 : 403; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!okOrigin && req.headers.origin) return send(res, 403, { ok: false, error: "Origin not allowed" });
  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "").split(",")[0].trim(), now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 600000); recent.push(now); hits.set(ip, recent);
  if (recent.length > 10) return send(res, 429, { ok: false, error: "Slow down" });

  let body; try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const p = readToken(body && body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.cus) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });

  // turning the switch on or off is not a purchase
  if (body.auto === true || body.auto === false) {
    try { await stripe("customers/" + encodeURIComponent(p.cus), { "metadata[qc_auto]": body.auto ? "1" : "" }); }
    catch (e) { return send(res, 502, { ok: false, error: e.message }); }
    if (!body.buy) return send(res, 200, { ok: true, auto: body.auto, messages: TOPUP_MESSAGES, price: TOPUP_PRICE, cap: AUTO_TOPUP_CAP });
  }
  const r = await chargeTopUp(p, { auto: false });
  if (!r.ok) return send(res, r.needs_card ? 402 : 502, { ok: false, ...r, price: TOPUP_PRICE, messages: TOPUP_MESSAGES });
  const bal = await readBalance(p).catch(() => null);
  return send(res, 200, { ok: true, messages: r.messages, charged: r.charged, ...(bal ? { included: bal.included + bal.extra, used: bal.used, left: bal.left } : {}) });
}
