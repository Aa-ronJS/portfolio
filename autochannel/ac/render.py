"""Narration + word timings -> finished mp4, all with ffmpeg.

Picture: a background cut every few seconds from free stock footage
(Pexels, matching the script's b-roll terms), dimmed, with big
word-by-word captions burned in via libass. If footage can't be fetched
for a cut, that cut becomes a slow colour gradient instead: a video with
a plain background still posts; a missing video doesn't.
"""
from __future__ import annotations

import json
import os
import random
import subprocess
import urllib.parse
import urllib.request
import zlib
from pathlib import Path

from . import store

FPS = 30


def _ff(*args: str) -> None:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def size(cfg: dict) -> tuple[int, int]:
    return (1080, 1920) if cfg["format"]["kind"] == "short" else (1920, 1080)


# --- b-roll -----------------------------------------------------------------

def _pexels(term: str, portrait: bool, cache: Path, used: set[int]) -> Path | None:
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        return None
    q = urllib.parse.urlencode({"query": term, "per_page": 8,
                                "orientation": "portrait" if portrait else "landscape"})
    req = urllib.request.Request(f"https://api.pexels.com/videos/search?{q}",
                                 headers={"Authorization": key, "User-Agent": "autochannel/1"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            videos = json.load(r).get("videos", [])
    except Exception as e:  # network, quota, anything: fall back, don't fail
        print(f"  pexels '{term}': {e}")
        return None
    for v in videos:
        if v["id"] in used or v.get("duration", 0) < 3:
            continue
        files = [f for f in v["video_files"] if f.get("width") and f.get("height")
                 and (f["height"] >= f["width"]) == portrait and min(f["width"], f["height"]) >= 720]
        if not files:
            continue
        f = min(files, key=lambda f: f["width"] * f["height"])  # smallest that's still sharp
        dest = cache / f"pexels-{v['id']}.mp4"
        if not dest.exists():
            try:
                req = urllib.request.Request(f["link"], headers={"User-Agent": "autochannel/1"})
                with urllib.request.urlopen(req, timeout=60) as r, open(dest.with_suffix(".part"), "wb") as o:
                    o.write(r.read())
                dest.with_suffix(".part").replace(dest)
            except Exception as e:
                print(f"  pexels download {v['id']}: {e}")
                continue
        used.add(v["id"])
        return dest
    return None


def _segment(src: Path | None, seconds: float, out: Path, w: int, h: int, seed: int) -> None:
    if src is not None:
        try:
            dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                        "-of", "csv=p=0", str(src)], capture_output=True,
                                       text=True).stdout.strip() or 0)
            start = random.Random(seed).uniform(0, max(0.0, dur - seconds))
            loop = ["-stream_loop", "-1"] if dur < seconds else []
            _ff(*loop, "-ss", f"{start:.2f}", "-i", str(src), "-t", f"{seconds:.3f}", "-an",
                "-vf", f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps={FPS},setsar=1",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", str(out))
            return
        except subprocess.CalledProcessError as e:
            print(f"  clip {src.name} unusable ({e}); using gradient")
    rng = random.Random(seed)
    cols = ["0x1b2a49", "0x3b1f4a", "0x0f3d3e", "0x4a2a1b", "0x23233a", "0x16324f"]
    c0, c1 = rng.sample(cols, 2)
    _ff("-f", "lavfi", "-i", f"gradients=s={w}x{h}:c0={c0}:c1={c1}:speed=0.008:r={FPS}:d={seconds:.3f}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", str(out))


