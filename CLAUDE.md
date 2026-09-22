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

The portfolio site and the pipeline share nothing except
`public/fonts/satoshi-var.woff2`, which the pipeline ships converted to
TTF for captions.
