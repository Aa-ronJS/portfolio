# Launch, start to finish

Six steps. Two of them are scripts you run; the rest is filling in who you
are and pasting what the scripts print. Nothing here is reversible-hard:
run the whole thing in Stripe **test mode** first, pay yourself with
`4242 4242 4242 4242`, and only then do it again with your live key.

Check where you stand at any point:

    node quote-and-chase-landing/tools/launch-check.mjs

---

## 1. Deploy the relay onto chasem.app

The Vercel project `quote-and-chase-landing` is the whole thing: the
landing page at the root, the app under `/app/`, and the relay that sends
the texts, counts the messages and talks to Stripe under `/api/`. One
project, one domain, so the app and its own sender are same-origin and
nothing between them is a cross-origin request.

    cd quote-and-chase-landing
    npx vercel deploy --prod

Then, in the Vercel dashboard for that project, Settings -> Domains:

- add `chasem.app` and make it the primary domain
- add `www.chasem.app` and set it to redirect to `chasem.app`

DNS already points at Vercel. The certificate is issued a minute or two
after the domain is attached; until then `https://chasem.app` will not
answer at all and plain http returns a Vercel 404, which is what "the
domain is registered but not yet attached to a project" looks like.

Check it worked before going on: `https://chasem.app/` shows the page,
`https://chasem.app/app/` opens the app, and `https://chasem.app/og.png`
returns the link-preview image.

Every later step assumes that address. The code already does: the app's
`signup_url`, the set-up links the relay emails, the billing portal return
and the CORS list all default to chasem.app, so there is nothing to paste
for any of them. You will come back and set the secrets in step 3.

There is one address and no second one. The old GitHub Pages copy at
`aa-ronjs.github.io/portfolio/` is retired: what is left there is a page
that sends people here, and a service worker whose only job is to delete
the old cached app and unregister itself, because a cache-first app that
is merely deleted keeps running on any phone that installed it. If anyone
has jobs saved at that address, that page hands them a back-up file to
load in Set-up here -- jobs live in the phone's storage for the address
they were made at and do not follow anyone across.

## 2. Make everything in Stripe

One command builds the product, the three prices, the three Payment Links
and the webhook, all wired correctly:

    node quote-and-chase-landing/tools/stripe-setup.mjs \
      --key sk_test_YOURKEY \
      --site https://chasem.app \
      --relay https://chasem.app

It prints three blocks to paste. It is safe to run again: it looks
everything up first and never makes a second copy. Prices in Stripe cannot
be edited, so if you change your mind on price, archive the old one in the
dashboard and re-run.

Keep the `RELAY_SIGNING_SECRET` it prints. Every painter's sending token is
signed with it, so changing it later stops everyone's sending until they
open the app again.

## 3. Set the relay's environment variables

Paste the block the script printed into Vercel, and add the four that only
you can supply: your Twilio account SID, auth token and Messaging Service
SID, and your Resend key with a verified `RESEND_FROM` address. Redeploy.

The message numbers must match the page exactly. If the relay says 150 and
the page says 200, the page is lying to a customer.

| What | Relay (Vercel) | Page (`public/config.js`) |
|---|---|---|
| Free messages on sign-up | `FREE_MESSAGES` | `FREE_MESSAGES` |
| Included, solo | `INCLUDED_MESSAGES` | `INCLUDED_MESSAGES` |
| Included, two phones | `INCLUDED_MESSAGES_TWO` | `INCLUDED_MESSAGES_TWO` |
| Messages in a pack | `TOPUP_MESSAGES` | `TOPUP_MESSAGES` |
| Price of a pack | `TOPUP_PRICE` | `TOPUP_PRICE` |

## 4. Fill in who you are

In `quote-and-chase-landing/public/config.js`: `SUPPORT_EMAIL`, `ABN`,
`BUSINESS_NAME`, `BUSINESS_ADDRESS`, `MAKER_NAME`, `MAKER_NOTE`,
`MAKER_PHOTO`. The refund promise is a service warranty under Australian
law, so the terms need a real name and address behind it. The maker block
is not decoration either: nobody hands a card to an anonymous website.

