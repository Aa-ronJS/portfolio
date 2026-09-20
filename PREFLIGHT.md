# Pre-flight, answered before any markup

Per `~\.claude-personal\design-repo\DESIGN.md` section 1, for the portfolio at
https://aaronsteele.vercel.app.

**Version 2.** The first version answered these questions in the document
register: warm paper, serif, hairline rules, dense evidence tables. Aaron rejected
it: a portfolio is a shop front, not an engineer's specification. What follows is
the brief he actually gave, answered honestly, and the deviations from the
playbook are named at the end rather than smuggled through.

---

**1. Who is the audience, and on what device?**

Two readers, and the page has three seconds to make either of them keep looking.

- The owner of a small studio building AI systems for Australian businesses. He
  states in his own advertisement that a portfolio link is the price of a reply.
  He is scanning, on a laptop, between client calls.
- A recruiter filling a HubSpot and go-to-market engineering role, and behind
  them a Head of Sales who gets sent the link. Very likely on a phone.

Neither is reading for detail on the first pass. Both are deciding whether this
person looks expensive. Phone layout is the base, not an afterthought.

**2. What register?**

Product-confident, brand-forward. A shop front. Explicitly not the
utilitarian-dense document register of version 1, which was correct for a
technical reference and wrong for a sales surface. Few words per screen, big
type, real photography, room to breathe.

**3. Which ONE reference site, and which one move?**

Agency one-pagers of the Locomotive and Igloo class. The single move taken:
**full-bleed cinematic plates that scroll at a different rate to the type sitting
over them**, so the page has physical depth rather than being a stack of
rectangles.

**4. What is the one accent colour?**

`--brand-h: 58`, `--brand-c: 0.155`. A molten amber, sampled from the art set
itself: it is the colour of the light breaking through the storm in `hero.jpg`.
Every neutral is an ink blue-black tinted from the same photographs. One hue,
used for the tag lines, the drawn hairlines, the big numbers, the links and the
single solid button.

**5. What is the type pairing?**

**Clash Display** (variable, 200 to 700, Fontshare) for every heading, and
**Satoshi** (variable, 300 to 900, Fontshare) for body. IBM Plex Mono survives
from the earlier version for the small tag lines and the technology chips only.

Neither display face is on the AI-favourite list, which rules out the Inter
default and the Space Grotesk plus Instrument Serif plus Geist trio in one move.
Clash is a wide, confident geometric display that holds up at 168px, which is the
size the brief needs. Both are self-hosted with metric-matched fallbacks so the
font swap moves nothing.

Display tracking is `-0.026em`. It started at `-0.035em` and the letters
collided at hero size; that was caught by looking at the rendered page.

**6. What is the signature detail?**

The **amber hairline that draws itself** across each project act as you reach it
(`transform: scaleX(0)` to `1`, left origin), paired with the **big number that
counts up** beside it. Together they are the page's tic: something always
arrives rather than simply being there.

**7. Light or dark, and why?**

Dark-first and committed, because the photography is dark and a light frame
around these images would fight them. The bone-white acts are not a second
theme, they are the white space: two enormous, nearly empty light bands that let
the eye rest between the cinematic ones. Both palettes are authored as their own
scales, not as inversions of each other.

**8. What is the visual moment, and what is its degraded tier?**

The full-bleed parallax plates, on the hero and the adversarial-review act.
They use `animation-timeline: view()`, so the movement runs off the main thread
and cannot jank the page.

Degraded tier, designed first: where scroll-driven animations are unsupported,
or the reader prefers reduced motion, the plate is simply a static full-bleed
photograph, which is the composition either way. Nothing on the page needs the
movement to make sense. The same applies to every other moving part: the reveals
resolve to visible, the counters resolve to their final numbers, the rotating
word resolves to its first option, and the tilt resolves to a flat card.

---

## Imagery

Five photographs, generated through `design-repo/tools/banana.py` on Aaron's own
key, all in one grade ("deep ink blue-black shadows and molten amber highlights,
cinematic natural light, fine film grain"), all text-free, and each tied to the
work it sits beside rather than being decoration:

| File | Where | Why that subject |
|---|---|---|
| `hero.jpg` | hero plate | An outback machinery shed under a breaking storm. The page is about work that has to survive weather and distance. |
| `slab.jpg` | Rain Check | A slab pour left mid-job under a threatening sky. It is literally the question Rain Check answers. |
| `doors.jpg` | Doorknock | A terrace of front doors at dusk with light behind one of them. |
| `glass.jpg` | HubSpot rebuild | Layers of cut glass, edge-lit. Records stacked and reconciled. |
| `seam.jpg` | adversarial review | A sealed steel door with light escaping the seam. |

Every one was opened and looked at before it was used. None depicts a real
client's product, and none stands in for something that must be true.

---

## Deviations from the playbook, named

The playbook prefers one hard visual idea and warns that permanent dark mode is
the single most common tell in generated design. This page has parallax plates,
scroll reveals, a pointer tilt, count-up numbers, a rotating word and a marquee,
on a dark ground.

That is deliberate. Aaron's brief asked for transitions, scrolling images, 3D,
dynamic text, bold headers and white space by name, and DESIGN.md itself says
that where a brief conflicts with it, the brief wins and the deviation gets
written down. This is the writing down.

The discipline kept: one accent hue, one radius pole (zero, everywhere), one
photographic grade, motion capped at 6 degrees of tilt and under 640ms for any
state change, every moving thing with an honest reduced-motion branch, and no
number, name or claim on the page that is not real.

---

## What the rendered page was checked against

Not the intention, the render. In a browser, at 1424px and inside iframes at
360, 414 and 834:

- No page-level horizontal scroll at any width.
- No link target under 24px.
- One radius value on the whole page.
- No em or en dashes, and no employer name, email or phone anywhere.
- The live tool counts genuinely fetched: 6 from Rain Check, 7 from Doorknock.
- The HubSpot counters land on 1,019 / 19,350 / 37,729 / 2, which are the real
  figures.

Three real defects were found that way and fixed:

1. **The hero's call to action never appeared.** It was scroll-revealed, and the
   observer's bottom margin put it outside the trigger zone, so the primary
   button sat at opacity 0 forever. The hero now animates on load; only what is
   below it waits for a scroll.
2. **Every photo card rendered portrait at 933px.** The `height` attribute on the
   image lands as a presentational `height`, and `aspect-ratio` only computes a
   height when height is `auto`. Adding `height:auto` restored the 3:2 crop.
3. **The same photograph appeared twice on one screen**, once as the parallax
   plate and once in the tilted card, which reads as a mistake rather than a
   composition. The project acts lost their plates; parallax now belongs to the
   two statement acts only.
