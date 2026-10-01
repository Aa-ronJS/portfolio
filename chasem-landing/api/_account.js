// Accounts: the password, the lock after too many wrong ones, and handing a phone its account once it has proved
// who it is. Shared by /api/signin (getting in) and /api/account (looking after it once in).
import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
import { q } from "./_db.js";
import { stripe, mintToken, sendingSettings, setupLink, linkOnePayload, FREE_MESSAGES } from "./_setup.js";

const scrypt = promisify(scryptCb);

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
export const norm = (v) => clean(v, 160).toLowerCase();

export const MIN_PASSWORD = 8;
export const MAX_FAILED = 10, LOCK_MIN = 15;

// scrypt, N=2^15 r=8 p=1, a 16-byte salt and a 32-byte key. The settings travel inside the value, so they can be
// raised later and old hashes still check.
const N = 32768, R = 8, P = 1, KEYLEN = 32;
export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(String(pw).normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return ["s1", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}
export async function checkPassword(pw, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 6 || parts[0] !== "s1") return false;
  const [, n, r, p, salt, want] = parts;
  const wantBuf = Buffer.from(want, "base64");
  const key = await scrypt(String(pw).normalize("NFKC"), Buffer.from(salt, "base64"), wantBuf.length,
    { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
  return key.length === wantBuf.length && timingSafeEqual(key, wantBuf);
}
// A password nobody else would guess first. Length does the work; the short list is the ones people actually try.
const COMMON = new Set(["password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123",
  "qwertyuiop", "11111111", "iloveyou", "letmein1", "chasem123", "painter1", "abcd1234", "00000000", "87654321"]);
export function passwordProblem(pw, email) {
  const s = String(pw == null ? "" : pw);
  if (s.length < MIN_PASSWORD) return "Use at least " + MIN_PASSWORD + " characters.";
  if (s.length > 200) return "That password is too long. Keep it under 200 characters.";
  if (COMMON.has(s.toLowerCase())) return "That password is too easy to guess. Try a few words together.";
  const local = String(email || "").split("@")[0];
  if (local.length >= 4 && s.toLowerCase().includes(local.toLowerCase())) return "Leave your email address out of your password.";
  return "";
}

export async function accountRow(email) { return (await q("select * from account where email=$1", [norm(email)])).rows[0] || null; }
export async function accountByCus(cus) { return (await q("select * from account where cus=$1 order by updated_at desc limit 1", [cus])).rows[0] || null; }
export async function setPassword(email, cus, pw) {
  const h = await hashPassword(pw);
  await q(`insert into account (email, cus, pw_hash, pw_set_at) values ($1,$2,$3,now())
           on conflict (email) do update set cus=excluded.cus, pw_hash=excluded.pw_hash, pw_set_at=now(), failed=0, locked_until=null, updated_at=now()`,
    [norm(email), cus, h]);
}

// The Stripe customer for an address, when there is one. A deleted account's customer is kept for the money
// records, but it no longer counts as an account.
export async function findCustomer(addr) {
  const found = await stripe("customers?limit=1&email=" + encodeURIComponent(addr));
  const c = found && Array.isArray(found.data) && found.data[0];
  return c && !(c.metadata && c.metadata.qc_deleted) ? c : (c ? { ...c, deleted: true } : null);
}
// A new account, or one that was deleted coming back: the free allowance it already used stays used.
export async function makeCustomer(addr, name, business) {
  const existing = await findCustomer(addr);
  const meta = { "metadata[qc]": "1" };
  if (name) meta.name = clean(name, 80);
  if (business) meta["metadata[qc_trading_name]"] = clean(business, 80);
  if (existing && !existing.deleted && !name && !business) return { cus: existing, created: false };
  if (existing) {
    if (existing.deleted) meta["metadata[qc_deleted]"] = "";
    const upd = await stripe("customers/" + existing.id, meta);
    return { cus: upd && upd.id ? upd : { ...existing, deleted: false }, created: !!existing.deleted };
  }
  return { cus: await stripe("customers", { email: addr, ...meta, "metadata[qc_joined]": new Date().toISOString() }), created: true };
}

// What a phone gets once it has proved who it is: the signed token, sending switched on, and his details.
export function handOver(cus, addr) {
  const name = clean((cus.metadata && cus.metadata.qc_trading_name) || cus.name || "", 80);
  const owner = clean(cus.name || "", 80);
  const token = mintToken({ cus: cus.id, name, reply_to: addr, until: "", plan: (cus.metadata && cus.metadata.qc_plan) || "free", inc: FREE_MESSAGES });
  const details = { email: addr }; if (name) details.trading_name = name; if (owner) details.owner_name = owner;
  return {
    ok: true, token, cus: cus.id, email: addr,
    returning: String((cus.metadata || {}).qc_used || "") !== "",
    setup: linkOnePayload(details, ""), sending: sendingSettings(token, "", name),
    link: setupLink(process.env.APP_URL, linkOnePayload(details, "")),
  };
}

// Where a request came from, kept only as a keyed hash. Vercel sets both headers itself.
export function place(req) {
  const h = req.headers || {};
  const ip = String(h["x-real-ip"] || String(h["x-forwarded-for"] || "").split(",")[0] || "").trim();
  if (!ip) return "";
  return "ip:" + createHmac("sha256", process.env.RELAY_SIGNING_SECRET || "").update(ip).digest("base64").slice(0, 22);
}
// One more attempt from this bucket this hour. True when that is still within the limit.
export async function spend(bucket, max) {
  const r = await q(
    `insert into signin_bucket (bucket, window_at, n) values ($1, now(), 1)
     on conflict (bucket) do update set
       n = case when signin_bucket.window_at > now() - interval '1 hour' then signin_bucket.n + 1 else 1 end,
       window_at = case when signin_bucket.window_at > now() - interval '1 hour' then signin_bucket.window_at else now() end
     returning n`, [bucket]);
  return r.rows[0].n <= max;
}
