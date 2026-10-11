"""The thinking stages: pick a topic, research it, outline it (and go
back for what the outline is missing), draft, critique, revise, and
package. Every pass leaves its file in the episode folder so a script
can be read back against the critique that shaped it."""

import json

from . import prompts
from .episodes import Episode, done_titles, slugify, write_json


def pick_topic(cfg, llm, title=None, performance=None):
    """A human-given title (or the next queued one) wins; otherwise the
    model proposes one that is not already made, told how earlier
    videos performed when the analytics are there."""
    done = done_titles(cfg["_episodes"], cfg["_ledger"])
    if title is None:
        queued = [t for t in cfg["topics"]["queue"]
                  if slugify(t) not in {slugify(d) for d in done}]
        title = queued[0] if queued else None
    prompt = prompts.topic(cfg, done, cfg["topics"]["avoid"], performance)
    if title is not None:
        t = llm.json(prompts.system(cfg), prompt +
                     "\n\nThe title has already been chosen: %r. Keep it "
                     "(you may tidy punctuation) and supply the rest." % title,
                     prompts.TOPIC_SCHEMA)
        t["title"] = title
        t["chosen_by"] = "human"
    elif cfg["topics"]["generate"]:
        t = llm.json(prompts.system(cfg), prompt, prompts.TOPIC_SCHEMA)
        t["chosen_by"] = "model"
    else:
        raise SystemExit("topics.queue is empty and topics.generate is off: "
                         "nothing to make")
    slug = slugify(t["title"])
    if slug in {slugify(d) for d in done}:
        raise SystemExit("topic %r already exists as an episode" % t["title"])
    ep = Episode(cfg["_episodes"], slug)
    ep.save("topic", t)
    return ep


def research(cfg, llm, ep):
    topic = ep.load("topic")
    notes, sources = llm.research(prompts.system(cfg),
                                  prompts.research(cfg, topic),
                                  max_searches=cfg["quality"]["searches"])
    if len(notes.split()) < 150:
        raise RuntimeError("research notes came back too thin (%d words)"
                           % len(notes.split()))
    _write_notes(ep, topic, notes, sources)
    ep.save("research", {"words": len(notes.split()), "sources": sources,
                         "rounds": 1})
    return notes


def _write_notes(ep, topic, notes, sources, extra=None):
    with open(ep.path("research.md"), "w") as f:
        f.write("# %s\n\n%s\n" % (topic["title"], notes))
        if extra:
            f.write("\n## Follow-up research\n\n%s\n" % extra)
        f.write("\n## Sources read\n\n%s\n" % "\n".join(
            "- %s — %s" % (s["title"], s["url"]) for s in sources))


def notes_text(ep):
    with open(ep.path("research.md")) as f:
        return f.read()


