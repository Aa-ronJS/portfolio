# Launch checklist

> This list is for the downloadable **laptop pack** only. The hosted phone
> app at chasem.app has its own go-live list: `chasem-landing/GO-LIVE.md`.

Everything below the line is done and in the repo. Above the line is
what only you can do, in order. Nothing else is waiting on me.

> **Start here instead:** [`LAUNCH.md`](LAUNCH.md) is the
> step-by-step version, with the two scripts that do most of it for you.
> What follows is the reference for what each piece is and why.
>
> **Who this is sold to, and how:** [`GO-TO-MARKET.md`](GO-TO-MARKET.md) —
> the painter, the channel, the hook, the free allowance, where the offer
> appears and the number that decides more ad spend, with the reasoning
> and what was rejected. The council's full argument is in `council/`.

## One product, messages included: what to switch on

A painter gives an email inside the app, gets twelve messages -- three
whole jobs, because a job costs four -- and quotes.
When they run out he pays from inside the app and has a hundred a month.
Nothing needs you: no call, no set-up link to build, no token to paste, and
no cap to police, because the messages are the cap.

1. **Your details, config.js.** SUPPORT_EMAIL (the only way anyone reaches
   you), ABN, BUSINESS_NAME, BUSINESS_ADDRESS, MAKER_NOTE, MAKER_NAME,
   MAKER_PHOTO. The refund guarantee is a service warranty, so the terms
   need the giver's address.
2. **The relay, on Vercel** (project chasem-landing). Env:
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RELAY_SIGNING_SECRET`
   (a long random string; every token is signed with it, so changing it
   stops everyone's sending), `RELAY_URL` = `https://<site>/api/msg`,
   `APP_URL`, `SUPPORT_EMAIL`, `FREE_MESSAGES` (5), `INCLUDED_MESSAGES`
   (150), `TOPUP_MESSAGES` (100), `TOPUP_PRICE` (35), `AUTO_TOPUP_CAP` (3), `INCLUDED_MESSAGES_TWO` (250), your `TWILIO_ACCOUNT_SID` /
   `TWILIO_AUTH_TOKEN` / `TWILIO_MESSAGING_SERVICE_SID`, `RESEND_API_KEY`,
   `RESEND_FROM` (a verified address), and optionally `OWNER_MOBILE`,
   `OWNER_EMAIL` and `INBOUND_FORWARD_TO`. Keep the four message numbers
   the same in config.js and on the relay or the page will lie.
3. **The app's own config**, `chasem-app/config.js`: set
   `signup_url` to `https://<site>/api/signup`. Without it the app still
   opens on an email, but every message is written for the painter to send
   himself.
4. **Stripe.** Two Payment Links. One in **subscription** mode at
   PLAN_PRICE: collect name, email, phone and billing address and nothing
   else -- he types no business name, ABN or licence to pay -- success URL
   `https://chasem.app/welcome?session={CHECKOUT_SESSION_ID}`.
   Top-ups need no Payment Link: the app charges the card already on file
   through `api/topup.js`, so leave TOPUP_URL empty unless you want a
   fallback link for someone with no card saved. If you do make one, it is
   a one-off Payment Link at TOPUP_PRICE with metadata `qc=topup`. A webhook at `https://<site>/api/stripe-webhook` for
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
   Turn the **customer portal** on in Stripe settings or the app's Manage
   button has nothing to open. Then fill SUBSCRIBE_URL, TOPUP_URL and
   SETUP_LINK_API in config.js.
5. **Twilio inbound.** On the Messaging Service, set "a message comes in"
   to `https://<site>/api/sms-in`, so a customer who replies is answered.
6. **Test it as a stranger**, Stripe in test mode: sign up with an email,
   watch twelve messages appear, spend them, watch the next be refused and
   the app fall back to writing it for you, then subscribe and watch the
   count become 150. Then tap Top up and confirm $35 lands in Stripe and
   100 messages land on the account, and switch on automatic top-ups and
   confirm it stops at three packs in a month. `node scratchpad/smoke/send/credits.cjs` runs
   the same chain against a stubbed Stripe, Twilio and Resend.

