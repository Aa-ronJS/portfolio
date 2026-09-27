// Meta's Conversions API: the steps that happen inside the app (a proved sign-up, set-up done, the first chase,
// the first payment) told to Meta from the server, because the app itself runs no pixel and iPhones block much of
// what a pixel would send. Off unless META_PIXEL_ID and META_CAPI_TOKEN are both set. The email is sent only as a
// SHA-256 hash, which is what Meta asks for. It never throws and never waits long: an ad platform must not be the
// reason a sign-up or a send was slow, let alone failed.
import { createHash } from "node:crypto";
import { f } from "./_setup.js";

const sha = (s) => createHash("sha256").update(String(s).trim().toLowerCase()).digest("hex");
export function metaOn() { return !!(process.env.META_PIXEL_ID && process.env.META_CAPI_TOKEN); }

// o: { email, id (our customer id), fbclid, clickedAt, ip, ua, value, eventId, url }
export async function metaEvent(name, o = {}) {
  if (!metaOn()) return false;
  try {
    const ud = {};
    if (o.email) ud.em = [sha(o.email)];
    if (o.id) ud.external_id = [sha(o.id)];
    if (o.fbclid) ud.fbc = "fb.1." + (Number(new Date(o.clickedAt || Date.now())) || Date.now()) + "." + String(o.fbclid).slice(0, 500);
    if (o.ip) ud.client_ip_address = String(o.ip).slice(0, 64);
    if (o.ua) ud.client_user_agent = String(o.ua).slice(0, 400);
    const ev = { event_name: name, event_time: Math.floor(Date.now() / 1000), action_source: "website", event_source_url: o.url || "https://go.chasem.app/", user_data: ud };
    if (o.eventId) ev.event_id = String(o.eventId).slice(0, 100);
    if (o.value != null) ev.custom_data = { value: Number(o.value) || 0, currency: "AUD" };
    const body = { data: [ev] };
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
    const url = `https://graph.facebook.com/${process.env.META_API_VERSION || "v21.0"}/${encodeURIComponent(process.env.META_PIXEL_ID)}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN)}`;
    const r = await Promise.race([
      f(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
      new Promise((_, no) => setTimeout(() => no(new Error("slow")), 2000)),
    ]);
    return !!(r && r.ok);
  } catch (e) { return false; }
}
