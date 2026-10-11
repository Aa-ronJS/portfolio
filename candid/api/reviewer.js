// The reviewer's side. The invite link is the identity: /r/<token> → this, with the token in every call.
//
//   GET  /api/reviewer?token=<t>              what this reviewer may see
//   POST /api/reviewer { token, action, ... }  accept | decline | draft | received | submitReview | checkDup | submitBug | submitRatings | reply
import { send, readJson } from "./_http.js";
import { ensureSchema } from "./_db.js";
import * as S from "./_store.js";
import * as E from "./_engine.js";
import { ai } from "./_ai.js";

const actions = {
  accept: (s, now, id, b) => E.accept(s, now, id, b),
  decline: (s, now, id) => E.decline(s, now, id),
  draft: (s, now, id, b) => E.saveDraft(s, now, id, b),
  received: (s, now, id, b) => E.markReceived(s, now, id, !!b.received),
  submitReview: (s, now, id, b) => E.submitReview(s, now, id, b, ai),
  checkDup: (s, now, id, b) => E.checkDuplicate(s, id, b, ai),
  submitBug: (s, now, id, b) => E.submitBug(s, now, id, b, b.dupOf ? String(b.dupOf) : null, ai),
  submitRatings: (s, now, id, b) => E.submitRatings(s, now, id, b.entries, ai),
  reply: (s, now, id, b) => E.reply(s, now, id, String(b.flagId || ""), b.text),
};

export default async function handler(req, res) {
  await ensureSchema();
  const now = Date.now();
  try {
    let token, body = {};
    if (req.method === "GET") token = new URL(req.url, "http://x").searchParams.get("token") || "";
    else if (req.method === "POST") { body = await readJson(req); token = String(body.token || ""); }
    else return send(res, 405, { ok: false, error: "POST" });
    const who = await S.resolveToken(token); if (!who) return send(res, 404, { ok: false, error: "This link is not valid" });
    if (req.method === "GET") {
      const b = await S.readBusiness(who.businessId, now); if (!b) return send(res, 404, { ok: false, error: "This link is not valid" });
      return send(res, 200, { ok: true, view: E.reviewerView(b.state, who.reviewerId), via: who.businessId });
    }
    const fn = actions[body.action]; if (!fn) return send(res, 400, { ok: false, error: "Unknown action" });
    if (body.action === "checkDup") {
      const b = await S.readBusiness(who.businessId, now);
      const match = await E.checkDuplicate(b.state, who.reviewerId, body, ai);
      return send(res, 200, { ok: true, match: match ? { id: match.id, title: match.title, known: match.id.startsWith("known") } : null });
    }
    const { state } = await S.withBusiness(who.businessId, now, (s) => fn(s, now, who.reviewerId, body));
    return send(res, 200, { ok: true, view: E.reviewerView(state, who.reviewerId), via: who.businessId });
  } catch (e) {
    const status = e instanceof E.EngineError ? e.status : 500;
    if (status === 500) console.error("reviewer:", e && e.message);
    return send(res, status, { ok: false, error: status === 500 ? "Something went wrong. Try again." : e.message });
  }
}
