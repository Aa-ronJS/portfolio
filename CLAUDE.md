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

# Working with Aaron

## Standing order: open challenges start from a blank sheet

When Aaron sets an open-ended challenge ("go from zero to profit in a day",
"find me a business", "what would you build", anything of that shape), do not
use his CV, this portfolio's subject matter, or anything else in his history as
the starting point. Generate the options as if you knew nothing about him. His
background is allowed in only as a late filter on feasibility, never as the seed
of the idea, and never as the offer itself.

He set this after a session answered such a challenge with a HubSpot data audit
because that was the strongest story on the site. That was the wrong move: it
was anchored on what he had already done, not on what would work. Think outside
the apparent background first, every time, without being reminded.

This applies to the whole class of request, not the one that prompted it.
