---
description: Run the next batch of raw licensing ideas through the kill checks and scoring
---

Work the licensing idea pipeline in `licensing/pipeline/`. Read
`licensing/pipeline/README.md` and `licensing/README.md` first for the
stages, kill rules and scoring.

Batch size: $ARGUMENTS (default 8).

1. **Top up, problem first.** If fewer than 10 entries are at stage
   `raw`, add new ones. Each must be a problem, not a solution, and
   must name what changed (with a date), the new weakness, the evidence
   and who profits, as set out under "Where new ideas come from" in the
   pipeline README. Never add an idea by applying a favourite mechanism
   to a new product.
2. **Screen.** Take the next batch of `raw` ideas. For each, search the
   web for an existing product, then for patents, and read the claims of
   the closest patents before scoring. Apply the kill rules and the
   "Rules learned the hard way" in the pipeline README.
   Move each to `killed` with a one-line `reason` naming the product or
   patent number, or to `screened` with a `note` of what was found.
3. **Size.** For each idea at `screened`, score the seven questions,
   estimate odds and the modest and strong deal in A$ a year with the
   reasoning, and list at least five companies that could license it.
   If it passes, write its file in `licensing/` in the same shape as the
   existing product files and move it to `sized`. If it fails, move it to
   `shelved` with the reason.
4. **Rebuild.** Run `python3 licensing/pipeline/pipeline.py`.
5. **Report** in plain language: how many were killed and why, which
   survived, and the one or two worth a bench test. Say which checks were
   web searches only. Commit and push.

Never mark an idea as clear of patents on the strength of a web search
alone: say "no blocking patent found". Never recommend paying for a
patent outside the money rules in the pipeline README.
