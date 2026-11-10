#!/usr/bin/env python3
"""Builds the licensing pitch site, sell sheets and provisional specs.

    python3 licensing/build/build.py     # writes HTML
    node licensing/build/pdf.js          # renders the PDFs

Outputs (all under licensing/):
    site/pitch-site.html          Artifact page (body-only HTML)
    sell-sheets/<slug>.html|pdf   one A4 page per product
    filing/<slug>.html|pdf        provisional patent specification drafts
"""
import html
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
INVENTOR = "Aaron Steele"

# ---------------------------------------------------------------- figures
# Each figure is a 480x230 SVG drawn only with the theme tokens.

def fig_reproof():
    drops = "".join(
        f'<circle cx="{x}" cy="{y}" r="5" fill="var(--accent)"/>'
        for x, y in [(78, 78), (112, 70), (150, 80), (176, 72)]
    )
    rain = "".join(
        f'<line x1="{x}" y1="18" x2="{x-6}" y2="38" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"/>'
        for x in (70, 110, 150, 190, 300, 340, 380, 420)
    )
    return f'''<svg viewBox="0 0 480 230" role="img" aria-label="Two jacket tabs in the rain. The left tab is blank with water beading on it. The right tab is soaked and shows the word REPROOF.">
{rain}
<rect x="50" y="60" width="160" height="96" rx="10" fill="var(--surface)" stroke="var(--fg)" stroke-width="2"/>
{drops}
<text x="130" y="186" text-anchor="middle" class="cap">Coating working</text>
<text x="130" y="206" text-anchor="middle" class="sub">Water beads. Tab stays blank.</text>
<rect x="270" y="60" width="160" height="96" rx="10" fill="var(--wet)" stroke="var(--fg)" stroke-width="2"/>
<text x="350" y="118" text-anchor="middle" class="sig" font-size="26" font-weight="700" letter-spacing="2">REPROOF</text>
<text x="350" y="186" text-anchor="middle" class="cap">Coating worn off</text>
<text x="350" y="206" text-anchor="middle" class="sub">Fabric soaks. The word shows.</text>
</svg>'''


def fig_paddle():
    import math
    ring = "".join(
        f'<circle cx="{240 + 40*math.cos(a):.1f}" cy="{88 + 40*math.sin(a):.1f}" r="5.5" fill="var(--signal)" opacity="0.22"/>'
        for a in [i * math.pi / 4 for i in range(8)]
    )
    ref = "".join(f'<circle cx="{x}" cy="158" r="5.5" fill="var(--signal)"/>' for x in (213, 231, 249, 267))
    return f'''<svg viewBox="0 0 480 230" role="img" aria-label="A pickleball paddle. A ring of faded dots sits around the hitting zone. A row of bright dots sits near the handle.">
<rect x="165" y="8" width="150" height="170" rx="30" fill="var(--surface)" stroke="var(--fg)" stroke-width="2"/>
<rect x="225" y="178" width="30" height="48" rx="5" fill="var(--fg)"/>
{ring}{ref}
<line x1="286" y1="70" x2="330" y2="50" stroke="var(--muted)" stroke-width="1.5"/>
<text x="336" y="46" class="cap">Hitting zone</text>
<text x="336" y="64" class="sub">Dots fade as the</text>
<text x="336" y="80" class="sub">grit wears off.</text>
<line x1="206" y1="158" x2="150" y2="150" stroke="var(--muted)" stroke-width="1.5"/>
<text x="144" y="138" text-anchor="end" class="cap">Reference dots</text>
<text x="144" y="156" text-anchor="end" class="sub">Never hit.</text>
<text x="144" y="172" text-anchor="end" class="sub">Stay bright.</text>
</svg>'''


def fig_pan():
    def pan(x):
        return (f'<path d="M{x} 110 L{x+14} 150 H{x+146} L{x+160} 110" fill="none" stroke="var(--fg)" stroke-width="3" stroke-linejoin="round"/>'
                f'<rect x="{x+160}" y="108" width="52" height="7" rx="3" fill="var(--fg)"/>')
    return f'''<svg viewBox="0 0 480 230" role="img" aria-label="Two frying pans seen from the side. In the left pan a flat disc sits on the base. In the right pan the disc has popped up into a dome.">
{pan(20)}
<rect x="76" y="140" width="48" height="8" rx="3" fill="var(--muted)"/>
<text x="100" y="186" text-anchor="middle" class="cap">Heating</text>
<text x="100" y="206" text-anchor="middle" class="sub">Disc sits flat.</text>
{pan(256)}
<rect x="312" y="140" width="48" height="8" rx="3" fill="var(--muted)"/>
<path d="M316 140 Q336 116 356 140 Z" fill="var(--signal)"/>
<path d="M326 104 l-4 -12 M336 100 v-14 M346 104 l4 -12" stroke="var(--signal)" stroke-width="2.5" stroke-linecap="round"/>
<text x="336" y="186" text-anchor="middle" class="cap">Ready</text>
<text x="336" y="206" text-anchor="middle" class="sub">Dome pops up with a click.</text>
</svg>'''


