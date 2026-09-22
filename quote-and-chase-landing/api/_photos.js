// Job photos live in Supabase Storage, not in the database.
//
// They are base64 inside the job on the phone, which is fine there and hopeless anywhere else: eight of them is
// well over a megabyte, so they travel on their own and the job document carries only a note that they exist.
//
// The bucket is private. Nothing is ever served from it directly: a phone asks the relay, the relay checks the
// painter's signed token and hands back a URL that works for an hour. The service key never leaves the server.
const BUCKET = process.env.SUPABASE_BUCKET || "job-photos";

function base() {
  const u = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!u || !k) return null;
  return { u, k, h: { Authorization: "Bearer " + k, apikey: k } };
}
export function photosConfigured() { return !!base(); }

const f = (...a) => (globalThis.__relayFetch || fetch)(...a);
const clean = (s) => String(s || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);

// <painter>/<job>/<photo>.jpg — the painter's own id is the first segment, so one painter's token can never
// name another painter's file however the request is shaped.
export function photoPath(painter, job, id) {
  const p = clean(painter), j = clean(job), i = clean(id);
  if (!p || !j || !i) return "";
  return `${p}/${j}/${i}.jpg`;
}

// Made once, on the first upload. Private: every read goes through a signed URL.
export async function ensureBucket() {
  const b = base(); if (!b) return false;
  const r = await f(`${b.u}/storage/v1/bucket/${BUCKET}`, { headers: b.h });
  if (r.ok) return true;
  const c = await f(`${b.u}/storage/v1/bucket`, {
    method: "POST", headers: { ...b.h, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: 6_000_000, allowed_mime_types: ["image/jpeg", "image/png", "image/webp"] }),
  });
  return c.ok || c.status === 409;
}

export async function putPhoto(path, bytes, type = "image/jpeg") {
  const b = base(); if (!b) throw new Error("Photo storage is not set up");
  const r = await f(`${b.u}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST", headers: { ...b.h, "Content-Type": type, "x-upsert": "true" }, body: bytes,
  });
  if (!r.ok) throw new Error("Storage " + r.status + ": " + (await r.text().catch(() => "")).slice(0, 160));
  return { path };
}

export async function signPhoto(path, seconds = 3600) {
  const b = base(); if (!b) throw new Error("Photo storage is not set up");
  const r = await f(`${b.u}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: "POST", headers: { ...b.h, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: seconds }),
  });
  if (!r.ok) return "";
  const j = await r.json().catch(() => ({}));
  const rel = j.signedURL || j.signedUrl || "";
  return rel ? (rel.startsWith("http") ? rel : b.u + "/storage/v1" + rel) : "";
}

export async function deletePhoto(path) {
  const b = base(); if (!b) return false;
  const r = await f(`${b.u}/storage/v1/object/${BUCKET}/${path}`, { method: "DELETE", headers: b.h });
  return r.ok;
}

// Everything under a job, for when a job is deleted.
export async function deleteJobPhotos(painter, job) {
  const b = base(); if (!b) return 0;
  const prefix = `${clean(painter)}/${clean(job)}`;
  const r = await f(`${b.u}/storage/v1/object/list/${BUCKET}`, {
    method: "POST", headers: { ...b.h, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 100 }),
  });
  if (!r.ok) return 0;
  const items = await r.json().catch(() => []);
  const names = (Array.isArray(items) ? items : []).map((x) => `${prefix}/${x.name}`);
  if (!names.length) return 0;
  const d = await f(`${b.u}/storage/v1/object/${BUCKET}`, {
    method: "DELETE", headers: { ...b.h, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: names }),
  });
  return d.ok ? names.length : 0;
}
