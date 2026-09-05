# 4. Build

The main event. Two tracks, one choice, and then the method: you are
not going to "learn web development"; you are going to direct an AI
assistant that already knows it, using the same working method I use,
adapted for someone who does not code. Read 4.1 and 4.2, pick your
track, then work the loop in 4.4 with the prompt pack in 4.5.

## 4.1 Track A or Track B, honestly

**Track A: WordPress.** The world's default website platform. You get
an admin screen, themes, plugins, and the ability for any future
developer, marketer or VA on earth to work on your site, because
everyone knows WordPress.

- Choose it if: you will edit content regularly yourself, you expect
  the site to grow features (bookings, a store, member areas), or you
  want the option of handing it to someone local later.
- Costs: managed hosting from document 3 (typically $10 to $30 a
  month). Avoid page-builder subscriptions stacked on plugin
  subscriptions; the kit's method needs none of them.
- The honest downsides: more moving parts, needs the small maintenance
  habit in document 6, and bad hosting or plugin hoarding makes it
  slow. All manageable; all named again where they matter.

**Track B: an AI-built static site.** Your AI assistant writes the
site's files directly (simple, fast web pages with no admin system),
and you host them on a static platform, often free.

- Choose it if: your site is the five pages from document 2, content
  changes a few times a year not a week, and you like the idea of the
  fastest, most secure, cheapest-to-run version of a website.
- Costs: often $0 hosting plus your AI subscription. Genuinely.
- The honest downsides: every content change goes through the AI-and-
  republish loop rather than an admin screen (fine for a stable
  brochure site, tiresome for weekly specials), and future helpers
  need to be comfortable with the same loop. If you outgrow it, the
  words and photos all port to WordPress; the effort is not wasted.

**The tiebreaker:** if you are unsure, and your one job from document 2
is "be findable and credible", take Track B; it is simpler and cheaper
and does that job perfectly. If your one-pager mentions bookings,
products, or "and later we want it to...", take Track A.

## 4.2 Set up your workbench

Whichever track: you need an AI assistant with a paid tier (the free
tiers run out mid-project at the worst moment). Any of the major
assistants works with this method; I use Claude in my own practice,
including for the site this kit is sold from, and the prompts are
written in that style but are not exclusive to it. Two rules for the
whole project:

1. **One project, one conversation thread per work session**, and you
   start each session by pasting your one-pager (document 2) plus the
   handover note from your last session (the prompt pack has a prompt
   that writes it). AI assistants do not remember you between
   conversations; the one-pager is their memory.
2. **You are the director, not the technician.** You never need to
   understand the files. You need to describe what you want, look at
   the result in your browser, and say what is wrong in plain words.
   That is the entire skill, and you already have it from every trade
   you have ever supervised.

## 4.3 The tracks, step by step

**Track A (WordPress), the shape of the build:**

1. Sign up for managed WordPress hosting (document 3), which installs
   WordPress for you and connects your domain (their support docs, or
   your AI assistant, walk you through the two settings involved).
2. Choose a **free, recent, block-based theme** from the official theme
   directory: ask your assistant for current candidates matching your
   one-pager, and pick the one whose demo looks closest to what you
   want. Do not buy a theme yet; the money buys complexity you do not
   need.
3. Build the five pages with the block editor (WordPress's built-in
   drag-and-drop): for each page, use the drafting prompts in 4.5 to
   get the words, then paste them in section by section. When the
   editor confuses you, screenshot it and ask your assistant what to
   click; this works far better than it has any right to.
4. Plugins: install only what the one-pager demands (a contact form; a
   backup plugin if your host does not do backups; an SEO helper).
   Ask your assistant for the current standard choice for each, one
   plugin per job, delete anything you stop using. Plugin count is a
   speed and security budget: under ten, ideally under six.

**Track B (AI-built), the shape of the build:**

1. Open your assistant, paste the one-pager, and use the Track B build
   prompt from 4.5. Ask for one complete page first (the home page),
   not the whole site: you will iterate on look and voice on one page,
   then have it apply the agreed style to the rest.
