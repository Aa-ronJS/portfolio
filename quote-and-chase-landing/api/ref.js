// POST /api/ref  { token }  —  a painter's own code for bringing a mate, and what it has earned him.
//
// Read-only. The code itself is derived from his Stripe customer id, so it never changes and nothing has to
// be stored to work it out -- it is written to the customer only so a mate's sign-up can look it up by code.
// Env: STRIPE_SECRET_KEY, RELAY_SIGNING_SECRET, optional SITE_URL.
import { cors, send, readJson, readToken, stripe, refCodeFor, ensureRefCode, REF_CAP, PLAN_PRICE } from "./_setup.js";

export default async function handler(req, res) {
  const okOrigin = cors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = okOrigin ? 204 : 403; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!okOrigin && req.headers.origin) return send(res, 403, { ok: false, error: "Origin not allowed" });

  let body; try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const p = readToken(body && body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.cus) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });

  const code = refCodeFor(p.cus);
  const site = String(process.env.SITE_URL || "https://chasem.app").replace(/\/+$/, "");
  const out = { ok: true, code, link: `${site}/?r=${code}`, cap: REF_CAP, month_value: PLAN_PRICE, count: 0, months: 0, left: REF_CAP };

  try {
    const cus = await stripe("customers/" + encodeURIComponent(p.cus)), m = cus.metadata || {};
    out.count = Math.max(0, parseInt(m.qc_ref_count, 10) || 0);
    out.months = Math.max(0, parseInt(m.qc_ref_months, 10) || 0);
    out.left = Math.max(0, REF_CAP - out.months);
    // a credit already sitting on the account, as a positive number of dollars
    out.credit = Math.max(0, Math.round((-(Number(cus.balance) || 0)) / 100));
    if (m.qc_ref_code !== code) await ensureRefCode(p.cus);   // first ask also writes it, so a mate can find him
  } catch (e) { out.stale = e.message; }

  return send(res, 200, out);
}
