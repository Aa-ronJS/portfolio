// One whole period through the real handlers on real Postgres (pglite), on a fixed clock, with the AI stubbed.
// Then the clock: deadlines release seats, end peer rating, time out flags and close the period on their own.
import { PGlite } from "@electric-sql/pglite";
import { Readable } from "node:stream";

const db = new PGlite();
globalThis.__candidDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, { OWNER_PASSCODE: "correct-horse-battery", SESSION_SECRET: "s3cret_s3cret", APP_URL: "https://candid.test/", NODE_ENV: "test" });
delete process.env.ANTHROPIC_API_KEY;

// Claude, stubbed: answers by the shape of the request, so the test is about the rules and not the model.
const seen = [];
globalThis.__candidAI = { beta: { messages: { parse: async (p) => {
  seen.push(p); const u = p.messages[0].content;
  if (/^Brief questions:.*\n\nReview:/s.test(u)) return { stop_reason: "end_turn", parsed_output: /Five stars/.test(u) ? { onBrief: 20, quality: 10, flag: "pasted from elsewhere" } : /perfect/.test(u) ? { onBrief: 50, quality: 15, flag: "none" } : { onBrief: 85, quality: 80, flag: "none" } };
  if (/Issue:/.test(u)) return { stop_reason: "end_turn", parsed_output: { category: /gate/.test(u) ? "missing step" : /loyalty/.test(u) ? "suggestion" : "inaccuracy", teaser: "Something at booking…", onBrief: /loyalty/.test(u) ? 20 : 80, quality: /loyalty/.test(u) ? 15 : 70 } };
  if (/^Existing:/.test(u)) { const m = /"id":"([a-z0-9]+)","title":"No field for a gate code/.exec(u); return { stop_reason: "end_turn", parsed_output: { duplicateOf: m && /Gate code has nowhere/.test(u) ? m[1] : "none" } }; }
  if (/^Flag reason:/.test(u)) return { stop_reason: "end_turn", parsed_output: /pasted from elsewhere/.test(u) ? { verdict: "breach", confidence: 0.9, reasoning: "boilerplate" } : /unfairly positive/.test(u) ? { verdict: "unsure", confidence: 0.5, reasoning: "no specifics" } : { verdict: "clear", confidence: 0.95, reasoning: "specific" } };
  throw new Error("unexpected prompt: " + u.slice(0, 80));
} } } };

const { migrate } = await import("../api/_db.js");
await migrate();
const auth = (await import("../api/auth.js")).default, business = (await import("../api/business.js")).default, reviewer = (await import("../api/reviewer.js")).default;
const E = await import("../api/_engine.js");

let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
let clock = Date.parse("2026-10-12T09:00:00Z"); const realNow = Date.now; Date.now = () => clock; const day = (n) => { clock += n * 86400000; };
function res() { return { statusCode: 0, headers: {}, body: "", setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ""; } }; }
let cookie = "";
async function call(fn, method, url, body, hdr = {}) {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  req.method = method; req.url = url; req.headers = { "content-type": "application/json", cookie, "x-real-ip": "1.2.3.4", ...hdr };
  const r = res(); await fn(req, r);
  if (r.headers["set-cookie"]) cookie = r.headers["set-cookie"].split(";")[0];
  return { status: r.statusCode, ...(r.body ? JSON.parse(r.body) : {}) };
}
const B = (body) => call(business, "POST", "/api/business", body);
const R = (body) => call(reviewer, "POST", "/api/reviewer", body);

// ---- sign in
let a = await call(auth, "GET", "/api/auth");
ok(a.configured === true && a.loggedIn === false && a.ai === true, "server is configured, nobody signed in, Claude stubbed in");
a = await call(auth, "POST", "/api/auth", { action: "login", passcode: "nope-nope-nope" });
ok(a.status === 401, "a wrong passcode is refused");
let b = await B({ action: "create", name: "Loop Laundry" });
ok(b.status === 401, "and nothing on the business side answers without a session");
a = await call(auth, "POST", "/api/auth", { action: "login", passcode: "correct-horse-battery" });
ok(a.status === 200 && /candid_session=c1\./.test(cookie), "the right passcode sets a signed cookie");

