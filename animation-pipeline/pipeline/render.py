#!/usr/bin/env python3
"""Render an episode YAML into a 9:16 mp4.

The whole aesthetic is deliberately crude: flat drawings, two-frame mouth
flaps driven by the loudness of the recorded voice line, and a low-rate
"boil" jitter so everything looks hand-held. The renderer does no drawing
of its own — every pixel comes from the artist's PNGs. What it adds is
timing, movement, captions, and audio sync.

Usage:
    python3 pipeline/render.py demo/episode.yaml
    python3 pipeline/render.py demo/episode.yaml --draft          # half res, fast
    python3 pipeline/render.py demo/episode.yaml --shot 2         # one shot only
    python3 pipeline/render.py demo/episode.yaml --still 1.5 f.png  # single frame
"""

import argparse
import hashlib
import json
import math
import os
import random
import subprocess
import sys

import numpy as np
import yaml
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audiolib import (AUDIO_SR, decode_audio, envelope, mouth_track,
                      split_take, write_wav)
from rig import (Rig, draw_pupils, face_variant, find_clip, pose_at,
                 resolve_channels)


# ---------------------------------------------------------------- assets

class Character:
    """A character is a folder of pre-aligned, same-size PNG variants.

    body.png            required — resting pose, mouth closed
    talk.png            optional — same drawing, mouth open
    blink.png           optional — same drawing, eyes shut
    <pose>.png          optional extra poses (angry.png, sad.png, ...)
    <pose>_talk.png     mouth-open version of a pose
    <pose>_blink.png    eyes-shut version of a pose
    char.json           optional — {"anchor": [x, y]} normalised anchor
                        (default [0.5, 1.0], feet at bottom-centre) and
                        {"aliases": [...]} for the voice director

    A shot's actor selects a pose with `pose: angry`; talk/blink fall
    back to the pose-less versions when a pose doesn't provide them.
    """

    def __init__(self, folder):
        self.folder = folder
        self.layers = {}
        for f in sorted(os.listdir(folder)):
            if f.lower().endswith(".png"):
                self.layers[os.path.splitext(f)[0]] = \
                    Image.open(os.path.join(folder, f)).convert("RGBA")
        if "body" not in self.layers:
            raise SystemExit(f"{folder} has no body.png")
        self.anchor = (0.5, 1.0)
        self.world_height = None   # physical size in human units (1.0 =
        meta = os.path.join(folder, "char.json")  # a standing adult)
        self.face = None
        if os.path.exists(meta):
            with open(meta) as f:
                m = json.load(f)
            self.anchor = tuple(m.get("anchor", self.anchor))
            self.world_height = m.get("world_height")
            # which way the DRAWING faces: "left"/"right" for profile
            # characters (enables auto-facing), absent for front-on ones
            # (never auto-flipped — mirrored shirt text looks wrong)
            self.facing = m.get("facing")
            # front-on characters that should mirror toward their walk
            # direction anyway (kit characters default to this; mirrored
            # shirt text is the cost, the owner decides)
            self.flip_to_walk = m.get("flip_to_walk", False)
            # declared eyes/mouth: stock blinks and mouth flaps get
            # stamped onto the drawing, no blink.png/talk.png needed
            self.face = m.get("face")
        # rig.json puts a skeleton over the drawing: parts are cut from
        # the sheets once, clips (walk, wave, ...) pose them per frame
        self.rig = Rig(folder, self.layers) \
            if os.path.exists(os.path.join(folder, "rig.json")) else None
        if self.face is None and self.rig is not None:
            self.face = self.rig.face
        # visible bounds: pixel dimensions of the drawing, not the canvas
        self.bbox = self.layers["body"].getchannel("A") \
            .point(lambda v: 255 if v > 24 else 0).getbbox() \
            or (0, 0, self.layers["body"].width, self.layers["body"].height)

    def pick(self, pose=None):
        """(body, talk, blink) images for a pose, with fallbacks."""
        if pose and pose not in self.layers:
            raise SystemExit(f"{self.folder}: no {pose}.png for pose "
                             f"'{pose}' (has: {', '.join(self.layers)})")
        body = self.layers[pose] if pose else self.layers["body"]
        talk = (self.layers.get(f"{pose}_talk") if pose else None) \
            or self.layers.get("talk")
        blink = (self.layers.get(f"{pose}_blink") if pose else None) \
            or self.layers.get("blink")
        return body, talk, blink


