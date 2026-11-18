"""autochannel command line. One engine, any number of channels.

  python -m ac list                        every channel: queue, approvals, posting days
  python -m ac pending                     every script waiting for approval (weekly batch)
  python -m ac topup                       every channel: write scripts if its queue is low
  python -m ac due                         channels that post today (JSON, for the workflow)
  python -m ac channels                    every channel (JSON, for the workflow)
  python -m ac new <name>                  start a channel from channels/_template

  python -m ac <channel> daily             top up its queue; post if today is a posting day
  python -m ac <channel> topup             run the writers' room if its queue is low
  python -m ac <channel> write [N]         write N scripts into its queue
  python -m ac <channel> make [file]       render the next ready episode (no upload)
  python -m ac <channel> post [file]       render and upload it
  python -m ac <channel> status            its queue and recent posts
  python -m ac <channel> youtube-auth client_secret.json   (once per channel)

  python -m ac voice-export take.wav <voice-name>   (on your computer) -> voices/<voice-name>.safetensors

A failure never loses an episode: it stays queued with the error written
into it, the run tries the next one, and three failures retire it.
"""
from __future__ import annotations

import datetime as dt
import json
import shutil
import sys
import traceback
from pathlib import Path

from . import store


def make(path: Path, cfg: dict) -> Path:
    from . import captions, render, voice

    ep = store.load(path)
    work = store.build(cfg) / path.stem
    work.mkdir(parents=True, exist_ok=True)
    print(f"== [{cfg['_slug']}] {ep['title']}")
    wav = work / "narration.wav"
    secs = voice.synthesise(ep["narration"], wav, cfg)
    print(f"  narration {secs:.1f}s")
    if secs > cfg["format"]["max_seconds"]:
        raise RuntimeError(f"narration is {secs:.0f}s, over max_seconds; shorten the script")
    if cfg["visuals"]["captions"].get("enabled", True):
        words = captions.word_times(wav, ep["narration"])
        subs = render.ass(words, cfg, work / "captions.ass")
    else:  # e.g. sleep videos: no flashing words
        subs = None
    bg = render.background(ep, secs + 0.3, cfg, work)
    out = render.final(bg, wav, subs, secs, cfg, work / f"{path.stem}.mp4")
    print(f"  video {out}")
    return out


