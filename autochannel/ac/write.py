"""Scriptwriter: RULES.md + IDEAS.md + what's already been made -> new
episodes in the channel's queue/.

Structured output means every reply is a valid episode or nothing.
"""
from __future__ import annotations

import re

import anthropic
from pydantic import BaseModel, Field

from . import store


class Script(BaseModel):
    title: str = Field(description="YouTube title, under 70 characters, no clickbait caps")
    narration: str = Field(description="Exactly what is spoken, plain sentences, no stage directions")
    description: str = Field(description="2-3 sentence YouTube description")
    tags: list[str]
    broll: list[str] = Field(
        description="Plain footage search terms (2-4 words) in narration order, as often as the channel rules ask"
    )
    idea: str = Field(description="The IDEAS.md line this came from, verbatim, or empty")


SYSTEM = """You write scripts for a faceless YouTube channel narrated in the \
creator's own (synthesised) voice. The creator's rules follow. They outrank \
anything else, including your own sense of what performs well.

<rules>
{rules}
</rules>

Format: {kind}, about {seconds} seconds spoken (~{words} words). The narration \
is read aloud by a text-to-speech voice exactly as written, so write numbers \
the way they are said ("about forty thousand"), avoid abbreviations, \
symbols, emoji and anything that only works on the page."""


def _ideas(cfg: dict) -> list[str]:
    text = (cfg["_dir"] / "IDEAS.md").read_text()
    m = re.search(r"## Up next\n(.*?)(\n## |\Z)", text, re.S)
    if not m:
        return []
    return [l.strip("-* \t") for l in m.group(1).splitlines() if l.strip("-* \t")]


def _mark_used(cfg: dict, used: list[str]) -> None:
    path = cfg["_dir"] / "IDEAS.md"
    text = path.read_text()
    for idea in used:
        if not idea:
            continue
        lines = text.splitlines()
        lines = [l for l in lines if l.strip("-* \t") != idea]
        text = "\n".join(lines).rstrip() + f"\n- {idea}\n"
    path.write_text(text)


def write(cfg: dict, n: int | None = None) -> list:
    w, f = cfg["writer"], cfg["format"]
    n = n or w["batch_size"]
    seconds = f["target_seconds"]
    system = SYSTEM.format(
        rules=(cfg["_dir"] / "RULES.md").read_text(),
        kind="vertical Short" if f["kind"] == "short" else "landscape video",
        seconds=seconds,
        words=int(seconds * 2.6),
    )
    ideas = _ideas(cfg)
    done = store.history(cfg)
    client = anthropic.Anthropic()
    paths, used = [], []
    # One script per request, streamed: a 2-hour sleep script is ~18,000
    # words, and one bad script never costs the rest of the batch.
    for k in range(n):
        idea = ideas[k] if k < len(ideas) else ""
        prompt = (
            "Write one new script.\n\n"
            + (f"Use this idea from the creator: {idea}\n\n" if idea else "")
            + ("Already made or queued (do not repeat these topics or angles):\n"
               + "\n".join(f"- {t}" for t in done) if done else "Nothing has been made yet.")
        )
        try:
            with client.beta.messages.stream(
                model=w["model"],
                max_tokens=64000,
                system=system,
                messages=[{"role": "user", "content": prompt}],
                output_format=Script,
                output_config={"effort": w.get("effort", "medium")},
                # If a safety classifier declines (horror, crime history),
                # retry on the model Anthropic picks instead of failing.
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            ) as stream:
                resp = stream.get_final_message()
        except anthropic.APIError as e:
            print(f"  script {k + 1}: API error {e}")
            continue
        s = getattr(resp, "parsed_output", None)
        if resp.stop_reason in ("refusal", "max_tokens") or s is None:
            print(f"  script {k + 1}: no script (stop_reason={resp.stop_reason})")
            continue
        ep = {
            "title": s.title.strip(),
            "approved": not w.get("review", False),
            "narration": s.narration.strip(),
            "description": s.description.strip(),
            "tags": s.tags,
            "broll": s.broll,
            "idea": s.idea or idea,
            "writer": resp.model,
        }
        paths.append(store.save(ep, store.new_path(cfg, s.title)))
        done.insert(0, ep["title"])
        used.append(ep["idea"])
        u = resp.usage
        print(f"  wrote '{ep['title']}' ({len(ep['narration'].split())} words; "
              f"{u.input_tokens} in / {u.output_tokens} out tokens)")
    _mark_used(cfg, used)
    if not paths:
        raise RuntimeError("writer produced no scripts")
    return paths
