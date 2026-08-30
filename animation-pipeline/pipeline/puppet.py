#!/usr/bin/env python3
"""Puppet an episode from one raw voice recording.

Record the whole episode's voice acting as a single take on your phone —
every line in order, with a beat of silence (about half a second) between
lines. Then either:

1. Point the episode file at it and let the renderer do the rest.
   The take is split on silence; each shot picks its spoken line by number:

       take: vo/take1.m4a
       shots:
         - bg: backgrounds/pub.png
           line: 1                # first spoken line in the recording
           caption: gary has opinions about the moon
           actors: [{char: gary, at: [0.5, 0.74], scale: 0.4, talk: true}]

2. Or generate a whole editable episode from the recording:

       python3 pipeline/puppet.py scaffold take1.m4a myshow/ep02.yaml \
           --char gary --bg backgrounds/pub.png

   One shot per spoken line, ready to render immediately, ready to reorder,
   recast and reposition. With openai-whisper or faster-whisper installed
   (pip install faster-whisper), each line is transcribed and dropped in as
   the shot's caption; otherwise captions are placeholders you fill in.

3. Just inspect/split a take:

       python3 pipeline/puppet.py split take1.m4a vo/
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audiolib import AUDIO_SR, split_take, write_wav


def report(spans):
    print(f"{len(spans)} spoken lines found:")
    for i, (t0, t1) in enumerate(spans):
        print(f"  line {i + 1:2d}   {t0:6.2f}s – {t1:6.2f}s   "
              f"({t1 - t0:.2f}s)")
    if not spans:
        print("  (nothing above the noise floor — is this the right file?)")


def do_split(args):
    cuts, spans = split_take(args.take, min_pause=args.min_pause,
                             min_line=args.min_line, pad=args.pad)
    report(spans)
    os.makedirs(args.outdir, exist_ok=True)
    for i, pcm in enumerate(cuts):
        p = os.path.join(args.outdir, f"line{i + 1:02d}.wav")
        write_wav(p, pcm)
        print(f"wrote {p}")


def transcribe_lines(take, spans):
    """Best-effort transcription of each spoken line. Returns list[str|None].

    Tries faster-whisper, then openai-whisper. Both are optional installs;
    without them every caption is None and the scaffold uses placeholders.
    """
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("base", compute_type="int8")

        def run(path):
            segs, _ = model.transcribe(path, language="en")
            return " ".join(s.text for s in segs).strip()
    except ImportError:
        try:
            import whisper
            model = whisper.load_model("base")

            def run(path):
                return model.transcribe(path, language="en")["text"].strip()
        except ImportError:
            print("note: no whisper installed — captions left as "
                  "placeholders (pip install faster-whisper to auto-fill)",
                  file=sys.stderr)
            return [None] * len(spans)

    import tempfile
    cuts, _ = split_take(take)
    out = []
    for i, pcm in enumerate(cuts):
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            tmp = f.name
        write_wav(tmp, pcm)
        try:
            text = run(tmp).lower().strip().rstrip(".") or None
        except Exception as e:
            print(f"  transcription failed on line {i + 1}: {e}",
                  file=sys.stderr)
            text = None
        os.unlink(tmp)
        print(f"  line {i + 1:2d}: {text or '(no transcript)'}",
              file=sys.stderr)
        out.append(text)
    return out


SHOT_TEMPLATE = """\
  - bg: {bg}
    line: {n}
    caption: {caption}
    actors:
      - char: {char}
        at: [0.5, 0.74]
        scale: 0.38
        talk: true
        moves:
          - {{type: bob, amp: 0.004, period: 0.7}}
"""


def do_scaffold(args):
    _, spans = split_take(args.take, min_pause=args.min_pause,
                          min_line=args.min_line, pad=args.pad)
    report(spans)
    if not spans:
        raise SystemExit("no lines found; nothing to scaffold")

    ep_dir = os.path.dirname(os.path.abspath(args.episode)) or "."
    os.makedirs(os.path.join(ep_dir, "vo"), exist_ok=True)
    take_rel = os.path.join("vo", os.path.basename(args.take))
    take_dst = os.path.join(ep_dir, take_rel)
    if os.path.abspath(args.take) != os.path.abspath(take_dst):
        import shutil
        shutil.copy(args.take, take_dst)
        print(f"copied take to {take_dst}")

    captions = ([None] * len(spans) if args.no_captions
                else transcribe_lines(args.take, spans))

    # font path relative to the episode's folder
    font = os.path.relpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "..", "fonts", "satoshi-var.ttf"), ep_dir)

    shots = "".join(
        SHOT_TEMPLATE.format(
            bg=args.bg, n=i + 1, char=args.char,
            caption=(captions[i] or f"CAPTION for line {i + 1}"))
        for i in range(len(spans)))

    yaml_text = f"""\
# Scaffolded from {os.path.basename(args.take)} — edit everything.
# Each shot's length and mouth flap come from its spoken line in the take.
title: {os.path.splitext(os.path.basename(args.episode))[0]}
size: [1080, 1920]
fps: 12
boil: 0.0015
boil_every: 2
take: {take_rel}
# split: {{min_pause: {args.min_pause}, min_line: {args.min_line}, pad: {args.pad}}}

defaults:
  font: {font}
  caption_size: 0.042
  caption_weight: 700
  caption_color: [26, 26, 26]
  caption_y: 0.84
  audio_tail: 0.35
  talk_style: syllable      # or: envelope, alternate

shots:
{shots}"""
    if os.path.exists(args.episode) and not args.force:
        raise SystemExit(f"{args.episode} exists — pass --force to overwrite")
    with open(args.episode, "w") as f:
        f.write(yaml_text)
    print(f"wrote {args.episode} ({len(spans)} shots)")
    print(f"render it:  python3 pipeline/render.py {args.episode} --draft")


def main():
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    def common(p):
        p.add_argument("take", help="raw recording (m4a/wav/mp3/anything)")
        p.add_argument("--min-pause", type=float, default=0.35,
                       help="silence that separates two lines (s)")
        p.add_argument("--min-line", type=float, default=0.25,
                       help="ignore blips shorter than this (s)")
        p.add_argument("--pad", type=float, default=0.12,
                       help="keep this much silence around each line (s)")

    ps = sub.add_parser("split", help="cut a take into per-line wavs")
    common(ps)
    ps.add_argument("outdir")
    ps.set_defaults(fn=do_split)

    pc = sub.add_parser("scaffold",
                        help="generate an editable episode from a take")
    common(pc)
    pc.add_argument("episode", help="episode yaml to write")
    pc.add_argument("--char", default="stan",
                    help="character folder name for every shot (edit after)")
    pc.add_argument("--bg", default="backgrounds/chipshop.png",
                    help="background for every shot (edit after)")
    pc.add_argument("--no-captions", action="store_true",
                    help="skip transcription even if whisper is installed")
    pc.add_argument("--force", action="store_true")
    pc.set_defaults(fn=do_scaffold)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
