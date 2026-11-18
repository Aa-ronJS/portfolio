"""The packaging room: titles and thumbnails, made to be clicked honestly.

Stage 1 runs with the script, once it has passed the council:
  generate 8 packages (title + thumbnail words + image idea) from
  different angles -> a packaging council scores every one -> an editor
  polishes the best three into an A/B/C set for YouTube's Test & Compare.

Stage 2 runs after the video renders, because the pictures come from
the video's own footage:
  pull the sharpest frames -> Claude looks at a numbered contact sheet
  and plans each thumbnail (frame, crop, focus, layout, graphics) ->
  render -> Claude judges all three at phone-feed size and sends fixes
  -> re-render, up to `packaging.thumb_rounds`.

Seats are markdown files in council/ like the script council
(`pack_*.md` for titles, `thumb_critic.md` for pictures).
"""
from __future__ import annotations

import base64
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from . import council, thumbs

Element = Literal["circle", "arrow", "redstring", "glow", "stamp", "grain"]
Side = Literal["left", "right", "top", "bottom", "center"]


class Package(BaseModel):
    angle: str = Field(description="The click reason in a few words: curiosity, stakes, contradiction, specificity, search...")
    title: str = Field(description="Under 60 characters ideally, never over 70; front-load the hook")
    thumb_text: str = Field(description="1-4 words on the thumbnail that ADD to the title, never repeat it; empty if the image alone is stronger")
    accent: list[str] = Field(description="Which of the thumbnail words get the accent colour")
    image_idea: str = Field(description="What the picture shows, concretely, given the footage the channel can use")


class Packages(BaseModel):
    packages: list[Package]


class PackScore(BaseModel):
    index: int
    score: int = Field(description="1-10")
    blocking: list[str]
    note: str


class PackReview(BaseModel):
    scores: list[PackScore]


class FinalSet(BaseModel):
    packages: list[Package] = Field(description="Exactly three, best first, genuinely different from each other")


class ThumbPlan(BaseModel):
    frame: int = Field(description="Number of the frame on the contact sheet")
    crop: list[float] = Field(description="[x0, y0, x1, y1] as fractions of the frame; [0,0,1,1] for the whole frame")
    focus: list[float] = Field(description="[x, y] fractions: where the eye should land")
    side: Side
    elements: list[Element]
    text: str
    accent: list[str]
    stamp_text: str = ""


class ThumbPlans(BaseModel):
    plans: list[ThumbPlan]


class ThumbScore(BaseModel):
    index: int
    score: int = Field(description="1-10 as it appears in a phone feed")
    problems: list[str]
    fixed_plan: ThumbPlan = Field(description="The plan with your fixes applied (unchanged if it already passes)")


class ThumbReview(BaseModel):
    scores: list[ThumbScore]


def _img(path: Path) -> dict:
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                        "data": base64.b64encode(path.read_bytes()).decode()}}


def _seat(name: str) -> str:
    r = council._reviewer(name)
    return f"Your seat: {r['title']}\n\n{r['lens']}"


# --- stage 1: titles and concepts --------------------------------------------

def titles(room: "council.Room", script: "council.Script", recent_titles: list[str]) -> list[dict]:
    p = room.cfg.get("packaging", {})
    base = (room.brief() + "\n\nYou are now packaging a finished, approved script: the title and "
            "thumbnail decide whether anyone ever hears it. Packaging must be irresistible AND honest: "
            "YouTube measures whether viewers were satisfied, so a promise the video doesn't keep "
            "loses more than it gains.\n\n"
            f"<script title=\"{script.title}\">\n{script.narration}\n</script>\n\n"
            "Footage the video actually uses (the thumbnail picture must come from these): "
            + "; ".join(script.broll[:60]) + "\n\nThis channel's recent titles (stay consistent, don't repeat):\n"
            + "\n".join(f"- {t}" for t in recent_titles[:15]))
    cands = room.ask(base, "Write 8 packages, each from a genuinely different angle. Think like the best "
                     "packager in this genre: specific beats vague, tension beats description, and the "
                     "thumbnail words do a different job from the title.", Packages, effort="high")
    listing = "\n".join(f"[{i}] {c.title} | thumb: \"{c.thumb_text}\" | image: {c.image_idea} | angle: {c.angle}"
                        for i, c in enumerate(cands.packages))
    seats = p.get("seats", ["pack_click", "pack_promise", "pack_search"])
    totals = {i: 0.0 for i in range(len(cands.packages))}
    notes: dict[int, list[str]] = {i: [] for i in totals}
    for seat in seats:
        rv = room.ask(base + "\n\n" + _seat(seat), f"Score every package.\n\n{listing}", PackReview,
                      effort="medium")
        for s in rv.scores:
            if s.index in totals:
                totals[s.index] += s.score - 3 * len(s.blocking)
                notes[s.index] += [f"{seat}: {s.note}"] + [f"{seat} BLOCKING: {b}" for b in s.blocking]
    best = sorted(totals, key=lambda i: -totals[i])[:5]
    shortlist = "\n\n".join(f"[{i}] {cands.packages[i].title} | thumb: \"{cands.packages[i].thumb_text}\" | "
                            f"image: {cands.packages[i].image_idea}\nScore {totals[i]:.0f}. Notes:\n"
                            + "\n".join(notes[i]) for i in best)
    final = room.ask(base + "\n\n" + _seat("pack_editor"),
                     f"The council's shortlist with its notes:\n\n{shortlist}\n\nProduce the final A/B/C set.",
                     FinalSet, effort="high")
    return [f.model_dump() for f in final.packages[:3]]


