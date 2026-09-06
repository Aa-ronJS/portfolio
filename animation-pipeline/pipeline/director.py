"""Turn a transcribed, silence-split voice take into a staged episode.

The take alternates spoken DIRECTIONS with PERFORMED lines:

    "in the chip shop, stan walks in from the left and says"
    "large chips please my good man"                     <- performed
    "the seagull hops in from the right and says"
    "give me one chip"                                   <- performed
    "close up on stan, he says"
    "absolutely not"                                     <- performed
    "the seagull leaves"

Rules of the grammar (all case-insensitive, punctuation ignored):

  <name> says / asks / shouts / whispers / replies / goes ...
        -> the NEXT spoken line is that character's dialogue; their mouth
           is puppeted to it and it becomes the shot's caption.
  <name> walks in / enters / hops in / runs in [from the left|right]
        -> character joins the stage, animated in.
  <name> leaves / exits / walks off / storms off
        -> character exits (a short shot of them leaving).
  in the <background> / at the <background>
        -> fuzzy-matched against backgrounds/*.png.
  close up [on <name>]
        -> the next dialogue shot is framed head-and-shoulders.
  new scene / cut / meanwhile
        -> clears the stage.
  beat / pause / hold
        -> a short silent shot of the current stage.

Character names are fuzzy-matched against the folders in characters/
(plus any "aliases" list in char.json), so a slightly mis-transcribed
name still casts correctly. Characters stay on stage between shots until
they leave. Anything that parses as none of the above is treated as a
performed line: if exactly one character is on stage they speak it,
otherwise it plays as voice-over.
"""

import difflib
import json
import os
import re

SPEECH_VERBS = {
    "says", "say", "said", "asks", "ask", "shouts", "shout", "yells",
    "whispers", "mumbles", "replies", "reply", "answers", "goes", "screams",
    "adds", "continues", "announces", "declares", "sings", "explains",
}
ENTER_CUES = [
    ("walks in", 1.4), ("comes in", 1.4), ("walks on", 1.4),
    ("wanders in", 1.6), ("enters", 1.4), ("arrives", 1.4),
    ("hops in", 1.2), ("runs in", 0.8), ("storms in", 0.8),
    ("appears", 0.0),
]
EXIT_CUES = ["leaves", "exits", "walks off", "walks out", "storms off",
             "storms out", "goes away", "flies off", "runs off"]
SCENE_CUES = ["new scene", "next scene", "cut to", "meanwhile", "later",
              "new shot"]
BEAT_CUES = ["beat", "pause", "hold"]
CLOSEUP_CUES = ["close up", "closeup", "close-up"]

STAGE_Y = 0.74
STAGE_SCALE = 0.34


def words_of(text):
    return re.findall(r"[a-z']+", text.lower())


def phonetic(w):
    """Crude sound key so mis-transcribed names still match:
    'siegel' and 'seagull' both become 'sgl'."""
    w = re.sub(r"[^a-z]", "", w.lower())
    if not w:
        return ""
    key = w[0] + re.sub(r"[aeiouyhw]", "", w[1:])
    return re.sub(r"(.)\1+", r"\1", key)


def fuzzy(a, b, cutoff=0.8):
    if difflib.SequenceMatcher(None, a, b).ratio() >= cutoff:
        return True
    pa, pb = phonetic(a), phonetic(b)
    return len(pa) >= 2 and (
        pa == pb or difflib.SequenceMatcher(None, pa, pb).ratio() >= 0.8)


class Project:
    """Characters and backgrounds available to the director."""

    def __init__(self, root):
        self.root = root
        self.roster = {}  # alias -> canonical folder name
        cdir = os.path.join(root, "characters")
        if os.path.isdir(cdir):
            for name in sorted(os.listdir(cdir)):
                folder = os.path.join(cdir, name)
                if not os.path.isdir(folder):
                    continue
                aliases = {name.lower()}
                meta = os.path.join(folder, "char.json")
                if os.path.exists(meta):
                    with open(meta) as f:
                        for a in json.load(f).get("aliases", []):
                            aliases.add(a.lower())
                for a in aliases:
                    self.roster[a] = name
        self.backgrounds = {}
        bdir = os.path.join(root, "backgrounds")
        if os.path.isdir(bdir):
            for f in sorted(os.listdir(bdir)):
                if f.lower().endswith(".png"):
                    self.backgrounds[os.path.splitext(f)[0].lower()] = \
                        os.path.join("backgrounds", f)

    def find_chars(self, words):
        """All roster characters mentioned in the words, in order."""
        hits = []
        for i, w in enumerate(words):
            for alias, name in self.roster.items():
                if fuzzy(w, alias) and all(n != name for n, _ in hits):
                    hits.append((name, i))
        return hits

    def find_background(self, text):
        m = re.search(r"\b(?:in|at|to) the ([a-z' ]+?)"
                      r"(?:[,.]|$| and | where | with )", text.lower())
        if not m:
            return None
        want = m.group(1).replace(" ", "")
        for key, path in self.backgrounds.items():
            if fuzzy(want, key, 0.7) or key in want or want in key:
                return path
        return None


