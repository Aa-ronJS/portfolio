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
    blob(d, (90, 95, 330, 375), D_SHIRT)
    blob(d, (105, 350, 315, 418), D_TROUSER)      # pelvis: legs tuck under
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
    # legs (both shoes point the walk direction, like the kit)
    blob(d, (255, 653, 320, 973), D_TROUSER)
    blob(d, (245, 948, 380, 998), D_SHOE)
    blob(d, (380, 653, 445, 973), D_TROUSER)
    blob(d, (370, 948, 505, 998), D_SHOE)
    # pelvis over the leg tops, then neck + torso
    blob(d, (260, 640, 440, 712), D_TROUSER)
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
            {"name": "leg_l", "head": [0.414, 0.617],
             "tail": [0.407, 0.903]},
            {"name": "leg_r", "head": [0.586, 0.617],
             "tail": [0.593, 0.903]},
        ],
        "face": {"bone": "head",
                 "eyes": [{"at": [0.4424, 0.2613], "r": 0.017},
                          {"at": [0.5527, 0.2613], "r": 0.017}],
                 "mouth": {"at": [0.5, 0.3405], "w": 0.055}},
        # aim the pocket stubs into the torso (kit.py ingest computes
        # this from the drawn torso; doug's is hand-set to match)
        "shape_rot": {"arm_l": {"pocket": -8}, "arm_r": {"pocket": 8}},
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


# ---------------------------------------------------------------- props
# Placeholder hand props for the movement clips: a prop rides a bone
# (actor `props:`), so these get replaced by ingested drawings like
# everything else. Drawn pointing/opening screen-LEFT, matching an arm
# rotated +90.

