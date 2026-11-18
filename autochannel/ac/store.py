"""Channels, config and the episode queue.

Every channel is a folder in channels/: its channel.yaml (only what
differs from channels/defaults.yaml), RULES.md, IDEAS.md, queue/ and
posted/. An episode is one yaml file; it lives in queue/ until posted,
then moves to posted/ with its YouTube id. The files ARE the state: no
database, nothing to lose but the repo.

The loaded config dict carries the channel's paths under keys starting
with "_" (`_slug`, `_dir`), so every module just takes `cfg`.
"""
from __future__ import annotations

import copy
import datetime as dt
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CHANNELS = ROOT / "channels"
BUILD = ROOT / "build"


def _merge(base: dict, over: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        out[k] = _merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def channels() -> list[str]:
    return sorted(p.parent.name for p in CHANNELS.glob("*/channel.yaml") if not p.parent.name.startswith("_"))


def load_config(slug: str) -> dict:
    d = CHANNELS / slug
    if not (d / "channel.yaml").exists():
        raise SystemExit(f"no channel '{slug}'. Channels: {', '.join(channels()) or 'none'}")
    cfg = _merge(yaml.safe_load((CHANNELS / "defaults.yaml").read_text()),
                 yaml.safe_load((d / "channel.yaml").read_text()))
    cfg["_slug"], cfg["_dir"] = slug, d
    return cfg


def queue(cfg: dict) -> Path:
    return cfg["_dir"] / "queue"


def posted(cfg: dict) -> Path:
    return cfg["_dir"] / "posted"


def build(cfg: dict) -> Path:
    return BUILD / cfg["_slug"]


def slug(text: str, n: int = 48) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:n].rstrip("-") or "untitled"


def save(ep: dict, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(yaml.safe_dump(ep, sort_keys=False, allow_unicode=True, width=78))
    tmp.replace(path)  # atomic: a crash never leaves half an episode
    return path


def load(path: Path) -> dict:
    return yaml.safe_load(path.read_text())


def new_path(cfg: dict, title: str) -> Path:
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d-%H%M%S")
    return queue(cfg) / f"{stamp}-{slug(title)}.yaml"


def ready(cfg: dict) -> list[Path]:
    """Queued episodes that may be posted, oldest first."""
    out = []
    for p in sorted(queue(cfg).glob("*.yaml")):
        ep = load(p)
        if ep.get("failed"):
            continue
        if cfg["writer"].get("review") and not ep.get("approved"):
            continue
        out.append(p)
    return out


def history(cfg: dict, limit: int = 200) -> list[str]:
    """Titles already posted or queued on this channel, newest first."""
    files = sorted(list(posted(cfg).glob("*.yaml")) + list(queue(cfg).glob("*.yaml")), reverse=True)
    return [load(p).get("title", "") for p in files[:limit]]


DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def due_today(cfg: dict) -> bool:
    today = DAYS[dt.datetime.now(dt.timezone.utc).weekday()]
    return today in [d.lower()[:3] for d in cfg["publish"].get("days", DAYS)]
