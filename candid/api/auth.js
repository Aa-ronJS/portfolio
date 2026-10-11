// POST /api/auth { action: "login", passcode } | { action: "logout" }     GET /api/auth → who am I, is the server set up
// One owner, one passcode (OWNER_PASSCODE, 8+ characters), a signed cookie for 30 days. Ten wrong tries an hour per address.
import { send, readJson, owner, passcodeOk, signSession, setSessionCookie, configured, place } from "./_http.js";
import { q, dbConfigured, ensureSchema } from "./_db.js";
import { aiOn } from "./_ai.js";

const MAX_TRIES = Number(process.env.LOGIN_PER_IP_HOUR || 10);
async function spend(bucket, max) {
  if (!dbConfigured()) return true;
  const r = await q(`insert into login_bucket (bucket, window_at, n) values ($1, now(), 1)
    on conflict (bucket) do update set n = case when login_bucket.window_at < now() - interval '1 hour' then 1 else login_bucket.n + 1 end,
    window_at = case when login_bucket.window_at < now() - interval '1 hour' then now() else login_bucket.window_at end returning n`, [bucket]);
  return r.rows[0].n <= max;
}

export default async function handler(req, res) {
  await ensureSchema();
  if (req.method === "GET") return send(res, 200, { ok: true, loggedIn: !!owner(req), configured: configured() && dbConfigured(), ai: aiOn() });
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST" });
  let body; try { body = await readJson(req, 4000); } catch (e) { return send(res, 400, { ok: false, error: e.message }); }
  if (body.action === "logout") { setSessionCookie(res, "", true); return send(res, 200, { ok: true }); }
  if (body.action === "login") {
    if (!configured()) return send(res, 503, { ok: false, error: "Set OWNER_PASSCODE and SESSION_SECRET first" });
    const from = place(req) || "unknown";
    if (!(await spend("login:" + from, MAX_TRIES))) return send(res, 429, { ok: false, error: "Too many tries. Wait an hour." });
    if (!passcodeOk(String(body.passcode || ""))) return send(res, 401, { ok: false, error: "Wrong passcode" });
    setSessionCookie(res, signSession({ who: "owner", exp: Date.now() + 30 * 86400000 }));
    return send(res, 200, { ok: true });
  }
  return send(res, 400, { ok: false, error: "Unknown action" });
}
