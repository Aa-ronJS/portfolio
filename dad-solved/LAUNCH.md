# Dad, Solved. Zero to profit today, $100 of ads

Written Sunday 6 September 2026, 8am Adelaide time. Today is Father's Day in
Australia. That single fact is the whole strategy: right now several hundred
thousand people have just realised they have nothing for lunch, and the only
gift they can still get is one that arrives instantly. This sells into that
window, then keeps selling every birthday after it.

**Profit, defined.** Cash received today, less ad spend, less Stripe fees. No
labour counted. The product is finished; fulfilment is a web page.

## 1. What is for sale

A personalised puzzle pack. The buyer types up to twelve clues about their dad,
sees the crossword build in front of them, pays $14 AUD, and lands on three
print-ready A4 pages: the crossword, a word search of the same answers, and the
answer key. Print at home or Save as PDF and text it.

Why it fits the brief:

- **Instant.** No shipping, no fulfilment queue, no me in the loop. Every sale
  is delivered by the browser.
- **Personal, and made by them.** The gift is their own jokes about their dad.
  Nobody is going to comparison-shop that against a $14 Etsy printable.
- **Sells at 11am on the day.** The one gift that still works when the shops
  are shut and lunch is at noon.
- **A calendar asset.** Change the title and it is a birthday, a retirement,
  Mother's Day in May, a grandparent's eightieth. The $100 today pays for the
  first test of something that runs all year.

## 2. The arithmetic, honestly

Estimates. The first hour replaces them with real numbers.

| Quantity | Estimate |
|---|---|
| Meta cost per click, AU, Sunday morning, timely creative | $0.80 to $1.80 |
| Clicks from $80 on Meta | 45 to 100 |
| Google Search cost per click, "last minute father's day gift" | $2 to $4 |
| Clicks from $20 on Google | 5 to 10 |
| Landing to purchase, panic buyer, $14, instant | 4% to 8% |
| Sales from paid traffic | 2 to 9 |
| Stripe fee per sale | about $0.54 |
| Break-even | 8 sales |

So the paid traffic alone is a coin flip against $100, with the upside coming
from the fact that the buyer makes the thing before paying: someone who has
typed ten jokes about their dad is already committed. The organic layer is
what tips it:

| Channel | Cost | Why it works today |
|---|---|---|
| Local Facebook groups: suburb buy/swap/sell, parents' groups, community pages | Free | These are where "anyone know what's open today" is being asked right now |
| A post in the personal feed with the example puzzle as the image | Free | Sunday morning, everyone is on their phone |
| r/australia and r/melbourne style daily threads, only where self-promotion is allowed | Free | Ask, do not link, until someone asks |
| Text it to five people with kids | Free | Highest conversion channel that exists |

## 3. Setup, in this order (40 minutes)

1. **Stripe Payment Link.** Product "Dad, Solved. puzzle pack", A$14, tax
   inclusive. Collect email only. After payment, redirect to
   `https://<your-host>/done/?paid=1`. Paste the link into `CONFIG.stripeLink`
   in `index.html`. The page appends `client_reference_id` from the UTM so the
   Stripe dashboard shows which channel each sale came from.
2. **Deploy.** From this folder: `npx vercel deploy --prod`. The project gets a
   `*.vercel.app` address. Good enough for today; a domain is a tomorrow problem.
3. **Meta Pixel** (optional, five minutes). Create one, paste the id into
   `CONFIG.metaPixel` on the maker page and `META_PIXEL` on the done page.
   Without it Meta cannot optimise for purchases and you will judge the day from
   Stripe alone, which is fine for $80.
4. **Vercel Web Analytics.** Toggle it on. The script tag is already in place.
5. **Walk it on your phone.** The black ribbon at the bottom must be gone.
   Fill the example, pay yourself $14, land on the pack, print it to PDF.
   Refund yourself. Only then run ads.

## 4. Meta campaign ($80)

- **Objective:** Sales if the pixel is in, otherwise Traffic.
- **Audience:** Australia, ages 25 to 55, no interest targeting. Today the
  whole country is the audience; let the creative do the filtering.
- **Placements:** Facebook and Instagram feeds and Stories only. No Audience
  Network, no Reels for a first run.
