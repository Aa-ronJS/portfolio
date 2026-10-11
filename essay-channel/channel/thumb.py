"""Thumbnails built the way the winners build them.

Counted across the top thumbnails of the channels this one competes
with (examples/single-dads/benchmarks/): a face toward the camera with
an expression (26 of 28), cropped chest-up so the head is a third of
the frame (24/28), two to four words at a fifth of the frame height per
line (22/28) with one word boxed or coloured (20/28), a second element
that explains the idea — an object, an arrow, a number (24/28) — and
the real environment behind, blurred and dimmed (27/28). Nothing that
looks like a template.

Layouts, all Pillow:

  hero   — the subject lifted (rembg), cropped head-and-shoulders when
           the pose allows, boosted, outlined, on the blurred and dimmed
           original photo; huge type on the open side, the key word in a
           filled box.
  prop   — hero plus a second cut-out (an object fetched for the
           purpose) and an arrow from the text to the subject.
  wash   — the whole photo under a colour wash and a dark gradient with
           the same type; the fallback when nothing can be lifted.
"""

import math
import os
import re

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONT_DIRS = [os.path.join(ROOT, "fonts"), "/usr/share/fonts/truetype/dejavu"]
DISPLAY_FONTS = ["Anton-Regular.ttf", "BebasNeue-Regular.ttf", "DejaVuSans-Bold.ttf"]

# the tint pulled over the blurred background, per episode, so the
# channel page is not one colour; the type and box colours are fixed
TINTS = [(12, 24, 52), (10, 40, 38), (52, 14, 20), (24, 18, 46), (36, 26, 8)]
BOX_RED = (224, 49, 43)


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
        out = remove(frame.convert("RGB"), session=_session, alpha_matting=False)
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
    if cover < 0.08 or opaque > 0.85 or opaque < 0.04:
        return None
    # trim to where the mask is actually solid, not its faint fringe
    solid = alpha.point(lambda v: 255 if v > 120 else 0).getbbox() or bbox
    return out.crop(solid)


def head_crop(subject):
    """When the subject stands taller than wide, keep the head and
    shoulders — the top ~58% — so the face can be big. A wide pose (a
    push-up, a crouch) is kept whole."""
    w, h = subject.size
    if h > w * 1.15:
        return subject.crop((0, 0, w, int(h * 0.58)))
    return subject


def boost(subject):
    """What every winning thumbnail does to its subject."""
    rgb = subject.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(1.28)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.12)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.04)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    out = rgb.convert("RGBA")
    out.putalpha(subject.split()[-1])
    return out


# ---------------------------------------------------------------- text

def _accent_index(words):
    """The word to box: a number or percentage if there is one, else
    the last word."""
    for i, w in enumerate(words):
        if re.search(r"\d", w):
            return i
    return len(words) - 1


def _layout_lines(draw, words, font, max_w, max_lines):
    """Balanced lines: the split whose longest line is shortest."""
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