2. View the result: assistants with preview features show the page
   directly; otherwise it gives you a file you open in your browser.
   React in plain words ("too corporate", "the phone number should be
   huge", "more space, less navy") and iterate until the home page is
   right. This loop is the whole method.
3. Have it build the remaining pages in the agreed style, then the
   connective tissue (menu, footer with your details, the contact
   form; static hosts have simple form handling, and the prompt pack
   makes your assistant wire it up and explain what it did).
4. Publish: create the account at a static hosting platform (ask the
   assistant for the current mainstream choices and the exact clicks),
   connect your domain, upload. First publish takes an hour of
   following instructions; every later update is minutes.

## 4.4 The working loop that keeps you out of trouble

This is my actual delivery method, scaled down, and it is what makes
AI-assisted building work rather than spiral:

1. **Say what, not how.** Describe outcomes ("visitors should see the
   service area before scrolling") and let the assistant choose the
   how. The moment you start dictating technical means you are wrong
   in ways you cannot see.
2. **One change at a time, look every time.** Ask for a change, look
   at the page in your browser, then ask for the next. Batch requests
   produce batch confusion.
3. **Verify like a sceptic, not a fan.** After every session run the
   check prompt (4.5): phone the phone number, send the form to
   yourself, open the site on your actual phone, click every link.
   The assistant is confident and mostly right; "mostly" is why you
   look.
4. **Save your state.** End every session with the handover prompt
   (4.5), and keep every version: Track A hosts keep backups (check
   the register); Track B, keep a dated copy of the files each time
   you publish. Being able to go back one step converts every mistake
   from a crisis into an undo.
5. **When stuck, escalate the description, not the panic.** Tell the
   assistant exactly what you see (paste the error, screenshot the
   screen), what you expected, and what you last changed. That
   sentence pattern resolves most "it's broken" moments in one round.

## 4.5 The prompt pack

Copy, fill the brackets, paste. These are deliberately wordy; detail in
equals quality out.

**The kickoff (both tracks, first session):**
> You are helping me, a non-technical business owner, build my
> website. Here is my one-page specification: [paste it]. Ask me up to
> five questions that would most change how you'd build this, one at a
> time, waiting for each answer. Then give me a plan for our first
> session in plain words. Do not write any code or content until I say
> the plan is right.

**Drafting page content (both tracks):**
> Write the [home/about/services] page for [business] based on my
> specification. Rules: Australian English; short sentences; my
> customers' words, not industry jargon; no cliches like "solutions"
> or "passionate"; every claim must come from facts I have given you,
> and where you need a fact you do not have, put [ASK: question] in
> the text instead of inventing one. Draft it, then list every [ASK]
> for me to answer.

**The Track B build prompt (first page):**
> Build my home page as a single complete HTML file I can open in my
> browser. Design brief: [three adjectives, e.g. "clean, warm,
> tradie-not-corporate"], works properly on phones (most of my
> visitors), loads fast, no frameworks or external services, my
> contact details obvious without scrolling. Use the content we
> drafted. Then tell me, in one plain paragraph, how to view it.

**The change request (both tracks, use constantly):**
> On the [page], I want [outcome, in customer terms]. What I see now:
> [describe or screenshot]. Make the smallest change that achieves it
> and tell me in one sentence what you changed.

**The sceptic's check (end of each session):**
> List everything on this site that could embarrass me in front of a
> customer: broken links, placeholder text left in, claims we never
> verified, missing contact details, anything that will not work on a
> phone. Be adversarial; you are reviewing, not defending. Give me
> the list ordered by how bad it would be.

**The handover note (end of each session):**
> Write a half-page handover note for the next session: what we built
> today, decisions we made and why, what is unfinished, and what to do
> first next time. Write it so a fresh conversation with none of this
> context can continue the work.

**The explainer (whenever you feel lost):**
> Explain what [thing] is and why it matters for my site, in five
> sentences, assuming I run a business and have never built a
> website. Then tell me the one decision I actually need to make
> about it, and what you would pick and why.
