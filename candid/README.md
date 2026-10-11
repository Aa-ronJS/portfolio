# Candid

Paid, private, peer-checked feedback. A business writes a brief, prepays
credits, and sends personal invite links to the people it has recruited.
Each reviewer uses the product, writes a review against the brief,
reports process issues, and blind-rates three peers. Reviews are private
to the business and never published. Issues are listed as teasers and
unlocked with credit, priced by the peer score. Claude triages flags; a
person decides; a flag undecided for seven days releases the payout.

One Vercel project, no build step. The rules live in `api/_engine.js`
and are the whole product; everything else is plumbing and screens.

```
public/index.html                    the landing page: what it is, how a period runs, price, early-access form
public/app.html, app.js, app.css     the owner's app at /app: sign in, businesses, the period, reviews, issues,
                                     credits, brief, and the platform pages (queue, payouts, reviewers, leads)
public/r.html                        the reviewer's page, reached at /r/<token>; carries the pitch at three
                                     moments (invitation, after submitting, after payout) linking to /?via=<business>
api/auth.js                          one passcode, a signed cookie
api/business.js                      the owner's reads and actions, one business at a time
api/reviewer.js                      the reviewer's reads and actions, by invite token
api/lead.js                          early-access requests from the landing page, attributed to the business they came through
api/_engine.js                       the rules: brief, period, seats, scoring, flags, settlement, the clock
api/_ai.js                           Claude (structured outputs) with a heuristic fallback
api/_store.js, _db.js                one JSON document per business, saved under a version check
db/*.sql                             four tables
tools/dev.mjs                        a local server on pglite, no accounts needed
tests/engine.mjs                     the rules alone: balanced assignment, late ratings during settlement
tests/period.mjs                     a whole period through the real handlers on real Postgres (pglite)
tests/browser.mjs                    both pages in Chromium against the dev server
```

## Run it locally

```
npm install
npm test                 # engine.mjs, period.mjs, and browser.mjs when Playwright and Chromium are present
node tools/dev.mjs       # http://localhost:3123 (landing), /app (owner, passcode local-passcode), data in memory
```

Set `ANTHROPIC_API_KEY` to have Claude score, categorise, deduplicate and
triage; without it the built-in heuristics do, and the app says so.

## Deploy

1. A Postgres database. Supabase or Neon, the pooled connection string.
2. `npx vercel` from this folder, then in the project's environment
   settings:

   | Variable | What |
   | --- | --- |
   | `DATABASE_URL` | the pooled Postgres URL |
   | `OWNER_PASSCODE` | your sign-in, 8+ characters |
   | `SESSION_SECRET` | any long random string |
   | `APP_URL` | the deployed address with a trailing slash, used in invite links |
   | `ANTHROPIC_API_KEY` | optional; Claude on, heuristics off |

3. `npx vercel --prod`. The schema applies itself on the first request.
   The owner app is at `/app`; `/` is the landing page ads point at.

## Running a pilot

1. Sign in, create the business, answer the seven brief questions.
2. Credits: add what you are prepared to pay. Card payments are not
   connected in this build; the ledger records it.
3. Review period: start one, fund it (seats × $24: $20 to the reviewer,
   20% platform fee), open recruiting.
4. Copy the recruitment post and the invite links. Each link is one seat
   and is used once. Send each person their own link.
5. Reviewers accept on their phone, give a PayID, declare whether they
   knew you, write the review (saved as they type), report issues.
6. When everyone has submitted, or you end the open stage, peer rating
   starts. Tell reviewers to open their link again. It closes when all
   ratings are in or after seven days.
7. Settlement: scores are final, fees release unless a flag is open.
   Queue: decide each flag. Payouts: pay by PayID from your bank, mark
   paid. Issues: unlock what the score says is worth it.
8. Next period starts on the latest brief. Reviewers who return with the
   same email keep their reputation.

What is deliberately not here yet: card payments, automated payouts,
email sending, a reviewer marketplace, more than one owner account.
