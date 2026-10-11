// POST /api/auth { action: "start", email, via?, source? }   a six-digit code goes to that inbox
//                { action: "check", email, code }              the right code signs in (and creates the account on first use)
//                { action: "logout" }
// GET  /api/auth                                               who am I, what the server has set up
//
// The code is stored as an HMAC, lasts ten minutes, dies after five wrong guesses, and the row is deleted when it
// works. Five codes an hour per address, thirty per IP. Without an email provider outside production, the code is
// returned in the response so local use works.
import { send, readJson, owner, signSession, setSessionCookie, configured, place, norm, validEmail, isAdmin } from "./_http.js";
import { q, dbConfigured, ensureSchema } from "./_db.js";
import { aiOn } from "./_ai.js";
import { sendEmail, emailOn, templates } from "./_email.js";
import { stripeOn } from "./_stripe.js";
import * as S from "./_store.js";
import { createHmac, timingSafeEqual, randomInt } from "node:crypto";

const CODE_MIN = 10, MAX_TRIES = 5, PER_EMAIL_HOUR = 5, PER_IP_HOUR = Number(process.env.LOGIN_PER_IP_HOUR || 30);
const hash = (email, code) => createHmac("sha256", process.env.SESSION_SECRET || "").update(email + ":" + code).digest("base64");
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

async function bucket(name, max) {
  const r = await q(`insert into login_bucket (bucket, window_at, n) values ($1, now(), 1)
    on conflict (bucket) do update set n = case when login_bucket.window_at < now() - interval '1 hour' then 1 else login_bucket.n + 1 end,
    window_at = case when login_bucket.window_at < now() - interval '1 hour' then now() else login_bucket.window_at end returning n`, [name]);
  return r.rows[0].n <= max;
}

export default async function handler(req, res) {
  await ensureSchema();
  if (req.method === "GET") { const s = owner(req); return send(res, 200, { ok: true, loggedIn: !!s, email: s ? s.email : "", admin: !!(s && s.admin), configured: configured() && dbConfigured(), ai: aiOn(), stripe: stripeOn(), email: emailOn() }); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST" });
  let b; try { b = await readJson(req, 4000); } catch (e) { return send(res, 400, { ok: false, error: e.message }); }
  if (b.action === "logout") { setSessionCookie(res, "", true); return send(res, 200, { ok: true }); }
  if (!configured() || !dbConfigured()) return send(res, 503, { ok: false, error: "Set SESSION_SECRET and DATABASE_URL first" });
  const email = norm(b.email);
  if (!validEmail(email)) return send(res, 400, { ok: false, error: "Enter a valid email address" });

  if (b.action === "start") {
    if (!(await bucket("ip:" + (place(req) || "unknown"), PER_IP_HOUR))) return send(res, 429, { ok: false, error: "Too many codes requested. Try again in an hour." });
    const row = (await q("select sent_at, sent_count from signin where email=$1", [email])).rows[0];
    const within = row && Date.now() - new Date(row.sent_at).getTime() < 3600_000;
    if (within && row.sent_count >= PER_EMAIL_HOUR) return send(res, 429, { ok: false, error: "Too many codes for that address. Try again in an hour." });
    const code = String(randomInt(0, 1000000)).padStart(6, "0");
    await q(`insert into signin (email, code_hash, expires_at, tries, sent_at, sent_count) values ($1,$2, now() + ($3 || ' minutes')::interval, 0, now(), 1)
      on conflict (email) do update set code_hash=excluded.code_hash, expires_at=excluded.expires_at, tries=0,
      sent_count = case when signin.sent_at < now() - interval '1 hour' then 1 else signin.sent_count + 1 end,
      sent_at = case when signin.sent_at < now() - interval '1 hour' then now() else signin.sent_at end`, [email, hash(email, code), String(CODE_MIN)]);
    await S.rememberVia(email, b.via, b.source);
    const sent = await sendEmail({ to: email, ...templates.code(code) });
    const dev = !emailOn() && process.env.NODE_ENV !== "production";
    return send(res, 200, { ok: true, sent: !!sent.ok, ...(dev ? { devCode: code } : {}) });
  }
  if (b.action === "check") {
    const code = String(b.code || "").replace(/\D/g, "");
    const row = (await q("select code_hash, expires_at, tries from signin where email=$1", [email])).rows[0];
    if (!row || new Date(row.expires_at).getTime() < Date.now()) return send(res, 400, { ok: false, error: "That code has expired. Ask for a new one." });
    if (row.tries >= MAX_TRIES) return send(res, 429, { ok: false, error: "Too many wrong codes. Ask for a new one." });
    if (code.length !== 6 || !same(hash(email, code), row.code_hash)) { await q("update signin set tries = tries + 1 where email=$1", [email]); return send(res, 401, { ok: false, error: "Wrong code" }); }
    await q("delete from signin where email=$1", [email]);
    const { account, created } = await S.ensureAccount(email);
    setSessionCookie(res, signSession({ acct: account.id, email, exp: Date.now() + 30 * 86400000 }));
    return send(res, 200, { ok: true, created, admin: isAdmin(email) });
  }
  return send(res, 400, { ok: false, error: "Unknown action" });
}