### The counter, and where the money can leak

Messages are counted on the Stripe customer record (`qc_used`,
`qc_period`, `qc_extra`), so there is still no database. Two things to know.
Every painter's texts leave through **one shared Twilio Messaging Service**:
if one of them ever texts a bought list, that number can be filtered for
everybody, so split the sender pool before this gets big. And two messages
sent in the same instant can both read the same balance, so a painter could
very occasionally get one more than he paid for; that is cheaper to accept
than to lock.

## Only you can do these (in this order)

1. **Windows test, 15 minutes.** Fresh user account if possible. Setup
   kit zip, pack zip, `/quote Example - 12 Wattle St Ringwood`, open
   the PDF. PowerShell 7 has parsed every script clean and the whole
   quote, mark, invoice and chase chain has run for real on Linux, but
   no Windows machine has executed them. If anything fails, send me the
   screen and stop the launch until it is fixed.
2. **Stand up the sending relay.** Deploy `chasem-landing` to
   Vercel (`npx vercel --prod`) on the chasem.app domain, set
   `ALLOWED_ORIGINS` to `https://chasem.app,https://www.chasem.app` and
   either the Twilio/Resend env vars or
   `ALLOW_CLIENT_CREDS=1`. Create a Twilio Messaging Service (scheduled
   SMS needs one) and verify a sending domain in Resend. In the app,
   Set-up, Sending, paste `https://<site>/api/msg` and send yourself a
   test SMS and a test email. Then send one real quote to yourself and
   confirm the follow-up arrives on the scheduled day.
3. **Measure one real wall from a photo.** Stick any A4 sheet on a
   wall, photograph the wall corner to corner, open the app (or
   `pack/measure/measure.html`), confirm the page and wall outlines,
   and compare the width and a door to a tape measure. The maths is verified on a physically rendered
   photo to well under 1%; a real phone lens (lens distortion is the
   unknown) and your taps are what remain to check. Do this once
   before you claim the accuracy in an ad.
3. **Deploy.** `cd chasem-landing && npm install && npx vercel
   && npx vercel --prod`. Note the URL.
4. **Anthropic key.** console.anthropic.com: new key, monthly spend cap
   (AUD 50 is plenty for week one). `npx vercel env add
   ANTHROPIC_API_KEY production`, redeploy. Photograph a wall from your
   phone and confirm the result says "Sample quote from your photo",
   not "Example result".
5. **One form endpoint.** A Formspree form (free tier is fine). Paste
   its URL into FORM_ACTION in `public/config.js`. Every capture on the
   page posts there with a `list` field, so one form covers the sample
   quote request, the send-to-laptop hand-off and the hosted founding
   list. Set three autoresponders by that field using
   `launch/emails.md`. If Formspree's plan will not branch on a field,
   send one autoresponder with all three links; it is not worth a
   second tool tonight.
6. **Checkout.** Gumroad or Lemon Squeezy product, AUD 249, upload the
   three zips from `chasem-landing/public/downloads/` or set
   the redirect to `https://your-domain/thanks`. Paste the product URL
   into CHECKOUT_URL. Set the buyer email sequence from `emails.md`
   (day 0, 2, 7, 12). Buy it yourself with a real card; refund yourself.
7. **config.js, the rest.** BUSINESS_NAME, ABN, SUPPORT_EMAIL,
   HOSTED_DATE (a month you can hold), and MAKER_NOTE plus MAKER_NAME
   plus a photo of you as `public/maker.jpg`. Two sentences in your
   voice about why you made this. This block is the only proof on the
   page until you have testimonials.
8. **Meta.** Business Manager, pixel ID into META_PIXEL_ID, domain
   verified, events prioritised (Purchase, Lead, ViewContent,
   InitiateCheckout). Ad account in AUD. Campaign from
   `launch/meta-ads.md`; stills are in `launch/creative/` (re-render
   `ad-still-source.html` on your machine if you want the web fonts
   rather than the sandbox fallbacks). Video when you have it; the shot
   list is in `course/scripts.md`.
