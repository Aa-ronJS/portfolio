# Services site

A standalone static site built to capture the work that streams past on
Upwork and friends: WordPress builds and rebuilds, "coder needed", stalled
projects, CRM messes. It targets the same buyers when they go to Google
instead of a marketplace. Seven pages, no JavaScript, no build step; each
page is written for one search intent and answers it properly rather than
being a doorway page.

The through-line on every page is the actual positioning: one person who
understands the business and runs AI like a delivery team, so work that used
to need several people gets specified, built and proven by one. The service
pages exist because that is not what buyers type into Google; they type the
problems below, and the positioning is what converts them once they land.

| Page | The search it answers |
|---|---|
| `/` | freelance web developer adelaide, full stack developer australia |
| `/ai-development/` | ai developer, ai automation consultant, build an app with ai, ai agents for business, chatbot |
| `/ecommerce/` | shopify developer, woocommerce developer, store slow, shopify xero integration |
| `/mobile-apps/` | app developer for business, build an app australia, app cost, turn website into app |
| `/data-and-reporting/` | dashboard developer, excel automation, data cleanup, numbers don't match |
| `/business-analysis/` | contract business analyst, fractional cto, process improvement consultant, review vendor proposal |
| `/wordpress/` | wordpress developer, wordpress site slow / hacked / rebuild |
| `/website-rebuild/` | website redesign without losing seo, rebuild old website |
| `/full-stack-developer/` | freelance full stack developer, hire .net developer |
| `/crm-automation/` | hubspot consultant, crm migration, zapier expert |
| `/project-rescue/` | developer disappeared, take over unfinished website |
| `/contact/` | (conversion, not ranking) |

## Before launch, in order

1. **Buy a domain.** This entire strategy is dead on a `vercel.app`
   subdomain; those pages effectively do not rank and look wrong on an
   invoice anyway. A `.com.au` needs an ABN, which Expert360 requires
   having anyway. Then replace the placeholders:

   ```bash
   grep -rl 'REPLACE-DOMAIN' public | xargs sed -i 's/REPLACE-DOMAIN/yourdomain.com.au/g'
   grep -rl 'REPLACE-EMAIL' public | xargs sed -i 's/REPLACE-EMAIL/you@yourdomain.com.au/g'
   ```

   Use an address on the new domain, not a personal gmail: it reads better
   and keeps this site's mail separable.

2. **Deploy.** New Vercel project pointed at this repo with the root
   directory set to `services/`, custom domain attached. Or split this
   folder into its own repository; nothing in here depends on the rest.

3. **Google Search Console + Bing Webmaster Tools.** Verify the domain,
   submit `sitemap.xml`. This is also where you find out which queries the
   pages actually surface for, which drives everything in "after launch".

4. **Google Business Profile.** For "wordpress developer adelaide"-shaped
   searches, the map pack outranks every webpage on the planet. A service-area
   business profile (no public address needed), the same categories as these
   pages, and a steady trickle of real reviews will do more for local
   capture than any amount of on-page work. This is the highest-leverage
   hour on this list.

## After launch, honestly

- **These pages are the skeleton, not the strategy.** Service pages rank
  for local and long-tail queries; the head terms ("wordpress developer")
  belong to marketplaces and 20-year-old agencies. The realistic wins are
  local ("adelaide"), problem-shaped ("site hacked", "developer
  disappeared"), and comparison queries, which is what these pages are
  written for.
- **Add proof as it accumulates.** Each finished job that can be named (or
  described anonymously with the client's blessing) becomes a paragraph or
  a page. Google's quality guidance is heavily weighted to demonstrated
  experience, which is also just what buyers want to read.
- **Write answers, not blogs.** One page per real question you get asked
  ("how much does a small business website cost", "my wordpress admin is
  locked out") beats a weekly blog nobody asked for. Reuse the FAQ
  pattern; add each new page to the sitemap.
- **Expect months, not weeks.** A new domain takes time to earn trust. The
  reviews-and-GBP lane pays out first; the organic lane compounds later.
  Anyone promising page one in a fortnight is selling something.

## Honesty notes, before this goes live

- The evidence figures ($3.8m, 37,729, 52 checks, the live tools) are the
  real ones from the portfolio, linked to it. Keep them in sync if the
  portfolio changes.
- The mobile page commits to cross-platform (React Native on the same
  TypeScript base as the web work) and to the "do you even need an app"
  advice angle; it deliberately does not claim native Swift/Kotlin work or
  shipped store apps. Same test as everywhere: defendable on a call.
- The e-commerce page is written the same capability-forward way as the
  WordPress one: it claims an approach (both platforms, integration-first,
  reconciled numbers) and no store portfolio. If your Shopify or WooCommerce
  history is thinner than the page reads to you, tune it before launch.
- The business-analysis page is the one place the site sells the day-job CV
  directly; it is also the page to link on Expert360-style marketplaces,
  where buyers hire consultants rather than "wordpress devs".
- The WordPress page claims an approach, not a WordPress portfolio. If you
  have client WordPress work you can show or describe, add it; if your WP
  history is thinner than the page implies to you when you read it, tune
  the copy before launch. Same test as the rest of the site: nothing on
  the page you could not defend on a call.
- The FAQ answers avoid invented prices, timeframes and guarantees on
  purpose. Resist adding them until they are real.
