# Churn and retention

Written 13 September 2026. `ecommerce-plan/retention.py` reproduces every
table; it models the four ways an account leaves separately, then plugs the
result into `channels.py`. Arithmetic on stated assumptions, not a forecast.

## The correction first

The original twelve-month model and the channel model both used a flat 2.5
percent monthly churn. Building churn up from its causes gives **3.3
percent** in the base case. The channel model now uses that, and the
earnings figures in `10-partners-referrals-and-earnings.md` have been
revised down accordingly: base-case year-three profit is A$368k, not
A$398k, and active accounts at month 36 are about 2,000, not 2,200. The
shape of the business does not change. The size of the retention job does.

## How an account leaves

| Cause | How it behaves | Base assumption | Benchmarks |
|---|---|---|---|
| **Business closes** | Nothing you can do; a floor under everything | 9% of accounts a year | ABS exit rate 13.9% (2024-25) across all businesses; employing businesses have a 61% three-year survival rate, which includes young businesses that fail fast; established employing trades are lower, so 9% is the working floor |
| **Annual plan not renewed** | Decided once a year, at renewal, by someone who has to notice the invoice | 80% renew | SMB B2B annual churn 15 to 25% (Churn Buster, Livmo, 2026); legally mandated products sit at the better end |
| **Monthly plan cancelled** | Can happen any month; most happens early | 4% a month in the first 90 days, 2.5% after | SMB self-serve subscriptions 3 to 7% a month; 44% of subscription cancellations land in the first 90 days (Eightx, Swell) |
| **Card fails and nobody chases it** | Silent, involuntary, and the most fixable | 3% of charges fail; dunning recovers 60% | Involuntary churn is 20 to 40% of total; smart retries recover ~35%, a full dunning stack 55 to 65% (Recurly, Churn Buster, 2026) |

Annual share of plans: 70 percent base (50 low, 80 high).

## What that produces

Survival of a cohort of 100 accounts:

| Case | Month 3 | Month 6 | Month 12 | Month 13 (after first renewal) | Month 24 | Month 36 | Flat-equivalent monthly churn | Lifetime value per account (36 mo) |
|---|---|---|---|---|---|---|---|---|
| Low | 85 | 75 | 45 | 43 | 22 | 11 | 6.1% | A$407 |
| **Base** | **93** | **89** | **66** | **65** | **45** | **31** | **3.3%** | **A$548** |
| High | 96 | 93 | 78 | 77 | 62 | 49 | 2.0% | A$635 |

Notice the shape. Monthly plans bleed steadily; annual plans hold until
month 12 and then a fifth of them leave at once. Month 12 is the cliff, and
it is scheduled, which means it can be worked.

Where the base-case losses come from over 24 months:

| Cause | Of 100 accounts | Share |
|---|---|---|
| Annual plan not renewed | 25 | 37% |
| Business closed | 17 | 25% |
| Monthly plan cancelled | 14 | 21% |
| Card failed, not recovered | 11 | 16% |
| **All causes** | **55** | |

A quarter of churn is outside your control. Three quarters is not, and the
biggest single piece is the annual renewal.

## What each lever is worth

Each row changes one assumption in the base case, converts it to the flat
equivalent, and reruns the three-year channel model.

| Change | Monthly churn | Active at month 36 | Profit Y2 | Profit Y3 | Year-3 difference |
|---|---|---|---|---|---|
| Base case | 3.27% | 2,004 | 190,012 | 369,008 | |
| Annual renewal 80% → 85% (notice, certificate, a phone call) | 2.88% | 2,104 | 193,969 | 383,281 | **+14,273** |
| Annual renewal 80% → 70% (silent renewals, no contact) | 4.09% | 1,817 | 182,607 | 342,321 | −26,686 |
| Annual share 70% → 85% (push annual harder) | 3.03% | 2,064 | 192,418 | 377,647 | +8,640 |
| Annual share 70% → 40% (monthly becomes the default) | 3.79% | 1,881 | 185,374 | 351,802 | −17,206 |
| No dunning at all | 3.85% | 1,869 | 184,861 | 350,032 | −18,976 |
| Full dunning stack (65% recovered) | 3.22% | 2,017 | 190,525 | 370,839 | +1,832 |
| First-90-day monthly churn 4% → 2% (first scan inside 30 days) | 3.22% | 2,018 | 190,561 | 370,969 | +1,961 |
| Closure floor 9% → 12% a year (recession) | 3.54% | 1,939 | 187,801 | 359,598 | −9,409 |
| **Everything in your control done well** | **2.53%** | **2,200** | **197,682** | **396,336** | **+27,329** |

