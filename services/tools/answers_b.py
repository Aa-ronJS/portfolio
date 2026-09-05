# Answer content, part B: crm, data, ecommerce, rescues, hiring clusters.

PART_B = [
    # -------------------------------------------------------------------- CRM
    dict(slug="which-crm-small-business", cluster="crm",
        q="Which CRM should a small business choose?",
        direct="""The one your team will actually keep clean, sized to how you sell and priced
        for the features you will use rather than the deck the salesperson showed.
        <b>For most small Australian businesses that means starting smaller than you think</b>
        and integrating properly, not buying big and abandoning it.""",
        body=[
            ("The question before the product",
             """How do you actually sell: long relationships or quick quotes, one closer or a
             team, phone or inbox? A CRM is a mirror of your sales motion; choosing one before
             describing the motion is how businesses end up paying for pipeline theatre nobody
             updates."""),
            ("The honest field",
             """HubSpot's free tier is a legitimate start and scales expensively. Zoho is
             underrated value for small teams. Salesforce is superb and usually overkill under
             twenty seats. Job-system CRMs (the one inside ServiceM8 or your industry tool)
             are often enough. I run all of them in anger and none pays me commission."""),
            ("What matters more than the pick",
             """Adoption and plumbing: the CRM fed automatically from your website, inbox and
             billing so it stays true without discipline, per
             <a href="/crm-automation/">CRM &amp; automation</a>. A modest CRM kept accurate
             beats a famous one kept theoretical."""),
        ]),
    dict(slug="hubspot-vs-salesforce-vs-zoho", cluster="crm",
        q="HubSpot, Salesforce or Zoho: how do they compare?",
        direct="""HubSpot is the easiest to love and the priciest to grow with, Salesforce is
        the most capable and the most consultant-hungry, Zoho is the best value and the least
        glamorous. <b>All three work; businesses fail at CRM by buying the wrong size, not
        the wrong brand.</b>""",
        body=[
            ("Choose HubSpot when",
             """Marketing and sales must share one view, your team values slick over
             configurable, and you accept that the free tier is a courtship. Its automation is
             genuinely good; its invoice grows with your contact list and your nerve."""),
            ("Choose Salesforce when",
             """You have real complexity: multiple products, teams, approval chains,
             integrations that must be exact. It will do anything, including consume budget
             endlessly if governance is weak. Under about twenty seats it is usually a suit
             three sizes too big."""),
            ("Choose Zoho when",
             """Price-to-capability matters most and you can live with an interface that is
             merely fine. For owner-led sales teams it is repeatedly the honest answer. I have
             migrated businesses between all three, per
             <a href="/answers/crm-migration-without-losing-data/">without losing data</a>,
             and the migration method matters more than the destination."""),
        ]),
    dict(slug="zapier-vs-make-vs-n8n", cluster="crm",
        q="Zapier, Make or n8n: which automation tool?",
        direct="""Zapier for simplicity and the widest app coverage, Make for complex flows at
        better prices, n8n for volume, control and self-hosting. <b>The right answer is the
        cheapest one that will still be reliable in a year</b>, and past a certain volume the
        answer becomes real code.""",
        body=[
            ("The practical split",
             """Zapier wins when a non-technical owner must maintain it. Make wins when flows
             branch and loop and Zapier's per-task pricing starts to sting. n8n wins when
             volumes are high, data should stay on your infrastructure, or per-task pricing
             offends the spreadsheet."""),
            ("What everyone forgets",
             """Error handling. An automation that fails silently is worse than none: the
             order that never reached accounting is a real cost wearing a convenience's
             clothes. Whichever tool, I build the failure path first: retries, alerts, and a
             human who finds out."""),
            ("When to graduate to code",
             """When per-task pricing outgrows a small server, when the logic embarrasses the
             visual editor, or when the workflow is the business. The migration is
             unglamorous and pays permanently, per
             <a href="/crm-automation/">CRM &amp; automation</a>."""),
        ]),
    dict(slug="crm-migration-without-losing-data", cluster="crm",
        q="How do you migrate CRMs without losing data?",
        direct="""Decide what records merge on before anything moves, rehearse the migration on
        a copy, and reconcile the result against a source of truth you trust. <b>Skipping
        that first decision is how migrations quietly corrupt years of records</b>, and
        cleaning up after exactly that has been my job more than once.""",
        body=[
            ("The decision that matters most",
             """The merge key. Merge contacts on email and everyone who shared or changed
             one becomes somebody else; that single casual choice is behind most of the
             migration wreckage I have been called in to repair. Choose the stable
             identifier, not the convenient one."""),
            ("The method",
             """Map fields explicitly including the awkward ones, migrate a copy, let real
             users try real work on it, fix the mapping, then migrate for real in a quiet
             window with the old system frozen. Two rounds of client testing before
             go-live is my standard, because it was the standard that worked."""),
            ("The definition of done",
             """Not "the import finished": counts and totals reconciled against the old
             system and against accounting, exceptions listed and explained. Full story at
             <a href="/crm-automation/">CRM &amp; automation</a>."""),
        ]),
    dict(slug="nobody-uses-our-crm", cluster="crm",
        q="Why does nobody use our CRM?",
        direct="""Because it takes more than it gives: staff type into it so managers can
        report from it, and staff know a bad trade when they see one. <b>Adoption follows
        the moment the CRM saves the user time</b>, which is a plumbing problem, not a
        training problem.""",
        body=[
            ("The diagnosis nobody enjoys",
             """If the CRM must be updated manually after every call, it is a tax. If
             leadership asks for reports but never works in it, it is surveillance. Both are
             design choices, reversible."""),
            ("The fix that works",
             """Feed it automatically: enquiries, emails, quotes and invoices landing without
             typing, so the record is already true when a human opens it. Then give the users
             something back: the context screen before a call, the follow-up drafted, per
             <a href="/crm-automation/">automation</a>. Use follows usefulness within
             weeks."""),
            ("The fix that never works",
             """Another training session and a stern email. Eleven years of watching
             organisations try discipline where design was needed says save your breath and
             fix the plumbing."""),
        ]),
    dict(slug="what-should-we-automate-first", cluster="crm",
        q="What should a business automate first?",
        direct="""The task somebody does weekly, hates, and does the same way every time:
        usually the report assembled from three systems or the retyping between two.
        <b>First automations should be boring, measurable and finished in weeks</b>, because
        their real product is your confidence.""",
        body=[
            ("How to find it",
             """Ask each person what they did last Friday that a robot should have done. The
             winner is high-frequency, low-judgement, and rule-describable in one breath.
             The runner-up list becomes your roadmap."""),
            ("Why boring beats bold",
             """A visible weekly win builds the appetite and the evidence for the bigger
             swings. Starting with the moonshot automation of your most exception-riddled
             process produces a six-month project and a scarred team."""),
            ("The measurement habit",
             """Note the hours the task took before; check them after; keep the note. It
             makes the next decision easy and keeps builders like me honest, per
             <a href="/crm-automation/">CRM &amp; automation</a>."""),
        ]),
    # ------------------------------------------------------------------- DATA
    dict(slug="numbers-dont-match", cluster="data",
        q="Why don't our numbers match between systems?",
        direct="""Because the systems count different things with the same words: timing
        differences, duplicate or wrongly merged records, refunds handled one way here and
        another there. <b>It is always findable</b>: trace, explain, repair, reconcile, then
        automate the join so it stays fixed.""",
        body=[
            ("The usual culprits",
             """Date boundaries (order date here, payment date there), records merged on the
             wrong key, deletions in one system invisible to the other, GST in one total and
             not its sibling, and the manual export somebody edits before importing. Every
             mismatch has a mechanism; "the systems just differ" is a surrender, not an
             answer."""),
            ("Where the discipline comes from",
             """Eleven years of records and systems work in places where numbers being wrong
             has consequences: mining, policing, federal government. The habit transfers
             whole: trace the mechanism, prove the repair, reconcile against a source you
             trust. Yours is almost certainly smaller than it feels."""),
            ("What done means",
             """A written explanation of the mechanism, repaired records, totals that agree
             with a source you trust, and the automated join that prevents the rot returning.
             Method at <a href="/data-and-reporting/">data &amp; reporting</a>."""),
        ]),
    dict(slug="spreadsheet-or-bi-tool", cluster="data",
        q="Do we need a BI tool or is a spreadsheet enough?",
        direct="""A spreadsheet is enough more often than the BI industry wants you to know:
        a well-built one, fed automatically, beats a dashboard nobody opens. <b>Graduate to
        BI when many people need live answers at once</b>, not when a demo dazzles a
        director.""",
        body=[
            ("The honest test",
             """Who reads it, how often, on what device, and does it need to be live? One
             manager reviewing weekly numbers is a spreadsheet. Twenty people needing today's
             position on their phones is a dashboard, and I build those too, with a
             <a href="https://aaronsteele.vercel.app/linehaul/">public example you can
             inspect</a>."""),
            ("What actually matters either way",
             """The feed, not the front end. Numbers pulled automatically from the source
             with every figure traceable back to it. A gorgeous dashboard on manually pasted
             data is a rumour with graphics."""),
            ("The cheap upgrade path",
             """Automate the feed into the spreadsheet you already trust, per
             <a href="/answers/automate-weekly-report/">automating the weekly report</a>.
             Half the BI purchases I have reviewed were solving a copy-paste problem with a
             licence fee."""),
        ]),
    dict(slug="automate-weekly-report", cluster="data",
        q="How do I automate a weekly report?",
        direct="""Pull from each source system directly, transform once in one scripted place,
        and deliver on schedule with every number traceable to origin. <b>The Friday
        copy-paste from three systems is the most automatable hour in most businesses</b>,
        and retiring it is usually a small, fixed-price job.""",
        body=[
            ("The pattern",
             """APIs or exports fetched automatically, one transformation with the business
             rules written down at last, output to the spreadsheet, email or dashboard people
             already read, on a schedule. No human hands between source and number."""),
            ("The part that is actually valuable",
             """Writing the rules down. The report's assembler carries silent decisions
             (which statuses count, how refunds land) in their head; automation forces those
             into the open where they can be checked. Businesses learn uncomfortable and
             useful things at this step."""),
            ("What it costs and returns",
             """Typically days of work, fixed quote, repaying a person-hour or more weekly
             forever, plus the removal of single-person dependency. Details at
             <a href="/data-and-reporting/">data &amp; reporting</a>."""),
        ]),
    # -------------------------------------------------------------- ECOMMERCE
    dict(slug="shopify-or-woocommerce", cluster="ecommerce",
        q="Shopify or WooCommerce: which is right for us?",
        direct="""Shopify when you want hosting, security and checkout carried for you and
        will pay monthly for the privilege; WooCommerce when you want ownership, are already
        on WordPress, or need what Shopify's model resists. <b>I build both, so the
        recommendation follows your business, not my toolbox.</b>""",
        body=[
            ("The Shopify trade",
             """Operational load carried, superb checkout, apps for everything, and in
             exchange: monthly fees that stack with apps, transaction margins, and a platform
             whose rules are not yours. For most product retailers starting out it is the
             pragmatic default."""),
            ("The WooCommerce trade",
             """Everything ownable and customisable, no per-sale margin to the platform, and
             in exchange: hosting, updates and security are now your problem, which means
             someone must actually own them. Right for content-heavy stores, unusual selling
             models, and owners who feel strongly about keys."""),
            ("What matters more than the pick",
             """The plumbing behind either: stock truth, orders into accounting, shipping
             without retyping, per <a href="/ecommerce/">e-commerce</a>. A store is a system;
             the storefront is its visible tenth."""),
        ]),
    dict(slug="store-not-converting", cluster="ecommerce",
        q="Why is my online store not converting?",
        direct="""Usually one or two specific leaks, not a general malaise: slow pages,
        surprise shipping at checkout, weak product pages, or traffic that was never going
        to buy. <b>Diagnosis is measurement, not opinion</b>: the funnel tells you exactly
        where buyers give up.""",
        body=[
            ("Read the funnel before touching anything",
             """Product view to cart, cart to checkout, checkout to paid. A cliff at cart is
             price or shipping shock; at checkout, friction or trust; weak product-to-cart is
             the page or the traffic. Ten minutes of analytics beats a redesign brief."""),
            ("The leaks I find most",
             """Slow mobile pages (most of your buyers), shipping costs revealed last,
             account-creation walls, thin product photography, and no reviews anywhere. Each
             is fixable in days, and each fix is measurable the same week."""),
            ("The uncomfortable one",
             """Sometimes conversion is fine and the traffic is wrong: visitors from posts
             that were never buyers. That is a marketing-truth conversation, and having it
             honestly, per <a href="/ecommerce/">e-commerce</a>, saves months of polishing
             the wrong thing."""),
        ]),
    dict(slug="sync-store-with-xero", cluster="ecommerce",
        q="How do I get my store talking to Xero?",
        direct="""For standard Shopify or WooCommerce setups, a connector app does it in an
        afternoon; the craft is in the settings: how fees, refunds, GST and payouts map.
        <b>Done carelessly it reconciles wrong quietly</b>, which is worse than not at
        all.""",
        body=[
            ("The decisions inside the afternoon",
             """Daily summary invoices or per-order detail; where gateway fees land; how
             refunds and partial refunds map; GST treatment on shipping; which clearing
             account matches payouts. Wrong answers here surface months later as an
             accountant's bill."""),
            ("When connectors run out",
             """Multi-channel stores, split payouts, wholesale alongside retail, or volumes
             where per-order invoices drown Xero. Then a small custom sync with proper error
             handling earns its keep, per <a href="/ecommerce/">e-commerce</a>."""),
            ("The test of done",
             """A month reconciles to the cent against the bank feed without a human
             adjusting anything, and exceptions raise their hand instead of hiding. That
             standard, per <a href="/data-and-reporting/">data &amp; reporting</a>, is
             non-negotiable around money."""),
        ]),
    # ---------------------------------------------------------------- RESCUES
    dict(slug="developer-disappeared", cluster="rescues",
        q="My developer disappeared. What do I do?",
        direct="""Secure what you own before anything else: domain registrar, hosting, code
        repository, database, email sending. <b>Then get an independent read on where the
        project truly stands</b>, because "nearly done" from the last person and reality
        are often strangers.""",
        body=[
            ("This week",
             """List every credential and asset, confirm which are in your name (many will
             not be), rotate what you control, and take a full backup of anything reachable.
             Send one polite written request for handover; keep a copy. Do not threaten, do
             not delete, do not panic-rebuild."""),
            ("The independent read",
             """Someone senior reads code, hosting and the trail, then tells you in plain
             words: what exists, what works, what finishing costs versus restarting. That
             read, per <a href="/project-rescue/">rescues</a>, turns a betrayal into a
             decision."""),
            ("The prevention, for next time",
             """Everything in your accounts from day one, code in a repository you own,
             documentation as a deliverable, and no developer who bristles at any of that.
             The ownership test is the character test."""),
        ]),
    dict(slug="take-back-website-from-agency", cluster="rescues",
        q="How do I take my website back from an agency?",
        direct="""Politely, in writing, and with a checklist: domain control, hosting access
        or a full export, CMS admin, analytics, and any licences. <b>A professional agency
        hands it over in days</b>; friction is your signal about how the relationship
        really was.""",
        body=[
            ("The full checklist",
             """Domain registrar login or transfer-out authorisation, hosting account or
             complete site export including database, CMS admin (not editor) access, DNS
             control, analytics and search-console ownership, email routing details, and any
             plugin or theme licences bought on your behalf."""),
            ("The traps",
             """Domains registered in the agency's name (test yours today), "proprietary
             platform" sites that cannot leave without a rebuild, and page-builder licences
             that expire with the relationship. None are fatal; all are better discovered
             before you need to move."""),
            ("The landing",
             """I receive handovers regularly, per <a href="/project-rescue/">rescues</a>:
             audit what arrives, close gaps, and set you up owning everything so this is the
             last time you ask anyone this question."""),
        ]),
    dict(slug="get-my-domain-back", cluster="rescues",
        q="Who owns my domain name, and how do I get it back?",
        direct="""Whoever controls the registrar account, which is frighteningly often a
        developer, an agency or an ex-employee. <b>Check today: look up your domain's
        registrant details</b>, and if it is not your business, start the polite recovery
        now, before you need it in a hurry.""",
        body=[
            ("Why this is the one that matters",
             """The domain is your address, your email and your Google history; lose it and
             every card, sign and ranking dies with it. It outranks the website itself,
             which can be rebuilt."""),
            ("The recovery ladder",
             """Ask nicely in writing for registrant transfer to your account (most comply);
             for .au domains, auDA rules give the registrant of record real rights and a
             complaints path; unresponsive holders can often be routed around at renewal
             time with evidence of your business identity. Escalate calmly and keep
             records."""),
            ("Once it is yours",
             """Your own registrar account, your card on the renewal, auto-renew on, two
             people in your business with access. I set this up as part of every
             <a href="/project-rescue/">rescue</a>, because half of them start here."""),
        ]),
    dict(slug="half-built-project", cluster="rescues",
        q="Is my half-built project worth finishing?",
        direct="""Sometimes the half-built thing is a foundation and sometimes it is a hole;
        the answer comes from a structured read, not loyalty to money already spent.
        <b>Sunk cost is not a reason to finish; salvageable architecture is.</b>""",
        body=[
            ("What the read looks at",
             """Whether the core design is sound, what portion genuinely works versus
             renders, how documented and testable it is, and whether the missing half is
             construction or archaeology. A day or two of reading, a written verdict in
             plain words."""),
            ("The three honest verdicts",
             """Finish it (more exists than you feared); harvest it (keep the design and
             data, rebuild the code, cheaper than it sounds with AI leverage); or end it
             well (keep the lessons, stop the bleeding). I have delivered all three,
             including the third, to people who thanked me later."""),
            ("What finished means this time",
             """A scope agreed in writing, working software over promises, and evidence at
             the end, per <a href="/project-rescue/">rescues</a>. The original dream died
             with the original plan; the job is the shortest honest path to something
             running."""),
        ]),
    # ----------------------------------------------------------------- HIRING
    dict(slug="freelancer-or-agency", cluster="hiring",
        q="Freelancer or agency: which should we hire?",
        direct="""An agency buys you a team and its overheads; a senior freelancer buys you
        one accountable brain. <b>For most small business work, one senior person with AI
        leverage now delivers what previously justified the agency</b>, without the account
        manager between you and the person building.""",
        body=[
            ("What the agency premium buys",
             """Capacity in parallel, cover when someone is sick, process, and a brand to
             sue. Genuinely worth it for large builds needing five specialists at once.
             The premium is real: you fund the office, the juniors and the pitch deck."""),
            ("What changed recently",
             """AI moved the line. Scope that needed a team now fits one senior person who
             specifies, builds and checks, per
             <a href="/answers/can-ai-build-software/">how that works</a>, so the
             agency-sized budget buys freelancer speed twice over, or stays in your
             pocket."""),
            ("The risk people fear, answered",
             """"What if the freelancer disappears" is solved by ownership, not headcount:
             everything in your accounts, documented, handoverable. Judge any hire, per
             <a href="/answers/how-to-judge-a-developer/">judging a developer</a>, by how
             hard they work to make themselves replaceable."""),
        ]),
    dict(slug="how-to-judge-a-developer", cluster="hiring",
        q="How do you judge a developer before hiring them?",
        direct="""Ask for something you can check without trusting them: live software you
        can use, source code you can read, a build you can run. <b>Then judge the
        conversation: plain answers, honest about limits, keen to put things in your
        name.</b> Charm is not evidence.""",
        body=[
            ("The evidence test",
             """Anyone can show screenshots. Live tools, public repositories and named
             checkable claims are the difference between a portfolio and a story. Mine is
             arranged for exactly this test, per
             <a href="https://aaronsteele.vercel.app/fullstack/">the engagement report</a>,
             and you should apply it to everyone including me."""),
            ("The conversation tells",
             """Good sign: they ask about your business before proposing technology, say "I
             don't know" at least once, and volunteer what could go wrong. Bad sign: every
             answer is yes, every timeline is fast, and the ownership question makes them
             vague."""),
            ("The small first job",
             """Structure a real, small, paid piece of work as the interview: a repair, an
             audit, one automation. How they scope, communicate and hand over tells you
             everything a reference call cannot."""),
        ]),
    dict(slug="fixed-price-or-day-rate", cluster="hiring",
        q="Fixed price or day rate: which is better?",
        direct="""Fixed price for defined work, day rate for genuinely open-ended work, and
        a written scope either way. <b>Fixed pricing puts the estimate risk on the builder,
        where it belongs when the builder wrote the scope.</b>""",
        body=[
            ("When fixed is fair",
             """The job can be described, the builder saw the terrain before quoting, and
             changes are handled as written variations rather than absorbed resentment. My
             quotes work this way: if my estimate was wrong, that is my tuition, not your
             invoice."""),
            ("When day rate is honest",
             """Discovery, rescues before the read is done, and embedded work where
             priorities shift weekly. The protection you deserve: a cap, a weekly summary
             of where the days went, and the standing right to stop."""),
            ("The pricing smells",
             """Hourly billing for definable work (the incentive faces the wrong way),
             quotes without written scopes (the argument is scheduled, not avoided), and
             prices that cannot survive the question "what exactly is included". Terms are
             on <a href="/contact/">work with me</a>."""),
        ]),
    dict(slug="custom-software-cost", cluster="hiring",
        q="How much does custom software cost?",
        direct="""Internal tools that once ran to agency six figures now commonly land in the
        four-to-five-figure range from one senior person with AI leverage; the drivers are
        integrations, users and exceptions, not screens. <b>The real question is cost
        against the licence fees and hours the tool retires.</b>""",
        body=[
            ("What moves the number",
             """How many systems it must talk to, how many kinds of user it serves, how
             exception-riddled the process is, and how bulletproof it must be. A tool three
             people use with grace costs a fraction of one that must survive the public."""),
            ("The comparison that matters",
             """Not "custom versus free" but custom versus the SaaS subscriptions, licence
             seats and staff hours it replaces over three years. Custom loses that math
             often, and I will say so; when it wins, it wins permanently, because you own
             it."""),
            ("Proof over promises",
             """Before believing any of this, compile my public reference build, per
             <a href="/full-stack-developer/">custom software</a>: a working platform with
             52 checks you can run. Then we talk about yours, and the quote is fixed and
             written."""),
        ]),
]

