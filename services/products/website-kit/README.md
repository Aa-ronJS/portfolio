# The Website Kit: source

This directory is the master source for the flagship DIY product. The
customer files are the six numbered markdown documents; this README is
for Aaron, not buyers, and does not ship.

## Packaging

One command turns the source into the deliverables (run from this
directory; needs python3 with the `markdown` package and a Chromium,
`CHROMIUM=/path/to/chromium` if it is not at the default):

```bash
cd .. && python3 build.py website-kit
```

That produces `dist/`: six per-document PDFs, the combined
`website-kit-complete.pdf`, and `website-kit.zip` (PDFs plus the
markdown, so buyers get both). Ship the zip through the
merchant-of-record platform's file delivery. `dist/` stays out of git;
rebuild it whenever the source changes.

## Before selling, every time the kit changes

- Read 03 (the build tracks) against current reality: hosting products,
  AI tool names and prices drift fastest. The kit names categories with
  examples on purpose; verify the examples still exist and still fit.
- Prices quoted for third-party services (hosting, domains) are marked
  "typically" and were true when written; sanity-check them yearly.
- The support boundary and refund terms in 00 must match what the
  checkout platform's page says. One story everywhere, same as the
  site.

## Register

Same voice as the site: plain words, honest costs, no held-back steps,
"when to stop DIYing" stated without drama. The buyer is a competent
motivated owner with no technical background; nothing assumes prior
knowledge, and nothing talks down.
