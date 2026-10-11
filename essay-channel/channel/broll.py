"""Background footage: each section's search queries become a run of
stock clips cut to the narration. Clips are cached across episodes;
a query with no results falls back to a plain card so the video is
never missing picture.
"""

import os
import random
import urllib.parse

from . import media


class Pexels:
    name = "pexels"

    def __init__(self, cfg):
        self.key = os.environ.get("PEXELS_API_KEY")
        if not self.key:
            raise SystemExit("broll.provider is pexels: set PEXELS_API_KEY "
                             "(free at pexels.com/api)")
        self.portrait = cfg["format"] == "portrait"

    def search(self, query, n=8):
        q = urllib.parse.urlencode({
            "query": query, "per_page": n,
            "orientation": "portrait" if self.portrait else "landscape"})
        d = media.get_json("https://api.pexels.com/videos/search?" + q,
                           {"Authorization": self.key})
        out = []
        for v in d.get("videos", []):
            best = _pick_file(v.get("video_files", []), self.portrait)
            if best:
                out.append({"id": "pexels-%s" % v["id"], "url": best["link"],
                            "duration": float(v.get("duration") or 0),
                            "width": best.get("width") or 0,
                            "height": best.get("height") or 0,
                            "credit": "%s via Pexels" % (
                                (v.get("user") or {}).get("name", "")),
                            "page": v.get("url", "")})
        return out


def _pick_file(files, portrait):
    """The smallest file that still fills the frame (we crop to 1080p)."""
    ok = []
    for f in files:
        w, h = f.get("width") or 0, f.get("height") or 0
        if not w or not h or f.get("file_type") not in (None, "video/mp4"):
            continue
        tall = h >= w
        if tall != portrait:
            continue
        if (h if portrait else w) >= 1080 and (w if portrait else h) >= 600:
            ok.append(f)
    if not ok:
        return None
    return min(ok, key=lambda f: f["width"] * f["height"])


class Pixabay:
    name = "pixabay"

    def __init__(self, cfg):
        self.key = os.environ.get("PIXABAY_API_KEY")
        if not self.key:
            raise SystemExit("broll.provider is pixabay: set PIXABAY_API_KEY")
        self.portrait = cfg["format"] == "portrait"

    def search(self, query, n=8):
        q = urllib.parse.urlencode({"key": self.key, "q": query, "per_page": n,
                                    "safesearch": "true"})
        d = media.get_json("https://pixabay.com/api/videos/?" + q)
        out = []
        for v in d.get("hits", []):
            vids = v.get("videos") or {}
            f = vids.get("large") or vids.get("medium")
            if not f or not f.get("url"):
                continue
            tall = (f.get("height") or 0) >= (f.get("width") or 1)
            if tall != self.portrait:
                continue
            out.append({"id": "pixabay-%s" % v["id"], "url": f["url"],
                        "duration": float(v.get("duration") or 0),
                        "width": f.get("width") or 0, "height": f.get("height") or 0,
                        "credit": "%s via Pixabay" % v.get("user", ""),
                        "page": v.get("pageURL", "")})
        return out


PROVIDERS = {"pexels": Pexels, "pixabay": Pixabay}


def plan_broll(cfg, ep, provider):
    """voice/timeline.json -> broll/plan.json: for every second of the
    video, which clip (or card) is on screen."""
    tl = ep.load("voice")
    clip_len = float(cfg["broll"]["clip_seconds"])
    min_len = float(cfg["broll"]["min_clip_seconds"])
    rng = random.Random(ep.slug)
    cache = os.path.join(media.CACHE, "broll")
    used = set()
    segments, credits = [], {}
    for sec in tl["sections"]:
        pool = []
        for q in sec["broll"]:
            try:
                hits = provider.search(q)
            except Exception as e:                 # a dead query is not a dead video
                print("broll: search %r failed: %s" % (q, e))
                hits = []
            hits = [h for h in hits if h["duration"] >= min_len]
            rng.shuffle(hits)
            pool.append(hits)
        t, need = sec["start"], sec["end"]
        order = _interleave(pool)
        fresh = [h for h in order if h["id"] not in used]
        queue = fresh + [h for h in order if h["id"] in used]
        while need - t > 0.05:
            seg_len = min(clip_len, need - t)
            if need - t - seg_len < min_len:       # don't leave a stub
                seg_len = need - t
            clip = queue.pop(0) if queue else None
            if clip is None:
                segments.append({"start": t, "duration": seg_len, "card": True,
                                 "text": sec["heading"]})
                t += seg_len
                continue
            path = os.path.join(cache, clip["id"] + ".mp4")
            try:
                media.download(clip["url"], path)
                info = media.probe(path)
                if not info["has_video"] or info["duration"] < 1.0:
                    raise RuntimeError("unusable clip")
            except Exception as e:
                print("broll: %s unusable (%s)" % (clip["id"], e))
                continue
            used.add(clip["id"])
            credits[clip["id"]] = {"credit": clip["credit"], "page": clip["page"]}
            avail = info["duration"]
            seg_len = min(seg_len, avail)
            offset = rng.uniform(0, max(0.0, avail - seg_len))
            segments.append({"start": t, "duration": seg_len, "card": False,
                             "file": os.path.relpath(path, cfg["_root"]),
                             "clip": clip["id"], "offset": offset})
            t += seg_len
            if avail - seg_len >= min_len and len(queue) < 2:
                queue.append(clip)                 # a long clip can serve twice
    ep.save("broll", {"segments": segments, "credits": credits,
                      "provider": provider.name})
    return ep.load("broll")


def _interleave(lists):
    out, i = [], 0
    lists = [l[:] for l in lists if l]
    while lists:
        l = lists[i % len(lists)]
        out.append(l.pop(0))
        if not l:
            lists.remove(l)
        else:
            i += 1
    return out
