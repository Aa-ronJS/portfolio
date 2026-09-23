// Shared by stripe-webhook.js, setup-link.js and sms-in.js. Files starting with _ are not routes on Vercel.
import { createHmac, timingSafeEqual } from "node:crypto";

export const f = (...a) => (globalThis.__relayFetch || fetch)(...a);
export function send(res, status, obj) { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); }
// The app lives at go.chasem.app; chasem.app/app/ is where it used to be and still hands painters across. Those three
// are always allowed, whatever ALLOWED_ORIGINS says, so setting that variable can never lock the app out of its own relay.
export const APP_URL = String(process.env.APP_URL || "https://go.chasem.app/").replace(/\/?$/, "/");
export const PRODUCT_ORIGINS = ["https://go.chasem.app", "https://chasem.app", "https://www.chasem.app"];
const ALLOWED = PRODUCT_ORIGINS.concat((process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean));
export function cors(req, res, methods) {
  const origin = req.headers.origin || "";
  const ok = ALLOWED.includes("*") || ALLOWED.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (ok && origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin"); res.setHeader("Access-Control-Allow-Methods", methods || "GET, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "content-type"); res.setHeader("Access-Control-Max-Age", "600");
  return ok;
}
export async function readJson(req, max) { const b = await rawBody(req, max || 100000); if (!b.length) return {}; const j = JSON.parse(b.toString("utf8")); if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error("Bad JSON"); return j; }
export async function rawBody(req, max) { const chunks = []; let n = 0; for await (const c of req) { n += c.length; if (n > (max || 1_000_000)) throw new Error("Body too large"); chunks.push(c); } return Buffer.concat(chunks); }