In `quote-and-chase-app/config.js`: `signup_url`, which the script printed.

## 4a. Twilio needs to know who you are before it sells you a number

Australia requires it, so this is a hard gate and it is worth starting early:
until it clears, Twilio refuses both buying a number AND sending a message,
with `code 20003, Primary compliance profile is not approved`. Nothing about
the relay is wrong when you see that.

In the console: Trust Hub, then Regulatory Compliance, and make a bundle for
**Australia / Mobile**. Twilio asks for either

- **Business** (use this one): business name, a document proving it, proof of
  the business address, and the ABN; or
- **Individual**: your name, photo ID, and proof of your home address.

Use the business route -- it wants exactly the same details as step 4, so you
fill them in once. Approval is not instant.

Only then can you buy an AU Mobile number. Whichever way you buy it, it has to
be added as a sender on the "Quote and Chase" Messaging Service -- scheduled
SMS goes through the service, not a bare number -- and its inbound webhook
pointed at `https://chasem.app/api/sms-in` so a client's reply reaches the
painter.

**Done:** +61 485 037 493, on the service, webhook set.

One thing to know if you ever see the 20003 again: with credentials set but no
approved profile, the relay's ping still answers `sms: true`, because it is
reporting that it HAS credentials and a Messaging Service, not that Twilio will
accept a message. That is safe rather than silent -- the app shows the failure
and the painter taps Send himself, which is what the soft wall is for -- but do
not read `sms: true` as "it can send".

## 4b. Finish the support inbox (two minutes, free)

`help@chasem.app` is on the terms, in the welcome email and in the refund
promise, and the DNS for it is already on the domain:

    MX   @  mx1.improvmx.com  (10)
    MX   @  mx2.improvmx.com  (20)
    TXT  @  v=spf1 include:spf.improvmx.com ~all

What is left is the account that tells the forwarder where to send it. At
improvmx.com: sign up, add `chasem.app`, and forward `help@` to the inbox you
actually read. Nothing to paste back -- the records are in place, so it starts
working the moment the domain is added there.

Until that is done, mail to help@chasem.app bounces. Send yourself one and
check it arrives before any ad runs, because it is the only way a painter can
reach you.

## 5. Point Twilio's inbound webhook at the relay

On your Messaging Service, set "a message comes in" to
`https://YOUR-PROJECT.vercel.app/api/sms-in`. Without it, a customer who
replies to one of your texts is shouting into a void.

## 6. Walk through it as a stranger

Still in test mode:

1. Open the app, give an email, and confirm twelve messages appear.
2. Send them. Confirm the sixth is refused and the app offers to write it
   for you instead.
3. Subscribe on the solo link. Confirm the welcome page shows the "Set up
   my app" button, that tapping it on a phone loads your details, and that
   the app then says 150 messages.
4. Tap Top up. Confirm $35 in Stripe and 100 more messages in the app.
5. Subscribe on the two-phone link with a second email. Confirm the app
   offers "Set up the second phone", and that the second phone draws on
   the same messages.
6. Cancel from inside the app. Confirm the app says cancelled and keeps
   working.

Then run the whole of step 2 again with your live key, paste the new
values, and check again:

    node quote-and-chase-landing/tools/launch-check.mjs --relay https://YOUR-PROJECT.vercel.app

---

## Two things to watch once money is coming in

**One shared sender.** Every painter's texts leave through the same Twilio
Messaging Service. If one of them ever texts a bought list, that number can
be filtered for everybody. Split the sender pool before this gets big.

**The counter is not locked.** Two messages sent in the same instant can
both read the same balance, so very occasionally a painter gets one more
than he paid for. That is cheaper to accept than to lock, but it is worth
knowing before you see it.
