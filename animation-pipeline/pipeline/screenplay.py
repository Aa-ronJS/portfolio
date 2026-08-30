#!/usr/bin/env python3
"""The script is authoritative. This module makes that mechanical.

parse      screenplay (PDF or text) -> immutable beat list (beats.json).
           Every dialogue line and action gets a stable ID. Dialogue text
           is verbatim; parentheticals become performance notes, never
           on-screen text.
preflight  beats + episode yaml + assets -> completeness report.
           Unclaimed dialogue is an ERROR. Hand-written captions are an
           ERROR outside chaos mode. Unresolvable characters are an
           ERROR unless the episode's cast map explicitly resolves them
           (to a folder, to 'silhouette', or to 'omit').
vo         beats -> placeholder espeak wavs, one per dialogue beat,
           verbatim text, per-speaker voices. Replace with recordings.

Episode integration (render.py runs preflight automatically):

    script: beats.json
    mode: director            # strict | director | chaos
    cast:
      passerby: silhouette    # explicit stand-in, never a silent cut
      wife: silhouette
    shots:
      - beat: d07             # claims the beat; caption = verbatim text
        audio: vo/d07.wav
        ...
      - beat: a05             # action beats can be claimed too ->
        duration: 1.2         # 'staged' instead of 'approximated'
"""

import argparse
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

CUE_INDENT = 24       # >= this many leading spaces: character cue
DIALOG_INDENT = 8     # >= this: dialogue text


# ---------------------------------------------------------------- parse

def _lines_of(path):
    if path.lower().endswith(".pdf"):
        out = subprocess.run(["pdftotext", "-layout", path, "-"],
                             capture_output=True, check=True)
        text = out.stdout.decode("utf-8", "replace")
    else:
        text = open(path, encoding="utf-8").read()
    text = (text.replace("’", "'").replace("‘", "'")
                .replace("“", '"').replace("”", '"')
                .replace("–", "-").replace("—", "-")
                .replace("…", "...").replace("\f", "\n"))
    return text.split("\n")


def parse(path):
    """Screenplay -> ordered list of beat dicts. Text is verbatim."""
    beats = []
    counters = {"scene": 0, "action": 0, "dialogue": 0, "camera": 0}

    def add(btype, **kw):
        counters[btype] += 1
        prefix = {"scene": "s", "action": "a",
                  "dialogue": "d", "camera": "c"}[btype]
        beats.append({"id": f"{prefix}{counters[btype]:02d}",
                      "type": btype, "source": "script", **kw})

    speaker = None
    performance = None
    dialog = []
    action = []
    prev_kind = None  # 'dialog', 'action', None

    def flush_dialog():
        nonlocal dialog, speaker, performance
        if speaker and dialog:
            add("dialogue", speaker=speaker,
                text=" ".join(dialog).strip(), performance=performance)
        dialog, performance = [], None

    def flush_action():
        nonlocal action
        if action:
            add("action", text=" ".join(action).strip())
        action = []

    for raw in _lines_of(path):
        line = raw.rstrip()
        stripped = line.strip()
        indent = len(line) - len(line.lstrip())

        if not stripped:
            if prev_kind == "dialog":
                if dialog:
                    flush_dialog()
                    speaker = None
                # else: a cue with its text on the far side of a page
                # break — keep waiting for the dialogue
            elif prev_kind == "action":
                flush_action()
            prev_kind = "dialog" if (speaker and not dialog) else None
            continue

        if re.match(r"^(EXT|INT)[.\s]", stripped):
            flush_dialog(); flush_action(); speaker = None
            add("scene", text=stripped)
            prev_kind = None
        elif re.match(r"^(ANGLE ON|CUT TO|FADE (IN|OUT)|CLOSE ON|SMASH)",
                      stripped, re.I):
            flush_dialog(); flush_action(); speaker = None
            add("camera", text=stripped)
            prev_kind = None
        elif indent >= CUE_INDENT and re.fullmatch(
                r"[A-Z][A-Z0-9 .'&-]*(\s*\((CONT'D|CONT|V\.O\.|O\.S\.)\))?",
                stripped):
            flush_dialog(); flush_action()
            speaker = re.sub(r"\s*\(.*\)\s*$", "", stripped).strip()
            prev_kind = "dialog"
        elif speaker and re.fullmatch(r"\(.+\)", stripped) and not dialog:
            performance = stripped[1:-1]
            prev_kind = "dialog"
        elif speaker and (indent >= DIALOG_INDENT or prev_kind == "dialog"):
            # flush-left continuations happen when pdftotext drops the
            # indent on a wrapped word ("...talk to you like a" / "dog?")
            dialog.append(stripped)
            prev_kind = "dialog"
        else:
            action.append(stripped)
            prev_kind = "action"
    flush_dialog()
    flush_action()
    return beats


