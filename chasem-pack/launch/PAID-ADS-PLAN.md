# Paid ads: the first 100 tradies on $99 a month

Written 26 Sep 2026 against what is live on chasem.app and go.chasem.app today, which is the every-trade
version: "You quote. Chasem chases." (commits 86ce15f to 21b74ce on `claude/video-course-claude-code-v818j7`,
deployed but not yet merged to master). It replaces [`meta-ads.md`](meta-ads.md), which sells the $249 laptop
pack and must not run. It keeps the council's stop rule from [`GO-TO-MARKET.md`](GO-TO-MARKET.md) (D10) but not
its persona or hook: those were for the notepad painter, and the product is now for every tradie who sends
quotes.

**The short version.** Meta only to start, broad Australian targeting, phone-shot 9:16 video built on the
follow-up nobody sends, with trade call-outs on the first line. About **$25,000 (base case) to $34,000 (if the
funnel lands on the council's floor numbers) over five to six months** gets 100 tradies paying past the
money-back window. But **not one dollar goes out until the tracking works**: the live site has no pixel, the app
reports nothing to Meta, the Start button throws away which ad a tradie came from, and the database cannot tell
you when someone first chased a quote.

"Genuine" means **still paying after the 30-day money-back window**, i.e. a second successful charge.

---

## 1. What is being sold now

**One sentence:** you keep quoting however you quote; Chasem follows up every quote on day 3, 7 and 14 in your
name, books the yeses, and chases the invoices until they are paid.

What makes this much easier to advertise than the painter app was:

- **No switching.** "Keep your quoting app, your templates or your notepad." A tradie on Tradify, ServiceM8,
  Fergus, simPRO, Xero, MYOB or QuickBooks exports a CSV and drops it in; one who quotes by text pastes the text;
  a PDF is read on the phone. The council excluded the job-app user as a persona because he would pull the
  roadmap toward job management. That objection is gone: Chasem now sits beside his app instead of replacing it.
- **Value in the first session.** He does not have to wait for his next quote. The quotes he sent last week are
  the first thing he chases, today. That shortens every clock in this plan.
- **The try-it box on the page.** Paste a quote you sent, see the three follow-ups it would send, nothing leaves
  the page. It is the demo, and it works for every trade.
- **One price.** $99 a month inc GST, 150 messages, first three jobs free (12 messages), no card to start,
  $35 top-up packs, thirty days money back, cancel in two taps. The $149 two-phone plan is gone.
- **Painters still get more:** room-by-room quoting and A4-sheet measuring. They become one trade among many in
  the ads, with their own creative.

Who it is for: **the owner-operator tradie, alone or with one to four others, who quotes homeowners and small
businesses himself** and has quotes sitting unanswered. Best fits are trades where a customer takes days or weeks
to decide: painters, landscapers, fencers, builders and carpenters doing renovations, tilers, roofers, concreters,
air-con and solar installers, cleaners on contracts. Weaker fits are trades that mostly turn up and charge on the
day (emergency plumbing, small electrical call-outs). The ads test the trades rather than guess (section 4).

## 2. What would waste ad money if you ran today

Checked on the live site and in the code, 26 Sep:

| # | Gap | Why it matters for ads | Size |
|---|-----|------------------------|------|
| 1 | `META_PIXEL_ID` empty on the live `config.js` | Meta has no signal; it cannot optimise and you cannot read results | 10 min |
| 2 | The pixel lives on the landing page only. Sign-up, the first chase and payment happen in the app, which fires nothing | Meta can only optimise for "tapped Start", the shallowest and worst event | half a day |
| 3 | The Start button (`index.html:537`) sends people to `https://go.chasem.app/` **without** the UTM tags or `fbclid` | Every tradie looks organic; you cannot tell which ad or which trade made him | 30 min |
| 4 | `api/signup.js:54` stamps `qc_joined` as a date only, the source is always `"signup"`, there is no first-chase timestamp, and the trade he picked is not on the customer record | Cost per activated tradie, the number that decides the spend, cannot be computed, let alone per trade | about an hour |
| 5 | No funnel report | You need one table a week, by ad and by trade (section 6) | half a day, one more `api/admin` action |
| 6 | Maker note, name and photo empty | With no customers and no testimonials, a real person's face is the only trust on the page | 20 min |
| 7 | From `GO-LIVE.md`: leaked credentials not yet rotated, GST not set up in Stripe Tax, Supabase still on the free tier | Fine for a handful of testers; not for 50 sign-ups a week and real invoices | an afternoon |
| 8 | Optional features that are **off**: Outlook / Gmail / Xero "Find my quotes" (no OAuth keys), reading a photo of a quote (no `ANTHROPIC_API_KEY`), card payments (`/api/paid` answers `listening: false`) | The page already hides Find until it is on. The ads must not mention any of the three until each one works | none, just discipline |

One risk to measure rather than guess: **the door.** Email, then the mail app for a six-digit code, then the
set-up questions (now one tap on a trade instead of a day rate), all before he chases anything. For a cold
visitor from a Reel at 8pm, each is a place to leave, and the code depends on landing in Gmail, Outlook, iCloud
and Bigpond inboxes within seconds. Measure it on the first 1,000 clicks:

- code sent to code verified below 70%: fix deliverability first, then consider letting him paste or import his
  quotes before the door and asking for the email when he taps Chase;
- set-up started to finished below 85%: cut it to trade and business name, and ask the rest when a message first
  needs it.

## 3. The arithmetic

Every assumption gets replaced by the real number as soon as there is one.

| Step | Base case | Floor (council numbers) |
|------|-----------|-------------------------|
| Cost per link click | $2.00 | $2.50 |
| Click to app opened | 20% | 18% |
| App opened to code verified | 70% | 65% |
| Verified to set-up done | 85% | 80% |
| Set-up done to **activated** (chasing switched on for a real quote to a real customer, inside 7 days) | 55% | 40% |
| Activated to paid | 15% | 12% |
| Paid to second charge | 85% | 85% |

Activation is higher than in the painter plan because he no longer needs a new job to activate: he brings in a
quote he already sent and switches the chasing on, often in the first five minutes.

Per 1,000 clicks, base case: $2,000 buys about 200 opens, 140 verified, 119 set up, **65 activated
($31 each)**, 9.8 paying (**about $205 per paying tradie**, $240 per genuine one). On the floor: $2,500 buys
about 25 activated ($100 each), which breaches the stop rule. The truth will sit between the two, and the stop
rule decides which side (section 5).

Can it pay back? $99 inc GST is $90 ex GST. Less Stripe (about $1.85) and the sending (about $12 to $24 a month,
from the GO-TO-MARKET table), a tradie contributes **about $65 to $75 a month**. At $240 that is a
three-to-four-month payback; at $350 it is five. At 5% monthly churn a tradie is worth about $1,400.

**Path to 100 genuine customers:** 100 / 0.85 / 0.15 = **about 785 activated tradies**. Base case: 12,000
clicks, **about $25,000**. Council-floor case at the $45 stop line: **about $34,000**. Churn during the months
it takes adds another 10 to 15 customers to find, which is inside these ranges.

**Timing.** Twelve free messages is three to four quotes chased. A tradie who imports ten open quotes runs out
in a day or two and sees the offer within the first week; one who only chases new quotes takes two to three
weeks. So **first payments lag spend by one to three weeks, and "genuine" lags by five to seven.** Never judge a
week's spend on that week's payments.

## 4. The campaign

### Before the first dollar (week 0, start by 6 Oct)

Nothing starts until all of this is done and tested as a stranger on a real phone from an ad preview.

1. **Meta Business Manager.** Business verified, ad account in AUD, domain `chasem.app` verified, pixel created
   and its ID in `META_PIXEL_ID`.
2. **Carry attribution into the app.** The Start links append the page's own `utm_*` and `fbclid` to
   `go.chasem.app/`. The app keeps them from first open to sign-up and hands them to `/api/signup`, which
   writes them onto the Stripe customer (`qc_source`, `qc_campaign`, `qc_ad`, `fbclid`), along with the trade
   he picks (`qc_trade`).
3. **Events from the app, in the browser and server-side.** iOS blocks much of the browser pixel, so the relay
   also sends the important events through Meta's Conversions API, with the same `event_id` so each counts once:

   | Event | When | Sent from |
   |-------|------|-----------|
   | `Lead` | Start tapped on the landing page | page (already there) |
   | `CompleteRegistration` | six-digit code verified | `api/signup.js` / `api/signin.js` |
   | `StartTrial` (meaning set-up done) | last set-up question answered, with the trade | app |
   | `Activated` (custom) | first chase booked on a real quote, write-once | `api/msg.js`, same moment as `qc_first_chase` |
   | `Subscribe` | first paid charge, `value: 90, currency: AUD` | `api/stripe-webhook.js` |

4. **Timestamps.** `qc_joined` becomes a full ISO instant; add write-once `qc_setup_done`, `qc_first_chase`,
   `qc_offer_seen`, `qc_paid`.
5. **The funnel report.** `POST /api/admin {action:"funnel", from, to}` returns section 6's table by week, by
   `utm_content` and by trade.
6. **Gaps 6 and 7** from section 2: maker note and photo; rotate the credentials, GST in Stripe Tax, Supabase
   off the free tier.
7. **Deliverability.** Send yourself the sign-in code at a Gmail, an Outlook, an iCloud and a Bigpond address;
   time each one and note which folder it lands in.
8. **Brand search.** A Google Ads campaign on the exact word `chasem` only, capped at $5 a day. People who see
   a Reel search the name.

Items 2 to 5 are code under the two Chasem rules: every tracking call is fire-and-forget, and a tracking
failure never blocks a sign-up or a send.

### Structure

**One campaign, one prospecting ad set, six to eight ads.** A small account learns fastest when the budget is
not split, so trades are tested through **creative**, not through separate ad sets.

- **Objective:** Sales, optimising for `CompleteRegistration` at first (Meta needs about 50 a week, and at
  $100 a day you get roughly 40 to 70). Move it to `Activated` once that runs above 50 a week, which is about
  $150 to $200 a day. Never optimise for `Lead`.
- **Audience:** Australia, 25 to 65, Advantage+ audience. Suggestions: Tradify, ServiceM8, Fergus, hipages,
  Oneflare, Bunnings Trade, Reece, Tradelink, Dulux Trade, small business owner, self-employed, and the trade
  interests (electrician, plumbing, carpentry, landscaping, painting and decorating). hipages and Oneflare are
  worth naming because tradies on them quote a lot of strangers, and most of those quotes go unanswered.
- **Placements:** Advantage+, every ad with its own 9:16 cut.
- **Exclusions:** everyone who has already signed up (a custom audience on `CompleteRegistration`).
- **Destination:** chasem.app with
  `?utm_source=meta&utm_medium=paid&utm_campaign=first100&utm_content=<concept>-<trade>`.
  After 40 activations, split-test sending phone traffic straight to go.chasem.app, judged on cost per
  activated tradie only.

### Creative: phone-shot, captions burned in

Most Reels play muted, so everything that matters is on screen. Shot on a phone on a real job, not produced.

1. **The follow-up you didn't send (lead ad, every trade).** On the tools; the phone buzzes; on screen:
   *"Yes please, can you start on the 14th?"* Cut to Chasem's follow-ups tab: that yes came from the day-7
   message it sent while he was working. End card: "You quote. Chasem chases. First three jobs free."
   15 to 20 seconds.
2. **Paste it in.** Screen recording: copy a quote text already sent, paste it into Chasem, it pulls out the
   name, the amount and the number, and shows the three follow-ups with their days. "Already sent the quote?
   Chase it from here."
3. **Keep your quoting app.** Screen recording: export from your job app, drop the file in, tick, Chase. Copy
   says "your quoting app", not competitors' names; the landing page names them. The job-app user is the
   easiest tradie to convince that quotes go unanswered: his app shows him how many.
4. **Owed, waiting, won.** Home screen: what you are owed in red, what is waiting on a yes in yellow, what you
   have won in green. "Know where the money is before you've had a coffee."
5. **The maker.** You, to camera, 30 seconds: who you are, why you built it, three jobs free, no card, your name
   on the guarantee.
6. **Painters.** The A4 sheet onto the wall, one photo, the priced quote, then the chasing. Painters get
   the product nobody else gets; this is the ad for them.
7. **Trade call-outs.** Concept 1 re-cut with the first line of text and the first on-screen word swapped:
   *Painters / Sparkies / Landscapers / Builders / Plumbers / Tilers*. Same video, different first three
   seconds. The trade that wins on cost per activation gets its own filmed version in phase 2.
8. **Real tradies (from phase 2).** Ask the first twenty payers, from inside the app, for a 20-second clip
   in exchange for a free month. These replace concept 5 as the best ads you will have.

### Words

> **Tradies:** how many quotes did you send last month that never got an answer?
>
> Chasem follows up every one on day 3, 7 and 14, by text, in your name, and stops the moment they say yes.
> Then it books them in and chases the invoice. Keep quoting the way you do now.
>
> First three jobs free. No card.

> **Sparkies:** you quote. Chasem chases.
>
> Paste in the quotes you've already sent, or drop in the export from your quoting app. It writes the
> follow-ups and sends them while you're on the tools.
>
> Three jobs free, no card, $99 a month after that if you want it to keep going.

> The awkward "just checking in on that quote" texts, sent for you, on weekdays, in your words. Chasem, for
> Australian tradies. First three jobs free.

Headlines: "You quote. Chasem chases." / "The follow-up sends itself" / "Chase the quotes you've already sent" /
"Three jobs free. No card." Button: **Sign up**.

**What not to say:** no dollar figures for money recovered or hours saved (no customers yet to back them); no
competitor names in ad copy; no "AI"; no "free app" (it is three free jobs, then $99); nothing about Outlook,
Gmail or Xero login, reading a photo of a quote, or card payments until each is switched on; no measuring
accuracy figure until the real-wall test in `GO-LIVE.md` is done; no "replaces your quoting app"; say "works
alongside it", which is true.

## 5. Phases, budget, and the rules for moving money

| Phase | When | Daily | Spend | For | Expected by the end (base) |
|-------|------|-------|-------|-----|----------------------------|
| 0. Fix | week 0 | $0 | $0 | section 4's list | a test sign-up from an ad preview visible in the funnel report |
| 1. Learn | weeks 1-3 | $100 | ~$2,100 | find the ads and the trades that make activated tradies; find where the door leaks | ~60 activated, 5-8 paying |
| 2. Prove | weeks 4-9 | $150 | ~$6,300 | reach ~110 activations to read activated-to-paid; film the winning trade | ~30 paying |
| Pause | 20 Dec - 12 Jan | $20 retargeting | ~$500 | tradies are off; pre-Christmas CPMs are the year's highest | |
| 3. Scale | mid Jan - April | $200-300 | ~$16,000-25,000 | peak season for quoting; retargeting and lookalikes | 100 genuine |

Total **about $25,000 to $34,000**. October to March is when homeowners get quotes for outdoor and renovation
work; getting to 100 before winter is worth more than doing it cheaply in June.

**Cash:** by month four the tradies already paying bring in $2,000 to $3,500 a month, so the out-of-pocket peak
is about $20,000 to $27,000.

Checked every Monday, from the funnel report, never from Meta's own columns alone.

Per ad, after $80 spent:
- link click-through under 0.8%, or cost per click over $3.50: pause;
- three-second view rate under 25%: the first frame is wrong, re-cut the opening only.

Per trade (from `utm_content`), after 20 activations:
- cost per activation more than 1.5 times the account average: stop that trade's call-out;
- under 0.7 times: give it its own filmed ad.

Per campaign:
- **cost per verified sign-up:** target $15, look hard above $25;
- **cost per activated tradie:** target $30. **Stop at $45 sustained for two weeks** (the council's number: at
  12% activated-to-paid, $45 is a $375 CAC, inside the $400 ceiling). Do not act before 40 activations;
- **activated to paid at or above 12%**, monthly, not before about 110 activations. At 40, 12% and 20% cannot be
  told apart;
- **scale:** while cost per activation is under $35, raise the budget 20% every four days;
- **refunds:** each one is read in full. Two naming the same thing pause scaling until it is fixed.

If the stop fires, look in this order: the door, the page, the creative, then the price.

### Scale-phase additions

- **Retargeting**, 10-15% of budget: page visitors who did not tap Start and 50%+ video viewers, last 30 days.
  Never retarget people who signed up; the app and its own emails talk to them.
- **Lookalike suggestions** from activated tradies, then from payers.
- **Google Search, a capped test.** The council's "no inventory" finding was for painter quoting terms. The
  every-trade product opens wider terms (quoting app for tradies, quote follow up, tradie invoicing app). Check
  Keyword Planner; if the set carries more than about 2,000 searches a month, run $15 a day for a month on exact
  and phrase match, judged by the same cost-per-activation rule. No competitor brand terms.

## 6. The weekly table

One row a week, and the same table split by `utm_content` and by trade:

| Week | Spend | Clicks | CPC | App opens | Codes sent | Verified | Set up | Activated | $/activated | Offer seen | Paid | Refunds | 2nd charge | Paying total |
|------|-------|--------|-----|-----------|------------|----------|--------|-----------|-------------|------------|------|---------|------------|--------------|

## 7. Risks worth naming

- **Tradies chasing lists.** Import makes it easy to bring in a hundred old quotes and chase them all. That is
  the use case, but old and cold quotes from a CSV are where spam complaints come from. Every tradie
  texts through **one shared Twilio Messaging Service**; if one number gets filtered, it is filtered for
  everybody. Split the sender pool, and consider a per-day cap on first chases for imported quotes older than,
  say, 60 days, before phase 3.
- **The free allowance empties on day one for importers.** Good for conversion speed, but "three jobs free"
  must stay literally true on the page when the importer chases ten quotes: make sure the in-app count says
  jobs, and the soft wall (he can still send by hand) holds.
- **Busy tradies outgrow 150 messages.** A quote still books all three follow-ups at once. A tradie chasing 40
  quotes a month in peak season runs out; that is the summer churn risk. The council's fix (book the first
  follow-up now, the others on their own dates) is worth doing before phase 3.
- **The ad account.** New accounts get spending limits and occasional unexplained restrictions. Hold $100 a day
  for the first week, keep a second admin on Business Manager, and do not change the payment method mid-run.
- **One support person.** At 100+ sign-ups a week, `help@chasem.app` has to reach you the same business day,
  as the page promises.

## 8. What I need from you

1. Meta Business Manager set up and the pixel ID.
2. The `GO-LIVE.md` items that touch money: rotate the credentials, GST in Stripe Tax, Supabase off the free
   tier.
3. The maker note, your name as it should read, and a photo.
4. An hour on a real job shooting concepts 1, 2 and 5 on your phone (concept 6 too, if a painter will let you).
5. A yes to building section 4's items 2 to 5 (attribution, app events, timestamps, funnel report). They would
   go on top of the every-trade branch, since that is what is live.
6. Your call on the door, once the first 1,000 clicks show where it leaks.
