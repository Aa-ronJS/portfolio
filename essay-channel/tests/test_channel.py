"""Offline tests: the calendar, caption chunking, sentence timing, shot
planning, the pronunciation check, the writing passes, the quality
gate, the metadata, the resumable upload against a local fake of
YouTube's protocol, and the whole pipeline end to end with every
service faked.

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

from channel import (assemble, broll, config, episodes, fake, quality,  # noqa: E402
                     voice, writing, youtube)
from channel.episodes import Episode  # noqa: E402


def utc(*a):
    return dt.datetime(*a, tzinfo=dt.timezone.utc)


def load_cfg(tmp):
    cfg = config.load(os.path.join(ROOT, "channel.yaml"))
    cfg["_episodes"] = os.path.join(tmp, "episodes")
    cfg["_ledger"] = os.path.join(tmp, "ledger.json")
    return cfg


class Calendar(unittest.TestCase):
    pub = {"timezone": "Australia/Brisbane",
           "slots": {"days": ["tue", "thu", "sat"], "_hm": (17, 0)}}

    def test_first_slot_after_now(self):
        now = utc(2026, 10, 11, 1, 0)                 # Sun 11am Brisbane
        self.assertEqual(youtube.next_slot(self.pub, None, now), utc(2026, 10, 13, 7, 0))

    def test_slots_chain(self):
        now = utc(2026, 10, 11, 1, 0)
        a = youtube.next_slot(self.pub, None, now)
        b = youtube.next_slot(self.pub, a, now)
        c = youtube.next_slot(self.pub, b, now)
        self.assertEqual([a, b, c], [utc(2026, 10, 13, 7), utc(2026, 10, 15, 7),
                                     utc(2026, 10, 17, 7)])

    def test_lead_time(self):
        now = utc(2026, 10, 13, 6, 50)                # 10 min before Tue slot
        self.assertEqual(youtube.next_slot(self.pub, None, now), utc(2026, 10, 15, 7))

    def test_last_scheduled(self):
        led = {"videos": {"a": {"publish_at": "2026-10-13T07:00:00Z"},
                          "b": {"publish_at": "2026-10-15T07:00:00Z"}}}
        self.assertEqual(youtube.last_scheduled(led), utc(2026, 10, 15, 7))
        self.assertIsNone(youtube.last_scheduled({"videos": {}}))


class Text(unittest.TestCase):
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

    def test_sentence_times_fallback(self):
        out = voice.sentence_times_from_chars(["ab", "abcdef"], [], 4.0)
        self.assertEqual(out, [[0.0, 1.0], [1.0, 4.0]])

    def test_suspect_words(self):
        script = "A trucker named Malcolm McLean changed the Worcestershire docks."
        heard = "a trucker named malcolm mcclean changed the wooster docks"
        self.assertEqual(voice.suspect_words(script, heard), ["mclean", "worcestershire"])
        self.assertEqual(voice.suspect_words(script, script.lower()), [])

    def test_apply_respellings(self):
        out = voice.apply_respellings("Malcolm McLean and McLean again.",
                                      {"mclean": "Mac-Lean"})
        self.assertEqual(out, "Malcolm Mac-Lean and Mac-Lean again.")

    def test_srt(self):
        tmp = tempfile.mkdtemp()
        tl = {"sections": [{"sentences": [
            {"text": "One.", "start": 1.0, "end": 2.5},
            {"text": "Two.", "start": 2.5, "end": 61.25}]}]}
        voice.write_srt(tl, os.path.join(tmp, "c.srt"))
        with open(os.path.join(tmp, "c.srt")) as f:
            srt = f.read()
        self.assertIn("00:00:01,000 --> 00:00:02,500\nOne.", srt)
        self.assertIn("00:00:02,500 --> 00:01:01,250\nTwo.", srt)
        shutil.rmtree(tmp)


class Shots(unittest.TestCase):
    def _tl(self):
        s = []
        t = 1.8
        spec = [("a", 3), ("a", 3), ("a", 3), ("b", 1), ("c", 4), ("c", 4), ("c", 4)]
        for q, d in spec:
            s.append({"text": "x", "visual": q, "alt_visual": q + "-alt",
                      "callout": "", "start": t, "end": t + d})
            t += d
        return {"duration": t + 4.0, "lead": 1.8, "speech_end": t,
                "sections": [{"index": 0, "heading": "h", "start": 1.8, "end": t,
                              "sentences": s}]}

    def test_plan_shots(self):
        shots = broll.plan_shots(self._tl(), 2.5, 8.0)
        # a×3 = 9s splits into two shots (max 8) alternating visuals; the
        # 1s "b" joins the shot before it; c×3 = 12s splits in two
        self.assertEqual([s["query"] for s in shots], ["a", "a-alt", "c", "c-alt"])
        self.assertEqual(shots[0]["start"], 0.0)              # under the title
        self.assertAlmostEqual(shots[-1]["end"], self._tl()["duration"])
        for a, b in zip(shots, shots[1:]):
            self.assertAlmostEqual(a["end"], b["start"])       # no gaps
        self.assertTrue(all(s["end"] - s["start"] <= 8.0 + 1.0 for s in shots[1:-1]))


class Writing(unittest.TestCase):
    def test_passes_run_and_package_wins(self):
        tmp = tempfile.mkdtemp()
        cfg = load_cfg(tmp)
        llm = fake.FakeClaude()
        ep = writing.pick_topic(cfg, llm)
        writing.research(cfg, llm, ep)
        o = writing.outline(cfg, llm, ep)
        self.assertTrue(o.get("gaps_researched"))             # the gap went back out
        self.assertEqual(ep.load("research")["rounds"], 2)
        s = writing.write_script(cfg, llm, ep)
        self.assertEqual(s["title"], fake.PACKAGE["titles"][0])
        self.assertEqual(s["alternate_titles"], fake.PACKAGE["titles"][1:])
        self.assertEqual(s["thumbnail_text"], fake.PACKAGE["thumbnail_texts"][0])
        self.assertIn("critique", llm.calls)
        self.assertIn("revise", llm.calls)                    # council scored under 4.7
        self.assertIn("package", llm.calls)
        self.assertIn("council-package", llm.calls)
        self.assertTrue(os.path.exists(ep.path("draft.json")))
        self.assertTrue(os.path.exists(ep.path("critique.json")))
        self.assertEqual(s["scores"]["evidence"], 5)
        self.assertEqual(s["council"]["package"]["chosen"], 0)
        self.assertEqual(len(s["council"]["script_rounds"]), 2)
        shutil.rmtree(tmp)

    def test_subject_is_chosen_by_council(self):
        tmp = tempfile.mkdtemp()
        cfg = load_cfg(tmp)
        llm = fake.FakeClaude()
        ep = writing.pick_topic(cfg, llm)
        t = ep.load("topic")
        self.assertEqual(t["chosen_by"], "council")
        self.assertEqual(t["title"], fake.SCRIPT["title"])        # the council's pick, not the slate's first
        self.assertEqual(t["council"]["chosen"], 1)
        self.assertEqual(len(t["also_considered"]), 2)
        self.assertEqual(llm.calls, ["slate", "council-subjects"])
        shutil.rmtree(tmp)

    def test_unsupported_sentences_are_cut(self):
        s = writing.tidy_script(json.loads(json.dumps(fake.SCRIPT)))
        victim = s["sections"][1]["sentences"][0]["text"]
        out = writing.drop_unsupported(s, [victim.upper()])
        texts = [x["text"] for sec in out["sections"] for x in sec["sentences"]]
        self.assertNotIn(victim, texts)
        self.assertEqual(out["words"], sum(len(sec["narration"].split())
                                           for sec in out["sections"]))


class Quality(unittest.TestCase):
    def test_hold_when_reviewer_says_so(self):
        tmp = tempfile.mkdtemp()
        cfg = load_cfg(tmp)
        ep = Episode(cfg["_episodes"], "held")
        ep.save("script", {"scores": {"hook": 2, "support": 5}})
        ep.save("broll", {"shots": []})
        with open(ep.output("assemble"), "wb") as f:
            f.write(b"")
        q = quality.review(cfg, ep, None)                      # no reviewer at all
        self.assertFalse(q["reviewed"])
        self.assertEqual(q["script_avg"], 3.5)
        self.assertFalse(q["hold"])                            # 3.5 is the floor, not under
        cfg["quality"]["min_score"] = 4.0
        q = quality.review(cfg, ep, None)
        self.assertTrue(q["hold"])
        self.assertEqual(q["below_floor"], ["script_avg"])
        shutil.rmtree(tmp)


class Metadata(unittest.TestCase):
    def test_build(self):
        tmp = tempfile.mkdtemp()
        cfg = load_cfg(tmp)
        ep = Episode(tmp, "the-box")
        script = {"title": "The <Box>", "summary": " Why boxes. ",
                  "tags": ["a", "b"], "sources": [{"title": "ISO", "url": "https://x"}]}
        tl = {"sections": [{"index": 0, "heading": "Hook", "start": 1.8},
                           {"index": 1, "heading": "Part two", "start": 65.4}]}
        plan = {"provider": "pexels", "credits": {"p1": {"credit": "Ann via Pexels"}}}
        m = youtube.build_metadata(cfg, ep, script, tl, {"credit": "Music: X by Y"}, plan)
        self.assertEqual(m["title"], "The Box")
        self.assertIn("00:00 Hook", m["description"])
        self.assertIn("01:05 Part two", m["description"])
        self.assertIn("ISO — https://x", m["description"])
        self.assertIn("Music: X by Y", m["description"])
        self.assertIn("Ann via Pexels", m["description"])
        self.assertEqual(m["tags"][0], youtube.marker_tag("the-box"))
        shutil.rmtree(tmp)


class _FakeUpload(http.server.BaseHTTPRequestHandler):
    """YouTube's resumable protocol: an init POST, then PUTs with
    Content-Range; the first data chunk is dropped once (503) to force a
    resume, and the status query answers 308 with the bytes received."""
    received = bytearray()
    failed_once = False

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
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
    comes out the length of the narration, the text layer and the
    caption track exist, the review passed, the ledger records the
    upload, and a second run does nothing twice."""

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
             "stream=codec_type,width,height,channels:format=duration", "-of", "json",
             ep.output("assemble")], capture_output=True, text=True).stdout)
        v = next(s for s in info["streams"] if s["codec_type"] == "video")
        a = next(s for s in info["streams"] if s["codec_type"] == "audio")
        self.assertEqual((v["width"], v["height"]), (1920, 1080))
        self.assertEqual(a["channels"], 2)
        tl = ep.load("voice")
        self.assertAlmostEqual(float(info["format"]["duration"]), tl["duration"], delta=0.2)
        with open(ep.path("captions.ass")) as f:
            ass = f.read()
        self.assertIn("The Trucker's Problem", ass)            # lower third
        self.assertIn("20 or 40 feet", ass)                    # callout
        self.assertIn("Sources in the description", ass)       # end card
        self.assertNotIn("Every sack and barrel", ass)         # landscape: captions uploaded, not burned
        with open(ep.path("captions.srt")) as f:
            self.assertIn("Every sack and barrel", f.read())
        plan = ep.load("broll")
        self.assertTrue(plan["vision"])
        self.assertTrue(all(s["kind"] != "card" for s in plan["shots"]))
        q = ep.load("quality")
        self.assertEqual(q["verdict"], "publish")
        self.assertFalse(q["hold"])
        self.assertTrue(os.path.exists(ep.path("thumbnail.jpg")))
        led = episodes.load_ledger(env["CHANNEL_LEDGER"])
        self.assertIn(ep.slug, led["videos"])
        pub = ep.load("publish")
        self.assertIn("00:00", pub["metadata"]["description"])

        # second run: the finished episode is left alone; the slate still
        # holds the made subject, which is filtered out before the council
        # sits, so a different subject is chosen and made
        first = json.dumps(pub, sort_keys=True)
        out = subprocess.run(cmd, env=env, capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        eps2 = episodes.list_episodes(env["CHANNEL_EPISODES"])
        self.assertEqual(len(eps2), 2)
        self.assertEqual(json.dumps(ep.load("publish"), sort_keys=True), first)
        other = [e for e in eps2 if e.slug != ep.slug][0]
        self.assertNotEqual(other.load("topic")["title"], ep.load("topic")["title"])
        self.assertTrue(other.done("publish"))
        led = episodes.load_ledger(env["CHANNEL_LEDGER"])
        self.assertEqual(len(led["videos"]), 2)
        # the two bookings take consecutive slots
        self.assertLess(led["videos"][ep.slug]["publish_at"], led["videos"][other.slug]["publish_at"])
        shutil.rmtree(tmp)


if __name__ == "__main__":
    unittest.main()
