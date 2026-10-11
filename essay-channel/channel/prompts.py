"""Every prompt the channel uses, in one place, so the voice of the
channel is edited here and nowhere else.

The writing is several passes, the way a good editor works: an outline
that names what the video argues and what it still needs to know, a
draft, a critique against a fixed rubric, a revision that must answer
the critique, and a packaging pass for the title. Each pass is a
separate call with a schema, so a weak step cannot hide inside a
long answer.
"""

WORDS_PER_MINUTE = 150


def system(cfg):
    return (
        "You write for a YouTube channel called %s.\n\n"
        "The channel's brief:\n%s\n\n"
        "Standards that outrank everything else:\n"
        "- Accuracy. Every factual claim in a script must come from the "
        "research notes and be attributable to a source. If the research "
        "does not support a claim, leave it out or say plainly that it is "
        "uncertain. Never invent numbers, quotes, dates or names.\n"
        "- Honesty over drama. No clickbait, no manufactured outrage, no "
        "'what they don't want you to know', no rhetorical questions as "
        "filler.\n"
        "- Narration is spoken language: short sentences, concrete nouns, "
        "one idea per sentence, no headings or bullet points inside "
        "narration, numbers written the way a person says them.\n"
        "- Specific beats general, always. A number, a name, a date, a "
        "mechanism, a place. Cut any sentence that could appear in a "
        "video about a different subject.\n"
        "- The language of the channel is '%s'."
        % (cfg["name"], cfg["niche"].strip(), cfg["language"]))


# ---------------------------------------------------------------- topic

def topic(cfg, done, avoid, performance=None):
    perf = ""
    if performance:
        perf = ("\n\nHow earlier videos did (average percentage of the video "
                "watched, and views). Learn from the pattern — what subjects "
                "and angles hold attention — without copying a subject:\n%s"
                % "\n".join("- %s: watched %s%%, %s views" % (
                    p["title"], p.get("avg_view_pct", "?"), p.get("views", "?"))
                    for p in performance))
    return (
        "Propose the next video for the channel. Pick a subject that fits "
        "the brief, has enough substance for about %d minutes, has a "
        "genuine question at its centre (something a curious person does "
        "not already know the answer to), and is clearly different from "
        "everything already made.\n\n"
        "Already made (do not repeat or closely echo):\n%s\n\n"
        "Never pick:\n%s%s\n\n"
        "Give a specific working title, the angle (what the video will "
        "actually argue or explain, in two sentences), why it is worth a "
        "viewer's ten minutes, and 4-6 search terms a researcher should "
        "start with."
        % (cfg["target_minutes"],
           "\n".join("- " + t for t in done) or "- (nothing yet)",
           "\n".join("- " + t for t in avoid) or "- (no restrictions)", perf))


TOPIC_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "angle": {"type": "string"},
        "why": {"type": "string"},
        "search_terms": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["title", "angle", "why", "search_terms"],
    "additionalProperties": False,
}


# ---------------------------------------------------------------- research

def research(cfg, topic):
    return (
        "Research this video thoroughly using web search and web fetch. "
        "Working title: %s\nAngle: %s\nStart with these search terms: %s\n\n"
        "Read primary and reputable secondary sources (official bodies, "
        "standards documents, manufacturers, academic or museum pages, "
        "established journalism). Prefer two independent sources for any "
        "number. Then write research notes for a scriptwriter:\n"
        "1. A one-paragraph summary of the story the video should tell.\n"
        "2. The facts, grouped by theme, each with its source URL in "
        "brackets after it. Include specific numbers, dates, names and "
        "mechanisms — the concrete detail is what makes the video.\n"
        "3. Common misconceptions the video should correct, with sources.\n"
        "4. Anything you could not confirm, listed separately so the "
        "writer does not use it.\n"
        "5. A sources list: URL and a short title for each.\n"
        "Write in plain prose and lists; this is working material, not a "
        "script." % (topic["title"], topic["angle"],
                     ", ".join(topic.get("search_terms") or [])))


