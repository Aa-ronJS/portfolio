// node tools/allowance-test.mjs
//
// The allowance rules a painter's money depends on. A job is more than one message -- the quote or
// invoice, then the first chase that books straight after it -- so the relay has to know the whole
// step's cost before any of it goes out. Otherwise the quote sends and its follow-up comes back 402,
// which is the half-sent job r3-money named as a thing to fix before taking money.
//
// Pure functions only: no Stripe, no network, no env.

import { needFrom, enoughFor, SHORT_FOR_JOB, OUT_OF_MESSAGES } from "../api/_setup.js";

let failed = 0;
function is(got, want, what) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${what}${ok ? "" : `  — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
}

// a hosted painter whose messages are metered
const counted = (left) => ({ counted: true, left });
// a painter on his own Twilio and Resend: nothing here meters him
const uncounted = { counted: false, left: 0 };

console.log("\nneedFrom — what a step says it will cost");
is(needFrom(undefined), 1, "absent is one");
is(needFrom(null), 1, "null is one");
is(needFrom("2"), 2, "a string number is read");
is(needFrom(2), 2, "two is two");
is(needFrom(0), 1, "zero cannot mean free");
is(needFrom(-5), 1, "negative cannot mean free");
is(needFrom("junk"), 1, "junk is one");
is(needFrom(999), 10, "capped, so a bad client cannot lock the account out");

console.log("\nenoughFor — may this step start at all?");
is(enoughFor(counted(5), 2), true, "5 left, job needs 2");
is(enoughFor(counted(2), 2), true, "2 left, job needs 2 — exactly enough");
is(enoughFor(counted(1), 2), false, "1 left, job needs 2 — THE BUG: used to send the quote, then fail its chase");
is(enoughFor(counted(1), 1), true, "1 left, lone message needs 1");
is(enoughFor(counted(0), 1), false, "nothing left");
is(enoughFor(counted(0), 2), false, "nothing left, job needs 2");
is(enoughFor(uncounted, 2), true, "his own credentials are never metered here");
is(enoughFor(null, 2), true, "no balance to read means no gate");
is(enoughFor(counted(1), 0), true, "a junk need of 0 is treated as 1, so it needs 1 and 1 is there");
is(enoughFor(counted(0), 0), false, "…and still cannot slip through on an empty balance");

console.log("\nwhat he is told");
is(SHORT_FOR_JOB(2, 1), "This job needs 2 messages and you have 1. Nothing was sent. Top up and send it again.",
  "refusing a whole job says nothing was sent");
is(/Nothing was sent/.test(SHORT_FOR_JOB(2, 1)), true, "the words that stop it reading like a bug");
is(OUT_OF_MESSAGES, "You are out of messages", "a lone message keeps the old wording");

// The cheap mistake this guards: before the fix the check was `left <= 0`, so one message left
// let a two-message job begin. Walk it both ways.
console.log("\nthe regression, walked through");
const oldGuard = (bal) => !bal || !bal.counted || bal.left > 0;
is(oldGuard(counted(1)), true, "old rule with 1 left: quote goes out…");
is(enoughFor(counted(1), 2), false, "…new rule refuses first, so the job stays whole");

console.log(failed ? `\n${failed} FAILED\n` : "\nall passed\n");
process.exit(failed ? 1 : 0);
