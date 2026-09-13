# The operating model with a coding agent on tap

Written 13 September 2026. This refactors the plan on one changed
assumption: you have Claude Code available all day, every day. That
removes build capacity as a constraint. It does not remove the two that
remain: your selling hours and the physical act of packing a parcel.
Everything below follows from that.

## What actually changes

| Before | With the agent | What it is worth |
|---|---|---|
| Build the register first, defer billing, partner portal, dashboards and integrations to "after 50 accounts" | Build the entire operating system in the first two weeks, before the first sale, so every later hour is a selling hour | Six hours a week of your time back from month one; no admin debt |
| Customer service by hand, 3 minutes per account per month | Inbound triage, replies, reconciliation and the daily due list drafted by the agent; you approve | A$25k of year-three profit (fewer hired hours) |
| One answer page a week | Ten drafted in an afternoon, verified by you, published with structured data from week two | SEO ramp pulled forward two quarters: A$30k of year-three profit |
| Prospect lists by hand; cold follow-ups when you remember | Lists built from Google Places by suburb and trade; personalised first emails and follow-ups drafted and queued; you send | Direct sales up a quarter: A$13k |
| Partner outreach when there is time | Sequenced, personalised outreach to every WHS consultant, bookkeeper and association in SA; you take the calls | Partner recruitment up by half: A$54k |
| Retention as intention | Renewal notices, dunning, activation nudges, cancellation follow-ups all automated and measured | Churn 3.3 to 2.5 percent: A$29k |
| One product | Adjacent compliance modules built in days each: test-and-tag reminders, fire equipment service dates, SWMS and induction records, chemical register | Revenue per account up A$14 a month: **A$160k** |
| **All together** | | **A$441k of year-three profit; year one A$72k instead of A$42k** |

The last row is the honest hierarchy. Cheaper operations, faster content
and better outreach are each worth tens of thousands. Raising revenue per
account by selling more compliance to the same customer is worth more than
all of them combined, and it is the one thing the incumbents cannot copy
without engineers. That is where the agent's speed should go once the base
system exists.

The three-year view, agent-assisted case (same demand assumptions as the
base case; `channels.py --case claude`):

| | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Active accounts at year end | 469 | 1,525 | 2,947 |
| Revenue | 213,925 | 906,672 | 1,844,557 |
| Profit before paying yourself | 72,017 | 371,932 | 809,410 |
| Your hours a week | 25 | 19 | 16 |
| Take-home a week if paid as salary | 1,119 | 4,442 | 8,901 |

Treat year three as a business with a manager and a warehouse in it, as
before. The point is the slope, not the endpoint.

## The trap, named

Your own portfolio page says it: an agent will build the wrong thing
beautifully if nobody tells it what right looks like. With unlimited build
capacity the failure mode is not "we could not build it". It is a founder
who spends the selling hours building. Three rules:

1. **Sales hours are fixed and come first.** Sixteen hours a week in year
   one, in the calendar, not negotiable with yourself. The agent builds in
   the other hours.
2. **Nothing gets built without a customer conversation behind it.** Every
   backlog item below names the conversation that justified it. New items
   need one too.
3. **The agent proves its work.** Every feature ships with the smoke test
   extended, and the register's own data is the check: activation rate,
   scan-to-ship time, renewal rate. If a build does not move a number on
   the metrics page within a month, it was the wrong build.

## The build backlog, as specifications

Each item is written the way you brief a delivery team: what it must do,
what it must never do, what finished looks like. Hand each one to Claude
Code as-is. Items 1 to 5 are built and tested in this commit.

### 1. Partner portal and referral attribution (built)

Must: a `partners` table (name, type, contact, fee share, token); every
customer carries a `source` (direct, paid, partner, referral, seo, check)
and optionally a partner or a referring customer; a partner page at
`/p/TOKEN` showing every referred customer's compliance state, plan status
and renewal date, plus what the partner has earned and what is owed; a
payout record created at 15 percent of first-year plan revenue when a
referred account is opened; admin pages to add partners and mark payouts
paid; a partner-attributed link into the self-check (`/check?ref=TOKEN`).
Never: expose one partner's clients to another; let a partner see a
client's contact details beyond business name. Done when: a partner can
open their link on a phone, see three clients with states, and see A$46
owed.

### 2. Compliance self-check lead magnet (built)