def research_gaps(cfg, topic, gaps):
    return (
        "You already researched the video %r. The outline found gaps. Use "
        "web search and web fetch to answer these specifically:\n%s\n\n"
        "Write additional research notes in the same form as before — "
        "facts with source URLs in brackets, a 'could not confirm' list, "
        "and the new sources. Only what is new; do not repeat the earlier "
        "notes." % (topic["title"], "\n".join("- " + g for g in gaps)))


# ---------------------------------------------------------------- outline

def outline(cfg, topic, notes):
    return (
        "Plan the video %r (angle: %s) from the research notes below.\n\n"
        "Decide: the one question the whole video answers (the "
        "through-line); the hook — the single most surprising concrete, "
        "true detail in the notes, which the video opens on; a sequence of "
        "5-8 sections, each with a 2-6 word heading, its job in the "
        "argument, and the specific facts (with source URLs) it will use; "
        "the payoff — the idea the ending lands. Then list the gaps: "
        "specific factual questions the notes do not answer that the plan "
        "needs (a number, a date, how a mechanism works). Be precise; the "
        "gaps go straight back to a researcher. An empty list is fine.\n\n"
        "RESEARCH NOTES\n%s" % (topic["title"], topic["angle"], notes))


OUTLINE_SCHEMA = {
    "type": "object",
    "properties": {
        "through_line": {"type": "string"},
        "hook": {"type": "string"},
        "payoff": {"type": "string"},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "heading": {"type": "string"},
                    "job": {"type": "string"},
                    "facts": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["heading", "job", "facts"],
                "additionalProperties": False,
            },
        },
        "gaps": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["through_line", "hook", "payoff", "sections", "gaps"],
    "additionalProperties": False,
}


# ---------------------------------------------------------------- script

SENTENCE_RULES = (
    "Give the narration as a list of sentences. For every sentence give "
    "`visual`: a literal 2-4 word stock-footage query naming something a "
    "camera can film that matches what the sentence is about ('cargo "
    "ship at port', 'hands kneading dough', 'old map close up'), never "
    "abstract ('economics', 'the past'); consecutive sentences about the "
    "same thing should share the same visual so the shot holds. Give "
    "`alt_visual`: a different literal query for the same idea, used if "
    "the first finds nothing. Give `callout`: text to put on screen for "
    "this sentence — a number with its unit, a name, a date, or a "
    "three-word phrase — only when it is the sentence's point; otherwise "
    "an empty string. At most one callout in three sentences.")


def draft(cfg, topic, outline, notes):
    words = int(cfg["target_minutes"] * WORDS_PER_MINUTE)
    return (
        "Write the full narration script for %r from this outline and the "
        "research notes. About %d words of narration in total.\n\n"
        "OUTLINE\n%s\n\n"
        "Shape: the opening section starts on the hook — a concrete, true "
        "detail in the first sentence, no 'in this video', no greeting — "
        "and within three sentences poses the question the video answers. "
        "Each section does its job from the outline and ends with a turn "
        "that makes the next section necessary. The closing section lands "
        "the payoff in under 60 words and stops; no 'thanks for watching', "
        "no 'subscribe'. Every claim must trace to the notes; nothing from "
        "any 'could not confirm' list. Vary sentence length; say numbers "
        "the way a person does ('about two million', 'nineteen fifty six').\n\n"
        "%s\n\nAlso give a working title, a mood for the background music "
        "(calm, curious, tense, upbeat or melancholy), and the sources "
        "used (title and URL, from the notes).\n\n"
        "RESEARCH NOTES\n%s"
        % (topic["title"], words, _outline_text(outline), SENTENCE_RULES, notes))


def _outline_text(o):
    out = ["Through-line: " + o["through_line"], "Hook: " + o["hook"],
           "Payoff: " + o["payoff"]]
    for i, s in enumerate(o["sections"], 1):
        out.append("%d. %s — %s" % (i, s["heading"], s["job"]))
        for f in s["facts"]:
            out.append("   - " + f)
    return "\n".join(out)


