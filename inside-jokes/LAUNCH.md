# Inside Jokes. Zero to profit in a day, and again the next day

**The brief.** Start from nothing, be in profit by the end of the day on at most
$100 of ads, and still be in profit tomorrow, and the day after. So this is not a
launch plan for a date. It is a product with demand every day of the year and a
daily rule that decides whether the ads run again.

**Profit, defined.** Cash received in the day, less that day's ad spend, less
Stripe fees. Labour is not counted, and once the setup is done there is none:
every sale is delivered by the buyer's browser.

## 1. What is for sale

A personalised puzzle pack for $19 AUD. The buyer types up to twelve inside
jokes about someone, watches the crossword build as they type, pays, and lands
on three print-ready A4 pages: the crossword, a word search of the same
answers, and the answer key. Print as many as the party needs, or Save as PDF
and send it.

Why the demand is daily, not seasonal:

- **Every day is somebody's birthday.** Roughly 70,000 Australians have one
  today, and the same tomorrow. Add anniversaries, retirements, farewells,
  hens and bucks nights, wedding tables, teacher gifts, Christmas stockings.
- **It is the last-minute gift that is still personal.** Search volume for
  "last minute gift" and "personalised gift ideas" is constant. Everything
  else in that category ships in three days. This ships in two minutes.
- **The buyer does the work before they pay.** Someone who has just typed ten
  jokes about their sister is not going to close the tab over $19. That is why
  the preview builds live and the pay button unlocks only once the grid exists.
- **Nothing to fulfil.** No printing, no postage, no support queue worth the
  name. The margin is the price minus 54 cents.

Positioning by occasion is done with a query string, so an ad for a retirement
gift lands on a page that says retirement gift: `?for=birthday`, `anniversary`,
`retirement`, `farewell`, `wedding`, `dad`, `mum`, `christmas`.

## 2. The arithmetic

Estimates until the first day replaces them. Google Search is the channel,
because the buyer has already typed the intent; Meta is the second channel
once the pixel has purchases to learn from.

| Quantity | Estimate |
|---|---|
| Google Search CPC, AU, personalised gift terms | $1.20 to $3.00 |
| Clicks from $100 | 33 to 80 |
| Landing to purchase, high-intent search, $19 | 3% to 6% |
| Sales from $100 | 1 to 5 |
| Stripe fee per sale | $0.54 |
| Break-even | 6 sales on $100, or one sale per $18.46 of spend |

So at $100 a day, day one is a coin flip. The plan does not spend $100 a day.
It spends $30 to $40 a day on the exact-match terms, where the intent is
highest and the CPC lowest, and it moves the budget toward whatever converts.
Break-even at $35 a day is two sales. The daily rule in section 6 is the whole
business: spend follows the cost per sale, not the calendar.

The organic layer costs nothing and compounds: a share button on the pack, the
pack's own footer, and eight occasion pages that Google can index. None of
those is needed for day one. All of them are why day thirty is better than day
one.

## 3. Setup, in this order (45 minutes, once)

1. **Stripe Payment Link.** Product "Inside Jokes puzzle pack", A$19, tax
   inclusive, collect email only. After payment redirect to
   `https://<host>/done/?paid=1`. Paste into `CONFIG.stripeLink` in
   `index.html`. The page adds `client_reference_id` from the UTM so each sale
   in Stripe is labelled with its channel and occasion.
2. **Deploy.** From this folder: `npx vercel deploy --prod`. A `*.vercel.app`
   address is fine for the first week. Buy a domain when it has paid for one.
3. **Google Ads conversion.** One conversion action, "Purchase", value 19, on
   the done page. Set `GADS` on `done/index.html` when created, or judge from
   Stripe alone for the first few days. Stripe is the truth either way.
4. **Meta Pixel.** Optional on day one. Paste the id into `CONFIG.metaPixel`
   and `META_PIXEL`. It records purchases now so that a Meta campaign in week
   two has something to optimise toward.
5. **Vercel Web Analytics.** Toggle on. The tag is already in place.
6. **Walk it.** Ribbon gone. Fill the example, pay yourself $19, print the
   pack to PDF, refund yourself. Try `?for=retirement` and check the headline
   changes. Then, and only then, ads.

## 4. Google Search, always on

- **Structure:** one campaign, one ad group per occasion, so the ad, the
  keyword and the landing page all say the same word.
- **Location:** Australia, presence only. Add New Zealand in week two if
  Australia converts; nothing on the page is country-specific except the
  currency.
- **Bidding:** manual CPC, max $3, for the first two weeks. Switch to
  maximise conversions only after 30 recorded purchases.
- **Budget:** $35 a day to begin. Section 6 moves it.
- **Schedule:** all day. Late evening is when people remember.

Ad groups and keywords, exact and phrase only:

