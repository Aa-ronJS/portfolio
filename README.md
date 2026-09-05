# Portfolio

Source of https://aaronsteele.vercel.app. One HTML file, five photographs, three
self-hosted fonts, no build step and no dependencies.

`/book` is a parked direct-response funnel for *Unsellable* (exit-readiness).
Keyword research showed the niche has essentially no search demand, so it
waits for a paid-social experiment rather than leading.

`/ready` is the live play: **Privacy Ready** (working name), an Australian
Privacy Act readiness funnel built against measured search demand (~20k
AU searches/month across the compliance cluster, low competition) and the
reform wave. It's a self-contained folder — own fonts, relative links — that
lifts onto its own domain unchanged. Six pages: the funnel (free quiz → $99
kit / $29 guide → $3.5k/$7.5k/$12.5k fixed-price sprint → $350/mo retainer),
a 16-question scored readiness quiz (client-side only), and four SEO guides
targeting the measured terms, each with FAQ JSON-LD and sources. Every dated
legal claim was checked against primary sources (OAIC, legislation.gov.au) —
notably: the small-business exemption does *not* end 10 Dec 2026 (that's the
ADM disclosure date); the real capture was AML/CTF tranche 2 on 1 July 2026.
Checkout/booking URLs, refund address and the email-capture form are marked
`EDIT:`; re-verify the legal claims before launch.

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

## Build and deploy

```bash
npx vercel deploy --prod
```
