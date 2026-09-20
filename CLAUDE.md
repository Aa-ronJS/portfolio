# portfolio — repo map for Claude sessions

Two independent things live here:

- **`public/`** — Aaron's portfolio site (one HTML file, no build step),
  deployed to https://aaronsteele.vercel.app via `npx vercel deploy
  --prod`. Design rationale in `PREFLIGHT.md`; read it before touching
  the page.
- **`animation-pipeline/`** — production toolchain for crude hand-drawn
  animated shorts (write → draw → record voice → render 9:16 mp4,
  including a voice-directed mode where spoken stage directions stage
  the shots). Start with `animation-pipeline/CLAUDE.md`, then its
  `README.md`. Environment setup: `animation-pipeline/setup.sh`.

The two share nothing except `public/fonts/satoshi-var.woff2`, which the
pipeline ships converted to TTF for captions.
