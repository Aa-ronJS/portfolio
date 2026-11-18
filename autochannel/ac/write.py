"""Tops up a channel's queue: each idea goes through the writers' room
(council.py) and only scripts the whole council passes are queued.

A per-channel monthly cap (`writer.monthly_budget_usd`) stops the room
before it can overspend; the month's spend is kept in spend.yaml.
"""
from __future__ import annotations

import datetime as dt
import re

import yaml

from . import council, store


def _ideas(cfg: dict) -> list[str]:
    text = (cfg["_dir"] / "IDEAS.md").read_text()
    m = re.search(r"## Up next\n(.*?)(\n## |\Z)", text, re.S)
    if not m:
        return []
    return [l.strip("-* \t") for l in m.group(1).splitlines() if l.strip("-* \t")]


def _mark_used(cfg: dict, used: list[str]) -> None:
    path = cfg["_dir"] / "IDEAS.md"
    text = path.read_text()
    for idea in used:
        if not idea:
            continue
        lines = text.splitlines()
        lines = [l for l in lines if l.strip("-* \t") != idea]
        text = "\n".join(lines).rstrip() + f"\n- {idea}\n"
    path.write_text(text)


def _spend(cfg: dict) -> tuple[dict, str]:
    path = cfg["_dir"] / "spend.yaml"
    data = yaml.safe_load(path.read_text()) if path.exists() else {}
    return data or {}, dt.date.today().strftime("%Y-%m")


def _add_spend(cfg: dict, usd: float) -> None:
    data, month = _spend(cfg)
    data[month] = round(float(data.get(month, 0)) + usd, 2)
    (cfg["_dir"] / "spend.yaml").write_text(yaml.safe_dump(data))


def write(cfg: dict, n: int | None = None) -> list:
    """Run up to n ideas through the room, a few at a time (GitHub bills
    wall-clock minutes and the room mostly waits on the API)."""
    from concurrent.futures import ThreadPoolExecutor

    w = cfg["writer"]
    n = n or w["batch_size"]
    cap = float(w.get("monthly_budget_usd", 1e9))
    ideas = _ideas(cfg)
    done = store.history(cfg)
    data, month = _spend(cfg)
    spent = float(data.get(month, 0))
    if spent >= cap:
        print(f"  [{cfg['_slug']}] monthly writing budget (${cap:.0f}) reached")
        return []
    # Rough guard so a batch can't blow far past the cap: ~$2.5 a script.
    n = max(1, min(n, int((cap - spent) / float(w.get("est_cost_usd", 2.5))) or 1))
    jobs = [ideas[k] if k < len(ideas) else "" for k in range(n)]

    with ThreadPoolExecutor(max_workers=int(w.get("parallel", 3))) as pool:
        results = list(pool.map(lambda idea: (idea, *council.make_script(cfg, idea, done)), jobs))

    paths, used = [], []
    for idea, ep, usd in results:
        _add_spend(cfg, usd)
        used.append(ep["idea"] if ep else idea)  # one shot per idea; re-add to IDEAS.md to retry
        if ep is None:
            print(f"  [{cfg['_slug']}] binned (${usd:.2f}); see rejected/")
            continue
        ep["approved"] = not w.get("review", False)
        paths.append(store.save(ep, store.new_path(cfg, ep["title"])))
        print(f"  [{cfg['_slug']}] queued '{ep['title']}' after {ep['rounds']} round(s), ${usd:.2f}")
    _mark_used(cfg, used)
    if not paths:
        raise RuntimeError("no script passed the council this run")
    return paths
