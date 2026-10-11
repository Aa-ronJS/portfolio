// A business, for the account that owns it (admins see every business).
//
//   GET  /api/business?list=1          the account's businesses
//   GET  /api/business?id=<id>         one business: the business view and invite links; the admin view for admins
//   POST /api/business { id?, action, target?, ... }   see `actions`; `target` is the review or issue acted on
import { send, readJson, owner, APP_URL } from "./_http.js";
import { ensureSchema } from "./_db.js";
import * as S from "./_store.js";
import * as E from "./_engine.js";
import { ai, aiOn } from "./_ai.js";
import { stripeOn, PACKS } from "./_stripe.js";
import { emailOn } from "./_email.js";

export function views(id, state, tokens, session) {
  const b = E.businessView(state, tokens);
  b.reviewers.forEach((r) => { if (r.token) r.link = APP_URL() + "r/" + r.token; });
  const out = { ok: true, id, business: b, meta: { ai: aiOn(), stripe: stripeOn(), email: emailOn(), packs: PACKS, appUrl: APP_URL(), admin: !!session.admin } };
  if (session.admin) { const a = E.adminView(state); a.reviewers.forEach((r) => { if (tokens[r.id] && state.period && r.seat !== "released") r.link = APP_URL() + "r/" + tokens[r.id]; }); out.admin = a; }
  return out;
}

const actions = {
  brief: (s, now, b) => E.saveBrief(s, now, b),
  rename: (s, now, b) => { const n = String(b.name || "").trim().slice(0, 80); if (!n) throw new E.EngineError("A name is needed"); s.name = n; },
  newPeriod: (s, now) => E.newPeriod(s, now),
  fund: (s, now, b) => E.fund(s, now, b.seats),
  endOpen: (s, now) => E.endOpen(s, now),
  status: (s, now, b) => E.setStatus(s, now, b.kind, String(b.target || ""), b.status),
  flag: (s, now, b) => E.raiseFlag(s, now, "review", String(b.target || ""), "business", b.reason, ai),
  unlock: (s, now, b) => E.unlock(s, now, String(b.target || "")),
  unlockAll: (s, now) => { let n = 0; E.cur(s, s.bugs).filter((x) => !x.dupOf && x.scores && x.tier && !x.unlocked).forEach((x) => { if (s.credits.balance >= x.tier.price) { E.unlock(s, now, x.id); n++; } }); return n; },
};

export default async function handler(req, res) {
  await ensureSchema();
  const session = owner(req); if (!session) return send(res, 401, { ok: false, error: "Sign in" });
  const now = Date.now();
  try {
    if (req.method === "GET") {
      const u = new URL(req.url, "http://x");
      if (u.searchParams.get("list")) return send(res, 200, { ok: true, businesses: await S.listBusinesses(session.acct, false), meta: { ai: aiOn(), stripe: stripeOn(), email: emailOn(), packs: PACKS, appUrl: APP_URL(), admin: !!session.admin, email_: session.email } });
      const id = u.searchParams.get("id") || "";
      const b = await S.readBusiness(id, now); if (!S.canSee(session, b)) return send(res, 404, { ok: false, error: "No such business" });
      return send(res, 200, views(id, b.state, await S.tokensFor(id), session));
    }
    if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST" });
    const body = await readJson(req);
    if (body.action === "create") { const b = await S.createBusiness(session.acct, String(body.name || ""), now); return send(res, 200, views(b.id, b.state, {}, session)); }
    const id = String(body.id || ""); if (!id) return send(res, 400, { ok: false, error: "Which business?" });
    if (!S.canSee(session, await S.loadBusiness(id))) return send(res, 404, { ok: false, error: "No such business" });
    if (body.action === "recruit") {
      const { state, out } = await S.withBusiness(id, now, async (s) => E.openRecruiting(s, now));
      await S.mintTokens(id, out);
      return send(res, 200, views(id, state, await S.tokensFor(id), session));
    }
    const fn = actions[body.action]; if (!fn) return send(res, 400, { ok: false, error: "Unknown action" });
    const { state, out } = await S.withBusiness(id, now, (s) => fn(s, now, body));
    const v = views(id, state, await S.tokensFor(id), session); if (out !== undefined && typeof out !== "object") v.result = out;
    return send(res, 200, v);
  } catch (e) {
    const status = e instanceof E.EngineError ? e.status : 500;
    if (status === 500) console.error("business:", e && e.message);
    return send(res, status, { ok: false, error: status === 500 ? "Something went wrong. Try again." : e.message });
  }
}
