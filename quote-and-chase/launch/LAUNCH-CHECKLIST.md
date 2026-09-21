# Launch checklist

Everything below the line is done and in the repo. Above the line is
what only you can do, in order. Nothing else is waiting on me.

## The Driveway Quote Hour: what to do before the first booking

The page, terms, booked page and app are built and live. Bookings stay
closed (the button is hidden) until you fill these, in this order.

1. **Trust plumbing, config.js.** SUPPORT_EMAIL, ABN, BUSINESS_NAME,
   BUSINESS_ADDRESS (a PO box is fine), BUSINESS_PHONE and PHONE_HOURS,
   MAKER_NOTE, MAKER_NAME, MAKER_PHOTO. The guarantee is a service
   warranty, so the terms must carry your address and phone.
2. **Hosted sending on your relay.** Redeploy the landing to Vercel with
   the env vars in `scratchpad/council5/build-relay.md` (or ask me for
   the list): your Twilio Messaging Service, your Resend key and a
   verified RESEND_FROM address, RELAY_TOKEN as now, and the new
   RELAY_TOKENS map, one token per painter with name, reply_to and
   until. Send yourself a scheduled text and an email through a mapped
   token before you take money. Decide alphanumeric sender (no replies,
   no monthly number fee) or a rented +61 number (replies, a monthly fee
   to Twilio), and keep the page's "nothing monthly to me" true either
   way, since the fee is Twilio's not yours.
3. **Checkout and calendar.** A Stripe Payment Link for the hour at
   SETUP_PRICE, in SETUP_URL. On the link: collect phone number and
   billing address, and three custom text fields with the keys
   `trading_name`, `abn`, `licence` (the webhook reads those keys). Its
   success URL: `https://aa-ronjs.github.io/portfolio/booked?session={CHECKOUT_SESSION_ID}`.
   A Cal.com or Calendly page with 75-minute evening slots in
   BOOKING_URL, minimum notice 20 hours, one slot an evening. Set
   SETUP_SLOTS_WEEK to the true number (three is honest at four hours a
   painter). Rehearse an on-screen refund on a $1 test payment so
   promise 1 is a ten-second action on the call.
4. **Link one, automatic (council six).** The relay now has
   `api/stripe-webhook.js`, `api/setup-link.js` and `api/sms-in.js`.
   In Stripe, add a webhook endpoint at
   `https://<your vercel site>/api/stripe-webhook` for
   `checkout.session.completed` and
   `checkout.session.async_payment_succeeded`; its signing secret goes in
   `STRIPE_WEBHOOK_SECRET`. Also on Vercel: `STRIPE_SECRET_KEY` (a
   restricted key that can read Checkout Sessions is enough), `APP_URL`
   (`https://aa-ronjs.github.io/portfolio/app/`), `BOOKING_URL`,
   `OWNER_MOBILE` (you get a text on every payment), `OWNER_EMAIL`
   (Reply-To and a copy of every link email). Then set
   `SETUP_LINK_API` in config.js to `https://<your vercel site>/api/setup-link`:
   the page switches to "the app is yours the minute you pay" and the
   booked page shows the Make the app yours button. Until it is set the
   page says "within the hour, 7am to 9pm" and you send link one by hand
   from `public/prefill.html`. Test with Stripe CLI in test mode
   (`stripe listen --forward-to`), one live $1 product, then delete it.
   Link two (real prices, open book, sending token, scoreboard start) is
   still built by hand on prefill.html after the fifteen-minute call.
   Loading link two now queues a reminder, for the next morning, on
   every invoice in the book that is already overdue; on the call, send
   the first one by hand from the Follow-ups tab while he watches.
4a. **Text replies.** On the Twilio Messaging Service, set "A message
   comes in" to `https://<your vercel site>/api/sms-in` (HTTP POST).
   Customers who reply to a hosted text get an automatic answer pointing
   them to the painter's mobile, and every hosted text now ends with
   "This number does not take replies: text or call me on 04xx". Set
   `INBOUND_FORWARD_TO` to your own mobile to get a copy of each reply
   to pass on. If you use a custom domain in front of Vercel, set
   `TWILIO_INBOUND_URL` to the exact public URL, because the signature
   covers it. Emails already go out as "<Trading Name>" on your address
   (the "via Quote & Chase" is gone) with Reply-To the painter.
5. **The Set-Up Log.** After each paid hour, add one line to SETUP_LOG in
   config.js (date, state, who with his OK, quote out on the call,
   sending live, second session, refund). It is the public count and
   the proof. Update FOUNDING_LEFT and FOUNDING_COUNTED the same day.
   New: `days_to_paid` (from the Scoreboard screenshot he sends, the
   number the page will one day be judged on) and `practice: true` for
   a run on a mate's phone before launch, which the page labels as such.
   The council's row zero: do one practice hour on a mate's phone,
   record it unedited, and put it in the log labelled practice.
5a. **Hosted for a year.** The council's effort scorer: set HOSTED_DAYS
   to 365 for the founding painters (about $50 a painter in Twilio and
   Resend over the year) and match RELAY_TOKENS `until` to it. The app
   shows a banner at 30 and 7 days and once it ends, either way.
6. **The float.** Keep every fee untouched until that painter's day 90.
   Promise 3 can refund up to day 100.
7. **The bonus pages.** BONUSES_READY stays false until the state pages,
   first-quote card, message library, unpaid invoice playbook and
   bookkeeper page exist and go out the day someone pays. About 22
   hours; not needed to open.
8. **Founding decisions.** FOUNDING_ENDS if you want a date as well as
   the count; LAST_CALL, BREAK_FROM, BREAK_TO for the Christmas line;
   HELP_SAME_DAY false if the inbox is not on your phone.
9. **The launch play the council recommended.** Five painters at no
   charge, recruited by message with the same conditions (one live job,
   use it 30 days, a ten-minute day-30 call), before paid bookings open,
   so the log and the page carry real results. The recruiting message
   and the day-30 questions are in `scratchpad/council5/tenx.md`.

## Only you can do these (in this order)

1. **Windows test, 15 minutes.** Fresh user account if possible. Setup
   kit zip, pack zip, `/quote Example - 12 Wattle St Ringwood`, open
   the PDF. PowerShell 7 has parsed every script clean and the whole
   quote, mark, invoice and chase chain has run for real on Linux, but
   no Windows machine has executed them. If anything fails, send me the
   screen and stop the launch until it is fixed.
2. **Stand up the sending relay.** Deploy `quote-and-chase-landing` to
   Vercel (`npx vercel --prod`), set `ALLOWED_ORIGINS` to
   `https://aa-ronjs.github.io` and either the Twilio/Resend env vars or
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
3. **Deploy.** `cd quote-and-chase-landing && npm install && npx vercel
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
   three zips from `quote-and-chase-landing/public/downloads/` or set
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
- Quote and Chase pack: four skills, price list, wording, templates,
  PDF helper, ledger, sample job, HELP.txt; `/quote`, `/mark`,
  `/invoice` and `/chase` run end to end for real.
- Phone enquiry: room presets with S/M/L sizes and condition give a
  ballpark range from the painter's own price list while the caller is on
  the line, text it, save as a job with the rooms typed in; visit slots
  suggested by least added driving between the day's booked jobs and
  visits (postcode centroids, town/highway speed curve), calendar file
  with a 45-minute alarm and a confirmation text. Unit- and browser-tested.
- Sending relay (`quote-and-chase-landing/api/msg.js`): Twilio SMS
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