def fig_mug():
    tines = lambda x0: "".join(
        f'<line x1="{x0+i*28}" y1="150" x2="{x0+i*28}" y2="128" stroke="var(--muted)" stroke-width="3" stroke-linecap="round"/>'
        for i in range(6))
    return f'''<svg viewBox="0 0 480 230" role="img" aria-label="Two upside-down mugs on a dishwasher rack. The left mug sits flat with a puddle on its base. The right mug is tilted on a wedge and the water runs off.">
<line x1="30" y1="150" x2="200" y2="150" stroke="var(--fg)" stroke-width="3"/>{tines(45)}
<rect x="72" y="62" width="84" height="88" rx="8" fill="var(--surface)" stroke="var(--fg)" stroke-width="2"/>
<path d="M82 62 Q114 48 146 62 Z" fill="var(--accent)"/>
<text x="114" y="186" text-anchor="middle" class="cap">Flat</text>
<text x="114" y="206" text-anchor="middle" class="sub">Dirty water pools on top.</text>
<line x1="270" y1="150" x2="450" y2="150" stroke="var(--fg)" stroke-width="3"/>{tines(285)}
<rect x="270" y="143" width="180" height="9" rx="4" fill="var(--signal)"/>
<g transform="rotate(8 407 143)">
<rect x="323" y="55" width="84" height="88" rx="8" fill="var(--surface)" stroke="var(--fg)" stroke-width="2"/>
</g>
<path d="M306 143 L324 128 L334 143 Z" fill="var(--signal)" stroke="var(--fg)" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M426 66 q9 13 0 20 q-9 -7 0 -20 Z" fill="var(--accent)"/>
<text x="360" y="186" text-anchor="middle" class="cap">On the rail</text>
<text x="360" y="206" text-anchor="middle" class="sub">Tilted. Water runs off.</text>
</svg>'''


def fig_fit():
    import math
    def rays(cx):
        return "".join(
            f'<line x1="{cx+50*math.cos(a):.1f}" y1="{88+50*math.sin(a):.1f}" x2="{cx+64*math.cos(a):.1f}" y2="{88+64*math.sin(a):.1f}" stroke="var(--signal)" stroke-width="5" stroke-linecap="round"/>'
            for a in [i * math.pi / 6 for i in range(12)])
    bars = "".join(f'<rect x="300" y="{48+i*10}" width="100" height="5.5" fill="var(--signal)"/>' for i in range(9))
    return f'''<svg viewBox="0 0 480 230" role="img" aria-label="Two printed sun icons. The left sun is solid. The right sun is broken into stripes because the fabric is stretched.">
<defs><clipPath id="sunclip"><ellipse cx="350" cy="88" rx="46" ry="38"/></clipPath></defs>
{rays(130)}<circle cx="130" cy="88" r="38" fill="var(--signal)"/>
<text x="130" y="186" text-anchor="middle" class="cap">Right size</text>
<text x="130" y="206" text-anchor="middle" class="sub">Sun looks solid.</text>
{rays(350)}<g clip-path="url(#sunclip)">{bars}</g>
<text x="350" y="186" text-anchor="middle" class="cap">Outgrown</text>
<text x="350" y="206" text-anchor="middle" class="sub">Stretched fabric. Sun turns stripy.</text>
</svg>'''

def fig_cat():
    def streaks(x0, y0, sx, sy):
        cols = ["var(--signal)", "var(--accent)", "#e0b020", "var(--signal)", "var(--accent)", "#e0b020", "var(--signal)"]
        pts = [(12, 18, 6, 50), (26, 30, -4, 62), (40, 12, 5, 44), (52, 48, -3, 52), (20, 78, 4, 40), (46, 92, -5, 34), (34, 58, 3, 46)]
        return "".join(
            f'<line x1="{x0+px*sx:.0f}" y1="{y0+py*sy:.0f}" x2="{x0+(px+dx)*sx:.0f}" y2="{y0+(py+dy)*sy:.0f}" stroke="{c}" stroke-width="{4*sx:.0f}" stroke-linecap="round"/>'
            for (px, py, dx, dy), c in zip(pts, cols))
    return f'''<svg viewBox="0 0 480 230" role="img" aria-label="A scratching post with a dark wrap scratched through to bright colours, and the same wrap unrolled and hanging in a frame.">
<ellipse cx="110" cy="166" rx="62" ry="9" fill="var(--muted)"/>
<rect x="76" y="20" width="68" height="146" rx="8" fill="var(--fg)"/>
{streaks(76, 20, 1, 1)}
<path d="M196 92 h56 m-14 -12 l14 12 l-14 12" fill="none" stroke="var(--muted)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="292" y="14" width="136" height="152" fill="var(--surface)" stroke="var(--fg)" stroke-width="5"/>
<rect x="306" y="28" width="108" height="124" fill="var(--fg)"/>
{streaks(306, 28, 1.6, 0.85)}
<text x="110" y="196" text-anchor="middle" class="cap">On the post</text>
<text x="110" y="214" text-anchor="middle" class="sub">Scratches reveal the colours.</text>
<text x="360" y="196" text-anchor="middle" class="cap">On the wall</text>
<text x="360" y="214" text-anchor="middle" class="sub">Unroll, frame, fit a fresh wrap.</text>
</svg>'''

