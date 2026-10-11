"""Narration: text in, one voice track out, with the time every sentence
starts — that timing drives the captions, the cuts and the callouts.

A provider either returns character timestamps with the audio
(ElevenLabs) and is given a whole section at a time, with the
neighbouring text for continuity of tone, or it does not (OpenAI) and
is given one sentence at a time so the timing is exact anyway. When
faster-whisper is installed the audio is read back and compared with
the script; a name the voice mangled is respelled phonetically and
re-recorded. Either way the stage ends with voice/vo.wav and
timeline.json, with room at the start for the title card and at the
end for the end card.
"""

import base64
import difflib
import json
import os
import re
import urllib.parse

from . import media

SECTION_GAP = 0.7        # seconds of silence between sections
SENTENCE_GAP = 0.18      # when sentences are synthesised one by one
LEAD_TITLE = 1.8         # silence before the first word under the title card
LEAD_PLAIN = 0.4
OUTRO_CARD = 4.0
OUTRO_PLAIN = 0.8


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

    def synth(self, text, out_mp3, previous_text="", next_text=""):
        url = "%s/text-to-speech/%s/with-timestamps?%s" % (
            self.base, self.voice_id,
            urllib.parse.urlencode({"output_format": "mp3_44100_128"}))
        body = {"text": text, "model_id": self.model,
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75,
                                   "style": 0.2, "speed": self.speed}}
        if previous_text:
            body["previous_text"] = previous_text[-600:]
        if next_text:
            body["next_text"] = next_text[:600]
        r = media.post_json(url, body, {"xi-api-key": self.key})
        d = json.load(r)
        with open(out_mp3, "wb") as f:
            f.write(base64.b64decode(d["audio_base64"]))
        al = d.get("alignment") or d.get("normalized_alignment") or {}
        return list(zip(al.get("characters", []),
                        al.get("character_start_times_seconds", [])))


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

    def synth(self, text, out_mp3, previous_text="", next_text=""):
        r = media.post_json("https://api.openai.com/v1/audio/speech", {
            "model": self.model, "voice": self.voice, "input": text,
            "speed": self.speed, "response_format": "mp3"},
            {"Authorization": "Bearer " + self.key})
        with open(out_mp3, "wb") as f:
            f.write(r.read())
        return None


PROVIDERS = {"elevenlabs": ElevenLabs, "openai": OpenAI}


# ---------------------------------------------------------------- pronunciation

class Pronunciation:
    """Reads the recording back with faster-whisper and names the words
    the voice did not say the way the script spells them. Quiet when
    whisper is not installed."""

    def __init__(self, mode="auto"):
        self.model = None
        self.on = False
        if mode == "off":
            return
        try:
            from faster_whisper import WhisperModel
            self.model = WhisperModel("base", device="cpu", compute_type="int8")
            self.on = True
        except Exception as e:
            if mode == "on":
                raise SystemExit("quality.pronunciation_check is on but "
                                 "faster-whisper is not usable: %s" % e)

    def heard(self, mp3):
        segments, _ = self.model.transcribe(mp3, beam_size=1)
        return " ".join(s.text for s in segments)

    def suspects(self, text, mp3):
        if not self.on:
            return []
        return suspect_words(text, self.heard(mp3))


def _words(s):
    return re.findall(r"[a-z0-9']+", s.lower())


def suspect_words(script_text, heard_text):
    """Script words whisper did not produce, when they are the kind that
    get mangled: names (capitalised) and long or unusual words."""
    sw, hw = _words(script_text), _words(heard_text)
    caps = {w.lower() for w in re.findall(r"\b[A-Z][a-zA-Z']+", script_text)}
    out = []
    for op, a0, a1, _, _ in difflib.SequenceMatcher(None, sw, hw).get_opcodes():
        if op in ("replace", "delete"):
            for w in sw[a0:a1]:
                if (w in caps or len(w) >= 7) and w not in out and not w.isdigit():
                    out.append(w)
    return out


def apply_respellings(text, respell):
    for word, say in respell.items():
        text = re.sub(r"\b%s\b" % re.escape(word), say, text, flags=re.IGNORECASE)
    return text


# ---------------------------------------------------------------- the stage

