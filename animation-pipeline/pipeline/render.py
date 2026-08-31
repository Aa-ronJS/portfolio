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
        if os.path.exists(meta):
            with open(meta) as f:
                m = json.load(f)
            self.anchor = tuple(m.get("anchor", self.anchor))
            self.world_height = m.get("world_height")
            # which way the DRAWING faces: "left"/"right" for profile
            # characters (enables auto-facing), absent for front-on ones
            # (never auto-flipped — mirrored shirt text looks wrong)
            self.facing = m.get("facing")
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
        elif kind == "pop":
            t1 = m.get("t", [0, 0.25])[1]
            u = ease(max(0.0, min(1.0, t / max(t1, 1e-6))))
            scale *= 0.2 + 0.8 * u
        elif kind == "lean":
            rot += m.get("deg", 5.0) * ease(max(0.0, min(1.0, t / max(t1 - t0, 1e-6))))
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
            s["duration"] = shot.get("duration") or (audio_dur + self.tail)
        elif "duration" not in shot:
            raise SystemExit(f"shot {i}: needs 'audio', 'line' or 'duration'")
        s["frames"] = max(1, round(s["duration"] * self.fps))
        s["duration"] = s["frames"] / self.fps
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
        # pre-scale actor sprites once per shot
        s["sprites"] = []
        talker = next((x for x in shot.get("actors", [])
                       if x.get("talk")), None)
        for j, a in enumerate(shot.get("actors", [])):
            if "char" in a:
                c = self.char(a["char"])
                body, talk, blink = c.pick(a.get("pose"))
                imgs = {"body": body, "talk": talk, "blink": blink}
                anchor = c.anchor
            else:
                c = None
                img = Image.open(self.path(a["image"])).convert("RGBA")
                imgs = {"body": img, "talk": None, "blink": None}
                anchor = tuple(a.get("anchor", [0.5, 1.0]))
            if "scale" in a or c is None or c.world_height is None:
                # legacy sizing: fraction of canvas height, canvas-based
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
            if "flip" in a:
                do_flip = a["flip"]
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

            scaled = scale_set(imgs)
            # alt_pose: the sprite alternates between its pose and this
            # one on a timer — a two-frame gesture cycle (arm wave, etc.)
            alt = None
            if c is not None and a.get("alt_pose"):
                ab, at_, abl = c.pick(a["alt_pose"])
                alt = scale_set({"body": ab, "talk": at_, "blink": abl})
            mouth = None
            if a.get("talk") and s["env"] is not None:
                mouth = mouth_track(
                    s["env"], s["env_rate"], s["frames"], self.fps,
                    style=a.get("talk_style", self.talk_style),
                    thr=a.get("talk_threshold", 0.28))
            s["sprites"].append({
                "imgs": scaled, "alt": alt,
                "alt_period": a.get("alt_period", 0.8),
                "anchor": anchor, "cfg": a, "mouth": mouth,
                "phase": random.Random((i + 1) * 37 + j).random(),
                "blinks": self._blink_times(s["duration"], (i + 1) * 91 + j)
                          if scaled["blink"] is not None else [],
            })
        return s

    @staticmethod
    def _blink_times(dur, seed):
        rng = random.Random(seed)
        t, out = rng.uniform(0.6, 2.2), []
        while t < dur:
            out.append(t)
            t += rng.uniform(1.8, 4.0)
        return out

    # -------------------------------------------------- frame drawing

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
            imgs = sp["imgs"]
            if sp["alt"] is not None and \
                    int(t / (sp["alt_period"] / 2)) % 2:
                imgs = sp["alt"]
            img = imgs["blink"] if (blinking and imgs["blink"] is not None) \
                else (imgs["talk"] if (talking and imgs["talk"] is not None)
                      else imgs["body"])
            dx, dy, rot, smul = move_offset(a.get("moves", []), t,
                                            s["duration"], sp["phase"])
            brng = random.Random((shot_i * 733 + j * 97 + f // self.boil_every))
            bx, by, brot = self.boil(brng)
            if smul != 1.0:
                img = img.resize((max(1, round(img.width * smul)),
                                  max(1, round(img.height * smul))),
                                 Image.LANCZOS)
            angle = rot + brot + a.get("rotate", 0)
            if abs(angle) > 0.05:
                img = img.rotate(-angle, resample=Image.BICUBIC, expand=True)
            ax, ay = sp["anchor"]
            px, py = a.get("at", [0.5, 0.85])
            x = round((px + dx) * self.W - ax * img.width + bx)
            y = round((py + dy) * self.H - ay * img.height + by)
            frame.paste(img, (x, y), img)
        zoom = s.get("zoom")
        if zoom:
            z0, z1 = zoom
            z = z0 + (z1 - z0) * (t / s["duration"])
            zw, zh = round(self.W / z), round(self.H / z)
            x = (self.W - zw) // 2
            y = (self.H - zh) // 2
            frame = frame.crop((x, y, x + zw, y + zh)).resize(
                (self.W, self.H), Image.LANCZOS)
        cap = s.get("caption")
        if cap:
            self.draw_caption(frame, cap, s.get("caption_y", self.caption_y))
        return frame

    def draw_caption(self, frame, text, y_frac):
        d = ImageDraw.Draw(frame)
        lines = wrap_caption(d, text, self.font, int(self.W * 0.86))
        lh = int(self.font_size * 1.25)
        y = int(y_frac * self.H) - (len(lines) * lh) // 2
        for line in lines:
            w = d.textbbox((0, 0), line, font=self.font)[2]
            d.text(((self.W - w) // 2, y), line, font=self.font,
                   fill=self.caption_color)
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
        if amb:
            pcm = decode_audio(self.path(amb["file"]), AUDIO_SR)
            reps = len(mix) // len(pcm) + 1
            add(np.tile(pcm, reps), 0.0, amb.get("gain", 0.2))
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
