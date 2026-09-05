#!/usr/bin/env python3
"""Generates the /industries/ pages for the services site.

Boilerplate (head, nav, footer) is shared; every industry's content below is
hand-written: its real systems, its real problems, and honesty calibrated to
whether Aaron has direct experience there or is transferring the method.
"""
import html
import re
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "industries"

FAVICON = """<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%2312181f'/%3E%3Ctext x='50' y='74' font-size='68' font-family='Arial' font-weight='700' text-anchor='middle' fill='%23e0a232'%3EA%3C/text%3E%3C/svg%3E">"""

NAV = """<header class="top">
  <div class="wrap">
    <a class="brand" href="/">Aaron Steele<span>.</span></a>
    <nav class="nav" aria-label="Site">
      <a href="/">Home</a>
      <a href="/ai-development/">AI development</a>
      <a href="/wordpress/">WordPress</a>
      <a href="/website-rebuild/">Rebuilds</a>
      <a href="/full-stack-developer/">Custom software</a>
      <a href="/crm-automation/">CRM &amp; automation</a>
      <a href="/industries/"{current}>Industries</a>
      <a href="/answers/">Answers</a>
      <a href="/pricing/">Pricing</a>
      <a href="/project-rescue/">Rescues</a>
      <a href="/contact/">Work with me</a>
    </nav>
  </div>
</header>"""

SERVICES_LINE = """<p><a href="/ai-development/" style="color:inherit">AI development</a> &middot; <a href="/wordpress/" style="color:inherit">WordPress</a> &middot; <a href="/ecommerce/" style="color:inherit">E-commerce</a> &middot; <a href="/mobile-apps/" style="color:inherit">Mobile apps</a> &middot; <a href="/website-rebuild/" style="color:inherit">Website rebuilds</a> &middot; <a href="/full-stack-developer/" style="color:inherit">Custom software</a> &middot; <a href="/crm-automation/" style="color:inherit">CRM &amp; automation</a> &middot; <a href="/data-and-reporting/" style="color:inherit">Data &amp; reporting</a> &middot; <a href="/project-rescue/" style="color:inherit">Project rescues</a> &middot; <a href="/business-analysis/" style="color:inherit">Business analysis</a> &middot; <a href="/systems/" style="color:inherit">System guides</a> &middot; <a href="/diy/" style="color:inherit">DIY kits</a></p>"""

FOOTER = """<footer class="foot">
  <div class="wrap">
    <p class="tag">Room for the right project</p>
    <h2 class="measure">Tell me what's broken.</h2>
    <div class="links">
      <a class="link" href="/contact/">Work with me <span aria-hidden="true">&rarr;</span></a>
      <a class="link" href="https://aaronsteele.vercel.app">Portfolio <span aria-hidden="true">&rarr;</span></a>
      <a class="link" href="https://github.com/Aa-ronJS">GitHub <span aria-hidden="true">&rarr;</span></a>
    </div>
    <div class="foot__meta">
      <p>Aaron Steele. Adelaide, South Australia. Remote Australia-wide. Analyst since 2015,
         building since 2016. TOGAF certified, baseline cleared.</p>
      {services_line}
      {industries_line}
      <p><a href="/privacy/" style="color:inherit">Privacy</a></p>
    </div>
  </div>
</footer>"""


def plain(text: str) -> str:
    """HTML fragment -> plain text for JSON-LD."""
    text = re.sub(r"<[^>]+>", "", text)
    return html.unescape(re.sub(r"\s+", " ", text)).strip()


