// /api/find  —  find the quotes a tradie has already sent, by logging in once to his email or his Xero.
//
// Like a broker pulling bank statements, but he never gives us a password: he logs in on Microsoft's,
// Google's or Xero's own page and taps Allow. We use that permission once, straight away, to read what he
// sent in the last six months, keep only what looks like a quote or an unpaid invoice, and throw the
// permission away. No lasting access is kept, no email is kept, and what was found waits here for his phone
// to collect it -- an hour at most -- and is then deleted.
//
//   POST { token, action: "which" }             which of the three are switched on
//   POST { token, action: "start", provider }   the login page to send him to
//   GET  /find/back?code&state                  the provider sends him back here; we look, then send him to the app
//   POST { token, action: "collect", id }       his phone picks up what was found
//
// Each provider is off until its keys are set: MS_CLIENT_ID/MS_CLIENT_SECRET (Outlook, Hotmail, Microsoft 365),
// GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (Gmail), XERO_CLIENT_ID/XERO_CLIENT_SECRET (Xero). The same reading code
// the app uses for pasted emails (public/app/ingest.js) reads every message here, so the two never disagree.
import { cors, send, readJson, readToken, signToken, f } from "./_setup.js";
import { q, dbConfigured, ensureSchema } from "./_db.js";
import { ensurePainter } from "./_store.js";
import { randomBytes } from "node:crypto";
import "../public/app/ingest.js";            // the app's own reader, so a pasted email and a found one read the same

const I = globalThis.QCIngest;

const SITE = (process.env.SITE_URL || "https://chasem.app").replace(/\/+$/, "");
const BACK = SITE + "/find/back";                       // a rewrite to /api/find?action=callback: providers want a plain URL
const APP = SITE + "/app/#/add/";
const STATE_LIFE = 15 * 60 * 1000, KEEP_MIN = 60, LOOK_BACK_DAYS = 180, MAX_MESSAGES = 150;
const env = (k) => process.env[k] || "";
const form = (o) => Object.keys(o).map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(o[k])).join("&");
const day = (v) => { const d = new Date(v); return isNaN(d) ? "" : d.toISOString().slice(0, 10); };

