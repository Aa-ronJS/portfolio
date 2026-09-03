#!/usr/bin/env python3
"""The character kit sheet: print a template, draw into it, photograph
it, get a rigged character.

    python3 pipeline/kit.py template mysheet.pdf     # print this (A4)
    ... draw a character into the boxes, marker on paper ...
    python3 pipeline/kit.py ingest photo.jpg myshow/characters/gary

The template carries four black corner squares (so the photo can be
straightened automatically), a pale blue ghost of each part in the
house proportions (draw over it or just near it — only the dots
matter), and the red registration dots already placed. `ingest` finds
the squares, straightens and cleans the photo, cuts out every box,
erases the printed dots, and writes a complete character folder:
parts/*.png, rig.json (skeleton + pivots + face anchors), char.json,
and an assembled body.png. The character walks immediately:

    python3 pipeline/rig.py preview myshow/characters/gary walk.gif

Boxes marked optional may stay empty — they are skipped. Draw the LEFT
arm and leg only; the right side is mirrored. Keep drawings inside
their boxes and leave the red dots where they are: they are the joints.
"""

import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ingest import clean

# ---------------------------------------------------------------- layout
# A4 at 300dpi. Everything below is in template pixels.

A4W, A4H = 2480, 3508
FID = 90                       # fiducial square size
FID_C = [(115, 115), (A4W - 115, 115),
         (115, A4H - 115), (A4W - 115, A4H - 115)]   # centres
DOT_R = 13                     # printed registration dot radius

GHOST_FILL = (214, 234, 241)   # non-photo blue: vanishes on ingest
GHOST_LINE = (188, 219, 231)
LABEL_INK = (110, 110, 110)

# name -> (outer box, optional). Inner draw area trims the label strip.
# Every RIGHT-side box is optional: nothing is ever mirrored, so an
# empty right box means the left drawing stands in for it verbatim.
CELLS = {
    "torso":          ((100, 290, 660, 1080), False),
    "head":           ((690, 290, 1090, 1080), False),
    "head_talk":      ((1120, 290, 1520, 1080), True),
    "head_blink":     ((1550, 290, 1950, 1080), True),
    "head_angry":     ((1980, 290, 2380, 1080), True),
    "arm_straight":   ((100, 1110, 640, 1840), False),
    "arm_bent":       ((680, 1110, 1220, 1840), True),
    "arm_point":      ((1260, 1110, 1800, 1840), True),
    "arm_pocket":     ((1840, 1110, 2380, 1840), True),
    "arm_r_straight": ((100, 1870, 640, 2600), True),
    "arm_r_bent":     ((680, 1870, 1220, 2600), True),
    "arm_r_point":    ((1260, 1870, 1800, 2600), True),
    "arm_r_pocket":   ((1840, 1870, 2380, 2600), True),
    "leg_straight":   ((100, 2630, 640, 3310), False),
    "leg_bent":       ((680, 2630, 1220, 3310), False),
    "leg_r_straight": ((1260, 2630, 1800, 3310), True),
    "leg_r_bent":     ((1840, 2630, 2380, 3310), True),
}

TITLES = {
    "torso": "torso + hips — no head/limbs",
    "head": "head — mouth closed",
    "head_talk": "head — talk (optional)",
    "head_blink": "head — blink (optional)",
    "head_angry": "head — angry (optional)",
    "arm_straight": "LEFT arm — relaxed",
    "arm_bent": "LEFT arm — bent (optional)",
    "arm_point": "LEFT arm — pointing (optional)",
    "arm_pocket": "LEFT arm — in pocket (optional)",
    "arm_r_straight": "RIGHT arm — relaxed (optional)",
    "arm_r_bent": "RIGHT arm — bent (optional)",
    "arm_r_point": "RIGHT arm — pointing (optional)",
    "arm_r_pocket": "RIGHT arm — in pocket (optional)",
    "leg_straight": "LEFT leg — standing",
    "leg_bent": "LEFT leg — knee bent",
    "leg_r_straight": "RIGHT leg — standing (optional)",
    "leg_r_bent": "RIGHT leg — knee bent (optional)",
}

