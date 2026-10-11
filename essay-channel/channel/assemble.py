"""Cut the video. Every shot gets a slow push or pull so nothing sits
still; sections dissolve into each other while shots inside a section
hard-cut on the sentence; the video fades up from black under the
title and down to black under the end card; headings sit in a
lower-third box, callouts land as big accent-coloured text when a
number or name is the point; the narration rides over a music bed
that ducks when the voice speaks. Everything is ffmpeg; the only
drawing is the thumbnail (Pillow), whose frame Claude chooses when it
is around to look.
"""

import os
import shutil

from . import media, prompts, voice

FONT_DIRS = ["/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/dejavu",
             "/Library/Fonts", "C:/Windows/Fonts"]
CARD_BG = "0x15171c"
FPS = 30
XF = 0.5                 # dissolve length between sections
GRADE = "eq=saturation=1.06:contrast=1.03"


def assemble(cfg, ep, llm=None):
    W, H = cfg["size"]
    tl = ep.load("voice")
    plan = ep.load("broll")
    music = ep.load("music") or {"file": None}
    script = ep.load("script")
    look = cfg["look"]
    work = ep.path("work")
    os.makedirs(work, exist_ok=True)
    shots = plan["shots"]

    # 1. every shot as a normalised clip with its motion, grouped by
    #    section (hard cuts inside, a dissolve between)
    by_section = {}
    for k, s in enumerate(shots):
        by_section.setdefault(s["section"], []).append((k, s))
    sec_ids = sorted(by_section)
    transitions = look["transitions"] and len(sec_ids) > 1
    section_files, section_durs = [], []
    for n, sid in enumerate(sec_ids):
        parts = []
        items = by_section[sid]
        for j, (k, s) in enumerate(items):
            dur = s["duration"]
            if transitions and n < len(sec_ids) - 1 and j == len(items) - 1:
                dur += XF                    # tail for the dissolve
            out = os.path.join(work, "shot%03d.mp4" % k)
            _render_shot(cfg, out, s, dur, W, H, look["motion"])
            parts.append(out)
        lst = os.path.join(work, "sec%02d.txt" % n)
        with open(lst, "w") as f:
            for p in parts:
                f.write("file '%s'\n" % p.replace("'", r"'\''"))
        sec = os.path.join(work, "sec%02d.mp4" % n)
        media.ffmpeg(["-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", sec])
        section_files.append(sec)
        section_durs.append(sum(s["duration"] for _, s in items))

    # 2. the text layer: captions, headings, callouts, title, end card
    ass = ep.path("captions.ass")
    write_ass(ass, cfg, tl, script, shots)
    voice.write_srt(tl, ep.path("captions.srt"))

    # 3. the final pass: dissolves, grade, text, fades, audio mix
    total = tl["duration"]
    final = ep.output("assemble")
    cmd = []
    for f in section_files:
        cmd += ["-i", f]
    nv = len(section_files)
    vo_idx = nv
    cmd += ["-i", ep.path(tl["vo"])]
    if transitions:
        chain, prev, offset = [], "[0:v]", 0.0
        for i in range(1, nv):
            offset += section_durs[i - 1]
            chain.append("%s[%d:v]xfade=transition=fade:duration=%.3f:offset=%.3f[x%d]"
                         % (prev, i, XF, offset, i))
            prev = "[x%d]" % i
        vgraph = ";".join(chain) + ";" + prev
    else:
        lst = os.path.join(work, "all.txt")
        with open(lst, "w") as f:
            for p in section_files:
                f.write("file '%s'\n" % p.replace("'", r"'\''"))
        allv = os.path.join(work, "all.mp4")
        media.ffmpeg(["-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", allv])
        cmd = ["-i", allv, "-i", ep.path(tl["vo"])]
        nv, vo_idx = 1, 1
        vgraph = "[0:v]"
    fade_in = 0.8 if look["title_card"] else 0.3
    fade_out = 1.2 if look["end_card"] else 0.4
    vgraph += ("%s,fade=t=in:st=0:d=%.2f,fade=t=out:st=%.3f:d=%.2f,ass='%s'[v]"
               % (GRADE, fade_in, max(0, total - fade_out), fade_out, _ass_path(ass)))
    maps = ["-map", "[v]"]
    if music.get("file"):
        mpath = os.path.join(cfg["_root"], music["file"])
        gain = float(cfg["music"]["gain_db"])
        duck = float(cfg["music"]["duck_db"])
        cmd += ["-stream_loop", "-1", "-i", mpath]
        m_idx = vo_idx + 1
        agraph = (
            "[%d:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit[v1][v2];"
            "[%d:a]atrim=0:%.3f,asetpts=PTS-STARTPTS,aformat=sample_rates=48000:"
            "channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11,"
            "volume=%.1fdB,afade=t=in:d=1.5,afade=t=out:st=%.3f:d=%.2f[m];"
            "[m][v2]sidechaincompress=threshold=0.02:ratio=%d:attack=40:"
            "release=700:makeup=1[md];"
            "[v1][md]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]"
            % (vo_idx, m_idx, total, gain, max(0.0, total - 3.0), 3.0, _ratio_for(duck)))
    else:
        agraph = "[%d:a]aformat=sample_rates=48000:channel_layouts=stereo[a]" % vo_idx
    maps += ["-map", "[a]"]
    cmd += ["-filter_complex", vgraph + ";" + agraph] + maps + [
        "-t", "%.3f" % total, "-c:v", "libx264", "-preset", "medium",
        "-crf", "19", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final]
    media.ffmpeg(cmd)

    # 4. thumbnail
    thumbnail(cfg, ep, final, llm)
    shutil.rmtree(work, ignore_errors=True)
    return final


