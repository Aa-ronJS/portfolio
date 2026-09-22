# R3 — the money seat

Working: `scratchpad/model/r3-money.js` (new), `scratchpad/model/r2-money.js`.

## OPEN 1

**(a)**

TARGETER's 3.6 is low but the conclusion is right, and I concede on my own number, not his: to spend $300 at a $10 AU top-of-page CPC I need 30 clicks a month, which at a generous 15% CTR needs 200 intent impressions against the ~60 that exist. Best honest figure is 9–13 clicks, $90–$130 a month — and only by bidding all eight keywords, including the template-downloaders, does it reach $360.
My round-two justification was "it sizes the market for a third of a customer." The keyword planner already sized it for nothing, and 13.5 clicks × 12.5% signup × 40% activation is **0.68 activations a month — 59 months to the 40 activations my own round two says I need before any CAC number means anything.**
A budget I cannot spend on traffic worth buying, measured on a sample that resolves after five years, is not a bounded downside. It is $300 a month of nothing. Withdrawn.

ACCEPT MAJORITY.

## OPEN 2

**(a)**

Conceded in round two and nothing has moved it: the door costs $25 a customer at 0% abandonment and $121 at 40%, and rescuing it needs 1.88–4.84% of dormant addresses to convert with no sender that can exist inside the constraints.
The 4-message fact makes the door worse, not better. Twelve free messages issued at a door to 125 people of whom 37 ever send is now $270 of Twilio liability to buy $81 of actual sending — and each activated painter consumes his whole allowance in three taps, so the free tier is no longer a slow leak, it is spent at once by whoever gets in.
ARCHITECT's network-failure point stands and is answered by keeping the inline `j.link` return, not by keeping the door.

ACCEPT MAJORITY.

## OPEN 3

**(b)**

I funded 15 in round two. The 4-message fact kills my own reason for it: 15 is three jobs plus three stranded messages, and **three cannot buy a fourth job, because a job costs four.** The marginal 3 buy a quote that dies mid-chase — PAINTER's named failure — not a fourth demonstration.
12 is the only number that empties at a job boundary, which is the only clean place to hit the wall, and it is the number the offer screen can say truthfully.
And 12 is elastic upward for exactly the painter who will pay: a quote accepted before day 3 refunds 3, so a man winning work gets 4–6 jobs out of 12. Refusing my own 15 saves $0.54 an activated painter, $4.50 a customer at the agreed 12% gate — trivial either way, which is why the boundary argument decides it, not the cost.

ACCEPT MAJORITY.

## OPEN 4

**(c)**

Reporting choice, as I conceded — the whole spread is $33–$330 of spend in flight. But (c) is the only option that is free today: `qc_joined` is date-only (`signup.js:54`) and `spend()` writes no timestamp (`_setup.js:152`), so day granularity measures a 7-day cohort exactly and a 48-hour steering clock adequately, while **a 24-hour window is not measurable at all** — a 9pm sign-up that sends at 9:40am is 12 hours and reads as day+1.
So the steering clock inside (c) is 48 hours, not 24, and I withdraw the 24 I asked for; it is the one number on this list the system cannot compute.
The code change — an ISO instant in `qc_joined` and a write-once `qc_first_send` in `spend()` — is worth an hour, but only to learn the 24h-to-7d ratio, not to gate on. If a 24h window catches 55% of eventual activators, cost per activation reads $82 instead of $45 and a channel inside my ceiling gets shut off.

ACCEPT MAJORITY.

## OPEN 5

**(a)**

The brief's (d) is arithmetically correct and I confirm it: cost per activation = CAC × rate, so $400 × 12% = **$48**. $60 implies CAC $500, $100 implies CAC $833. Both breach my ceiling at the rate the council agreed on, and neither is a judgement call.
Churn-adjusted, it is worse than the brief says. Recovering CAC out of $100 a month contribution at 6% monthly churn takes 4.12 months at $45, 4.43 at $48, **5.76 at $60 and 11.2 months at $100** — not 8.33, because the customers who were meant to pay it back have left.
**The stop: $45 per activated painter, sustained two weeks, acted on at no fewer than 40 activations (~$1,800 of spend); the 12% gate does not open until 113 activations.** $45 is the only listed figure inside $48, and it leaves $3 of the ceiling for the free tier and the Stripe fee, which is where the rest of it goes.

REFUSE — a $100 stop is not "looser", it is an 11.2-month churn-adjusted payback funded from a one-man business's cash with no credit line and no salvage; 100 customers at that stop is $83,300 out before the first cohort repays, and I will not underwrite it.

## THE 4-MESSAGE FACT

**Cost to serve, re-run at 18c with invoice chases (`invoice_days` [3,10,21] books 4 more per invoice at `app.js:1141`), 1-in-3 won, refunds credited:** 12 quotes/mo = 80 messages booked, 51 delivered, **$11.60** (contribution $87.40); 20 = 133 booked, 85 delivered, **$17.69** ($81.31); 28 = 187 booked, 118 delivered, **$23.77** ($75.23); 34 = 227 booked, 144 delivered, **$28.33** ($70.67). My round-two "$7.88 to serve" was a 5-quote painter at six messages a job and is dead — the real floor is $11.60 and the real top of the agreed band is $28.33, still 71% gross margin.
**Where 150 runs out depends on a thing he cannot predict, and that is the finding.** The meter spends at the tap and refunds later, so the same painter breaches at **22.5 quotes/month on bookings, 35.5 on steady-state net, 25.2 in a month his customers pay slowly, and 15.2 if he wins everything and nobody pays.** He then buys a $35 pack (100 messages, 45.5% margin, $15.93 contribution) and his contribution **rises** — $85.45 at one pack fully used against $69.52 at 150 fully used, $117.31 at the 3-pack cap. The margin never inverts inside the cap.
**Verdict: priced right, sized wrong.** $99 is right at every volume in the band. 150 is wrong because its boundary falls *inside* the agreed 12–34 band and moves unpredictably between 15 and 35 quotes — and packs are only a revenue feature while the bill is never a surprise: at 20% of 100 customers buying one pack that is **+$318.60/month against 1pp of churn at $276/month, so it turns negative at 1.15pp of surprise-driven churn**. The settled opt-in auto top-up with "$105 is the worst month you can have" is not a nicety on a $99 plan, it is the only thing keeping the biggest number in the room on the right side of zero.
