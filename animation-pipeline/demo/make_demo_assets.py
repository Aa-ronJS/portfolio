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


# ---------------------------------------------------------------- doug
# The reference "parts kit" character: every limb its own drawing with
# two red registration dots (the joint and the reach), mirrored to the
# right side automatically. body.png is only the flat-path fallback and
# the sheet the skeleton is defined on; the kit does the animating.

D_SKIN = (205, 170, 140, 255)
D_SHIRT = (95, 125, 170, 255)
D_TROUSER = (78, 70, 62, 255)
D_SHOE = (56, 56, 60, 255)
D_HAIR = (32, 26, 22, 255)
RED = (230, 20, 20, 255)


def reg_dot(d, x, y):
    d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=RED)


def doug_torso():
    im = Image.new("RGBA", (420, 420), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    blob(d, (140, 55, 280, 130), D_SKIN)          # neck stub
    blob(d, (90, 95, 330, 390), D_SHIRT)
    stroke(d, [(150, 130), (210, 165), (270, 130)], width=7)  # collar
    reg_dot(d, 210, 60)     # neck
    reg_dot(d, 210, 380)    # hips
    return im


def doug_head(variant):
    im = Image.new("RGBA", (400, 460), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    blob(d, (60, 60, 340, 400), D_SKIN)
    d.polygon(wob([(70, 150), (95, 65), (305, 65), (330, 150),
                   (250, 115), (150, 115)], amp=5), fill=D_HAIR)
    stroke(d, [(70, 150), (95, 65), (305, 65), (330, 150)], width=7)
    for cx in (140, 255):
        d.ellipse([cx - 28, 172, cx + 28, 228], fill=(250, 250, 246, 255))
        stroke(d, [(cx - 28, 200), (cx - 27, 199)], width=5)
        d.ellipse([cx - 9, 188, cx + 9, 212], fill=INK)
        stroke(d, [(cx - 30, 158), (cx + 30, 152)], width=8)  # brow
    stroke(d, [(197, 210), (188, 280), (207, 292)], width=7)  # nose
    if variant == "talk":
        blob(d, (160, 310, 245, 365), (44, 24, 24, 255), width=7)
    else:
        stroke(d, [(165, 332), (235, 328)], width=7)
    reg_dot(d, 200, 435)    # neck joint (floats below the chin)
    reg_dot(d, 200, 30)     # crown (floats above the hair)
    return im


def doug_arm(shape):
    im = Image.new("RGBA", (260, 440), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if shape == "straight":
        blob(d, (55, 55, 110, 385), D_SKIN)
        blob(d, (60, 385, 105, 425), D_SKIN)               # mitten
    elif shape == "point":
        blob(d, (55, 55, 110, 385), D_SKIN)
        blob(d, (60, 380, 105, 415), D_SKIN)
        d.polygon(wob([(70, 405), (82, 455), (94, 405)], amp=2),
                  fill=D_SKIN)
        stroke(d, [(70, 405), (82, 455), (94, 405)], width=5)  # finger
    elif shape == "bent":
        blob(d, (55, 55, 110, 240), D_SKIN)                # upper arm
        blob(d, (65, 195, 230, 250), D_SKIN)               # forearm across
        blob(d, (205, 190, 255, 250), D_SKIN)              # fist
    elif shape == "pocket":
        blob(d, (55, 55, 110, 250), D_SKIN)                # into the pocket
        stroke(d, [(50, 245), (115, 250)], width=7)        # pocket edge
    blob(d, (42, 42, 122, 140), D_SHIRT)                   # sleeve on top
    reg_dot(d, 82, 45)      # shoulder
    reg_dot(d, 82, 385)     # reach (same span for every shape)
    return im


def doug_leg(shape):
    im = Image.new("RGBA", (260, 440), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if shape == "bent":
        blob(d, (60, 40, 130, 230), D_TROUSER)             # thigh forward
        blob(d, (75, 195, 175, 250), D_TROUSER)
        blob(d, (130, 230, 195, 375), D_TROUSER)           # shin back down
        blob(d, (120, 360, 235, 410), D_SHOE)              # shoe
    else:
        blob(d, (60, 35, 125, 380), D_TROUSER)
        blob(d, (55, 355, 190, 410), D_SHOE)               # shoe points out
    reg_dot(d, 92, 40)      # hip
    reg_dot(d, 92, 375)     # reach
    return im


def doug_body():
    """Assembled reference drawing, matched to the kit's proportions."""
    im = Image.new("RGBA", (700, 1100), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # legs (shoes point outward, like the mirrored kit)
    blob(d, (255, 690, 320, 1010), D_TROUSER)
    blob(d, (215, 985, 350, 1035), D_SHOE)
    blob(d, (380, 690, 445, 1010), D_TROUSER)
    blob(d, (350, 985, 485, 1035), D_SHOE)
    # neck + torso
    blob(d, (300, 405, 400, 470), D_SKIN)
    blob(d, (251, 460, 449, 708), D_SHIRT)
    stroke(d, [(300, 480), (350, 508), (400, 480)], width=7)
    # arms at the sides
    blob(d, (198, 489, 232, 688), D_SKIN)
    blob(d, (201, 688, 228, 712), D_SKIN)
    blob(d, (190, 481, 238, 540), D_SHIRT)
    blob(d, (468, 489, 502, 688), D_SKIN)
    blob(d, (472, 688, 499, 712), D_SKIN)
    blob(d, (462, 481, 510, 540), D_SHIRT)
    # head, matched to the kit head's mapping (s=0.671 about the neck)
    blob(d, (256, 193, 444, 422), D_SKIN)
    d.polygon(wob([(263, 253), (280, 197), (420, 197), (437, 253),
                   (383, 230), (317, 230)], amp=4), fill=D_HAIR)
    stroke(d, [(263, 253), (280, 197), (420, 197), (437, 253)], width=7)
    for cx in (310, 387):
        d.ellipse([cx - 19, 268, cx + 19, 306], fill=(250, 250, 246, 255))
        d.ellipse([cx - 6, 279, cx + 6, 295], fill=INK)
        stroke(d, [(cx - 20, 258), (cx + 20, 254)], width=7)
    stroke(d, [(348, 276), (342, 323), (355, 331)], width=6)
    stroke(d, [(327, 358), (373, 355)], width=6)
    return im


def doug_meta(folder):
    import json
    rig = {
        "joint_radius": 0.0,
        "bones": [
            {"name": "torso", "head": [0.5, 0.636], "tail": [0.5, 0.395]},
            {"name": "head", "head": [0.5, 0.395], "tail": [0.5, 0.164],
             "parent": "torso"},
            {"name": "arm_l", "head": [0.363, 0.442],
             "tail": [0.331, 0.629], "parent": "torso"},
            {"name": "arm_r", "head": [0.637, 0.442],
             "tail": [0.669, 0.629], "parent": "torso"},
            {"name": "leg_l", "head": [0.414, 0.641],
             "tail": [0.407, 0.927]},
            {"name": "leg_r", "head": [0.586, 0.641],
             "tail": [0.593, 0.927]},
        ],
        "face": {"bone": "head",
                 "eyes": [{"at": [0.4424, 0.2613], "r": 0.017},
                          {"at": [0.5527, 0.2613], "r": 0.017}],
                 "mouth": {"at": [0.5, 0.3405], "w": 0.055}},
    }
    with open(os.path.join(folder, "rig.json"), "w") as f:
        json.dump(rig, f, indent=2)
    with open(os.path.join(folder, "char.json"), "w") as f:
        json.dump({"anchor": [0.5, 0.941], "world_height": 1.0,
                   "flip_to_walk": True,
                   "aliases": ["dougie"]}, f, indent=2)


def make_doug():
    folder = os.path.join(HERE, "characters", "doug")
    pdir = os.path.join(folder, "parts")
    os.makedirs(pdir, exist_ok=True)
    rng.seed(hash("doug") & 0xffff)
    doug_body().save(os.path.join(folder, "body.png"))
    rng.seed(hash("doug") & 0xffff)
    doug_torso().save(os.path.join(pdir, "torso.png"))
    for v in ("body", "talk"):
        rng.seed(hash("doughead") & 0xffff)
        doug_head(v).save(os.path.join(
            pdir, "head.png" if v == "body" else f"head_{v}.png"))
    for shape in ("straight", "bent", "point", "pocket"):
        rng.seed(hash("dougarm" + shape) & 0xffff)
        doug_arm(shape).save(os.path.join(pdir, f"arm_{shape}.png"))
    for shape in ("straight", "bent"):
        rng.seed(hash("dougleg" + shape) & 0xffff)
        doug_leg(shape).save(os.path.join(pdir, f"leg_{shape}.png"))
    doug_meta(folder)
    print("characters/doug: body + parts kit "
          "(torso, head, head_talk, 4 arms, 2 legs)")


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

    make_doug()

    os.makedirs(os.path.join(HERE, "backgrounds"), exist_ok=True)
    chipshop().save(os.path.join(HERE, "backgrounds", "chipshop.png"))
    print("backgrounds/chipshop.png")

    os.makedirs(os.path.join(HERE, "vo"), exist_ok=True)
    mumble(os.path.join(HERE, "vo", "line1.wav"), 7, 1)
    mumble(os.path.join(HERE, "vo", "line2.wav"), 5, 2)
    mumble(os.path.join(HERE, "vo", "line3.wav"), 9, 3)
    print("vo/line1..3.wav (placeholder mumbles — replace with real voice)")

    # A fake "raw take": the three lines recorded in one go with pauses,
    # to exercise the puppet/take workflow (episode-take.yaml).
    import numpy as np
    sr = 44100
    parts, gap = [], np.zeros(int(0.7 * sr), dtype=np.int16)
    for n in (1, 2, 3):
        with wave.open(os.path.join(HERE, "vo", f"line{n}.wav")) as w:
            parts.append(np.frombuffer(
                w.readframes(w.getnframes()), dtype="<i2"))
        parts.append(gap)
    with wave.open(os.path.join(HERE, "vo", "take.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(np.concatenate(parts).tobytes())
    print("vo/take.wav (fake single-take recording)")


if __name__ == "__main__":
    main()
