# Chasem landing page

The landing page for the free Chasem phone app (the product),
with the optional $249 laptop pack and the hosted waiting list as the
two paid tiers, plus a live "point your phone at a wall" demo behind a
QR code. Static page, one Vercel serverless function that calls the
Claude API for the demo, and the sending relay the app uses.

`public/app/` is a copy of `../chasem-app/`; keep them
identical. The app keeps its data per address, so there is one canonical
address and it does not move again: **https://go.chasem.app/**. The site
stays on https://chasem.app. Both are this one Vercel project:
`middleware.js` serves `public/app/` at the root of go.chasem.app (every
path except `/api/` and `/y/`, which answer on both hosts), so the app
still calls its relay on its own address and there is only one deploy.

The app used to live at https://chasem.app/app/; that address is now a
permanent redirect to go.chasem.app (the path and the `#/...` screen come
along), set in `vercel.json` for the chasem.app and www hosts only, so
previews still serve the app at `/app/`. `tests/routing.mjs` covers the
routing and the redirect.

```
public/index.html   the page (hero, what it does, demo, install, own-it, price, FAQ)
public/privacy.html what the app stores, what leaves the phone and to whom; hard-coded date
public/terms.html   app as-is terms, pack purchase terms and 14-day guarantee, hosted list
public/config.js    everything the owner fills in (TODO lines: SUPPORT_EMAIL, ABN, BUSINESS_NAME)
public/qr-card.html printable A6 card with the QR for counters, vans, expos
public/qr.svg       the QR code; regenerate for the real domain
api/demo.js         POST /api/demo: photo + notes -> sample quote JSON
tools/make-qr.py    regenerates qr.svg
```

## Deploy

```bash
cd chasem-landing
npm install
npx vercel                 # first deploy, creates the project
npx vercel env add ANTHROPIC_API_KEY production   # paste a key from console.anthropic.com
npx vercel --prod
```

Then point the QR at the real URL and redeploy:

```bash
pip install segno
python3 tools/make-qr.py https://your-domain.com.au/#try
npx vercel --prod
```

Until `ANTHROPIC_API_KEY` is set, the demo returns a canned example
marked "Example result", so the page works on day one and nothing can
run up a bill by accident.

## Wire up before running ads

Everything you must edit is in `public/config.js`: the checkout URL for
the laptop pack, the waiting-list URL and opening date for the hosted
version, the email form endpoint, Meta pixel ID, business name, ABN,
support email, and the date the video lessons will be delivered. Until
the checkout and form are set, their buttons render "Coming soon" (with
a mailto once `SUPPORT_EMAIL` is set) and the email forms stay hidden.
Nothing on the site alerts. The footer, privacy and terms pages print
the ABN and email only when they are set; the placeholders are gone, so
an empty value shows "Contact email coming soon" rather than a fake one.
The privacy and terms pages carry a hard-coded "Last updated" date;
change it by hand when you change the words.

