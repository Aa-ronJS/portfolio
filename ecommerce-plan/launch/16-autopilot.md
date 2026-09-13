# Running it on autopilot

Written 13 September 2026. Constraint added by the founder: the business
should run itself. This is the design, what is built for it in this commit,
and what "100 percent" honestly means.

## The honest ceiling

Software can run the selling, the fulfilment hand-off, the customer
service, the retention flows, the partner programme, the reordering and the
weekly review. Three things it cannot make disappear, only shrink:

| Cannot be delegated to software | Why | What it costs you |
|---|---|---|
| Being the director | A company director must apply for their own director ID, pass the annual solvency resolution, and personally carry the duties of care and solvent trading. A registered BAS agent can prepare and lodge every quarter, but the law requires your signed (an email "approved" is enough) declaration each time. Same for the annual tax return | About six emails a year and one ASIC fee |
| Money leaving the account | Paying the supplier, paying partners, changing the ad budget. The system prepares each one; a cap decides whether it goes on its own or waits for a tap | Under ten taps a month at the volumes in the model |
| Complaints and the unclassifiable | An unhappy customer gets a drafted reply, never an automatic one | One or two a week by year two |

Everything else is automated below. The target is a business that needs
**one email a week and a handful of taps**, and where a fortnight of
ignoring it costs nothing.

## What "autopilot" is, mechanically

A daily job runner (`app/lib/autopilot.js`, `npm run autopilot` from cron
at 7am Adelaide time) and three inbound webhooks (Stripe, the 3PL, the
email provider). Every job is idempotent: the outbox is its memory, so a
job can run ten times a day and never send the same email twice. Every
outbound message is written to the outbox before it is sent, so nothing is
lost while a provider is being set up, and everything is auditable on
`/admin/autopilot`.

The policy, in one table. "Auto" means it happens without you. "Tap" means
it waits in the queue on `/admin/autopilot` with everything you need to
decide in one line, and approving it executes it.