// ---- the set-up code the app reads at #/setup?d=<code>: "j:" + base64url(JSON), the same shape encodeSetup() writes in the app
export function b64url(buf) { return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
export function setupCode(payload) { return "j:" + b64url(Buffer.from(JSON.stringify(payload), "utf8")); }
export function setupLink(appUrl, payload) { return String(appUrl || APP_URL).replace(/\/?$/, "/") + "#/setup?d=" + setupCode(payload); }

const STATES = { nsw: "NSW", "new south wales": "NSW", vic: "VIC", victoria: "VIC", qld: "QLD", queensland: "QLD", sa: "SA", "south australia": "SA", wa: "WA", "western australia": "WA", tas: "TAS", tasmania: "TAS", act: "ACT", "australian capital territory": "ACT", nt: "NT", "northern territory": "NT" };
export function stateCode(v) { return STATES[String(v || "").trim().toLowerCase()] || ""; }
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

// What a paid Checkout Session tells us about the painter: customer_details (name, email, phone, address). Checkout asks
// him nothing else -- business name, ABN and licence are his to type in the app, once, if he wants them on his quotes --
// but if a Payment Link still carries those custom fields we read them. Anything missing is left out; the app never
// overwrites a filled field with a blank.
export function detailsFromSession(s) {
  const cd = (s && s.customer_details) || {}, addr = cd.address || {}, cf = {};
  (Array.isArray(s && s.custom_fields) ? s.custom_fields : []).forEach((x) => { if (!x || !x.key) return; const v = x.text ? x.text.value : x.dropdown ? x.dropdown.value : x.numeric ? x.numeric.value : ""; if (v != null && String(v).trim()) cf[String(x.key).toLowerCase()] = clean(v, 120); });
  const d = {};
  const tn = cf.trading_name || cf.tradingname || cf.business || cf.business_name || cf.businessname || ""; if (tn) d.trading_name = tn;
  if (cd.name) d.owner_name = clean(cd.name, 80);
  if (cf.abn) d.abn = cf.abn.replace(/[^\d ]/g, "").trim();
  if (cf.licence || cf.license || cf.licenceno) d.licence = cf.licence || cf.license || cf.licenceno;
  if (cd.email) d.email = clean(cd.email, 120);
  if (cd.phone) d.phone = clean(cd.phone, 30).replace(/^\+61 ?/, "0");
  const st = stateCode(addr.state); if (st) d.state = st;
  if (addr.postal_code && /^\d{4}$/.test(String(addr.postal_code).trim())) d.postcode = String(addr.postal_code).trim();
  const line = [addr.line1, addr.line2, addr.city, st, addr.postal_code].filter(Boolean).map((x) => clean(x, 80)).join(" "); if (line) d.address = line;
  return d;
}
export function linkOnePayload(details, note) {
  return { v: 1, settings: { details }, jobs: [], note: note || "Your details and your state's deposit rule, so your first quote already carries your name. Nothing you have already typed is replaced." };
}

// ---- self-service hosted tokens: signed, not stored. "qc1.<base64url payload>.<base64url HMAC-SHA256>"
// Minted by the Stripe webhook when a subscription starts, refreshed by /api/renew while the subscription is live.
// The relay trusts the signature, so no database, no per-painter env var and nothing for a human to paste.
export function signToken(payload, secret) {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return "qc1." + body + "." + b64url(createHmac("sha256", secret || "").update(body).digest());
}
export function readToken(token, secret) {
  if (typeof token !== "string" || token.slice(0, 4) !== "qc1." || !secret) return null;
  const parts = token.split("."); if (parts.length !== 3) return null;
  const want = b64url(createHmac("sha256", secret).update(parts[1]).digest());
  const a = Buffer.from(parts[2]), b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { const p = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")); return p && typeof p === "object" && p.v === 1 ? p : null; } catch { return null; }
}
// A token lasts to the end of the paid period plus a few days' grace, so a renewal that is a day late never stops the chasing.
export const GRACE_DAYS = 5;
export function untilFor(periodEndSec) {
  const ms = (Number(periodEndSec) > 0 ? Number(periodEndSec) * 1000 : Date.now() + 30 * 86400000) + GRACE_DAYS * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}
// The token carries the plan and what it includes. What has been USED lives on the Stripe customer, so there is still no
// database: Stripe holds the money, the email and the counter, and the signature holds everything else.
//   plan "free" = the five messages anyone gets for signing up, no period, no reset.
//   plan "paid" = INCLUDED_MESSAGES a month, reset when the billing period rolls over, plus any top-up packs bought.
export function mintToken(o) {
  return signToken({ v: 1, sub: o.sub || "", cus: o.cus || "", name: o.name || "", reply_to: o.reply_to || "", until: o.until || "",
    plan: o.plan === "paid" ? "paid" : "free", inc: Number(o.inc) > 0 ? Math.floor(Number(o.inc)) : (o.plan === "paid" ? INCLUDED : FREE_MESSAGES),
    seats: Number(o.seats) > 1 ? Math.floor(Number(o.seats)) : 1, seat: Number(o.seat) > 1 ? Math.floor(Number(o.seat)) : 1,
    iat: Math.floor(Date.now() / 1000) }, process.env.RELAY_SIGNING_SECRET);
}
// Two phones on one account: both tokens point at the same Stripe customer, so they draw on the same messages and both send in
// the same business name. Jobs stay on each phone, because nothing here holds a painter's work on a server.
export const INCLUDED2 = Number(process.env.INCLUDED_MESSAGES_TWO || 250);
export function planOf(session, sub) {
  const pick = (o) => String(((o && o.metadata) || {}).qc_plan || "").toLowerCase();
  const two = [pick(session), pick(sub), pick(sub && sub.plan), pick((((sub || {}).items || {}).data || [])[0]), pick((((sub || {}).items || {}).data || [])[0] && (((sub || {}).items || {}).data || [])[0].price)].indexOf("two") >= 0;
  return two ? { seats: 2, inc: INCLUDED2 } : { seats: 1, inc: INCLUDED };
}
export const FREE_MESSAGES = Number(process.env.FREE_MESSAGES || 12);  // three whole jobs: a job is four messages
export const INCLUDED = Number(process.env.INCLUDED_MESSAGES || 150);
export const TOPUP_MESSAGES = Number(process.env.TOPUP_MESSAGES || 100);
export const TOPUP_PRICE = Number(process.env.TOPUP_PRICE || 35);      // A$ for a pack, charged to the card already on file
export const AUTO_TOPUP_CAP = Number(process.env.AUTO_TOPUP_CAP || 3); // most packs we will ever charge in one period without being asked again

// Buy a pack against the card Stripe already holds, with no browser, no redirect and nothing for the painter to type.
// Returns { ok, messages, extra } or { ok:false, needs_card:true } when the card needs the painter in front of it (SCA, expiry, no card).
export async function chargeTopUp(p, opts) {
  opts = opts || {};
  if (!p || !p.cus) return { ok: false, error: "No account on that token" };
  let pm = "";
  try {
    if (p.sub) { const sub = await stripe("subscriptions/" + encodeURIComponent(p.sub)); pm = sub.default_payment_method || ""; }
    if (!pm) { const cus = await stripe("customers/" + encodeURIComponent(p.cus)); pm = (cus.invoice_settings && cus.invoice_settings.default_payment_method) || cus.default_source || ""; }
  } catch (e) { return { ok: false, error: e.message }; }
  if (!pm) return { ok: false, needs_card: true, error: "No card on file" };
  let pi;
  try {
    pi = await stripe("payment_intents", {
      amount: String(Math.round(TOPUP_PRICE * 100)), currency: "aud", customer: p.cus, payment_method: pm,
      off_session: "true", confirm: "true", description: TOPUP_MESSAGES + " messages, Chasem",
      "metadata[qc]": "topup", "metadata[qc_messages]": String(TOPUP_MESSAGES), "metadata[qc_auto]": opts.auto ? "1" : "0",
    });
  } catch (e) { return { ok: false, needs_card: true, error: e.message }; }
  if (pi.status !== "succeeded") return { ok: false, needs_card: true, error: "That card needs you: " + pi.status };
  const credited = await creditMessages(p.cus, TOPUP_MESSAGES, opts.auto).catch(() => null);
  return { ok: true, messages: TOPUP_MESSAGES, charged: TOPUP_PRICE, ...(credited || {}) };
}
// put messages on an account, in this period if it has started, otherwise waiting for the one it was bought for
export async function creditMessages(cus, n, auto) {
  const c = await stripe("customers/" + encodeURIComponent(cus)), m = c.metadata || {};
  const period = new Date().toISOString().slice(0, 7), same = String(m.qc_period || "") === period;
  const extra = Math.max(0, parseInt(same ? m.qc_extra : m.qc_extra_next, 10) || 0) + n;
  const form = same ? { "metadata[qc_extra]": String(extra) } : { "metadata[qc_extra_next]": String(extra) };
  if (auto) form["metadata[qc_auto_count]"] = String(Math.max(0, parseInt(m.qc_auto_count, 10) || 0) + 1);
  await stripe("customers/" + encodeURIComponent(cus), form);
  return { extra };
}
export async function autoTopUpOn(cus) {
  try { const c = await stripe("customers/" + encodeURIComponent(cus)), m = c.metadata || {};
    const period = new Date().toISOString().slice(0, 7), same = String(m.qc_period || "") === period;
    const used = same ? Math.max(0, parseInt(m.qc_auto_count, 10) || 0) : 0;
    return String(m.qc_auto || "") === "1" && used < AUTO_TOPUP_CAP;
  } catch (e) { return false; }
}

// ---- the message counter, kept in the Stripe customer's metadata: qc_used, qc_period, qc_extra. Three keys, none of them grow.
export function periodOf(p) { return p && p.plan === "paid" ? new Date().toISOString().slice(0, 7) : "once"; }
export async function readBalance(p) {
  const inc = Number(p.inc) > 0 ? Number(p.inc) : 0, period = periodOf(p);
  if (!p.cus) return { included: inc, used: 0, extra: 0, left: inc, period, counted: false };
  const cus = await stripe("customers/" + encodeURIComponent(p.cus));
  const m = cus.metadata || {};
  const same = String(m.qc_period || "") === period;
  const used = same ? Math.max(0, parseInt(m.qc_used, 10) || 0) : 0;
  const extra = same ? Math.max(0, parseInt(m.qc_extra, 10) || 0) : Math.max(0, parseInt(m.qc_extra_next, 10) || 0);
  return { included: inc, used, extra, left: Math.max(0, inc + extra - used), period, counted: true, email: cus.email || "" };
}
// n is +1 to spend a message or -1 to give one back when a scheduled reminder is cancelled before it goes.
export async function spend(p, n) {
  if (!p.cus) return null;
  const b = await readBalance(p);
  const used = Math.max(0, b.used + n);
  await stripe("customers/" + encodeURIComponent(p.cus), { "metadata[qc_used]": String(used), "metadata[qc_period]": b.period, "metadata[qc_extra]": String(b.extra), "metadata[qc_extra_next]": "" });
  return { ...b, used, left: Math.max(0, b.included + b.extra - used) };
}
export const OUT_OF_MESSAGES = "You are out of messages";

// ---- Stripe REST, form-encoded, no SDK
// `account` acts on a connected account (Stripe-Account), which is how a painter's own prices, payment links
// and payouts are made: his money never passes through ours.
export async function stripe(path, form, method, account) {
  const key = process.env.STRIPE_SECRET_KEY; if (!key) throw new Error("Not set up: STRIPE_SECRET_KEY");
  const r = await f("https://api.stripe.com/v1/" + path, {
    method: method || (form ? "POST" : "GET"),
    headers: Object.assign({ Authorization: "Bearer " + key }, account ? { "Stripe-Account": String(account) } : {}, form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || "Stripe " + r.status);
  return j;
}
export const LIVE_STATUS = ["active", "trialing", "past_due"];
// what the app is given so one tap turns the chasing on, with nothing to open and nobody to ask
export function sendingSettings(token, until, name, relayUrl) {
  return { server: relayUrl || process.env.RELAY_URL || "https://chasem.app/api/msg", token: token, server_has_creds: true, hosted: true, hosted_until: until, hosted_name: name || "" };
}

// ---- Stripe webhook signature: header "t=<unix>,v1=<hex>[,v1=<hex>]", signed payload "<t>.<raw body>", HMAC-SHA256 with the endpoint secret
export function stripeSigned(rawBuf, header, secret, tolSec, now) {
  if (!secret || !header) return false;
  const parts = Object.create(null); String(header).split(",").forEach((kv) => { const i = kv.indexOf("="); if (i < 0) return; const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim(); (parts[k] = parts[k] || []).push(v); });
  const t = parts.t && parts.t[0]; if (!t || !/^\d+$/.test(t)) return false;
  if (Math.abs(((now || Date.now()) / 1000) - Number(t)) > (tolSec || 300)) return false;
  const exp = createHmac("sha256", secret).update(t + ".").update(rawBuf).digest();
  return (parts.v1 || []).some((v) => { try { const got = Buffer.from(v, "hex"); return got.length === exp.length && timingSafeEqual(got, exp); } catch (e) { return false; } });
}
// ---- Twilio request signature: base64(HMAC-SHA1(url + params sorted by key with values appended, auth token))
export function twilioSigned(url, params, header, token) {
  if (!token || !header) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const exp = createHmac("sha1", token).update(data).digest("base64");
  try { const a = Buffer.from(exp), b = Buffer.from(String(header)); return a.length === b.length && timingSafeEqual(a, b); } catch (e) { return false; }
}

// ---- send with this server's own accounts (never the request's)
export function creds() {
  return { twilioSid: process.env.TWILIO_ACCOUNT_SID || "", twilioToken: process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_API_SECRET || "", twilioApiKey: process.env.TWILIO_API_KEY || "", twilioService: process.env.TWILIO_MESSAGING_SERVICE_SID || "", twilioFrom: process.env.TWILIO_FROM || "", resendKey: process.env.RESEND_API_KEY || "", resendFrom: process.env.RESEND_FROM || "" };
}
export function e164(to) { let s = String(to || "").replace(/[^\d+]/g, ""); if (s.startsWith("0011")) s = "+" + s.slice(4); if (s.startsWith("+610")) s = "+61" + s.slice(4); if (s.startsWith("0")) s = "+61" + s.slice(1); if (!s.startsWith("+")) s = "+" + s; return s; }
export async function sms(c, to, body) {
  if (!c.twilioSid || !c.twilioToken || !(c.twilioService || c.twilioFrom)) throw new Error("Twilio is not set up");
  const user = /^SK/.test(c.twilioApiKey || "") ? c.twilioApiKey : c.twilioSid;
  const params = { To: e164(to), Body: String(body).slice(0, 1000) }; if (c.twilioService) params.MessagingServiceSid = c.twilioService; else params.From = c.twilioFrom;
  const r = await f(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.twilioSid)}/Messages.json`, { method: "POST", headers: { Authorization: "Basic " + Buffer.from(user + ":" + c.twilioToken).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params).toString() });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || "Twilio " + r.status); return j;
}
export async function email(c, msg) {
  if (!c.resendKey || !c.resendFrom) throw new Error("Resend is not set up");
  const r = await f("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + c.resendKey, "Content-Type": "application/json" }, body: JSON.stringify({ from: c.resendFrom, ...msg }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || "Resend " + r.status); return j;
}
