# portfolio — repo map for Claude sessions

Three independent things live here:

- **`public/`** — Aaron's portfolio site (one HTML file, no build step),
  deployed to https://aaronsteele.vercel.app via `npx vercel deploy
  --prod`. Design rationale in `PREFLIGHT.md`; read it before touching
  the page.
- **`animation-pipeline/`** — production toolchain for crude hand-drawn
  animated shorts (write → draw → record voice → render 9:16 mp4,
  including a voice-directed mode where spoken stage directions stage
  the shots). Start with `animation-pipeline/CLAUDE.md`, then its
  `README.md`. Environment setup: `animation-pipeline/setup.sh`.

- **Chasem** — a quoting and chasing app for Australian house painters,
  live at https://chasem.app. Three directories: `chasem-app/` is the
  phone app itself (vanilla ES5, no build step, `npm test` runs ~35
  browser suites); `chasem-landing/` is the site and the serverless
  relay it talks to, deployed with `npx vercel deploy --prod`, with its
  own `npm test` against pglite; `chasem-pack/` is the older
  downloadable pack and the launch notes. Start with
  `chasem-landing/README.md`. The app is called **Chasem** — the earlier
  name "Quote and Chase" is gone and should not come back.
  `chasem-landing/public/app/` is a byte-for-byte copy of `chasem-app/`;
  keep them identical and bump `sw.js`'s VERSION when you change one.

  **Two rules that outrank everything else in Chasem:**

  1. **A painter who is not good with phones must succeed alone.** No
     jargon, no manual, no paragraph explaining a button. The screen
     shows; it does not tell. If a step can be wrong, make the wrong
     version impossible rather than warning about it. Every dead end
     needs a way out that a person can find without being told.
  2. **It must not break.** He is on a ladder, on 1 bar of signal, with a
     cracked screen and a full phone. Every write survives a lost tab,
     every send survives a lost connection, every screen survives bad or
     missing data, and nothing is ever lost because something failed.
     Prefer an ugly recovery to a clean failure.

  Both are load-bearing: a change that makes either worse is a
  regression even if it ships a feature.

  **Pictures over words, where a painter already knows the picture.**
  Icons come from `chasem-app/pics.js` (inline SVG, offline) as a
  picture over a one-word caption; an action with consequences never
  goes out as a bare icon, and every icon button carries its full name
  in `aria-label`. Colour follows a traffic light: green done, yellow
  in hand, red when money is overdue. If `pics.js` fails to load,
  every button must still work with its word
  (`tests/apptest/pics.cjs`).

The portfolio site and the pipeline share nothing except
`public/fonts/satoshi-var.woff2`, which the pipeline ships converted to
TTF for captions.
