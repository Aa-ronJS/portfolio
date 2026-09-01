# Portfolio

Source of https://aaronsteele.vercel.app. One HTML file, five photographs, three
self-hosted fonts, no build step and no dependencies.

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

## The city view (`/city`)

A hand-drawn city scene, animated. The drawing is the backdrop, untouched; the
companion drawings — two walk-cycle frames, a helicopter, three clouds, a UFO
with its lights on and off — were cut from their paper backgrounds and layered
over it. Tiny people stroll the park on staggered loops, helicopters cross the
sky and wait off-canvas between passes, clouds drift on multi-minute cycles,
window lights pulse out of phase, and every 80 seconds the UFO does a lap of
the sky — scaling with distance, always outside the window — then settles over
one of the walkers, takes them up the tractor beam, and shrinks away. All CSS,
positioned in container-query units so the sprites stay glued to the drawing at
any size. With `prefers-reduced-motion` it is the drawing as drawn, plus one
parked helicopter.

## Build and deploy

```bash
npx vercel deploy --prod
```