def parse_direction(text, project):
    """Parse one spoken line as a direction. Returns None if it isn't one."""
    words = words_of(text)
    low = " ".join(words)
    chars = project.find_chars(words)
    d = {"says": None, "enters": [], "exits": [], "closeup": None,
         "bg": project.find_background(text), "reset": False, "beat": False,
         "chars": [name for name, _ in chars]}

    if any(c in low for c in SCENE_CUES):
        d["reset"] = True
    if low in BEAT_CUES or any(low.startswith(c + " ") for c in BEAT_CUES):
        d["beat"] = True
    if any(c in low for c in CLOSEUP_CUES):
        d["closeup"] = chars[0][0] if chars else "_current_speaker"

    for name, i in chars:
        after = " ".join(words[i + 1:])
        if any(cue in after for cue, _ in ENTER_CUES):
            side = "left" if "left" in after else \
                   "right" if "right" in after else None
            speed = next(s for cue, s in ENTER_CUES if cue in after)
            d["enters"].append((name, side, speed))
        if any(cue in after for cue in EXIT_CUES):
            d["exits"].append(name)
        if any(v in words[i + 1:] for v in SPEECH_VERBS):
            d["says"] = name

    # a speech verb with no name attaches to the only char on offer
    d["speechy"] = any(v in words for v in SPEECH_VERBS)
    if d["says"] is None and chars and d["speechy"]:
        d["says"] = chars[0][0]
    # a line ENDING in a speech verb is a hand-off to the next line even
    # when the name got garbled: "...walks in from the left and says"
    d["handoff"] = any(v in words[-3:] for v in SPEECH_VERBS)

    is_direction = (d["says"] or d["enters"] or d["exits"] or d["reset"]
                    or d["beat"] or d["closeup"] or d["bg"] or d["handoff"])
    return d if is_direction else None


