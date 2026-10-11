// GET /api/photo?b=<business>&r=<reviewer>   the reviewer's photo, for the signed-in owner only
import { send, owner } from "./_http.js";
import { q, ensureSchema } from "./_db.js";

export default async function handler(req, res) {
  await ensureSchema();
  if (!owner(req)) return send(res, 401, { ok: false, error: "Sign in" });
  const u = new URL(req.url, "http://x");
  const r = await q("select type, data from photo where business_id=$1 and reviewer_id=$2", [u.searchParams.get("b") || "", u.searchParams.get("r") || ""]);
  if (!r.rows[0]) return send(res, 404, { ok: false, error: "No photo" });
  res.statusCode = 200; res.setHeader("Content-Type", r.rows[0].type); res.setHeader("Cache-Control", "private, max-age=300");
  res.end(Buffer.from(r.rows[0].data, "base64"));
}
