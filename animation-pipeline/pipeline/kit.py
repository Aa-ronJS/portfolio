#!/usr/bin/env python3
"""The character kit sheet: draw into the template, ingest the image,
get a rigged character.

    python3 pipeline/kit.py template mysheet.png     # open on a phone
    ... draw a character into the boxes (e-pen directly on the image,
        or marker on a printout) ...
    python3 pipeline/kit.py ingest mysheet.jpg myshow/characters/gary

The template carries four black corner squares (so a photographed
print can be straightened; a directly-drawn image passes through) and
the red registration dots already placed — and NO guide art: the
sheet is drawn on digitally, so anything printed inside a draw area
would sit under the strokes and show through semi-transparent paint.
The dots carry the proportions. `ingest` finds
the squares, straightens and cleans the image, cuts out every box,
erases the printed dots, and writes a complete character folder:
parts/*.png, rig.json (skeleton + pivots + face anchors), char.json,
and an assembled body.png. The character walks immediately:

    python3 pipeline/rig.py preview myshow/characters/gary walk.gif

Boxes marked optional may stay empty — they are skipped. Nothing is
mirrored: an empty right-side box means the LEFT drawing stands in for
that side verbatim ("kit.py mirror <character>" builds mirrored right
ARMS as a stopgap — never legs, whose knees would bend backward). Keep
drawings inside their boxes and leave the red dots where they are:
they are the joints.
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

# There are NO ghost guides. Aaron draws on the template directly on
# his phone with a pen, so anything printed inside a draw area sits
# UNDER his strokes and shows through semi-transparent paint — the old
# non-photo-blue ghosts left a blue cast, centre lines and half-
# scrubbed dots in finished characters. Only functional marks remain:
# cell borders and labels (outside the crop), the red joint dots, and
# the corner fiducials. The dots carry all the proportion information
# a drawing needs.
BORDER = (185, 185, 185)
LABEL_INK = (110, 110, 110)

# the header instructions — ingest re-renders this text to erase it by
# position, so template and ingest MUST share the exact string
TIPS = ("draw ONE character into the boxes, thick marker, flat colour"
        "  ·  the red dots are the joints: draw around them, never "
        "move them  ·  give the torso hips — the legs tuck up behind "
        "them  ·  nothing is mirrored: an empty optional box means "
        "the LEFT drawing stands in as-is  ·  draw on this image "
        "directly (or photograph a print flat, all four black "
        "squares in frame), then:  python3 pipeline/kit.py "
        "ingest sheet.jpg characters/<name>")

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
    {"name": "leg_l_upper", "head": [0.414, 0.641],
     "tail": [0.4106, 0.7783]},
    {"name": "leg_l_lower", "head": [0.4106, 0.7783],
     "tail": [0.407, 0.927], "parent": "leg_l_upper"},
    {"name": "leg_r_upper", "head": [0.586, 0.641],
     "tail": [0.5894, 0.7783]},
    {"name": "leg_r_lower", "head": [0.5894, 0.7783],
     "tail": [0.593, 0.927], "parent": "leg_r_upper"},
]
KNEE_F = 0.48   # knee anchor: fraction of the hip->ankle span
FACE = {"bone": "head",
        "eyes": [{"at": [0.4424, 0.2613], "r": 0.017},
                 {"at": [0.5527, 0.2613], "r": 0.017}],
        "mouth": {"at": [0.5, 0.3405], "w": 0.055}}


def inner(box):
    x0, y0, x1, y1 = box
    return (x0 + 16, y0 + 78, x1 - 16, y1 - 16)


def capture(name):
    """The area ingest actually keeps for a cell. Wider than inner():
    all printed marks are erased by position, so the label strip is
    fair game to draw over, and row-1 cells (torso + heads) reach up
    into the header — a wizard hat may poke past the box top (it did).
    inner() still defines the dot geometry; never change that."""
    x0, y0, x1, y1 = CELLS[name][0]
    top = 150 if y0 == 290 else y0 + 2
    return (x0 + 16, top, x1 - 16, y1 - 16)


def cell_dots(name):
    """The two red dots for a cell, top dot first, in sheet pixels."""
    x0, y0, x1, y1 = inner(CELLS[name][0])
    w, h = x1 - x0, y1 - y0
    if name == "torso":
        return (x0 + w / 2, y0 + 0.10 * h), (x0 + w / 2, y0 + 0.88 * h)
    if name.startswith("head"):
        # span capped by the cell's width so a drawn head fits
        half = min(0.44 * h, 0.62 * w)
        cy = y0 + 0.5 * h
        return (x0 + w / 2, cy - half), (x0 + w / 2, cy + half)
    if name.startswith("arm"):
        dx = 0.55 * w if "_r_" in name else 0.45 * w  # room to curve in
        return (x0 + dx, y0 + 0.08 * h), (x0 + dx, y0 + 0.78 * h)
    return (x0 + 0.45 * w, y0 + 0.08 * h), (x0 + 0.45 * w, y0 + 0.80 * h)


def cell_extra_dots(name):
    """The knee anchor on straight-leg boxes: draw the knee AT this dot
    and the leg splits there into thigh + shin with a real joint."""
    if name.startswith("leg") and name.endswith("straight"):
        A, B = cell_dots(name)
        return [(A[0], A[1] + KNEE_F * (B[1] - A[1]))]
    return []


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
    import textwrap
    for i, line in enumerate(textwrap.wrap(TIPS, 118)):
        d.text((240, 156 + i * 35), line, font=_font(28),
               fill=(90, 90, 90))
    for name, (box, optional) in CELLS.items():
        x0, y0, x1, y1 = box
        d.rounded_rectangle(box, radius=18, outline=BORDER, width=4)
        d.text((x0 + 18, y0 + 18), TITLES[name], font=_font(29),
               fill=LABEL_INK)
        A, B = cell_dots(name)
        for (px, py) in [A, B] + cell_extra_dots(name):
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
        for (px, py) in list(cell_dots(name)) + cell_extra_dots(name):
            x0, y0 = int(px) - R, int(py) - R
            win = arr[y0:y0 + 2 * R, x0:x0 + 2 * R]
            wy, wx = np.mgrid[0:win.shape[0], 0:win.shape[1]]
            d2 = (wx - (px - x0)) ** 2 + (wy - (py - y0)) ** 2
            disc = d2 < (2.5 * DOT_R) ** 2
            ring = (d2 >= (2.2 * DOT_R) ** 2) & (d2 < (3.4 * DOT_R) ** 2)
            m = np.median(win[ring], axis=0)
            off = np.linalg.norm(win - m, axis=2) > 0.17
            dots[y0:y0 + 2 * R, x0:x0 + 2 * R] |= disc & off
    if dots.any():
        dots = ndimage.binary_dilation(dots, iterations=3)
        _, idx = ndimage.distance_transform_edt(dots, return_indices=True)
        arr[dots] = arr[idx[0][dots], idx[1][dots]]
    # erase the printed cell borders by POSITION before cleaning: a
    # border dark enough to see forms a closed ink loop, and clean()'s
    # fill-holes would flood every box interior solid (a blank cell
    # then reads as a fully-opaque drawing). Position is exact, so the
    # printed colour no longer matters.
    bmask = Image.new("L", (A4W, A4H), 0)
    bd = ImageDraw.Draw(bmask)
    for name2, (box2, _) in CELLS.items():
        bd.rounded_rectangle(box2, radius=18, outline=255, width=14)
    # ... and the printed TEXT and fiducials the same way: the capture
    # areas include the label strips and the header gap (drawings
    # spill there), so every printed glyph must go. Re-render the
    # exact text into a mask and inpaint from the surroundings — under
    # opaque paint the neighbours are paint, on paper they are paper.
    bd.text((240, 78), "character kit sheet", font=_font(64), fill=255)
    import textwrap
    for i, line in enumerate(textwrap.wrap(TIPS, 118)):
        bd.text((240, 156 + i * 35), line, font=_font(28), fill=255)
    for name2, (box2, _) in CELLS.items():
        bd.text((box2[0] + 18, box2[1] + 18), TITLES[name2],
                font=_font(29), fill=255)
    for cx, cy in FID_C:
        bd.rectangle([cx - FID / 2 - 4, cy - FID / 2 - 4,
                      cx + FID / 2 + 4, cy + FID / 2 + 4], fill=255)
    bm = ndimage.binary_dilation(np.array(bmask) > 0, iterations=3)
    _, tidx = ndimage.distance_transform_edt(bm, return_indices=True)
    arr[bm] = arr[tidx[0][bm], tidx[1][bm]]
    cleaned = clean(Image.fromarray((arr * 255).astype(np.uint8)),
                    paper_cut=args.paper_cut)
    # everything outside the draw areas (labels, borders, fiducials,
    # instructions) is template, not drawing
    alpha = np.array(cleaned.getchannel("A"))
    keep = np.zeros(alpha.shape, dtype=bool)
    for name in CELLS:
        x0, y0, x1, y1 = capture(name)
        keep[y0:y1, x0:x1] = True
    alpha[~keep] = 0
    # scissor cut: a pixel is in the drawing or it isn't. Soft shading,
    # ghost tint bleeding through light digital paint, and drop-shadow
    # halos otherwise survive as translucent veils that let the episode
    # background show through the character.
    alpha = np.where(alpha > 110, 255, 0).astype(np.uint8)
    # despeckle: jpeg noise and inpaint crumbs survive as scattered
    # opaque flecks (worse at a tight --paper-cut); anything smaller
    # than a marker dot is not a drawing
    lab, nlab = ndimage.label(alpha > 0)
    if nlab:
        sizes = np.bincount(lab.ravel())
        alpha[(sizes < 50)[lab]] = 0
    cleaned.putalpha(Image.fromarray(alpha))

    os.makedirs(os.path.join(args.character, "parts"), exist_ok=True)
    pivots, wrote, skipped = {}, [], []
    for name, (box, optional) in CELLS.items():
        x0, y0, x1, y1 = capture(name)
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
        # seal small outline gaps and fill the interior — a leaky
        # outline otherwise leaves the inside of the drawing
        # transparent (a shirt you can see the wall through)
        pa = np.array(part)
        al = pa[..., 3] > 128
        closed = ndimage.binary_closing(al, np.ones((3, 3)),
                                        iterations=12)
        newpx = ndimage.binary_fill_holes(closed) & ~al
        if newpx.any():
            dark = pa[..., :3].sum(axis=2) < 60
            pa[..., 3][newpx] = 255
            pa[..., :3][newpx & dark] = (245, 245, 242)
            part = Image.fromarray(pa)
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
                # translate each leg (upper + lower together) so its
                # hip lands tucked behind the torso bottom
                new_y = (bot - 0.02 * BODY_H) / BODY_H
                for side in ("l", "r"):
                    hip = next(b for b in bones
                               if b["name"] == f"leg_{side}_upper")
                    newx = (l2 + 0.24 * w2 if side == "l"
                            else r2 - 0.24 * w2) / BODY_W
                    dx = newx - hip["head"][0]
                    dy = new_y - hip["head"][1]
                    for b in bones:
                        if b["name"].startswith(f"leg_{side}"):
                            b["head"][0] = round(b["head"][0] + dx, 4)
                            b["head"][1] = round(b["head"][1] + dy, 4)
                            b["tail"][0] = round(b["tail"][0] + dx, 4)
                            b["tail"][1] = round(b["tail"][1] + dy, 4)
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



def cmd_mirror(args):
    """Create explicit right-ARM files by mirroring the left drawings.

    The stopgap until the right-side boxes get drawn: a mirrored arm
    curves correctly toward its own side of the body. Legs are left
    alone on purpose — a mirrored leg bends its knee backward and
    points its shoe against the walk, which is why nothing mirrors
    automatically. Re-run this after re-ingesting a sheet (ingest
    rewrites rig.json and would orphan the mirrored pivots).
    """
    pdir = os.path.join(args.character, "parts")
    rp = os.path.join(args.character, "rig.json")
    with open(rp) as f:
        rig = json.load(f)
    parts = rig.setdefault("parts", {})
    made = []
    for fn in sorted(os.listdir(pdir)):
        stem = os.path.splitext(fn)[0]
        t = stem.split("_")
        if t[0] != "arm" or (len(t) > 1 and t[1] in ("l", "r")):
            continue
        if stem not in parts:
            raise SystemExit(f"{stem} has no pivots in rig.json — this "
                             f"command only works on ingested kits")
        shape = "_".join(t[1:]) or "straight"
        dst = f"arm_r_{shape}"
        Image.open(os.path.join(pdir, fn)) \
            .transpose(Image.FLIP_LEFT_RIGHT) \
            .save(os.path.join(pdir, dst + ".png"))
        e = parts[stem]
        parts[dst] = {"a": [round(1 - e["a"][0], 4), e["a"][1]],
                      "b": [round(1 - e["b"][0], 4), e["b"][1]]}
        made.append(dst)
    with open(rp, "w") as f:
        json.dump(rig, f, indent=2)
    print(f"mirrored {', '.join(made) or 'nothing (no left arm parts)'}",
          file=sys.stderr)

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
    m = sub.add_parser("mirror",
                       help="mirror left arms into explicit right-arm "
                            "files (stopgap until they are drawn)")
    m.add_argument("character", help="ingested character folder")
    m.set_defaults(fn=cmd_mirror)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
