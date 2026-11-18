"""Free footage, from whichever sources a channel lists, in order.

Each source turns a search term into a local file plus a credit line.
Only licences that allow commercial use without share-alike are taken
(public domain, CC0, CC BY, and the stock sites' own free licences), and
every credit that needs one is collected for the video description.

Sources (channel.yaml `visuals.sources`, tried in order per cut):
  library    the channel's own footage/ folder, matched on file names
  pixabay    stock video (free key: PIXABAY_API_KEY)
  pexels     stock video (key: PEXELS_API_KEY, if you have one)
  nasa       NASA Image and Video Library: public domain, no key
  archive    Internet Archive public-domain films (Prelinger), no key
  openverse  Creative Commons photos (Flickr, museums...), no key; stills
  wikimedia  Wikimedia Commons, no key, but rate-limits cloud servers

Any failure (network, quota, nothing found) just moves to the next
source; if every source fails the cut becomes a gradient. Downloads are
cached in build/footage-cache/ and a clip is never used twice in a video.
"""
from __future__ import annotations

import json
import os
import random
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from . import store

UA = {"User-Agent": "autochannel/1.0 (personal video project)"}
OK_LICENCES = {"cc0", "pdm", "by", "publicdomain", "public domain"}


@dataclass
class Clip:
    path: Path
    kind: str            # "video" or "image"
    credit: str | None   # description line, or None if no credit needed
    key: str             # unique id so a clip isn't reused in one video


def _qs(params: dict, doseq: bool = False) -> str:
    # spaces as %20, never "+": Openverse reads "+" literally and finds nothing
    return urllib.parse.urlencode(params, doseq=doseq, quote_via=urllib.parse.quote)


