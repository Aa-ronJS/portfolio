# Paid ads: the first 100 painters on $99 a month

Written 26 Sep 2026, against what is live on chasem.app and go.chasem.app today. It builds on
[`GO-TO-MARKET.md`](GO-TO-MARKET.md) (the council's settled decisions on persona, channel, hook and the stop
number) and replaces [`meta-ads.md`](meta-ads.md), which sells the $249 laptop pack as "no subscription, ever"
and must not be used for this campaign.

**The short version.** Meta only, broad targeting, phone-shot 9:16 video built on the A4-sheet hook. About
**$30,000 to $38,000 of spend over five to six months** gets 100 painters paying, if the funnel lands inside
the council's numbers. But **not one dollar goes out until the tracking is fixed**: today the live site has no
pixel, the app reports nothing to Meta, and the database cannot tell you when a painter first sent a quote.
Paying for clicks you cannot follow to a sale is the one way to spend the money and learn nothing.

"Genuine" in this plan means **still paying after the 30-day money-back window**, i.e. a second successful
charge. First charges are reported too, but the target is 100 second charges.

---

## 1. Where the product is today

What is ready to sell:

- The app is live at go.chasem.app: email and a six-digit code at the door, a five-question set-up wall
  (business name, ABN, state, day rate, how he gets paid), then quoting with the A4 sheet, sending, and
  chasing on its own.
- The offer is clean and fully self-serve: 12 free messages (three whole jobs, quoted and chased to the end),
  no card to start, $99 a month inc GST for 150 messages, $149 for two phones, $35 top-up packs, cancel in two
  taps, thirty days money back. Stripe Payment Links are live.
- The landing page at chasem.app was rebuilt on 23 Sep: hero, real app screenshots, the live photo demo,
  pricing, guarantee, FAQ.
- The test drive loads a realistic week of jobs, which makes shooting screen recordings for ads easy.
- There are no painters on it yet ("nobody is on the app yet", commit c58cc07). So: no testimonials, no
  usage numbers, and the ACL rule stands, no claims you cannot back.

What would waste ad money if you ran today (checked on the live site, 26 Sep):

| # | Gap | Why it matters for ads | Size |
|---|-----|------------------------|------|
| 1 | `META_PIXEL_ID` is empty on the live `config.js` | Meta has no signal at all; it cannot optimise and you cannot read results | 10 min |
| 2 | The pixel only lives on the landing page. The app, where sign-up, activation and payment happen, fires nothing | Meta can only optimise for "clicked the button", the shallowest and worst event | half a day |
| 3 | The "Start" links send people to `https://go.chasem.app/` **without** the UTM tags or `fbclid` | Every painter looks organic; you cannot tell which ad made him | 30 min |
| 4 | `api/signup.js:54` stamps `qc_joined` as a date only, there is no `qc_first_send`, and the source is always `"signup"` | Cost per activated painter, the number that decides the spend, cannot be computed | about an hour (the council said so in D6) |
| 5 | No funnel report | You need one table a week: sign-ups, code verified, wall done, first real send, offer shown, paid, second charge, refunds, by ad | half a day, one more `api/admin` action |
| 6 | Card payments are advertised on the page ("Invoices and card payments", the meta description) while `/api/paid` answers `listening: false` and Connect may not be signed up | A painter who signs up for the thing in the ad and finds "Not switched on yet" is a refund and a bad word in a Facebook group | 15 min at dashboard.stripe.com/connect, then test one invoice |
| 7 | `MAKER_NOTE`, `MAKER_NAME`, `MAKER_PHOTO` empty | With no testimonials, a real person's face and name is the only trust on the page | 20 min |
| 8 | The real-wall accuracy check (LAUNCH-CHECKLIST item 3) | Needed before any ad or caption says how accurate the measuring is | 10 min with a tape |

And one structural risk, which is a decision for you rather than a fix:

**The door.** The council decided the email is asked for at the first Send, never at the door (D4, unanimous).
What shipped since is the opposite, for good security reasons: email, then switch to the mail app for a
six-digit code, then five questions, before he sees anything. For a cold visitor from a Reel at 8pm, each of
those is a place to leave, and the code step also depends on Resend landing in Gmail, Outlook, iCloud and
Bigpond inboxes within seconds. Do not rebuild it on a guess. Measure it for the first 1,000 clicks (that is
what gaps 2 to 5 are for) and act on the numbers:

- code sent to code verified below 70%: fix deliverability first, then consider letting him price one room
  before the door, with the email and code asked at Send, as the council designed;
