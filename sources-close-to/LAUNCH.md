# Sources Close To. Zero to profit in a day, and every day after

**The brief.** Start from nothing, end the day in profit on at most $100 of
ads, and be in profit again tomorrow. This is a product, not a date.

**Profit, defined.** Cash in for the day, less ad spend, less the cost of
goods. Cost of goods is real here and small: one Claude call and one Stripe fee.

## 1. What is for sale

A six-page tabloid newspaper about one person, written from anonymous tips sent
in by everyone who knows them. Front-page scandal, exclusive interview, Spotted
column, ranked list, agony aunt, horoscope, classifieds, a parody ad, and one
sincere page at the back. $29 AUD. Print-ready in the browser about a minute
after payment.

Why this and not another printable:

- **It is a group gift with a built-in audience.** The buyer opens a tip line
  and drops the link in the group chat. Ten or fifteen people visit that page,
  write something, and see "Start one about them" on the way out. Every sale
  puts the product in front of a dozen people who already have a birthday
  coming up. That is the ad budget's leverage, and it is why day thirty beats
  day one.
- **The content is the reaction.** The recipient reads their own front page
  aloud at a table of the people who wrote it. That is filmed. That goes in
  the chat, and often on Instagram, with the masthead in frame.
- **It is unbuyable elsewhere.** There is no shelf with this on it. Nobody
  price-compares a newspaper about their sister.
- **Nothing to fulfil.** The buyer prints it or takes the PDF to Officeworks.
  Cost of goods is roughly a dollar.
- **It is for every occasion that has a group chat.** Birthdays, 40ths,
  retirements, farewells, hens and bucks, engagements, the housemate moving
  out. Demand is daily.

## 2. The arithmetic

Estimates until the ledger replaces them.

| Quantity | Estimate |
|---|---|
| Price | $29.00 |
| Claude, one issue (Opus 5, about 3k in / 8k out) | $0.22 |
| Stripe, domestic card | $0.79 |
| Blob storage, per issue | under $0.01 |
| Gross margin per sale | about $28.00 |
| Break-even on $100 of ads | 4 sales |
| Meta CPC, AU, video creative | $0.90 to $2.00 |
| Clicks from $70 on Meta | 35 to 78 |
| Google Search CPC, gift-intent terms | $1.50 to $3.50 |
| Clicks from $30 on Google | 9 to 20 |
| Visitor to tip line opened | 8% to 15% (it is free) |
| Tip line opened to paid | 35% to 55% (the chat does the selling) |
| Paid sales from $100 | 1.5 to 8 |

So day one on ads alone sits around break-even, with the spread depending on
one number: how many people who open a tip line get five tips and pay. That
number is the business, and it is not an advertising problem. It is the share
message, the reminder, and how good the sample issue looks.

**The loop.** Each paid issue has, say, twelve contributors. If four percent of
them open their own tip line within two months and half of those pay, every
sale seeds a quarter of a sale. The tip page's "Start one about them" link
carries `utm_source=tipline`, so the ledger shows it as its own row. The
target is a referral row that pays for the ads.

## 3. Setup, once (about an hour)

1. **Vercel project** from this folder. `npx vercel` links it. Add a Blob
   store to the project (Storage tab); that sets `BLOB_READ_WRITE_TOKEN`.
2. **Environment variables**, in the Vercel project: `ANTHROPIC_API_KEY`,
   `STRIPE_SECRET_KEY`, `SITE_URL` (the production origin, no trailing slash),
   `PRICE_CENTS=2900`. Leave `MOCK_GENERATE` unset in production.
3. **Stripe.** Nothing to create in the dashboard; Checkout Sessions are made
   per issue with the price inline. Turn on the customer receipt email. The
   `client_reference_id` on each payment is `issueId_channel`, so channel
   attribution is in Stripe without any other tooling.
4. **Deploy.** `npx vercel deploy --prod`. Open the site. The sample cover on
   the landing page must render. Open a tip line for yourself, send five tips
   from your phone with a photo, pay $29, read the issue, print it to PDF.
   Refund yourself. Read the issue again as if you were the person. That is
   the quality bar and it is the only test that matters.
5. **Meta Pixel and Vercel Analytics** are optional on day one. Stripe plus
   the `utm` on the checkout reference is enough to run the daily rule.

Local work: `cp .env.example .env.local`, set `MOCK_GENERATE=1`, `npm run
dev`. Everything works without any key, with a fixed sample issue in place of
the newsroom and no charge.

## 4. The ad that sells it

The product is visual, social and funny, which makes it a Meta product first
and a search product second. The creative is not a mock-up. It is a 20-second
phone video: someone at a table unfolds the front page, reads the headline
aloud, the table loses it. Shoot it at the first party. Until then, a
15-second screen recording: the group chat filling with tips, cut to the cover.