// ---- business, brief, credits, period
b = await B({ action: "create", name: "Loop Laundry" }); const id = b.id;
ok(b.status === 200 && b.business.name === "Loop Laundry" && b.business.periodNo === 0, "a business is created with no period");
b = await B({ id, action: "newPeriod" });
ok(b.status === 400 && /brief/i.test(b.error), "no period without a brief");
const BRIEF = { product: "Loop Laundry picks up your washing, washes and folds it, and brings it back within 48 hours.", audience: "Inner north, no machine", job: "Book one pickup, hand over a bag, get it back in 48 hours. First load free.",
  wants: ["Booking: was it clear when we would arrive and what to leave out?", "Handover: did anything about the bag, the label or the pickup confuse you?", "Return and payment: was the return on time, and was paying clear?"], known: ["Pickup window is 4 hours"], wontChange: "No dry cleaning.", eligibility: "Lives in the inner north and has no washing machine." };
b = await B({ id, action: "brief", ...BRIEF });
ok(b.business.briefs.length === 1 && b.business.briefs[0].wants.length === 3, "brief v1 saved");
b = await B({ id, action: "newPeriod" }); ok(b.business.period.state === "draft" && b.business.period.briefV === 1, "period 1 drafted on brief v1");
b = await B({ id, action: "fund", seats: 5 }); ok(b.status === 400 && /credits/i.test(b.error), "funding needs credits: " + b.error);
b = await B({ id, action: "credits", amount: 200, note: "Top-up" });
b = await B({ id, action: "fund", seats: 5 });
ok(b.business.period.state === "funded" && b.business.credits.balance === 80 && b.business.credits.locked === 120, "5 seats lock $120 and leave $80");
b = await B({ id, action: "recruit" });
const links = b.business.reviewers.map((r) => r.link);
ok(b.business.period.state === "recruiting" && links.length === 5 && links.every((l) => /^https:\/\/candid\.test\/r\/[A-Za-z0-9_-]{20,}$/.test(l)), "recruiting issues five invite links");
const tokens = links.map((l) => l.split("/r/")[1]);
b = await B({ id, action: "brief", ...BRIEF, wontChange: "No dry cleaning, no same-day." });
ok(b.business.briefs.length === 2 && b.business.period.briefV === 1, "editing the brief mid-period makes v2 but the period keeps v1");

