// POST /api/admin  —  the few things that have to be done once, from somewhere that can reach the database.
//
// Postgres is not reachable from a laptop behind a proxy that only speaks HTTPS, and Supabase's direct host is
// IPv6-only, so the migrations run from here: a Vercel function, which can reach the pooler.
//
//   { secret, action: "migrate" }  -> applies db/*.sql, reports which ran and what exists now
//   { secret, action: "status" }   -> what is configured and what the tables look like
//   { secret, action: "bucket" }   -> makes the private photo bucket
//
// Guarded by MIGRATE_SECRET, which is not any of the other secrets and can be deleted once launch is done.
// It never takes SQL from the request: the only statements it runs are the ones in the repo.
import { send, readJson } from "./_setup.js";
import { q, migrate, dbConfigured } from "./_db.js";
import { forgetPainter } from "./_store.js";
import { deletePainterPhotos, ensureBucket, photosConfigured } from "./_photos.js";
import { timingSafeEqual } from "node:crypto";

export const config = { api: { bodyParser: false } };

function allowed(given) {
  const want = process.env.MIGRATE_SECRET || "";
  if (!want || !given) return false;
  const a = Buffer.from(String(given)), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  let body; try { body = await readJson(req, 10_000); } catch (e) { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  if (!allowed(body.secret)) return send(res, 401, { ok: false, error: "No" });

  const out = { ok: true, db: dbConfigured(), photos: photosConfigured() };
  try {
    if (body.action === "migrate") {
      out.ran = await migrate();
    }
    // Clearing test data, and what "delete my account" will call: the database side is forgetPainter, the
    // photos are in Storage and go separately.
    if (body.action === "forget" && body.painter) {
      const id = String(body.painter);
      const gone = await forgetPainter(id);
      out.forgot = gone.painter;
      out.forgotReplies = gone.replies;
      if (photosConfigured()) out.forgotPhotos = await deletePainterPhotos(id);
    }
    if (body.action === "bucket") {
      out.bucket = await ensureBucket();
    }
    if (dbConfigured()) {
      const t = await q("select table_name from information_schema.tables where table_schema='public' order by 1");
      out.tables = t.rows.map((r) => r.table_name);
      const counts = {};
      for (const name of ["painter", "doc", "job_index", "busy", "booking", "outbound", "inbound"]) {
        if (!out.tables.includes(name)) continue;
        const c = await q(`select count(*)::int n from ${name}`);
        counts[name] = c.rows[0].n;
      }
      out.rows = counts;
    }
    return send(res, 200, out);
  } catch (e) {
    return send(res, 500, { ok: false, error: (e && e.message) || "failed", db: out.db, photos: out.photos });
  }
}
