# Launch checklist: Quote and Chase for painters

Done and in the repo: setup kit, pack, installers, landing page, phone
demo function, privacy and terms pages, thank-you page with downloads,
sample quote PDF, customer zips, ad copy. Everything below is a thing
only you can do. Order matters; the first block is the go/no-go.

## Block 1: must be true before the first dollar of ads

- [ ] **Run the whole thing on a real Windows laptop.** Fresh user
      account if you can. Setup kit zip, then pack zip, then `/quote`
      on the example job, then open the PDF. The PowerShell scripts have
      never been executed; this sandbox is Linux. Fifteen minutes.
      Fix anything that breaks before anything else on this list.
- [ ] **Deploy the landing page.** `cd quote-and-chase-landing && npm
      install && npx vercel && npx vercel --prod`. Note the URL.
- [ ] **Turn the live demo on.** console.anthropic.com: new API key,
      set a monthly spend limit (AUD 50 is plenty for a test week).
      `npx vercel env add ANTHROPIC_API_KEY production`, redeploy.
      Open the page on your phone, photograph a wall, confirm a real
      quote comes back (the tag reads "Sample quote from your photo",
      not "Example result").
- [ ] **Fill in config.js.** BUSINESS_NAME, ABN, SUPPORT_EMAIL, and a
      real LESSONS_DATE (a calendar date, not "within 14 days"). Redeploy.
- [ ] **Hosted founding list.** A Tally or Formspree form (name, email,
      mobile, how many quotes a week) into HOSTED_URL, and the opening
      month into HOSTED_DATE. Nothing is charged; it measures demand for
      the hosted version against the owned one. If you would rather take
      money, a Stripe pre-order link works in the same slot.
- [ ] **Checkout.** Recommended: Gumroad or Lemon Squeezy. Both act as
      merchant of record, handle GST, deliver files and send receipts,
      so you need no Stripe account, no invoice logic and no download
      protection tonight. Product price AUD 249. Upload the three zips
      from `quote-and-chase-landing/public/downloads/`, or set the
      post-purchase redirect to `https://your-domain/thanks`. Paste the
      product URL into CHECKOUT_URL. Redeploy.
- [ ] **Buy it yourself** with a real card. Confirm the files arrive and
      the thank-you page loads. Refund yourself. That tests the refund
      path too.
- [ ] **Email form.** Formspree, Tally or Kit endpoint into FORM_ACTION.
      Set its autoresponder to send `public/sample-quote.pdf` and
      `pack/business/price-list.md`, since that is what the page promises.
- [ ] **Support inbox** watched morning and evening. Painters buy at 9pm.

## Block 2: Meta before the ad goes live

- [ ] Business Manager verified, ad account in AUD, payment method set.
- [ ] Pixel created; ID into META_PIXEL_ID; redeploy. The page fires
      PageView, ViewContent (demo used), Lead (email form),
      InitiateCheckout (buy click). The thank-you page fires Purchase.
      If you use Gumroad's own pixel integration instead, turn off the
      Purchase event on the thank-you page to avoid double counting.
- [ ] Domain verified in Business Manager; the four events prioritised
      under Aggregated Event Measurement (Purchase first).
- [ ] Meta's checks: working privacy policy link (yes, footer), working
      contact (your email), no before-and-after income claims (there
      are none), no Anthropic logos (none used).

## Block 3: creative

- [ ] Record the two-minute demo (shot list in `course/lessons.md`,
      section 0). Screen record the real `/quote` run on your Windows
      machine at 2x, phone footage of taking the photos. Vertical 9:16
      cut for Reels, 1:1 for feed. No talking head needed.
- [ ] If the video is not ready tomorrow: launch with the still
      creative in `meta-ads.md` (the quote card screenshot from the
      landing page hero) and swap the video in when it exists. Do not
      wait; the still will tell you whether painters click.

## Block 4: the honest pre-sale

The page now says "founding price, pack today, videos by DATE". Hold that
date. The written lessons ship inside the zip today; the videos are the
promise. If you would rather not owe videos on a deadline, remove the
lessons line from the price box and the FAQ and sell the pack alone.

## The hosted tier

It is a founding list, not a product, until the hosted app is built
(roughly three to four weeks of work, reusing the demo engine, the
templates and the intake fields in `quote-and-chase/prebuild/`). Decide
after the first fortnight: if the hosted list outgrows owned sales by a
wide margin, build it; if owned sells, keep going and build the hosted
version from the refund-credit switchers first. Owned buyers who invoke
the credit are your first hosted customers and testers.

## Block 5: first 72 hours

- [ ] Watch: click-through rate, demo use rate, lead rate, purchases.
      Kill criteria and budgets are in `meta-ads.md`.
- [ ] Every buyer gets a personal email within a day asking one
      question: did your first quote work? Their answers are the
      lesson-five footage and the next ad.
- [ ] Every support email that reveals a confusing step becomes a fix
      in the pack, then `./package.sh`, re-upload the zip.

## Known limits to remember

- Downloads in `public/downloads/` are public URLs. Fine for launch;
  move to Gumroad delivery and delete the folder once sales start.
- The demo's rate limits are per serverless instance. Turn on Vercel
  Firewall rate limiting for `/api/demo` before scaling spend.
- Claude Code's first-run screens (theme, login, trust folder) change.
  The setup kit handles installation; the video shows the rest.
