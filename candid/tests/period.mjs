// One whole period through the real handlers on real Postgres (pglite), on a fixed clock, with Claude, Resend
// and Stripe stubbed. Then the clock: deadlines release seats, end peer rating, time out flags and close the period.
import { PGlite } from "@electric-sql/pglite";
import { Readable } from "node:stream";
import { createHmac } from "node:crypto";

const db = new PGlite();
globalThis.__candidDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, { SESSION_SECRET: "s3cret_s3cret", APP_URL: "https://candid.test/", NODE_ENV: "test", ADMIN_EMAILS: "Aaron@Example.com", STRIPE_WEBHOOK_SECRET: "whsec_test" });
delete process.env.ANTHROPIC_API_KEY;

// Claude, stubbed by the shape of the request.
const seen = [];
globalThis.__candidAI = { beta: { messages: { parse: async (p) => {
  seen.push(p); const u = p.messages[0].content;
  if (/^Brief questions:.*\n\nReview:/s.test(u)) return { stop_reason: "end_turn", parsed_output: /Five stars/.test(u) ? { onBrief: 20, quality: 10, flag: "pasted from elsewhere" } : /perfect/.test(u) ? { onBrief: 50, quality: 15, flag: "none" } : { onBrief: 85, quality: 80, flag: "none" } };
  if (/Issue:/.test(u)) return { stop_reason: "end_turn", parsed_output: { category: /gate/.test(u) ? "missing step" : /loyalty/.test(u) ? "suggestion" : "inaccuracy", teaser: "Something at booking…", onBrief: /loyalty/.test(u) ? 20 : 80, quality: /loyalty/.test(u) ? 15 : 70 } };
  if (/^Existing:/.test(u)) { const m = /"id":"([a-z0-9]+)","title":"No field for a gate code/.exec(u); return { stop_reason: "end_turn", parsed_output: { duplicateOf: m && /Gate code has nowhere/.test(u) ? m[1] : "none" } }; }
  if (/^Flag reason:/.test(u)) return { stop_reason: "end_turn", parsed_output: /pasted from elsewhere/.test(u) ? { verdict: "breach", confidence: 0.9, reasoning: "boilerplate" } : /unfairly positive/.test(u) ? { verdict: "unsure", confidence: 0.5, reasoning: "no specifics" } : { verdict: "clear", confidence: 0.95, reasoning: "specific" } };
  throw new Error("unexpected prompt: " + u.slice(0, 80));
} } } };
// Resend and Stripe, stubbed through fetch.
const mails = [], stripeCalls = [];
const sessions = { cs_1: { id: "cs_1", payment_status: "paid", metadata: { business: "", amount: "200" } }, cs_unpaid: { id: "cs_unpaid", payment_status: "unpaid", metadata: { business: "", amount: "200" } } };
globalThis.__candidFetch = async (url, opt = {}) => {
  if (String(url).includes("resend.com")) { mails.push(JSON.parse(opt.body)); return { ok: true, status: 200, json: async () => ({ id: "em" + mails.length }) }; }
  if (String(url).includes("api.stripe.com")) {
    stripeCalls.push({ url: String(url), body: opt.body });
    if (/checkout\/sessions$/.test(url)) { const f = new URLSearchParams(opt.body); return { ok: true, status: 200, json: async () => ({ id: "cs_1", url: "https://checkout.stripe.com/c/cs_1", metadata: { business: f.get("metadata[business]"), amount: f.get("metadata[amount]") } }) }; }
    const m = /checkout\/sessions\/(\w+)$/.exec(url); const s = m && sessions[m[1]];
    return s ? { ok: true, status: 200, json: async () => s } : { ok: false, status: 404, json: async () => ({ error: { message: "No such session" } }) };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};

const { migrate } = await import("../api/_db.js");
await migrate();
const auth = (await import("../api/auth.js")).default, business = (await import("../api/business.js")).default, reviewer = (await import("../api/reviewer.js")).default;
const admin = (await import("../api/admin.js")).default, checkout = (await import("../api/checkout.js")).default, webhook = (await import("../api/stripe-webhook.js")).default, photo = (await import("../api/photo.js")).default;
const E = await import("../api/_engine.js");

let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
// The clock starts at real time: sign-in codes expire on the database's own clock, so a pinned date would make them look expired.
const realNow = Date.now; let clock = realNow(); Date.now = () => clock; const day = (n) => { clock += n * 86400000; };
function res() { return { statusCode: 0, headers: {}, body: "", setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ""; } }; }
let cookie = "";
async function call(fn, method, url, body, hdr = {}, raw) {
  const req = Readable.from(raw ? [raw] : body ? [Buffer.from(JSON.stringify(body))] : []);
  req.method = method; req.url = url; req.headers = { "content-type": "application/json", cookie, "x-real-ip": "1.2.3.4", ...hdr };
  const r = res(); await fn(req, r);
  if (r.headers["set-cookie"]) cookie = r.headers["set-cookie"].split(";")[0];
  let j = {}; try { j = r.body ? JSON.parse(r.body) : {}; } catch (e) { j = { raw: r.body }; }
  return { status: r.statusCode, ...j };
}
const B = (body) => call(business, "POST", "/api/business", body);
const R = (body) => call(reviewer, "POST", "/api/reviewer", body);
const AD = (body) => call(admin, "POST", "/api/admin", body);
const codeFor = (email) => { const m = mails.slice().reverse().find((x) => x.to[0] === email); return /(\d{6}) is your/.exec(m.subject)[1]; };
async function signIn(email) { const s = await call(auth, "POST", "/api/auth", { action: "start", email }); if (!s.ok) return s; return call(auth, "POST", "/api/auth", { action: "check", email, code: codeFor(email) }); }

// ---- sign in
let a = await call(auth, "GET", "/api/auth");
ok(a.configured === true && a.loggedIn === false && a.ai === true && a.mailer === true && a.stripe === true, "server is configured; Claude, Resend and Stripe stubbed in");
a = await call(auth, "POST", "/api/auth", { action: "start", email: "not-an-email" });
ok(a.status === 400, "a bad email is refused");
a = await call(auth, "POST", "/api/auth", { action: "start", email: "aaron@example.com" });
ok(a.status === 200 && a.sent === true && !a.devCode && mails.length === 1 && /is your Candid code/.test(mails[0].subject), "a code is emailed and not returned");
a = await call(auth, "POST", "/api/auth", { action: "check", email: "aaron@example.com", code: "000000" });
ok(a.status === 401, "a wrong code is refused");
let b = await B({ action: "create", name: "Loop Laundry" });
ok(b.status === 401, "nothing on the business side answers without a session");
a = await call(auth, "POST", "/api/auth", { action: "check", email: "aaron@example.com", code: codeFor("aaron@example.com") });
ok(a.status === 200 && a.created === true && a.admin === true && /candid_session=c1\./.test(cookie), "the right code creates the account, signs in, and ADMIN_EMAILS makes it an admin (case-insensitive)");
a = await call(auth, "POST", "/api/auth", { action: "check", email: "aaron@example.com", code: codeFor("aaron@example.com") });
ok(a.status === 400, "a code works once");

// ---- business, brief, credits by card, period
b = await B({ action: "create", name: "Loop Laundry" }); const id = b.id; sessions.cs_1.metadata.business = id; sessions.cs_unpaid.metadata.business = id;
ok(b.status === 200 && b.business.name === "Loop Laundry" && b.business.periodNo === 0 && b.admin, "a business is created with no period; the admin view comes along for an admin");
b = await B({ id, action: "newPeriod" });
ok(b.status === 400 && /brief/i.test(b.error), "no period without a brief");
const BRIEF = { product: "Loop Laundry picks up your washing, washes and folds it, and brings it back within 48 hours.", audience: "Inner north, no machine", job: "Book one pickup, hand over a bag, get it back in 48 hours. First load free.",
  wants: ["Booking: was it clear when we would arrive and what to leave out?", "Handover: did anything about the bag, the label or the pickup confuse you?", "Return and payment: was the return on time, and was paying clear?"], known: ["Pickup window is 4 hours"], wontChange: "No dry cleaning.", eligibility: "Lives in the inner north and has no washing machine." };
b = await B({ id, action: "brief", ...BRIEF });
ok(b.business.briefs.length === 1 && b.business.briefs[0].wants.length === 3, "brief v1 saved");
b = await B({ id, action: "newPeriod" }); ok(b.business.period.state === "draft" && b.business.period.briefV === 1, "period 1 drafted on brief v1");
b = await B({ id, action: "fund", seats: 5 }); ok(b.status === 400 && /credits/i.test(b.error), "funding needs credits: " + b.error);
b = await B({ id, action: "credits", amount: 200 }); ok(b.status === 400, "manual credits are not a business action");
let c = await call(checkout, "POST", "/api/checkout", { id, pack: 123 }); ok(c.status === 400, "only a listed pack can be bought");
c = await call(checkout, "POST", "/api/checkout", { id, pack: 200 }); ok(c.status === 400, "$200 is not a pack");
c = await call(checkout, "POST", "/api/checkout", { id, pack: 250 });
ok(c.status === 200 && c.url === "https://checkout.stripe.com/c/cs_1" && /unit_amount%5D=25000/.test(stripeCalls[0].body) && /currency%5D=aud/.test(stripeCalls[0].body), "a pack starts a Stripe Checkout session in AUD");
c = await call(checkout, "POST", "/api/checkout", { action: "confirm", id, session_id: "cs_unpaid" });
ok(c.status === 200 && c.paid === false && c.credited === false && c.business.credits.balance === 0, "returning from an unpaid session credits nothing");
c = await call(checkout, "POST", "/api/checkout", { action: "confirm", id, session_id: "cs_1" });
ok(c.status === 200 && c.credited === true && c.business.credits.balance === 200 && c.business.credits.ledger[0].what === "Card payment", "returning from a paid session credits the business once");
ok(mails.some((m) => /\$200 of credit added/.test(m.subject)), "and the owner is emailed");
const sign = (raw, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac("sha256", "whsec_test").update(t + ".").update(raw).digest("hex")}`;
let raw = Buffer.from(JSON.stringify({ type: "checkout.session.completed", data: { object: sessions.cs_1 } }));
let w = await call(webhook, "POST", "/api/stripe-webhook", null, { "stripe-signature": sign(raw), cookie: "" }, raw);
ok(w.status === 200 && w.credited === false, "the webhook for the same session is a no-op");
b = await call(business, "GET", "/api/business?id=" + id); ok(b.business.credits.balance === 200, "so the balance stays at $200");
raw = Buffer.from(JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_2", payment_status: "paid", metadata: { business: id, amount: "100" } } } }));
w = await call(webhook, "POST", "/api/stripe-webhook", null, { "stripe-signature": "t=1,v1=00", cookie: "" }, raw);
ok(w.status === 400, "a bad signature is refused");
w = await call(webhook, "POST", "/api/stripe-webhook", null, { "stripe-signature": sign(raw, Math.floor(Date.now() / 1000) - 900), cookie: "" }, raw);
ok(w.status === 400, "an old signature is refused");
w = await call(webhook, "POST", "/api/stripe-webhook", null, { "stripe-signature": sign(raw), cookie: "" }, raw);
ok(w.status === 200 && w.credited === true, "a signed webhook for a new session credits");
b = await call(business, "GET", "/api/business?id=" + id); ok(b.business.credits.balance === 300, "balance is now $300");
b = await AD({ id, action: "credits", amount: -100, note: "oops" }); ok(b.status === 400, "an admin cannot add a negative amount");
b = await AD({ id, action: "credits", amount: 50, note: "bank transfer" }); ok(b.status === 200 && b.businesses.length === 1, "an admin can record a manual top-up");
b = await B({ id, action: "fund", seats: 5 });
ok(b.business.period.state === "funded" && b.business.credits.balance === 230 && b.business.credits.locked === 120, "5 seats lock $120 and leave $230");
b = await B({ id, action: "recruit" });
const links = b.business.reviewers.map((r) => r.link);
ok(b.business.period.state === "recruiting" && links.length === 5 && links.every((l) => /^https:\/\/candid\.test\/r\/[A-Za-z0-9_-]{20,}$/.test(l)), "recruiting issues five invite links");
const tokens = links.map((l) => l.split("/r/")[1]);
b = await B({ id, action: "brief", ...BRIEF, wontChange: "No dry cleaning, no same-day." });
ok(b.business.briefs.length === 2 && b.business.period.briefV === 1, "editing the brief mid-period makes v2 but the period keeps v1");

// ---- a second account cannot see this business
const adminCookie = cookie; cookie = "";
a = await signIn("other@example.com");
ok(a.status === 200 && a.created === true && a.admin === false, "a second account signs up and is not an admin");
b = await call(business, "GET", "/api/business?id=" + id); ok(b.status === 404, "it cannot read the first account's business");
b = await B({ id, action: "fund", seats: 3 }); ok(b.status === 404, "or act on it");
b = await call(admin, "GET", "/api/admin"); ok(b.status === 403, "or open the platform pages");
b = await call(business, "GET", "/api/business?list=1"); ok(b.status === 200 && b.businesses.length === 0 && b.meta.admin === false, "its own list is empty");
cookie = adminCookie;

// ---- reviewers accept
let r = await call(reviewer, "GET", "/api/reviewer?token=nonsense");
ok(r.status === 404, "a made-up token is refused");
r = await call(reviewer, "GET", "/api/reviewer?token=" + tokens[0]);
ok(r.status === 200 && r.view.me.seat === "invited" && r.view.brief.v === 1 && !r.view.me.contact, "a real token shows the invitation");
r = await R({ token: tokens[0], action: "accept", knew: "no", eligible: true, name: "Dana", email: "dana@example.com", payid: "0400000001" });
ok(r.status === 400 && /state/i.test(r.error), "a seat needs a state: " + r.error);
r = await R({ token: tokens[0], action: "accept", knew: "no", eligible: true, name: "Dana Reyes", state: "vic", email: "dana@example.com", payid: "0400000001" });
ok(r.status === 200 && r.view.me.seat === "accepted" && r.view.period.state === "open" && r.view.me.name === "Dana Reyes" && r.view.me.state === "VIC", "accepting the first seat opens the period; name and state are kept");
r = await R({ token: tokens[0], action: "photo", data: "data:text/plain;base64,aGk=" });
ok(r.status === 400, "a photo must be an image");
r = await R({ token: tokens[0], action: "photo", data: "data:image/jpeg;base64," + Buffer.from("not really a jpeg but fine for storage").toString("base64") });
ok(r.status === 200 && r.view.me.photo === true, "a photo is stored and flagged");
const people = [["no", "Dana", "dana@example.com"], ["yes", "Friend", "friend@example.com"], ["no", "Otto", "otto@example.com"], ["no", "Wren", "wren@example.com"], ["no", "Kite", "kite@example.com"]];
r = await R({ token: tokens[0], action: "accept", knew: "no", eligible: true, name: "Dana", state: "VIC", email: "dana@example.com", payid: "x" });
ok(r.status === 400 && /used/.test(r.error), "a link cannot be accepted twice");
r = await R({ token: tokens[1], action: "accept", knew: "no", eligible: true, name: "Dana again", state: "VIC", email: "dana@example.com", payid: "x" });
ok(r.status === 400 && /already has/.test(r.error), "the same email cannot take a second seat in one period");
for (let i = 1; i < 5; i++) await R({ token: tokens[i], action: "accept", knew: people[i][0], eligible: true, name: people[i][1], state: "NSW", email: people[i][2], payid: "0400000" + i });
b = await call(business, "GET", "/api/business?id=" + id);
ok(b.business.reviewers.every((x) => x.seat === "accepted" && !x.link && !("contact" in x) && x.name && x.state), "the business sees five seats taken with names and states, and no emails or payout details");
ok(b.business.reviewers[0].photo === true && b.business.reviewers[1].photo === false, "and which of them added a photo");
let ph = await call(photo, "GET", "/api/photo?b=" + id + "&r=" + b.business.reviewers[0].id);
ok(ph.status === 200, "the owner can fetch the photo");
ph = await call(photo, "GET", "/api/photo?b=" + id + "&r=" + b.business.reviewers[0].id, null, { cookie: "" });
ok(ph.status === 401, "nobody else can");
ok(b.admin.reviewers.every((x) => /\/r\//.test(x.link)), "the admin can still copy every current link to resend it");

// ---- reviews, drafts, issues
const GOOD = ["The booking page said we will text you a window the night before and the text came at 9:40pm with a 1pm to 5pm window, but there was no field for a gate code so the driver rang from the street.", "The bag was the stripey one from the welcome email. The label had my name but not a date, so with two bags I could not tell which was which.", "Returned in 46 hours. Paying was a link in the return email, worked first go."];
const CLOSING = ["Book a pickup", "Nowhere", "$25 a load"];
r = await R({ token: tokens[0], action: "draft", sections: ["half written"], closing: [], received: true });
r = await call(reviewer, "GET", "/api/reviewer?token=" + tokens[0]);
ok(r.view.me.draft && r.view.me.draft.sections[0] === "half written", "a draft survives a reload");
r = await R({ token: tokens[0], action: "submitReview", sections: ["too short", "x", "y"], closing: CLOSING });
ok(r.status === 400, "a review with empty sections is refused");
r = await R({ token: tokens[0], action: "submitReview", sections: GOOD, closing: CLOSING, consent: true });
ok(r.status === 200 && r.view.review && r.view.me.seat === "submitted" && !r.view.me.draft && r.view.review.consent === true, "a full review is accepted with consent to quote, and the draft is cleared");
b = await call(business, "GET", "/api/business?id=" + id);
ok(b.business.reviews.length === 0 && b.business.reviewCount === 1, "while the open stage runs the business sees a count, not the text");
r = await R({ token: tokens[0], action: "submitBug", title: "No field for a gate code at booking", happened: "Booking asks for a flat number but there is nowhere to put a gate code, so the driver called from the street.", instead: "An optional access line.", where: "Booking" });
const gateId = r.view.bugs[0].id;
ok(r.status === 200 && r.view.bugs.length === 1, "an issue is reported");
r = await R({ token: tokens[2], action: "checkDup", title: "Gate code has nowhere to go on the booking form", happened: "There is a flat number field but no way to tell the driver the gate code." });
ok(r.status === 200 && r.match && r.match.id === gateId, "a near-duplicate is caught before it is submitted");
r = await R({ token: tokens[2], action: "submitBug", dupOf: gateId, title: "Gate code has nowhere to go on the booking form", happened: "There is a flat number field but no way to tell the driver the gate code.", instead: "", where: "Booking" });
ok(r.status === 200 && r.view.bugs[0].dupOf === gateId, "and attached as a confirmation");
await R({ token: tokens[2], action: "submitBug", title: "48 hours on the site, 2 business days in the email", happened: "The website promises 48 hours and the confirmation email says 2 business days. On a Friday those differ.", instead: "Pick one promise.", where: "Booking" });
await R({ token: tokens[4], action: "submitBug", title: "Should have a loyalty program", happened: "There is no loyalty program at all.", instead: "Add points.", where: "General" });
await R({ token: tokens[1], action: "submitReview", sections: ["Everything was perfect, really easy to book, no notes!", "Loved the bag, no confusion at all, perfect.", "Came back fast and paying was simple. 10 out of 10."], closing: CLOSING });
await R({ token: tokens[2], action: "submitReview", sections: GOOD.map((x) => x + " Booking took two minutes."), closing: CLOSING });
await R({ token: tokens[3], action: "submitReview", sections: GOOD.map((x) => x + " I would pick the window myself."), closing: CLOSING });
const mailsBefore = mails.length;
r = await R({ token: tokens[4], action: "submitReview", sections: ["Great service, very easy to use, loved it.", "Fast delivery and friendly staff, no notes.", "Highly recommended for anyone looking for quality. Five stars."], closing: CLOSING });
ok(r.view.period.state === "rating" && r.view.flags.length === 1 && r.view.flags[0].reason === "pasted from elsewhere" && r.view.flags[0].state === "queued", "the fifth submission starts peer rating; the boilerplate one is flagged by AI and queued, not binned");
const rated = mails.slice(mailsBefore);
ok(rated.filter((m) => /three reviews to rate/.test(m.subject)).length === 5 && rated.every((m) => /candid\.test\/r\//.test(m.text)), "all five reviewers are emailed their link when rating opens");
ok(rated.some((m) => m.to[0] === "kite@example.com" && /a flag on your review/.test(m.subject)), "and the flagged reviewer is told");
b = await call(business, "GET", "/api/business?id=" + id);
ok(b.business.bugs.length === 3 && b.business.bugs.every((x) => !x.unlocked && !("happened" in x) && x.teaser && !("reviewerId" in x)), "the business sees three teasers, no issue text, and no reporter");
ok(!b.business.log.some((e) => /^Issue/.test(e.event) && /Dana|Otto|Kite|Wren|Friend/.test(e.detail)), "no issue entry in the business's activity names a reporter");
ok(b.business.reviews.length === 5 && b.business.reviews.every((x) => x.sections.length === 3), "the five reviews are revealed together now that the open stage has ended");
ok(b.business.reviews.filter((x) => x.consent).length === 1, "one of them may be quoted; the rest stay private");
ok(E.quote({ reviewers: { [b.business.reviewers[0].id]: { profile: { name: "Dana Reyes", state: "VIC", company: "" } } } }, { reviewerId: b.business.reviewers[0].id }, "Great") === "“Great” — Dana Reyes, VIC. " + E.DISCLOSURE, "a quote carries name, state and the paid-study line");
ok(b.business.bugs.find((x) => x.id === gateId).confirmations === 1, "the gate code issue carries one confirmation");

// ---- peer rating
r = await call(reviewer, "GET", "/api/reviewer?token=" + tokens[0]);
ok(r.view.toRate.length === 3 && r.view.toRate.every((x) => x.sections && !x.reviewerId && !x.pseudonym), "each reviewer gets three reviews, text only");
const rate = async (i, flagFor) => { const v = (await call(reviewer, "GET", "/api/reviewer?token=" + tokens[i])).view; return R({ token: tokens[i], action: "submitRatings", entries: v.toRate.map((x) => ({ reviewId: x.id, truthful: true, fair: true, matches: "yes", useful: /perfect|Five stars/.test(x.sections.join()) ? 1 : 4, flag: flagFor && /perfect/.test(x.sections.join()) ? "unfairly positive" : null })) }); };
r = await R({ token: tokens[0], action: "submitRatings", entries: [] });
ok(r.status === 400, "ratings must cover every assigned review");
for (let i = 0; i < 4; i++) await rate(i, i === 0);
r = await rate(4);
ok(r.view.period.state === "settlement" && r.view.review.scores && r.view.me.payout === "held", "all ratings in: settlement, scores final, the flagged reviewer's fee is held");
r = await call(reviewer, "GET", "/api/reviewer?token=" + tokens[2]);
ok(r.view.me.payout === "released" && r.view.me.rep > 60, "an unflagged reviewer's fee is released and their reputation moved up from 60 (" + r.view.me.rep + ")");
ok(mails.some((m) => m.to[0] === "otto@example.com" && /\$20 on its way/.test(m.subject)), "and they are emailed");
ok(mails.some((m) => m.to[0] === "aaron@example.com" && /reviews are in/.test(m.subject)), "the owner is emailed that the period settled");
let ad = await call(admin, "GET", "/api/admin");
const queue = ad.flags;
ok(ad.status === 200 && queue.length === 2 && queue.every((f) => f.ai && f.text && f.business === "Loop Laundry"), "the platform queue holds two flags for a person, each with the AI's verdict and the business");
ok(ad.payouts.length === 3 && ad.payouts.every((p) => p.payid && p.state === "released"), "three review fees are released for manual payout, with PayIDs only on the admin side");
ok(!JSON.stringify(b.business).includes("0400000"), "and no PayID leaks into the business view");
ok(ad.accounts.length === 2 && ad.businesses.length === 1 && ad.businesses[0].email === "aaron@example.com", "accounts and businesses are listed with their owners");

// ---- decisions, unlocks, payouts
const breach = queue.find((f) => f.reason === "pasted from elsewhere"), soft = queue.find((f) => f.reason === "unfairly positive");
r = await R({ token: tokens[1], action: "reply", flagId: soft.id, text: "I really did like it." });
ok(r.status === 200 && r.view.flags[0].reply, "a reviewer can reply once to an open flag");
b = await B({ id, action: "decide", target: breach.id, outcome: "breach" }); ok(b.status === 400, "a business cannot decide a flag");
ad = await AD({ id, action: "decide", target: breach.id, outcome: "breach" });
b = await call(business, "GET", "/api/business?id=" + id);
const kite = b.admin.reviewers.find((x) => x.email === "kite@example.com");
ok(kite.payout === "forfeited" && kite.status === "warned" && kite.strikes === 1 && b.business.credits.balance === 230 + 24, "a breach forfeits the fee back to the business and warns the account");
ad = await AD({ id, action: "decide", target: soft.id, outcome: "low quality" });
b = await call(business, "GET", "/api/business?id=" + id);
ok(b.business.period.state === "closed" && b.business.credits.locked === 0, "the last decision closes the period and nothing stays locked (" + b.business.credits.locked + ")");
const listed = b.business.bugs.filter((x) => x.tier);
ok(listed.length === 2 && b.business.bugs.find((x) => /loyalty/.test(x.teaser) || x.category === "suggestion").tier === null, "two issues are priced; the loyalty one is below the bottom tier");
b = await B({ id, action: "status", kind: "bug", target: listed[0].id, status: "will use" });
ok(b.status === 400, "an issue cannot be marked before it is unlocked");
const before = (await call(business, "GET", "/api/business?id=" + id)).business.credits.balance;
b = await B({ id, action: "unlock", target: listed[0].id });
const got = b.business.bugs.find((x) => x.id === listed[0].id);
ok(got.unlocked && got.happened && b.business.credits.balance === before - got.tier.price && !("reviewerId" in got) && !("payout" in got), "unlocking spends credit and reveals the text, still with no reporter attached");
ad = await call(admin, "GET", "/api/admin");
ok(ad.payouts.some((p) => p.id === listed[0].id && p.state === "released" && p.pseudonym), "the platform side knows who to pay for it");
ad = await AD({ id, action: "markPaid", kind: "bug", target: listed[0].id });
ok(ad.status === 200 && !ad.payouts.some((p) => p.id === listed[0].id), "the operator marks a payout paid and it leaves the list");
ad = await AD({ id, action: "markPaid", kind: "review", target: kite.id });
ok(ad.status === 400, "a forfeited fee cannot be paid");
b = await B({ id, action: "newPeriod" });
ok(b.business.period.no === 2 && b.business.period.briefV === 2 && b.business.history.length === 1, "the next period starts on brief v2 with the first in history");

// ---- the clock
await AD({ id, action: "credits", amount: 200, note: "test" }); b = await B({ id, action: "fund", seats: 3 }); b = await B({ id, action: "recruit" });
const t2 = b.business.reviewers.map((x) => x.link.split("/r/")[1]);
r = await R({ token: t2[0], action: "accept", knew: "no", eligible: true, name: "Dana Reyes", state: "VIC", email: "dana@example.com", payid: "0400000001" });
ok(r.view.me.rep > 60 && r.view.me.photo === true, "a returning reviewer (same email) keeps their reputation and photo");
await R({ token: t2[1], action: "accept", knew: "no", eligible: true, name: "Otto", state: "SA", email: "otto@example.com", payid: "0400000003" });
await R({ token: t2[0], action: "submitReview", sections: GOOD, closing: CLOSING });
day(15);
b = await call(business, "GET", "/api/business?id=" + id);
ok(["rating", "settlement", "closed"].includes(b.business.period.state) && b.business.reviewers.filter((x) => x.seat === "released").length === 2, "15 days on: the silent seats are released and the one review moves on without anyone pressing anything (" + b.business.period.state + ")");
day(8);
b = await call(business, "GET", "/api/business?id=" + id);
ok(b.business.period.state === "closed" && b.business.credits.locked === 0 && b.business.credits.ledger.some((l) => /Refund · 2 unused/.test(l.what)), "with nothing to rate and no flags it closes and refunds the two unused seats");
r = await call(reviewer, "GET", "/api/reviewer?token=" + t2[0]);
ok(r.view.me.payout === "released", "the lone reviewer's fee is released without ever rating anyone");

// ---- concurrency guard
const S = await import("../api/_store.js");
let clash = null;
try { await S.withBusiness(id, Date.now(), async () => { await globalThis.__candidDb.query("update business set version=version+1 where id=$1", [id]); }); } catch (e) { clash = e; }
ok(clash && clash.status === 409, "a save that races another write is refused rather than overwriting it");

ok(seen.length > 0 && seen.every((p) => p.model === "claude-opus-5-5" && p.output_config && p.output_config.format), "every model call went through structured output on claude-opus-5-5 (" + seen.length + " calls)");
Date.now = realNow;
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
