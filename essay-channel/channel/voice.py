"""Narration: text in, one voice track out, with the time every sentence
starts — that timing drives the captions and the b-roll cuts.

A provider either returns character timestamps with the audio
(ElevenLabs) and is given a whole section at a time, or it does not
(OpenAI) and is given one sentence at a time so the timing is exact
anyway. Either way the stage ends with voice/vo.wav and timeline.json.
"""

import base64
import json
import os
import urllib.parse

from . import media

SECTION_GAP = 0.7        # seconds of silence between sections
SENTENCE_GAP = 0.18      # when sentences are synthesised one by one


class ElevenLabs:
    has_timestamps = True
    base = "https://api.elevenlabs.io/v1"

    def __init__(self, cfg):
        self.key = os.environ.get("ELEVENLABS_API_KEY")
        if not self.key:
            raise SystemExit("voice.provider is elevenlabs: set ELEVENLABS_API_KEY")
        self.model = cfg["voice"].get("model") or "eleven_multilingual_v2"
        self.speed = float(cfg["voice"].get("speed") or 1.0)
        self.voice_id = self._resolve(cfg["voice"].get("voice") or "Rachel")

    def _resolve(self, name):
        if len(name) >= 20 and " " not in name:
            return name                              # already an id
        d = media.get_json(self.base + "/voices", {"xi-api-key": self.key})
        for v in d.get("voices", []):
            if v["name"].lower() == name.lower():
                return v["voice_id"]
        raise SystemExit("ElevenLabs has no voice called %r (available: %s)" % (
            name, ", ".join(v["name"] for v in d.get("voices", []))))

    def synth(self, text, out_mp3):
        url = "%s/text-to-speech/%s/with-timestamps?%s" % (
            self.base, self.voice_id,
            urllib.parse.urlencode({"output_format": "mp3_44100_128"}))
        r = media.post_json(url, {
            "text": text, "model_id": self.model,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75,
                               "speed": self.speed}},
            {"xi-api-key": self.key})
        d = json.load(r)
        with open(out_mp3, "wb") as f:
            f.write(base64.b64decode(d["audio_base64"]))
        al = d.get("alignment") or d.get("normalized_alignment") or {}
        chars = list(zip(al.get("characters", []),
                         al.get("character_start_times_seconds", [])))
        return chars


class OpenAI:
    has_timestamps = False

    def __init__(self, cfg):
        self.key = os.environ.get("OPENAI_API_KEY")
        if not self.key:
            raise SystemExit("voice.provider is openai: set OPENAI_API_KEY")
        self.voice = cfg["voice"].get("voice") or "alloy"
        self.model = cfg["voice"].get("model") or "gpt-4o-mini-tts"
        if self.model.startswith("eleven"):
            self.model = "gpt-4o-mini-tts"
        self.speed = float(cfg["voice"].get("speed") or 1.0)

    def synth(self, text, out_mp3):
        r = media.post_json("https://api.openai.com/v1/audio/speech", {
            "model": self.model, "voice": self.voice, "input": text,
            "speed": self.speed, "response_format": "mp3"},
            {"Authorization": "Bearer " + self.key})
        with open(out_mp3, "wb") as f:
            f.write(r.read())
        return None


PROVIDERS = {"elevenlabs": ElevenLabs, "openai": OpenAI}


def narrate(cfg, ep, provider):
    """script.json -> voice/vo.wav + voice/timeline.json."""
    script = ep.load("script")
    vdir = ep.path("voice")
    os.makedirs(vdir, exist_ok=True)
    pieces = []          # (path, duration) in order, gaps as (None, secs)
    sections = []
    t = 0.0
    for i, sec in enumerate(script["sections"]):
        if i:
            pieces.append((None, SECTION_GAP))
            t += SECTION_GAP
        start = t
        sentences = []
        if provider.has_timestamps:
            mp3 = os.path.join(vdir, "s%02d.mp3" % i)
            chars = provider.synth(sec["narration"], mp3)
            dur = media.duration(mp3)
            rel = sentence_times_from_chars(sec["sentences"], chars, dur)
            for s, (a, b) in zip(sec["sentences"], rel):
                sentences.append({"text": s, "start": t + a, "end": t + b})
            pieces.append((mp3, dur))
            t += dur
        else:
            for j, s in enumerate(sec["sentences"]):
                mp3 = os.path.join(vdir, "s%02d_%03d.mp3" % (i, j))
                provider.synth(s, mp3)
                dur = media.duration(mp3)
                sentences.append({"text": s, "start": t, "end": t + dur})
                pieces.append((mp3, dur))
                t += dur
                if j < len(sec["sentences"]) - 1:
                    pieces.append((None, SENTENCE_GAP))
                    t += SENTENCE_GAP
        sections.append({"index": i, "heading": sec["heading"],
                         "start": start, "end": t, "broll": sec["broll"],
                         "sentences": sentences})
    vo = os.path.join(vdir, "vo.wav")
    concat_audio(pieces, vo)
    total = media.duration(vo)
    ep.save("voice", {"vo": "voice/vo.wav", "duration": total,
                      "sections": sections})
    return ep.load("voice")


def sentence_times_from_chars(sentences, chars, total):
    """Walk the provider's character alignment along the sentences; fall
    back to a proportional split when the alignment is missing or short."""
    if not chars or len(chars) < sum(len(s) for s in sentences) * 0.8:
        return proportional(sentences, total)
    times, pos, out = [c[1] for c in chars], 0, []
    text = "".join(c[0] for c in chars)
    for s in sentences:
        idx = text.find(s[:20], pos)
        if idx < 0:
            return proportional(sentences, total)
        start = times[idx]
        end_idx = min(idx + len(s) - 1, len(times) - 1)
        out.append([start, times[end_idx]])
        pos = end_idx
    for k in range(len(out) - 1):          # a sentence ends where the next starts
        out[k][1] = max(out[k][1], out[k + 1][0])
    out[-1][1] = total
    return out


def proportional(sentences, total):
    n = sum(len(s) for s in sentences) or 1
    out, t = [], 0.0
    for s in sentences:
        d = total * len(s) / n
        out.append([t, t + d])
        t += d
    return out


def concat_audio(pieces, out_wav, rate=48000):
    """Join clips and silences into one 48 kHz mono wav."""
    inputs, filters, labels = [], [], []
    for k, (path, dur) in enumerate(pieces):
        if path is None:
            filters.append("anullsrc=r=%d:cl=mono:d=%.3f[a%d]" % (rate, dur, k))
        else:
            inputs += ["-i", path]
            filters.append("[%d:a]aresample=%d,aformat=channel_layouts=mono[a%d]"
                           % (len(inputs) // 2 - 1, rate, k))
        labels.append("[a%d]" % k)
    # one loudness for every episode whatever the voice provider does:
    # -16 LUFS is the spoken-word norm and what the music bed is set against
    graph = ";".join(filters) + ";" + "".join(labels) + \
        "concat=n=%d:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]" % len(pieces)
    media.ffmpeg(inputs + ["-filter_complex", graph, "-map", "[out]",
                           "-ar", str(rate), "-ac", "1", out_wav])
