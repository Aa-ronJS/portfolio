// POST /api/sms-in  —  Twilio's inbound webhook for the hosted sending number. Texts the app sends for painters come from
// our number, so a customer who taps Reply reaches nobody. This answers them at once, and copies the reply to Aaron.
// Set it as the "A message comes in" webhook on the Messaging Service (HTTP POST). Signed requests only when
// TWILIO_AUTH_TOKEN is set (it is, for hosted sending). Optional: INBOUND_FORWARD_TO, a mobile that gets a copy of every
// reply ("Reply from +614...: yes go ahead") so it can be passed to the painter; TWILIO_INBOUND_URL when the public URL
// differs from what Vercel sees (a custom domain), because the signature covers the exact URL.
import { rawBody, twilioSigned, creds, sms } from "./_setup.js";

export const config = { api: { bodyParser: false } };
export const REPLY = "This number sends messages for a painting business and cannot take replies. Please use the phone number or email in the message you received.";
const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function twiml(res, status, msg) { res.statusCode = status; res.setHeader("Content-Type", "text/xml"); res.end("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response>" + (msg ? "<Message>" + xml(msg) + "</Message>" : "") + "</Response>"); }

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
  const from = String(params.From || ""), body = String(params.Body || "").trim();
  if (/^(stop|stopall|unsubscribe|cancel|end|quit)$/i.test(body)) return twiml(res, 200, ""); // Twilio's own opt-out handling answers these
  if (process.env.INBOUND_FORWARD_TO && from) { try { await sms(creds(), process.env.INBOUND_FORWARD_TO, `Reply from ${from}: ${body.slice(0, 300) || "(no text)"}`); } catch (e) { /* the customer still gets the answer below */ } }
  return twiml(res, 200, REPLY);
}
