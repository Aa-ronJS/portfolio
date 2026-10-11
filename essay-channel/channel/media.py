"""Small ffmpeg/ffprobe helpers shared by the media stages."""

import json
import os
import subprocess
import urllib.request

CACHE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                     "cache")


def run(cmd, **kw):
    kw.setdefault("check", True)
    kw.setdefault("capture_output", True)
    try:
        return subprocess.run(cmd, **kw)
    except subprocess.CalledProcessError as e:
        err = (e.stderr or b"").decode(errors="replace")[-2000:]
        raise RuntimeError("%s failed:\n%s" % (cmd[0], err)) from None


def ffmpeg(args):
    return run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"] + args)


def probe(path):
    out = run(["ffprobe", "-v", "error", "-show_entries",
               "stream=codec_type,width,height,duration:format=duration",
               "-of", "json", path]).stdout
    info = json.loads(out)
    d = {"duration": float(info["format"].get("duration") or 0.0),
         "width": 0, "height": 0, "has_audio": False, "has_video": False}
    for st in info.get("streams", []):
        if st.get("codec_type") == "video" and not d["has_video"]:
            d.update(width=int(st.get("width") or 0),
                     height=int(st.get("height") or 0), has_video=True)
        if st.get("codec_type") == "audio":
            d["has_audio"] = True
    return d


def duration(path):
    return probe(path)["duration"]


def download(url, path, headers=None, timeout=120):
    """Fetch to path atomically; an existing file is reused."""
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers=headers or {})
    tmp = path + ".part"
    with urllib.request.urlopen(req, timeout=timeout) as r, open(tmp, "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    os.replace(tmp, path)
    return path


def get_json(url, headers=None, timeout=60):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def post_json(url, body, headers=None, timeout=300):
    data = json.dumps(body).encode()
    h = {"Content-Type": "application/json"}
    h.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r
