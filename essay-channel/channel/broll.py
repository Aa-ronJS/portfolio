"""Pictures for every sentence. The script says what each sentence
should show; this stage turns that into shots — a shot holds while
consecutive sentences share a visual, and splits when it would run too
long — then finds candidate footage for each shot, lets Claude look at
the candidates' frames and pick the one that shows what is being said,
and falls back from video to photographs to a plain card so there is
never dead air. Clips are cached across episodes and no clip plays
twice in one video while a fresh one remains.
"""

import os
import random
import urllib.parse

from . import media, prompts

CANDIDATES = 5


# ---------------------------------------------------------------- providers

class Pexels:
    name = "pexels"
    base = "https://api.pexels.com"

    def __init__(self, cfg):
        self.key = os.environ.get("PEXELS_API_KEY")
        if not self.key:
            raise SystemExit("broll.provider is pexels: set PEXELS_API_KEY "
                             "(free at pexels.com/api)")
        self.portrait = cfg["format"] == "portrait"
        self._cache = {}

    def _get(self, url):
        if url not in self._cache:
            self._cache[url] = media.get_json(url, {"Authorization": self.key})
        return self._cache[url]

    def search(self, query, n=8):
        q = urllib.parse.urlencode({
            "query": query, "per_page": n,
            "orientation": "portrait" if self.portrait else "landscape"})
        d = self._get(self.base + "/videos/search?" + q)
        out = []
        for v in d.get("videos", []):
            best = _pick_file(v.get("video_files", []), self.portrait)
            if best:
                out.append({"id": "pexels-%s" % v["id"], "kind": "video",
                            "url": best["link"], "thumb": v.get("image"),
                            "duration": float(v.get("duration") or 0),
                            "credit": "%s via Pexels" % (
                                (v.get("user") or {}).get("name", "")),
                            "page": v.get("url", "")})
        return out

    def photos(self, query, n=6):
        q = urllib.parse.urlencode({
            "query": query, "per_page": n,
            "orientation": "portrait" if self.portrait else "landscape"})
        d = self._get(self.base + "/v1/search?" + q)
        out = []
        for p in d.get("photos", []):
            src = p.get("src") or {}
            if not src.get("large2x"):
                continue
            out.append({"id": "pexels-photo-%s" % p["id"], "kind": "photo",
                        "url": src["large2x"], "thumb": src.get("medium"),
                        "duration": 0.0,
                        "credit": "%s via Pexels" % p.get("photographer", ""),
                        "page": p.get("url", "")})
        return out


def _pick_file(files, portrait):
    """The smallest file that still fills the frame (we crop to 1080p)."""
    ok = []
    for f in files:
        w, h = f.get("width") or 0, f.get("height") or 0
        if not w or not h or f.get("file_type") not in (None, "video/mp4"):
            continue
        if (h >= w) != portrait:
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
            if ((f.get("height") or 0) >= (f.get("width") or 1)) != self.portrait:
                continue
            out.append({"id": "pixabay-%s" % v["id"], "kind": "video",
                        "url": f["url"], "thumb": f.get("thumbnail"),
                        "duration": float(v.get("duration") or 0),
                        "credit": "%s via Pixabay" % v.get("user", ""),
                        "page": v.get("pageURL", "")})
        return out

    def photos(self, query, n=6):
        q = urllib.parse.urlencode({
            "key": self.key, "q": query, "per_page": n, "image_type": "photo",
            "orientation": "vertical" if self.portrait else "horizontal",
            "safesearch": "true"})
        d = media.get_json("https://pixabay.com/api/?" + q)
        out = []
        for p in d.get("hits", []):
            if not p.get("largeImageURL"):
                continue
            out.append({"id": "pixabay-photo-%s" % p["id"], "kind": "photo",
                        "url": p["largeImageURL"], "thumb": p.get("webformatURL"),
                        "duration": 0.0,
                        "credit": "%s via Pixabay" % p.get("user", ""),
                        "page": p.get("pageURL", "")})
        return out


PROVIDERS = {"pexels": Pexels, "pixabay": Pixabay}