# ---------------------------------------------------------------- products

PRODUCTS = [
    dict(
        slug="reproof-tab", name="Reproof Tab", fig=fig_reproof,
        line="The label that tells owners when to reproof.",
        category="Outdoor clothing, tents, awnings, boat covers",
        problem=[
            "PFAS bans are moving every brand to water-repellent coatings that wear out sooner.",
            "When the coating fails the fabric soaks, and the owner thinks the product leaks.",
            "The only check today is to pour water on it and watch.",
        ],
        how=[
            "A small tab made of the same coated fabric, sewn where wear is heaviest.",
            "While the coating works, water beads off and the tab stays blank.",
            "Once the coating has worn off, the tab soaks and the word REPROOF shows through.",
            "It hides again when dry and stays hidden after re-treatment.",
        ],
        value=[
            "Care brands: every signal sells a bottle.",
            "Garment brands: fewer &ldquo;it leaks&rdquo; returns.",
            "No electronics. A few cents of fabric and print.",
            "A stick-on version can ship in the box with the reproofer.",
        ],
        facts=[
            ("1 Jan 2028", "California&rsquo;s PFAS exemption for wet-weather gear ends"),
            ("1&ndash;2 seasons", "typical life of a PFAS-free coating before re-treatment"),
        ],
        field="wear indicators for water-repellent finishes on textile articles",
        background="Durable water-repellent finishes on garments, tents, covers and awnings wear away with abrasion, soiling and washing. Finishes free of fluorinated compounds generally wear away sooner. When the finish fails, the outer fabric absorbs water. The owner has no indication of this other than deliberately wetting the article and observing whether water beads.",
        summary="A wear indicator for a water-repellent finish on a textile article, comprising an indicator layer of textile that carries a water-repellent finish and is located where the article is subject to wear, and a marking beneath or within the indicator layer. The marking is concealed while the indicator layer is dry and is revealed when the indicator layer absorbs water. The marking is therefore revealed on exposure to water only after the finish on the indicator layer has degraded.",
        detail=[
            "In one embodiment the indicator layer is a thin, pale woven fabric carrying the same finish as the article, overlying a backing printed with a dark marking such as the word REPROOF. Dry, the pale layer is opaque and hides the marking. Wet, the pale layer becomes translucent and the marking is visible through it.",
            "While the finish is intact, water beads on the indicator layer and does not wet it, so the marking stays hidden in rain. When the finish has worn away, water wets the layer and the marking appears. On drying the marking is hidden again. After the article and indicator are re-treated with a water-repellent product, the marking again stays hidden in rain.",
            "In another embodiment the marking is concealed by a hydrochromic ink that is opaque when dry and transparent when wet, the ink lying beneath the finished surface.",
            "The indicator may be sewn to the article at manufacture and finished in the same bath, or supplied as a separate adhesive or heat-applied patch, for example with a re-treatment product.",
        ],
        variants=[
            "The indicator layer is the face fabric of the article itself, with the marking on its inner side.",
            "The finish on the indicator is selected to fail earlier than the finish on the article, to give advance warning.",
            "Two or more markings that are revealed at different stages of wear.",
            "Location on a shoulder, cuff, hip belt area, tent fly, awning edge or cover seam.",
            "Use on garments, footwear, gloves, tents, swags, awnings, boat covers, outdoor cushions and bags.",
        ],
        figdesc="Figure 1 shows the indicator in rain in two states: on the left the finish is intact and the indicator is blank; on the right the finish has degraded, the indicator layer is wet and the marking is visible.",
    ),
    dict(
        slug="grit-dots", name="Grit Dots", fig=fig_paddle,
        line="When the dots fade, the spin is gone.",
        category="Pickleball and padel paddles",
        problem=[
            "Paddles get their spin from a rough face, and that roughness wears smooth.",
            "Worn texture can&rsquo;t be restored.",
            "Players have no way to check except rubbing a finger on the face or borrowing a new paddle.",
        ],
        how=[
            "Dots are printed only on the peaks of the face texture, around the hitting zone.",
            "Matching reference dots sit near the handle, where the ball never lands.",
            "As the peaks wear down, the hitting-zone dots fade.",
            "Faded against the reference means the grit has gone.",
        ],
        value=[
            "A clear, honest signal to buy the next paddle.",
            "A visible feature no other brand has.",
            "One extra print pass. No change to face or core.",
            "Also suits replaceable face sheets.",
        ],
        facts=[
            ("24.3 million", "Americans played pickleball in 2025 (SFIA)"),
            ("+479%", "growth in US players over five years (SFIA)"),
        ],
        field="wear indicators for the textured hitting faces of paddles and rackets",
        background="Paddles for pickleball and similar sports have a hitting face with a rough texture that imparts spin. The texture is worn away by ball impact. The loss is gradual and hard to see, and the player has no objective indication of it short of comparison with an unused paddle.",
        summary="A paddle having a hitting face with a textured surface of peaks and valleys, and wear indicia comprising a marking material applied substantially only to the peaks within a first region of the face that is subject to ball impact. Abrasion of the peaks removes the marking material, so that visible fading of the indicia corresponds to loss of surface roughness.",
        detail=[
            "The marking material is applied after the texture is formed, by a roller, pad or screen that contacts only the high points of the texture, so that the valleys remain unmarked. The marking is thin enough not to alter the measured roughness of the face.",
            "Reference indicia of the same marking material are applied in a second region of the face that is not subject to ball impact, such as adjacent the throat or handle. The player compares the first region with the second. Equal brightness indicates an unworn face. Fading in the first region relative to the second indicates wear.",
            "The indicia may be discrete dots arranged around the centre of the face, or may form part of the graphics of the paddle.",
        ],
        variants=[
            "Graded indicia of two or more colours or thicknesses that disappear at different degrees of wear.",
            "Indicia applied to a replaceable face sheet.",
            "Use on padel rackets, table tennis rubbers and other textured striking faces.",
            "Reference indicia protected beneath an edge guard or clear cover.",
        ],
        figdesc="Figure 1 shows a paddle with a ring of indicia around the hitting zone, shown faded, and a row of reference indicia near the handle, shown at full strength.",
    ),
    dict(
        slug="pan-click", name="Pan Click", fig=fig_pan,
        line="It clicks when your pan is ready.",
        category="Cookware accessories",
        problem=[
            "Cooks are leaving traditional non-stick for stainless steel and ceramic.",
            "Stainless sticks unless it&rsquo;s properly preheated. Ceramic loses its slickness when overheated.",
            "The only guide is flicking water into the pan and watching how it behaves.",
        ],
        how=[
            "A coin-sized stainless disc sits in the pan while it heats.",
            "Inside is a bimetal snap disc, the part that switches off a kettle.",
            "At the set temperature the dome pops up with a click and shows its colour.",
            "It resets as it cools. No batteries.",
        ],
        value=[
            "Works with pans people already own.",
            "Two versions: &ldquo;ready&rdquo; for stainless, &ldquo;too hot&rdquo; for ceramic.",
            "Suits a thermometer or gadget range, or boxed with a pan.",
            "A demonstration anyone understands: one egg sticks, one slides.",
        ],
        facts=[
            ("65%", "of US adults are concerned about PFAS in non-stick pans (Consumer Reports, 2025)"),
            ("2025", "Minnesota became the first US state to ban PFAS in cookware"),
        ],
        field="temperature indicators for cooking vessels",
        background="Uncoated cooking vessels such as stainless steel pans release food cleanly only when preheated to a suitable temperature, and ceramic-coated vessels are damaged by overheating. Known indicators are colour-change coatings forming part of the vessel. A cook using an existing vessel has no indicator and relies on observing water droplets.",
        summary="A reusable temperature indicator for placement on the cooking surface of a cooking vessel, comprising a food-safe housing with a flat heat-conducting base, a bistable bimetallic element within the housing that changes from a first stable shape to a second at a predetermined temperature and returns on cooling, and an indicator surface that is hidden in the first shape and displayed in the second, the change being accompanied by an audible sound.",
        detail=[
            "The housing is a shallow stainless steel body with a flat base that rests on the floor of the vessel. The bimetallic element is a dished disc retained in the housing. Below the predetermined temperature the disc is concave and lies within the housing. At the predetermined temperature it snaps to a convex shape, raising a coloured upper surface above the housing and producing a click.",
            "The predetermined temperature is selected for the type of vessel: approximately 190 degrees Celsius to indicate that an uncoated vessel is ready, or approximately 230 degrees Celsius to warn that a coated vessel is too hot.",
            "A lifting formation on the housing allows removal with a utensil.",
        ],
        variants=[
            "Two bimetallic elements with different predetermined temperatures in one housing.",
            "A version that hangs from the rim of the vessel with a conducting foot on the floor of the vessel.",
            "Feet or a coating that will not mark ceramic surfaces.",
            "Construction from non-magnetic materials to limit direct heating on an induction hob.",
        ],
        figdesc="Figure 1 shows a vessel in side view with the indicator on its floor in two states: on the left below the predetermined temperature, with the element flat; on the right above it, with the element raised.",
    ),
    dict(
        slug="mug-rail", name="Mug Tilt Rail", fig=fig_mug,
        line="No more puddles on your mugs.",
        category="Kitchen and dishwasher accessories",
        problem=[
            "Mugs sit upside down in the dishwasher and their dished bases hold a puddle of dirty water.",
            "It spills over clean dishes at unloading.",
            "The viral fix, tilting the whole rack, gives about four degrees and can block the door.",
        ],
        how=[
            "A silicone-covered rail presses onto a row of tines in the top rack.",
            "Raised wedges along it lift one side of each mug&rsquo;s rim.",
            "Each mug rests at roughly nine degrees, so water runs off the base.",
            "It stays in the rack between washes.",
        ],
        value=[
            "A complaint almost every dishwasher owner has.",
            "A simple silicone and plastic moulding.",
            "The before-and-after needs no explanation.",
            "Sells in pairs.",
        ],
        facts=[
            ("About 4&deg;", "the tilt the viral rack hack achieves (House Digest test)"),
            ("About 9&deg;", "the tilt a 12 mm wedge gives an 8 cm mug"),
        ],
        field="accessories for dishwasher racks",
        background="Drinking vessels are placed inverted in a dishwasher rack. Many have a recessed base, in which wash water collects and remains after the cycle. Manufacturers advise leaning such vessels at the sides of the rack, and users tilt the whole rack, with limited effect.",
        summary="A retrofit accessory for a dishwasher rack having upstanding tines, comprising an elongate body with engagement formations on its underside for releasable attachment to a row of tines, and a plurality of spaced raised supports on its upper side, each positioned to raise one side of the rim of an inverted drinking vessel so that the vessel rests at an incline and liquid drains from its base.",
        detail=[
            "The body is a strip of dishwasher-safe polymer with a resilient covering. Slots in its underside receive the tines of the rack and hold the body in place.",
            "Each support is a wedge approximately 12 millimetres high. An inverted vessel of 80 millimetres diameter resting with one side of its rim on a support is inclined at approximately 8 to 9 degrees.",
            "A lip on each support resists the vessel sliding under the force of the spray.",
        ],
        variants=[
            "Slots sized to fit a range of tine spacings and wire diameters.",
            "Individual clip-on supports in place of an elongate body.",
            "Support height selected to give an incline of 6 to 15 degrees.",
        ],
        figdesc="Figure 1 shows two inverted vessels on a rack in side view: on the left resting level with liquid retained on the base; on the right resting on a support of the accessory, inclined, with liquid draining.",
    ),
    dict(
        slug="fit-mark", name="Fit Mark", fig=fig_fit,
        line="Stripy sun? Size up.",
        category="Sun-protective swimwear",
        problem=[
            "A UPF 50+ swim shirt is rated relaxed. Stretched fabric lets more UV through.",
            "Brands already warn about this on their care labels.",
            "Nothing on the garment tells a parent that last summer&rsquo;s shirt is now too small.",
        ],
        how=[
            "A sun icon is printed across the shoulders as fine bars set close together.",
            "At the right fit the bars sit closed and the sun looks solid.",
            "When the fabric is overstretched, pale fabric shows between the bars and the sun turns striped.",
            "The bar spacing is set to the stretch at which protection drops.",
        ],
        value=[
            "Prompts the next-size purchase at the right moment.",
            "Turns a small-print warning into a visible safety feature.",
            "One extra print in a process the garment already goes through.",
        ],
        facts=[
            ("UPF 50+", "is measured on relaxed fabric (AS 4399:2020)"),
            ("&ldquo;Relaxed fit&rdquo;", "is CHOICE&rsquo;s advice, because stretch reduces UPF"),
        ],
        field="fit indicators for sun-protective garments",
        background="Garments of stretch fabric are sold with an ultraviolet protection rating measured with the fabric relaxed. Extension of the fabric opens its structure and reduces the protection. A garment that has become too small for its wearer is extended in wear, and nothing on the garment indicates this.",
        summary="A sun-protective garment of stretchable fabric having an ultraviolet protection rating in a relaxed state, and a printed indicator on a region of the garment subject to stretch when worn. The indicator comprises printed elements separated by gaps that are visually closed in the relaxed state and visually open when the fabric is extended beyond a predetermined amount, the predetermined amount corresponding to an extension at which the protection of the fabric falls below a stated rating.",
        detail=[
            "The indicator is printed on the relaxed fabric as a set of parallel bars with narrow gaps, together forming a recognisable solid shape such as a sun. The ink contrasts with the base fabric.",
            "When the fabric is extended across the bars, the gaps widen and the base fabric becomes visible between the bars, so the shape appears striped.",
            "The width of the gaps is selected, for the fabric concerned, so that the striped appearance becomes evident at the predetermined extension.",
        ],
        variants=[
            "Location across the shoulders, chest or upper back.",
            "A contrasting colour or a word revealed in the gaps.",
            "Use on swim leggings, sun sleeves and sports tops.",
        ],
        figdesc="Figure 1 shows the indicator in two states: on the left with the fabric relaxed, appearing solid; on the right with the fabric extended, appearing striped.",
    ),
    dict(
        slug="cat-picasso", name="Cat Picasso", fig=fig_cat, site=False, status="Design concept",
        line="Your cat makes the painting.",
        category="Cat scratching posts and gifts",
        problem=[
            "Scratching posts wear out and get thrown away.",
            "Replacement wraps already sell, but they are only spare parts.",
            "Owners love sharing what their cats do, and a worn post gives them nothing to share.",
        ],
        how=[
            "A removable wrap of coloured card layers under a dark outer layer.",
            "Each scratch tears through to a colour.",
            "When it&rsquo;s finished, the wrap comes off, unrolls flat and goes in a frame.",
            "A fresh wrap goes on the post.",
        ],
        value=[
            "Every finished artwork sells a refill.",
            "Each one is unique and made by the buyer&rsquo;s own cat.",
            "Printed card and two straps. Nothing new to manufacture.",
            "A wrap-only pack fits posts people already own.",
        ],
        facts=[
            ("30 &times; 40 cm", "the wrap unrolls to a standard frame size"),
            ("US$0.8 billion", "a year spent on cat scratchers (one market estimate)"),
        ],
        field="", background="", summary="x", detail=[], variants=[], figdesc="",
    ),

]