# the character every sheet maps onto (bones normalised to body.png)
BODY_W, BODY_H = 980, 1540
BONES = [
    {"name": "torso", "head": [0.5, 0.636], "tail": [0.5, 0.395]},
    {"name": "head", "head": [0.5, 0.395], "tail": [0.5, 0.164],
     "parent": "torso"},
    {"name": "arm_l", "head": [0.363, 0.442], "tail": [0.331, 0.629],
     "parent": "torso"},
    {"name": "arm_r", "head": [0.637, 0.442], "tail": [0.669, 0.629],
     "parent": "torso"},
    {"name": "leg_l", "head": [0.414, 0.641], "tail": [0.407, 0.927]},
    {"name": "leg_r", "head": [0.586, 0.641], "tail": [0.593, 0.927]},
]
FACE = {"bone": "head",
        "eyes": [{"at": [0.4424, 0.2613], "r": 0.017},
                 {"at": [0.5527, 0.2613], "r": 0.017}],
        "mouth": {"at": [0.5, 0.3405], "w": 0.055}}


def inner(box):
    x0, y0, x1, y1 = box
    return (x0 + 16, y0 + 78, x1 - 16, y1 - 16)


def cell_dots(name):
    """The two red dots for a cell, top dot first, in sheet pixels."""
    x0, y0, x1, y1 = inner(CELLS[name][0])
    w, h = x1 - x0, y1 - y0
    if name == "torso":
        return (x0 + w / 2, y0 + 0.10 * h), (x0 + w / 2, y0 + 0.88 * h)
    if name.startswith("head"):
        # span capped by the cell's width so the face ghost fits
        half = min(0.44 * h, 0.62 * w)
        cy = y0 + 0.5 * h
        return (x0 + w / 2, cy - half), (x0 + w / 2, cy + half)
    if name.startswith("arm"):
        dx = 0.55 * w if "_r_" in name else 0.45 * w  # room to curve in
        return (x0 + dx, y0 + 0.08 * h), (x0 + dx, y0 + 0.78 * h)
    return (x0 + 0.45 * w, y0 + 0.08 * h), (x0 + 0.45 * w, y0 + 0.80 * h)


# ---------------------------------------------------------------- ghosts

def _capsule(d, a, b, r, fill, line):
    ax, ay = a
    bx, by = b
    import math
    L = math.hypot(bx - ax, by - ay) or 1.0
    nx, ny = (by - ay) / L * r, -(bx - ax) / L * r
    d.polygon([(ax + nx, ay + ny), (bx + nx, by + ny),
               (bx - nx, by - ny), (ax - nx, ay - ny)], fill=fill)
    for cx, cy in (a, b):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    d.line([a, b], fill=line, width=3)


