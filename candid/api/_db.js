// The datastore: `pg` against DATABASE_URL in production, pglite from the tests through globalThis.__candidDb.
// Same shape as chasem-landing/api/_db.js, with the Supabase root pinned for the same reason.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let pool = null, poolUrl = "", ca = null;
function caBundle() {
  if (ca !== null) return ca;
  try { ca = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "db", "supabase-root-2021-ca.crt"), "utf8"); } catch { ca = undefined; }
  return ca;
}
async function pgPool() {
  const url = process.env.DATABASE_URL || "";
  if (!url) throw new Error("No database: set DATABASE_URL");
  if (pool && poolUrl === url) return pool;
  const { default: pg } = await import("pg");
  const local = /@(localhost|127\.0\.0\.1)[:\/]/.test(url);
  const supa = /supabase\.(co|com)/.test(url);
  pool = new pg.Pool({ connectionString: url, max: 1, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 12_000,
    ssl: local ? false : supa ? { rejectUnauthorized: true, ca: caBundle() } : { rejectUnauthorized: true } });
  poolUrl = url;
  return pool;
}
export async function q(text, params = []) {
  const test = globalThis.__candidDb;
  if (test) return test.query(text, params);
  return (await pgPool()).query(text, params);
}
async function execAll(sql) {
  const test = globalThis.__candidDb;
  if (test) return test.exec ? test.exec(sql) : test.query(sql, []);
  return (await pgPool()).query(sql);
}
export async function tx(fn) {
  const test = globalThis.__candidDb;
  if (test) return fn(q);
  const p = await pgPool(); const c = await p.connect();
  try { await c.query("begin"); const out = await fn((t, v = []) => c.query(t, v)); await c.query("commit"); return out; }
  catch (e) { try { await c.query("rollback"); } catch {} throw e; }
  finally { c.release(); }
}
export function dbConfigured() { return !!(globalThis.__candidDb || process.env.DATABASE_URL); }
export async function migrate() {
  await q("create table if not exists migration (name text primary key, run_at timestamptz not null default now())");
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "db");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set((await q("select name from migration")).rows.map((r) => r.name));
  for (const f of files) {
    if (done.has(f)) continue;
    await execAll(readFileSync(join(dir, f), "utf8"));
    await q("insert into migration (name) values ($1) on conflict (name) do nothing", [f]);
  }
}
let schemaDone = null;
export function ensureSchema() {
  if (!dbConfigured()) return Promise.resolve();
  if (!schemaDone) schemaDone = migrate().catch(() => { schemaDone = null; });
  return schemaDone;
}
