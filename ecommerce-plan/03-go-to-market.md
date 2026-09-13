# 03 — Go-to-market

## Ideal customer profile

Year one, in order of priority:

1. **Trades with vehicles** in greater Adelaide: plumbing, electrical,
   building, landscaping, HVAC, pest control. Two to fifteen staff. One site
   kit plus one kit per ute. Buyer is the owner or the office manager. Pain:
   they get asked for evidence at head-contractor inductions and by their
   insurer, and the kits in the utes are never right.
2. **Allied-health clinics and dental** (multi-room, sometimes multi-site).
   Buyer is the practice manager. Pain: accreditation audits.
3. **Childcare and early learning centres.** ACECQA requirements; buyer is
   the centre director; multi-centre groups are the prize.
4. **Hospitality and small manufacturers.** Burns modules, eyewash; buyer is
   the owner.

Who to avoid in year one: mining and large construction (Alsco territory,
tender processes), anyone wanting on-site visits, single-kit home offices.

## The offer

| Component | Price (ex GST) | Notes |
|---|---|---|
| Site kit (Code of Practice compliant, QR-labelled) | A$119 upfront | Wholesale A$58 assumed, quote needed. Comparable retail A$90 to 150 |
| Vehicle kit (QR-labelled) | A$59 upfront | Wholesale A$32 assumed |
| Replenishment plan, per site kit | A$12 a month equivalent, A$144 a year billed annually | Two scheduled refill packs, unlimited after-use refills (fair use), expiry tracking, audit log, annual certificate |
| Replenishment plan, per vehicle kit | A$7 a month equivalent, A$84 a year | Same |
| AED consumables plan | Pads and battery replaced before expiry, billed at shipment at cost plus 40 percent | A$50 to 120 pads, A$150 to 300 battery, every 2 to 5 years |
| PPE and sun consumables pack | From A$22 a month | Gloves, sunscreen (SPF 50+, TGA-listed brand), earplugs, eyewash; outdoor trades |
| Monthly billing | Plus 15 percent | Annual is the default; monthly is offered, not promoted |

Positioning line to test: *"Your first-aid kits, always compliant, never
another visit."* The thing being sold is the certificate and the absence of a
job, not the bandages.

Benchmarks the price sits against: The First Aid Store charges A$49 per
six-month kit exchange; Alsco charges an undisclosed fixed annual fee for
quarterly visits; a compliant kit alone retails at A$90 to 150.

## The software (the moat)

Build order, all before the first sale except item 5:

1. **Kit register**: each kit has a QR code, a location, a contents profile
   (low-risk office, trade vehicle, remote, burns, eyewash), and expiry dates
   per line item seeded from the pack list.
2. **After-use loop**: scan the QR, tap what was used (pictures, not text),
   a refill is queued and ships the same day. This is the feature nobody
   else has and it generates usage data.
3. **Expiry engine**: schedules the two refill packs per year and the AED
   pad and battery shipments; sends the reminder to the customer with what
   is shipping and why.
4. **Compliance record and certificate**: a page per customer showing every
   kit, last check, next check, items replaced, plus a PDF certificate that
   references the model Code of Practice and the state WHS regulation. This
   is what the customer forwards to an inspector, head contractor or insurer.
5. **Partner portal (month 4 onwards)**: a WHS consultant or bookkeeper sees
   all their clients' compliance states and gets a referral fee.

Stack: Shopify Basic for checkout, subscriptions and invoicing; a small
Node or Python service for the register, expiry engine and certificates
(Postgres, hosted on Vercel or Fly); Klaviyo for the customer messaging;
Xero for accounting; MyPost Business for labels. Do not build a custom
checkout. Build the parts Shopify does not have.

## Channel plan by phase

### Phase 0, weeks 1 to 4: supply, build, and the first ten conversations

- Get trade pricing from Aero Healthcare and one alternative (Brenniston,
  FastAid or Trafalgar). Gate G1.
- Build items 1 to 4 above. Ship the simplest version that generates a
  certificate.
- Ten face-to-face or phone conversations with trades and clinic managers
  you can reach through existing contacts. Ask what they do today, what it
  costs, who asks them for evidence, and what they would pay. Do not sell.

### Phase 1, weeks 5 to 12: 20 paying accounts, in person, in Adelaide

