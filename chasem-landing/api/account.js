// POST /api/account  —  looking after an account once you are in. Every action carries the phone's token, and
// anything that changes how you get in also asks for the current password.
//
//   { token, action: "me" }                                     what the account is: email, whether it has a password
//   { token, action: "password", current?, next }               change the password (current is not asked when there
//                                                               is none yet: an account from before passwords)
//   { token, action: "email_start", password, new_email }       a code goes to the new address
//   { token, action: "email_check", new_email, code }           the code proves it; the account moves to it
//   { token, action: "delete", password }                       the account, its jobs on the server, and its login go
//
// Deleting keeps the Stripe customer, marked deleted, because card payments and invoices are money records the
// business must keep; signing up again with the same address starts a fresh account on it.
import { cors, send, readJson, readToken, stripe, creds, email as sendEmail, LIVE_STATUS } from "./_setup.js";
import { q, dbConfigured, ensureSchema } from "./_db.js";
import { EMAIL, norm, passwordProblem, checkPassword, accountByCus, accountRow, setPassword, findCustomer, handOver, place, spend } from "./_account.js";
import { createHmac, timingSafeEqual, randomInt } from "node:crypto";

const CODE_LIFE_MIN = 10, MAX_TRIES = 5;
const hash = (email, code) => createHmac("sha256", process.env.RELAY_SIGNING_SECRET || "").update("email:" + norm(email) + ":" + String(code)).digest("base64");
function same(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); }

