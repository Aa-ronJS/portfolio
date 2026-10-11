// Stripe over its REST API, and the webhook signature check. Tests stub fetch through globalThis.__candidFetch.
import { createHmac, timingSafeEqual } from "node:crypto";
import { f } from "./_email.js";

export const stripeOn = () => !!process.env.STRIPE_SECRET_KEY || !!globalThis.__candidFetch;
export async function stripe(path, form, method) {
  const key = process.env.STRIPE_SECRET_KEY || "sk_test";
  const r = await f("https://api.stripe.com/v1/" + path, { method: method || (form ? "POST" : "GET"),
    headers: Object.assign({ Authorization: "Bearer " + key }, form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    body: form ? new URLSearchParams(form).toString() : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || "Stripe " + r.status);
  return j;
}
// Stripe-Signature: t=<unix>,v1=<hex>. The signed payload is `${t}.${raw}`. Five minutes of tolerance.
export function stripeSigned(rawBuf, header, secret, tolSec = 300, now = Date.now()) {
  if (!secret || !header) return false;
  const parts = {}; String(header).split(",").forEach((kv) => { const i = kv.indexOf("="); if (i > 0) { const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim(); (parts[k] = parts[k] || []).push(v); } });
  const t = Number((parts.t || [])[0]); if (!(t > 0) || Math.abs(now / 1000 - t) > tolSec) return false;
  const exp = createHmac("sha256", secret).update(t + ".").update(rawBuf).digest();
  return (parts.v1 || []).some((v) => { try { const got = Buffer.from(v, "hex"); return got.length === exp.length && timingSafeEqual(got, exp); } catch { return false; } });
}
export const PACKS = [100, 250, 500, 1000];
