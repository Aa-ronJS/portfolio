// POST /api/lead { email, note?, via?, source? }   someone asking for an account       GET /api/lead  (owner) the list
import { send, readJson, owner, place, newToken } from "./_http.js";
import { q, dbConfigured, ensureSchema } from "./_db.js";

const PER_IP_HOUR = Number(process.env.LEAD_PER_IP_HOUR || 20);
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

export default async function handler(req, res) {
  await ensureSchema();
  if (req.method === "GET") {
    if (!owner(req)) return send(res, 401, { ok: false, error: "Sign in" });
    const r = await q("select l.id, l.email, l.note, l.via, l.source, l.created_at, b.name as via_name from lead l left join business b on b.id = l.via order by l.created_at desc limit 500");
    return send(res, 200, { ok: true, leads: r.rows.map((x) => ({ id: x.id, email: x.email, note: x.note, via: x.via, viaName: x.via_name || "", source: x.source, at: new Date(x.created_at).getTime() })) });
  }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST" });
  if (!dbConfigured()) return send(res, 503, { ok: false, error: "Not set up yet" });
  let b; try { b = await readJson(req, 4000); } catch (e) { return send(res, 400, { ok: false, error: e.message }); }
  const email = clean(b.email, 120).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(res, 400, { ok: false, error: "A real email address, please" });
  const from = place(req) || "unknown";
  const bucket = await q(`insert into login_bucket (bucket, window_at, n) values ($1, now(), 1)
    on conflict (bucket) do update set n = case when login_bucket.window_at < now() - interval '1 hour' then 1 else login_bucket.n + 1 end,
    window_at = case when login_bucket.window_at < now() - interval '1 hour' then now() else login_bucket.window_at end returning n`, ["lead:" + from]);
  if (bucket.rows[0].n > PER_IP_HOUR) return send(res, 429, { ok: false, error: "Too many from here. Try again later." });
  const via = /^[a-z0-9]{4,24}$/.test(String(b.via || "")) ? String(b.via) : "";
  const source = ["invite", "submitted", "paid", "ad"].includes(b.source) ? b.source : "";
  const dup = await q("select id from lead where email=$1", [email]);
  if (!dup.rows.length) await q("insert into lead (id, email, note, via, source) values ($1,$2,$3,$4,$5)", [newToken(8), email, clean(b.note, 300), via, source]);
  return send(res, 200, { ok: true });
}
