// POST /api/signup  { email, name?, trading_name? }  —  the front door. An email gets a working app with FREE_MESSAGES sends.
//
// The email becomes a Stripe customer, which is the whole of the customer list: Stripe already holds the money, so it holds
// the address and the message counter too, and there is still no database. Signing up twice with the same address returns the
// same allowance rather than a fresh five. The reply carries the set-up link; the same link is emailed so the phone can be
// swapped later. Env: STRIPE_SECRET_KEY, RELAY_SIGNING_SECRET, RELAY_URL, APP_URL, RESEND_*, optional SUBSCRIBE_URL, SUPPORT_EMAIL.
import { cors, send, readJson, stripe, mintToken, sendingSettings, setupLink, linkOnePayload, creds, email as sendEmail, FREE_MESSAGES } from "./_setup.js";

const hits = new Map();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

export function welcome(details, link, env) {
  const first = clean(details.owner_name, 60).split(/\s+/)[0] || "there";
  const text = `Hi ${first},

Your app is ready. Open this on the phone you quote from and tap Load:

${link}

It puts your business name on every quote and switches your sending on, with ${env.free} messages to start. A message is one text or one email the app sends for you: a quote going out, a nudge to someone who has gone quiet, a reminder on an invoice past its date.

Three things worth five minutes, all inside the app: your prices (it asks what you charge for a day on the tools and works the rest out), your bank details so invoices can be paid, and a look at the wording of the nudges so they sound like you.

When the ${env.free} run out, ${env.subscribe ? "one tap in the app tops you up to " + env.included + " a month." : "you can top up from inside the app."} Nothing sends to a customer until you tap Start on that job.

${env.support ? "Anything at all, reply to this email and a person answers." : ""}

Quote & Chase`;
  return { subject: "Your app is ready: one tap to set it up", text };
}

export default async function handler(req, res) {
  const okOrigin = cors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = okOrigin ? 204 : 403; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!okOrigin && req.headers.origin) return send(res, 403, { ok: false, error: "Origin not allowed" });
  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "").split(",")[0].trim(), now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600000); recent.push(now); hits.set(ip, recent);
  if (recent.length > 10) return send(res, 429, { ok: false, error: "Too many sign-ups from here. Try again later." });

  let body; try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const addr = clean(body && body.email, 120).toLowerCase();
  if (!EMAIL.test(addr)) return send(res, 400, { ok: false, error: "That does not look like an email address" });
  const details = {};
  if (body && body.trading_name) details.trading_name = clean(body.trading_name, 80);
  if (body && body.name) details.owner_name = clean(body.name, 80);
  details.email = addr;

  let cus;
  try {
    const found = await stripe("customers?limit=1&email=" + encodeURIComponent(addr));
    cus = found && found.data && found.data[0];
    if (!cus) cus = await stripe("customers", { email: addr, ...(details.trading_name ? { name: details.trading_name } : details.owner_name ? { name: details.owner_name } : {}), "metadata[qc_source]": "signup", "metadata[qc_joined]": new Date().toISOString().slice(0, 10) });
  } catch (e) { return send(res, 502, { ok: false, error: "Could not start your account: " + e.message }); }

  // an address that has signed up before gets its own allowance back, not another free five
  const token = mintToken({ cus: cus.id, name: details.trading_name || details.owner_name || "", reply_to: addr, until: "", plan: "free", inc: FREE_MESSAGES });
  const payload = linkOnePayload(details, "Your app, ready to go. Nothing you have already typed is replaced.");
  const sending = sendingSettings(token, "", details.trading_name || details.owner_name || "");
  if (sending.server) payload.settings.sending = sending;
  const link = setupLink(process.env.APP_URL, payload);
  const out = { ok: true, link, free: FREE_MESSAGES, emailed: false, returning: String((cus.metadata || {}).qc_used || "") !== "" };
  try { const m = welcome(details, link, { free: FREE_MESSAGES, included: Number(process.env.INCLUDED_MESSAGES || 100), subscribe: !!process.env.SUBSCRIBE_URL, support: process.env.SUPPORT_EMAIL || "" });
    await sendEmail(creds(), { to: [addr], reply_to: process.env.SUPPORT_EMAIL || undefined, subject: m.subject, text: m.text }); out.emailed = true;
  } catch (e) { out.email_error = e.message; }
  return send(res, 200, out);
}
