// POST /api/subscribe  { token, plan? }  —  the way in to the checkout, and the only one.
//
// The Payment Link lives here, not in the app, so the app never has to be redeployed to change it. What
// this adds is the one thing the link cannot carry by itself: client_reference_id, the painter's existing
// customer id. Without it Stripe makes a brand new customer at checkout and nothing connects the two, so
//   - api/stripe-webhook.js cannot move his top-up packs across (qc_upgraded_to), and
//   - it cannot see qc_referred_by, so the mate who sent him is never paid his free month.
// Both of those are written against the account he already has, which is the one this id names.
//
// Env: SUBSCRIBE_URL (required), SUBSCRIBE2_URL (the two-phone plan), RELAY_SIGNING_SECRET.
import { cors, send, readJson, readToken, stripe } from "./_setup.js";

export default async function handler(req, res) {
  const okOrigin = cors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = okOrigin ? 204 : 403; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!okOrigin && req.headers.origin) return send(res, 403, { ok: false, error: "Origin not allowed" });

  let body; try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const p = readToken(body && body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.cus) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });

  const two = String((body && body.plan) || "") === "two";
  const base = String((two ? process.env.SUBSCRIBE2_URL : process.env.SUBSCRIBE_URL) || "").trim();
  if (!/^https:\/\/(buy\.stripe\.com|[a-z0-9-]+\.stripe\.com)\//i.test(base)) {
    return send(res, 503, { ok: false, error: "No checkout is set up yet. Email us and we will sort it." });
  }

  // Stripe takes both as query parameters on a Payment Link. prefilled_email saves him typing the address
  // he already gave us, and keeps the checkout on the same account when he does.
  const u = new URL(base);
  u.searchParams.set("client_reference_id", p.cus);
  let email = String(p.reply_to || "").trim();
  if (!email) { try { email = String((await stripe("customers/" + encodeURIComponent(p.cus))).email || ""); } catch (e) { email = ""; } }
  if (email) u.searchParams.set("prefilled_email", email);

  return send(res, 200, { ok: true, url: u.toString(), plan: two ? "two" : "solo" });
}
