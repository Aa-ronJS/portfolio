// The relay's datastore. One helper, two backings: `pg` against DATABASE_URL in production, and whatever a test
// hands us through globalThis.__relayDb (pglite, so the tests run real Postgres without a server).
//
// Connections are cached on the module, which on Vercel means one per warm instance. Neon's pooled endpoint is
// what DATABASE_URL should point at, so a cold start is a new pooled session rather than a new Postgres backend.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let pool = null, poolUrl = "", ca = null;

// Supabase Root 2021 CA, sha256 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA
// Taken from the chain the pooler itself presents and checked against what Supabase documents. Expires 26 Apr 2031.
function caBundle() {
  if (ca !== null) return ca;
  try { ca = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "db", "supabase-root-2021-ca.crt"), "utf8"); }
  catch { ca = undefined; }
  return ca;
}

async function pgPool() {
  const url = process.env.DATABASE_URL || "";
  if (!url) throw new Error("No database: set DATABASE_URL");
  if (pool && poolUrl === url) return pool;
  const { default: pg } = await import("pg");
  // Supabase's pooler presents a chain rooted in their own CA, which is not in any public trust store, so Node
  // rejects it as self-signed. The answer is to pin that root, not to stop checking: without validation the
  // database password and every painter's work would be readable by anything sitting in the path.
  const local = /@(localhost|127\.0\.0\.1)[:\/]/.test(url);
  pool = new pg.Pool({
    connectionString: url, max: 1, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 12_000,
    ssl: local ? false : { rejectUnauthorized: true, ca: caBundle() },
  });
  poolUrl = url;
  return pool;
}

// $1-style placeholders, same as pg. Returns { rows }.
export async function q(text, params = []) {
  const test = globalThis.__relayDb;
  if (test) return test.query(text, params);
  const p = await pgPool();
  return p.query(text, params);
}

// A whole .sql file at once. pg takes several statements in one simple query; pglite wants exec().
async function execAll(sql) {
  const test = globalThis.__relayDb;
  if (test) return test.exec ? test.exec(sql) : test.query(sql, []);
  const p = await pgPool();
  return p.query(sql);
}

export async function tx(fn) {
  const test = globalThis.__relayDb;
  if (test) return fn(q); // pglite is single-connection; tests do not need real isolation
  const p = await pgPool();
  const c = await p.connect();
  try {
    await c.query("begin");
    const out = await fn((t, v = []) => c.query(t, v));
    await c.query("commit");
    return out;
  } catch (e) { try { await c.query("rollback"); } catch {} throw e; }
  finally { c.release(); }
}

export function dbConfigured() { return !!(globalThis.__relayDb || process.env.DATABASE_URL); }

// Small things the relay remembers about itself. Never a painter's data.
export async function getSetting(key) {
  const r = await q("select value from setting where key=$1", [key]).catch(() => ({ rows: [] }));
  return (r.rows[0] && r.rows[0].value) || "";
}
export async function setSetting(key, value) {
  await q(`insert into setting (key, value) values ($1,$2)
           on conflict (key) do update set value=excluded.value, updated_at=now()`, [key, String(value || "")]);
}

// Migrations are plain .sql files run in name order, each one recorded so a second run is a no-op.
export async function migrate() {
  await q("create table if not exists migration (name text primary key, run_at timestamptz not null default now())");
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "db");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set((await q("select name from migration")).rows.map((r) => r.name));
  const ran = [];
  for (const f of files) {
    if (done.has(f)) continue;
    await execAll(readFileSync(join(dir, f), "utf8"));
    // Two cold starts can reach the same new migration at the same moment. Every .sql file here is written to
    // be safe run twice (create/alter ... if not exists), so the race is harmless and the record is the only
    // thing that must not collide.
    await q("insert into migration (name) values ($1) on conflict (name) do nothing", [f]);
    ran.push(f);
  }
  return ran;
}

// The schema looks after itself.
//
// A new table used to mean somebody remembering to POST the migrate action with a secret, and a relay that
// answered wrongly until they did. Now the first request after a deploy applies whatever is new, once per warm
// instance, and a failure is swallowed: an out-of-date schema degrades one feature, where a thrown error here
// would take down sending, sign-in and everything else with it.
let schemaDone = null;
export function ensureSchema() {
  if (!dbConfigured()) return Promise.resolve([]);
  if (!schemaDone) schemaDone = migrate().catch((e) => { schemaDone = null; return []; });
  return schemaDone;
}