Other pages: `privacy`, `terms` (the 14-day guarantee is stated there),
`thanks` (post-purchase downloads; point your checkout's redirect at it)
`measure/` (the photo measuring page with detect.js and ar.js, copied from
`chasem-pack/pack/measure/`; keep them identical) and `qr-card`. The hosted tier is a founding list until the hosted app
exists; its onboarding will reuse the intake fields in
`chasem/prebuild/`. `public/downloads/` holds the three customer zips built
by the two `package.sh` scripts; rebuild and copy them after any pack
change. `public/sample-quote.pdf` must be a quote the phone app made
(regenerate it from the app after any PDF change; the landing page links
it as "See a quote it makes").

The QR code on the page draws itself from the deployed URL, so it is
correct on any domain. `qr.svg` is the static fallback and the print
version; regenerate it for the final domain before printing cards.

The full go-live list is in `../chasem/launch/LAUNCH-CHECKLIST.md`.

## Card payments (Stripe Connect)

A painter taps one button in Set-up, Stripe's own pages take his bank
account and his ID, and every invoice he sends afterwards carries a Pay
by card button drawn on **his** account. The money never passes through
this platform. When a customer pays, Stripe posts to `/api/paid`, the
relay writes the payment down, and the next sync ticks the invoice off on
his phone and moves the job to paid, without him doing anything.

The code is `api/connect.js` (`start`, `status`, `link`, `void`),
`api/paid.js` (the Connect webhook) and `db/007-payments.sql`.

**One thing has to be done by hand, once:** sign up for Connect at
`dashboard.stripe.com/connect` and accept the platform agreement. That is
a legal acceptance; there is no API for it. Until it is done every call
answers `{ ok: true, off: true }` and the app quietly offers bank
transfer, with no error shown anywhere.

Everything else looks after itself. The schema applies on the first
request after a deploy (`ensureSchema` in `api/_db.js`), so a new table
never needs anybody to remember a migrate call -- which in turn means
every `db/*.sql` file here **must be safe to run twice**. And the first
time a painter turns card payments on, the relay creates its own Stripe
webhook endpoint pointed at `/api/paid`, listening on connected accounts
for `checkout.session.completed` and
`checkout.session.async_payment_succeeded`, and keeps what Stripe hands
back in the `setting` table so it can check signatures.
`STRIPE_CONNECT_WEBHOOK_SECRET` still works as an override if you ever
make the endpoint by hand.

`tests/paid.mjs` covers the lot against pglite and a stubbed Stripe, and
`chasem-app/tests/apptest/cardpay.cjs` covers what the painter sees.

## The demo function

- Model: `claude-opus-5` with structured output (zod 4 schema), medium effort. Roughly
  three to five cents per demo at current pricing.
- The browser shrinks photos to 1280 px JPEG before upload, so requests
  stay under Vercel's body limit and cost stays flat.
- Guardrails: 3 MB cap, per-IP limit (6 per 10 minutes) and a per-day
  cap (400) held in function memory. These are per instance and reset on
  cold starts, so they are a brake, not a wall. For a real campaign also
  turn on Vercel's Firewall rate limiting for `/api/demo`, and set a
  monthly spend limit on the Anthropic key in the console.
- `DEMO_DISABLED=1` switches the live demo off without a redeploy.
  `DEMO_PER_IP_LIMIT` and `DEMO_DAILY_CAP` override the defaults.
- Photos are sent once to the API and are not written anywhere. Say so
  in your privacy policy; the page already says it in the footer.
- If the photo is not a paintable surface the estimator says so kindly
  instead of inventing a quote.

## Test locally

```bash
npm run dev          # vercel dev serves the page and the function on localhost:3000
```

Without a key you get the canned example. With `ANTHROPIC_API_KEY` in
`.env.local` you get real quotes from real photos. The demo price list
in `api/demo.js` mirrors `chasem-pack/pack/business/price-list.md`;
keep them in step if you change the defaults.

## Copy notes

The story on every page is: Chasem is a quoting and chasing app for
Australian painters, sold as one monthly plan with the messages included
($99, or $149 for two phones), with the first three jobs free on nothing
but an email and no card until the monthly. It keeps a full copy on the
phone and the work in the painter's account; it measures with an A4
sheet, sends quotes and invoices, chases on its own, takes cards through
the painter's own Stripe, and books into the phone calendar. The laptop
pack is an optional extra for Claude Code users and stays out of the
sales copy (footer and FAQ only). Do not reintroduce "a free app",
"charges nothing", "your jobs never leave your phone" or a card at
sign-up. No testimonials, logos or usage numbers until there are real
ones. The guarantee ("thirty days, money back, no reason needed") is a
promise you must honour; if you change it, change the terms too. The
footer's trademark line stays.

The page is laid out as nav, hero (sample quote plus a real app
screenshot), how it works, features, the live demo, pricing, sign-up,
"straight about what is where", FAQ, a closing call to action and the
footer. `img/app-*.webp` are real screenshots of the app on its test
drive data; retake them when the screens change.

## The sending relay (`api/msg.js`)

The phone app sends SMS through Twilio and email through Resend via this
one function. The function itself stores and logs nothing: Twilio holds
scheduled SMS (up to 35 days ahead, needs a Messaging Service) and Resend
holds scheduled email (up to 30 days ahead). Vercel still keeps request
logs, and Twilio and Resend keep message logs; the privacy page says so.

Two ways to run it:

1. **Your own copy, credentials on the server.** Deploy this folder to
   Vercel and set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   `TWILIO_MESSAGING_SERVICE_SID` (or `TWILIO_FROM`), `RESEND_API_KEY`,
   `RESEND_FROM` (an address on a domain verified in Resend) and
   `ALLOWED_ORIGINS` (any origins beyond go.chasem.app, chasem.app and
   www.chasem.app, which are always allowed).
   In the app's Set-up, paste the URL `https://chasem.app/api/msg` and
   tick "the server already has my Twilio and Resend details".
2. **Shared relay, credentials on the phone.** Set `ALLOW_CLIENT_CREDS=1`
   on the deployment. Painters paste their own Twilio and Resend details
   into the app; they are sent with each request over HTTPS and never
   stored or logged by the relay.

Always set `RELAY_TOKEN` to a long random string (`openssl rand -hex 24`) and
paste the same string into the app under Set-up, Sending, "Relay token":
the Origin check is hygiene, not security, and without a token anyone who
learns the URL can send on your account. `MSG_PER_IP_LIMIT` (default 60 per
10 minutes) caps abuse. Test with
`node tools/msg-relay-test.mjs` (mocked Twilio and Resend).
