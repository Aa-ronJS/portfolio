# Pre-flight, answered before any markup

Per `~\.claude-personal\design-repo\DESIGN.md` section 1. Two pages are covered:
the portfolio hub (the deliverable) and Doorknock's project page (a sibling of
the Rain Check page, which already exists and sets that family's look).

---

## A. The portfolio hub

**1. Who is the audience, and on what device?**
Two named readers, and the page has to serve both in one pass.

- The studio owner from the first advertisement: one person in Australia
  building custom AI systems for small and medium businesses. Reading on a
  laptop between client calls, sceptical by stated policy ("no portfolio link,
  no reply"), and looking for one specific thing, a live MCP server he can
  connect to while he reads. He will spend thirty seconds deciding whether to
  spend ten minutes.
- A recruiter at an agency filling a HubSpot and go-to-market engineering role,
  and behind them a Head of Sales who will be shown the link. Very likely on a
  phone. Wants to know how many years of HubSpot, and what has actually been
  built rather than experimented with.

So: the narrow layout is the base, not an afterthought; the two live endpoints
are above the fold; and the HubSpot answer is reachable without scrolling past
four projects first.

**2. What register?**
Utilitarian-dense, edged towards editorial-warm. This is an evidence document.
The reader's real question is "is any of this true", so the page is built as a
record with references rather than as a landing page with claims. Explicitly not
product-confident: a marketing voice from someone applying for work reads as
overselling, and both advertisements ask for proof rather than persuasion.

**3. Which ONE reference site am I stealing from, and which one move?**
Stripe's API documentation, and the move is its **two-column reference layout**:
the explanation on the left, the checkable artefact (a request, a URL, a
command) held in a column on the right at the same vertical position, so a claim
and its evidence sit on one line of sight. That is the exact structure this
content wants, because every claim on this page has something you can open.

**4. What is the one accent colour?**
`--brand-h: 42`, `--brand-c: 0.115`. A dark amber, used as an annotation colour:
rules, index numbers, the verification rail, links. The reason for this audience:
the page argues that everything on it can be checked, and the visual language of
checking is a warm ink annotation on paper, not a brand colour. It also stays
clear of the blue-to-indigo developer-portfolio default, and clear of the teal
used in unrelated work, so nothing here reads as anybody's corporate palette.
Status colours (green, amber, red on the live-status line) sit outside the
one-accent budget as functional signals, always with a text label.

**5. What is the type pairing?**
Menu item 3, adapted, with the adaptation argued. **Newsreader** (optical size
axis) carries display and body; **IBM Plex Mono** carries labels, URLs, numbers,
index marks and the whole verification rail. Space Grotesk is deliberately not
used for headings even though the menu pairs it here: this audience is the one
where that tell reads loudest. Newsreader doing both display and reading duty is
the deviation, and it is right because the page's identity is "a document with
references", and a second display face would fight the mono counter-voice.
Both are self-hosted with a size-adjusted fallback.

**6. What is the signature detail?**
**The verification rail.** Every system and every hard claim carries a
right-hand monospace block holding the exact URL or command that checks it,
joined to its claim by a hairline rule and marked with a two-digit index. A
stranger could screenshot one row and identify the page. It is also the whole
argument made visible: the design is "here is the receipt", not a decoration
around the words.

**7. Light or dark, and why?**
Light, on a warm paper ground, committed. This is a document about what is
true, and print heritage suits that. A dark developer portfolio is the single
most common tell in the measured data (34% of audited pages), and would say
"generated" to precisely the reader who matters here. A dark palette is built
properly and separately, as its own scale rather than an inversion, because the
viewer's preference is theirs to hold; light is what the design is.

**8. What is the visual moment, and what is its degraded tier?**
One moment: **a live status line under the masthead that actually calls the two
servers' health endpoints from the reader's own browser.** It is the only
element on the page that moves, and it earns its place because it is not
decoration: it is the page proving its central claim in front of the reader,
using their network rather than my word. Both endpoints send
`Access-Control-Allow-Origin: *`, so it works from any origin.

Degraded tier, designed first: the line ships in the HTML as static monospace
text reading "not checked from this browser yet", with the endpoint URL printed
beside it. If the fetch never runs (no JavaScript, blocked, offline) that
sentence is what stays, and it is honest and complete on its own. Nothing on the
page depends on the fetch for meaning. Under `prefers-reduced-motion` the status
appears without the fade.

No imagery, deliberately (source 4 in section 2.8). There is no honest
photograph of any of this work, and an atmospheric generated image would be
decoration on a page whose entire claim is that nothing here is decoration.

---

## B. The Doorknock project page

Sibling of the existing Rain Check page, so it joins that family rather than
starting a new one.

1. **Audience and device.** The same studio owner and go-to-market recruiter,
   arriving from the hub, plus anyone who lands on the deployment directly and
   needs to know what it is and how to connect. Laptop first, phone supported.
2. **Register.** Utilitarian-dense. It is a tool's front page.
3. **Reference and move.** The Rain Check page in this same repository family,
   and the move is its ledger structure: a run of hairline-separated rows, each
   a tool with its purpose and its refusals stated together.
4. **Accent.** `--brand-h: 150`, `--brand-c: 0.10`, a deep green, which is the
   Rain Check family's construction with a different hue seed so the two pages
   read as siblings and not as copies. Green because the page's subject is a
   qualification verdict, and the tier language is already green, amber and red.
5. **Type pairing.** Fraunces (opsz 144 at display) over IBM Plex Sans, with
   Plex Mono for the endpoints and the tool table. This is the Rain Check
   pairing, held deliberately so the family is legible.
6. **Signature detail.** The refusals column: every tool row states what the
   tool will not do beside what it does, in mono, which is unusual enough to
   identify the page and is the honest thing to publish.
7. **Light or dark.** Light on warm paper, matching the family, with a proper
   dark scale built separately.
8. **Visual moment.** One: the live tool list, fetched from `/mcp` at load, so
   the page's list of tools comes from the running server rather than from me
   typing it. Degraded tier: the seven tools are written into the HTML as the
   static table, correct on its own, and the fetch only marks them confirmed.

---

## Standing local rules applied to both

- No employer name and no email address anywhere on either page.
- No em dashes, no en dashes, British English throughout.
- Every number, name and claim traces to `_CV fact base.md`, to a running
  system checked on the day, or it does not appear.
- No invented client names, no invented testimonials, no invented metrics. The
  client work that cannot be named is described generically and said to be so.
