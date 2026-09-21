# R1 — the money seat
Verified: Stripe 2.2%+30c; SMS ~18c (estimate until a Twilio AU invoice exists). **Everything else is an assumption**
— CPC, click→signup, signup→paid, churn, and every conversion I attribute to an alternative. I invent no platform
statistics, only what each guess must be worth to be worth doing. Model: `scratchpad/model/money-seat.js`. Avg
contribution $100.00/customer/mo (4-in-5 solo). Profit@100 = $10,000 − $30 − (churn × 100 × CAC): margin net of the
ad spend needed to stand still.

## 1. Positions
**D1** Licensed solo-to-three-person domestic repaint painter, capital city, 5–15 quotes/mo, quoting by hand. He sends
20–40 messages, inside the 150 included, so contribution holds at $91. A 10-person commercial outfit needs the demo Aaron refuses; a 2-quotes-a-month hobbyist never burns the free tier.
**D2** Meta feed + Reels, one creative: A4 sheet on a wall, one photo, the three-page PDF in his name. "Stick an A4 sheet on the wall. Take one photo. Send the quote before you leave the driveway." No "AI", no earnings claim — ACL, and
it drags in tyre-kickers who cost $1.50 a click and never convert.
**D3** Keep the page, one screen; it carries the ACL disclosures (~6cm accuracy, price, guarantee) that cannot live in
an ad. Split-test ad→app-direct. The only decision rule is $ per sign-up.
**D4** Email stays at the door. Deferring must clear 9.35% signup→paid to break even, and the door wins anyway if 0.31%
of dormant emails ever convert.
**D5** Ten messages, metered in *messages* — the only thing with a marginal cost. Five cannot complete one job (send +
3 chases + deposit invoice = 5 exactly). Hard cap at 10.
**D6** One real quote PDF sent to a real customer through the relay, inside 24h of first open — also the only observable event: no server, so the Stripe message counter is the entire telemetry.
**D7** Soft wall stays; the paid thing is *automatic* sending. At zero: "You've used your 10 free messages. The app
still writes every text and email — you tap Send yourself, free, for as long as you like. $99 a month sends them for
you: 150 messages, and the three quote chases and three overdue chases going out on time without you. Cancel any time
from this screen."
**D8** Zero typed characters, under 20 seconds, back on the quote he was on: Stripe holds email and card, the
post-payment button carries the token. A botched hand-off is a refund *plus* a support email, and support volume is
the real ceiling on one man.
**D9** Churn is the biggest lever we own — 1pp is worth $276/mo at 100 customers, a 10%-cheaper click only $144/mo. A local "this month" tile (accepted, invoiced, chased in) built on his phone; auto top-up capped at 3 packs so the
balance never dies mid-job; the six templates edited in week one.
**D10** **Payback = CAC ÷ $100, ceiling 4 months (CAC ≤ $400).** Uses only observed numbers — spend, Stripe customers,
arithmetic contribution — and no churn guess. Base 2.76 months; at 2% conversion 6.9 months and spending stops.

## 2. What each decision is worth (free = 10 unless stated; 100 customers, steady state, 6% churn)
**D4 — when the email is asked.** A, door today: click→signup 12.50%, $12.00/signup, 5% pay → CAC **$276**, payback
**2.76mo**, profit **$8,314**. B, after first quote: 6.25%, $24.00, 12% → **$215**, **2.15mo**, **$8,680**. C, at first send: 5.00%,
$30.00, 15% → **$212**, **2.12mo**, **$8,698**. B looks $366/mo better — but B only ties A at 9.35% signup→paid (1.87× the door rate), and A buys 70 more addressable
emails a month at $0 marginal send cost. $366 ÷ (70 × $1,667 LTV) = **0.31%**: three in a thousand dormant emails ever
converting and the door wins. Keep the door. C's $18/mo over B is noise.

**D5 — size of the free tier** (conv 5%), CAC / payback / profit@100: 0 → $240 / 2.40mo / $8,530 · 5 → $258 / 2.58 /
$8,422 · 10 → $276 / 2.76 / $8,314 · 25 → $330 / 3.30 / $7,990 · 50 → $420 / 4.20 / $7,450 · 100 → $600 / 6.00 /
$6,370. Free messages exceed the whole ad cost above **67**; payback breaks 4 months above **44**. 5→10 costs
$18/customer and needs conv 5.00%→5.35% (+0.35pp): buyable. 5→25 needs 6.40%, 5→50 needs 8.14% — unpromisable today.

**D7 — the wall.** Soft (5% conv, 6% churn): CAC $276, LTV $1,667, 6.0x, profit@100 **$8,314**. Hard at zero, if it
lifts conv to 8%: CAC $173, payback 1.72mo — but LTV follows churn. 9% churn → $8,418 (+$104); 12% → $7,900 (−$414);
15% → $7,383 (−$931). **Break-even churn 9.6%.** Upside 1.3% of profit, downside 5–11%, and the soft wall's leakage is genuinely free: a painter sending by hand costs $0.00 of Twilio, forever. The asymmetry says soft.

## 3. The free allowance, costed
Per sign-up: 5 × $0.18 = **$0.90** worst case, all texts (nearer $0.54 on a 60/40 text-email mix — assumption).
Per acquired customer at 5%: **$18.00** — 7.0% of the $258 CAC, 1.1% of LTV, 0.18 of a month's payback.
**Break-even: against no free tier at all (CAC $240, card up front), five free messages pay for themselves only if they
lift signup→paid above 5.375% — a +0.375pp, +7.5% relative lift. Below 5.375% the free tier destroys value.** At ten
messages the bar is **5.75%**. (Slacker readings: the cost exceeds one month's margin only below 0.90% conversion, and
exceeds whole LTV below 0.054%.) The real exposure is not the drag but abuse: 1,000 harvested addresses × 10 free texts
= **$1,800**, near two months of ads at the $1,000 level. Non-negotiable: free texts release only after the emailed
set-up link is clicked, plus a hard per-account and per-day cap at the relay.

## 4. Where I will fight
1. **Targeting: narrow stacks / lookalikes "for quality."** CAC ∝ CPC ÷ conversion, so narrowing pays only if the %
   conversion lift beats the % CPC lift. $1.50→$2.50 (+67%) needs signup→paid 5.0%→8.3%; at $2.50 CAC is $436 and
   payback 4.36mo, past the ceiling. **Max CPC at 5% conv is $2.28.**
2. **Painter: "$99 is too much, make it $49."** Contribution $42.22, LTV $704. Even assuming the cut doubles conversion
   to 10%, LTV:CAC is 5.1x against $99's 5.5x — *worse* — and $20k/mo needs 475 customers instead of 220. Halving the
   price doubles one man's support load to earn less.
3. **Flow: a bigger or time-boxed trial ("50 messages", "30 days unlimited").** 50 free = CAC $420, payback 4.2mo, past
   the ceiling, paying only at 8.14% conversion. "30 days unlimited" is worse than a number — an uncapped liability:
   a painter sending 200 texts in the trial costs $36, four times what he'd cost as a *paying* customer that month.

Change my mind with real signup→paid data; all of it hinges on the 5% guess. The floor: **at $1.50 a click, signup→paid below 3.45% breaks the 4-month payback and spending stops.**
