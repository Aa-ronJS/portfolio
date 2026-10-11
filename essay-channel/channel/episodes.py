"""Episode folders and the ledger.

An episode is a folder under episodes/<slug>/ holding one file per stage;
a stage that has already written its file is skipped on the next run, so
a crash anywhere resumes where it stopped. The ledger (ledger.json,
committed) is the list of what went out, so a fresh clone cannot
publish an episode twice.
"""

import datetime as dt
import json
import os
import re
import unicodedata

STAGES = ["topic", "research", "script", "voice", "broll", "music",
          "assemble", "publish"]


def slugify(title, limit=48):
    s = unicodedata.normalize("NFKD", str(title)).encode("ascii", "ignore")
    s = re.sub(r"[^a-z0-9]+", "-", s.decode().lower()).strip("-")
    return s[:limit].rstrip("-") or "episode"


def now_iso():
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def read_json(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path) as f:
        return json.load(f)


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write("\n")
    os.replace(tmp, path)


class Episode:
    """Paths for one episode; `done(stage)` says whether its output exists."""

    def __init__(self, root, slug):
        self.slug = slug
        self.dir = os.path.join(root, slug)
        os.makedirs(self.dir, exist_ok=True)

    def path(self, *parts):
        return os.path.join(self.dir, *parts)

    OUTPUTS = {
        "topic": "topic.json",
        "research": "research.json",
        "script": "script.json",
        "voice": os.path.join("voice", "timeline.json"),
        "broll": os.path.join("broll", "plan.json"),
        "music": os.path.join("music", "music.json"),
        "assemble": "final.mp4",
        "publish": "publish.json",
    }

    def output(self, stage):
        return self.path(self.OUTPUTS[stage])

    def done(self, stage):
        return os.path.exists(self.output(stage))

    def reset(self, stage):
        """Forget a stage (and everything after it, which depended on it)."""
        for s in STAGES[STAGES.index(stage):]:
            p = self.output(s)
            if os.path.exists(p):
                os.remove(p)

    def load(self, stage):
        return read_json(self.output(stage))

    def save(self, stage, data):
        write_json(self.output(stage), data)

    def stage_done_up_to(self):
        last = None
        for s in STAGES:
            if self.done(s):
                last = s
            else:
                break
        return last


def list_episodes(root):
    if not os.path.isdir(root):
        return []
    out = []
    for slug in sorted(os.listdir(root)):
        if os.path.isdir(os.path.join(root, slug)) and not slug.startswith("."):
            out.append(Episode(root, slug))
    return out


# ---------------------------------------------------------------- ledger

def load_ledger(path):
    led = read_json(path, {"videos": {}})
    led.setdefault("videos", {})
    return led


def save_ledger(led, path):
    write_json(path, led)


def done_titles(root, ledger_path):
    """Everything the channel has made or started — so the topic picker
    never repeats itself."""
    titles = []
    led = load_ledger(ledger_path)
    for key, v in led["videos"].items():
        titles.append(v.get("title") or key)
    for ep in list_episodes(root):
        t = ep.load("topic")
        if t and t.get("title") and t["title"] not in titles:
            titles.append(t["title"])
    return titles