export default async function handler(req, res) {
  const okOrigin = cors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = okOrigin ? 204 : 403; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!okOrigin && req.headers.origin) return send(res, 403, { ok: false, error: "Not allowed from here" });
  if (!dbConfigured()) return send(res, 503, { ok: false, error: "Accounts are not switched on yet" });
  await ensureSchema();

  let body; try { body = await readJson(req, 10_000); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const claim = readToken(body && body.token, process.env.RELAY_SIGNING_SECRET);
  if (!claim || !claim.cus) return send(res, 401, { ok: false, error: "Log in again on this phone." });
  const acct = await accountByCus(claim.cus);
  const email = acct ? acct.email : norm(claim.reply_to);

  // Anything that changes how you get in is limited per place, so a phone left unlocked cannot be used to guess.
  const guard = async () => { const from = place(req); return !from || spend("acct:" + from, 30); };
  const passwordOk = async (pw) => !!(acct && acct.pw_hash && pw && (await checkPassword(String(pw), acct.pw_hash)));

  if (body.action === "me") return send(res, 200, { ok: true, email, has_password: !!(acct && acct.pw_hash) });

  if (body.action === "password") {
    if (!(await guard())) return send(res, 429, { ok: false, error: "Too many tries from here. Try again in an hour." });
    if (acct && acct.pw_hash && !(await passwordOk(body.current))) return send(res, 400, { ok: false, field: "current", error: "That is not your current password." });
    const bad = passwordProblem(body.next, email);
    if (bad) return send(res, 400, { ok: false, field: "next", error: bad });
    if (acct && acct.pw_hash && String(body.next) === String(body.current)) return send(res, 400, { ok: false, field: "next", error: "That is the password you have now. Pick a new one." });
    await setPassword(email, claim.cus, body.next);
    return send(res, 200, { ok: true });
  }

  if (body.action === "email_start") {
    if (!(await guard())) return send(res, 429, { ok: false, error: "Too many tries from here. Try again in an hour." });
    const to = norm(body.new_email);
    if (!EMAIL.test(to)) return send(res, 400, { ok: false, field: "new_email", error: "That does not look like an email address" });
    if (to === email) return send(res, 400, { ok: false, field: "new_email", error: "That is the email you use now." });
    if (!(await passwordOk(body.password))) return send(res, 400, { ok: false, field: "password", error: "That is not your password." });
    const taken = await accountRow(to);
    const other = taken ? null : await findCustomer(to).catch(() => null);
    if (taken || (other && !other.deleted)) return send(res, 409, { ok: false, field: "new_email", error: "Another account already uses that email." });
    const code = String(randomInt(0, 1000000)).padStart(6, "0");
    await q(`insert into signin (email, code_hash, expires_at, tries, sent_at, sent_count, purpose, cus)
               values ($1,$2, now() + interval '${CODE_LIFE_MIN} minutes', 0, now(), 1, 'email', $3)
             on conflict (email) do update set code_hash=excluded.code_hash, expires_at=excluded.expires_at, tries=0, sent_at=now(),
               sent_count=signin.sent_count + 1, purpose='email', cus=excluded.cus`, [to, hash(to, code), claim.cus]);
    await sendEmail(creds(), { to: [to], subject: code + " is your Chasem code",
      text: `Your code is ${code}\n\nType it into Chasem to move your account to this email address. It works for ${CODE_LIFE_MIN} minutes.\n\nIf you did not ask for this, you do not need to do anything: nothing changes without the code.\n\nChasem` }).catch(() => {});
    return send(res, 200, { ok: true, sent: true });
  }

  if (body.action === "email_check") {
    const to = norm(body.new_email), code = String(body.code || "").replace(/\D/g, "");
    if (code.length !== 6) return send(res, 400, { ok: false, field: "code", error: "The code is six numbers" });
    const row = (await q("select code_hash, expires_at, tries, purpose, cus from signin where email=$1", [to])).rows[0];
    if (!row || row.purpose !== "email" || row.cus !== claim.cus) return send(res, 400, { ok: false, field: "code", error: "Ask for a new code" });
    if (new Date(row.expires_at).getTime() < Date.now() || row.tries >= MAX_TRIES) { await q("delete from signin where email=$1", [to]); return send(res, 400, { ok: false, field: "code", error: "That code has run out. Ask for a new one." }); }
    if (!same(row.code_hash, hash(to, code))) { await q("update signin set tries=tries+1 where email=$1", [to]); return send(res, 400, { ok: false, field: "code", error: "That code is wrong." }); }
    await q("delete from signin where email=$1", [to]);
    const cus = await stripe("customers/" + encodeURIComponent(claim.cus), { email: to });
    if (acct) await q("update account set email=$1, updated_at=now() where email=$2", [to, acct.email]);
    else await q("insert into account (email, cus) values ($1,$2) on conflict (email) do nothing", [to, claim.cus]);
    await q("update painter set reply_to=$1, updated_at=now() where id=$2", [to, claim.cus]).catch(() => {});
    return send(res, 200, handOver(cus && cus.id ? cus : { id: claim.cus, metadata: {} }, to));
  }

  if (body.action === "delete") {
    if (!(await guard())) return send(res, 429, { ok: false, error: "Too many tries from here. Try again in an hour." });
    if (!acct || !acct.pw_hash) return send(res, 400, { ok: false, error: "Set a password first, then you can delete the account." });
    if (!(await passwordOk(body.password))) return send(res, 400, { ok: false, field: "password", error: "That is not your password." });
    // A live subscription would keep charging an account that no longer exists, so it is stopped first, by him.
    const subs = await stripe("subscriptions?limit=10&status=all&customer=" + encodeURIComponent(claim.cus)).catch(() => ({ data: [] }));
    if ((subs.data || []).some((s) => LIVE_STATUS.includes(s.status) && !s.cancel_at_period_end))
      return send(res, 409, { ok: false, subscribed: true, error: "Cancel your plan first, under Your plan, then delete the account." });
    await q("delete from painter where id=$1", [claim.cus]).catch(() => {});
    await q("delete from found where painter_id=$1", [claim.cus]).catch(() => {});
    await q("delete from account where cus=$1", [claim.cus]);
    await stripe("customers/" + encodeURIComponent(claim.cus), { "metadata[qc_deleted]": new Date().toISOString() }).catch(() => {});
    return send(res, 200, { ok: true, deleted: true });
  }

  return send(res, 400, { ok: false, error: "No such action" });
}
