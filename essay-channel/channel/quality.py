"""The last viewer before upload. Claude is shown one frame from every
shot with the sentence heard over it, rates the match, judges the
whole, and says publish or hold. The script's own critique scores
come along. A video under the bar waits for a person; nothing weak
goes out on its own.
"""

import os
import shutil

from . import media, prompts

BATCH = 16


def review(cfg, ep, llm=None):
    plan = ep.load("broll")
    script = ep.load("script")
    final = ep.output("assemble")
    shots = plan["shots"]
    report = {"script_scores": script.get("scores", {}),
              "shot_matches": [], "overall": None, "issues": [],
              "verdict": "publish", "reviewed": llm is not None and
              cfg["quality"]["review"]}
    if report["reviewed"]:
        work = ep.path("work")
        os.makedirs(work, exist_ok=True)
        matches, issues, overalls = [], [], []
        for b in range(0, len(shots), BATCH):
            batch = shots[b:b + BATCH]
            images = []
            for i, s in enumerate(batch):
                t = s["start"] + min(1.0, s["duration"] / 2)
                png = os.path.join(work, "q%03d.jpg" % (b + i))
                media.ffmpeg(["-ss", "%.3f" % t, "-i", final, "-frames:v", "1",
                              "-vf", "scale=640:-2", "-q:v", "4", png])
                with open(png, "rb") as f:
                    images.append(("Shot %d" % i, f.read()))
            try:
                r = llm.vision_json(prompts.system(cfg),
                                    prompts.review([s["text"] for s in batch]),
                                    images, prompts.REVIEW_SCHEMA)
            except Exception as e:
                print("quality: review call failed (%s)" % e)
                report["reviewed"] = False
                break
            for m in r.get("shots", []):
                i = m.get("shot", -1)
                if 0 <= i < len(batch):
                    matches.append({"shot": b + i, "text": batch[i]["text"][:80],
                                    "match": m["match"]})
            issues += r.get("issues", [])
            overalls.append((r.get("overall", 3), r.get("verdict", "publish")))
        shutil.rmtree(work, ignore_errors=True)
        if overalls:
            report["shot_matches"] = matches
            report["issues"] = issues
            report["overall"] = round(sum(o for o, _ in overalls) / len(overalls), 2)
            report["verdict"] = "hold" if any(v == "hold" for _, v in overalls) \
                else "publish"
            if matches:
                report["match_avg"] = round(sum(m["match"] for m in matches) / len(matches), 2)
    sc = report["script_scores"]
    if sc:
        report["script_avg"] = round(sum(sc.values()) / len(sc), 2)
    floor = float(cfg["quality"]["min_score"] or 0)
    low = [k for k, v in (("overall", report.get("overall")),
                          ("match_avg", report.get("match_avg")),
                          ("script_avg", report.get("script_avg")))
           if v is not None and floor and v < floor]
    report["below_floor"] = low
    report["hold"] = report["verdict"] == "hold" or bool(low)
    ep.save("quality", report)
    return report
