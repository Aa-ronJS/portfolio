"""The writers' room: pitch -> commission -> draft -> adversarial council
-> rewrite, until every reviewer passes it or it's binned.

Nothing reaches the queue unless every reviewer on the channel's council
scores it at or above `council.pass_score` with no blocking issues. Veto
reviewers (fact-check, policy, slop) can kill a script outright. Binned
scripts go to rejected/ with every review, and the commonest blocking
issues are written to the channel's LESSONS.md, which the writer reads.

Reviewers are plain markdown files in council/ (name, veto, search in the
header; the lens below it), so Aaron can sharpen any of them by editing
text. A reviewer with `search: true` researches on the web first and
then gives its verdict from what it found.
"""
from __future__ import annotations

import datetime as dt
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Literal

import anthropic
from pydantic import BaseModel, Field

from . import store

COUNCIL_DIR = store.ROOT / "council"

# US$ per million tokens (input, output, cache read) for the cost log.
PRICES = {"claude-opus-5-5": (4.0, 20.0, 0.20), "claude-sonnet-5-5": (2.0, 10.0, 0.10),
          "claude-haiku-5-5": (0.10, 0.50, 0.01), "claude-fable-5-2": (8.0, 40.0, 0.20)}
SEARCH_PRICE = 0.01  # per web search


# --- shapes the model must return -------------------------------------------

class Pitch(BaseModel):
    title: str
    premise: str = Field(description="The argument (nonfiction) or the story engine (fiction), in 2-3 sentences")
    hook: str = Field(description="The first 30 seconds, written out exactly as it would be spoken")
    outline: list[str] = Field(description="The beats in order, one line each")
    why_exceptional: str = Field(description="Why this beats what the genre's best channels have already done")


class Pitches(BaseModel):
    pitches: list[Pitch]


class Commission(BaseModel):
    choice: int = Field(description="Index of the pitch to commission, or -1 if none is good enough")
    reason: str
    notes_for_writer: list[str] = Field(description="What the draft must do to be exceptional")


class Script(BaseModel):
    title: str = Field(description="YouTube title in the channel's style")
    narration: str = Field(description="Exactly what is spoken, plain sentences, no stage directions")
    description: str = Field(description="YouTube description: 2-3 sentences, then sources if nonfiction")
    tags: list[str]
    broll: list[str] = Field(description="Footage/visual cues in narration order, as often as the channel rules ask")
    idea: str = Field(description="The IDEAS.md line this came from, verbatim, or empty")


class LineEdit(BaseModel):
    quote: str = Field(description="Exact words from the script")
    suggestion: str


class Review(BaseModel):
    score: int = Field(description="1-10 against the reviewer's own bar; 8 means a top channel in the genre would publish it")
    verdict: Literal["pass", "revise", "reject"]
    blocking: list[str] = Field(description="Problems that MUST be fixed before publishing; empty if none")
    notes: list[str] = Field(description="Non-blocking improvements, most valuable first")
    line_edits: list[LineEdit]


# --- reviewers --------------------------------------------------------------

def _reviewer(name: str) -> dict:
    text = (COUNCIL_DIR / f"{name}.md").read_text()
    meta, body = {}, text
    m = re.match(r"---\n(.*?)\n---\n(.*)", text, re.S)
    if m:
        body = m.group(2)
        for line in m.group(1).splitlines():
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
    return {"name": name, "veto": meta.get("veto") == "true", "search": meta.get("search") == "true",
            "title": meta.get("title", name), "lens": body.strip()}


# --- plumbing ---------------------------------------------------------------

class Ledger:
    """Adds up tokens and searches so every script carries its real cost."""

    def __init__(self):
        self.usd = 0.0

    def add(self, resp) -> None:
        u = resp.usage
        pin, pout, pcache = PRICES.get(resp.model, PRICES["claude-opus-5-5"])
        cached = getattr(u, "cache_read_input_tokens", 0) or 0
        written = getattr(u, "cache_creation_input_tokens", 0) or 0
        searches = getattr(getattr(u, "server_tool_use", None), "web_search_requests", 0) or 0
        self.usd += (u.input_tokens * pin + written * pin * 1.25 + cached * pcache + u.output_tokens * pout) / 1e6
        self.usd += searches * SEARCH_PRICE


