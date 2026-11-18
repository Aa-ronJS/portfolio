"""Word timings for captions.

faster-whisper hears the narration and gives a time for every word. The
words it hears are then matched back onto the SCRIPT, so the captions
always spell what was written (names, numbers) with whisper's timing.
Script words whisper missed get times spread between their neighbours.
"""
from __future__ import annotations

import difflib
import re
import subprocess
from pathlib import Path

import numpy as np


def _norm(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower())


def word_times(wav: Path, script: str, model_size: str = "base.en") -> list[tuple[str, float, float]]:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    # Decode with ffmpeg ourselves: faster-whisper's own decoder (PyAV)
    # breaks whenever its pinned version drifts.
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(wav), "-f", "s16le",
                          "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
    segs, _ = model.transcribe(audio, word_timestamps=True, initial_prompt=script[:800],
                               vad_filter=False, beam_size=5)
    heard = [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or [])]
    written = script.split()

    times: list[tuple[float, float] | None] = [None] * len(written)
    sm = difflib.SequenceMatcher(a=[_norm(w) for w in written],
                                 b=[_norm(h[0]) for h in heard], autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            times[a + k] = (heard[b + k][1], heard[b + k][2])

    # fill gaps by spreading the missing words evenly between known neighbours
    total = heard[-1][2] if heard else 1.0
    i = 0
    while i < len(times):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(times) and times[j] is None:
            j += 1
        start = times[i - 1][1] if i > 0 else 0.0
        end = times[j][0] if j < len(times) else total
        step = max(0.05, (end - start) / (j - i))
        for k in range(i, j):
            s = start + (k - i) * step
            times[k] = (s, s + step)
        i = j
    return [(w, t[0], t[1]) for w, t in zip(written, times)]
