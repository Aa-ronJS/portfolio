// GET/POST /api/gcal  —  connecting a painter's Google Calendar, so a day he is already busy is never offered.
//
// Three things happen here and nothing else:
//   start      the app asks for a consent link; the painter's own signed token goes into `state`, signed again
//              with a short life, so the callback knows whose calendar came back without a session or a cookie
//   callback   Google sends him back with a code; we swap it for a refresh token and keep only that
//   sync       read the days he is busy and write them into `busy` as source 'gcal'
//
// The scope is calendar.freebusy: it answers "busy" or "free" for a span of time. Not what the meeting is,
// not who is in it, not where. Nothing is ever written to his calendar. He can disconnect here too, and that
// deletes the token and every day it put in.
//
// Off unless GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set, like every other optional part of the relay.
import { cors, send, readJson, readToken, signToken, f, APP_URL } from "./_setup.js";
import { q, dbConfigured } from "./_db.js";
import { ensurePainter } from "./_store.js";

const SITE = (process.env.SITE_URL || "https://chasem.app").replace(/\/+$/, "");
const REDIRECT = SITE + "/api/gcal?action=callback";
const SCOPE = "https://www.googleapis.com/auth/calendar.freebusy";
const STATE_LIFE = 15 * 60 * 1000;

export function gcalConfigured() { return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET); }

const form = (o) => Object.keys(o).map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(o[k])).join("&");

// Google answers in instants; a painter thinks in days, in his own time. 9am in Adelaide is the previous day
// in UTC, so the date has to be read in his timezone or every early start marks the wrong day.
function dayIn(d, tz) {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Australia/Adelaide", year: "numeric", month: "2-digit", day: "2-digit" }).format(d); }
  catch { return d.toISOString().slice(0, 10); }
}

function consentUrl(state) {
  return "https://accounts.google.com/o/oauth2/v2/auth?" + form({
    client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: REDIRECT, response_type: "code",
    scope: SCOPE, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
  });
}

async function tokens(body) {
  const r = await f("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, ...body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error((j.error_description || j.error || "Google would not give us a token").slice(0, 200));
  return j;
}

// Which days in the window have anything on them at all. An all-day event covers its whole day; a two-hour
// meeting makes that day busy too, because a painter with an appointment in it cannot start a job that day.
export async function readBusy(painter, days) {
  const row = (await q(
    "select c.refresh_token, p.tz from calendar c join painter p on p.id=c.painter_id where c.painter_id=$1", [painter])).rows[0];
  if (!row) return null;
  const tz = row.tz || "Australia/Adelaide";
  const t = await tokens({ refresh_token: row.refresh_token, grant_type: "refresh_token" });
  const from = new Date(), to = new Date(Date.now() + (days || 90) * 86400000);
  const r = await f("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST", headers: { Authorization: "Bearer " + t.access_token, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: "primary" }] }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || ("Google Calendar said " + r.status));
  const spans = ((j.calendars && j.calendars.primary && j.calendars.primary.busy) || []);
  const out = new Set();
  for (const s of spans) {
    if (out.size >= 400) break;
    const a = new Date(s.start), b = new Date(s.end);
    if (isNaN(a) || isNaN(b)) continue;
    // every day the span touches, his time. A span that ends exactly at midnight does not reach into the next day.
    const last = dayIn(new Date(Math.max(a.getTime(), b.getTime() - 1)), tz);
    for (let d = new Date(a), n = 0; n < 400 && out.size < 400; d.setUTCDate(d.getUTCDate() + 1), n++) {
      const k = dayIn(d, tz);
      out.add(k);
      if (k >= last) break;
    }
  }
  return [...out].sort();
}

// Pull his calendar in and replace the gcal days with what it says now. Never touches source 'app'.
export async function syncCalendar(painter, days) {
  let found;
  try { found = await readBusy(painter, days); }
  catch (e) {
    await q("update calendar set error=$2, synced_at=now() where painter_id=$1", [painter, String((e && e.message) || "failed").slice(0, 200)]).catch(() => {});
    throw e;
  }
  if (found === null) return null;
  await q("delete from busy where painter_id=$1 and source='gcal'", [painter]);
  for (const d of found) await q("insert into busy (painter_id, day, source, reason) values ($1,$2,'gcal','') on conflict do nothing", [painter, d]);
  await q("update calendar set synced_at=now(), error='' where painter_id=$1", [painter]);
  return found.length;
}

