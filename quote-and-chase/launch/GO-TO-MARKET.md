# Who this is for, how he is reached, and what he pays

Settled by a four-seat council over three rounds. Every seat had to concede in writing or defend with new
matter. Rounds one and two are the argument; round three closed the five points still open. The five closing
votes were unanimous, which is worth saying plainly: nobody was outvoted into this.

---

## D1 — the painter

The licensed domestic repainter who quotes homeowners himself. One man, or one man plus a hand. Capital city.
**Three to eight quotes a week in season**, one to three through the winter wet — about twenty a month averaged
over a year. He writes quotes on a notepad or in his phone's notes app and has never paid for trade software.

Explicitly not the target:

- the new-build subcontractor to a volume builder — he never quotes a homeowner, so nothing here helps him
- a crew of four or more with a bookkeeper — she already has a system and he is not the one choosing it
- **the ServiceM8 or Tradify abandoner**, who is the interesting case and was argued for two rounds

The abandoner is the sharper *ad target*, because he has already had the kitchen-table conversation about a
monthly software bill and proved he will pay. He is also the worse *customer*: he arrives with a yardstick, asks
for scheduling, timesheets and Xero in week one, and churns harder. At three percentage points of extra churn he
is worth about a third less over his life, so he only breaks even if he arrives a third cheaper. He belongs in
the keyword set with his own cost ceiling, not in the persona. **Build every word for the notepad man.**

One line goes on the landing page for him, before he has to ask: *this is not a job-management app.*

## D2 — channel and hook

**Meta only. Reels and Feed, Australia, broad targeting. Google Search gets zero dollars until 100 painters are
paying.**

This was the longest fight and it ended on inventory. Across the whole Australian keyword set there are roughly
300 exact-match searches a month and about 60 with real buying intent. The honest ceiling is nine to thirteen
clicks a month — about $90 to $130 of spend that *can physically be bought*, not the $300 that was proposed.
That yields well under one activation a month, so it would take years to reach the forty activations the
council's own rule requires before the number may be read at all. Search is not too expensive. There is nothing
there to buy. And the only terms that do carry volume are competitor brand terms, which buy the abandoner the
persona just excluded, at $8-15 a click.

There is no keyword for a man with a notepad. He is not looking for us.

**The creative:** one 22-second phone-shot 9:16 take. First frame, and it owns the first three seconds, is a
hand taping an A4 sheet onto a wall. The mechanism is the visual, because it is also the only exclusion filter
available — a new-build subbie does not stop for a hallway repaint.

The money pain goes in the caption, never the picture, and carries no dollar figure. Pain-led visuals are the
most crowded three seconds in an Australian tradesman's feed — debt collection, invoice factoring, get-paid-
faster fintech — and he has a callus on it. A "fourteen grand" figure is also an implied claim the ACL will not
let us back with zero customers.

## D3 — the landing page

Keep it, one screen. It exists to carry what an ad cannot: the looping A4 demo, a real sample PDF, the ~6 cm
accuracy figure, the price, and the guarantee. Split-test sending phone traffic straight into the app. Decide it
on **cost per activated painter**, never cost per click.

## D4 — when the email is asked for

**At the Send button on his first real quote, once a priced PDF exists. Never at the door.**

All four seats now agree, and two of them changed sides to get here. The door was defended for two rounds on
arithmetic and the arithmetic turned out to be wrong. Modelled per thousand clicks, the door loses at *every*
abandonment rate including zero, because free messages issue to everyone who gets through it while only about a
third ever send anything. Rescuing it needs between 1.9% and 4.8% of dormant addresses to convert later — and
there is no mechanism that could: no server, no mailing tool, one man, and a standing rule of no sales work
ever. An email nobody will ever send converts at zero, not at a small number.

It is also the better abuse gate. To harvest free messages a scraper must now build a priced quote with a real
client name on it.

Where exactly: on the "who's this quote for" screen, beside his own name, before he taps Send and after he has
seen his own price on the page.

## D5 — the free allowance

