"""Thumbnail renderer: one picture + a few words + a channel's style.

A thumbnail is described by a small spec (which the packaging room
writes) and drawn here with Pillow at 1920x1080 (YouTube's 1080p tier;
stock footage rarely has the detail for 4K). The bottom-right corner is
kept clear: YouTube's duration badge covers it.

    {"background": "frame07.jpg",          # a frame or archive image
     "crop": [0.1, 0.0, 0.9, 1.0],         # optional, fractions of the source
     "text": "IT'S STILL THERE",           # 1-4 words
     "accent": ["STILL"],                  # words in the accent colour
     "side": "left",                       # left | right | top | bottom | center
     "focus": [0.7, 0.45],                 # where the eye should go (fractions)
     "elements": ["circle", "arrow"]}      # circle arrow redstring glow stamp grain

The channel's `thumbnail:` block in channel.yaml sets the look (font,
colours, grade, vignette), so every channel is recognisable in a feed
and different from the other six.

Also here: picking candidate frames from a video's own footage and
building the contact sheets the vision reviewer looks at.
"""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

from . import store

W, H = 1920, 1080
S = W / 1280  # all pixel sizes below are designed at 1280 wide
FONTS = store.ROOT / "fonts"

DEFAULT_STYLE = {
    "font": "ArchivoBlack-Regular.ttf",
    "text_colour": "#FFFFFF",
    "accent_colour": "#FFD23F",
    "outline_colour": "#000000",
    "uppercase": True,
    "contrast": 1.25, "saturation": 1.2, "brightness": 1.0,
    "tint": None,             # e.g. "#1a3a5a" to wash the image in the channel colour
    "tint_strength": 0.0,
    "vignette": 0.45,
    "text_scrim": 0.55,       # darken behind the text so it reads
    "grain": 0.0,
}


def _hex(c: str, a: int = 255) -> tuple:
    c = c.lstrip("#")
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)


def style_for(cfg: dict) -> dict:
    return {**DEFAULT_STYLE, **(cfg.get("thumbnail") or {})}


# --- drawing ----------------------------------------------------------------

def _background(spec: dict, st: dict) -> Image.Image:
    img = Image.open(spec["background"]).convert("RGB")
    if spec.get("crop"):
        x0, y0, x1, y1 = spec["crop"]
        img = img.crop((int(x0 * img.width), int(y0 * img.height), int(x1 * img.width), int(y1 * img.height)))
    # cover-crop to 16:9 around the focus point
    fx, fy = spec.get("focus", [0.5, 0.5])
    scale = max(W / img.width, H / img.height)
    img = img.resize((max(W, round(img.width * scale)), max(H, round(img.height * scale))), Image.LANCZOS)
    left = min(max(0, int(fx * img.width - W / 2)), img.width - W)
    top = min(max(0, int(fy * img.height - H / 2)), img.height - H)
    img = img.crop((left, top, left + W, top + H))

    img = ImageEnhance.Contrast(img).enhance(st["contrast"])
    img = ImageEnhance.Color(img).enhance(st["saturation"])
    img = ImageEnhance.Brightness(img).enhance(st["brightness"])
    if st.get("tint") and st.get("tint_strength", 0) > 0:
        img = Image.blend(img, Image.new("RGB", img.size, _hex(st["tint"])[:3]), st["tint_strength"])
    return img


def _vignette(img: Image.Image, strength: float) -> Image.Image:
    if strength <= 0:
        return img
    y, x = np.ogrid[:H, :W]
    d = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2) / math.sqrt(2)
    mask = np.clip(1 - strength * d ** 1.6, 0, 1)
    arr = (np.asarray(img).astype(np.float32) * mask[..., None]).astype(np.uint8)
    return Image.fromarray(arr)


