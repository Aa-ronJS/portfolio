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
import json
import math
import os
import random
import struct
import subprocess
import sys
import wave

import numpy as np
import yaml
from PIL import Image, ImageDraw, ImageFont

AUDIO_SR = 44100          # everything is resampled to this before the mux
ENV_SR = 16000            # envelope analysis rate
ENV_WIN = 0.03            # seconds per envelope window


# ---------------------------------------------------------------- audio

def decode_audio(path, sr):
    """Decode any audio file ffmpeg understands to mono float32 at sr."""
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1",
         "-ar", str(sr), "-"],
        capture_output=True, check=True)
    return np.frombuffer(out.stdout, dtype=np.float32)


def envelope(path):
    """Loudness envelope of a voice line, normalised to roughly 0..1.

    Returns (values, rate_hz). Sample it at each frame time to decide
    whether the mouth is open.
    """
    pcm = decode_audio(path, ENV_SR)
    win = max(1, int(ENV_SR * ENV_WIN))
    n = len(pcm) // win
    if n == 0:
        return np.zeros(1), 1.0 / ENV_WIN
    rms = np.sqrt((pcm[:n * win].reshape(n, win) ** 2).mean(axis=1))
    peak = np.percentile(rms, 97)
    if peak > 1e-6:
        rms = rms / peak
    return np.clip(rms, 0, 1.5), 1.0 / ENV_WIN


def write_wav(path, pcm):
    pcm16 = (np.clip(pcm, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(AUDIO_SR)
        w.writeframes(pcm16.tobytes())


# ---------------------------------------------------------------- assets

class Character:
    """A character is a folder of pre-aligned, same-size PNG variants.

    body.png            required — resting pose, mouth closed
    talk.png            optional — same drawing, mouth open
    blink.png           optional — same drawing, eyes shut
    char.json           optional — {"anchor": [x, y]} normalised anchor,
                        default [0.5, 1.0] (feet, bottom-centre)
    """

    def __init__(self, folder):
        self.folder = folder
        self.body = Image.open(os.path.join(folder, "body.png")).convert("RGBA")
        self.talk = self._opt("talk.png")
        self.blink = self._opt("blink.png")
        self.anchor = (0.5, 1.0)
        meta = os.path.join(folder, "char.json")
        if os.path.exists(meta):
            with open(meta) as f:
                self.anchor = tuple(json.load(f).get("anchor", self.anchor))

    def _opt(self, name):
        p = os.path.join(self.folder, name)
        return Image.open(p).convert("RGBA") if os.path.exists(p) else None

    def frame(self, talking, blinking):
        if blinking and self.blink is not None:
            return self.blink
        if talking and self.talk is not None:
            return self.talk
        return self.body


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
        self.chars = {}

    def path(self, p):
        return p if os.path.isabs(p) else os.path.join(self.root, p)

    def char(self, name):
        if name not in self.chars:
            self.chars[name] = Character(self.path(os.path.join("characters", name)))
        return self.chars[name]

    # -------------------------------------------------- per-shot prep

    def prep_shot(self, i, shot):
        s = dict(shot)
        s["env"] = None
        s["pcm"] = np.zeros(0, dtype=np.float32)
        if shot.get("audio"):
            ap = self.path(shot["audio"])
            s["pcm"] = decode_audio(ap, AUDIO_SR)
            s["env"], s["env_rate"] = envelope(ap)
            audio_dur = len(s["pcm"]) / AUDIO_SR
            s["duration"] = shot.get("duration") or (audio_dur + self.tail)
        elif "duration" not in shot:
            raise SystemExit(f"shot {i}: needs 'audio' or 'duration'")
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
        for j, a in enumerate(shot.get("actors", [])):
            if "char" in a:
                c = self.char(a["char"])
                imgs = {"body": c.body, "talk": c.talk, "blink": c.blink}
                anchor = c.anchor
            else:
                img = Image.open(self.path(a["image"])).convert("RGBA")
                imgs = {"body": img, "talk": None, "blink": None}
                anchor = tuple(a.get("anchor", [0.5, 1.0]))
            h = int(a.get("scale", 0.4) * self.H)
            k = h / imgs["body"].height
            scaled = {}
            for key, im in imgs.items():
                if im is None:
                    scaled[key] = None
                    continue
                im = im.resize((round(im.width * k), round(im.height * k)),
                               Image.LANCZOS)
                if a.get("flip"):
                    im = im.transpose(Image.FLIP_LEFT_RIGHT)
                scaled[key] = im
            s["sprites"].append({
                "imgs": scaled, "anchor": anchor, "cfg": a,
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
            talking = False
            if a.get("talk") and s["env"] is not None:
                k = min(len(s["env"]) - 1, int(t * s["env_rate"]))
                talking = s["env"][k] > a.get("talk_threshold", 0.28)
            blinking = any(bt <= t < bt + 2.0 / self.fps for bt in sp["blinks"])
            img = sp["imgs"]["blink"] if (blinking and sp["imgs"]["blink"] is not None) \
                else (sp["imgs"]["talk"] if (talking and sp["imgs"]["talk"] is not None)
                      else sp["imgs"]["body"])
            dx, dy, rot, smul = move_offset(a.get("moves", []), t,
                                            s["duration"], sp["phase"])
            brng = random.Random((shot_i * 733 + j * 97 + f // self.boil_every))
            bx, by, brot = self.boil(brng)
            if smul != 1.0:
                img = img.resize((max(1, round(img.width * smul)),
                                  max(1, round(img.height * smul))),
                                 Image.LANCZOS)
            angle = rot + brot
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

    # -------------------------------------------------- output

    def render(self, out_path, only_shot=None):
        shots = self.ep["shots"]
        idxs = range(len(shots)) if only_shot is None else [only_shot]
        prepped = [self.prep_shot(i, shots[i]) for i in idxs]

        audio_path = out_path + ".temp.wav"
        write_wav(audio_path, np.concatenate([s["pcm"] for s in prepped])
                  if prepped else np.zeros(1, dtype=np.float32))

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
    args = ap.parse_args()

    r = EpisodeRenderer(args.episode, scale=0.5 if args.draft else 1.0)
    if args.still:
        r.still(float(args.still[0]), args.still[1])
        return
    out = args.out or os.path.splitext(args.episode)[0] + \
        ("-draft.mp4" if args.draft else ".mp4")
    r.render(out, only_shot=args.shot)


if __name__ == "__main__":
    main()