| Recurring thing | Today (founder-led plan) | Autopilot | Auto or tap |
|---|---|---|---|
| Win a customer | Ads, self-check, partner and referral links | Same; nothing changes here | Auto |
| Take payment, renew, retry a failed card | Stripe Checkout and Billing | Stripe Smart Retries and Stripe's own card-expiring and failed-payment emails, plus our dunning at day 1, 7, 14 and closure at day 21 | Auto |
| Ship kits for a new order | You pack | A shipment record is created from the paid session and pushed to the 3PL's endpoint (or an n8n flow that fills their portal); the 3PL applies the pre-printed QR label listed on the order line | Auto |
| Ship an after-use refill | You pack from the due list | Shipment pushed to the 3PL the minute the scan lands; 3PL callback marks it shipped, closes the request, updates the record, decrements stock, emails the customer | Auto |
| Ship the six-monthly packs and AED consumables | You pack | Same path, planned by the expiry engine | Auto |
| Reorder stock from the wholesaler | You remember | Reorder point per SKU; a purchase order is emailed to the supplier when under A$1,500, queued when over | Auto under cap, tap over |
| Receive stock | You | 3PL receives; you press "Received" on the PO (or the 3PL's receiving webhook does) | One tap per delivery |
| Renewal notices | Klaviyo flow, to be built | 30-day and 7-day emails with the certificate link and the year's activity | Auto |
| Activation | You call | Reminder to name the kits at day 2; "try the scan once" at day 10 and 30 | Auto |
| Self-check leads | You call | Result email with the gaps at day 0, follow-ups at day 3 and 10, lost at day 30 | Auto |
| Cancellations | You reply | Self-service through Stripe's customer portal (`/billing?c=TOKEN`), exit survey, win-back at 60 days with a free refill pack | Auto |
| Customer email | You | Inbound webhook, classifier, twelve classes. Certificate requests, invoice copies, refill questions, how-to, pricing, partner enquiries, cancellations and kit additions are answered on the spot with the customer's own links; address changes are applied when the address is unambiguous; complaints and anything under 80 percent confidence are queued with a drafted reply | Auto for the safe classes, tap for the rest |
| Partner statements and payouts | You | Statement emailed on the 1st; the payout waits in the queue until you make the transfer and tap (Stripe Connect Express removes the tap for A$2 per active partner a month plus 0.25 percent) | Tap |
| Google Ads | You, weekly | The Monday review computes cost per paid account from the last 30 days and proposes +15 percent when under A$150, −25 percent when over A$220; Google's automated rules and Target CPA do the intra-week work. The change is a tap because it is money | Tap |
| Bookkeeping | Xero by hand | Stripe payouts feed Xero directly at no extra cost; the fee lines still need a Synder-style bridge because Stripe subscription invoices do not sync natively. A registered BAS agent lodges quarterly on your emailed approval | Auto, one email a quarter |
| Knowing whether it is working | Metrics page when you look | The Monday email: active accounts, activation, churn, renewal rate, paid CAC, every stop-rule breach, every failed shipment or undelivered email, and the list of taps waiting | Auto |
| Fixing what is broken | You and Claude Code | Still you. The review names it; the agent builds it; the smoke test proves it | You, when it happens |

## The physical layer, which is the hard part

Parcels are the one thing no webhook packs. Two ways to make them somebody
else's job, in order of preference:

1. **Distributor drop-ship for kits.** Aero Healthcare's reseller programme
   explicitly serves "enterprises requiring drop-shipping solutions", with
   no minimum invoice and same-day dispatch before noon AEST. If they will
   drop-ship a labelled kit to the end customer, a new order never touches a
   warehouse at all. Terms are not published; it is a question for the same
   email that asks for trade pricing (Gate G1). The QR label is the catch:
   either they apply a label we supply, or the customer sticks it on from
   the welcome pack (the welcome page already asks them to name each kit; a
   "stick the label on the lid" step costs nothing).
2. **A 3PL for refills and packs.** Refill packs and after-use items are
   small, light and repetitive, which is what 3PLs are good at. The
   research found no published rate cards; industry ranges are A$2 to 4 per
   order pick plus A$0.50 to 1.50 per extra line, A$20 to 45 per pallet
   per month storage, A$1 to 5 per kit for kitting, and the warning that
   micro-volumes attract a monthly minimum. Fulfilio says outsourcing makes
   sense from about 400 parcels a month, which is roughly month ten of the
   base case. Amazon Multi-Channel Fulfilment has no minimum and an API,
   but cannot kit. The honest plan is therefore: **you pack until about
   200 accounts (an hour a day at most), then a 3PL**, and the shipment
   records, callbacks and stock logic are the same on both sides of that
   line because they are built that way. The model below prices the 3PL
   at A$6.50 per parcel all-in from day one to show the worst case.

## The money layer

- Stripe Billing with Smart Retries (0.7 percent of billing volume),
  Stripe Tax for GST at 0.5 percent per transaction (it calculates and
  reports; it does not lodge), Stripe's own receipts and invoices, and the
  customer portal for card updates and cancellations. All configuration,
  no code beyond what is in this commit.
- Xero Grow (A$78 a month) with the Stripe feed; a bookkeeper or BAS agent
  reconciles monthly and lodges quarterly from your emailed approval.
- Email: Postmark Pro at US$16.50 a month for 10,000 messages with inbound
  webhooks (inbound is not on the Basic plan), or Resend at US$20 for
  50,000 with inbound on every plan. Either posts to `/webhooks/inbox`.
- The classifier: a few hundred inbound emails a month at Claude Opus 5 on
  low effort is a few dollars.

## What it does to the numbers

`channels.py --case autopilot`: the site-only base case with a 3PL paid
A$6.50 a parcel from day one instead of founder or casual packing hours,
customer service at 0.3 minutes per account per month (the taps), and
A$120 a month of email, classifier and account minimums.

| | Site-only base | **Autopilot** |
|---|---|---|
| Profit before paying yourself, year 1 / 2 / 3 | 43k / 297k / 614k | **35k / 293k / 619k** |
| Your hours a week, year 1 / 2 / 3 | 13 / 13 / 12 | **6 / 3 / 3** |
| Profit per hour of your time, year 3 | A$983 | **A$3,966** |
| Take-home a week if paid as salary, year 3 | A$6,905 | **A$6,958** |

Year one costs about A$8,600 of profit to buy back seven hours a week; by
year three the 3PL is cheaper than the casual it replaces and the profit is
the same. The three hours a week that remain are the Monday email, the
taps, and reading the content the agent drafts.

## What is built in this commit, and tested

- `lib/mail.js`: outbox-first email with a Postmark-shaped adapter; queued
  when no provider is configured, flushed when one is.
- `lib/fulfil.js`: shipments for kit orders, after-use refills, scheduled
  packs and AED consumables; push to a 3PL endpoint; callback marks shipped
  and updates the register exactly as the admin buttons do; stock with
  reorder points and purchase orders.
- `lib/autopilot.js`: the nine jobs (shipments, stock, renewals, dunning,
  activation, leads, cancellations, partners, weekly review), the policy
  caps, and the approval queue with executors.
- `lib/inbox.js`: inbound email normalised from Postmark, Resend or Mailgun
  shapes, classified by Claude with a structured-output schema (keyword
  fallback when there is no key), answered or queued.
- Routes: `/admin/autopilot` (queue, connections, shipments, stock, POs,
  inbox, outbox, run now), `/webhooks/fulfilment`, `/webhooks/inbox`,
  `/billing` (Stripe customer portal per customer).
- `channels.py --case autopilot`.
- 38 new smoke checks (139 in total): every job, idempotency, the 3PL
  round trip, the caps, the queue, the classifier's safe and unsafe paths.

Not built: the Google Ads API script that applies an approved budget
change (the tap tells you the number; Google's own automated rules can
hold the CAC target between Mondays), Stripe Connect payouts to partners,
and the Xero fee bridge. Each is a day with the agent once the accounts
exist.

## The week, on autopilot

Monday, 8am: one email. Read it in two minutes. Open `/admin/autopilot` if
it says something is waiting: approve the ad budget, approve the big
purchase order, send the drafted complaint reply after fixing the bracket,
mark the partner transfer paid. Ten minutes.

Any other day: nothing, unless the email provider or the 3PL fails, in
which case the Monday email says so and the outbox holds every message
until it is fixed.

Once a quarter: reply "approved" to the BAS agent. Once a year: the ASIC
solvency resolution and the tax return, both prepared by someone else.

## Kill switches

- Unset `FULFIL_WEBHOOK` and shipments go back to the due list for you.
- Unset `MAIL_API_URL` and every email stops and queues (nothing is lost).
- `AUTO_PO_CAP=0` and every purchase order waits for a tap.
- `INBOX_AUTO_MIN=1.1` and every inbound email is queued, none answered.
- Stop the cron and the business freezes in place: Stripe still collects,
  the record still renders, nothing false is ever shown, because states are
  computed from rows, never written by a job.
