# 5. Architecture

The judgement document: how to decide what you are building before
any component exists. Architecture errors are the expensive kind
because they are invisible until month three; happily, at this scale
the decisions reduce to a handful of questions, and the answers are
boring on purpose.

## 5.1 The boring-stack doctrine

Rule one of one-person systems: **every technology must pay rent.**
Each framework, database, service and dependency you add is a thing
that can break, drift, bill you or demand an upgrade during a week
you are busy. AI makes adding technology feel free; it is the
opposite of free, because you, one person, maintain everything the
AI enthusiastically scaffolds. So the doctrine: choose the most
boring thing that does the job, add complexity only when a real
requirement forces it, and let the requirement arrive before the
technology does. Nobody ever regretted starting too simple; the
reverse regret is the entire project-rescue industry.

The AI corollary, worth pinning in CLAUDE.md: when the crew proposes
a stack, ask "what is the simplest version of this that satisfies
the spec, and what specifically would force us up a level?" The
answer is usually a level below the proposal, and the "what would
force us" answer becomes a decision-log entry that tells future you
exactly when upgrading becomes right.

## 5.2 The ladder

Four rungs cover essentially every small-business and side-project
system. Each rung is named with what forces the step up, and the
kit's build document works for all of them because the method does
not change, only the scaffolding's contents.

**Rung 1: static site.** Files served as-is: HTML, CSS, a little
JavaScript. No admin system, no server code, nothing to hack in the
conventional sense, effectively free hosting, fastest possible
pages. This is the right rung for brochure sites, portfolios,
landing pages, documentation and, with a forms service, everything
up to "people contact us". Forced up when: content must be edited
by non-git people weekly, or data must persist per user.

**Rung 2: static plus functions.** The same static site plus small
pieces of server code (serverless functions) for the moments you
genuinely need a server: receiving a form, talking to an API with a
secret key, sending an email. The hosting platforms in document 7
run these from a folder in your repo; no server to own. This rung
covers an enormous amount of real business machinery: lead capture,
booking notifications, payment links, webhooks between systems.
Forced up when: state must live somewhere between requests.

**Rung 3: add a database.** The moment information must persist and
be queried (bookings, users, orders, content that non-technical
people edit), you need a store. Managed only, never self-hosted at
this scale: a hosted Postgres or the platform's own offering, or,
honestly, a well-structured Google Sheet or Airtable behind a
function, which is a legitimate rung-3 database for low volumes and
keeps your data visible to you. Forced up when: rung 3 is not a
force-up problem; most systems live here forever.

**Rung 4: a framework application.** Next.js and its cousins:
templates, routing, server rendering, the works. The right rung
when the site is really an application (logins, dashboards,
many-paged dynamic data) or when a team will work on it. The AI is
excellent at frameworks, which is precisely the danger: it will
scaffold rung 4 for a rung 1 problem in ninety seconds and you will
maintain that decision for years. Climb here on requirement, not
on vibes.

**WordPress, positioned honestly:** WordPress is a parallel ladder,
not a rung: the right choice when non-technical humans must edit
content regularly and the plugin ecosystem's standard problems
(bookings, memberships, stores) match yours. This kit's method
works alongside it (the scaffolding and verification habits apply
untouched), but the component-by-component build in document 6
assumes the rungs above, because that is where directing an AI
crew, rather than configuring a product, actually pays.

## 5.3 The decision table

| The spec says | Build |
|---|---|
| Five-ish pages, content changes rarely, contact is the goal | Rung 1 + a form endpoint (rung 2) |
| Leads, notifications, a calculator, joins between two SaaS systems | Rung 2 |
| Bookings, quotes saved, small catalogues, member lists | Rung 3 (managed store or sheet-behind-function) |
| Accounts, dashboards, real product | Rung 4 |
| A non-technical person edits content weekly | WordPress, or rung 1 + a headless CMS if you enjoy trade-offs |
| An online store | Shopify or WooCommerce before anything custom; custom carts are how deposits get lost |

## 5.4 Structure that ages well

Whatever rung, the folder shape is the same and the AI should be
told to keep it: content pages in one obvious place, one shared
stylesheet, one folder for functions (`api/` by convention), the
four scaffolding files at the root, and a README that says how to
preview and deploy in two commands. Flat beats clever; a project a
stranger can navigate in sixty seconds is a project the AI
navigates reliably too, and "the stranger" is you in eight months.

Two structural habits with outsized returns: **derive, don't
duplicate** (any number, list or block appearing on two pages should
have one source the pages are generated or included from; ask the
AI to set that up the second time you paste something), and **fail
loudly** (functions that catch errors silently are how integrations
rot; the spec's "must never" list should include silent failure,
and document 8 will hold you to it).