Primary text, three variants:

> We made a newspaper about Dave for his 40th. Everyone in the chat sent in
> dirt anonymously. Front page: "DAVE IN BUNNINGS FOR FOURTH TIME THIS WEEK".
> He read the whole thing aloud. $29, printed it at home.

> The group-chat gift. Drop a link, everyone sends in stories about them,
> a six-page tabloid comes out. Exclusive interview with "a source". Their
> horoscope. The classifieds. They read it at the party. $29.

> Stop buying them a candle. Make the group chat write them a newspaper.

Headline: **The tabloid about your mate.** Description: **From anonymous
tips. Print-ready. $29.**

- Australia, 24 to 60, no interest targeting, feeds and Stories, $50 a day
  lifetime-capped for the first week.
- Objective Traffic until there are 20 purchases, then Sales.
- Link: `/?utm_source=meta&utm_medium=paid&utm_campaign=sct&utm_content=v1`

Google Search, $30 a day, exact and phrase, one ad group:

```
[funny birthday gift for friend]  [personalised birthday gift funny]
[40th birthday gift ideas funny]  [funny retirement gift ideas]
"unique gift for best friend"  "funny farewell gift for colleague"
"hens night ideas"  "group gift ideas"
```

Negatives: `card, cards, free, mug, t-shirt, amazon, kmart, delivery, flowers`

Ad copy, checked to length (30 / 90):

```
The Tabloid About Your Mate       (27)
Written From Anonymous Tips       (27)
Six Pages, Print-Ready, $29       (27)
The Group Chat Writes It          (24)
Funnier Than A Card               (19)

Drop a link in the chat. Everyone sends in dirt. A newspaper about them comes out. $29.   (87)
Front page scandal, exclusive interview, horoscope, classifieds. They read it aloud.       (84)
```

Free channels that matter more than either: post the sample issue in your own
feed with "who should I make one of these about", and reply to every comment
with a tip line. Every wedding, hens and party planner page on Facebook is an
audience that plans group gifts for a living.

## 5. The daily rule

Each morning, two numbers from Stripe: yesterday's paid issues and yesterday's
spend. Cost per sale is spend divided by paid issues. Gross margin is $28.

| Cost per sale yesterday | Today |
|---|---|
| Under $12 | Raise the daily budget 30% |
| $12 to $20 | Hold |
| $20 to $28 | Hold, cut the worst-performing creative or term |
| Over $28 | Cut the budget 30%. Two days running: pause that channel |
| Tip lines opened but under 30% paying | The ads are fine. Fix the share message and the five-tip reminder before spending more |

The last row is the one that will fire first. A tip line that stalls at two
tips is a product problem, and the fix is a nudge, not a budget.

## 6. Day one

| Time | Do |
|---|---|
| 0:00 | Section 3. Deploy, make an issue about yourself, pay, print, refund. |
| 1:00 | Make a real one: pick someone with a birthday this month, open the tip line, drop it in their group chat. This is the first sale and the first video. |
| 1:15 | Launch Meta with the screen recording and Google with the terms above. |
| 1:30 | Post the sample issue in your own feed. Message five people who organise things. |
| +4h | First read: clicks, tip lines opened, tips per line. Kill any creative under 1% click-through. |
| +8h | Second read: any tip line at five or more tips that has not paid gets a look. Is the pay button obvious once the meter is full? |
| +12h | Stripe. Write the day-one line of the ledger. Apply the rule. |

## 7. The ledger

| Day | Spend | Clicks | Tip lines opened | Paid | Revenue | COGS | Profit | Cost per sale | Referral sales |
|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |

## 8. What is deliberately not here, and what comes next

**Not here.** No accounts, no email capture, no printing service, no hard
gate on the finished issue beyond an unguessable key. The buyer's page is the
key; the tip line is a different key. Contributors never see the issue unless
the buyer shares it.

**Next, by return on an hour:**

1. **A reminder.** Forty-eight hours after a tip line opens with under five
   tips, one email to the buyer with a copy-paste nudge for the chat. This is
   the single biggest lever on the paid rate. Needs an email address at
   creation and one cron.
2. **Glossy print and post.** A print-on-demand partner with an API (Peecho
   prints saddle-stitched magazines from a PDF and ships in Australia) makes a
   $59 tier where a real newspaper arrives in the mail. Higher price, same
   marginal effort, and a physical object in the reaction video.
3. **Photo on the cover, always.** Issues with a cover photo will convert
   better and get shared more. Ask for one at creation, not just from tips.
4. **Sample issue by name.** `/api/demo?name=Dave` already personalises the
   landing-page sample. Put a name field above it so the very first thing a
   visitor does is see their mate's name on a front page.
5. **The video.** Film the first real party. Nothing else on this list matters
   as much as that clip.