# ---------------------------------------------------------------- shared CSS

TOKENS_LIGHT = """--bg:#f4f7f8;--surface:#ffffff;--wet:#c9d6dc;--fg:#13222c;--muted:#566875;
--line:#d3dde2;--accent:#0c6f8a;--signal:#d9501f;"""
TOKENS_DARK = """--bg:#0e161b;--surface:#16222a;--wet:#2c4350;--fg:#e7eef2;--muted:#93a5b1;
--line:#263640;--accent:#56b9d4;--signal:#ff7d4f;color-scheme:dark;"""
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap">'
SVG_CSS = """svg{display:block;width:100%;height:auto}
svg text{font-family:var(--body)}
svg .cap{font-size:15px;font-weight:600;fill:var(--fg)}
svg .sub{font-size:12.5px;fill:var(--muted)}
svg .sig{fill:var(--signal);font-family:var(--display)}"""


def ul(items):
    return "<ul>" + "".join(f"<li>{i}</li>" for i in items) + "</ul>"

# ---------------------------------------------------------------- site

def site():
    nav = "".join(
        f'<li><a href="#{p["slug"]}"><span class="n">{p["name"]}</span><span class="l">{p["line"]}</span><span class="c">{p["category"]}</span></a></li>'
        for p in PRODUCTS if p.get("site") is not False)
    sections = ""
    for p in PRODUCTS:
        if p.get("site") is False:
            continue
        facts = "".join(f'<div class="fact"><b>{v}</b><span>{k}</span></div>' for v, k in p["facts"])
        sections += f'''
<section class="product" id="{p["slug"]}">
  <header>
    <p class="eyebrow">{p["category"]}</p>
    <h2>{p["name"]}</h2>
    <p class="line">{p["line"]}</p>
  </header>
  <div class="split">
    <figure>{p["fig"]()}</figure>
    <div class="facts">{facts}</div>
  </div>
  <div class="cols">
    <div><h3>The problem</h3>{ul(p["problem"])}</div>
    <div><h3>How it works</h3>{ul(p["how"])}</div>
    <div><h3>Why license it</h3>{ul(p["value"])}</div>
  </div>
  <p class="status">Stage: design concept. Patent pending. Available to license.</p>
</section>'''
    return f'''<title>Signal Products</title>
<meta name="claude:viewport-fit-sides" content="cover">
{FONTS}
<style>
/* Layout: one column, 1040px max. A plain index up top, then one band per product:
   name and line, figure beside two facts, three equal columns of detail. */
:root{{{TOKENS_LIGHT}
--display:"Space Grotesk",system-ui,sans-serif;--body:"Inter",system-ui,sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{{TOKENS_DARK}}}}}
:root[data-theme="dark"]{{{TOKENS_DARK}}}
*{{box-sizing:border-box}}
body{{background:var(--bg);color:var(--fg);font:16px/1.55 var(--body)}}
.wrap{{max-width:1040px;margin:0 auto;padding-block:48px 72px;
padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));
display:flex;flex-direction:column;gap:56px}}
h1,h2,h3{{font-family:var(--display);text-wrap:balance;margin:0}}
h1{{font-size:clamp(2rem,5vw,3.1rem);line-height:1.08;letter-spacing:-.02em;max-width:18ch}}
.intro{{display:flex;flex-direction:column;gap:16px}}
.intro p{{margin:0;max-width:62ch;color:var(--muted);font-size:1.06rem}}
.eyebrow{{margin:0;font-size:.78rem;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--accent)}}
.index{{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}}
.index a{{display:grid;grid-template-columns:11rem 1fr 16rem;gap:8px 24px;padding:14px 0;border-bottom:1px solid var(--line);
color:inherit;text-decoration:none;align-items:baseline}}
.index a:hover .n,.index a:focus-visible .n{{color:var(--accent)}}
.index a:focus-visible{{outline:2px solid var(--accent);outline-offset:2px}}
.index .n{{font-family:var(--display);font-weight:700;font-size:1.1rem}}
.index .c{{color:var(--muted);font-size:.9rem}}
.product{{display:flex;flex-direction:column;gap:24px;padding-top:40px;border-top:2px solid var(--fg)}}
.product header{{display:flex;flex-direction:column;gap:6px}}
h2{{font-size:clamp(1.7rem,4vw,2.4rem);letter-spacing:-.015em;line-height:1.1}}
.line{{margin:0;font-size:1.25rem;font-family:var(--display);font-weight:500;color:var(--signal)}}
.split{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:24px;align-items:center}}
figure{{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:16px;min-width:0}}
{SVG_CSS}
.facts{{display:flex;flex-direction:column;gap:20px;min-width:0}}
.fact{{display:flex;flex-direction:column;gap:2px}}
.fact b{{font-family:var(--display);font-size:1.9rem;line-height:1.1;font-variant-numeric:tabular-nums}}
.fact span{{color:var(--muted);font-size:.95rem;max-width:30ch}}
.cols{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}}
h3{{font-size:.95rem;letter-spacing:.02em;margin-bottom:8px}}
ul{{margin:0;padding-left:1.1em;display:flex;flex-direction:column;gap:6px}}
.cols li{{font-size:.95rem}}
.status{{margin:0;font-size:.9rem;color:var(--muted)}}
footer{{border-top:1px solid var(--line);padding-top:24px;color:var(--muted);font-size:.95rem;max-width:62ch}}
footer b{{color:var(--fg)}}
@media (max-width:760px){{.split,.cols{{grid-template-columns:minmax(0,1fr)}}
.index a{{grid-template-columns:minmax(0,1fr)}} .wrap{{gap:40px;padding-block:32px 56px}}}}
</style>
<div class="wrap">
  <div class="intro">
    <p class="eyebrow">Available to license</p>
    <h1>Five products that make an invisible problem visible.</h1>
    <p>Each one is a small addition to something your company already makes. Each tells the customer something they can&rsquo;t see today, and most of them tell the customer when it&rsquo;s time to buy again.</p>
  </div>
  <ul class="index">{nav}</ul>
  {sections}
  <footer><b>{INVENTOR}</b>, inventor. For a sell sheet, a demonstration or licensing terms on any of these, reply to the email that brought you here.</footer>
</div>
'''

