// POST /api/msg  —  the sending relay for the Quote and Chase phone app.
//
// Twilio holds scheduled SMS (ScheduleType=fixed, up to 35 days ahead, needs a Messaging Service SID) and
// Resend holds scheduled email (scheduled_at, up to 30 days ahead), so this relay keeps no data at all.
//
// Set RELAY_TOKEN to a long random string and put the same string in the app (Set-up, Sending): without it,
// anyone who guesses the URL can send messages on your account. Credentials come from environment variables when you run your own copy (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_MESSAGING_SERVICE_SID, RESEND_API_KEY, RESEND_FROM), or from the request body (fields under "creds")
// when ALLOW_CLIENT_CREDS=1, in which case they are used for that one call and never stored or logged.
//
// Actions (JSON body):
//   { action: "test",     channel: "sms"|"email", to }                                  -> sends a short test message
//   { action: "send",     channel, to, body, subject?, html?, attachments?: [{ filename, content(base64) }] }
//   { action: "schedule", channel, to, body, subject?, send_at: ISO string, ref? }        -> { id }
//   { action: "cancel",   channel, id }                                                   -> { cancelled: true }
// Every action returns { ok: true, ... } or { ok: false, error }.

const ALLOWED = (process.env.ALLOWED_ORIGINS || "https://aa-ronjs.github.io,https://aaronsteele.vercel.app").split(",").map((s) => s.trim()).filter(Boolean);
const PER_IP_LIMIT = Number(process.env.MSG_PER_IP_LIMIT || 60); // per 10 minutes per instance
const buckets = new Map();

function cors(req, res) {
  const origin = req.headers.origin || "";
  const ok = ALLOWED.includes("*") || ALLOWED.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (ok && origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Max-Age", "600");
  return ok;
}
function limited(ip) { const now = Date.now(), b = buckets.get(ip) || []; const recent = b.filter((t) => now - t < 600000); recent.push(now); buckets.set(ip, recent); return recent.length > PER_IP_LIMIT; }
async function readJson(req) { if (req.body && typeof req.body === "object") return req.body; const chunks = []; for await (const c of req) chunks.push(c); const raw = Buffer.concat(chunks).toString("utf8"); return raw ? JSON.parse(raw) : {}; }
function send(res, status, obj) { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); }

function creds(body) {
  const c = body.creds && process.env.ALLOW_CLIENT_CREDS === "1" ? body.creds : {};
  return {
    twilioSid: process.env.TWILIO_ACCOUNT_SID || c.twilio_sid || "", twilioToken: process.env.TWILIO_AUTH_TOKEN || c.twilio_token || "",
    twilioService: process.env.TWILIO_MESSAGING_SERVICE_SID || c.twilio_service || "", twilioFrom: process.env.TWILIO_FROM || c.twilio_from || "",
    resendKey: process.env.RESEND_API_KEY || c.resend_key || "", resendFrom: process.env.RESEND_FROM || c.resend_from || "",
  };
}
const f = (...a) => (globalThis.__relayFetch || fetch)(...a);

