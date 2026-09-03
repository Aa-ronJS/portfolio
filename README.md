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
| Offline / installable | `manifest.webmanifest` plus `sw.js` caching all sixteen files | The same site, fetched from the network |

Every one of those has an honest `prefers-reduced-motion` branch, and the hero
animates on load rather than on scroll because it is already on screen.

## Imagery

Generated through the house image pipeline on a personal key, one colour grade
across the whole set, all text-free, each tied to the work it sits beside. None
depicts a real client's product and none stands in for something that must be
true. See `PREFLIGHT.md` for the table of what each image is doing there.

## Offline and Android

The site installs as an app: a web manifest, four icons drawn in the site's
own type and palette, and a service worker that takes the whole site (about
2&nbsp;MB) on first visit. `ANDROID.md` covers the two-tap install on Android
and the Bubblewrap route to a real APK. Nothing about it involves AI at
runtime — the only network calls the page ever makes are the two live MCP
tool counts, which keep their honest offline fallback.

## Build and deploy

```bash
npx vercel deploy --prod
```