def draw_ghost(d, name, A, B):
    """Pale silhouette between the dots: proportions, not style."""
    span = B[1] - A[1]
    cx = A[0]
    F, L = GHOST_FILL, GHOST_LINE
    if name == "torso":
        # neck stub above the top dot, body, and a pelvis wrapping past
        # the hip dot — the legs tuck up behind it, so their joints and
        # tops never show while they swing
        d.rounded_rectangle([cx - 0.16 * span, A[1] - 0.10 * span,
                             cx + 0.16 * span, A[1] + 0.06 * span],
                            radius=20, fill=F)
        d.rounded_rectangle([cx - 0.42 * span, A[1] + 0.04 * span,
                             cx + 0.42 * span, B[1] - 0.02 * span],
                            radius=80, fill=F, outline=L, width=3)
        d.rounded_rectangle([cx - 0.36 * span, B[1] - 0.06 * span,
                             cx + 0.36 * span, B[1] + 0.13 * span],
                            radius=60, fill=F, outline=L, width=3)
    elif name.startswith("head"):
        d.ellipse([cx - 0.36 * span, A[1] + 0.04 * span,
                   cx + 0.36 * span, B[1] - 0.03 * span],
                  fill=F, outline=L, width=3)
        ey = A[1] + 0.42 * span
        for ox in (-0.158, 0.145):
            ex = cx + ox * span
            r = 0.073 * span
            if name == "head_blink":
                d.arc([ex - r, ey - r, ex + r, ey + r], 20, 160,
                      fill=L, width=4)
            else:
                d.ellipse([ex - r, ey - r, ex + r, ey + r],
                          outline=L, width=4)
            if name == "head_angry":
                s = -1 if ox < 0 else 1
                d.line([ex - s * r, ey - 1.5 * r, ex + s * r, ey - 2.1 * r],
                       fill=L, width=4)
        my = A[1] + 0.763 * span
        mw = 0.237 * span
        if name == "head_talk":
            d.ellipse([cx - mw / 2, my - 0.06 * span,
                       cx + mw / 2, my + 0.06 * span], outline=L, width=4)
        else:
            d.line([cx - mw / 2, my, cx + mw / 2, my], fill=L, width=4)
    elif name.startswith("arm"):
        r = 0.085 * span
        # a bent forearm crosses TOWARD the body: screen-right for the
        # left arm, screen-left for the right arm (nothing is mirrored,
        # so each side's ghost shows its own curve)
        sgn = -1 if "_r_" in name else 1
        if name.endswith("bent"):
            elbow = (cx, A[1] + 0.55 * span)
            _capsule(d, A, elbow, r, F, L)
            _capsule(d, elbow, (cx + sgn * 0.5 * span,
                                A[1] + 0.62 * span), r, F, L)
        elif name.endswith("pocket"):
            _capsule(d, A, (cx, A[1] + 0.55 * span), r, F, L)
            d.line([cx - 2.2 * r, A[1] + 0.56 * span,
                    cx + 2.2 * r, A[1] + 0.58 * span], fill=L, width=5)
        else:
            _capsule(d, A, B, r, F, L)
            hand = (B[0], B[1] + 0.09 * span)
            d.ellipse([hand[0] - 1.2 * r, B[1],
                       hand[0] + 1.2 * r, hand[1] + 0.02 * span], fill=F)
            if name.endswith("point"):
                d.polygon([(hand[0] - 0.6 * r, hand[1]),
                           (hand[0], hand[1] + 0.14 * span),
                           (hand[0] + 0.6 * r, hand[1])], fill=F)
    else:  # legs — same direction on BOTH sides: knee and toe forward
        r = 0.10 * span
        if name.endswith("bent"):
            knee = (cx + 0.30 * span, A[1] + 0.48 * span)
            _capsule(d, A, knee, r, F, L)
            _capsule(d, knee, (cx + 0.10 * span, B[1]), r, F, L)
            shoe_x = cx + 0.10 * span
        else:
            _capsule(d, A, B, r, F, L)
            shoe_x = cx
        # toe points the way the knee bends — the walk direction
        d.ellipse([shoe_x - 0.14 * span, B[1] - 0.02 * span,
                   shoe_x + 0.34 * span, B[1] + 0.11 * span], fill=F)


# ---------------------------------------------------------------- template

def _font(size):
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "..", "fonts", "satoshi-var.ttf")
    try:
        f = ImageFont.truetype(p, size)
        f.set_variation_by_axes([600])
        return f
    except OSError:
        return ImageFont.load_default(size)


def cmd_template(args):
    im = Image.new("RGB", (A4W, A4H), (255, 255, 255))
    d = ImageDraw.Draw(im)
    for cx, cy in FID_C:
        d.rectangle([cx - FID / 2, cy - FID / 2,
                     cx + FID / 2, cy + FID / 2], fill=(10, 10, 10))
    d.text((240, 78), "character kit sheet", font=_font(64),
           fill=(20, 20, 20))
    tips = ("draw ONE character into the boxes, thick marker, flat colour"
            "  ·  the red dots are the joints: draw around them, never "
            "move them  ·  give the torso hips — the legs tuck up behind "
            "them  ·  nothing is mirrored: an empty optional box means "
            "the LEFT drawing stands in as-is  ·  photograph flat, "
            "all four black squares in frame, then:  python3 "
            "pipeline/kit.py ingest photo.jpg characters/<name>")
    import textwrap
    for i, line in enumerate(textwrap.wrap(tips, 118)):
        d.text((240, 156 + i * 35), line, font=_font(28),
               fill=(90, 90, 90))
    for name, (box, optional) in CELLS.items():
        x0, y0, x1, y1 = box
        d.rounded_rectangle(box, radius=18, outline=GHOST_LINE, width=4)
        d.text((x0 + 18, y0 + 18), TITLES[name], font=_font(29),
               fill=LABEL_INK)
        A, B = cell_dots(name)
        draw_ghost(d, name, A, B)
        for (px, py) in (A, B):
            d.ellipse([px - DOT_R, py - DOT_R, px + DOT_R, py + DOT_R],
                      fill=(225, 30, 30))
    if args.out.lower().endswith(".pdf"):
        im.save(args.out, resolution=300.0)
    else:
        im.save(args.out, dpi=(300, 300))
    print(f"wrote {args.out}  (A4, print at 100% scale)", file=sys.stderr)


