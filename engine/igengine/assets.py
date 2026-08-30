"""Fetch or synthesize the raw assets for one packet: slide images and voiceover.

Each provider activates when its key is in the environment and falls back to
something the assembler can still use, so a missing key downgrades quality,
never breaks the run.
"""

import os
import subprocess

import requests

from .config import provider_key

REPLICATE_MODEL = "black-forest-labs/flux-schnell"


def ffmpeg_bin():
    return os.environ.get("FFMPEG_BIN", "ffmpeg")


def _gradient_slide(path, width, height, seed):
    subprocess.run(
        [ffmpeg_bin(), "-y", "-v", "error",
         "-f", "lavfi",
         "-i", f"gradients=size={width}x{height}:seed={seed}:nb_colors=3:duration=1:rate=1",
         "-frames:v", "1", str(path)],
        check=True)


def _replicate_image(token, prompt, path):
    r = requests.post(
        f"https://api.replicate.com/v1/models/{REPLICATE_MODEL}/predictions",
        headers={"Authorization": f"Bearer {token}", "Prefer": "wait=60"},
        json={"input": {"prompt": prompt, "aspect_ratio": "9:16",
                        "output_format": "jpg", "output_quality": 90}},
        timeout=120)
    r.raise_for_status()
    output = r.json()["output"]
    url = output[0] if isinstance(output, list) else output
    img = requests.get(url, timeout=120)
    img.raise_for_status()
    path.write_bytes(img.content)


def _elevenlabs_tts(cfg, key, text, path):
    voice = cfg["providers"]["tts"]["voice_id"]
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        headers={"xi-api-key": key},
        json={"text": text, "model_id": "eleven_multilingual_v2"},
        timeout=300)
    r.raise_for_status()
    path.write_bytes(r.content)


def fetch(cfg, packet, workdir):
    """Return {"slides": [paths], "audio": path or None} for the packet."""
    video = cfg["engine"]["video"]
    workdir.mkdir(parents=True, exist_ok=True)

    image_key = provider_key(cfg, "image")
    slides = []
    for i, beat in enumerate(packet["beats"]):
        slide = workdir / f"slide{i:02d}.jpg"
        if image_key:
            try:
                _replicate_image(image_key, beat["image_prompt"], slide)
            except Exception as e:
                print(f"  image fallback for beat {i}: {e}")
                slide = slide.with_suffix(".png")
                _gradient_slide(slide, video["width"], video["height"], seed=i * 7 + 1)
        else:
            slide = slide.with_suffix(".png")
            _gradient_slide(slide, video["width"], video["height"], seed=i * 7 + 1)
        slides.append(slide)

    audio = None
    tts_key = provider_key(cfg, "tts")
    if tts_key:
        script = " ".join(b["voiceover"] for b in packet["beats"])
        audio = workdir / "voiceover.mp3"
        try:
            _elevenlabs_tts(cfg, tts_key, script, audio)
        except Exception as e:
            print(f"  tts fallback (silent track): {e}")
            audio = None

    return {"slides": slides, "audio": audio}
