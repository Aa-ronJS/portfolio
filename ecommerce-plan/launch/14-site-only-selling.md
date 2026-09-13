# Selling only through the site

Written 13 September 2026. Constraint added by the founder: no founder-led
selling. Every account is won by the site, a partner link, a referral link,
a search result or an ad. `channels.py --case site|site_low|site_high`
reproduces the numbers.

## What the constraint changes

| Before | Now |
|---|---|
| Founder in industrial estates two days a week; a third of year-one accounts | Zero founder-sourced accounts |
| Paid search cheap because a phone call closed the lead (40 percent) | Paid search is self-serve: the visitor buys or does not. Cost per account roughly doubles |
| South Australia first, national at month seven | National from day one. There is no reason to stay local when nobody visits |
| Partners recruited by conversation | Partners recruit themselves on a signup page and get their links instantly |
| Onboarding on the spot: kits registered, certificate generated before you leave | Onboarding by the customer: pay, name the kit locations, see the certificate |
| Founder hours 28 a week in year one | Founder hours 13 a week: ads, content review, conversion work, packing |
| The moat was the software plus the relationship | The moat is the software plus the conversion rate of the site |

Two things do not change: the wholesale kit, the plan, the calendar and the
certificate are the same product, and packing is still physical. Someone
still puts kits in boxes. In year one that is you for about six hours a
week; from about 300 accounts it is a casual.

## The numbers

Self-serve cost per account is the load-bearing assumption. At a A$3 click
and a 2 percent direct purchase rate, plus the self-check capturing 6
percent of visitors as leads of which 12 percent buy after an automated
sequence, blended conversion is about 2.7 percent and cost per account
about A$110. At a A$5 click and weaker conversion it is A$185. At A$2.50
and a tuned page, A$80. The ad budget starts at A$600 a month and grows
with cash to A$4,600 by month twelve, A$5,500 in year two, A$7,000 in year
three.

| | Low (CAC A$185, churn 6.5%) | **Base (CAC A$110, churn 4.0%)** | High (CAC A$80, churn 3.0%) |
|---|---|---|---|
| Active accounts, end of year 1 / 2 / 3 | 198 / 548 / 846 | **401 / 1,285 / 2,262** | 579 / 2,084 / 4,063 |
| Share of new accounts from partners and referrals, year 3 | 21% | **38%** | 50% |
| Revenue, year 1 / 2 / 3 | 92k / 354k / 567k | **182k / 812k / 1.51M** | 258k / 1.26M / 2.59M |
| Acquisition spend, year 1 / 2 / 3 | 31k / 73k / 94k | **34k / 85k / 115k** | 38k / 102k / 147k |
| Profit before paying yourself, year 1 / 2 / 3 | 2k / 86k / 162k | **43k / 297k / 614k** | 75k / 492k / 1.12M |
| Your hours a week | 12 | **13** | 13 |
| Take-home a week if paid as salary, year 2 | A$1,306 | **A$3,681** | A$5,667 |
| Lowest cash balance in year one from A$15k opening (55% annual billing) | A$10.7k | **A$12.3k** | above opening |

Read against the founder-led base case (A$42k, A$190k, A$368k profit on
28, 21 and 18 hours a week):

- **Year one is a wash and years two and three are better**, because a
  national ad budget scales where sixteen hours a week in Adelaide could
  not, and because the founder's hours drop by half. The kits still pay for
  their own acquisition on day one only in the high case; in the base case
  each new account is about A$10 underwater on day one and earns it back
  in the first month of plan contribution.
- **The low case is near zero profit in year one.** A$2k on 12 hours a
  week. That is the honest cost of removing the in-person close: the whole
  business becomes a bet on the site's conversion rate and the search
  auction. It recovers in year two because the recurring base compounds,
  but year one has no cushion.
- **Churn is higher without a relationship.** Self-serve buyers choose
  monthly more often and nobody calls them at renewal. The base case
  assumes 4.0 percent flat-equivalent rather than 3.3. The renewal email,
  the certificate and the dunning flow do all the retention work, so they
  have to be excellent rather than good.

## What the site has to do now (built)

Everything below is in the app and covered by the smoke test (101 checks).

1. **A configurator at `/buy`.** Sites, vehicles, annual or monthly, the
   compliance calendar as a tick box, live price. The A$15 minimum plan
   and the monthly premium are applied in the quote.
