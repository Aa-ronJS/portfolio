# Market gaps worth building for — research, August 2026

A survey of currently underserviced problems a solo builder can realistically
capture, ranked by fit against what already exists in this portfolio: shipped
MCP servers (Rain Check, Doorknock), end-to-end build capability, QA
discipline, and a consulting practice.

**The headline finding:** the single best-validated gap in this research is
one Rain Check is already halfway into. Generic booking and scheduling tools
cannot handle weather-dependent work — and the tools that can are either
priced for $3M+ businesses or make crude "is it raining" decisions rather
than trade-specific ones ("will Thursday's pour survive").

---

## 1. Weather-decision layer for outdoor work — extend Rain Check

**The gap.** Booking and scheduling software treats weather as an
afterthought. Fishing charter and outdoor guide booking is explicitly named
as an underserved niche *because* generic booking tools "cannot handle
weather cancellations, trip-type variations, group pricing"
(Superframeworks, 2026). Skilled-trades management is underserved because
ServiceTitan-class tools run $250–$500/technician/month — priced for $3M+
shops, not solo operators still on paper invoices and phone scheduling.

**What exists, and its hole.** Service Autopilot and Fieldproxy do
mass-reschedule of rained-out jobs — but only inside their own platforms,
mostly for lawn care, and triggered by crude precipitation. Nobody sells the
*decision*: trade-specific go/no-go thresholds (concrete cure temperature,
crane wind limits, spray-painting humidity) as a layer that plugs into
whatever the business already uses — Jobber, Google Calendar, or text
messages. That is exactly what Rain Check already answers.

**What to build.** Three concentric options, cheapest first:
- A **rebooking engine on top of Rain Check**: when the answer is "no, not
  Thursday", it proposes the next viable slot from the calendar, drafts the
  customer notification, and handles the deposit/refund policy. Sell to
  concreters, roofers, painters, crane hire.
- A **vertical booking product for charters and outdoor guides**: weather
  cancellation, trip variations, and group pricing as first-class features,
  where the incumbents are Facebook Messenger and lost customers.
- A **weather-decision API/MCP server other software consumes** — sell the
  brain to the scheduling platforms that only have the calendar.

**Why this one.** The product seed exists, the pain is money-adjacent and
recurring (a blown pour costs real dollars), the audience is reachable
locally, and the pricing norm for trades tools that understand the workflow
is $30–$150/month.

---

## 2. MCP quality and trust tooling

**The gap.** MCP servers ship at ecosystem scale (200+ in the main
directory) but "most MCP servers pass the 'it connected' test and fail the
'it works' test — the gap between those two is where production incidents
live" (Stainless, 2026). Well-established eval methodology is still
evolving; generic AI eval tools aren't tailored to MCP and produce
UI-based remote reports that can't gate a CI pipeline. On the trust side,
the tool_call → tool_result cycle runs on an honor system, distribution is
an unverified network of community registries, and researchers demonstrated
a working typosquat of the most popular database server
(`mcp-server-postgress`).

**What exists, and its hole.** mcp-use + pydantic-eval combinations,
Apify's Tester client (smoke tests only), Arcade Evals (tool selection and
argument quality, deliberately doesn't execute the tool). Nothing offers a
local, CI-native verdict on "does this server actually do what its tool
descriptions claim", and nothing scans a registry entry for trust signals
before you wire it into an agent with credentials.

**What to build.** A CI-native MCP test harness: point it at a server, it
exercises every tool with generated and recorded cases, diffs behavior
across versions, and fails the build with a local verdict. A companion
trust scanner (typosquat detection, permission-surface audit,
description/behavior mismatch) is the security half of the same product.
Open-source core, paid CI/hosted tier — the standard devtools path.

**Why this one.** It's the intersection of the two things the portfolio
already claims: building MCP servers and breaking things before customers
do. Even at modest direct revenue it's a credibility engine that feeds the
consulting practice. The risk: devtools monetization is slow, and platform
vendors may absorb the space — move fast or treat it as open-source
reputation rather than the main income.

---

## 3. Shadow AI governance, priced for SMBs

**The gap.** 98% of organizations report unsanctioned AI use; unapproved AI
use on corporate devices tripled in a year (15% → 45% of the workforce);
only 37% have any governance policy. 80% worry about data leaking through
generative AI tools and 60% have no strategy for it. Every product serving
this — Vectra, Mimecast, ArmorCode — is enterprise-priced and
enterprise-shaped. The consensus prescription for SMBs is "controlled
enablement, not lockdown", and no affordable tool delivers it.

