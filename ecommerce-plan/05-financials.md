# 05 — Financials

Two halves: the benchmarks the plan is judged against, and the model for the
recommended business. `model.py` reproduces every table below; change an
assumption at the top of the file and rerun.

## Benchmarks that decide whether a small e-commerce business can work in 2026

| Metric | Benchmark | Source |
|---|---|---|
| Gross margin, private DTC brands under US$10M | 67% as booked, but 8 to 15 points lower once freight, duty, warehousing and returns are loaded | A2X 2026; Eightx Apr 2026 |
| Contribution margin after all variable costs | 15 to 20% median; under 10% risky; over 28% healthy | Level CFO Aug 2026 |
| Contribution margin after marketing, public DTC | 8 to 22% | Eightx May 2026 |
| Marketing as share of revenue | 17% public cohort; 18 to 25% "healthy"; Triple Whale median 41% | Eightx; Level CFO |
| Meta median ROAS 2025 (~35,000 brands) | 1.93x; break-even at 30% contribution margin is 3.33x | Triple Whale via Eightx |
| Blended CAC by category, US$5 to 75M brands | Beauty $61, apparel $66, supplements $61, food $53, pet $59, home $58 to 77 | Commerce Catalyst 2026 |
| First-order economics | Lose ~US$29 on a first purchase, earn ~US$39 on a repeat | SimplicityDX via K-38, Sep 2026 |
| CAC payback | Bootstrap target under 6 months; public medians 4 to 24 months by category | Eightx |
| 12-month repeat rate | 20 to 30% typical; food 30 to 35%, home 15 to 20%; under 18% is risky | Level CFO |
| Return rates | E-commerce overall 19 to 20%; apparel 25%; supplements 7%; pet 10% | NRF via Eightx; Richpanel |
| Median operating margin, public DTC FY2025 | minus 2.4%; 4 of 14 cleared 5% EBITDA | Eightx |
| Amazon vs own store | Amazon runs 6 to 12 points lower contribution margin | Eightx |
| Subscription attrition (supplements, Recharge, 20k brands) | 86.6% reach order 2, 57.6% order 3, 9.8% order 7 | Retention Side 2026 |
| B2B and replenishment churn | Replenishment 5 to 8% a month; B2B 4 to 6%; established merchants far lower (Recurly network median 4.25% *annual*) | Eightx; Recurly Jul 2026 |
| Exit multiples | Flippa e-commerce average 1.4x profit (top quartile 2.7x); Amazon-only 2.5 to 3.5x SDE; Shopify DTC 3 to 5x SDE; subscription 4 to 7x EBITDA under 5% churn | Flippa Dec 2025; CT Acquisitions 2026 |

The rule that falls out of these: a consumer product under A$60 cannot pay a
A$35 CAC at any cost multiple; A$79 needs 4x landed plus bundles and repeat;
A$120-plus hardgoods or consumables with over 30 percent repeat are where the
maths works for a solo founder on paid acquisition. The recommended business
sidesteps the problem by not using paid social at all.

## The consumer comparison (what you are not doing)

Illustrative A$30k private-label launch, one SKU at A$79 then three SKUs,
3.27x landed, A$35 CAC, 20 percent repeat by month 12, founder unpaid:

| | Value |
|---|---|
| Cash committed before first sale | A$24k |
| Lowest cash balance (second purchase order, May 2027) | minus A$17k, so ~A$47k peak funding need |
| Year-one revenue | A$116k |
| Ads | A$49k (42% of revenue) |
| Year-one accrual result | about break-even |
| Sensitivity | each A$10 of CAC swings ~A$13k; each A$10 of price swings ~A$14k; landed cost is the smallest lever |
| Orders a month to cover a A$4k founder draw at A$79 | 620 |

Source: fifth research stream, scripts retained as `cf.py` and `sens.py` in
the session scratchpad; assumptions listed in `07-sources.md`.

## The recommended business: assumptions