def narrate(cfg, ep, provider, llm=None):
    """script.json -> voice/vo.wav + voice/timeline.json."""
    script = ep.load("script")
    look = cfg["look"]
    vdir = ep.path("voice")
    os.makedirs(vdir, exist_ok=True)
    checker = Pronunciation(cfg["quality"]["pronunciation_check"])
    respellings = {}
    lead = LEAD_TITLE if look["title_card"] else LEAD_PLAIN
    outro = OUTRO_CARD if look["end_card"] else OUTRO_PLAIN
    pieces = [(None, lead)]
    sections = []
    t = lead
    secs = script["sections"]
    for i, sec in enumerate(secs):
        if i:
            pieces.append((None, SECTION_GAP))
            t += SECTION_GAP
        start = t
        prev_text = secs[i - 1]["narration"] if i else ""
        next_text = secs[i + 1]["narration"] if i + 1 < len(secs) else ""
        out = []
        if provider.has_timestamps:
            mp3 = os.path.join(vdir, "s%02d.mp3" % i)
            spoken = apply_respellings(sec["narration"], respellings)
            chars = provider.synth(spoken, mp3, prev_text, next_text)
            bad = checker.suspects(spoken, mp3) if checker.on else []
            if bad and llm is not None:
                from . import writing
                respellings.update(writing.respell(cfg, llm, bad))
                spoken = apply_respellings(sec["narration"], respellings)
                chars = provider.synth(spoken, mp3, prev_text, next_text)
            dur = media.duration(mp3)
            texts = [apply_respellings(x["text"], respellings) for x in sec["sentences"]]
            rel = sentence_times_from_chars(texts, chars, dur)
            for st, (a, b) in zip(sec["sentences"], rel):
                out.append(dict(st, start=t + a, end=t + b))
            pieces.append((mp3, dur))
            t += dur
        else:
            for j, st in enumerate(sec["sentences"]):
                mp3 = os.path.join(vdir, "s%02d_%03d.mp3" % (i, j))
                spoken = apply_respellings(st["text"], respellings)
                provider.synth(spoken, mp3)
                bad = checker.suspects(spoken, mp3) if checker.on else []
                if bad and llm is not None:
                    from . import writing
                    respellings.update(writing.respell(cfg, llm, bad))
                    provider.synth(apply_respellings(st["text"], respellings), mp3)
                dur = media.duration(mp3)
                out.append(dict(st, start=t, end=t + dur))
                pieces.append((mp3, dur))
                t += dur
                if j < len(sec["sentences"]) - 1:
                    pieces.append((None, SENTENCE_GAP))
                    t += SENTENCE_GAP
        sections.append({"index": i, "heading": sec["heading"],
                         "start": start, "end": t, "sentences": out})
    pieces.append((None, outro))
    t += outro
    vo = os.path.join(vdir, "vo.wav")
    concat_audio(pieces, vo)
    total = media.duration(vo)
    ep.save("voice", {"vo": "voice/vo.wav", "duration": total, "lead": lead,
                      "outro": outro, "speech_end": t - outro,
                      "respellings": respellings, "sections": sections})
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
    """Join clips and silences into one 48 kHz mono wav at a standard
    loudness (-16 LUFS, the spoken-word norm the music bed is set
    against) whatever the voice provider delivered."""
    inputs, filters, labels = [], [], []
    for k, (path, dur) in enumerate(pieces):
        if path is None:
            filters.append("anullsrc=r=%d:cl=mono:d=%.3f[a%d]" % (rate, dur, k))
        else:
            inputs += ["-i", path]
            filters.append("[%d:a]aresample=%d,aformat=channel_layouts=mono[a%d]"
                           % (len(inputs) // 2 - 1, rate, k))
        labels.append("[a%d]" % k)
    graph = ";".join(filters) + ";" + "".join(labels) + \
        "concat=n=%d:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]" % len(pieces)
    media.ffmpeg(inputs + ["-filter_complex", graph, "-map", "[out]",
                           "-ar", str(rate), "-ac", "1", out_wav])


def write_srt(tl, path):
    """Sentence captions as SRT, for uploading as a proper caption track."""
    n = 0
    lines = []
    for sec in tl["sections"]:
        for s in sec["sentences"]:
            n += 1
            lines += [str(n), "%s --> %s" % (_srt(s["start"]), _srt(s["end"])),
                      s["text"], ""]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path


def _srt(t):
    t = max(0.0, t)
    ms = int(round((t - int(t)) * 1000))
    t = int(t)
    return "%02d:%02d:%02d,%03d" % (t // 3600, t % 3600 // 60, t % 60, ms)
