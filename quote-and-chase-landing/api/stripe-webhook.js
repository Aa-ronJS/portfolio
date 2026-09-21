// POST /api/stripe-webhook  —  the minute a painter pays for the Driveway Quote Hour, link one is built from the Checkout
// Session (name, phone, email, state, plus the Payment Link's custom fields trading_name / abn / licence) and emailed to him,
// and Aaron gets a text. No database: Stripe retries produce the same link, and a duplicate email is harmless.
//
// Set-up (once, in Stripe): a Payment Link for the hour that collects phone number and billing address, with three
// custom text fields keyed trading_name, abn and licence; success URL <site>/booked?session={CHECKOUT_SESSION_ID}.
// A webhook endpoint at <this site>/api/stripe-webhook for checkout.session.completed and
// checkout.session.async_payment_succeeded; its signing secret goes in STRIPE_WEBHOOK_SECRET.
// Also: APP_URL (the app's address; default the GitHub Pages copy), BOOKING_URL (calendar, optional; keep it the same as config.js),
// OWNER_MOBILE (a text on every payment; with it set the email promises the call "this evening if you paid before 6pm on a weekday",
// SAME_EVENING_CALL=0 turns that sentence off), OWNER_EMAIL (Reply-To on the link email and a copy of it), RESEND_API_KEY and RESEND_FROM.
import { rawBody, send, stripeSigned, detailsFromSession, linkOnePayload, setupLink, creds, sms, email } from "./_setup.js";

export const config = { api: { bodyParser: false } };
const done = new Map(); // event ids seen by this instance

export function linkEmail(details, link, env) {
  const first = String(details.owner_name || "").trim().split(/\s+/)[0] || "there";
  const book = env.BOOKING_URL ? `Pick your hour here, the next free evening is shown: ${env.BOOKING_URL}` : "Reply to this email with three evenings that suit you and I confirm one within a business day.";
  const text = `Hi ${first},

Paid, thank you. One tap makes the app yours: open this on the phone you quote from, and tap Load.

${link}

It puts your name${details.trading_name ? ", " + details.trading_name : ""}${details.abn ? ", your ABN" : ""}${details.licence ? ", your licence" : ""} and your state's deposit rule on every quote from now. Your prices, your open jobs and your logo come after we talk.

${book}

I ring the number on your receipt ${env.SAME_EVENING ? "this evening if you paid before 6pm on a weekday, otherwise the next business day" : "the next business day"}, for about fifteen minutes: what you charge, who owes you money right now, and one job you are about to quote. Rather do it now? Reply with a time and I ring then.

Aaron`;
  return { subject: "Your Driveway Quote Hour: one tap makes the app yours", text };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  let raw; try { raw = await rawBody(req, 2_000_000); } catch (e) { return send(res, 413, { ok: false, error: e.message }); }
  if (!stripeSigned(raw, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET)) return send(res, 400, { ok: false, error: "Bad signature" });
  let ev; try { ev = JSON.parse(raw.toString("utf8")); } catch (e) { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const type = ev && ev.type, s = ev && ev.data && ev.data.object;
  if (type !== "checkout.session.completed" && type !== "checkout.session.async_payment_succeeded") return send(res, 200, { ok: true, ignored: type });
  if (!s || s.payment_status !== "paid") return send(res, 200, { ok: true, ignored: "not paid yet" });
  if (ev.id && done.has(ev.id)) return send(res, 200, { ok: true, duplicate: true });
  if (ev.id) { done.set(ev.id, 1); while (done.size > 500) done.delete(done.keys().next().value); }
  const details = detailsFromSession(s), link = setupLink(process.env.APP_URL, linkOnePayload(details));
  const out = { ok: true, emailed: false, texted: false, link_length: link.length };
  const c = creds(), env = { BOOKING_URL: process.env.BOOKING_URL || "", SAME_EVENING: !!process.env.OWNER_MOBILE && process.env.SAME_EVENING_CALL !== "0" };
  if (details.email) { try { const m = linkEmail(details, link, env); await email(c, { to: [details.email], reply_to: process.env.OWNER_EMAIL || undefined, subject: m.subject, text: m.text, ...(process.env.OWNER_EMAIL ? { bcc: [process.env.OWNER_EMAIL] } : {}) }); out.emailed = true; } catch (e) { out.email_error = e.message; } }
  if (process.env.OWNER_MOBILE) { try { await sms(c, process.env.OWNER_MOBILE, `PAID: ${details.trading_name || details.owner_name || "a painter"}${details.state ? ", " + details.state : ""}${details.phone ? ", " + details.phone : ""}${details.email ? ", " + details.email : ""}. Link one ${out.emailed ? "emailed" : "NOT emailed: " + (out.email_error || "no email")}.`); out.texted = true; } catch (e) { out.sms_error = e.message; } }
  return send(res, 200, out);
}
