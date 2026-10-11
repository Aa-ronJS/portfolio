"""The review council: five fixed seats and a chair, applied to every
decision that shapes a video — which subject, which title and
thumbnail text, and whether a script is good enough. One structured
call per decision; the seats' scores and the chair's reasons are kept
in the episode folder so a weak choice can be read back later.
"""

from . import prompts


def _avg(seats):
    return round(sum(seats.values()) / len(seats), 2)


def rank(llm, cfg, kind, candidates, prompt, schema=None):
    """Run the council over a list of candidates. Returns a record with
    the ranking (highest first), the chosen index, and the chair's
    reasons; `chosen` is always a valid index."""
    schema = schema or prompts.RANK_SCHEMA
    r = llm.json(prompts.council_system(cfg), prompt, schema)
    valid = set(range(len(candidates)))
    ranking = [x for x in r.get("ranking", []) if x.get("candidate") in valid]
    for x in ranking:
        x["avg"] = _avg(x["seats"])
    ranking.sort(key=lambda x: -x["avg"])
    chosen = r.get("chosen")
    if chosen not in valid:
        chosen = ranking[0]["candidate"] if ranking else 0
    rec = {"kind": kind, "chosen": chosen, "why": r.get("why", ""),
           "fix": r.get("fix", ""), "ranking": ranking}
    for k in ("thumbnail",):
        if k in r:
            rec[k] = r[k]
    return rec


def choose_subject(llm, cfg, candidates):
    rec = rank(llm, cfg, "subject", candidates,
               prompts.council_subjects(cfg, candidates))
    rec["candidates"] = candidates
    return rec


def judge_script(llm, cfg, script_json, notes):
    r = llm.json(prompts.council_system(cfg),
                 prompts.council_script(cfg, script_json, notes),
                 prompts.COUNCIL_CRITIQUE_SCHEMA)
    r["avg"] = _avg(r["scores"])
    return r


def choose_package(llm, cfg, summary, titles, texts):
    rec = rank(llm, cfg, "package", titles,
               prompts.council_package(cfg, summary, titles, texts),
               prompts.PACKAGE_PICK_SCHEMA)
    t = rec.get("thumbnail")
    if not isinstance(t, int) or not 0 <= t < len(texts):
        t = 0
    rec["thumbnail"] = t
    rec["titles"] = titles
    rec["thumbnail_texts"] = texts
    return rec
