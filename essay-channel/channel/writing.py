"""The three thinking stages: pick a topic, research it, write the script."""

import re

from . import prompts
from .episodes import Episode, done_titles, slugify


def pick_topic(cfg, llm, title=None):
    """A human-given title (or the next queued one) wins; otherwise the
    model proposes one that is not already made."""
    done = done_titles(cfg["_episodes"], cfg["_ledger"])
    if title is None:
        queued = [t for t in cfg["topics"]["queue"]
                  if slugify(t) not in {slugify(d) for d in done}]
        title = queued[0] if queued else None
    if title is not None:
        t = llm.json(prompts.system(cfg),
                     prompts.topic(cfg, done, cfg["topics"]["avoid"]) +
                     "\n\nThe title has already been chosen: %r. Keep it "
                     "(you may tidy punctuation) and supply the rest." % title,
                     prompts.TOPIC_SCHEMA)
        t["title"] = title
        t["chosen_by"] = "human"
    elif cfg["topics"]["generate"]:
        t = llm.json(prompts.system(cfg),
                     prompts.topic(cfg, done, cfg["topics"]["avoid"]),
                     prompts.TOPIC_SCHEMA)
        t["chosen_by"] = "model"
    else:
        raise SystemExit("topics.queue is empty and topics.generate is off: "
                         "nothing to make")
    slug = slugify(t["title"])
    taken = {e for e in done_titles(cfg["_episodes"], cfg["_ledger"])}
    if slug in {slugify(d) for d in taken}:
        raise SystemExit("topic %r already exists as an episode" % t["title"])
    ep = Episode(cfg["_episodes"], slug)
    ep.save("topic", t)
    return ep


def research(cfg, llm, ep):
    topic = ep.load("topic")
    notes, sources = llm.research(prompts.system(cfg),
                                  prompts.research(cfg, topic))
    if len(notes.split()) < 150:
        raise RuntimeError("research notes came back too thin (%d words)"
                           % len(notes.split()))
    with open(ep.path("research.md"), "w") as f:
        f.write("# %s\n\n%s\n\n## Sources read\n\n%s\n" % (
            topic["title"], notes,
            "\n".join("- %s — %s" % (s["title"], s["url"]) for s in sources)))
    ep.save("research", {"words": len(notes.split()), "sources": sources})
    return notes


def write_script(cfg, llm, ep):
    topic = ep.load("topic")
    with open(ep.path("research.md")) as f:
        notes = f.read()
    s = llm.json(prompts.system(cfg), prompts.script(cfg, topic, notes),
                 prompts.SCRIPT_SCHEMA)
    s = tidy_script(s)
    ep.save("script", s)
    return s


def tidy_script(s):
    """Normalise what the model gave us so the later stages can rely on it."""
    s["title"] = " ".join(s["title"].split())[:100]
    s["thumbnail_text"] = " ".join(s["thumbnail_text"].split())[:40]
    sections = []
    for sec in s["sections"]:
        narration = " ".join(str(sec["narration"]).split())
        if not narration:
            continue
        sections.append({
            "heading": " ".join(str(sec["heading"]).split())[:60],
            "narration": narration,
            "sentences": split_sentences(narration),
            "broll": [" ".join(str(q).split()) for q in sec["broll"] if str(q).strip()][:6],
        })
    if len(sections) < 2:
        raise RuntimeError("script has fewer than two sections")
    s["sections"] = sections
    s["words"] = sum(len(x["narration"].split()) for x in sections)
    s["tags"] = [t.strip() for t in s.get("tags") or [] if t.strip()][:15]
    return s


_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[\"'(\[]?[A-Z0-9])")


def split_sentences(text):
    parts = [p.strip() for p in _SPLIT.split(text) if p.strip()]
    out = []
    for p in parts:               # glue very short fragments to the previous
        if out and len(p) < 12 and len(out[-1]) + len(p) < 90:
            out[-1] += " " + p
        else:
            out.append(p)
    return out
