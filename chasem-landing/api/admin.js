// POST /api/admin  —  the few things that have to be done once, from somewhere that can reach the database.
//
// Postgres is not reachable from a laptop behind a proxy that only speaks HTTPS, and Supabase's direct host is
// IPv6-only, so the migrations run from here: a Vercel function, which can reach the pooler.
//
//   { secret, action: "migrate" }  -> applies db/*.sql, reports which ran and what exists now
//   { secret, action: "status" }   -> what is configured and what the tables look like
//   { secret, action: "bucket" }   -> makes the private photo bucket
//   { secret, action: "funnel", by?, from?, to?, seconds? } -> joined, set up, chasing, paid, by week/ad/campaign/source/trade
//
// Guarded by MIGRATE_SECRET, which is not any of the other secrets and can be deleted once launch is done.
// It never takes SQL from the request: the only statements it runs are the ones in the repo.
import { send, readJson, f } from "./_setup.js";
import { q, migrate, dbConfigured, ensureSchema } from "./_db.js";
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
    // Read-only: what the platform's Stripe key is actually allowed to do. Connect account creation needs
    // permissions a restricted key usually does not carry, and Connect itself has to be turned on in the
    // dashboard, so this answers both before anything is built on top of it.
    if (body.action === "stripe") {
      const key = process.env.STRIPE_SECRET_KEY || "";
      out.stripe = { keyKind: key.slice(0, 8) || "(none)" };
      if (key) {
        const ask = async (path) => {
          const r = await f("https://api.stripe.com/v1/" + path, { headers: { Authorization: "Bearer " + key } });
          const j = await r.json().catch(() => ({}));
          return r.ok ? { ok: true, n: Array.isArray(j.data) ? j.data.length : 1 }
                      : { ok: false, code: (j.error && (j.error.code || j.error.type)) || r.status, message: ((j.error && j.error.message) || "").slice(0, 180) };
        };
        out.stripe.customers = await ask("customers?limit=1");
        out.stripe.connect = await ask("accounts?limit=1");
        // Can it CREATE one? Asked with nothing in the body, so nothing is made either way: a permissions
        // error means no, a missing-parameter error means yes.
        const r = await f("https://api.stripe.com/v1/accounts", {
          method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" }, body: "",
        });
        const j = await r.json().catch(() => ({}));
        out.stripe.canCreate = { status: r.status, code: (j.error && (j.error.code || j.error.type)) || "", message: ((j.error && j.error.message) || "").slice(0, 220) };
      }
    }
    // What testers have said, readable without an inbox existing. The notes were always in the database;
    // needing a mail forwarder to read your own feedback was a chore that did not have to exist.
    if (body.action === "feedback") {
      const r = await q(
        `select id, painter_id, step, verdict, note, screen, app, created_at
           from feedback order by created_at desc limit $1`, [Math.min(200, Math.max(1, parseInt(body.limit, 10) || 50))]);
      out.feedback = r.rows;
      const c = await q("select verdict, count(*)::int n from feedback group by verdict");
      out.counts = Object.fromEntries(c.rows.map((x) => [x.verdict || "note", x.n]));
    }
    // The funnel, by week (default), by ad, by campaign or by trade: joined, set up, chasing (and chasing inside a
    // week of joining), paid, and with seconds:true, still paying after the guarantee (a second paid invoice,
    // asked of Stripe one tradie at a time). Only tradies who joined since the funnel was written down are in it.
    if (body.action === "funnel") {
      await ensureSchema();
      const to = new Date(body.to || Date.now()), from = new Date(body.from || (Date.now() - 56 * 86400000));
      const dims = { week: "to_char(date_trunc('week', joined_at at time zone 'Australia/Adelaide'), 'YYYY-MM-DD')",
        ad: "coalesce(nullif(utm_content,''),'(none)')", campaign: "coalesce(nullif(utm_campaign,''),'(none)')",
        source: "coalesce(nullif(utm_source,''),'(none)')", trade: "coalesce(nullif(trade,''),'(not picked)')" };
      const by = dims[body.by] ? body.by : "week";
      const r = await q(
        `select ${dims[by]} as k, count(*)::int joined, count(setup_at)::int set_up, count(first_chase_at)::int chasing,
                count(*) filter (where first_chase_at < joined_at + interval '7 days')::int chasing_7d, count(paid_at)::int paid,
                array_remove(array_agg(case when paid_at is not null then coalesce(nullif(paid_cus,''), id) end), null) paying
           from painter where joined_at >= $1 and joined_at < $2 group by 1 order by 1`, [from.toISOString(), to.toISOString()]);
      out.by = by; out.from = from.toISOString(); out.to = to.toISOString();
      out.funnel = [];
      for (const row of r.rows) {
        const line = { [by]: row.k, joined: row.joined, set_up: row.set_up, chasing: row.chasing, chasing_7d: row.chasing_7d, paid: row.paid };
        if (body.seconds && process.env.STRIPE_SECRET_KEY) {
          let n = 0;
          for (const cus of (row.paying || []).slice(0, 200)) {
            try { const inv = await (await f("https://api.stripe.com/v1/invoices?status=paid&limit=3&customer=" + encodeURIComponent(cus), { headers: { Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY } })).json();
              if (((inv && inv.data) || []).filter((i) => Number(i.amount_paid) > 0).length >= 2) n++; } catch (e) {}
          }
          line.still_paying = n;
        }
        out.funnel.push(line);
      }
    }
    if (body.action === "who") {
      const r = await q("select id, trading_name, reply_to, phone, state, created_at from painter order by created_at");
      out.painters = r.rows;
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
