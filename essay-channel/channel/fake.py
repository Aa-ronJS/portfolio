"""Offline stand-ins for every outside service, so the whole pipeline
runs end to end on a laptop or in CI with no keys: a canned topic and
script, a beep-track voice, test-pattern footage, a synthesised music
bed and a YouTube that only pretends. CHANNEL_FAKE=1 switches them in.
"""

import json
import os
import random

from . import media

SCRIPT = {
    "title": "Why Shipping Containers Are All the Same Size",
    "thumbnail_text": "One Box Rules",
    "summary": "Almost everything you own has crossed an ocean in a steel box "
               "of exactly the same dimensions. This is the story of how one "
               "trucker's idea became the world's measuring stick.",
    "mood": "curious",
    "sections": [
        {"heading": "One Box Rules", "broll": ["cargo ship at port", "shipping containers stacked"],
         "narration": "Look at the back of almost any shop and you will find the "
                      "same steel box. It is twenty feet long, or forty. It is "
                      "eight feet wide. It has been the same since nineteen "
                      "sixty eight."},
        {"heading": "The Trucker's Problem", "broll": ["truck on highway", "dock workers"],
         "narration": "Before the box, loading a ship took a week. Every sack "
                      "and barrel was lifted by hand. A trucker named Malcolm "
                      "McLean thought the truck body itself should go on the "
                      "ship, and in nineteen fifty six it did."},
        {"heading": "Agreeing on a Number", "broll": ["crane lifting container", "measuring tape"],
         "narration": "A box only works if every crane, truck and ship agrees "
                      "on its size. That argument took a decade. The result "
                      "was a standard so plain that nobody thinks about it. "
                      "Which is exactly the point."},
    ],
    "tags": ["shipping containers", "logistics", "how it works"],
    "sources": [{"title": "ISO 668 — Series 1 freight containers",
                 "url": "https://www.iso.org/standard/76912.html"}],
}


class FakeClaude:
    def __init__(self, *a, **k):
        self.calls = []

    def research(self, system, prompt, **k):
        self.calls.append("research")
        notes = ("Summary: the container standard story. " * 40 +
                 "\nFact: ISO 668 fixes the sizes [https://www.iso.org/standard/76912.html]. ")
        return notes, [{"url": "https://www.iso.org/standard/76912.html",
                        "title": "ISO 668"}]

    def json(self, system, prompt, schema, **k):
        self.calls.append("json")
        if "search_terms" in json.dumps(schema):
            return {"title": SCRIPT["title"], "angle": "How one box standardised trade.",
                    "why": "Everyone has seen one.", "search_terms": ["ISO 668", "McLean"]}
        return json.loads(json.dumps(SCRIPT))


class FakeVoice:
    """Each sentence becomes a tone whose length tracks the text, so the
    captions and cuts line up the way they will with a real voice."""
    has_timestamps = False

    def __init__(self, *a, **k):
        pass

    def synth(self, text, out_mp3):
        dur = max(0.6, 0.045 * len(text))
        freq = 180 + (hash(text) % 120)
        media.ffmpeg(["-f", "lavfi", "-i",
                      "sine=frequency=%d:duration=%.3f" % (freq, dur),
                      "-af", "volume=0.3", "-c:a", "libmp3lame", "-q:a", "6", out_mp3])
        return None


class FakeStock:
    name = "fake"

    def __init__(self, *a, **k):
        self.portrait = False

    def search(self, query, n=4):
        rng = random.Random(query)
        out = []
        for i in range(2):
            cid = "fake-%s-%d" % (abs(hash(query)) % 10000, i)
            out.append({"id": cid, "url": "fake://%s" % cid,
                        "duration": rng.uniform(6, 14),
                        "width": 1280, "height": 720,
                        "credit": "test pattern", "page": ""})
        return out


def fake_download(url, path, headers=None, timeout=0):
    """Replaces media.download: a 'fake://' url becomes a test-pattern clip."""
    if os.path.exists(path):
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    seed = abs(hash(url)) % 1000
    media.ffmpeg(["-f", "lavfi", "-i",
                  "testsrc2=size=1280x720:rate=30:duration=10",
                  "-vf", "hue=h=%d" % (seed % 360),
                  "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", path])
    return path


def fake_music_folder(folder):
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, "curious-pad.mp3")
    if not os.path.exists(path):
        media.ffmpeg(["-f", "lavfi", "-i", "sine=frequency=110:duration=30",
                      "-af", "tremolo=f=0.5:d=0.6,volume=0.4",
                      "-c:a", "libmp3lame", "-q:a", "6", path])
    return folder


class FakeYouTube:
    def __init__(self, *a, **k):
        self.uploads = []

    def uploaded_markers(self):
        return {}

    def insert_video(self, mp4, meta, publish_at, log=print):
        vid = "fake%04d" % (len(self.uploads) + 1)
        self.uploads.append({"mp4": mp4, "meta": meta, "publish_at": publish_at})
        log("fake upload of %s as %r" % (mp4, meta["title"]))
        return vid

    def set_thumbnail(self, video_id, jpg):
        pass

    def video_status(self, ids):
        return {i: {"privacy": "private", "publish_at": None, "title": ""} for i in ids}
