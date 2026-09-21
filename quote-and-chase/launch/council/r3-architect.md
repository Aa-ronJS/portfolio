# R3 — The Flow Architect

## OPEN 1

**(a)**

TARGETER's number is right in the only way that matters — its order of magnitude. Even if he is out by
3x, eleven clicks a month cannot absorb $300, so MONEY's "bounded downside of one-third of a customer"
is not a test that can be run: the account spends about $40 and stalls, and buys no market sizing at all.
And the traffic is wrong as well as thin — every term with volume is competitor-brand-adjacent, so
Search buys the abandoner D1 has just excluded. PAINTER's "one man can read every sign-up" is an
argument for throttling Meta's budget, not for choosing a channel that delivers four people a month.

ACCEPT MAJORITY.

## OPEN 2

**(a)**

I drop the door. MONEY's a=0 row is wrong in my favour and it still does not rescue me: an unspent free
message costs $0.00 of Twilio, so the $225 issued to 125 door-passers is a liability, not a cost, and the
true gap at zero abandonment is about $0, not $25. But the loss in the 20–40% band is abandonment, not
allowance — paid_B/paid_A is +25% to +67% on the same spend — and nothing I can say about screens touches
a count of men who never reached one. My last product reason, that deferring moves a network failure from
the free moment to the hallway, is answered by PAINTER's placement one screen before Send, with the link
returned inline at app.js:89–91, so there is no inbox round trip left to fail in.

ACCEPT MAJORITY.

## OPEN 3

**(b) 12**

Fifteen does not buy a spare, it buys a broken fourth job. The send gate and the schedule gate are
checked separately — `outOfMessages()` at app.js:1124, `bal.left <= 0` at the relay — so at 15 the fourth
quote sends, books two nudges and takes a 402 on the third: "1 follow-up could not be scheduled".
Twelve is the only figure that is a whole number of jobs, so the wall lands on a job boundary and the
fourth Send is refused cleanly instead of half-chasing a customer. Ten fractures the third job the same way.
If 15 wins, the schedule gate must floor the allowance to a multiple of four, or the app commits the exact
sin it is sold to stop: a nudge the painter believes is booked and which silently does not exist.

ACCEPT MAJORITY, with that floor named as a condition.

## OPEN 4

**(c)**

Both clocks are one subtraction from the same two keys, so the second costs nothing once the key exists.
The change is worth making and it is smaller than I said in round two: `spend()` (_setup.js:148) writes no
timestamp at all, so today NO window is measurable at any granularity — one write-once date key,
`qc_first_send`, not an ISO instant, serves both 24 hours and 7 days.
A 24-hour read alone systematically condemns Friday and Saturday sign-ups, whose first quote is Monday,
and a weekly kill line read on that number switches off the weekend inventory where the couch is.

ACCEPT MAJORITY, provided the stop in OPEN 5 is calibrated on whichever window it is read on.

## OPEN 5

**(d) — $48 per activated painter**

I was wrong on arithmetic and I take the correction. My $100 came from a 25% activated-to-paid rate the
council did not adopt; at the agreed 12% gate a $400 CAC ceiling is $45 ÷ 0.12 inverted — $48 an activation.
State it as: $48 per activated painter, acted on only at 40 or more activations and only when two
consecutive weekly reads sit above it. $45 and $48 are the same decision inside the interval at n=40.
It is unenforceable today: with no first-send date written anywhere, no cost per activation exists to compare.

ACCEPT MAJORITY.

## THE 4-MESSAGE FACT

**Design at Twilio, bug at the ledger.** Booking a real `ScheduleType=fixed` message at Send is correct and
is the whole reason the relay holds no data. But the money does not leave at booking — a scheduled message
is billed when it sends, and a cancelled one is not billed — so `spend(payload, 1)` at schedule time is a
reservation, not a cost, and the reservation leaks: `readBalance` resets `used` when `qc_period` rolls
(_setup.js:142–143), so a nudge booked on 28 September for 12 October is charged to September, and a refund
after rollover lands on `Math.max(0, 0 - 1)` and returns nothing. Every quote sent in the last fortnight of
a billing month silently forfeits up to three messages.
**Yes — book nudge one at Send and let the rest arrive.** The machinery is already built and already runs:
`S.local_queue` + `withinWindow` + `retryLocalQueue` (app.js:183–197, fired on every boot at app.js:226,
which already drops queued nudges whose job has been accepted or put on hold). Narrowing `WINDOW_DAYS`
from 35/30 to about four days converts "too far ahead for the sender" into "book what is imminent, hold the
rest" with no new code. The price is that a painter who never opens the app between day 0 and day 7 loses
the later nudges, which is why nudge one must still go at Send.
**What it changes above.** A quote then costs 2 at Send and what it actually uses thereafter, so the honest
average job is nearer 2.5–3, not 4: **150 messages is about 50 jobs, not 30, and the 8-quotes-a-week painter
stops breaching the plan.** The overrun ROUND3 priced is an artefact of the reservation, not of his workload.
My free-tier answer does **not** move with it: twelve must still buy three fully-quiet jobs in the worst case.
