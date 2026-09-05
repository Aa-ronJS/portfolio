# System-pair content, part B: health practices, CRM and office, property,
# training providers. Same entry shape and house rules as part A.

PART_B = [
    # ---------------------------------------------------- HEALTH
    dict(slug="cliniko-reminders", group="health",
        name="Cliniko reminders",
        title="Cliniko reminders that actually cut no-shows",
        seo="Cliniko Reminders and No-Shows: What the Built-In SMS Won't Fix",
        blurb="The built-in SMS is fine. No-shows live in what happens around it.",
        direct="""Cliniko's built-in SMS and email reminders work and you should use them
        before paying anyone anything. <b>If no-shows persist with reminders on, the gap is
        around the reminder, not in it</b>: replies nobody actions, cancellations that never
        become filled slots, and patients who needed a rebooking nudge weeks ago. Those are
        joins and workflows, and Cliniko's API is good enough to build all of them.""",
        how=[
            ("Use the built-ins to their edge first",
             """Turn on SMS and email reminders, tune the timing (a reminder three days out
             plus one the afternoon before beats either alone), and write the message so a
             reply feels expected. This costs SMS credits and an hour. Any consultant who
             starts you further down this page than that is selling past the answer."""),
            ("Confirmations need somewhere to land",
             """A patient replying "can't make it" to a reminder has done their part; if
             that reply sits unread until 9am, the slot dies anyway. The join that pays: a
             reply handler that marks the appointment cancelled in Cliniko through its API
             and immediately surfaces the freed slot, instead of relying on whoever checks
             the inbox."""),
            ("The waitlist is where the money is",
             """A cancellation is only a loss if the slot stays empty. Cliniko's API exposes
             appointments and patients, which is enough to keep a real waitlist: when a slot
             frees inside 48 hours, the next suitable waitlisted patient gets an SMS with a
             booking link, first-in wins. Practices fill a meaningful share of
             late-cancelled slots this way, and reception does nothing manual."""),
            ("Recalls: the no-show that never booked",
             """The quietest revenue leak is the patient whose treatment plan said six weeks
             and who simply never rebooked. A recurring job against the API, patients whose
             last appointment is older than their recall interval and who hold no future
             booking, produces a short weekly list, and a personal SMS from the practice
             does the rest. This is retention, not marketing, and patients read it that
             way."""),
        ],
        traps=[
            ("Automating past consent",
             """Health messaging has rules and, more binding still, patient trust. Recall
             and waitlist messages should go only to patients who agreed to them, say who
             they are from, and stop on request, permanently. An automation that feels like
             marketing spends trust the practice spent years earning; keep the register of
             who consented as carefully as the appointment book."""),
            ("Measuring nothing",
             """If you do not know this month's no-show rate, the project cannot know if it
             worked. Start with the number, change one thing, watch it. Cliniko's data makes
             the measurement a query, not a project of its own."""),
        ],
        faq=[
            ("Does Cliniko send appointment reminders automatically?",
             "Yes, SMS and email both, built in, per appointment type. Turn them on and tune the timing before considering anything custom; the custom work only pays where the built-ins stop."),
            ("Can patients confirm or cancel by replying to the SMS?",
             "Patients can reply, and Cliniko shows replies; actioning them is on the practice. The build worth having processes those replies into cancellations and freed slots automatically, then fills the slot from a waitlist."),
            ("Is patient data safe in a build like this?",
             "It has to be, structurally: the work runs against Cliniko's API under the practice's own keys, data stays in the practice's accounts, and nothing is copied out beyond what the message itself needs. You own every credential, which is how I build everything."),
        ],
        related=["halaxy-vs-cliniko", "simpro-scheduling-weather", "axcelerate-enrolment"],
        pillars=[("Health industry page", "/industries/health/"), ("CRM &amp; automation", "/crm-automation/"), ("AI development", "/ai-development/")]),

    dict(slug="halaxy-vs-cliniko", group="health",
        name="Halaxy versus Cliniko",
        title="Halaxy versus Cliniko, honestly",
        seo="Halaxy vs Cliniko for Australian Practices: An Honest Comparison",
        blurb="Both are good. The right one depends on claiming, budget and patience.",
        direct="""Both are capable Australian-grown practice systems and neither is a
        mistake. <b>The honest split: Cliniko charges a flat monthly fee and buys you
        simplicity; Halaxy's core is free and buys you built-in Medicare and funding
        claiming, paid for through processing and SMS credits, at the cost of a steeper
        interface.</b> Which trade wins depends on your claiming volume and your appetite
        for admin screens, not on either product being better.""",
        how=[
            ("Where Cliniko earns its fee",
             """A clean, quick interface reception staff learn in a day, solid built-in
             reminders and telehealth, letters and notes practitioners actually like, and a
             public API good enough to build on, which matters for everything on the Cliniko
             reminders page. Practices that value calm software and predictable per-
             practitioner pricing tend to stop shopping here."""),
            ("Where Halaxy earns its keep",
             """Claiming, mostly: Medicare, DVA and funding-scheme workflows live inside the
             product rather than through add-ons, and the free core matters to solo and
             starting practitioners watching fixed costs. The price is a denser interface
             and a fee model you must actually read: processing margins and credits add up
             with volume, so "free" deserves a spreadsheet, and the spreadsheet depends on
             your claiming mix."""),
            ("The decision, reduced to three questions",
             """How much of your billing is Medicare, DVA or scheme-funded claiming? Weekly
             claiming volume favours Halaxy's built-ins. Who uses the software all day, and
             how much interface will they tolerate? Reception-heavy practices lean Cliniko.
             What are your true monthly costs in each, at your volumes, credits and
             processing included? Run the numbers; the marketing pages of both will not run
             them for you."""),
            ("Switching costs more than either subscription",
             """The real cost between these two is migration: patient records, appointment
             history, templates, recalls and direct debits do not walk across by themselves.
             If you are already on one and merely irritated, targeted fixes and automations
             are usually cheaper than the move. If you are choosing fresh, choose slowly;
             you will be moving data out of this decision for years."""),
        ],
        traps=[
            ("Choosing on the free tier alone",
             """Free core plus per-transaction costs can pass a flat fee surprisingly early
             at real volumes. The comparison that matters is total monthly cost at your
             appointment and claiming numbers, which takes twenty minutes to model and
             regularly reverses the obvious answer."""),
            ("Letting the software decide the workflow",
             """Either system can run a good practice; neither will design one. Recalls,
             cancellation handling and waitlists are practice decisions first and
             configuration second, which is why the migration is the moment to fix them,
             not replicate them."""),
        ],
        faq=[
            ("Which is better, Halaxy or Cliniko?",
             "Neither, universally. High claiming volume and cost sensitivity favour Halaxy; interface quality, calm admin and a build-friendly API favour Cliniko. Model your real monthly costs in both before deciding."),
            ("Can you migrate a practice between them?",
             "Yes: data export and mapping, template and recall rebuilds, a parallel-run window, and reconciliation checks that every patient, appointment and outstanding balance arrived. It is careful work, and it is exactly the shape of migration I do across systems."),
            ("We're on one of them and it's fine. Should we still change anything?",
             'Probably not platforms. The cheaper wins are usually around the edges: reminders tuned, replies actioned automatically, recalls running weekly, reports someone reads. See the Cliniko reminders page for what that looks like.'),
        ],
        related=["cliniko-reminders", "hubspot-to-xero", "axcelerate-enrolment"],
        pillars=[("Health industry page", "/industries/health/"), ("Business analysis", "/business-analysis/"), ("CRM &amp; automation", "/crm-automation/")]),

    # ---------------------------------------------------- CRM / OFFICE
    dict(slug="hubspot-to-xero", group="office",
        name="HubSpot to Xero",
        title="HubSpot to Xero for services businesses",
        seo="HubSpot to Xero Integration for Services Businesses | Australia",
        blurb="Deal won to invoice raised without re-keying, and without duplicate contacts.",
        direct="""The join everyone wants is simple to say: a deal marked won in HubSpot
        becomes a draft invoice in Xero without anyone re-keying the amount, and payment
        status flows back so sales can see who has actually paid. <b>The native HubSpot-Xero
        app does part of this; the part it does not do is decide your rules</b>, and the
        rules, not the plumbing, are what keep the two systems agreeing.""",
        how=[
            ("Contacts: two shapes, one join",
             """HubSpot separates people from companies; Xero holds one flat contact that is
             usually the business. Without a rule, every synced deal risks minting a new
             Xero contact, and receivables fragment across near-duplicates. The rule that
             works for services businesses: the Xero contact is the company, one nominated
             system creates it, and the join matches on ABN or a stored Xero contact ID
             rather than trusting names."""),
            ("Deal won to draft invoice, with the amount you meant",
             """The trigger is a deal hitting a chosen stage; the payload is the deal's line
             items, not its headline value. That means quoting through HubSpot products with
             real prices and GST treatment, so the draft invoice in Xero carries proper
             lines, account codes and tax rates. Deals quoted as one free-typed number
             produce invoices someone must finish by hand, which is the re-keying you were
             paying to remove."""),
            ("Payment status is the half sales actually wants",
             """Invoice paid in Xero should stamp the deal and the company record in
             HubSpot. That single flow ends the weekly "who has paid" spreadsheet, lets
             renewals and follow-ups key off reality, and quietly stops sales chasing a
             client whose invoice is sixty days overdue. It is also the half most cheap
             setups skip, because it flows the unfashionable direction."""),
            ("Decide what happens to the messy middle",
             """Deposits, part-payments, retainers and credit notes all exist in services
             work and each needs one agreed path between the systems. This is an hour of
             decisions with whoever runs the books, written down, then encoded. Every
             HubSpot-Xero mess I have seen was a missing decision wearing a software
             costume."""),
        ],
        traps=[
            ("The duplicate contact factory",
             """Connecting the sync before deduplicating both systems mints duplicates at
             the pace of your sales. Dedupe first, agree the creation rule, then connect.
             The cleanup is the project; the connection is a checkbox."""),
            ("Automating an unpriced pipeline",
             """If deals carry made-up numbers until the proposal is signed, syncing them
             into Xero automates fiction. Fix the quoting discipline first or trigger the
             invoice from a later, truer stage. The books deserve the same honesty as the
             bank."""),
        ],
        faq=[
            ("Does HubSpot integrate with Xero?",
             "Yes, there is a native app that links contacts and shows invoices against HubSpot records, and deeper flows run through the APIs or middleware. The design decisions above matter more than which pipe carries the data."),
            ("Can invoices be created automatically when a deal is won?",
             "Yes, as drafts built from the deal's line items, for a human to approve in Xero. Fully automatic sending is possible and usually unwise; the approval click costs seconds and catches the deal that was marked won by accident."),
            ("Our HubSpot and Xero are already connected and already a mess.",
             "Common, and recoverable: dedupe and merge contacts, reconcile the invoices that doubled, then re-cut the rules for creation and matching. The same record-by-record method as any reconciliation, with a public worst case linked below."),
        ],
        related=["servicem8-to-xero", "halaxy-vs-cliniko", "propertyme-owner-reports"],
        pillars=[("CRM &amp; automation", "/crm-automation/"), ("Professional services industry page", "/industries/professional-services/"), ("Data &amp; reporting", "/data-and-reporting/")]),

    # ---------------------------------------------------- PROPERTY
    dict(slug="propertyme-owner-reports", group="property",
        name="PropertyMe owner reports",
        title="PropertyMe owner reports, automated",
        seo="PropertyMe Owner Reports and Portfolio Reporting, Automated | Australia",
        blurb="Statements are built in. The reporting owners remember you for is not.",
        direct="""PropertyMe generates owner statements natively, and if statements are all
        your owners need, you need nothing from me. <b>The gap agencies feel is one level
        up</b>: the quarterly owner report that reads like advice rather than a ledger, the
        portfolio view across every property you manage, and the arrears and maintenance
        patterns that should reach a principal before they become phone calls. That layer
        is built from PropertyMe's data, on a schedule, in your branding.""",
        how=[
            ("Statements are records; reports are relationships",
             """An owner statement says what moved this month. The report that wins
             referrals says what it means: vacancy against the suburb's norm, rent against
             comparable listings, maintenance spend against the year before, and the one
             recommendation you would make as their agent. Assembling that quarterly, per
             owner, by hand is hours nobody has, which is why almost nobody sends it, which
             is exactly why sending it stands out."""),
            ("The portfolio view your rent roll deserves",
             """PropertyMe knows each property; principals think in rent rolls. Pulling the
             data one level up gives the Monday-morning dashboard: arrears by age band,
             leases expiring in the next 90 days, vacancy days this quarter, maintenance
             jobs open past a week, per property manager. One screen, refreshed
             automatically, replacing the swivel-chair audit of twelve tabs."""),
            ("Exceptions should travel to you",
             """The daily wins are small and specific: an arrears balance crossing fourteen
             days triggers the follow-up workflow; an expiring lease with no renewal
             conversation logged gets flagged three months out, not three weeks. Data out of
             PropertyMe on a schedule, rules applied, a short digest to the right person.
             Quiet software, fewer surprises."""),
            ("Built on your data, in your accounts",
             """The join runs from PropertyMe's data on the agency's own credentials, into
             reporting the agency owns, in the agency's branding. No new system for the team
             to learn, nothing owners must log into, and if I disappear the reports keep
             running, documented, in accounts you control. That last sentence is policy on
             every build, and it is on the record."""),
        ],
        traps=[
            ("Reporting on unhygienic data",
             """A portfolio report is only as honest as lease dates and rent reviews keyed
             into PropertyMe. The build should start with a data quality pass, the same
             report flagging its own gaps ("14 properties missing lease end dates") so the
             cleanup has a worklist and the numbers earn trust."""),
            ("The beautiful report nobody committed to",
             """A quarterly owner report is a promise with a deadline, four times a year,
             forever. Automate the assembly precisely so the promise survives busy months;
             but agree who reads, tweaks and sends it before building anything. Automation
             makes good habits cheap; it does not create them."""),
        ],
        faq=[
            ("Doesn't PropertyMe already do owner reports?",
             "It does owner statements, well. The gap is interpretive and portfolio-level reporting: what the numbers mean per owner, and how the whole rent roll is tracking, assembled automatically instead of manually or never."),
            ("What data can you actually get out of PropertyMe?",
             "The working set an agency runs on: properties, tenancies, rent and arrears, jobs and transactions, through PropertyMe's own export and integration surfaces under your credentials. The right extraction path gets confirmed against your exact plan and volume during scoping, before anything is quoted."),
            ("We're on Property Tree, not PropertyMe.",
             "The layer is the same idea: statements are built in, interpretation and portfolio views are not. The extraction path differs per platform; the report owners forward to their accountant does not."),
        ],
        related=["hubspot-to-xero", "square-shopify-stock", "vettrak-avetmiss"],
        pillars=[("Real estate industry page", "/industries/real-estate/"), ("Data &amp; reporting", "/data-and-reporting/"), ("Custom software", "/full-stack-developer/")]),

    # ---------------------------------------------------- TRAINING / RTO
    dict(slug="axcelerate-enrolment", group="rto",
        name="aXcelerate enrolment",
        title="aXcelerate enrolment from your website",
        seo="aXcelerate Website Enrolment Integration for RTOs | Australia",
        blurb="From course page to compliant enrolment without the re-keying in between.",
        direct="""Most RTO websites end at an enquiry form, and the office re-keys every
        student into aXcelerate afterwards, usually chasing the USI by email for a week.
        <b>aXcelerate's API and web enrolment tooling support a straight-through path</b>:
        course dates on the website pulled live from aXcelerate, enrolment captured once
        with the compliance fields done properly, payment taken, and the student record
        created without anyone retyping a thing.""",
        how=[
            ("Course dates should have one home",
             """If upcoming course dates live in aXcelerate and also, separately, on the
             website, they disagree within a month and a student books a class that moved.
             The join pulls scheduled workshops and intakes from aXcelerate onto the site
             automatically: full classes close themselves, new dates appear when created,
             and nobody updates a web page on a Friday afternoon again."""),
            ("Collect the compliance fields once, correctly",
             """An AVETMISS-clean enrolment needs the student's details in a specific shape:
             USI, and the demographic and background fields the standard requires. A form
             built for this validates as the student types, checks the USI format on the
             spot, and writes fields into aXcelerate correctly named and coded, so reporting
             time is not a cleanup of what the website collected loosely."""),
            ("Payment belongs in the same motion",
             """An enrolment without payment is an enquiry wearing a costume. Taking payment
             in the same flow, card for short courses, deposit or funded-place logic where
             it applies, turns the website into the till, and the reconciliation between
             enrolments and money becomes a report instead of a hunt across three
             inboxes."""),
            ("What happens after submit is half the value",
             """Straight-through means the confirmation email with the right course details
             sends itself, the trainer's roster updates because the class list is the
             system's own, and pre-course requirements (LLN, induction, documents) go out on
             enrolment rather than when someone remembers. The office stops being a
             transcription service and starts being an admissions team."""),
        ],
        traps=[
            ("Funded enrolments are not short-course enrolments",
             """State-funded places carry eligibility checks and evidence that a public web
             form should not pretend to complete. The honest build routes funded enquiries
             into a human-led path with the data pre-captured, and lets fee-for-service
             students go straight through. One form, two exits, no compliance theatre."""),
            ("The API is not the hard part",
             """The hard part is the enrolment policy nobody wrote down: what happens to an
             under-18, an international student, a failed payment, a duplicate USI. I ask
             those questions before writing code, because the eleven years of analysis work
             is precisely knowing that software encodes decisions, and unmade decisions
             become support tickets."""),
        ],
        faq=[
            ("Can students enrol directly into aXcelerate from our website?",
             "Yes. aXcelerate exposes the surfaces to list courses and create enrolments, and its own web enrolment tooling covers simpler cases. The build decides how much of your policy the flow encodes; the plumbing is the established part."),
            ("Will this help with AVETMISS reporting?",
             "Materially: the reporting pain is usually data captured loosely at enrolment. Validating USI and demographic fields at the source means export time stops being archaeology. There is a VETtrak-flavoured page on this same problem."),
            ("What about our student portal and LMS?",
             "Same join, further along: enrolment can provision LMS access automatically. Scope it as a second stage; the enrolment path pays for itself first and proves the plumbing."),
        ],
        related=["vettrak-avetmiss", "cliniko-reminders", "hubspot-to-xero"],
        pillars=[("Education industry page", "/industries/education/"), ("Custom software", "/full-stack-developer/"), ("Business analysis", "/business-analysis/")]),

    dict(slug="vettrak-avetmiss", group="rto",
        name="VETtrak AVETMISS exports",
        title="VETtrak AVETMISS exports without the week of pain",
        seo="VETtrak AVETMISS Export Errors: Fix the Data, Not the Deadline | Australia",
        blurb="The export takes minutes. The week of pain is data findable months earlier.",
        direct="""VETtrak generates the NAT files fine; the week of pain is what validation
        does to them: hundreds of errors surfacing at reporting deadline, all of them data
        problems that entered months earlier. <b>The fix is not a better export button; it
        is moving validation to the moment data is entered</b>, so reporting week finds a
        clean file because the errors were caught in July, one at a time, by the person who
        could still remember the student.""",
        how=[
            ("Name the errors you actually get",
             """Every RTO's error list has a personality: missing or malformed USIs,
             outcomes left as continuing enrolments past the activity end date, funding
             source codes that do not match the state contract, postcodes and addresses the
             standard rejects, and units without results long after delivery ended.
             Pull your last few validation reports and count; the top five categories are
             usually eighty per cent of the pain, and each has an upstream cause with a
             name."""),
            ("Validate weekly, not annually",
             """The build that ends the deadline week: a scheduled job runs the same checks
             the validator will, against current VETtrak data, every week, and sends a short
             list to the right person: "12 enrolments missing USIs, 8 outcomes overdue,
             entered by, due by". Fifty errors a week is admin; two thousand at deadline is
             the week of pain. Same errors, different month, entirely different cost."""),
            ("Push the checks to the point of entry",
             """Better than catching errors weekly is refusing them daily: enrolment forms
             that validate USI format on the spot (there is an aXcelerate-flavoured page on
             this), trainer workflows that will not let a class close with unresulted units,
             checklists that make funding codes a selection, not a memory test. Every check
             moved upstream deletes a category from the weekly list."""),
            ("Reconcile before you submit, on purpose",
             """A file that validates can still be wrong: hours that misstate delivery,
             funded activity that does not match the claim. A pre-submission reconciliation,
             NAT file totals against enrolment counts and funding schedules, catches the
             expensive kind of error, the kind auditors find. Reconciliation is the through-
             line of my data work and the proof below is what it looks like done properly."""),
        ],
        traps=[
            ("State flavours are not optional",
             """Each state training authority has its own collection quirks and deadlines on
             top of the national standard. The weekly checks must encode your actual
             contracts' rules, not generic AVETMISS, or the file passes national validation
             and still bounces at the state. Encode the rules you are actually reporting
             under."""),
            ("Fixing the file instead of the record",
             """Deadline pressure tempts people to edit exported data until the validator
             stops complaining. Now the submission and the student management system
             disagree, and next cycle inherits both the original error and the divergence.
             Fix records in VETtrak, re-export, always, even in a bad week."""),
        ],
        faq=[
            ("Why does our AVETMISS export have so many errors?",
             "Because validation happens months after data entry, so every loose USI, unresulted unit and mis-coded funding source accumulates silently until the deadline surfaces them all at once. Move the checks to weekly, then to the point of entry, and the pile stops forming."),
            ("Can you automate AVETMISS reporting from VETtrak?",
             "The export itself is VETtrak's job and it does it. What is worth building is the continuous validation and reconciliation around it, so the export runs against clean data. That is a modest build with a very measurable payoff: count this year's deadline-week hours."),
            ("We use aXcelerate, not VETtrak.",
             "The strategy is identical; the checks point at a different system. See the aXcelerate enrolment page for the point-of-entry half of the same story."),
        ],
        related=["axcelerate-enrolment", "propertyme-owner-reports", "cliniko-reminders"],
        pillars=[("Education industry page", "/industries/education/"), ("Data &amp; reporting", "/data-and-reporting/"), ("Business analysis", "/business-analysis/")]),
]
