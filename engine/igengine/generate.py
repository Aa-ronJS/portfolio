"""Turn a market's format template into a content packet.

A packet is everything downstream steps need: hook, per-beat on-screen text,
voiceover lines, image prompts, caption, hashtags, and the DM keyword CTA.
With ANTHROPIC_API_KEY present this is written by Claude against the market
config and the ledger of recent hooks (so the engine never repeats itself);
without a key it falls back to a deterministic offline template so the
pipeline still runs end to end.
"""

import json
import os
import random

from . import ledger

SYSTEM = """You write short-form vertical video scripts that stop the scroll.
Rules you never break:
- The first line (hook) must create an open loop or a concrete stake in under 12 words.
- Every claim must be specific: real numbers, real tool names, real mechanisms. No filler.
- 5 to 7 beats. Each beat: on-screen text under 12 words, a voiceover line under 22 words
  that says MORE than the on-screen text, and an image prompt (photographic, no text in image).
- Never promise medical, financial, or legal outcomes. Frame as information, not advice.
- The final beat is the CTA using the exact DM keyword given.
Respond with ONLY a JSON object: {"hook": str, "beats": [{"text": str, "voiceover": str,
"image_prompt": str}], "caption": str, "hashtags": [str, ...]} — caption under 500 chars,
first line of caption repeats the hook, 3-5 mid-size hashtags (no #fyp-style spam)."""


def _claude_packet(cfg, market, fmt, recent_hooks):
    import anthropic

    client = anthropic.Anthropic()
    prompt = (
        f"Market audience: {market['audience']}\n"
        f"Editorial angle: {market['angle']}\n"
        f"Format to execute: {fmt['name']} — {fmt['pattern']}\n"
        f"DM keyword for the CTA beat: {market['dm_keyword']} "
        f"(they get: {market['lead_magnet']})\n"
        f"Hooks already used, do not resemble any of these: {recent_hooks or 'none yet'}\n"
        "Write one packet."
    )
    response = client.beta.messages.create(
        model=cfg["engine"]["model"],
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError(f"model declined: {response.stop_details}")
    text = next(b.text for b in response.content if b.type == "text")
    start, end = text.index("{"), text.rindex("}") + 1
    return json.loads(text[start:end])


def _offline_packet(market, fmt):
    """Deterministic stand-in so the pipeline runs without an API key."""
    kw = market["dm_keyword"]
    beats = [
        {"text": f"[{fmt['name']}] draft beat {i + 1}",
         "voiceover": f"Offline draft voiceover for beat {i + 1} of the {fmt['name']} format.",
         "image_prompt": f"abstract editorial photograph, mood {i + 1}, no text"}
        for i in range(4)
    ]
    beats.append({
        "text": f"Comment {kw} for {market['lead_magnet']}",
        "voiceover": f"Comment the word {kw} and I'll send you {market['lead_magnet']}.",
        "image_prompt": "clean closing frame, soft gradient, no text",
    })
    return {
        "hook": f"Offline draft: {fmt['name']} for {market['key']}",
        "beats": beats,
        "caption": f"Offline draft packet — set ANTHROPIC_API_KEY for real scripts.\nComment {kw}.",
        "hashtags": [f"#{market['key']}"],
    }


def make_packet(cfg, market, run_id):
    fmt = random.choice(market["formats"])
    recent = ledger.recent_hooks(market["key"], limit=20)
    if os.environ.get("ANTHROPIC_API_KEY"):
        packet = _claude_packet(cfg, market, fmt, recent)
        source = "claude"
    else:
        packet = _offline_packet(market, fmt)
        source = "offline"
    packet.update(market=market["key"], format=fmt["name"],
                  dm_keyword=market["dm_keyword"], run_id=run_id, source=source)
    return packet
