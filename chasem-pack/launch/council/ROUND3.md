# Round three: close it

Round two is in. Six of the ten decisions are settled and will not be reopened. Five points are still split.
This round is short. On each open point you pick ONE of the listed options — not a new one, not a blend — and
give at most three lines for why. Then you say, in one line, whether you will ACCEPT the majority if you lose.
A seat that will not accept must name the specific harm, in dollars or in a behaviour, that makes it
unacceptable rather than merely worse.

## A fact none of you had in round one, now verified in the code

A quote sent with chasing on does not cost one message. It costs FOUR.

- `chasem-app/app.js:1140` books quote+3, quote+7 and quote+14 in the same tap as the send.
- `chasem-landing/api/msg.js:186-188`: `action: "schedule"` calls `spend(payload, 1)` at the moment
  the reminder is BOOKED, not when it goes. It is refunded on cancel (`msg.js:192`).
- All three nudges are inside the sender's 30/35-day window, so all three are booked immediately.

Consequences you must price into your answers:
- Five free messages is ONE quote and one spare. Twelve is exactly three jobs. Fifteen is three jobs and a spare.
- The $99 / 150-message plan is about 37 quotes a month, not 150 of anything he would count.
- A painter at 3-8 quotes a week (12-34 a month) uses 48-136 messages on quotes alone, before a single invoice
  chase. The top of that band exceeds the 150 included.
- When a quote is accepted, the remaining nudges are cancelled and refunded, so a job that lands early costs
  less than four.

## Settled in round two. Do not reopen.

- D1 persona: the notepad domestic repainter who quotes homeowners himself, solo or plus one, licensed, capital
  city, 3-8 quotes a week in season. Not the new-build subcontractor, not a 4+ crew with a bookkeeper.
- D2 hook: the A4 sheet going onto the wall is the visual and owns the first three seconds; the money pain goes
  in the caption, with no dollar figure that cannot be backed.
- D3: keep one screen of landing page for the ACL disclosures and the sample PDF; split-test phone traffic
  straight into the app; decide it on cost per activated painter, not cost per click.
- D5 expiry: there is NO expiry. Both seats that proposed or funded one have withdrawn it.
- D7 shape: the wall at zero stays soft forever -- the app keeps writing every message and he taps Send himself,
  free. The offer appears at the second nudge on a live job, with the customer's name and the written message on
  screen, dismissible, and no more than twice before zero.
- D8: he types a card number and nothing else and lands back on the job he was chasing. The three checkout
  fields have already been deleted from the Payment Links.
- D9: a plain local count of his own results on Home, the balance line on Follow-ups, a weekly one-tap "Has this
  one paid?" list, opt-in auto top-up with "$105 is the worst month you can have" on the same screen.

## OPEN 1 -- Google Search, or not

- (a) TARGETER: zero dollars on Search until 100 paying customers exist. His number: ~300 exact-match searches a
  month across all eight keywords, ~60 with buying intent, about 3.6 clicks a month at 100% impression share.
- (b) MONEY: $300/month of Search from day one, bounded downside of one-third of a customer, to size the market.
- (c) PAINTER: first dollar to Search, because one man can read every sign-up.
Answer TARGETER's volume number directly. If there are 3.6 clicks a month available, MONEY cannot spend $300 and
PAINTER's inbox is four people a month. If you think the number is wrong, say what it actually is.

## OPEN 2 -- where the email is asked for

- (a) At the first Send, once a priced PDF exists: TARGETER, PAINTER, and MONEY, who conceded it in round two
  with a full abandonment model (the door costs $25 a customer even at 0% abandonment, $121 at 40%).
- (b) At the door, as built: ARCHITECT alone, who conceded TO MONEY's round-one argument in round two -- the
  argument MONEY has now withdrawn as wrong by 3 to 15 times.
ARCHITECT: your concession was to a position its own author has retracted with better numbers. Restate it
against MONEY's round-two model or drop it. Everyone else: one line, and hold or move.

## OPEN 3 -- the free allowance

- (a) 10 messages: PAINTER
- (b) 12 messages: TARGETER, ARCHITECT
- (c) 15 messages: MONEY
Unit is agreed: metered in messages, shown to him as jobs. Now that a job is exactly four messages, 12 is three
jobs to the end and 15 is three jobs and a spare. Pick one number and say what it buys that the one below does
not.

## OPEN 4 -- the activation window

- (a) 24 hours: TARGETER (matches Meta's 1-day-click column), MONEY (for weekly steering)
- (b) 48 hours: ARCHITECT
- (c) two clocks, 24h or 48h for weekly steering and 7 days for cohort truth: PAINTER, MONEY
MONEY has already conceded that no spending decision changes at any of these, so this is a reporting choice.
Pick the reporting choice. Note ARCHITECT's finding that `qc_joined` is stamped date-only in `api/signup.js`, so
nothing finer than a day is measurable today without a code change -- say whether that change is worth making.

## OPEN 5 -- the number that stops the spend

Everyone now agrees the steering metric is cost per activated painter and the monthly gate is activated-to-paid
at or above 12%. The hard stop is not agreed:
- (a) $45 sustained for two weeks: TARGETER
- (b) $60: PAINTER
- (c) $100 per activation: ARCHITECT, derived from CAC $400 at a 25% activated-to-paid rate
- (d) the arithmetic: at the agreed 12% gate, a $400 CAC ceiling is $48 per activation. $60 implies CAC $500 and
  $100 implies CAC $833, both of which breach MONEY's ceiling at the rate the council actually agreed on.
Whoever is wrong here is wrong on arithmetic, not on judgement. Settle it, and state the stop as one dollar
figure per activated painter, with the number of activations required before it may be acted on.

## What to write

Write `r3-<yourseat>.md` in this folder. Five headings, OPEN 1 to OPEN 5. Under each: your pick as a single
letter, up to three lines of reason, and one line saying ACCEPT MAJORITY or REFUSE with the specific harm.
Then one final heading, "THE 4-MESSAGE FACT", saying in three lines or fewer what it changes about your round-two
answers -- especially the plan sizing, since a busy painter can exceed 150 messages on quotes alone.
Nothing else. Do not change any code.