def _scrim(img: Image.Image, side: str, strength: float) -> Image.Image:
    """A soft dark gradient behind the text, so words read on any picture."""
    if strength <= 0:
        return img
    g = np.zeros((H, W), np.float32)
    if side == "left":
        g[:] = np.clip(1 - np.linspace(0, 1.6, W), 0, 1)[None, :]
    elif side == "right":
        g[:] = np.clip(1 - np.linspace(1.6, 0, W), 0, 1)[None, :]
    elif side == "top":
        g[:] = np.clip(1 - np.linspace(0, 1.8, H), 0, 1)[:, None]
    elif side == "bottom":
        g[:] = np.clip(1 - np.linspace(1.8, 0, H), 0, 1)[:, None]
    else:
        g[:] = 0.35
    arr = np.asarray(img).astype(np.float32) * (1 - strength * g)[..., None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8))


def _splits(words: list[str], max_lines: int = 3):
    """Every way to break the words into 1..max_lines lines, in order."""
    n = len(words)
    for k in range(1, min(max_lines, n) + 1):
        def rec(start, left):
            if left == 1:
                yield [words[start:]]
                return
            for cut in range(start + 1, n - left + 2):
                for rest in rec(cut, left - 1):
                    yield [words[start:cut]] + rest
        yield from rec(0, k)


def _fit_text(draw, words: list[str], font_path: Path, box: tuple[int, int, int, int]):
    """Largest size at which the words fit the box; among layouts that fit
    at that size, the most balanced line lengths win."""
    bw, bh = box[2] - box[0], box[3] - box[1]
    for size in range(int(320 * S), 40, -6):
        font = ImageFont.truetype(str(font_path), size)
        line_h = font.getbbox("Hg")[3] - font.getbbox("Hg")[1]
        fits = []
        for lines in _splits(words):
            widths = [draw.textlength(" ".join(l), font=font) for l in lines]
            total_h = line_h * len(lines) + int(line_h * 0.12) * (len(lines) - 1)
            if max(widths) <= bw and total_h <= bh:
                fits.append((max(widths) - min(widths) + 40 * len(lines), lines))
        if fits:
            return size, font, min(fits, key=lambda f: f[0])[1], line_h
    font = ImageFont.truetype(str(font_path), 40)
    return 40, font, [words], 40


