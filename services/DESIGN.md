# The design, and how it stopped looking AI-made

Fourth pass, and the one built on the right research question. The first
three (dark-hero slop, a newspaper, a "warm gallery") changed the paint
while keeping the same bones, and the bones were the tell. This pass
started from the literature on what actually makes a site read as
AI-generated, and designed against it.

## The research

The consistent finding across sources: AI design tells are **defaults**,
the statistical middle of the training data, and the fix is loud,
specific, brand-rooted decisions plus broken structure. The named tells
that matter here, each of which an earlier pass of this site committed:

- Kicker/eyebrow labels above every heading (mono, uppercase,
  letterspaced): committed in all three passes.
- Italic serif display headlines as hero text: pass three's signature.
- Cream/beige as the default "tasteful" surface: passes two and three.
- Dark sections with glows, radial halos and grain: passes one and three.
- "Big number, small label, three supporting stats": every pass.
- Hairline borders paired with soft shadows; hover lifts on cards:
  pass three.
- Tiny numbered section labels (01, 02); mono-uppercase buttons;
  aphoristic-cadence copy in the docs.
- The unvarying hero, then features, then proof, then FAQ rhythm with
  identical section anatomy: structural, and the deepest tell of all.

Sources: [Impeccable's slop tells list](https://impeccable.style/slop/),
[How to fix the AI-generated look in your frontend](https://dev.to/alanwest/how-to-fix-the-ai-generated-look-in-your-frontend-1ahh),
[925 Studios on AI slop design tells](https://www.925studios.co/blog/ai-slop-design-tells),
[SmoothUI on AI design slop](https://smoothui.dev/blog/ai-design-slop),
[why AI keeps building the same purple gradient site](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website).

## The decisions (v4: flat, chunky, honest)

1. **Palette rooted in a place, not a template**: paper the colour of
   actual paper, deep eucalypt green as the only block colour, greenish
   near-black ink, one hot ochre. Flat everywhere. No gradients, no
   glows, no grain, no soft shadows, no cream-by-default.
2. **A display face with genuine character**: Bricolage Grotesque
   (variable, condensed-capable, self-hosted), set heavy and tight.
   Satoshi for everything you read. Mono appears only where data
   genuinely is. No Inter, no fashionable serif, no italic-display.
3. **Structure by thick rule and box**: 2px ink rules open sections and
   the header; 2px ink boxes make cards and the calculator; 1px mixed
   lines divide entries. Never hairline-plus-shadow.
4. **The eyebrow is dead**: the `.tag` is now a bold, sentence-case,
   ochre phrase with a 3px stub underline: reads like a person labelled
   the section, not a design system.
5. **Asymmetry on purpose**: the hero's lede and actions step 24% right
   of the headline at desktop; the first service card spans two columns
   and carries the tint; the evidence is a full-width ledger of rows
   (number, then sentence) rather than a row of stat tiles.
6. **Buttons are sentence-case text-face rectangles** with 2px ink
   borders; the primary is flat ochre; the only shadow on the site is
   the hard 4px offset a primary button earns on hover.
7. **Butterick's numbers still hold underneath** (body in the 15 to
   25px band, 1.6 leading, capped measures); readability research
   survives every art direction.

## Mechanics

Everything lives in `public/css/site.css`. The class names and token
names (`--s*`, `--t-*`, `--fg*`, `--bone*`, `--amber*`, `.tag`, `.rows`,
`.figures`, `.section--ink` and so on) are the site's stable API: 85
pages and the calculator's inline styles reference them, so restyles
change values, never names. `--amber*` holds the ochre family;
`--green` is the block colour; `.section--ink` is the flat green
section.

Fonts are self-hosted in `public/fonts/` (bricolage-var, satoshi-var,
the two Plex Mono weights); every page preloads Satoshi and Bricolage,
and the generators' head templates carry the same preloads.
`theme-color` is the paper value. The favicon and OG cards still carry
the old ink-and-amber mark; regenerate the OG set in the flat
paper/green/ochre language when the images pass happens.

The standing test, from the research and non-negotiable: **every
element must look chosen, not defaulted.** Before any future restyle,
re-read the tells lists above; if a proposed element appears on them,
it does not ship, however good it looks in the moment.
