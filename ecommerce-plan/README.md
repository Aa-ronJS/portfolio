# E-commerce business plan — Aaron Steele, South Australia

Researched and written 13 September 2026. Five independent research streams
(market and product opportunities, business models and product shortlist,
customer acquisition economics, Australian operations and law, financial
benchmarks and founder case studies), roughly 180 web searches and 400 page
reads, then a synthesis. Every number in these documents carries a source in
`07-sources.md`; anything that could not be verified is flagged as such.

## The answer in one paragraph

Do not launch a consumer product on paid social. The 2026 evidence is
unambiguous: median Meta ROAS is under 2x against a break-even of 3.3x at a
typical contribution margin, CAC is up 40 to 60 percent since 2023, and every
small founder who succeeded in the last four years did it with near-zero
acquisition cost for the first one to two years. Instead, sell **workplace
safety consumables on automatic replenishment to small businesses**: first-aid
kits for sites and work vehicles, AED pads and batteries replaced before they
expire, and PPE consumables, all wrapped in a compliance record that a WHS
inspector or insurer will accept. Demand is legally mandated, the goods come
from an Australian ARTG-listed wholesaler (no China import, no MOQ, no tariff
exposure), the kits are sold upfront so each new customer funds their own
acquisition, and the plan revenue recurs. The moat is the software, which is
the one thing you can build that the incumbents (visit-based restock services
and a distributor's manual kit log) cannot. Start in Adelaide in person, prove
it with 20 paying accounts inside 60 days, then scale through partner channels
and self-serve. A consumer fallback (dog health consumables on subscription) is
documented in case the validation gate fails.

## Documents

| File | What it answers |
|---|---|
| `01-recommendation.md` | What to sell, why this and not the alternatives, the validation gates, the risks |
| `02-market-research.md` | Macro numbers, the 2025 to 2026 structural shifts, category scorecard, ranked product shortlist |
| `03-go-to-market.md` | Ideal customer, offer and pricing, channel plan by phase, sales playbook, the software moat |
| `04-operations-legal.md` | Entity, GST, trade mark, consumer law, TGA/ARTG, insurance, supply, fulfilment, stack, cost tables, timeline |
| `05-financials.md` | Unit economics, 12-month model, sensitivities, the consumer comparison, what to track |
| `06-90-day-plan.md` | Week-by-week execution from decision to 20 paying accounts |
| `07-sources.md` | Every source used, grouped by topic, with unverified items listed |
| `model.py` | The financial model. Change an assumption at the top, rerun, paste the tables |
| `report.html` | The same plan as a single shareable page (body-only HTML, published as an artifact) |
| `app/` | **The software.** Kit register, QR after-use refills, expiry engine, compliance record and certificate, labels, daily due report. `npm install && npm start`. See `app/README.md` |
| `launch/` | **Selling tomorrow.** Day-one checklist, printable offer sheet, sales script, email templates, checkout setup (Stripe links today, Shopify CSV this week), tracking sheet, Google Ads spec, plan terms, privacy policy |

```
python3 ecommerce-plan/model.py          # markdown tables
python3 ecommerce-plan/model.py --csv    # monthly rows
```

## How the research was done

Each stream was briefed to prefer primary sources (regulators, platform
pricing pages, carrier rate cards, benchmark reports with disclosed sample
sizes, founder interviews with disclosed numbers) over agency and guru
content, and to flag anything it could not trace. Where two streams
disagreed, the disagreement was resolved by a direct check and the correction
is noted in the relevant document. Two findings from the streams were
overturned on direct verification: the custom-fit ute sunshade niche is more
crowded than first reported, and a first-aid distributor already bundles a
kit-tracking tool. Both changed the recommendation and are discussed in
`01-recommendation.md`.