// ---- reviewers accept
let r = await call(reviewer, "GET", "/api/reviewer?token=nonsense");
ok(r.status === 404, "a made-up token is refused");
r = await call(reviewer, "GET", "/api/reviewer?token=" + tokens[0]);
ok(r.status === 200 && r.view.me.seat === "invited" && r.view.brief.v === 1 && !r.view.me.contact, "a real token shows the invitation");
r = await R({ token: tokens[0], action: "accept", knew: "no", eligible: true, name: "Dana", email: "dana@example.com", payid: "0400000001" });
ok(r.status === 200 && r.view.me.seat === "accepted" && r.view.period.state === "open", "accepting the first seat opens the period");
const people = [["no", "Dana", "dana@example.com"], ["yes", "Friend", "friend@example.com"], ["no", "Otto", "otto@example.com"], ["no", "Wren", "wren@example.com"], ["no", "Kite", "kite@example.com"]];
r = await R({ token: tokens[1], action: "accept", knew: "no", eligible: true, name: "Dana again", email: "dana@example.com", payid: "x" });
ok(r.status === 400 && /already holds/.test(r.error), "the same email cannot take a second seat in one period");
for (let i = 1; i < 5; i++) await R({ token: tokens[i], action: "accept", knew: people[i][0], eligible: true, name: people[i][1], email: people[i][2], payid: "0400000" + i });
r = await R({ token: tokens[0], action: "accept", knew: "no", eligible: true, name: "Dana", email: "dana@example.com", payid: "x" });
ok(r.status === 400 && /used/.test(r.error), "a link cannot be accepted twice");
b = await call(business, "GET", "/api/business?id=" + id);
ok(b.business.reviewers.every((x) => x.seat === "accepted" && !x.link && !("contact" in x)), "the business sees five seats taken and no names, emails or payout details");
ok(b.admin.reviewers.every((x) => /\/r\//.test(x.link)), "the operator can still copy every current link to resend it");


// ---- reviews, drafts, issues
const GOOD = ["The booking page said we will text you a window the night before and the text came at 9:40pm with a 1pm to 5pm window, but there was no field for a gate code so the driver rang from the street.", "The bag was the stripey one from the welcome email. The label had my name but not a date, so with two bags I could not tell which was which.", "Returned in 46 hours. Paying was a link in the return email, worked first go."];
const CLOSING = ["Book a pickup", "Nowhere", "$25 a load"];
r = await R({ token: tokens[0], action: "draft", sections: ["half written"], closing: [], received: true });
r = await call(reviewer, "GET", "/api/reviewer?token=" + tokens[0]);
ok(r.view.me.draft && r.view.me.draft.sections[0] === "half written", "a draft survives a reload");
r = await R({ token: tokens[0], action: "submitReview", sections: ["too short", "x", "y"], closing: CLOSING });
ok(r.status === 400, "a review with empty sections is refused");
r = await R({ token: tokens[0], action: "submitReview", sections: GOOD, closing: CLOSING });
ok(r.status === 200 && r.view.review && r.view.me.seat === "submitted" && !r.view.me.draft, "a full review is accepted and the draft is cleared");
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
r = await R({ token: tokens[4], action: "submitReview", sections: ["Great service, very easy to use, loved it.", "Fast delivery and friendly staff, no notes.", "Highly recommended for anyone looking for quality. Five stars."], closing: CLOSING });
ok(r.view.period.state === "rating" && r.view.flags.length === 1 && r.view.flags[0].reason === "pasted from elsewhere" && r.view.flags[0].state === "queued", "the fifth submission starts peer rating; the boilerplate one is flagged by AI and queued, not binned");
b = await call(business, "GET", "/api/business?id=" + id);
ok(b.business.bugs.length === 3 && b.business.bugs.every((x) => !x.unlocked && !("happened" in x) && x.teaser), "the business sees three teasers and no issue text");
ok(b.business.reviews.length === 5 && b.business.reviews.every((x) => x.sections.length === 3), "the five reviews are revealed together now that the open stage has ended");
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
b = await call(business, "GET", "/api/business?id=" + id);
const queue = b.admin.flags.filter((f) => f.state === "queued");
ok(queue.length === 2 && queue.every((f) => f.ai && f.text), "two flags wait on a person, each with the AI's verdict beside it");
ok(b.admin.payouts.filter((p) => p.state === "released").length === 3 && b.admin.payouts.every((p) => p.payid), "three review fees are released for manual payout, with PayIDs only on the admin side");
ok(!JSON.stringify(b.business).includes("0400000"), "and no PayID leaks into the business view");

// ---- decisions, unlocks, payouts
const breach = queue.find((f) => f.reason === "pasted from elsewhere"), soft = queue.find((f) => f.reason === "unfairly positive");
r = await R({ token: tokens[1], action: "reply", flagId: soft.id, text: "I really did like it." });
ok(r.status === 200 && r.view.flags[0].reply, "a reviewer can reply once to an open flag");
b = await B({ id, action: "decide", target: breach.id, outcome: "breach" });
const kite = b.admin.reviewers.find((x) => x.email === "kite@example.com");
ok(kite.payout === "forfeited" && kite.status === "warned" && kite.strikes === 1 && b.business.credits.balance === 80 + 24, "a breach forfeits the fee back to the business and warns the account");
b = await B({ id, action: "decide", target: soft.id, outcome: "low quality" });
ok(b.business.period.state === "closed" && b.business.credits.locked === 0, "the last decision closes the period and nothing stays locked (" + b.business.credits.locked + ")");
const listed = b.business.bugs.filter((x) => x.tier);
ok(listed.length === 2 && b.business.bugs.find((x) => /loyalty/.test(x.teaser) || x.category === "suggestion").tier === null, "two issues are priced; the loyalty one is below the bottom tier");
b = await B({ id, action: "status", kind: "bug", target: listed[0].id, status: "will use" });
ok(b.status === 400, "an issue cannot be marked before it is unlocked");
const before = b.business ? b.business.credits.balance : 104;
b = await B({ id, action: "unlock", target: listed[0].id });
const got = b.business.bugs.find((x) => x.id === listed[0].id);
ok(got.unlocked && got.happened && b.business.credits.balance === before - got.tier.price && got.payout === "released", "unlocking spends credit, reveals the text and releases the reviewer's share");
b = await B({ id, action: "markPaid", kind: "bug", target: listed[0].id });
ok(b.admin.payouts.find((p) => p.id === listed[0].id).state === "paid", "the operator marks a payout paid");
b = await B({ id, action: "markPaid", kind: "review", target: kite.id });
ok(b.status === 400, "a forfeited fee cannot be paid");
b = await B({ id, action: "newPeriod" });
ok(b.business.period.no === 2 && b.business.period.briefV === 2 && b.business.history.length === 1, "the next period starts on brief v2 with the first in history");

// ---- the clock
b = await B({ id, action: "credits", amount: 200 }); b = await B({ id, action: "fund", seats: 3 }); b = await B({ id, action: "recruit" });
const t2 = b.business.reviewers.map((x) => x.link.split("/r/")[1]);
r = await R({ token: t2[0], action: "accept", knew: "no", eligible: true, name: "Dana", email: "dana@example.com", payid: "0400000001" });
ok(r.view.me.rep > 60 && r.view.me.pseudonym === (await call(reviewer, "GET", "/api/reviewer?token=" + tokens[0])).view.me.pseudonym, "a returning reviewer (same email) keeps their reputation and pseudonym");
await R({ token: t2[1], action: "accept", knew: "no", eligible: true, name: "Otto", email: "otto@example.com", payid: "0400000003" });
await R({ token: t2[0], action: "submitReview", sections: GOOD, closing: CLOSING });
day(15);
b = await call(business, "GET", "/api/business?id=" + id);
ok(["rating", "settlement", "closed"].includes(b.business.period.state) && b.business.reviewers.filter((x) => x.seat === "released").length === 2, "15 days on: the silent seats are released and the one review moves on without anyone pressing anything (" + b.business.period.state + ")");
day(8);
b = await call(business, "GET", "/api/business?id=" + id);
ok(["settlement", "closed"].includes(b.business.period.state), "8 more days: peer rating times out into settlement (" + b.business.period.state + ")");
ok(b.business.period.state === "closed" && b.business.credits.locked === 0 && b.business.credits.ledger.some((l) => /Refund · 2 unused/.test(l.what)), "with nothing to rate and no flags it closes and refunds the two unused seats");
r = await call(reviewer, "GET", "/api/reviewer?token=" + t2[0]);
ok(r.view.me.payout === "released", "the lone reviewer's fee is released without ever rating anyone");

// ---- a lead from the landing page, attributed to the business whose reviewer sent them
const lead = (await import("../api/lead.js")).default;
const L = (body, hdr) => call(lead, "POST", "/api/lead", body, hdr);
let l = await L({ email: "not an email", via: id });
ok(l.status === 400, "a lead needs a real email");
l = await L({ email: "Maker@Example.com", note: "a bike repair van", via: id, source: "paid" }, { cookie: "" });
ok(l.status === 200, "a lead is taken without any sign-in");
l = await L({ email: "maker@example.com", via: id, source: "paid" }, { cookie: "" });
const gotLeads = await call(lead, "GET", "/api/lead");
ok(gotLeads.status === 200 && gotLeads.leads.length === 1 && gotLeads.leads[0].viaName === "Loop Laundry" && gotLeads.leads[0].source === "paid", "the owner sees one lead, de-duplicated, attributed to Loop Laundry's reviewer flow");
const anon = await call(lead, "GET", "/api/lead", null, { cookie: "" });
ok(anon.status === 401, "and nobody else can read the list");

// ---- concurrency guard
const S = await import("../api/_store.js");
let clash = null;
try { await S.withBusiness(id, Date.now(), async () => { await globalThis.__candidDb.query("update business set version=version+1 where id=$1", [id]); }); } catch (e) { clash = e; }
ok(clash && clash.status === 409, "a save that races another write is refused rather than overwriting it");

ok(seen.length > 0 && seen.every((p) => p.model === "claude-opus-5-5" && p.output_config && p.output_config.format), "every model call went through structured output on claude-opus-5-5 (" + seen.length + " calls)");
Date.now = realNow;
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
