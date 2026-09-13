# The kit register

Kit register, QR after-use refills, expiry engine, compliance record and
certificate, printable labels, daily due report. One Node process, one
SQLite file, one npm dependency (`qrcode`). Runs on a laptop today and on a
A$5 a month server tomorrow.

## Run it now

```
cd ecommerce-plan/app
npm install
ADMIN_PASSWORD=pick-something npm run seed     # optional demo customer
ADMIN_PASSWORD=pick-something npm start
```

Open http://localhost:3000/admin (user `admin`, the password you set). The
seed prints the demo scan, record and certificate links.

Run the tests any time: `npm test` (boots a throwaway database, walks the
whole sales flow, 40-odd assertions).

## What it does

| Route | Who | What |
|---|---|---|
| `/` | public | Landing page with the offer and pricing. Point the button at a Shopify or Stripe checkout with `CHECKOUT_URL` |
| `/k/CODE` | anyone with the label | Scan page: tap what was used, refill request created; "checked, all present"; "missing or damaged" |
| `/c/TOKEN` | the customer | Live compliance record: every kit, status, last check, next refill, full history |
| `/c/TOKEN/certificate` | the customer | Printable certificate (print to PDF from the browser) |
| `/c/TOKEN.json` | the customer's systems | The same record as JSON |
| `/admin` | you | What ships today: open refill requests, scheduled packs due, kits needing attention, AED consumables, renewals |
| `/admin/customers/new` | you | New account with kits registered in one screen. Certificate exists the moment you submit |
| `/admin/kits/ID` | you | Contents with quantities and expiry dates, requests, history, label, "scheduled refill pack shipped" |
| `/admin/labels` | you | QR label sheet for every active kit (or `?customer=ID`) |
| `/admin/export.csv` | you | Every kit with its state, for Xero or a spreadsheet |
| `/check` | public | The 90-second compliance self-check: eight questions, a scored result with the gaps, a lead captured. `?ref=TOKEN` attributes it to a partner |
| `/p/TOKEN` | a partner | Partner view: every referred client's compliance state and plan status, what they have earned, their referral link. No client contact details |
| `/admin/partners`, `/admin/partners/ID` | you | Add partners, see referred accounts and payouts (15% of first-year plan revenue, recorded automatically), mark paid |
| `/admin/leads` | you | Self-check leads with score and source; status new/contacted/won/lost |
| `/admin/metrics` | you | Accounts by source, 30-day activation, monthly logo churn, renewal rate, kits per account, annual share, past-due, stale requests, signup cohorts, cancellation reasons |
| `/webhooks/stripe` | Stripe | Signed events: `invoice.paid` (active, renewal date moved), `invoice.payment_failed` (past due, notify), `customer.subscription.deleted` (cancelled), `checkout.session.completed` (notify). Unknown customers are logged, never applied |

Accounts carry a `source` (direct, paid, partner, referral, seo, check), an
optional partner, an optional referring customer, and a billing `status`
(active, past_due, cancelled with a reason). The compliance record shows
"renewal payment pending" while dunning runs and "plan inactive" after a
cancellation.

## Agent-assisted scripts

These call the Claude API (`@anthropic-ai/sdk`, Claude Opus 5, adaptive
thinking, streaming where output is long). Credentials: `ANTHROPIC_API_KEY`
or `ant auth login`. They draft; you read, edit, send, publish.

| Script | What it does |
|---|---|
| `node scripts/content.js topics.txt` | One answer page draft per topic into `content/`, with the compliance constraints in the system prompt and a verify-before-publishing checklist at the top of every file |
| `node scripts/outreach.js prospects.csv prospect` | One personalised first email per CSV row (subject and body columns added). `partner` mode writes the partner proposal instead |
| `GOOGLE_MAPS_API_KEY=... node scripts/prospects.js "plumber" "Lonsdale SA" "Wingfield SA"` | Builds the prospect CSV from the Google Places API (official API, not scraping); phone and website filled where Google has them |

The engine (`lib/schedule.js`) computes each kit's state from its rows:
**compliant**, **due** (a scheduled refill inside 14 days or an item expiring
inside 45), **attention** (an item short, or an open refill request), or
**overdue** (a refill or an expiry date has passed, or no check in 12 months).
Windows are environment variables.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `ADMIN_PASSWORD` | (unset, admin disabled) | Required for `/admin` |
| `ADMIN_USER` | `admin` | |
| `BRAND` | `Kit Register` | Placeholder. Confirm the final name against IP Australia and ASIC before printing labels |
| `LEGAL_NAME`, `ABN` | | Printed on the certificate |
| `CONTACT_PHONE`, `CONTACT_EMAIL` | | On every page and label |
| `BASE_URL` | `http://localhost:3000` | Must be the public URL before you print labels: the QR encodes it |
| `CHECKOUT_URL` | | Landing page button target (Shopify product or Stripe payment link) |
| `NOTIFY_WEBHOOK` | | POSTs JSON on every scan, problem, new account, lead, failed payment, cancellation, and the daily due report. Point it at n8n, Zapier, Make or a Slack webhook to get emails or messages |
| `STRIPE_WEBHOOK_SECRET` | | From the Stripe dashboard when you add `BASE_URL/webhooks/stripe` as an endpoint. Without it every event is rejected |
| `ANTHROPIC_API_KEY` | | For the scripts only; or use `ant auth login` |
| `GOOGLE_MAPS_API_KEY` | | For `scripts/prospects.js` only |
| `DB_PATH` | `./data/kits.db` | Back this file up. It is the business |
| `REFILL_MONTHS` | `6` | Scheduled refill cycle |
| `EXPIRY_WINDOW_DAYS`, `REFILL_WINDOW_DAYS`, `RENEWAL_WINDOW_DAYS` | `45`, `14`, `30` | Engine windows |
| `PORT` | `3000` | |

## Daily routine

1. Open `/admin`. Pack what is listed. Click "Shipped" or "Pack shipped" with
   the tracking number. That single click restores quantities, resets the
   cycle and writes the customer's history.
2. Or run `npm run due` from cron at 7am and read the email that the webhook
   turns it into.

## Deploy

**Laptop plus a tunnel (day one).** `npm start`, then expose it with a
Cloudflare tunnel (`cloudflared tunnel --url http://localhost:3000`) or
ngrok, and set `BASE_URL` to the tunnel address before printing any labels.
Good enough for the first week. Not good enough for labels that live on a
ute for two years, because the tunnel URL changes.

**A small server (week one).** Fly.io, Railway or a A$5 VPS. `Dockerfile`
and `fly.toml` are included; the database lives on a persistent volume at
`/data`. Put the app behind your domain, set `BASE_URL=https://yourdomain`,
and only then print labels.

```
fly launch --copy-config --no-deploy
fly volumes create data --size 1 --region syd
fly secrets set ADMIN_PASSWORD=... BRAND=... CONTACT_PHONE=... CONTACT_EMAIL=... BASE_URL=https://your-app.fly.dev
fly deploy
```

Back up `/data/kits.db` daily (a cron `fly ssh sftp get` or `litestream`).

## What is deliberately not here

- No checkout. Shopify or a Stripe payment link handles money; you record
  the plan in the customer's account. Build billing integration after 50
  accounts.
- No customer login. The record URL carries an unguessable 16-character
  token, which is the same trust model as a shared Google Doc link, and it
  is what customers forward to inspectors.
- No email sending. The webhook hands events to the automation tool you
  already run.
- No mobile app. The scan page is a web page; it works on any phone camera.