INDUSTRIES = [
    # ------------------------------------------------------------------ TRADES
    dict(
        slug="trades",
        short="Trades",
        name="Trades &amp; construction",
        title="Software &amp; Automation for Trades &amp; Construction | Australia",
        desc="Job systems wired together for trades businesses: ServiceM8, simPRO, AroFlo and Tradify talking to Xero and the website, quotes that follow themselves up, and field data without paperwork. Built by someone who already ships tools for trades.",
        audience="Trades and construction businesses",
        h1="Built for people who build.",
        lede="""Quoting from the ute, scheduling that a change of weather wrecks, invoices chased at
        nine at night. Trades businesses run on job systems that half-work together, and
        <b>the hours you lose to admin are billable hours going to landfill.</b> One of my two
        live public tools exists because a concreter's biggest enemy is Thursday's weather.""",
        rows=[
            ("Job systems that talk to each other",
             """ServiceM8, simPRO, AroFlo or Tradify wired to Xero and your website, so an enquiry
             becomes a quote becomes a job becomes an invoice without anyone retyping it, and the
             office stops being a photocopier between systems. The plumbing lives at
             <a href="/crm-automation/">CRM &amp; automation</a>."""),
            ("Quotes that follow themselves up",
             """Most trades lose more to unfollowed quotes than to lost jobs. Automated,
             polite persistence: the quote goes out, the reminder goes out, the acceptance books
             the job, and you find out which quotes die and why from
             <a href="/data-and-reporting/">reporting</a> instead of vibes."""),
            ("Weather and scheduling, taken seriously",
             """I built <a href="https://rain-check-mu.vercel.app">Rain Check</a>, a free live
             tool that answers "can we pour the slab in Bendigo on Thursday", because concreting
             and painting fail on different weather and a generic forecast answers neither. The
             same thinking applies to your schedule."""),
            ("Field capture without paperwork",
             """Photos, signatures, site forms and variations straight from the phone into the
             job record, offline where reception is bad, per <a href="/mobile-apps/">mobile
             apps</a>. The site diary that writes itself is not a fantasy; it is a camera and
             fifteen minutes of setup."""),
        ],
        ink=("Where this comes from", "A tool for trades is already live.",
             """Rain Check is not a mock-up: it is on the internet, free, with public source, and
             it answers a question only somebody who listened to trades businesses would think to
             ask. My day job is critical infrastructure at a miner, which is construction's
             bigger sibling: the same scheduling, the same weather, the same subcontractor
             paperwork, at a scale where getting it wrong makes the news.""",
             [("Rain Check, live", "https://rain-check-mu.vercel.app"),
              ("The rest of the evidence", "https://aaronsteele.vercel.app/fullstack/")]),
        faqs=[
            ("We already run ServiceM8 / simPRO / AroFlo. Do we have to change?",
             """No, and you usually should not. The job system is rarely the problem; the gaps
             around it are. I extend what you run: the website feeding it, Xero reconciled with
             it, the follow-ups automated out of it. Changing systems is the last resort, not the
             first quote."""),
            ("Can you stop the double entry between the job system and Xero?",
             """Almost always, yes. Job systems and Xero both have decent APIs; the usual blocker
             is nobody senior enough to decide what maps to what. That mapping is analyst work,
             it takes a conversation, and then the retyping stops permanently."""),
            ("We're tradies, not tech people.",
             """Good; I am not selling you technology, I am buying you hours back. You describe
             the annoying part of your week in plain words, and the fix arrives working, with
             the office shown how to drive it. If a fix is not worth its cost, I say so."""),
        ],
    ),
    # --------------------------------------------------------------- TRANSPORT
    dict(
        slug="transport",
        short="Transport",
        name="Transport &amp; logistics",
        title="Software &amp; Automation for Transport &amp; Logistics | Australia",
        desc="Freight and logistics systems by someone who built a working consignment platform in public: rating with fuel levies, event-logged tracking, POD capture, on-time and lane reporting. Compile it before you call.",
        audience="Transport and logistics operators",
        h1="Freight moves on information.",
        lede="""Consignments, PODs, rate cards, DIFOT, and the customer who rings because nobody
        told them the truck is late. I did not just read about this domain:
        <b>I built a working freight platform in public</b>, rating engine and event log
        included, and you can compile it before you ever talk to me.""",
        rows=[
            ("Operations you can see",
             """On-time percentage, overdue consignments, average and p90 transit times by lane,
             derived from an event log rather than a column somebody forgot to update. The
             <a href="https://aaronsteele.vercel.app/linehaul/">reference build</a> shows exactly
             this dashboard running."""),
            ("Rating and paperwork that reconcile",
             """Chargeable weight at the cubic conversion, fuel levies, GST, effective-dated rate
             cards that survive an audit, invoices that match the work. The arithmetic in my
             public build reconciles to the cent by construction, with the tests to prove
             it."""),
            ("POD without the glovebox filing system",
             """Proof of delivery straight from the driver's phone to cloud storage, attached to
             the consignment, offline-tolerant, per <a href="/mobile-apps/">mobile apps</a>. The
             customer portal that answers "where is it" before they ring is the same
             project's second week."""),
            ("The sweep that rings you first",
             """A watcher that flags consignments blowing their window before the customer
             notices, drafts updates a human approves, and turns exceptions into a
             morning list instead of an afternoon of apologies. Wired per
             <a href="/ai-development/">AI development</a>."""),
        ],
        ink=("Proof, not promises", "Compile the freight platform yourself.",
             """Linehaul is a working slice of a transport platform I keep public: consignments,
             rating, an event-logged delivery lifecycle, an operations dashboard, 52 automated
             checks. It exists precisely so an operator can judge the workmanship on their own
             domain before spending a dollar. Few developers will show you that much.""",
             [("The build, explained", "https://aaronsteele.vercel.app/linehaul/"),
              ("The source", "https://github.com/Aa-ronJS/portfolio/tree/master/linehaul")]),
        faqs=[
            ("We run spreadsheets and a TMS that hates us.",
             """Common, and fixable in either direction: automate around the TMS you keep, or
             replace the spreadsheets with something small and yours. The audit of what the
             spreadsheets actually do comes first, because they always do more than anyone
             admits."""),
            ("Our rates live in the ops manager's head.",
             """That is a single point of failure earning a wage. Effective-dated rate cards in a
             database keep every historical charge explainable and every new quote consistent,
             and the ops manager gets promoted from calculator to decision-maker."""),
            ("Drivers won't use another app.",
             """Agreed, so do not give them one worth hating. One screen, works offline, three
             taps to a POD. Drivers reject apps that make their day longer; they keep the ones
             that end arguments about whether something was delivered."""),
        ],
    ),
    # ------------------------------------------------------------------ MINING
    dict(
        slug="mining",
        short="Mining",
        name="Mining &amp; resources services",
        title="Systems &amp; Analysis for Mining Services Businesses | Australia",
        desc="Systems, compliance automation and data cleanup for contractors and suppliers servicing mine sites, from a senior analyst whose day job is critical infrastructure at a major miner. TOGAF certified, baseline cleared.",
        audience="Mining services contractors and suppliers",
        h1="The standard is the site standard.",
        lede="""My day job since 2022 is senior business analyst and architect on critical
        infrastructure at a major miner. For the contractors and suppliers who service that
        world, <b>I speak both dialects: what the site demands and what your back office can
        actually run.</b>""",
        rows=[
            ("Prequalification and compliance, assembled not retyped",
             """Inductions, tickets and expiries tracked in one place, evidence packs assembled
             automatically for each client portal instead of rebuilt by hand per tender. The
             paperwork does not shrink, but the hours spent feeding it can."""),
            ("Asset and maintenance data you can trust",
             """Plant registers reconciled across the three spreadsheets currently fighting over
             the truth, service histories attached to the asset rather than an inbox, per
             <a href="/data-and-reporting/">data &amp; reporting</a>. I led a council-wide asset
             management platform; the shape of the problem is the same."""),
            ("Reporting that survives scrutiny",
             """Client reports, safety statistics and cost tracking derived from records rather
             than recollection, in a format the site's own systems can swallow. A decade of
             writing for auditors and executives is the difference between a report and a
             defence."""),
            ("Field to office without the double handling",
             """Dockets, prestarts and timesheets captured on the phone at the face and landed in
             payroll and invoicing without retyping, offline-tolerant because site connectivity
             is a rumour. See <a href="/mobile-apps/">mobile apps</a>."""),
        ],
        ink=("Credibility, checkable", "This is not tourism.",
             """Senior analyst and architect on critical infrastructure at BHP, mentoring the
             junior analysts. Before that, policing and federal service delivery: environments
             where the tolerance for hand-waving is zero. TOGAF certified, baseline cleared,
             year-by-year record public. I know why site systems are strict, and I build back
             offices that keep up with them.""",
             [("The track record", "https://aaronsteele.vercel.app/fullstack/")]),
        faqs=[
            ("We're a contractor drowning in client portals.",
             """Every client wants the same evidence in a different shape. The fix is one source
             of truth on your side and automation that feeds each portal its dialect, so
             compliance becomes an export, not a week."""),
            ("Do you understand site constraints, or just software?",
             """Site constraints are my day job: permits, isolation, connectivity that vanishes,
             crews that will not carry a laptop. Anything I build for the field is designed for
             gloves, glare and no bars of reception first."""),
            ("Can you work around our clients' systems (SAP, Pronto, portals)?",
             """Around, yes: clean exports, correct formats, evidence packs their systems accept.
             I do not pretend to customise a client's SAP from outside it, and you should walk
             away from anyone who says they can."""),
        ],
    ),
    # ------------------------------------------------------------------ RETAIL
    dict(
        slug="retail",
        short="Retail",
        name="Retail &amp; e-commerce",
        title="Software &amp; Automation for Retail | POS, Stock, Online | Australia",
        desc="One stock truth across the shop, the website and the marketplaces: POS and Shopify or WooCommerce reconciled, orders flowing to Xero or MYOB, and margin reporting by product and channel. Remote Australia-wide.",
        audience="Retailers",
        h1="Sell everywhere. Count once.",
        lede="""The shop says four in stock, the website says two, the stocktake says none and
        one is on eBay. Multi-channel retail dies of disagreement between systems, and
        <b>the fix is one truth about stock and money, fed to every channel</b> instead of
        five channels each keeping their own score.""",
        rows=[
            ("POS and web, reconciled",
             """Square, Lightspeed or your POS of record kept in agreement with Shopify or
             WooCommerce: stock, prices and products flowing one way on purpose, not two ways by
             accident. The storefront work itself lives at
             <a href="/ecommerce/">e-commerce</a>."""),
            ("Orders to accounting without retyping",
             """Sales from every channel landing in Xero or MYOB correctly coded, refunds and
             fees included, so the accountant reconciles instead of reconstructs. Retail runs on
             cents; the plumbing must too."""),
            ("Marketing that knows what actually sold",
             """Email and loyalty driven by real purchase history rather than guesswork: the
             winback for lapsed regulars, the restock alert for the thing they actually buy.
             Wired through your CRM per <a href="/crm-automation/">CRM &amp; automation</a>."""),
            ("Margin, not just revenue",
             """Reporting by product, channel and season that shows where the margin lives and
             which stock is furniture, per <a href="/data-and-reporting/">data &amp;
             reporting</a>. Most retailers are one honest dead-stock report away from a better
             year."""),
        ],
        ink=("The standard", "Reconciled is a habit, not a feature.",
             """My proudest data job found and repaired a $3.8 million discrepancy and reconciled
             it against the organisation's own books. That is the standard your stock and sales
             numbers get held to: not "the import finished", but "the numbers agree with
             reality, and here is the proof".""",
             [("That story", "https://aaronsteele.vercel.app/#work"),
              ("E-commerce work", "/ecommerce/")]),
        faqs=[
            ("The POS and the website disagree about stock.",
             """Decide which system owns the truth, make every other system a subscriber, and
             backfill the current mess once, carefully. Disagreement is an architecture problem
             wearing an inventory costume, and it never fixes itself."""),
            ("Should we be on Amazon, eBay, catch of the day?",
             """Sometimes, and the honest answer is arithmetic: fees, freight and your margin per
             SKU. I will run that math with you before any integration gets built, because the
             answer is occasionally "absolutely not" and that answer is free."""),
            ("Our reports come from three systems and an argument.",
             """The Friday copy-paste is the most automatable hour in retail: pull each channel
             directly, transform once, deliver a report where every number traces to source.
             The argument retires with the copy-paste."""),
        ],
    ),
    # ------------------------------------------------------------- HOSPITALITY
    dict(
        slug="hospitality",
        short="Hospitality",
        name="Hospitality &amp; tourism",
        title="Software &amp; Automation for Hospitality &amp; Tourism | Australia",
        desc="Direct bookings that beat commissions, one calendar across the OTAs, guest follow-up that writes itself, and rosters without the Sunday-night spreadsheet. Remote Australia-wide.",
        audience="Hospitality and tourism operators",
        h1="Full house, empty inbox.",
        lede="""Bookings arriving from four channels, a phone that never stops, rosters built on
        Sunday night and reviews you mean to answer. Hospitality margins are thin enough
        without paying commission on guests who tried to book direct and could not, so
        <b>the website and the plumbing behind it are revenue, not decoration.</b>""",
        rows=[
            ("Direct bookings worth taking",
             """A fast site with the booking two taps from anywhere, per
             <a href="/website-rebuild/">website rebuilds</a>. Every direct booking is commission
             you keep, and the arithmetic on how much site a few points of channel shift pays
             for is usually startling."""),
            ("One calendar, no double-ups",
             """Your booking engine and the OTAs kept honest with each other, so the double
             booking and the ghost vacancy both stop. Which channel manager fits depends on your
             mix; the recommendation comes with reasons, not a reseller margin."""),
            ("Guests answered at 10pm, honestly",
             """An assistant wired to your real availability, prices and policies, per
             <a href="/ai-development/">AI development</a>, answering the questions that fill
             your inbox, and handing anything nuanced to a human instead of improvising. Post-stay
             follow-ups and review responses drafted for your approval, never sent raw."""),
            ("The admin behind the house",
             """Rosters, onboarding paperwork and supplier orders that assemble themselves from
             what already happened, per <a href="/crm-automation/">automation</a>. The venue
             runs on people; the paperwork should not consume them."""),
        ],
        ink=("Straight about it", "Your industry is new to me. The work is not.",
             """I have not run a venue, and I will not pretend otherwise. What I have done for
             eleven years is walk into operations that cannot stop, learn how they actually run,
             and build systems that hold up under pressure: policing, federal service delivery,
             mining. Your booking engine takes me a week to know cold; the discipline of not
             breaking a live operation I brought with me.""",
             [("How I work", "https://aaronsteele.vercel.app/fullstack/")]),
        faqs=[
            ("The OTAs are eating our margin.",
             """You will not beat their reach, so take the guests they bring and convert the
             repeat visit to direct: capture the relationship at check-in, follow up properly,
             make direct booking genuinely easier. Channel shift is won a few points at a time,
             and a few points is real money."""),
            ("Can AI answer guest messages?",
             """Yes, if it is wired to your real availability and policies rather than
             improvising, and if it escalates anything delicate to a person. A chatbot that
             invents a late checkout policy costs more than it saves, so mine do not
             improvise."""),
            ("Menus and hours change constantly. We can't wait on a developer.",
             """Then the site gets built so you edit those parts yourself, deliberately: the
             menu, the hours, the specials, and nothing that lets a Tuesday edit break the
             booking engine."""),
        ],
    ),
    # ---------------------------------------------------- PROFESSIONAL SERVICES
    dict(
        slug="professional-services",
        short="Professional services",
        name="Professional services",
        title="Automation for Accountants, Lawyers &amp; Consultants | Australia",
        desc="Client intake, document assembly and practice system plumbing for accountants, lawyers and consultants: the typing automated, the judgement left where it belongs, and nothing filed without a professional's approval.",
        audience="Accounting, legal and consulting practices",
        h1="Bill the thinking, not the typing.",
        lede="""Engagement letters assembled by hand, intake details typed three times, the same
        precedent edited in Word since 2019. Practices sell judgement by the hour and spend
        a startling share of those hours on transcription. <b>The typing automates; the
        judgement stays yours, and nothing goes out without a professional's approval.</b>""",
        rows=[
            ("Intake without the treble entry",
             """A client fills one decent form; the practice system, the engagement letter, the
             conflict check list and the file all populate from it. Works alongside what you
             run, whether that is Xero Practice Manager and Karbon on the accounting side or
             Smokeball, Actionstep or Clio on the legal side."""),
            ("Documents assembled from the file",
             """Engagement letters, standard advices, report shells and schedules generated from
             matter and job data instead of last month's copy with the wrong client name still
             in paragraph four. The precedent library becomes templates with rules, not Word
             files with scars."""),
            ("The practice systems, joined up",
             """Practice management, document storage, e-signing and Xero kept in agreement, per
             <a href="/crm-automation/">CRM &amp; automation</a>, so a matter's status is a
             fact, not an inbox search. Time capture included, because unbilled WIP is the
             quietest leak in any practice."""),
            ("AI drafting with a professional in the loop",
             """First drafts, summaries and file note tidying from your own documents and data,
             per <a href="/ai-development/">AI development</a>, always reviewed, never
             auto-filed and never auto-sent. Your indemnity insurer and I agree on this
             design."""),
        ],
        ink=("Built for scrutiny", "Your regulator reads the file. So do I.",
             """I spent years turning legislation into decision rules that accountable public
             servants could audit, at Services Australia, and writing for auditors is half my
             trade. Systems for practices get built the same way: client data stays in your
             tenancy, every automated step leaves a record, and no machine signs anything.""",
             [("The background", "https://aaronsteele.vercel.app/fullstack/")]),
        faqs=[
            ("Confidentiality is non-negotiable for us.",
             """Agreed, and it is architectural, not contractual: your data stays in your
             accounts and your tenancy, access is least-required, and AI features are configured
             so client material is not used to train anyone's models. You get that in writing,
             in the scope."""),
            ("We are drowning in low-value work but wary of AI.",
             """Wary is correct. Start where wrong answers are cheap and reviewable: internal
             drafts, summaries, data tidying. Nothing client-facing goes out unreviewed, and the
             time saved is measured, not asserted."""),
            ("Which practice management system should we move to?",
             """Possibly none; migrations are expensive and the grass is mostly the same shade.
             I audit what you have against what you actually do, and recommend the cheapest
             change that fixes the real problem, which is often plumbing, not platform."""),
        ],
    ),
    # ------------------------------------------------------------------ HEALTH
    dict(
        slug="health",
        short="Health",
        name="Health, allied health &amp; NDIS",
        title="Software &amp; Automation for Clinics, Allied Health &amp; NDIS | Australia",
        desc="Intake, reminders, reporting and NDIS admin automation for clinics and providers: the paperwork assembled from data you already have, clinicians approving rather than typing, privacy treated as architecture.",
        audience="Health, allied health and NDIS providers",
        h1="More care, less keyboard.",
        lede="""Clinicians did not train for years to retype intake forms, and providers lose
        real clinical hours to service agreements, progress reports and claiming admin.
        <b>Most of that paperwork can assemble itself from data you already hold</b>, with
        the professional approving rather than authoring, and privacy treated as
        architecture rather than a checkbox.""",
        rows=[
            ("Intake and reminders that behave",
             """Referrals and new-client forms flowing into the practice system you already run,
             whether that is Cliniko, Halaxy, Nookal or Best Practice, with reminders that
             actually cut no-shows and waitlists that fill cancellations instead of
             apologising for them."""),
            ("NDIS admin, assembled not authored",
             """Service agreements generated from participant and plan data, progress report
             shells built from session records for the clinician to complete, claiming exports
             shaped the way the portal wants them. The professional signs; the system
             types."""),
            ("Reporting without the weekend",
             """Outcomes, utilisation and compliance evidence pulled from records rather than
             reconstructed at report time, per <a href="/data-and-reporting/">data &amp;
             reporting</a>. If an auditor asks how a number was made, the answer is a query,
             not a memory."""),
            ("A front door that works",
             """A website where booking is the first thing, not the fourth, accessible to the
             people you actually serve, per <a href="/website-rebuild/">website rebuilds</a>.
             For providers, being findable and bookable is care access, not marketing."""),
        ],
        ink=("Straight about it", "Rules-heavy paperwork is my home ground.",
             """I am not a clinician and will not pretend to be one. What I am is the analyst
             who turned redress legislation into decision rules accountable people could audit,
             at Services Australia. NDIS paperwork is the same species: rules, evidence,
             accountability. Health data gets handled like site safety on a mine: assumed at
             every step, in your tenancy, with access on a need-to-know basis.""",
             [("That background", "https://aaronsteele.vercel.app/fullstack/")]),
        faqs=[
            ("What about privacy and health records?",
             """Architecture first: your data stays in your systems and your tenancy, access is
             least-required and logged, nothing is used to train anyone's models, and anything
             AI drafts is reviewed by a professional before it touches a client file. You get
             the design in writing before work starts."""),
            ("We run Cliniko / Halaxy and it mostly works.",
             """Keep it. The wins are around it: intake feeding it, reminders and recalls tuned,
             reports assembled from its data, the claiming admin automated. Replacing a working
             practice system is rarely the best spend of a provider's money."""),
            ("NDIS reporting is eating our weekends.",
             """The pattern that fixes it: session notes captured once, properly structured, and
             every downstream document assembled from them. Clinicians review and sign instead
             of authoring from scratch, and the weekend goes back to being a weekend."""),
        ],
    ),
    # -------------------------------------------------------------- NONPROFITS
    dict(
        slug="nonprofits",
        short="Not-for-profits",
        name="Not-for-profits &amp; charities",
        title="Software, CRM &amp; Data for Not-for-Profits | Australia",
        desc="Donor CRMs cleaned and migrated, receipting and reconciliation automated, grant reporting from real data. By the consultant who found and repaired a charity's $3.8 million discrepancy and reconciled it to their books.",
        audience="Not-for-profits and charities",
        h1="Every dollar accounted for. Literally.",
        lede="""My proudest piece of work is a charity's: their donation history was out by
        around $3.8 million after donors were merged on the wrong field, and
        <b>I found why, rebuilt 37,729 donations against the right donors, and reconciled
        it to their books.</b> If your data is a decade of good intentions, you are my
        favourite kind of client.""",
        rows=[
            ("Donor data, repaired and reconciled",
             """Duplicates merged on the right key this time, histories rebuilt, totals that
             agree with the accountant, per <a href="/data-and-reporting/">data &amp;
             reporting</a>. Donor trust is the asset; the database is where it lives."""),
            ("Receipting and reconciliation on rails",
             """Raisely, GiveNow, Stripe and the bank flowing into the CRM and the accounts
             correctly, receipts issued without a volunteer's Tuesday, EOFY statements a
             button rather than a fortnight. Set up per <a href="/crm-automation/">CRM &amp;
             automation</a>."""),
            ("Grant reporting from real data",
             """Funders want numbers with provenance. Program data captured once and reports
             assembled from it, so acquittals stop being archaeology and the program staff go
             back to the program."""),
            ("Capacity on a charity budget",
             """One person with <a href="/ai-development/">AI leverage</a> is the shape of help
             an NFP can afford: the intake automation, the volunteer roster, the small internal
             tool, at quotes a board can approve without a special meeting."""),
        ],
        ink=("The evidence", "The $3.8 million rebuild.",
             """1,019 organisations, 19,350 contacts and 37,729 donations rebuilt on the right
             key and reconciled against the charity's own books, then their donation platforms
             and accounting connected so it stays right without anyone retyping. Client unnamed
             by choice; every number real; the full story is on the portfolio.""",
             [("The full story", "https://aaronsteele.vercel.app/#work")]),
        faqs=[
            ("We cannot afford consultants.",
             """You cannot afford the big-firm shape of them. One senior person with AI leverage
             quotes at a fraction of that, fixed and in writing, and will tell you honestly when
             a cheap or free tool is the right answer, because it often is."""),
            ("Which CRM should an NFP use?",
             """The one your team of part-timers and volunteers will actually keep clean. I have
             run HubSpot, Salesforce and Zoho in anger and nobody pays me a commission, so the
             recommendation follows your operation, not a partner program."""),
            ("Our data is fifteen years of goodwill and chaos.",
             """That is not a barrier, that is the job. Audit first, repair what matters, archive
             what does not, reconcile the result to something you trust, and automate the joins
             so it never rots like that again."""),
        ],
    ),
    # ------------------------------------------------------------- REAL ESTATE
    dict(
        slug="real-estate",
        short="Real estate",
        name="Real estate &amp; property",
        title="Software &amp; Automation for Real Estate &amp; Property | Australia",
        desc="Portal enquiries answered in minutes and filed in the CRM, property management admin automated around PropertyMe and friends, listing copy drafted from facts, and rent-roll reporting principals actually read.",
        audience="Real estate agencies and property managers",
        h1="The follow-up is the business.",
        lede="""Every agent knows the listing that sold because someone answered at 9:40pm.
        Enquiries leak, arrears chases slip, owner reports eat the month's first week, and
        the CRM knows less than the top agent's phone. <b>Most of that is plumbing, and
        plumbing is fixable.</b>""",
        rows=[
            ("Enquiries answered while they're warm",
             """Portal and website enquiries acknowledged in minutes, filed against the right
             property in AgentBox, VaultRE or whatever your agency runs, and the hot ones
             flagged to a human immediately, per <a href="/crm-automation/">CRM &amp;
             automation</a>. Speed to lead is the whole game and it automates beautifully."""),
            ("Property management without the grind",
             """The admin around PropertyMe or your PM platform automated: arrears follow-ups
             that escalate politely, inspection scheduling that fills itself, owner reports
             assembled from real data instead of a fortnight of copy-paste."""),
            ("Listing copy drafted from facts",
             """AI drafts from the actual property data, the agent edits and owns it, per
             <a href="/ai-development/">AI development</a>. Faster to market without the
             suspicious adjectives, and never published unreviewed."""),
            ("Numbers for the principal",
             """Rent roll health, pipeline, lead sources that actually convert, per
             <a href="/data-and-reporting/">data &amp; reporting</a>. Agencies get sold on
             gross commission; they survive on the rent roll, and the rent roll deserves a
             dashboard."""),
        ],
        ink=("Straight about it", "Your industry is new. The discipline is not.",
             """I have not sold houses. I have spent eleven years in operations where records
             have legal weight, policing and federal service delivery among them, and that is
             the right instinct for an industry with trust accounting in it: I automate around
             regulated money, never inside it without your auditor's blessing, and everything
             leaves a record.""",
             [("The track record", "https://aaronsteele.vercel.app/fullstack/")]),
        faqs=[
            ("Leads come in at all hours from four portals.",
             """Acknowledge instantly, file automatically, alert a human for the warm ones, and
             report which portal actually earns its invoice. No enquiry should depend on who is
             rostered on."""),
            ("Can automation touch trust accounting?",
             """Around it, yes: reminders, reconciliation checks that flag mismatches, reporting.
             Inside it, only with your auditor's explicit blessing and usually not at all,
             because your licence is not a reasonable thing to automate against."""),
            ("We already pay for a big CRM we barely use.",
             """The commonest sentence in the industry. Before buying anything else, I make what
             you own actually work: configured to your workflow, fed automatically, and adopted
             because it saves the team time instead of costing it."""),
        ],
    ),
    # ------------------------------------------------------------- AGRICULTURE
    dict(
        slug="agriculture",
        short="Agriculture",
        name="Agriculture &amp; agribusiness",
        title="Software &amp; Automation for Agriculture &amp; Agribusiness | Australia",
        desc="Weather-aware planning, compliance paperwork assembled instead of retyped, farm numbers reconciled into decisions, and field tools that work without reception. Built by the developer behind a live weather-decision tool.",
        audience="Farming and agribusiness operations",
        h1="Seasons don't wait for paperwork.",
        lede="""Everything on the land is a weather call plus a compliance form. My live tool
        Rain Check exists because "what's the forecast" is the wrong question and
        <b>"can we do the job on Thursday" is the right one</b>; the same thinking applies
        to spraying windows, harvest logistics and the paperwork that follows every one of
        them.""",
        rows=[
            ("Decisions with the weather in them",
             """<a href="https://rain-check-mu.vercel.app">Rain Check</a> answers whether
             Thursday's concrete pour survives the weather, live and free. The identical
             pattern serves spray windows, harvest scheduling and contractor bookings: your
             rules plus real forecasts equals a straight answer."""),
            ("Compliance assembled, not retyped",
             """NVDs, spray diaries, chemical records and audit evidence built from data
             captured once in the paddock, not reconstructed at the kitchen table in
             September. The auditors get provenance; you get your evenings."""),
            ("The numbers reconciled into decisions",
             """Yield, price, inputs and agistment reconciled across the spreadsheets and the
             accounting file, per <a href="/data-and-reporting/">data &amp; reporting</a>,
             so the decision about next season leans on arithmetic instead of memory."""),
            ("Tools that work where reception doesn't",
             """Offline-first capture on the phone, syncing when the ute finds bars, per
             <a href="/mobile-apps/">mobile apps</a>. Any tool that assumes coverage was
             designed in a city, and it shows."""),
        ],
        ink=("Straight about it", "Country problems, checked answers.",
             """I am Adelaide-based, not farm-raised, and the proof I offer is the same as
             everywhere on this site: a live weather-decision tool anyone can use, a public
             platform build anyone can compile, and a habit of learning a domain properly
             before building for it. Agriculture also gets my honest scepticism about ag-tech
             platforms: I sell nothing but the work.""",
             [("Rain Check, live", "https://rain-check-mu.vercel.app"),
              ("The rest of the proof", "https://aaronsteele.vercel.app/fullstack/")]),
        faqs=[
            ("Reception is patchy at best.",
             """Then nothing I build for you will assume otherwise: capture works offline,
             syncs opportunistically, and never loses a record to a dead zone. This is a
             design decision on day one, not a patch after harvest."""),
            ("We run the farm on spreadsheets and it mostly works.",
             """Spreadsheets are legitimate farm software and I will not sneer at them. The
             upgrades that pay are usually narrow: the one double entry automated, the one
             report assembled, the one record that must survive an audit made durable."""),
            ("Every ag-tech company wants to sell us a platform.",
             """And each platform wants to be the only one. My advice is independent: I
             integrate what earns its keep, decline what does not, and have no reseller
             margin riding on the answer."""),
        ],
    ),
    # -------------------------------------------------------------- GOVERNMENT
    dict(
        slug="government",
        short="Government",
        name="Government &amp; councils",
        title="A Cleared Analyst-Developer for Government &amp; Councils | Australia",
        desc="Business analysis, small systems and honest AI advice for government and local government, from an analyst with SA Police, Services Australia and council platform delivery on the record. TOGAF certified, baseline cleared.",
        audience="Government agencies and local councils",
        h1="Small, senior, cleared.",
        lede="""Policing, federal service delivery and a council-wide platform are already on my
        record, and I hold a baseline clearance. For the work that is too small for a big
        panel engagement and too important for nobody:
        <b>one senior, cleared analyst who also builds.</b>""",
        rows=[
            ("Requirements with legal weight",
             """On the National Redress Scheme I turned legislation into the decision rules a
             system applies to who qualifies, written so accountable people could audit them.
             That is the standard for requirements here: traceable, testable, ownable, per
             <a href="/business-analysis/">business analysis</a>."""),
            ("The systems between the systems",
             """Every agency runs on small tools nobody procured: the tracker between two
             corporate systems, the register in a spreadsheet with one fragile owner. I build
             those properly, sized honestly, documented so they survive staff turnover."""),
            ("Asset and community platforms",
             """Lead analyst on a council-wide asset management platform at the City of Marion.
             Local government's mix of assets, compliance and community expectations is a
             known quantity here, not a discovery exercise on your invoice."""),
            ("AI adoption without the vendor gloss",
             """Where AI genuinely helps a public-sector workflow, where it must not go near a
             decision, and how to pilot it without a headline. Advice from someone who builds
             with it daily and, per <a href="/ai-development/">AI development</a>, documents
             what it must never do."""),
        ],
        ink=("The record", "Rooms where it has to be right.",
             """SA Police, Project Shield, rebuilding frontline systems. Services Australia,
             National Redress and veterans' entitlements. City of Marion, a council-wide asset
             platform. SA Department of Education, the technology side of the state's
             vocational education strategy. TOGAF certified, baseline cleared, comfortable
             subcontracting to panel primes where that is how your procurement works.""",
             [("Year by year", "https://aaronsteele.vercel.app/fullstack/")]),
        faqs=[
            ("What clearance and certifications do you hold?",
             """Baseline clearance, TOGAF certified, with policing and federal delivery on the
             record. Anything above baseline is sponsorable in the usual way if an engagement
             requires it."""),
            ("We buy through panels.",
             """Understood, and workable: I subcontract to panel primes, fit inside existing
             arrangements, or take engagements sized where your delegation allows direct
             sourcing. Tell me your constraint and I will tell you honestly whether I fit
             it."""),
            ("Records, privacy and accountability obligations are strict here.",
             """They have been my working conditions for a decade. Everything I build leaves an
             audit trail, respects records obligations by design, and is documented so the
             next officer, not just the next developer, can run it."""),
        ],
    ),
    # --------------------------------------------------------------- EDUCATION
    dict(
        slug="education",
        short="Education",
        name="Education &amp; training",
        title="Software &amp; Automation for RTOs, Education &amp; Training | Australia",
        desc="Student lifecycle automation, AVETMISS-shaped compliance reporting and systems integration for RTOs and training businesses, from an analyst with university CRM rollouts and state VET strategy on the record.",
        audience="RTOs, universities and training businesses",
        h1="Teach. The admin can type itself.",
        lede="""My career started in education: a new CRM at the Australian Institute of
        Business, CRM and ERP rollouts for universities, then leading the technology side
        of South Australia's vocational education strategy. <b>Training businesses run on
        compliance-shaped admin, and compliance-shaped admin is exactly what automates
        well.</b>""",
        rows=[
            ("The student lifecycle, joined up",
             """Enquiry to enrolment to completion without retyping: the website feeding the
             student management system, whether that is aXcelerate, VETtrak or something
             larger, with the follow-ups automated per <a href="/crm-automation/">CRM &amp;
             automation</a>. Unanswered enquiries are unenrolled students."""),
            ("Compliance reporting from real records",
             """AVETMISS and funding-body reporting assembled from the SMS data you already
             keep, validated before submission rather than bounced after, per
             <a href="/data-and-reporting/">data &amp; reporting</a>. Audit evidence becomes
             an export, not an excavation."""),
            ("Systems that stop fighting",
             """SMS, LMS, CRM and Xero kept in agreement, so a student's status is one fact
             everywhere: the moodle course opens when the enrolment lands, the invoice raises
             itself, the certificate waits on the actual completion."""),
            ("Course pages that enrol",
             """A site where each course earns its own findable, honest page with the intake
             dates true and the enrol button working, per <a href="/website-rebuild/">website
             rebuilds</a>. For most RTOs the website is the top of the funnel and treated
             like a brochure."""),
        ],
        ink=("The record", "Where it started, actually.",
             """Education is not an industry I am guessing at: AIB is where the building
             began, DVE Business Solutions is where I rolled CRM and ERP into universities,
             and the SA Department of Education is where I led the technology side of a state
             VET strategy. The sector's mix of pedagogy, funding rules and audit pressure is
             familiar ground.""",
             [("Year by year", "https://aaronsteele.vercel.app/fullstack/")]),
        faqs=[
            ("We run aXcelerate / VETtrak and it is fine, mostly.",
             """Keep it, and fix the "mostly": the website enquiry that dies in an inbox, the
             LMS that does not know about the enrolment, the AVETMISS export that takes a
             week. The SMS is rarely the problem; the gaps around it are."""),
            ("ASQA audits terrify everyone here.",
             """The terror is usually about evidence assembly, not practice. Capture once,
             structure properly, and audit evidence becomes a query with provenance. The RTO
             manager signs off; the system does the gathering."""),
            ("We are a small RTO with a small budget.",
             """The shape of help you can afford is one senior person with AI leverage and a
             fixed quote. Start with the one automation that returns the most hours, measure
             it, and let the savings fund the next one."""),
        ],
    ),
]


