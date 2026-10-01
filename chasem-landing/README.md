# Chasem: site and relay

Chasem chases quotes and invoices for Australian tradies: every quote
followed up, every yes booked in, every invoice chased until it is paid.
It is $99 a month (GST inclusive) with 150 messages; signing in with an
email gives 12 free messages first. Painters also get quoting and
measuring. This folder is the website, the serverless relay the app talks
to, and a copy of the app itself. The go-live list is `GO-LIVE.md`.

`public/app/` is a byte-for-byte copy of `../chasem-app/`; keep them
identical and bump `sw.js`'s VERSION when you change one. The app keeps its data per address, so there is one canonical
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
public/index.html     the page: hero, ways to bring quotes in, try-it box (the app's own reader, nothing sent),
                      how it chases, painters, price, sign-up, what is where, FAQ
public/privacy.html   what is stored, what leaves the phone and to whom (hard-coded "Last updated" date)
public/terms.html     1 the app, 2 the plan and its guarantee, 3 the laptop pack, 4 changes
public/welcome.html   after payment: the set-up button and the first steps
public/config.js      prices, message counts, Stripe links, business name, ABN, support email
public/app/           the app (copy of ../chasem-app)
public/app-home.png, app-nudge.png, og.png   screenshots and share image, drawn from the app by
                      ../chasem-app/tests/make-landing-shots.cjs and make-og.cjs
api/signin.js         email and six-digit code; mints the free token
api/sync.js           the phone's work to and from the account (jobs, settings, availability, payments)
api/photo.js          job photos to and from private storage (Supabase)
api/msg.js            sending: texts through Twilio, email through Resend, scheduled or now
api/renew.js, portal.js, topup.js, stripe-webhook.js, setup-link.js, signup.js   the $99 plan and its messages
api/y.js              the customer's accept and pick-a-start-day page
api/sms-in.js         replies to our number: YES accepts, anything else is passed on
api/gcal.js           optional Google Calendar free/busy
api/connect.js, paid.js   card payments on invoices (Stripe Connect)
api/find.js           Find: log in to Outlook, Gmail or Xero once and bring back the quotes found
api/read.js           read a photo or scanned PDF of a quote (Claude)
api/demo.js           the old painting photo demo; no page uses it now
api/admin.js, feedback.js   owner tools and tester feedback
db/*.sql              the schema, applied by itself on the first request after a deploy; every file must be safe to run twice
tests/*.mjs           `npm test`, against pglite and stubbed providers
```

## Deploy

```bash
cd chasem-landing
npm install
npm test
npx vercel deploy --prod
```

## Environment (Vercel)

| Variable | What it is for |
|---|---|
| `DATABASE_URL` | Postgres (Supabase). Sync, sign-in limits, found lists, payments, bookings. |
| `RELAY_SIGNING_SECRET` | Signs every token; never change it once live or every phone is signed out. |
| `SITE_URL`, `APP_URL`, `RELAY_URL`, `ALLOWED_ORIGINS` | https://chasem.app, https://go.chasem.app/, https://chasem.app/api/msg, the app's origins. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | The $99 plan, top-ups, and Connect. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` | Texts. |
| `RESEND_API_KEY`, `RESEND_FROM` | Email, including sign-in codes. |
| `SUPPORT_EMAIL`, `OWNER_EMAIL`, `OWNER_MOBILE`, `FEEDBACK_TO` | Where help, sign-up alerts and tester feedback go. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` | Job photos in private storage. Without them photos stay on the phone. |
| `MS_CLIENT_ID`, `MS_CLIENT_SECRET` | Find: Outlook. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Find: Gmail, and Google Calendar free/busy (one Google client, two redirect addresses). |
| `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET` | Find: Xero. |
| `ANTHROPIC_API_KEY` | Reading a photo or scanned PDF of a quote (`api/read.js`, Claude Opus 5). |
| `READ_PER_HOUR`, `READ_FREE_PER_HOUR`, `READ_ALL_PER_HOUR` | Reads an hour per paid tradie (30), per free tradie (5), and in total (200). |
| `SIGNIN_PER_IP_HOUR`, `SIGNIN_ALL_HOUR`, `MSG_PER_IP_LIMIT`, `AUTO_TOPUP_CAP` | Limits; the defaults are sensible. |
| `SEND_PER_DAY` | Most automatic messages one tradie can have going on one day, per channel (60). |
| `META_PIXEL_ID`, `META_CAPI_TOKEN` | Tells Meta, from the server, when a tradie from an ad signs up, finishes set-up (`StartTrial`), sends his first chase (`Activated`) and subscribes. Off until both are set. `META_TEST_EVENT_CODE` sends to Events Manager's test view; `META_API_VERSION` (default v21.0) if Meta retires it. |
| `MIGRATE_SECRET` | Lets `/api/admin` run the schema by hand, and read the funnel: `{secret, action: "funnel", by: "week" \| "ad" \| "campaign" \| "source" \| "trade", seconds: true}` gives joined, set up, chasing, chasing inside 7 days, paid and still paying. |

Each Find login and quote reading switches itself on when its values are
set, and the website only mentions the ones that are
(`GET /api/find?action=which`). Step-by-step registration is in
`GO-LIVE.md`.

## Pages and files

`privacy` and `terms` carry a hard-coded "Last updated" date; change it
by hand when you change the words. `laptop` sells the older laptop pack
(`../chasem-pack`), `thanks` is its post-purchase page, `measure/` is the
photo measuring page (keep it identical to `chasem-pack/pack/measure/`),
and `qr-card` is a printable card. `public/sample-quote.pdf` must be a
quote the app made; regenerate it with
`node ../chasem-app/tests/make-sample-quote.cjs` after any PDF change.

## Card payments (Stripe Connect)

A tradie taps one button in Set-up, Stripe's own pages take his bank
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
time a tradie turns card payments on, the relay creates its own Stripe
webhook endpoint pointed at `/api/paid`, listening on connected accounts
for `checkout.session.completed` and
`checkout.session.async_payment_succeeded`, and keeps what Stripe hands
back in the `setting` table so it can check signatures.
`STRIPE_CONNECT_WEBHOOK_SECRET` still works as an override if you ever
make the endpoint by hand.

`tests/paid.mjs` covers the lot against pglite and a stubbed Stripe, and
`chasem-app/tests/apptest/cardpay.cjs` covers what the painter sees.

## Reading quotes (`api/read.js`)

A PDF from a quoting app is read on the phone (`ingest.js` parseDoc,
pdf.js in `app/lib/`) and costs nothing. A photo, or a scanned PDF with no
words in it, comes here: Claude Opus 5 with structured output and the
server-side fallback, low effort, roughly 2 to 4 cents a read. Nothing is
kept. It refuses to run without the database, because the database holds
the per-hour counters, and PDFs over five pages are turned away before
the model is asked. `tests/read.mjs` covers it with a stand-in model.

## Copy notes

The story on every page is: Chasem chases quotes and invoices for any
trade; bring in the quotes you already sent (texts, emails, PDFs, files,
or log in to your email or Xero); it follows them up on weekdays, books
the yeses and chases invoices until paid; one plan, $99 a month, with free
messages to start; painters also get quoting and measuring. Never promise
a login (Outlook, Gmail, Xero) or photo reading that is not switched on.
No testimonials or usage numbers until there are real ones. Do not
reintroduce "a free app", "charges nothing" or a card at sign-up. The
guarantee ("thirty days, money back, no reason needed") is a promise you
must honour; if you change it, change the terms too. The footer's
trademark line stays.

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
learns the URL can send on your account. `SEND_PER_DAY` (default 60) is the most
automatic messages one tradie can have going out on one day, per channel; the app
paces itself at 20 a day, so this only stops an app that does not. `MSG_PER_IP_LIMIT` (default 60 per
10 minutes) caps abuse. Test with
`node tools/msg-relay-test.mjs` (mocked Twilio and Resend).

## Accounts (`api/signin.js`, `api/account.js`)

Log in is an email and a password; Create an account takes a name, an optional business name, the email and a
password, then proves the inbox with a six-digit emailed code before anything exists. Forgot password and
"Email me a code instead" use the same code. Passwords are scrypt hashes in the `account` table
(`db/014-accounts.sql`); ten wrong in a row lock the account for fifteen minutes, and one place gets 60 tries an
hour. An account from before passwords is asked for the code once and picks a password then. Set-up > Account
changes the password or the email (a code to the new address), logs out, and deletes the account (refused while
a plan is still live, so nothing keeps charging). `tests/accounts.mjs` covers the server and
`chasem-app/tests/apptest/account-app.cjs` covers the screens.

Known limit: the phone's token does not expire, so changing the password does not log out other phones.

## Try it by hand, server and all

```bash
node tools/local.mjs   # http://localhost:8400/ is the app; http://localhost:8400/__mail is the test inbox
```

Real handlers and a real Postgres (pglite, kept in `.local/`); Stripe and email are stand-ins, so nothing is
charged or sent. Codes appear in the test inbox. Delete `.local/` to start from nothing.
