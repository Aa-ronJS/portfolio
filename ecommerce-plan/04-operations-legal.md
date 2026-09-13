# 04 — Operations and legal (South Australia, 2026)

All figures AUD. Items marked *unverified* came from secondary sources or
pages that refused a fetch; confirm before committing money.

## Entity, tax and registration

| Decision | Recommendation | Cost and basis |
|---|---|---|
| Structure | **Pty Ltd from day one.** You are supplying goods used in medical emergencies; limited liability matters. Base rate entity tax 25% | ASIC registration $636, annual review $342 (1 Jul 2026 schedule, via mirror sites, unverified against ASIC's own page) |
| ABN and GST | Register for GST immediately even though the threshold is $75k projected turnover. You need input credits on wholesale purchases and subscriptions, and B2B customers expect tax invoices. Apply for the Deferred GST scheme (monthly BAS) if you ever import | Free |
| Business name and domain | Business name $108 for three years; `.com.au` about $22 a year (needs an ABN) | ASIC, registrars |
| Trade mark | File **TM Headstart** in classes 10 (first-aid kits, medical supplies) and 42 or 9 (software) before printing anything. Minimum $330 per class; at least seven months to registration | IP Australia current schedule |
| Bank | NAB Business Everyday ($0 monthly) or equivalent; Xero Grow $78 a month (promo 90% off for three months to 30 Sep 2026) | NAB, Xero AU |
| Insurance | Public and products liability, $10M limit: $600 to 1,320 a year for an online retailer (unverified range). Tell the insurer the products are ARTG-listed and bought from an Australian sponsor | upcover, Sprintlaw |

## The regulatory position on first-aid goods

- First-aid kits, bandages and dressings are medical devices listed on the
  ARTG by a **sponsor**. Buy from an Australian sponsor (Aero Healthcare
  states its products are TGA and ISO accredited) and **stay a reseller**.
  Do not import kits yourself, do not repackage sterile items, do not
  assemble your own kits from mixed sources. If you ever want a custom
  branded kit, Aero's AeroPack division does that under their listing.
- Claims: "compliant with the Safe Work Australia model Code of Practice:
  First aid in the workplace" and the SA Work Health and Safety Regulations
  2012. Never "TGA approved" (the TGA does not approve listed devices in that
  sense) and never "guarantees compliance" (the customer's risk assessment
  and first-aider training are their obligations).
- Sunscreen in the PPE pack must be a TGA-listed brand; you resell it. Do not
  private-label sunscreen: the TGA is tightening after CHOICE found 16 of 20
  products failed their SPF claim.
- AED pads and batteries: OEM consumables for the customer's device model.
  Record the device serial and pad model in the register; ship OEM only.
- **ACCC mandatory reporting**: any supplier who becomes aware of a death or
  serious injury associated with a product they supplied must report within
  two days. Write this into your incident procedure now.
- **Australian Consumer Law**: consumer guarantees apply to business
  customers buying goods under $100,000 too. Refund or replace on major
  failure. Subscription terms must be plain, cancellable, and not a "trap"
  (an ACCC 2026 to 2027 priority). Send a renewal notice 30 days before an
  annual plan renews.
- **Privacy**: the small-business exemption (turnover under $3M) is still in
  force as of 8 September 2026; Tranche 2 has no commencement date. Spam Act
  applies to your email and SMS regardless. Publish a privacy policy, keep
  data minimal, opt-in only.
- **Importer as deemed manufacturer** (ACL s7) is the reason not to import
  kits from overseas: the importer carries manufacturer liability.

## Supply

| Item | Detail |
|---|---|
| Primary wholesaler | Aero Healthcare (100% Australian owned, 3,000 m² warehouse, daily dispatch nationally, 98% DIFOT, reseller programme, custom-branded kits). Trade pricing is not public: request it in week one. Gate G1 needs 45%+ gross margin on kits at your retail |
| Alternatives to quote | Brenniston, FastAid, Trafalgar, Survival Emergency Solutions, St John (wholesale) |
| Stock policy | Hold two weeks of kits and refill packs at home; the wholesaler ships daily, so you are a just-in-time reseller. No MOQ, no China, no freight forwarder, no customs broker |
| Refill packs | Ask the wholesaler for a standard six-monthly refill pack per kit type, plus after-use modules (dressings, wound closure, eye, burns). Target under $12 per scheduled pack |
| QR labels | Durable polyester labels, sequential codes, printed locally; about $0.30 each at 1,000 |

If you ever import (year two, custom kit shells): ChAFTA gives 0% duty on
most Chinese goods with a certificate of origin; 10% GST at the border is
recoverable; import processing charge $50 to $152; broker $165 to 260 per sea
entry; LCL sea $150 to 250 per cubic metre all-in, 21 to 31 days door to
door; Adelaide consolidation adds three to seven days via Melbourne or
Sydney (unverified). Not needed for this plan.

## Fulfilment

| Item | Detail |
|---|---|
| Carrier | **MyPost Business.** Retail Parcel Post 500 g $11.70, 1 kg $16.00, 3 kg $20.25 (1 Jul 2026). Band 1 (from $50 spend per four weeks) gives 10% off; Band 5 (over $2,000 per four weeks) gives 500 g same-city at $7.02. Express 500 g $15.20 retail. Prices rose 4.95% on 1 July 2026 |
| Do not plan around Sendle | Sendle reportedly halted pickups and deliveries on 11 January 2026 (unverified; the site still resolves) |
| Other | Aramex from $7.61 and CouriersPlease from $8.10 for ~500 g interstate (secondary); Aramex for anything over 5 kg |
| One parcel per account | Ship all kits and refills for an account together. The model assumes 3.5 parcels per account per year at $9.40 plus $1.90 packaging |
| Self-fulfil until 150 to 300 orders a month | Australian 3PLs charge $2 to 4 per pick, $20 to 45 per pallet per month, and $300 to 500 monthly minimums; the named providers (eStore Logistics, Fulfilio, ShipBob AU, Efulfilment, Gonini) are quote-only |
| Returns | Faulty goods at your cost under ACL; change-of-mind on unopened kits customer-paid with a MyPost returns label |

## Storefront and stack

| Layer | Choice | Cost |
|---|---|---|
| Commerce | Shopify Basic, annual | $42 a month billed annually ($504 a year); Shopify Payments 1.75% + 30c domestic; add ABN to remove GST on the plan fee |
| Subscriptions | Shopify's native subscriptions (free) first; Recharge ($99 plus 1.49% + 19c) only if native cannot do annual with mid-term add-ons | $0 to start |
| B2B invoicing | Shopify draft orders and net terms for the few accounts that insist; annual plans by card by default | included |
| Kit register, expiry engine, QR, certificates | Your own service: Postgres, a small API, a QR landing page, a PDF generator; hosted on Vercel or Fly | $20 to 40 a month |
| Messaging | Klaviyo (free to 250 profiles, then from about US$20 to 45; paid tiers unverified). Flows only; SMS in Australia is expensive, so reserve it for after-use confirmations | $0 to 70 a month |
| Reviews | Judge.me free, then Awesome at US$15 | $0 to 22 |
| Accounting | Xero Grow $78 a month; bookkeeper $600 to 1,500 a year (estimate) | |
| Payments | Shopify Payments plus PayPal (2.9% + 30c). Skip BNPL; business buyers do not use it | |
| Labels | MyPost Business web or Starshipit/Shippit at $20 to 50 a month once volume justifies it | |

Why Shopify and not Medusa, Saleor or a custom store: the scarce resource is
your hours. Shopify gives you checkout, fraud screening, tax display,
subscriptions, invoices, Markets and the Australian carrier apps. Build the
register, expiry engine and certificate, which Shopify does not have. Revisit
headless only if the storefront ever becomes the differentiator.

## Startup cost table (recommended business)

| Item | AUD | Basis |
|---|---|---|
| Pty Ltd registration and first-year ASIC review reserve | 978 | $636 + $342 |
| Business name (3 yrs), domain | 130 | |
| TM Headstart, 2 classes | 660 | IP Australia |
| Public and products liability, year one | 900 | quote range midpoint |
| Opening stock: 25 site kits, 40 vehicle kits, refill packs, AED pads sample | 3,300 | at assumed wholesale; replenished from sales |
| QR labels (1,000), packaging, sample kit for demos | 600 | |
| Shopify Basic annual, apps, hosting, Klaviyo (6 months) | 900 | |
| Xero (promo) and bookkeeper setup | 350 | |
| Google Ads, first 12 weeks | 1,800 | $20 a day |
| Partner referral fees and samples, first 6 months | 1,500 | |
| Photography (DIY kit plus a half day at a studio) | 500 | |
| Founder travel and demo costs | 800 | |
| Contingency | 1,500 | |
| **Total** | **~13,900** | |

The remainder of a A$15 to 40k budget stays in the bank as runway. The model
in `05-financials.md` runs on A$15k opening cash and never goes below it,
because kits are sold upfront and annual plans are paid in advance. That is a
design choice, not luck; if you promote monthly billing the cash profile
changes (see the sensitivity).

For comparison, a private-label consumer import needs A$15k lean or A$40k
solid, with A$24k committed before the first sale in the A$30k case and a
A$17k cash trough on the second purchase order.

## Timeline

| Week | Milestone |
|---|---|
| 1 | Pty Ltd, ABN, GST, bank, Airwallex or Wise not needed (domestic supply), TM Headstart filed, insurance quote, trade pricing requested from two wholesalers |
| 2 | Trade pricing in hand (G1); order demo kits; register domain; Shopify store skeleton; start the kit register service |
| 3 to 4 | After-use QR loop and certificate generator working end to end on a demo kit; ten discovery conversations done; landing page live; Google Ads live at $20 a day |
| 5 to 8 | Direct sales in Adelaide, two days a week; first 20 accounts (G2); Amazon AU and eBay AU listings live |
| 9 to 12 | Fix what the first 20 taught; email flows live; first partner conversations; content pages 1 to 5 published |
| Months 4 to 6 | Partner portal; three partner deals; 100 accounts; G3 at month 6 |
| Months 7 to 9 | Self-serve onboarding; expand ads to VIC, QLD, WA; G4 at month 9 |
| Months 10 to 12 | 250 to 300 accounts; decide on first hire (part-time customer success) or stay solo |

There is no manufacturing lead time, no Chinese New Year risk and no freight
in this plan. First sale is possible in week five.
