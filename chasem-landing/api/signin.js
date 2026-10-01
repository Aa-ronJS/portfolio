// POST /api/signin  —  the front door, and the only way in.
//
//   { action: "login",  email, password }                   an email and a password, like every other app
//   { action: "signup", email, password, name, business }   checks it all, then emails a code to prove the inbox
//   { action: "start",  email }                             a six-digit code goes to that inbox. Nothing comes back but "sent".
//   { action: "check",  email, code, password?, name?, business? }
//                                                           the right code returns the account. With a password it also
//                                                           sets one: the last step of signing up, of a forgotten
//                                                           password, and of an account made before passwords existed.
//
// The email IS the account. The same address on a second phone reaches the same jobs. Nothing gets in on an
// address alone: either the password is right, or the code proves the inbox is his. Signing up proves the inbox
// before any token exists, so nobody can make an account in someone else's name and send from it.
//
// The code is stored as an HMAC, lasts ten minutes, dies after five wrong guesses, and the row is deleted the
// moment it works. Six digits with those limits is 1 in 200,000 per attempt and five attempts in total.
// Passwords are scrypt hashes (api/_account.js); ten wrong in a row locks the account for fifteen minutes.
import { cors, send, readJson, stripe, creds, email as sendEmail } from "./_setup.js";
import { q, dbConfigured, ensureSchema } from "./_db.js";
import { ensurePainter, markJoined } from "./_store.js";
import { metaEvent } from "./_meta.js";
import { EMAIL, clean, norm, MAX_FAILED, LOCK_MIN, passwordProblem, checkPassword, hashPassword, accountRow, setPassword,
  findCustomer, makeCustomer, handOver, place, spend } from "./_account.js";
import { createHmac, timingSafeEqual, randomInt } from "node:crypto";

const CODE_LIFE_MIN = 10, MAX_TRIES = 5, MAX_PER_HOUR = 5;
// Per place asked from, and across everyone. Australian mobile networks put many phones behind one address, so
// the per-place figure is set well above what a crew of painters signing in on one carrier would ever reach;
// the overall one is far above launch volume and exists so a spread-out attack stops too.
const MAX_PER_IP_HOUR = Number(process.env.SIGNIN_PER_IP_HOUR) || 30;
const MAX_ALL_HOUR = Number(process.env.SIGNIN_ALL_HOUR) || 300;
const MAX_LOGIN_PER_IP_HOUR = Number(process.env.LOGIN_PER_IP_HOUR) || 60;

function hash(email, code) {
  return createHmac("sha256", process.env.RELAY_SIGNING_SECRET || "").update(norm(email) + ":" + String(code)).digest("base64");
}
function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}
function sixDigits() { return String(randomInt(0, 1000000)).padStart(6, "0"); }

function codeEmail(code) {
  return {
    subject: code + " is your Chasem code",
    text: `Your code is ${code}

Type it into the app. It works for ${CODE_LIFE_MIN} minutes.

If you did not ask for it, someone typed your email address into Chasem. They cannot get in without this code, and you do not need to do anything.

Chasem`,
  };
}

// The first proved sign-in of a new account: where he came from goes on his row, and Meta hears "registered".
// None of it may stand between him and the app, so every failure is swallowed.
async function joined(req, cus, addr, src) {
  if (!dbConfigured()) return;
  try {
    await ensurePainter({ cus: cus.id }, { reply_to: addr });
    const row = await markJoined(cus.id, src);
    if (!row) return;
    const h = req.headers || {};
    await metaEvent("CompleteRegistration", { email: addr, id: cus.id, fbclid: row.fbclid, clickedAt: row.clicked_at, eventId: "reg-" + cus.id,
      ip: String(h["x-real-ip"] || String(h["x-forwarded-for"] || "").split(",")[0] || "").trim(), ua: h["user-agent"] || "" });
  } catch (e) {}
}

// A code to this inbox, inside every limit. Returns [status, body].
async function startCode(req, addr) {
  const row = (await q("select sent_at, sent_count from signin where email=$1", [addr])).rows[0];
  const within = row && Date.now() - new Date(row.sent_at).getTime() < 3600_000;
  if (within && row.sent_count >= MAX_PER_HOUR) return [429, { ok: false, error: "Too many codes for that address. Try again in an hour." }];
  const from = place(req);
  if (from && !(await spend(from, MAX_PER_IP_HOUR))) return [429, { ok: false, error: "Too many codes asked for from here. Try again in an hour." }];
  if (!(await spend("all", MAX_ALL_HOUR))) return [429, { ok: false, error: "Chasem is very busy right now. Try again in a little while." }];

  const code = sixDigits();
  await q(
    `insert into signin (email, code_hash, expires_at, tries, sent_at, sent_count, purpose, cus)
       values ($1,$2, now() + interval '${CODE_LIFE_MIN} minutes', 0, now(), 1, '', '')
     on conflict (email) do update set code_hash=excluded.code_hash, expires_at=excluded.expires_at, tries=0, purpose='', cus='',
       sent_at=now(), sent_count=case when signin.sent_at > now() - interval '1 hour' then signin.sent_count + 1 else 1 end`,
    [addr, hash(addr, code)]);

  const mail = codeEmail(code);
  const sent = await sendEmail(creds(), { to: [addr], subject: mail.subject, text: mail.text }).then(() => true).catch(() => false);
  // Whether the inbox exists is not ours to leak, so the answer is the same either way.
  return [200, { ok: true, sent: true, mailed: sent, life: CODE_LIFE_MIN }];
}

// A hash to check against when there is no account, so a missing account takes as long as a wrong password.
let decoy = null;
async function decoyCheck(pw) { if (!decoy) decoy = await hashPassword("not-a-real-password-" + Date.now()); await checkPassword(pw, decoy); }