- **Founder-led direct sales.** Industrial estates (Lonsdale, Wingfield,
  Edinburgh, Pooraka), walk-in with a sample kit and the certificate on a
  tablet. Ten visits a day, two days a week. Expect 1 in 8 to buy on the
  spot when the offer is kits plus an annual plan for less than a visit
  service costs.
- **Warm referrals.** Every buyer is asked for two names on the day.
  Referrer gets a free refill pack.
- **Google Ads on intent terms**, A$15 to 25 a day, South Australia only:
  "first aid kit restock", "workplace first aid kit compliant", "vehicle
  first aid kit", "AED pads replacement". These are buyers, not browsers.
  Landing page shows the certificate, not the kit.
- **Amazon AU and eBay AU listings** for the kits with a QR insert that
  activates the free 30-day plan trial. eBay AU has no transaction fees for
  sellers under A$25k a year from May 2026. This is demand capture and review
  velocity, not the main channel.
- Gate G2 at week 8.

### Phase 2, months 4 to 6: repeatability

- **Partner channel design.** Three partner types, one deal each:
  - WHS consultants and safety trainers (they audit and find expired kits
    every week; give them the portal and 15 percent of first-year plan
    revenue).
  - Bookkeepers and small-business accountants (they see every client; a
    referral fee per account).
  - Industry associations and buying groups: Master Builders SA, HIA SA,
    MTA SA, NECA SA, Australian Dental Association SA branch. Member offer.
- **Content that gets cited.** One authoritative page per question a buyer
  types into Google or ChatGPT: what must be in a workplace first-aid kit in
  SA, how often to check, vehicle kit requirements, AED maintenance
  schedule, ACECQA first-aid requirements. Structured data, short answers
  first, then detail. This is the AI-search work; it compounds and it is
  cheap.
- **Email and SMS flows** (Klaviyo): onboarding, after-use confirmation,
  refill shipped, certificate renewed, annual renewal 30 days out, dunning
  with smart retries. Flows, not campaigns.
- **Founder-led LinkedIn**, two posts a week: real anonymised compliance
  findings (what percentage of kits scanned in month one had expired items).
  Your audience is office managers and practice managers, and LinkedIn is
  where they are.

### Phase 3, months 7 to 12: scale beyond Adelaide

- Self-serve onboarding good enough that a partner referral in Perth or
  Toowoomba buys without a call.
- Expand Google Ads to Victoria, Queensland and Western Australia with
  state-specific landing pages (state regulations differ in wording).
- Regional Australia deliberately: regional consumers are the most
  "Australian owned" motivated, outer-regional online spend grows faster than
  metro, and Adelaide dispatch reaches WA, NT and regional SA and Victoria
  faster than east-coast retailers.
- Gate G4 at month 9.
- Amazon AU Sponsored Products only if the listing has 20 or more reviews
  and ACoS holds under 30 percent.

## Sales playbook (the first 200 accounts)

1. **Open** with the evidence question: "When a head contractor or your
   insurer asks for proof your kits are compliant, what do you send them?"
2. **Show** the certificate and the after-use scan on a phone. Thirty
   seconds.
3. **Price** it against what they do today: an annual plan for a site kit
   and three utes is about A$400 a year; a visit service quotes more and a
   DIY approach costs them an afternoon a quarter plus the risk.
4. **Close** on annual, kits shipped tomorrow, first certificate the day the
   kits are registered.
5. **Ask** for two names.

Track per week: visits, conversations, offers made, accounts won, kits per
account, annual versus monthly, and the reason for every no.

## What not to do

- Do not run Meta ads for this. The buyer is at work, searching, or being
  referred. Meta's own learning-phase maths needs A$10k a month to work.
- Do not offer on-site visits, even once. It turns you into Alsco with a
  worse van.
- Do not chase a 200-kit mining tender in year one.
- Do not promote monthly billing. Cash upfront is what makes the model work.
- Do not sell nationally before Adelaide retention (G3) is proven.
- Do not put "TGA approved" anywhere. Say "supplied by a TGA-listed
  Australian manufacturer" and "compliant with the Safe Work Australia model
  Code of Practice".
- Do not build a custom checkout, a mobile app, or an integration with
  anything before 50 accounts.
