// POST /api/portal  { token, return_url? }  —  the app's "Manage or cancel" button. Returns a Stripe billing portal link for
// this painter's own subscription: change the card, see receipts, cancel, all without asking anybody.
// Needs STRIPE_SECRET_KEY, RELAY_SIGNING_SECRET, and a portal configuration saved in Stripe (Settings, Billing, Customer portal).
import { cors, send, readJson, readToken, stripe } from "./_setup.js";

const hits = new Map();
export default async function handler(req, res) {
  const okOrigin = cors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = okOrigin ? 204 : 403; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!okOrigin && req.headers.origin) return send(res, 403, { ok: false, error: "Origin not allowed" });
  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "").split(",")[0].trim(), now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 600000); recent.push(now); hits.set(ip, recent);
  if (recent.length > 20) return send(res, 429, { ok: false, error: "Slow down" });
  let body; try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const p = readToken(body && body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.cus) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });
  const ret = String((body && body.return_url) || process.env.SITE_URL || "https://chasem.app/").slice(0, 300);
  try { const s = await stripe("billing_portal/sessions", { customer: p.cus, return_url: ret }); return send(res, 200, { ok: true, url: s.url }); }
  catch (e) { return send(res, 502, { ok: false, error: e.message }); }
}