def _text(img: Image.Image, spec: dict, st: dict) -> tuple[Image.Image, tuple]:
    words = [w for w in spec.get("text", "").split() if w]
    if not words:
        return img, (0, 0, 0, 0)
    if st["uppercase"]:
        words = [w.upper() for w in words]
    accent = {a.upper() if st["uppercase"] else a for a in spec.get("accent", [])}
    side = spec.get("side", "left")
    m = int(W * 0.045)
    badge = int(H * 0.80)  # keep clear of the duration badge, bottom right
    box = {"left": (m, m, int(W * 0.55), H - m), "right": (int(W * 0.45), m, W - m, badge),
           "top": (m, m, W - m, int(H * 0.42)), "bottom": (m, int(H * 0.58), int(W * 0.78), H - m),
           "center": (int(W * 0.1), int(H * 0.25), int(W * 0.9), int(H * 0.75))}[side]
    draw = ImageDraw.Draw(img)
    size, font, lines, line_h = _fit_text(draw, words, FONTS / st["font"], box)
    gap = int(line_h * 0.12)
    block_h = line_h * len(lines) + gap * (len(lines) - 1)
    y = box[1] + (box[3] - box[1] - block_h) // 2
    stroke = max(4, size // 14)

    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ds = ImageDraw.Draw(shadow)
    placed = []
    for line in lines:
        text_w = d.textlength(" ".join(line), font=font)
        x = {"left": box[0], "right": box[2] - text_w}.get(side, box[0] + (box[2] - box[0] - text_w) / 2)
        top_off = font.getbbox("Hg")[1]
        for wd in line:
            col = _hex(st["accent_colour"]) if wd.strip(".,!?'\"") in accent or wd in accent else _hex(st["text_colour"])
            ds.text((x + stroke, y - top_off + stroke * 1.5), wd, font=font, fill=(0, 0, 0, 170))
            d.text((x, y - top_off), wd, font=font, fill=col, stroke_width=stroke,
                   stroke_fill=_hex(st["outline_colour"]))
            x += d.textlength(wd + " ", font=font)
        placed.append(y)
        y += line_h + gap
    shadow = shadow.filter(ImageFilter.GaussianBlur(stroke * 1.5))
    if "glow" in spec.get("elements", []):
        glow = layer.filter(ImageFilter.GaussianBlur(size // 6))
        img = Image.alpha_composite(img.convert("RGBA"), glow)
    out = Image.alpha_composite(Image.alpha_composite(img.convert("RGBA"), shadow), layer)
    return out.convert("RGB"), box


def _elements(img: Image.Image, spec: dict, st: dict, text_box: tuple) -> Image.Image:
    els = spec.get("elements", [])
    fx, fy = spec.get("focus", [0.7, 0.5])
    px, py = int(fx * W), int(fy * H)
    acc = _hex(st["accent_colour"])
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    r = int(H * 0.17)
    if "circle" in els:
        for k in range(3):  # slightly hand-drawn: three offset strokes
            d.ellipse((px - r - k * 2, py - r + k, px + r + k, py + r - k * 2), outline=acc, width=int(11 * S))
    if "arrow" in els and text_box != (0, 0, 0, 0):
        # from the text block's nearest edge to just short of the focus
        sx = text_box[2] + 20 * S if px > text_box[2] else text_box[0] - 20 * S
        sy = min(max(py, text_box[1] + 40 * S), text_box[3] - 40 * S)
        stop = r + 18 * S if "circle" in els else 40 * S
        ang = math.atan2(py - sy, px - sx)
        ex, ey = px - stop * math.cos(ang), py - stop * math.sin(ang)
        if math.hypot(ex - sx, ey - sy) > 60 * S:
            hl = 62 * S
            d.line((sx, sy, ex - hl / 2 * math.cos(ang), ey - hl / 2 * math.sin(ang)), fill=acc, width=int(20 * S))
            head = [(ex, ey),
                    (ex - hl * math.cos(ang - 0.5), ey - hl * math.sin(ang - 0.5)),
                    (ex - hl * math.cos(ang + 0.5), ey - hl * math.sin(ang + 0.5))]
            d.polygon(head, fill=acc)
    if "redstring" in els:
        pts = spec.get("pins") or [[0.62, 0.15], [fx, fy], [0.93, 0.42], [0.66, 0.72]]
        pts = [(int(x * W), int(y * H)) for x, y in pts]
        for a, b in zip(pts, pts[1:]):
            d.line((a, b), fill=(190, 20, 30, 235), width=int(6 * S))
        pr = int(13 * S)
        for x, y in pts:
            d.ellipse((x - pr, y - pr, x + pr, y + pr), fill=(220, 30, 40, 255), outline=(60, 0, 0, 255), width=int(3 * S))
    if "stamp" in els and spec.get("stamp_text"):
        font = ImageFont.truetype(str(FONTS / "SpecialElite-Regular.ttf"), int(64 * S))
        tw = int(d.textlength(spec["stamp_text"], font=font))
        pad = int(25 * S)
        stamp = Image.new("RGBA", (tw + 2 * pad, int(110 * S)), (0, 0, 0, 0))
        sd = ImageDraw.Draw(stamp)
        sd.rectangle((4, 4, tw + 2 * pad - 5, int(105 * S)), outline=acc, width=int(7 * S))
        sd.text((pad, int(18 * S)), spec["stamp_text"], font=font, fill=acc)
        stamp = stamp.rotate(-12, expand=True, resample=Image.BICUBIC)
        layer.alpha_composite(stamp, (min(W - stamp.width - 20, px), max(20, py - stamp.height // 2)))
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    grain = max(st.get("grain", 0), 0.06 if "grain" in els else 0)
    if grain:
        noise = np.random.default_rng(1).normal(0, 255 * grain, (H, W, 1))
        img = Image.fromarray((np.asarray(img).astype(np.float32) + noise).clip(0, 255).astype(np.uint8))
    return img


def render(spec: dict, cfg: dict, out: Path) -> Path:
    st = style_for(cfg)
    img = _background(spec, st)
    img = _vignette(img, st["vignette"])
    img = _scrim(img, spec.get("side", "left"), st["text_scrim"] if spec.get("text") else 0)
    img, box = _text(img, spec, st)
    img = _elements(img, spec, st, box)
    out.parent.mkdir(parents=True, exist_ok=True)
    for q in (90, 82, 72):  # YouTube allows 50 MB; kept small because alternates live in git
        img.save(out, "JPEG", quality=q, optimize=True)
        if out.stat().st_size < 700_000:
            break
    return out


# --- frames and review sheets -----------------------------------------------

def _sharpness(img: Image.Image) -> float:
    g = np.asarray(img.convert("L").resize((320, 180)), np.float32)
    lap = g[1:-1, 1:-1] * 4 - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:]
    return float(lap.var()) * (0.5 + float(g.std()) / 64)  # sharp AND contrasty


def candidate_frames(video: Path, work: Path, n: int = 12, sample: int = 36) -> list[Path]:
    """Pull `sample` frames evenly through the footage, keep the n best."""
    work.mkdir(parents=True, exist_ok=True)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                "csv=p=0", str(video)], capture_output=True, text=True).stdout.strip() or 0)
    frames = []
    for i in range(sample):
        t = dur * (i + 0.5) / sample
        p = work / f"cand{i:02d}.jpg"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", str(video),
                        "-frames:v", "1", "-q:v", "2", str(p)], check=False)
        if p.exists():
            frames.append((p, _sharpness(Image.open(p))))
    frames.sort(key=lambda f: -f[1])
    keep = [p for p, _ in frames[:n]]
    for p, _ in frames[n:]:
        p.unlink(missing_ok=True)
    return keep