# --- stage 2: pictures ----------------------------------------------------

def thumbnails(cfg: dict, packages: list[dict], footage: Path, work: Path, client=None) -> tuple[list[Path], float]:
    """Render the A/B/C thumbnails from the video's own footage. Returns
    (paths, cost in US$)."""
    room = council.Room(cfg, client)
    p = cfg.get("packaging", {})
    frames = thumbs.candidate_frames(footage, work / "frames", n=12)
    library = sorted((cfg["_dir"] / "footage").glob("**/*.jpg"))[:8] if (cfg["_dir"] / "footage").exists() else []
    pool = frames + library
    if not pool:
        raise RuntimeError("no frames to build thumbnails from")
    sheet = thumbs.contact_sheet(pool, work / "sheet.jpg")
    system = (f"You design YouTube thumbnails for the channel '{cfg['channel_name']}'.\n\n"
              f"<channel_rules>\n{(cfg['_dir'] / 'RULES.md').read_text()}\n</channel_rules>\n\n"
              + _seat("thumb_critic"))
    brief = "\n".join(f"{k}. title: {pk['title']} | words: \"{pk['thumb_text']}\" | image idea: {pk['image_idea']}"
                      for k, pk in enumerate(packages))
    plans = room.ask(system, [_img(sheet), {"type": "text", "text":
                     "Numbered candidate frames from the video's own footage are above. Plan one "
                     f"thumbnail for each package, in order:\n{brief}\n\nPick the frame that best "
                     "carries each package's idea (different frames for different packages where "
                     "possible), crop tight on the subject, choose where the words go so they never "
                     "cover the subject, and add graphic elements only if they earn their place."}],
                     ThumbPlans, effort="high").plans[:len(packages)]

    out: list[Path] = []
    for rnd in range(int(p.get("thumb_rounds", 3))):
        out = []
        for k, plan in enumerate(plans):
            spec = plan.model_dump()
            spec["background"] = pool[max(0, min(plan.frame, len(pool) - 1))]
            out.append(thumbs.render(spec, cfg, work / f"thumb_{'abc'[k]}.jpg"))
        preview = thumbs.phone_preview(out, work / f"phone_{rnd}.jpg")
        rv = room.ask(system, [_img(preview), _img(sheet), {"type": "text", "text":
                      "Top row: the three thumbnails at the size YouTube shows them in a phone feed. "
                      "Below them: the size in a crowded 'up next' list. Second image: the frames "
                      f"available. The packages, in order:\n{brief}\n\nJudge each as it will "
                      "really be seen, then give the fixed plan."}],
                      ThumbReview, effort="medium")
        scores = {s.index: s for s in rv.scores}
        print(f"  thumbnails round {rnd + 1}: "
              + ", ".join(f"{'ABC'[i]} {scores[i].score}" for i in range(len(plans)) if i in scores))
        if all(i in scores and scores[i].score >= int(p.get("pass_score", 8)) for i in range(len(plans))):
            break
        plans = [scores[i].fixed_plan if i in scores else plans[i] for i in range(len(plans))]
    return out, room.ledger.usd