- **Schedule:** now until 2pm local, then pause. Restart 5pm to 9pm for the
  "we're seeing him tonight" crowd if the morning was profitable.
- **Budget:** $80 lifetime, not daily. Lifetime cannot overspend.
- **Creative:** one image, the example crossword screenshotted from the pack,
  with the title visible. Real product, not a mock-up. Second creative if there
  is time: a phone screen recording of typing a clue and watching the grid form.

Primary text (three variants, let Meta pick):

> Forgot Father's Day? Type ten things about your dad. Get back a crossword
> about him, ready to print in two minutes. $14, done before lunch.

> "Where he goes for one thing and comes back with nine." (8 letters.)
> Make him a crossword out of his own habits. Instant, printable, $14.

> The shops are shut and lunch is at twelve. Make him a puzzle only your
> family could solve. Two minutes, $14, print it or text it.

Headline: **A crossword about him. Ready now.**
Description: **Personalised puzzle pack, instant download, $14 AUD.**
Link: `https://<host>/?utm_source=meta&utm_medium=paid&utm_campaign=fd26`

## 5. Google Search ($20)

One campaign, Australia, today only, manual CPC, max bid $3.50, exact and phrase:

```
[last minute fathers day gift]
[fathers day gift ideas last minute]
"fathers day printable"
"personalised fathers day gift instant"
"fathers day crossword"
```

Negatives: `free, card, cards, delivery, flowers, hamper, bunnings, kmart, big w, jb hi-fi`

Ad, checked to length:

```
Headlines (30 max)
Forgot Father's Day?          (20)
A Crossword About Him         (21)
Printable In Two Minutes      (24)
$14, Instant, Personalised    (26)
Made From Your Own Clues      (24)

Descriptions (90 max)
Type ten things about your dad. Get a crossword and word search about him, ready now.  (86)
Answers included for when he gives up. Print at home or text him the PDF. $14 AUD.     (83)
```

Link: `https://<host>/?utm_source=google&utm_medium=cpc&utm_campaign=fd26`

## 6. The day

| Time (ACST) | Do |
|---|---|
| 8:00 | Section 3. Pay yourself, refund yourself. |
| 8:45 | Launch Meta and Google. |
| 9:00 | Post in five local groups and the personal feed, with the example puzzle image. Text five parents. |
| 10:00 | First read. Meta CPC, click-through rate, and Stripe. If CPC is above $2.50 cut the Google campaign and move its $20 to Meta. |
| 11:00 | Second read. Kill any creative under 1% click-through. |
| 12:00 | Peak has passed for lunch buyers. Check sales. Pause if 0 sales on 60 clicks: the page is losing people, not the ad. Look at where (Vercel Analytics). |
| 14:00 | Pause everything. Count. |
| 17:00 | If the morning was at or above break-even, restart Meta with what is left for the dinner crowd. |
| 21:00 | Stop. Fill in section 8. |

## 7. Kill criteria, and what a loss means

Stop the ads if by 11am:

- 40 clicks and no one has reached the pay button (the maker is too much
  work: cut the minimum to three clues and say so in the ad).
- Click-through under 0.7% on both creatives (the message is not landing; the
  product is fine, the hook is wrong).
- Meta rejects the ad for "Father's Day" urgency wording (unlikely, but swap to
  the second variant if so).

If the day ends at a loss, the ad money bought a working, tested product with
a conversion rate attached, twelve hours before the next birthday somebody
forgets. Rename the title, change the kicker, and it is a year-round page. The
next occasion is not a year away: every day is someone's dad's birthday.

## 8. Results

Filled in at 9pm.

| | |
|---|---|
| Meta spend, clicks, CPC | |
| Google spend, clicks, CPC | |
| Visitors who reached the pay button | |
| Sales, by client_reference_id | |
| Refunds | |
| Profit | |

## What is deliberately not here

- No account, no email capture, no server. The buyer's clues never leave their
  browser. That is a feature worth saying out loud in the copy, and it is why
  the whole thing could be built and tested in a morning.
- No hard paywall. A determined person can reach the pack page without paying.
  Someone who wants a free crossword about their dad that badly is not a lost
  sale; they were never going to be one. Adding a server to stop them would
  have cost the day.