# ---------------------------------------------------------------- shots

def plan_shots(tl, shot_min, shot_max):
    """Timeline sentences -> shots. Consecutive sentences sharing a
    visual hold one shot; a shot longer than shot_max splits at a
    sentence boundary and alternates to the alternative visual; a shot
    shorter than shot_min joins the one before it."""
    shots = []
    for sec in tl["sections"]:
        groups = []
        for st in sec["sentences"]:
            if groups and groups[-1]["query"] == st["visual"]:
                groups[-1]["sentences"].append(st)
            else:
                groups.append({"query": st["visual"], "alt": st["alt_visual"],
                               "sentences": [st]})
        for g in groups:
            chunks, cur = [], []
            for st in g["sentences"]:
                if cur and st["end"] - cur[0]["start"] > shot_max:
                    chunks.append(cur)
                    cur = []
                cur.append(st)
            if cur:
                chunks.append(cur)
            for k, ch in enumerate(chunks):
                q, alt = (g["query"], g["alt"]) if k % 2 == 0 else (g["alt"], g["query"])
                shot = {"section": sec["index"], "start": ch[0]["start"],
                        "end": ch[-1]["end"], "query": q or alt, "alt": alt or q,
                        "text": " ".join(s["text"] for s in ch),
                        "callouts": [(s["callout"], s["start"], s["end"])
                                     for s in ch if s.get("callout")]}
                if shots and shots[-1]["section"] == shot["section"] and \
                        shot["end"] - shot["start"] < shot_min:
                    shots[-1]["end"] = shot["end"]
                    shots[-1]["text"] += " " + shot["text"]
                    shots[-1]["callouts"] += shot["callouts"]
                else:
                    shots.append(shot)
    # the first shot starts at 0 (under the title card), the last runs to the end
    if shots:
        shots[0]["start"] = 0.0
        shots[-1]["end"] = tl["duration"]
    for i in range(len(shots) - 1):          # no gaps between shots
        shots[i]["end"] = shots[i + 1]["start"]
    return shots


# ---------------------------------------------------------------- the stage

def plan_broll(cfg, ep, provider, llm=None):
    tl = ep.load("voice")
    look = cfg["look"]
    shots = plan_shots(tl, float(look["shot_min"]), float(look["shot_max"]))
    rng = random.Random(ep.slug)
    cache = os.path.join(media.CACHE, "broll")
    used = set()
    credits, picks = {}, []
    vision = llm is not None and cfg["quality"]["vision_pick"]

    # candidates per shot, section by section so one vision call covers
    # a section's shots at once
    for sec in tl["sections"]:
        sec_shots = [s for s in shots if s["section"] == sec["index"]]
        cands = []
        for s in sec_shots:
            c = _candidates(provider, s, used, rng)
            cands.append(c)
        chosen = [None] * len(sec_shots)
        if vision:
            chosen = _vision_pick(llm, cfg, sec_shots, cands, picks)
        for s, c, pick in zip(sec_shots, cands, chosen):
            order = ([pick] if pick else []) + [x for x in c if x is not pick]
            s["kind"], s["file"], s["clip"], s["offset"] = "card", None, None, 0.0
            for cand in order:
                path = _fetch(cand, cache)
                if not path:
                    continue
                dur = s["end"] - s["start"]
                if cand["kind"] == "video":
                    info = media.probe(path)
                    avail = info["duration"]
                    if avail < min(2.0, dur):
                        continue
                    s["offset"] = rng.uniform(0, max(0.0, avail - dur)) \
                        if avail >= dur else 0.0
                    s["loop"] = avail < dur
                s["kind"], s["file"], s["clip"] = cand["kind"], \
                    os.path.relpath(path, cfg["_root"]), cand["id"]
                used.add(cand["id"])
                credits[cand["id"]] = {"credit": cand["credit"], "page": cand["page"]}
                break
            s["motion"] = _motion(rng, s["kind"])
    plan = {"shots": [_clean(s) for s in shots], "credits": credits,
            "provider": provider.name, "picks": picks,
            "vision": bool(vision)}
    ep.save("broll", plan)
    return ep.load("broll")


