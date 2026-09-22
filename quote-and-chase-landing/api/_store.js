// What the relay knows about a painter and his jobs. Thin on purpose: the app is still the author of a job,
// this only keeps the parts the SERVER has to answer questions about -- whose number is this, what is still
// open, when is he busy, what has been booked.
import { q, tx, dbConfigured } from "./_db.js";

export { dbConfigured };

// Australian mobiles arrive from Twilio as +61…, but a painter types 0412… . One shape, or the lookup misses.
export function e164(v, cc = "61") {
  const s = String(v == null ? "" : v).replace(/[^\d+]/g, "");
  if (!s) return "";
  if (s[0] === "+") return s;
  if (s.slice(0, 2) === "00") return "+" + s.slice(2);
  if (s[0] === "0") return "+" + cc + s.slice(1);
  if (s.slice(0, cc.length) === cc && s.length > 9) return "+" + s;
  return "+" + cc + s;
}

// Called from any request carrying a signed token, so the painter exists before anything references him.
export async function ensurePainter(p, extra = {}) {
  if (!p || !p.cus) return null;
  const r = await q(
    `insert into painter (id, sub, trading_name, reply_to, phone, state, tz, rules)
       values ($1,$2,$3,$4,$5,$6,coalesce(nullif($7,''),'Australia/Adelaide'),coalesce($8,'{}')::jsonb)
     on conflict (id) do update set
       sub          = coalesce(nullif(excluded.sub,''), painter.sub),
       trading_name = coalesce(nullif(excluded.trading_name,''), painter.trading_name),
       reply_to     = coalesce(nullif(excluded.reply_to,''), painter.reply_to),
       phone        = coalesce(nullif(excluded.phone,''), painter.phone),
       state        = coalesce(nullif(excluded.state,''), painter.state),
       updated_at   = now()
     returning *`,
    [p.cus, p.sub || "", extra.trading_name || p.name || "", extra.reply_to || p.reply_to || "",
     e164(extra.phone || ""), extra.state || "", extra.tz || "", extra.rules ? JSON.stringify(extra.rules) : null]
  );
  return r.rows[0] || null;
}

// Every message the relay sends is written down against its job, which is the whole trick behind routing a
// reply: the client's number is the key, and the newest send to it says who was talking to them.
export async function recordOutbound({ id, painter, job, channel, to, ref }) {
  if (!id || !painter) return;
  const addr = channel === "sms" ? e164(to) : String(to || "").trim().toLowerCase();
  await q(
    `insert into outbound (id, painter_id, job_id, channel, to_addr, ref)
       values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing`,
    [String(id), painter, String(job || ""), channel, addr, String(ref || "")]
  ).catch(() => {});
}

// Who was this number last quoted by? Prefer a job the app has actually told us about and that is still open;
// fall back to the last thing we sent them, which is all we know before the app has synced.
export async function findByPhone(phone) {
  const addr = e164(phone);
  if (!addr) return null;
  const open = await q(
    `select j.painter_id, j.job_id, j.client_name, j.quote_no, j.total_cents, j.status, p.trading_name, p.phone as painter_phone, p.reply_to
       from job_index j join painter p on p.id = j.painter_id
      where j.client_phone = $1 and j.status in ('quoted','invoiced')
      order by j.sent_at desc nulls last limit 1`, [addr]);
  if (open.rows[0]) return { ...open.rows[0], via: "job" };
  const last = await q(
    `select o.painter_id, o.job_id, p.trading_name, p.phone as painter_phone, p.reply_to
       from outbound o join painter p on p.id = o.painter_id
      where o.to_addr = $1 order by o.sent_at desc limit 1`, [addr]);
  return last.rows[0] ? { ...last.rows[0], client_name: "", quote_no: "", total_cents: 0, status: "", via: "outbound" } : null;
}

// Twilio retries a webhook it thinks failed, so the same reply can arrive twice. The MessageSid is the key.
export async function seenInbound(id) {
  if (!id) return false;
  const r = await q("select 1 from inbound where id=$1", [String(id)]);
  return r.rows.length > 0;
}
export async function recordInbound({ id, painter, job, from, body, action }) {
  await q(
    `insert into inbound (id, painter_id, job_id, from_addr, body, action)
       values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing`,
    [String(id), painter || null, String(job || ""), e164(from), String(body || "").slice(0, 1000), action]
  ).catch(() => {});
}

export async function markAccepted(painter, job) {
  const r = await q(
    `update job_index set status='accepted', updated_at=now()
      where painter_id=$1 and job_id=$2 and status='quoted' returning job_id`, [painter, job]);
  return r.rows.length > 0;
}

// Deleting a painter. The schema cascades his documents, jobs, availability, bookings and sent messages off
// the painter row. Replies do not cascade, because a reply from a number we have no record of belongs to
// nobody and must survive as the idempotency key, so his are deleted by id here. Photos live in Storage and
// are the caller's to clear. The privacy page promises the lot goes; this is the half that is in the database.
export async function forgetPainter(id) {
  const key = String(id || "");
  if (!key) return { painter: 0, replies: 0 };
  const p = await q("delete from painter where id=$1 returning id", [key]);
  const i = await q("delete from inbound where painter_id=$1 returning id", [key]);
  return { painter: p.rows.length, replies: i.rows.length };
}

export { q, tx };
