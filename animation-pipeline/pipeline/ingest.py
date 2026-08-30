#!/usr/bin/env python3
"""Turn a photo or scan of a drawing into a clean transparent PNG.

Draw on white paper with strong marker lines and flat colour, photograph it
in even light, then:

    python3 pipeline/ingest.py IMG_4207.jpg characters/gary/body.png

What it does: estimates the paper colour from the image border, divides it
out (so uneven phone lighting goes away), makes anything close to paper
transparent, snaps near-black lines to pure black, and boosts the colours
so they read as flat fills.

Mouth-flap variants: draw body and talk versions on separate sheets framed
the same way, then ingest BOTH with --no-crop so they stay pixel-aligned:

    python3 pipeline/ingest.py body.jpg characters/gary/body.png --no-crop
    python3 pipeline/ingest.py talk.jpg characters/gary/talk.png --no-crop

If you draw digitally (Procreate etc.) just export PNGs with transparency
straight into the character folder and skip this tool entirely.
"""

import argparse

import numpy as np
from PIL import Image, ImageFilter, ImageOps


def ingest(src, dst, max_dim=1600, crop=True, feather=1.2,
           paper_cut=0.14, line_cut=0.35, fill_holes=True):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    if max(im.size) > max_dim:
        k = max_dim / max(im.size)
        im = im.resize((round(im.width * k), round(im.height * k)),
                       Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255.0

    # Paper colour = median of the outer 4% border on each side.
    b = max(2, int(min(a.shape[:2]) * 0.04))
    border = np.concatenate([
        a[:b].reshape(-1, 3), a[-b:].reshape(-1, 3),
        a[:, :b].reshape(-1, 3), a[:, -b:].reshape(-1, 3)])
    paper = np.median(border, axis=0)

    # Divide out the paper: uneven lighting flattens, paper becomes ~white.
    norm = np.clip(a / np.maximum(paper, 0.05), 0, 1.6)

    lum = norm @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    sat = norm.max(axis=2) - norm.min(axis=2)

    # Ink-ness: dark, or colourful. Paper is bright and grey.
    dist = np.maximum(1.0 - lum, sat)
    alpha = np.clip((dist - paper_cut) / paper_cut, 0, 1)

    # Anything fully enclosed by ink is part of the drawing, even if it is
    # pale (skin tones, white shirts, un-coloured paper inside an outline).
    # Only regions connected to the image border stay transparent.
    if fill_holes:
        try:
            from scipy.ndimage import binary_fill_holes
            solid = binary_fill_holes(alpha > 0.5)
            alpha = np.maximum(alpha, solid.astype(np.float32))
        except ImportError:
            print("warning: scipy not installed — pale fills inside "
                  "outlines may go transparent (pip install scipy)")

    # Snap near-black to pure black so lines look like marker, not pencil.
    dark = lum < line_cut
    out = np.clip(norm, 0, 1)
    out[dark] = 0.0
    # Mild colour boost so fills read flat.
    out = np.clip((out - 0.5) * 1.15 + 0.5, 0, 1)

    rgba = np.dstack([out, alpha])
    img = Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")
    if feather:
        # Feather only the alpha edge; keeps the wobbly line, kills halo.
        al = img.getchannel("A").filter(
            ImageFilter.GaussianBlur(feather))
        img.putalpha(al)

    if crop:
        bbox = img.getchannel("A").point(lambda v: 255 if v > 24 else 0) \
                  .getbbox()
        if bbox:
            pad = int(min(im.size) * 0.02)
            img = img.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                            min(img.width, bbox[2] + pad),
                            min(img.height, bbox[3] + pad)))
    img.save(dst)
    print(f"wrote {dst}  {img.width}x{img.height}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src", help="photo/scan of the drawing")
    ap.add_argument("dst", help="output PNG (put it in the character folder)")
    ap.add_argument("--no-crop", action="store_true",
                    help="keep full frame — REQUIRED for body/talk pairs "
                         "so the variants stay aligned")
    ap.add_argument("--max-dim", type=int, default=1600)
    ap.add_argument("--paper-cut", type=float, default=0.14,
                    help="raise if paper texture survives, lower if pale "
                         "fills vanish")
    ap.add_argument("--no-fill-holes", action="store_true",
                    help="keep enclosed gaps transparent (e.g. a hand on a "
                         "hip forming a see-through loop)")
    args = ap.parse_args()
    ingest(args.src, args.dst, max_dim=args.max_dim, crop=not args.no_crop,
           paper_cut=args.paper_cut, fill_holes=not args.no_fill_holes)


if __name__ == "__main__":
    main()
