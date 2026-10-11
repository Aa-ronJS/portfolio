"""Offline tests: the calendar, caption chunking, sentence timing, the
metadata, the resumable upload against a local fake of YouTube's
protocol, and the whole pipeline end to end with every service faked.

    cd essay-channel && python3 -m unittest -v
"""

import datetime as dt
import http.server
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

from channel import assemble, config, episodes, voice, writing, youtube  # noqa: E402
from channel.episodes import Episode  # noqa: E402


def utc(*a):
    return dt.datetime(*a, tzinfo=dt.timezone.utc)


class Calendar(unittest.TestCase):
    pub = {"timezone": "Australia/Brisbane",
           "slots": {"days": ["tue", "thu", "sat"], "_hm": (17, 0)}}

    def test_first_slot_after_now(self):
        now = utc(2026, 10, 11, 1, 0)                 # Sun 11am Brisbane
        s = youtube.next_slot(self.pub, None, now)
        self.assertEqual(s, utc(2026, 10, 13, 7, 0))  # Tue 17:00 AEST

    def test_slots_chain(self):
        now = utc(2026, 10, 11, 1, 0)
        a = youtube.next_slot(self.pub, None, now)
        b = youtube.next_slot(self.pub, a, now)
        c = youtube.next_slot(self.pub, b, now)
        self.assertEqual([a, b, c], [utc(2026, 10, 13, 7), utc(2026, 10, 15, 7),
                                     utc(2026, 10, 17, 7)])

    def test_lead_time(self):
        now = utc(2026, 10, 13, 6, 50)                # 10 min before Tue slot
        s = youtube.next_slot(self.pub, None, now)
        self.assertEqual(s, utc(2026, 10, 15, 7))     # too close: Thursday

    def test_last_scheduled(self):
        led = {"videos": {"a": {"publish_at": "2026-10-13T07:00:00Z"},
                          "b": {"publish_at": "2026-10-15T07:00:00Z"}}}
        self.assertEqual(youtube.last_scheduled(led), utc(2026, 10, 15, 7))
        self.assertIsNone(youtube.last_scheduled({"videos": {}}))


class Text(unittest.TestCase):
    def test_split_sentences(self):
        s = writing.split_sentences("It is twenty feet long. It is eight feet "
                                    "wide! Really? Yes. OK.")
        self.assertEqual(s, ["It is twenty feet long.",
                             "It is eight feet wide! Really? Yes. OK."])

    def test_chunks_balanced(self):
        t = ("Look at the back of almost any shop and you will find the same "
             "steel box.")
        out = assemble._chunks({"text": t, "start": 0.0, "end": 4.0})
        self.assertEqual(len(out), 2)
        self.assertTrue(all(len(c[2]) > 20 for c in out))
        self.assertEqual(" ".join(c[2] for c in out), t)
        self.assertAlmostEqual(out[-1][1], 4.0)

    def test_sentence_times_from_chars(self):
        sents = ["Hello there.", "Second one here."]
        text = " ".join(sents)
        chars = [(c, i * 0.1) for i, c in enumerate(text)]
        out = voice.sentence_times_from_chars(sents, chars, len(text) * 0.1)
        self.assertAlmostEqual(out[0][0], 0.0)
        self.assertAlmostEqual(out[1][0], 1.3)
        self.assertAlmostEqual(out[0][1], out[1][0])
        self.assertAlmostEqual(out[1][1], len(text) * 0.1)

    def test_sentence_times_fallback(self):
        out = voice.sentence_times_from_chars(["ab", "abcdef"], [], 4.0)
        self.assertEqual(out, [[0.0, 1.0], [1.0, 4.0]])

    def test_tidy_script_rejects_one_section(self):
        with self.assertRaises(RuntimeError):
            writing.tidy_script({"title": "x", "thumbnail_text": "y",
                                 "sections": [{"heading": "h", "narration": "a b.",
                                               "broll": []}], "tags": []})


class Metadata(unittest.TestCase):
    def test_build(self):
        cfg = config.load(os.path.join(ROOT, "channel.yaml"))
        tmp = tempfile.mkdtemp()
        ep = Episode(tmp, "the-box")
        script = {"title": "The <Box>", "summary": " Why boxes. ",
                  "tags": ["a", "b"], "sources": [{"title": "ISO", "url": "https://x"}]}
        tl = {"sections": [{"index": 0, "heading": "Hook", "start": 0},
                           {"index": 1, "heading": "Part two", "start": 65.4}]}
        m = youtube.build_metadata(cfg, ep, script, tl,
                                   {"credit": "Music: X by Y"}, {"provider": "pexels"})
        self.assertEqual(m["title"], "The Box")
        self.assertIn("00:00 Hook", m["description"])
        self.assertIn("01:05 Part two", m["description"])
        self.assertIn("ISO — https://x", m["description"])
        self.assertIn("Music: X by Y", m["description"])
        self.assertIn("Pexels", m["description"])
        self.assertEqual(m["tags"][0], youtube.marker_tag("the-box"))
        self.assertIn("a", m["tags"])
        shutil.rmtree(tmp)