def contact_sheet(images: list[Path], out: Path, cols: int = 4) -> Path:
    """Numbered grid so the reviewer can say 'frame 7'."""
    tw, th = 320, 180
    rows = math.ceil(len(images) / cols)
    sheet = Image.new("RGB", (cols * tw, rows * th), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(str(FONTS / "ArchivoBlack-Regular.ttf"), 28)
    for i, p in enumerate(images):
        im = Image.open(p).convert("RGB")
        im = im.resize((tw, int(im.height * tw / im.width))).crop((0, 0, tw, th))
        x, y = (i % cols) * tw, (i // cols) * th
        sheet.paste(im, (x, y))
        d.text((x + 8, y + 4), str(i), font=font, fill=(255, 230, 0), stroke_width=3, stroke_fill=(0, 0, 0))
    sheet.save(out, "JPEG", quality=85)
    return out


def phone_preview(thumbs: list[Path], out: Path) -> Path:
    """How they really look: home-feed size, 'up next' size, and in grey
    (if it doesn't read without colour, the contrast is too weak)."""
    small = [Image.open(p).resize((400, 225), Image.LANCZOS) for p in thumbs]
    tiny = [Image.open(p).resize((168, 94), Image.LANCZOS) for p in thumbs]
    grey = [Image.open(p).convert("L").convert("RGB").resize((168, 94), Image.LANCZOS) for p in thumbs]
    sheet = Image.new("RGB", (max(1, len(thumbs)) * 414, 225 + 110), (15, 15, 15))
    for i, (s, t, g) in enumerate(zip(small, tiny, grey)):
        sheet.paste(s, (i * 414, 0))
        sheet.paste(t, (i * 414, 236))
        sheet.paste(g, (i * 414 + 190, 236))
    sheet.save(out, "JPEG", quality=88)
    return out
