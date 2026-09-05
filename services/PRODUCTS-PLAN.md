# The products plan

The third leg of the practice, after services (the site) and authority
(AUTHORITY-PLAN.md): things people buy instead of hiring you. The framing
is already on every page of the site, because the selective posture says
"maybe" to every job; a product line gives the "no" something to sell.
The house phrase is the strategy: **"Don't hire me. Here's how to build
it yourself."**

Why this works for you specifically, and would be fake for most
freelancers: your actual method is written specifications, AI leverage
and checked results, which means the method itself is a teachable
artefact. A videographer cannot sell "point the camera yourself" without
destroying their trade; you can sell the playbook precisely because your
paid work starts where the playbook stops. And the honesty economics are
clean: most enquiries were never going to spend $5,000, so a $79 kit
converts people who were worth $0, builds the exact trust that later
converts the few who outgrow DIY, and makes the "I'm selective" line
operationally true instead of a pose.

## 1. What the products are

**Format doctrine: written kits, not video courses.** A kit is a set of
plain-words documents: the decisions in order, the exact steps, the
prompt pack for doing the build with an AI assistant, the checklists,
and an honest "when to stop DIYing" section. Written beats video here
for three reasons: it matches the house register, it can be genuinely
excellent without studio time, and it stays updatable the way the site
is (regenerate, republish). Video, if ever, comes after a kit has sold
enough to deserve it.

**Every kit carries the same promises, printed inside it:**
- It is genuinely trying to make hiring me unnecessary. No held-back
  steps, no "for the full secret, book a call". The upsell is that
  reality is hard, not that the kit is crippled.
- The prompts are the real ones: the way I actually instruct AI tools,
  adapted for a non-developer.
- **The kit price comes off the invoice if you later hire me for the
  same job.** This one line converts the product from a competitor to
  the services into the top of their funnel, and it costs nothing on
  jobs that were never coming anyway.
- Plain refund terms: not happy, say so within 30 days, money back, keep
  the files. Digital goods, one honest rule.

## 2. The catalogue, mapped to the services

In build order. One kit per service where DIY is honestly viable; no kit
where it is not (nobody should DIY a $3.8m reconciliation, so data
cleanup gets no kit, and the mobile page's honest answer is usually
"don't build an app", which is a chapter, not a product).

1. **The Website Kit** (websites, WordPress, rebuilds). WRITTEN: source
   in `products/website-kit/`, sales page at `/diy/website-kit/`. The
   flagship, because "how much does a website cost" is the site's
   biggest traffic magnet and "build it yourself with AI in a weekend"
   is the honest answer for half the askers.

1b. **The Builder's Kit** (the professional tier, annual licence).
   WRITTEN: source in `products/builders-kit/`, sales page at
   `/diy/builders-kit/`. Nine documents: the actual practice method,
   Claude Code and the terminal workbench, the .md scaffolding with
   full templates, the architecture ladder, component-by-component
   build, hosting/DNS/secrets, a realistic security model, ship-and-
   keep. The zip is also executable: a `setup/` layer addressed to
   Claude Code itself runs the onboarding (interview, scaffolding,
   git, first increment, then hands over the controls), so the pitch
   is "read it, or run it". **The annual model, honestly:** the fee buys the current
   edition plus the licence year's re-issues, because this tier's
   subject (tooling, hosting, security) genuinely drifts within a
   year and keeping it current is real recurring work; lapsed buyers
   keep every file forever, no keys, no expiring links, no phone-home,
   ever. The obligation it creates: at least one re-issue per year
   (the source README tracks where drift concentrates). Credit rule
   scoped to the licence year. This kit is also the marketing: it is
   the productised version of the AI development page's pitch, and
   "you are reading its output" is the proof line.
2. **The Brief Kit** (business analysis, custom software). How to write
   a specification an AI or any developer can actually build from:
   the eleven-years-a-BA method as a fill-in playbook. Uniquely yours,
   nearly competition-proof, and it makes every buyer a better client
   for somebody, possibly you.
3. **The Rescue Kit** (project rescue). Take back control of your own
   website: find out what you own, recover the domain and accounts,
   audit what the last developer left, decide fix versus rebuild. The
   audience is angry, motivated and search-active, and the kit is
   mostly checklists, which makes it fast to write and honest to sell.
4. **The Automation Kit** (CRM and automation). Your first five
   automations without hiring anyone: pick the tool (Make, Zapier or
   native), wire the standard joins, know the traps (the systems pages
   are the research base).