- wall started to wall done below 80%: cut the wall to business name and day rate, and ask ABN, state and
  payment at the first Send (the quote screen already has an inline ABN box).

## 2. The arithmetic

Assumptions, each one checked weekly against the real funnel and replaced as soon as there is data:

| Step | Assumption | Source |
|------|------------|--------|
| Cost per link click | $1.50 to $2.50 | Australian trade audiences on Reels and Feed, broad targeting |
| Click to app opened | 20% | a one-screen page with a strong Start button |
| App opened to code verified | 70% | the door, see above |
| Verified to wall done | 80% | five one-tap-ish questions |
| Wall done to activated (a real quote sent to a customer who is not him, inside 7 days) | 40% | his next quote may be a week away |
| Activated to paid | 12% floor, 15 to 20% hoped | council D10 gate |
| Paid to second charge (past the guarantee) | 85% | |

So, per 1,000 clicks at $2: about 200 opens, 140 verified, 112 through the wall, **45 activated** (**$44 each**,
right on the council's $45 stop), and at 15% about **6.7 paying**, i.e. **about $300 per paying painter** and
$350 per genuine one. At the 12% floor it is about $370 per paying painter, still inside the $400 ceiling.

Is $350 affordable? $99 inc GST is $90 ex GST. Less Stripe (about $1.85) and the cost of sending
($12 to $24 a month depending on volume, from the GO-TO-MARKET table), a painter contributes **about $65 to $75 a
month**. At $350 that pays back in five months. At 5% monthly churn he is worth about $1,400 over his life.
It works, but not with much room, which is why the stop rule matters.

**Path to 100 genuine customers:** roughly 100 / 0.85 / 0.15 = **about 785 activated painters, 17,000 clicks,
$30,000 to $38,000**, with churn during the months it takes adding another 10 to 15 customers to find.

Timing lag: a painter who signs up today spends his 12 free messages over one to three weeks, sees the offer at
the second nudge (day 7 of a live quote), pays, and has his second charge 30 days after that. **Paid revenue
lags spend by about three weeks, and "genuine" lags it by about seven.** Do not judge a week's spend on that
week's payments.

## 3. Before the first dollar (week 0)

In this order. Nothing else starts until all of it is done and tested as a stranger on a real phone.

1. **Meta Business Manager.** Business verified, ad account in AUD, domain `chasem.app` verified, pixel created.
   Pixel ID into `META_PIXEL_ID` in `chasem-landing/public/config.js` and deployed.
2. **Carry attribution into the app.** The Start links append the page's own `utm_*` and `fbclid` to
   `go.chasem.app/`; the app keeps them from first open until sign-up and hands them to `/api/signup`, which
   writes them to the Stripe customer (`qc_source`, `qc_campaign`, `qc_ad`, `fbclid`).
3. **Events from the app, server-side as well as in the browser.** iOS blocks a lot of browser pixel traffic,
   so the relay sends the important ones through Meta's Conversions API, with the same `event_id` as the
   browser event so Meta counts each once:

   | Event | When | Where it is sent from |
   |-------|------|------------------------|
   | `Lead` | Start tapped on the landing page | page (already there) |
   | `CompleteRegistration` | six-digit code verified | `api/signin.js` / `api/signup.js` |
   | `StartTrial` (used as "wall done") | fifth wall question answered | app |
   | `Activated` (custom) | first quote sent to a customer who is not him | `api/msg.js`, write-once, same moment as `qc_first_send` |
   | `Subscribe` | first paid charge, with `value: 90, currency: AUD` | `api/stripe-webhook.js` |

4. **Timestamps.** `qc_joined` becomes a full ISO instant; add write-once `qc_wall_done`, `qc_first_send`,
   `qc_offer_seen`, `qc_paid`. Without these no clock in this plan can be read.
5. **One funnel report.** `POST /api/admin {action:"funnel", from, to}` returns the table in section 6 by week
   and by `utm_content`. It reads the Stripe customers and the painter table; no new tool.
6. **Card payments live or not advertised.** Sign up for Connect, turn it on as a painter, pay one invoice
   with a real card, see it tick off. If you would rather not yet, take "card payments" out of the meta
   description and the feature card until it works. The ad itself will not mention cards either way.
7. **The rest of the checklist items that touch a stranger:** maker note and photo, the real-wall accuracy
   test, Vercel Firewall rate limit on `/api/demo`, a monthly spend cap on the Anthropic key, and send yourself
   the sign-in code to a Gmail, an Outlook, an iCloud and a Bigpond address and time how long each takes to
   arrive and which folder it lands in.
8. **Brand search.** A Google Ads campaign on the exact word `chasem` only, $5 a day cap. People who see a
   Reel go and search the name; this costs almost nothing and stops a competitor or a reseller sitting on it.
   This is not the Search spend the council rejected; no generic or competitor keywords.

Items 2 to 5 are code and need the usual care: every write survives a lost connection, and a tracking failure
must never block a sign-up or a send. Fire and forget, always.

## 4. The campaign

**One campaign, one ad set, four to six ads.** Small accounts learn fastest when the budget is not split.

- **Objective:** Sales, with the conversion event `CompleteRegistration` to start. Meta needs roughly 50
  conversions a week to settle, and at $100 a day you will get about 40 to 70 verified sign-ups a week but only
  15 to 25 activations. Move the optimisation event to `Activated` once it is running above 50 a week (around
  $200 a day). Never optimise for `Lead`: it rewards people who tap and leave.
- **Audience:** Australia, 25 to 60, Advantage+ audience. Suggestions: house painting, painting and
  decorating, Dulux, Haymes, Taubmans, Wattyl, Bunnings Trade, Master Painters Australia, small business owner.
  Let the first line and the first frame do the targeting; the council's point stands that a new-build subbie
  does not stop for a hallway repaint.
- **Placements:** Advantage+, but every ad supplies its own 9:16 cut, so Reels, Stories and Feed never crop.
- **Exclusions:** anyone already signed up (a custom audience from the `CompleteRegistration` event) from the
  prospecting ad set.
- **Destination:** chasem.app with `?utm_source=meta&utm_medium=paid&utm_campaign=first100&utm_content=<ad>`.
  After 40 activations, split-test sending phone traffic straight to go.chasem.app (council D3), judged on cost
  per activated painter only.

### Creative: five concepts, all phone-shot, captions burned in

Most Reels play muted, so every word that matters is on screen. Shot on a phone in a real house, not
produced; a polished ad reads as someone selling software, a shaky one reads as a painter.

1. **The sheet (the council's hook, lead ad).** First frame, first three seconds: a hand tapes an A4 sheet to a
   hallway wall. Take one photo. Cut to the rooms filling in. Cut to the PDF quote total. End: "Quote it before
   you leave the driveway. Three jobs free." 15 to 22 seconds.
2. **The chase.** Screen recording from the test drive: the Follow-ups tab with "Sharon hasn't come back on the
   Thomson quote", the message it wrote, and the day it goes. Caption: "You forgot to follow up. It didn't."
   No money figure.
3. **The driveway.** Painter in the ute, phone in hand, 20 seconds: "Used to write quotes at the kitchen table
   at nine at night. Now it's sent before I've backed out." Shoot this with a real painter as soon as there is
   one who will say it; until then, not at all. No actors saying things nobody said.
4. **The maker.** You, to camera, 30 seconds: who you are, why you built it, three jobs free, no card, your
   name on the guarantee. Founder ads do well with tradies because they are a person, not a platform.
5. **The screens (static, for Feed).** Four-card carousel of the real app screenshots in `public/img/`, one
   line each: tape the sheet; the rooms price themselves; the quote goes out; the chasing sends itself.

### Words

Primary text, rotate three:

> **Painters:** tape an A4 sheet to the wall, take one photo, and the quote is priced at your rates before
> you leave the driveway. It sends the quote, then chases it on day 3, 7 and 14 so you don't have to.
>
> Your first three jobs are free. No card. $99 a month after that if you want it to keep sending.

> **Painters:** how many quotes went out last month that you never followed up?
>
> Chasem writes the follow-up and sends it on the day, in your name and in your words. You just get
> the yes.
>
> Three jobs free, quoted and chased to the end. No card to start.

> A quoting app made for house painters, on your phone. A4 sheet on the wall, one photo, priced quote out.
> Follow-ups send themselves. Three jobs free.

Headlines: "Quote it before you leave the driveway" / "Three jobs free. No card." / "The follow-up sends
itself". Call to action button: **Sign up**.

What not to say, on top of `meta-ads.md`'s list: no dollar figures of money recovered or hours saved (there are
no customers to back them), no accuracy figure until the real-wall test is done, no "AI", no competitor names,
no "free app" (it is three free jobs, then $99), and nothing about card payments until they work.

## 5. Phases and budget

| Phase | When | Daily | Spend | What it is for | Expected by the end |
|-------|------|-------|-------|----------------|----------------------|
| 0. Fix | week 0 (start by 6 Oct) | $0 | $0 | section 3 | tracking proven end to end with a test sign-up from an ad preview |
| 1. Learn | weeks 1-3 | $100 | ~$2,100 | find one or two ads that make activated painters; find out where the door leaks | ~40-50 activated, 3-6 paying (lagged) |
| 2. Prove | weeks 4-9 | $150 | ~$6,300 | reach ~110 activations, when activated-to-paid can first be read | ~20 paying, first second-charges |
| Pause | 20 Dec - 12 Jan | $20 retargeting only | ~$500 | painters are off; CPMs spike before Christmas | |
| 3. Scale | mid Jan - April | $250-350 | ~$22,000-27,000 | peak repaint season before winter; add retargeting and lookalikes | 100 genuine |

Total **about $31,000 to $36,000**. Timing matters: October to March is when domestic repaints are quoted, so a
painter who signs up now hits his three free jobs fast. Winter (June to August) roughly halves quotes a week,
so the free messages last longer and conversion slows. Getting to 100 before May is worth more than doing it
cheaply in winter.

**Cash:** by month four the painters already paying contribute $1,500 to $3,000 a month, so the true
out-of-pocket peaks at about $25,000 to $28,000, not the whole spend.

### Rules for moving money

Checked every Monday, on the numbers from the funnel report, never on Meta's own column alone.

Per ad, after $80 spent:
- link click-through under 0.8%, or cost per click over $3.50: pause it;
- three-second view rate under 25%: the first frame is wrong, re-cut the opening, keep the rest.

Per campaign:
- **cost per verified sign-up:** target $15, look hard at anything over $25;
- **cost per activated painter:** target $30. **Stop at $45 sustained for two weeks.** Do not act on it before
  40 activations (council D10);
- **activated to paid at or above 12%**, judged monthly and not before about 110 activations. At 40
  activations, 12% and 20% cannot be told apart; do not pretend to;
- **scale:** while cost per activation is under $35, raise the budget 20% every four days. A bigger jump
  resets Meta's learning;
- **refunds:** each one is read in full. Two refunds naming the same thing pauses scaling until it is fixed.

If the stop fires, the order to look is: the door (section 1), then the page, then the creative, then the
price. The council's rule: leads but no payments after 300 visitors, test the page before touching the price.

### Scale-phase additions

From about 50 paying customers:
- **Retargeting ad set,** 10-15% of budget: landing-page visitors who did not tap Start, and 50%+ video viewers,
  last 30 days. Show the chase ad and the maker ad. Never retarget people who signed up; the app and its own
  emails talk to them.
- **Lookalike suggestion** from activated painters (and from payers once there are 100).
- **Real painters on camera.** Ask the first twenty payers, from inside the app, whether they would do a
  20-second clip for a free month. These replace concept 3 and become the best-performing ads.
- **A second ad set for the two-phone plan** only if payers show real demand for it.

## 6. The weekly table

One row a week, one column per step, from `api/admin {action:"funnel"}`:

| Week | Spend | Clicks | CPC | App opens | Codes sent | Verified | Wall done | Activated | $/activated | Offer seen | Paid | Refunds | 2nd charge | Paying total |
|------|-------|--------|-----|-----------|------------|----------|-----------|-----------|-------------|------------|------|---------|------------|--------------|

Plus the same table split by `utm_content`, which is what decides which ads live.

## 7. Risks worth naming

- **The shared Twilio sender.** Every painter texts through one Messaging Service. If one texts a bought list
  the number can be filtered for all of them. Split the sender pool before about 50 painters.
- **Busy painters outgrow 150 messages.** A quote still books all three nudges at Send (four messages a job),
  so a painter doing 30+ quotes a month in peak season runs out. That is the churn risk in summer, exactly when
  this campaign lands. The council's first fix (book nudge one at Send, let two and three book on their own
  dates) is worth doing before phase 3.
- **The ad account.** New accounts get spending limits and sometimes get restricted for no stated reason. Run
  the first week at the planned $100 a day, keep a second admin on Business Manager, and do not change the
  payment method mid-campaign.
- **One support person.** At 100+ sign-ups a week, the questions arrive. `SUPPORT_EMAIL` has to reach a person
  the same day, and the page promises it.

## 8. What I need from you

1. Meta Business Manager set up and the pixel ID.
2. Connect signed up at dashboard.stripe.com/connect, or a yes to taking card payments off the page for now.
3. The maker note, your name as it should read, and a photo.
4. Twenty minutes on a real wall with a tape, and an hour shooting concepts 1, 2 and 4 on your phone.
5. A yes to building section 3 items 2 to 5 (attribution, app events, timestamps, funnel report).
6. Your call on the door, once the first 1,000 clicks have shown where it leaks.