class _FakeUpload(http.server.BaseHTTPRequestHandler):
    """YouTube's resumable protocol: an init POST, then PUTs with
    Content-Range; the first data chunk is dropped once (503) to force a
    resume, and the status query answers 308 with the bytes received."""
    received = bytearray()
    failed_once = False
    log = []

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        _FakeUpload.log.append(("POST", self.path))
        self.send_response(200)
        self.send_header("Location", "http://127.0.0.1:%d/session" % self.server.server_address[1])
        self.end_headers()

    def do_PUT(self):
        length = int(self.headers.get("Content-Length", 0))
        rng = self.headers.get("Content-Range", "")
        body = self.rfile.read(length)
        total = int(rng.split("/")[-1])
        if rng.startswith("bytes */"):                   # status query
            self.send_response(308)
            if self.received:
                self.send_header("Range", "bytes=0-%d" % (len(self.received) - 1))
            self.end_headers()
            return
        start = int(rng.split()[1].split("-")[0])
        if not _FakeUpload.failed_once:
            _FakeUpload.failed_once = True
            self.send_response(503)
            self.end_headers()
            return
        self.assertEqual = None
        if start != len(self.received):
            self.send_response(400)
            self.end_headers()
            return
        _FakeUpload.received += body
        if len(self.received) >= total:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"id": "vid123"}).encode())
        else:
            self.send_response(308)
            self.send_header("Range", "bytes=0-%d" % (len(self.received) - 1))
            self.end_headers()

    def log_message(self, *a):
        pass


class _Creds:
    def access_token(self):
        return "tok"


class ResumableUpload(unittest.TestCase):
    def test_upload_resumes_after_failure(self):
        srv = http.server.HTTPServer(("127.0.0.1", 0), _FakeUpload)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        base = "http://127.0.0.1:%d" % srv.server_address[1]
        yt = youtube.YouTube(_Creds(), api=base + "/v3", upload=base + "/upload")
        youtube.CHUNK = 256 * 1024
        import time
        time.sleep = lambda s: None                      # no real back-off
        data = os.urandom(600 * 1024)
        tmp = tempfile.mkdtemp()
        mp4 = os.path.join(tmp, "v.mp4")
        with open(mp4, "wb") as f:
            f.write(data)
        meta = {"title": "t", "description": "d", "tags": [], "category": "27",
                "language": "en"}
        vid = yt.insert_video(mp4, meta, utc(2026, 1, 1), log=lambda *a: None)
        srv.shutdown()
        self.assertEqual(vid, "vid123")
        self.assertEqual(bytes(_FakeUpload.received), data)
        self.assertTrue(_FakeUpload.failed_once)
        shutil.rmtree(tmp)


class EndToEnd(unittest.TestCase):
    """The whole channel with every outside service faked: a real cut
    comes out, the captions line up with the narration, the ledger
    records the upload, and a second run does nothing twice."""

    def test_fake_run(self):
        tmp = tempfile.mkdtemp()
        env = dict(os.environ, CHANNEL_FAKE="1",
                   CHANNEL_EPISODES=os.path.join(tmp, "episodes"),
                   CHANNEL_LEDGER=os.path.join(tmp, "ledger.json"))
        cmd = [sys.executable, os.path.join(ROOT, "channel.py"), "run"]
        out = subprocess.run(cmd, env=env, capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        eps = episodes.list_episodes(env["CHANNEL_EPISODES"])
        self.assertEqual(len(eps), 1)
        ep = eps[0]
        for stage in episodes.STAGES:
            self.assertTrue(ep.done(stage), stage)
        info = json.loads(subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries",
             "stream=codec_type,width,height:format=duration", "-of", "json",
             ep.output("assemble")], capture_output=True, text=True).stdout)
        kinds = {s["codec_type"] for s in info["streams"]}
        self.assertEqual(kinds, {"video", "audio"})
        v = next(s for s in info["streams"] if s["codec_type"] == "video")
        self.assertEqual((v["width"], v["height"]), (1920, 1080))
        tl = ep.load("voice")
        self.assertAlmostEqual(float(info["format"]["duration"]), tl["duration"], delta=0.5)
        with open(ep.path("captions.ass")) as f:
            ass = f.read()
        self.assertIn("Every sack and barrel", ass)
        self.assertIn("The Trucker's Problem", ass)
        self.assertTrue(os.path.exists(ep.path("thumbnail.jpg")))
        led = episodes.load_ledger(env["CHANNEL_LEDGER"])
        self.assertIn(ep.slug, led["videos"])
        self.assertTrue(led["videos"][ep.slug]["publish_at"].endswith("Z"))
        # the record lives in the episode too, with the YouTube metadata
        pub = ep.load("publish")
        self.assertIn("00:00", pub["metadata"]["description"])

        # second run: the finished episode is left alone, the same topic
        # is refused (the fake always proposes the same title)
        out = subprocess.run(cmd, env=env, capture_output=True, text=True)
        self.assertNotEqual(out.returncode, 0)
        self.assertIn("already exists", out.stdout + out.stderr)
        shutil.rmtree(tmp)


if __name__ == "__main__":
    unittest.main()