async function getJson(url, headers) {
  const r = await f(url, { headers: Object.assign({ Accept: "application/json" }, headers || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(((j.error && (j.error.message || j.error)) || j.Detail || j.Message || ("said " + r.status)).toString().slice(0, 200));
  return j;
}
async function swap(url, body, headers) {
  const r = await f(url, { method: "POST", headers: Object.assign({ "Content-Type": "application/x-www-form-urlencoded" }, headers || {}), body: form(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(String(j.error_description || j.error || "The login did not give us permission").slice(0, 200));
  return j;
}

// ---- reading one sent email --------------------------------------------------------------------------------
// A quote he sent has someone it went to and an amount. A request to a supplier ("can you quote me for...")
// usually has no amount, so it falls out on its own. Emails to himself are not quotes.
export function fromEmail(m, own) {
  const to = String(m.to || "");
  if (own && to.toLowerCase().indexOf(String(own).toLowerCase()) >= 0 && to.split(/[,;]/).length === 1) return null;
  const text = "To: " + to + "\nSent: " + (m.date || "") + "\nSubject: " + (m.subject || "") + "\n\n" + String(m.body || "").slice(0, 20000);
  if (!/quot|estimat|invoice|price|proposal|\$/i.test((m.subject || "") + " " + String(m.body || "").slice(0, 4000))) return null;
  const it = I.parseText(text);
  if (!(it.amount > 0) || it.amount > 5000000 || !(it.name || it.email)) return null;
  it.date = it.date || day(m.date);
  it.source = "email";
  return it;
}
// Several emails about the same quote (the quote, then a nudge, then a revised figure): the latest one for
// each person and amount is the one to chase.
export function latestOnly(items) {
  const seen = new Map();
  items.forEach((it) => {
    const k = (it.email || it.name || "").toLowerCase() + "|" + Math.round(it.amount * 100);
    const had = seen.get(k);
    if (!had || String(it.date) > String(had.date)) seen.set(k, it);
  });
  return [...seen.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// Plain text from an email part: text/plain if there is one, else the HTML with the tags taken out.
function gmailText(payload) {
  let plain = "", html = "";
  (function walk(p) {
    if (!p) return;
    const data = p.body && p.body.data ? Buffer.from(String(p.body.data).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8") : "";
    if (p.mimeType === "text/plain" && data) plain += data + "\n";
    else if (p.mimeType === "text/html" && data) html += data + "\n";
    (p.parts || []).forEach(walk);
  })(payload);
  return plain || html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#36;/g, "$");
}

const PROVIDERS = {
  microsoft: {
    name: "Outlook",
    on: () => !!(env("MS_CLIENT_ID") && env("MS_CLIENT_SECRET")),
    login: (state) => "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" + form({
      client_id: env("MS_CLIENT_ID"), response_type: "code", redirect_uri: BACK, response_mode: "query",
      scope: "User.Read Mail.Read", state, prompt: "select_account",
    }),
    token: (code) => swap("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      client_id: env("MS_CLIENT_ID"), client_secret: env("MS_CLIENT_SECRET"), code, redirect_uri: BACK, grant_type: "authorization_code", scope: "User.Read Mail.Read",
    }),
    async scan(t) {
      const auth = { Authorization: "Bearer " + t.access_token };
      const me = await getJson("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", auth).catch(() => ({}));
      const own = me.mail || me.userPrincipalName || "";
      const since = new Date(Date.now() - LOOK_BACK_DAYS * 86400000).toISOString();
      let url = "https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages?" + form({
        $top: "50", $select: "subject,toRecipients,sentDateTime,body", $filter: "sentDateTime ge " + since, $orderby: "sentDateTime desc",
      }), seen = 0;
      const items = [];
      while (url && seen < MAX_MESSAGES) {
        const j = await getJson(url, Object.assign({ Prefer: 'outlook.body-content-type="text"' }, auth));
        (j.value || []).forEach((m) => {
          seen++;
          const to = (m.toRecipients || []).map((r) => { const a = r.emailAddress || {}; return (a.name ? a.name + " " : "") + "<" + (a.address || "") + ">"; }).join(", ");
          const it = fromEmail({ to, date: m.sentDateTime, subject: m.subject, body: m.body && m.body.content }, own);
          if (it) items.push(it);
        });
        url = j["@odata.nextLink"] || "";
      }
      return { account: own, scanned: seen, items: latestOnly(items) };
    },
  },

  google: {
    name: "Gmail",
    on: () => !!(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET")),
    login: (state) => "https://accounts.google.com/o/oauth2/v2/auth?" + form({
      client_id: env("GOOGLE_CLIENT_ID"), redirect_uri: BACK, response_type: "code", access_type: "online",
      scope: "https://www.googleapis.com/auth/gmail.readonly", state, prompt: "select_account",
    }),
    token: (code) => swap("https://oauth2.googleapis.com/token", {
      client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), code, redirect_uri: BACK, grant_type: "authorization_code",
    }),
    async scan(t) {
      const auth = { Authorization: "Bearer " + t.access_token }, base = "https://gmail.googleapis.com/gmail/v1/users/me/";
      const prof = await getJson(base + "profile", auth).catch(() => ({}));
      const own = prof.emailAddress || "";
      const list = await getJson(base + "messages?" + form({ q: "in:sent newer_than:" + LOOK_BACK_DAYS + "d (quote OR quotation OR estimate OR invoice OR price)", maxResults: String(MAX_MESSAGES) }), auth);
      const ids = (list.messages || []).map((m) => m.id).slice(0, MAX_MESSAGES), items = [];
      for (let i = 0; i < ids.length; i += 10) {
        const batch = await Promise.all(ids.slice(i, i + 10).map((id) => getJson(base + "messages/" + encodeURIComponent(id) + "?format=full", auth).catch(() => null)));
        batch.forEach((m) => {
          if (!m || !m.payload) return;
          const h = {}; (m.payload.headers || []).forEach((x) => { h[String(x.name).toLowerCase()] = x.value; });
          const it = fromEmail({ to: h.to, date: h.date, subject: h.subject, body: gmailText(m.payload) }, own);
          if (it) items.push(it);
        });
      }
      return { account: own, scanned: ids.length, items: latestOnly(items) };
    },
  },

  xero: {
    name: "Xero",
    on: () => !!(env("XERO_CLIENT_ID") && env("XERO_CLIENT_SECRET")),
    login: (state) => "https://login.xero.com/identity/connect/authorize?" + form({
      response_type: "code", client_id: env("XERO_CLIENT_ID"), redirect_uri: BACK,
      scope: "openid profile email accounting.transactions.read accounting.contacts.read", state,
    }),
    token: (code) => swap("https://identity.xero.com/connect/token", { grant_type: "authorization_code", code, redirect_uri: BACK },
      { Authorization: "Basic " + Buffer.from(env("XERO_CLIENT_ID") + ":" + env("XERO_CLIENT_SECRET")).toString("base64") }),
    async scan(t) {
      const auth = { Authorization: "Bearer " + t.access_token };
      const orgs = await getJson("https://api.xero.com/connections", auth);
      const org = (orgs || [])[0]; if (!org) return { account: "", scanned: 0, items: [] };
      const h = Object.assign({ "xero-tenant-id": org.tenantId }, auth), api = "https://api.xero.com/api.xro/2.0/";
      const [sent, won, owing] = await Promise.all([
        getJson(api + "Quotes?Status=SENT", h).catch(() => ({ Quotes: [] })),
        getJson(api + "Quotes?Status=ACCEPTED", h).catch(() => ({ Quotes: [] })),
        getJson(api + "Invoices?" + form({ Statuses: "AUTHORISED", where: 'Type=="ACCREC"' }), h).catch(() => ({ Invoices: [] })),
      ]);
      const quotes = [].concat(sent.Quotes || [], won.Quotes || []), invs = owing.Invoices || [];
      // the phone numbers live on the contact, not on the quote
      const ids = [...new Set([].concat(quotes, invs).map((x) => x.Contact && x.Contact.ContactID).filter(Boolean))].slice(0, 200), who = {};
      for (let i = 0; i < ids.length; i += 50) {
        const c = await getJson(api + "Contacts?IDs=" + ids.slice(i, i + 50).join(","), h).catch(() => ({ Contacts: [] }));
        (c.Contacts || []).forEach((x) => { who[x.ContactID] = x; });
      }
      const person = (cid, fallback) => {
        const c = who[cid] || {}, ph = (c.Phones || []).filter((p) => p.PhoneNumber).sort((a, b) => (b.PhoneType === "MOBILE") - (a.PhoneType === "MOBILE"))[0];
        const phone = ph ? I.tidyPhone((ph.PhoneAreaCode || "") + ph.PhoneNumber) : "";
        const pname = [c.FirstName, c.LastName].filter(Boolean).join(" ");
        return { name: pname || c.Name || fallback || "", business: pname && c.Name && c.Name !== pname ? c.Name : "", email: String(c.EmailAddress || "").toLowerCase(), phone };
      };
      const items = [];
      quotes.forEach((x) => { const p = person(x.Contact && x.Contact.ContactID, x.Contact && x.Contact.Name); if (!(x.Total > 0) || !p.name) return;
        items.push(Object.assign(p, { kind: "quote", amount: +x.Total, date: String(x.DateString || "").slice(0, 10), number: x.QuoteNumber || "", what: x.Title || x.Reference || "", accepted: x.Status === "ACCEPTED", source: "xero" })); });
      invs.forEach((x) => { const p = person(x.Contact && x.Contact.ContactID, x.Contact && x.Contact.Name); if (!(x.AmountDue > 0) || !p.name) return;
        items.push(Object.assign(p, { kind: "invoice", amount: +x.Total, paid: +x.AmountPaid || 0, date: String(x.DateString || "").slice(0, 10), due: String(x.DueDateString || "").slice(0, 10), number: x.InvoiceNumber || "", what: x.Reference || "", source: "xero" })); });
      return { account: org.tenantName || "", scanned: quotes.length + invs.length, items };
    },
  },
};
export const providersOn = () => Object.keys(PROVIDERS).filter((k) => PROVIDERS[k].on());

function toApp(res, where) { res.statusCode = 302; res.setHeader("Location", APP + where); res.end(); }

export default async function handler(req, res) {
  const url = new URL(req.url, "http://x"), action = url.searchParams.get("action") || "";

  // The provider's own redirect: a plain browser GET. The look happens here, while he waits a few seconds.
  if (req.method === "GET" && action === "callback") {
    if (!dbConfigured()) return toApp(res, "find?why=off");
    await ensureSchema();
    const st = readToken(url.searchParams.get("state") || "", process.env.RELAY_SIGNING_SECRET);
    const pv = st && PROVIDERS[st.provider];
    if (!st || !st.cus || st.kind !== "find" || !pv || !st.exp || Date.now() > st.exp) return toApp(res, "find?why=expired");
    const err = url.searchParams.get("error");
    if (err) return toApp(res, "find?why=" + (err === "access_denied" ? "no" : "failed"));
    try {
      const t = await pv.token(url.searchParams.get("code") || "");
      const got = await pv.scan(t);                           // the permission is used here and nowhere else
      const id = randomBytes(12).toString("base64url");
      await q("delete from found where created_at < now() - interval '" + KEEP_MIN + " minutes'").catch(() => {});
      await q("insert into found (id, painter_id, provider, account, items, scanned) values ($1,$2,$3,$4,$5::jsonb,$6)",
        [id, st.cus, st.provider, String(got.account || "").slice(0, 160), JSON.stringify(got.items.slice(0, 300)), got.scanned | 0]);
      return toApp(res, "found?k=" + id);
    } catch (e) { return toApp(res, "find?why=failed&p=" + st.provider); }
  }

  // The website asks which logins are switched on, so it only ever mentions the ones that work. Names only.
  if (req.method === "GET" && action === "which") {
    res.setHeader("Cache-Control", "public, max-age=300");
    return send(res, 200, { ok: true, providers: dbConfigured() ? providersOn().map((k) => PROVIDERS[k].name) : [] });
  }

  if (!cors(req, res, "POST, OPTIONS")) return send(res, 403, { ok: false, error: "Not allowed from here" });
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  let body; try { body = await readJson(req, 10_000); } catch (e) { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const p = readToken(body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.cus) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });

  if (body.action === "which") return send(res, 200, { ok: true, providers: dbConfigured() ? providersOn() : [] });
  if (!dbConfigured()) return send(res, 503, { ok: false, error: "Finding quotes is not switched on yet", off: true });
  await ensureSchema();
  await ensurePainter(p, body.me || {});

  if (body.action === "start") {
    const pv = PROVIDERS[String(body.provider || "")];
    if (!pv || !pv.on()) return send(res, 400, { ok: false, error: "That one is not switched on yet" });
    const state = signToken({ v: 1, kind: "find", cus: p.cus, provider: String(body.provider), exp: Date.now() + STATE_LIFE }, process.env.RELAY_SIGNING_SECRET);
    return send(res, 200, { ok: true, url: pv.login(state) });
  }

  if (body.action === "collect") {
    const row = (await q("select provider, account, items, scanned, created_at from found where id=$1 and painter_id=$2", [String(body.id || ""), p.cus])).rows[0];
    if (!row || Date.now() - new Date(row.created_at).getTime() > KEEP_MIN * 60000) return send(res, 404, { ok: false, error: "That look has expired. Log in again." });
    await q("delete from found where id=$1", [String(body.id)]);   // collected once, then gone
    const items = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
    return send(res, 200, { ok: true, provider: row.provider, name: PROVIDERS[row.provider] ? PROVIDERS[row.provider].name : row.provider, account: row.account, scanned: row.scanned, items });
  }

  return send(res, 400, { ok: false, error: "No such action" });
}
