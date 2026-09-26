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
7. **Find my quotes (optional, the app works without it):** each login
   shows up in the app the moment its two values are in Vercel's
   environment settings. Every one uses the same return address:
   `https://chasem.app/find/back`.
   - **Outlook / Microsoft 365** (about 10 minutes): portal.azure.com, App
     registrations, New registration, "Accounts in any organizational
     directory and personal Microsoft accounts", Web redirect URI above.
     API permissions: Microsoft Graph, delegated, `Mail.Read` and
     `User.Read`. Certificates & secrets, new client secret. Put the
     Application (client) ID in `MS_CLIENT_ID` and the secret's value in
     `MS_CLIENT_SECRET`.
   - **Xero** (about 5 minutes): developer.xero.com, My Apps, New app, Web
     app, redirect URI above. Put the client ID and secret in
     `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET`. Past a small number of
     connected businesses Xero asks for certification or a paid plan.
   - **Gmail** (slow): console.cloud.google.com, new project, enable the
     Gmail API, OAuth consent screen (external), add the scope
     `gmail.readonly`, Credentials, OAuth client ID, Web application,
     redirect URI above. Put them in `GOOGLE_CLIENT_ID` and
     `GOOGLE_CLIENT_SECRET`. Until Google verifies the app (reading mail is
     a "restricted" scope, which means a security assessment), only up to
     100 test users you list on the consent screen can use it, and they see
     an "unverified app" warning.

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
