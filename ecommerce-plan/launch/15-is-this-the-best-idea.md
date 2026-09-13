# Is this the best idea, or the first one?

Written 13 September 2026, in answer to the founder's question.

## Straight answer

It was the best idea I could defend under the constraints you gave at the
start: A$15 to 40k, no design or manufacturing background, Australia,
selling in person in Adelaide, wanting a durable business. It was not the
product of an exhaustive search. The research examined seventeen
categories and ten concrete products; the compliance-replenishment idea
was a synthesis of two streams that independently rated "niche B2B
consumables" the best skill fit. The first stream also flagged that this
category had the thinnest evidence base of its top five. It won on fit,
cash profile and defensibility, not on proven demand.

Since then you have changed the constraints twice: build capacity is
unlimited (Claude Code), and you will not sell in person or by phone. The
second change removes the single strongest argument for the original pick,
which was that a WHS-literate analyst walking into a workshop with a
certificate on a tablet would close one in eight. A different set of ideas
becomes competitive when the site has to do the selling, so the question
deserves a fresh score, not a defence.

## What "best" means now

| Criterion | Why it matters under the new constraints |
|---|---|
| Self-serve buyability | People must search for it, land, and buy without a conversation. Trust barrier at the price point matters as much as demand |
| Unit economics against a self-serve CAC of A$110 to 185 | First-order margin plus early recurring contribution must cover it |
| Recurrence | Compounds without selling effort; the only thing that makes year three bigger than year one |
| Software as the moat | The one input you have in unlimited supply |
| Physical burden | No selling was the request; packing 40 parcels a week is the next thing you will not want to do |
| Regulatory friction | Reseller-level only |
| Capital and inventory risk | A$15 to 40k, no second purchase order trap |
| Evidence | Does demand exist in search data, incumbents' revenue, or a working competitor |

## The re-score (1 to 5, higher is better; weights in the header)

| Idea | Self-serve (×3) | Economics vs CAC (×3) | Recurrence (×2) | Software moat (×2) | Low physical burden (×2) | Low regulation (×1) | Low capital (×1) | Evidence (×2) | **Weighted** |
|---|---|---|---|---|---|---|---|---|---|
| A. First-aid kit plan as built (kits + refills + certificate) | 3 | 3 | 4 | 4 | 2 | 4 | 4 | 3 | **50** |
| B. **The compliance shop**: A plus AEDs, fire equipment, signage and PPE drop-shipped from Australian distributors, the compliance calendar, and AI-generated compliance documents as products and lead magnets | 4 | 4 | 4 | 5 | 3 | 4 | 4 | 3 | **63** |
| C. AI-generated compliance documents alone (SWMS, emergency plan, first-aid risk assessment; digital, no goods) | 4 | 3 | 3 | 5 | 5 | 3 | 5 | 4 | **60** |
| D. Compliance calendar SaaS alone (no goods) | 2 | 2 | 4 | 5 | 5 | 5 | 5 | 2 | **48** |
| E. AED bundles with a consumables plan, drop-shipped | 4 | 4 | 2 | 3 | 4 | 3 | 4 | 4 | **56** |
| F. 3D-printing consumables for Australia | 5 | 2 | 4 | 3 | 1 | 5 | 2 | 3 | **50** |
| G. Dog health consumables on subscription | 3 | 2 | 5 | 2 | 2 | 3 | 2 | 4 | **46** |
| H. Aging-in-place curation | 3 | 2 | 2 | 2 | 2 | 3 | 3 | 3 | **39** |

The scores are judgement, not measurement; they are here so you can argue
with the weights. Two things are robust to any reasonable weighting:

1. **The original idea as built (A) is mid-table under the new
   constraints.** Its weaknesses are exactly the ones the constraint
   change exposed: a considered A$300 first purchase from an unknown brand
   with no one to call, modest search volume for the specific intent, and
   parcels.
2. **Widening it (B) beats replacing it.** Everything built still applies:
   the register, the certificate, the calendar, the partner and referral
   machinery, Stripe, the metrics. What changes is the catalogue and the
   entry points. More products means more buying keywords ("defibrillator
   for workplace", "fire blanket kitchen", "first aid sign", "SWMS
   template") and a higher average order; drop-shipping AEDs and fire
   equipment from the distributor means the high-value orders never touch
   your bench; the AI documents are 95 percent margin, self-serve by
   nature, and the best lead magnet in the category.

## The two ideas that only exist because of Claude Code

**AI-generated compliance documents (C, folded into B).** Every trade
doing high-risk construction work needs a Safe Work Method Statement per
activity, and every business needs an emergency plan and a first-aid needs
assessment. Today they buy templates: SWMS Pack sells one for A$39 or a
trade's set from A$179; makeswms offers unlimited generated SWMS for A$29
a month; SafetyDocs sells a library; Tradify bundles a form. So demand is
proven and priced, and a working competitor already generates them. What
you can do that they do not: generate a site-specific document from a
short questionnaire, tie it to the customer's real kit register and
calendar, and put it on the same certificate. Ten days to build with the
API, zero stock, zero packing, and it converts a A$0 self-check visitor
into a A$39 to 179 customer on the spot. The risk is liability for
document quality: every document carries a review step and a disclaimer,
and the first hundred are read by you.

**A compliance calendar that sells itself (D, folded into B).** On its own
it is a hard cold sale (HazardCo at A$49 a month is the floor and it is a
known brand). Attached to a kit order it is a tick box at A$14. Keep it as
a module, not a business.

## What I would not do

- **Replace the product with AED retail (E).** It scores well on
  economics and self-serve, but it is a crowded, price-transparent market
  (Defibshop, Priority First Aid, St John, a dozen others), recurrence is
  weak, and you would be one more shop. As a category inside B it adds
  A$300 to 600 of margin per order and a reason for the calendar.
- **Chase consumer categories (F, G, H).** They need paid social or a
  brand, both of which the research showed are the wrong tools for a
  founder who will not be on camera or in the room.
- **Pick between A, B and C by argument.** The site can measure it.

## The honest way to decide: a three-week, A$1,500 test

Because the site does the selling, you can run three storefronts at once
and let cost per account choose. Same domain, three landing pages, three
ad groups, A$500 each over three weeks, national.

| Test | Page | Ad terms | What counts as a win |
|---|---|---|---|
| 1 Kit plan (A) | The current `/buy` | first aid kit restock, workplace first aid kit, vehicle first aid kit | Paid accounts; cost per account under A$150 |
| 2 AED with management (E as a category of B) | A bundle page: AED plus cabinet, signage, pads and battery managed, calendar included | defibrillator for workplace, buy AED Australia, heartsine price | Orders or "request a quote" leads with phone; cost per lead under A$60 |
| 3 Documents (C) | A generator page: enter trade and site, get a SWMS or emergency plan, pay A$39 to 179 | swms template, emergency plan template, first aid risk assessment template | Paid documents; cost per sale under A$40 and 20 percent take-up of the calendar or kit offer on the thank-you page |

At the end of week three you have three real cost-per-account numbers
instead of my scores. Then build the shop around whichever converts,
keep the others as categories, and only then order stock. Everything
already built serves all three outcomes.

## What the first plan got right and wrong

Right: the diagnosis that paid-social consumer e-commerce is the wrong
game in 2026; the cash structure (goods upfront, plan annual); the
certificate as the product; software as the moat; the validation gates.

Wrong, in hindsight: choosing before knowing how you wanted to sell. The
in-person close was doing more work in the model than it should have, and
I should have asked earlier whether you wanted to be the salesperson. The
site-only version of the plan is more honest about what the business
depends on: the conversion rate of a page you can change every week.