export default async function handler(req, res) {
  const okOrigin = cors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = okOrigin ? 204 : 403; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!okOrigin && req.headers.origin) return send(res, 403, { ok: false, error: "Not allowed from here" });
  if (!dbConfigured()) return send(res, 503, { ok: false, error: "Signing in is not switched on yet" });
  await ensureSchema();

  let body; try { body = await readJson(req, 10_000); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const addr = norm(body && body.email);
  if (!EMAIL.test(addr)) return send(res, 400, { ok: false, field: "email", error: "That does not look like an email address" });

  if (body.action === "start") { const [s, b] = await startCode(req, addr); return send(res, s, b); }

  if (body.action === "login") {
    const pw = String(body.password == null ? "" : body.password);
    if (!pw) return send(res, 400, { ok: false, field: "password", error: "Type your password." });
    const from = place(req);
    if (from && !(await spend("login:" + from, MAX_LOGIN_PER_IP_HOUR))) return send(res, 429, { ok: false, error: "Too many tries from here. Try again in an hour, or reset your password." });

    const row = await accountRow(addr);
    if (row && row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
      const mins = Math.max(1, Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000));
      return send(res, 429, { ok: false, locked: true, error: "Too many wrong passwords. Try again in " + mins + " minute" + (mins === 1 ? "" : "s") + ", or reset your password." });
    }
    if (!row || !row.pw_hash) {
      // An account made before passwords existed: it proves the inbox once and sets a password then.
      const cus = row ? { id: row.cus } : await findCustomer(addr).catch(() => null);
      if (cus && !cus.deleted) return send(res, 200, { ok: false, need: "code", error: "Your account needs a password. We will email you a code to set one." });
      await decoyCheck(pw);
      return send(res, 400, { ok: false, error: "That email and password do not match." });
    }
    if (!(await checkPassword(pw, row.pw_hash))) {
      const failed = row.failed + 1, lock = failed >= MAX_FAILED;
      await q(`update account set failed=$2, locked_until=${lock ? `now() + interval '${LOCK_MIN} minutes'` : "null"}, updated_at=now() where email=$1`, [addr, lock ? 0 : failed]);
      const left = MAX_FAILED - failed;
      return send(res, lock ? 429 : 400, { ok: false, locked: lock,
        error: lock ? "Too many wrong passwords. Try again in " + LOCK_MIN + " minutes, or reset your password."
          : "That email and password do not match." + (left <= 3 ? " " + left + " more " + (left === 1 ? "try" : "tries") + " before a " + LOCK_MIN + " minute wait." : "") });
    }
    await q("update account set failed=0, locked_until=null, updated_at=now() where email=$1", [addr]);
    const cus = await stripe("customers/" + encodeURIComponent(row.cus));
    if (!cus || cus.deleted || (cus.metadata && cus.metadata.qc_deleted)) return send(res, 400, { ok: false, error: "That email and password do not match." });
    return send(res, 200, handOver(cus, addr));
  }

  if (body.action === "signup") {
    const name = clean(body.name, 80), business = clean(body.business, 80);
    if (!name) return send(res, 400, { ok: false, field: "name", error: "Put your name in." });
    const bad = passwordProblem(body.password, addr);
    if (bad) return send(res, 400, { ok: false, field: "password", error: bad });
    const row = await accountRow(addr);
    if (row && row.pw_hash) return send(res, 409, { ok: false, exists: true, field: "email", error: "There is already an account for that email. Log in instead." });
    const [s, b] = await startCode(req, addr);
    return send(res, s, b);
  }

  if (body.action === "check") {
    const code = String((body && body.code) || "").replace(/\D/g, "");
    if (code.length !== 6) return send(res, 400, { ok: false, field: "code", error: "The code is six numbers" });
    const pw = body.password == null || body.password === "" ? null : String(body.password);
    if (pw !== null) { const bad = passwordProblem(pw, addr); if (bad) return send(res, 400, { ok: false, field: "password", error: bad }); }

    const row = (await q("select code_hash, expires_at, tries, purpose from signin where email=$1", [addr])).rows[0];
    if (!row || row.purpose) return send(res, 400, { ok: false, field: "code", error: "Ask for a new code" });
    if (new Date(row.expires_at).getTime() < Date.now()) { await q("delete from signin where email=$1", [addr]); return send(res, 400, { ok: false, field: "code", error: "That code has run out. Ask for a new one." }); }
    if (row.tries >= MAX_TRIES) { await q("delete from signin where email=$1", [addr]); return send(res, 429, { ok: false, field: "code", error: "Too many wrong tries. Ask for a new code." }); }

    if (!same(row.code_hash, hash(addr, code))) {
      await q("update signin set tries = tries + 1 where email=$1", [addr]);
      const left = MAX_TRIES - (row.tries + 1);
      return send(res, 400, { ok: false, field: "code", error: left > 0 ? "That code is wrong. " + left + " more " + (left === 1 ? "try" : "tries") + "." : "That code is wrong. Ask for a new one." });
    }

    await q("delete from signin where email=$1", [addr]);
    const { cus, created } = await makeCustomer(addr, body.name, body.business);
    if (created) await joined(req, cus, addr, body.src);
    if (pw !== null) await setPassword(addr, cus.id, pw);
    else await q("insert into account (email, cus) values ($1,$2) on conflict (email) do update set cus=excluded.cus, failed=0, locked_until=null, updated_at=now()", [addr, cus.id]);
    return send(res, 200, { ...handOver(cus, addr), has_password: pw !== null || !!(await accountRow(addr) || {}).pw_hash });
  }

  return send(res, 400, { ok: false, error: "No such action" });
}
