// A local Candid with no accounts needed: `node tools/dev.mjs` serves public/ and the api/ handlers on
// http://localhost:3123 against pglite (Postgres in-process) unless DATABASE_URL is set. The passcode is
// "local-passcode" unless OWNER_PASSCODE is set. Claude answers if ANTHROPIC_API_KEY is set; otherwise the
// built-in heuristics do. Same routing as vercel.json: clean URLs and /r/<token> → r.html.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 3123);
process.env.OWNER_PASSCODE ||= "local-passcode";
process.env.SESSION_SECRET ||= "local-secret-local-secret";
process.env.APP_URL ||= `http://localhost:${PORT}/`;
process.env.NODE_ENV ||= "test";
if (!process.env.DATABASE_URL) {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(process.env.PGLITE_DIR || undefined);
  globalThis.__candidDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
}
const handlers = { auth: (await import("../api/auth.js")).default, business: (await import("../api/business.js")).default, reviewer: (await import("../api/reviewer.js")).default, lead: (await import("../api/lead.js")).default, photo: (await import("../api/photo.js")).default };
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };

createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const m = u.pathname.match(/^\/api\/(\w+)$/);
  if (m && handlers[m[1]]) { try { await handlers[m[1]](req, res); } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: String(e.message) })); } return; }
  let p = u.pathname;
  if (/^\/r\/[A-Za-z0-9_-]+$/.test(p)) p = "/r.html";
  if (p === "/") p = "/index.html";
  if (!extname(p)) p += ".html";
  try { const body = await readFile(join(root, "public", p)); res.setHeader("Content-Type", types[extname(p)] || "application/octet-stream"); res.end(body); }
  catch { res.statusCode = 404; res.end("Not found"); }
}).listen(PORT, () => console.log(`Candid on ${process.env.APP_URL} · passcode ${process.env.OWNER_PASSCODE} · db ${process.env.DATABASE_URL ? "postgres" : "pglite"} · ai ${process.env.ANTHROPIC_API_KEY ? "claude" : "built-in"}`));