PART_B += [
    dict(slug="crm-project-cost", cluster="crm",
        q="How much does a CRM project cost?",
        direct="""Setup and cleanup jobs for small teams commonly run four figures; migrations
        with real history run higher because the work is data, not software. <b>The subscription
        is the small number</b>: the real costs are the setup done properly and the hours your
        team stops wasting.""",
        body=[
            ("The three different jobs inside \"CRM project\"",
             """Fresh setup (configure, import cleanly, train, wire the website in) is the
             smallest. Cleanup of a lived-in CRM depends on how long it has been drifting.
             Migration is the big one, because history must survive the crossing, per
             <a href="/answers/crm-migration-without-losing-data/">migrating without losing
             data</a>: every migration horror story I have cleaned up started as one done
             cheap."""),
            ("What moves the number",
             """Record volume matters less than record mess: duplicates, wrong merges and
             fields nobody trusts all take human judgement to resolve. Integrations are the
             other driver: each system wired in (website, accounting, phones, marketing) adds
             work once and saves retyping forever."""),
            ("The spend that gets skipped and shouldn't",
             """Adoption plumbing, per <a href="/answers/nobody-uses-our-crm/">why nobody uses
             your CRM</a>: automatic feeding, useful context screens, follow-ups drafted.
             Businesses spend on licences and skimp on the part that makes licences worth
             paying. Run your own numbers in the
             <a href="/pricing/">pricing calculator</a>."""),
        ]),
    dict(slug="online-store-cost", cluster="ecommerce",
        q="How much does an online store cost to build?",
        direct="""A first Shopify or WooCommerce store commonly lands in the low-to-mid four
        figures; stores with big catalogues, migrations or accounting and shipping integration
        run higher. <b>The storefront is the visible cost; the plumbing decides the real
        one.</b>""",
        body=[
            ("The base build",
             """Theme set up properly rather than fought, catalogue structured so customers
             and Google both navigate it, payments and shipping configured with the traps
             avoided, and the keys in your name. Product volume matters mostly through data
             quality: fifty tidy products load faster than five hundred feral ones."""),
            ("The multipliers",
             """Migration from an old store (the URLs and rankings must survive, per
             <a href="/answers/redesign-without-losing-seo/">redesigns and rankings</a>),
             integration with Xero or MYOB, per
             <a href="/answers/sync-store-with-xero/">store-to-Xero</a>, stock sync with a
             POS, and custom behaviour the platform resists."""),
            ("The ongoing truth",
             """Platform fees, apps and transaction margins are the store's rent; budget them
             honestly against your margin per order before building anything. That arithmetic
             is part of any quote from me, and the
             <a href="/pricing/">calculator</a> gives you the starting range now."""),
        ]),
]
