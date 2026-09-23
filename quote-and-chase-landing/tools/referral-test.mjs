// node tools/referral-test.mjs
//
// The code a painter hands to a mate, and the rules around it. Pure functions only: no Stripe, no network.
// The money path (creditFreeMonth) needs Stripe and is covered by the stranger test in LAUNCH-CHECKLIST.

import { readFileSync } from "node:fs";

process.env.RELAY_SIGNING_SECRET = process.env.RELAY_SIGNING_SECRET || "test-secret-not-a-real-one";

const { refCodeFor, cleanRefCode, REF_CAP, PLAN_PRICE } = await import("../api/_setup.js");

const ALPHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
let failed = 0;
function is(got, want, what) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${what}${ok ? "" : `  — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
}

console.log("\nrefCodeFor — the same painter always has the same code");
const a = refCodeFor("cus_AAAAAAAAAAAAAA");
const b = refCodeFor("cus_BBBBBBBBBBBBBB");
is(a, refCodeFor("cus_AAAAAAAAAAAAAA"), "stable across calls — it is derived, not rolled");
is(a.length, 7, "seven characters, short enough to read off a phone");
is(a === b, false, "different painters, different codes");
is(refCodeFor(""), "", "no customer, no code");
is(refCodeFor(null), "", "null is handled");
is(/^[2-9A-HJ-NP-Z]{7}$/.test(a), true, "no 0, O, 1, I or L — these get said down the phone");

console.log("\ncleanRefCode — what a painter actually types");
is(cleanRefCode(a), a, "his own code survives a round trip");
is(cleanRefCode(a.toLowerCase()), a, "lower case is fine");
is(cleanRefCode(" " + a + " "), a, "spaces either side");
is(cleanRefCode(a.slice(0, 3) + "-" + a.slice(3)), a, "a dash he added himself");
is(cleanRefCode("ABC"), "", "too short is rejected, not padded");
is(cleanRefCode("ABCDEFGHIJK"), "", "too long is rejected");
is(cleanRefCode(""), "", "empty");
is(cleanRefCode(null), "", "null");
is(cleanRefCode(undefined), "", "undefined");
is(cleanRefCode("<script>x</script>"), "", "nothing shaped like an injection gets through");
is(cleanRefCode("'; DROP TABLE"), "", "nor anything shaped like a query — this goes into a Stripe search");

console.log("\nthe ambiguous characters are rejected, not guessed at");
// 0, O, 1, I and L are never issued, so one arriving means a misread. Resolving it silently could
// hand a free month to a different painter, so it is refused and he looks again.
is(cleanRefCode("23456O9"), "", "an O is refused, not turned into a 0");
is(cleanRefCode("2345I78"), "", "an I is refused, not turned into a 1");
is(cleanRefCode("2345L78"), "", "an L likewise");
is(cleanRefCode("2345078"), "", "and a literal 0, which we never issue either");

// The check is built from the alphabet, so it can never drift looser than what we hand out.
// Every character the generator can emit must survive; nothing else may.
let drift = "";
for (const ch of "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  const accepted = cleanRefCode(ch.repeat(7)) !== "";
  if (accepted !== ALPHA.includes(ch)) drift += ch;
}
is(drift, "", "the validator accepts exactly the characters the generator issues");

// The landing page decides whether to promise a referred painter double the allowance. If its check is
// looser than the relay's, it promises 24 messages to a code the relay will refuse and quietly hand him 12.
console.log("\nthe page and the relay agree on what a code looks like");
{
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  const m = /var m = \/\[\?&\]r=\(\[([^\]]+)\]\{(\d+)\}\)/.exec(html);
  is(!!m, true, "the page's code check is still where the test expects it");
  if (m) {
    const cls = m[1], len = Number(m[2]);
    is(len, 7, "the page wants seven characters, like the relay");
    let drift = "";
    for (const ch of "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      const pageTakes = new RegExp("^[" + cls + "]$").test(ch);
      if (pageTakes !== ALPHA.includes(ch)) drift += ch;
    }
    is(drift, "", "the page accepts exactly the characters the relay issues");
  }
}

console.log("\nthe shape of the deal");
is(REF_CAP > 0, true, "there is a cap, so nobody rides free for ever");
is(PLAN_PRICE, 99, "a free month is worth the plan price");
// A month is worth what HIS plan costs, so the ceiling is six months of it -- $594 on the solo plan and
// $894 on the two-phone one. There is no single dollar figure, which is why nothing quotes one.
is(REF_CAP * PLAN_PRICE, 594, `six months of the solo plan: $${REF_CAP * PLAN_PRICE}`);
is(REF_CAP * 149, 894, "six months of the two-phone plan, which is the real worst case");

// Sanity on the economics the reward was chosen against: a free month has to beat buying the same
// tradie on Meta, or the whole programme is just a discount with extra steps.
console.log("\nwhy a free month and not a discount");
const cardFee = 2.03, contribution = 99 - 17.69 - cardFee;
const freeMonth = PLAN_PRICE - cardFee;            // no card fee is charged on $0
const metaCac = 45 / 0.12;                          // the $45 stop over the 12% gate
is(freeMonth < metaCac, true, `a free month ($${freeMonth.toFixed(2)}) costs less than Meta ($${metaCac.toFixed(0)})`);
is(Math.round(metaCac / freeMonth * 10) / 10, 3.9, "about 3.9x cheaper than buying him");
is(Math.round(20 * (1 / 0.06)) > freeMonth, true, "$20/month off for life would cost more than a free month, and dent the price");
is(Math.round(freeMonth / contribution * 10) / 10, 1.2, "and it pays back in about 1.2 months");

console.log(failed ? `\n${failed} FAILED\n` : "\nall passed\n");
process.exit(failed ? 1 : 0);
