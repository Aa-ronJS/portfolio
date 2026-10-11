"""Cut the video: b-roll segments in order, captions and section headings
burned in, narration over ducked music, a thumbnail off the first scene.
Everything is ffmpeg; the only drawing is the thumbnail (Pillow).
"""

import os
import shutil

from . import media

FONT_DIRS = ["/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/dejavu",
             "/Library/Fonts", "C:/Windows/Fonts"]
CARD_BG = "0x15171c"
FPS = 30


def assemble(cfg, ep):
    W, H = cfg["size"]
    tl = ep.load("voice")
    plan = ep.load("broll")
    music = ep.load("music") or {"file": None}
    work = ep.path("work")
    os.makedirs(work, exist_ok=True)

    # 1. every segment as a normalised clip, then one concatenation
    parts = []
    for k, seg in enumerate(plan["segments"]):
        out = os.path.join(work, "seg%03d.mp4" % k)
        if seg.get("card"):
            _card(out, seg["text"], seg["duration"], W, H)
        else:
            _clip(out, os.path.join(cfg["_root"], seg["file"]), seg["offset"],
                  seg["duration"], W, H)
        parts.append(out)
    lst = os.path.join(work, "segments.txt")
    with open(lst, "w") as f:
        for p in parts:
            f.write("file '%s'\n" % p.replace("'", r"'\''"))
    visual = os.path.join(work, "visual.mp4")
    media.ffmpeg(["-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", visual])

    # 2. captions + headings
    ass = ep.path("captions.ass")
    write_ass(ass, tl, W, H, captions=cfg["captions"],
              title_cards=cfg["title_cards"])

    # 3. mix and burn
    vo = ep.path(tl["vo"])
    total = tl["duration"]
    final = ep.output("assemble")
    cmd = ["-i", visual, "-i", vo]
    vf = "[0:v]ass='%s'[v]" % ass.replace("\\", "/").replace(":", r"\:").replace("'", r"\'")
    if music.get("file"):
        mpath = os.path.join(cfg["_root"], music["file"])
        gain = float(cfg["music"]["gain_db"])
        duck = float(cfg["music"]["duck_db"])
        cmd += ["-stream_loop", "-1", "-i", mpath]
        af = (
            "[1:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit[v1][v2];"
            "[2:a]atrim=0:%.3f,asetpts=PTS-STARTPTS,aformat=sample_rates=48000:"
            "channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11,"
            "volume=%.1fdB,afade=t=in:d=2,"
            "afade=t=out:st=%.3f:d=3[m];"
            "[m][v2]sidechaincompress=threshold=0.02:ratio=%d:attack=40:"
            "release=700:makeup=1[md];"
            "[v1][md]amix=inputs=2:duration=first:normalize=0,"
            "alimiter=limit=0.95[a]"
            % (total, gain, max(0.0, total - 3), _ratio_for(duck)))
        graph = vf + ";" + af
        maps = ["-map", "[v]", "-map", "[a]"]
    else:
        graph = vf
        graph += ";[1:a]aformat=sample_rates=48000:channel_layouts=stereo[a]"
        maps = ["-map", "[v]", "-map", "[a]"]
    cmd += ["-filter_complex", graph] + maps + [
        "-t", "%.3f" % total, "-c:v", "libx264", "-preset", "medium",
        "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final]
    media.ffmpeg(cmd)

    # 4. thumbnail
    thumbnail(cfg, ep, visual)
    shutil.rmtree(work, ignore_errors=True)
    return final


def _ratio_for(duck_db):
    """A sidechain ratio that takes roughly duck_db off a speaking level."""
    return max(2, min(20, int(round(abs(duck_db) / 1.5))))


def _clip(out, src, offset, dur, W, H):
    media.ffmpeg([
        "-ss", "%.3f" % offset, "-t", "%.3f" % dur, "-i", src,
        "-vf", "scale=%d:%d:force_original_aspect_ratio=increase,"
               "crop=%d:%d,fps=%d,setsar=1,format=yuv420p" % (W, H, W, H, FPS),
        "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-video_track_timescale", "90000", out])


def _card(out, text, dur, W, H):
    font = find_font()
    txt = text.replace("\\", "").replace("'", "\u2019").replace(":", "\\:")
    media.ffmpeg([
        "-f", "lavfi", "-i", "color=c=%s:s=%dx%d:d=%.3f:r=%d" % (CARD_BG, W, H, dur, FPS),
        "-vf", "drawtext=fontfile='%s':text='%s':fontsize=%d:fontcolor=white:"
               "x=(w-text_w)/2:y=(h-text_h)/2" % (font, txt, int(H * 0.06)),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-pix_fmt", "yuv420p", "-video_track_timescale", "90000", out])


def find_font(bold=True):
    names = ["DejaVuSans-Bold.ttf", "DejaVuSans.ttf"] if bold else ["DejaVuSans.ttf"]
    for d in FONT_DIRS:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return p
    return "sans"


# ---------------------------------------------------------------- captions

def _ts(t):
    t = max(0.0, t)
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return "%d:%02d:%05.2f" % (h, m, s)


def write_ass(path, tl, W, H, captions=True, title_cards=True):
    portrait = H > W
    cap_size = int(H * (0.040 if portrait else 0.046))
    head_size = int(H * (0.055 if portrait else 0.060))
    margin_v = int(H * (0.18 if portrait else 0.07))
    lines = [
        "[Script Info]", "ScriptType: v4.00+", "PlayResX: %d" % W,
        "PlayResY: %d" % H, "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: Cap,DejaVu Sans,%d,&H00FFFFFF,&H00FFFFFF,&H00000000,"
        "&H80000000,1,0,0,0,100,100,0,0,1,%d,1,2,%d,%d,%d,1"
        % (cap_size, max(2, cap_size // 14), int(W * 0.08), int(W * 0.08), margin_v),
        "Style: Head,DejaVu Sans,%d,&H00FFFFFF,&H00FFFFFF,&H00000000,"
        "&HA0000000,1,0,0,0,100,100,0,0,3,%d,0,%d,%d,%d,%d,1"
        % (head_size, max(6, head_size // 4), 5 if portrait else 7,
           int(W * 0.06), int(W * 0.06), int(H * 0.08)),
        "", "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, "
        "Effect, Text",
    ]
    for sec in tl["sections"]:
        if title_cards and sec["index"] > 0 and sec["heading"]:
            end = min(sec["end"], sec["start"] + 4.0)
            lines.append("Dialogue: 1,%s,%s,Head,,0,0,0,,{\\fad(250,400)}%s"
                         % (_ts(sec["start"]), _ts(end), _esc(sec["heading"])))
        if captions:
            for s in sec["sentences"]:
                for a, b, text in _chunks(s):
                    lines.append("Dialogue: 0,%s,%s,Cap,,0,0,0,,%s"
                                 % (_ts(a), _ts(b), _esc(text)))
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def _chunks(s, max_chars=72):
    """A long sentence is shown in two or three pieces, split on commas or
    word boundaries, each piece timed by its share of characters."""
    text, a, b = s["text"], s["start"], s["end"]
    if len(text) <= max_chars:
        return [(a, b, text)]
    words = text.split()
    n_pieces = -(-len(text) // max_chars)          # ceil
    target = len(text) / n_pieces                   # balanced, not greedy
    pieces, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if cur and len(pieces) < n_pieces - 1 and (
                len(trial) > max_chars or
                abs(len(trial) - target) > abs(len(cur) - target)):
            pieces.append(cur)
            cur = w
        else:
            cur = trial
    if cur:
        pieces.append(cur)
    n = sum(len(p) for p in pieces) or 1
    out, t = [], a
    for p in pieces:
        d = (b - a) * len(p) / n
        out.append((t, t + d, p))
        t += d
    return out


def _esc(s):
    return s.replace("\\", "").replace("{", "(").replace("}", ")")


# ---------------------------------------------------------------- thumbnail

def thumbnail(cfg, ep, visual):
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    script = ep.load("script")
    plan = ep.load("broll")
    # a frame from the first real clip, a second in
    t = 1.0
    for seg in plan["segments"]:
        if not seg.get("card"):
            t = seg["start"] + min(1.0, seg["duration"] / 2)
            break
    frame = ep.path("work", "thumb_frame.png")
    media.ffmpeg(["-ss", "%.3f" % t, "-i", visual, "-frames:v", "1", frame])
    portrait = cfg["format"] == "portrait"
    size = (720, 1280) if portrait else (1280, 720)
    im = Image.open(frame).convert("RGB").resize(size)
    im = im.filter(ImageFilter.GaussianBlur(1))
    shade = Image.new("RGB", size, (0, 0, 0))
    mask = Image.linear_gradient("L").resize(size).point(lambda v: int(v * 0.75))
    im = Image.composite(shade, im, mask)
    draw = ImageDraw.Draw(im)
    text = (script.get("thumbnail_text") or script["title"]).upper()
    font_path = find_font()
    fsize = int(size[1] * (0.11 if portrait else 0.17))
    while fsize > 20:
        font = ImageFont.truetype(font_path, fsize) if font_path != "sans" \
            else ImageFont.load_default()
        lines = _wrap(draw, text, font, size[0] * 0.88)
        hgt = sum(draw.textbbox((0, 0), l, font=font)[3] for l in lines) * 1.15
        if hgt < size[1] * 0.55 and all(
                draw.textbbox((0, 0), l, font=font)[2] <= size[0] * 0.9 for l in lines):
            break
        fsize -= 6
    y = size[1] - int(size[1] * 0.08) - hgt
    for l in lines:
        bb = draw.textbbox((0, 0), l, font=font)
        x = (size[0] - bb[2]) // 2
        draw.text((x, y), l, font=font, fill=(255, 255, 255),
                  stroke_width=max(2, fsize // 14), stroke_fill=(0, 0, 0))
        y += bb[3] * 1.15
    im.save(ep.path("thumbnail.jpg"), quality=88)


def _wrap(draw, text, font, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if cur and draw.textbbox((0, 0), trial, font=font)[2] > width:
            lines.append(cur)
            cur = w
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines
