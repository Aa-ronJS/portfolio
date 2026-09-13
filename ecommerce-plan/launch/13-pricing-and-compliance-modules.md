# Pricing and the compliance modules

Written 13 September 2026. `ecommerce-plan/pricing.py` reproduces every
table. Anchors are cited; take-rates and the conversion curve are
assumptions until the first hundred conversations replace them.

## What buyers compare you against

| Anchor | Price | Source |
|---|---|---|
| The First Aid Store kit subscription | A$49 per six-month kit exchange, about A$98 a year per kit | thefirstaidstore.com.au |
| Alsco First Aid managed rental | Fixed annual fee, quarterly visits, unpublished | alscofirstaid.com.au |
| A compliant site kit bought once | A$90 to 150 retail | First Aid Kits Australia, St John |
| Test and tag | A$3 to 9.50 an item plus a A$100 to 250 call-out; every 3 months on construction sites, 6 in factories, 12 in offices (AS/NZS 3760:2022) | TIS Electrics, Roshaa, The Local Guys 2026 guides |
| Fire equipment service | A$15 to 50 a unit six-monthly under AS 1851, or A$120 for up to five items then A$12 each | What's The Damage, Essential Fire Protection 2026 |
| Small-business WHS software | HazardCo A$49 a month flat; Safety Champion Professional from A$175 a month; SafetyCulture about A$37 a user | GetApp AU, vendor pages 2026 |
| The penalty side | On-the-spot expiation notices up to A$3,600 for a business; Category 3 offences up to A$50,000 for an individual; improvement notices with a deadline | SafeWork SA, My Business |

Two things follow. A site-kit plan at A$144 a year sits above the exchange
subscription and below a visit service, which is where a product with a
certificate and same-day refills belongs. And the adjacent obligations
(test and tag, fire, WHS software) are priced per visit or per user by
people who do not talk to each other, which is the gap the compliance
calendar fills at a flat A$14 a month.

## Structure: per kit, per business, or hybrid

Plan revenue a year and year-one contribution (after goods, postage,
payment fees, plus the upfront kit margin) for five typical account shapes:

| Account shape | A per kit (A$12 site / A$7 vehicle) | B per-business tiers (A$15 / 29 / 59) | C per business + per kit (A$19 + A$5) | D kits included, no upfront |
|---|---|---|---|---|
| Sole trader, one ute | A$84 / A$43 | A$180 / A$137 | A$288 / A$243 | A$132 / A$44 |
| Trade, workshop + 3 utes | A$396 / A$384 | A$348 / A$337 | A$468 / A$455 | A$624 / A$329 |
| Clinic, 2 rooms | A$288 / A$289 | A$708 / A$702 | A$348 / A$348 | A$456 / A$232 |
| Childcare group, 4 centres | A$576 / A$614 | A$348 / A$390 | A$468 / A$507 | A$912 / A$488 |
| Landscaper, yard + 5 utes | A$564 / A$557 | A$708 / A$699 | A$588 / A$581 | A$888 / A$481 |

Reading it:

- **Per kit (A) is right for the core buyer**, the trade with a workshop
  and utes, and it is the easiest to say out loud in a driveway. Keep it.
- **Per kit underprices the sole trader.** A$84 a year for one vehicle kit
  is A$43 of contribution, and the account costs as much to acquire and
  serve as a bigger one. Add a **minimum plan of A$15 a month (A$180 a
  year)**, which is what tier B charges the same buyer. It stops the
  cheapest accounts being the least profitable.
- **Tiers (B) overcharge clinics and undercharge childcare groups**, and
  they make every conversation a negotiation about which tier. Not for
  launch.
- **Kits included (D) is the trap** the first financial model fell into:
  more plan revenue on paper, a third less contribution in year one, and
  the cash hole that comes with it.

**Launch pricing, confirmed:** site kit A$119 and vehicle kit A$59 sold
upfront; plan A$12 a month per site kit and A$7 per vehicle kit, billed
annually, monthly at plus 15 percent; **minimum A$15 a month per account**;
AED consumables at cost plus 40 percent when shipped; PPE pack A$22 a month.

## Elasticity: is A$12 too low?

The conversion curve is assumed (1 in 8 walk-ins buys at A$12; the index
by price is a guess). Contribution per 100 prospects on the trade shape:

| Site plan / month | Vehicle plan / month | Buyers per 100 | Year-one contribution per 100 | Three-year contribution per 100 |
|---|---|---|---|---|
| A$9 | A$5 | 14.4 | A$3,995 | A$5,687 |
| **A$12** | **A$7** | **12.5** | **A$4,800** | **A$7,294** |
| A$15 | A$9 | 11.2 | A$5,514 | A$8,678 |
| A$19 | A$11 | 9.4 | A$5,700 | A$9,189 |
| A$24 | A$14 | 6.9 | A$5,315 | A$8,748 |

On that curve the plateau is A$15 to A$19 and A$12 leaves a quarter of
three-year contribution on the table. The curve is invented, so do not
reprice on it. Test it: **A$12 in trades, A$15 in clinics and childcare**
where the certificate carries accreditation weight, for the first hundred
conversations, and record every "too expensive" against the price quoted.
The register's source and industry fields make that a one-line query.

## Annual versus monthly

