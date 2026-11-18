"""The optimiser: swap a video's title and thumbnail when they're losing.

YouTube's own A/B test (Test & Compare) has no API, so this is the
automatic fallback. YouTube says editing titles and thumbnails carries no
penalty in itself, and to leave alone what's working. So the rules are:

- Data: the YouTube Reporting API's daily `channel_reach_combined_a1`
  report (thumbnail impressions and click-through per video, per traffic
  source). Reports arrive 48-72 hours late, so nothing is judged before
  day 4.
- Compare like with like: a video's click-through on its biggest traffic
  source against the channel's median on that same source.
- Swap only if it has enough impressions to judge (`min_impressions`)
  and sits clearly below median (`below_median`, default 85% of it).
- At most two swaps (A -> B -> C). If a swap does worse than what it
  replaced, put the better one back and stop.
- Never touch a video that's doing fine, or one marked
  `test_and_compare: true` (a Studio test stops if anything changes).
"""
from __future__ import annotations

import csv
import datetime as dt
import io
import statistics
from pathlib import Path

import yaml

from . import store

REPORT = "channel_reach_combined_a1"


def _state_path(cfg: dict) -> Path:
    return cfg["_dir"] / "reach.yaml"


def _load(cfg: dict) -> dict:
    p = _state_path(cfg)
    return (yaml.safe_load(p.read_text()) if p.exists() else None) or {"job": None, "seen": [], "videos": {}}


def _save(cfg: dict, st: dict) -> None:
    _state_path(cfg).write_text(yaml.safe_dump(st, sort_keys=False))


# --- data -------------------------------------------------------------------

def ingest_csv(st: dict, text: str) -> int:
    """Fold one daily report into {video: {date: {source: [impressions, clicks]}}}."""
    n = 0
    for row in csv.DictReader(io.StringIO(text)):
        vid, day, src = row.get("video_id"), row.get("date"), row.get("traffic_source_type", "all")
        try:
            imp = float(row.get("video_thumbnail_impressions") or 0)
            ctr = float(row.get("video_thumbnail_impressions_ctr") or 0)
        except ValueError:
            continue
        if not vid or not day or imp <= 0:
            continue
        cell = st["videos"].setdefault(vid, {}).setdefault(day, {}).setdefault(str(src), [0.0, 0.0])
        cell[0] += imp
        cell[1] += imp * ctr
        n += 1
    return n


def fetch(cfg: dict, st: dict) -> int:
    """Make sure the report job exists; pull any reports not yet seen."""
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload

    from .upload import _creds

    svc = build("youtubereporting", "v1", credentials=_creds(cfg), cache_discovery=False)
    if not st.get("job"):
        jobs = svc.jobs().list().execute().get("jobs", [])
        job = next((j for j in jobs if j["reportTypeId"] == REPORT), None)
        job = job or svc.jobs().create(body={"reportTypeId": REPORT, "name": f"autochannel-{cfg['_slug']}"}).execute()
        st["job"] = job["id"]
        print(f"  [{cfg['_slug']}] reporting job {job['id']} ready; first data in 2-3 days")
    rows = 0
    reports = svc.jobs().reports().list(jobId=st["job"]).execute().get("reports", [])
    for r in reports:
        if r["id"] in st["seen"]:
            continue
        # Google's documented pattern: point a media request at downloadUrl.
        req = svc.media().download_media(resourceName="")
        req.uri = r["downloadUrl"]
        buf = io.BytesIO()
        dl = MediaIoBaseDownload(buf, req, chunksize=4 * 1024 * 1024)
        done = False
        while not done:
            _, done = dl.next_chunk()
        rows += ingest_csv(st, buf.getvalue().decode("utf-8"))
        st["seen"].append(r["id"])
    st["seen"] = st["seen"][-400:]
    cutoff = (dt.date.today() - dt.timedelta(days=90)).strftime("%Y%m%d")
    for vid in st["videos"]:
        st["videos"][vid] = {d: v for d, v in st["videos"][vid].items() if d.replace("-", "") >= cutoff}
    return rows


# --- decisions ----------------------------------------------------------------

def _ctr(days: dict, since: str | None = None) -> dict[str, tuple[float, float]]:
    """Per traffic source: (impressions, click-through) over the days given."""
    tot: dict[str, list[float]] = {}
    for day, srcs in days.items():
        if since and day.replace("-", "") < since.replace("-", ""):
            continue
        for src, (imp, clicks) in srcs.items():
            t = tot.setdefault(src, [0.0, 0.0])
            t[0] += imp
            t[1] += clicks
    return {s: (i, c / i if i else 0.0) for s, (i, c) in tot.items()}


