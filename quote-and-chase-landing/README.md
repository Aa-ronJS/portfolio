# Quote and Chase landing page

The pre-sale landing page for the painters' pack, with a live "point
your phone at a wall" demo behind a QR code. Static page plus one Vercel
serverless function that calls the Claude API.

```
public/index.html   the page (hero, how it works, demo, price, FAQ)
public/qr-card.html printable A6 card with the QR for counters, vans, expos
public/qr.svg       the QR code; regenerate for the real domain
api/demo.js         POST /api/demo: photo + notes -> sample quote JSON
tools/make-qr.py    regenerates qr.svg
```

## Deploy

```bash
cd quote-and-chase-landing
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

Everything you must edit is in `public/config.js`: checkout URL, email
form endpoint, Meta pixel ID, business name, ABN, support email, and
the date the video lessons will be delivered. Until the checkout and
form are set, their buttons show a polite "not connected" alert.

Other pages: `privacy`, `terms` (the 14-day guarantee is stated there),
`thanks` (post-purchase downloads; point your checkout's redirect at it)
and `qr-card`. `public/downloads/` holds the three customer zips built
by the two `package.sh` scripts; rebuild and copy them after any pack
change. `public/sample-quote.pdf` is a real output of the `/quote` skill
on the sample job.

The QR code on the page draws itself from the deployed URL, so it is
correct on any domain. `qr.svg` is the static fallback and the print
version; regenerate it for the final domain before printing cards.

The full go-live list is in `../quote-and-chase/launch/LAUNCH-CHECKLIST.md`.

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
in `api/demo.js` mirrors `quote-and-chase/pack/business/price-list.md`;
keep them in step if you change the defaults.

## Copy notes

Every number on the page cites its source in the same block. The
guarantee ("one working quote in 14 days or your money back") is a
promise you must honour; if you change it, change the FAQ too. The
footer's Anthropic trademark line stays.
