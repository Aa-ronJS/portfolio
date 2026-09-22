// POST /api/photo  —  a phone putting a job photo somewhere other than its own storage, and getting it back.
//
// { token, action: "put", job, id, data }  -> { ok, path }      data is a base64 data URL or bare base64
// { token, action: "url", job, id }        -> { ok, url }       good for an hour
// { token, action: "del", job, id }        -> { ok }
//
// The painter's signed token decides whose folder is touched; nothing in the request can name another painter.
import { cors, send, readJson, readToken } from "./_setup.js";
import { ensurePainter, dbConfigured } from "./_store.js";
import { photosConfigured, photoPath, ensureBucket, putPhoto, signPhoto, deletePhoto } from "./_photos.js";

export const config = { api: { bodyParser: false } };
const MAX_BYTES = 6_000_000;

export default async function handler(req, res) {
  if (!cors(req, res)) return send(res, 403, { ok: false, error: "Not allowed from here" });
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!photosConfigured()) return send(res, 503, { ok: false, error: "Photo storage is not switched on yet", off: true });

  let body;
  try { body = await readJson(req, 9_000_000); }
  catch (e) {
    // A photo over the cap trips the body limit before the size check below, and "Bad JSON" would be a
    // baffling thing to read about a picture.
    if (/too large/i.test(String(e && e.message))) return send(res, 413, { ok: false, error: "That photo is too big" });
    return send(res, 400, { ok: false, error: "Bad JSON" });
  }
  const p = readToken(body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.cus) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });

  const path = photoPath(p.cus, body.job, body.id);
  if (!path) return send(res, 400, { ok: false, error: "Which job and which photo?" });

  try {
    if (body.action === "url") {
      const url = await signPhoto(path);
      return url ? send(res, 200, { ok: true, url }) : send(res, 404, { ok: false, error: "No photo there" });
    }
    if (body.action === "del") { await deletePhoto(path); return send(res, 200, { ok: true }); }

    const raw = String(body.data || "");
    const b64 = raw.indexOf(",") >= 0 && raw.slice(0, 5) === "data:" ? raw.slice(raw.indexOf(",") + 1) : raw;
    if (!b64) return send(res, 400, { ok: false, error: "No picture in that" });
    const bytes = Buffer.from(b64, "base64");
    if (!bytes.length) return send(res, 400, { ok: false, error: "That is not a picture" });
    if (bytes.length > MAX_BYTES) return send(res, 413, { ok: false, error: "That photo is too big" });

    await ensureBucket();
    await putPhoto(path, bytes, /^data:image\/png/.test(raw) ? "image/png" : "image/jpeg");
    if (dbConfigured()) await ensurePainter(p).catch(() => {});
    return send(res, 200, { ok: true, path, bytes: bytes.length });
  } catch (e) {
    return send(res, 502, { ok: false, error: (e && e.message) || "Could not store that photo" });
  }
}
