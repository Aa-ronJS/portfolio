# Portfolio

Source of https://aaronsteele.vercel.app. One HTML file, five photographs, three
self-hosted fonts, no build step and no dependencies. Plus one tool, at `/niche/`,
which adds a second HTML file and a single serverless function.

`PREFLIGHT.md` holds the design pre-flight it was built against, answered in
writing before any markup, including the deviations from the house playbook and
the three defects found by looking at the rendered page rather than the markup.

## The moving parts

| What | How | What happens without it |
|---|---|---|
| Parallax plates | `animation-timeline: view()`, off the main thread | A static full-bleed photograph, which is the composition anyway |
| Reveal on scroll | IntersectionObserver adds a class | Everything is visible |
| Count-up numbers | rAF, quartic ease, real figures in `data-count` | The final number, immediately |
| Rotating word | Three true descriptions, crossfaded | The first one |
| Pointer tilt | CSS 3D, capped at 6 degrees | A flat card |
| Live tool counts | `tools/list` posted to both MCP servers | A line saying the check did not run |

Every one of those has an honest `prefers-reduced-motion` branch, and the hero
animates on load rather than on scroll because it is already on screen.

## Imagery

Generated through the house image pipeline on a personal key, one colour grade
across the whole set, all text-free, each tied to the work it sits beside. None
depicts a real client's product and none stands in for something that must be
true. See `PREFLIGHT.md` for the table of what each image is doing there.

## Niche Check (`/niche/`)

A rebuild of the free "niche check" lead magnet that membership coaches run:
type a hobby or skill, get told whether people pay for it. This one shows its
working. Nothing is estimated and there is no email gate.

| Signal | Source | Asked by |
|---|---|---|
| Audience | Wikipedia article and 24 months of pageviews, podcasts, book counts | the browser |
| Demand | 19 Google autocomplete variations (how to, for, near me, course, membership...) | `api/niche.js`, because Google will not answer a browser |
| Proof of pay | paid ebooks, audiobooks and apps in Apple's stores, real prices and rating counts | the browser |
| Momentum | last six months of pageviews against the six before, share of podcasts active this year | the browser |
| Communities | Reddit member counts when Reddit lets the relay through, search links for the rest | `api/niche.js`, best effort |

Each signal is scored out of 25 and the four add to a verdict out of 100. A source
that does not answer is left out and the rest are rescaled, and the report says
which. Every number links to the query that produced it. Scans can be compared
side by side, shared by URL (`/niche/?q=quilting,dog training`) and copied out as
text. Fiction with the topic in its title is excluded from the paid-product count,
because a quilting romance is not evidence that anyone pays to learn quilting.

The relay function has no dependencies and caches a scan at the edge for a day.
`node check-niche.js` runs it against the real endpoints and fails if the shape or
the coverage is off.

## Build and deploy

```bash
node dev.js              # local preview with the function mounted, http://localhost:3000/niche/
npx vercel deploy --prod
```
