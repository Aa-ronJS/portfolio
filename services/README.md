# Services site

A standalone static site built to capture the work that streams past on
Upwork and friends: WordPress builds and rebuilds, "coder needed", stalled
projects, CRM messes. It targets the same buyers when they go to Google
instead of a marketplace. Seven pages, no JavaScript, no build step; each
page is written for one search intent and answers it properly rather than
being a doorway page.

The posture is selective, not hungry: the contact page is "work with me",
an application in both directions, with the yes/no filter published. Every
enquiry gets a fast straight answer; only a fraction gets taken. Keep that
true or the page becomes theatre.

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

## The live demos (the proof)

Every service page and every industry page carries the finished product it
sells, working, embedded in the page: a visitor uses it before reading a
word of claims. Twenty-two of them, all vanilla JavaScript on the static
site, no build step, no external calls.

Each demo renders inside the device it would really live in, styled as
itself and deliberately not as this site: websites in a browser window
with their own brand (fonts, colours, layout per business), software in an
app window with a sidebar and top bar, the field app in a phone, the
analysis deliverables in a document viewer. The point is that the demo
looks like the thing you would receive, not like another section of the
page.

- `public/js/demo-core.js` is the framework: element helper, the four
  device shells (`browser`, `app`, `phone`, `doc`), `frame()` which puts a
  device on a stage with a status pill and note, KPI tiles, tables,
  toasts, icons, mount-by-`data-demo`.
- `public/js/demos-services.js` holds the ten build-type demos: a
  re-skinnable small-business website (four brands, desktop or phone), a
  before/after rebuild slider, a working store with checkout and the
  back-office activity it triggers, the field app in a phone, a
  quotes-and-jobs tracker, a CRM pipeline whose stage changes fire
  automations, a multi-branch dashboard, a customer assistant living on the
  business's own site, a rescued project as two browser tabs, and the BA
  deliverable set as documents.
- `public/js/demos-industries.js` holds the twelve sector demos, each as
  its own product (SiteBoard, Linehaul, ShiftGate, Stockline, a booking
  page, Matterly, FrontDesk, Grantwise, RentRoll, Paddock, Assess, an RTO
  enrolment page).
- `public/css/demos.css` is the product styling: device chrome, an
  Inter-based app look with its own tokens (`--p-*`), and a re-map of the
  site's token names inside `.dv` so demo code inherits the product look
  rather than the site's. Fonts for the demos (Inter, Nunito, Oswald,
  Playfair Display) are self-hosted in `public/fonts/`.

Pages mount a demo with `<div class="demo" data-demo="name">` holding a
static fallback; the industries generator carries its own `DEMOS` map.
Every demo works at rest, degrades to readable text without scripts, and
is tested in a real browser at 1424px and 390px (`test_demos.mjs` in the
session scratchpad exercises all 22 with clicks and checks for console
errors and overflow). The numbers inside demos are illustrative fixtures;
they never claim to be client data.

## Industry pages

`/industries/` plus twelve sector pages (trades, transport, mining, retail,
hospitality, professional services, health/NDIS, not-for-profits, real
estate, agriculture, government, education). Deliberately one substantive
page per industry rather than an industry-times-service matrix: hundreds of
thin combination pages read as doorway spam to Google and to buyers, and
twelve deep pages you can send with a proposal beat them.

Each page speaks of the sector's systems generically ("your job system",
"your practice software") rather than naming products Aaron has not worked
inside, carries a working build for the sector, and calibrates honesty per
sector: mining, government,
education, not-for-profits and transport lean on the actual track record;
hospitality, real estate, health and agriculture say in plain words that the
industry is new and the method is not. Keep that calibration when editing;
it is the credibility mechanism.

Targets per page are the "[industry] + software/automation" and
"[named system] + integration/automation" long-tails, which have buyers and
few serious pages competing.

## The answers layer

`/answers/` is the inbound content engine, HubSpot topic-cluster style: 38
question pages across eight clusters (websites, apps, AI, CRM, data,
e-commerce, rescues, hiring), each opening with a direct snippet-ready
answer, going deeper in three sections, and linking sideways to its cluster
and up to its pillar service page. Cost questions use market-typical ranges
framed as market observations; your own pricing stays "fixed quote in
writing", so nothing on these pages commits you to a number.

Growing it is the ongoing SEO work: every real question a lead asks becomes
a new entry in the generator's content files, regenerated and added to the
sitemap. Write the answer the way you would say it on the call; the format
does the rest.

## The system guides (unpublished)

Twelve "[System] to [System]" pages were generated for the SEO long tail
and then pulled before launch: they asserted the mechanics of named
products (job systems, practice software, property platforms, student
management systems) that Aaron has not actually worked inside. They sit
in `unpublished/systems/` with their generator (`tools/gen_systems.py`,
`tools/systems_a.py`, `tools/systems_b.py`) and are not linked, not in
the sitemap and not deployed. Republish any one of them only after real
hands-on time with both products in the pair, and rewrite it from that.

## The DIY kits