def _candidates(provider, shot, used, rng):
    """Video for the query, then the alternative, then photographs;
    fresh clips first."""
    out = []
    for q in (shot["query"], shot["alt"]):
        if not q:
            continue
        try:
            hits = provider.search(q)
        except Exception as e:                 # a dead query is not a dead video
            print("broll: search %r failed: %s" % (q, e))
            hits = []
        hits = [h for h in hits if h["duration"] >= 2.0]
        rng.shuffle(hits)
        out += [h for h in hits if h["id"] not in used]
        if len(out) >= CANDIDATES:
            break
    if len(out) < 2 and hasattr(provider, "photos"):
        for q in (shot["query"], shot["alt"]):
            if not q:
                continue
            try:
                out += [p for p in provider.photos(q) if p["id"] not in used]
            except Exception as e:
                print("broll: photo search %r failed: %s" % (q, e))
            if len(out) >= 2:
                break
    seen, uniq = set(), []
    for h in out:
        if h["id"] not in seen:
            seen.add(h["id"])
            uniq.append(h)
    return uniq[:CANDIDATES]


def _vision_pick(llm, cfg, shots, cands, picks):
    """One call per section: every shot's narration and its candidates'
    frames; Claude answers with a candidate per shot (0 = none fits)."""
    images, listing = [], []
    for i, (s, c) in enumerate(zip(shots, cands)):
        withthumb = [x for x in c if x.get("thumb")]
        listing.append((s["text"], len(withthumb)))
        for k, x in enumerate(withthumb, 1):
            images.append(("Shot %d, candidate %d" % (i, k), x["thumb"]))
    chosen = [None] * len(shots)
    if not images:
        return chosen
    try:
        r = llm.vision_json(prompts.system(cfg), prompts.pick_footage(listing),
                            images, prompts.PICK_SCHEMA)
    except Exception as e:
        print("broll: vision pick failed (%s); taking first results" % e)
        return chosen
    for p in r.get("picks", []):
        i, k = p.get("shot", -1), p.get("candidate", 0)
        if 0 <= i < len(shots):
            withthumb = [x for x in cands[i] if x.get("thumb")]
            if 1 <= k <= len(withthumb):
                chosen[i] = withthumb[k - 1]
            picks.append({"shot": shots[i]["text"][:60], "candidate": k,
                          "score": p.get("score"),
                          "clip": withthumb[k - 1]["id"] if 1 <= k <= len(withthumb) else None})
    return chosen


def _fetch(cand, cache):
    ext = ".mp4" if cand["kind"] == "video" else ".jpg"
    path = os.path.join(cache, cand["id"] + ext)
    try:
        media.download(cand["url"], path)
        if cand["kind"] == "video":
            info = media.probe(path)
            if not info["has_video"]:
                raise RuntimeError("no video stream")
        elif os.path.getsize(path) < 10_000:
            raise RuntimeError("tiny image")
        return path
    except Exception as e:
        print("broll: %s unusable (%s)" % (cand["id"], e))
        try:
            os.remove(path)
        except OSError:
            pass
        return None


def _motion(rng, kind):
    """A slow push in or pull out on video; a longer Ken Burns on a
    photograph, with a drift so the frame is never static."""
    if kind == "card":
        return {"zoom_from": 1.0, "zoom_to": 1.0, "pan": 0.0}
    if kind == "photo":
        z = rng.choice([(1.0, 1.14), (1.14, 1.0), (1.05, 1.18)])
        return {"zoom_from": z[0], "zoom_to": z[1], "pan": rng.choice([-1, 1]) * 0.5}
    z = rng.choice([(1.0, 1.06), (1.06, 1.0), (1.0, 1.0)])
    return {"zoom_from": z[0], "zoom_to": z[1], "pan": 0.0}


def _clean(s):
    return {k: v for k, v in s.items() if k not in ("alt",)} | {
        "duration": round(s["end"] - s["start"], 3),
        "callouts": [list(c) for c in s["callouts"]]}