# ---------------------------------------------------------------- sell sheets

def sheet(p):
    facts = "".join(f'<div class="fact"><b>{v}</b><span>{k}</span></div>' for v, k in p["facts"])
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{p["name"]} sell sheet</title>
{FONTS}
<style>
@page{{size:A4;margin:0}}
:root{{{TOKENS_LIGHT}--display:"Space Grotesk",system-ui,sans-serif;--body:"Inter",system-ui,sans-serif}}
*{{box-sizing:border-box}}
html,body{{margin:0}}
body{{width:210mm;height:297mm;padding:16mm 16mm 12mm;background:var(--surface);color:var(--fg);
font:10.5pt/1.5 var(--body);display:flex;flex-direction:column;gap:7mm}}
h1,h2{{font-family:var(--display);margin:0}}
.eyebrow{{margin:0;font-size:8pt;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--accent)}}
h1{{font-size:34pt;line-height:1.05;letter-spacing:-.02em}}
.line{{margin:0;font:500 17pt var(--display);color:var(--signal)}}
figure{{margin:0;border:1px solid var(--line);border-radius:4px;padding:6mm 14mm;background:var(--bg)}}
{SVG_CSS}
.facts{{display:grid;grid-template-columns:1fr 1fr;gap:8mm}}
.fact b{{display:block;font:700 20pt/1.1 var(--display)}}
.fact span{{color:var(--muted);font-size:9.5pt}}
.cols{{display:grid;grid-template-columns:repeat(3,1fr);gap:7mm}}
h2{{font-size:11pt;margin-bottom:2mm}}
ul{{margin:0;padding-left:1.1em}} li{{margin-bottom:1.4mm}}
footer{{margin-top:auto;border-top:1.5pt solid var(--fg);padding-top:4mm;display:flex;justify-content:space-between;
font-size:9.5pt;color:var(--muted)}}
footer b{{color:var(--fg)}}
</style></head><body>
<header><p class="eyebrow">{p["category"]} &middot; available to license</p><h1>{p["name"]}</h1><p class="line">{p["line"]}</p></header>
<figure>{p["fig"]()}</figure>
<div class="facts">{facts}</div>
<div class="cols">
<div><h2>The problem</h2>{ul(p["problem"])}</div>
<div><h2>How it works</h2>{ul(p["how"])}</div>
<div><h2>Why license it</h2>{ul(p["value"])}</div>
</div>
<footer><span><b>{INVENTOR}</b>, inventor</span><span>{p.get("status", "Design concept &middot; Patent pending")}</span><span>Reply to the covering email</span></footer>
</body></html>'''

# ---------------------------------------------------------------- provisional specs

def spec(p):
    paras = "".join(f"<p>{html.escape(t)}</p>" for t in p["detail"])
    variants = "".join(f"<li>{html.escape(t)}</li>" for t in p["variants"])
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{p["name"]} provisional specification</title>
<style>
@page{{size:A4;margin:25mm 22mm}}
:root{{--bg:#fff;--surface:#fff;--wet:#c8c8c8;--fg:#000;--muted:#444;--line:#999;--accent:#555;--signal:#000;
--display:Arial,Helvetica,sans-serif;--body:Arial,Helvetica,sans-serif}}
body{{font:11.5pt/1.6 "Times New Roman",Times,serif;color:#000}}
h1{{font-size:15pt;text-align:center;text-transform:uppercase;margin:0 0 4mm}}
h2{{font-size:11.5pt;text-transform:uppercase;margin:7mm 0 2mm}}
p{{margin:0 0 3mm;text-align:justify}}
.meta{{text-align:center;margin-bottom:8mm}}
.note{{border:1px solid #000;padding:3mm 4mm;font:9.5pt/1.45 Arial,sans-serif;margin-bottom:8mm}}
figure{{margin:6mm 0;page-break-inside:avoid;text-align:center}}
figure svg{{width:150mm;height:auto;margin:0 auto}}
{SVG_CSS}
figcaption{{font-weight:bold;margin-top:2mm}}
</style></head><body>
<div class="note"><b>Draft for the applicant. Delete this box before filing.</b> This is a draft description for an Australian provisional patent application, prepared without a patent attorney. Check every statement is true of what you have actually designed, add anything you have learned from building it, and consider having a registered patent attorney review it. A provisional does not need claims.</div>
<h1>{html.escape(p["name"] if False else "")}{html.escape(TITLES[p["slug"]])}</h1>
<p class="meta">Provisional patent specification<br>Applicant and inventor: {INVENTOR}</p>
<h2>Field</h2><p>This invention relates to {html.escape(p["field"])}.</p>
<h2>Background</h2><p>{html.escape(p["background"])}</p>
<h2>Summary of the invention</h2><p>In one aspect the invention provides: {html.escape(p["summary"][0].lower() + p["summary"][1:])}</p>
<h2>Brief description of the drawing</h2><p>{html.escape(p["figdesc"])}</p>
<h2>Detailed description</h2>{paras}
<h2>Variations</h2><p>The following variations are within the scope of the invention, alone or in combination:</p><ol>{variants}</ol>
<p>The embodiments described are examples only. Features of one embodiment may be combined with features of another.</p>
<figure>{p["fig"]()}<figcaption>Figure 1</figcaption></figure>
</body></html>'''


TITLES = {
    "reproof-tab": "Wear indicator for a water-repellent finish",
    "grit-dots": "Paddle with surface wear indicia",
    "pan-click": "Temperature indicator for a cooking vessel",
    "mug-rail": "Draining accessory for a dishwasher rack",
    "fit-mark": "Sun-protective garment with stretch indicator",
}


def main():
    for d in ("site", "sell-sheets", "filing"):
        (ROOT / d).mkdir(exist_ok=True)
    (ROOT / "site" / "pitch-site.html").write_text(site())
    for p in PRODUCTS:
        (ROOT / "sell-sheets" / f'{p["slug"]}.html').write_text(sheet(p))
        if p["slug"] in TITLES:
            (ROOT / "filing" / f'{p["slug"]}.html').write_text(spec(p))
    print("built", len(PRODUCTS), "products")


if __name__ == "__main__":
    main()
