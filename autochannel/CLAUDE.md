# autochannel — notes for Claude sessions

Automated YouTube channel narrated in Aaron's cloned voice, built to run
on almost nothing. User docs: `README.md`. This is a separate project
from `animation-pipeline/`. That project's "never add voice synthesis"
rule is about those cartoons and does not apply here; equally, nothing
here should be pulled into the pipeline.

## Flow

`python -m ac daily` (GitHub Actions cron, `workflow/daily.yml`):
`write.py` tops up `queue/` (one Claude call, structured output, reads
`channel/RULES.md` + `IDEAS.md` + titles already made) → `voice.py`
(Pocket TTS, sentence by sentence, loudnorm -14 LUFS) → `captions.py`
(faster-whisper word times mapped back onto the script text) →
`render.py` (Pexels b-roll or gradient fallback, ASS captions via
libass, one ffmpeg mux) → `upload.py` (resumable, reads privacy back) →
episode yaml moves to `posted/`.

## Decisions not to undo

- **Voice = Pocket TTS with an exported `.safetensors` state.** The
  cloning model is gated on Hugging Face; the exported state loads into
  the public model, so CI needs no HF login. The state is tied to the
  weights: `voice.language` and the `pocket-tts` pin move together, and
  the voice must be re-exported after either changes.
  Rejected: XTTS-v2 and F5-TTS weights are non-commercial; Chatterbox
  wants a GPU for sane speed. Pocket TTS ran 27 s of speech in ~15 s on
  4 vCPU (measured 2026-11-18).
- **Degrade, don't fail:** no footage → gradient; writer down → post
  from the queue; one episode broken → try the next, retire after 3.
- **faster-whisper gets numpy audio decoded by ffmpeg**, never a path:
  its PyAV decoder broke on a version drift (`metadata_errors` kwarg).
- **`containsSyntheticMedia` stays true.** Policy, not taste.
- The voice file and Google client secrets never enter the public
  portfolio repo (root `.gitignore` blocks `autochannel/voice/*`). The
  channel runs from its own private repo.

## Testing without credentials

Set `voice.file: alba` (built-in voice), `visuals.broll: none`,
`publish.upload: false`, drop a hand-written episode yaml in `queue/`,
and `python -m ac make`. That exercises everything but Claude, Pexels
and YouTube.
