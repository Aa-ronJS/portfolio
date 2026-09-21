// GET /api/setup-link?session=cs_...  —  the welcome page, opened from Stripe's success URL with {CHECKOUT_SESSION_ID}, asks
// for the set-up link so the "Set up my app" button is on the screen the painter paid from; the email is the backup. For a
// subscription it mints the sending token too, so that one tap also switches the chasing on.
// Needs STRIPE_SECRET_KEY (reading Checkout Sessions and Subscriptions), RELAY_SIGNING_SECRET, RELAY_URL and APP_URL.
import { cors, send, detailsFromSession, linkOnePayload, setupLink, mintToken, untilFor, sendingSettings, stripe, f } from "./_setup.js";

const hits = new Map();
export default async function handler(req, res) {
  const okOrigin = cors(req, res, "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = okOrigin ? 204 : 403; return res.end(); }
  if (req.method !== "GET") return send(res, 405, { ok: false, error: "GET only" });
  if (!okOrigin && req.headers.origin) return send(res, 403, { ok: false, error: "Origin not allowed" });
  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "").split(",")[0].trim(), now = Date.now(), h = hits.get(ip) || [];
  const recent = h.filter((t) => now - t < 600000); recent.push(now); hits.set(ip, recent); if (recent.length > 30) return send(res, 429, { ok: false, error: "Too many requests" });
  const q = new URL(req.url, "http://x").searchParams, id = String(q.get("session") || "").trim();
  if (!/^cs_(test_|live_)?[A-Za-z0-9]{8,}$/.test(id)) return send(res, 400, { ok: false, error: "That does not look like a Stripe session" });
  if (!process.env.STRIPE_SECRET_KEY) return send(res, 503, { ok: false, error: "Not set up: STRIPE_SECRET_KEY" });
  const r = await f("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(id), { headers: { Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY } });
  const s = await r.json().catch(() => ({}));
  if (!r.ok) return send(res, 404, { ok: false, error: (s.error && s.error.message) || "Session not found" });
  if (s.payment_status !== "paid") return send(res, 200, { ok: true, paid: false });
  const details = detailsFromSession(s), payload = linkOnePayload(details);
  let hosted = false, until = "";
  if (s.subscription) {
    try {
      const sub = typeof s.subscription === "string" ? await stripe("subscriptions/" + encodeURIComponent(s.subscription)) : s.subscription;
      const item = (sub.items && sub.items.data && sub.items.data[0]) || {};
      until = untilFor(sub.current_period_end || item.current_period_end);
      const sending = sendingSettings(mintToken({ sub: sub.id, cus: sub.customer || s.customer, name: details.trading_name || details.owner_name || "", reply_to: details.email || "", until: until }), until, details.trading_name || details.owner_name || "");
      if (sending.server) { payload.settings.sending = sending; payload.note = "You're on. This loads your details and switches your follow-ups on."; hosted = true; }
    } catch (e) { /* the details still load; the emailed link carries sending when Stripe answers */ }
  }
  return send(res, 200, { ok: true, paid: true, hosted: hosted, until: until, link: setupLink(process.env.APP_URL, payload), name: details.trading_name || details.owner_name || "" });
}