9. **Record lesson one to seven** from `course/scripts.md` within the
   window you promised in LESSONS_DATE. Record after the first sales,
   not before, and re-record only the lesson whose screens change.
10. **Support inbox** watched morning and evening for the first week.
   Reply templates are at the end of `emails.md`.

## Done

- Setup kit (Windows and Mac installers, launcher, updater), tested on
  Mac flow in sandbox; PowerShell scripts parsed clean.
- Chasem pack: four skills, price list, wording, templates,
  PDF helper, ledger, sample job, HELP.txt; `/quote`, `/mark`,
  `/invoice` and `/chase` run end to end for real.
- Phone enquiry: room presets with S/M/L sizes and condition give a
  ballpark range from the painter's own price list while the caller is on
  the line, text it, save as a job with the rooms typed in; visit slots
  suggested by least added driving between the day's booked jobs and
  visits (postcode centroids, town/highway speed curve), calendar file
  with a 45-minute alarm and a confirmation text. Unit- and browser-tested.
- Sending relay (`chasem-landing/api/msg.js`): Twilio SMS
  (send, fixed-time schedule up to 35 days, cancel) and Resend email
  (send with PDF attachment, scheduled_at up to 30 days, cancel), CORS
  locked to the app origin, per-IP cap, credentials from env or from the
  phone with ALLOW_CLIENT_CREDS=1. Unit-tested against mocked Twilio and
  Resend; the app flow (email quote with PDF, schedule 3 follow-ups,
  cancel on accept, invoice reminders, cancel on paid, send now) tested
  with the relay mocked. NOT yet run against live Twilio or Resend.
- Phone app workflow: Quick quote (camera first, client details after,
  Send the quote), walls auto-save when you leave the room, travel worked
  out from the job postcode against the business postcode (GeoNames
  centroids, offline, 25 km free radius, both ways), labour-and-paint
  costing that derives the price list and shows a private hours/litres/
  margin card, follow-up reminders as calendar events at set days,
  bookings as calendar events with a Google Calendar link, Stripe card
  payment links on invoices with a check-payments button (restricted key
  stays on the phone; Stripe API tested with a mock, not a live key).
- Measuring: nothing to print. Any A4 sheet, printed or blank, is found automatically
  and sets the scale; the wall outline is found automatically (region
  growing from the page, edge snapping) and confirmed; doors and
  windows are proposed; the camera focal length (EXIF or self-
  calibrated) cross-checks the shape. Verified to under 0.5% width on
  seven physically rendered photos including a white page on a white
  wall. Fallbacks: tap the corners with a door, power point, ceiling
  height or tape for scale; AR tape on Android (WebXR, untested on a
  device here);
  RoomPlan LiDAR JSON converter; quote skill reads measurements first
  and labels every line measured or estimated.
- Landing page: own-it hero, phone demo with live estimator, QR that
  draws itself from the deployed domain, two tiers (owned, hosted
  founding list), guarantee with hosted credit, five FAQs, single-
  endpoint email captures including the send-to-laptop hand-off after
  a phone demo, optional maker block, Meta events.
- Privacy, terms (with the credit switch), thank-you page with
  downloads, printable QR card, real sample quote PDF.
- Demo API verified against a mocked Anthropic server; caps and
  kill switch in place.
- Customer zips built and on the thank-you page.
- Ad copy, targeting, budgets, kill rules; still creative in 1:1 and
  4:5; all emails; lesson scripts; help file.

## Decide after the first fortnight

- Hosted list versus owned sales. A wide margin for hosted means build
  the app (three to four weeks, reusing the demo engine, templates and
  the intake fields in `prebuild/`). Owned buyers who take the credit
  are the first hosted customers.
- Refund emails are the roadmap. Every one names the next fix.
- Downloads in `public/downloads/` are public URLs; move delivery to
  the checkout provider once sales start.
- Turn on Vercel Firewall rate limiting for `/api/demo` before
  raising ad spend.