def industries_line(current_slug=None):
    parts = []
    for ind in INDUSTRIES:
        parts.append(f'<a href="/industries/{ind["slug"]}/" style="color:inherit">{ind["short"]}</a>')
    return "<p>Industries: " + " &middot; ".join(parts) + "</p>"


def page_head(title, desc, path, jsonld):
    return f"""<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://REPLACE-DOMAIN{path}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:image" content="https://REPLACE-DOMAIN/og/industries.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://REPLACE-DOMAIN/og/industries.png">
<meta name="theme-color" content="#12181f">
{FAVICON}
<link rel="preload" as="font" type="font/woff2" href="/fonts/clash-display-var.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/fonts/satoshi-var.woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css">
<script type="application/ld+json">
{jsonld}
</script>
</head>
<body>
"""


def render_industry(ind):
    path = f"/industries/{ind['slug']}/"
    faq_entities = ",\n        ".join(
        '{{ "@type": "Question", "name": {q}, "acceptedAnswer": {{ "@type": "Answer", "text": {a} }} }}'.format(
            q=jstr(plain(q)), a=jstr(plain(a))) for q, a in ind["faqs"])
    jsonld = f"""{{
  "@context": "https://schema.org",
  "@graph": [
    {{
      "@type": "Service",
      "name": {jstr(plain(ind['name']) + ': software, automation and analysis')},
      "serviceType": "Software development and automation consulting",
      "provider": {{ "@type": "Person", "name": "Aaron Steele", "url": "https://aaronsteele.vercel.app" }},
      "areaServed": "Australia",
      "audience": {{ "@type": "Audience", "audienceType": {jstr(ind['audience'])} }},
      "url": "https://REPLACE-DOMAIN{path}"
    }},
    {{
      "@type": "BreadcrumbList",
      "itemListElement": [
        {{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://REPLACE-DOMAIN/" }},
        {{ "@type": "ListItem", "position": 2, "name": "Industries", "item": "https://REPLACE-DOMAIN/industries/" }},
        {{ "@type": "ListItem", "position": 3, "name": {jstr(plain(ind['name']))}, "item": "https://REPLACE-DOMAIN{path}" }}
      ]
    }},
    {{
      "@type": "FAQPage",
      "mainEntity": [
        {faq_entities}
      ]
    }}
  ]
}}"""

    rows = "\n".join(
        f"""        <div class="row">
          <h3>{h}</h3>
          <div>{b}</div>
        </div>""" for h, b in ind["rows"])

    ink_tag, ink_h2, ink_body, ink_links = ind["ink"]
    ink_link_html = "\n        ".join(
        f'<a class="link" href="{href}">{label} <span aria-hidden="true">&rarr;</span></a>'
        for label, href in ink_links)

    faqs = "\n".join(
        f"""        <details>
          <summary>{q}</summary>
          <div>{a}</div>
        </details>""" for q, a in ind["faqs"])

    return page_head(ind["title"], ind["desc"], path, jsonld) + f"""
{NAV.format(current="")}

<main>
  <div class="hero">
    <div class="wrap">
      <ol class="crumbs"><li><a href="/">Home</a></li><li><a href="/industries/">Industries</a></li><li>{ind['name']}</li></ol>
      <h1 class="measure">{ind['h1']}</h1>
      <p class="lede">
        {ind['lede']}
      </p>
      <div class="cta-row">
        <a class="btn" href="/contact/">Make the case</a>
        <a class="btn btn--ghost" href="/industries/">Other industries</a>
      </div>
    </div>
  </div>

  <section class="section">
    <div class="wrap">
      <p class="tag">The work</p>
      <h2 class="measure">Where the hours go, and come back.</h2>
      <div class="rows">
{rows}
      </div>
    </div>
  </section>

  <section class="section section--ink">
    <div class="wrap">
      <p class="tag">{ink_tag}</p>
      <h2 class="measure">{ink_h2}</h2>
      <p class="measure-wide dim" style="margin-top:var(--s5)">
        {ink_body}
      </p>
      <div class="cta-row" style="margin-top:var(--s7)">
        {ink_link_html}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <p class="tag">Fair questions</p>
      <h2 class="measure">Before you ask.</h2>
      <div class="faq">
{faqs}
      </div>
    </div>
  </section>
</main>

{FOOTER.format(services_line=SERVICES_LINE, industries_line=industries_line())}

</body>
</html>
"""