| Assumption | Value | Basis |
|---|---|---|
| Site kit price / wholesale | A$119 / A$58 | Comparable retail A$90 to 150; wholesale is an assumption pending Aero quote (Gate G1) |
| Vehicle kit price / wholesale | A$59 / A$32 | Same |
| Plan per site kit / per vehicle kit | A$12 / A$7 a month equivalent, billed annually | Sits between The First Aid Store's A$49 per six-month exchange and a visit service |
| Kits per account | 1.2 site, 1.6 vehicle | Trades-weighted year one; clinics and childcare are 1 to 3 site kits, 0 to 1 vehicle |
| AED consumables | 20% of accounts, A$9 a month averaged, 60% COGS | AED pads A$50 to 120, battery A$150 to 300, 2 to 5 year cycle |
| PPE add-on | 35% of accounts, A$22 a month, 45% margin | Assumption |
| Scheduled refills | 2 a year per kit at A$11 (site) / A$7 (vehicle) | Code of Practice: audit at least every 12 months, 6 to 12 for low-risk; assumption on cost |
| After-use refills | 1.5 a year per site kit at A$7; 1.0 per vehicle kit at A$5 | Assumption; this is the data the QR loop will replace |
| Parcels | 3.5 per account per year at A$9.40 postage plus A$1.90 packaging | MyPost Business Band 1 to 2, 500 g to 1 kg blend, one parcel per account |
| Payment fees | 1.75% + 30c | Shopify Payments AU |
| CAC per account | A$95 | Google Ads on intent terms (A$3 to 6 CPC, unverified for AU), partner fees, samples, travel. Founder time is not costed |
| Monthly churn | 2.5% | B2B replenishment; sensitivity runs 1.5 to 6% |
| Annual billing share | 70% | Design choice; see sensitivity |
| New accounts per month | 6, 9, 12, 15, 18, 22, 26, 30, 34, 38, 42, 46 | Founder-led, two sales days a week, partner channel from month 4 |
| Fixed costs | A$520 a month plus A$2,808 of one-offs in month one and A$1,200 in month two | Shopify, hosting, Klaviyo, Xero, insurance, ASIC, TM |
| Founder draw | A$0 in year one | See break-even table |
| Opening cash | A$15,000 | |

## Unit economics per account

| Item | AUD |
|---|---|
| Kits sold upfront: revenue / margin after goods, postage and fees | 237 / 101 |
| CAC | 95 |
| Day-one position per new account (kit margin minus CAC) | +6 |
| Recurring revenue per account per month | 35.10 |
| Ongoing goods, postage, add-on and AED COGS, payment fees | 15.11 |
| **Recurring contribution per account per month** | **19.99 (57%)** |
| Expected lifetime at 2.5% monthly churn | 40 months |
| Lifetime contribution including kit margin | ~900 |
| LTV to CAC | 9.5 : 1 |

Every new account pays for its own acquisition on day one. That is the
single most important property of this design and the reason it survives
on A$15k where a consumer brand needs A$47k.

## 12-month view (no founder salary; cash includes annual plans billed upfront)

| Month | New | Active | Kit sales | Recurring rev earned | Kit COGS | Ongoing COGS | CAC | Fixed | Accrual P&L | Net cash | Closing cash |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Oct-26 | 6 | 6 | 1,423 | 211 | 819 | 91 | 570 | 3,328 | -3,174 | -1,991 | 13,009 |
| Nov-26 | 9 | 15 | 2,135 | 521 | 1,229 | 224 | 855 | 1,720 | -1,372 | 297 | 13,306 |
| Dec-26 | 12 | 26 | 2,846 | 929 | 1,639 | 400 | 1,140 | 520 | 77 | 2,183 | 15,489 |
| Jan-27 | 15 | 41 | 3,558 | 1,433 | 2,048 | 617 | 1,425 | 520 | 381 | 2,875 | 18,364 |
| Feb-27 | 18 | 58 | 4,270 | 2,029 | 2,458 | 873 | 1,710 | 520 | 737 | 3,572 | 21,936 |
| Mar-27 | 22 | 78 | 5,218 | 2,750 | 3,004 | 1,184 | 2,090 | 520 | 1,171 | 4,497 | 26,433 |
| Apr-27 | 26 | 102 | 6,167 | 3,594 | 3,550 | 1,547 | 2,470 | 520 | 1,674 | 5,430 | 31,863 |
| May-27 | 30 | 130 | 7,116 | 4,557 | 4,097 | 1,962 | 2,850 | 520 | 2,245 | 6,370 | 38,233 |
| Jun-27 | 34 | 161 | 8,065 | 5,637 | 4,643 | 2,426 | 3,230 | 520 | 2,882 | 7,316 | 45,549 |
| Jul-27 | 38 | 195 | 9,014 | 6,829 | 5,189 | 2,940 | 3,610 | 520 | 3,584 | 8,269 | 53,818 |
| Aug-27 | 42 | 232 | 9,962 | 8,133 | 5,735 | 3,501 | 3,990 | 520 | 4,349 | 9,229 | 63,047 |
| Sep-27 | 46 | 272 | 10,911 | 9,544 | 6,281 | 4,108 | 4,370 | 520 | 5,176 | 10,195 | 73,242 |

