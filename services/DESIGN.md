# The design, and where it came from

The site was restyled in one pass against a deliberately non-AI canon:
design work that earned its reputation from human craft, mostly before
generative tools existed, researched and distilled rather than
absorbed from whatever the models default to. This file records the
sources, the rules extracted from them, and the mechanics, so future
edits extend the language instead of diluting it.

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

1. **Typography is the design.** One serif (Newsreader, Production
   Type, OFL, self-hosted variable roman and italic) for display and
   text; IBM Plex Mono for labels, navigation, figures and captions.
   Nothing else.
2. **Paper, ink, one accent.** Warm near-white ground, near-black
   type, a single rust accent that only ever means "interactive or
   emphasised": link underlines, current page, button hover, list
   stubs. No second accent, ever.
3. **Rules, not backgrounds.** Structure is drawn with hairlines and
   weights of rule: 1px grey between entries, 1px ink to open an
   index, 2px ink to open an emphasised section or the colophon. The
   old dark blocks are gone; if a section needs weight it earns it
   with a heavier rule and a faint paper tint, never a fill.
4. **Links look like links.** Underlined, offset, accent-coloured
   underlines; the arrow-links are set in italic serif like a printed
   cross-reference. Buttons are rectangles: solid ink for the one
   primary action, drawn 1px ink for the rest, mono uppercase labels.
5. **Butterick's numbers hold everywhere**: body ~17 to 20px, leading
   1.55, measures capped (26ch display, 58ch text, 64ch answers), and
   they do not change meaning at phone widths.
6. **The masthead, not the app bar.** Header is the site's name in
   italic serif over a mono nav line, on the same paper, ruled off
   with 1px ink. The footer is a colophon: strong rule, the same
   links, mono small print.
7. **No decoration that carries no information.** No cards with
   borders-for-borders' sake, no icon sets, no gradients, no shadows,
   no rounded anything (--r stays 0). The figures strip is ruled
   columns with ink numerals, which is what evidence looks like in
   print.

## Mechanics

Everything lives in `public/css/site.css`. The class names and token
names (`--s*`, `--t-*`, `--fg*`, `--bone*`, `--amber*`, `.tag`,
`.rows`, `.figures`, `.section--ink` and so on) are the site's stable
API: 85 pages and the calculator's inline styles reference them, so
restyles change values, never names. `--amber*` now holds the rust
family; `.section--ink` is now the tinted, heavy-ruled emphasis
section rather than a dark block; both keep their names for exactly
this reason.

Fonts are self-hosted in `public/fonts/` (newsreader-var,
newsreader-italic-var, the two Plex Mono weights); every page
preloads the two Newsreader files, and the generators' head templates
carry the same preloads. `theme-color` is the paper value. The
favicon and the OG cards keep the original ink-and-amber mark; a tiny
mark and a share card tolerate the old palette, and regenerating the
OG set to match the new language is listed in IMAGES.md territory
when the images pass happens.

The one test that matters, from the canon and non-negotiable: open
the page and read it. If a change makes it look more like software
marketing and less like a well-set publication, the change is wrong.
