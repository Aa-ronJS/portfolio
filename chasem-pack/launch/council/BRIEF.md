# Council 8: the paid experience, and who it is for

You are one of four seats. You will argue, read the others, and you must end up agreeing on one answer to
each of the ten decisions below. Concede in writing when someone is right. Do not compromise into mush:
where you still disagree at the end, say so and say what evidence would settle it.

## The product, exactly as it exists today (not a plan, it is built and live)

A phone web app for Australian house painters, at https://aa-ronjs.github.io/portfolio/app/.
- Measure a room by sticking any A4 sheet on the wall and taking one photo (about 6 cm accurate on a 4 m wall),
  or type the sizes, or import a LiDAR scan.
- It prices the job at the painter's own rates and makes a three-page PDF quote in his name: his licence,
  insurance, colour schedule, terms. Nothing on it mentions us.
- Then invoices (deposit, progress, final), receipts, statements, his state's deposit rule, card payment links
  through his own Stripe, bookings into his phone calendar.
- It works offline. Every job lives in that phone's own storage. There is no server holding anyone's work, and
  the only back-up is a file he saves to his own Drive or iCloud.
- Follow-ups: three nudges for a quote (3, 7, 14 days), three for an invoice (3, 10, 21 days past due), in his
  words, business hours only, never on his state's public holidays. They stop the moment a quote is accepted or
  an invoice is marked paid. He can edit the wording of all six.

## The money, as built

- An email opens the app and brings 5 free messages. A message is one text or one email the app sends for him.
  Anything he sends himself from his own phone is free forever and is not counted.
- $99 a month: 150 messages. $149 a month: 250 messages and a second phone on the same account.
- A pack of 100 more messages is $35, bought with one tap on the card already on file. Optional automatic
  top-ups, capped at three packs a month.
- Sign-up creates a Stripe customer, which is the entire customer list. The message counter lives on that
  customer record. There is no other database.
- Costs: about 18c a text (estimate), email is effectively nothing, Stripe takes 2.2% plus 30c.
  A $99 customer typically costs $7.88 to serve, so you keep about $91.

## The flow as it is built today

1. Ad → the landing page at https://aa-ronjs.github.io/portfolio/
2. Page → "Start free, five messages" → opens the app
3. App shows a door: email (required), business name (optional) → "Start quoting"
4. That calls the relay, which makes a Stripe customer, mints a signed sending token with 5 messages, emails a
   set-up link, and drops him on a confirm screen → he taps Load
5. App opens. A set-up card lists four steps: name and business name, bank details, "make the prices yours"
   (one question: what do you charge for a day on the tools), and "let it chase for you".
6. He quotes. When he sends through the app, a message comes off the five.
7. At zero, the app keeps writing every message and he taps Send himself. The Follow-ups tab and Set-up show
   the balance and offer the plan.
8. Paying is a Stripe Payment Link. The page after payment has one button that sets the app up with his
   details and his 150 messages.

## Hard constraints you may not design around

- One person runs this. No calls, no demos, no onboarding sessions, no sales anything, ever. He refuses.
- Support is one email address, answered by him, same business day for a failed message.
- Nobody's jobs can move to a server: the privacy promise and the offline guarantee are load-bearing.
- Australian Consumer Law: no fake scarcity, no earnings claims that cannot be backed, guarantees honoured
  exactly as written. There are zero customers and zero testimonials today.
- Every painter's texts currently leave through one shared Twilio sender.
- The app cannot see his bank account, so he must mark invoices paid or it will chase someone who has paid.

## The funnel arithmetic you are arguing inside

Base assumptions, all guesses except the costs: $1.50 a click, 12.5% of clicks sign up, 5% of sign-ups pay,
6% leave each month. That gives about $12 a sign-up, $258 to win a customer, $1,667 of lifetime value, a 6.5x
return and payback in under three months. At 2% conversion it still returns 2.6x. 100 customers is $120k a year
of profit; 391 customers is $39k a month.

## The ten decisions. Give a position on every one, numbered, in one or two sentences each.

D1  The primary target, named exactly: what kind of painting business, how many people, what they do now.
D2  The platform, placement and the exact hook: what the ad says and shows, and why that person stops scrolling.
D3  What the landing page is for, or whether the ad should skip it and go straight into the app.
D4  When the email is asked for: before the app opens, after the first quote, or somewhere else.
D5  What the free allowance should be. Five messages, or something else, measured in what.
D6  The activation moment: the one thing he must do for this to have worked, and how fast it must happen.
D7  Where the paywall sits and what it says, word for word, at the moment it appears.
D8  What happens between tapping pay and being back at work: every screen, and what he must type.
D9  The first thirty days: what keeps him subscribed, with nothing that needs a human.
D10 The one number that decides whether to spend more on ads, and what it must reach.
