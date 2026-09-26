// GET/POST /y/<token>  —  the page a customer lands on to accept a quote and pick a start day.
//
// The token is signed, so the page trusts it without a session or a login: the customer proves nothing, the
// link does. Picking a day writes a booking, and THAT row is what "locked in" means -- not a note on somebody's
// phone that the other one cannot see.
//
// Days come from the painter's own diary: his app sends the dates he cannot start on (jobs, days off, his
// state's public holidays) and this only ever offers what is left.
import { rawBody, readToken, creds, sms, email as sendEmail } from "./_setup.js";
import { q, dbConfigured } from "./_store.js";
import { offerDays, rulesFor, prettyDay } from "./_slots.js";

export const config = { api: { bodyParser: false } };

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (c) => "$" + (Number(c || 0) / 100).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const first = (n) => String(n || "").trim().split(/\s+/)[0] || "";

function page(res, status, title, inner) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  res.end(`<!doctype html><html lang="en-AU"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>
  :root{--ink:#16181D;--dim:#5B5F66;--line:#E3E4DF;--paper:#fff;--bg:#F7F7F4;--go:#16181D}
  @media (prefers-color-scheme:dark){:root:not([data-theme=light]){--ink:#F2F2EE;--dim:#A7ABB2;--line:#33363C;--paper:#1B1E23;--bg:#121418;--go:#2B7BD6}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;padding:24px 16px 48px}
  .w{max-width:32rem;margin:0 auto}
  h1{font-size:1.5rem;line-height:1.2;margin:0 0 .4em}
  p{margin:0 0 1em;color:var(--dim)}
  .card{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:18px 18px 6px;margin:0 0 18px}
  .q{display:flex;justify-content:space-between;gap:12px;align-items:baseline;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:12px}
  .q b{font-size:1.1rem} .q span{font-variant-numeric:tabular-nums;font-weight:600}
  form{margin:0}
  button.day{display:block;width:100%;text-align:left;background:var(--paper);color:var(--ink);border:1px solid var(--line);
    border-radius:10px;padding:14px 16px;margin:0 0 10px;font:inherit;font-weight:600;cursor:pointer}
  button.day:hover,button.day:focus{border-color:var(--go);outline:none}
  button.day small{display:block;font-weight:400;color:var(--dim)}
  .done{background:var(--paper);border:1px solid var(--line);border-left:4px solid var(--go);border-radius:10px;padding:16px 18px}
  .fine{font-size:.85rem;color:var(--dim)}
</style></head><body><div class="w">${inner}</div></body></html>`);
}

