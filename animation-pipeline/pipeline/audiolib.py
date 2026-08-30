"""Shared audio helpers: decoding, loudness envelopes, silence-based
segmentation of a raw voice take, and syllable detection for mouth flaps.
"""

import subprocess
import wave

import numpy as np

AUDIO_SR = 44100          # everything is resampled to this before the mux
ENV_SR = 16000            # envelope analysis rate
ENV_WIN = 0.03            # seconds per envelope window


def decode_audio(path, sr):
    """Decode any audio file ffmpeg understands to mono float32 at sr."""
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1",
         "-ar", str(sr), "-"],
        capture_output=True, check=True)
    return np.frombuffer(out.stdout, dtype=np.float32)


def envelope_of(pcm, sr=ENV_SR, win_s=ENV_WIN):
    """Loudness envelope (RMS per window), normalised to roughly 0..1.

    Returns (values, rate_hz).
    """
    win = max(1, int(sr * win_s))
    n = len(pcm) // win
    if n == 0:
        return np.zeros(1, dtype=np.float32), 1.0 / win_s
    rms = np.sqrt((pcm[:n * win].reshape(n, win) ** 2).mean(axis=1))
    peak = np.percentile(rms, 97)
    if peak > 1e-6:
        rms = rms / peak
    return np.clip(rms, 0, 1.5).astype(np.float32), 1.0 / win_s


def envelope(path):
    return envelope_of(decode_audio(path, ENV_SR))


def write_wav(path, pcm, sr=AUDIO_SR):
    pcm16 = (np.clip(pcm, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm16.tobytes())


# ---------------------------------------------------------------- take split

def find_lines(pcm, sr=ENV_SR, min_pause=0.35, min_line=0.25, pad=0.12):
    """Find spoken lines in a raw take, separated by silence.

    Returns a list of (t0, t1) in seconds. Tuned for one person recording
    voice lines on a phone with roughly half-second gaps between them.
    """
    env, rate = envelope_of(pcm, sr)
    floor = np.percentile(env, 20)
    thr = max(floor * 2.5 + 0.015, 0.08)
    speech = env > thr

    # raw contiguous regions
    regions = []
    start = None
    for i, s in enumerate(list(speech) + [False]):
        if s and start is None:
            start = i
        elif not s and start is not None:
            regions.append((start / rate, i / rate))
            start = None

    # merge regions separated by less than min_pause
    merged = []
    for r in regions:
        if merged and r[0] - merged[-1][1] < min_pause:
            merged[-1] = (merged[-1][0], r[1])
        else:
            merged.append(list(r))
    merged = [r for r in merged if r[1] - r[0] >= min_line]

    total = len(pcm) / sr
    return [(max(0.0, t0 - pad), min(total, t1 + pad)) for t0, t1 in merged]


def split_take(path, min_pause=0.35, min_line=0.25, pad=0.12):
    """Split a raw take. Returns (list of pcm arrays at AUDIO_SR, spans)."""
    lo = decode_audio(path, ENV_SR)
    spans = find_lines(lo, ENV_SR, min_pause, min_line, pad)
    hi = decode_audio(path, AUDIO_SR)
    cuts = [hi[int(t0 * AUDIO_SR):int(t1 * AUDIO_SR)] for t0, t1 in spans]
    return cuts, spans


# ---------------------------------------------------------------- syllables

def syllable_peaks(env, rate, thr=0.28, min_gap=0.09):
    """Times of syllable nuclei: local loudness maxima above thr."""
    gap = max(1, int(min_gap * rate))
    peaks = []
    for i in range(len(env)):
        if env[i] <= thr:
            continue
        lo, hi = max(0, i - 2), min(len(env), i + 3)
        if env[i] < env[lo:hi].max():
            continue
        if peaks and i - peaks[-1] < gap:
            if env[i] > env[peaks[-1]]:
                peaks[-1] = i
            continue
        peaks.append(i)
    return [p / rate for p in peaks]


def mouth_track(env, rate, frames, fps, style="syllable", thr=0.28):
    """Boolean per-frame array: is the mouth open on this frame?

    styles:
      syllable  — mouth pops open briefly on each syllable (default)
      envelope  — open whenever the voice is loud (long vowels stay open)
      alternate — strict 0101 toggle every frame while the voice is loud
    """
    t = np.arange(frames) / fps
    idx = np.minimum((t * rate).astype(int), len(env) - 1)
    loud = env[idx] > thr
    if style == "envelope":
        return loud
    if style == "alternate":
        return loud & (np.arange(frames) % 2 == 0)
    open_ = np.zeros(frames, dtype=bool)
    hold = max(1, round(fps / 7.0))  # ~2 frames at 12fps
    for tp in syllable_peaks(env, rate, thr):
        f0 = int(tp * fps)
        open_[f0:f0 + hold] = True
    return open_