2. **Stripe Checkout, created server-side.** One-off kit line items plus a
   recurring plan line item in one session, GST via Stripe Tax, address and
   phone collected, promotion codes allowed, the whole order and the
   partner or customer referral token carried as metadata.
3. **The account builds itself.** The `checkout.session.completed` event
   creates the customer, the kits, the calendar flag, the partner payout
   and the referral reward. If the success page loads before the event
   arrives, it fetches the session and fulfils it there. Idempotent either
   way.
4. **Self-serve onboarding.** The success page asks the customer to name
   each kit location or vehicle rego and lands them on their certificate.
   The record carries a "name my kits" link for later.
5. **Partners sign themselves up** at `/partners` and get three links on
   the spot: a buy link, a self-check link, and their portal. Payouts are
   recorded automatically; you pay them monthly by bank transfer.
6. **Customers refer** from their record page; the referred business is
   attributed and the referrer's free refill pack is logged.
7. **Terms** at `/terms`, linked from the checkout.

What is still yours to do by hand: pack, ship, click "shipped", and pay
partners monthly. Nothing in the flow needs a conversation.

## The ninety days, rewritten

No walk-ins. The work is conversion rate, traffic and retention automation.

| Weeks | Do |
|---|---|
| 1 to 2 | Name, entity, Stripe live with the webhook and Stripe Tax on, insurance bound, wholesale account, domain and server, labels. Google Business Profile as an online retailer. |
| 2 to 3 | Answer pages drafted by the content script, ten verified and published with structured data. Product feed to Merchant Center. Amazon AU and eBay AU listings with the QR insert. |
| 3 | Google Ads national on intent terms, A$20 a day; the self-check as the secondary ad destination. |
| 4 to 8 | Weekly conversion work on `/buy` and the landing page: one change a week, measured. Partner outreach by drafted email (the outreach script) to WHS consultants and trainers nationally, all pointing at the self-serve signup. |
| 9 to 13 | Ads to A$40 a day if cost per account is under A$130. Renewal and dunning emails live. First cohort activation measured; the first 30-day nudge sequence for accounts that have not scanned. |

Gate G2 becomes: **20 paid accounts through the site by week 10 at a cost
per account under A$150**, and at least five of them from a search ad
(proof the self-serve funnel converts cold traffic). Gate G4 becomes: a
partner who signed up without a conversation has produced five accounts by
month nine.

## The conversion-rate work, because it is now the job

The base case needs about 2 percent of paid visitors to buy and 6 percent
to take the self-check. Small-business B2B purchases at A$300 do not
convert cold on a first visit as often as consumer goods, so the site must
do three things a salesperson did:

- **Prove it in ten seconds**: the certificate above the fold, the scan
  demo as a ten-second video, the price in the first screen.
- **Remove the risk**: kits are yours, cancel any time, 14-day refund on
  the plan, "supplied by a TGA-listed Australian manufacturer" with the
  Code of Practice named.
- **Catch the ones who leave**: the self-check as the exit, an email
  sequence of four messages over 21 days (result, what a head contractor
  asks for, the ute-is-a-workplace fact, the offer), and a retargeting
  audience.

Measure weekly: visitors, `/buy` starts, checkout starts, paid, self-check
completions, lead-to-paid within 30 days, cost per account. Change one
thing a week. Stop rule: cost per account over A$180 for two months at a
2 percent or lower purchase rate means the page, not the budget, is the
problem; fix the page before spending more.

## Risks that are new

- **Single point of failure: the search auction.** The plan's growth is
  budget divided by CAC. If Google Ads costs move against you, growth
  slows in proportion. Partners and SEO are the hedge, and both are slower
  without a founder pushing them.
- **No feedback loop from customers' faces.** You will not hear the
  objections. The self-check answers, the cancellation reasons and the
  post-purchase survey are the substitute. Read them weekly.
- **Trust at A$300 from a new brand with no phone number on the page.**
  Keep an email address and a same-day reply. Reviews on the Business
  Profile and a visible ABN matter more than they would if you were
  standing there.
- **Fraud and chargebacks.** Stripe Radar handles most of it; the
  post-purchase onboarding step is also a natural fraud filter.