const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const x = new Date(s + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x; };
// The working days a job actually occupies, so booking Friday for three days blocks Fri, Mon, Tue.
function runDays(start, need, working) {
  const out = []; for (let i = 0; out.length < need && i < 180; i++) { const d = addDays(start, i); if (working.has(d.getUTCDay())) out.push(ymd(d)); } return out;
}
function todayIn(tz) {
  try { const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Australia/Adelaide", year: "numeric", month: "2-digit", day: "2-digit" }); return f.format(new Date()); }
  catch { return new Date().toISOString().slice(0, 10); }
}

async function load(t) {
  const p = readToken("qc1." + String(t || ""), process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.p || !p.j) return null;
  const r = await q(
    `select j.*, pa.trading_name, pa.phone as painter_phone, pa.reply_to, pa.tz, pa.rules
       from job_index j join painter pa on pa.id=j.painter_id
      where j.painter_id=$1 and j.job_id=$2`, [p.p, p.j]);
  if (!r.rows[0]) return null;
  const booked = await q("select * from booking where painter_id=$1 and job_id=$2 and cancelled_at is null", [p.p, p.j]);
  return { job: r.rows[0], booking: booked.rows[0] || null, painter: p.p, jobId: p.j };
}

function confirmed(job, b) {
  return `<h1>You're booked in.</h1>
    <div class="done"><b>${esc(prettyDay(typeof b.start_day === "string" ? b.start_day : ymd(new Date(b.start_day)), job.tz))}</b>
    ${b.days > 1 ? `<br><span class="fine">About ${b.days} days on site.</span>` : ""}
    <br><span class="fine">${esc(job.trading_name || "The business")} has been told.</span></div>
    <p class="fine" style="margin-top:14px">Need to change it? Reply to the text, or ring ${esc(job.painter_phone || job.trading_name || "the business that quoted you")}.</p>`;
}

export default async function handler(req, res) {
  if (!dbConfigured()) return page(res, 503, "Not available", "<h1>Not available yet</h1><p>This link is not working. Please contact the business that sent it.</p>");
  const t = (req.url || "").split("?")[0].replace(/^\/(?:api\/y|y)\/?/, "").replace(/\/+$/, "") ||
            new URL(req.url || "", "https://x").searchParams.get("t") || "";

  let d = null; try { d = await load(t); } catch (e) { d = null; }
  if (!d) return page(res, 404, "Link not found", "<h1>This link has expired</h1><p>Please contact the business that sent it for a new one.</p>");
  const { job } = d;
  const tz = job.tz || "Australia/Adelaide";

  if (req.method === "POST") {
    const form = Object.fromEntries(new URLSearchParams((await rawBody(req, 10_000)).toString("utf8")));
    const want = String(form.day || "");
    if (d.booking) return page(res, 200, "Already booked", confirmed(job, d.booking));

    const rules = rulesFor(job);
    const busy = new Set((await q("select day from busy where painter_id=$1", [d.painter])).rows.map((r) => (typeof r.day === "string" ? r.day : ymd(new Date(r.day)))));
    const open = offerDays({ rules, busy, estDays: job.est_days || 1, today: todayIn(tz) });
    if (!open.includes(want)) {
      return page(res, 409, "That day has gone", `<h1>That day has just gone</h1><p>Someone got in first, or it has just been taken. Pick another.</p>` + pick(d, open, tz));
    }
    // Taking the days is the lock: the primary key on (painter, day, source) means two customers cannot both
    // win the same day, whichever of them tapped first.
    const working = new Set(rules.days);
    const days = runDays(want, Math.max(1, job.est_days || 1), working);
    let held = 0;
    for (const day of days) {
      const r = await q("insert into busy (painter_id, day, source, reason) values ($1,$2,'booking',$3) on conflict do nothing returning day",
        [d.painter, day, job.quote_no || d.jobId]);
      if (r.rows.length) held++;
    }
    if (held !== days.length) {
      for (const day of days) await q("delete from busy where painter_id=$1 and day=$2 and source='booking' and reason=$3", [d.painter, day, job.quote_no || d.jobId]).catch(() => {});
      const open2 = offerDays({ rules, busy, estDays: job.est_days || 1, today: todayIn(tz) }).filter((x) => x !== want);
      return page(res, 409, "That day has gone", `<h1>That day has just gone</h1><p>Someone got in first. Pick another.</p>` + pick(d, open2, tz));
    }
    const id = "bk_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    await q(`insert into booking (id, painter_id, job_id, start_day, days, start_hour, made_by)
             values ($1,$2,$3,$4,$5,$6,'client')
             on conflict (painter_id, job_id) where cancelled_at is null do nothing`,
      [id, d.painter, d.jobId, want, days.length, rules.hour]).catch(() => {});
    await q("update job_index set status='accepted', updated_at=now() where painter_id=$1 and job_id=$2 and status='quoted'", [d.painter, d.jobId]).catch(() => {});

    const b = (await q("select * from booking where painter_id=$1 and job_id=$2 and cancelled_at is null", [d.painter, d.jobId])).rows[0] || { start_day: want, days: days.length };
    const c = creds(), who = job.client_name || "Your customer";
    const note = `${who} booked ${job.quote_no || "the job"} to start ${prettyDay(want, tz)}${days.length > 1 ? ` (about ${days.length} days)` : ""}.`;
    if (job.painter_phone) sms(c, job.painter_phone, note).catch(() => {});
    if (job.reply_to) sendEmail(c, { to: job.reply_to, subject: note.slice(0, 78), body: note }).catch(() => {});
    return page(res, 200, "Booked in", confirmed(job, b));
  }

  if (d.booking) return page(res, 200, "Already booked", confirmed(job, d.booking));
  const rules = rulesFor(job);
  const busy = new Set((await q("select day from busy where painter_id=$1", [d.painter])).rows.map((r) => (typeof r.day === "string" ? r.day : ymd(new Date(r.day)))));
  const open = offerDays({ rules, busy, estDays: job.est_days || 1, today: todayIn(tz) });
  return page(res, 200, "Pick a start day", head(job) + pick(d, open, tz));
}

function head(job) {
  return `<h1>${job.client_name ? esc(first(job.client_name)) + ", pick" : "Pick"} a start day</h1>
    <div class="card"><div class="q"><b>${esc(job.trading_name || "Your quote")}</b><span>${esc(job.quote_no || "")} ${job.total_cents ? esc(money(job.total_cents)) : ""}</span></div>
    <p class="fine">Days ${esc(job.trading_name || "they")} ${job.trading_name ? "is" : "are"} free.</p></div>`;
}
function pick(d, open, tz) {
  if (!open.length) return `<p>Nothing free in the next few weeks. They will be in touch.</p>`;
  const est = d.job.est_days || 1;
  return `<form method="post">` + open.map((day) =>
    `<button class="day" name="day" value="${esc(day)}">${esc(prettyDay(day, tz))}${est > 1 ? `<small>about ${est} days on site</small>` : ""}</button>`
  ).join("") + `</form>`;
}