**Twelve messages. No expiry.** Metered in messages, shown to him as jobs: *"your first three jobs, quoted and
chased to the end."*

Twelve is not a compromise between ten and fifteen. It is the only number that empties on a job boundary, because
a job costs exactly four messages (see below). Ten is two jobs and a stump, and he runs out mid-chase on job
three — the precise failure the painter's seat named. Fifteen is three jobs and three stranded messages that
cannot buy a fourth.

No expiry, and both seats that proposed one withdrew it. Painting is weather: a June sign-up may not quote for
three weeks, and an expiry punishes rain. It also breaks the product — a quote sent on day 28 books nudges for
days 31, 35 and 42, and every one of them dies silently at the relay.

He gets warned one message early, by the customer's name, not by a number.

## D6 — activation

One real quote PDF, sent from the app through the relay, to a customer who is not him.

**Two clocks.** Seven days from sign-up is the cohort truth, because his diary belongs to a stranger — he sees
the ad at 8pm on the couch and his next quote is Thursday at 10:15 in someone's hallway. A short window for
weekly steering sits on top of it.

Ten minutes stays as a design constraint on session one — first open to a priced room on screen — not as a
metric, because it is not measurable today.

A measurement note that has to be fixed before either clock reads: `api/signup.js:54` stamps `qc_joined` as a
**date**, and `spend()` writes no timestamp at all. Until that is an ISO instant plus a write-once
`qc_first_send`, nothing finer than a day can be read, so steer on 48 hours. It is about an hour of work and it
is worth doing — a 24-hour window that only catches half the activators reports $82 an activation where the
truth is $45, and kills a channel that was inside the ceiling.

## D7 — where the offer appears

**At the second nudge on a live job**, on the Follow-ups tab, with the customer's name and the written message on
screen. At the first nudge he is nervous — nobody has ever sent anything under his name before. By the second he
has watched one go out and nothing bad happened.

Optionally again at the first acceptance, guarded so that a "your chasing did that" line only renders when a
nudge actually preceded the acceptance. Without that guard it is an unbacked claim.

At most twice before zero, and dismissible both times. One percentage point of churn costs about $276 a month at
100 customers, against a free tier worth about $1,350 for the same cohort — nagging is more expensive than
giving messages away.

**The wall at zero stays soft, forever.** The app keeps writing every message and he taps Send himself, free.

The words, as they appear on the phone:

> Sharon hasn't come back on the Thomson quote. Second nudge is due Tuesday 9am. This is what it says:
> [the message].
>
> You can send that yourself. Tap Send and it goes from your phone. That stays free, whether you pay us or not.
>
> Or it goes Tuesday morning without you, and so do the next 150 messages a month, for $99. A job usually takes
> three or four messages. Cancel from this screen. Two taps, no notice period, no one to ring.

Two equal buttons: **Send it myself** / **Let it send**. "No one to ring" answers the direct-debit fear and stays.

## D8 — from tapping pay to back at work

He types a card number and nothing else, and lands back on the job he was chasing. Under twenty seconds, zero
typed characters beyond the card.

Done: the Payment Links no longer collect trading name, ABN or licence. He has already typed those into the app,
and a second conflicting licence number against the one printed on his PDF is a support liability and an ACL
exposure. No tax reason survives either — a recipient ABN only matters at $1,000 and over.

## D9 — the first thirty days

Nothing that needs a human, because there is no human.

A plain count of his own results on Home, not behind a card: *"Since 3 March: 14 quotes out, 6 accepted, $31,400
in, 9 nudges sent for you."* The balance line on Follow-ups so the month is never a surprise. A weekly one-tap
"Has this one paid?" list, because chasing a man who has already paid is the one way this makes him look silly.
The back-up nag. Auto top-up **opt-in only**, with *"At most three packs, $35 each — $105 is the worst month you
can have"* printed on the same screen as the switch.

## D10 — the number that decides more ad spend

**Cost per activated painter. Target $30. Stop at $45 sustained for two weeks. Act on nothing before 40
activations.**

