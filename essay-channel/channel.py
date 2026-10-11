#!/usr/bin/env python3
"""essay-channel — a YouTube channel that runs itself.

    python3 channel.py run                 make the next episode and publish it
    python3 channel.py run --dry-run       everything but the upload
    python3 channel.py topic ["title"]     just pick (or set) the next topic
    python3 channel.py produce <slug>      research → outline → script → voice → footage → music → cut → review
    python3 channel.py publish <slug>      upload + schedule a finished episode
    python3 channel.py approve <slug>      release an episode that is held
    python3 channel.py redo <slug> <stage> forget a stage and everything after it
    python3 channel.py status              every episode and where it is up to
    python3 channel.py learn               pull YouTube analytics into the ledger
    python3 channel.py auth                sign in to YouTube once

Every stage writes one file into episodes/<slug>/ and is skipped when
that file exists, so a run that dies resumes from where it stopped.
CHANNEL_FAKE=1 swaps every outside service for an offline stand-in.
"""

import argparse
import os
import sys
import zoneinfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from channel import config, episodes, writing, voice, broll, music, assemble  # noqa: E402
from channel import quality, youtube, media  # noqa: E402
from channel.episodes import Episode, STAGES  # noqa: E402


# ---------------------------------------------------------------- providers

class Providers:
    """Built once per run; each outside service is reached through here so
    the fakes can stand in for all of them with one switch."""

    def __init__(self, cfg, fake=False):
        self.cfg = cfg
        self.fake = fake
        self._cache = {}

    def _get(self, name, real, fake):
        if name not in self._cache:
            self._cache[name] = fake() if self.fake else real()
        return self._cache[name]

    @property
    def llm(self):
        from channel import llm, fake
        return self._get("llm", lambda: llm.Claude(self.cfg["model"], self.cfg["effort"]),
                         fake.FakeClaude)

    @property
    def tts(self):
        from channel import fake
        name = self.cfg["voice"]["provider"]
        if name not in voice.PROVIDERS:
            raise SystemExit("voice.provider must be one of %s" % list(voice.PROVIDERS))
        return self._get("tts", lambda: voice.PROVIDERS[name](self.cfg), fake.FakeVoice)

    @property
    def stock(self):
        from channel import fake
        name = self.cfg["broll"]["provider"]
        if name not in broll.PROVIDERS:
            raise SystemExit("broll.provider must be one of %s" % list(broll.PROVIDERS))
        if self.fake:
            media.download = fake.fake_download
        return self._get("stock", lambda: broll.PROVIDERS[name](self.cfg), fake.FakeStock)

    @property
    def yt(self):
        from channel import fake
        def real():
            creds = youtube.Credentials.load()
            if not creds:
                raise SystemExit("no YouTube credentials: set YT_CLIENT_ID / "
                                 "YT_CLIENT_SECRET / YT_REFRESH_TOKEN or run "
                                 "`channel.py auth`")
            return youtube.YouTube(creds)
        return self._get("yt", real, fake.FakeYouTube)


# ---------------------------------------------------------------- stages