`/diy/` is the product line: written kits sold under the site's own
honest banner, "don't hire me, here's how to build it yourself".
PRODUCTS-PLAN.md is the doctrine (catalogue, pricing, red lines,
sequence); the flagship Website Kit is fully written in
`products/website-kit/` (six customer documents plus a packaging README)
with its sales page at `/diy/website-kit/`. The standing promise printed
everywhere: the kit price comes off the invoice if the buyer later hires
you for the same job, and refunds are 30 days, no theatre.

There are two tiers: the one-off Website Kit ($79 placeholder) and the
annual-licence Builder's Kit ($249/year placeholder,
`products/builders-kit/`, sales page `/diy/builders-kit/`), which
carries a real obligation: at least one re-issue per licence year, and
lapsed buyers keep their files forever (both printed on the page and in
the kit; keep them true).

Launch steps for the kits, beyond the usual placeholders: create the
merchant-of-record products (Lemon Squeezy or Paddle shaped; the
Builder's Kit as an annual subscription), build the deliverables
(`cd products && python3 build.py website-kit && python3 build.py
builders-kit`), upload the zips, set the real prices, then replace each
placeholder (note PRO is a distinct URL, so sed it first):

```bash
grep -rl 'REPLACE-CHECKOUT-URL-PRO' public | xargs sed -i 's|REPLACE-CHECKOUT-URL-PRO|https://your.checkout/builders-kit|g'
grep -rl 'REPLACE-CHECKOUT-URL' public | xargs sed -i 's|REPLACE-CHECKOUT-URL|https://your.checkout/website-kit|g'
```

Until that runs, the buy buttons on `/diy/website-kit/` point at a dead
placeholder on purpose; do not launch the page in the sitemap-visible
site without either wiring checkout or swapping the buttons for a
contact link.

## The pricing calculator

`/pricing/` is the conversion engine: pick a service, answer two to four
questions, leave email and phone, get an estimate range immediately, book a
time. Three launch steps beyond the usual placeholders:

1. **Tune the numbers.** Every range lives in one commented config at the
   top of the page's script, labelled TUNE BEFORE LAUNCH. They are
   typical-market AUD ex GST ranges today; make them numbers you would say
   on the phone, because the page promises exactly that.
2. **Set `LEAD_WEBHOOK_URL`** in the Vercel project's environment. Leads
   POST to `/api/lead` (a serverless function in `api/`), which forwards to
   that webhook: point it at Make/Zapier/n8n into your CRM and inbox. Until
   it is set, leads appear in Vercel function logs only. The calculator
   reveals the estimate even if the endpoint fails; a lead is never
   punished for our plumbing.
3. **Replace `REPLACE-BOOKING-URL`** in the page script with your Calendly
   (or equivalent) link. Until then the book button falls back to the
   contact page.

Honesty contract on this page: estimates are labelled typical ranges, never
quotes; the gate copy promises at most one follow-up and no list, so keep
that true; and several paths deliberately point at cheaper options. This is
the one page on the site with JavaScript.

## The booking system

`/book/` is a native scheduler, no Calendly: one recurring slot, Wednesdays
11:30am Adelaide time (handles ACST/ACDT correctly), 30 minutes, shown to
visitors in their own local time, with an add-to-calendar file on
confirmation. Bookings POST to `api/book.js`, which notifies
steele.aaron@outlook.com (override with `BOOKING_NOTIFY_EMAIL`).

Wiring, all optional, all best-effort so a booker is never blocked:
- `RESEND_API_KEY`: sends the confirmation email. Sign up at resend.com
  with the notify address; the free tier sends from onboarding@resend.dev
  to your own address, which is exactly this self-notification. Two
  minutes.
- Vercel KV (`KV_REST_API_URL`/`KV_REST_API_TOKEN`, added automatically
  when you attach a KV store to the project): records taken Wednesdays and
  turns a race into a polite "someone beat you to it". Without it, all
  upcoming Wednesdays show as available and you reconcile by email, which
  is fine at one slot a week.
- `LEAD_WEBHOOK_URL`: bookings forward there too, same as calculator leads.

The calculator's book button and the contact page both point at `/book/`.

## Privacy and share images

`/privacy/` states the site's actual data practice in plain words (what the
calculator and booking pages collect, the one-follow-up promise, deletion
on request); it is linked from every footer and must be kept true. `og/`
holds six generated share cards wired into every page's `og:image`, so
links pasted into LinkedIn, Facebook or Slack render branded instead of
bare. `OUTREACH.md` carries the marketplace bios, proposal templates, the
one-follow-up email and the Google Business Profile draft. `SEO-PLAN.md`
is the on-domain content doctrine; `AUTHORITY-PLAN.md` is everything off
the domain (links, platform partner directories, bookkeeper and agency
channels, podcasts, reactive PR, the local Adelaide lane), with its own
templates and weekly cadence.

## Images

No image key exists in the build environment, so `IMAGES.md` holds the full
prompt pack (one house grade, twelve subjects mapped to pages) and
`tools/nano_banana.py` runs it against Gemini's image model with your
`GEMINI_API_KEY` in one command. Look at every image before wiring it in;
compress under ~200KB; alt text describes what is actually in frame.

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

- The evidence figures (the career record, 52 checks, the live tools) are the
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
- The system guides describe named products' current behaviour (native
  integrations, pricing models). That is the one category of claim on the
  site that can go stale without anyone lying: skim the twelve before
  launch and after any product's big release, and fix what drifted.
