// The rules alone, no database: a late rater during settlement is paid, and an unrated one is not until they rate.
import * as E from "../api/_engine.js";
delete process.env.ANTHROPIC_API_KEY;
const { ai } = await import("../api/_ai.js");
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
let t = Date.parse("2026-10-12T09:00:00Z"); const DAY = 86400000;
const s = E.newState("Loop", t);
E.saveBrief(s, t, { product: "Pickup laundry", job: "Book one pickup", wants: ["Booking: was it clear when we would arrive?"], eligibility: "Inner north" });
E.addCredits(s, t, 500); E.newPeriod(s, t); E.fund(s, t, 4);
const ids = E.openRecruiting(s, t, () => 0.42);
ids.forEach((id, i) => E.accept(s, t, id, { knew: "no", eligible: true, email: `p${i}@x.co`, payid: "04" }));
const text = ["The booking page said we would get a text the night before and it came at 9:40pm with a window, but there was no field for a gate code so the driver rang from the street."];
for (const id of ids) await E.submitReview(s, t, id, { sections: text, closing: [] }, ai);
ok(s.period.state === "rating" && Object.values(s.assignments).every((a) => a.length === 3), "four submissions: rating starts, three raters each");
const counts = {}; Object.values(s.assignments).flat().forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
ok(Object.values(counts).every((n) => n === 3), "and every rater holds exactly three");
const rate = async (id) => E.submitRatings(s, t, id, s.reviews.filter((rv) => s.assignments[rv.id].includes(id)).map((rv) => ({ reviewId: rv.id, truthful: true, fair: true, matches: "yes", useful: 4 })), ai);
await rate(ids[0]); await rate(ids[1]); await rate(ids[2]);
t += 8 * DAY; E.tick(s, t);
ok(s.period.state === "settlement" && s.reviewers[ids[3]].payout === "held" && /outstanding/.test(s.reviewers[ids[3]].payoutReason), "8 days on: settlement, and the one who never rated is held, not paid");
ok(["released"].includes(s.reviewers[ids[0]].payout), "the raters are released");
const scoresBefore = JSON.stringify(s.reviews.map((r) => r.scores));
await rate(ids[3]);
ok(s.reviewers[ids[3]].payout === "released" && s.reviewers[ids[3]].seat === "rated", "rating late, during settlement, releases their fee");
ok(JSON.stringify(s.reviews.map((r) => r.scores)) === scoresBefore, "without changing anyone's final score");
ok(s.period.state === "closed" && s.credits.locked === 0, "and the period closes with nothing locked");
let err = null; try { await E.submitRatings(s, t, ids[3], [], ai); } catch (e) { err = e; }
ok(err && err.status === 400, "rating twice is refused");
console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
