"""Scriptwriter: RULES.md + IDEAS.md + what's already been made -> new
episodes in queue/.

One Claude call writes a whole batch, so a week of scripts costs one
request. Structured output means the reply is always valid episodes.
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
        description="One stock-footage search term (2-4 plain words) per ~4 seconds of narration, in order"
    )
    idea: str = Field(description="The IDEAS.md line this came from, verbatim, or empty")


class Batch(BaseModel):
    scripts: list[Script]


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


def _ideas() -> list[str]:
    text = (store.CHANNEL / "IDEAS.md").read_text()
    m = re.search(r"## Up next\n(.*?)(\n## |\Z)", text, re.S)
    if not m:
        return []
    return [l.strip("-* \t") for l in m.group(1).splitlines() if l.strip("-* \t")]


def _mark_used(used: list[str]) -> None:
    path = store.CHANNEL / "IDEAS.md"
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
        rules=(store.CHANNEL / "RULES.md").read_text(),
        kind="vertical Short" if f["kind"] == "short" else "landscape video",
        seconds=seconds,
        words=int(seconds * 2.6),
    )
    ideas = _ideas()
    done = store.history()
    prompt = (
        f"Write {n} new scripts.\n\n"
        + ("Use these ideas from the creator first, in order, one per script:\n"
           + "\n".join(f"- {i}" for i in ideas[:n]) + "\n\n" if ideas else "")
        + ("Already made or queued (do not repeat these topics or angles):\n"
           + "\n".join(f"- {t}" for t in done) if done else "Nothing has been made yet.")
    )

    client = anthropic.Anthropic()
    resp = client.beta.messages.parse(
        model=w["model"],
        max_tokens=16000,
        system=system,
        messages=[{"role": "user", "content": prompt}],
        output_format=Batch,
        output_config={"effort": w.get("effort", "medium")},
        # If a safety classifier declines, retry on the model Anthropic picks
        # instead of failing the day's run.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if resp.stop_reason == "refusal" or resp.parsed_output is None:
        raise RuntimeError(f"writer returned no scripts (stop_reason={resp.stop_reason})")

    paths = []
    for s in resp.parsed_output.scripts:
        ep = {
            "title": s.title.strip(),
            "approved": not w.get("review", False),
            "narration": s.narration.strip(),
            "description": s.description.strip(),
            "tags": s.tags,
            "broll": s.broll,
            "idea": s.idea,
            "writer": resp.model,
        }
        paths.append(store.save(ep, store.new_path(s.title)))
    _mark_used([s.idea for s in resp.parsed_output.scripts])
    u = resp.usage
    print(f"wrote {len(paths)} scripts ({u.input_tokens} in / {u.output_tokens} out tokens)")
    return paths
