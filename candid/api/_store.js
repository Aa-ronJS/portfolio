// Load a business, run the engine on it, save it back. One transaction, one version check, the clock ticked first.
import { q, tx } from "./_db.js";
import * as E from "./_engine.js";

export async function createBusiness(name, now) {
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const s = E.newState(name, now);
  if (!s.name) throw new E.EngineError("A name is needed");
  await q("insert into business (id, name, state) values ($1,$2,$3)", [id, s.name, JSON.stringify(s)]);
  return { id, state: s };
}
export async function listBusinesses() {
  const r = await q("select id, name, state->'period'->>'state' as period_state, state->>'periodNo' as period_no, updated_at from business order by created_at");
  return r.rows.map((x) => ({ id: x.id, name: x.name, periodState: x.period_state, periodNo: Number(x.period_no) || 0, updatedAt: x.updated_at }));
}
export async function loadBusiness(id) {
  const r = await q("select id, name, state, version from business where id=$1", [id]);
  const row = r.rows[0]; if (!row) return null;
  const state = typeof row.state === "string" ? JSON.parse(row.state) : row.state;
  return { id: row.id, state, version: Number(row.version) };
}
// fn(state, helpers) may be async and may throw an EngineError. Whatever it returns comes back with the saved state.
export async function withBusiness(id, now, fn) {
  return tx(async (run) => {
    const r = await run("select state, version from business where id=$1 for update", [id]);
    const row = r.rows[0]; if (!row) throw new E.EngineError("No such business", 404);
    const state = typeof row.state === "string" ? JSON.parse(row.state) : row.state;
    E.tick(state, now);
    const out = await fn(state);
    const u = await run("update business set state=$2, name=$3, version=version+1, updated_at=now() where id=$1 and version=$4", [id, JSON.stringify(state), state.name, row.version]);
    if (!(u.rowCount ?? u.affectedRows)) throw new E.EngineError("Saved by someone else a moment ago. Reload and try again.", 409);
    return { state, out };
  });
}
// A read that also applies the clock, so a deadline that passed overnight shows up on the first look.
export async function readBusiness(id, now) {
  const b = await loadBusiness(id); if (!b) return null;
  if (E.tick(b.state, now)) {
    await q("update business set state=$2, version=version+1, updated_at=now() where id=$1 and version=$3", [id, JSON.stringify(b.state), b.version]);
  }
  return b;
}
export async function tokensFor(businessId) {
  const r = await q("select token, reviewer_id from reviewer_token where business_id=$1", [businessId]);
  const out = {}; r.rows.forEach((x) => { out[x.reviewer_id] = x.token; }); return out;
}
export async function mintTokens(businessId, reviewerIds, make) {
  const out = {};
  for (const rid of reviewerIds) { const t = make(); await q("insert into reviewer_token (token, business_id, reviewer_id) values ($1,$2,$3)", [t, businessId, rid]); out[rid] = t; }
  return out;
}
export async function resolveToken(token) {
  if (typeof token !== "string" || token.length < 10 || token.length > 64) return null;
  const r = await q("select business_id, reviewer_id from reviewer_token where token=$1", [token]);
  return r.rows[0] ? { businessId: r.rows[0].business_id, reviewerId: r.rows[0].reviewer_id } : null;
}