**What to build.** An SMB-priced package: discover which AI tools staff
actually use (browser/network-level inventory), generate a usage policy
from templates, and provide a sanctioned, logged front door to the models
staff were using anyway. Sellable as a product or as a productized audit —
the audit version needs no code to start and validates demand for the
product version.

**Why this one.** The buyer (owner/office manager) has a concrete fear,
compliance pressure is arriving, and the enterprise vendors won't come down
to $100/month. Pairs naturally with opportunity 4 as the "governance" half
of the same conversation.

---

## 4. Productized AI implementation for small business

**The gap.** 60% of SMBs have no in-house expertise to implement AI; 73% of
those using it say they need more training; roughly half of AI-using firms
invested nothing in implementation — and outcomes correlate with
implementation, not adoption. The typical failure mode is "buy ChatGPT Team
and walk away."

**What to build.** Not SaaS — a productized service with fixed scope and
price: pick one workflow, wire AI into it properly (specification,
verification, integration — the exact discipline the portfolio copy
describes), train the team, leave behind something measurable. Rain Check
and Doorknock are the proof artifacts. This is the fastest path to revenue
of anything on this list because it requires zero new product.

---

## 5. Runner-up verticals (pure micro-SaaS plays)

Validated as underserved with severity 4.0–4.5/5 and fewer than 8
competitors each (BigIdeasDB / Superframeworks, 2026), but with no special
fit advantage — pick one only if the goal is a standalone SaaS bet:

- **Home inspector reporting** — Word templates and manual email; incumbents
  overpriced or "stuck in the early 2000s UI era".
- **Small-municipality permit tracking** — paper forms and Access databases;
  civic tech starts at $50K.
- **Specialty food producer compliance** — nutrition labels and ingredient
  lot tracking in spreadsheets; food ERP starts at $10K/year.
- **Pet services / music studios / tattoo studios** — bookings living in
  Instagram DMs and Venmo; nothing mainstream addresses the workflow.

A note on Doorknock's territory: pre-call sales intelligence is crowded
(Clay, Apollo, and a wave of AI SDR tools). Doorknock's edge — reading what
a company already runs from its own website, filed into the CRM — is a
feature moat, not an open gap. Sell it as part of opportunity 4 rather than
building it out as a standalone bet against funded incumbents.

---

## Recommended sequence

1. **Now:** package opportunity 4 (implementation service) — it funds
   everything else and needs nothing built.
2. **Next build:** opportunity 1 — the Rain Check rebooking engine, sold to
   local trades first, charters second. It's the best-validated product gap
   with an existing head start.
3. **In parallel, as open source:** the MCP test harness (opportunity 2) at
   whatever pace credibility-building allows.
4. **Watch:** shadow AI for SMBs (opportunity 3) — start as an audit
   offering inside opportunity 4's sales conversations; build product only
   if the audits keep landing.

## Sources

- https://superframeworks.com/articles/untapped-underserved-micro-saas-niches
- https://bigideasdb.com/boring-industries-begging-for-micro-saas
- https://bigideasdb.com/niche-saas-opportunities-by-industry-2026
- https://www.stainless.com/mcp/how-to-test-mcp-servers/
- https://www.arcade.dev/blog/evaluate-mcp-tools/
- https://medium.com/@MattLeads/6-critical-challenges-facing-the-mcp-in-2026-06258e914402
- https://workos.com/blog/everything-your-team-needs-to-know-about-mcp-in-2026
- https://www.vectra.ai/topics/shadow-ai
- https://optro.ai/blog/shadow-ai-stats
- https://www.advantechits.com/insights/shadow-ai-the-hidden-ai-risk-most-smbs-already-have
- https://www.business.com/articles/ai-usage-smb-workplace-study/
- https://capsulecrm.com/blog/small-business-ai-adoption-statistics/
- https://www.langchain.com/state-of-agent-engineering
- https://www.workyard.com/compare/plumbing-software
- https://knowify.com/resources/best-plumbing-software/
- https://www.bellafsm.com/lawn-care-rain-delay-scheduling/
- https://www.fieldproxy.ai/resources/blog/best-landscaping-software-ai-scheduling-2026
