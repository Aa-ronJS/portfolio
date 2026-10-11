// The whole product, as pure functions over one business's state document.
//
// A business is one JSON document: its brief versions, its credits, the current review period, the reviewers it
// has ever had, their reviews, issues, flags and the audit log. Every action loads the document, changes it here,
// and saves it back under a version check (api/_store.js). Nothing in this file touches the network or the clock
// directly: `now` and `ai` come in from the caller, so the tests run the real rules on a fixed clock.
//
// The rules are the spec's: the brief freezes per period, credit is spent before text is shown, payouts never
// wait on the business, AI only triages, a person decides, and a flag undecided for 7 days releases the payout.

export const FEE = 20, FEE_PCT = 0.2, PRIOR = 60, PRIOR_N = 5;
export const SEAT_COST = Math.round(FEE * (1 + FEE_PCT));
export const TIERS = [{ min: 75, name: "Strong", price: 30 }, { min: 50, name: "Solid", price: 20 }, { min: 30, name: "Weak", price: 10 }];
export const CATEGORIES = ["missing step", "wrong step", "unnecessary step", "inaccuracy", "disagreement", "suggestion", "pricing", "communication", "policy"];
export const FLAG_REASONS = ["untruthful", "unfairly positive", "unfairly negative", "not about this product", "abusive", "pasted from elsewhere"];
export const STATES = ["draft", "funded", "recruiting", "open", "rating", "settlement", "closed"];
export const STATUSES = ["will use", "will not use", "already doing"];
const DAY = 86400000;
export const SUBMIT_DAYS = 14, RATING_DAYS = 7, FLAG_DAYS = 7, HOLD_DAYS = 30;

const ADJ = ["Quiet", "Amber", "Grey", "Blue", "Red", "Green", "Silver", "Golden", "Little", "Swift", "Pale", "Dusky", "Bright", "Still", "Wild", "Early"];
const BIRD = ["Heron", "Fox", "Otter", "Wren", "Kite", "Finch", "Plover", "Swift", "Robin", "Magpie", "Ibis", "Kestrel", "Lark", "Teal", "Curlew", "Martin"];

export class EngineError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
const fail = (m, s) => { throw new EngineError(m, s); };
const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, n);
const lines = (v, n, m) => (Array.isArray(v) ? v : String(v || "").split("\n")).map((s) => clean(s, n)).filter(Boolean).slice(0, m);

export function newState(name, now) {
  return {
    v: 1, name: clean(name, 80), createdAt: now,
    credits: { balance: 0, locked: 0, ledger: [] },
    briefs: [], periodNo: 0, period: null,
    reviewers: {}, reviews: [], bugs: [], flags: [], assignments: {}, ratingsDone: {}, log: [], history: [],
  };
}

// ---------- helpers ----------
export const brief = (s) => s.period ? s.briefs.find((b) => b.v === s.period.briefV) : s.briefs[s.briefs.length - 1];
export const latestBrief = (s) => s.briefs[s.briefs.length - 1] || null;
export const repOf = (r) => Math.round((PRIOR * PRIOR_N + r.rep.sum) / (PRIOR_N + r.rep.n));
export const tierOf = (score) => TIERS.find((t) => score >= t.min) || null;
export const cur = (s, arr) => arr.filter((x) => s.period && x.periodNo === s.period.no);
export const seated = (s) => Object.values(s.reviewers).filter((r) => s.period && r.periodNo === s.period.no);
const targetOf = (s, f) => (f.targetType === "review" ? s.reviews : s.bugs).find((x) => x.id === f.targetId);
function log(s, now, event, detail, vis) { s.log.push({ at: now, event, detail, vis: vis || { business: true, reviewers: [] }, periodNo: s.period ? s.period.no : 0 }); }
function uid(rng) { return Math.floor((rng || Math.random)() * 2176782336).toString(36).padStart(6, "0") + Math.floor(Math.random() * 1296).toString(36).padStart(2, "0"); }
function pseudonym(s, rng) {
  const used = new Set(Object.values(s.reviewers).map((r) => r.pseudonym));
  for (let i = 0; i < 400; i++) { const p = ADJ[Math.floor((rng || Math.random)() * ADJ.length)] + " " + BIRD[Math.floor((rng || Math.random)() * BIRD.length)]; if (!used.has(p)) return p; }
  return "Reviewer " + (used.size + 1);
}

