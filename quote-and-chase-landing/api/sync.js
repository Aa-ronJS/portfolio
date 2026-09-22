// POST /api/sync  —  the phone and the server reconciling.
//
// The phone is still a full working copy and still works with no signal; this is what makes the server the one
// both he and his customer can agree on. He pushes what changed since he last spoke to us, we hand back what
// changed here -- which is mostly his customers accepting quotes and picking start days while his phone was in
// his pocket.
//
// Authenticated by the signed token the app already holds. No passwords, nothing new to set up.
import { cors, send, readJson, readToken } from "./_setup.js";
import { q, tx, ensurePainter, dbConfigured, e164 } from "./_store.js";
import { gcalConfigured, syncCalendar } from "./gcal.js";

const KINDS = new Set(["job", "client", "settings", "invoice"]);
const cents = (v) => Math.round(Number(v || 0) * 100);
const iso = (v) => { const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); };
const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null);

// What the server needs to be able to answer questions about, pulled out of the app's own job shape.
// Everything else stays in the document, untouched and unread.
function jobRow(painter, id, j) {
  const c = (j && j.client) || {}, quote = (j && j.quote) || {};
  return {
    painter_id: painter, job_id: id,
    client_name: String(c.name || "").slice(0, 120),
    client_phone: e164(c.phone || ""),
    client_email: String(c.email || "").trim().toLowerCase().slice(0, 160),
    quote_no: String(quote.number || j.quote_no || "").slice(0, 40),
    total_cents: cents(quote.total != null ? quote.total : j.manual_total),
    status: String(j.status || "").slice(0, 20),
    sent_at: iso(j.sent_date) || null,
    est_days: Math.max(1, Math.min(60, parseInt(j.est_days || (j.quote && j.quote.days) || 1, 10) || 1)),
  };
}

export default async function handler(req, res) {
  if (!cors(req, res)) return send(res, 403, { ok: false, error: "Not allowed from here" });
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!dbConfigured()) return send(res, 503, { ok: false, error: "Sync is not switched on yet", off: true });

  let body; try { body = await readJson(req, 4_000_000); } catch (e) { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const p = readToken(body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.cus) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });

  await ensurePainter(p, body.me || {});
  const now = new Date().toISOString();
  const pushed = Array.isArray(body.push) ? body.push.slice(0, 500) : [];
  let taken = 0;

  await tx(async (run) => {
    for (const d of pushed) {
      if (!d || !KINDS.has(d.kind) || !d.id) continue;
      const rev = Math.max(1, parseInt(d.rev, 10) || 1);
      // The rev guard is the whole conflict story: a phone that has been in a pocket for a week cannot
      // undo newer work simply by being the last to speak.
      const r = await run(
        `insert into doc (painter_id, kind, id, rev, deleted, body, updated_at)
           values ($1,$2,$3,$4,$5,$6::jsonb, now())
         on conflict (painter_id, kind, id) do update
           set rev=excluded.rev, deleted=excluded.deleted, body=excluded.body, updated_at=now()
         where doc.rev < excluded.rev
         returning id`,
        [p.cus, d.kind, String(d.id).slice(0, 80), rev, !!d.deleted, JSON.stringify(d.body || {})]);
      if (!r.rows.length) continue; // a stale write; the puller will get the newer one back
      taken++;
      if (d.kind === "job") {
        if (d.deleted) { await run("delete from job_index where painter_id=$1 and job_id=$2", [p.cus, String(d.id)]); continue; }
        const j = jobRow(p.cus, String(d.id).slice(0, 80), d.body || {});
        await run(
          `insert into job_index (painter_id, job_id, client_name, client_phone, client_email, quote_no, total_cents, status, sent_at, est_days, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
           on conflict (painter_id, job_id) do update set
             client_name=excluded.client_name, client_phone=excluded.client_phone, client_email=excluded.client_email,
             quote_no=excluded.quote_no, total_cents=excluded.total_cents, status=excluded.status,
             sent_at=excluded.sent_at, est_days=excluded.est_days, updated_at=now()`,
          [j.painter_id, j.job_id, j.client_name, j.client_phone, j.client_email, j.quote_no, j.total_cents, j.status, j.sent_at, j.est_days]);
      }
    }

    // Days he cannot start on. The app already knows his jobs, his days off and his state's public holidays,
    // so it sends the dates and the server never has to learn a holiday calendar.
    if (Array.isArray(body.busy)) {
      const days = body.busy.map(day).filter(Boolean).slice(0, 400);
      await run("delete from busy where painter_id=$1 and source='app'", [p.cus]);
      for (const d of days) await run("insert into busy (painter_id, day, source) values ($1,$2,'app') on conflict do nothing", [p.cus, d]);
    }
    if (body.rules && typeof body.rules === "object") {
      await run("update painter set rules=$2::jsonb, updated_at=now() where id=$1", [p.cus, JSON.stringify(body.rules)]);
    }
  });

  // A connected calendar is refreshed here rather than on a timer: he syncs when he opens the app, which is
  // exactly when the days need to be right. Stale by more than six hours is enough; a failure is his to see in
  // Set-up, not a reason to fail his sync.
  let calendar = null;
  if (gcalConfigured()) {
    const cal = (await q("select account, synced_at, error from calendar where painter_id=$1", [p.cus])).rows[0];
    if (cal) {
      const age = cal.synced_at ? Date.now() - new Date(cal.synced_at).getTime() : Infinity;
      if (age > 6 * 3600 * 1000) { try { await syncCalendar(p.cus, 90); } catch (e) {} }
      const fresh = (await q("select account, synced_at, error from calendar where painter_id=$1", [p.cus])).rows[0] || cal;
      const n = (await q("select count(*)::int n from busy where painter_id=$1 and source='gcal'", [p.cus])).rows[0].n;
      calendar = { connected: true, account: fresh.account, synced_at: fresh.synced_at, error: fresh.error, days: n };
    } else calendar = { connected: false };
  }

  // Hand back everything newer than he has seen. `since` is our own timestamp, echoed from the last reply.
  const since = iso(body.since) || "1970-01-01T00:00:00.000Z";
  const changed = await q(
    `select kind, id, rev, deleted, body from doc
      where painter_id=$1 and updated_at > $2 order by updated_at limit 500`, [p.cus, since]);
  const bookings = await q(
    `select b.id, b.job_id, b.start_day, b.days, b.start_hour, b.made_by, b.created_at, j.client_name
       from booking b left join job_index j on j.painter_id=b.painter_id and j.job_id=b.job_id
      where b.painter_id=$1 and b.cancelled_at is null and b.created_at > $2 order by b.created_at limit 200`, [p.cus, since]);
  const replies = await q(
    `select id, job_id, from_addr, body, action, received_at from inbound
      where painter_id=$1 and received_at > $2 order by received_at limit 200`, [p.cus, since]);

  return send(res, 200, {
    ok: true, now, took: taken,
    changes: changed.rows.map((r) => ({ kind: r.kind, id: r.id, rev: Number(r.rev), deleted: r.deleted, body: r.body })),
    bookings: bookings.rows, replies: replies.rows, calendar,
  });
}