def outline(cfg, llm, ep):
    """Plan the argument; if the plan names gaps, research them and
    fold the answers into the notes before any writing starts."""
    topic = ep.load("topic")
    o = llm.json(prompts.system(cfg), prompts.outline(cfg, topic, notes_text(ep)),
                 prompts.OUTLINE_SCHEMA)
    gaps = [g for g in o.get("gaps") or [] if g.strip()][:8]
    if gaps and cfg["quality"]["follow_up_research"]:
        extra, more = llm.research(prompts.system(cfg),
                                   prompts.research_gaps(cfg, topic, gaps),
                                   max_searches=max(4, cfg["quality"]["searches"] // 2))
        r = ep.load("research")
        seen = {s["url"] for s in r["sources"]}
        r["sources"] += [s for s in more if s["url"] not in seen]
        r["rounds"] = r.get("rounds", 1) + 1
        r["gaps"] = gaps
        with open(ep.path("research.md")) as f:
            base = f.read().split("\n## Sources read\n")[0]
        with open(ep.path("research.md"), "w") as f:
            f.write(base.rstrip() + "\n\n## Follow-up research\n\n%s\n\n"
                    "## Sources read\n\n%s\n" % (extra, "\n".join(
                        "- %s — %s" % (s["title"], s["url"]) for s in r["sources"])))
        ep.save("research", r)
        o["gaps_researched"] = True
    ep.save("outline", o)
    return o


def write_script(cfg, llm, ep):
    """Draft, then as many critique-and-revise rounds as configured,
    then package. The final script carries its last critique scores."""
    topic = ep.load("topic")
    o = ep.load("outline")
    notes = notes_text(ep)
    system = prompts.system(cfg)
    s = tidy_script(llm.json(system, prompts.draft(cfg, topic, o, notes),
                             prompts.SCRIPT_SCHEMA))
    write_json(ep.path("draft.json"), s)
    history = []
    for rnd in range(int(cfg["quality"]["passes"])):
        c = llm.json(system, prompts.critique(cfg, _dump(s), notes),
                     prompts.CRITIQUE_SCHEMA)
        history.append(c)
        avg = sum(c["scores"].values()) / len(c["scores"])
        if avg >= 4.7 and not c["unsupported"]:
            break
        s = tidy_script(llm.json(system, prompts.revise(cfg, _dump(s), _dump(c), notes),
                                 prompts.SCRIPT_SCHEMA))
        s = drop_unsupported(s, c["unsupported"])
    write_json(ep.path("critique.json"), {"rounds": history})
    p = llm.json(system, prompts.package(cfg, _dump(s)), prompts.PACKAGE_SCHEMA)
    titles = [" ".join(t.split()) for t in p["titles"] if t.strip()]
    s["title"] = (titles[0] if titles else s["title"])[:100]
    s["alternate_titles"] = titles[1:5]
    s["thumbnail_text"] = " ".join(p["thumbnail_text"].split())[:40]
    s["summary"] = " ".join(p["summary"].split())
    s["tags"] = [t.strip() for t in p.get("tags") or [] if t.strip()][:15]
    s["scores"] = history[-1]["scores"] if history else {}
    ep.save("script", s)
    return s


def _dump(d):
    return json.dumps(d, indent=1, ensure_ascii=False)


def tidy_script(s):
    """Normalise what the model gave us so the later stages can rely on
    it: clean whitespace, drop empty sentences, derive narration text."""
    s["title"] = " ".join(str(s.get("title") or "").split())[:100]
    sections = []
    for sec in s["sections"]:
        sentences = []
        for st in sec["sentences"]:
            text = " ".join(str(st.get("text") or "").split())
            if not text:
                continue
            sentences.append({
                "text": text,
                "visual": " ".join(str(st.get("visual") or "").split())[:60],
                "alt_visual": " ".join(str(st.get("alt_visual") or "").split())[:60],
                "callout": " ".join(str(st.get("callout") or "").split())[:40],
            })
        if not sentences:
            continue
        sections.append({
            "heading": " ".join(str(sec["heading"]).split())[:60],
            "sentences": sentences,
            "narration": " ".join(x["text"] for x in sentences),
        })
    if len(sections) < 2:
        raise RuntimeError("script has fewer than two sections")
    s["sections"] = sections
    s["words"] = sum(len(x["narration"].split()) for x in sections)
    s.setdefault("sources", [])
    return s


def drop_unsupported(s, unsupported):
    """A sentence the critic listed as unsupported that survived the
    revision verbatim is cut; accuracy outranks flow."""
    bad = {" ".join(u.split()).lower() for u in unsupported}
    if not bad:
        return s
    for sec in s["sections"]:
        sec["sentences"] = [x for x in sec["sentences"]
                            if x["text"].lower() not in bad] or sec["sentences"][:1]
        sec["narration"] = " ".join(x["text"] for x in sec["sentences"])
    s["words"] = sum(len(x["narration"].split()) for x in s["sections"])
    return s


def respell(cfg, llm, words):
    r = llm.json(prompts.system(cfg), prompts.respell(words), prompts.RESPELL_SCHEMA)
    return {x["word"]: x["say"] for x in r.get("respellings", []) if x.get("say")}
