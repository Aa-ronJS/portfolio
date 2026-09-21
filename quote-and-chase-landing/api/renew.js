// POST /api/renew  { token }  —  the app asks, by itself, whether the chasing is still paid for.
//
// Hosted tokens are signed, not stored, and they expire a few days after the period they were paid for. Every time the app
// opens near that date it calls this: we check the subscription with Stripe and hand back a fresh token with a new date, or
// say the subscription has stopped. Nobody types anything, and a cancelled account stops itself when its token runs out.
// Needs STRIPE_SECRET_KEY and RELAY_SIGNING_SECRET. Replies: { ok, active, token?, until?, name?, status, portal }.
import { cors, send, readJson, readToken, mintToken, untilFor, stripe, LIVE_STATUS } from "./_setup.js";

const hits = new Map();
export default async function handler(req, res) {
  const okOrigin = cors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = okOrigin ? 204 : 403; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!okOrigin && req.headers.origin) return send(res, 403, { ok: false, error: "Origin not allowed" });
  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "").split(",")[0].trim(), now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 600000); recent.push(now); hits.set(ip, recent);
  if (recent.length > 60) return send(res, 429, { ok: false, error: "Slow down" });
  let body; try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const p = readToken(body && body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });
  if (!p.sub) return send(res, 200, { ok: true, active: true, until: p.until || "", name: p.name || "", status: "fixed" }); // a token with no subscription behind it (a gift or a trial we set) just runs to its date
  let sub; try { sub = await stripe("subscriptions/" + encodeURIComponent(p.sub)); } catch (e) { return send(res, 200, { ok: true, active: true, until: p.until || "", name: p.name || "", status: "unknown", error: e.message }); } // Stripe down is never a reason to stop someone's chasing early
  const active = LIVE_STATUS.indexOf(sub.status) >= 0;
  if (!active) return send(res, 200, { ok: true, active: false, status: sub.status, until: p.until || "", name: p.name || "" });
  const item = (sub.items && sub.items.data && sub.items.data[0]) || {};
  const until = untilFor(sub.current_period_end || item.current_period_end);
  return send(res, 200, { ok: true, active: true, status: sub.status, until: until, name: p.name || "", token: mintToken({ sub: p.sub, cus: p.cus || sub.customer, name: p.name, reply_to: p.reply_to, until: until }) });
}