Gated monthly by activated-to-paid at or above 12%, which cannot be read until about 113 activations.

$45 is not a preference, it is the ceiling. At the 12% gate everyone agreed to, a $400 CAC ceiling is $48 an
activation. The $60 and $100 figures argued in round two imply $500 and $833 and both breach it; churn-adjusted
payback at $100 an activation is 11.2 months against a four-month rule. Two seats withdrew their numbers on that
arithmetic.

One statistical warning that matters more than it sounds: at 40 activations the 95% interval on a 12% rate runs
from about 5.5% to 26%. Twelve per cent and twenty per cent are **indistinguishable** at that sample size, and
separating them takes around 150 activations and roughly $6,750 of spend. Judge cost per activation weekly.
Do not pretend to judge conversion rate early.

---

## The thing that changed the product: a quote costs four messages, not one

Verified in the code, not assumed:

- `quote-and-chase-app/app.js:1140` books the day-3, day-7 and day-14 nudges in the same tap as the send.
- `quote-and-chase-landing/api/msg.js:184-188` — `action: "schedule"` spends a message when the reminder is
  **booked**, not when it goes. It is given back on cancel (`msg.js:192`), and accepting a quote cancels the rest
  (`app.js:912`), so a quote that lands early nets back to one or two.
- An invoice behaves the same way: four more per invoice, on days 3, 10 and 21 past due.

Everything downstream moves:

| Quotes a month | Messages booked | Delivered | Cost to serve | Contribution on $99 |
|---|---|---|---|---|
| 12 | 80 | 51 | $11.60 | $87.40 |
| 20 | 133 | 85 | $17.69 | $81.31 |
| 28 | 187 | 118 | $23.77 | $75.23 |
| 34 | 227 | 144 | $28.33 | $70.67 |

The old "$7.88 to serve" base case is dead; the real floor is $11.60.

**The verdict is priced right, sized wrong.** $99 is correct at every volume in the band. The 150 boundary is
not: it runs out somewhere between 22 and 35 quotes a month depending on how fast his customers pay, and the
agreed band is 12 to 34. A painter at the top of his own season crosses it.

Packs do not rescue this. At 20% of 100 customers buying one pack that is +$319 a month, against 1pp of churn at
$276 — it goes negative at 1.15pp of surprise-driven churn. A knife edge, not a win. And the surprise is the
churn driver: he does not cancel over $35, he cancels because he decided the price is "$99 plus whatever they
feel like."

### Three things to fix before taking money

1. **Book nudge one at Send and let nudges two and three arrive on their own dates.** The machinery already
   exists — `local_queue`, `withinWindow` and `retryLocalQueue` already defer anything outside the sender's
   window. This drops the honest cost of a job to about 2.5-3 messages and makes 150 worth roughly 50 jobs
   instead of 30, which puts the whole agreed band inside the plan without touching the price.
2. **Say the size in jobs, before he pays.** The page currently says "One message is one text or one email the
   app sends for you," which is true and still leaves him to discover that switching chasing on books three at
   once. Under Australian Consumer Law the omission is the problem, not the sentence.
3. **The allowance edge fails partway through a job.** `msg.js:173` and `msg.js:184` check the balance
   separately per call, so with one message left the quote goes out and the three nudges come back 402. The app
   does say so out loud ("3 follow-ups could not be scheduled") rather than failing silently, but a job should
   not be able to half-send.

## What was considered and rejected

- **Google Search first** — no inventory; nine to thirteen buyable clicks a month nationally.
- **The email door** — loses at every abandonment rate including zero.
- **A 30-day expiry on the free messages** — saves about $1.35 a customer, costs support hours, and kills nudges
  booked near the boundary.
- **The paywall at the win** — he is ringing her back and working out paint, not reading his phone; and painters
  do not mark things, so it never fires for a large share of them.
- **Targeting the ServiceM8 abandoner as the persona** — cheaper to reach, a third less valuable, and he pulls
  the roadmap toward a job-management app.