def produce(cfg, ep, prov, upto="quality"):
    """Run every unfinished stage up to `upto`, in order."""
    for stage in STAGES[1:STAGES.index(upto) + 1]:
        if ep.done(stage):
            print("%s: %s already done" % (ep.slug, stage))
            continue
        print("%s: %s ..." % (ep.slug, stage))
        if stage == "research":
            writing.research(cfg, prov.llm, ep)
        elif stage == "outline":
            o = writing.outline(cfg, prov.llm, ep)
            print("%s: outline — %s (%d sections, %d gaps%s)" % (
                ep.slug, o["through_line"][:80], len(o["sections"]),
                len(o.get("gaps") or []),
                " researched" if o.get("gaps_researched") else ""))
        elif stage == "script":
            s = writing.write_script(cfg, prov.llm, ep)
            sc = s.get("scores") or {}
            print("%s: script %r, %d words, %d sections%s" % (
                ep.slug, s["title"], s["words"], len(s["sections"]),
                ", critic %.1f/5" % (sum(sc.values()) / len(sc)) if sc else ""))
        elif stage == "voice":
            tl = voice.narrate(cfg, ep, prov.tts, prov.llm)
            print("%s: narration %.0fs%s" % (
                ep.slug, tl["speech_end"] - tl["lead"],
                ", respelled %s" % ", ".join(tl["respellings"]) if tl["respellings"] else ""))
        elif stage == "broll":
            plan = broll.plan_broll(cfg, ep, prov.stock, prov.llm)
            kinds = {}
            for s in plan["shots"]:
                kinds[s["kind"]] = kinds.get(s["kind"], 0) + 1
            print("%s: %d shots (%s)%s" % (
                ep.slug, len(plan["shots"]),
                ", ".join("%d %s" % (n, k) for k, n in sorted(kinds.items())),
                ", chosen by eye" if plan["vision"] else ""))
        elif stage == "music":
            if prov.fake:
                from channel import fake
                fake.fake_music_folder(cfg["music"]["folder"])
            m = music.pick_music(cfg, ep)
            print("%s: music %s" % (ep.slug, m.get("file") or "(none)"))
        elif stage == "assemble":
            out = assemble.assemble(cfg, ep, prov.llm)
            info = media.probe(out)
            print("%s: cut %s (%.0fs, %dx%d)" % (
                ep.slug, os.path.relpath(out, cfg["_root"]), info["duration"],
                info["width"], info["height"]))
        elif stage == "quality":
            q = quality.review(cfg, ep, prov.llm)
            print("%s: review — %s%s%s" % (
                ep.slug, q["verdict"],
                ", overall %s/5" % q["overall"] if q.get("overall") else "",
                ", HELD (%s)" % ", ".join(q["below_floor"] or ["reviewer"])
                if q["hold"] else ""))
            for issue in q.get("issues", [])[:5]:
                print("    - " + issue)


def held_reason(cfg, ep):
    """Why an episode is not going out by itself, or None."""
    if os.path.exists(ep.path("APPROVED")):
        return None
    if cfg["review"]:
        return "review mode is on"
    q = ep.load("quality")
    if q and q.get("hold"):
        return "the review held it (%s)" % ", ".join(q.get("below_floor") or [q["verdict"]])
    return None


def publish(cfg, ep, prov, dry_run=False):
    if not ep.done("assemble"):
        raise SystemExit("%s has no final.mp4 yet; run produce first" % ep.slug)
    if ep.done("publish"):
        print("%s: already published (%s)" % (ep.slug, ep.load("publish").get("url")))
        return ep.load("publish")
    why = held_reason(cfg, ep)
    if why:
        print("%s: held — %s. Watch %s then `channel.py approve %s`" % (
            ep.slug, why, os.path.relpath(ep.output("assemble"), cfg["_root"]), ep.slug))
        return None
    led = episodes.load_ledger(cfg["_ledger"])
    meta = youtube.build_metadata(cfg, ep, ep.load("script"), ep.load("voice"),
                                  ep.load("music"), ep.load("broll"))
    slot = youtube.next_slot(cfg["publish"], youtube.last_scheduled(led))
    if dry_run:
        print("%s: would upload as %r, live %s\n%s" % (
            ep.slug, meta["title"], youtube.rfc3339(slot),
            "\n".join("    " + l for l in meta["description"].splitlines()[:14])))
        return None
    yt = prov.yt
    try:
        already = yt.uploaded_markers()
    except youtube.ApiError as e:
        print("could not list the channel's uploads (%s); trusting the ledger" % e)
        already = {}
    vid = already.get(youtube.marker_tag(ep.slug))
    if vid:
        print("%s: already on the channel as %s (ledger was missing it)" % (ep.slug, vid))
    else:
        print("%s: uploading as %r, live %s" % (ep.slug, meta["title"], youtube.rfc3339(slot)))
        vid = yt.insert_video(ep.output("assemble"), meta, slot)
    record = {"video_id": vid, "url": "https://youtu.be/" + vid,
              "title": meta["title"], "publish_at": youtube.rfc3339(slot),
              "uploaded": episodes.now_iso()}
    led["videos"][ep.slug] = record
    episodes.save_ledger(led, cfg["_ledger"])      # before anything else can fail
    ep.save("publish", dict(record, metadata=meta))
    extras = [("thumbnail", ep.path("thumbnail.jpg"),
               lambda p: yt.set_thumbnail(vid, p))]
    if cfg["look"]["captions"] in ("upload", "both"):
        extras.append(("captions", ep.path("captions.srt"),
                       lambda p: yt.upload_captions(vid, p, cfg["language"])))
    for what, path, fn in extras:
        if os.path.exists(path):
            try:
                fn(path)
            except youtube.ApiError as e:
                # a custom thumbnail needs a phone-verified channel; neither
                # extra is worth failing the publish over
                print("%s: %s not set (%s)" % (ep.slug, what, e))
    print("%s: %s" % (ep.slug, record["url"]))
    return record