def decide(cfg: dict, st: dict, episodes: list[dict], today: dt.date | None = None) -> list[tuple[dict, int, str]]:
    """Return (episode, package index to switch to, reason) for each swap due."""
    o = cfg.get("packaging", {}).get("optimise", {})
    min_imp = float(o.get("min_impressions", 500))
    below = float(o.get("below_median", 0.85))
    settle = int(o.get("settle_days", 4))
    today = today or dt.date.today()

    # channel medians per source, from videos old enough to judge
    per_src: dict[str, list[float]] = {}
    for vid, days in st["videos"].items():
        for src, (imp, ctr) in _ctr(days).items():
            if imp >= min_imp:
                per_src.setdefault(src, []).append(ctr)
    medians = {s: statistics.median(v) for s, v in per_src.items() if len(v) >= 3}

    out = []
    for ep in episodes:
        vid, pk = ep.get("youtube_id"), ep.get("packaging") or []
        if not vid or len(pk) < 2 or ep.get("test_and_compare") or ep.get("optimise") is False:
            continue
        swaps = ep.get("swaps", [])
        since = swaps[-1]["at"] if swaps else ep.get("posted", "")[:10]
        if not since or (today - dt.date.fromisoformat(since[:10])).days < settle:
            continue
        now = _ctr(st["videos"].get(vid, {}), since=since[:10])
        if not now:
            continue
        src, (imp, ctr) = max(now.items(), key=lambda kv: kv[1][0])
        if imp < min_imp or src not in medians:
            continue
        live = ep.get("live_package", 0)
        if swaps and ctr < swaps[-1]["ctr_before"]:
            out.append((ep, swaps[-1]["from"], f"package {'ABC'[live]} did worse "
                        f"({ctr:.1%} vs {swaps[-1]['ctr_before']:.1%}); restoring and locking"))
            continue
        if ctr >= below * medians[src] or live + 1 >= len(pk) or len(swaps) >= 2:
            continue
        out.append((ep, live + 1, f"{ctr:.1%} vs channel median {medians[src]:.1%} on source {src} "
                    f"({imp:.0f} impressions)"))
    return out


def apply(cfg: dict, ep_path: Path, to: int, reason: str, st: dict, yt=None) -> None:
    from . import upload

    ep = store.load(ep_path)
    yt = yt or upload.client(cfg)
    vid = ep["youtube_id"]
    pk = ep["packaging"][to]
    snip = yt.videos().list(part="snippet", id=vid).execute()["items"][0]["snippet"]
    # videos.update deletes any snippet field not sent back: send it all.
    title = pk["title"]
    if cfg["format"]["kind"] == "short" and "#shorts" not in title.lower() and len(title) < 92:
        title += " #shorts"
    snip["title"] = title[:100]
    yt.videos().update(part="snippet", body={"id": vid, "snippet": {
        k: snip[k] for k in ("title", "description", "tags", "categoryId", "defaultLanguage") if k in snip}}).execute()
    alt = store.posted(cfg) / "alt" / f"{ep_path.stem}-{'abc'[to]}.jpg"
    if alt.exists():
        upload.set_thumbnail(yt, vid, alt)
    now = _ctr(st["videos"].get(vid, {}))
    before = max(now.values(), key=lambda v: v[0])[1] if now else 0.0
    restoring = "restoring" in reason
    ep.setdefault("swaps", []).append({"at": dt.date.today().isoformat(), "from": ep.get("live_package", 0),
                                       "to": to, "ctr_before": round(before, 4), "why": reason})
    ep["live_package"] = to
    if restoring:
        ep["optimise"] = False
    store.save(ep, ep_path)
    print(f"  [{cfg['_slug']}] {ep_path.stem}: now package {'ABC'[to]} - {reason}")


def optimise(cfg: dict) -> None:
    st = _load(cfg)
    try:
        fetch(cfg, st)
    finally:
        _save(cfg, st)
    paths = sorted(store.posted(cfg).glob("*.yaml"))
    by_vid = {store.load(p).get("youtube_id"): p for p in paths}
    for ep, to, reason in decide(cfg, st, [store.load(p) for p in paths]):
        apply(cfg, by_vid[ep["youtube_id"]], to, reason, st)
    _save(cfg, st)
