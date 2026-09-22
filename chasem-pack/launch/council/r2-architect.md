# R2 — The Flow Architect

Before the fights, one code-verified fact that moves four of them, and that nobody in round one had.

**A quote sent with chasing on commits FOUR messages at the instant of Send, not one.**
`scheduleFollowUps` (app.js:1140) maps `fu.quote_days` = `[3, 7, 14]` into three `schedule` items and hands
them to `QCMsg.scheduleAll` in one go. At the relay, `api/msg.js` spends a message on `action: "schedule"`
(the counter moves at schedule time; `cancelAll` refunds with `spend(p, -1)` when a nudge is cancelled).
The quote email itself is a fifth… no — the quote email is one `action: "send"` (app.js:1103). So:

> **quote out + three nudges booked = 4 messages, charged in one tap.**

Therefore today's five free messages are **gone inside the first Send**. He has one left. He cannot send a
second quote. Nobody gets to the second nudge, nobody watches a chase run to the end, and "five messages"
is not a small tier — it is one job and a spare. Everything below is downstream of that number.

---

## F1 — Who the primary target is · **CONCEDE**

PAINTER convinced me, with this sentence: **"He is the objection, not the market."** My r1 said "4 to 15
years solo", which was me quietly picking the man who is already comfortable with software because he is
easier to write screens for. PAINTER is right that the man who already pays for ServiceM8 arrives
comparing, and comparing is churn. TARGETER convinced me on the exclusion, which is the single best line
anyone wrote in round one: **"new-build subcontractors to volume builders… never quote a homeowner; they
submit progress claims to a builder."** That is a large slice of Australian painters and my r1 had no
filter against them at all.

So: **Wazza, the notepad domestic repainter, licensed, one man or one plus a hand.** Conceded.

**The amendment I am not conceding, with new arithmetic: the quote volume.** The four of us named four
different businesses (2–6/wk, 3–8/wk, 5–15/mo). The product itself settles it, because the metering does.
At 4 messages a quote, plus a deposit invoice and a final (2 more sends, and up to 3 chases each if they
go past due), a painter's monthly draw is roughly `4Q + 3W` where Q is quotes sent and W is jobs won
(1-in-3):

| quotes/month | messages/month | verdict |
|---|---|---|
| 8 (2/wk) | ~40 | never burns 150; never feels the plan; $99 is a subscription he forgets he has, then cancels |
| 20 (5/wk) | ~100 | fits inside 150 with headroom |
| 30 (7/wk) | ~150 | exactly the plan |
| 35 (8/wk) | ~175 | a $35 top-up pack every single month — the price is no longer $99 and he will say so |

**The 150 was sized, whether anyone meant it or not, for 10 to 30 quotes a month — 3 to 7 a week.** That
is the band. PAINTER's 2-a-week end of "2 to 6" is below the floor where the product's own meter makes
sense; MONEY's 5-a-month is well below it. D1 takes PAINTER's man and my band.

---

## F2 — Channel and hook · **DEFEND**

New argument, and it falls straight out of the F1 concession I just made.

TARGETER wants the first dollar on Google Search because it is the only place the **ServiceM8/Tradify
abandoner** can be bought. Correct — and that is now an argument *against* spending there first, because in
F1 we just agreed that man is the objection, not the market. **A man with a notepad has never typed
"servicem8 alternative" into anything.** There is no keyword for Wazza. His search history is a paint
supplier's opening hours. Buying intent keywords buys, with high precision, the segment three of us just
agreed is the churn. Search is a cheap always-on capture layer that will convert well and retain worst;
it is not the first dollar.

Meta gets the first dollar because it is the only channel that reaches a man who is not looking for us.

**Hook: conceded in part to PAINTER, and it is not mush — the eye and the caption do different jobs.**
The *first frame* must be the mechanism, because the mechanism is the scroll-stop and nothing else in the
category looks like it: an A4 sheet going onto a lived-in lounge wall. The *caption* must be the pain,
because the mechanism does not explain why he should care: **"Fourteen grand out and you hate ringing
about it."** TARGETER's staging note is load-bearing and I adopt it — the room must read as a
**homeowner's house, not a job site**, because that is the only filter that exists against the new-build
subbie.