class Director:
    """Consumes (line_number, transcript) pairs, produces shot dicts."""

    def __init__(self, project, default_bg):
        self.p = project
        self.bg = default_bg
        self.stage = []          # character names, stage order
        self.entries = {}        # name -> (side, speed) not yet animated
        self.closeup_next = None
        self.expecting = None    # char whose dialogue comes next
        self.last_subject = None  # most recently directed character
        self.shots = []

    def slots(self, n):
        if n <= 1:
            return [0.5]
        lo, hi = 0.30 - 0.02 * n, 0.70 + 0.02 * n
        return [lo + (hi - lo) * i / (n - 1) for i in range(n)]

    def cast(self, speaker=None):
        """Actor list for the current stage; speaker gets the mouth."""
        xs = self.slots(len(self.stage))
        actors = []
        for name, x in zip(self.stage, xs):
            a = {"char": name, "at": [round(x, 2), STAGE_Y],
                 "scale": STAGE_SCALE}
            if x > 0.55:
                a["flip"] = True
            if name == speaker:
                a["talk"] = True
            if name in self.entries:
                side, speed = self.entries.pop(name)
                if speed > 0:
                    x0 = -0.25 if side == "left" else 1.25 if side == "right" \
                        else (-0.25 if x <= 0.5 else 1.25)
                    a.setdefault("moves", []).extend([
                        {"type": "slide", "from": [x0, STAGE_Y],
                         "to": [round(x, 2), STAGE_Y], "t": [0, speed]},
                        {"type": "waddle", "amp": 3, "period": 0.5},
                        {"type": "bob", "amp": 0.005, "period": 0.5},
                    ])
                else:
                    a.setdefault("moves", []).append(
                        {"type": "pop", "t": [0, 0.3]})
            elif name == speaker:
                a["moves"] = [{"type": "bob", "amp": 0.004, "period": 0.7}]
            actors.append(a)
        return actors

    def speech_shot(self, speaker, line_no, caption):
        if self.closeup_next and speaker:
            self.entries.pop(speaker, None)
            shot = {"bg": self.bg, "line": line_no, "caption": caption,
                    "zoom": [1.0, 1.05],
                    "actors": [{"char": speaker, "at": [0.5, 1.35],
                                "scale": 1.5, "talk": True,
                                "moves": [{"type": "bob", "amp": 0.003,
                                           "period": 0.9}]}]}
            self.closeup_next = None
        else:
            shot = {"bg": self.bg, "line": line_no, "caption": caption,
                    "actors": self.cast(speaker)}
            self.closeup_next = None  # never let a framing note go stale
        self.shots.append(shot)

    def feed(self, line_no, text):
        text = (text or "").strip()
        if self.expecting is not None:
            speaker = self.expecting or None  # "" = unknown -> voice-over
            self.expecting = None
            self.speech_shot(speaker, line_no, text or None)
            return

        d = parse_direction(text, self.p) if text else None

        # Mis-heard directions rarely survive verb matching, but the
        # character name usually does: a longer line that OPENS with a
        # known name (and wasn't claimed as someone's dialogue above) is
        # almost certainly a direction about them — read it as "X says".
        if d is None and text:
            words = words_of(text)
            chars = self.p.find_chars(words)
            if chars and chars[0][1] <= 2 and len(words) >= 5:
                d = {"says": chars[0][0], "enters": [], "exits": [],
                     "closeup": None, "bg": None, "reset": False,
                     "beat": False, "chars": [chars[0][0]],
                     "speechy": True}

        if d is None:
            # Unparsed performance (a mumbled or mis-heard direction ends
            # up here too): a solo character speaks it; with several on
            # stage it goes to whoever was directed most recently; with
            # nobody identifiable it plays as voice-over.
            speaker = self.stage[0] if len(self.stage) == 1 else \
                (self.last_subject if self.last_subject in self.stage
                 else None)
            self.speech_shot(speaker, line_no, text or None)
            return

        if d["reset"]:
            self.stage, self.entries = [], {}
        if d["bg"]:
            self.bg = d["bg"]
        for name, side, speed in d["enters"]:
            if name not in self.stage:
                self.stage.append(name)
                self.entries[name] = (side, speed)
        if d["closeup"]:
            self.closeup_next = d["closeup"]
        if d["says"] is None and d.get("speechy"):
            # "...walks in and says" where the name was garbled: give the
            # line to the best candidate rather than dropping it.
            d["says"] = (d["chars"][0] if d["chars"] else
                         self.stage[0] if len(self.stage) == 1 else
                         self.last_subject)
        if d["says"]:
            self.last_subject = d["says"]
        elif d["enters"]:
            self.last_subject = d["enters"][-1][0]
        elif d["chars"]:
            self.last_subject = d["chars"][0]

        if d["says"]:
            if d["says"] not in self.stage:
                self.stage.append(d["says"])
                self.entries.setdefault(d["says"], (None, 0.0))
            if self.closeup_next == "_current_speaker":
                self.closeup_next = d["says"]
            self.expecting = d["says"]
        elif d.get("handoff"):
            # verb at the end but nobody identifiable: the next line still
            # belongs to this direction — play it over the current stage
            self.expecting = ""
        elif d["beat"] or (d["enters"] and not d["exits"]):
            # a stage change with no dialogue still deserves a beat on screen
            self.shots.append({"bg": self.bg, "duration": 1.6,
                               "actors": self.cast()})

        for name in d["exits"]:
            if name in self.stage:
                x = dict(zip(self.stage,
                             self.slots(len(self.stage))))[name]
                x1 = -0.3 if x <= 0.5 else 1.3
                exit_actor = {
                    "char": name, "at": [round(x1, 2), STAGE_Y],
                    "scale": STAGE_SCALE,
                    "moves": [
                        {"type": "slide", "from": [round(x, 2), STAGE_Y],
                         "to": [round(x1, 2), STAGE_Y], "t": [0, 1.2]},
                        {"type": "waddle", "amp": 3, "period": 0.5}]}
                self.stage.remove(name)
                others = self.cast()
                self.shots.append({"bg": self.bg, "duration": 1.8,
                                   "actors": others + [exit_actor]})

    def finish(self):
        if self.expecting is not None:
            # trailing "X says" with no line after it — show them anyway
            self.speech_shot(None, None, None)
            self.shots.pop()
        return self.shots