def _ass_path(p):
    return p.replace("\\", "/").replace(":", r"\:").replace("'", r"\'")


def _ratio_for(duck_db):
    """A sidechain ratio that takes roughly duck_db off a speaking level."""
    return max(2, min(20, int(round(abs(duck_db) / 1.5))))


def _render_shot(cfg, out, s, dur, W, H, motion):
    """One shot: the source scaled to fill, then a slow zoom (per-frame
    scale) and drift (animated crop), graded, at the house frame rate."""
    m = s.get("motion") or {"zoom_from": 1.0, "zoom_to": 1.0, "pan": 0.0}
    if not motion:
        m = {"zoom_from": 1.0, "zoom_to": 1.0, "pan": 0.0}
    zf, zt, pan = m["zoom_from"], m["zoom_to"], m["pan"]
    base = "scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d" % (W, H, W, H)
    if zf != 1.0 or zt != 1.0 or pan:
        base += (",scale=w='trunc(%d*(%.4f+(%.4f)*t/%.3f)/2)*2':h=-2:eval=frame,"
                 "crop=%d:%d:x='(iw-ow)*(0.5+%.3f*(t/%.3f-0.5))':y='(ih-oh)/2'"
                 % (W, zf, zt - zf, dur, W, H, pan * 0.5, dur))
    vf = base + ",fps=%d,setsar=1,format=yuv420p" % FPS
    enc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
           "-video_track_timescale", "90000", "-an", "-t", "%.3f" % dur, out]
    if s["kind"] == "video":
        src = os.path.join(cfg["_root"], s["file"])
        pre = ["-stream_loop", "-1"] if s.get("loop") else []
        media.ffmpeg(pre + ["-ss", "%.3f" % s.get("offset", 0.0), "-i", src,
                            "-vf", vf] + enc)
    elif s["kind"] == "photo":
        src = os.path.join(cfg["_root"], s["file"])
        media.ffmpeg(["-loop", "1", "-framerate", str(FPS), "-i", src,
                      "-vf", vf] + enc)
    else:
        _card(out, s.get("text", ""), dur, W, H, cfg["look"]["accent"])


