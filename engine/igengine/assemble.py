"""Assemble a packet's slides, captions, and voiceover into a 9:16 Reel.

Pure ffmpeg: per-beat Ken Burns zoom on the slide, caption burned in from a
textfile (no drawtext escaping games), concat, voiceover or silence muxed in.
"""

import os
import subprocess
import textwrap

from .assets import ffmpeg_bin

FONT_CANDIDATES = [
    os.environ.get("FONT_FILE"),
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def _font():
    for f in FONT_CANDIDATES:
        if f and os.path.exists(f):
            return f
    raise RuntimeError("no caption font found; set FONT_FILE")


def _probe_duration(path):
    out = subprocess.run(
        [ffmpeg_bin().replace("ffmpeg", "ffprobe"), "-v", "error",
         "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def build_reel(cfg, packet, assets, workdir, out_path):
    video = cfg["engine"]["video"]
    w, h, fps = video["width"], video["height"], video["fps"]
    n = len(packet["beats"])

    beat_secs = video["seconds_per_beat"]
    if assets["audio"]:
        beat_secs = min(4.5, max(2.2, _probe_duration(assets["audio"]) / n))
    frames = round(beat_secs * fps)

    font = _font()
    cmd = [ffmpeg_bin(), "-y", "-v", "error"]
    filters = []
    for i, (beat, slide) in enumerate(zip(packet["beats"], assets["slides"])):
        cmd += ["-loop", "1", "-t", f"{beat_secs:.3f}", "-i", str(slide)]
        caption = workdir / f"caption{i:02d}.txt"
        caption.write_text(textwrap.fill(beat["text"], width=18))
        # First beat is the hook: bigger type, higher on the frame.
        size, ypos = (78, "h*0.34") if i == 0 else (58, "h*0.66")
        filters.append(
            f"[{i}:v]scale={int(w * 1.2)}:{int(h * 1.2)}:force_original_aspect_ratio=increase,"
            f"crop={int(w * 1.2)}:{int(h * 1.2)},"
            f"zoompan=z='1+0.10*on/{frames}':d={frames}:s={w}x{h}:fps={fps},"
            f"drawtext=fontfile={font}:textfile={caption}:fontcolor=white:fontsize={size}:"
            f"x=(w-text_w)/2:y={ypos}:line_spacing=14:"
            f"box=1:boxcolor=black@0.55:boxborderw=28[v{i}]")

    if assets["audio"]:
        cmd += ["-i", str(assets["audio"])]
        audio_map = [f"{n}:a"]
    else:
        cmd += ["-f", "lavfi", "-t", f"{beat_secs * n:.3f}", "-i",
                "anullsrc=channel_layout=stereo:sample_rate=44100"]
        audio_map = [f"{n}:a"]

    concat_in = "".join(f"[v{i}]" for i in range(n))
    filters.append(f"{concat_in}concat=n={n}:v=1:a=0[vout]")
    cmd += ["-filter_complex", ";".join(filters),
            "-map", "[vout]", "-map", audio_map[0],
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(fps),
            "-c:a", "aac", "-b:a", "128k", "-shortest",
            "-movflags", "+faststart", str(out_path)]
    subprocess.run(cmd, check=True)
    return out_path
