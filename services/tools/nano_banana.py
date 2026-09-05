#!/usr/bin/env python3
"""Generates the services-site image set with Gemini's image model (Nano
Banana), from the prompt table in ../IMAGES.md.

Usage:
    GEMINI_API_KEY=... python3 nano_banana.py [name ...]

With no arguments it generates every image that does not already exist in
../public/img/. Pass names (e.g. `hero-desk crm-cables`) to regenerate
specific ones. Review every image by eye before committing; that rule is
older than this script.
"""
import base64
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
IMAGES_MD = HERE.parent / "IMAGES.md"
OUT_DIR = HERE.parent / "public" / "img"

MODEL = "gemini-2.5-flash-image"
GRADE = ("warm bone-white daylight interior, deep ink blue-black shadows, "
         "molten amber accent light, cinematic natural light, fine film grain, "
         "no text, no people's faces, photographic, 3:2 landscape composition")


def load_prompts():
    prompts = {}
    for line in IMAGES_MD.read_text().splitlines():
        m = re.match(r"\| `([\w-]+)\.jpg` \| [^|]+ \| ([^|]+) \|", line)
        if m:
            prompts[m.group(1)] = m.group(2).strip()
    return prompts


def generate(name, subject, key):
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{MODEL}:generateContent?key={key}")
    body = json.dumps({
        "contents": [{"parts": [{"text": f"{subject}. {GRADE}"}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }).encode()
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        payload = json.load(resp)
    for part in payload["candidates"][0]["content"]["parts"]:
        data = part.get("inlineData")
        if data and data.get("mimeType", "").startswith("image/"):
            out = OUT_DIR / f"{name}.jpg"
            out.write_bytes(base64.b64decode(data["data"]))
            print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
            return
    raise RuntimeError(f"no image in response for {name}: {payload}")


def main():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("Set GEMINI_API_KEY (the same key banana.py uses).")
    prompts = load_prompts()
    if not prompts:
        sys.exit(f"No prompt table found in {IMAGES_MD}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    wanted = sys.argv[1:] or [
        n for n in prompts if not (OUT_DIR / f"{n}.jpg").exists()]
    unknown = [n for n in wanted if n not in prompts]
    if unknown:
        sys.exit(f"Unknown image names: {unknown}. Known: {sorted(prompts)}")
    for name in wanted:
        generate(name, prompts[name], key)
    print(f"done: {len(wanted)} image(s). Now look at every one before wiring it in.")


if __name__ == "__main__":
    main()