def learn(cfg, prov, quiet=False):
    """Pull views and retention for everything in the ledger. Returns
    the performance list the topic picker reads."""
    led = episodes.load_ledger(cfg["_ledger"])
    ids = [v["video_id"] for v in led["videos"].values()]
    if ids and cfg["publish"]["enabled"]:
        try:
            stats = prov.yt.analytics(ids)
            for key, v in led["videos"].items():
                if v["video_id"] in stats:
                    v["stats"] = dict(stats[v["video_id"]], fetched=episodes.now_iso())
            episodes.save_ledger(led, cfg["_ledger"])
        except (youtube.ApiError, SystemExit) as e:
            if not quiet:
                print("learn: analytics unavailable (%s)" % e)
    perf = [dict(v["stats"], title=v.get("title", key))
            for key, v in led["videos"].items() if v.get("stats")]
    perf.sort(key=lambda p: -(p.get("avg_view_pct") or 0))
    return perf[:6] + perf[-3:] if len(perf) > 9 else perf


# ---------------------------------------------------------------- commands

def cmd_run(args, cfg, prov):
    ep = next_episode(cfg, prov, args.topic)
    produce(cfg, ep, prov)
    if cfg["publish"]["enabled"]:
        publish(cfg, ep, prov, dry_run=args.dry_run)
    else:
        print("%s: publish.enabled is off; video is at %s" % (
            ep.slug, os.path.relpath(ep.output("assemble"), cfg["_root"])))


def next_episode(cfg, prov, title=None):
    """An episode already in progress is finished before a new one starts;
    a held one waits for a person and does not block the next."""
    if title is None:
        for ep in episodes.list_episodes(cfg["_episodes"]):
            if ep.done("topic") and not ep.done("publish") and \
                    not (ep.done("assemble") and held_reason(cfg, ep)):
                print("%s: resuming (up to %s)" % (ep.slug, ep.stage_done_up_to()))
                return ep
    perf = learn(cfg, prov, quiet=True)
    ep = writing.pick_topic(cfg, prov.llm, title, perf)
    t = ep.load("topic")
    print("%s: topic %r (%s)" % (ep.slug, t["title"], t["chosen_by"]))
    return ep


def cmd_topic(args, cfg, prov):
    ep = writing.pick_topic(cfg, prov.llm, args.title, learn(cfg, prov, quiet=True))
    t = ep.load("topic")
    print("%s\n  %s\n  angle: %s\n  why: %s" % (ep.slug, t["title"], t["angle"], t["why"]))


def cmd_produce(args, cfg, prov):
    produce(cfg, Episode(cfg["_episodes"], args.slug), prov)


def cmd_publish(args, cfg, prov):
    publish(cfg, Episode(cfg["_episodes"], args.slug), prov, dry_run=args.dry_run)


