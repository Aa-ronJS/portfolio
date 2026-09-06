# Pre-flight: the aaron8 mark

Answered in writing before any markup, per `design-repo/DESIGN.md` section 1.
This is a brand mark inside an identity that already exists (the site's v4
"flat, chunky, honest" system, documented in `../DESIGN.md`), so the tokens
are inherited rather than invented. Nothing new is seeded.

**1. Who is the audience, and on what device?**
An Adelaide small-business owner: a tradie, a clinic manager, a shop owner,
scanning a Google result or a Business Profile card on a mid-range Android
phone. They will see this mark at roughly 40px in a map pack long before
they ever see it large. The degraded tier is therefore the real brief and is
designed first: two flat colours, no gradient, no text, no detail finer than
a tenth of the tile, legible at 32px and inside a circle crop.

**2. What register?**
Product-confident. Not institutional: this is one person selling to small
business, and the site's existing voice is plain and direct. Not editorial:
a mark has no narrative to carry.

**3. Which ONE reference, and which ONE move?**
The reference is the site's own v4 identity and the move is its single
construction unit: the flat box ruled in 2px ink that every card, button and
calculator panel on the site is made from. The mark is that box, with the
counters of an 8 cut out of it.

Deliberate deviation from the playbook's "name a real external site". A
brand mark for an identity that already exists has to steal from that
identity; stealing from Linear or Framer instead would produce a mark that
belongs to a different company than the site it sits on.

**4. What is the one accent colour?**
Inherited, sampled from `public/css/site.css`, not chosen fresh: ochre
`--amber` `oklch(0.680 0.165 48)`, which is `#e7732b` in sRGB. Paper
`--bone` `oklch(0.951 0.018 92)` is the ground everything sits on. No
second hue.

The tile is the ochre and the figure is ink `--ink` `oklch(0.225 0.018 150)`,
`#161e17`. That is the reverse of the first draft, and the reason is
measured rather than felt. Ochre on the green block colour comes out at
**3.90:1**, which clears the 3:1 non-text floor but sits under the
playbook's Lc 60 target for anything non-body, and it is not enough
separation to survive a 32px map-pack icon. Ink on ochre measures
**5.59:1**, and section 2.2 point 8 of the playbook independently says dark
text on amber solids, white on everything else. Both arguments land in the
same place, so the mark takes the site's loudest element, the flat ochre
primary button, and cuts the 8 out of it.

**5. What is the type pairing?**
Inherited: Bricolage Grotesque for display, Satoshi for reading, IBM Plex
Mono where data genuinely is. The wordmark is Bricolage at weight 800 with
-0.03em tracking, which is inside the playbook's rule that negative tracking
applies only above roughly 48px.

The mark itself carries no type at all. That is deliberate: a mark built
from a font is a mark that breaks the moment the font fails to load, and
this one has to survive being pasted into Google's own surfaces where no
stylesheet of ours runs.

**6. What is the signature detail?**
Every counter and every corner in the 8 is a right angle. The mark is not a
typographic 8 borrowed from a typeface; it is an 8 drawn in the site's box
language, on the same 4px grid as the spacing scale. Put the icon next to
the site and the same hand is visible in both.

**7. Light or dark, and why?**
Neither, strictly: the tile is a mid-lightness ochre, which is the point. It
holds its edge against a white Google result and against a dark one, where
both a paper tile and an ink tile would lose one of the two. Everything
around it, including the storefront image, stays on the site's committed
paper ground. The one dark element on the whole deliverable is the figure
inside the tile, and it is dark because the contrast measurement said so.

**8. What is the visual moment, and what is its degraded tier?**
The mark is the moment. There is no motion, no photography, no 3D, and
nothing generated: the whole thing is hand-authored SVG geometry, which is
source 1 of the four legal image sources. Its degraded tier is itself. Flat
two-colour vector, no gradient and no text, so the 32px favicon, the
circle-cropped Google avatar, a one-colour print and a 1440px storefront
image are all the same shape with nothing lost.

## Construction

100 x 100 tile, one weight throughout. Stems, bars and waist are all 12 and
the counters are a true 20 x 20 square, which fixes the figure at 44 x 76:
x 28 to 72, y 12 to 88, counters at x 40 to 60, y 24 to 44 and y 56 to 76.
Every coordinate is a multiple of 4, on the site's own spacing grid. Zero
radius throughout, matching the site's `--r: 0px` sharp pole.

Two elements in the whole file: one filled rect for the tile, one even-odd
path for the figure. No gradient, no filter, no font, no embedded raster.

## What the rendering caught, and what changed because of it

Eleven constructions were drawn and rendered before this one was chosen,
every time at 200px down to 16px and inside a circle crop. What the renders
killed, in order:

- **Landscape counters read as a domino, not an eight.** The first draft had
  28 x 16 counters and rendered as a dark slab with two orange slots in it.
  The counters have to be square before the eye reads a numeral.
- **An offset-bowl eight and a pinched-waist eight both read as rendering
  faults.** The notches looked like clipping above 32px and vanished below
  it. Round counters in a square block read as a traffic light, and round
  counters with a pinched waist read as a face.
- **The tile was too full.** At the original scale the figure's furthest
  corner sat 49.4 against a 50 radius, and the circular avatar sliced flat
  across the top and bottom. The mark is deliberately smaller in its tile
  than it wants to be, for that reason alone.
- **Uneven weights were the last fault, and only visible large.** A version
  with 10 stems, 8 bars and a 12 waist held at 40px but read as a slotted
  rectangle at 1200px, because the waist was heavier than the stems, which
  is the opposite of how an eight is drawn. Solving for one weight
  throughout, with square counters, fixes the figure at 12 and 20 and is
  what produced the geometry above.

None of this was visible in the source. It was visible in the render, which
is why the playbook says to review the rendered page rather than the
intention.