def jstr(s):
    import json
    return json.dumps(s)


def render_index():
    path = "/industries/"
    cards = "\n".join(
        f"""        <li>
          <h3><a href="/industries/{ind['slug']}/">{ind['name']}</a></h3>
          <p>{ind['card']}</p>
          <a class="link" href="/industries/{ind['slug']}/">{ind['short']} <span aria-hidden="true">&rarr;</span></a>
        </li>""" for ind in INDUSTRIES)
    jsonld = f"""{{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://REPLACE-DOMAIN/" }},
    {{ "@type": "ListItem", "position": 2, "name": "Industries", "item": "https://REPLACE-DOMAIN/industries/" }}
  ]
}}"""
    title = "Industries | Software, Automation &amp; AI by Sector | Aaron Steele"
    desc = "How the same disciplines land in your industry: trades, transport, mining, retail, hospitality, professional services, health, not-for-profits, real estate, agriculture, government and education. Each page says honestly whether I have worked your sector or am transferring the method."
    return page_head(title, desc, path, jsonld) + f"""
{NAV.format(current=' aria-current="page"')}

<main>
  <div class="hero">
    <div class="wrap">
      <ol class="crumbs"><li><a href="/">Home</a></li><li>Industries</li></ol>
      <h1 class="measure">Your industry, on purpose.</h1>
      <p class="lede">
        The services are the same ten everywhere; what changes is the systems your sector runs
        on and the paperwork it answers to. Each page below names both. And each one says
        plainly whether I have <b>worked your industry for years or am transferring the
        method</b>, because you deserve to know which before you email.
      </p>
      <div class="cta-row">
        <a class="btn" href="/contact/">Make the case</a>
      </div>
    </div>
  </div>

  <section class="section">
    <div class="wrap">
      <p class="tag">Pick yours</p>
      <h2 class="measure">Twelve sectors, one standard.</h2>
      <ul class="cards">
{cards}
      </ul>
      <p class="measure-wide dim" style="margin-top:var(--s7)">
        Not listed? The absence is honest, not exhaustive: if your operation runs on systems,
        rules and paperwork, the shape of the work is the same.
        <a href="/contact/">Describe it in plain words.</a>
      </p>
    </div>
  </section>
</main>

{FOOTER.format(services_line=SERVICES_LINE, industries_line=industries_line())}

</body>
</html>
"""


