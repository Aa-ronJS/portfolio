# Day one: selling tomorrow

> **Superseded in part, 13 Sep 2026.** The founder has ruled out founder-led
> selling. Walk-ins, phone calls and in-person registration below no longer
> apply; see `14-site-only-selling.md` for the plan that replaces them. The
> setup items (name, entity, Stripe, insurance, wholesale, labels) stand.

You can take a first order tomorrow as a sole trader with retail-bought demo
kits and the register running on your laptop. The Pty Ltd, the wholesale
account and the domain catch up during the week. Nothing below waits on
anything that takes more than a day.

Prices are ex GST. If you are not GST-registered yet, do not charge GST and
do not put "GST" on the invoice; register today and it starts from the date
you choose.

## Tonight (90 minutes)

- [ ] **Pick the name.** Every candidate tried in the research collided
      (Kitwise, Kitcert, Everstocked, Tallykit, Restokit are all taken or too
      close to KitCheck). Search your shortlist at
      https://search.ipaustralia.gov.au/trademarks/search/quick and
      https://connectonline.asic.gov.au (business names), and check the
      `.com.au`. Set `BRAND` in the app's `.env`. Two-word descriptive names
      are easier to clear than coinages: "Ute Kit Co", "Kept Stocked",
      "Stocked & Signed".
- [ ] **Run the register.** `cd ecommerce-plan/app && npm install && npm run seed && npm start`
      with `ADMIN_PASSWORD` set. Open `/admin` on your phone via your laptop's
      LAN address so you can demo the scan page from a real phone.
- [ ] **Print the offer sheet** (`01-offer-sheet.html`, open in a browser,
      print). Ten copies.
- [ ] **Read the sales script** (`02-sales-script.md`) aloud once.
- [ ] **Decide the delivery promise**: refills ship the same business day
      for orders before 2pm. You are the warehouse this month.

## Tomorrow morning (before 10am)

- [ ] **ABN and GST**: https://www.abr.gov.au, apply as a sole trader,
      register for GST in the same application. Usually instant. (Convert
      to a Pty Ltd in week one per `04-operations-legal.md`; the ABN is new
      for the company, so tell early customers invoices will move to the
      company.)
- [ ] **Bank**: a separate everyday account for the business, even a
      personal one labelled for it, so day-one money is clean.
- [ ] **Take payment**: Stripe (https://dashboard.stripe.com) with ABN and
      bank details, then create four Payment Links from
      `04-checkout-setup.md` (site kit, vehicle kit, annual plan per site
      kit, annual plan per vehicle kit). Alternative: Square. Shopify can
      follow in week one (`04-shopify-products.csv` imports the catalogue).
- [ ] **Insurance quote**: BizCover, upcover or Sprintlaw, public and
      products liability A$10M, "online retailer of first-aid kits supplied
      by an Australian TGA-listed manufacturer". Bind it this week; do not
      ship to a customer before it is bound.
- [ ] **Demo stock**: buy two site kits and three vehicle kits at retail.
      Options in Adelaide: St John Ambulance SA shop, Bunnings (workplace and
      vehicle kits), Officeworks, a pharmacy. Expect A$60 to 120 per site kit
      and A$25 to 50 per vehicle kit at retail. You will sell these at your
      list price at a thinner margin. That is fine for the first ten.
- [ ] **Labels**: print the QR labels from `/admin/labels` on plain label
      stock today; polyester labels once the domain is live (the QR encodes
      `BASE_URL`, so labels printed against `localhost` are demo-only).
- [ ] **Wholesale**: send `03-email-templates.md` email 1 to Aero
      Healthcare (reseller@ via their form, 1800 628 881) and email 2 to two
      alternatives (Brenniston, FastAid, Trafalgar). Ask for trade pricing on
      a Code of Practice site kit, a vehicle kit, six-monthly refill packs
      and after-use modules. Gate G1 is a 45 percent gross margin at A$119 /
      A$59.

## Tomorrow afternoon (first ten visits)

- [ ] Pick one estate: Lonsdale, Wingfield, Edinburgh, Pooraka, Regency
      Park or Melrose Park. Ten businesses with utes out the front.
- [ ] Carry: one site kit, one vehicle kit, offer sheets, your phone with
      `/admin/customers/new` open, a Stripe link ready to text.
- [ ] Use the script. Aim for three "yes, next week" and one paid today.
- [ ] For every yes: create the account on the spot, register the kits,
      show them their compliance record on your phone, text them the Stripe
      link, hand over the kits when it is paid.
- [ ] For every no: write the reason down verbatim in
      `05-tracking-sheet.csv`.

## This week

- [ ] Pty Ltd (ASIC or an online formation service), then a new ABN and GST
      for the company; move Stripe to the company.
- [ ] Domain and a small server (`app/README.md`, deploy section). Set
      `BASE_URL` and only then print permanent labels.
- [ ] TM Headstart in classes 10 and 42 on the chosen name.
- [ ] Shopify Basic (annual) and import `04-shopify-products.csv`, or keep
      Stripe links if they are working.
- [ ] Google Ads: `06-google-ads.md`, A$20 a day, SA only.
- [ ] Wholesale account opened; first trade order; retail demo stock retired.
- [ ] `NOTIFY_WEBHOOK` pointed at n8n so scans email you and the daily due
      report lands in your inbox at 7am.

## Numbers to write down every evening

visits · conversations · offers made · accounts won · kits per account ·
annual vs monthly · money in · the reason for each no
