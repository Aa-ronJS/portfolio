// POST /api/signin  —  the front door, and the only way in.
//
//   { action: "start", email }         a six-digit code goes to that inbox. Nothing comes back but "sent".
//   { action: "check", email, code }   the right code returns the account: his token and his details.
//
// The email IS the account. The same address on a second phone reaches the same jobs, once the code proves the
// inbox is his. That proof is the whole point: before this, anyone who typed an address got the account.
//
// The code is stored as an HMAC, lasts ten minutes, dies after five wrong guesses, and the row is deleted the
// moment it works. Six digits with those limits is 1 in 200,000 per attempt and five attempts in total.
import { cors, send, readJson, stripe, mintToken, sendingSettings, setupLink, linkOnePayload, creds, email as sendEmail, FREE_MESSAGES } from "./_setup.js";
import { q, dbConfigured, ensureSchema } from "./_db.js";
import { createHmac, timingSafeEqual, randomInt } from "node:crypto";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODE_LIFE_MIN = 10, MAX_TRIES = 5, MAX_PER_HOUR = 5;
// Per place asked from, and across everyone. Australian mobile networks put many phones behind one address, so
// the per-place figure is set well above what a crew of painters signing in on one carrier would ever reach;
// the overall one is far above launch volume and exists so a spread-out attack stops too.
const MAX_PER_IP_HOUR = Number(process.env.SIGNIN_PER_IP_HOUR) || 30;
const MAX_ALL_HOUR = Number(process.env.SIGNIN_ALL_HOUR) || 300;
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const norm = (v) => clean(v, 160).toLowerCase();

function hash(email, code) {
  return createHmac("sha256", process.env.RELAY_SIGNING_SECRET || "").update(norm(email) + ":" + String(code)).digest("base64");
}
function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}
function sixDigits() { return String(randomInt(0, 1000000)).padStart(6, "0"); }

// Vercel sets both headers itself, so neither can be forged from outside. The address is only ever kept hashed.
function place(req) {
  const h = req.headers || {};
  const ip = String(h["x-real-ip"] || String(h["x-forwarded-for"] || "").split(",")[0] || "").trim();
  if (!ip) return "";
  return "ip:" + createHmac("sha256", process.env.RELAY_SIGNING_SECRET || "").update(ip).digest("base64").slice(0, 22);
}
// One more code from this bucket this hour. True when that is still within the limit.
async function spend(bucket, max) {
  const r = await q(
    `insert into signin_bucket (bucket, window_at, n) values ($1, now(), 1)
     on conflict (bucket) do update set
       n = case when signin_bucket.window_at > now() - interval '1 hour' then signin_bucket.n + 1 else 1 end,
       window_at = case when signin_bucket.window_at > now() - interval '1 hour' then signin_bucket.window_at else now() end
     returning n`, [bucket]);
  return r.rows[0].n <= max;
}

function codeEmail(code) {
  return {
    subject: code + " is your Chasem code",
    text: `Your code is ${code}

Type it into the app. It works for ${CODE_LIFE_MIN} minutes.

If you did not ask for it, someone typed your email address into Chasem. They cannot get in without this code, and you do not need to do anything.

Chasem`,
  };
}

// The Stripe customer for this address is the account. Finding it is how a second phone reaches the same jobs.
async function account(addr) {
  const found = await stripe("customers?limit=1&email=" + encodeURIComponent(addr));
  if (found && Array.isArray(found.data) && found.data[0]) return found.data[0];
  return await stripe("customers", { email: addr, "metadata[qc]": "1" });
}

export default async function handler(req, res) {
  const okOrigin = cors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = okOrigin ? 204 : 403; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!okOrigin && req.headers.origin) return send(res, 403, { ok: false, error: "Not allowed from here" });
  if (!dbConfigured()) return send(res, 503, { ok: false, error: "Signing in is not switched on yet" });
  await ensureSchema();

  let body; try { body = await readJson(req, 10_000); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const addr = norm(body && body.email);
  if (!EMAIL.test(addr)) return send(res, 400, { ok: false, error: "That does not look like an email address" });

  if (body.action === "start") {
    const row = (await q("select sent_at, sent_count from signin where email=$1", [addr])).rows[0];
    const within = row && Date.now() - new Date(row.sent_at).getTime() < 3600_000;
    if (within && row.sent_count >= MAX_PER_HOUR) return send(res, 429, { ok: false, error: "Too many codes for that address. Try again in an hour." });
    const from = place(req);
    if (from && !(await spend(from, MAX_PER_IP_HOUR))) return send(res, 429, { ok: false, error: "Too many codes asked for from here. Try again in an hour." });
    if (!(await spend("all", MAX_ALL_HOUR))) return send(res, 429, { ok: false, error: "Chasem is very busy right now. Try again in a little while." });

    const code = sixDigits();
    await q(
      `insert into signin (email, code_hash, expires_at, tries, sent_at, sent_count)
         values ($1,$2, now() + interval '${CODE_LIFE_MIN} minutes', 0, now(), 1)
       on conflict (email) do update set code_hash=excluded.code_hash, expires_at=excluded.expires_at, tries=0,
         sent_at=now(), sent_count=case when signin.sent_at > now() - interval '1 hour' then signin.sent_count + 1 else 1 end`,
      [addr, hash(addr, code)]);

    const mail = codeEmail(code);
    const sent = await sendEmail(creds(), { to: [addr], subject: mail.subject, text: mail.text }).then(() => true).catch(() => false);
    // Whether the inbox exists is not ours to leak, so the answer is the same either way.
    return send(res, 200, { ok: true, sent: true, mailed: sent, life: CODE_LIFE_MIN });
  }

  if (body.action === "check") {
    const code = String((body && body.code) || "").replace(/\D/g, "");
    if (code.length !== 6) return send(res, 400, { ok: false, error: "The code is six numbers" });

    const row = (await q("select code_hash, expires_at, tries from signin where email=$1", [addr])).rows[0];
    if (!row) return send(res, 400, { ok: false, error: "Ask for a new code" });
    if (new Date(row.expires_at).getTime() < Date.now()) { await q("delete from signin where email=$1", [addr]); return send(res, 400, { ok: false, error: "That code has run out. Ask for a new one." }); }
    if (row.tries >= MAX_TRIES) { await q("delete from signin where email=$1", [addr]); return send(res, 429, { ok: false, error: "Too many wrong tries. Ask for a new code." }); }

    if (!same(row.code_hash, hash(addr, code))) {
      await q("update signin set tries = tries + 1 where email=$1", [addr]);
      const left = MAX_TRIES - (row.tries + 1);
      return send(res, 400, { ok: false, error: left > 0 ? "That code is wrong. " + left + " more " + (left === 1 ? "try" : "tries") + "." : "That code is wrong. Ask for a new one." });
    }

    await q("delete from signin where email=$1", [addr]);
    const cus = await account(addr);
    const name = clean((cus.metadata && cus.metadata.qc_trading_name) || cus.name || "", 80);
    const token = mintToken({ cus: cus.id, name, reply_to: addr, until: "", plan: (cus.metadata && cus.metadata.qc_plan) || "free", inc: FREE_MESSAGES });
    const details = { email: addr }; if (name) details.trading_name = name;
    return send(res, 200, {
      ok: true, token, cus: cus.id,
      returning: String((cus.metadata || {}).qc_used || "") !== "",
      setup: linkOnePayload(details, ""), sending: sendingSettings(token, "", name),
      link: setupLink(process.env.APP_URL, linkOnePayload(details, "")),
    });
  }

  return send(res, 400, { ok: false, error: "No such action" });
}