5. **The AI Kit** (AI development). Set up AI properly in a small
   business: the tools worth paying for, the prompt patterns, the
   guardrails, what never to automate. The AI page's register, boxed.
6. **The Store Kit** (e-commerce). Set up Shopify properly the first
   time, including the accounting join done right from day one, drawing
   directly on the Shopify and WooCommerce systems guides.

Each subsequent kit is one instruction from you ("write the Brief Kit")
and lands the same way this one did: full source in `products/`, sales
page in `/diy/`, no weekly homework.

## 3. Pricing, in the open

One-off kits are priced as serious documents, not gurus' courses: **$49
to $149 AUD** depending on depth, flagship at **$79**. The Builder's Kit
is the exception and the ceiling: **$249 AUD per year** (placeholder,
same TUNE rule), annual because its content requires annual upkeep, and
always with the keep-your-files rule stated on the page. No other kit
goes annual unless its content genuinely drifts the same way; "annual"
as a revenue trick without the upkeep obligation is exactly the kind of
thing this site does not do. The number on each sales
page is a TUNE BEFORE LAUNCH placeholder like the calculator's config:
make it a number you would defend on a call. Principles: cheap enough
that a sole trader buys it without a meeting, dear enough to be read
rather than hoarded, and always cheaper than one hour of anyone's
consulting. No launch discounts theatre, no fake "usually $299". The
credit-toward-hiring line is the only discount mechanic, forever.

GST note for launch: if you are not GST-registered (under the $75k
threshold), prices are simply GST-free; if registered, the checkout
platform below handles it. Either way, say which on the page footer.

## 4. Selling machinery

- **Checkout: use a merchant of record** (Lemon Squeezy and Paddle are
  the type), not raw Stripe, so international GST/VAT and invoices are
  their problem, not a sole trader's. Product pages link out through a
  `REPLACE-CHECKOUT-URL` placeholder, same convention as the rest of
  the site; delivery is the platform's file delivery (upload the built
  kit as a zip and a single PDF).
- **Building the deliverable:** kit source is markdown in `products/`;
  a build step (pandoc or the docx/pdf tooling, one command, documented
  in the kit's README) produces the customer files. Source stays in the
  repo so kits version like the site does.
- **The funnel already exists:** the cost questions in `/answers/`, the
  calculator's cheaper paths, and every service page's honest "you may
  not need me" moments all now have somewhere to point. The DIY hub is
  linked site-wide in the footer; the flagship gets a home page
  mention. As each new kit ships, its matching service page gains one
  line ("Rather do it yourself? There's a kit."), never a banner.
- **The calculator tie-in (small build, when you say):** when an
  estimate lands under a threshold, the result panel can honestly say
  "at this size, my kit is the better buy" with the link. That single
  cross-sell will likely outsell every other channel; I will wire it
  when the first checkout link is real.

## 5. Red lines, same spirit as the other plans

- No crippled kits. If the kit cannot genuinely get a competent
  motivated owner to a working result, it does not ship.
- No fake urgency, no countdown timers, no "only 7 left" on a file.
- No income claims, no "$10k website for $79" framing. The claim is
  "the method and the prompts, honestly", nothing bigger.
- Testimonials on sales pages only from real buyers, with permission,
  once they exist. Until then the pages sell on contents and the same
  public proof as everything else.
- The kits stay current or come down. A kit that recommends a dead tool
  is a refund machine and a reputation leak; each kit's README notes
  what to re-verify and when (mirrors the systems pages' honesty note).
- Support boundary printed in every kit: the price includes the
  documents, not consulting. Questions about the kit's own steps get
  answered (they are bug reports on the product); "can you just look at
  my site" gets the services link and the credit line.

## 6. Sequence

1. **Now (done):** this plan; the DIY hub at `/diy/`; the Website Kit
   written in full (`products/website-kit/`) with its sales page.
2. **At site launch:** create the merchant-of-record account, upload the
   built kit, replace `REPLACE-CHECKOUT-URL`, set the real price, read
   the kit once end-to-end as the claims audit (it makes tool
   recommendations; tools drift).
3. **Post-launch:** kits 2 and 3 (Brief, Rescue) on your one-line
   requests; the calculator cross-sell once checkout is live; a
   kit-buyers follow-up email (one, useful, per OUTREACH.md rules)
   asking what stumped them, which is also next kit research.
4. **Signal to watch:** kit sales per service page visit tells you
   which service's audience wants DIY. Feed that lane its kit next.