def background(ep: dict, seconds: float, cfg: dict, work: Path) -> Path:
    w, h = size(cfg)
    vis = cfg["visuals"]
    every = float(vis.get("clip_seconds", 4))
    n = max(1, int(seconds // every) + 1)
    terms = ep.get("broll") or [ep["title"]]
    cache = store.BUILD / "broll-cache"
    cache.mkdir(parents=True, exist_ok=True)
    used: set[int] = set()
    parts = []
    for i in range(n):
        length = min(every, seconds - i * every) if i == n - 1 else every
        if length <= 0.05:
            break
        term = terms[min(i * len(terms) // n, len(terms) - 1)]
        src = _pexels(term, w < h, cache, used) if vis.get("broll") == "pexels" else None
        out = work / f"seg{i:03d}.mp4"
        _segment(src, length, out, w, h, seed=zlib.crc32(f"{ep['title']}|{i}".encode()))
        print(f"  bg {i + 1}/{n}: {'pexels' if src else 'gradient'}  ({term})")
        parts.append(out)
    lst = work / "segments.txt"
    lst.write_text("".join(f"file '{p.name}'\n" for p in parts))
    out = work / "background.mp4"
    _ff("-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out))
    return out


# --- captions ---------------------------------------------------------------

def _ass_colour(hex_rgb: str) -> str:
    r, g, b = hex_rgb.lstrip("#")[0:2], hex_rgb.lstrip("#")[2:4], hex_rgb.lstrip("#")[4:6]
    return f"&H00{b}{g}{r}".upper()


def _t(s: float) -> str:
    s = max(0.0, s)
    return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}"


def ass(words: list[tuple[str, float, float]], cfg: dict, out: Path) -> Path:
    w, h = size(cfg)
    c = cfg["visuals"]["captions"]
    fs = int(c.get("size", 0.075) * w * (1 if w < h else 0.6))
    y = int(c.get("position", 0.62) * h)
    base, hi = _ass_colour(c.get("colour", "#FFFFFF")), _ass_colour(c.get("highlight", "#FFD23F"))
    lines = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {w}", f"PlayResY: {h}", "WrapStyle: 0", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
        "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Cap,Satoshi,{fs},{base},{base},&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,"
        f"{max(3, fs // 12)},{max(2, fs // 20)},5,{w // 12},{w // 12},0,1",
        "", "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    k = max(1, int(c.get("words_per_card", 3)))
    cards, cur = [], []
    for wd in words:  # at most k words a card, and never across a sentence end
        cur.append(wd)
        if len(cur) == k or wd[0].rstrip("\"')").endswith((".", "!", "?")):
            cards.append(cur)
            cur = []
    if cur:
        cards.append(cur)
    for ci, card in enumerate(cards):
        card_end = cards[ci + 1][0][1] if ci + 1 < len(cards) else card[-1][2] + 0.4
        for wi, (_, start, _) in enumerate(card):
            end = card[wi + 1][1] if wi + 1 < len(card) else card_end
            if end <= start:
                continue
            text = " ".join(
                (f"{{\\c{hi}}}{t}{{\\c{base}}}" if j == wi else t)
                for j, (t, _, _) in enumerate(card)
            ).replace("\n", " ")
            lines.append(f"Dialogue: 0,{_t(start)},{_t(end)},Cap,,0,0,0,,{{\\pos({w // 2},{y})}}{text}")
    out.write_text("\n".join(lines) + "\n")
    return out


# --- final mux --------------------------------------------------------------

def final(bg: Path, narration: Path, subs: Path, seconds: float, cfg: dict, out: Path) -> Path:
    vis = cfg["visuals"]
    keep = 1 - float(vis.get("darken", 0.45))
    fonts = store.ROOT / "fonts"
    vf = (f"colorchannelmixer=rr={keep}:gg={keep}:bb={keep},"
          f"ass={subs.as_posix()}:fontsdir={fonts.as_posix()}")
    inputs = ["-i", str(bg), "-i", str(narration)]
    music = vis.get("music")
    if music and music != "none" and (store.ROOT / music).exists():
        inputs += ["-stream_loop", "-1", "-i", str(store.ROOT / music)]
        af = (f"[2:a]volume={vis.get('music_volume', 0.08)}[m];"
              f"[1:a][m]amix=inputs=2:duration=first:normalize=0[a]")
        amap = ["-filter_complex", af, "-map", "0:v", "-map", "[a]"]
    else:
        amap = ["-map", "0:v", "-map", "1:a"]
    _ff(*inputs, "-vf", vf, *amap, "-t", f"{seconds + 0.3:.3f}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(out))
    return out