def post(path: Path, cfg: dict) -> str | None:
    from . import upload

    video = make(path, cfg)
    if not cfg["publish"].get("upload", True):
        print("  publish.upload is false; video left in build/")
        return None
    vid = upload.upload(video, store.load(path), cfg)
    ep = store.load(path)
    ep.update(youtube_id=vid, posted=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"))
    ep.pop("errors", None)
    store.save(ep, store.posted(cfg) / path.name)
    path.unlink()
    shutil.rmtree(store.build(cfg) / path.stem, ignore_errors=True)
    return vid


def _record_failure(path: Path, err: BaseException) -> None:
    ep = store.load(path)
    errs = ep.get("errors", []) + [f"{dt.date.today()}: {type(err).__name__}: {str(err)[:300]}"]
    ep["errors"] = errs
    if len(errs) >= 3:
        ep["failed"] = True
    store.save(ep, path)


def _waiting(cfg: dict) -> list[Path]:
    return [p for p in sorted(store.queue(cfg).glob("*.yaml"))
            if not store.load(p).get("failed") and p not in store.ready(cfg)]


def topup(cfg: dict) -> None:
    """Keep scripts ahead so the weekly approval batch always has a week
    to read, counting ones already waiting for approval."""
    from . import write

    stock = len(store.ready(cfg)) + len(_waiting(cfg))
    if stock < cfg["writer"].get("refill_below", 4):
        try:
            write.write(cfg)
        except Exception as e:  # no new scripts today is fine if some are queued
            print(f"!! [{cfg['_slug']}] writer failed: {e}")


def daily(cfg: dict) -> int:
    topup(cfg)
    return post_today(cfg)


def post_today(cfg: dict) -> int:
    if not store.due_today(cfg):
        print(f"[{cfg['_slug']}] not a posting day")
        return 0
    candidates = store.ready(cfg)
    if not candidates:
        print(f"[{cfg['_slug']}] nothing ready to post"
              + (" (waiting for approval)" if cfg["writer"].get("review") else ""))
        return 1
    for path in candidates[:3]:  # one bad episode must not stop the day
        try:
            post(path, cfg)
            return 0
        except Exception as e:
            traceback.print_exc()
            _record_failure(path, e)
    return 1


def status(cfg: dict) -> None:
    q = sorted(store.queue(cfg).glob("*.yaml"))
    ready = store.ready(cfg)
    print(f"[{cfg['_slug']}] {cfg['channel_name']}: queue {len(q)}, ready {len(ready)}")
    for p in q:
        ep = store.load(p)
        flag = "FAILED" if ep.get("failed") else ("ready" if p in ready else "needs approval")
        print(f"  [{flag}] {ep['title']}")
    for p in sorted(store.posted(cfg).glob("*.yaml"))[-5:]:
        ep = store.load(p)
        print(f"  {ep.get('posted', '')[:10]}  https://youtu.be/{ep.get('youtube_id')}  {ep['title']}")


def pending() -> None:
    """Everything waiting for approval, across channels, in one read."""
    total = 0
    for slug in store.channels():
        cfg = store.load_config(slug)
        for p in _waiting(cfg):
            ep = store.load(p)
            total += 1
            hook = " ".join(ep["narration"].split()[:60])
            print(f"\n[{slug}] {ep['title']}\n  {p.relative_to(store.ROOT)}\n  {hook} ...")
    print(f"\n{total} waiting. Approve by setting `approved: true` in the file; delete it to bin it.")


def new(slug: str) -> None:
    import re
    if not re.fullmatch(r"[a-z][a-z0-9_]{1,30}", slug):
        raise SystemExit("channel names: lowercase letters, digits and _ only (they become secret names)")
    src, dst = store.CHANNELS / "_template", store.CHANNELS / slug
    if dst.exists():
        raise SystemExit(f"{dst} already exists")
    shutil.copytree(src, dst)
    for sub in ("queue", "posted"):
        (dst / sub).mkdir(exist_ok=True)
        (dst / sub / ".gitkeep").touch()
    print(f"made {dst.relative_to(store.ROOT)}: fill in channel.yaml, RULES.md and IDEAS.md")


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__)
        return 0
    cmd, args = argv[0], argv[1:]
    if cmd == "list":
        for slug in store.channels():
            cfg = store.load_config(slug)
            print(f"{slug:<14} {cfg['channel_name']:<30} ready {len(store.ready(cfg)):>2}  "
                  f"waiting {len(_waiting(cfg)):>2}  posts {','.join(cfg['publish'].get('days', []))}")
        return 0
    if cmd == "pending":
        pending()
        return 0
    if cmd == "topup":
        for slug in store.channels():
            topup(store.load_config(slug))
        return 0
    if cmd == "channels":
        print(json.dumps(store.channels()))
        return 0
    if cmd == "due":
        print(json.dumps([s for s in store.channels() if store.due_today(store.load_config(s))]))
        return 0
    if cmd == "new":
        new(args[0])
        return 0
    if cmd == "voice-export":
        from . import voice
        lang = store.yaml.safe_load((store.CHANNELS / "defaults.yaml").read_text())["voice"]["language"]
        voice.export(Path(args[0]), store.ROOT / "voices" / f"{args[1]}.safetensors", lang)
        return 0

    cfg = store.load_config(cmd)
    sub, args = (args[0] if args else "status"), args[1:]
    if sub == "daily":
        return daily(cfg)
    if sub == "topup":
        topup(cfg)
        return 0
    if sub == "post-today":
        return post_today(cfg)
    if sub == "write":
        from . import write
        write.write(cfg, int(args[0]) if args else None)
    elif sub in ("make", "post"):
        path = Path(args[0]) if args else (store.ready(cfg) or [None])[0]
        if path is None:
            print("nothing ready")
            return 1
        (make if sub == "make" else post)(path, cfg)
    elif sub == "status":
        status(cfg)
    elif sub == "youtube-auth":
        from . import upload
        upload.authorise(cfg, Path(args[0]))
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