# ---------------------------------------------------------------- ingest

def _find_fiducials(im):
    """Centres of the four corner squares in photo pixels, TL TR BL BR."""
    from scipy import ndimage
    k = 1200 / max(im.size)
    small = im.resize((max(1, round(im.width * k)),
                       max(1, round(im.height * k))), Image.BILINEAR)
    g = np.asarray(small.convert("L")).astype(np.float32) / 255.0
    dark = g < np.median(g) * 0.55
    lab, n = ndimage.label(dark)
    if not n:
        raise SystemExit("no dark marks found — is the sheet in frame?")
    sizes = ndimage.sum(dark, lab, range(1, n + 1))
    H, W = g.shape
    cands = []
    for i in range(n):
        if not 25 < sizes[i] < 0.02 * H * W:
            continue
        ys, xs = np.nonzero(lab == i + 1)
        bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        if not 0.4 < bw / bh < 2.5 or sizes[i] < 0.4 * bw * bh:
            continue  # want compact, filled, squarish blobs
        cands.append((xs.mean(), ys.mean()))
    out = []
    for cx, cy in [(0, 0), (W, 0), (0, H), (W, H)]:
        if not cands:
            raise SystemExit("couldn't find the four corner squares — "
                             "keep the whole sheet in frame, even light")
        best = min(cands, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)
        if (best[0] - cx) ** 2 + (best[1] - cy) ** 2 > (0.5 * max(H, W)) ** 2:
            raise SystemExit("corner squares too far from the photo "
                             "corners — fill the frame with the sheet")
        out.append((best[0] / k, best[1] / k))
    if len(set(out)) < 4:
        raise SystemExit("corner squares confused — retake the photo "
                         "with the sheet filling the frame")
    return out


def _warp_to_sheet(im, fids):
    """Perspective-correct the photo onto the canonical A4 canvas."""
    src = np.array(fids, dtype=np.float64)          # photo px
    dst = np.array(FID_C, dtype=np.float64)         # template px
    M, b = [], []
    for (X, Y), (x, y) in zip(dst, src):
        M.append([X, Y, 1, 0, 0, 0, -x * X, -x * Y]); b.append(x)
        M.append([0, 0, 0, X, Y, 1, -y * X, -y * Y]); b.append(y)
    coeffs = np.linalg.lstsq(np.array(M), np.array(b), rcond=None)[0]
    return im.transform((A4W, A4H), Image.PERSPECTIVE, tuple(coeffs),
                        resample=Image.BICUBIC)


