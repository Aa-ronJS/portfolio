# Taking money: Stripe tomorrow, Shopify this week

## Tomorrow: Stripe Payment Links (about 40 minutes)

1. Sign up at https://dashboard.stripe.com with your ABN and bank account.
   Set the business name to the trading name; add the ABN to the invoice
   footer under Settings, Invoice template. Stripe AU card fees are about
   1.7% + 30c domestic.
2. Products (Settings, Product catalogue), all in AUD, tax behaviour
   "exclusive" with a 10% GST rate once you are registered:

| Product | Price | Type |
|---|---|---|
| Site first-aid kit (Code of Practice, QR-registered) | $119.00 | One-off |
| Vehicle first-aid kit (QR-registered) | $59.00 | One-off |
| Replenishment plan, site kit, annual | $144.00 / year | Recurring, yearly |
| Replenishment plan, vehicle kit, annual | $84.00 / year | Recurring, yearly |
| Replenishment plan, site kit, monthly | $14.00 / month | Recurring, monthly |
| Replenishment plan, vehicle kit, monthly | $8.00 / month | Recurring, monthly |
| PPE and sun pack, monthly | $22.00 / month | Recurring, monthly |

3. Create a Payment Link per product with "adjustable quantity" on, and
   collect a business name and phone number (Payment Link settings, collect
   customer information). Quantity lets a plumber buy 1 site kit and 3
   vehicle kits in two links.
4. Save the six links in your phone's notes. On a sale, text the links.
   Stripe emails a receipt; you register the kits in the app while they pay.
5. Turn on Stripe's automatic invoice emails for subscriptions and the
   "send reminder before renewal" option so the 30-day notice in the plan
   terms is automatic. Keep the app's `plan_renewal` date in sync (it is on
   the customer page).

## This week: Shopify (optional; do it if you want one place for everything)

1. Shopify Basic, annual, https://www.shopify.com/au. Enter your ABN to
   remove GST on the plan fee. Enable Shopify Payments and PayPal. Skip
   Afterpay and Zip; business buyers do not use them.
2. Products, Import, choose `04-shopify-products.csv`. Then Settings,
   Taxes, Australia, GST 10%, "include tax in prices" off (B2B prices are ex
   GST; the checkout adds it).
3. Turn on Shopify's native subscriptions (Products, the plan products,
   "Subscriptions" purchase option) for the annual and monthly plans.
4. Set `CHECKOUT_URL` in the app to the collection URL so the landing page
   button goes straight to the products.
5. Settings, Customer accounts: off. Settings, Checkout: collect company
   name and phone.

Whichever you use, the record of *what* each customer has (kits, plan,
renewal) lives in the app, and money lives in Stripe or Shopify. Reconcile
weekly in Xero. Build an integration after 50 accounts, not before.
