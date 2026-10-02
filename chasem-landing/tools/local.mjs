// Run Chasem on this computer, server and all, to try it by hand: node tools/local.mjs, then open the address it prints.
//
// The app is served at the root, as go.chasem.app serves it, and /api/... runs the real handlers in api/ against a
// real Postgres (pglite, kept in .local/ so accounts survive a restart). Two things are stand-ins, so nothing real is
// ever charged or sent: Stripe keeps its customers in .local/stripe.json, and every email lands in the test inbox at
// /__mail instead of going anywhere. Texts and anything else outbound are swallowed and listed there too.
// It listens on 127.0.0.1 only. Delete .local/ to start again from nothing.
import http from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const HERE = dirname(fileURLToPath(import.meta.url));
const LANDING = join(HERE, "..");
const APP = join(LANDING, "..", "chasem-app");
const LOCAL = join(LANDING, ".local");
const PORT = Number(process.env.PORT) || 8400;
mkdirSync(LOCAL, { recursive: true });

const secretFile = join(LOCAL, "secret.txt");
if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(24).toString("hex"));
Object.assign(process.env, {
  RELAY_SIGNING_SECRET: readFileSync(secretFile, "utf8").trim(),
  STRIPE_SECRET_KEY: "sk_local_stand_in", RESEND_API_KEY: "re_local_stand_in", RESEND_FROM: "Chasem <help@chasem.app>",
  FEEDBACK_READ_KEY: existsSync(join(LOCAL, "feedback-key")) ? readFileSync(join(LOCAL, "feedback-key"), "utf8").trim() : "",
  APP_URL: `http://localhost:${PORT}/`, RELAY_URL: `http://localhost:${PORT}/api/msg`, FREE_MESSAGES: "12",
});

const db = new PGlite(join(LOCAL, "db"));
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };

// ---- the stand-ins
const stripeFile = join(LOCAL, "stripe.json");
const stripeData = existsSync(stripeFile) ? JSON.parse(readFileSync(stripeFile, "utf8")) : { customers: [] };
const saveStripe = () => writeFileSync(stripeFile, JSON.stringify(stripeData, null, 2));
const inbox = [];
const reply = (j, status = 200) => ({ ok: status < 400, status, json: async () => j, text: async () => JSON.stringify(j) });
function applyForm(c, form) {
  for (const [k, v] of form) {
    const m = k.match(/^metadata\[(.+)\]$/);
    if (m) { c.metadata = c.metadata || {}; if (v === "") delete c.metadata[m[1]]; else c.metadata[m[1]] = v; }
    else if (!k.includes("[")) c[k] = v;
  }
}
globalThis.__relayFetch = async (url, opt = {}) => {
  const u = String(url), body = String(opt.body || ""), form = new URLSearchParams(body);
  if (u.includes("api.resend.com")) {
    let m = {}; try { m = JSON.parse(body); } catch {}
    inbox.unshift({ at: new Date(), to: (m.to || []).join(", "), subject: m.subject || "", text: m.text || "" });
    return reply({ id: "em_local_" + inbox.length });
  }
  if (u.includes("api.stripe.com")) {
    let m;
    if (/\/v1\/customers\?/.test(u)) { const want = decodeURIComponent((u.match(/email=([^&]+)/) || [])[1] || ""); return reply({ data: stripeData.customers.filter((c) => c.email === want) }); }
    if (/\/v1\/customers$/.test(u)) { const c = { id: "cus_local" + (stripeData.customers.length + 1), object: "customer", metadata: {} }; applyForm(c, form); stripeData.customers.push(c); saveStripe(); return reply(c); }
    if ((m = u.match(/\/v1\/customers\/([^/?]+)$/))) {
      const c = stripeData.customers.find((x) => x.id === decodeURIComponent(m[1])); if (!c) return reply({ error: { message: "No such customer" } }, 404);
      if ((opt.method || "GET") === "POST") { applyForm(c, form); saveStripe(); }
      return reply(c);
    }
    if (/\/v1\/subscriptions\?/.test(u)) return reply({ data: [] });
    return reply({ data: [] });
  }
  inbox.unshift({ at: new Date(), to: "(outbound call, not sent)", subject: (opt.method || "GET") + " " + u.split("?")[0], text: body.slice(0, 2000) });
  return reply({});
};

const { migrate } = await import(pathToFileURL(join(LANDING, "api", "_db.js")).href);
await migrate();

// ---- the server
const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".txt": "text/plain; charset=utf-8", ".pdf": "application/pdf" };
const handlers = {};
async function api(name) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) return null;
  const file = join(LANDING, "api", name + ".js");
  if (!existsSync(file)) return null;
  if (!handlers[name]) handlers[name] = (await import(pathToFileURL(file).href)).default;
  return handlers[name];
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function mailPage() {
  const rows = inbox.map((m) => {
    const code = (m.text.match(/Your code is (\d{6})/) || [])[1];
    return `<article><p class="meta">${esc(m.at.toLocaleTimeString("en-AU"))} &middot; to ${esc(m.to)}</p><h2>${esc(m.subject)}</h2>${code ? `<p class="code">${code}</p>` : ""}<pre>${esc(m.text)}</pre></article>`;
  }).join("") || "<p>Nothing yet. Emails the app sends while you test will show up here.</p>";
  return `<!doctype html><html lang="en-AU"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="5"><title>Test inbox</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0 auto;max-width:720px;padding:16px;background:#F7F7F4;color:#16181D}h1{font-size:1.4rem}.warn{background:#FFF1D6;padding:10px 12px;border-radius:10px}
article{background:#fff;border:1px solid #DCDED9;border-radius:12px;padding:12px 14px;margin:12px 0}h2{font-size:1rem;margin:4px 0}.meta{color:#5B5F66;font-size:.85rem;margin:0}.code{font-size:2rem;font-weight:700;letter-spacing:.2em;margin:4px 0}pre{white-space:pre-wrap;font:14px/1.45 ui-monospace,Consolas,monospace;color:#3B3F46;margin:6px 0 0}</style>
<h1>Test inbox</h1><p class="warn">Local testing only. Nothing here was really sent. This page refreshes every 5 seconds.</p>${rows}</html>`;
}

http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent((req.url || "/").split("?")[0]);
    if (path === "/__mail") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }); return res.end(mailPage()); }
    const am = path.match(/^\/api\/([a-z0-9-]+)\/?$/);
    if (am) {
      const h = await api(am[1]);
      if (!h) { res.writeHead(404, { "Content-Type": "application/json" }); return res.end('{"ok":false,"error":"No such endpoint"}'); }
      req.headers["x-real-ip"] = req.socket.remoteAddress || "127.0.0.1";
      return await h(req, res);
    }
    let file = normalize(join(APP, path));
    if (!file.startsWith(APP)) { res.writeHead(403); return res.end(); }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(readFileSync(file));
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
    res.end('{"ok":false,"error":"Local server error"}');
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Chasem, running locally: http://localhost:${PORT}/`);
  console.log(`Test inbox (codes land here): http://localhost:${PORT}/__mail`);
});