**Falsifiable test:** one video, two captions (mechanism vs pain), same spend, decided on **cost per app
open**, not CTR. A pain caption that wins CTR and loses cost-per-open has bought sympathy, not painters.

---

## F3 — When the email is asked for · **CONCEDE**

MONEY convinced me. The sentence that did it is not the 9.35%, it is this one: **"A, door today: click→signup
12.50% … B, after first quote: 6.25%."** I went looking for where that halving comes from, expecting it to be
the weak link, and instead found it is the only honest way to count: in my flow, the men who never reach a
first quote never enter the list *at all*, whereas at the door they do, at zero marginal send cost. My r1
called that "a bounced address with a nurture sequence attached" — which was a sneer, not a number. MONEY
priced it: at $366/month of advantage against 70 extra addressable addresses, **three in a thousand dormant
emails ever converting and the door wins.** I cannot argue three in a thousand is too high. Conceded.

**Now the thing only this seat can state: what deferring actually costs in engineering.**

**Can the app function before an email exists? Yes — completely, except for relay sending.** Concretely:

- `joined()` (app.js:64) is `!!(S.account && S.account.email) || !!(S.sending && S.sending.token)`, and the
  route guard (app.js:225) is a single line: `if (!joined() && p[0] !== 'setup' && p[0] !== 'help') return
  viewJoin();`. **That one line is the entire door.** Behind it, nothing needs an account: `measure.js`,
  `pricing.js`, `costing.js`, `pdf.js`, `schedule.js`, `cal.js` are all local. A three-page PDF with his
  licence on it builds on a phone in flight mode.
- Proof it already runs accountless-in-all-but-name: app.js:82. With no `signup_url` configured, the join
  form writes `S.account = { email: em, joined: today, offline: true }` and toasts *"Ready. Sending is not
  switched on, so the app writes each message and you send it."* The whole product runs in that state today.
- So deferring is **not a rewrite**. It is: the guard line, a `ensureAccount()` promise on the Send path, and
  reuse of `applySetup` — the relay already hands the link back **inline** (`j.link`, app.js:89–91), so there
  is no inbox round trip to engineer around. Call it a day's work.

**And here is why I would not spend the day, which is the real answer and is mine, not MONEY's.** Deferring
does not remove the network call, it **moves it from the cheapest moment to the most expensive one**.
`QCMsg.call` (msg.js) opens with `if (!c.server) … return Promise.reject(new Error('No sending server set
up'))`. Today, if the relay is down or he has no bars, he fails at the door, having invested nothing, and
comes back. In my deferred flow he fails standing in a hallway with a finished quote on screen and a
customer watching — the single worst thirty seconds in the product. The door is where a network failure is
free. I was moving it to where it is not.

**What I extract for conceding, and it is the thing PAINTER's Wazza actually died on.** The door is not the
problem; the screen *after* the door is. `viewSetupLink` (app.js:1690–1702) renders **"Set up your app?"**
with a table reading `Business details: no · Prices: none · Jobs: none`, and a button marked **Load** — to a
man who typed his email eight seconds ago, in the same session, in the same tab. PAINTER: *"Load what? I
haven't got anything yet."* The code the screen is confirming was minted by the app *to itself*. Fix: set an
in-session flag in the join success handler at app.js:89, and when `viewSetupLink` sees it, call
`applySetup(obj)` and `go('/')` without drawing anything. Three lines. The confirm screen stays for the case
it was written for — a link arriving from an email or a receipt on a different phone.

