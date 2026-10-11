// Accounts, businesses, tokens, payments. Load a business, run the engine on it, save it back under a version
// check, then send whatever the engine queued in its outbox.
import { q, tx } from "./_db.js";
import * as E from "./_engine.js";
import { newToken, APP_URL } from "./_http.js";
import { sendEmail, templates } from "./_email.js";

// ---- accounts
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export async function findAccount(email) { return (await q("select id, email, name, via, source, created_at from account where email=$1", [email])).rows[0] || null; }
export async function ensureAccount(email) {
  const found = await findAccount(email);
  if (found) { await q("update account set last_seen=now() where id=$1", [found.id]); return { account: found, created: false }; }
  const pending = viaMemo.get(email) || {};
  const id = uid();
  await q("insert into account (id, email, via, source) values ($1,$2,$3,$4)", [id, email, pending.via || "", pending.source || ""]);
  return { account: { id, email, via: pending.via || "", source: pending.source || "" }, created: true };
}
// Where a sign-up came from, remembered between asking for the code and typing it. Best effort, per warm instance.
const viaMemo = new Map();
export async function rememberVia(email, via, source) {
  const v = /^[a-z0-9]{4,24}$/.test(String(via || "")) ? String(via) : "";
  const s = ["invite", "submitted", "paid", "ad"].includes(source) ? source : "";
  if (v || s) viaMemo.set(email, { via: v, source: s });
}
export async function listAccounts() {
  const r = await q(`select a.id, a.email, a.via, a.source, a.created_at, a.last_seen, b.name as via_name,
    (select count(*)::int from business x where x.account_id = a.id) as businesses from account a left join business b on b.id = a.via order by a.created_at desc limit 500`);
  return r.rows.map((x) => ({ id: x.id, email: x.email, via: x.via, viaName: x.via_name || "", source: x.source, businesses: x.businesses, at: new Date(x.created_at).getTime(), seen: new Date(x.last_seen).getTime() }));
}

// ---- businesses
export async function createBusiness(acct, name, now) {
  const id = uid(); const s = E.newState(name, now);
  if (!s.name) throw new E.EngineError("A name is needed");
  await q("insert into business (id, name, state, account_id) values ($1,$2,$3,$4)", [id, s.name, JSON.stringify(s), acct]);
  return { id, state: s };
}
export async function listBusinesses(acct, all) {
  const r = all
    ? await q("select b.id, b.name, b.account_id, a.email, b.state->'period'->>'state' as period_state, b.state->>'periodNo' as period_no, b.updated_at from business b left join account a on a.id = b.account_id order by b.created_at")
    : await q("select id, name, account_id, state->'period'->>'state' as period_state, state->>'periodNo' as period_no, updated_at from business where account_id=$1 order by created_at", [acct]);
  return r.rows.map((x) => ({ id: x.id, name: x.name, accountId: x.account_id, email: x.email || "", periodState: x.period_state, periodNo: Number(x.period_no) || 0, updatedAt: x.updated_at }));
}
export async function loadBusiness(id) {
  const row = (await q("select id, name, state, version, account_id from business where id=$1", [id])).rows[0];
  if (!row) return null;
  return { id: row.id, accountId: row.account_id, state: typeof row.state === "string" ? JSON.parse(row.state) : row.state, version: Number(row.version) };
}
export const canSee = (session, b) => !!session && !!b && (session.admin || b.accountId === session.acct);

// fn(state) may be async and may throw an EngineError. The engine's outbox is sent after the save.
export async function withBusiness(id, now, fn) {
  const { state, out, outbox } = await tx(async (run) => {
    const r = await run("select state, version, account_id from business where id=$1 for update", [id]);
    const row = r.rows[0]; if (!row) throw new E.EngineError("No such business", 404);
    const state = typeof row.state === "string" ? JSON.parse(row.state) : row.state;
    E.tick(state, now);
    const out = await fn(state);
    const outbox = (state.outbox || []).splice(0); state.outbox = [];
    const u = await run("update business set state=$2, name=$3, version=version+1, updated_at=now() where id=$1 and version=$4", [id, JSON.stringify(state), state.name, row.version]);
    if (!(u.rowCount ?? u.affectedRows)) throw new E.EngineError("Changed elsewhere. Reload and try again.", 409);
    return { state, out, outbox: outbox.map((m) => ({ ...m, accountId: row.account_id })) };
  });
  await deliver(id, state, outbox);
  return { state, out };
}
// A read that also applies the clock, so a deadline that passed overnight shows up on the first look.
export async function readBusiness(id, now) {
  const b = await loadBusiness(id); if (!b) return null;
  if (E.tick(b.state, now)) {
    const outbox = (b.state.outbox || []).splice(0); b.state.outbox = [];
    await q("update business set state=$2, version=version+1, updated_at=now() where id=$1 and version=$3", [id, JSON.stringify(b.state), b.version]);
    await deliver(id, b.state, outbox.map((m) => ({ ...m, accountId: b.accountId })));
  }
  return b;
}
async function deliver(businessId, state, outbox) {
  if (!outbox.length) return;
  const tokens = await tokensFor(businessId);
  const link = (rid) => tokens[rid] ? APP_URL() + "r/" + tokens[rid] : APP_URL();
  for (const m of outbox) {
    try {
      if (m.owner) {
        const a = (await q("select email from account where id=$1", [m.accountId])).rows[0]; if (!a) continue;
        if (m.kind === "settled") await sendEmail({ to: a.email, ...templates.settled(state.name, m.periodNo) });
        if (m.kind === "paid") await sendEmail({ to: a.email, ...templates.paid(state.name, m.amount) });
        continue;
      }
      const r = state.reviewers[m.reviewerId]; if (!r || !r.contact || !r.contact.email) continue;
      if (m.kind === "ratingOpen") await sendEmail({ to: r.contact.email, ...templates.ratingOpen(state.name, link(r.id)) });
      if (m.kind === "feeReleased") await sendEmail({ to: r.contact.email, ...templates.feeReleased(state.name, m.amount, link(r.id)) });
      if (m.kind === "flagRaised") await sendEmail({ to: r.contact.email, ...templates.flagRaised(state.name, m.reason, link(r.id)) });
    } catch (e) { console.error("deliver:", e.message); }
  }
}

// ---- invite tokens
export async function tokensFor(businessId) {
  const r = await q("select token, reviewer_id from reviewer_token where business_id=$1", [businessId]);
  const out = {}; r.rows.forEach((x) => { out[x.reviewer_id] = x.token; }); return out;
}
export async function mintTokens(businessId, reviewerIds) {
  const out = {};
  for (const rid of reviewerIds) { const t = newToken(); await q("insert into reviewer_token (token, business_id, reviewer_id) values ($1,$2,$3)", [t, businessId, rid]); out[rid] = t; }
  return out;
}
export async function resolveToken(token) {
  if (typeof token !== "string" || token.length < 10 || token.length > 64) return null;
  const r = await q("select business_id, reviewer_id from reviewer_token where token=$1", [token]);
  return r.rows[0] ? { businessId: r.rows[0].business_id, reviewerId: r.rows[0].reviewer_id } : null;
}

// ---- payments: true the first time a Checkout session is recorded, false on any repeat
export async function recordPayment(sessionId, businessId, amount) {
  const r = await q("insert into payment (session_id, business_id, amount) values ($1,$2,$3) on conflict (session_id) do nothing", [sessionId, businessId, amount]);
  return !!(r.rowCount ?? r.affectedRows);
}
