#!/usr/bin/env python3
"""Generate the demo's placeholder art and placeholder voice audio.

These stand-ins exist so the pipeline can be run end-to-end before any real
drawings or recordings exist. Replace every one of them: the art with your
ingested drawings, the wavs with your own recorded voice lines.

Run from the animation-pipeline directory:
    python3 demo/make_demo_assets.py
"""

import math
import os
import random
import wave

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
rng = random.Random(7)

INK = (16, 14, 12, 255)
LW = 9  # line width


def wob(points, amp=4, seg=18):
    """Subdivide a polyline and jitter it so it looks hand-drawn."""
    out = []
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        n = max(2, int(math.hypot(x1 - x0, y1 - y0) / seg))
        for i in range(n):
            u = i / n
            out.append((x0 + (x1 - x0) * u + rng.uniform(-amp, amp),
                        y0 + (y1 - y0) * u + rng.uniform(-amp, amp)))
    out.append(points[-1])
    return out


def stroke(d, points, width=LW, closed=False):
    pts = wob(list(points) + ([points[0]] if closed else []))
    d.line(pts, fill=INK, width=width, joint="curve")
    for p in (pts[0], pts[-1]):
        d.ellipse([p[0] - width / 2, p[1] - width / 2,
                   p[0] + width / 2, p[1] + width / 2], fill=INK)


def blob(d, box, fill, width=LW, squish=0.0):
    """Filled wobbly ellipse with an ink outline."""
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = (x1 - x0) / 2, (y1 - y0) / 2 * (1 - squish)
    pts = []
    n = 26
    for i in range(n):
        a = i / n * 2 * math.pi
        r = 1 + rng.uniform(-0.03, 0.03)
        pts.append((cx + math.cos(a) * rx * r, cy + math.sin(a) * ry * r))
    d.polygon(pts, fill=fill)
    stroke(d, pts, width=width, closed=True)


# ---------------------------------------------------------------- stan