def _get(url: str, timeout: int = 20, headers: dict | None = None, tries: int = 2):
    # some sources hand back URLs with raw spaces; encode the path, keep the query
    parts = urllib.parse.urlsplit(url)
    url = urllib.parse.urlunsplit(parts._replace(path=urllib.parse.quote(urllib.parse.unquote(parts.path))))
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={**UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or k == tries - 1:
                raise
            import time
            time.sleep(3 * (k + 1))


def _download(url: str, dest: Path, headers: dict | None = None) -> Path | None:
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    try:
        part = dest.with_suffix(dest.suffix + ".part")
        part.write_bytes(_get(url, timeout=90, headers=headers))
        part.replace(dest)
        return dest
    except Exception as e:
        print(f"    download failed ({e})")
        return None


def _cache() -> Path:
    d = store.BUILD / "footage-cache"
    d.mkdir(parents=True, exist_ok=True)
    return d


# --- sources ----------------------------------------------------------------

def library(term, cfg, portrait, used):
    root = cfg["_dir"] / "footage"
    if not root.exists():
        return None
    # cue like "gameplay: hollow knight - abyss shriek" -> match words in file names
    words = [w for w in re.findall(r"[a-z0-9]+", term.lower()) if len(w) > 2 and w not in {"gameplay", "clip"}]
    best, score = None, 0
    for p in root.rglob("*"):
        if p.suffix.lower() not in {".mp4", ".mov", ".webm", ".mkv", ".jpg", ".jpeg", ".png"} or str(p) in used:
            continue
        name = p.stem.lower()
        s = sum(w in name for w in words)
        if s > score:
            best, score = p, s
    if not best:
        return None
    kind = "image" if best.suffix.lower() in {".jpg", ".jpeg", ".png"} else "video"
    return Clip(best, kind, None, str(best))


def pixabay(term, cfg, portrait, used):
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        return None
    q = _qs({"key": key, "q": term[:100], "per_page": 15, "safesearch": "true"})
    hits = json.loads(_get(f"https://pixabay.com/api/videos/?{q}")).get("hits", [])
    for h in hits:
        k = f"pixabay-{h['id']}"
        if k in used:
            continue
        vids = [v for v in h.get("videos", {}).values() if v.get("url") and v.get("width")]
        vids = [v for v in vids if (v["height"] >= v["width"]) == portrait and min(v["width"], v["height"]) >= 720]
        if not vids:
            continue
        v = min(vids, key=lambda v: v["width"] * v["height"])
        p = _download(v["url"], _cache() / f"{k}.mp4")
        if p:
            return Clip(p, "video", None, k)  # Pixabay licence: no credit required
    return None


def pexels(term, cfg, portrait, used):
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        return None
    q = _qs({"query": term, "per_page": 10, "orientation": "portrait" if portrait else "landscape"})
    vids = json.loads(_get(f"https://api.pexels.com/videos/search?{q}", headers={"Authorization": key})).get("videos", [])
    for v in vids:
        k = f"pexels-{v['id']}"
        if k in used:
            continue
        files = [f for f in v["video_files"] if f.get("width") and f.get("height")
                 and (f["height"] >= f["width"]) == portrait and min(f["width"], f["height"]) >= 720]
        if not files:
            continue
        f = min(files, key=lambda f: f["width"] * f["height"])
        p = _download(f["link"], _cache() / f"{k}.mp4")
        if p:
            return Clip(p, "video", None, k)
    return None


def nasa(term, cfg, portrait, used):
    for media in ("video", "image"):
        q = _qs({"q": term, "media_type": media, "page_size": 12})
        items = json.loads(_get(f"https://images-api.nasa.gov/search?{q}")).get("collection", {}).get("items", [])
        for it in items:
            nid = it["data"][0].get("nasa_id", "")
            k = f"nasa-{nid}"
            if not nid or k in used:
                continue
            assets = json.loads(_get(it["href"]))
            if media == "video":
                pick = [a for a in assets if a.endswith(("~large.mp4", "~medium.mp4"))] or \
                       [a for a in assets if a.endswith(".mp4") and "~orig" not in a]
            else:
                pick = [a for a in assets if a.endswith(("~large.jpg", "~orig.jpg"))]
            if not pick:
                continue
            url = pick[0].replace("http://", "https://")
            p = _download(url, _cache() / (re.sub(r"[^A-Za-z0-9_.-]", "_", k) + (".mp4" if media == "video" else ".jpg")))
            if p:
                return Clip(p, media, f"{it['data'][0].get('title', 'NASA')} (NASA)", k)
    return None


def archive(term, cfg, portrait, used):
    words = " AND ".join(re.findall(r"[a-z0-9]+", term.lower())[:3]) or "film"
    q = _qs({"q": f"collection:prelinger AND ({words}) AND licenseurl:*publicdomain*",
                                "fl[]": ["identifier", "title"], "rows": 10, "output": "json"}, doseq=True)
    docs = json.loads(_get(f"https://archive.org/advancedsearch.php?{q}")).get("response", {}).get("docs", [])
    random.Random(term).shuffle(docs)
    for d in docs:
        k = f"archive-{d['identifier']}"
        if k in used:
            continue
        meta = json.loads(_get(f"https://archive.org/metadata/{d['identifier']}"))
        mp4s = [f for f in meta.get("files", []) if f.get("name", "").endswith(".mp4")]
        if not mp4s:
            continue
        f = min(mp4s, key=lambda f: int(f.get("size", 1e12)))  # smallest rendition: quick to fetch
        url = f"https://archive.org/download/{d['identifier']}/{urllib.parse.quote(f['name'])}"
        p = _download(url, _cache() / f"{k}.mp4")
        if p:
            return Clip(p, "video", f"{d.get('title', d['identifier'])} (Prelinger Archives, public domain)", k)
    return None


def openverse(term, cfg, portrait, used):
    # Its licence filters error out or crawl; search unfiltered and check
    # every result's licence here (OK_LICENCES) instead.
    q = _qs({"q": term, "page_size": 20})
    res = json.loads(_get(f"https://api.openverse.org/v1/images/?{q}", timeout=45, tries=2)).get("results", [])
    # the API's own size/aspect filters time out; filter here instead
    res = [r for r in res if max(r.get("width") or 0, r.get("height") or 0) >= 1000
           and ((r.get("height") or 0) > (r.get("width") or 1)) == portrait]
    for r in res:
        k = f"openverse-{r['id']}"
        if k in used or r.get("license") not in OK_LICENCES:
            continue
        ext = ".png" if r.get("url", "").lower().endswith(".png") else ".jpg"
        p = _download(r["url"], _cache() / f"{k}{ext}")
        if p:
            credit = None
            if r["license"] == "by":
                credit = (f"\"{r.get('title') or 'Photo'}\" by {r.get('creator') or 'unknown'}, "
                          f"CC BY {r.get('license_version', '')} ({r.get('foreign_landing_url', '')})")
            return Clip(p, "image", credit, k)
    return None


def wikimedia(term, cfg, portrait, used):
    q = _qs({"action": "query", "generator": "search", "gsrsearch": f"{term} filetype:video",
                                "gsrnamespace": 6, "gsrlimit": 10, "prop": "imageinfo",
                                "iiprop": "url|extmetadata|size", "format": "json"})
    pages = json.loads(_get(f"https://commons.wikimedia.org/w/api.php?{q}")).get("query", {}).get("pages", {})
    for pg in pages.values():
        ii = (pg.get("imageinfo") or [{}])[0]
        lic = (ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value") or "").lower()
        k = f"wikimedia-{pg.get('pageid')}"
        if k in used or "sa" in lic.split() or "-sa" in lic or not any(t in lic for t in ("public domain", "cc0", "cc by")):
            continue
        p = _download(ii["url"], _cache() / f"{k}{Path(ii['url']).suffix}")
        if p:
            artist = re.sub(r"<[^>]+>", "", ii.get("extmetadata", {}).get("Artist", {}).get("value") or "unknown")
            credit = None if ("public domain" in lic or "cc0" in lic) else f"{pg['title']} by {artist}, {lic.upper()}"
            return Clip(p, "video", credit, k)
    return None


SOURCES = {"library": library, "pixabay": pixabay, "pexels": pexels, "nasa": nasa,
           "archive": archive, "openverse": openverse, "wikimedia": wikimedia}


def find(term: str, cfg: dict, portrait: bool, used: set[str]) -> Clip | None:
    vis = cfg["visuals"]
    if vis.get("broll") == "none":
        return None
    for name in vis.get("sources", ["pixabay", "pexels", "nasa", "openverse", "archive"]):
        fn = SOURCES.get(name)
        if not fn:
            continue
        try:
            clip = fn(term, cfg, portrait, used)
        except Exception as e:  # any source failing just means: try the next one
            print(f"    {name} '{term}': {type(e).__name__} {str(e)[:80]}")
            clip = None
        if clip:
            used.add(clip.key)
            return clip
    return None