function backToApp(res, result, why) {
  const url = APP_URL + "#/settings?calendar=" + encodeURIComponent(result) + (why ? "&why=" + encodeURIComponent(String(why).slice(0, 120)) : "");
  res.statusCode = 302; res.setHeader("Location", url); res.end();
}

export default async function handler(req, res) {
  const url = new URL(req.url, "http://x");
  const action = url.searchParams.get("action") || "";

  // Google's own redirect: a plain browser GET, not the app, so it answers with a redirect rather than JSON.
  if (req.method === "GET" && action === "callback") {
    if (!gcalConfigured() || !dbConfigured()) return backToApp(res, "off");
    const err = url.searchParams.get("error");
    if (err) return backToApp(res, "no", err === "access_denied" ? "You said no to the permission." : err);
    const st = readToken(url.searchParams.get("state") || "", process.env.RELAY_SIGNING_SECRET);
    if (!st || !st.cus || st.kind !== "gcal" || !st.exp || Date.now() > st.exp) return backToApp(res, "expired");
    try {
      const t = await tokens({ code: url.searchParams.get("code") || "", grant_type: "authorization_code", redirect_uri: REDIRECT });
      if (!t.refresh_token) return backToApp(res, "no", "Google did not offer a lasting permission. Remove the app at myaccount.google.com and try again.");
      let account = "";
      try {
        const who = await f("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: "Bearer " + t.access_token } });
        if (who.ok) account = String((await who.json()).email || "").slice(0, 160);
      } catch (e) {}
      await q(
        `insert into calendar (painter_id, provider, account, refresh_token, error)
           values ($1,'google',$2,$3,'')
         on conflict (painter_id) do update set account=excluded.account, refresh_token=excluded.refresh_token, error='', synced_at=null`,
        [st.cus, account, t.refresh_token]);
      await syncCalendar(st.cus, 90).catch(() => {});
      return backToApp(res, "on");
    } catch (e) { return backToApp(res, "failed", (e && e.message) || "That did not work"); }
  }

  if (!cors(req, res, "POST, OPTIONS")) return send(res, 403, { ok: false, error: "Not allowed from here" });
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!gcalConfigured() || !dbConfigured()) return send(res, 503, { ok: false, error: "Calendars are not switched on yet", off: true });

  let body; try { body = await readJson(req, 10_000); } catch (e) { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const p = readToken(body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.cus) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });

  try {
    if (body.action === "start") {
      await ensurePainter(p, body.me || {});
      const state = signToken({ v: 1, kind: "gcal", cus: p.cus, exp: Date.now() + STATE_LIFE }, process.env.RELAY_SIGNING_SECRET);
      return send(res, 200, { ok: true, url: consentUrl(state) });
    }
    if (body.action === "status") {
      const row = (await q("select account, synced_at, error from calendar where painter_id=$1", [p.cus])).rows[0];
      const n = row ? (await q("select count(*)::int n from busy where painter_id=$1 and source='gcal'", [p.cus])).rows[0].n : 0;
      return send(res, 200, { ok: true, connected: !!row, account: row ? row.account : "", synced_at: row ? row.synced_at : null, error: row ? row.error : "", days: n });
    }
    if (body.action === "sync") {
      const n = await syncCalendar(p.cus, 90);
      if (n === null) return send(res, 200, { ok: true, connected: false });
      return send(res, 200, { ok: true, connected: true, days: n });
    }
    if (body.action === "disconnect") {
      await q("delete from calendar where painter_id=$1", [p.cus]);
      await q("delete from busy where painter_id=$1 and source='gcal'", [p.cus]);
      return send(res, 200, { ok: true, connected: false });
    }
    return send(res, 400, { ok: false, error: "No such action" });
  } catch (e) {
    return send(res, 502, { ok: false, error: (e && e.message) || "That did not work" });
  }
}