SCRIPT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "mood": {"type": "string",
                 "enum": ["calm", "curious", "tense", "upbeat", "melancholy"]},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "heading": {"type": "string"},
                    "sentences": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "visual": {"type": "string"},
                                "alt_visual": {"type": "string"},
                                "callout": {"type": "string"},
                            },
                            "required": ["text", "visual", "alt_visual", "callout"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["heading", "sentences"],
                "additionalProperties": False,
            },
        },
        "sources": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"title": {"type": "string"},
                               "url": {"type": "string"}},
                "required": ["title", "url"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "mood", "sections", "sources"],
    "additionalProperties": False,
}


RUBRIC = (
    "Score each 1-5 and say exactly what to change:\n"
    "- hook: the first three sentences present a specific, surprising, true "
    "detail and raise the video's question. 5 = a viewer who clicked by "
    "accident would stay.\n"
    "- through_line: one question runs through every section and the "
    "ending answers it.\n"
    "- concreteness: numbers, names, dates, mechanisms; no sentence that "
    "could appear in a video about something else.\n"
    "- support: every factual claim is in the research notes. List every "
    "sentence that is not, verbatim, in `unsupported`.\n"
    "- spoken: sounds like a person talking, not an essay read aloud; no "
    "'furthermore', no lists, no rhetorical questions as filler.\n"
    "- pacing: sentence length varies; no section runs over about 220 "
    "words; something changes every 60-90 seconds.\n"
    "- payoff: the ending lands an idea the viewer did not have at the "
    "start, then stops.\n"
    "- visuals: the visual queries are literal and filmable, and the "
    "callouts are the sentences' actual points.")


def critique(cfg, script_json, notes):
    return (
        "You are the channel's toughest editor. Critique this script "
        "against the rubric. Be specific: quote the sentences you mean and "
        "say what replaces them. Then give the three edits that would most "
        "improve the video, in order.\n\n%s\n\nSCRIPT\n%s\n\n"
        "RESEARCH NOTES (the only allowed source of facts)\n%s"
        % (RUBRIC, script_json, notes))


