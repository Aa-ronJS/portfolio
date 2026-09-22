// POST /api/feedback  —  what a tester found, on its way to a person.
//
// Kept twice on purpose: a row in the database so nothing is lost, and an email so someone actually reads it.
// The id comes from the phone, so sending the same note again (a retry, a flaky signal) cannot double it up.
//
// Works with no token: a tester who has not signed up yet still has something worth saying. What it will not do
// is take any more than a note.
import { cors, send, readJson, readToken, f } from "./_setup.js";
import { q, dbConfigured } from "./_db.js";

const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const TO = process.env.FEEDBACK_TO || process.env.SUPPORT_EMAIL || "help@chasem.app";

function digest(items, who) {
  const lines = items.map((i) => {
    const mark = i.verdict === "broken" ? "BROKEN" : i.verdict === "works" ? "works " : "note  ";
    return [mark + "  " + (i.step || "(no step)"), i.note ? "        " + i.note.replace(/\n/g, "\n        ") : "", i.screen ? "        on " + i.screen : ""].filter(Boolean).join("\n");
  });
  const broken = items.filter((i) => i.verdict === "broken").length;
  return {
    subject: broken ? broken + " thing" + (broken > 1 ? "s" : "") + " broken in the app" : items.length + " note" + (items.length > 1 ? "s" : "") + " from a test drive",
    text: [who ? "From " + who : "From a tester", "", ...lines, "", (items[0] && items[0].app) ? "App " + items[0].app : "", (items[0] && items[0].ua) ? items[0].ua : ""].filter(Boolean).join("\n"),
  };
}

export default async function handler(req, res) {
  if (!cors(req, res, "POST, OPTIONS")) return send(res, 403, { ok: false, error: "Not allowed from here" });
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });

  let body; try { body = await readJson(req, 200_000); } catch (e) { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const p = readToken(body.token, process.env.RELAY_SIGNING_SECRET);   // optional: a note is worth having either way
  const painter = (p && p.cus) || "";
  const who = clean(body.who, 120) || (p && p.name) || "";

  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 100).map((i) => ({
    id: clean(i && i.id, 60), step: clean(i && i.step, 120), verdict: clean(i && i.verdict, 12),
    note: clean(i && i.note, 4000), screen: clean(i && i.screen, 200), app: clean(i && i.app, 40), ua: clean(i && i.ua, 200),
  })).filter((i) => i.id && (i.note || i.verdict));
  if (!items.length) return send(res, 400, { ok: false, error: "Nothing to send" });

  let stored = 0;
  if (dbConfigured()) {
    for (const i of items) {
      const r = await q(
        `insert into feedback (id, painter_id, step, verdict, note, screen, app, ua)
           values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do nothing returning id`,
        [i.id, painter, i.step, i.verdict, i.note, i.screen, i.app, i.ua]).catch(() => ({ rows: [] }));
      stored += r.rows.length;
    }
  }

  // The email is the point: a row nobody reads is not feedback. A send that fails does not lose the note,
  // because the row is already down.
  let mailed = false;
  const key = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM;
  if (key && from) {
    const d = digest(items, who);
    const r = await f("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [TO], subject: d.subject, text: d.text, reply_to: clean(body.reply_to, 160) || undefined }),
    }).catch(() => null);
    mailed = !!(r && r.ok);
  }

  return send(res, 200, { ok: true, stored, mailed, kept: dbConfigured() });
}