def cmd_approve(args, cfg, prov):
    ep = Episode(cfg["_episodes"], args.slug)
    open(ep.path("APPROVED"), "w").close()
    print("%s approved; it goes out on the next run (or `publish` now)" % ep.slug)


def cmd_redo(args, cfg, prov):
    if args.stage not in STAGES:
        raise SystemExit("stage must be one of %s" % ", ".join(STAGES))
    ep = Episode(cfg["_episodes"], args.slug)
    ep.reset(args.stage)
    print("%s: %s and later stages will be redone" % (ep.slug, args.stage))


def cmd_learn(args, cfg, prov):
    perf = learn(cfg, prov)
    if not perf:
        print("no analytics yet")
    for p in perf:
        print("%-50s watched %5s%%  %6s views" % (
            p["title"][:50], p.get("avg_view_pct", "?"), p.get("views", "?")))


def cmd_status(args, cfg, prov):
    led = episodes.load_ledger(cfg["_ledger"])
    eps = episodes.list_episodes(cfg["_episodes"])
    if not eps:
        print("no episodes yet — `channel.py run` makes the first one")
    for ep in eps:
        t = ep.load("topic") or {}
        pub = led["videos"].get(ep.slug)
        if pub:
            where = "published %s (live %s)" % (pub["url"], pub.get("publish_at", "?"))
            if pub.get("stats"):
                where += "  watched %s%%, %s views" % (
                    pub["stats"].get("avg_view_pct"), pub["stats"].get("views"))
        else:
            where = "at %s" % (ep.stage_done_up_to() or "nothing")
            why = held_reason(cfg, ep) if ep.done("assemble") else None
            if why:
                where += " — HELD: %s" % why
            elif ep.done("assemble") and os.path.exists(ep.path("APPROVED")):
                where += " — approved"
        q = ep.load("quality")
        if q and q.get("overall"):
            where += "  [review %s/5]" % q["overall"]
        print("%-40s %s\n    %s" % (ep.slug, t.get("title", ""), where))
    nxt = youtube.next_slot(cfg["publish"], youtube.last_scheduled(led))
    print("\nnext free slot: %s" % nxt.astimezone(
        zoneinfo.ZoneInfo(cfg["publish"]["timezone"])).strftime("%a %d %b %H:%M"))


def cmd_auth(args, cfg, prov):
    youtube.auth(args.client_id, args.client_secret)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", default=config.CONFIG)
    ap.add_argument("--fake", action="store_true",
                    help="offline stand-ins for every service (also CHANNEL_FAKE=1)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("run"); p.add_argument("--topic"); p.add_argument("--dry-run", action="store_true"); p.set_defaults(fn=cmd_run)
    p = sub.add_parser("topic"); p.add_argument("title", nargs="?"); p.set_defaults(fn=cmd_topic)
    p = sub.add_parser("produce"); p.add_argument("slug"); p.set_defaults(fn=cmd_produce)
    p = sub.add_parser("publish"); p.add_argument("slug"); p.add_argument("--dry-run", action="store_true"); p.set_defaults(fn=cmd_publish)
    p = sub.add_parser("approve"); p.add_argument("slug"); p.set_defaults(fn=cmd_approve)
    p = sub.add_parser("redo"); p.add_argument("slug"); p.add_argument("stage"); p.set_defaults(fn=cmd_redo)
    p = sub.add_parser("status"); p.set_defaults(fn=cmd_status)
    p = sub.add_parser("learn"); p.set_defaults(fn=cmd_learn)
    p = sub.add_parser("auth"); p.add_argument("--client-id"); p.add_argument("--client-secret"); p.set_defaults(fn=cmd_auth)
    args = ap.parse_args(argv)
    cfg = config.load(args.config)
    fake = args.fake or os.environ.get("CHANNEL_FAKE") == "1"
    prov = Providers(cfg, fake=fake)
    if fake:
        cfg["music"]["folder"] = os.path.join(cfg["_root"], "cache", "fake-music")
    args.fn(args, cfg, prov)
    return 0


if __name__ == "__main__":
    sys.exit(main())
