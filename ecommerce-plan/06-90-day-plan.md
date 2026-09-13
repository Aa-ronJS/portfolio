# 06 — The first 90 days

> **Superseded in part, 13 Sep 2026.** The founder has ruled out founder-led
> selling. Walk-ins, phone calls and in-person registration below no longer
> apply; see `14-site-only-selling.md` for the plan that replaces them. The
> setup items (name, entity, Stripe, insurance, wholesale, labels) stand.

Assumes a decision in the week of 15 September 2026 and roughly 20 to 25
hours a week. Each week has a deliverable you can show someone. Gates from
`01-recommendation.md` are marked.

## Weeks 1 to 2: set up and get the price

| Day | Do | Output |
|---|---|---|
| 1 | Register the Pty Ltd, ABN, GST (and Deferred GST). Open the business bank account. Register the business name and the `.com.au` | Entity exists |
| 1 | Email Aero Healthcare's reseller team and one alternative (Brenniston, FastAid, Trafalgar) for trade pricing on: a Code of Practice site kit, a vehicle kit, six-monthly refill packs per kit type, after-use modules, and OEM AED pads and batteries for the five most common AED models in Australia | Quotes requested |
| 2 | File TM Headstart, classes 10 and 42, on the working name. Run the free IP Australia search first | Filed |
| 2 | Get two public and products liability quotes (upcover, Sprintlaw, BizCover) | Quotes |
| 3 to 5 | Write the offer on one page: what is in a site kit, what the plan includes, prices, the certificate. Write the ten discovery questions | Offer v1 |
| 6 to 10 | Ten discovery conversations: three trades you already know, two clinic or practice managers, two childcare directors, three cold (walk in with nothing to sell). Record every answer | Interview notes |
| 10 | **Gate G1**: trade pricing gives 45 percent or better gross margin at A$119 / A$59 and refill packs under A$12. If not, reprice or stop | Go / no-go |

## Weeks 3 to 4: build the smallest thing that produces a certificate

Build in this order and stop when each works on a real kit sitting on your
desk:

1. Kit register: table of kits, each with a QR code, location, contents
   profile, expiry dates per line item seeded from the wholesaler's pack list.
2. QR landing page: scan, see the kit, tap what was used (icons), submit.
   Creates a refill order in Shopify via draft order or a queued job.
3. Expiry engine: nightly job that finds kits due for a scheduled refill or
   an AED consumable due within 45 days, creates the order, emails the customer.
4. Certificate: one PDF per customer, listing every kit, last and next check,
   items replaced, referencing the model Code of Practice and the SA WHS
   Regulations 2012.
5. Shopify Basic store: two kit products, two plan products (annual by
   default, monthly at plus 15 percent), AED consumables as a plan product,
   PPE pack as a subscription product.

Also this fortnight:

- Order 10 site kits and 15 vehicle kits plus refill packs. Label them.
- Photograph the kits at home (white background), and the certificate on a
  tablet.
- Landing page: the certificate first, the after-use scan second, the kits
  third. One call to action: "Get compliant this week".
- Google Ads: one campaign, South Australia only, A$20 a day, exact and
  phrase match on "first aid kit restock", "workplace first aid kit",
  "vehicle first aid kit", "AED pads", "first aid kit compliance". Negative
  match "course", "training", "free".
- Klaviyo: welcome, kit registered, refill shipped, certificate ready.

## Weeks 5 to 8: twenty paying accounts

- Two sales days a week in industrial estates: Lonsdale, Wingfield,
  Edinburgh, Pooraka, Regency Park, Melrose Park. Ten visits a day, sample
  kit and tablet in hand, playbook from `03-go-to-market.md`.
- One day a week on clinics and childcare by phone and email, offering to
  drop kits in person.
- Every buyer: register their kits on the spot, generate their certificate
  before you leave, ask for two names.
- Every non-buyer: one question, "what would have made this a yes today?",
  written down.
- List the two kits on Amazon AU and eBay AU with a QR insert that activates
  a free 30-day plan.
- Weekly: update CAC (all spend including your fuel, divided by accounts),
  kits per account, annual share.
- **Gate G2 at week 8**: 20 paying accounts, at least 10 on annual. If not,
  read every "no", change one thing about the offer, and run to week 12. If
  it fails again, move to the fallback in `01-recommendation.md`.

## Weeks 9 to 13: make it repeatable

- Fix the three most common complaints from the first 20.
- Publish five content pages, structured data included, each answering one
  question buyers actually type: what a workplace first-aid kit must contain
  in SA; how often to check a first-aid kit; vehicle first-aid kit
  requirements for tradies; AED maintenance schedule and pad expiry; ACECQA
  first-aid requirements for childcare.
- Submit the product feed to Google Merchant Center; add the Shopify
  ChatGPT discovery settings; check the store appears in ChatGPT product
  discovery.
- Two posts a week on LinkedIn with real anonymised findings from the
  register (share of kits with expired items at first scan, most-used items).
- Partner conversations: three WHS consultants, three bookkeepers, one
  association (Master Builders SA or HIA SA). Offer: the portal (even if it
  is a shared view for now) and 15 percent of first-year plan revenue.
- First renewal notice flow (30 days out) and dunning with smart retries.
- Month-3 review: accounts, churn, kits per account, CAC, and whether the
  after-use scan is being used. Decide the month 4 to 6 plan on that.

## What "done" looks like at day 90

- 35 to 50 paying accounts, most in Adelaide, at least half on annual.
- A working register, QR after-use loop, expiry engine and certificate.
- CAC under A$120 including your travel.
- One partner sending referrals.
- A written list of everything the first customers said, and one offer
  change made because of it.
- Cash at or above where you started.
