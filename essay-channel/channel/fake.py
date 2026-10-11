"""Offline stand-ins for every outside service, so the whole pipeline
runs end to end on a laptop or in CI with no keys: a canned outline,
script and critique, a beep-track voice, test-pattern footage and
photographs, a synthesised music bed and a YouTube that only pretends.
CHANNEL_FAKE=1 switches them in.
"""

import json
import os
import random

from . import media


def _s(text, visual, alt, callout=""):
    return {"text": text, "visual": visual, "alt_visual": alt, "callout": callout}


SCRIPT = {
    "title": "Why Every Shipping Container Is the Same Size",
    "mood": "curious",
    "sections": [
        {"heading": "One Box Rules", "sentences": [
            _s("Look at the back of almost any shop and you will find the same steel box.",
               "shipping container close up", "loading dock boxes"),
            _s("It is twenty feet long, or forty.", "shipping container close up",
               "cargo containers stacked", "20 or 40 feet"),
            _s("It is eight feet wide.", "shipping container close up", "cargo containers stacked"),
            _s("It has been the same since nineteen sixty eight.", "old cargo port photo",
               "vintage harbour", "1968")]},
        {"heading": "The Trucker's Problem", "sentences": [
            _s("Before the box, loading a ship took a week.", "dock workers loading sacks",
               "old harbour cranes"),
            _s("Every sack and barrel was lifted by hand.", "dock workers loading sacks",
               "men carrying cargo"),
            _s("A trucker named Malcolm McLean thought the truck body itself should go on the ship, and in nineteen fifty six it did.",
               "truck on highway", "cargo truck at port", "Malcolm McLean")]},
        {"heading": "Agreeing on a Number", "sentences": [
            _s("A box only works if every crane, truck and ship agrees on its size.",
               "crane lifting container", "port crane"),
            _s("That argument took a decade.", "men in meeting", "handshake close up"),
            _s("The result was a standard so plain that nobody thinks about it.",
               "cargo ship at sea", "containers on ship"),
            _s("Which is exactly the point.", "cargo ship at sea", "containers on ship")]},
    ],
    "sources": [{"title": "ISO 668 — Series 1 freight containers",
                 "url": "https://www.iso.org/standard/76912.html"}],
}

OUTLINE = {
    "through_line": "Why did the world settle on one box?",
    "hook": "The same steel box is behind every shop.",
    "payoff": "The dullest standard is the most powerful one.",
    "sections": [{"heading": s["heading"], "job": "explain", "facts": ["ISO 668"]}
                 for s in SCRIPT["sections"]],
    "gaps": ["What year was ISO 668 first published?"],
}

def _seats(v):
    return {"retention": v, "packaging": v, "audience": v, "evidence": v,
            "brand_policy": v}


CRITIQUE = {
    "scores": {"retention": 4, "packaging": 4, "audience": 5, "evidence": 5,
               "brand_policy": 4},
    "notes": "Tight. The hook could name the box's size sooner.",
    "unsupported": [],
    "top_edits": ["Name the size in sentence two."],
}

PACKAGE = {
    "titles": ["Why Every Shipping Container Is the Same Size",
               "The Box That Measures the World"],
    "thumbnail_texts": ["One Box Rules", "8 Feet Wide"],
    "thumbnail_subject": "dock worker looking at camera",
    "thumbnail_prop": "shipping container model",
    "summary": "Almost everything you own has crossed an ocean in a steel box of "
               "exactly the same dimensions. This is how one trucker's idea became "
               "the world's measuring stick.",
    "tags": ["shipping containers", "logistics", "how it works"],
}


