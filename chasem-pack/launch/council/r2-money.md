# R2 — the money seat

Verified facts, unchanged: Stripe 2.2% + 30c; SMS ~18c (estimate, no Twilio AU invoice exists yet).
Everything else is an assumption and is labelled as one. Working: `scratchpad/model/r2-money.js`
(new this round) and `scratchpad/model/money-seat.js` (round one). Constants: contribution
**$100.00/customer/month**, churn 6% → **LTV $1,666.67**, CPC $1.50, door click→signup 12.5%.

Headline: **I lose F3 outright, and I lose it worse than the room thought.** I also lose F7 in a
direction nobody noticed — I am the *loosest* of the four seats, not the tightest. Three concessions,
two partial, two holds.

---

## F1 — Who is the primary target — **CONCEDE (on volume), DEFEND (on the abandoner)**

**Conceded to PAINTER and ARCHITECT on quote volume.** My R1 said 5–15 quotes a month. That was
wrong, and it was wrong for a reason I can price: I assumed a heavier painter would eat the 150
included messages and destroy the margin. He does not. Working, at ~6 messages per job (quote + up to
3 nudges, deposit invoice, one overdue nudge):

| quotes/mo | messages | packs bought | revenue | cost | **contribution** |
|---|---|---|---|---|---|
| 5 | 30 | 0 | $99.00 | $7.88 | **$91.12** |
| 12 | 72 | 0 | $99.00 | $15.44 | **$83.56** |
| 20 | 120 | 0 | $99.00 | $24.08 | **$74.92** |
| 34 (8/wk) | 204 | 1 | $134.00 | $40.27 | **$93.73** |