class Room:
    def __init__(self, cfg: dict, client=None):
        self.cfg = cfg
        self.w = cfg["writer"]
        self.c = cfg.get("council", {})
        self.client = client or anthropic.Anthropic()
        self.ledger = Ledger()

    # One structured call. Streams, so long scripts never hit a timeout.
    def ask(self, system, prompt: str, shape, effort: str, model: str | None = None):
        with self.client.beta.messages.stream(
            model=model or self.w["model"],
            max_tokens=64000,
            system=system,
            messages=[{"role": "user", "content": prompt}],
            output_format=shape,
            output_config={"effort": effort},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        ) as s:
            resp = s.get_final_message()
        self.ledger.add(resp)
        out = getattr(resp, "parsed_output", None)
        if resp.stop_reason in ("refusal", "max_tokens") or out is None:
            raise RuntimeError(f"no {shape.__name__} (stop_reason={resp.stop_reason})")
        return out

    # Free-text research with web search, for search reviewers.
    def research(self, system, prompt: str) -> str:
        messages = [{"role": "user", "content": prompt}]
        tools = [{"type": "web_search_20260209", "name": "web_search",
                  "max_uses": int(self.c.get("max_searches", 12))}]
        text = []
        for _ in range(4):  # pause_turn: the server paused a long search loop
            with self.client.beta.messages.stream(
                model=self.w["model"], max_tokens=32000, system=system, tools=tools,
                messages=messages, output_config={"effort": "medium"},
                betas=["server-side-fallback-2026-07-01"], fallbacks="default",
            ) as s:
                resp = s.get_final_message()
            self.ledger.add(resp)
            text += [b.text for b in resp.content if getattr(b, "type", "") == "text"]
            if resp.stop_reason != "pause_turn":
                break
            messages = messages + [{"role": "assistant", "content": resp.content}]
        return "\n".join(text)

    # --- the stages ---------------------------------------------------------

    def brief(self) -> str:
        f = self.cfg["format"]
        lessons = self.cfg["_dir"] / "LESSONS.md"
        return (
            "You are the head writer of a YouTube channel. The work must be exceptional: better "
            "written than the best channels in its genre, not merely competent. It is narrated by a "
            "text-to-speech clone of the creator's voice, so write for the ear: numbers as spoken, no "
            "symbols or abbreviations, nothing that only works on the page.\n\n"
            f"<channel_rules>\n{(self.cfg['_dir'] / 'RULES.md').read_text()}\n</channel_rules>\n\n"
            f"Target length: about {f['target_seconds'] // 60} minutes "
            f"(~{int(f['target_seconds'] * 2.5)} spoken words).\n"
            + (f"\n<lessons_from_rejected_scripts>\n{lessons.read_text()}\n</lessons_from_rejected_scripts>\n"
               if lessons.exists() else "")
        )

    def pitch_and_commission(self, idea: str, done: list[str]) -> tuple[Pitch, list[str]] | None:
        history = "\n".join(f"- {t}" for t in done) or "nothing yet"
        p = self.ask(self.brief(),
                     "Pitch three genuinely different angles for one video"
                     + (f" on this idea from the creator: {idea}" if idea else " on a topic of your choosing")
                     + f".\n\nAlready made or queued (never repeat a topic or angle):\n{history}",
                     Pitches, effort="high")
        editor = _reviewer("commissioner")
        pitches = "\n\n".join(f"[{i}] {x.title}\nPremise: {x.premise}\nHook: {x.hook}\nOutline: "
                              + " / ".join(x.outline) + f"\nWhy exceptional: {x.why_exceptional}"
                              for i, x in enumerate(p.pitches))
        pick = self.ask(self.brief() + "\n\n" + editor["lens"], f"The pitches:\n\n{pitches}",
                        Commission, effort="high")
        if pick.choice < 0 or pick.choice >= len(p.pitches):
            print(f"  commissioner rejected all pitches: {pick.reason}")
            return None
        return p.pitches[pick.choice], pick.notes_for_writer

    def draft(self, pitch: Pitch, notes: list[str], idea: str) -> Script:
        return self.ask(self.brief(),
                        f"Write the full script for this commissioned pitch.\n\nTitle: {pitch.title}\n"
                        f"Premise: {pitch.premise}\nHook: {pitch.hook}\nOutline:\n"
                        + "\n".join(f"- {b}" for b in pitch.outline)
                        + "\n\nCommissioning editor's notes:\n" + "\n".join(f"- {n}" for n in notes)
                        + f"\n\nIdea line (copy into `idea`): {idea}",
                        Script, effort="high")

    def review(self, script: Script, names: list[str]) -> dict[str, Review]:
        # The channel rules and the script form one cached prefix shared by
        # every reviewer; only the lens differs.
        shared = [{"type": "text", "text":
                   "You sit on an adversarial review council for a YouTube channel. Your job is to find "
                   "what is wrong, not to encourage. Judge against the best channels in this genre. "
                   "A score of 8 means a top channel would publish it as is; most first drafts are "
                   "5-7. Only list something as blocking if it must change before publishing.\n\n"
                   f"<channel_rules>\n{(self.cfg['_dir'] / 'RULES.md').read_text()}\n</channel_rules>\n\n"
                   f"<script title=\"{script.title}\">\n{script.narration}\n</script>\n\n"
                   f"<description>\n{script.description}\n</description>\n\n"
                   f"<visual_cues>\n{'; '.join(script.broll)}\n</visual_cues>",
                   "cache_control": {"type": "ephemeral"}}]

        def one(name: str) -> tuple[str, Review]:
            r = _reviewer(name)
            prompt = f"Your seat on the council: {r['title']}\n\n{r['lens']}"
            if r["search"]:
                findings = self.research(shared, prompt + "\n\nResearch first: search the web to check "
                                         "the claims your lens covers, then write up what you found, "
                                         "claim by claim, with sources.")
                prompt += f"\n\n<your_research>\n{findings}\n</your_research>\n\nNow give your verdict."
            return name, self.ask(shared, prompt, Review, effort=self.c.get("review_effort", "medium"))

        with ThreadPoolExecutor(max_workers=4) as pool:
            return dict(pool.map(one, names))

    def revise(self, script: Script, reviews: dict[str, Review]) -> Script:
        notes = []
        for name, rv in reviews.items():
            notes.append(f"## {name} (score {rv.score}, {rv.verdict})")
            notes += [f"BLOCKING: {b}" for b in rv.blocking]
            notes += [f"- {n}" for n in rv.notes]
            notes += [f'- edit "{e.quote}" -> {e.suggestion}' for e in rv.line_edits]
        return self.ask(self.brief(),
                        "Rewrite this script so it passes every reviewer. Fix every BLOCKING item. "
                        "Take the notes on merit: where reviewers disagree, choose what makes the video "
                        "better and keep the voice. Return the complete new script, not a diff.\n\n"
                        f"<script title=\"{script.title}\">\n{script.narration}\n</script>\n\n"
                        f"<description>\n{script.description}\n</description>\n\n"
                        "<council_notes>\n" + "\n".join(notes) + "\n</council_notes>",
                        Script, effort="high")


