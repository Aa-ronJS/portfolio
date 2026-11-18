"""Config, paths and the episode queue.

An episode is one yaml file. It lives in queue/ until it is posted, then
moves to posted/ with the YouTube id written into it. The files are the
whole state of the channel: no database, nothing to lose but the repo.
"""
from __future__ import annotations

import datetime as dt
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
QUEUE = ROOT / "queue"
POSTED = ROOT / "posted"
BUILD = ROOT / "build"
CHANNEL = ROOT / "channel"


def load_config() -> dict:
    return yaml.safe_load((CHANNEL / "config.yaml").read_text())


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


def new_path(title: str) -> Path:
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d-%H%M%S")
    return QUEUE / f"{stamp}-{slug(title)}.yaml"


def ready(cfg: dict) -> list[Path]:
    """Queued episodes that may be posted, oldest first."""
    out = []
    for p in sorted(QUEUE.glob("*.yaml")):
        ep = load(p)
        if ep.get("failed"):
            continue
        if cfg["writer"].get("review") and not ep.get("approved"):
            continue
        out.append(p)
    return out


def history(limit: int = 200) -> list[str]:
    """Titles already posted or queued, newest first, so nothing repeats."""
    files = sorted(list(POSTED.glob("*.yaml")) + list(QUEUE.glob("*.yaml")), reverse=True)
    return [load(p).get("title", "") for p in files[:limit]]
