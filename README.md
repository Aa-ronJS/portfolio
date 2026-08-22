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

## The tool pages

`public/tools.css` holds the shared design system, because there is now a family
of these rather than one. Each tool page is otherwise self contained: no build
step, no dependencies, and every one of them does its whole job in the reader's
own browser with nothing uploaded, because they all ask for data the reader has
good reason not to hand over.

`public/chargeback-response/` is the current one. A Shopify and Stripe merchant
picks which of the six allegations behind their reason code is being made, says
what evidence they hold, and gets back the gaps ranked by what the allegation
turns on, plus the response assembled into the fields Shopify's evidence form
actually has. `CAMPAIGN.md` holds the test it belongs to, including the
trademark rule that decides whether the word Shopify can appear in the ad at
all, and why leading with a free informational tool is what keeps it there.

## The NDIS claim check

`public/ndis-claim-check/` is a second, self contained page: a free browser tool
for Australian NDIS providers that reads their own claims export and works out
what the 90 day claiming window starting 1 December 2026 would have cost them.
It is the free step of a paid information ladder, and `CAMPAIGN.md` holds the
whole test, the ladder, the keywords, the ad copy, the pass and fail lines set
before any money is spent, and the six things that have to be done before a
single click is bought.

It shares the parent site's fonts, palette and rules, and adds one desaturated
red used only as a data mark on money at risk, named as a deviation in the
file's own pre-flight. Everything happens in the browser: the file is read
locally, nothing is uploaded, and there is no server behind the page to upload
it to. Six defects were found by rendering it rather than reading it, including
bar fills that collapsed because their track was an inline span, and a rejection
table whose two most important columns sat off the right edge of a phone.

## Build and deploy

```bash
npx vercel deploy --prod
```