// ---------- business actions ----------
export function saveBrief(s, now, a) {
  const b = { v: s.briefs.length + 1, product: clean(a.product, 400), audience: clean(a.audience, 400), job: clean(a.job, 600), wants: lines(a.wants, 200, 5),
    known: lines(a.known, 200, 12), wontChange: clean(a.wontChange, 400), eligibility: clean(a.eligibility, 300), at: now };
  if (!b.product || !b.job || b.wants.length < 1 || !b.eligibility) fail("The brief needs a product, the job, at least one question and an eligibility rule");
  s.briefs.push(b);
  if (s.period && s.period.state === "draft") s.period.briefV = b.v;
  log(s, now, "Brief saved", `v${b.v}` + (s.period && !["draft", "closed"].includes(s.period.state) ? ` · period keeps v${s.period.briefV}` : ""));
  return b;
}
export function addCredits(s, now, amount, note) {
  const n = Math.round(Number(amount)); if (!(n > 0) || n > 100000) fail("Amount must be between 1 and 100000");
  s.credits.balance += n; s.credits.ledger.push({ at: now, what: clean(note, 80) || "Credits added", amt: n });
  log(s, now, "Credits added", "$" + n);
}
export function newPeriod(s, now) {
  if (s.period && s.period.state !== "closed") fail("The current period is still " + s.period.state);
  if (!latestBrief(s)) fail("Write the brief first");
  if (s.period) s.history.push({ no: s.period.no, closedAt: s.period.at.closed, reviews: cur(s, s.reviews).length, unlocked: cur(s, s.bugs).filter((b) => b.unlocked).length });
  s.periodNo += 1;
  s.period = { no: s.periodNo, state: "draft", briefV: latestBrief(s).v, seats: 0, cost: 0, at: { created: now } };
  s.assignments = {}; s.ratingsDone = {};
  log(s, now, "Period created", `period ${s.period.no} · brief v${s.period.briefV}`);
}
export function fund(s, now, seats) {
  if (!s.period || s.period.state !== "draft") fail("No draft period to fund");
  const n = Math.round(Number(seats)); if (!(n >= 3 && n <= 50)) fail("Seats must be between 3 and 50");
  const cost = n * SEAT_COST;
  if (s.credits.balance < cost) fail(`Needs $${cost} in credits, balance is $${s.credits.balance}`);
  s.credits.balance -= cost; s.credits.locked += cost; s.period.seats = n; s.period.cost = cost; s.period.state = "funded"; s.period.at.funded = now;
  s.credits.ledger.push({ at: now, what: `Period ${s.period.no} · ${n} seats`, amt: -cost });
  log(s, now, "Period funded", `${n} seats · $${cost} locked · brief v${s.period.briefV}`);
}
// Returns the new reviewer ids so the caller can mint one invite token for each.
export function openRecruiting(s, now, rng) {
  if (!s.period || s.period.state !== "funded") fail("Fund the period first");
  const ids = [];
  for (let i = 0; i < s.period.seats; i++) {
    const id = uid(rng);
    s.reviewers[id] = { id, periodNo: s.period.no, pseudonym: pseudonym(s, rng), seat: "invited", knew: null, rep: { sum: 0, n: 0 }, strikes: 0, status: "active",
      payout: null, payoutReason: "", received: false, draft: null, contact: null, invitedAt: now };
    ids.push(id);
  }
  s.period.state = "recruiting"; s.period.at.recruiting = now;
  log(s, now, "Recruiting opened", `${ids.length} invite links issued`);
  return ids;
}
export function endOpen(s, now, rng) {
  if (!s.period || !["recruiting", "open"].includes(s.period.state)) fail("The period is not open");
  seated(s).forEach((r) => { if (r.seat === "invited" || r.seat === "accepted") { r.seat = "released"; log(s, now, "Seat released", `${r.pseudonym} · no submission`, { business: true, reviewers: [r.id] }); } });
  if (!cur(s, s.reviews).length) { s.period.state = "settlement"; s.period.at.settled = now; log(s, now, "Settlement started", "no reviews"); closePeriod(s, now); return; }
  startRating(s, now, rng);
}
export function setStatus(s, now, kind, id, status) {
  if (!STATUSES.includes(status)) fail("Unknown status");
  const it = (kind === "review" ? s.reviews : s.bugs).find((x) => x.id === id); if (!it) fail("Not found", 404);
  if (kind === "bug" && !it.unlocked) fail("Unlock it first");
  it.status = it.status === status ? null : status;
  log(s, now, "Status set", `${kind} · ${s.reviewers[it.reviewerId].pseudonym} · ${it.status || "cleared"}`, { business: true, reviewers: [it.reviewerId] });
}
export function unlock(s, now, id) {
  const b = s.bugs.find((x) => x.id === id); if (!b) fail("Not found", 404);
  if (b.unlocked) return b;
  if (!b.scores || !b.tier) fail("Not listed for unlock");
  if (s.credits.balance < b.tier.price) fail(`Needs $${b.tier.price} in credits`);
  s.credits.balance -= b.tier.price; b.unlocked = true; b.unlockedAt = now; b.paidOut = Math.round(b.tier.price * (1 - FEE_PCT)); b.payout = "released";
  s.credits.ledger.push({ at: now, what: `Unlock · ${b.title}`, amt: -b.tier.price });
  log(s, now, "Issue unlocked", `"${b.title}" · $${b.tier.price} · ${s.reviewers[b.reviewerId].pseudonym} owed $${b.paidOut}`, { business: true, reviewers: [b.reviewerId] });
  return b;
}