class FakeClaude:
    """Answers every schema the channel uses with canned data; records
    which calls were made so tests can check the passes ran."""

    def __init__(self, *a, **k):
        self.calls = []
        self.usage = {"input": 0, "output": 0, "calls": 0}

    def research(self, system, prompt, **k):
        self.calls.append("research")
        notes = ("Summary: the container standard story. " * 40 +
                 "\nFact: ISO 668 fixes the sizes [https://www.iso.org/standard/76912.html]. ")
        return notes, [{"url": "https://www.iso.org/standard/76912.html",
                        "title": "ISO 668"}]

    def json(self, system, prompt, schema, **k):
        props = set(schema.get("properties", {}))
        topic = {"title": SCRIPT["title"], "angle": "How one box standardised trade.",
                 "why": "Everyone has seen one.", "search_terms": ["ISO 668", "McLean"]}
        if "candidates" in props:
            self.calls.append("slate")
            other = dict(topic, title="Why Bridges Hum in the Wind")
            return {"candidates": [other, topic, dict(topic, title="The Lost Art of the Hedge")]}
        if "search_terms" in props:
            self.calls.append("topic")
            return topic
        if "through_line" in props:
            self.calls.append("outline")
            return json.loads(json.dumps(OUTLINE))
        if "thumbnail" in props:                       # council: package pick
            self.calls.append("council-package")
            n = prompt.count("\n") and len([l for l in prompt.split("THUMBNAIL TEXTS")[0].split("TITLES")[-1].splitlines() if l[:1].isdigit()])
            return {"ranking": [{"candidate": i, "seats": _seats(4 if i else 5), "note": "ok"}
                                for i in range(max(1, n))],
                    "chosen": 0, "thumbnail": 0, "why": "specific and short", "fix": "none"}
        if "ranking" in props:                         # council: subjects
            self.calls.append("council-subjects")
            return {"ranking": [{"candidate": 1, "seats": _seats(5), "note": "a real question"},
                                {"candidate": 0, "seats": _seats(3), "note": "vague"},
                                {"candidate": 2, "seats": _seats(2), "note": "niche"}],
                    "chosen": 1, "why": "everyone has seen one", "fix": "name the size early"}
        if "scores" in props:
            self.calls.append("critique")
            return json.loads(json.dumps(CRITIQUE))
        if "thumbnail_texts" in props:
            self.calls.append("package")
            return json.loads(json.dumps(PACKAGE))
        if "respellings" in props:
            self.calls.append("respell")
            return {"respellings": []}
        if "mood" in props:
            self.calls.append("revise" if "CRITIQUE" in prompt else "draft")
            return json.loads(json.dumps(SCRIPT))
        raise AssertionError("fake has no answer for schema %s" % sorted(props))

    def vision_json(self, system, prompt, images, schema, **k):
        props = set(schema.get("properties", {}))
        if "picks" in props:
            self.calls.append("pick")
            n = len({lab.split(",")[0] for lab, _ in images})
            return {"picks": [{"shot": i, "candidate": 1, "score": 4} for i in range(n)]}
        if "frame" in props:
            self.calls.append("thumb")
            return {"frame": 2 if len(images) > 1 else 1, "why": "clearest"}
        if "verdict" in props:
            self.calls.append("review")
            return {"shots": [{"shot": i, "match": 4} for i in range(len(images))],
                    "overall": 4, "issues": [], "verdict": "publish"}
        raise AssertionError("fake has no answer for schema %s" % sorted(props))


class FakeVoice:
    """Each sentence becomes a tone whose length tracks the text, so the
    captions and cuts line up the way they will with a real voice."""
    has_timestamps = False

    def __init__(self, *a, **k):
        pass

    def synth(self, text, out_mp3, previous_text="", next_text=""):
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
        for i in range(3):
            cid = "fake-%s-%d" % (abs(hash(query)) % 10000, i)
            out.append({"id": cid, "kind": "video", "url": "fake://%s" % cid,
                        "thumb": "fake://thumb/%s" % cid,
                        "duration": rng.uniform(4, 14), "credit": "test pattern",
                        "page": ""})
        return out

    def photos(self, query, n=4):
        cid = "fake-photo-%s" % (abs(hash(query)) % 10000)
        return [{"id": cid, "kind": "photo", "url": "fake://photo/%s" % cid,
                 "thumb": "fake://thumb/%s" % cid, "duration": 0.0,
                 "credit": "test still", "page": ""}]


def fake_download(url, path, headers=None, timeout=0):
    """Replaces media.download: a 'fake://' url becomes a test-pattern clip
    or a test-pattern still."""
    if os.path.exists(path):
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    seed = abs(hash(url)) % 1000
    if "/photo/" in url:
        media.ffmpeg(["-f", "lavfi", "-i", "testsrc2=size=1600x900:rate=1:duration=1",
                      "-vf", "hue=h=%d" % (seed % 360), "-frames:v", "1", "-q:v", "3", path])
    else:
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

    def upload_captions(self, video_id, srt, language="en", name=""):
        pass

    def analytics(self, ids, start=None):
        return {i: {"views": 1200, "avg_view_pct": 48.5, "avg_view_seconds": 210.0,
                    "likes": 40} for i in ids}

    def video_status(self, ids):
        return {i: {"privacy": "private", "publish_at": None, "title": ""} for i in ids}