```
birthday      [personalised crossword]  [custom crossword puzzle]  [crossword gift]
              "birthday crossword personalised"  "make a crossword about someone"
              "unique last minute birthday gift"
retirement    [retirement crossword]  "funny retirement gift personalised"
              "retirement gift ideas colleague"
farewell      [farewell crossword]  "leaving gift for colleague funny"
              "farewell gift ideas coworker"
anniversary   [anniversary crossword]  "personalised anniversary gift last minute"
wedding       [wedding crossword]  "wedding table games printable personalised"
dad           "personalised gift for dad who has everything"  "funny gift for dad printable"
mum           "personalised gift for mum last minute"  "funny gift for mum printable"
```

Negatives, campaign level:

```
free, template, maker software, app, download crossword, newspaper, nyt,
times crossword, answers today, solver, clue meaning, jobs, course
```

Ad, birthday group. Every headline is 30 or under, every description 90 or
under (checked by the script at the end). Other groups swap the occasion word.

```
Headlines
A Crossword About Them          (24)
Made From Your Inside Jokes     (27)
Ready To Print In 2 Minutes     (27)
$19, Personalised, Instant      (26)
Answers Included                (16)
Print As Many As You Like       (25)

Descriptions
Type ten inside jokes about them. Get a crossword and word search back, ready to print.  (87)
A personalised gift you cannot buy twice. Print at home or send the PDF. $19 AUD.           (80)
```

Final URL per group: `https://<host>/?for=birthday&utm_source=google&utm_medium=cpc&utm_campaign=ij&utm_content=birthday`

## 5. Meta, from week two

Not on day one. Meta needs purchase events to find buyers, and it needs a
video: a screen recording of someone typing "Where he goes for one thing and
comes back with nine" and the grid building. That recording is the whole ad.
Objective Sales, Australia, 25 to 60, no interests, $20 a day, the same daily
rule as Google. Meta finds the gift-buyer before they know they are one; Google
catches them once they do. Both together is the business.

## 6. The daily rule

Every morning, one number from Stripe and one from Ads: yesterday's sales and
yesterday's spend. Cost per sale is spend divided by sales.

| Cost per sale yesterday | Today |
|---|---|
| Under $10 | Raise the daily budget 30% |
| $10 to $15 | Hold |
| $15 to $18 | Hold, and cut the worst search term |
| Over $18.46 | Cut the budget 30%. Two days in a row over: pause the group that did it |
| No sales on 40 clicks | Pause. The page lost them; read the analytics for where before spending again |

That is it. It fits on a sticky note and it makes the answer to "is it
profitable tomorrow" mechanical: the ads run tomorrow because they paid for
themselves today, and only then.

## 7. Day one, hour by hour

| Time | Do |
|---|---|
| 0:00 | Section 3. Pay yourself, refund yourself. |
| 0:45 | Build the campaign per section 4. Launch with the birthday, retirement and farewell groups only; the rest tomorrow. |
| 1:00 | Post the example pack, as an image, wherever you already have an audience. Text it to five people with a birthday coming. No ad spend, real conversions. |
| +3h | First read. Impressions, CPC, search terms. Any term that is a crossword solver or a newspaper becomes a negative. |
| +6h | Second read. If any group has 15 clicks and no one reached the pay button, pause it. |
| +10h | Stripe. Fill in the day-one line of section 8. Apply the daily rule for tomorrow's budget. |

## 8. The ledger

One line per day. This table is the business.

| Day | Spend | Clicks | Sales | Revenue | Fees | Profit | Cost per sale | Tomorrow's budget |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |

## 9. What is deliberately not here, and what comes next

**Not here.** No account, no email capture, no server, no hard paywall. The
buyer's clues never leave their browser, which is worth saying in the copy and
is why the whole thing was built and tested in a morning. A determined person
can reach the pack without paying; they were never a sale.

**Next, in order of return on an hour:**

1. A share line on the pack page ("Make one about someone else") so every
   printed puzzle carries the address. Free traffic from every sale.
2. Eight static occasion pages at `/for/birthday` and so on, same page with the
   occasion copy baked in, so Google indexes them. The paid keywords above are
   also the organic ones.
3. A second price. The same pack for a wedding table or an office farewell is
   printed forty times and is worth more than $19. "Event pack" at $39 with a
   large-print version is one more Stripe link.
4. A video ad, then Meta.

## Appendix: ad copy length check

```bash
python3 - <<'PY'
for s in ["A Crossword About Them","Made From Your Inside Jokes","Ready To Print In 2 Minutes","$19, Personalised, Instant","Answers Included","Print As Many As You Like"]:
    print(len(s), "OK" if len(s) <= 30 else "TOO LONG", s)
for s in ["Type ten inside jokes about them. Get a crossword and word search back, ready to print.",
          "A personalised gift you cannot buy twice. Print at home or send the PDF. $19 AUD."]:
    print(len(s), "OK" if len(s) <= 90 else "TOO LONG", s)
PY
```