// ---------- reviewer actions ----------
export function accept(s, now, id, a) {
  const r = s.reviewers[id]; if (!r) fail("Not found", 404);
  if (r.seat !== "invited") fail("This invitation has been used");
  if (!s.period || !["recruiting", "open"].includes(s.period.state)) fail("This period is no longer taking reviewers");
  const knew = ["yes", "no", "not sure"].includes(a.knew) ? a.knew : fail("Say whether you knew the business");
  const email = clean(a.email, 120).toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("A real email address is needed for the payout");
  const payid = clean(a.payid, 120); if (!payid) fail("A PayID (phone or email) is needed for the payout");
  if (a.eligible !== true) fail("The eligibility check must be confirmed");
  // A returning reviewer (same email in this business) carries their reputation and strikes over.
  const same = Object.values(s.reviewers).find((x) => x.id !== id && x.periodNo === s.period.no && x.contact && x.contact.email === email && x.seat !== "released");
  if (same) fail("That email already holds a seat in this period");
  const prior = Object.values(s.reviewers).filter((x) => x.id !== id && x.contact && x.contact.email === email).sort((a, b) => (b.acceptedAt || 0) - (a.acceptedAt || 0))[0];
  if (prior) { r.rep = { ...prior.rep }; r.strikes = prior.strikes; r.status = prior.status; r.pseudonym = prior.pseudonym; }
  if (r.status === "banned" || r.status === "suspended") fail("This account cannot take part");
  r.seat = "accepted"; r.knew = knew; r.acceptedAt = now; r.contact = { name: clean(a.name, 80), email, payid };
  if (s.period.state === "recruiting") { s.period.state = "open"; s.period.at.opened = now; log(s, now, "Period opened", "first seat accepted"); }
  log(s, now, "Seat accepted", r.pseudonym, { business: true, reviewers: [id] });
}
export function decline(s, now, id) {
  const r = s.reviewers[id]; if (!r) fail("Not found", 404);
  if (r.seat !== "invited") return;
  r.seat = "released"; log(s, now, "Invite declined", r.pseudonym, { business: true, reviewers: [id] });
}
export function saveDraft(s, now, id, d) {
  const r = s.reviewers[id]; if (!r || r.seat !== "accepted") fail("No open review to draft");
  r.draft = { sections: (Array.isArray(d.sections) ? d.sections : []).slice(0, 8).map((x) => clean(x, 4000)), closing: (Array.isArray(d.closing) ? d.closing : []).slice(0, 3).map((x) => clean(x, 500)), received: !!d.received, at: now };
}
export async function submitReview(s, now, id, d, ai, rng) {
  const r = s.reviewers[id]; if (!r) fail("Not found", 404);
  if (r.seat !== "accepted") fail("Nothing to submit");
  if (s.period.state !== "open") fail("The open stage has ended");
  const b = brief(s);
  const sections = (Array.isArray(d.sections) ? d.sections : []).map((x) => clean(x, 4000));
  const closing = (Array.isArray(d.closing) ? d.closing : []).map((x) => clean(x, 500));
  if (sections.length !== b.wants.length || sections.some((x) => x.length < 20)) fail("Every section needs an answer of at least 20 characters");
  const rv = { id: uid(rng), periodNo: s.period.no, reviewerId: id, sections, closing, briefV: s.period.briefV, at: now, ratings: [], scores: null, status: null };
  const scored = await ai.scoreReview({ sections, closing }, b);
  rv.ai = { onBrief: clamp(scored.onBrief), quality: clamp(scored.quality), by: scored.by };
  s.reviews.push(rv); r.seat = "submitted"; r.submittedAt = now; r.draft = null;
  log(s, now, "Review submitted", `${r.pseudonym} · brief v${rv.briefV}`, { business: true, reviewers: [id] });
  if (scored.flag && FLAG_REASONS.includes(scored.flag)) await raiseFlag(s, now, "review", rv.id, "ai", scored.flag, ai, rng);
  if (!seated(s).some((x) => x.seat === "accepted" || x.seat === "invited")) startRating(s, now, rng);
  return rv;
}
export async function checkDuplicate(s, id, d, ai) {
  const b = brief(s);
  const cands = [...cur(s, s.bugs).filter((x) => x.reviewerId !== id && !x.dupOf).map((o) => ({ id: o.id, title: o.title, happened: o.happened })),
    ...s.bugs.filter((x) => x.unlocked && x.periodNo !== s.period.no).map((o) => ({ id: o.id, title: o.title, happened: o.happened })),
    ...b.known.map((k, i) => ({ id: "known" + i, title: k, happened: "" }))];
  if (!cands.length) return null;
  const m = await ai.findDuplicate({ title: clean(d.title, 200), happened: clean(d.happened, 2000) }, cands);
  return cands.find((c) => c.id === m) || null;
}
export async function submitBug(s, now, id, d, dupOf, ai, rng) {
  const r = s.reviewers[id]; if (!r) fail("Not found", 404);
  if (!["accepted", "submitted", "rated"].includes(r.seat)) fail("Accept the invitation first");
  if (s.period.state !== "open") fail("Issues can be reported while the period is open");
  if (cur(s, s.bugs).filter((x) => x.reviewerId === id).length >= 20) fail("That is enough issues for one period");
  const bug = { id: uid(rng), periodNo: s.period.no, reviewerId: id, title: clean(d.title, 200), happened: clean(d.happened, 2000), instead: clean(d.instead, 1000), where: clean(d.where, 120),
    briefV: s.period.briefV, at: now, dupOf: null, confirmations: 0, ratings: [], unlocked: false, status: null, payout: null };
  if (!bug.title || bug.happened.length < 10) fail("A title and what happened are needed");
  if (dupOf) {
    const o = s.bugs.find((x) => x.id === dupOf);
    if (!o || o.dupOf || o.reviewerId === id) fail("That is not an issue you can confirm");
    bug.dupOf = o.id; o.confirmations += 1; s.bugs.push(bug);
    log(s, now, "Issue confirmed", `${r.pseudonym} · "${o.title}"`, { business: true, reviewers: [id] });
    return bug;
  }
  const scored = await ai.scoreBug(bug, brief(s));
  bug.ai = { category: CATEGORIES.includes(scored.category) ? scored.category : "wrong step", teaser: clean(scored.teaser, 110), onBrief: clamp(scored.onBrief), quality: clamp(scored.quality), by: scored.by };
  s.bugs.push(bug);
  log(s, now, "Issue reported", `${r.pseudonym} · "${bug.title}"`, { business: true, reviewers: [id] });
  return bug;
}
export function markReceived(s, now, id, v) { const r = s.reviewers[id]; if (!r) fail("Not found", 404); r.received = !!v; }
export function startRating(s, now, rng) {
  // Balanced and blind: shuffle the submitters once, then each review is rated by the next three in the ring.
  // Every rater gets exactly three (fewer only when fewer than four people submitted) and never their own.
  const subs = seated(s).filter((r) => r.seat === "submitted").map((r) => [r.id, (rng || Math.random)()]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  const n = subs.length;
  cur(s, s.reviews).forEach((rv) => { const i = subs.indexOf(rv.reviewerId); s.assignments[rv.id] = i < 0 ? [] : [1, 2, 3].filter((k) => k < n).map((k) => subs[(i + k) % n]); });
  s.period.state = "rating"; s.period.at.rating = now;
  log(s, now, "Peer rating started", `${cur(s, s.reviews).length} reviews · up to 3 blind raters each`);
  subs.forEach((id) => { if (!cur(s, s.reviews).some((rv) => s.assignments[rv.id].includes(id))) { s.ratingsDone[id] = true; s.reviewers[id].seat = "rated"; } });
  if (cur(s, s.reviews).every((rv) => s.assignments[rv.id].every((id) => s.ratingsDone[id]))) settle(s, now);
}
export async function submitRatings(s, now, id, entries, ai, rng) {
  const r = s.reviewers[id]; if (!r) fail("Not found", 404);
  if (s.period.state !== "rating" && s.period.state !== "settlement") fail("Peer rating is not open");
  if (r.seat !== "submitted") fail("Nothing to rate");
  const late = s.period.state === "settlement";
  const mine = cur(s, s.reviews).filter((rv) => s.assignments[rv.id].includes(id));
  const byId = new Map((Array.isArray(entries) ? entries : []).map((e) => [String(e.reviewId), e]));
  for (const rv of mine) {
    const e = byId.get(rv.id); if (!e) fail("Rate every review you were given");
    const useful = Math.round(Number(e.useful)); if (!(useful >= 1 && useful <= 5)) fail("Usefulness is 1 to 5");
    rv.ratings.push({ raterId: id, truthful: !!e.truthful, fair: !!e.fair, matches: ["yes", "partly", "no"].includes(e.matches) ? e.matches : "partly", useful });
    cur(s, s.bugs).filter((b) => b.reviewerId === rv.reviewerId && !b.dupOf).forEach((b) => b.ratings.push({ raterId: id, useful }));
  }
  s.ratingsDone[id] = true; r.seat = "rated";
  log(s, now, "Peer ratings submitted", `${r.pseudonym} · ${mine.length}${late ? " · late, scores unchanged" : ""}`, { business: false, reviewers: [id] });
  for (const rv of mine) { const e = byId.get(rv.id); if (e.flag && FLAG_REASONS.includes(e.flag)) await raiseFlag(s, now, "review", rv.id, id, e.flag, ai, rng); }
  if (late) { r.payout = "pending"; if (!releaseIfNoFlags(s, now, id)) { r.payout = "held"; r.payoutReason = "flag open"; } maybeClose(s, now); return; }
  if (cur(s, s.reviews).every((rv) => s.assignments[rv.id].every((x) => s.ratingsDone[x]))) settle(s, now);
}
export function reply(s, now, id, flagId, text) {
  const f = s.flags.find((x) => x.id === flagId); if (!f) fail("Not found", 404);
  if (s.reviewers[targetOf(s, f).reviewerId].id !== id) fail("Not yours", 403);
  if (f.state !== "queued" || f.reply) fail("No reply can be added now");
  f.reply = clean(text, 1500); if (!f.reply) fail("Write something");
  log(s, now, "Reply to flag", `${s.reviewers[id].pseudonym}`, { business: false, reviewers: [id] });
}

// ---------- flags, scoring, settlement ----------
export async function raiseFlag(s, now, targetType, targetId, source, reason, ai, rng) {
  if (!FLAG_REASONS.includes(reason)) fail("Unknown flag reason");
  if (s.flags.some((f) => f.targetId === targetId && f.reason === reason && (f.state === "triage" || f.state === "queued"))) return null;
  const target = (targetType === "review" ? s.reviews : s.bugs).find((x) => x.id === targetId); if (!target) fail("Not found", 404);
  const who = s.reviewers[target.reviewerId];
  if (source === "business" && s.flags.some((f) => f.targetId === targetId && f.source === "business")) fail("Already flagged");
  const f = { id: uid(rng), periodNo: target.periodNo, targetType, targetId, source, reason, at: now, state: "triage", reply: null, ai: null, decision: null };
  s.flags.push(f);
  log(s, now, "Flag raised", `${reason} · ${who.pseudonym} · by ${source === "ai" ? "AI" : source === "business" ? "business" : "peer"}`, { business: true, reviewers: [who.id] });
  if (who.payout === "pending") { who.payout = "held"; who.payoutReason = "flag open"; }
  const text = targetType === "review" ? target.sections.join("\n") : target.title + ". " + target.happened;
  const peers = cur(s, s.reviews).filter((x) => x.id !== target.id).map((x) => x.sections.join(" ").slice(0, 400));
  const v = await ai.triage({ reason, text, knew: who.knew, peers });
  f.ai = { verdict: ["clear", "breach", "unsure"].includes(v.verdict) ? v.verdict : "unsure", confidence: Math.max(0, Math.min(1, Number(v.confidence) || 0)), reasoning: clean(v.reasoning, 400), by: v.by };
  if (f.ai.verdict === "clear" && f.ai.confidence >= 0.8) {
    f.state = "cleared"; f.decidedBy = "AI"; f.decidedAt = now;
    log(s, now, "Flag cleared", `${reason} · ${who.pseudonym} · AI ${Math.round(f.ai.confidence * 100)}%`, { business: true, reviewers: [who.id] });
    releaseIfNoFlags(s, now, who.id); maybeClose(s, now);
  } else {
    f.state = "queued";
    log(s, now, "Flag queued for review", `${reason} · ${who.pseudonym} · AI ${f.ai.verdict} ${Math.round(f.ai.confidence * 100)}%`, { business: true, reviewers: [who.id] });
  }
  return f;
}
const peerWeight = (s, id) => 0.5 + repOf(s.reviewers[id]) / 200;
function peerScore(s, rs) { if (!rs.length) return null; let t = 0, w = 0; rs.forEach((r) => { const k = peerWeight(s, r.raterId); t += ((r.useful - 1) / 4) * 100 * k; w += k; }); return Math.round(t / w); }
export function computeScores(s, item) {
  const peer = peerScore(s, item.ratings);
  const quality = peer == null ? item.ai.quality : Math.round(0.6 * peer + 0.4 * item.ai.quality);
  let usefulness = Math.round((item.ai.onBrief + quality) / 2);
  const offBrief = item.ai.onBrief < 40; if (offBrief) usefulness = Math.min(usefulness, 74);
  return { onBrief: item.ai.onBrief, quality, peer, usefulness, offBrief };
}
export function settle(s, now) {
  s.period.state = "settlement"; s.period.at.settled = now;
  cur(s, s.reviews).forEach((rv) => { rv.scores = computeScores(s, rv); const r = s.reviewers[rv.reviewerId]; r.rep.sum += rv.scores.usefulness; r.rep.n += 1; });
  cur(s, s.bugs).filter((b) => !b.dupOf).forEach((b) => { b.scores = computeScores(s, b); b.scores.usefulness = Math.min(100, b.scores.usefulness + b.confirmations * 5); b.tier = tierOf(b.scores.usefulness); });
  seated(s).forEach((r) => {
    if (r.seat === "rated") { r.payout = "pending"; if (!releaseIfNoFlags(s, now, r.id)) { r.payout = "held"; r.payoutReason = "flag open"; } }
    else if (r.seat === "submitted") { r.payout = "held"; r.payoutReason = "peer ratings outstanding"; r.heldAt = now; }
  });
  log(s, now, "Settlement started", "scores final · reputations updated");
  maybeClose(s, now);
}
function releaseIfNoFlags(s, now, id) {
  const r = s.reviewers[id];
  if (!s.period || !["settlement", "closed"].includes(s.period.state) || r.seat !== "rated") return false;
  const open = s.flags.some((f) => (f.state === "triage" || f.state === "queued") && targetOf(s, f).reviewerId === id);
  if (open || r.payout === "forfeited" || r.payout === "paid") return r.payout === "paid";
  r.payout = "released"; r.payoutReason = ""; r.releasedAt = now;
  log(s, now, "Review fee released", `${r.pseudonym} · $${FEE}`, { business: true, reviewers: [id] });
  return true;
}
function maybeClose(s, now) {
  if (s.period.state !== "settlement") return;
  const open = s.flags.some((f) => f.periodNo === s.period.no && (f.state === "triage" || f.state === "queued"));
  const held = seated(s).some((r) => r.payout === "held");
  if (!open && !held) closePeriod(s, now);
}
function closePeriod(s, now) {
  if (s.period.state === "closed") return;
  const unused = seated(s).filter((r) => r.seat === "released" || r.seat === "invited").length, refund = unused * SEAT_COST;
  seated(s).forEach((r) => { if (r.seat === "invited") r.seat = "released"; });
  if (refund) { s.credits.balance += refund; s.credits.locked -= refund; s.credits.ledger.push({ at: now, what: `Refund · ${unused} unused seat${unused > 1 ? "s" : ""}`, amt: refund }); }
  const paid = seated(s).filter((r) => r.payout === "released" || r.payout === "paid").length;
  if (paid) { const out = Math.min(s.credits.locked, paid * SEAT_COST); s.credits.ledger.push({ at: now, what: `${paid} review fee${paid > 1 ? "s" : ""} released`, amt: -out }); s.credits.locked -= out; }
  if (s.credits.locked > 0) { s.credits.balance += s.credits.locked; s.credits.ledger.push({ at: now, what: "Unspent lock returned", amt: s.credits.locked }); s.credits.locked = 0; }
  s.period.state = "closed"; s.period.at.closed = now;
  log(s, now, "Period closed", unused ? `${unused} seat refunded` : "all seats used");
}
export function decide(s, now, flagId, outcome) {
  const f = s.flags.find((x) => x.id === flagId); if (!f) fail("Not found", 404);
  if (f.state !== "queued") fail("This flag is not waiting on a decision");
  if (!["clear", "low quality", "breach"].includes(outcome)) fail("Unknown outcome");
  f.state = "decided"; f.decision = outcome; f.decidedBy = "operator"; f.decidedAt = now;
  const r = s.reviewers[targetOf(s, f).reviewerId];
  if (outcome === "breach") {
    r.strikes += 1; r.rep.sum -= 25 * PRIOR_N; r.status = r.strikes === 1 ? "warned" : r.strikes === 2 ? "suspended" : "banned";
    if (r.payout !== "paid") { r.payout = "forfeited"; r.payoutReason = f.reason; s.credits.balance += SEAT_COST; s.credits.locked = Math.max(0, s.credits.locked - SEAT_COST); s.credits.ledger.push({ at: now, what: `Forfeited seat returned · ${r.pseudonym}`, amt: SEAT_COST }); }
    log(s, now, "Breach", `${r.pseudonym} · ${f.reason} · account ${r.status}`, { business: true, reviewers: [r.id] });
  } else {
    log(s, now, outcome === "clear" ? "Flag cleared" : "Flag closed · low quality", `${r.pseudonym} · ${f.reason}`, { business: true, reviewers: [r.id] });
    releaseIfNoFlags(s, now, r.id);
  }
  maybeClose(s, now);
}
export function markPaid(s, now, kind, id) {
  if (kind === "review") { const r = s.reviewers[id]; if (!r) fail("Not found", 404); if (r.payout !== "released") fail("Nothing released to pay"); r.payout = "paid"; r.paidAt = now; log(s, now, "Review fee paid", `${r.pseudonym} · $${FEE}`, { business: true, reviewers: [id] }); return; }
  const b = s.bugs.find((x) => x.id === id); if (!b) fail("Not found", 404); if (b.payout !== "released") fail("Nothing released to pay"); b.payout = "paid"; b.paidAt = now;
  log(s, now, "Issue payout paid", `"${b.title}" · $${b.paidOut} · ${s.reviewers[b.reviewerId].pseudonym}`, { business: true, reviewers: [b.reviewerId] });
}

// The clock. Runs before every read and write: deadlines move the period on without anyone pressing anything.
export function tick(s, now, rng) {
  const p = s.period; if (!p) return false; let changed = false;
  if (p.state === "open") {
    seated(s).forEach((r) => {
      const late = r.seat === "accepted" ? now - r.acceptedAt > SUBMIT_DAYS * DAY : r.seat === "invited" ? now - p.at.opened > SUBMIT_DAYS * DAY : false;
      if (late) { r.seat = "released"; changed = true; log(s, now, "Seat released", `${r.pseudonym} · deadline passed`, { business: true, reviewers: [r.id] }); }
    });
    if (cur(s, s.reviews).length && !seated(s).some((r) => r.seat === "accepted" || r.seat === "invited")) { startRating(s, now, rng); changed = true; }
  } else if (p.state === "rating" && now - p.at.rating > RATING_DAYS * DAY) { settle(s, now); changed = true; }
  else if (p.state === "settlement") {
    s.flags.filter((f) => f.periodNo === p.no && (f.state === "queued" || f.state === "triage") && now - f.at > FLAG_DAYS * DAY).forEach((f) => { f.state = "cleared"; f.decidedBy = "timeout"; f.decidedAt = now; changed = true; log(s, now, "Flag timed out", `${f.reason} · payout released · kept for reputation only`); });
    seated(s).filter((r) => r.payout === "held" && r.seat === "rated").forEach((r) => { if (releaseIfNoFlags(s, now, r.id)) changed = true; });
    seated(s).filter((r) => r.payout === "held" && r.seat === "submitted" && now - (r.heldAt || p.at.settled) > HOLD_DAYS * DAY).forEach((r) => { r.payout = "forfeited"; r.payoutReason = "peer ratings never submitted"; s.credits.balance += SEAT_COST; s.credits.locked = Math.max(0, s.credits.locked - SEAT_COST); s.credits.ledger.push({ at: now, what: `Forfeited seat returned · ${r.pseudonym}`, amt: SEAT_COST }); changed = true; log(s, now, "Fee forfeited", `${r.pseudonym} · never rated peers`, { business: true, reviewers: [r.id] }); });
    const before = p.state; maybeClose(s, now); if (p.state !== before) changed = true;
  }
  return changed;
}

// ---------- views: what each party is allowed to see ----------
const pub = (r) => ({ id: r.id, pseudonym: r.pseudonym, seat: r.seat, knew: r.knew, rep: repOf(r), scored: r.rep.n, status: r.status, strikes: r.strikes, payout: r.payout, payoutReason: r.payoutReason, received: r.received, acceptedAt: r.acceptedAt || null, submittedAt: r.submittedAt || null });
export function businessView(s, tokens) {
  const p = s.period;
  return {
    name: s.name, credits: s.credits, briefs: s.briefs, periodNo: s.periodNo, period: p, history: s.history,
    reviewers: seated(s).map((r) => ({ ...pub(r), token: r.seat === "invited" ? (tokens || {})[r.id] || null : null })),
    reviewCount: cur(s, s.reviews).length,
    reviews: (p && ["recruiting", "open"].includes(p.state) ? [] : cur(s, s.reviews)).map((rv) => ({ ...rv, flags: s.flags.filter((f) => f.targetId === rv.id).map(({ id, reason, source, state, decision, at }) => ({ id, reason, source, state, decision, at })) })),
    bugs: cur(s, s.bugs).filter((b) => !b.dupOf).map((b) => b.unlocked ? b : { id: b.id, category: b.ai && b.ai.category, teaser: b.ai && b.ai.teaser, provisional: b.ai ? Math.round((b.ai.onBrief + b.ai.quality) / 2) : null, scores: b.scores, tier: b.tier, confirmations: b.confirmations, unlocked: false, reviewerId: b.reviewerId, at: b.at }),
    log: s.log.filter((e) => e.vis.business).slice(-300),
  };
}
export function reviewerView(s, id) {
  const r = s.reviewers[id]; if (!r) return null;
  const p = s.period; const own = p && r.periodNo === p.no;
  const rv = s.reviews.find((x) => x.reviewerId === id && x.periodNo === r.periodNo) || null;
  const mine = own && (p.state === "rating" || p.state === "settlement") && r.seat === "submitted" ? cur(s, s.reviews).filter((x) => s.assignments[x.id] && s.assignments[x.id].includes(id)).map((x) => ({ id: x.id, sections: x.sections })) : [];
  const b = s.briefs.find((x) => x.v === (p ? p.briefV : 0)) || latestBrief(s);
  return {
    business: s.name, me: { ...pub(r), contact: r.contact, draft: r.draft, current: own }, period: p ? { no: p.no, state: p.state, at: p.at, seats: p.seats } : null,
    brief: b ? { v: b.v, product: b.product, job: b.job, wants: b.wants, known: b.known, eligibility: b.eligibility } : null,
    review: rv ? { id: rv.id, sections: rv.sections, closing: rv.closing, at: rv.at, scores: rv.scores, status: rv.status, briefV: rv.briefV } : null,
    bugs: s.bugs.filter((x) => x.reviewerId === id).map((x) => ({ id: x.id, title: x.title, dupOf: x.dupOf, scores: x.scores, tier: x.tier, unlocked: x.unlocked, paidOut: x.paidOut, payout: x.payout, status: x.status, at: x.at })),
    published: [...(b ? b.known : []).map((t) => ({ title: t, status: "known" })), ...s.bugs.filter((x) => x.unlocked).map((x) => ({ title: x.title, status: x.status || "unlocked" }))],
    toRate: mine, ratingsDone: !!s.ratingsDone[id],
    flags: rv ? s.flags.filter((f) => f.targetId === rv.id).map(({ id, reason, state, decision, reply, at }) => ({ id, reason, state, decision, reply, at })) : [],
    log: s.log.filter((e) => e.vis.reviewers.includes(id)).slice(-100),
  };
}
export function adminView(s) {
  const flags = s.flags.map((f) => { const t = targetOf(s, f); const r = s.reviewers[t.reviewerId]; return { ...f, text: f.targetType === "review" ? t.sections.join("\n") : t.title + ". " + t.happened, reviewer: pub(r), periodNo: f.periodNo }; });
  const payouts = [
    ...Object.values(s.reviewers).filter((r) => r.payout === "released" || r.payout === "paid").map((r) => ({ kind: "review", id: r.id, pseudonym: r.pseudonym, amount: FEE, payid: r.contact && r.contact.payid, email: r.contact && r.contact.email, state: r.payout, at: r.paidAt || r.releasedAt, periodNo: r.periodNo })),
    ...s.bugs.filter((b) => b.payout === "released" || b.payout === "paid").map((b) => ({ kind: "bug", id: b.id, pseudonym: s.reviewers[b.reviewerId].pseudonym, amount: b.paidOut, payid: s.reviewers[b.reviewerId].contact && s.reviewers[b.reviewerId].contact.payid, email: s.reviewers[b.reviewerId].contact && s.reviewers[b.reviewerId].contact.email, state: b.payout, at: b.paidAt || b.unlockedAt, periodNo: b.periodNo, title: b.title })),
  ];
  return { name: s.name, flags, payouts, reviewers: Object.values(s.reviewers).map((r) => ({ ...pub(r), email: r.contact && r.contact.email })), log: s.log.slice(-300), periodNo: s.periodNo, period: s.period };
}
