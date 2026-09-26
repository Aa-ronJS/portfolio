// POST /api/stripe-webhook  —  the whole sign-up, with nobody in the loop.
//
// A painter subscribes on the site. Stripe tells us here. We mint a signed sending token (no database, no env var to edit),
// build one link that carries his business details and his sending switched on, and email it to him. He taps it on his phone,
// taps Load, and his follow-ups send themselves. Renewals and cancellations need nothing from us either: the app checks with
// /api/renew, and a cancelled subscription stops when its token runs out a few days after the period he paid for.
//
// Stripe set-up (once): a Payment Link in subscription mode that collects name, email, phone and billing address and nothing
// else; success URL <site>/welcome?session={CHECKOUT_SESSION_ID}. A webhook endpoint
// here for checkout.session.completed and checkout.session.async_payment_succeeded; its signing secret in STRIPE_WEBHOOK_SECRET.
// Env: STRIPE_SECRET_KEY, RELAY_SIGNING_SECRET, RELAY_URL (<site>/api/msg), APP_URL, SUPPORT_EMAIL, optional OWNER_MOBILE and
// OWNER_EMAIL (a heads-up text and a copy of the email; neither is needed for the painter to be up and running).
import { rawBody, send, stripeSigned, detailsFromSession, linkOnePayload, setupLink, creds, sms, email, mintToken, untilFor, sendingSettings, stripe, INCLUDED, TOPUP_MESSAGES, readBalance, planOf } from "./_setup.js";

export const config = { api: { bodyParser: false } };
const done = new Map(); // event ids this warm instance has already handled; Stripe retries are harmless anyway

export function welcomeEmail(details, link, env) {
  const first = String(details.owner_name || "").trim().split(/\s+/)[0] || "there";
  const help = env.SUPPORT_EMAIL ? `Anything at all, email ${env.SUPPORT_EMAIL} and a person answers.` : "";
  // The app itself asks for anything it still needs (day rate, how he gets paid) before it lets him quote, so
  // this says what the link does and gives one way out if it will not open. Nothing else.
  const app = String(env.APP_URL || "https://chasem.app/app/").replace(/^https?:\/\//, "");
  const text = `Hi ${first},

You're on. Open this on the phone you quote from and tap Load:

${link}

Your business details go on every quote, and your follow-ups are on: quotes and invoices chased by text and email in your name, without you.

If the link will not open, go to ${app} and sign in with this email address instead.

The app asks for anything else it needs. Pause, change the wording or cancel any time in Set-up.${help ? "\n\n" + help : ""}

Chasem`;
  return { subject: "Your chasing is on: one tap to set up the app", text };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  let raw; try { raw = await rawBody(req, 2000000); } catch (e) { return send(res, 413, { ok: false, error: e.message }); }
  if (!stripeSigned(raw, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET)) return send(res, 400, { ok: false, error: "Bad signature" });
  let ev; try { ev = JSON.parse(raw.toString("utf8")); } catch (e) { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const type = ev && ev.type, s = ev && ev.data && ev.data.object;
  if (type !== "checkout.session.completed" && type !== "checkout.session.async_payment_succeeded") return send(res, 200, { ok: true, ignored: type });
  if (!s || (s.payment_status !== "paid" && s.payment_status !== "no_payment_required")) return send(res, 200, { ok: true, ignored: "not paid yet" }); // a bank debit still clearing comes back later as async_payment_succeeded
  if (ev.id && done.has(ev.id)) return send(res, 200, { ok: true, duplicate: true });
  if (ev.id) { done.set(ev.id, 1); while (done.size > 500) done.delete(done.keys().next().value); }

  const details = detailsFromSession(s), out = { ok: true, emailed: false, texted: false, hosted: false };
  // a top-up pack: no new token, just more messages on the account the app is already using
  if (!s.subscription && String((s.metadata || {}).qc || "") === "topup") {
    const cid = s.client_reference_id || s.customer;
    if (!cid) return send(res, 200, { ok: true, ignored: "top-up with no account to credit" });
    try {
      const cus = await stripe("customers/" + encodeURIComponent(cid)), m = cus.metadata || {};
      const period = new Date().toISOString().slice(0, 7), same = String(m.qc_period || "") === period;
      const extra = Math.max(0, parseInt(same ? m.qc_extra : m.qc_extra_next, 10) || 0) + TOPUP_MESSAGES;
      await stripe("customers/" + encodeURIComponent(cid), same ? { "metadata[qc_extra]": String(extra) } : { "metadata[qc_extra_next]": String(extra) });
      return send(res, 200, { ok: true, topped_up: TOPUP_MESSAGES, extra });
    } catch (e) { return send(res, 200, { ok: false, error: e.message }); }
  }
  // subscription: mint the sending token so the one link turns the chasing on as well as filling in his details
  let sending = null;
  if (s.subscription) {
    try {
      const sub = typeof s.subscription === "string" ? await stripe("subscriptions/" + encodeURIComponent(s.subscription)) : s.subscription;
      const item = (sub.items && sub.items.data && sub.items.data[0]) || {};
      const until = untilFor(sub.current_period_end || item.current_period_end);
      const plan = planOf(s, sub);
      const token = mintToken({ sub: sub.id, cus: sub.customer || s.customer, name: details.trading_name || details.owner_name || "", reply_to: details.email || "", until: until, plan: "paid", inc: plan.inc, seats: plan.seats, seat: 1 });
      out.seats = plan.seats; out.included = plan.inc;
      // a painter who started on the free five keeps any top-up he had bought, and his old record is marked so the list stays clean
      if (s.client_reference_id && s.client_reference_id !== (sub.customer || s.customer)) { try { await stripe("customers/" + encodeURIComponent(s.client_reference_id), { "metadata[qc_upgraded_to]": String(sub.customer || s.customer) }); } catch (e) {} }
      sending = sendingSettings(token, until, details.trading_name || details.owner_name || "");
      out.hosted = !!sending.server; out.until = until;
      if (!sending.server) out.warning = "RELAY_URL is not set, so the link cannot switch sending on";
    } catch (e) { out.token_error = e.message; }
  }
  const payload = linkOnePayload(details, sending ? "You're on. This loads your details and switches your follow-ups on. Nothing here replaces anything you have already typed." : "");
  if (sending && sending.server) payload.settings.sending = sending;
  const link = setupLink(process.env.APP_URL, payload);
  out.link_length = link.length;
  const c = creds(), env = { SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL || "", APP_URL: process.env.APP_URL || "" };
  if (details.email) { try { const m = welcomeEmail(details, link, env); await email(c, { to: [details.email], reply_to: process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL || undefined, subject: m.subject, text: m.text, ...(process.env.OWNER_EMAIL ? { bcc: [process.env.OWNER_EMAIL] } : {}) }); out.emailed = true; } catch (e) { out.email_error = e.message; } }
  if (details.phone) { try { await sms(c, details.phone, `Chasem: you're on. The set-up link is in your email (${details.email || "the address you paid with"}). Open it on the phone you quote from and tap Load.`); out.texted = true; } catch (e) { out.sms_error = e.message; } }
  if (process.env.OWNER_MOBILE) { try { await sms(c, process.env.OWNER_MOBILE, `SIGN-UP: ${details.trading_name || details.owner_name || "someone"}${details.state ? ", " + details.state : ""}. Link ${out.emailed ? "emailed" : "NOT emailed: " + (out.email_error || "no email")}, sending ${out.hosted ? "on" : "OFF"}.`); } catch (e) {} }
  return send(res, 200, out);
}
