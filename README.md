# Portfolio

The source of https://aaronsteele.vercel.app, a single self-contained page.

`PREFLIGHT.md` holds the design pre-flight the page was built against, answered
in writing before any markup, per the design playbook this repository's author
works to. It names the audience, the register, the one reference site and the
one move taken from it, the accent seed, the type pairing, the signature detail,
the colour mode and the one visual moment plus its degraded tier.

## What is on the page

Two live MCP servers with their repositories and endpoints, a HubSpot
implementation described generically because the client is not named, two
adversarial security reviews, and the business and solution analysis track
record behind all of it.

## The one moving element

A status line under the masthead calls both servers' `tools/list` from the
reader's own browser, so "these are live" is not something they have to take
from the page. Both endpoints send `Access-Control-Allow-Origin: *`.

The static text in the HTML is the designed fallback and reads correctly on its
own if the fetch never runs. If a call fails, the label says the check did not
run from this browser, which is what actually happened, rather than claiming the
server is down.

## Build

There is no build. One HTML file, two self-hosted fonts, no dependencies, no
external requests except the two status calls above.

```bash
npx vercel deploy --prod
```

## Checking the layout

The page was verified in a browser at 360px, 414px and 768px for page-level
horizontal overflow, in both colour schemes, and against the target-size and
typography numbers in the playbook. Two real defects were found and fixed that
way: a CSS grid child's default `min-width: auto` let a table escape its own
scroll container and push the page sideways on a phone, and the contents
navigation and footer links were 22px tall against a 24px minimum.
