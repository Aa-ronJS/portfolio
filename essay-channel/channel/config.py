"""channel.yaml -> a config dict with every default filled in."""

import os
import zoneinfo

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # essay-channel/
CONFIG = os.path.join(ROOT, "channel.yaml")
EPISODES = os.path.join(ROOT, "episodes")
LEDGER = os.path.join(ROOT, "ledger.json")

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
FORMATS = {"landscape": (1920, 1080), "portrait": (1080, 1920)}


def _setdefaults(d, defaults):
    for k, v in defaults.items():
        if isinstance(v, dict):
            d[k] = _setdefaults(d.get(k) or {}, v)
        else:
            d.setdefault(k, v)
    return d


DEFAULTS = {
    "name": "Untitled Essays",
    "niche": "Video essays.",
    "language": "en",
    "format": "landscape",
    "target_minutes": 8,
    "model": "claude-opus-5-5",
    "effort": "high",
    "topics": {"queue": [], "avoid": [], "generate": True},
    "voice": {"provider": "elevenlabs", "voice": "Rachel",
              "model": "eleven_multilingual_v2", "speed": 1.0},
    "broll": {"provider": "pexels", "clip_seconds": 7, "min_clip_seconds": 4},
    "music": {"folder": "music", "jamendo": False, "gain_db": -16,
              "duck_db": -10},
    "captions": True,
    "title_cards": True,
    "publish": {"enabled": True, "timezone": "UTC",
                "slots": {"days": DAYS, "at": "17:00"},
                "category": 27, "tags": [],
                "description": "{summary}\n\nChapters\n{chapters}\n\n"
                               "Sources\n{sources}"},
    "review": False,
}


def load(path=CONFIG):
    with open(path) as f:
        cfg = yaml.safe_load(f) or {}
    cfg = _setdefaults(cfg, DEFAULTS)
    if cfg["format"] not in FORMATS:
        raise SystemExit("channel.yaml: format must be landscape or portrait")
    cfg["size"] = FORMATS[cfg["format"]]
    cfg["topics"]["queue"] = [str(t) for t in cfg["topics"]["queue"] or []]
    cfg["topics"]["avoid"] = [str(t) for t in cfg["topics"]["avoid"] or []]
    pub = cfg["publish"]
    zoneinfo.ZoneInfo(pub["timezone"])            # fail early on a typo
    days = [str(d).lower()[:3] for d in pub["slots"]["days"]]
    bad = [d for d in days if d not in DAYS]
    if bad:
        raise SystemExit("channel.yaml: unknown day(s) %s" % bad)
    pub["slots"]["days"] = days
    hh, mm = str(pub["slots"]["at"]).split(":")
    pub["slots"]["_hm"] = (int(hh), int(mm))
    cfg["music"]["folder"] = os.path.join(ROOT, cfg["music"]["folder"])
    cfg["_root"] = ROOT
    cfg["_episodes"] = os.environ.get("CHANNEL_EPISODES", EPISODES)
    cfg["_ledger"] = os.environ.get("CHANNEL_LEDGER", LEDGER)
    return cfg
