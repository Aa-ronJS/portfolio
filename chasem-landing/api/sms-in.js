// POST /api/sms-in  —  Twilio's inbound webhook for the shared sending number.
//
// Texts go out from our number, so a customer who taps Reply used to reach nobody and got told so. Now the
// reply is traced back: every message the relay sends is written down against its job, so the number that
// replies says who was talking to them. "YES" accepts the quote and answers with a link to pick a start day;
// anything else is passed to the painter, in his own inbox or on his own phone.
//
// Set as the "A message comes in" webhook on the Messaging Service (HTTP POST). Signed requests only.
// TWILIO_INBOUND_URL when the public URL differs from what Vercel sees, because the signature covers the URL.
import { rawBody, twilioSigned, creds, sms, email as sendEmail, signToken } from "./_setup.js";
import { findByPhone, seenInbound, recordInbound, markAccepted, dbConfigured, e164 } from "./_store.js";

export const config = { api: { bodyParser: false } };
// Kept for the case we still cannot place a number: better than silence, and it names no one.
export const REPLY = "This number sends messages for a local business and cannot take replies. Please use the phone number or email in the message you received.";
const YES = /^(y|ye|yes|yep|yeah|yup|ok|okay|sure|accept|accepted|go ahead|go|deal|sounds good|happy|all good)\b[\s.!]*$/i;

const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function twiml(res, status, msg) { res.statusCode = status; res.setHeader("Content-Type", "text/xml"); res.end("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response>" + (msg ? "<Message>" + xml(msg) + "</Message>" : "") + "</Response>"); }
const money = (c) => "$" + (Number(c || 0) / 100).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// The link the customer taps to pick a start day. Signed, so the page needs no session and no lookup to trust it.
export function bookLink(painter, job, secret, site) {
  // signToken gives "qc1.<payload>.<sig>"; the qc1 prefix is implied by the /y/ path, so the link stays short
  // enough not to eat an SMS segment.
  const t = signToken({ v: 1, p: painter, j: job, iat: Math.floor(Date.now() / 1000) }, secret).slice(4);
  return String(site || "https://chasem.app").replace(/\/+$/, "") + "/y/" + t;
}

// Tell the painter, however he can be reached. Never throws: his customer has already been answered.
async function tellPainter(c, hit, text) {
  const out = [];
  if (hit.painter_phone) out.push(sms(c, hit.painter_phone, text).then(() => "sms").catch(() => null));
  if (hit.reply_to) out.push(sendEmail(c, { to: hit.reply_to, subject: text.slice(0, 78), body: text }).then(() => "email").catch(() => null));
  if (!out.length && process.env.INBOUND_FORWARD_TO) out.push(sms(c, process.env.INBOUND_FORWARD_TO, text).then(() => "fallback").catch(() => null));
  return (await Promise.all(out)).filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return twiml(res, 405, "");
  let raw; try { raw = await rawBody(req, 100_000); } catch (e) { return twiml(res, 413, ""); }
  const params = Object.fromEntries(new URLSearchParams(raw.toString("utf8")));
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  if (token) {
    const host = req.headers["x-forwarded-host"] || req.headers.host || "", proto = req.headers["x-forwarded-proto"] || "https";
    const url = process.env.TWILIO_INBOUND_URL || `${proto}://${host}${req.url}`;
    if (!twilioSigned(url, params, req.headers["x-twilio-signature"], token)) return twiml(res, 403, "");
  }
  const from = e164(params.From || ""), body = String(params.Body || "").trim(), sid = String(params.MessageSid || "");

  if (/^(stop|stopall|unsubscribe|cancel|end|quit)$/i.test(body)) { // Twilio's own opt-out handling answers these
    if (dbConfigured()) await recordInbound({ id: sid, from, body, action: "stop" }).catch(() => {});
    return twiml(res, 200, "");
  }
  // Twilio retries a webhook it believes failed, and a second YES must not accept a second time.
  if (dbConfigured() && sid && (await seenInbound(sid).catch(() => false))) return twiml(res, 200, "");

  let hit = null;
  if (dbConfigured()) hit = await findByPhone(from).catch(() => null);
  if (!hit) {
    if (dbConfigured()) await recordInbound({ id: sid, from, body, action: "unmatched" }).catch(() => {});
    if (process.env.INBOUND_FORWARD_TO && from) { try { await sms(creds(), process.env.INBOUND_FORWARD_TO, `Reply from ${from}: ${body.slice(0, 300) || "(no text)"}`); } catch (e) {} }
    return twiml(res, 200, REPLY);
  }

  const c = creds();
  const who = hit.client_name || "Someone";
  const site = process.env.SITE_URL || "https://chasem.app";

  if (YES.test(body) && hit.job_id && hit.status === "quoted") {
    const accepted = await markAccepted(hit.painter_id, hit.job_id).catch(() => false);
    await recordInbound({ id: sid, painter: hit.painter_id, job: hit.job_id, from, body, action: accepted ? "accepted" : "forwarded" }).catch(() => {});
    if (accepted) {
      const link = bookLink(hit.painter_id, hit.job_id, process.env.RELAY_SIGNING_SECRET, site);
      await tellPainter(c, hit, `${who} accepted ${hit.quote_no || "your quote"}${hit.total_cents ? " (" + money(hit.total_cents) + ")" : ""}. They are picking a start day now.`);
      return twiml(res, 200, `Thanks${hit.client_name ? ", " + hit.client_name.split(" ")[0] : ""} — that's accepted. Pick a start day here: ${link}`);
    }
  }

  await recordInbound({ id: sid, painter: hit.painter_id, job: hit.job_id, from, body, action: "forwarded" }).catch(() => {});
  const sent = await tellPainter(c, hit, `${who}${hit.quote_no ? " (" + hit.quote_no + ")" : ""} replied: ${body.slice(0, 300) || "(no text)"}`);
  return twiml(res, 200, sent.length
    ? `Thanks — I've passed that on to ${hit.trading_name || "the business"}. They'll come back to you.`
    : REPLY);
}