CARDS = {
    "trades": "ServiceM8 to Xero without retyping, quotes that chase themselves, and a live weather tool built for exactly your Thursday problem.",
    "transport": "A working freight platform sits in my public repository: rating, event-logged tracking, POD, lane reporting. Compile it first.",
    "mining": "Day job: critical infrastructure at a major miner. For the contractors who service that world, both dialects spoken.",
    "retail": "One truth about stock and money across POS, web and marketplaces, reconciled to the standard of a $3.8m repair job.",
    "hospitality": "Direct bookings that beat commissions, one calendar across the OTAs, and guests answered at 10pm without inventing policy.",
    "professional-services": "Intake typed once, documents assembled from the file, AI drafting with a professional in the loop. Billable hours, rescued.",
    "health": "NDIS and clinic admin assembled from data you already hold, clinicians approving rather than authoring, privacy as architecture.",
    "nonprofits": "The $3.8 million donor rebuild is my proudest work. Receipting, reconciliation and grant reporting on a charity budget.",
    "real-estate": "Portal enquiries answered in minutes and filed properly, PM admin automated, and nothing touching trust money uninvited.",
    "agriculture": "Weather-aware decisions, compliance without the kitchen-table September, and field tools that survive dead zones.",
    "government": "SA Police, Services Australia and a council platform on the record. Baseline cleared, TOGAF, panel-friendly.",
    "education": "Where my career started: university CRMs, state VET strategy. Enrolment to AVETMISS without the retyping.",
}

for ind in INDUSTRIES:
    ind["card"] = CARDS[ind["slug"]]

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "index.html").write_text(render_index())
for ind in INDUSTRIES:
    d = OUT / ind["slug"]
    d.mkdir(exist_ok=True)
    (d / "index.html").write_text(render_industry(ind))
print(f"wrote {1 + len(INDUSTRIES)} pages")