def _card(out, text, dur, W, H, accent):
    """A plain card: the sentence's first words, large, on the house dark."""
    font = find_font()
    words = text.split()
    txt = " ".join(words[:9]) + ("…" if len(words) > 9 else "")
    txt = txt.replace("\\", "").replace("'", "\u2019").replace(":", "\\:").replace("%", "%%")
    media.ffmpeg([
        "-f", "lavfi", "-i", "color=c=%s:s=%dx%d:d=%.3f:r=%d" % (CARD_BG, W, H, dur, FPS),
        "-vf", "drawbox=x=%d:y=%d:w=%d:h=%d:color=0x%s:t=fill,"
               "drawtext=fontfile='%s':text='%s':fontsize=%d:fontcolor=white:"
               "x=%d:y=(h-text_h)/2:line_spacing=12"
               % (int(W * 0.08), int(H * 0.44), 10, int(H * 0.12), accent,
                  font, txt, int(H * 0.045), int(W * 0.10)),
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


# ---------------------------------------------------------------- text layer

def _ts(t):
    t = max(0.0, t)
    return "%d:%02d:%05.2f" % (int(t // 3600), int(t % 3600 // 60), t % 60)


def _ass_colour(hex_rgb, alpha="00"):
    r, g, b = hex_rgb[0:2], hex_rgb[2:4], hex_rgb[4:6]
    return "&H%s%s%s%s" % (alpha, b, g, r)


def write_ass(path, cfg, tl, script, shots):
    W, H = cfg["size"]
    look = cfg["look"]
    portrait = H > W
    accent = _ass_colour(look["accent"])
    cap_size = int(H * (0.040 if portrait else 0.044))
    head_size = int(H * (0.040 if portrait else 0.046))
    call_size = int(H * (0.075 if portrait else 0.095))
    title_size = int(H * (0.07 if portrait else 0.085))
    end_size = int(H * (0.045 if portrait else 0.05))
    margin_v = int(H * (0.18 if portrait else 0.07))
    style = ("Style: %s,DejaVu Sans,%d,%s,&H00FFFFFF,%s,%s,%d,0,0,0,100,100,"
             "%d,0,%d,%d,%d,%d,%d,%d,%d,1")
    lines = [
        "[Script Info]", "ScriptType: v4.00+", "PlayResX: %d" % W,
        "PlayResY: %d" % H, "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding",
        # captions: white, thin black outline, bottom centre
        style % ("Cap", cap_size, "&H00FFFFFF", "&H00000000", "&H80000000", 1,
                 0, 1, max(2, cap_size // 14), 1, 2, int(W * 0.08), int(W * 0.08), margin_v),
        # lower-third heading: boxed, bottom left above the captions
        style % ("Head", head_size, "&H00FFFFFF", "&H00000000", "&HA0000000", 1,
                 0, 3, max(6, head_size // 4), 0, 1, int(W * 0.05), int(W * 0.05),
                 int(H * ((0.30 if portrait else 0.20)
                          if look["captions"] in ("burn", "both") else
                          (0.18 if portrait else 0.10)))),
        # callout: big accent text, centre
        style % ("Call", call_size, accent, "&H00000000", "&H00000000", 1,
                 1, 1, max(3, call_size // 12), 2, 5, int(W * 0.06), int(W * 0.06), 0),
        # title and end card: centred white
        style % ("Title", title_size, "&H00FFFFFF", "&H00000000", "&H00000000", 1,
                 0, 1, max(3, title_size // 12), 2, 5, int(W * 0.08), int(W * 0.08), 0),
        style % ("End", end_size, "&H00FFFFFF", "&H00000000", "&H00000000", 1,
                 0, 1, max(2, end_size // 12), 1, 5, int(W * 0.08), int(W * 0.08), 0),
        "", "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, "
        "Effect, Text",
    ]
    ev = lines.append
    burn = look["captions"] in ("burn", "both")
    lead, speech_end = tl["lead"], tl["speech_end"]
    if look["title_card"]:
        ev("Dialogue: 3,%s,%s,Title,,0,0,0,,{\\fad(300,500)}%s"
           % (_ts(0.2), _ts(lead + 1.6), _esc(script["title"])))
    if look["end_card"]:
        ev("Dialogue: 3,%s,%s,End,,0,0,0,,{\\fad(400,300)}%s\\N{\\fs%d}Sources in the description"
           % (_ts(speech_end + 0.6), _ts(tl["duration"] - 0.3),
              _esc(look["end_card_text"]), int(end_size * 0.7)))
    for sec in tl["sections"]:
        if look["lower_thirds"] and sec["index"] > 0 and sec["heading"]:
            end = min(sec["end"], sec["start"] + 4.0)
            ev("Dialogue: 1,%s,%s,Head,,0,0,0,,{\\fad(250,400)}%s"
               % (_ts(sec["start"]), _ts(end), _esc(sec["heading"])))
        for s in sec["sentences"]:
            if s.get("callout"):
                a, b = s["start"] + 0.15, max(s["start"] + 1.5, s["end"] - 0.1)
                ev("Dialogue: 2,%s,%s,Call,,0,0,0,,{\\fad(200,250)}%s"
                   % (_ts(a), _ts(b), _esc(s["callout"])))
            if burn:
                for a, b, text in _chunks(s):
                    ev("Dialogue: 0,%s,%s,Cap,,0,0,0,,%s" % (_ts(a), _ts(b), _esc(text)))
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def _chunks(s, max_chars=72):
    """A long sentence is shown in two or three balanced pieces, each
    timed by its share of characters."""
    text, a, b = s["text"], s["start"], s["end"]
    if len(text) <= max_chars:
        return [(a, b, text)]
    words = text.split()
    n_pieces = -(-len(text) // max_chars)
    target = len(text) / n_pieces
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

def thumbnail(cfg, ep, final, llm=None):
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    script = ep.load("script")
    plan = ep.load("broll")
    portrait = cfg["format"] == "portrait"
    size = (720, 1280) if portrait else (1280, 720)
    work = ep.path("work")
    os.makedirs(work, exist_ok=True)
    # candidate frames: the middle of the first few footage shots
    cands = []
    for s in plan["shots"]:
        if s["kind"] != "card" and len(cands) < 4:
            t = s["start"] + min(1.5, s["duration"] / 2)
            if s is plan["shots"][0]:
                t = max(t, plan["shots"][0]["duration"] * 0.75)   # past the title fade
            png = os.path.join(work, "thumb%d.png" % len(cands))
            media.ffmpeg(["-ss", "%.3f" % t, "-i", final, "-frames:v", "1",
                          "-vf", "scale=%d:%d" % size, png])
            cands.append(png)
    if not cands:
        png = os.path.join(work, "thumb0.png")
        media.ffmpeg(["-ss", "1.0", "-i", final, "-frames:v", "1",
                      "-vf", "scale=%d:%d" % size, png])
        cands = [png]
    choice = 0
    if llm is not None and len(cands) > 1:
        try:
            images = []
            for i, p in enumerate(cands, 1):
                with open(p, "rb") as f:
                    images.append(("Frame %d" % i, f.read()))
            r = llm.vision_json(prompts.system(cfg), prompts.pick_thumbnail(len(cands)),
                                images, prompts.THUMB_SCHEMA)
            if 1 <= int(r.get("frame", 1)) <= len(cands):
                choice = int(r["frame"]) - 1
        except Exception as e:
            print("thumbnail: vision pick failed (%s); using the first frame" % e)
    im = Image.open(cands[choice]).convert("RGB").resize(size)
    im = im.filter(ImageFilter.GaussianBlur(0.6))
    shade = Image.new("RGB", size, (0, 0, 0))
    mask = Image.linear_gradient("L").resize(size).point(lambda v: int(v * 0.78))
    im = Image.composite(shade, im, mask)
    draw = ImageDraw.Draw(im)
    text = (script.get("thumbnail_text") or script["title"]).upper()
    font_path = find_font()
    fsize = int(size[1] * (0.11 if portrait else 0.17))
    while fsize > 20:
        font = ImageFont.truetype(font_path, fsize) if font_path != "sans" \
            else ImageFont.load_default()
        lines = _wrap(draw, text, font, size[0] * 0.86)
        hgt = sum(draw.textbbox((0, 0), l, font=font)[3] for l in lines) * 1.15
        if hgt < size[1] * 0.5 and all(
                draw.textbbox((0, 0), l, font=font)[2] <= size[0] * 0.88 for l in lines):
            break
        fsize -= 6
    accent = tuple(int(cfg["look"]["accent"][i:i + 2], 16) for i in (0, 2, 4))
    y = size[1] - int(size[1] * 0.09) - hgt
    bar_y = int(y - size[1] * 0.025)
    draw.rectangle([int(size[0] * 0.07), bar_y, int(size[0] * 0.07) + int(size[0] * 0.12),
                    bar_y + max(6, size[1] // 90)], fill=accent)
    for l in lines:
        bb = draw.textbbox((0, 0), l, font=font)
        x = int(size[0] * 0.07)
        draw.text((x, y), l, font=font, fill=(255, 255, 255),
                  stroke_width=max(2, fsize // 14), stroke_fill=(0, 0, 0))
        y += bb[3] * 1.15
    im.save(ep.path("thumbnail.jpg"), quality=90)


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