def prop_gun():
    im = Image.new("RGBA", (420, 260), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    grey = (120, 122, 128, 255)
    d.rectangle([20, 60, 330, 120], fill=grey)              # barrel
    d.polygon([(260, 120), (330, 120), (350, 230), (285, 230)],
              fill=grey)                                    # grip
    stroke(d, [(20, 60), (330, 60), (330, 120), (350, 230),
               (285, 230), (260, 120), (20, 120), (20, 60)], width=8)
    stroke(d, [(225, 120), (245, 175), (265, 170)], width=7)  # trigger
    return im


def prop_pan():
    im = Image.new("RGBA", (620, 240), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    iron = (60, 58, 62, 255)
    d.rectangle([330, 95, 600, 130], fill=iron)             # handle
    blob(d, (20, 110, 360, 200), iron, squish=0.25)         # pan
    stroke(d, [(330, 95), (600, 95), (600, 130), (355, 130)], width=8)
    # the egg, mid-fry
    blob(d, (90, 60, 270, 150), (246, 244, 238, 255), width=6)
    blob(d, (150, 85, 215, 130), (240, 190, 60, 255), width=5)
    return im


def prop_rope(pos):
    """One revolution in four frames: over the head, down in front,
    under the feet, up behind (the 'behind' frame renders behind the
    character via the prop's z)."""
    im = Image.new("RGBA", (900, 1400), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    mids = {"top": [(170, 300), (450, 60), (730, 300)],
            "front": [(220, 900), (450, 1010), (680, 900)],
            "bottom": [(170, 1080), (450, 1330), (730, 1080)],
            "back": [(230, 860), (450, 950), (670, 860)]}
    stroke(d, [(120, 690)] + mids[pos] + [(780, 690)], width=26)
    for x, y in ((120, 690), (780, 690)):                   # handles
        d.rectangle([x - 22, y - 60, x + 22, y + 60],
                    fill=(150, 60, 40, 255))
        stroke(d, [(x - 22, y - 60), (x + 22, y - 60), (x + 22, y + 60),
                   (x - 22, y + 60), (x - 22, y - 60)], width=7)
    return im


def prop_door():
    im = Image.new("RGBA", (520, 1500), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    wood = (150, 110, 70, 255)
    d.rectangle([20, 20, 500, 1480], fill=wood)
    stroke(d, [(20, 20), (500, 20), (500, 1480), (20, 1480), (20, 20)],
           width=10)
    stroke(d, [(90, 110), (430, 110), (430, 700), (90, 700), (90, 110)],
           width=7)                                          # panels
    stroke(d, [(90, 800), (430, 800), (430, 1390), (90, 1390),
               (90, 800)], width=7)
    blob(d, (400, 730, 470, 800), (210, 180, 90, 255), width=6)  # handle
    return im


def prop_ladder():
    im = Image.new("RGBA", (460, 1700), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    wood = (168, 128, 82, 255)
    for x in (40, 380):
        d.rectangle([x, 20, x + 40, 1680], fill=wood)
        stroke(d, [(x, 20), (x + 40, 20), (x + 40, 1680), (x, 1680),
                   (x, 20)], width=8)
    for y in range(120, 1680, 200):
        d.rectangle([80, y, 380, y + 36], fill=wood)
        stroke(d, [(80, y), (380, y), (380, y + 36), (80, y + 36),
                   (80, y)], width=7)
    return im


def make_props():
    pdir = os.path.join(HERE, "props")
    os.makedirs(pdir, exist_ok=True)
    rng.seed(hash("props") & 0xffff)
    prop_gun().save(os.path.join(pdir, "gun.png"))
    prop_pan().save(os.path.join(pdir, "pan.png"))
    for pos in ("top", "front", "bottom", "back"):
        prop_rope(pos).save(os.path.join(pdir, f"rope_{pos}.png"))
    prop_ladder().save(os.path.join(pdir, "ladder.png"))
    prop_door().save(os.path.join(pdir, "door.png"))
    print("props: gun, pan, rope x4, ladder, door")


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


def _wav(path, pcm, sr=44100):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(pcm, -1, 1) * 32767).astype("<i2").tobytes())


def fight_foley():
    """Placeholder fight sounds, auto-placed by the renderer from a
    fight's beat sheet (sfx/fight/ convention). Crude synth stand-ins —
    record your own whooshes, thwacks and grunts with your mouth and
    drop them in under the same names; that will be funnier."""
    sr = 44100
    folder = os.path.join(HERE, "sfx", "fight")
    os.makedirs(folder, exist_ok=True)
    r = np.random.default_rng(7)

    # whoosh: noise through a sweeping average — air, then gone
    n = int(0.20 * sr)
    noise = r.standard_normal(n).astype(np.float32)
    out = np.copy(noise)
    for w_ in (3, 9, 21):          # crude lowpass, widening = darkening
        seg = out[int(n * (w_ - 3) / 24):]
        seg[:] = np.convolve(seg, np.ones(w_) / w_, "same")
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 2.2
    _wav(os.path.join(folder, "whoosh.wav"), out * env * 0.9)

    # thwack: snappy noise burst over a knuckle-y mid tone
    n = int(0.11 * sr)
    t = np.arange(n) / sr
    burst = r.standard_normal(n).astype(np.float32) * np.exp(-t * 55)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 40)
    _wav(os.path.join(folder, "thwack.wav"), burst * 0.7 + tone * 0.6)

    # thud: a kick lands lower and rounder
    n = int(0.22 * sr)
    t = np.arange(n) / sr
    tone = np.sin(2 * np.pi * (85 - 30 * t / t[-1]) * t) * np.exp(-t * 16)
    burst = r.standard_normal(n).astype(np.float32) * np.exp(-t * 70)
    _wav(os.path.join(folder, "thud.wav"), tone * 0.9 + burst * 0.25)

    # grunts: short pitched "uh"s, same voice as the mumbles (robotic
    # on purpose — the placeholders must never pass for the format)
    for i, (f0, f1, dur) in enumerate(
            [(150, 95, 0.16), (120, 78, 0.22), (175, 120, 0.13)], 1):
        n = int(dur * sr)
        t = np.arange(n) / sr
        f = f0 + (f1 - f0) * t / t[-1]
        ph = 2 * np.pi * np.cumsum(f) / sr
        tone = (np.sign(np.sin(ph)) * 0.3 +
                np.sin(ph * 2.02) * 0.15).astype(np.float32)
        tone = np.convolve(tone, np.ones(5) / 5, "same")
        env = np.sin(np.pi * np.linspace(0, 1, n)) ** 0.5
        g = tone * env
        _wav(os.path.join(folder, f"grunt{i}.wav"),
             g * (0.85 / abs(g).max()))
    print("sfx/fight: whoosh, thwack, thud, grunt1..3 "
          "(placeholder synths — replace with mouth foley)")


def duel_fx():
    """Placeholder gunfight dressing: blood splat, blood pool, muzzle
    flash, and a bang. Same rule as everything here — crude stand-ins
    to be replaced by real drawings and a real recorded bang."""
    r = random.Random(23)
    # splat: red starburst, no outline — blood is not a drawn object
    im = Image.new("RGBA", (420, 420), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = 210, 210
    for red, k in (((160, 24, 18, 255), 1.0), ((205, 40, 30, 255), 0.62)):
        pts = []
        for i in range(26):
            a = i / 26 * 2 * math.pi
            rad = (55 + r.uniform(0, 105) * (i % 2)) * k
            pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
        d.polygon(pts, fill=red)
    for _ in range(9):
        a = r.uniform(0, 2 * math.pi)
        dist = r.uniform(120, 190)
        rad = r.uniform(7, 16)
        x, y = cx + dist * math.cos(a), cy + dist * math.sin(a)
        d.ellipse([x - rad, y - rad, x + rad, y + rad],
                  fill=(160, 24, 18, 255))
    im.save(os.path.join(HERE, "props", "splat.png"))

    # pool: a flat dark puddle with a wobbled edge
    im = Image.new("RGBA", (760, 240), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = []
    for i in range(34):
        a = i / 34 * 2 * math.pi
        rx = 340 + r.uniform(-28, 28)
        ry = 88 + r.uniform(-14, 14)
        pts.append((380 + rx * math.cos(a), 120 + ry * math.sin(a)))
    d.polygon(pts, fill=(120, 16, 12, 255))
    im.save(os.path.join(HERE, "props", "pool.png"))

    # muzzle flash: two frames of yellow star
    im = Image.new("RGBA", (260, 260), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = []
    for i in range(16):
        a = i / 16 * 2 * math.pi
        rad = 120 if i % 2 == 0 else 45
        pts.append((130 + rad * math.cos(a), 130 + rad * math.sin(a)))
    d.polygon(pts, fill=(255, 214, 64, 255))
    d.ellipse([95, 95, 165, 165], fill=(255, 245, 200, 255))
    im.save(os.path.join(HERE, "props", "flash.png"))

    # bang: crack + boom
    sr = 44100
    n = int(0.45 * sr)
    t = np.arange(n) / sr
    rr = np.random.default_rng(5)
    crack = rr.standard_normal(n).astype(np.float32) * np.exp(-t * 34)
    boom = np.sin(2 * np.pi * (70 - 35 * t / t[-1]) * t) * np.exp(-t * 9)
    os.makedirs(os.path.join(HERE, "sfx"), exist_ok=True)
    _wav(os.path.join(HERE, "sfx", "bang.wav"),
         np.clip(crack * 0.9 + boom * 0.8, -1, 1))
    print("props: splat, pool, flash; sfx/bang.wav (gunfight placeholders)")


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
    make_props()
    fight_foley()
    duel_fx()

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
