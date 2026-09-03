#!/usr/bin/env python3
"""Animate the hand-drawn character reading Shakespeare.

Pipeline: 16 hand-drawn pose frames (same base drawing, redrawn arms/face)
-> white background keyed out -> composited over pastel yellow at 24 fps,
mouth driven by the speech audio envelope, blinks and posture changes on a
schedule, gentle drift/bob so he moves around -> ffmpeg muxes with the
Piper TTS audio into shakespeare.mp4.

Run from animation/:  python3 build.py
Needs: speech.wav (see README), pillow, numpy, scipy, ffmpeg.
"""

import math
import subprocess
import wave
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).parent
OUT_FRAMES = HERE / "render"
FPS = 24
W, H = 1280, 720
BG = (252, 240, 173)  # pastel yellow
CHAR_HEIGHT = 660      # character height on canvas, px
SPEECH_START = 1.1     # seconds of quiet intro before the audio begins
TAIL = 1.3             # seconds of hold after the speech ends

# pose -> {(eyes_open, mouth_open): frame file}
POSES = {
    "crossed": {(True, False): "crossed_eo_mc.jpg", (False, False): "crossed_ec_mc.jpg"},
    "shrug": {
        (True, True): "shrug_eo_mo.jpg", (True, False): "shrug_eo_mc.jpg",
        (False, True): "shrug_ec_mo.jpg", (False, False): "shrug_ec_mc.jpg",
    },
    "palm": {
        (True, True): "palm_eo_mo.jpg", (True, False): "palm_eo_mc.jpg",
        (False, True): "palm_ec_mo.jpg", (False, False): "palm_ec_mc.jpg",
    },
    "point": {
        (True, True): "point_eo_mo.jpg", (True, False): "point_eo_mc.jpg",
        (False, False): "point_ec_mc.jpg",
    },
}

# (end_time_factor is absolute seconds) pose schedule + horizontal waypoint
# x is the character centre as a fraction of canvas width.
SEGMENTS = [
    (1.0,  "crossed", 0.50),
    (6.5,  "palm",    0.62),
    (12.5, "shrug",   0.40),
    (17.5, "point",   0.66),
    (22.5, "palm",    0.36),
    (27.3, "shrug",   0.55),
    (99.0, "crossed", 0.50),
]

BLINKS = [3.2, 6.1, 9.4, 12.4, 15.2, 18.8, 21.6, 24.9, 27.6]
BLINK_LEN = 0.16


def key_out_background(path: Path) -> Image.Image:
    """Make the near-white paper background transparent, keeping interior whites."""
    img = np.asarray(Image.open(path).convert("RGB")).astype(np.uint8)
    near_white = img.min(axis=2) > 225
    labels, _ = ndimage.label(near_white)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, border[border != 0])
    # erode a touch to swallow JPEG halo, then feather the edge
    keep = ~ndimage.binary_dilation(bg, iterations=2)
    alpha = ndimage.gaussian_filter(keep.astype(np.float32), 1.2)
    rgba = np.dstack([img, (np.clip(alpha, 0, 1) * 255).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def load_sprites():
    """Load all pose variants, plus the y of the character's feet within the
    sprite (all drawings share one base, so one measurement serves them all)."""
    sprites = {}
    scale = None
    foot_bottom = 0
    for pose, variants in POSES.items():
        sprites[pose] = {}
        for key, fname in variants.items():
            im = key_out_background(HERE / "frames" / fname)
            if scale is None:
                scale = CHAR_HEIGHT / im.height
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
            sprites[pose][key] = im
    bbox = sprites["crossed"][(True, False)].getchannel("A").getbbox()
    foot_bottom = bbox[3]
    return sprites, foot_bottom


def mouth_envelope(wav_path: Path, n_frames: int) -> np.ndarray:
    """Per-video-frame 'mouth open' flags from the speech RMS envelope."""
    with wave.open(str(wav_path)) as w:
        rate = w.getframerate()
        audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    audio /= 32768.0
    hop = rate / FPS
    rms = np.array([
        np.sqrt(np.mean(audio[int(i * hop):int((i + 1) * hop)] ** 2) + 1e-12)
        for i in range(int(len(audio) / hop))
    ])
    loud = rms > max(0.02, np.percentile(rms, 55) * 0.5)
    # a natural lip-flap: while loud, alternate open/closed every 3 frames
    open_flags = np.zeros(n_frames, dtype=bool)
    offset = int(SPEECH_START * FPS)
    for i, is_loud in enumerate(loud):
        j = offset + i
        if j < n_frames and is_loud:
            open_flags[j] = (i // 3) % 2 == 0
    return open_flags


def pose_and_x(t: float):
    prev_end, prev_x = 0.0, SEGMENTS[0][2]
    for end, pose, x in SEGMENTS:
        if t < end:
            # ease the drift over the first 1.2s of each segment
            ease_t = min(1.0, (t - prev_end) / 1.2)
            eased = (1 - math.cos(ease_t * math.pi)) / 2
            return pose, prev_x + (x - prev_x) * eased
        prev_end, prev_x = end, x
    return SEGMENTS[-1][1], SEGMENTS[-1][2]


def main():
    with wave.open(str(HERE / "speech.wav")) as w:
        speech_dur = w.getnframes() / w.getframerate()
    total = SPEECH_START + speech_dur + TAIL
    n_frames = int(total * FPS)
    print(f"speech {speech_dur:.2f}s, clip {total:.2f}s, {n_frames} frames")

    sprites, foot_bottom = load_sprites()
    ground = H - 34
    mouths = mouth_envelope(HERE / "speech.wav", n_frames)

    OUT_FRAMES.mkdir(exist_ok=True)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for i in range(n_frames):
        t = i / FPS
        pose, xf = pose_and_x(t)
        eyes_open = not any(b <= t < b + BLINK_LEN for b in BLINKS)
        mouth_open = bool(mouths[i])
        variants = sprites[pose]
        key = (eyes_open, mouth_open)
        if key not in variants:  # e.g. point blink w/ open mouth, crossed talking
            key = (eyes_open, False) if (eyes_open, False) in variants else (True, mouth_open)
            if key not in variants:
                key = (True, False)
        sprite = variants[key]

        canvas = Image.new("RGB", (W, H), BG)
        bob = math.sin(t * math.tau * 0.55) * 5
        x = round(xf * W - sprite.width / 2)
        y = round(ground - foot_bottom + bob)

        # soft grounding shadow under the feet
        sh = shadow.copy()
        from PIL import ImageDraw
        d = ImageDraw.Draw(sh)
        cx = x + sprite.width // 2
        squash = 1 - bob / 40  # shadow breathes slightly with the bob
        d.ellipse([cx - 150 * squash, ground - 14, cx + 150 * squash, ground + 20],
                  fill=(120, 105, 40, 60))
        canvas.paste(Image.composite(sh, Image.new("RGBA", sh.size, (0, 0, 0, 0)), sh),
                     (0, 0), sh)
        canvas.paste(sprite, (x, y), sprite)
        canvas.save(OUT_FRAMES / f"{i:04d}.png")
        if i % 120 == 0:
            print(f"  frame {i}/{n_frames} pose={pose}")

    subprocess.run([
        "ffmpeg", "-y", "-framerate", str(FPS), "-i", str(OUT_FRAMES / "%04d.png"),
        "-itsoffset", str(SPEECH_START), "-i", str(HERE / "speech.wav"),
        "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-t", f"{total:.2f}",
        str(HERE / "shakespeare.mp4"),
    ], check=True)
    print("wrote shakespeare.mp4")


if __name__ == "__main__":
    main()