def speakers_of(beats):
    return sorted({b["speaker"] for b in beats if b["type"] == "dialogue"})


# ------------------------------------------------------------- preflight

class Report:
    def __init__(self):
        self.errors, self.warnings, self.info = [], [], []

    def err(self, m): self.errors.append(m)
    def warn(self, m): self.warnings.append(m)

    def render(self, title="SCRIPT PREFLIGHT"):
        out = [title, "=" * len(title)]
        out += self.info
        for w in self.warnings:
            out.append(f"WARNING: {w}")
        for e in self.errors:
            out.append(f"ERROR: {e}")
        out.append(f"{len(self.errors)} errors, {len(self.warnings)} warnings")
        return "\n".join(out)

    @property
    def ok(self):
        return not self.errors


def _resolve_cast(name, cast_map, project):
    """-> ('folder'|'silhouette'|'omit'|None, resolved_name)."""
    key = name.lower()
    target = cast_map.get(key, key)
    if target in ("silhouette", "omit"):
        return target, target
    folder = project.roster.get(target)
    if folder is None:
        # try fuzzy through the roster (aliases included)
        from director import fuzzy
        for alias, f in project.roster.items():
            if fuzzy(target, alias):
                return "folder", f
        return None, target
    return "folder", folder


def preflight(ep, root):
    """ep: parsed episode yaml dict. root: episode's folder. -> Report."""
    from director import Project
    r = Report()
    mode = ep.get("mode", "director")
    beats_path = os.path.join(root, ep["script"])
    beats = json.load(open(beats_path))
    by_id = {b["id"]: b for b in beats}
    shots = ep.get("shots", [])
    cast_map = {str(k).lower(): str(v).lower()
                for k, v in (ep.get("cast") or {}).items()}
    project = Project(root)

    claims = {}
    for i, shot in enumerate(shots):
        b = shot.get("beat")
        if b is None:
            continue
        if b not in by_id:
            r.err(f"shot {i} claims unknown beat '{b}'")
            continue
        claims.setdefault(b, []).append(i)

    # --- dialogue: every line, verbatim, exactly once, actually voiced
    dlg = [b for b in beats if b["type"] == "dialogue"]
    for b in dlg:
        ids = claims.get(b["id"], [])
        if not ids:
            r.err(f"dialogue {b['id']} ({b['speaker']}: "
                  f"\"{b['text'][:50]}...\") is NOT in the episode — "
                  f"the script is authoritative; stage it or get explicit "
                  f"permission to cut it")
        elif len(ids) > 1:
            r.err(f"dialogue {b['id']} claimed by shots {ids} — exactly one")
        else:
            shot = shots[ids[0]]
            if not (shot.get("audio") or shot.get("line")):
                r.err(f"shot {ids[0]} claims {b['id']} but has no audio — "
                      f"the line would be silent")
            kind, resolved = _resolve_cast(b["speaker"], cast_map, project)
            if kind == "folder":
                actors = [a.get("char") for a in shot.get("actors", [])]
                talkers = [a.get("char") for a in shot.get("actors", [])
                           if a.get("talk")]
                if resolved not in actors:
                    r.warn(f"{b['id']}: speaker {b['speaker']} not on "
                           f"screen in shot {ids[0]} (off-screen line?)")
                elif resolved not in talkers:
                    r.warn(f"{b['id']}: {b['speaker']} is on screen in "
                           f"shot {ids[0]} but not set to talk")
    r.info.append(f"dialogue: {len([b for b in dlg if len(claims.get(b['id'], [])) == 1])}"
                  f" / {len(dlg)} lines staged, verbatim, in order")

    # --- order: claimed dialogue must appear in script order
    seq = [(shots_i[0], b["id"]) for b in dlg
           for shots_i in [claims.get(b["id"], [])] if shots_i]
    if [s for s, _ in seq] != sorted(s for s, _ in seq):
        r.err("dialogue beats are staged out of script order")

    # --- captions: on-screen text is authored text only
    if mode in ("strict", "director"):
        for i, shot in enumerate(shots):
            cap = shot.get("caption")
            b = by_id.get(shot.get("beat", ""), None)
            if cap and (b is None or b["type"] != "dialogue"):
                r.err(f"shot {i} has invented caption \"{cap}\" — captions "
                      f"come only from dialogue beats (mode={mode})")
            if cap and b and b["type"] == "dialogue":
                r.warn(f"shot {i}: hand-written caption ignored; the beat's "
                       f"verbatim text is used")

    # --- characters
    for name in speakers_of(beats):
        kind, resolved = _resolve_cast(name, cast_map, project)
        if kind is None:
            r.err(f"character {name} has no asset and no cast entry — add "
                  f"drawings to characters/, or set cast: {{{name.lower()}: "
                  f"silhouette}} or {{{name.lower()}: omit}} explicitly")
        elif kind == "omit":
            r.warn(f"character {name} explicitly omitted by cast map")
        elif kind == "silhouette":
            r.info.append(f"character {name}: placeholder silhouette")
        else:
            r.info.append(f"character {name}: {resolved}/")

    # --- actions & camera: present, staged or approximated
    acts = [b for b in beats if b["type"] in ("action", "camera")]
    staged = [b for b in acts if claims.get(b["id"])]
    r.info.append(f"actions: {len(staged)} / {len(acts)} explicitly staged; "
                  f"the rest are approximated or ambient")
    for b in acts:
        if not claims.get(b["id"]):
            r.warn(f"{b['id']} not explicitly staged: \"{b['text'][:60]}\"")
    return r


