# The design, and where it came from

The site's design language is "the warm gallery": the atmosphere and
confidence of the crafted, award-winning end of web design, built from
a strictly non-AI canon researched rather than absorbed. It replaced
two earlier attempts in one session: the original dark-hero-and-stat-
cards look (AI slop) and a newspaper-austere pass (correct principles,
wrong temperature). What survived is the doctrine below.

## The canon

- **Klim Type Foundry** (klim.co.nz): Webby and Red Dot winner, built
  by Springload on Kris Sowersby's brief, explicitly rooted in Swiss
  practice: Josef Muller-Brockmann, Wim Crouwel, Karl Gerstner, Romek
  Marber. Minimal, bold, clear; the typography is the design and
  everything else stays out of its way.
- **iA / Information Architects** (ia.net): "web design is 95%
  typography"; text is the interface; responsive typography as the
  discipline, chrome as the enemy.
- **GOV.UK and the GDS design principles**: content first, every word
  earns its place, "making something simple to use is much harder
  than making it look simple", accessibility as good design rather
  than compliance. The web's best-tested plain style.
- **Butterick's Practical Typography**: the numbers this stylesheet
  obeys. Body 15 to 25px (a text serif wants the upper half), line
  spacing 120 to 145%, line length 45 to 90 characters, professional
  fonts, restraint about everything else.
- **The editorial school** (Pangram Pangram's Editorial New, Awwwards
  site of the year 2021; Locomotive's editorial work): serif display
  at headline sizes, index and table layouts, hairline rules doing
  the structure, numbered entries.

Sources checked during the research pass:
[Klim at the Webbys](https://www.webbyawards.com/crafted-with-code/klim-type-foundry-website/),
[Springload's Klim case study](https://www.springload.co.nz/work/klim/),
[iA on responsive typography](https://ia.net/topics/responsive-typography-the-basics),
[GOV.UK design principles](https://www.gov.uk/guidance/government-design-principles),
[GOV.UK design system](https://design-system.service.gov.uk/),
[Practical Typography's key rules](https://practicaltypography.com/summary-of-key-rules.html),
[Awwwards sites of the year](https://www.awwwards.com/websites/sites_of_the_year/).

## The rules extracted

1. **Typography carries the beauty.** Newsreader (Production Type,
   OFL, self-hosted variable roman and italic) at enormous sizes for
   display, with the italic as the signature: every h1, the brand, the
   cross-reference links and the evidence numerals are italic serif.
   Satoshi carries text and UI so long passages never read as
   newsprint; IBM Plex Mono does small labels, nav and captions.
2. **Candlelight, not darkness.** The dark surfaces (header+hero, the
   emphasis sections, the footer) are warm espresso with a soft
   radial glow and a breath of SVG grain, so they read as atmosphere
   rather than a slab. Content sections are warm cream. The two
   temperatures alternate; neither is default-grey anything.
3. **Gold means go.** One luminous gold accent on dark (deepened for
   legibility on cream): primary buttons, the current nav item, tags,
   figure numerals, link underlines. Never a second accent.
4. **Generosity is the luxury.** Oversized section padding, wide
   gutters, measures capped (Butterick's numbers still hold: body in
   the 15 to 25px band, 1.6 leading, 45 to 90 character lines).
5. **Motion is felt, not seen**: 180 to 220ms eased transitions,
   1 to 2px hover lifts, soft long-throw shadows on cards and the
   calculator. Nothing animates on its own; everything responds.
6. **Links look like links** (underlines, gold), primary actions are
   gold rectangles with mono uppercase labels, zero radius everywhere
   (--r stays 0; sharp edges are part of the brand).
7. **No decoration without information**: no icon sets, no stock
   anything, no gradients-as-decoration (the glow is light, not a
   gradient stripe), and the grain sits at 5% alpha where it belongs.

## Mechanics

Everything lives in `public/css/site.css`. The class names and token
names (`--s*`, `--t-*`, `--fg*`, `--bone*`, `--amber*`, `.tag`,
`.rows`, `.figures`, `.section--ink` and so on) are the site's stable
API: 85 pages and the calculator's inline styles reference them, so
restyles change values, never names. `--amber*` holds the gold family;
`.section--ink` is the espresso emphasis section; the glow and grain
live in `--glow` and `--grain` (a pure-CSS SVG noise data URI, no
asset).

Fonts are self-hosted in `public/fonts/` (newsreader-var,
newsreader-italic-var, satoshi-var, the two Plex Mono weights); every
page preloads Satoshi and the Newsreader italic, the two
above-the-fold faces, and the generators' head templates carry the
same preloads. `theme-color` is the espresso value because the page
opens dark. The favicon and OG cards' ink-and-amber mark sits
naturally with this palette; regenerate the OG set with the italic
serif when the images pass happens.

The one test that matters, non-negotiable: open the page and look at
it. If a change makes it more ordinary, more grey, or more like
software marketing, the change is wrong. It should be beautiful
first; everything else is implementation.
