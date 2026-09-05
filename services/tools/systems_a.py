# System-pair content, part A: trades and field service, online stores.
# Each entry: slug, group, name (short display), title (H1), seo (title tag),
# blurb (hub one-liner), direct (snippet answer, HTML), how: list of
# (h3, paragraph HTML) on how the join actually works, traps: list of
# (h3, paragraph HTML), faq: list of (question, plain answer), proof
# (optional paragraph HTML overriding the default), related: sibling slugs,
# pillars: (label, href) links.
#
# House rules apply: no em or en dashes, en-AU, nothing a phone call cannot
# back. Where a native integration does the job, the page says use it.

PART_A = [
    # ---------------------------------------------------- TRADES / FIELD
    dict(slug="servicem8-to-xero", group="field",
        name="ServiceM8 to Xero",
        title="ServiceM8 to Xero without double entry",
        seo="ServiceM8 to Xero Integration Without Double Entry | Australia",
        blurb="The native sync is good; the double entry that survives it is the actual job.",
        direct="""ServiceM8 has a native Xero integration, and if you only invoice from
        ServiceM8 it mostly just works: turn it on, map your accounts, done. <b>The double
        entry that survives it lives around the edges</b>: contacts that duplicate, invoices
        edited on the wrong side, supplier bills, and payments recorded twice. Fixing those is
        a mapping and habits job, not a rebuild.""",
        how=[
            ("The join key is the contact name, so treat it like one",
             """ServiceM8 and Xero do not share a customer ID; the sync matches contacts by
             name. "Dave Smith", "David Smith" and "Smith, Dave" become three Xero contacts,
             and your receivables report turns to soup. The fix is a one-time dedupe on both
             sides, then one rule about who creates customers and how names are written.
             Boring, and worth more than any software."""),
            ("Invoices flow one way, and edits must too",
             """An approved ServiceM8 invoice pushes to Xero with your mapped sales account
             and GST code. The moment someone edits that invoice in Xero, the two systems
             disagree forever, because nothing flows back. The working rule: invoices are
             born and edited in ServiceM8, and Xero is where they get paid. Payments recorded
             in Xero sync back and close the job; payments taken in ServiceM8 (card on site)
             push the other way. Pick one place to record each thing."""),
            ("What the native sync does not carry",
             """Quotes, supplier bills for materials, and job costing stay in ServiceM8 or on
             paper. If your bookkeeper re-keys supplier invoices against jobs, that is the
             double entry actually costing you hours, and it needs either ServiceM8's
             materials workflow used properly or a small build against both APIs, which both
             systems expose properly. This is where I earn a fee and the checkbox does
             not."""),
            ("Account and tax mapping, once, correctly",
             """Every ServiceM8 item maps to a Xero account and tax rate. The common mess is
             everything landing in one "Sales" line with GST on Income, labour
             indistinguishable from materials, and the accountant reallocating at year end at
             accountant rates. An hour of mapping labour, materials and callout fees to their
             own accounts turns Xero into a management report instead of a shoebox."""),
        ],
        traps=[
            ("Payments recorded on both sides",
             """Card taken on site in ServiceM8, then the bookkeeper reconciles the bank feed
             in Xero against the same invoice and records it again. Now the invoice is
             overpaid, or a credit note appears from nowhere. One rule fixes it: bank feed
             reconciliation matches, it never creates."""),
            ("The historical mess nobody wants to open",
             """Turning the sync on over years of duplicated contacts and half-matched
             invoices does not clean anything; it syncs the mess faster. Reconcile the aged
             receivables first, merge the duplicates, then connect. I do exactly this kind of
             record-by-record cleanup, and there is a public account of the worst one I have
             handled below."""),
        ],
        faq=[
            ("Does ServiceM8 integrate with Xero out of the box?",
             "Yes, natively and well, for the invoice-and-payment core. Contacts, invoices and payments sync; quotes, supplier bills and job costing do not. Most trades businesses need the mapping done carefully once, and a few habits agreed, more than they need custom software."),
            ("Why are there duplicate customers in Xero since we connected ServiceM8?",
             "Because the sync matches contacts by name, and the same customer exists with two spellings. Dedupe both sides once, then agree where new customers get created and how names are written. It stays clean if the rule survives."),
            ("Can you fix it if our books are already a mess from a bad sync?",
             "Yes. That is reconciliation work: trace what doubled, repair the records that matter, reconcile the result against the bank, then re-map the sync so it stays right. It is the same method whatever the size of the mess."),
        ],
        related=["aroflo-to-xero", "simpro-scheduling-weather", "woocommerce-xero-fees-refunds"],
        pillars=[("Trades industry page", "/industries/trades/"), ("CRM &amp; automation", "/crm-automation/"), ("Data &amp; reporting", "/data-and-reporting/")]),

    dict(slug="aroflo-to-xero", group="field",
        name="AroFlo to Xero",
        title="AroFlo to Xero: the field-to-invoice chain",
        seo="AroFlo to Xero Integration: Field to Invoice Without Re-keying | Australia",
        blurb="Timesheet to task to invoice to Xero, with the breaks in the chain closed.",
        direct="""AroFlo's Xero integration is native and capable: invoices, payments,
        contacts and supplier bills can all sync. <b>When it hurts, it is almost never the
        connector; it is a break earlier in the chain</b>, where a timesheet or a materials
        docket never made it onto the task, so the invoice was wrong before Xero ever saw
        it. Fix the chain, then the sync just carries clean data.""",
        how=[
            ("The chain, named",
             """Field work becomes money in four hops: labour and materials land on the task,
             the task becomes an invoice, the invoice syncs to Xero, the payment reconciles
             against the bank feed. Each hop has an owner and a failure mode. When margin
             leaks, walk the chain backwards from the bank and find which hop dropped it;
             it is nearly always hop one."""),
            ("Item and account mapping does the accounting",
             """AroFlo line items carry a Xero account code and tax type. Mapped properly,
             labour, materials and subcontractors land in their own income and cost accounts
             and your profit and loss per job type is real. Mapped lazily, everything is
             "Sales" and your accountant bills you to un-mash it. This is an afternoon of
             set-up that pays for itself every quarter."""),
            ("Supplier bills are the half people skip",
             """AroFlo can push supplier invoices to Xero as bills, matched to purchase
             orders raised against tasks. Most installs never turn this on, so the office
             re-keys every supplier invoice and job costing quietly dies, because costs in
             Xero no longer tie to tasks in AroFlo. Turning this half on properly is usually
             the single biggest re-keying saving in the building."""),
            ("Decide where each record is born",
             """Same rule as every field-service-to-accounting join: invoices are born in
             AroFlo, payments are recorded in Xero from the bank feed, contacts are created
             in one nominated system. Every duplicate record I have ever traced came from two
             people being allowed to create the same thing in two places."""),
        ],
        traps=[
            ("Partial and progress invoicing",
             """Progress claims and part-invoiced tasks are where sums stop matching: AroFlo
             thinks the task is 60 per cent billed, Xero holds three invoices, and someone
             credits one. Agree the claim workflow before the first big job, not during a
             dispute over the final claim."""),
            ("The bank feed double-up",
             """Payments taken in the field and payments reconciled in Xero must not both
             create records. One creates, the other matches. If your receivables report
             shows negative balances, this is almost always why."""),
        ],
        faq=[
            ("Does AroFlo work with Xero?",
             "Yes, natively: invoices, payments, contacts and supplier bills can all sync. Most problems blamed on the integration are mapping choices or data that was wrong before it synced."),
            ("Why doesn't our job profit in AroFlo match Xero?",
             "Usually because supplier bills are keyed straight into Xero without touching the AroFlo task, so costs exist in one system and not the other. Push bills through purchase orders against tasks and the two views reconcile."),
            ("Can you set this up without disrupting the office?",
             "Yes: mapping and dedupe happen alongside normal work, the sync turns on at a month boundary, and the first month runs with a weekly reconciliation check until everyone trusts it."),
        ],
        related=["servicem8-to-xero", "simpro-scheduling-weather", "hubspot-to-xero"],
        pillars=[("Trades industry page", "/industries/trades/"), ("Data &amp; reporting", "/data-and-reporting/"), ("CRM &amp; automation", "/crm-automation/")]),

    dict(slug="simpro-scheduling-weather", group="field",
        name="simPRO scheduling and weather",
        title="simPRO scheduling and the weather problem",
        seo="simPRO Scheduling and Weather: Stop Rebuilding the Week by Hand | Australia",
        blurb="Rain is predictable; rebuilding the schedule by phone at 6am is a choice.",
        direct="""simPRO will happily schedule a fortnight of outdoor work; it has no idea
        rain is coming. So the first wet morning becomes two hours of phone calls, and the
        schedule gets rebuilt by memory. <b>The forecast is public data and your schedule is
        in simPRO's API</b>, which means "which booked jobs are outdoors on a day now
        forecast over 10mm" is a question software can ask every morning before you wake.""",
        how=[
            ("Mark weather exposure where the job lives",
             """The join needs one fact simPRO does not have a field for out of the box:
             whether a job can proceed in rain. A custom field on the job or job type
             ("outdoor", "weather-dependent") takes minutes to add and gives every later
             automation its handle. Roof work is not switchboard work; the schedule should
             know the difference."""),
            ("Marry the schedule to the forecast",
             """simPRO's API exposes the schedule; the Bureau of Meteorology publishes
             forecasts for free. A small job that runs each evening can join the two:
             weather-exposed bookings in the next few days against rain probability and
             expected millimetres at each job's location, producing a short list of bookings
             at risk instead of a surprise."""),
            ("Reschedule as a batch, notify as you go",
             """The payoff is not the alert; it is what happens next. At-risk jobs get
             proposed new slots against the same technicians' availability, indoor work moves
             forward to fill the gap, and affected customers get an SMS the evening before
             instead of a 7am apology. The scheduler approves the plan; nobody rebuilds it
             from memory."""),
            ("I have already built the weather half",
             """Rain Check, one of my live public tools, exists precisely because trades lose
             mornings to weather they could have seen coming. The simPRO version of the
             problem is the same join with your schedule on the other side, which is why
             this page is confident about the shape of the build."""),
        ],
        traps=[
            ("Forecasts are probabilities, not permission slips",
             """A 40 per cent chance of 2mm is not a reason to gut Tuesday. The automation
             should rank risk and propose, never auto-cancel; the human who knows the site
             and the client makes the call. Software that reschedules on its own authority
             gets turned off within a month, and deserves it."""),
            ("Location data that is actually the office",
             """If jobs are geocoded to the billing address instead of the site, the
             forecast join is confidently wrong. Site address hygiene comes first; it is
             also what makes travel-time scheduling honest."""),
        ],
        faq=[
            ("Can simPRO reschedule jobs based on weather?",
             "Not by itself; simPRO has no weather awareness. Its API exposes the schedule, though, so a small add-on can flag weather-exposed bookings against the forecast and propose moves for a human to approve."),
            ("What does something like this cost to build?",
             "It is a small build, not a platform: one recurring job, one join, one screen or SMS digest. Get a real range from the calculator on this site, and a fixed quote in writing before anything starts."),
            ("Does this work with ServiceM8 or AroFlo instead?",
             "Yes. Both expose bookings through their APIs; the weather half is identical. simPRO gets the page because its users schedule furthest ahead, which makes the rain problem worst."),
        ],
        proof="""The weather half of this build already exists in public: Rain Check is live
        on the internet with its source open, built to tell Adelaide trades whether the
        morning is workable. Check the workmanship there before you ask me about the
        schedule half.""",
        related=["servicem8-to-xero", "aroflo-to-xero", "cliniko-reminders"],
        pillars=[("Trades industry page", "/industries/trades/"), ("AI development", "/ai-development/"), ("Custom software", "/full-stack-developer/")]),

    # ---------------------------------------------------- STORES / BOOKS
    dict(slug="shopify-to-myob", group="stores",
        name="Shopify to MYOB",
        title="Shopify to MYOB, reconciled",
        seo="Shopify to MYOB Integration That Reconciles to the Bank | Australia",
        blurb="Connected is easy. Reconciled to the bank, fees and all, is the job.",
        direct="""There is no first-party Shopify-to-MYOB connection, so this join runs
        through a connector app or a small custom feed, and most installs are "connected"
        within an hour. <b>Connected is not the goal; reconciled is</b>: the payout that
        lands in your bank equals orders minus fees minus refunds across several days, and
        unless the join accounts for each of those parts, your MYOB will drift from your
        bank a little every week.""",
        how=[
            ("Choose the grain: order-level or daily summary",
             """The first design decision is whether every Shopify order becomes an MYOB
             invoice, or each day becomes one summarised sales journal. Order-level suits
             low volume and B2B; a daily summary suits volume retail and keeps MYOB fast and
             clean. Most connector misery comes from picking order-level by default and
             drowning MYOB in thousands of tiny invoices nobody looks at."""),
            ("Route takings through a clearing account",
             """Sales should post to a Shopify clearing account, not straight to the bank
             account. When the payout lands days later, it clears that account, and the gap
             that remains is exactly fees plus refunds plus timing. This one structural
             choice is the difference between reconciling in minutes and never quite
             matching."""),
            ("Fees and gateways are separate stories",
             """Shopify Payments deducts its fee before paying out; PayPal and Afterpay
             settle separately on their own schedules with their own fees. Each gateway needs
             its own clearing account and a fee expense line, taken from the gateway's own
             settlement report. Skip this and your revenue is overstated by exactly your fee
             bill, which your accountant discovers at BAS time."""),
            ("GST, refunds and gift cards, done once, correctly",
             """GST needs to come from Shopify's tax lines, not be recalculated, or rounding
             will disagree by cents forever, and cents are what reconciliation is. Refunds,
             including partial refunds, must flow as their own transactions against the
             original sale. Gift cards are a liability when sold and revenue when redeemed;
             a join that books them as sales twice inflates your takings and your GST."""),
        ],
        traps=[
            ("The payout that spans a weekend",
             """A Monday payout covers Friday-to-Sunday orders at Friday-to-Sunday exchange
             and fee rates. Joins that assume one payout equals one day never reconcile and
             everyone blames the connector. The clearing account structure above absorbs
             this; nothing else really does."""),
            ("Trusting the connector's defaults",
             """Off-the-shelf connectors are fine tools with default mappings chosen for
             nobody in particular. The install is not the work; the chart-of-accounts
             design, tax mapping and first month of parallel reconciliation are. That is
             the part I do, whichever connector carries the data."""),
        ],
        faq=[
            ("Does Shopify integrate with MYOB?",
             "Not natively; the join runs through connector apps or a custom feed. The tools work; the design decisions, grain, clearing accounts, fee handling and GST treatment are what decide whether it reconciles."),
            ("Why doesn't our MYOB match our Shopify sales?",
             "Almost always fees and timing: payouts land net of fees days after the orders, refunds and gift cards muddy the middle, and the join books gross sales straight to the bank. Restructure through clearing accounts and the gap becomes explainable, then zero."),
            ("Xero instead of MYOB?",
             "Same shape, same traps, slightly better connector ecosystem. There is a WooCommerce-and-Xero version of this page covering the fee and refund handling in detail."),
        ],
        related=["woocommerce-xero-fees-refunds", "square-shopify-stock", "hubspot-to-xero"],
        pillars=[("E-commerce", "/ecommerce/"), ("Retail industry page", "/industries/retail/"), ("Data &amp; reporting", "/data-and-reporting/")]),

    dict(slug="woocommerce-xero-fees-refunds", group="stores",
        name="WooCommerce to Xero",
        title="WooCommerce to Xero: fees and refunds done right",
        seo="WooCommerce Xero Integration: Fees, Refunds and Rounding Done Right",
        blurb="The sync apps move invoices fine. Fees, refunds and rounding are on you.",
        direct="""WooCommerce-to-Xero sync apps, including the official one, move orders
        into Xero competently. <b>The three things they handle badly are exactly the three
        that stop your books reconciling</b>: gateway fees invisible in the deposit, refunds
        that never make it back, and GST rounding that disagrees by one cent per order,
        forever. All three are solvable; none is solved by default.""",
        how=[
            ("Fees: book the gross, expense the fee",
             """Stripe deposits arrive as sales minus fees; a sync that posts gross invoices
             straight against the bank never matches the deposit. The structure is the same
             as every gateway join: invoices post to a Stripe clearing account, the deposit
             clears it, and a scheduled journal books the fee expense from Stripe's own
             reports. Your revenue is honest, your fees are visible, and the bank feed
             matches to the cent."""),
            ("Refunds: one path, no side doors",
             """A refund issued in WooCommerce must become a credit note against the original
             Xero invoice, and a refund issued directly in Stripe must be forbidden or
             detected, because it bypasses the store entirely and leaves an invoice Xero
             thinks was paid. Partial refunds and re-shipments need the same single path.
             Most unreconcilable stores have refunds leaking through two doors."""),
            ("Rounding: take the tax from the source",
             """WooCommerce calculates GST per line and rounds; if the join re-derives tax
             from totals, one order in three disagrees with Xero by a cent. Cents are the
             whole game in reconciliation, so the join must carry WooCommerce's tax figures
             verbatim rather than recalculating. This is a configuration choice in decent
             sync tools and a code choice in custom feeds."""),
            ("Decide what Xero is for",
             """High-volume stores do not need forty thousand invoices in Xero; they need
             honest daily summaries and a store system that holds the detail. Low-volume and
             B2B stores want real invoices per order. Choosing the grain deliberately keeps
             Xero useful to the human who reads it, which is the point of books."""),
        ],
        traps=[
            ("The plugin update that changes behaviour",
             """Sync plugins ride two moving platforms; a WooCommerce or plugin update can
             quietly change how refunds or taxes post. A monthly five-minute reconciliation
             check, deposits against clearing accounts, catches drift while it is one
             month's work to repair instead of a year's."""),
            ("History imported on top of history",
             """Connecting a sync tool to a store and a Xero file that both already hold
             months of the same orders creates duplicates at scale. Pick a cutover date,
             reconcile up to it by hand once, and let the sync own everything after."""),
        ],
        faq=[
            ("Does WooCommerce sync with Xero?",
             "Yes, several mature options exist. Whether your books reconcile afterwards depends on fee handling, refund paths and rounding configuration, which is design work the plugins leave to you."),
            ("Why is our Xero out by a few dollars every month?",
             "Cent-level rounding across hundreds of orders, plus refunds that bypassed the store, plus fees booked inconsistently. Each is small; together they compound into a number your accountant cannot sign off. The fix is structural, and it is the same fix every time."),
            ("Can you audit an existing setup instead of rebuilding it?",
             "Yes, and that is usually the right first step: a reconciliation of a recent month, deposit by deposit, telling you exactly where the leaks are and what to change. Sometimes the answer is two settings, not a project."),
        ],
        related=["shopify-to-myob", "square-shopify-stock", "servicem8-to-xero"],
        pillars=[("E-commerce", "/ecommerce/"), ("Data &amp; reporting", "/data-and-reporting/"), ("WordPress", "/wordpress/")]),

    dict(slug="square-shopify-stock", group="stores",
        name="Square and Shopify stock",
        title="Square and Shopify agreeing about stock",
        seo="Square POS and Shopify Stock Sync: One Truth for Inventory | Australia",
        blurb="Two tills, one shelf. The fix is one stock ledger, not more syncing.",
        direct="""A shop selling in person through Square and online through Shopify has two
        systems each convinced they own the stock count, and every sale in one makes the
        other slightly wrong. <b>The durable fix is deciding which system is the single
        stock ledger</b>, then syncing the other to it; sometimes the honest answer is
        dropping to one platform, which costs less than the connector subscription and the
        weekly arguments with the shelf.""",
        how=[
            ("First question: do you need both platforms at all?",
             """Shopify has its own POS, and Square has its own online store. If either end
             of your setup is light, collapsing to one platform removes the sync problem
             instead of managing it, and I will say so even though the build is smaller.
             Two platforms earn their keep when each side is genuinely strong: established
             in-store flow on Square, real online trade on Shopify."""),
            ("SKUs are the join key, so make them real",
             """Every sync between the two matches products by SKU. Items keyed casually
             into Square with no SKU, or variants (size, colour) flattened on one side,
             cannot be matched by any tool at any price. A one-time catalogue cleanup, every
             sellable variant carrying one agreed SKU on both sides, is the unglamorous
             prerequisite for everything else on this page."""),
            ("Pick the ledger, sync one direction",
             """One system holds the truth and receives all stock movements: deliveries,
             stocktakes, adjustments, breakage. The other is a sales channel that reports
             its sales into the ledger and takes its counts from it. Two-way "both systems
             are right" syncing is how you oversell during the exact busy weekend the setup
             was meant to survive."""),
            ("Accept the oversell window, then shrink it",
             """Even good syncs are near-real-time, not instant: the last unit can sell on
             both channels within the same minute. Policy handles what software cannot:
             buffer counts on the last few units of fast movers online, and a defined
             make-good when it happens. Pretending the window is zero is how it bites."""),
        ],
        traps=[
            ("Stocktakes done in the wrong system",
             """A stocktake keyed into the channel instead of the ledger gets overwritten at
             the next sync and everyone concludes the sync is broken. Adjustments happen in
             the ledger, full stop. Write it on the wall near the back office computer."""),
            ("Connector pricing that outgrows the problem",
             """Per-order connector fees on a growing store can quietly exceed the cost of
             the one-platform consolidation that ends the problem permanently. Do the sums
             annually; the right answer changes as the shop grows."""),
        ],
        faq=[
            ("Can Square and Shopify share inventory?",
             "Yes, through connector tools matched on SKU, one direction at a time. Whether they should, versus consolidating on one platform's POS and store, is worth an honest hour before any subscription starts."),
            ("Why does our online store oversell after busy Saturdays?",
             "Because both systems accept sales against their own count and reconcile later, and Saturday is when the counts diverge fastest. A single ledger, one-way sync and small online buffers on fast movers close most of the gap."),
            ("What does fixing this look like as a project?",
             "A catalogue and SKU cleanup, a ledger decision, connector configuration or a small custom sync, and a fortnight of watching the counts reconcile. Fixed quote after seeing your catalogue size and order volume."),
        ],
        related=["shopify-to-myob", "woocommerce-xero-fees-refunds", "propertyme-owner-reports"],
        pillars=[("E-commerce", "/ecommerce/"), ("Retail industry page", "/industries/retail/"), ("Custom software", "/full-stack-developer/")]),
]
