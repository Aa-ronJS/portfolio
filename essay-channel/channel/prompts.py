"""Every prompt the channel uses, in one place, so the voice of the
channel is edited here and nowhere else."""

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
        "'what they don't want you to know'.\n"
        "- Narration is spoken language: short sentences, concrete nouns, "
        "one idea at a time, no headings or bullet points inside narration, "
        "numbers written the way a person says them.\n"
        "- The language of the channel is '%s'."
        % (cfg["name"], cfg["niche"].strip(), cfg["language"]))


def topic(cfg, done, avoid):
    return (
        "Propose the next video for the channel. Pick a subject that fits "
        "the brief, has enough substance for about %d minutes, and is "
        "clearly different from everything already made.\n\n"
        "Already made (do not repeat or closely echo):\n%s\n\n"
        "Never pick:\n%s\n\n"
        "Give a specific working title, the angle (what the video will "
        "actually argue or explain, in two sentences), why it is worth a "
        "viewer's ten minutes, and 4-6 search terms a researcher should "
        "start with."
        % (cfg["target_minutes"],
           "\n".join("- " + t for t in done) or "- (nothing yet)",
           "\n".join("- " + t for t in avoid) or "- (no restrictions)"))


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


def script(cfg, topic, notes):
    words = int(cfg["target_minutes"] * WORDS_PER_MINUTE)
    return (
        "Write the full narration script for this video from the research "
        "notes below. Working title: %s\nAngle: %s\n\n"
        "Shape: an opening section that earns attention with a concrete, "
        "true detail (no 'in this video we will'), then 5-8 sections that "
        "each explain one thing, then a short closing section that lands "
        "the idea. About %d words of narration in total. Every claim must "
        "trace to the notes; nothing from the 'could not confirm' list.\n\n"
        "For each section give: a heading of 2-6 words (shown on screen; "
        "the opening section's heading is the video's hook, also 2-6 "
        "words), the narration (plain spoken prose, several sentences, no "
        "line breaks inside a paragraph), and 3-5 stock-footage search "
        "queries — literal, visual, 2-4 words each, naming things a camera "
        "can film ('cargo ship at port', 'hands kneading dough'), never "
        "abstract ('economics', 'the past').\n\n"
        "Also give: a final title for YouTube (under 70 characters, "
        "specific, no clickbait, no ALL CAPS), thumbnail text of at most "
        "four words, a two-to-three sentence summary for the description, "
        "a mood for the background music (one of: calm, curious, tense, "
        "upbeat, melancholy), 6-10 tags, and the sources actually used "
        "(title and URL, from the notes).\n\n"
        "RESEARCH NOTES\n%s" % (topic["title"], topic["angle"], words, notes))


SCRIPT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "thumbnail_text": {"type": "string"},
        "summary": {"type": "string"},
        "mood": {"type": "string",
                 "enum": ["calm", "curious", "tense", "upbeat", "melancholy"]},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "heading": {"type": "string"},
                    "narration": {"type": "string"},
                    "broll": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["heading", "narration", "broll"],
                "additionalProperties": False,
            },
        },
        "tags": {"type": "array", "items": {"type": "string"}},
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
    "required": ["title", "thumbnail_text", "summary", "mood", "sections",
                 "tags", "sources"],
    "additionalProperties": False,
}