def stan(variant):
    """A bloke. body / talk / blink variants, pre-aligned on one canvas."""
    im = Image.new("RGBA", (620, 900), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    skin = (243, 214, 197, 255)
    shirt = (108, 141, 108, 255)
    trousers = (94, 82, 70, 255)
    hair = (74, 55, 41, 255)

    # legs
    blob(d, (200, 640, 310, 880), trousers)
    blob(d, (320, 640, 430, 880), trousers)
    # torso
    blob(d, (150, 420, 470, 700), shirt)
    # arms
    blob(d, (110, 450, 185, 660), shirt)
    blob(d, (440, 450, 515, 660), shirt)
    # head, deliberately too big
    blob(d, (140, 60, 490, 450), skin)
    # hair: flat pudding-bowl slab
    d.polygon(wob([(150, 160), (170, 70), (460, 70), (480, 160),
                   (420, 130), (330, 110), (230, 130)], amp=5), fill=hair)
    stroke(d, [(150, 160), (170, 70), (460, 70), (480, 160)], width=LW)

    # eyes
    if variant == "blink":
        stroke(d, [(230, 250), (280, 250)], width=7)
        stroke(d, [(360, 250), (410, 250)], width=7)
    else:
        d.ellipse([248, 238, 268, 260], fill=INK)
        d.ellipse([372, 238, 392, 260], fill=INK)
    # long odd nose
    stroke(d, [(318, 250), (308, 330), (330, 345)], width=7)
    # mouth
    if variant == "talk":
        blob(d, (285, 372, 355, 420), (40, 20, 20, 255), width=7)
    else:
        stroke(d, [(292, 392), (348, 388)], width=7)
    return im


# ---------------------------------------------------------------- seagull

def seagull(variant):
    im = Image.new("RGBA", (640, 560), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    white = (240, 240, 234, 255)
    grey = (176, 182, 186, 255)
    beak = (226, 168, 66, 255)

    # body
    blob(d, (100, 220, 480, 460), white)
    # wing
    blob(d, (170, 260, 400, 400), grey, squish=0.15)
    # head
    blob(d, (330, 90, 520, 270), white)
    # legs
    stroke(d, [(230, 450), (225, 530)], width=8)
    stroke(d, [(330, 450, ), (335, 530)], width=8)
    stroke(d, [(200, 530), (250, 530)], width=8)
    stroke(d, [(310, 530), (360, 530)], width=8)
    # eye: tiny, furious
    d.ellipse([440, 150, 458, 168], fill=INK)
    # beak
    if variant == "talk":
        d.polygon(wob([(505, 175), (620, 150), (515, 200)], amp=3), fill=beak)
        d.polygon(wob([(505, 200), (610, 230), (510, 225)], amp=3), fill=beak)
        stroke(d, [(505, 175), (620, 150), (515, 200)], width=6)
        stroke(d, [(505, 200), (610, 230), (510, 225)], width=6)
    else:
        d.polygon(wob([(505, 175), (615, 190), (505, 215)], amp=3), fill=beak)
        stroke(d, [(505, 175), (615, 190), (505, 215)], width=6)
    return im


# ---------------------------------------------------------------- background

def chipshop():
    W, H = 1080, 1920
    im = Image.new("RGB", (W, H), (196, 183, 148))  # wall
    d = ImageDraw.Draw(im)
    # floor
    d.polygon([(0, 1300), (W, 1180), (W, H), (0, H)], fill=(122, 96, 72))
    stroke(d, [(0, 1300), (W, 1180)], width=10)
    # counter
    d.polygon([(560, 1020), (1080, 980), (1080, 1420), (560, 1500)],
              fill=(105, 78, 55))
    stroke(d, [(560, 1020), (1080, 980)], width=10)
    stroke(d, [(560, 1020), (560, 1500)], width=10)
    # sign on the wall
    d.rectangle([120, 260, 640, 470], fill=(232, 225, 205))
    stroke(d, [(120, 260), (640, 260), (640, 470), (120, 470)],
           width=10, closed=True)
    stroke(d, [(180, 330), (420, 330)], width=8)
    stroke(d, [(180, 400), (560, 400)], width=8)
    # window
    d.rectangle([740, 200, 1040, 620], fill=(168, 186, 178))
    stroke(d, [(740, 200), (1040, 200), (1040, 620), (740, 620)],
           width=10, closed=True)
    return im


# ---------------------------------------------------------------- audio

def mumble(path, syllables, seed):
    """Placeholder voice line: pitched buzz in syllable bursts.

    Exists only so mouth-flap sync can be tested. Replace with a real
    recording of a human voice — that is the entire point of the format.
    """
    r = random.Random(seed)
    sr = 44100
    out = [np.zeros(int(0.15 * sr), dtype=np.float32)]
    for _ in range(syllables):
        dur = r.uniform(0.10, 0.22)
        n = int(dur * sr)
        t = np.arange(n) / sr
        f = r.uniform(95, 135)
        tone = (np.sign(np.sin(2 * np.pi * f * t)) * 0.28 +
                np.sin(2 * np.pi * f * 2.02 * t) * 0.12).astype(np.float32)
        env = np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7
        out.append(tone * env * 0.5)
        out.append(np.zeros(int(r.uniform(0.04, 0.16) * sr),
                            dtype=np.float32))
    out.append(np.zeros(int(0.2 * sr), dtype=np.float32))
    pcm = np.concatenate(out)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(pcm, -1, 1) * 32767).astype("<i2").tobytes())


def main():
    for name, fn, variants in [
            ("stan", stan, ["body", "talk", "blink"]),
            ("seagull", seagull, ["body", "talk"])]:
        folder = os.path.join(HERE, "characters", name)
        os.makedirs(folder, exist_ok=True)
        for v in variants:
            rng.seed(hash(name) & 0xffff)  # same wobble across variants
            fn(v).save(os.path.join(folder, f"{v}.png"))
        print(f"characters/{name}: {', '.join(variants)}")

    os.makedirs(os.path.join(HERE, "backgrounds"), exist_ok=True)
    chipshop().save(os.path.join(HERE, "backgrounds", "chipshop.png"))
    print("backgrounds/chipshop.png")

    os.makedirs(os.path.join(HERE, "vo"), exist_ok=True)
    mumble(os.path.join(HERE, "vo", "line1.wav"), 7, 1)
    mumble(os.path.join(HERE, "vo", "line2.wav"), 5, 2)
    mumble(os.path.join(HERE, "vo", "line3.wav"), 9, 3)
    print("vo/line1..3.wav (placeholder mumbles — replace with real voice)")


if __name__ == "__main__":
    main()