| Year one | AUD |
|---|---|
| Revenue (kits plus earned recurring) | 116,853 |
| Contribution after CAC | 27,978 |
| Accrual result before founder pay | 17,730 |
| Net cash movement | +58,242 |
| Lowest cash balance | 13,009 |
| Active accounts at month 12 | 272 |
| MRR / ARR at month 12 | 9,544 / 114,531 |

Read the cash line carefully. About A$45k of the closing cash is annual
plan revenue not yet earned (deferred revenue). It is real cash and it funds
growth, but it is owed as service. The accrual line (A$17.7k) is the honest
year-one profit before paying yourself. Year one is a validation year with a
small profit, not a salary.

## What it takes to pay yourself

| Founder draw a month | Accounts needed at steady state |
|---|---|
| 3,000 | 176 |
| 5,000 | 276 |
| 7,000 | 376 |
| 9,000 | 476 |

At the base-case ramp you cross 276 accounts around month 12 and 376 around
month 15. A partner channel that doubles the account ramp (the x2.0
sensitivity) brings 476 forward to about month 11 and puts year-one ARR at
A$229k. That is the case for building the partner portal in month four.

## Sensitivities (year-one accrual result, lowest cash, month-12 ARR)

- **Monthly churn**: 1.5% +18.5k / 13.0k / 118.8k; 2.5% +17.7k / 13.0k /
  114.5k; 4% +16.7k / 13.0k / 108.6k; 6% +15.4k / 13.0k / 101.3k. Churn
  barely moves year one because the base is young; it dominates year three.
- **CAC per account**: 60 +28.2k; 95 +17.7k; 140 +4.3k; 200 minus 13.6k. CAC
  above about A$150 breaks the day-one self-funding property; watch it
  weekly.
- **Site plan price**: A$9 +13.1k / ARR 102.8k; A$12 +17.7k / 114.5k; A$15
  +22.4k / 126.3k; A$19 +28.6k / 141.9k. Test A$15 with clinics and childcare,
  where the certificate is worth more.
- **Site kit wholesale cost**: A$45 +22.4k; A$58 +17.7k; A$75 +11.7k; A$90
  +6.3k. Gate G1 exists because of this line.
- **Vehicle kits per account**: 0.8 +6.0k / ARR 96.3k; 1.6 +17.7k / 114.5k;
  2.5 +31.0k / 135.1k; 4.0 +53.0k / 169.3k. Fleets are the lever. A ten-ute
  plumber is worth five clinics.
- **Account ramp**: x0.5 +3.7k / ARR 57.3k; x1.0 +17.7k / 114.5k; x1.5
  +31.7k / 171.8k; x2.0 +45.7k / 229.1k.
- **Annual billing share** (set `annual_billing_share` to 0.3 in the model):
  cash still never dips below A$11k, because kit sales carry the CAC. The
  model is robust to customers preferring monthly, but the growth funding
  shrinks.

## What to track from week one

Weekly: visits, offers, accounts won, kits per account, annual share, CAC
(all acquisition spend divided by accounts won, including your travel),
reason for every no.

Monthly: active accounts, logo churn, revenue churn, ARPA, QR scans per
active kit, after-use refills shipped, days from scan to delivery, gross
margin on goods, contribution per account, deferred revenue balance, cash.

Quarterly: cohort retention by customer type, partner-sourced share of new
accounts, certificate downloads (the proxy for the value being used),
customer concentration (largest account as a share of MRR).

Stop-loss: if CAC exceeds A$150 for two consecutive months or logo churn
exceeds 4 percent a month at month six, stop adding accounts and fix the
cause before spending another dollar.