// ---------- Twilio
function e164(to) { let s = String(to || "").replace(/[^\d+]/g, ""); if (s.startsWith("0011")) s = "+" + s.slice(4); if (s.startsWith("+610")) s = "+61" + s.slice(4); if (s.startsWith("0")) s = "+61" + s.slice(1); if (!s.startsWith("+")) s = "+" + s; return s; }
async function twilio(c, path, params) {
  if (!c.twilioSid || !c.twilioToken) throw new Error("Twilio is not set up (account SID and auth token)");
  const r = await f(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.twilioSid)}/${path}`, {
    method: "POST", headers: { Authorization: "Basic " + Buffer.from(c.twilioSid + ":" + c.twilioToken).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || `Twilio error ${r.status}`);
  return j;
}
async function smsSend(c, to, body) { const p = { To: e164(to), Body: body }; if (c.twilioService) p.MessagingServiceSid = c.twilioService; else if (c.twilioFrom) p.From = c.twilioFrom; else throw new Error("Twilio needs a Messaging Service SID or a From number"); const j = await twilio(c, "Messages.json", p); return { id: j.sid, status: j.status }; }
async function smsSchedule(c, to, body, sendAt) {
  if (!c.twilioService) throw new Error("Scheduled SMS needs a Twilio Messaging Service SID");
  const when = new Date(sendAt); const minAhead = Date.now() + 16 * 60000; // Twilio wants at least 15 minutes ahead
  if (isNaN(when.getTime())) throw new Error("Bad send_at"); if (when.getTime() > Date.now() + 35 * 86400000) throw new Error("Twilio schedules at most 35 days ahead");
  if (when.getTime() < minAhead) return smsSend(c, to, body);
  const j = await twilio(c, "Messages.json", { To: e164(to), Body: body, MessagingServiceSid: c.twilioService, ScheduleType: "fixed", SendAt: when.toISOString() });
  return { id: j.sid, status: j.status, send_at: when.toISOString() };
}
async function smsCancel(c, id) { await twilio(c, `Messages/${encodeURIComponent(id)}.json`, { Status: "canceled" }); return { cancelled: true }; }

// ---------- Resend
async function resend(c, method, path, payload) {
  if (!c.resendKey) throw new Error("Resend is not set up (API key)");
  const r = await f("https://api.resend.com" + path, { method, headers: { Authorization: "Bearer " + c.resendKey, "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.error || `Resend error ${r.status}`);
  return j;
}
function emailPayload(c, b) {
  if (!c.resendKey) throw new Error("Resend is not set up (API key)"); if (!c.resendFrom) throw new Error("Resend needs a From address on a verified domain");
  const p = { from: c.resendFrom, to: [String(b.to)], subject: b.subject || "Message", text: b.body || "" };
  if (b.html) p.html = b.html; if (b.reply_to) p.reply_to = b.reply_to;
  if (Array.isArray(b.attachments) && b.attachments.length) { const list = b.attachments.filter((a) => a && typeof a === "object"); if (list.length > 3) throw new Error("At most 3 attachments"); p.attachments = list.map((a) => ({ filename: String(a.filename || "file.pdf").slice(0, 80), content: String(a.content || "") })); }
  return p;
}
async function emailSend(c, b) { const j = await resend(c, "POST", "/emails", emailPayload(c, b)); return { id: j.id }; }
async function emailSchedule(c, b) {
  const when = new Date(b.send_at); if (isNaN(when.getTime())) throw new Error("Bad send_at"); if (when.getTime() > Date.now() + 30 * 86400000) throw new Error("Resend schedules at most 30 days ahead");
  if (when.getTime() < Date.now() + 60000) return emailSend(c, b);
  const p = emailPayload(c, b); p.scheduled_at = when.toISOString(); const j = await resend(c, "POST", "/emails", p); return { id: j.id, send_at: when.toISOString() };
}
async function emailCancel(c, id) { await resend(c, "POST", `/emails/${encodeURIComponent(id)}/cancel`); return { cancelled: true }; }

export default async function handler(req, res) {
  const allowed = cors(req, res);
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!allowed) return send(res, 403, { ok: false, error: "Origin not allowed" });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || (req.socket && req.socket.remoteAddress) || "?";
  if (limited(ip)) return send(res, 429, { ok: false, error: "Slow down" });
  let body; try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return send(res, 400, { ok: false, error: "Bad JSON" });
  if (process.env.RELAY_TOKEN && body.token !== process.env.RELAY_TOKEN) return send(res, 401, { ok: false, error: "Relay token missing or wrong" });
  if (body.to != null) body.to = String(body.to).trim();
  const c = creds(body), ch = String(body.channel || "").toLowerCase() === "email" ? "email" : "sms";
  try {
    if (body.action === "test") { const r = ch === "sms" ? await smsSend(c, body.to, "Quote and Chase test: SMS sending works.") : await emailSend(c, { to: body.to, subject: "Quote and Chase test", body: "Email sending works." }); return send(res, 200, { ok: true, ...r }); }
    if (body.action === "send") { if (!body.to || (ch === "sms" ? !body.body : (!body.body && !body.html))) throw new Error("to and body are required"); if (String(body.body || "").length > 1600) throw new Error("Message too long"); const r = ch === "sms" ? await smsSend(c, body.to, body.body) : await emailSend(c, body); return send(res, 200, { ok: true, ...r }); }
    if (body.action === "schedule") { if (!body.to || !body.body || !body.send_at) throw new Error("to, body and send_at are required"); if (String(body.body).length > 1600) throw new Error("Message too long"); const r = ch === "sms" ? await smsSchedule(c, body.to, body.body, body.send_at) : await emailSchedule(c, body); return send(res, 200, { ok: true, ...r }); }
    if (body.action === "cancel") { if (!body.id) throw new Error("id is required"); const r = ch === "sms" ? await smsCancel(c, body.id) : await emailCancel(c, body.id); return send(res, 200, { ok: true, ...r }); }
    if (body.action === "ping") return send(res, 200, { ok: true, sms: !!(c.twilioSid && c.twilioToken && (c.twilioService || c.twilioFrom)), sms_schedule: !!(c.twilioSid && c.twilioToken && c.twilioService), email: !!(c.resendKey && c.resendFrom), client_creds: process.env.ALLOW_CLIENT_CREDS === "1", token_required: !!process.env.RELAY_TOKEN });
    return send(res, 400, { ok: false, error: "Unknown action" });
  } catch (e) { return send(res, 400, { ok: false, error: e.message || String(e) }); }
}
