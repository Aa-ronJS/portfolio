# Launch checklist

Everything below the line is done and in the repo. Above the line is
what only you can do, in order. Nothing else is waiting on me.

## Only you can do these (in this order)

1. **Windows test, 15 minutes.** Fresh user account if possible. Setup
   kit zip, pack zip, `/quote Example - 12 Wattle St Ringwood`, open
   the PDF. PowerShell 7 has parsed every script clean and the whole
   quote, mark, invoice and chase chain has run for real on Linux, but
   no Windows machine has executed them. If anything fails, send me the
   screen and stop the launch until it is fixed.
2. **Measure one real wall from a photo.** Stick a blank A4 sheet on a
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
- Measuring: nothing to print. A blank A4 sheet is found automatically
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
