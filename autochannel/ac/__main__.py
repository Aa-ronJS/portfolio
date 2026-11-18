"""autochannel command line.

  python -m ac daily              top up the queue if low, then make + post one
  python -m ac write [N]          write N scripts into queue/
  python -m ac make [file.yaml]   render the next ready episode (no upload)
  python -m ac post [file.yaml]   render and upload the next ready episode
  python -m ac status             what's queued, what's posted
  python -m ac voice-export me.wav     (once, on your computer) clone your voice
  python -m ac youtube-auth client_secret.json   (once) get upload tokens

A failure never loses an episode: it stays in queue/ with the error
written into it, the run moves on to the next one, and three failures in
a row retire it (`failed:` set) so one bad script can't block the channel.
"""
from __future__ import annotations

import datetime as dt
import shutil
import sys
import traceback
from pathlib import Path

from . import store


def make(path: Path, cfg: dict) -> Path:
    from . import captions, render, voice

    ep = store.load(path)
    work = store.BUILD / path.stem
    work.mkdir(parents=True, exist_ok=True)
    print(f"== {ep['title']}")
    wav = work / "narration.wav"
    secs = voice.synthesise(ep["narration"], wav, cfg)
    print(f"  narration {secs:.1f}s")
    if secs > cfg["format"]["max_seconds"]:
        raise RuntimeError(f"narration is {secs:.0f}s, over max_seconds; shorten the script")
    words = captions.word_times(wav, ep["narration"])
    subs = render.ass(words, cfg, work / "captions.ass")
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
    store.save(ep, store.POSTED / path.name)
    path.unlink()
    shutil.rmtree(store.BUILD / path.stem, ignore_errors=True)
    return vid


def _record_failure(path: Path, err: BaseException) -> None:
    ep = store.load(path)
    errs = ep.get("errors", []) + [f"{dt.date.today()}: {type(err).__name__}: {str(err)[:300]}"]
    ep["errors"] = errs
    if len(errs) >= 3:
        ep["failed"] = True
    store.save(ep, path)


def daily(cfg: dict) -> int:
    from . import write

    if len(store.ready(cfg)) < cfg["writer"].get("refill_below", 2):
        try:
            write.write(cfg)
        except Exception as e:  # no scripts today is fine if the queue has some
            print(f"!! writer failed: {e}")
    candidates = store.ready(cfg)
    if not candidates:
        print("nothing ready to post" + (" (waiting for approval)" if cfg["writer"].get("review") else ""))
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
    q = sorted(store.QUEUE.glob("*.yaml"))
    print(f"queue: {len(q)}  (ready {len(store.ready(cfg))})")
    for p in q:
        ep = store.load(p)
        flag = "FAILED" if ep.get("failed") else ("ready" if p in store.ready(cfg) else "needs approval")
        print(f"  [{flag}] {ep['title']}")
    posted = sorted(store.POSTED.glob("*.yaml"))
    print(f"posted: {len(posted)}")
    for p in posted[-5:]:
        ep = store.load(p)
        print(f"  {ep.get('posted', '')[:10]}  https://youtu.be/{ep.get('youtube_id')}  {ep['title']}")


def main(argv: list[str]) -> int:
    cfg = store.load_config()
    cmd, args = (argv[0] if argv else "status"), argv[1:]
    pick = lambda: Path(args[0]) if args else (store.ready(cfg) or [None])[0]  # noqa: E731
    if cmd == "daily":
        return daily(cfg)
    if cmd == "write":
        from . import write
        write.write(cfg, int(args[0]) if args else None)
    elif cmd in ("make", "post"):
        path = pick()
        if path is None:
            print("nothing ready")
            return 1
        (make if cmd == "make" else post)(path, cfg)
    elif cmd == "status":
        status(cfg)
    elif cmd == "voice-export":
        from . import voice
        voice.export(Path(args[0]), store.ROOT / "voice" / "voice.safetensors", cfg["voice"]["language"])
    elif cmd == "youtube-auth":
        from . import upload
        upload.authorise(Path(args[0]))
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