Reading it:

- **The annual renewal is the whole game.** Five points of renewal rate is
  worth A$14k of year-three profit; ten points the wrong way costs A$27k.
  Nothing else comes close. The renewal is one email, one certificate and
  one phone call per account per year, and the app already schedules the
  first two.
- **Dunning is cheap insurance, not upside.** Having it is worth A$19k a
  year by year three versus not having it; going from decent to excellent
  is worth A$2k. Stripe's built-in smart retries and reminder emails are
  the decent version. Turn them on tomorrow and stop thinking about it.
- **Annual billing protects you twice**: cash up front, and a customer who
  decides once a year instead of twelve times. Every point of annual share
  is worth about A$570 of year-three profit. This is why the offer sheet
  quotes annual and mentions monthly.
- **The early cliff on monthly plans is real but small** because monthly is
  only 30 percent of the book. It matters more if annual share slips.
- **The closure floor is the one you cannot fix**, and it is a quarter of
  churn. It argues for spreading across industries rather than going all-in
  on residential trades, which fail faster in a downturn.

## The retention system (what the app does, and what you do)

| When | What happens | Who | Effect on |
|---|---|---|---|
| Day 0 | Kits registered on the spot, certificate generated before you leave, welcome email with the record link | You, app | Activation |
| Day 1 to 30 | First scan. Ask for it: "scan the ute kit today so you've seen it work." An account that scans in the first month has used the product; one that has not is a kit buyer with a subscription attached | You | First-90-day churn |
| Every use | Refill ships the same day; the customer gets "shipped" with tracking. Speed here is the product | App, you | Voluntary churn |
| Every 6 months | Scheduled refill pack arrives unasked, with a note: "your kits are current to [date]" | App | Perceived value |
| 30 days before renewal | Renewal email (required by the plan terms and the ACCC's subscription priorities): what renews, the price, the certificate attached, one line on what was shipped this year | App (Stripe or Klaviyo flow) | Renewal rate |
| 7 days before renewal | A phone call to any account that has not scanned in six months or has more than three kits. Five minutes. "Anything changed? More utes? Fewer?" | You | Renewal rate, kits per account |
| Renewal day | Card charged; if it fails, Stripe retries over 14 days and emails; the record shows "renewal pending" not "lapsed" | Stripe | Involuntary churn |
| Renewal + 14 days, still unpaid | You call. Most of these are a new card or a changed bookkeeper | You | Involuntary churn |
| Cancellation | One question, written down: why. Offer a kit-only relationship (they keep the kits, you keep the record dormant, refills at list price). Half of cancellations are "we don't use it", which the scan data will contradict or confirm | You | Reason data, win-back |
| Quarterly | Cohort retention by month of signup, by source (partner accounts should churn less), by industry, by kits per account | You, export CSV | Where to sell next |

The two numbers to watch from month one: **share of accounts that scanned
inside 30 days** (target 70 percent; below 50 percent means the after-use
loop is not being adopted and the plan is a subscription in name) and
**renewal rate by cohort** once the first accounts reach month 12 (target
85 percent; the base case assumes 80).

## Measures and stop rules

Monthly: logo churn (accounts lost divided by accounts at start), revenue
churn (harder to see the loss of a ten-kit account in logo churn), 30-day
activation rate, open refill requests older than two business days,
involuntary versus voluntary split.

Quarterly: cohort curves as above; kits per account trend; reasons for
cancellation, grouped.

Stop rules: activation under 50 percent at month three (fix the scan
experience and the day-one ask before selling more); logo churn over 4
percent a month for two consecutive months after month six (Gate G3 from
the plan); first-cohort renewal under 70 percent (the offer is not worth
A$144 a year to that segment; reprice or change the segment before the
second cohort renews).