**Falsifiable test that would reopen this**, and it needs no database: `signup.js` already stamps
`metadata[qc_source] = "signup"`. Pass the arm through from the CTA and stamp `door` or `deferred`. Then
read, off Stripe alone: *customers with `qc_used ≥ 1`, per 100 clicks, by arm.* If the doorless arm produces
more **first sends** per 100 clicks — not more signups, first sends — the door is destroying activations and
MONEY's dormant-list asset is being paid for out of activated painters. Until that runs, the door stays.

---

## F4 — The free allowance · **CONCEDE**

**PAINTER convinced me on the number and the unit**, and the code proves him right to the message. His
sentence: **"Free = your first three jobs, quoted and chased to the end (twelve messages), counted in jobs
on screen."** Three jobs × (1 quote + 3 nudges) = **exactly 12**. He picked the right number for the right
reason and I picked 15 by rounding up a feeling. Conceded: **twelve, shown as three jobs, metered in
messages underneath.**

On MONEY's arithmetic, so it is answered rather than dodged. Extending his own table (each free message is
0.18 × 20 signups-per-customer ≈ $3.60 of CAC at 5%): 12 free → **CAC $283, payback 2.83 months, profit@100
≈ $8,250**, and it pays for itself against five at **conversion 5.48%** (CAC ratio 283/258 × 5.00%). That is
+0.48pp — between his "buyable" +0.35pp at ten and his "unpromisable" +1.40pp at twenty-five. Twelve is
inside the affordable band, three months clear of his 4-month ceiling, and it is the smallest number at
which the sentence "chased to the end" is true more than once. Ten is not: two jobs and two orphans.

**The expiry: I drop it, and the reason is mine, not MONEY's.** MONEY said it is "a cost with no revenue
attached", which is not quite an argument. The real one is in the code. `until` is already enforced —
`api/msg.js` returns **403 HOSTED_ENDED** on a token past its date, and the app mirrors it in
`QCMsg.hostedEnded()`. So an expiry is genuinely one line in `signup.js`. And that is exactly what makes it
lethal: **a quote sent on day 28 books nudges for days 31, 35 and 42 — all past the wall — so the relay
silently 403s all three.** The painter's first and only experience of the thing we are selling is three
nudges that do not go. An expiry does not make the free tier ask for money; it makes the product break in
the one place it must not. I built the argument for it and the code answered it. Dropped: **twelve, no
expiry.**

---

## F5 — How fast activation must happen · **CONCEDE**

