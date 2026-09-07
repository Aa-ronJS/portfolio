# Setup, once

Everything the machine needs to run. About an hour, most of it in Stripe.

## 1. Stripe

1. Create a product, **Brief the Machine**, with one price: $35.00 AUD, one
   time. Copy the price id (`price_...`).
2. Turn on customer receipt emails: Settings, Emails, "Successful payments".
   Stripe sends the receipt; our webhook sends the access link.
3. Add a webhook endpoint: `https://<site>/api/webhook`, event
   `checkout.session.completed`. Copy the signing secret (`whsec_...`).
4. Copy a restricted API key with write access to Checkout Sessions and read
   access to Checkout Sessions. Nothing else.

## 2. Resend

1. Add and verify the sending domain.
2. Create an API key.
3. `FROM_EMAIL` is a real address on that domain with your name in front of
   it. `REPLY_TO` is the inbox you actually read, because the replies are the
   business.

## 3. Vercel environment variables

| Name | Value |
|---|---|
| `SITE_URL` | `https://aaronsteele.vercel.app` (no trailing slash) |
| `STRIPE_SECRET_KEY` | the restricted key |
| `STRIPE_PRICE_ID` | `price_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `RESEND_API_KEY` | `re_...` |
| `FROM_EMAIL` | `Aaron Steele <aaron@yourdomain>` |
| `REPLY_TO` | the inbox you read |
| `COURSE_SECRET` | 32 or more random characters: `openssl rand -base64 32` |

Changing `COURSE_SECRET` after launch invalidates every link already sent.
Set it once.

## 4. Deploy and test with a real card in test mode

```bash
npx vercel deploy --prod
```

Then, with Stripe in test mode and the test-mode key set:

1. Open `/course/`, click any button. You should land on Stripe Checkout.
2. Pay with `4242 4242 4242 4242`. You should be redirected to `/api/watch`
   and see the course with your email at the top.
3. Check the inbox: one receipt from Stripe, one "your link" email from you,
   with reply-to set. Reply to it and confirm it lands where you read.
4. In Stripe, Developers, Webhooks, confirm the event shows a 200.
5. Paste the link into a private window. It should open without a login.
   Change one character of it. It should refuse.

Switch to live keys only after all five pass.

## 5. Meta Pixel

Add the pixel base code to `public/course/index.html` and fire a `Purchase`
event of value 35 AUD from the course page on the first visit after payment.
The cleanest place is `api/watch.js`, in the `session_id` branch, by
appending `&paid=1` to the redirect and having the rendered page fire the
event when it sees it. Not done here because it needs your pixel id; it is
a five-line change.

## 6. Before the ad goes live

- [ ] All five test-mode steps pass on live keys with a real $35 purchase to
      yourself, then refunded.
- [ ] `REPLY_TO` inbox has a filter that stars anything with the subject
      "Re: Brief the Machine: your link".
- [ ] The three videos are scheduled: a date in your calendar within the
      seven days the page promises.
- [ ] `course/OPERATIONS.md` read once.
