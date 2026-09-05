# The Builder's Kit: source

Master source for the professional tier (annual licence). The customer
files are the nine numbered markdown documents; this README is for
Aaron and does not ship.

## Packaging

From `services/products/`:

```bash
python3 build.py builders-kit
```

Produces `dist/`: nine per-document PDFs, `builders-kit-complete.pdf`,
and `builders-kit.zip` (PDFs plus markdown). Ship the zip through the
merchant-of-record platform. `dist/` stays out of git.

## The annual model, operationally

The licence promise in document 00 creates a real obligation: at least
one re-issue per licence year, ideally two, updating whatever drifted.
Track drift where it concentrates:

- **Document 02 (workbench):** Claude Code install mechanics, plan
  tiers and pricing, Node LTS. Fastest-moving; check every re-issue.
- **Document 06 (hosting):** platform names, free-tier boundaries,
  DNS dashboard realities.
- **Document 07 (security):** the ranked threats hold for years; the
  named tool categories less so.
- Documents 01, 03, 04, 05, 08 are method and judgement; they drift
  slowly and edits there should be improvements, not chases.

Re-issue mechanics: edit the source, rebuild, upload the new zip to
the same product, email licence holders that an update exists (the
platform handles re-download). Date each edition in 00's title line
when re-issuing.

Renewal honesty, printed in 00 and non-negotiable: lapsed buyers keep
every file they downloaded; renewal buys the year's currency. Never
add licence keys, phone-home checks or expiring links to the
documents themselves.

## Register

Same voice as the site. The buyer is technical-curious, not
credentialed: comfortable in or willing to learn a terminal. Nothing
held back is the tier's defining promise; if an edit ever hides
something to protect the services, the product is broken.
