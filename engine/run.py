#!/usr/bin/env python3
"""Engine entry point.

  python engine/run.py daily     produce one Reel per active market; publish if
                                 Instagram credentials are present
  python engine/run.py report    refresh insights and rewrite state/report.md
"""

import datetime
import json
import sys

from igengine import analytics, assemble, assets, generate, ledger, publish
from igengine.config import OUT_DIR, load, active_markets


def daily(cfg):
    run_id = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M")
    for market in active_markets(cfg):
        print(f"[{market['key']}] generating packet")
        packet = generate.make_packet(cfg, market, run_id)
        workdir = OUT_DIR / run_id / market["key"]
        workdir.mkdir(parents=True, exist_ok=True)
        (workdir / "packet.json").write_text(json.dumps(packet, indent=1))

        print(f"[{market['key']}] fetching assets")
        media = assets.fetch(cfg, packet, workdir)

        print(f"[{market['key']}] assembling reel")
        reel = assemble.build_reel(cfg, packet, media, workdir,
                                   workdir / f"reel-{market['key']}-{run_id}.mp4")

        caption = packet["caption"] + "\n.\n" + " ".join(packet.get("hashtags", []))
        media_id = None
        if packet["source"] == "claude":  # never publish offline draft packets
            print(f"[{market['key']}] publishing")
            media_id = publish.publish_reel(cfg, market["key"], reel, caption)
        status = ("published" if media_id
                  else "rendered (no IG credentials or draft packet)")
        print(f"[{market['key']}] {status}: {reel}")

        ledger.append({
            "run_id": run_id, "market": market["key"], "format": packet["format"],
            "hook": packet["hook"], "source": packet["source"],
            "media_id": media_id, "video": str(reel),
        })


def report(cfg):
    analytics.refresh_insights(cfg)
    path = analytics.report(cfg)
    print(path.read_text())


if __name__ == "__main__":
    cfg = load()
    step = sys.argv[1] if len(sys.argv) > 1 else "daily"
    {"daily": daily, "report": report}[step](cfg)