# ------------------------------------------------------------------- vo

DEFAULT_VOICES = ["en+m1 -p 40 -s 150", "en+f3 -p 60 -s 155",
                  "en+m7 -p 18 -s 135", "en+m4 -p 55 -s 160",
                  "en+f2 -p 70 -s 160"]


def make_vo(beats, outdir, voices=None):
    os.makedirs(outdir, exist_ok=True)
    voices = voices or {}
    pool = list(DEFAULT_VOICES)
    for b in beats:
        if b["type"] != "dialogue":
            continue
        sp = b["speaker"].lower()
        if sp not in voices:
            voices[sp] = pool.pop(0) if pool else DEFAULT_VOICES[0]
        path = os.path.join(outdir, f"{b['id']}.wav")
        subprocess.run(["espeak-ng", *voices[sp].split(), "-w", path,
                        b["text"]], check=True)
        print(f"{b['id']}  {b['speaker']:9s} {path}")
    print("\nplaceholder voices — replace these wavs with recordings "
          "(same filenames) and re-render")


# ------------------------------------------------------------------ cli

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("parse", help="screenplay -> beats.json")
    p.add_argument("script")
    p.add_argument("-o", "--out", required=True)

    v = sub.add_parser("vo", help="beats.json -> placeholder wavs")
    v.add_argument("beats")
    v.add_argument("outdir")

    f = sub.add_parser("preflight", help="validate an episode against "
                                         "its script")
    f.add_argument("episode")

    args = ap.parse_args()
    if args.cmd == "parse":
        beats = parse(args.script)
        with open(args.out, "w") as fh:
            json.dump(beats, fh, indent=1)
        n = {t: sum(1 for b in beats if b["type"] == t)
             for t in ("scene", "dialogue", "action", "camera")}
        print(f"wrote {args.out}: {n['dialogue']} dialogue, "
              f"{n['action']} action, {n['scene']} scenes, "
              f"{n['camera']} camera")
        for s in speakers_of(beats):
            print(f"  speaker: {s}")
    elif args.cmd == "vo":
        make_vo(json.load(open(args.beats)), args.outdir)
    elif args.cmd == "preflight":
        import yaml
        ep = yaml.safe_load(open(args.episode))
        root = os.path.dirname(os.path.abspath(args.episode))
        rep = preflight(ep, root)
        print(rep.render())
        sys.exit(0 if rep.ok else 1)


if __name__ == "__main__":
    main()