def _passes(reviews: dict[str, Review], bar: int) -> bool:
    return all(r.score >= bar and not r.blocking and r.verdict == "pass" for r in reviews.values())


def _vetoed(reviews: dict[str, Review]) -> list[str]:
    return [n for n, r in reviews.items() if r.verdict == "reject" and _reviewer(n)["veto"]]


def _record_rejection(cfg: dict, script: Script | None, history: list, why: str) -> None:
    d = cfg["_dir"] / "rejected"
    title = script.title if script else "pitch"
    store.save({"title": title, "why": why, "rounds": history,
                "narration": script.narration if script else ""},
               d / f"{dt.datetime.now(dt.timezone.utc):%Y%m%d-%H%M%S}-{store.slug(title)}.yaml")
    # Keep the writer learning from the last 25 blocking issues.
    blocking = [b for rnd in history for rv in rnd.values() for b in rv.get("blocking", [])]
    if blocking:
        lessons = cfg["_dir"] / "LESSONS.md"
        old = lessons.read_text().splitlines()[2:] if lessons.exists() else []
        new = [f"- {b}" for b in dict.fromkeys(blocking) if f"- {b}" not in old][:5]
        lines = (old + new)[-25:]
        lessons.write_text("# Lessons from rejected scripts (auto-written, newest last)\n\n"
                           + "\n".join(lines) + "\n")


def make_script(cfg: dict, idea: str, done: list[str], client=None) -> tuple[dict | None, float]:
    """Run one idea through the room. Returns (episode or None, cost in US$)."""
    room = Room(cfg, client)
    c = cfg.get("council", {})
    bar = int(c.get("pass_score", 8))
    names = list(c.get("reviewers", []))
    history: list[dict] = []
    script = None
    try:
        commissioned = room.pitch_and_commission(idea, done)
        if not commissioned:
            return None, room.ledger.usd
        pitch, notes = commissioned
        script = room.draft(pitch, notes, idea)
        for rnd in range(1, int(c.get("max_rounds", 3)) + 1):
            reviews = room.review(script, names)
            history.append({n: r.model_dump() for n, r in reviews.items()})
            scores = ", ".join(f"{n} {r.score}{'!' if r.blocking else ''}" for n, r in reviews.items())
            print(f"  round {rnd}: {scores}")
            if (v := _vetoed(reviews)):
                _record_rejection(cfg, script, history, f"vetoed by {', '.join(v)}")
                return None, room.ledger.usd
            if _passes(reviews, bar):
                return ({
                    "title": script.title.strip(),
                    "narration": script.narration.strip(),
                    "description": script.description.strip(),
                    "tags": script.tags,
                    "broll": script.broll,
                    "idea": script.idea or idea,
                    "council": {n: r.score for n, r in reviews.items()},
                    "rounds": rnd,
                    "cost_usd": round(room.ledger.usd, 2),
                }, room.ledger.usd)
            if rnd < int(c.get("max_rounds", 3)):
                script = room.revise(script, reviews)
        _record_rejection(cfg, script, history, f"did not pass in {len(history)} rounds")
    except (anthropic.APIError, RuntimeError) as e:
        print(f"  room failed: {e}")
        if script is not None or history:
            _record_rejection(cfg, script, history, f"error: {e}")
    return None, room.ledger.usd
