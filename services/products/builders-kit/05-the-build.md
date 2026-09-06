# 6. The build

Component by component. Each section is one or two increments of the
document-2 loop: the instruction pattern to give Claude Code, what
good looks like, and the verification step before you commit and
move on. Rungs 1 and 2 from the architecture ladder are assumed;
higher rungs use exactly the same sequence with more increments.

Before the first component: scaffolding files written (document 4),
project folder git-initialised, and one instruction given: "Read
CLAUDE.md, SPEC.md and DESIGN.md. Confirm what we're building in
three sentences so I can check you've understood." Fix any
misunderstanding now, in the files.

## 6.1 Increment zero: the skeleton and the preview

Instruction shape: "Create the project skeleton per SPEC.md: the
pages as empty shells with real titles, one shared stylesheet
implementing DESIGN.md's tokens, the folder structure from our
architecture decision. Then tell me how to preview it locally, and
add that command to CLAUDE.md."

Verify: the preview command works (typically a one-line local
server); every page exists and is reachable; view-source shows
clean, comprehensible HTML. Commit: "skeleton".

Why shells first: every later increment lands in a working, viewable
site, which keeps the verification habit cheap from hour one.

## 6.2 Layout, navigation, footer

One increment: the shared frame every page sits in. Header with the
name and navigation, footer with the real business details, both
implemented once and included everywhere (the derive-don't-duplicate
rule; make the AI set up whatever include or generation mechanism
the rung supports rather than pasting the header five times).

Verify at two widths, every time, forever: a desktop window and a
phone-sized one (browser dev tools, responsive mode, 390px). The
navigation must work with a thumb. Nothing scrolls horizontally.
This two-width check is the single most repeated verification in
the kit because layout regressions are the most common AI slip.

## 6.3 Pages and content

One increment per page. The content rule from CLAUDE.md does the
heavy lifting: the AI drafts structure and phrasing from facts you
supply, marks every missing fact `[ASK:]`, and invents nothing. You
answer the ASKs, read the page aloud, and cut anything you would
not say to a customer.

Two patterns worth their weight: give the AI a voice sample ("here
are three paragraphs I wrote; match this register") rather than
adjectives about tone; and for any page type that repeats
(services, projects, team), have the first one perfected, then
instruct "build the others to the same pattern from this data",
supplying the data as a list. Consistency by construction.

Verify: read aloud; two widths; no ASK markers left; links clicked.

## 6.4 The form and its function

The classic rung-2 increment and the kit's worked example of
server-side thinking. Instruction shape: "Build the contact form
per SPEC.md: name, email, message. Submissions go to a serverless
function in api/ that emails me via [the transactional email service
you chose in document 7] and returns success or a helpful error.
The form must handle: empty fields, invalid email, the service
being down (tell the user to email directly, show the address), and
double submission. No silent failures anywhere."

That instruction is long because the spec-thinking is the product:
every clause is a state a real user will hit in month one.

Verify like a hostile user: submit empty, submit garbage, submit
properly and receive the actual email, disable the network and
submit, mash the button twice. Then the adversarial prompt: "What
did we not handle? What would a spam bot do to this form?" (The
answer funds document 8's spam section.) Commit only when every
state behaves.

## 6.5 Search visibility and sharing

One increment, mechanical but real: every page gets a title that
says what-and-where in plain words, a meta description written like
the search-result ad it is, canonical URLs, an Open Graph image so
shared links look deliberate, and structured data where it is
honest (your organisation, your FAQs if genuinely FAQs). Sitemap
and robots files generated and kept current by the same mechanism
that builds pages.

Instruction shape: "Do a search-and-sharing pass per this list;
show me each page's title and description as a table first for my
edit before writing them in." The table-first step matters: titles
are marketing decisions, not technical ones.

Verify: paste a page URL into a link-preview checker (or a chat to
yourself) and see the card; validate the structured data with the
AI ("fetch and parse the JSON-LD on each page; any errors?").

## 6.6 Performance and polish

One increment near the end, not twenty sprinkled through: run
Lighthouse (built into Chrome's dev tools) on the key pages, hand
the AI the report ("here are the Lighthouse findings; fix what is
real, tell me which findings are not worth chasing and why"), and
apply the classics it will find: properly sized and compressed
images (the usual villain), fonts loaded sanely, nothing blocking
first paint. The spec's "done means" performance number gets
checked here, honestly.

Also in this pass: the 404 page (a helpful one, pointing home), the
favicon, and printing one page to PDF to catch the truly weird.

## 6.7 The pre-ship review

The final increment before document 7 makes it public: the full
adversarial sweep. "Act as three hostile reviewers in turn: a
customer on a cheap phone on bad reception; a competitor looking
for something to mock; a burglar looking for anything exploitable
(forms, exposed keys, admin surfaces). List everything, ranked by
embarrassment." Fix what is real. Then the human pass: the checkable
statements in SPEC.md's "done means", one by one, ticked with your
own hands.

That ritual, spec statements verified plus adversarial sweep, is
what "done" means in this method, for this project and every one
after it.