def make_silhouette():
    """Grey stand-in for a scripted character with no drawings yet.
    An explicit placeholder, never a silent cut."""
    import math
    import random as _r
    rng = _r.Random(11)
    im = Image.new("RGBA", (560, 1100), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    grey = (150, 150, 150, 255)
    ink = (90, 90, 90, 255)

    def blob(box):
        x0, y0, x1, y1 = box
        cx, cy, rx, ry = (x0+x1)/2, (y0+y1)/2, (x1-x0)/2, (y1-y0)/2
        pts = [(cx + math.cos(a/24*2*math.pi)*rx*(1+rng.uniform(-.04, .04)),
                cy + math.sin(a/24*2*math.pi)*ry*(1+rng.uniform(-.04, .04)))
               for a in range(24)]
        d.polygon(pts, fill=grey, outline=ink, width=8)
    blob((140, 40, 420, 330))     # head
    blob((100, 340, 460, 900))    # body
    blob((160, 880, 260, 1080))   # legs
    blob((300, 880, 400, 1080))
    d.text((236, 150), "?", fill=ink, font_size=120)

    class Silhouette:
        layers = {"body": im}
        anchor = (0.5, 0.98)
        world_height = 1.0
        bbox = (100, 40, 460, 1080)

        def pick(self, pose=None):
            return im, None, None
    return Silhouette()


# ---------------------------------------------------------------- moves

def ease(u):
    return u * u * (3 - 2 * u)  # smoothstep


def move_offset(moves, t, dur, rng_phase):
    """Combine a shot's movement verbs into (dx, dy, rot_deg, scale_mul).

    Offsets are in fractions of canvas height so they survive draft scaling.
    """
    dx = dy = rot = 0.0
    scale = 1.0
    for m in moves:
        kind = m["type"]
        t0, t1 = m.get("t", [0, dur])
        if kind == "slide":
            u = 0.0 if t1 <= t0 else max(0.0, min(1.0, (t - t0) / (t1 - t0)))
            u = ease(u)
            fx, fy = m["from"]
            tx, ty = m["to"]
            # slide replaces the base position: expressed as delta from "to"
            dx += (fx - tx) * (1 - u)
            dy += (fy - ty) * (1 - u)
        elif kind == "bob":
            amp = m.get("amp", 0.004)
            period = m.get("period", 0.7)
            dy += -abs(math.sin((t / period + rng_phase) * math.pi)) * amp
        elif kind == "waddle":
            amp = m.get("amp", 3.0)  # degrees
            period = m.get("period", 0.5)
            rot += math.sin((t / period + rng_phase) * 2 * math.pi) * amp
        elif kind == "shake":
            amp = m.get("amp", 0.003)
            dx += math.sin((t * 31 + rng_phase * 7)) * amp
        elif kind == "hop":
            amp = m.get("amp", 0.02)
            period = m.get("period", 0.6)
            dy += -abs(math.sin((t / period + rng_phase) * math.pi)) * amp
        elif kind == "shrink":
            u = 0.0 if t1 <= t0 else max(0.0, min(1.0, (t - t0) / (t1 - t0)))
            f0, f1 = m.get("from", 1.0), m.get("to", 0.5)
            scale *= f0 + (f1 - f0) * ease(u)
        elif kind == "pop":
            t0, t1 = m.get("t", [0, 0.25])
            u = ease(max(0.0, min(1.0, (t - t0) / max(t1 - t0, 1e-6))))
            scale *= 0.2 + 0.8 * u
        elif kind == "lean":
            rot += m.get("deg", 5.0) * \
                ease(max(0.0, min(1.0, (t - t0) / max(t1 - t0, 1e-6))))
    return dx, dy, rot, scale


# ---------------------------------------------------------------- captions

def wrap_caption(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textbbox((0, 0), trial, font=font)[2] <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# ---------------------------------------------------------------- renderer

class EpisodeRenderer:
    def __init__(self, episode_path, scale=1.0):
        self.root = os.path.dirname(os.path.abspath(episode_path))
        with open(episode_path) as f:
            self.ep = yaml.safe_load(f)
        base_w, base_h = self.ep.get("size", [1080, 1920])
        self.W = int(base_w * scale) // 2 * 2
        self.H = int(base_h * scale) // 2 * 2
        self.fps = self.ep.get("fps", 12)
        self.boil_every = self.ep.get("boil_every", 2)
        self.boil_px = self.ep.get("boil", 0.0015)   # fraction of H
        self.boil_deg = self.ep.get("boil_deg", 0.7)
        d = self.ep.get("defaults", {})
        font_path = os.path.join(self.root, d.get(
            "font", "../fonts/satoshi-var.ttf"))
        self.font_size = int(d.get("caption_size", 0.042) * self.H)
        self.font = ImageFont.truetype(font_path, self.font_size)
        try:
            self.font.set_variation_by_axes([d.get("caption_weight", 700)])
        except OSError:
            pass
        self.caption_color = tuple(d.get("caption_color", [26, 26, 26]))
        self.caption_y = d.get("caption_y", 0.70)
        self.caption_words = d.get("caption_words", 4)
        self.caption_bg = d.get("caption_bg", True)
        self.tail = d.get("audio_tail", 0.35)  # silence appended after a line
        self.talk_style = d.get("talk_style", "syllable")
        # fraction of canvas height a standing adult (world_height 1.0)
        # occupies; sprite pixel sizes derive from this, never from the
        # resolution someone happened to draw at
        self.human = d.get("human_height", 0.42)
        self.caption_case = d.get("caption_case", "lower")
        self.cast = {str(k).lower(): str(v)
                     for k, v in (self.ep.get("cast") or {}).items()}
        self.chars = {}
        self.take_lines = None  # lazy: split of the episode's raw take
        # authored script: beats are the source of truth for captions,
        # and preflight refuses to render an episode that drops lines
        self.beats = None
        if self.ep.get("script"):
            with open(self.path(self.ep["script"])) as f:
                self.beats = {b["id"]: b for b in json.load(f)}

    def run_preflight(self):
        if not self.beats:
            return
        from screenplay import preflight
        rep = preflight(self.ep, self.root)
        print(rep.render(), file=sys.stderr)
        if not rep.ok:
            raise SystemExit(
                "preflight failed — the script is authoritative. Stage the "
                "missing beats (or mark cuts/casting explicitly) and rerun.")

    def take_line(self, n):
        """Path to spoken line n (1-based) cut from the episode's raw take.

        The split is cached next to the take, keyed by its content, so a
        re-recorded take invalidates automatically.
        """
        if self.take_lines is None:
            take = self.ep.get("take")
            if not take:
                raise SystemExit("shot uses 'line:' but the episode has no "
                                 "'take:' recording")
            take = self.path(take)
            with open(take, "rb") as f:
                key = hashlib.md5(f.read()).hexdigest()[:12]
            cache = os.path.join(os.path.dirname(take), f".take-{key}")
            split_cfg = self.ep.get("split", {})
            if not os.path.isdir(cache):
                cuts, spans = split_take(
                    take,
                    min_pause=split_cfg.get("min_pause", 0.35),
                    min_line=split_cfg.get("min_line", 0.25),
                    pad=split_cfg.get("pad", 0.12))
                os.makedirs(cache, exist_ok=True)
                for i, pcm in enumerate(cuts):
                    write_wav(os.path.join(cache, f"line{i + 1:02d}.wav"),
                              pcm)
                print(f"split take into {len(cuts)} lines "
                      f"(cached in {os.path.relpath(cache, self.root)})",
                      file=sys.stderr)
            self.take_lines = sorted(
                os.path.join(cache, f) for f in os.listdir(cache)
                if f.endswith(".wav"))
        if not 1 <= n <= len(self.take_lines):
            raise SystemExit(f"'line: {n}' but the take has only "
                             f"{len(self.take_lines)} spoken lines — "
                             f"listen for missed pauses, or tune 'split:' "
                             f"(min_pause) in the episode file")
        return self.take_lines[n - 1]

    def path(self, p):
        return p if os.path.isabs(p) else os.path.join(self.root, p)

    def char(self, name):
        name = self.cast.get(name.lower(), name)
        if name not in self.chars:
            if name == "silhouette":
                self.chars[name] = make_silhouette()
            else:
                self.chars[name] = Character(
                    self.path(os.path.join("characters", name)))
        return self.chars[name]

    # -------------------------------------------------- per-shot prep

    def prep_shot(self, i, shot):
        s = dict(shot)
        if s.get("beat") and self.beats:
            b = self.beats.get(s["beat"])
            if b and b["type"] == "dialogue":
                # on-screen text is the author's wording, verbatim
                # (lowercasing is house style; emphasis asterisks are
                # formatting, not words)
                cap = b["text"].replace("*", "")
                s["caption"] = cap.lower() \
                    if self.caption_case == "lower" else cap
        s["env"] = None
        s["pcm"] = np.zeros(0, dtype=np.float32)
        ap = None
        if shot.get("line"):
            ap = self.take_line(int(shot["line"]))
        elif shot.get("audio"):
            ap = self.path(shot["audio"])
        if ap:
            s["pcm"] = decode_audio(ap, AUDIO_SR)
            s["env"], s["env_rate"] = envelope(ap)
            audio_dur = len(s["pcm"]) / AUDIO_SR
            s["speech_dur"] = audio_dur
            s["duration"] = shot.get("duration") or (audio_dur + self.tail)
        elif "duration" not in shot:
            raise SystemExit(f"shot {i}: needs 'audio', 'line' or 'duration'")
        s["frames"] = max(1, round(s["duration"] * self.fps))
        s["duration"] = s["frames"] / self.fps
        # captions show a few words at a time, paced across the spoken
        # line (proportional by word count; forced alignment comes later)
        if s.get("caption"):
            words = s["caption"].split()
            per = self.caption_words
            chunks = [words[i:i + per] for i in range(0, len(words), per)]
            speech_f = s["frames"]
            if s.get("speech_dur"):
                speech_f = max(1, min(s["frames"],
                                      round(s["speech_dur"] * self.fps)))
            spans, cum = [], 0
            for ch in chunks:
                f0 = round(cum / len(words) * speech_f)
                cum += len(ch)
                f1 = round(cum / len(words) * speech_f)
                spans.append([" ".join(ch), f0, max(f1, f0 + 1)])
            spans[-1][2] = s["frames"]  # last chunk holds through the tail
            s["caption_chunks"] = spans
        # pad / trim audio to the exact shot length
        want = int(s["duration"] * AUDIO_SR)
        pcm = s["pcm"][:want]
        s["pcm"] = np.pad(pcm, (0, want - len(pcm)))
        # background, scaled to cover
        bg = Image.open(self.path(shot["bg"])).convert("RGB")
        k = max(self.W / bg.width, self.H / bg.height)
        bg = bg.resize((round(bg.width * k), round(bg.height * k)),
                       Image.LANCZOS)
        x = (bg.width - self.W) // 2
        y = (bg.height - self.H) // 2
        s["bg"] = bg.crop((x, y, x + self.W, y + self.H))
        # slides end where they say they end: slide offsets are deltas
        # hung off `at`, so `at` must be the last slide's `to`. That
        # rule has produced mangled shots twice (an actor parked
        # off-position for the whole shot), so prep now snaps it —
        # a sliding actor's `at` IS its final destination, and every
        # consumer (fights, reach targets, gaze) sees the same value.
        for a2 in shot.get("actors", []):
            slides = [m for m in a2.get("moves", [])
                      if m.get("type") == "slide"]
            if slides:
                last = max(slides,
                           key=lambda m: (m.get("t") or [0, 0])[1])
                a2["at"] = list(last["to"])
        # combat intents. fight: {with: k} is the mutual brawl; attack:
        # {who: k} is one-sided — "sugar wants to punch doug". Either
        # way the TARGET needs no authoring: being on the receiving end
        # of an intent automatically makes a rigged actor defend
        # (square up, guard, dodge, stagger when caught). A target with
        # its own fight/attack keeps its own config; both sides of a
        # pair must agree on t/seed/beat (the first cfg seen wins the
        # shared beat sheet).
        duels = {}
        for j2, a2 in enumerate(shot.get("actors", [])):
            cfg = a2.get("fight") or a2.get("attack")
            if cfg is None:
                continue
            opp = cfg["with"] if "with" in cfg else cfg["who"]
            duels[j2] = {"opp": opp, "cfg": cfg, "attacks": True}
            duels.setdefault(opp, {"opp": j2, "cfg": cfg,
                                   "attacks": False})
        # pre-scale actor sprites once per shot
        s["sprites"] = []
        talker = next((x for x in shot.get("actors", [])
                       if x.get("talk")), None)
        for j, a in enumerate(shot.get("actors", [])):
            if "char" in a:
                c = self.char(a["char"])
                # a rigged actor's pose may live on the head part alone
                # (head_angry.png in a kit) — validate it there, not
                # against full sheets
                rig_pose = None
                if a.get("pose") and getattr(c, "rig", None) and \
                        a["pose"] not in c.layers:
                    if any(a["pose"] in v
                           for sh in c.rig.parts.values()
                           for v in sh.values()):
                        rig_pose = a["pose"]
                    else:
                        raise SystemExit(
                            f"{c.folder}: no {a['pose']}.png sheet and "
                            f"no head_{a['pose']}.png part for pose "
                            f"'{a['pose']}'")
                body, talk, blink = c.pick(
                    None if rig_pose else a.get("pose"))
                imgs = {"body": body, "talk": talk, "blink": blink}
                # declared eyes/mouth stand in for missing sheets: the
                # stock blink / mouth flap is stamped onto the drawing
                face = getattr(c, "face", None) or {}
                if imgs["blink"] is None and face.get("eyes"):
                    imgs["blink"] = face_variant(body, face, blink=True)
                if imgs["talk"] is None and a.get("talk") \
                        and face.get("mouth"):
                    imgs["talk"] = face_variant(body, face, talk=True)
                anchor = c.anchor
            else:
                c = None
                rig_pose = None
                img = Image.open(self.path(a["image"])).convert("RGBA")
                imgs = {"body": img, "talk": None, "blink": None}
                anchor = tuple(a.get("anchor", [0.5, 1.0]))
            # a rigged character plays clips (explicit, or a walk cycle
            # implied by a slide); everything else takes the flat path
            rigged_ok = c is not None and getattr(c, "rig", None)
            specs = self._clip_specs(c, a, s["duration"]) \
                if rigged_ok else []
            fighting = rigged_ok and j in duels
            # reach, props and shape pins are rig features: an actor
            # using any of them takes the rigged path even with no
            # clip (a character can hold a gun on someone while
            # standing perfectly still)
            rig_extras = rigged_ok and (a.get("reach") or
                                        a.get("props") or
                                        a.get("shapes"))
            if rig_pose and not specs:
                raise SystemExit(
                    f"pose '{rig_pose}' lives on {c.folder}'s kit head, "
                    f"which only renders through clips — give the actor "
                    f"one (clip: idle is enough)")
            if "scale" in a or c is None or c.world_height is None:
                # legacy sizing: fraction of canvas height, canvas-based
                # (a rigged actor's k means the same — its posed canvas
                # is padded but stays at source pixel scale)
                h = int(a.get("scale", 0.4) * self.H)
                k = h / imgs["body"].height
            else:
                # world sizing: the character's physical height (human
                # units) drives pixels via the VISIBLE bounds, so canvas
                # padding and drawing resolution can't distort scale
                wh = c.world_height * a.get("size", 1.0)
                k = (wh * self.human * self.H) / (c.bbox[3] - c.bbox[1])
            # auto-facing: a profile character turns toward its subject —
            # the direction it walks, else whoever is speaking. Explicit
            # flip wins; rotated actors (corpses) keep their native side.
            facing = getattr(c, "facing", None) if c else None
            walk_slide = next((mv for mv in a.get("moves", [])
                               if mv.get("type") == "slide"), None)
            if "flip" in a:
                do_flip = a["flip"]
            elif j in duels and c is not None and \
                    getattr(c, "rig", None):
                # combatants square up: face each other
                do_flip = a.get("at", [0.5])[0] > shot["actors"][
                    duels[j]["opp"]].get("at", [0.5])[0]
            elif c is not None and getattr(c, "flip_to_walk", False) \
                    and "rotate" not in a:
                # mirror toward the walk; standing still means unflipped
                do_flip = bool(walk_slide) and \
                    walk_slide["to"][0] < walk_slide["from"][0]
            elif facing in ("left", "right") and "rotate" not in a:
                ax0 = a.get("at", [0.5, 0.85])[0]
                slide = next((mv for mv in a.get("moves", [])
                              if mv.get("type") == "slide"), None)
                if slide:
                    want = "right" if slide["to"][0] > slide["from"][0] \
                        else "left"
                elif talker is not None and talker is not a and \
                        abs(talker.get("at", [0.5])[0] - ax0) > 0.03:
                    want = "left" if talker.get("at", [0.5])[0] < ax0 \
                        else "right"
                else:
                    want = facing
                do_flip = want != facing
            else:
                do_flip = False

            def scale_set(src):
                out = {}
                for key, im in src.items():
                    if im is None:
                        out[key] = None
                        continue
                    im = im.resize((round(im.width * k),
                                    round(im.height * k)), Image.LANCZOS)
                    if do_flip:
                        im = im.transpose(Image.FLIP_LEFT_RIGHT)
                    out[key] = im
                return out

            mouth = None
            if a.get("talk") and s["env"] is not None:
                mouth = mouth_track(
                    s["env"], s["env_rate"], s["frames"], self.fps,
                    style=a.get("talk_style", self.talk_style),
                    thr=a.get("talk_threshold", 0.28))
            if specs or fighting or rig_extras:
                rig = c.rig
                can_blink = "blink" in c.layers or face.get("eyes")
                # props ride a bone: a gun in the hand, a rope round the
                # whole body (bone: root). imgs entries may set z:
                # "behind" to pass behind the character (the rope's back
                # half); drop: {at: t} releases the prop into gravity
                props = []
                for pr in a.get("props") or []:
                    entries = pr.get("imgs") or [pr["img"]]
                    frames = []
                    for e in entries:
                        if isinstance(e, str):
                            e = {"img": e}
                        pim = Image.open(
                            self.path(e["img"])).convert("RGBA")
                        # flip: mirror the art so the object points the
                        # way its holder faces (the pan's bowl and the
                        # gun's barrel go where the shoes go). anchor
                        # and at-points are then given in the flipped
                        # orientation — what you see is what you name.
                        if pr.get("flip"):
                            pim = pim.transpose(Image.FLIP_LEFT_RIGHT)
                        frames.append({"im": pim,
                                       "z": e.get("z", "front")})
                    bone = pr.get("bone", "root")
                    at = pr.get("at")
                    if at is None and bone in rig.bones:
                        # a held prop defaults to the holder's OWN hand
                        # (the bone tail) — a picked-up object must
                        # touch the hand that holds it, and a pin tuned
                        # for one character floats on another
                        tl = rig.bones[bone].tail
                        at = [tl[0] / rig.W, tl[1] / rig.H]
                    props.append({
                        "imgs": frames,
                        "period": pr.get("period", 0.5),
                        "bone": bone,
                        "at": at or [0.5, 0.5],
                        "anchor": pr.get("anchor", [0.5, 0.5]),
                        "size": pr.get("size", 0.2),
                        "rot": pr.get("rot", 0.0),
                        "t": pr.get("t"),
                        "follow": pr.get("follow", True),
                        "drop": pr.get("drop"),
                    })
                # reach: a hand that uses something must touch it. The
                # target is a canvas point, a point on another actor
                # (resolved now — targets must be listed BEFORE the
                # reacher and hold still), or a point ON ONE OF THIS
                # ACTOR'S OWN PROPS ({prop: 0, at: [u, v]} in prop-image
                # fractions, solved per frame — the support hand lands
                # on the gun wherever the gun arm carries it); the arm
                # rotates and, if needed, stretches until the hand
                # lands on it.
                reach = []
                for rc in a.get("reach") or []:
                    rc = dict(rc)
                    to = rc["to"]
                    if isinstance(to, dict) and "prop" in to:
                        rc["_prop"] = (to["prop"], to["at"][0],
                                       to["at"][1])
                    elif isinstance(to, dict):
                        tsp = s["sprites"][to["actor"]]
                        timg = tsp["imgs"]["body"]
                        nx, ny = to["at"]
                        at2 = tsp["cfg"].get("at", [0.5, 0.85])
                        rc["_target"] = [
                            at2[0] + (nx - tsp["anchor"][0])
                            * timg.width / self.W,
                            at2[1] + (ny - tsp["anchor"][1])
                            * timg.height / self.H]
                    else:
                        rc["_target"] = list(to)
                    reach.append(rc)
                # listeners look at the talker (head tilts their way)
                gaze = 0.0
                if talker is not None and talker is not a \
                        and a.get("look") is not False:
                    dxt = talker.get("at", [0.5])[0] \
                        - a.get("at", [0.5])[0]
                    if abs(dxt) > 0.03:
                        gaze = 5.5 if dxt > 0 else -5.5
                # a fight pairs two rigged actors: shared seeded
                # choreography, each side computes its own role
                fight = None
                if fighting:
                    duel = duels[j]
                    fcfg = duel["cfg"]
                    pair = tuple(sorted((j, duel["opp"])))
                    fights = s.setdefault("_fights", {})
                    if pair not in fights:
                        fights[pair] = self._make_fight(
                            fcfg, s["duration"],
                            tuple(side for side, idx in enumerate(pair)
                                  if duels[idx]["attacks"]))
                    opp = shot["actors"][duel["opp"]]
                    fight = {
                        "beats": fights[pair],
                        "beat": fcfg.get("beat", 0.55),
                        "me": 0 if j == pair[0] else 1,
                        "opp_at": opp.get("at", [0.5, 0.85]),
                        "opp_scale": opp.get("scale", 0.4),
                        # which way the opponent is (punches stop at
                        # their near cheek, not their centre line)
                        "dirn": 1 if opp.get("at", [0.5])[0]
                        >= a.get("at", [0.5])[0] else -1,
                        # how far the root may advance (standing-height
                        # units) before the heads collide: the audit
                        # found a fixed lunge mashes faces together
                        # when the actors are staged close. Clearance
                        # covers the attacker's forward lean AND the
                        # defender's duck bowing toward them; the punch
                        # still lands — reach stretches the arm.
                        "adv_max": max(0.0, abs(
                            opp.get("at", [0.5])[0]
                            - a.get("at", [0.5])[0]) * self.W
                            / (a.get("scale", 0.4) * self.H) - 0.52),
                    }
                    gaze = 0.0   # fighters watch fists, not talkers
                # where the PUPILS aim. `eyes: [x, y]` directs them at
                # a canvas point; `eyes: front` (or look: false) holds
                # the drawn eyes; otherwise the talker's face, or ahead
                # while walking. Quantised per axis to {-1, 0, 1}: the
                # look SNAPS, comic-style, instead of tracking.
                look = None
                tgt = a.get("eyes")
                if tgt == "front":
                    tgt = None
                elif isinstance(tgt, (list, tuple)):
                    tgt = list(tgt)
                elif a.get("look") is False or fighting:
                    tgt = None
                elif talker is not None and talker is not a:
                    tsc = talker.get("scale", 0.4)
                    tgt = [talker.get("at", [0.5, 0.85])[0],
                           talker.get("at", [0.5, 0.85])[1] - 0.75 * tsc]
                elif walk_slide:
                    look = (1 if walk_slide["to"][0]
                            > walk_slide["from"][0] else -1, 0)
                    tgt = None
                else:
                    tgt = None
                if tgt is not None:
                    at0 = a.get("at", [0.5, 0.85])
                    fy = at0[1] - 0.72 * a.get("scale", 0.4)
                    dxe = tgt[0] - at0[0]
                    dye = tgt[1] - fy
                    look = ((1 if dxe > 0.02 else
                             -1 if dxe < -0.02 else 0),
                            (1 if dye > 0.06 else
                             -1 if dye < -0.06 else 0))
                if look:
                    # the sprite is mirrored after posing, so a flipped
                    # actor stamps toward the opposite local x
                    look = ((-look[0] if do_flip else look[0]), look[1])
                    if look == (0, 0):
                        look = None
                s["sprites"].append({
                    "imgs": None, "rig": rig, "specs": specs, "char": c,
                    "props": props, "reach": reach, "gaze": gaze,
                    "look": look, "fight": fight,
                    "k": k, "flip": do_flip, "cache": {},
                    "base": a.get("pose") or "body", "face": face,
                    # anchor restated for the padded pose canvas
                    "anchor": ((rig.pad + anchor[0] * rig.W)
                               / (rig.W + 2 * rig.pad),
                               (rig.pad + anchor[1] * rig.H)
                               / (rig.H + 2 * rig.pad)),
                    "cfg": a, "mouth": mouth,
                    "phase": random.Random((i + 1) * 37 + j).random(),
                    "blinks": self._blink_times(s["duration"],
                                                (i + 1) * 91 + j)
                              if can_blink else [],
                })
                continue
            scaled = scale_set(imgs)
            # alt_pose: the sprite alternates between its pose and this
            # one on a timer — a two-frame gesture cycle (arm wave, etc.)
            alt = None
            if c is not None and a.get("alt_pose"):
                ab, at_, abl = c.pick(a["alt_pose"])
                alt = scale_set({"body": ab, "talk": at_, "blink": abl})
            s["sprites"].append({
                "imgs": scaled, "alt": alt,
                "alt_period": a.get("alt_period", 0.8),
                "anchor": anchor, "cfg": a, "mouth": mouth,
                "phase": random.Random((i + 1) * 37 + j).random(),
                "blinks": self._blink_times(s["duration"], (i + 1) * 91 + j)
                          if scaled["blink"] is not None else [],
            })
        if s.get("_fights"):
            self._fight_foley(s)
        return s

    def _fight_foley(self, s):
        """The beat sheet knows every swing, dodge and landed blow, so
        foley places itself: a whoosh on each swing (a whoosh with no
        impact IS the miss), a thwack or thud when a punch or kick
        lands, and a grunt from whoever took it. Sounds come from the
        show's sfx/fight/ folder — the demo ships crude synth
        placeholders; record your own (mouth foley is very much the
        house style) and drop them in under the same names. No folder,
        no foley."""
        import glob as _glob
        fdir = self.path(os.path.join("sfx", "fight"))
        have = {os.path.basename(p)
                for p in _glob.glob(os.path.join(fdir, "*.wav"))}
        grunts = sorted(n for n in have if n.startswith("grunt"))
        if not have:
            return
        cues = s.setdefault("sfx", list(s.get("sfx") or []))
        for pair, beats in sorted(s["_fights"].items()):
            rng = random.Random(7777 + 131 * pair[0] + pair[1])
            for b in beats:
                B = b.get("_B", 0.55)
                if "whoosh.wav" in have:
                    cues.append({"file": "sfx/fight/whoosh.wav",
                                 "at": b["t"] + 0.25 * B, "gain": 0.9})
                if b["hit"]:
                    imp = "thud.wav" if b["atk"] == "kick" \
                        else "thwack.wav"
                    if imp in have:
                        cues.append({"file": f"sfx/fight/{imp}",
                                     "at": b["t"] + 0.40 * B})
                    if grunts:
                        cues.append({
                            "file": "sfx/fight/" + rng.choice(grunts),
                            "at": b["t"] + 0.46 * B, "gain": 0.9})

    def _clip_specs(self, c, a, dur):
        """Resolve an actor's clips. A slide with no explicit clip on a
        rigged character implies a walk cycle over the slide's window —
        the two-drawing waddle, retired."""
        roots = [os.path.join(c.folder, "clips"),
                 os.path.join(self.root, "clips")]
        raw = a.get("clips") or ([a["clip"]] if a.get("clip") else [])
        specs = []
        for item in raw:
            if isinstance(item, str):
                item = {"name": item}
            spec = {"clip": find_clip(item["name"], roots)}
            for key in ("t", "amp", "period"):
                if key in item:
                    spec[key] = item[key]
            specs.append(spec)
        if not specs and not a.get("no_walk"):
            # a waddle is the author's explicit old-style walk: respect
            # it rather than stacking leg swings on top
            moves = a.get("moves", [])
            slide = next((m for m in moves
                          if m.get("type") == "slide"), None)
            if slide is not None and \
                    not any(m.get("type") == "waddle" for m in moves):
                specs = [{"clip": find_clip("walk", roots),
                          "t": slide.get("t", [0, dur])}]
        return specs

    @staticmethod
    def _blink_times(dur, seed):
        rng = random.Random(seed)
        t, out = rng.uniform(0.6, 2.2), []
        while t < dur:
            out.append(t)
            t += rng.uniform(1.8, 4.0)
        return out

    # -------------------------------------------------- fights

    @staticmethod
    def _make_fight(cfg, dur, attackers=(0, 1)):
        """Seeded beat sheet both combatants read: who swings when,
        with what, whether the other sees it coming. `attackers` names
        which pair sides throw (a one-sided attack: intent lives on one
        actor and beats never flip to the defender). cfg `using` limits
        the arsenal (punch = jab + cross); the rng draw order must stay
        stable for the default mutual case — committed demos depend on
        their seeds."""
        rng = random.Random(cfg.get("seed", 5))
        B = cfg.get("beat", 0.55)
        t0, t1 = cfg.get("t") or (0.0, dur)
        moves = []
        for m in cfg.get("using") or ["jab", "cross", "kick"]:
            moves += {"punch": ["jab", "cross"]}.get(m, [m])
        both = len(set(attackers)) == 2
        beats, tcur = [], t0 + 0.35
        who = rng.randint(0, 1)
        if not both:
            who = attackers[0]
        while tcur + B <= t1:
            atk = rng.choice(moves)
            # the dodge is drawn regardless (rng draw order is frozen —
            # committed demos depend on their seeds) but a kick is only
            # dodged convincingly by leaning: a duck drops the body
            # INTO a mid-body kick's line and reads as a landed hit
            dodge = rng.choice(["duck", "lean"])
            if atk == "kick":
                dodge = "lean"
            beats.append({"t": tcur, "who": who, "_B": B, "atk": atk,
                          "dodge": dodge,
                          "hit": rng.random() < 0.3})
            if rng.random() < 0.75 and both:
                who = 1 - who
            tcur += B * rng.uniform(1.05, 1.4)
        return beats

    def _fight_pose(self, fight, t, pose, bones):
        """This combatant's channels for the moment t. Everything is in
        body space facing the opponent (the flip squares them up), so
        one set of signs serves both sides. Returns punch reaches —
        the fist must land on (or exactly where the dodge just left)
        the opponent's face."""
        B = fight["beat"]

        def add(bone, **ch):
            # channels are authored for two-piece legs; a one-piece rig
            # takes the _upper channel on the whole leg and has no shin
            if bone not in bones:
                if bone.endswith("_lower"):
                    return
                if bone.endswith("_upper"):
                    bone = bone[:-6]
                    if bone not in bones:
                        return
            slot = pose.setdefault(bone, {})
            for k2, v in ch.items():
                if isinstance(v, str):
                    slot[k2] = v
                else:
                    slot[k2] = slot.get(k2, 0.0) + v

        # guard: the old-timey pugilist stance — lead arm (arm_r, the
        # front shoulder) extended toward the opponent with the hand up
        # at chin height, rear arm folded across the belly. This is the
        # ONLY guard the kit art can pose: the bent shape's elbow folds
        # down/inward, so no rotation of it ever yields forearm-up —
        # -52 read as arms crossed, -30 as hand-on-hip, -72 as an
        # upside-down arm (elbow up, knuckles down; Aaron caught all
        # three). A raised STRAIGHT arm past ~-115 reads as waving.
        # Verified by posing both reference rigs and reading close-up
        # crops — do the same before retuning.
        add("arm_l", rot=-12, shape="bent")
        add("arm_r", rot=-105, shape="straight")
        add("torso", rot=4)
        add("root", dy=0.012 + 0.010 * math.sin(t * 22))
        add("leg_l_upper", rot=-6)
        add("leg_r_upper", rot=8)
        reaches = []
        beat = next((b for b in fight["beats"]
                     if b["t"] <= t < b["t"] + B), None)
        if beat is None:
            return reaches
        p = (t - beat["t"]) / B
        if beat["who"] == fight["me"]:      # attacking
            # lunges cap at adv_max so the attacker never occupies the
            # opponent's space; kicks get a little extra because the
            # torso leans back out of head range
            adv_p = min(0.10, fight.get("adv_max", 0.10))
            adv_k = min(0.14, fight.get("adv_max", 0.14) + 0.06)
            if beat["atk"] == "kick":
                if p < 0.25:
                    add("root", dy=0.03 * (p / 0.25))
                elif p < 0.7:
                    add("leg_l_upper", rot=-84, shape="straight")
                    add("leg_l_lower", rot=-6)
                    add("torso", rot=-14)
                    add("root", dx=adv_k, dy=-0.01)
                    # the foot must arrive ON them, same as a fist
                    reaches.append({
                        "bone": "leg_l_lower", "shape": "straight",
                        "max": 1.7,
                        "_target": [fight["opp_at"][0]
                                    - fight["dirn"] * 0.09
                                    * fight["opp_scale"],
                                    fight["opp_at"][1]
                                    - 0.32 * fight["opp_scale"]]})
                else:
                    q = 1 - (p - 0.7) / 0.3
                    add("leg_l_upper", rot=-84 * q)
                    add("torso", rot=-14 * q)
                    add("root", dx=adv_k * q)
            else:
                arm = "arm_l" if beat["atk"] == "jab" else "arm_r"
                if p < 0.25:                 # cock the fist
                    add(arm, rot=28 * (p / 0.25))
                    add("torso", rot=-5)
                elif p < 0.7:                # lunge + the punch reaches
                    ty = -0.63 if beat["atk"] == "jab" else -0.50
                    reaches.append({
                        "bone": arm, "shape": "straight", "max": 3.0,
                        "_target": [fight["opp_at"][0]
                                    - fight["dirn"] * 0.14
                                    * fight["opp_scale"],
                                    fight["opp_at"][1]
                                    + ty * fight["opp_scale"]]})
                    add(arm, shape="straight")
                    add("torso", rot=9)
                    add("root", dx=adv_p)
                else:
                    q = 1 - (p - 0.7) / 0.3
                    add("torso", rot=6 * q)
                    add("root", dx=adv_p * q)
        elif beat["hit"]:                    # taking it
            # the audit's verdict: a landed blow read WEAKER than a
            # dodge. Snap hard at impact and ease back — big head
            # snap, whole-body tilt, a real stagger, the guard arms
            # knocked off their line
            if p >= 0.4:
                q = max(0.0, 1 - (p - 0.4) / 0.55)
                add("head", rot=-44 * q, dx=-0.03 * q)
                add("root", dx=-0.16 * q, rot=-7 * q)
                add("torso", rot=-18 * q)
                add("arm_l", rot=34 * q)
                add("arm_r", rot=52 * q)
        elif 0.2 <= p <= 0.75:               # saw it coming
            if beat["dodge"] == "duck":
                # a real crouch: knees bend, feet stay planted — the
                # root drop matches what the folded legs give up. A
                # one-piece leg can't fold, so that rig bobs less and
                # ducks mostly with the torso and head. The bow stays
                # shallow: at close staging a deep bow put the ducked
                # head against the attacker's chin (the audit round).
                add("torso", rot=6)
                add("head", rot=8)
                if "leg_l_lower" in bones:
                    add("root", dy=0.074)
                    add("leg_l_upper", rot=-52, shape="bent")
                    add("leg_l_lower", rot=58)
                    add("leg_r_upper", rot=-48, shape="bent")
                    add("leg_r_lower", rot=54)
                else:
                    add("root", dy=0.05, dx=-0.03)
                    add("torso", rot=4)
                    add("head", rot=4)
                    add("leg_l_upper", rot=-14, shape="bent")
                    add("leg_r_upper", rot=16, shape="bent")
            else:                            # lean back out of range
                add("torso", rot=-20)
                add("root", dx=-0.06)
                add("head", rot=-8)
        return reaches

    # -------------------------------------------------- frame drawing

    def _rig_frame(self, sp, t, talking, blinking, placement=(0.5, 0.85, 1.0)):
        """The posed, scaled, flipped sprite for a rigged actor at t.

        The pose comes from the actor's clips; talk and blink prefer the
        artist's sheets (swapped onto the head part alone) and fall back
        to the stock overlays at the face anchors, carried through the
        skeleton so a nodding head keeps its blink. Poses repeat every
        clip cycle, so nearly every frame is a cache hit.
        """
        rig, c = sp["rig"], sp["char"]
        pose = resolve_channels(pose_at(sp["specs"], t), rig.bones)
        # actor-pinned part shapes (shapes: {arm_r: point}) beat a clip's
        # shape channel: the author holds that pose for the whole shot
        for bone, shp in (sp["cfg"].get("shapes") or {}).items():
            pose.setdefault(bone, {})["shape"] = shp
        # listeners turn their heads toward whoever is talking
        if sp.get("gaze"):
            slot = pose.setdefault("head", {})
            slot["rot"] = slot.get("rot", 0.0) \
                + sp["gaze"] * (-1 if sp["flip"] else 1)
        reaches = list(sp.get("reach") or [])
        if sp.get("fight"):
            reaches += self._fight_pose(sp["fight"], t, pose, rig.bones)
        # reach: solve the arm so the hand lands ON the target, frame
        # by frame — rotating toward it and stretching when it is out
        # of arm's length. The character can move; the grip holds.
        for rc in reaches:
            t0, t1 = rc.get("t") or (0.0, float("inf"))
            if not t0 <= t <= t1:
                continue
            bone = rc["bone"]
            if bone not in rig.bones and bone.rsplit("_", 1)[-1] in \
                    ("upper", "lower"):
                bone = bone.rsplit("_", 1)[0]   # one-piece leg stands in
            if bone not in rig.bones:
                continue
            if "_prop" in rc:
                # a point on one of this actor's own props, wherever
                # the carrying bone has it this frame (body space, so
                # flips need no correction) — how a support hand grips
                # the gun the other hand is aiming
                pi, pu, pv = rc["_prop"]
                pr = (sp.get("props") or [None] * (pi + 1))[pi]
                if pr is None or pr.get("drop"):
                    continue
                pt0, pt1 = pr["t"] or (0.0, float("inf"))
                if not pt0 <= t <= pt1:
                    continue
                n = len(pr["imgs"])
                fi = int(t / (pr["period"] / n)) % n if n > 1 else 0
                pim = pr["imgs"][fi]["im"]
                kp = pr["size"] * rig.rest_h / pim.height
                ang = rig.bone_state(pr["bone"], pose)[0] \
                    if pr["follow"] else 0.0
                th = math.radians(ang + pr["rot"])
                dxp = (pu - pr["anchor"][0]) * pim.width * kp
                dyp = (pv - pr["anchor"][1]) * pim.height * kp
                ax, ay = rig.anchor_world(pr["at"], pr["bone"], pose)
                bx = ax + dxp * math.cos(th) - dyp * math.sin(th) \
                    - rig.pad
                by = ay + dxp * math.sin(th) + dyp * math.cos(th) \
                    - rig.pad
            else:
                cx = rc["_target"][0] * self.W
                cy = rc["_target"][1] * self.H
                k = sp["k"] * (placement[2] or 1.0)
                cw = k * (rig.W + 2 * rig.pad)
                ch = k * (rig.H + 2 * rig.pad)
                u = (cx - (placement[0] * self.W
                           - sp["anchor"][0] * cw)) / k
                v = (cy - (placement[1] * self.H
                           - sp["anchor"][1] * ch)) / k
                if sp["flip"]:
                    u = (rig.W + 2 * rig.pad) - u
                bx, by = u - rig.pad, v - rig.pad
            wang, piv, _rest = rig.bone_state(bone, pose)
            own = pose.get(bone, {}).get("rot", 0.0)
            b = rig.bones[bone]
            vx, vy = b.tail[0] - b.head[0], b.tail[1] - b.head[1]
            alpha = math.degrees(math.atan2(vy, vx))
            beta = math.degrees(math.atan2(by - piv[1], bx - piv[0]))
            need = (beta - alpha - (wang - own) + 180) % 360 - 180
            L = math.hypot(vx, vy) or 1.0
            slot = pose[bone] = dict(pose.get(bone) or {})
            slot["rot"] = round(need, 1)
            if rc.get("stretch", True):
                cap = rc.get("max", 2.4)
                s_ = max(0.5, min(cap, math.hypot(bx - piv[0],
                                                  by - piv[1]) / L))
                slot["stretch"] = round(s_ - 1.0, 2)
        base, face = sp["base"], sp["face"]
        head_bone = face.get("bone", "head") if face else "head"
        # a drawn kit keeps its face variants on the head part
        # (head_talk.png -> "talk"), a cut rig on the full sheets
        head_avail = set(c.layers)
        for variants in rig.parts.get(head_bone, {}).values():
            head_avail |= set(variants)

        def sheet(kind):
            # a posed face never falls back to the NEUTRAL talk/blink —
            # flickering the expression away reads as a glitch. Without
            # angry_talk the angry face holds and the stock overlay
            # provides the flap instead.
            if base != "body":
                cand = f"{base}_{kind}"
                return cand if cand in head_avail else None
            return kind if kind in head_avail else None

        variant_for = {b: base for b in rig.parts} if base != "body" else {}
        if talking and sheet("talk"):
            variant_for[head_bone] = sheet("talk")
        blink_sheet = blinking and sheet("blink")
        if blink_sheet:
            variant_for[head_bone] = sheet("blink")
        overlay_blink = blinking and not blink_sheet and face \
            and face.get("eyes")
        overlay_talk = talking and not sheet("talk") and face \
            and face.get("mouth")
        # which props are live this frame: cycle frame, and for dropped
        # props the gravity state (position falls, spin, lands on the
        # ground line and stays put)
        prop_state = []
        for i, pr in enumerate(sp.get("props") or []):
            t0, t1 = pr["t"] or (0.0, float("inf"))
            if not t0 <= t <= t1:
                continue
            n = len(pr["imgs"])
            fi = int(t / (pr["period"] / n)) % n if n > 1 else 0
            dq = ()
            d = pr.get("drop")
            if d and t >= d["at"]:
                if "_detach" not in pr:
                    pd = resolve_channels(
                        pose_at(sp["specs"], d["at"]), rig.bones)
                    ax0, ay0 = rig.anchor_world(pr["at"], pr["bone"], pd)
                    pr["_detach"] = (ax0, ay0,
                                     rig.bone_state(pr["bone"], pd)[0])
                ax0, ay0, ang0 = pr["_detach"]
                g = d.get("g", 3.4) * rig.rest_h
                ground = rig.pad + rig.rest_bbox[3] - 0.02 * rig.H
                tau = min(t - d["at"],
                          math.sqrt(max(0.0, 2 * (ground - ay0) / g)))
                dq = (round(ax0),
                      round(ay0 + 0.5 * g * tau * tau),
                      round(ang0 + d.get("spin", 260) * tau))
            prop_state.append((i, fi, dq))
        key = (tuple(sorted(
                   (b, tuple(sorted(
                       (k2, v if isinstance(v, str) else round(v, 2))
                       for k2, v in ch.items())))
                   for b, ch in pose.items())),
               tuple(sorted(variant_for.items())),
               bool(overlay_blink), bool(overlay_talk),
               sp.get("look"), tuple(prop_state))
        img = sp["cache"].get(key)
        if img is None:
            canvas, _pad = rig.pose(pose, variant_for)
            if overlay_blink or overlay_talk:
                canvas = face_variant(
                    canvas, face, blink=overlay_blink, talk=overlay_talk,
                    transform=lambda at: rig.anchor_world(
                        at, head_bone, pose),
                    feat_h=rig.H)
            # dynamic pupils: lift the drawn pupil and re-stamp it
            # toward the look target (skipped while the eyes are shut)
            if sp.get("look") and face and face.get("eyes") \
                    and not blink_sheet and not overlay_blink:
                canvas = draw_pupils(
                    canvas, face, sp["look"],
                    transform=lambda at: rig.anchor_world(
                        at, head_bone, pose),
                    feat_h=rig.H)
            elif prop_state and not (overlay_blink or overlay_talk):
                canvas = canvas.copy()  # never draw on the rig's cache

            def paste_prop(dst, i, fi, dq):
                pr = sp["props"][i]
                pim = pr["imgs"][fi]["im"]
                kp = pr["size"] * rig.rest_h / pim.height
                pim = pim.resize((max(1, round(pim.width * kp)),
                                  max(1, round(pim.height * kp))),
                                 Image.LANCZOS)
                if dq:  # dropped: gravity owns it now
                    ax, ay = dq[0], dq[1]
                    total = dq[2] + pr["rot"]
                else:
                    ang = rig.bone_state(pr["bone"], pose)[0] \
                        if pr["follow"] else 0.0
                    total = ang + pr["rot"]
                    ax, ay = rig.anchor_world(pr["at"], pr["bone"], pose)
                px = pr["anchor"][0] * pim.width
                py = pr["anchor"][1] * pim.height
                if abs(total) > 0.05:
                    w0, h0 = pim.size
                    pim = pim.rotate(-total, resample=Image.BICUBIC,
                                     expand=True)
                    th = math.radians(total)
                    rx, ry = px - w0 / 2, py - h0 / 2
                    px = rx * math.cos(th) - ry * math.sin(th) \
                        + pim.width / 2
                    py = rx * math.sin(th) + ry * math.cos(th) \
                        + pim.height / 2
                x = int(round(ax - px))
                y = int(round(ay - py))
                sx, sy = max(-x, 0), max(-y, 0)
                ex = min(pim.width, dst.width - x)
                ey = min(pim.height, dst.height - y)
                if ex > sx and ey > sy:
                    dst.alpha_composite(pim.crop((sx, sy, ex, ey)),
                                        (x + sx, y + sy))

            behind = [ps for ps in prop_state
                      if sp["props"][ps[0]]["imgs"][ps[1]]["z"] == "behind"]
            front = [ps for ps in prop_state if ps not in behind]
            if behind:
                base = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
                for i, fi, dq in behind:
                    paste_prop(base, i, fi, dq)
                base.alpha_composite(canvas)
                canvas = base
            for i, fi, dq in front:
                paste_prop(canvas, i, fi, dq)
            k = sp["k"]
            img = canvas.resize((round(canvas.width * k),
                                 round(canvas.height * k)), Image.LANCZOS)
            if sp["flip"]:
                img = img.transpose(Image.FLIP_LEFT_RIGHT)
            if len(sp["cache"]) > 48:
                sp["cache"].clear()
            sp["cache"][key] = img
        return img

    def boil(self, rng):
        return (rng.uniform(-1, 1) * self.boil_px * self.H,
                rng.uniform(-1, 1) * self.boil_px * self.H,
                rng.uniform(-1, 1) * self.boil_deg)

    def draw_frame(self, shot_i, s, f):
        t = f / self.fps
        frame = s["bg"].copy()
        for j, sp in enumerate(s["sprites"]):
            a = sp["cfg"]
            if "appear" in a and not \
                    (a["appear"][0] <= t <= a["appear"][1]):
                continue  # e.g. a muzzle flash visible for two frames
            talking = sp["mouth"] is not None and bool(sp["mouth"][f])
            blinking = any(bt <= t < bt + 2.0 / self.fps for bt in sp["blinks"])
            dx, dy, rot, smul = move_offset(a.get("moves", []), t,
                                            s["duration"], sp["phase"])
            if sp.get("rig") is not None:
                px0, py0 = a.get("at", [0.5, 0.85])
                img = self._rig_frame(sp, t, talking, blinking,
                                      (px0 + dx, py0 + dy, smul))
            else:
                imgs = sp["imgs"]
                if sp["alt"] is not None and \
                        int(t / (sp["alt_period"] / 2)) % 2:
                    imgs = sp["alt"]
                img = imgs["blink"] \
                    if (blinking and imgs["blink"] is not None) \
                    else (imgs["talk"]
                          if (talking and imgs["talk"] is not None)
                          else imgs["body"])
            if a.get("still"):
                bx = by = brot = 0.0  # the dead do not boil
            else:
                brng = random.Random(
                    (shot_i * 733 + j * 97 + f // self.boil_every))
                bx, by, brot = self.boil(brng)
            if smul != 1.0:
                img = img.resize((max(1, round(img.width * smul)),
                                  max(1, round(img.height * smul))),
                                 Image.LANCZOS)
            angle = rot + brot + a.get("rotate", 0)
            ax, ay = sp["anchor"]
            axp, ayp = ax * img.width, ay * img.height
            if abs(angle) > 0.05:
                # rotate ABOUT THE ANCHOR: a 90-degree lean (a corpse
                # timbering over) pivots on the feet, not the bbox
                w0, h0 = img.size
                img = img.rotate(-angle, resample=Image.BICUBIC,
                                 expand=True)
                th = math.radians(angle)
                rx, ry = axp - w0 / 2, ayp - h0 / 2
                axp = rx * math.cos(th) - ry * math.sin(th) \
                    + img.width / 2
                ayp = rx * math.sin(th) + ry * math.cos(th) \
                    + img.height / 2
            px, py = a.get("at", [0.5, 0.85])
            x = round((px + dx) * self.W - axp + bx)
            y = round((py + dy) * self.H - ayp + by)
            frame.paste(img, (x, y), img)
        z = self.zoom_at(s, t)
        shake = s.get("cam_shake")
        ox = oy = 0.0
        if shake:
            st = shake.get("t")
            if st is None or st[0] <= t <= st[1]:
                amp = shake.get("amp", 0.006)
                rng = random.Random((shot_i * 977 + f) * 31)
                ox = rng.uniform(-1, 1) * amp * self.W
                oy = rng.uniform(-1, 1) * amp * self.H
                z = max(z, 1.0 + 2.2 * amp)  # room to shake within frame
        if z > 1.0001 or ox or oy:
            zw, zh = round(self.W / z), round(self.H / z)
            x = int(min(max((self.W - zw) / 2 + ox, 0), self.W - zw))
            y = int(min(max((self.H - zh) / 2 + oy, 0), self.H - zh))
            frame = frame.crop((x, y, x + zw, y + zh)).resize(
                (self.W, self.H), Image.LANCZOS)
        cap = s.get("caption")
        if cap:
            if s.get("caption_chunks"):
                cap = next((c for c, f0, f1 in s["caption_chunks"]
                            if f0 <= f < f1), s["caption_chunks"][-1][0])
            self.draw_caption(frame, cap, s.get("caption_y", self.caption_y))
        iris = s.get("iris")
        if iris:
            # cartoon iris-out: black closes in to a circle on the target
            t0, t1 = iris.get("t", [0, s["duration"]])
            u = max(0.0, min(1.0, (t - t0) / max(t1 - t0, 1e-6)))
            r0, r1 = iris.get("r0", 1.2), iris.get("r1", 0.0)
            r = (r0 + (r1 - r0) * ease(u)) * self.H
            cx, cy = iris.get("at", [0.5, 0.5])
            cx, cy = cx * self.W, cy * self.H
            mask = Image.new("L", (self.W, self.H), 255)
            d = ImageDraw.Draw(mask)
            if r > 1:
                d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=0)
            black = Image.new("RGB", (self.W, self.H), (8, 8, 8))
            frame = Image.composite(black, frame, mask)
        return frame

    @staticmethod
    def zoom_at(s, t):
        """Camera zoom at time t.

        zoom: [z0, z1]                      linear across the shot
        zoom: {from, to, t: [t0, t1]}       SNAP: eases hard between t0
                                            and t1, holds outside — the
                                            punchy meme punch-in
        """
        zoom = s.get("zoom")
        if not zoom:
            return 1.0
        if isinstance(zoom, dict):
            z0, z1 = zoom.get("from", 1.0), zoom.get("to", 1.15)
            t0, t1 = zoom.get("t", [0, 0.25])
            if t <= t0:
                return z0
            if t >= t1:
                return z1
            u = (t - t0) / max(t1 - t0, 1e-6)
            return z0 + (z1 - z0) * (1 - (1 - u) ** 3)  # hard ease-out
        z0, z1 = zoom
        return z0 + (z1 - z0) * (t / s["duration"])

    def draw_caption(self, frame, text, y_frac):
        d = ImageDraw.Draw(frame)
        lines = wrap_caption(d, text, self.font, int(self.W * 0.86))
        lh = int(self.font_size * 1.3)
        y = int(y_frac * self.H) - (len(lines) * lh) // 2
        px = int(self.font_size * 0.4)
        py = int(self.font_size * 0.16)
        for line in lines:
            bb = d.textbbox((0, 0), line, font=self.font)
            w, asc = bb[2], bb[1]
            x = (self.W - w) // 2
            if self.caption_bg:
                d.rounded_rectangle(
                    [x - px, y + asc - py, x + w + px,
                     y + bb[3] + py],
                    radius=int(self.font_size * 0.25),
                    fill=(255, 255, 255))
            d.text((x, y), line, font=self.font, fill=self.caption_color)
            y += lh

    # -------------------------------------------------- audio mix

    def mix_audio(self, prepped):
        """Dialogue timeline + per-shot foley cues + looped ambience.

        Shot yaml:   sfx: [{file: sfx/gunshot.mp3, at: 0.2, gain: 0.8,
                            dur: 1.5, loop: false}]
        Episode yaml: ambience: {file: sfx/birds.wav, gain: 0.2}
        A cue without dur plays out fully (a gunshot's tail rings into
        the next shot on purpose); dur cuts it with a short fade.
        """
        if not prepped:
            return np.zeros(1, dtype=np.float32)
        mix = np.concatenate([s["pcm"] for s in prepped]).copy()

        def add(pcm, start_s, gain):
            i = int(start_s * AUDIO_SR)
            if i >= len(mix):
                return
            pcm = pcm[:len(mix) - i]
            mix[i:i + len(pcm)] += pcm * gain

        offset = 0.0
        for s in prepped:
            for cue in s.get("sfx") or []:
                pcm = decode_audio(self.path(cue["file"]), AUDIO_SR)
                dur = cue.get("dur")
                if dur:
                    n = int(dur * AUDIO_SR)
                    if cue.get("loop") and len(pcm) < n:
                        pcm = np.tile(pcm, n // len(pcm) + 1)
                    pcm = pcm[:n].copy()
                    fade = min(len(pcm), int(0.06 * AUDIO_SR))
                    if fade:
                        pcm[-fade:] *= np.linspace(1, 0, fade,
                                                   dtype=np.float32)
                add(pcm, offset + cue.get("at", 0.0), cue.get("gain", 1.0))
            offset += s["duration"]

        amb = self.ep.get("ambience")
        for bed in ([amb] if isinstance(amb, dict) else amb or []):
            pcm = decode_audio(self.path(bed["file"]), AUDIO_SR)
            reps = len(mix) // len(pcm) + 1
            add(np.tile(pcm, reps), 0.0, bed.get("gain", 0.2))

        # music regions: score by beat span. {file, from: beat, to: beat,
        # gain} — starts with the from-beat's shot, cuts at the end of the
        # to-beat's shot (short edge fades stop clicks, so a region change
        # reads as a cut).
        starts, acc = {}, 0.0
        ends = {}
        for s in prepped:
            b = s.get("beat")
            if b is not None:
                starts.setdefault(b, acc)
                ends[b] = acc + s["duration"]
            acc += s["duration"]
        for reg in self.ep.get("music") or []:
            if reg["from"] not in starts or reg["to"] not in ends:
                continue  # partial render (--shot) may omit the span
            t0, t1 = starts[reg["from"]], ends[reg["to"]]
            n = int((t1 - t0) * AUDIO_SR)
            pcm = decode_audio(self.path(reg["file"]), AUDIO_SR)
            if len(pcm) < n:
                pcm = np.tile(pcm, n // len(pcm) + 1)
            pcm = pcm[:n].copy()
            fade = min(len(pcm) // 2, int(0.08 * AUDIO_SR))
            pcm[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)
            pcm[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
            add(pcm, t0, reg.get("gain", 0.3))
        return np.clip(mix, -1, 1)

    # -------------------------------------------------- output

    def render(self, out_path, only_shot=None, skip_preflight=False):
        if not skip_preflight and only_shot is None:
            self.run_preflight()
        shots = self.ep["shots"]
        idxs = range(len(shots)) if only_shot is None else [only_shot]
        prepped = [self.prep_shot(i, shots[i]) for i in idxs]

        audio_path = out_path + ".temp.wav"
        write_wav(audio_path, self.mix_audio(prepped))

        proc = subprocess.Popen(
            ["ffmpeg", "-y", "-v", "error",
             "-f", "rawvideo", "-pix_fmt", "rgb24",
             "-s", f"{self.W}x{self.H}", "-r", str(self.fps), "-i", "-",
             "-i", audio_path,
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22",
             "-c:a", "aac", "-b:a", "128k", "-shortest", out_path],
            stdin=subprocess.PIPE)
        total = sum(s["frames"] for s in prepped)
        done = 0
        for i, s in zip(idxs, prepped):
            for f in range(s["frames"]):
                frame = self.draw_frame(i, s, f)
                proc.stdin.write(frame.tobytes())
                done += 1
            print(f"  shot {i}: {s['frames']} frames "
                  f"({done}/{total})", file=sys.stderr)
        proc.stdin.close()
        proc.wait()
        os.remove(audio_path)
        if proc.returncode:
            raise SystemExit("ffmpeg failed")
        dur = total / self.fps
        print(f"wrote {out_path}  {self.W}x{self.H} @ {self.fps}fps  "
              f"{dur:.1f}s", file=sys.stderr)

    def still(self, t, out_path):
        shots = self.ep["shots"]
        acc = 0.0
        for i in range(len(shots)):
            s = self.prep_shot(i, shots[i])
            if t < acc + s["duration"] or i == len(shots) - 1:
                f = int((t - acc) * self.fps)
                self.draw_frame(i, s, max(0, min(s["frames"] - 1, f))) \
                    .save(out_path)
                print(f"wrote {out_path} (shot {i})", file=sys.stderr)
                return
            acc += s["duration"]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("episode")
    ap.add_argument("-o", "--out")
    ap.add_argument("--draft", action="store_true",
                    help="render at half resolution")
    ap.add_argument("--shot", type=int, help="render a single shot")
    ap.add_argument("--still", nargs=2, metavar=("T", "PNG"),
                    help="write the frame at time T seconds to PNG")
    ap.add_argument("--skip-preflight", action="store_true",
                    help="render even though the script preflight fails "
                         "(debugging only)")
    args = ap.parse_args()

    r = EpisodeRenderer(args.episode, scale=0.5 if args.draft else 1.0)
    if args.still:
        r.still(float(args.still[0]), args.still[1])
        return
    out = args.out or os.path.splitext(args.episode)[0] + \
        ("-draft.mp4" if args.draft else ".mp4")
    r.render(out, only_shot=args.shot, skip_preflight=args.skip_preflight)


if __name__ == "__main__":
    main()