I said ten minutes. I am moving to **48 hours** (PAINTER's window). Two things did it.

**One, from MONEY, and it is fatal to my own number: "no server, so the Stripe message counter is the
entire telemetry."** I went to check it and it is worse than he said. `signup.js` writes
`metadata[qc_joined] = new Date().toISOString().slice(0, 10)` — **a date, not an instant** — and `spend()`
in `_setup.js` writes only a count (`qc_used`), with no timestamp at all. So the finest activation window
that today's data can express is *"the same calendar day"*. **A ten-minute target is not merely ambitious,
it is unmeasurable** — I proposed a metric the system cannot compute. (It is fixable: one ISO instant in
`qc_joined`, and a write-once `qc_first_send` inside `spend()`. Two keys. But that is a change, not a fact,
and a metric I have to build a clock for is not a metric I should have led with.)

**Two, from TARGETER, the one I should have seen myself: "at 7pm he is on the couch."** A man who taps a
Reel from his couch **has no customer in front of him**. Ten minutes to a real PDF to a real client is not
hard for him, it is impossible — there is nobody to send it to. My window assumed a population (man in a
hallway, live job) that the channel we just chose in F2 does not deliver. The real first send is at the next
quote visit, which is tomorrow or the day after. That is PAINTER's 48 hours, and it is 48 rather than
MONEY's 24 for a stated reason: a click on Sunday night has no job until Tuesday.

**What I do differently because it is 48 hours and not 10 minutes.** The first session no longer has to end
in a send, so it must end in something that *survives the night and asks to be finished*:

- Screen one still prices a room with **no client attached and nothing asked** — that part of my r1 stands,
  and it is now more important, not less, because there is no client to attach.
- The first session's last screen is not "Send"; it is **"Saved. $1,480 for the lounge, at your rates."**
- The next open, before anything else on Home: **"Your lounge price from Sunday night is still here. Put a
  name and a mobile on it and it's a quote."** One button: *Make it a quote*. That card is drawn from local
  state (a job with a priced room, `status !== 'quoted'`, `sent_date` empty) and needs no server, no push,
  no email — which matters, because with no server there is no other way to reach him.
- The four-step set-up card stays off Home until a quote has gone out. That part of my r1 I hold.

**Ten minutes survives, demoted, as a design constraint and not a metric: time-to-first-PDF-on-screen inside
session one.** If the first session cannot put a priced room in front of him in ten minutes, the 48-hour
number will never land either.

---

## F6 — Where the paywall appears · **DEFEND**

New matter, and it reframes the fight: **the second nudge is not a spend moment, so the balance cannot fire
it and the balance is not what should.** Because schedule-time spending books all three nudges at Send
(see the top of this file), the day-7 nudge was *paid for on day 0*. So the moment I want is a pure calendar
state, computable on the phone with **zero network** — which is the only kind of trigger a local-first app
can actually rely on.

It fires from **`pendingFollowUps(job)` (app.js:1236)**, exactly this state on the Follow-ups tab:

> a `job.follow_ups` entry with `what === 'quote+7'`, `id` set, `!cancelled`, `!sent`, `day >= today`,
> **and** its sibling `what === 'quote+3'` with `day < today` — i.e. Tuesday's nudge has gone and Saturday's
> is written and waiting.

**The words on screen, above the written nudge, with her name in them:**

> **"Sarah's had Tuesday's nudge and hasn't answered. Saturday 9am the app sends her the second one — it's
> written, it's below.**
> **That's your three free jobs used. A job takes four messages: the quote and three chases.**
> **$99 a month is 150 of them — about thirty jobs — and they go without you. Two taps to stop it.**
> **[ Turn the sending on ]  [ Not now — I'll tap Send myself ]"**

ACL-clean: every number is true, nothing expires, no scarcity, and the free path is named in the same
breath as the price.

**Conceded to TARGETER, because it is a second real moment and not a compromise:** the offer also fires
**at the win**, on `job.status === 'accepted'`. Whichever comes first, once per painter.

> **"Sarah said yes. That's one.**
> **$99 a month keeps it going: 150 messages, about thirty jobs, chased without you. [ Turn the sending on ]
> [ Not now ]"**

With a state guard I want on the record, because TARGETER's version of this line is not always true and ACL
is not a mood: **"Your nudge did that"** may only render when a `follow_up` on that job has a `day` at or
before the accepted date. Otherwise he accepted off his own bat and we would be claiming a result we did not
produce. If the guard fails, the line is just *"Sarah said yes. That's one."*

**Rejected: PAINTER's day three.** Day three is nudge *one*. Nothing has been proven — the app has sent a
message and got silence, which is exactly what his notepad does for free. Day seven is the first moment the
app has done something twice and the silence has cost him real days. Four days of patience buys the whole
argument.

**The wall at zero does not move and does not harden.** MONEY's asymmetry is unanswerable — upside 1.3% of
profit, downside 5–11%, break-even churn 9.6% — and the leakage is literally free: a painter tapping Send
himself costs $0.00 of Twilio, forever. `outOfMessagesToast` (app.js:1121) stays as built.

---

## F7 — The number that decides more ad spend · **CONCEDE**

MONEY convinced me, on the sentence **"Uses only observed numbers — spend, Stripe customers, arithmetic
contribution — and no churn guess."** My 12% gate and TARGETER's 20% both multiply a guess by a guess.
**Gate: payback under 4 months, i.e. CAC ≤ $400.** Conceded.

And here is the new number that says the fight TARGETER and I were having was not worth having. We split
12% vs 20% on activated-to-paid at a sample of 40 activations. At 5 paid out of 40, the 95% Wilson interval
is **5.5% to 26.1%** — both thresholds sit inside it, from the same data. To separate 12% from 20% with 80%
power takes **≈150 activations**, which at $45 each is **$6,750 of spend to settle an argument about which
number to use to decide whether to spend.** Neither belongs as a gate.

**What the weekly steering number is, reconciled to MONEY's ceiling rather than argued against it.** CAC =
cost-per-activation ÷ activated-to-paid. Invert his $400 ceiling at a plausible 25% activated-to-paid and the
hard stop falls out: **cost per activated painter — one real quote sent through the relay to someone who is
not him, within 48 hours — target $45, hard stop $100.** Above $100 you cannot reach 4-month payback at any
believable conversion. That is TARGETER's and PAINTER's number, doing the job it is good at (weekly, visible
in week one), under MONEY's gate, doing the job it is good at (monthly, decides the budget). **Judge the
weekly number at 40 activations; judge the gate at 40 paying customers, not before.**

---

## MY ANSWERS NOW — D1 to D10

**D1.** Wazza: licensed domestic repainter who quotes homeowners himself, one man or one plus a hand,
notepad or phone-photo today, **10–30 quotes a month (3–7 a week)** — the band the 150-message plan was
sized for; explicitly not the new-build subcontractor and not a 4+ crew with a bookkeeper.

**D2.** Meta feed + Reels takes the first dollar (Search is a cheap capture layer, not first, because there
is no keyword for a man with a notepad); 9:16, phone-shot, first frame an A4 sheet going onto a **lived-in
lounge wall**, caption **"Fourteen grand out and you hate ringing about it"** — mechanism in the eye, pain in
the words.

**D3.** Keep one screen of landing page for Meta (the looping A4 demo, the real sample PDF, and the ACL
disclosures that cannot live in an ad); send Search straight into the app; split-test phone traffic straight
in, decided on cost per app open.

**D4.** **At the door, as built** — one email field, business name optional — and the **"Set up your app?" /
Load** confirm screen is skipped whenever the app minted the code itself in the same session (app.js:1690).

**D5.** **Twelve messages, no expiry**, on screen as **"your first three jobs, quoted and chased to the
end"**, with the message count underneath and "a job is four: the quote and three chases" said once, at the
door.

**D6.** One real quote PDF **sent from the app through the relay to someone who is not the painter, inside
48 hours** of sign-up; ten minutes to a priced room on screen stays as a design constraint on session one,
not as a metric — `qc_joined` is date-only, so no finer window is measurable today.

**D7.** Two offer moments, once per painter, whichever lands first — **nudge two due** (the `quote+7` state
on the Follow-ups tab, her name and the written message on screen) and **the win** (`status === 'accepted'`,
with the "your nudge did that" line guarded by an actual prior nudge) — plus the **unchanged soft wall** at
zero: it still writes every message and he still taps Send, free, forever.

**D8.** One Stripe Payment Link opened from inside the app, email prefilled, **no trading name, no ABN, no
licence** (the app already holds all three), returning straight to the app hash carrying the token — no
welcome page, no Load, no device change; he types a card and nothing else and lands back on the job he was
chasing.

**D9.** A plain local count on Home, not behind a card ("Since 3 March: 14 quotes out, 6 accepted, $31,400
in, 9 nudges sent for you"), the balance line on Follow-ups so the month is never a surprise, the weekly
one-tap **"Has this one paid?"** list so the app never chases a man who has paid, and the back-up nag at
`#backupline`; two Stripe-triggered emails (day 1, day 25) and not one human minute.

**D10.** **Gate: payback under 4 months, CAC ≤ $400**, judged at 40 paying customers. **Weekly steering:
cost per activated painter, target $45, hard stop $100**, judged at 40 activations. Activated-to-paid is
reported, never a gate — 40 activations cannot tell 12% from 20%, and $6,750 of spend is the price of
finding out.
