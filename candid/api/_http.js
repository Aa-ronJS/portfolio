// Request plumbing: JSON in and out, the owner's signed session cookie, and the one-passcode login.
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

export function send(res, status, obj) { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(obj)); }
export async function readJson(req, max = 200000) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > max) throw new Error("Body too large"); chunks.push(c); }
  if (!n) return {};
  const j = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error("Bad JSON");
  return j;
}
export const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const newToken = (n = 18) => b64url(randomBytes(n));
const secret = () => process.env.SESSION_SECRET || "";
function same(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); }

// "c1.<payload>.<hmac>", 30 days. The payload is tiny: who (owner) and when it expires.
export function signSession(payload) { const body = b64url(Buffer.from(JSON.stringify(payload), "utf8")); return "c1." + body + "." + b64url(createHmac("sha256", secret()).update(body).digest()); }
export function readSession(token) {
  if (typeof token !== "string" || !token.startsWith("c1.") || !secret()) return null;
  const parts = token.split("."); if (parts.length !== 3) return null;
  if (!same(parts[2], b64url(createHmac("sha256", secret()).update(parts[1]).digest()))) return null;
  let p; try { p = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")); } catch { return null; }
  return p && p.exp > Date.now() ? p : null;
}
export function cookies(req) { const out = {}; String(req.headers.cookie || "").split(";").forEach((c) => { const i = c.indexOf("="); if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); }); return out; }
export function owner(req) { return readSession(cookies(req).candid_session); }
export function setSessionCookie(res, token, clear) {
  const secure = process.env.NODE_ENV !== "test" && !/localhost/.test(String(process.env.APP_URL || ""));
  res.setHeader("Set-Cookie", `candid_session=${clear ? "" : encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}; Max-Age=${clear ? 0 : 30 * 86400}`);
}
export function passcodeOk(given) { const want = process.env.OWNER_PASSCODE || ""; return !!want && want.length >= 8 && same(given, want); }
export const configured = () => !!(process.env.OWNER_PASSCODE && (process.env.OWNER_PASSCODE.length >= 8) && secret());
export const place = (req) => String(req.headers["x-real-ip"] || String(req.headers["x-forwarded-for"] || "").split(",")[0] || "").trim();