CRITIQUE_SCHEMA = {
    "type": "object",
    "properties": {
        "scores": {
            "type": "object",
            "properties": {k: {"type": "integer", "minimum": 1, "maximum": 5}
                           for k in ["hook", "through_line", "concreteness",
                                     "support", "spoken", "pacing", "payoff",
                                     "visuals"]},
            "required": ["hook", "through_line", "concreteness", "support",
                         "spoken", "pacing", "payoff", "visuals"],
            "additionalProperties": False,
        },
        "notes": {"type": "string"},
        "unsupported": {"type": "array", "items": {"type": "string"}},
        "top_edits": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["scores", "notes", "unsupported", "top_edits"],
    "additionalProperties": False,
}


def revise(cfg, script_json, critique, notes):
    words = int(cfg["target_minutes"] * WORDS_PER_MINUTE)
    return (
        "Revise the script to answer this critique. Keep what works; "
        "rewrite what it faults. Every sentence listed as unsupported must "
        "be removed or replaced by one the notes support. Keep the total "
        "near %d words. Return the complete script in the same form.\n\n"
        "%s\n\nCRITIQUE\n%s\n\nSCRIPT\n%s\n\nRESEARCH NOTES\n%s"
        % (words, SENTENCE_RULES, critique, script_json, notes))


def package(cfg, script_json):
    return (
        "Package this finished script for YouTube.\n\n"
        "Titles: write five candidates, then choose the best. A good title "
        "is specific and true, names the concrete thing, creates a "
        "question the video answers, is under 60 characters, and has no "
        "ALL CAPS, no exclamation marks, no 'you won't believe'. Put the "
        "best first in `titles`.\n"
        "Thumbnail text: at most four words, the hook as a reader sees it "
        "from across a room; not the title repeated.\n"
        "Summary: two or three sentences for the description, written "
        "for a person deciding whether to watch.\n"
        "Tags: 8-12 search terms a viewer would actually type.\n\n"
        "SCRIPT\n%s" % script_json)


PACKAGE_SCHEMA = {
    "type": "object",
    "properties": {
        "titles": {"type": "array", "items": {"type": "string"},
                   "minItems": 1},
        "thumbnail_text": {"type": "string"},
        "summary": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["titles", "thumbnail_text", "summary", "tags"],
    "additionalProperties": False,
}


# ---------------------------------------------------------------- vision

def pick_footage(shots):
    """`shots` is [(sentence text, number of candidate images)]; the images
    follow in the same order, each labelled."""
    lines = []
    for i, (text, n) in enumerate(shots):
        lines.append("Shot %d — narration: \"%s\" — candidates %d" % (i, text, n))
    return (
        "You are picking stock footage for a video essay. For each shot, "
        "the narration is given and its candidate frames follow, each "
        "labelled with the shot and candidate number. Choose the candidate "
        "that best shows what the narration is about — literal subject "
        "first, then mood and quality (sharp, well lit, no visible text or "
        "logos, no watermark, not a talking head). Give a match score 1-5. "
        "If no candidate fits (score would be 1), answer candidate 0 so a "
        "different search is tried.\n\n%s" % "\n".join(lines))


PICK_SCHEMA = {
    "type": "object",
    "properties": {
        "picks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "shot": {"type": "integer"},
                    "candidate": {"type": "integer"},
                    "score": {"type": "integer", "minimum": 1, "maximum": 5},
                },
                "required": ["shot", "candidate", "score"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["picks"],
    "additionalProperties": False,
}


def pick_thumbnail(n):
    return (
        "These %d frames are candidates for a YouTube thumbnail that will "
        "carry a few large words. Choose the frame with the clearest single "
        "subject, strong contrast, and room for text in the lower third; "
        "avoid frames with text, logos, faces mid-expression, or motion "
        "blur. Answer the frame number (1-%d)." % (n, n))


THUMB_SCHEMA = {
    "type": "object",
    "properties": {"frame": {"type": "integer"}, "why": {"type": "string"}},
    "required": ["frame", "why"],
    "additionalProperties": False,
}


def review(shots):
    lines = ["Shot %d — narration: \"%s\"" % (i, t) for i, t in enumerate(shots)]
    return (
        "You are the final viewer before this video essay is published. "
        "For each shot you get the frame on screen and the narration heard "
        "over it. Rate how well the picture matches the words (1-5). Then "
        "judge the whole: would a demanding viewer who likes this kind of "
        "video keep watching, and what is wrong — mismatched footage, a "
        "weak opening, repetition, anything that looks cheap. Give an "
        "overall score 1-5 and a verdict: 'publish' if it meets the bar of "
        "a well-made channel, 'hold' if a person should look first.\n\n%s"
        % "\n".join(lines))


REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "shots": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"shot": {"type": "integer"},
                               "match": {"type": "integer", "minimum": 1, "maximum": 5}},
                "required": ["shot", "match"],
                "additionalProperties": False,
            },
        },
        "overall": {"type": "integer", "minimum": 1, "maximum": 5},
        "issues": {"type": "array", "items": {"type": "string"}},
        "verdict": {"type": "string", "enum": ["publish", "hold"]},
    },
    "required": ["shots", "overall", "issues", "verdict"],
    "additionalProperties": False,
}


def respell(words):
    return (
        "A text-to-speech voice mispronounced these words or names. For "
        "each, give a phonetic respelling in ordinary letters that the "
        "voice will read correctly (for example 'Nguyen' -> 'Nwin', "
        "'Worcestershire' -> 'Wuster-sher'). Keep capitalisation for "
        "names.\n\n%s" % "\n".join("- " + w for w in words))


RESPELL_SCHEMA = {
    "type": "object",
    "properties": {
        "respellings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"word": {"type": "string"},
                               "say": {"type": "string"}},
                "required": ["word", "say"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["respellings"],
    "additionalProperties": False,
}
