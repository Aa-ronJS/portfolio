// The platform side, for admins only: every queued flag, every released payout, every account, across all businesses.
//
//   GET  /api/admin
//   POST /api/admin { id, action: "decide" | "markPaid" | "credits", ... }   id is the business
import { send, readJson, owner, APP_URL } from "./_http.js";
import { ensureSchema } from "./_db.js";
import * as S from "./_store.js";
import * as E from "./_engine.js";

const actions = {
  decide: (s, now, b) => E.decide(s, now, String(b.target || ""), b.outcome),
  markPaid: (s, now, b) => E.markPaid(s, now, b.kind, String(b.target || "")),
  credits: (s, now, b) => E.addCredits(s, now, b.amount, b.note || "Added by Candid"),
};

export async function overview(now) {
  const list = await S.listBusinesses(null, true);
  const flags = [], payouts = [];
  for (const row of list) {
    const b = await S.readBusiness(row.id, now); if (!b) continue;
    const a = E.adminView(b.state); const tokens = await S.tokensFor(row.id);
    a.flags.filter((f) => f.state === "queued").forEach((f) => flags.push({ ...f, businessId: row.id, business: b.state.name }));
    a.payouts.filter((p) => p.state === "released").forEach((p) => payouts.push({ ...p, businessId: row.id, business: b.state.name, link: tokens[p.kind === "review" ? p.id : (b.state.bugs.find((x) => x.id === p.id) || {}).reviewerId] ? APP_URL() + "r/" + tokens[p.kind === "review" ? p.id : b.state.bugs.find((x) => x.id === p.id).reviewerId] : "" }));
  }
  return { ok: true, flags, payouts, businesses: list, accounts: await S.listAccounts() };
}

export default async function handler(req, res) {
  await ensureSchema();
  const session = owner(req); if (!session) return send(res, 401, { ok: false, error: "Sign in" });
  if (!session.admin) return send(res, 403, { ok: false, error: "Admins only" });
  const now = Date.now();
  try {
    if (req.method === "GET") return send(res, 200, await overview(now));
    if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST" });
    const body = await readJson(req);
    const fn = actions[body.action]; if (!fn) return send(res, 400, { ok: false, error: "Unknown action" });
    const id = String(body.id || ""); if (!(await S.loadBusiness(id))) return send(res, 404, { ok: false, error: "No such business" });
    await S.withBusiness(id, now, (s) => fn(s, now, body));
    return send(res, 200, await overview(now));
  } catch (e) {
    const status = e instanceof E.EngineError ? e.status : 500;
    if (status === 500) console.error("admin:", e && e.message);
    return send(res, status, { ok: false, error: status === 500 ? "Something went wrong. Try again." : e.message });
  }
}