The dip is in the middle, not at the top. A pack is $35 for 100 messages = 35c each against an 18c
cost: contribution **$15.93 per pack, 46% margin**. The moment a painter crosses 150 he starts
*adding* contribution again. Even at the 3-pack cap — 450 messages, $204 revenue — contribution is
$117.31. **The margin never inverts inside the cap.** So the cap is there to protect him from a $105
surprise (PAINTER's point, which I take), not to protect me. My volume objection is withdrawn:
primary is **3–8 quotes a week**.

**Held against TARGETER's ServiceM8/Tradify abandoner as the *primary persona*.** Not on feeling — on
a priced bet. PAINTER's claim is that the man already paying for a trade app is the churn. If the
abandoner churns 3pp worse (6% → 9%), LTV drops from $1,667 to $1,111, **−33%**. The full table:

| his churn | LTV | CAC he must come in at, relative to the notepad man |
|---|---|---|
| 8% | $1,250 | 25% cheaper |
| 9% | $1,111 | **33% cheaper** |
| 12% | $833 | 50% cheaper |

So: **the abandoner is worth buying as a primary only if his CAC lands at least 33% below the notepad
man's for every 3pp of extra churn he brings.** That is a falsifiable, 90-day question and it is
exactly what a Search keyword set measures for $300. He belongs in the *keywords*, not in the
*persona*. Settled position: primary = the notepad domestic repainter, 3–8 quotes a week; the
abandoner is a keyword line item with a CAC threshold on it.

---

## F2 — Channel and hook — **CONCEDE (partially, to TARGETER)**

**Conceded: TARGETER gets a Search budget from day one.** My R1 said Meta only. The sentence that
moved me was "This is the only place I can *buy* the abandoner directly" — because Search is the only
channel whose cost I can compare against a *known* alternative rather than a guess. Here is the
break-even I should have run in R1 and didn't:

If Search CPC is $4.00 against Meta's $1.50 — **2.67×** — Search wins if its click→activation rate is
more than **2.67×** Meta's. On traffic that typed "quoting app for painters" that is a plausible bar,
not a heroic one. And the test is cheap: **$10/day, $300 over 30 days**, which is 0.3 of one customer
at a $276 CAC. The downside is bounded at $300 and the upside is a permanently cheaper channel.

**Held: the first dollar of *scale* still goes to Meta**, because Search AU volume for this keyword
set is almost certainly too thin to absorb $1,000/month — and TARGETER named his own kill test
(under ~200 impressions/week at top-of-page bids). Search is a $300/month always-on capture layer
*and* the instrument that sizes the intent market. Meta is the only channel that can take budget.

**Hook — mechanism leads, and here is the money reason, which is new.** PAINTER's pain line
("fourteen grand out and you hate ringing about it") is higher-arousal and will pull cheaper clicks —
from everyone in Australia with unpaid invoices, including the new-build subcontractors TARGETER
wants to exclude, who have unpaid *progress claims* and can never buy this product. Meta's optimiser
then learns toward them. That is an adverse-selection cost paid at $1.50 a click with a **0%**
conversion rate at the other end. The A4 sheet in frame one is the only exclusion filter that exists.
So: **mechanism in the first three seconds (it does the targeting), pain in the caption (it does the
persuading).** That is a division of labour between visual and text, not a compromise.

---

## F3 — When the email is asked for — **CONCEDE. Fully. My R1 arithmetic was wrong.**

I was asked to model what a door costs in painters who never get through it. I did. It costs more
than I claimed, and it costs something even at zero abandonment — which is the part I missed entirely.

**The model.** Per 1,000 clicks = $1,500 of spend.
- Let `a` = the share of clickers who would have engaged with the app but refuse a cold email gate
  (the 20–40% the room put to me).
- Let `m` = how well those gate-refusers convert *relative* to gate-passers, once let in. `m=1` says
  they are the same people; `m=0.5` says they are half as good. I will run both, and `m=0.5` is the
  door-favourable case.
- The would-have-engaged pool is `P = 125 / (1 − a)`, because the door's observed 12.5% is what
  survives the gate.
- Under B (email at first Send), free messages issue **only to painters who actually send**. Under A
  they issue to every door-passer, of whom ~30% ever activate.
- Paid customers scale as `paid_B / paid_A = 1 + a·m/(1 − a)`.

**The re-run, per 1,000 clicks. A (door) = 125 signups, 6.25 paid, $225 of free tier, CAC $276.**

| abandonment `a` | `m` | pool | signups_B | free-tier_B | paid_B | **CAC_B** | vs door | dormant-email conv the door needs to win |
|---|---|---|---|---|---|---|---|---|
| **0%** | — | 125.0 | 37.5 | $68 | 6.25 | **$251** | −$25 | 0.11% |
| 10% | 1.0 | 138.9 | 41.7 | $75 | 6.94 | **$227** | −$49 | 0.90% |
| 10% | 0.5 | 138.9 | 41.7 | $75 | 6.60 | **$239** | −$37 | 0.50% |
| **20%** | 1.0 | 156.3 | 46.9 | $84 | 7.81 | **$203** | −$73 | **1.88%** |
| **20%** | 0.5 | 156.3 | 46.9 | $84 | 7.03 | **$225** | −$51 | **0.99%** |
| **30%** | 1.0 | 178.6 | 53.6 | $96 | 8.93 | **$179** | −$97 | **3.15%** |
| **30%** | 0.5 | 178.6 | 53.6 | $96 | 7.59 | **$210** | −$66 | **1.62%** |
| **40%** | 1.0 | 208.3 | 62.5 | $113 | 10.42 | **$155** | −$121 | **4.84%** |
| **40%** | 0.5 | 208.3 | 62.5 | $113 | 8.33 | **$194** | −$83 | **2.46%** |

**Three things fall out, and each of them is worse for me than the last.**

**1. The door loses at every abandonment rate, including zero.** At `a = 0%` — nobody abandons at all,
the most generous reading of my own position — the door still costs **$25 per customer**. Why: it
hands 10 free messages to 125 people of whom only 37.5 ever send one. $225 of Twilio liability issued
to buy $68 of actual sending. I never modelled that in R1 because I treated the free tier as a cost
per *signup* without asking who the signups were. Gating free messages behind a real Send is a $157
saving per 1,000 clicks before a single painter is rescued from the door.

**2. My "0.31% of dormant emails" figure was the wrong calculation, by 3× to 15×.** The true bar is
**1.88% at 20% abandonment, 3.15% at 30%, 4.84% at 40%** (and 0.99% / 1.62% / 2.46% on the
door-favourable `m=0.5`). My R1 built the deficit from a steady-state profit difference at 100
customers and then divided by an email count from a *different* construction. It omitted the
abandoned pool entirely — which is precisely the thing FIGHTS.md told me I had assumed was free.

**3. There is no mechanism that could clear a 1.88% dormant-email conversion rate.** This is what
kills it. There is no server, no ESP, no sequence, no segmentation, one man who refuses to sell, and
ACL forbids the scarcity and earnings copy that a reactivation campaign would normally lean on. The
tool available is one Stripe-triggered email saying "still there?". PAINTER's sentence is the one
that did it: **"Then you own a list of email addresses belonging to people who never made a quote."**
That list is dormant *by construction* — it is the people the app never showed anything to. I priced
it as if it were a warm list. It is not a list, it is a bounce rate.

**The abandonment rate at which the door stops winning: there isn't one.** At `m=1, d=0` the door
loses at 0%. Under the single most door-favourable set of assumptions I can defend with a straight
face — refusers convert at half the rate (`m=0.5`) *and* a dormant re-engagement campaign that
genuinely lands 1.0% — the door breaks even at **a ≈ 20%**, which is the *floor* of the empirical
range the room handed me. It loses across 100% of the plausible range above that.

**So: I concede F3 to ARCHITECT, PAINTER and TARGETER. The email moves to the first Send.** ARCHITECT
named the mechanism ("An email captured before value is a bounced address with a nurture sequence
attached"); PAINTER named the number that broke my arithmetic. Three conditions I still require, all
of them cheap:

- **The Stripe customer must still be minted at that Send**, because it is the entire database and it
  carries the message counter. This is not negotiable and ARCHITECT's screen-3 flow already does it.
- **Abuse exposure improves and I want that banked.** My R1 worst case was 1,000 harvested addresses
  × 10 free texts = $1,800. Behind a Send gate a harvester must build a quote per account by hand, so
  the attack stops paying. At 15 messages the hard cap is **$2.70 per account, $2,700 per 1,000
  accounts**, and it is now bounded by human effort, not by a form field.
- **A signup is redefined the day this ships.** "Signup" now means an activated painter. Every rate in
  every prior document (5% signup→paid) is against the old denominator and must be restated, or the
  gate in F7 will fire on the wrong number.

**Test that would reverse me** (I do not expect it to, but it is the honest 30-day test): 50/50 split
on live traffic, single metric **paid customers per $1,000 of ad spend**, not signups and not clicks.
Secondary read: free-tier dollars issued per paid customer. Door has to win by more than the CI
width, which at these volumes it will not resolve inside 30 days — see F7 — so the real decision rule
for 30 days is the *leading* one: **activated painters per $1,000**, where the table above predicts
B ahead by 25% at a=20% and 67% at a=40%. If B is not ahead on activations at day 30, I reopen this.

---

## F4 — The free allowance — **CONCEDE (to ARCHITECT on the number, to PAINTER on the unit)**

Costing every proposal. 18c a text, worst case all-SMS; the 60/40 text/email column is the realistic
one and is an assumption.

| free msgs | $/signup (all text) | $/signup (60/40) | $/customer @5% (old door denominator) | **$/customer @20% (send-gate)** |
|---|---|---|---|---|
| 5 | $0.90 | $0.54 | $18.00 | **$4.50** |
| 10 (my R1) | $1.80 | $1.08 | $36.00 | **$9.00** |
| 12 (PAINTER) | $2.16 | $1.30 | $43.20 | **$10.80** |
| 15 (ARCHITECT) | $2.70 | $1.62 | $54.00 | **$13.50** |
| 25 | $4.50 | $2.70 | $90.00 | **$22.50** |

**Conceding F3 makes this argument almost free, and that is the new matter.** My R1 bar — "five free
messages only pay for themselves above 5.375% signup-to-paid" — was computed against a denominator
where 95% of recipients never send anything. Once messages issue only to painters who have built a
PDF and pressed Send, the denominator is 5× hotter and every marginal message is 4× cheaper per
acquired customer.

**What each step must buy to pay for itself, at 20% activated→paid:**
- **12 → 15**: +$0.54 per activated signup, **+$2.70 per customer**. Pays if activated→paid moves from
  20.000% to **20.032%**. That is a rounding error against a $1,667 LTV.
- **5 → 15**: +$1.80 per activated signup, **+$9.00 per customer**. Pays at **20.108%**.

So **I will fund 15**, ARCHITECT's number. I am not funding it because I believe his conversion story
— I have no evidence for it — but because the downside is $2.70 and the upside is a $1,667 customer,
and at 12 messages a fully-quiet chasem cycle (send + 3 nudges = 4) times three jobs lands
exactly on the line with nothing spare. Three messages of slack costs less than one Stripe fee.

**Where I stop, and why the cap is real.** At 15 the hard-capped liability is $2.70 per account and
$2,700 per 1,000 accounts — about 2.7 months of a $1,000 ad budget, and that is the most I will
underwrite. ARCHITECT's and PAINTER's logic ("+3 more only costs 54c") extends to 100 messages and I
refuse it there, so I must say where it stops: **15, hard, metered at the relay, with a per-account
and per-day cap.** Anything described as "unlimited for 30 days" is refused on a number: 8 quotes a
week × 4 messages = **139 messages a month = $24.94**, a quarter of a paying customer's whole
contribution, given away, with no ceiling.

**What the 30-day expiry actually saves: $1.35 per acquired customer. Nothing.** Working: assume 25%
of activated painters are slow enough that expiry claws anything back, and that they leave ~6 messages
unused. Saving = 0.25 × 6 × $0.18 = **$0.27 per activated signup** = $1.35 per customer at 20% =
**0.081% of LTV**. Against that, a hard wipe generates support email: at 500 free accounts, if 5%
write in asking where their messages went, that is 25 emails and roughly 4 hours of the one man's
week — and support volume is the real ceiling on this business, as I said in R1. **Expiry does not pay
for itself on cost.** If ARCHITECT wants it, he must win it on conversion, not on money, and I will
fund it only as a **prompt at day 30** ("it's been a month — you've still got 9"), never as a
confiscation. A confiscation is also the shape of thing ACL requires to be disclosed at sign-up, which
is a sentence on the door I would rather not spend.

**The unit: conceded to PAINTER.** "A message" is not a unit a painter counts, and he is right that
the number has to mean something on screen. Resolution: **meter in messages** (that is what Twilio
bills and what the relay counts — I will not give that up) and **display in jobs**: "2 of your first
3 jobs left, chased to the end", with the message count in small type underneath so the paywall
arithmetic is honest under ACL and so he is never surprised.

**Answer: 15 messages, hard cap, metered in messages, shown as three jobs, no expiry — a day-30
prompt instead.**

---

## F5 — How fast activation must happen — **CONCEDE: the window is a reporting choice, not an economic one**

I was asked to name the spending decision that changes at each window, in dollars, or concede. I
concede: **no spending decision changes.** CAC per activated painter does not depend on the window —
it depends on how many eventually activate. The window changes only *when I find out*.

What it is worth, precisely: the window is the share of a cohort that is unresolved when I look.

| window | unresolved share of a 7-day cohort | spend in flight @ $1,000/mo | @ $3,300/mo |
|---|---|---|---|
| 10 min | ~0% | ~$0 | ~$1 |
| **24 h** | 14% | $33 | $110 |
| 48 h | 29% | $67 | $220 |
| 72 h | 43% | $100 | $330 |

At the budgets this business will actually run, the whole spread between ARCHITECT's 10 minutes and
TARGETER's 72 hours is **$100 to $330 of spend in flight**. That is a third of one customer. It is not
an economic decision and I should not have stated it as one in R1.

Two things I will still say, because they are free:

**ARCHITECT's 10 minutes contradicts his own channel.** The ad is Meta Reels, and the scroll happens
at 7pm on the couch — TARGETER's and PAINTER's scenario both. A painter on a couch cannot send a real
quote to a real customer in 10 minutes, because he is not standing in the room he is quoting. A
10-minute window does not measure activation, it measures who happened to be on site when the ad
served. It is a fine *leading* indicator; it is a bad *gate*, and it would shut off a channel that
works.

**Recommendation, stated as the reporting convention it is:** steer weekly on **activation inside
24 hours** (fast enough to act on, long enough to catch the man who quotes the next morning); gate
monthly on **activation inside 7 days** for cohort truth. Two numbers, and nobody has to win.

---

## F6 — Where the paywall appears — **DEFEND, with a new cost, and a concession on the words**

**Conceded on the words to PAINTER and ARCHITECT.** A wall with the customer's name and the actual
written nudge on screen beats a generic balance message, and it costs $0.00 to build. PAINTER's
*"Tuesday 9am this goes to Sharon: [the message]"* is the version I will fund.

**Held: the wall itself stays soft, at zero.** New matter, because "I still think soft" is not a
defence: I will cost the thing nobody costed, which is **the annoyance of an early ask**.

The offer and the wall are different events and TARGETER has the structure right. Showing the offer
early costs no Twilio and no Stripe — it is a screen. Its only cost is churn-by-annoyance. So price
that: **1pp of churn is worth $276/month at 100 customers** (money-seat.js, R1 §D9). The entire free
tier for that same cohort, at 15 messages and 20% conversion, is $13.50 × 100 = **$1,350 once**. One
percentage point of permanent churn costs more every month than the whole free allowance costs ever.

That gives the constraint, and it is new and it is costed: **the offer may appear, it must be
dismissible, and it may not appear more than twice before zero.** A third ask is not worth 1pp of a
risk I cannot measure at zero customers.

And the asymmetry from R1 still stands unrefuted: the soft wall's leakage is genuinely free — a
painter tapping Send himself costs **$0.00 of Twilio, forever** — while a hard wall's upside is 1.3%
of profit and its downside is 5–11%, with **break-even churn at 9.6%**. Nobody attacked that
calculation, so it stands.

**Settled shape:** offer card when a nudge is scheduled with a real customer's name on it (PAINTER's
and ARCHITECT's moment, and their wording); offer card again at the first acceptance (TARGETER's
moment, because it is the highest-intent instant in the product); **soft wall at zero**, work never
blocked.

---

## F7 — The number that decides more ad spend — **CONCEDE. I am the loosest seat in the room.**

All four proposals in one currency, CAC in dollars, against LTV $1,667:

| seat | as stated | **CAC** | payback | LTV:CAC |
|---|---|---|---|---|
| PAINTER | $30/activation, **no conversion gate** | $150 @20% · $250 @12% · **$600 @5%** | 1.5 / 2.5 / **6.0 mo** | 11.1x / 6.7x / **2.8x** |
| TARGETER | $45/activation, gate ≥20% | **$225** | 2.25 mo | 7.4x |
| ARCHITECT | $45/activation, gate ≥12% | **$375** | 3.75 mo | 4.4x |
| MONEY (me) | payback ≤ 4 months | **$400** | 4.00 mo | 4.2x |

**Ranked tightest to loosest: PAINTER, TARGETER, ARCHITECT, MONEY.** I am last. Three seats are
proposing to stop spending *earlier* than the money seat would. I did not expect that and it changes
my position.

**PAINTER's $30 is not a CAC and cannot be used as one.** Without a conversion gate it is half a
fraction: at 20% activated→paid it is a $150 CAC and superb; at 5% it is **$600, a six-month payback,
and it fails every seat's test including PAINTER's own intent**. The number cannot decide anything on
its own. The gate is not optional decoration — it is the denominator.

**TARGETER's 20% gate would shut off profitable spend, and that is the decisive argument.** At
$45/activation, 12% gives a **$375 CAC, a 3.75-month payback and 4.4x LTV:CAC**. That is inside my
ceiling and it is a business worth running. TARGETER's gate stops the spend there anyway. **A gate
should fire where money is lost, not where money is merely less good.** 20% is a guess with no
evidence behind it and it costs real growth if the truth is 14%.

**So I concede the structure to ARCHITECT and fold my ceiling into it.** His $45-with-a-12%-gate is
my $400 expressed in an observable that arrives **weeks earlier** — and his is $375, comfortably
inside my line, so I lose nothing by adopting it. Settled:

> **Cost per activated painter ≤ $45, steered weekly. Gated monthly by activated→paid ≥ 12%. Hard
> stop if trailing CAC exceeds $400.**

### How many paid conversions before the number is trustworthy — the actual statistics

A conversion count is Poisson; the relative standard error of a rate estimated from `k` successes is
`1/√k`, and the 95% interval comes from the exact chi-square bounds.

| paid conversions `k` | relative SE | 95% CI on the rate | upper bound on CAC from a $276 point estimate |
|---|---|---|---|
| 10 | 31.6% | ×0.48 – ×1.84 | $577 |
| 20 | 22.4% | ×0.61 – ×1.54 | $452 |
| 25 | 20.0% | ×0.65 – ×1.48 | $427 |
| 30 | 18.3% | ×0.67 – ×1.43 | $409 |
| **40** | **15.8%** | **×0.71 – ×1.36** | **$386** |
| 60 | 12.9% | ×0.76 – ×1.29 | $362 |
| 100 | 10.0% | ×0.81 – ×1.22 | $339 |

The decision I need is "is CAC under $400 when the estimate is $276?" — that needs the upper bound to
stay inside **1.45×**. It does at **k = 40** (×1.36) and not at k = 25 (×1.48).

**So: 40 paid conversions before the CAC number means anything.** At a $276 CAC that is **$11,040 of
spend — about eleven months at $1,000/month.** Which is why TARGETER is right and I was wrong in R1:
*the paid-conversion rate is too slow to steer on.* Forty activations at $45 is **$1,800**, under two
months. That is the steerable number, and it is why the weekly metric must be cost-per-activation.

**The gate needs its own sample and it is bigger than anyone said.** To have the 95% interval on
activated→paid exclude 6% when the true rate is 12%: `n > p(1−p)/SE²` with `SE = 0.06/1.96` gives
**113 activations (~14 paid conversions)** — about **$5,085** at $45 an activation. Below 113
activations the 12% gate is not measuring anything and must not be allowed to fire. **Rule: weekly
steering from 40 activations; the monthly gate does not open until 113.**

---

## D8, costed: removing trading name, ABN and licence from checkout

Confirmed in the code, so this is a change, not a plan: `chasem-landing/public/config.js:21`
documents the Payment Link collecting "custom TEXT fields keyed trading_name, abn, licence", and
`api/_setup.js:32–37` reads all three back off the Stripe session. The comment at `api/_setup.js:27`
already says these "are his to type in the app, once" — the code and its own comment disagree.

**Does removing three fields lift completion?** I have no verified figure and I will not invent one.
What I can give is what the lift must be worth. At CAC $276:

| relative completion lift | CAC becomes | saved per customer | per 100 customers |
|---|---|---|---|
| +2% | $271 | $5.41 | $541 |
| +3% | $268 | $8.04 | $804 |
| +5% | $263 | $13.14 | $1,314 |
| +10% | $251 | $25.09 | $2,509 |

**The cost of removing them is zero**, so any lift above 0% is funded. That is the whole decision and
it does not need a benchmark. Three free-text fields on a mobile checkout, typed with paint on his
hands, after the card — the only question is how much it helps, not whether.

**Is there any revenue reason to keep them? I checked the three that exist and all three fail.**

1. **Tax.** An ABN on the Stripe customer would matter if we had to issue a compliant tax invoice
   naming the recipient. Under ATO rules the recipient's identity or ABN is required only on invoices
   of **$1,000 or more**. A $99 or $149 subscription is not. **No revenue reason.**
2. **Segmentation.** Trading name would let someone segment the list. There is no server, no CRM, and
   one man who refuses to do sales. The email plus the Stripe customer already carries everything he
   can act on. **No revenue reason.**
3. **Fraud and chargebacks.** Stripe Radar scores card, device and behavioural signals. A self-typed
   trading name and an unverified licence number are worth nothing as chargeback evidence — anyone
   disputing a charge typed them himself. **No revenue reason.**

**And there is a cost to keeping them that nobody has raised: they create a second, conflicting copy.**
The app already holds business name, ABN and licence and prints them on the PDF. Stripe now holds a
different set typed at a different moment. When they disagree, the licence number on a quote does not
match the licence number on file — which is a support email at best, and under ACL a licensing
representation that cannot be backed at worst. **Remove all three. Positive expected value, zero cost,
and a compliance reason to remove them even if the conversion lift were exactly nil.**

---

## MY ANSWERS NOW — D1 to D10

- **D1** The notepad domestic repainter, solo or plus one, **3–8 quotes a week**, capital city, licensed state — I withdraw my 5–15/month floor: the pack sells at 46% margin so volume adds contribution, it never breaks it.
- **D2** Meta Reels/feed takes the first scale dollar, plus **$300/month of Google Search** from day one (only buyable intent, and it sizes the market for the price of one-third of a customer); **A4 mechanism in the first three seconds** because it is the only exclusion filter that exists, pain in the caption.
- **D3** Keep the one-screen page for the ACL disclosures, split-test phone traffic straight into the app — already agreed, decided on **$ per activated painter**, not per click.
- **D4** **At the first Send, not at the door — conceded.** The door loses at every abandonment rate including zero (it costs $25/customer even at 0%, $73 at 20%, $121 at 40%), and rescuing it needs 1.88–4.84% of dormant emails to convert with no mechanism capable of 1%.
- **D5** **15 messages**, hard cap, metered in messages at the relay, shown to him as **"your first three jobs, chased to the end"**; no expiry, a day-30 prompt instead — expiry saves $1.35 a customer and costs support hours.
- **D6** One real quote PDF sent to a real customer from the app; **24 hours as the weekly steering window, 7 days as the cohort truth** — the window is a reporting choice worth $33–$330 of spend in flight, not an economic one.
- **D7** Offer card at the scheduled nudge with the customer's name and the written message on screen, offer again at the first acceptance, **soft wall at zero**; dismissible, and never more than twice before zero, because 1pp of churn costs $276/month against a $1,350 free tier.
- **D8** Zero typed characters, under 20 seconds, back on the job — and **drop trading_name, ABN and licence from the Payment Link**: no tax, segmentation or fraud reason survives, and a second conflicting licence number is an ACL exposure.
- **D9** A plain count of his own results on Home plus the balance line on Follow-ups, auto top-up opt-in only with "$105 is the worst month you can have" on the same screen — churn is still the biggest lever we own at $276/month per point.
- **D10** **Cost per activated painter ≤ $45, gated monthly by activated→paid ≥ 12%, hard stop above $400 CAC.** Steer weekly from 40 activations ($1,800); the gate does not open until 113 activations (~14 paid, $5,085); the CAC figure itself is untrustworthy below **40 paid conversions** — ×1.36 at 95%, versus the ×1.45 the decision needs.