def cmd_ingest(args):
    im = ImageOps.exif_transpose(Image.open(args.photo)).convert("RGB")
    sheet = _warp_to_sheet(im, _find_fiducials(im))
    arr = np.asarray(sheet).astype(np.float32) / 255.0
    bpx = int(A4H * 0.02)
    paper = np.median(np.concatenate([
        arr[:bpx].reshape(-1, 3), arr[-bpx:].reshape(-1, 3)]), axis=0)
    r, g, b2 = arr[..., 0], arr[..., 1], arr[..., 2]
    lum = arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    ghostish = (lum > 0.68) & (b2 - r > 0.03) & \
               (arr.max(axis=2) - arr.min(axis=2) < 0.30)
    arr[ghostish] = paper
    # scrub the printed dots. A dot's exact position is known; what
    # colour it comes out is not — bright red on paper, maroon under
    # translucent paint, near-black in a photo's shadow — so inside
    # each dot disc, anything that DIFFERS from the disc's surrounding
    # colour is the dot, and gets filled from those surroundings (ink
    # if it sits inside a drawing, paper if on paper). Ink drawn over a
    # dot matches its surroundings and stays.
    from scipy import ndimage
    dots = np.zeros(arr.shape[:2], dtype=bool)
    R = int(3.4 * DOT_R) + 2
    for name in CELLS:
        for (px, py) in cell_dots(name):
            x0, y0 = int(px) - R, int(py) - R
            win = arr[y0:y0 + 2 * R, x0:x0 + 2 * R]
            wy, wx = np.mgrid[0:win.shape[0], 0:win.shape[1]]
            d2 = (wx - (px - x0)) ** 2 + (wy - (py - y0)) ** 2
            disc = d2 < (2.0 * DOT_R) ** 2
            ring = (d2 >= (2.2 * DOT_R) ** 2) & (d2 < (3.4 * DOT_R) ** 2)
            m = np.median(win[ring], axis=0)
            off = np.linalg.norm(win - m, axis=2) > 0.17
            dots[y0:y0 + 2 * R, x0:x0 + 2 * R] |= disc & off
    if dots.any():
        dots = ndimage.binary_dilation(dots, iterations=2)
        _, idx = ndimage.distance_transform_edt(dots, return_indices=True)
        arr[dots] = arr[idx[0][dots], idx[1][dots]]
    cleaned = clean(Image.fromarray((arr * 255).astype(np.uint8)),
                    paper_cut=args.paper_cut)
    # everything outside the draw areas (labels, borders, fiducials,
    # instructions) is template, not drawing
    alpha = np.array(cleaned.getchannel("A"))
    keep = np.zeros(alpha.shape, dtype=bool)
    for name in CELLS:
        x0, y0, x1, y1 = inner(CELLS[name][0])
        keep[y0:y1, x0:x1] = True
    alpha[~keep] = 0
    # scissor cut: a pixel is in the drawing or it isn't. Soft shading,
    # ghost tint bleeding through light digital paint, and drop-shadow
    # halos otherwise survive as translucent veils that let the episode
    # background show through the character.
    alpha = np.where(alpha > 110, 255, 0).astype(np.uint8)
    cleaned.putalpha(Image.fromarray(alpha))

    os.makedirs(os.path.join(args.character, "parts"), exist_ok=True)
    pivots, wrote, skipped = {}, [], []
    for name, (box, optional) in CELLS.items():
        x0, y0, x1, y1 = inner(box)
        cell = cleaned.crop((x0, y0, x1, y1))
        a = np.array(cell.getchannel("A"))
        if (a > 24).sum() < 0.004 * a.size:
            skipped.append(name)
            continue
        ys, xs = np.nonzero(a > 24)
        pad = 12
        cx0, cy0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
        cx1 = min(cell.width, xs.max() + 1 + pad)
        cy1 = min(cell.height, ys.max() + 1 + pad)
        part = cell.crop((cx0, cy0, cx1, cy1))
        A, B = cell_dots(name)
        pivots[name] = {
            "a": [round((A[0] - x0 - cx0) / part.width, 4),
                  round((A[1] - y0 - cy0) / part.height, 4)],
            "b": [round((B[0] - x0 - cx0) / part.width, 4),
                  round((B[1] - y0 - cy0) / part.height, 4)]}
        part.save(os.path.join(args.character, "parts", name + ".png"))
        wrote.append(name)
    for need in ("torso", "head", "arm_straight", "leg_straight"):
        if need not in wrote:
            raise SystemExit(f"the {need} box looks empty — it's "
                             f"required. Redraw or retake the photo "
                             f"(brighter, flatter) and rerun.")
    import copy
    bones = copy.deepcopy(BONES)
    with open(os.path.join(args.character, "rig.json"), "w") as f:
        json.dump({"joint_radius": 0.0, "bones": bones, "face": FACE,
                   "parts": pivots}, f, indent=2)

    # fit the shoulders to the torso that was actually drawn: the
    # canonical attach points assume the ghost's width, and a narrower
    # torso leaves the arms (and their pocket stubs) floating in air
    from rig import Rig
    stub = Image.new("RGBA", (BODY_W, BODY_H), (0, 0, 0, 0))
    stub.save(os.path.join(args.character, "body.png"))
    rig = Rig(args.character, {"body": stub})
    timg, (tox, toy) = rig.parts["torso"]["default"]["body"]
    ta = np.array(timg.getchannel("A")) > 24
    sh_y = int(0.442 * BODY_H) - toy
    band = ta[max(0, sh_y - 20):sh_y + 20]
    refit = False
    shape_rot = {}
    if band.any():
        cols = np.nonzero(band.any(axis=0))[0]
        left, right = tox + cols.min(), tox + cols.max()
        w = right - left
        if w > 0.12 * BODY_W:
            refit = True
            for b in bones:
                if b["name"].startswith("arm"):
                    old = b["head"][0]
                    new = (left + 0.15 * w if b["name"] == "arm_l"
                           else right - 0.15 * w) / BODY_W
                    b["head"][0] = round(new, 4)
                    b["tail"][0] = round(b["tail"][0] + new - old, 4)
    # tuck the legs up behind the torso's drawn bottom edge: without a
    # shared pelvis the leg tops (and their joints) show in every step
    rows = np.nonzero(ta.any(axis=1))[0]
    if len(rows):
        bot = toy + rows.max()
        # measure above the bottom taper — rounded corners lie about
        # the torso's true width
        band2 = ta[max(0, rows.max() - 90):max(1, rows.max() - 15)]
        cols2 = np.nonzero(band2.any(axis=0))[0]
        if len(cols2):
            l2, r2 = tox + cols2.min(), tox + cols2.max()
            w2 = r2 - l2
            if w2 > 0.12 * BODY_W and bot > 0.4 * BODY_H:
                refit = True
                new_y = (bot - 0.02 * BODY_H) / BODY_H
                for b in bones:
                    if b["name"].startswith("leg"):
                        dy = new_y - b["head"][1]
                        b["head"][1] = round(new_y, 4)
                        b["tail"][1] = round(b["tail"][1] + dy, 4)
                        newx = (l2 + 0.24 * w2 if b["name"] == "leg_l"
                                else r2 - 0.24 * w2) / BODY_W
                        dx = newx - b["head"][0]
                        b["head"][0] = round(newx, 4)
                        b["tail"][0] = round(b["tail"][0] + dx, 4)
                # aim each pocket arm at a pocket anchor on the pelvis,
                # so the stub swings INTO the torso instead of hanging
                # in the air beside it
                import math as _m
                for b in bones:
                    if not b["name"].startswith("arm"):
                        continue
                    sx, sy = b["head"][0] * BODY_W, b["head"][1] * BODY_H
                    vx = (b["tail"][0] - b["head"][0]) * BODY_W
                    vy = (b["tail"][1] - b["head"][1]) * BODY_H
                    tx = l2 + 0.20 * w2 if b["name"] == "arm_l" \
                        else r2 - 0.20 * w2
                    ty = bot - 0.06 * BODY_H
                    delta = _m.degrees(_m.atan2(ty - sy, tx - sx)
                                       - _m.atan2(vy, vx))
                    shape_rot[b["name"]] = {"pocket": round(delta, 1)}
    if refit:
        with open(os.path.join(args.character, "rig.json"), "w") as f:
            json.dump({"joint_radius": 0.0, "bones": bones,
                       "face": FACE, "parts": pivots,
                       "shape_rot": shape_rot}, f, indent=2)
        rig = Rig(args.character, {"body": stub})

    # assemble body.png by posing the kit at rest
    posed, pad = rig.pose({})
    body = posed.crop((pad, pad, pad + BODY_W, pad + BODY_H))
    body.save(os.path.join(args.character, "body.png"))
    a = np.array(body.getchannel("A"))
    ys, xs = np.nonzero(a > 24)
    anchor_y = round(float(ys.max()) / BODY_H, 3) if len(ys) else 1.0
    with open(os.path.join(args.character, "char.json"), "w") as f:
        json.dump({"anchor": [0.5, anchor_y], "world_height": 1.0,
                   "flip_to_walk": True}, f, indent=2)
    name = os.path.basename(args.character.rstrip("/"))
    print(f"wrote {args.character}: parts {', '.join(wrote)}"
          + (f" (skipped empty: {', '.join(skipped)})" if skipped else ""),
          file=sys.stderr)
    print(f"try it:  python3 pipeline/rig.py preview "
          f"{args.character} {name}-walk.gif --clip walk", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("template", help="write the printable A4 sheet")
    t.add_argument("out", help="output .pdf (print this) or .png")
    t.set_defaults(fn=cmd_template)
    g = sub.add_parser("ingest",
                       help="photo of a filled sheet -> character folder")
    g.add_argument("photo")
    g.add_argument("character", help="character folder to create")
    g.add_argument("--paper-cut", type=float, default=0.14)
    g.set_defaults(fn=cmd_ingest)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
