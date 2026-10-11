# Candid

Paid, private feedback for a business, checked by the reviewers' peers.
The business writes a brief, prepays credits and sends one invite link
per seat. Each reviewer uses the product, writes a signed review (name,
state, photo, and business for B2B), reports issues anonymously, and
rates three other reviews without seeing who wrote them. A review is
private unless the reviewer agrees it can be quoted; a quote carries a
paid-study note. Issues are listed as one-line summaries and unlocked
with credit, priced by peer score. Claude triages flags, a person
decides, and a flag left seven days releases the payout.

One Vercel project, no build step. The rules are in `api/_engine.js`.

```
public/index.html, terms.html, privacy.html   the landing page and the two documents it links to
public/app.html, app.js, app.css     the owner's app at /app: sign in, businesses, the period, reviews, issues,
                                     credits, brief, and the platform pages (queue, payouts, reviewers, leads)
public/r.html                        the reviewer's page at /r/<token>, with promo cards after the invitation,
                                     after submitting and after payout, linking to /?via=<business>
api/auth.js                          email and six-digit code; an email is an account; admins from ADMIN_EMAILS
api/business.js                      the owner's reads and actions, one business at a time
api/reviewer.js                      the reviewer's reads and actions, by invite token
api/admin.js                         the platform: queued flags, released payouts, accounts, across all businesses
api/checkout.js, stripe-webhook.js   credits by card through Stripe Checkout, credited once
api/photo.js                         a reviewer's photo, for the signed-in owner only
api/_email.js                        Resend, with the six email templates
api/_engine.js                       the rules: brief, period, seats, scoring, flags, settlement, the clock
api/_ai.js                           Claude (structured outputs) with a heuristic fallback
api/_store.js, _db.js                one JSON document per business, saved under a version check
db/*.sql                             the tables
tools/dev.mjs                        a local server on pglite, no accounts needed
tests/engine.mjs                     the rules alone: balanced assignment, late ratings during settlement
tests/period.mjs                     a whole period through the real handlers on real Postgres (pglite)
tests/browser.mjs                    both pages in Chromium against the dev server
```

## Run it locally

```
npm install
npm test                 # engine.mjs, period.mjs, and browser.mjs when Playwright and Chromium are present
node tools/dev.mjs       # http://localhost:3123 (landing), /app (sign in with any email; the code is filled in), data in memory
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
   | `SESSION_SECRET` | any long random string |
   | `ADMIN_EMAILS` | your email; comma-separated for more admins. Admins see the platform pages. |
   | `APP_URL` | the deployed address with a trailing slash, used in invite links and emails |
   | `RESEND_API_KEY`, `RESEND_FROM` | sign-in codes and reviewer emails. Without them nobody can sign in on production. |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | credits by card. The webhook endpoint is `/api/stripe-webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. |
   | `ANTHROPIC_API_KEY` | optional; Claude on, heuristics off |

3. `npx vercel --prod`. The schema applies itself on the first request.
   The owner app is at `/app`; `/` is the landing page ads point at.

## Running a pilot

1. Sign in with your email, create the business, answer the seven brief
   questions.
2. Credits: buy a pack by card. An admin can also record a bank transfer
   under Credits.
3. Review period: start one, fund it (seats × $24: $20 to the reviewer,
   20% platform fee), open recruiting.
4. Copy the recruitment post and the invite links. Each link is one seat
   and is used once. Send each person their own link.
5. Reviewers accept on their phone with their name, state and a photo
   (and their business for B2B), give a PayID, declare whether they
   knew you, write the review (saved as they type), choose whether you
   may quote it, and report issues.
6. When everyone has submitted, or you end the open stage, peer rating
   starts. Tell reviewers to open their link again. It closes when all
   ratings are in or after seven days.
7. Settlement: scores are final and fees are released unless a flag is
   open. Reviewers are emailed when rating opens and when a fee is
   released. Admin queue: decide each flag. Admin payouts: pay by PayID,
   mark paid. Issues: unlock the ones you want.
8. Next period starts on the latest brief. Reviewers who return with the
   same email keep their reputation.

Not included yet: automated payouts (PayID transfers are made by hand
from the Payouts page), GST handling on Stripe (set up Stripe Tax if the
business is registered), a reviewer marketplace.
