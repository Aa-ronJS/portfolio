"""Thumbnails that look like the ones that win: a cut-out subject on a
bold colour field with a white outline and a soft shadow, a face or an
action, three or four words of condensed type with one word in the
accent colour, everything readable at the 168x94 pixels a phone feed
shows. Two layouts are rendered for every episode and the vision pass
picks one:

  cutout  — subject removed from its background (rembg, if installed)
            and placed over a deep two-tone field, text on the open side
  wash    — the full frame under a colour wash and a dark gradient,
            text bottom-left (the fallback when there is no clean cut)

Everything here is Pillow; rembg is optional and the wash layout needs
nothing but the frame.
"""

import os
import re

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONT_DIRS = [os.path.join(ROOT, "fonts"), "/usr/share/fonts/truetype/dejavu"]
DISPLAY_FONTS = ["Anton-Regular.ttf", "BebasNeue-Regular.ttf", "DejaVuSans-Bold.ttf"]

# deep fields that make skin, white shirts and a yellow accent all pop;
# picked per episode so the channel page is not one colour
FIELDS = [
    ((16, 30, 58), (31, 58, 110)),     # navy
    ((20, 44, 42), (28, 84, 78)),      # deep teal
    ((58, 18, 24), (120, 34, 46)),     # oxblood
    ((26, 22, 48), (62, 44, 110)),     # indigo
    ((40, 30, 12), (96, 66, 20)),      # umber
]


def find_font():
    for d in FONT_DIRS:
        for n in DISPLAY_FONTS:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return p
    return None


def _font(size):
    p = find_font()
    return ImageFont.truetype(p, size) if p else ImageFont.load_default()


