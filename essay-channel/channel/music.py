"""A bed of music under the narration. Tracks come from the music/
folder (anything you have the right to use — the YouTube Audio Library
is the easy source) or, when enabled, from Jamendo's Creative Commons
catalogue, with the attribution carried into the video description.
"""

import hashlib
import os
import urllib.parse

from . import media

AUDIO_EXT = (".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac")
MOOD_TAGS = {"calm": "ambient+calm", "curious": "electronic+inspiring",
             "tense": "cinematic+dark", "upbeat": "pop+happy",
             "melancholy": "piano+sad"}


def local_tracks(folder):
    if not os.path.isdir(folder):
        return []
    return sorted(os.path.join(folder, f) for f in os.listdir(folder)
                  if f.lower().endswith(AUDIO_EXT))


def pick_music(cfg, ep, jamendo=None):
    script = ep.load("script")
    mdir = ep.path("music")
    os.makedirs(mdir, exist_ok=True)
    mood = script.get("mood", "calm")
    tracks = local_tracks(cfg["music"]["folder"])
    # prefer a local track tagged with the mood in its filename
    tagged = [t for t in tracks if mood in os.path.basename(t).lower()]
    choice = None
    if tagged or tracks:
        pool = tagged or tracks
        i = int(hashlib.sha1(ep.slug.encode()).hexdigest(), 16) % len(pool)
        choice = {"file": os.path.relpath(pool[i], cfg["_root"]),
                  "source": "local", "credit": ""}
    elif cfg["music"]["jamendo"] or jamendo is not None:
        src = jamendo or Jamendo()
        choice = src.find(mood, ep.slug)
    if choice is None:
        choice = {"file": None, "source": "none", "credit": ""}
        print("music: no tracks in %s and jamendo is off — the video will "
              "have narration only" % cfg["music"]["folder"])
    choice["mood"] = mood
    ep.save("music", choice)
    return choice


class Jamendo:
    def __init__(self):
        self.client_id = os.environ.get("JAMENDO_CLIENT_ID")
        if not self.client_id:
            raise SystemExit("music.jamendo is on: set JAMENDO_CLIENT_ID "
                             "(free at devportal.jamendo.com)")

    def find(self, mood, seed):
        q = urllib.parse.urlencode({
            "client_id": self.client_id, "format": "json", "limit": 25,
            "fuzzytags": MOOD_TAGS.get(mood, "ambient"),
            "vocalinstrumental": "instrumental", "include": "licenses",
            "audioformat": "mp32", "order": "popularity_month"})
        d = media.get_json("https://api.jamendo.com/v3.0/tracks/?" + q)
        hits = [t for t in d.get("results", []) if t.get("audio")]
        if not hits:
            return None
        t = hits[int(hashlib.sha1(seed.encode()).hexdigest(), 16) % len(hits)]
        path = os.path.join(media.CACHE, "music", "jamendo-%s.mp3" % t["id"])
        media.download(t["audio"], path)
        lic = t.get("license_ccurl") or ""
        return {"file": os.path.relpath(path, os.path.dirname(os.path.dirname(
                    os.path.abspath(__file__)))),
                "source": "jamendo",
                "credit": "Music: \"%s\" by %s (%s) via Jamendo" % (
                    t.get("name", ""), t.get("artist_name", ""),
                    lic or "CC")}