Must: a public page at `/check` with eight yes/no questions a buyer can
answer in ninety seconds; a scored result with the specific gaps and what
fixes each; capture of business name, phone and email before the result;
a `leads` table and a webhook event so n8n can email you and them; partner
attribution from the link. Never: claim the result is legal advice or
that a passing score means compliance. Done when: a cold visitor from a
Google ad can get a "4 of 8" result and you get their number.

### 3. Stripe webhook and billing status (built)

Must: an endpoint at `/webhooks/stripe` that verifies the signature;
`invoice.paid` sets the customer active and moves the renewal date;
`invoice.payment_failed` sets past-due and notifies; a subscription
cancellation sets cancelled and records when; the compliance record shows
"renewal payment pending" rather than "lapsed" while dunning runs. Never:
trust an unsigned event; change a record on an event for an unknown
customer without logging it. Done when: a test event with a valid
signature moves a customer to past-due and back.

### 4. Retention metrics (built)

Must: an admin page with accounts by source, 30-day activation rate,
monthly logo churn, renewal rate for accounts whose renewal fell in the
last 90 days, kits per account, annual share, open requests older than two
business days, past-due count, and a signup-month cohort table. Never:
compute activation on accounts younger than 30 days. Done when: the two
stop-rule numbers from the retention plan are on one screen.

### 5. Content, outreach and prospecting scripts (built)

Must: `scripts/content.js` drafts answer pages from a topic list with the
compliance constraints baked into the system prompt and a verify-before-
publishing checklist in every file; `scripts/outreach.js` drafts one
personalised email per row of a prospect or partner CSV; `scripts/
prospects.js` builds that CSV from Google Places for a trade and a list of
suburbs. Never: publish a draft without your read; send an email the
script wrote without your edit; scrape where an API exists. Done when: ten
draft pages exist in `content/` and a fifty-row prospect list with drafted
first emails exists for one industrial estate.

### 6. Renewal and dunning flows (next; needs Stripe and Klaviyo accounts)

Must: 30-day renewal email with the certificate attached and the year's
shipments listed; 7-day call list for accounts over three kits or with no
scan in six months; Stripe smart retries on; 14-day unpaid call list;
cancellation survey with one required reason. Conversation: every
retention lever in `11-churn-and-retention.md`. Done when: the first
cohort's renewals run without you remembering anything.

### 7. Ops assistant (next; needs the email account)

Must: reads the shared inbox, classifies (refill, address change, cancel,
question, partner enquiry), drafts a reply and the app action, queues both
for one-tap approval on your phone; reconciles Stripe payouts to Xero
weekly and flags mismatches. Never: send or change anything without the
tap. Done when: your customer-service time is under one minute per
account per month on the metrics page.

### 8. Compliance modules (month 4 onwards; needs twenty customer conversations first)

Candidates, each a day or two of build: test-and-tag due dates per
appliance with a reminder and a tester referral; fire extinguisher and
blanket service dates; SWMS and induction record register; chemical
register with SDS links; AED already done. Priced as a "compliance
calendar" tier at A$19 to 29 a month per business. Conversation: which of
these the first twenty accounts already track in a spreadsheet or not at
all. Build the one they name most. Done when: 40 percent of accounts take
one module and revenue per account is up A$10.

### 9. Self-serve onboarding (month 6; needs Gate G3)

Must: a buyer in Perth can buy kits and a plan, register locations and
regos, and get a certificate without a call. Done when: a partner
referral outside SA converts with no founder touch.

## The week-one build order

Day 1: name, entity, Stripe, register running (already built).
Day 2: partner portal and self-check live (built); Google Business Profile.
Day 3: prospect list for one estate and drafted emails; ten answer pages
drafted, three verified and published with structured data.
Day 4: Stripe webhook connected; renewal and dunning emails in Klaviyo.
Day 5: metrics page reviewed; first ten walk-ins done with the offer sheet.

Then sixteen hours a week of selling, and the agent works the backlog in
the gaps, one conversation-backed item at a time.

## What the agent costs

At the volumes here (a few hundred drafts a month, a few thousand inbound
messages a year) the API spend is tens of dollars a month. Your Claude
Code subscription is the real cost and it is already paid. The scripts use
Claude Opus 5 with adaptive thinking and streaming; change the model in
one place if you want to.
