"""Narration in the creator's voice, on CPU, for nothing.

Kyutai Pocket TTS (MIT code, CC BY 4.0 weights). Cloning a voice needs
the gated model once, on your own machine (`python -m ac voice-export`);
that writes voice/voice.safetensors, a ~6 MB voice state. Every later run
loads that state into the PUBLIC model, so the daily robot needs no
Hugging Face login and no paid service.

Sentences are generated one at a time and joined with a short pause.
Short inputs keep the model from drifting on long scripts, and one bad
sentence can be regenerated without redoing the rest.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

import numpy as np
import scipy.io.wavfile as wavfile

from . import store

def sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])", text)
    out = []
    for p in parts:
        # very long sentences: split at a comma near the middle
        while len(p) > 220 and "," in p:
            cut = min((i for i, c in enumerate(p) if c == ","), key=lambda i: abs(i - len(p) / 2))
            out.append(p[: cut + 1].strip())
            p = p[cut + 1:].strip()
        if p:
            out.append(p)
    return out


def export(audio: Path, dest: Path, language: str) -> None:
    """Run once, locally, after accepting the terms at
    huggingface.co/kyutai/pocket-tts and `hf auth login`."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["pocket-tts", "export-voice", "--language", language,
                    str(audio), str(dest)], check=True)
    print(f"voice state written to {dest} ({dest.stat().st_size / 1e6:.1f} MB)")


def synthesise(text: str, out_wav: Path, cfg: dict) -> float:
    """Write the narration to out_wav; return its length in seconds."""
    from pocket_tts import TTSModel  # heavy import, only when needed

    v = cfg["voice"]
    model = TTSModel.load_model(language=v.get("language", "english"))
    src = v["file"]
    # A bare name (e.g. "alba") is a voice built into the public model,
    # handy for testing before you've exported your own.
    if "/" in src or "." in src:
        path = store.ROOT / src
        if not path.exists():
            raise FileNotFoundError(
                f"{path} not found. Make it with `python -m ac voice-export your-voice.wav`, "
                f"or set voice.file to a built-in voice (e.g. alba) to test.")
        src = str(path)
    state = model.get_state_for_audio_prompt(src)

    sr = model.sample_rate
    gap = np.zeros(int(sr * v.get("sentence_pause", 0.18)), dtype=np.float32)
    chunks = []
    for i, s in enumerate(sentences(text)):
        audio = model.generate_audio(state, s).numpy().astype(np.float32).reshape(-1)
        # A sentence that comes back far too long or silent is a model
        # hiccup: try again once before accepting it.
        expected = len(s.split()) / 2.6
        dur = len(audio) / sr
        if dur > expected * 2.5 + 2 or np.abs(audio).max() < 1e-3:
            audio = model.generate_audio(state, s).numpy().astype(np.float32).reshape(-1)
        chunks += [audio, gap]
        print(f"  voice {i + 1}: {len(audio) / sr:4.1f}s  {s[:60]}")
    full = np.concatenate(chunks[:-1]) if chunks else np.zeros(sr, np.float32)
    full = full / max(1e-6, np.abs(full).max()) * 0.9

    out_wav.parent.mkdir(parents=True, exist_ok=True)
    raw = out_wav.with_suffix(".raw.wav")
    wavfile.write(raw, sr, (full * 32767).astype(np.int16))
    # Loudness to YouTube's -14 LUFS and optional speed-up, pitch kept.
    speed = float(v.get("speed", 1.0))
    filt = (f"atempo={speed}," if abs(speed - 1) > 1e-3 else "") + "loudnorm=I=-14:TP=-1.5:LRA=11"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", filt,
                    "-ar", "48000", "-ac", "1", str(out_wav)], check=True)
    raw.unlink()
    return probe_seconds(out_wav)


def probe_seconds(path: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True)
    return float(r.stdout.strip())
