# Chasem go-live list (the hosted app)

What stands between chasem.app and a painter paying for it. This replaces
`chasem-pack/launch/LAUNCH-CHECKLIST.md` for the app; that file is only
about the older downloadable laptop pack.

Check the live state any time:

```
curl -s https://chasem.app/app/ | grep -o 'QC_VERSION="[^"]*"'   # the app build that is live
curl -s https://chasem.app/api/paid                               # card payments: table, listening
```

## Only you can do these

1. **Rotate the credentials that have been pasted into chat sessions:** the
   Vercel token, the Supabase secret key and the database password. Put the
   new values in Vercel's environment settings and redeploy.
2. **Send one email to help@chasem.app** and check it arrives. It is printed
   on the privacy and terms pages. The ImprovMX MX and SPF records are on the
   domain; whether the alias forwards anywhere is only visible in ImprovMX.
3. **GST on the subscription.** `config.js` says the business is GST
   registered, so the $99 and $149 monthly invoices Stripe sends must show
   GST. Set Australian GST up in Stripe Tax (or tell a session to run the
   `tax` action on `/api/admin`, which needs someone with live Stripe
   access to allow it).
4. **Supabase off the free tier** before real painters keep real jobs on it.
5. **Two checks only a real phone can do:**
   - Send a real quote to yourself and confirm the follow-up arrives on the
     scheduled day.
   - Measure one real wall from a photo against a tape measure before any ad
     claims the accuracy.
6. **Card payments (optional, the app works without them):** accept the
   Stripe Connect platform agreement in the Stripe dashboard, left sidebar,
   Connect. Everything after that sets itself up; see "Card payments" in
   `README.md`.

## Decide when it matters

- **The photo demo on the landing page** returns a canned example until
  `ANTHROPIC_API_KEY` is set in Vercel. Setting it costs money per photo.
- **Ads:** `MAKER_NOTE`, `MAKER_NAME`, `MAKER_PHOTO` and `META_PIXEL_ID` in
  `public/config.js` are empty. Nothing needs them until you run ads.
- **Vercel Firewall rate limiting** on `/api/demo` before raising ad spend.
  Sign-in already limits itself: 5 codes an hour per address, 30 per place
  asked from, 300 across everyone.

## Looks after itself

- New database tables apply on the first request after a deploy
  (`ensureSchema` in `api/_db.js`). Every `db/*.sql` file must be safe to
  run twice.
- The Stripe Connect webhook is created by the relay the first time a
  painter turns card payments on.
- The app's service worker fetches fresh code first, so a deploy reaches
  phones on their next load.
