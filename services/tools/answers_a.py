# Answer content, part A: websites, apps, ai clusters.
# Each entry: slug, cluster, q (the question, also title/h1), direct (the
# snippet-style answer, HTML), body: list of (h3, paragraph HTML).

PART_A = [
    # ------------------------------------------------------------- WEBSITES
    dict(slug="how-much-does-a-website-cost", cluster="websites",
        q="How much does a website cost in Australia?",
        direct="""In the Australian market, a small business site from a freelancer commonly
        lands somewhere between $2,000 and $10,000, agencies typically start where freelancers
        finish, and e-commerce or custom features push higher. <b>The honest answer for your
        site is a fixed written quote</b>, and the drivers below are what actually move the
        number.""",
        body=[
            ("What actually drives the price",
             """Pages are cheap; thinking is not. The cost drivers are how much content exists
             versus needs writing, whether the design is bespoke or a well-executed standard,
             what the site must connect to (bookings, payments, your CRM), and how much of the
             old site's traffic must survive the move. A brochure site and a site wired into
             your operations are different purchases wearing the same word."""),
            ("Where budgets get wasted",
             """Paying agency overheads for freelancer work, rebuilding what only needed
             repair, and page-builder subscriptions stacked on cheap hosting to compensate for
             a heavy build. The other classic: a beautiful site with no thought given to the
             searches that should find it, discovered six months later when the phone has not
             rung."""),
            ("How I quote it",
             """Fixed, in writing, after seeing what exists and hearing what the site must do.
             One person with AI leverage quotes below the team it replaces, and if a repair or
             a refresh serves you better than the rebuild you asked about, the quote says that
             instead. See <a href="/website-rebuild/">website rebuilds</a> for the method."""),
        ]),
    dict(slug="why-is-my-website-slow", cluster="websites",
        q="Why is my website so slow?",
        direct="""Usually some mix of cheap hosting, a heavy theme, too many plugins doing
        overlapping jobs, and images uploaded straight off a phone. <b>The fix starts with
        measuring which of those it actually is</b>, with the same tools Google uses, then
        removing causes rather than stacking a caching plugin on the pile.""",
        body=[
            ("The usual suspects, in order",
             """Oversized images are the commonest and cheapest to fix. Then bloated themes
             and page builders loading everything everywhere, then plugin pile-ups where three
             tools each load their own copy of the same library, then hosting chosen on price
             alone. Occasionally it is something real like an unindexed database, which is
             where a developer earns the fee."""),
            ("Why it matters beyond patience",
             """Speed is a ranking factor and a conversion factor: visitors on phones abandon
             slow pages before they see what you sell, and Google measures exactly that. A
             slow site is quietly expensive every single day."""),
            ("What a proper fix looks like",
             """Measure first, fix causes, measure again, and show you both numbers. Most
             sites can be transformed without a rebuild; when the theme itself is the anchor,
             I will say so and price the honest option. Details at
             <a href="/wordpress/">WordPress repairs</a>."""),
        ]),
    dict(slug="wordpress-site-hacked", cluster="websites",
        q="My WordPress site was hacked. What do I do first?",
        direct="""Change your hosting and WordPress passwords now, take the site offline or into
        maintenance mode if it is serving spam, and do not delete anything yet: the evidence
        matters. <b>Almost every hacked site can be cleaned or rebuilt</b>, and sometimes the
        rebuild is cheaper.""",
        body=[
            ("The first hour",
             """Rotate credentials (hosting, WordPress admin, database, FTP), check whether
             your email domain is blacklisted, and screenshot anything strange. If customer
             data may be involved, note when you noticed: Australian privacy law cares about
             timelines, and so should you."""),
            ("The clean-up, properly",
             """Isolate the site, rebuild from known-good plugin and theme copies plus a clean
             database export, rotate every secret, and close the way in, which is usually an
             outdated plugin or a reused password. A scan-and-hope cleanup that leaves the
             door open is how sites get hacked twice."""),
            ("Clean or rebuild?",
             """An old site with a pile of abandoned plugins is often cheaper to rebuild lean
             than to disinfect. You get that comparison honestly before spending, per
             <a href="/wordpress/">WordPress</a>, and either way you end up holding all your
             own keys, which is how this gets prevented."""),
        ]),
    dict(slug="redesign-without-losing-seo", cluster="websites",
        q="Will redesigning my website hurt my Google rankings?",
        direct="""It can, badly, if pages that rank get deleted or their addresses change
        without redirects, and this is the most expensive mistake in website projects because
        it is invisible on launch day. <b>Done properly, a redesign should help rankings</b>,
        because the site gets faster and the content gets better.""",
        body=[
            ("How rankings actually get lost",
             """Google ranks pages, not sites. Delete the quietly-performing service page, or
             move it without a redirect, and its rankings die with it; the phone stops ringing
             six weeks later and nobody connects the two events."""),
            ("The protective method",
             """Audit what earns traffic before touching anything, map every old address to
             its new home, keep or improve the content doing the earning, and watch search
             traffic after launch so surprises get caught in days. The full method is at
             <a href="/website-rebuild/">website rebuilds</a>."""),
            ("The upside done right",
             """A faster site with clearer pages on the same addresses usually climbs. The
             redesigns that end in tears skipped the audit, not the design."""),
        ]),
    dict(slug="how-long-does-a-website-take", cluster="websites",
        q="How long does a new website take to build?",
        direct="""Small business sites typically run two to six weeks from agreed scope to
        launch; larger or heavily integrated sites longer. <b>The honest variable is rarely
        the build: it is the content</b>, because design and development move quickly and
        waiting on words, photos and decisions is what stretches timelines.""",
        body=[
            ("Where the weeks actually go",
             """A week of scoping and audit, a week or two of design and build, and then the
             stretch: your about text, your service descriptions, your photos, your sign-offs.
             Builders wait on content the way concreters wait on weather."""),
            ("How to compress it",
             """Have one decision-maker, gather content before the build starts, and accept
             that version one does not need everything. A good four-page site live this month
             beats a perfect twelve-page site live in spring."""),
            ("What I commit to",
             """A schedule in writing with the quote, honest about which parts depend on you.
             With AI leverage the build itself is fast; I would rather tell you the real
             bottleneck up front than surprise you with it in week three."""),
        ]),
    dict(slug="wix-squarespace-or-wordpress", cluster="websites",
        q="Wix, Squarespace or WordPress: which should a small business use?",
        direct="""If your site is a straightforward brochure and you want to edit it yourself
        with zero maintenance, the hosted builders are genuinely fine. <b>WordPress earns its
        keep when you need ownership, integrations, or search performance at scale</b>, and
        custom builds earn theirs when the site is really an application.""",
        body=[
            ("The honest case for the builders",
             """Wix and Squarespace bundle hosting, security and editing for a monthly fee,
             and for a cafe or a consultant's card-on-the-web they are often the right call. A
             developer who cannot say that is selling you their preference."""),
            ("Where they run out",
             """Deep integrations with your CRM or job system, serious multi-page search
             strategies, exporting your site if you ever want to leave, and costs that look
             small monthly and large over five years. Businesses outgrow builders quietly and
             then feel stuck."""),
            ("How to choose",
             """Pick for the next three years, not the next month: what must the site connect
             to, who edits it, how much does search matter. I build on both sides of this
             line, per <a href="/wordpress/">WordPress</a> and
             <a href="/full-stack-developer/">custom work</a>, so the recommendation follows
             your answer, not my toolbox."""),
        ]),
    dict(slug="website-maintenance", cluster="websites",
        q="What does website maintenance actually involve?",
        direct="""For a WordPress site: updates applied on a schedule with backups that have
        actually been test-restored, security monitoring, and small content changes. <b>The
        real product is that nothing scary ever happens</b>, and if it does, recovery is
        boring.""",
        body=[
            ("The genuine work",
             """Core, theme and plugin updates staged rather than clicked hopefully; backups
             stored off the server and restored once to prove they work; uptime and security
             monitoring; renewals watched so the domain never lapses. Twenty minutes of
             discipline a month that prevents the four-figure emergency."""),
            ("The padding to watch for",
             """Vague "SEO monitoring", reports nobody reads, and retainers priced on fear.
             Ask any maintenance provider two questions: when did you last restore a backup of
             my site, and what exactly did you do last month. Short answers are telling."""),
            ("A self-serve alternative",
             """A lean site with few plugins barely needs a retainer: I set owners up with
             staged auto-updates, tested backups and a checklist, and remain a phone call for
             the genuinely scary. Ownership is the point; see
             <a href="/wordpress/">WordPress</a>."""),
        ]),
    # ----------------------------------------------------------------- APPS
    dict(slug="how-much-does-an-app-cost", cluster="apps",
        q="How much does an app cost to build in Australia?",
        direct="""Less than the horror stories and more than the ads: simple business apps
        commonly land in the low tens of thousands from independents, several times that from
        agencies, and the famous blowouts come from the half of the project most quotes omit.
        <b>The screens are the visible half; the backend is the expensive half.</b>""",
        body=[
            ("The half most quotes leave out",
             """An app is a front end to a backend: accounts, data sync, an API, the admin
             screen someone in your office needs, and the app-store review process. Quotes
             that only price the screens produce the blowout stories, because the other half
             arrives as variations."""),
            ("What makes yours cheaper or dearer",
             """Cross-platform from one codebase halves the store cost against building iOS
             and Android separately. Offline capability, camera and GPS workflows, and
             integration with your existing systems are the real multipliers, and honest scope
             trimming, per <a href="/answers/mvp-first-version/">what belongs in version
             one</a>, is the real discount."""),
            ("And sometimes the answer is no app",
             """If your list of needs is "customers can find us, read about us and book us", a
             fast mobile site does it for a fraction and skips the stores entirely. I quote
             that instead when it is true, per <a href="/mobile-apps/">mobile apps</a>."""),
        ]),
    dict(slug="app-or-website", cluster="apps",
        q="Does my business need an app or a website?",
        direct="""The test is short: do you need what only an installed app provides, meaning
        offline use, camera and GPS inside workflows, push notifications, or an icon staff tap
        every day? <b>If not, a fast mobile website does the job</b> with no store approvals,
        no update lag and a smaller invoice.""",
        body=[
            ("When the app genuinely wins",
             """Field crews capturing photos and signatures with no reception, staff tools
             used hourly, anything where the phone's hardware is part of the workflow. Those
             are app-shaped problems, and pretending a website solves them wastes money in the
             other direction."""),
            ("When the website wins",
             """Customers finding you, reading about you, booking you, paying you. They will
             not download an app for that, and the app stores are a tax on updates you do not
             need to pay. A web app can even sit on their home screen like the real thing."""),
            ("The vested-interest warning",
             """Anyone who only builds apps will find your problem app-shaped. I build both,
             per <a href="/mobile-apps/">mobile apps</a> and
             <a href="/website-rebuild/">websites</a>, so the recommendation costs me nothing
             either way."""),
        ]),
    dict(slug="mvp-first-version", cluster="apps",
        q="What should the first version of my app include?",
        direct="""One workflow, done completely: the single thing users will do daily, plus
        login, plus nothing. <b>Version one exists to prove people want it and to teach you
        what version two should be</b>, and every extra feature slows that lesson down and
        raises its price.""",
        body=[
            ("The cut that hurts and pays",
             """List everything you want, then mark the one thing without which the app is
             pointless. Build that end to end, polished, with the boring parts (accounts,
             errors, the admin view) done properly. Everything else goes on a list titled
             "after real users"."""),
            ("Why restraint wins",
             """Real users reorder your roadmap within a fortnight, and features built before
             their feedback are guesses at full price. The graveyard of app projects is full
             of version ones that tried to be version fours."""),
            ("The analyst's edge",
             """Scoping is my day job: working out which workflow is actually the one, before
             the money moves, is worth more than any amount of code. That conversation, per
             <a href="/business-analysis/">business analysis</a>, is where an app project is
             won."""),
        ]),
    dict(slug="how-long-does-an-app-take", cluster="apps",
        q="How long does it take to build an app?",
        direct="""A focused first version of a business app typically runs six to twelve weeks
        including app-store review; sprawling scopes run to quarters. <b>With AI leverage the
        coding is no longer the long pole</b>: deciding what to build, integrating your
        systems, and store review are.""",
        body=[
            ("The real timeline",
             """A couple of weeks of scoping and design, several weeks of build with working
             software visible weekly, then integration with your real systems, then Apple and
             Google review, which runs days when prepared for and weeks when not."""),
            ("What blows timelines out",
             """Scope that grows mid-build, waiting on access to systems the app must talk to,
             and decision-makers who surface in week eight. All three are process problems; a
             written scope and one empowered owner prevent them."""),
            ("What speed looks like now",
             """One person specifying and building with AI, showing working software weekly,
             is faster than the old team model precisely because nothing is lost between the
             person who understood and the person who typed. See
             <a href="/mobile-apps/">mobile apps</a> for the method."""),
        ]),
    # -------------------------------------------------------------------- AI
    dict(slug="can-ai-build-software", cluster="ai",
        q="Can AI really build production software?",
        direct="""Yes: two of my tools are live on the internet with public source, and a full
        platform build with 52 automated checks sits in a public repository, all AI-built
        under direction. <b>What AI cannot do is know what your business needs, notice its
        own confident mistakes, or prove its work</b>: that is the human's job.""",
        body=[
            ("What changes with AI",
             """Volume and speed: the typing is no longer scarce. Internal tools that were a
             quarter's project for a team are now weeks for one person, which moves whole
             categories of software from "not worth it" to "obviously worth it"."""),
            ("What does not change",
             """Something has to define right, check the result against reality, and take
             responsibility. AI will build the wrong thing beautifully, describe tests that do
             not exist, and say "done" as a vibe rather than a fact. I run it like a delivery
             team: written specifications, adversarial review, proof against sources it does
             not control, per <a href="/ai-development/">AI development</a>."""),
            ("How to check any claim like mine",
             """Ask for something inspectable without trust: live software, public source, a
             build you can run. Mine is at
             <a href="https://aaronsteele.vercel.app/linehaul/">the reference build</a>;
             anyone who cannot show equivalent is asking you to buy on charm."""),
        ]),
    dict(slug="ai-built-app-broken", cluster="ai",
        q="We built an app with AI and it almost works. Now what?",
        direct="""You are in the most common new rescue category, and it is usually saveable.
        <b>AI-built systems fail in patterns</b>: security open beside one working login,
        tests that cannot fail, documentation for things that do not exist. A structured read
        finds them fast.""",
        body=[
            ("Why it almost works",
             """AI optimises for looking done: screens render, the happy path happens, the
             notes glow. The gaps hide in what nobody asked it to prove: the second user, the
             bad input, the refund, the login nobody retired. On one live platform I proved
             six such gaps by using them, including logging into someone else's account."""),
            ("The triage",
             """Secure your accounts first, then a structured read of what is actually there
             versus claimed, then a short list: what is sound, what needs repair, what needs
             replacing, priced. Often more survives than you fear; occasionally the honest
             answer is a rebuild that reuses the lessons rather than the code."""),
            ("The lesson for round two",
             """The tool was never the problem; the missing specification and adversarial
             checking were. Keep building with AI, run it properly this time, per
             <a href="/ai-development/">AI development</a> and
             <a href="/project-rescue/">rescues</a>."""),
        ]),
    dict(slug="what-is-an-ai-agent", cluster="ai",
        q="What is an AI agent, in business terms?",
        direct="""An AI that can act, not just chat: it reads and writes your actual systems,
        so instead of describing how to research a lead it researches the lead and files the
        result in your CRM. <b>The difference between a chatbot and an agent is hands.</b>""",
        body=[
            ("A concrete example you can poke",
             """My agent Doorknock, live and free, researches a company from its own website,
             scores it against your rules, and files the lot in HubSpot before a salesperson
             rings. That loop, understand, decide, act in a real system, is what "agent"
             means when it is not marketing."""),
            ("What they are good for now",
             """The high-volume, judgement-light work between your systems: research and
             enrichment, drafting from your real records, monitoring for exceptions, keeping
             data tidy as it arrives. Wired to accounting, field service, a warehouse,
             anything with an API."""),
            ("The guardrails that matter",
             """Agents act, so scope what they may touch, log what they do, and keep humans on
             anything irreversible. Mine never improvise policy and never sign anything; per
             <a href="/ai-development/">AI development</a>, the boring guardrails are the
             product."""),
        ]),
    dict(slug="ai-automation-cost", cluster="ai",
        q="What does AI automation cost for a small business?",
        direct="""Published Australian figures put typical builds in the low thousands to low
        tens of thousands with modest monthly running costs, and my experience matches: the
        right first automation is usually a four-figure project. <b>The bigger truth is what
        changed: scope that once needed a team now fits a small business budget.</b>""",
        body=[
            ("What drives it",
             """How many systems must be wired together, how messy their data is, how
             exception-heavy the process is, and how much of the workflow needs human
             approval steps designed in. Running costs are mostly the AI usage itself, which
             for document-and-message workloads is genuinely cheap."""),
            ("Where the money comes back",
             """Hours: the report that took a Friday, the research that took an evening, the
             retyping between systems. A single automated workflow that saves a few staff
             hours weekly pays for a four-figure build inside months, and the arithmetic gets
             shown to you before anything is built."""),
            ("How to start without regret",
             """One workflow, measured before and after, fixed quote, per
             <a href="/answers/what-should-we-automate-first/">what to automate first</a>.
             Distrust anyone whose first proposal is a platform."""),
        ]),
    dict(slug="where-ai-saves-money", cluster="ai",
        q="Where does AI actually save a business money?",
        direct="""In the repetitive judgement-light work your team does between the real work:
        drafting, summarising, retyping, researching, chasing. <b>It does not save money as a
        strategy on a slide; it saves money as specific workflows</b>, each measured.""",
        body=[
            ("The reliable wins",
             """First drafts of anything written from your own data; research and enrichment
             before human contact; classification and routing of inbound anything; report
             assembly; data tidying at the point of entry. Common thread: high volume, clear
             inputs, a human review where it matters."""),
            ("The mirages",
             """Replacing judgement, automating a process that is broken (you get faster
             mistakes), and chat interfaces bolted on because 2026. If a vendor cannot name
             the hours saved and where they go, it is a mirage with a subscription fee."""),
            ("The honest map",
             """Eleven years of analysing operations means I will tell you which of your
             workflows repay automation tenfold and which are cheaper left alone, per
             <a href="/ai-development/">AI development</a>. Sometimes the most valuable
             deliverable is the list of things not to do."""),
        ]),
    dict(slug="is-my-data-safe-with-ai", cluster="ai",
        q="Is our data safe if we use AI tools?",
        direct="""It can be, if it is treated as architecture rather than a checkbox: business
        AI platforms offer contractual controls the free consumer tools do not. <b>The real
        risks are staff pasting client data into free chatbots, and vendors vague about
        training.</b> Both are manageable, deliberately.""",
        body=[
            ("The actual risk ranking",
             """Untracked staff use of consumer tools ranks first by a distance; then vendors
             whose terms let them train on your data; then ordinary security sloppiness that
             has nothing to do with AI. Note what is absent: properly configured business AI
             APIs, which process data under contract without training on it."""),
            ("The setup that holds",
             """Business-tier AI services with training disabled, data staying in your
             tenancy and region where it matters, least-required access, logs of what
             automated steps did, and a one-page staff policy that names an approved tool so
             the shadow use stops. This is a fortnight of discipline, not a transformation
             program."""),
            ("What you should demand of any builder",
             """The data-handling design in writing, in the scope, before work starts. Mine
             always includes it, per <a href="/ai-development/">AI development</a>; a builder
             who improvises here will improvise everywhere."""),
        ]),
    dict(slug="ai-chatbot-worth-it", cluster="ai",
        q="Is an AI chatbot worth it for a small business?",
        direct="""Worth it when it is wired to your real information and allowed to say "I'll
        get a human": it answers the questions that fill your inbox at 10pm. <b>Worthless and
        occasionally harmful when it improvises</b>, because a bot that invents your refund
        policy costs more than it saves.""",
        body=[
            ("The version that works",
             """Grounded in your actual prices, availability, policies and documents; honest
             about uncertainty; escalating anything delicate to a person with the conversation
             attached. On those terms it genuinely deflects the repetitive majority and
             captures the after-hours lead."""),
            ("The version to refuse",
             """A generic widget pointed at your homepage, improvising answers in a
             confident tone. The failure mode is not "unhelpful"; it is a customer holding a
             screenshot of a policy you never had."""),
            ("The economics",
             """Count the repetitive questions per week and what interrupting a human for
             each costs. Past a handful a day the grounded version pays quickly; below that,
             a better FAQ page is the honest recommendation, and I make it, per
             <a href="/ai-development/">AI development</a>."""),
        ]),
]
