// POST /api/seat  { token }  —  the second phone. Mints a token for seat two of the same account and returns a set-up link to
// open on that phone. Both phones send in the same business name and draw on the same messages; each keeps its own jobs, because
// nothing here stores a painter's work on a server. Re-asking replaces the second phone rather than adding a third, so a lost or
// swapped handset is just this button again.
import { cors, send, readJson, readToken, mintToken, sendingSettings, setupLink, linkOnePayload, stripe, readBalance } from "./_setup.js";

const hits = new Map();
export default async function handler(req, res) {
  const okOrigin = cors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = okOrigin ? 204 : 403; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!okOrigin && req.headers.origin) return send(res, 403, { ok: false, error: "Origin not allowed" });
  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "").split(",")[0].trim(), now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 600000); recent.push(now); hits.set(ip, recent);
  if (recent.length > 10) return send(res, 429, { ok: false, error: "Slow down" });

  let body; try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const p = readToken(body && body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.cus) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });
  if (Number(p.seats || 1) < 2) return send(res, 402, { ok: false, error: "This plan is one phone", seats: 1, needs_upgrade: true });
  if (Number(p.seat || 1) !== 1) return send(res, 403, { ok: false, error: "Set the second phone up from the first one" });

  const token = mintToken({ sub: p.sub, cus: p.cus, name: p.name, reply_to: p.reply_to, until: p.until, plan: p.plan, inc: p.inc, seats: p.seats, seat: 2 });
  const details = {}; if (p.name) details.trading_name = p.name; if (p.reply_to) details.email = p.reply_to;
  const payload = linkOnePayload(details, "The second phone on your plan. Your business name and your messages are shared; jobs stay on the phone they were made on.");
  const sending = sendingSettings(token, p.until || "", p.name || "");
  if (!sending.server) return send(res, 503, { ok: false, error: "Sending is not configured on this site yet" });
  payload.settings.sending = sending;
  try { await stripe("customers/" + encodeURIComponent(p.cus), { "metadata[qc_seat2]": new Date().toISOString().slice(0, 10) }); } catch (e) {}
  const bal = await readBalance(p).catch(() => null);
  return send(res, 200, { ok: true, link: setupLink(process.env.APP_URL, payload), seat: 2, ...(bal ? { included: bal.included + bal.extra, left: bal.left } : {}) });
}
