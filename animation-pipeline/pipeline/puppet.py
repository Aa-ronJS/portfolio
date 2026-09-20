#!/usr/bin/env python3
"""Puppet an episode from one raw voice recording.

Record the whole episode's voice acting as a single take on your phone —
every line in order, with a beat of silence (about half a second) between
lines. Then:

DIRECT — speak the stage directions into the recording itself:

    "in the chip shop, stan walks in from the left and says"
    "large chips please my good man"
    "the seagull hops in from the right and says"
    "give me one chip"
    "close up on stan, he says"
    "absolutely not"
    "the seagull leaves"

    python3 pipeline/puppet.py direct take1.m4a myshow/ep03.yaml

    Direction lines cast and stage whoever you name (fuzzy-matched
    against myshow/characters/*), pick backgrounds ("in the pub"),
    frame close-ups, and mark entrances/exits; each "X says" line
    binds the NEXT spoken line to X's mouth and caption. Needs
    faster-whisper (pip install faster-whisper). See director.py's
    docstring for the full grammar.

SCAFFOLD — no directions, just lines; one shot per line, same character:

    python3 pipeline/puppet.py scaffold take1.m4a myshow/ep02.yaml \
        --char gary --bg backgrounds/pub.png

SPLIT — inspect how a take cuts into lines:

    python3 pipeline/puppet.py split take1.m4a /tmp/lines

Either generator writes an ordinary episode yaml — edit anything, then:

    python3 pipeline/render.py myshow/ep03.yaml --draft
"""

import argparse
import os
import shutil
import sys
import tempfile

import yaml

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audiolib import split_take, write_wav
from director import Director, Project


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


def transcribe_lines(cuts, required=False):
    """Best-effort transcription of each spoken line. Returns list[str|None].

    Tries faster-whisper, then openai-whisper. Both are optional installs
    for scaffold; direct cannot work without one.
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
            if required:
                raise SystemExit(
                    "direct mode needs transcription: pip install "
                    "faster-whisper")
            print("note: no whisper installed — captions left as "
                  "placeholders (pip install faster-whisper to auto-fill)",
                  file=sys.stderr)
            return [None] * len(cuts)

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


def write_episode(args, shots, header):
    """Copy the take next to the episode and write the yaml."""
    ep_dir = os.path.dirname(os.path.abspath(args.episode)) or "."
    os.makedirs(os.path.join(ep_dir, "vo"), exist_ok=True)
    take_rel = os.path.join("vo", os.path.basename(args.take))
    take_dst = os.path.join(ep_dir, take_rel)
    if os.path.abspath(args.take) != os.path.abspath(take_dst):
        shutil.copy(args.take, take_dst)
        print(f"copied take to {take_dst}")

    font = os.path.relpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "..", "fonts", "satoshi-var.ttf"), ep_dir)
    ep = {
        "title": os.path.splitext(os.path.basename(args.episode))[0],
        "size": [1080, 1920],
        "fps": 12,
        "boil": 0.0015,
        "boil_every": 2,
        "take": take_rel,
        "defaults": {
            "font": font,
            "caption_size": 0.042,
            "caption_weight": 700,
            "caption_color": [26, 26, 26],
            "caption_y": 0.84,
            "audio_tail": 0.35,
            "talk_style": "syllable",
        },
        "shots": shots,
    }
    if os.path.exists(args.episode) and not args.force:
        raise SystemExit(f"{args.episode} exists — pass --force to overwrite")
    with open(args.episode, "w") as f:
        f.write(header)
        yaml.safe_dump(ep, f, sort_keys=False, default_flow_style=None,
                       allow_unicode=True, width=76)
    print(f"wrote {args.episode} ({len(shots)} shots)")
    print(f"render it:  python3 pipeline/render.py {args.episode} --draft")


def do_scaffold(args):
    cuts, spans = split_take(args.take, min_pause=args.min_pause,
                             min_line=args.min_line, pad=args.pad)
    report(spans)
    if not spans:
        raise SystemExit("no lines found; nothing to scaffold")
    captions = ([None] * len(cuts) if args.no_captions
                else transcribe_lines(cuts))
    shots = [{
        "bg": args.bg,
        "line": i + 1,
        "caption": captions[i] or f"CAPTION for line {i + 1}",
        "actors": [{
            "char": args.char, "at": [0.5, 0.74], "scale": 0.38,
            "talk": True,
            "moves": [{"type": "bob", "amp": 0.004, "period": 0.7}],
        }],
    } for i in range(len(cuts))]
    write_episode(args, shots,
                  f"# Scaffolded from {os.path.basename(args.take)} — "
                  f"edit everything.\n")


def do_direct(args):
    cuts, spans = split_take(args.take, min_pause=args.min_pause,
                             min_line=args.min_line, pad=args.pad)
    report(spans)
    if not spans:
        raise SystemExit("no lines found; nothing to direct")

    project_root = args.project or \
        (os.path.dirname(os.path.abspath(args.episode)) or ".")
    proj = Project(project_root)
    if not proj.roster:
        raise SystemExit(
            f"no characters found in {project_root}/characters — the "
            f"director can only cast characters that exist as folders")
    print(f"cast available: {', '.join(sorted(set(proj.roster.values())))}")
    if proj.backgrounds:
        print(f"backgrounds: {', '.join(sorted(proj.backgrounds))}")

    texts = transcribe_lines(cuts, required=True)

    default_bg = args.bg or (sorted(proj.backgrounds.values())[0]
                             if proj.backgrounds else None)
    if not default_bg:
        raise SystemExit(f"no backgrounds in {project_root}/backgrounds "
                         f"and no --bg given")
    director = Director(proj, default_bg)
    for i, text in enumerate(texts):
        director.feed(i + 1, text)
    shots = director.finish()
    if not shots:
        raise SystemExit("no shots came out of the directions — check the "
                         "transcripts above against the grammar in "
                         "pipeline/director.py")
    write_episode(args, shots,
                  f"# Directed from {os.path.basename(args.take)} — the "
                  f"machine staged it, you own it. Edit everything.\n")


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
                        help="one shot per line, single character")
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

    pd = sub.add_parser("direct",
                        help="stage the episode from directions spoken "
                             "inside the recording")
    common(pd)
    pd.add_argument("episode", help="episode yaml to write")
    pd.add_argument("--project",
                    help="folder holding characters/ and backgrounds/ "
                         "(default: the episode's folder)")
    pd.add_argument("--bg", help="fallback background when the directions "
                                 "never name one")
    pd.add_argument("--force", action="store_true")
    pd.set_defaults(fn=do_direct)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