| | Annual upfront | Monthly (+15%) |
|---|---|---|
| Plan revenue a year, trade account | A$396 | A$455 |
| Cash on day one | A$692 (plan and kits) | A$334 (first month and kits) |
| Decisions to leave each year | 1 | 12 |
| Card-failure exposure | 1 charge | 12 charges |
| Flat-equivalent churn from the retention model | 3.0% at 85% annual share | 3.8% at 40% annual share |

Monthly earns more per account per year on paper and loses on everything
that matters: cash, churn, dunning. Quote annual. Offer monthly only when
asked, at the premium.

## Renewal increases

Annual plans, 30 days' notice, applied to 1,000 renewing accounts:

| Policy | Extra year-two plan revenue | Extra churn assumed | Net |
|---|---|---|---|
| No increase | 0 | 0 | 0 |
| CPI, about 3% | +A$9,216 | 0.5 points | +A$7,634 |
| 5% | +A$15,360 | 1.5 points | +A$10,522 |
| 10% | +A$30,720 | 4.0 points | +A$17,203 |

A CPI-linked increase every renewal, stated in the terms and in the
30-day notice, is worth having and costs almost no accounts. Ten percent
nets more in the table but the churn assumption is soft and the customers
you lose are the ones who talk. Take 3 to 5 percent, every year, quietly.

## The compliance modules

The principle: the customer already pays other people for dated
obligations they cannot keep track of. You sell the tracking and the
record, not the service. Each module is a register with intervals, a
reminder before the date, a line on the certificate, and where it makes
sense a partner who does the physical work and pays a referral fee.

| Module | What the customer pays today | Price / month | COGS | Build days | Take-rate low / base / high | Base uplift to revenue per account | Base uplift to contribution |
|---|---|---|---|---|---|---|---|
| **Compliance calendar** (test and tag, fire equipment, first-aid audits, AED service, emergency plan review: dates, reminders, record, certificate line) | Test and tag A$3 to 9.50 an item plus call-out; fire A$15 to 50 a unit six-monthly; most track nothing | A$14 | 10% | 3 | 20 / 35 / 50% | A$4.90 | A$4.41 |
| **Calendar Plus** (adds induction and SWMS register, chemical register with SDS links, licence and certificate expiry) | WHS software A$49 to 175 a month, or spreadsheets | A$29 | 12% | 6 | 5 / 15 / 25% | A$4.35 | A$3.83 |
| PPE and sun pack (already in the base model) | Ad hoc at Bunnings or a safety store | A$22 | 55% | 1 | 20 / 35 / 45% | A$7.70 | A$3.46 |
| Emergency plan and evacuation diagram (one-off A$149, annual review reminder) | A$150 to 400 from a consultant, or nothing | A$12 equivalent | 20% | 2 | 15 / 30 / 40% | A$3.72 | A$2.98 |
| Test-and-tag and fire service booking through a partner (10% referral, you keep the register) | Same providers, no register | A$3 equivalent | 0% | 1 | 15 / 30 / 40% | A$0.90 | A$0.90 |
| **All modules excluding PPE** | | | | **12** | | **A$14 base (A$3 low, A$23 high)** | **A$12 base** |

Base blended cost of goods on module revenue is 28 percent. The channel
model's agent-assisted case assumed the uplift ramping to A$14 at 40
percent cost of goods; the module table supports A$14 at 28 percent, which
is the same contribution within a dollar, so that case stands.

**What it is worth.** From the channel decomposition: the modules lever is
+A$160k of year-three profit in the agent-assisted case, more than every
other lever combined. In the low take-rate row it is about +A$35k; in the
high row about +A$260k. The whole difference is whether a third of
customers say yes to A$14 a month for the calendar. That is the question
the first twenty conversations answer.

**Order of build.** The compliance calendar is built and tested in this
commit: a register of dated obligations per customer with category
defaults (fire six-monthly, test and tag annual, and so on), a provider
field, a "done" action that resets the cycle, states on the record and
the certificate, a line in the daily due report, and a take-rate tile on
the metrics page. Calendar Plus (inductions, SWMS, chemicals, licences) is
the same engine with document attachments and a per-person register:
about six days. The emergency plan product is a template and a diagram
tool: two days. Partner booking is a referral field on the obligation and
a payout, one day.

**Pricing the calendar.** A$14 a month per business, not per item, not per
site. Flat is what makes it sayable ("fourteen dollars a month and you'll
never miss a fire service again") and it is well under the A$49 floor of
the cheapest WHS software. A$29 for Plus sits under half of HazardCo and a
sixth of Safety Champion. Neither is a per-user price, which is the thing
small businesses hate about the software incumbents.

**Sequencing.** Do not sell modules in the first ninety days. Register the
customer's fire and test-and-tag dates for free during onboarding ("while
I'm here, when was the last fire service?"), put them on the record, and
let the first reminder do the selling in month four. The take-rate
assumptions above are for the offer made at that point, to a customer who
has already seen a reminder arrive.

## What to measure

Per price point and segment: offers made, accounts won, "too expensive"
count, kits per account. Per module: take-rate on the metrics page (target
35 percent for the calendar by month nine), items per account, reminders
sent versus items marked done (the calendar is only valuable if people act
on it; below 50 percent marked done within 30 days of the reminder, the
reminder needs a phone call behind it).

Stop rules: if fewer than 15 percent of accounts take the calendar after
two reminder cycles, the price is wrong or the reminders are not landing;
test A$9 before concluding the product is wrong. If "too expensive" is
under 10 percent of nos at A$12, raise trades to A$15 in month four.