def _hex(rgb):
    return tuple(int(rgb[i:i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------- cut-out

_session = None


def cutout(frame):
    """RGBA of the subject with the background removed, or None when
    rembg is not installed or the mask is not worth using."""
    global _session
    try:
        from rembg import new_session, remove
    except Exception:
        return None
    try:
        if _session is None:
            _session = new_session("u2net")
        im = frame.convert("RGB")
        out = remove(im, session=_session, alpha_matting=False)
    except Exception as e:
        print("thumbnail: rembg failed (%s)" % e)
        return None
    alpha = out.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return None
    w, h = out.size
    cover = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) / float(w * h)
    opaque = sum(alpha.histogram()[200:]) / float(w * h)
    # a subject that is nearly the whole frame or nearly nothing is a
    # bad cut; the wash layout handles those
    if cover < 0.08 or opaque > 0.85 or opaque < 0.04:
        return None
    return out


# ---------------------------------------------------------------- text

def _split_words(text):
    return [w for w in text.split() if w]


def _accent_index(words):
    """The word to colour: a number or percentage if there is one, else
    the last word."""
    for i, w in enumerate(words):
        if re.search(r"\d", w):
            return i
    return len(words) - 1


def _layout_lines(draw, words, font, max_w, max_lines):
    """Balanced lines, as in the caption code: the split whose longest
    line is shortest."""
    import itertools

    def width(ws):
        return draw.textbbox((0, 0), " ".join(ws), font=font)[2]
    if width(words) <= max_w:
        return [words]
    best = None
    for n in range(2, max_lines + 1):
        for cuts in itertools.combinations(range(1, len(words)), n - 1):
            b = (0,) + cuts + (len(words),)
            cand = [words[a:c] for a, c in zip(b, b[1:])]
            widths = [width(l) for l in cand]
            if max(widths) <= max_w and (best is None or max(widths) < best[0]):
                best = (max(widths), cand)
        if best:
            return best[1]
    return None


def draw_text(im, text, box, accent, align="left", max_lines=2,
              outline=True, shadow=True):
    """Fit `text` in `box` (x0, y0, x1, y1) as large as it will go, with
    the accent word coloured. Returns the bottom y used."""
    draw = ImageDraw.Draw(im)
    words = _split_words(text.upper())
    if not words:
        return box[1]
    ai = _accent_index(words)
    bw, bh = box[2] - box[0], box[3] - box[1]
    size = int(bh * 0.9)
    lines = None
    while size > 18:
        font = _font(size)
        lines = _layout_lines(draw, words, font, bw, max_lines)
        if lines:
            asc, desc = font.getmetrics()
            lh = int((asc + desc) * 0.92)
            if lh * len(lines) <= bh:
                break
        size -= 4
    if not lines:
        lines = [words]
        font = _font(size)
    asc, desc = font.getmetrics()
    lh = int((asc + desc) * 0.92)
    total_h = lh * len(lines)
    y = box[3] - total_h if align != "top" else box[1]
    k = 0
    for line in lines:
        lw = draw.textbbox((0, 0), " ".join(line), font=font)[2]
        x = box[0] if align == "left" else box[0] + (bw - lw) // 2
        for w in line:
            colour = accent if k == ai else (255, 255, 255)
            k += 1
            if shadow:
                draw.text((x + size // 18, y + size // 18), w, font=font,
                          fill=(0, 0, 0, 160))
            draw.text((x, y), w, font=font, fill=colour,
                      stroke_width=max(2, size // 16) if outline else 0,
                      stroke_fill=(0, 0, 0))
            x += draw.textbbox((0, 0), w + " ", font=font)[2]
        y += lh
    return y


# ---------------------------------------------------------------- layouts

def _field(size, pair, seed=0):
    """A deep two-tone diagonal field with a soft lighter glow where the
    subject will sit, and a faint diagonal texture so it is not flat."""
    w, h = size
    a, b = pair
    base = Image.new("RGB", (w, h), a)
    grad = Image.linear_gradient("L").rotate(35, expand=True).resize((w, h))
    base = Image.composite(Image.new("RGB", (w, h), b), base, grad)
    glow = Image.new("L", (w, h), 0)
    gd = ImageDraw.Draw(glow)
    cx, cy = int(w * 0.72), int(h * 0.55)
    r = int(h * 0.62)
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=110)
    glow = glow.filter(ImageFilter.GaussianBlur(h // 6))
    lighter = tuple(min(255, int(c * 1.55) + 18) for c in b)
    base = Image.composite(Image.new("RGB", (w, h), lighter), base, glow)
    stripes = Image.new("L", (w, h), 0)
    sd = ImageDraw.Draw(stripes)
    for x in range(-h, w + h, 64):
        sd.line([(x, 0), (x + h, h)], fill=255, width=22)
    stripes = stripes.point(lambda v: int(v * 0.045))
    base = Image.composite(Image.new("RGB", (w, h), (255, 255, 255)), base, stripes)
    return base


def _outlined(subject, px, colour=(255, 255, 255)):
    """The subject with a solid outline of `px` pixels and a soft shadow
    behind it, as one RGBA layer."""
    alpha = subject.split()[-1]
    pad = px * 3 + 24
    w, h = subject.size
    layer = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    big = Image.new("L", layer.size, 0)
    big.paste(alpha, (pad, pad))
    ring = big.filter(ImageFilter.MaxFilter(px * 2 + 1))
    shadow = ring.filter(ImageFilter.GaussianBlur(px * 3)).point(lambda v: int(v * 0.55))
    layer.paste(Image.new("RGBA", layer.size, (0, 0, 0, 255)), (px, px * 2), shadow)
    layer.paste(Image.new("RGBA", layer.size, colour + (255,)), (0, 0), ring)
    layer.paste(subject, (pad, pad), subject)
    return layer


def layout_cutout(frame, subject, text, accent, size, field_pair):
    W, H = size
    im = _field(size, field_pair)
    portrait = H > W
    # subject: scale to ~96% of height (portrait: ~55%), hug the right/bottom
    sw, sh = subject.size
    target_h = int(H * (0.56 if portrait else 0.98))
    scale = target_h / float(sh)
    subject = subject.resize((max(1, int(sw * scale)), target_h), Image.LANCZOS)
    layer = _outlined(subject, max(4, H // 120))
    lx = W - layer.size[0] + (layer.size[0] - subject.size[0]) // 2 - int(W * 0.02) \
        if not portrait else (W - layer.size[0]) // 2
    ly = H - layer.size[1] + (layer.size[1] - subject.size[1]) // 2 + int(H * 0.02)
    im.paste(layer, (lx, ly), layer)
    # text on the open side; with a wide subject it rides over the lower
    # third, which the outline keeps legible
    if portrait:
        box = (int(W * 0.06), int(H * 0.05), int(W * 0.94), int(H * 0.40))
        draw_text(im, text, box, accent, align="centre", max_lines=3)
    else:
        # the text gets at least 56% of the width even when the subject is
        # wide; the outline keeps the letters legible where they overlap
        text_w = max(int(W * 0.56), W - subject.size[0] - int(W * 0.08))
        box = (int(W * 0.05), int(H * 0.10), min(int(W * 0.05) + text_w, int(W * 0.68)), int(H * 0.90))
        draw_text(im, text, box, accent, align="left", max_lines=2)
    return im


def layout_wash(frame, text, accent, size, field_pair):
    W, H = size
    im = frame.convert("RGB").resize(size, Image.LANCZOS)
    im = im.filter(ImageFilter.GaussianBlur(0.5))
    # a colour wash toward the field colour, then a bottom gradient so
    # the type sits on something dark
    wash = Image.new("RGB", size, field_pair[0])
    im = Image.blend(im, wash, 0.22)
    shade = Image.new("RGB", size, (0, 0, 0))
    mask = Image.linear_gradient("L").resize(size).point(lambda v: int(v * 0.85))
    im = Image.composite(shade, im, mask)
    # a slight vignette so the eye stays in the middle
    vig = Image.new("L", size, 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-W // 4, -H // 4, W + W // 4, H + H // 4], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(H // 4))
    im = Image.composite(im, Image.blend(im, shade, 0.35), vig)
    portrait = H > W
    if portrait:
        box = (int(W * 0.06), int(H * 0.55), int(W * 0.94), int(H * 0.90))
        draw_text(im, text, box, accent, align="centre", max_lines=3)
    else:
        box = (int(W * 0.05), int(H * 0.40), int(W * 0.78), int(H * 0.92))
        draw_text(im, text, box, accent, align="left", max_lines=2)
    # the accent bar: the one piece of branding
    bar_y = int(H * 0.36) if not portrait else int(H * 0.52)
    ImageDraw.Draw(im).rectangle([int(W * 0.05), bar_y, int(W * 0.05) + int(W * 0.10),
                                  bar_y + max(5, H // 100)], fill=accent)
    return im


def render(frame_path, text, accent_hex, size, seed, out_dir):
    """Both layouts (cut-out when a subject can be lifted) -> list of
    (name, path)."""
    accent = _hex(accent_hex)
    frame = Image.open(frame_path).convert("RGB")
    pair = FIELDS[seed % len(FIELDS)]
    os.makedirs(out_dir, exist_ok=True)
    outs = []
    subject = cutout(frame)
    if subject is not None:
        p = os.path.join(out_dir, "cutout.jpg")
        layout_cutout(frame, subject, text, accent, size, pair).save(p, quality=92)
        outs.append(("cutout", p))
    p = os.path.join(out_dir, "wash.jpg")
    layout_wash(frame, text, accent, size, pair).save(p, quality=92)
    outs.append(("wash", p))
    return outs


def feed_sheet(paths, out):
    """Each candidate at full, feed (168x94) and medium size, to judge
    legibility the way a phone shows it."""
    ims = [Image.open(p).convert("RGB") for p in paths]
    n = len(ims)
    sheet = Image.new("RGB", (1280, n * 380 + 20), (20, 20, 20))
    for i, im in enumerate(ims):
        sheet.paste(im.resize((640, 360)), (10, 10 + i * 380))
        sheet.paste(im.resize((168, 94)), (680, 10 + i * 380))
        sheet.paste(im.resize((336, 189)), (870, 10 + i * 380))
    sheet.save(out, quality=85)
    return out
