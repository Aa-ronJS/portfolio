// Request plumbing: JSON in and out, and the signed session cookie. An account is an email; admins are the
// addresses in ADMIN_EMAILS.
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

export function send(res, status, obj) { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(obj)); }
export async function rawBody(req, max = 200000) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > max) throw new Error("Body too large"); chunks.push(c); }
  return Buffer.concat(chunks);
}
export async function readJson(req, max = 200000) {
  const b = await rawBody(req, max); if (!b.length) return {};
  const j = JSON.parse(b.toString("utf8"));
  if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error("Bad JSON");
  return j;
}
export const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const newToken = (n = 18) => b64url(randomBytes(n));
const secret = () => process.env.SESSION_SECRET || "";
export function same(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); }
export const norm = (e) => String(e || "").trim().toLowerCase();
export const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 120;
export const isAdmin = (email) => String(process.env.ADMIN_EMAILS || "").split(",").map(norm).filter(Boolean).includes(norm(email));

// "c1.<payload>.<hmac>", 30 days: the account id, its email, whether it is an admin, when it expires.
export function signSession(payload) { const body = b64url(Buffer.from(JSON.stringify(payload), "utf8")); return "c1." + body + "." + b64url(createHmac("sha256", secret()).update(body).digest()); }
export function readSession(token) {
  if (typeof token !== "string" || !token.startsWith("c1.") || !secret()) return null;
  const parts = token.split("."); if (parts.length !== 3) return null;
  if (!same(parts[2], b64url(createHmac("sha256", secret()).update(parts[1]).digest()))) return null;
  let p; try { p = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")); } catch { return null; }
  if (!p || !(p.exp > Date.now()) || !p.acct) return null;
  return { acct: p.acct, email: p.email, admin: isAdmin(p.email) };
}
export function cookies(req) { const out = {}; String(req.headers.cookie || "").split(";").forEach((c) => { const i = c.indexOf("="); if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); }); return out; }
export function owner(req) { return readSession(cookies(req).candid_session); }
export function setSessionCookie(res, token, clear) {
  const secure = process.env.NODE_ENV === "production";
  res.setHeader("Set-Cookie", `candid_session=${clear ? "" : encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}; Max-Age=${clear ? 0 : 30 * 86400}`);
}
export const configured = () => !!secret();
export const place = (req) => String(req.headers["x-real-ip"] || String(req.headers["x-forwarded-for"] || "").split(",")[0] || "").trim();
export const APP_URL = () => String(process.env.APP_URL || "").replace(/\/?$/, "/");