def draw_text(im, text, box, accent, align="left", max_lines=2, boxed=True):
    """Fit `text` in `box` as large as it will go: white condensed type
    with a heavy black stroke and shadow, the key word on a filled
    accent box with dark type. Returns the rectangle the text used."""
    draw = ImageDraw.Draw(im)
    words = [w for w in text.upper().split() if w]
    if not words:
        return box
    ai = _accent_index(words)
    # a lone "3" is a stub; box "3 MINUTES" — merge a 1-2 character
    # accent word with the one after it
    if len(words[ai]) <= 2 and ai + 1 < len(words):
        words = words[:ai] + [words[ai] + " " + words[ai + 1]] + words[ai + 2:]
    bw, bh = box[2] - box[0], box[3] - box[1]
    size = int(bh * 0.95)
    lines = None
    while size > 18:
        font = _font(size)
        lines = _layout_lines(draw, words, font, bw * 0.96, max_lines)
        if lines:
            asc, desc = font.getmetrics()
            lh = int((asc + desc) * 0.98)
            if lh * len(lines) <= bh:
                break
        size -= 4
    if not lines:
        lines = [words]
        font = _font(size)
    asc, desc = font.getmetrics()
    lh = int((asc + desc) * 0.98)
    total_h = lh * len(lines)
    y = box[3] - total_h if align == "bottom" else box[1] + (bh - total_h) // 2
    y0 = y
    stroke = max(3, size // 13)
    pad = size // 7
    used_right = box[0]
    k = 0
    for line in lines:
        lw = draw.textbbox((0, 0), " ".join(line), font=font)[2]
        x = box[0] if align in ("left", "bottom") else box[0] + (bw - lw) // 2
        for w in line:
            ww = draw.textbbox((0, 0), w, font=font)[2]
            if k == ai and boxed:
                # a filled box, slightly tilted feel via a drop shadow
                bx0, by0 = x - pad, y + asc // 8
                bx1, by1 = x + ww + pad, y + asc + desc - asc // 10
                draw.rounded_rectangle([bx0 + 6, by0 + 8, bx1 + 6, by1 + 8],
                                       radius=size // 10, fill=(0, 0, 0, 170))
                draw.rounded_rectangle([bx0, by0, bx1, by1], radius=size // 10, fill=accent)
                draw.text((x, y), w, font=font, fill=(20, 20, 20))
            else:
                draw.text((x + size // 16, y + size // 16), w, font=font, fill=(0, 0, 0))
                draw.text((x, y), w, font=font, fill=(255, 255, 255),
                          stroke_width=stroke, stroke_fill=(0, 0, 0))
            k += 1
            x += draw.textbbox((0, 0), w + " ", font=font)[2]
        used_right = max(used_right, x)
        y += lh
    return (box[0], y0, used_right, y)


# ---------------------------------------------------------------- pieces

def backdrop(frame, size, tint):
    """The original photo, filled to the frame, blurred, dimmed and
    tinted, with a soft light where the subject will stand."""
    W, H = size
    im = frame.convert("RGB")
    fw, fh = im.size
    scale = max(W / fw, H / fh)
    im = im.resize((int(fw * scale) + 1, int(fh * scale) + 1), Image.LANCZOS)
    im = im.crop(((im.size[0] - W) // 2, (im.size[1] - H) // 2,
                  (im.size[0] - W) // 2 + W, (im.size[1] - H) // 2 + H))
    im = im.filter(ImageFilter.GaussianBlur(H // 70))
    im = ImageEnhance.Color(im).enhance(0.75)
    im = Image.blend(im, Image.new("RGB", size, tint), 0.45)
    im = ImageEnhance.Brightness(im).enhance(0.72)
    glow = Image.new("L", size, 0)
    gd = ImageDraw.Draw(glow)
    cx, cy, r = int(W * 0.74), int(H * 0.5), int(H * 0.7)
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=120)
    glow = glow.filter(ImageFilter.GaussianBlur(H // 5))
    light = tuple(min(255, c + 90) for c in tint)
    im = Image.composite(Image.new("RGB", size, light), im, glow)
    vig = Image.new("L", size, 0)
    ImageDraw.Draw(vig).ellipse([-W // 5, -H // 5, W + W // 5, H + H // 5], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(H // 4))
    return Image.composite(im, ImageEnhance.Brightness(im).enhance(0.5), vig)


def outlined(subject, px, colour=(255, 255, 255)):
    """The subject with a solid outline and a soft shadow, one layer."""
    alpha = subject.split()[-1]
    pad = px * 3 + 24
    w, h = subject.size
    layer = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    big = Image.new("L", layer.size, 0)
    big.paste(alpha, (pad, pad))
    ring = big.filter(ImageFilter.MaxFilter(px * 2 + 1))
    shadow = ring.filter(ImageFilter.GaussianBlur(px * 3)).point(lambda v: int(v * 0.6))
    layer.paste(Image.new("RGBA", layer.size, (0, 0, 0, 255)), (px, px * 2), shadow)
    layer.paste(Image.new("RGBA", layer.size, colour + (255,)), (0, 0), ring)
    layer.paste(subject, (pad, pad), subject)
    return layer, pad


def place_subject(im, subject, size, portrait, height_frac, right_margin=0.0):
    """Scale the subject to a share of the frame height and set it on
    the right, bottom-anchored. Returns its on-canvas box."""
    W, H = size
    sw, sh = subject.size
    target_h = int(H * height_frac)
    scale = target_h / float(sh)
    tw = max(1, int(sw * scale))
    if tw > W * 0.62 and not portrait:               # a wide pose: cap the width
        scale = W * 0.62 / sw
        tw, target_h = int(W * 0.62), int(sh * scale)
    subject = boost(subject.resize((tw, target_h), Image.LANCZOS))
    layer, pad = outlined(subject, max(3, H // 150))
    if portrait:
        x = (W - tw) // 2
    else:
        x = W - tw - int(W * right_margin)
    y = H - target_h + int(H * 0.015)                 # feet/hem just past the edge
    im.paste(layer, (x - pad, y - pad), layer)
    return (x, y, x + tw, y + target_h)


def arrow(im, start, end, colour, width):
    """A curved arrow from `start` to `end`, the kind the winners draw."""
    draw = ImageDraw.Draw(im)
    (x0, y0), (x1, y1) = start, end
    cx, cy = (x0 + x1) / 2, min(y0, y1) - abs(x1 - x0) * 0.22
    pts = []
    for i in range(33):
        t = i / 32
        x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1
        y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1
        pts.append((x, y))
    for w, c in ((width + 6, (0, 0, 0)), (width, colour)):
        draw.line(pts, fill=c, width=w, joint="curve")
    # head
    ang = math.atan2(y1 - pts[-3][1], x1 - pts[-3][0])
    L = width * 3.2
    head = [(x1, y1),
            (x1 - L * math.cos(ang - 0.5), y1 - L * math.sin(ang - 0.5)),
            (x1 - L * math.cos(ang + 0.5), y1 - L * math.sin(ang + 0.5))]
    draw.polygon(head, fill=(0, 0, 0))
    inner = [(x1 - 4 * math.cos(ang), y1 - 4 * math.sin(ang)),
             (x1 - (L - 7) * math.cos(ang - 0.45), y1 - (L - 7) * math.sin(ang - 0.45)),
             (x1 - (L - 7) * math.cos(ang + 0.45), y1 - (L - 7) * math.sin(ang + 0.45))]
    draw.polygon(inner, fill=colour)


# ---------------------------------------------------------------- layouts

def layout_hero(frame, subject, text, accent, size, tint, prop=None):
    W, H = size
    portrait = H > W
    im = backdrop(frame, size, tint)
    subj = head_crop(subject)
    box = place_subject(im, subj, size, portrait,
                        0.62 if portrait else 1.02, right_margin=0.0)
    if portrait:
        tbox = (int(W * 0.05), int(H * 0.05), int(W * 0.95), int(H * 0.36))
        used = draw_text(im, text, tbox, accent, align="centre", max_lines=3)
        if prop is not None:
            _place_prop(im, prop, size, int(W * 0.06), int(H * 0.64), int(H * 0.26))
        return im
    # the type may run under the subject's shoulder: the outline keeps
    # both legible, and the winners do exactly this
    right = min(box[0] + int(W * 0.16), int(W * 0.74))
    if prop is not None:
        # text high, the object low, the face right: the Peptides layout
        tbox = (int(W * 0.045), int(H * 0.05), max(right, int(W * 0.58)), int(H * 0.56))
        used = draw_text(im, text, tbox, accent, align="left", max_lines=2)
        pbox = _place_prop(im, prop, size, int(W * 0.05),
                           int(H * 0.60), int(H * 0.37))
        arrow(im, (pbox[2] + int(W * 0.015), pbox[1] + (pbox[3] - pbox[1]) // 2),
              (box[0] + int((box[2] - box[0]) * 0.28), box[1] + int((box[3] - box[1]) * 0.55)),
              accent, max(8, H // 70))
    else:
        tbox = (int(W * 0.045), int(H * 0.10), max(right, int(W * 0.56)), int(H * 0.90))
        used = draw_text(im, text, tbox, accent, align="left", max_lines=2)
        gap = box[0] - used[2]
        if gap > W * 0.06:
            arrow(im, (used[2] + int(W * 0.015), used[3] - int(H * 0.10)),
                  (box[0] + int((box[2] - box[0]) * 0.30), box[1] + int((box[3] - box[1]) * 0.45)),
                  accent, max(8, H // 70))
    return im


def _place_prop(im, prop, size, x, y, target):
    """An object cut-out, boosted and outlined, scaled so its longer side
    is `target` pixels, top-left at (x, y). Returns its box."""
    W, H = size
    pw, ph = prop.size
    scale = target / float(max(pw, ph))
    prop = boost(prop.resize((max(1, int(pw * scale)), max(1, int(ph * scale))), Image.LANCZOS))
    layer, pad = outlined(prop, max(3, H // 180))
    im.paste(layer, (x - pad, y - pad), layer)
    return (x, y, x + prop.size[0], y + prop.size[1])


def layout_wash(frame, text, accent, size, tint):
    W, H = size
    im = frame.convert("RGB")
    fw, fh = im.size
    scale = max(W / fw, H / fh)
    im = im.resize((int(fw * scale) + 1, int(fh * scale) + 1), Image.LANCZOS)
    im = im.crop(((im.size[0] - W) // 2, (im.size[1] - H) // 2,
                  (im.size[0] - W) // 2 + W, (im.size[1] - H) // 2 + H))
    im = ImageEnhance.Color(im).enhance(1.2)
    im = ImageEnhance.Contrast(im).enhance(1.1)
    im = Image.blend(im, Image.new("RGB", size, tint), 0.18)
    shade = Image.new("RGB", size, (0, 0, 0))
    mask = Image.linear_gradient("L").resize(size).point(lambda v: int(v * 0.85))
    im = Image.composite(shade, im, mask)
    portrait = H > W
    if portrait:
        tbox = (int(W * 0.05), int(H * 0.56), int(W * 0.95), int(H * 0.92))
        draw_text(im, text, tbox, accent, align="centre", max_lines=3)
    else:
        tbox = (int(W * 0.045), int(H * 0.44), int(W * 0.80), int(H * 0.95))
        draw_text(im, text, tbox, accent, align="bottom", max_lines=2)
    return im


def render(frame_path, text, accent_hex, size, seed, out_dir, prop_path=None):
    """Every layout this frame allows -> list of (name, path)."""
    accent = _hex(accent_hex)
    frame = Image.open(frame_path).convert("RGB")
    tint = TINTS[seed % len(TINTS)]
    os.makedirs(out_dir, exist_ok=True)
    outs = []
    subject = cutout(frame)
    if subject is not None:
        p = os.path.join(out_dir, "hero.jpg")
        layout_hero(frame, subject, text, accent, size, tint).save(p, quality=92)
        outs.append(("hero", p))
        if prop_path and os.path.exists(prop_path):
            prop = cutout(Image.open(prop_path).convert("RGB"))
            if prop is not None:
                p = os.path.join(out_dir, "prop.jpg")
                layout_hero(frame, subject, text, accent, size, tint, prop=prop).save(p, quality=92)
                outs.append(("prop", p))
    p = os.path.join(out_dir, "wash.jpg")
    layout_wash(frame, text, accent, size, tint).save(p, quality=92)
    outs.append(("wash", p))
    return outs


def feed_sheet(paths, out):
    """Each candidate at full, feed (168x94) and medium size."""
    ims = [Image.open(p).convert("RGB") for p in paths]
    n = len(ims)
    sheet = Image.new("RGB", (1280, n * 380 + 20), (20, 20, 20))
    for i, im in enumerate(ims):
        sheet.paste(im.resize((640, 360)), (10, 10 + i * 380))
        sheet.paste(im.resize((168, 94)), (680, 10 + i * 380))
        sheet.paste(im.resize((336, 189)), (870, 10 + i * 380))
    sheet.save(out, quality=85)
    return out
