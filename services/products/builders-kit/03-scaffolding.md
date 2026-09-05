# 4. The scaffolding

The specially written .md files. This document is the kit's centre
of gravity: four plain-text files that live in your project folder
and turn an amnesiac genius into a reliable colleague. Claude Code
reads CLAUDE.md automatically every session; the others you point it
at ("read SPEC.md before we start") until it becomes reflex. Write
them before the first component and maintain them like code, because
they are code: they program the programmer.

Copy the templates verbatim, then edit every bracketed line. An
unedited template is worse than none; the AI can tell boilerplate
from intent.

## 4.1 CLAUDE.md: the standing orders

What it is: the rules that apply to every session, every increment,
forever. Short enough to be obeyed; anything over a page is being
skimmed, by humans and AIs alike.

```markdown
# CLAUDE.md

## What this project is
[One paragraph: what this site/app is, who uses it, the one job it
must do. Point at SPEC.md for detail.]

## Standing rules
- Read SPEC.md before significant work; if a change contradicts it,
  say so instead of quietly complying.
- Work in small increments. After each, stop so I can verify before
  continuing.
- Never invent facts, prices, testimonials or claims for page
  content. Where a fact is needed and missing, write [ASK: question]
  and list them at the end.
- Match the existing style of the code and content already here.
- No new dependencies, services, or paid tools without asking first.
- After building anything, review it adversarially yourself before
  presenting it: broken states, phone width, empty inputs, slow
  connections.

## House style
- [Language: e.g. Australian English, plain words, no marketing
  cliches.]
- [Visual rules you care about: e.g. system fonts, no stock photos,
  colours from DESIGN.md.]
- [Anything you never want: e.g. no em dashes, no exclamation
  marks, no "delve".]

## Commands
- Preview locally: [filled in during document 6, e.g. how to serve
  the folder]
- Deploy: [filled in during document 7]
```

## 4.2 SPEC.md: what we are building

What it is: the contract between you and the crew, in checkable
statements. The discipline from document 2, materialised. Update it
whenever reality changes; the spec being current matters more than
the spec being complete.

```markdown
# SPEC.md

## Purpose
[The one job. "This site exists so that X kind of person does Y."]

## Users
[Who arrives, on what device, knowing what, wanting what. Two or
three honest sentences beat personas.]

## Pages / features
[One line each, with its job. e.g.
- / : who we are, the one action (call). Must load fast on a phone.
- /services/ : the three services in customer words.
- /contact/ : form (name, email, message) delivering to
  hello@domain; success and failure states both designed.]

## Must never
[The negative space; it prevents the worst surprises. e.g.
- No tracking scripts or cookie banners; we collect nothing.
- No content invented by AI: every claim traces to me.
- Nothing that requires a database or user accounts (v1).]

## Done means
[Checkable statements, each testable in under a minute. e.g.
- Form submission arrives at the real inbox and a wrong email shows
  a helpful error.
- Every page renders without horizontal scrolling at 390px wide.
- Lighthouse performance 90+ on the home page.
- All content proofread by me, no [ASK:] markers remaining.]
```

## 4.3 DESIGN.md: taste, written down

What it is: the file that stops the site drifting into AI-flavoured
mush, one decision at a time. AI output has a default aesthetic; the
only defence is your documented one. Small file, enormous return.

```markdown
# DESIGN.md

## Feel
[Three adjectives and an anti-adjective. e.g. "Warm, blunt,
craftsmanlike. Not corporate."]

## Type
[One heading font, one body font (system stacks are fine), base
size, and a scale rule. e.g. "Body 16px minimum; headings large and
tight."]

## Colour
[Background, text, one accent, as hex codes. The accent is used
sparingly: links, buttons, nothing else.]

## Layout
[Max content width; spacing rhythm; phone-first. e.g. "65ch text
measure; generous whitespace; every page checked at 390px before
desktop."]

## References
[Two or three sites whose look you trust, and one sentence each on
what to steal: never the content, always the restraint.]
```

## 4.4 DECISIONS.md: the log that ends re-litigation

What it is: an append-only list of choices made and why. Ten
seconds per entry. Its value compounds: it stops the AI (and future
you) from helpfully reopening settled questions, and it is the file
that makes the project handoverable to any human professional later,
which document 9 will remind you about.

```markdown
# DECISIONS.md
- 2026-09-14: Static site, no framework. Five pages, no dynamic
  data; revisit only if we add a store.
- 2026-09-15: Forms via [service]; free tier is fine under 100
  submissions/month.
- 2026-09-18: Dropped the blog from v1. One good page beats a stale
  feed.
```

## 4.5 Working with the scaffolding

- Session start: `claude`, then "Read SPEC.md and DECISIONS.md.
  Today we are doing [increment]. Tell me your plan first."
- When output fights you twice on the same point, the fix belongs in
  a file, not in a third chat correction: that is the "say it twice,
  file it" rule.
- When the AI does something surprising but right, that is a missing
  decision entry; log it.
- Review the scaffolding monthly the way document 9 reviews the
  site: five minutes, is this still true.

These four files are also the single biggest thing separating this
kit from every "1000 AI prompts" product on the internet: prompts
are what you say; scaffolding is what stays said.
