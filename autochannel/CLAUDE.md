# autochannel — notes for Claude sessions

One engine running several YouTube channels (one named, six anonymous)
narrated in Aaron's cloned voice, built to run on almost nothing. User
docs: `README.md`; plans: `channels/aaron/STRATEGY.md` and
`channels/PORTFOLIO.md`. This is a separate project
from `animation-pipeline/`. That project's "never add voice synthesis"
rule is about those cartoons and does not apply here; equally, nothing
here should be pulled into the pipeline.

## Flow

Each channel is a folder in `channels/` (channel.yaml merged over
`channels/defaults.yaml`; loaded config carries `_slug`/`_dir`). The
workflow runs `python -m ac topup` (writers only, light job), then
`python -m ac <channel> daily` in a matrix over `python -m ac due`:
`write.py` tops up `queue/` through `council.py` (pitch x3 → commission
→ draft → council of `council/*.md` seats in parallel, sharing a cached
prefix → rewrite, up to `max_rounds`; reads the channel's `RULES.md`,
`IDEAS.md`, `LESSONS.md` and titles already made) → `voice.py`
(Pocket TTS, sentence by sentence, loudnorm -14 LUFS) → `captions.py`
(faster-whisper word times mapped back onto the script text) →
`render.py` (Pexels b-roll or gradient fallback, ASS captions via
libass, one ffmpeg mux) → `packaging.thumbnails` (frames → vision plan →
`thumbs.py` render → vision review at phone size) → `upload.py`
(resumable, reads privacy back, sets thumbnail A) →
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
- **The council is the quality bar; don't weaken it to save money.**
  Every seat must score `pass_score`+ with no blocking issues; veto seats
  bin outright. Budget is enforced by per-channel monthly caps
  (`writer.monthly_budget_usd`, spend in `spend.yaml`), so overspend
  means fewer videos, never a lower bar. Next lever: Batch API (half price).
- **Search seats research then judge in two calls:** structured output
  can't be combined with citations, which web search can produce.
- **Queue filenames must stay unique**: parallel writers can finish in
  the same second (`store.new_path` suffixes -2, -3).
- **Packaging serves satisfied watch time, not clicks.** The promise
  keeper seat must stay; the optimiser only swaps clearly losing videos,
  reverses a worse swap, and never touches a `test_and_compare: true`
  episode. YouTube Test & Compare has no API (checked 2026-11-18); reach
  data comes from the Reporting API report `channel_reach_combined_a1`
  (48-72 h late), not the Analytics API.
- **videos.update deletes unsent snippet fields:** always read, change
  the title, write the whole snippet back (`reach.apply`).
- **Sign-in scopes include force-ssl and yt-analytics.readonly**: changing
  SCOPES means every channel must sign in again.
- **Degrade, don't fail:** no footage → gradient; writer down → post
  from the queue; one episode broken → try the next, retire after 3.
- **faster-whisper gets numpy audio decoded by ffmpeg**, never a path:
  its PyAV decoder broke on a version drift (`metadata_errors` kwarg).
- **`containsSyntheticMedia` is false by default** because YouTube lists
  cloning your own voice for voice-overs as needing no disclosure
  (help answer 14328491, checked 2026-11-18). It must be true for any
  video with realistic AI-generated people or events.
- **Plans:** `channels/aaron/STRATEGY.md` (craft for every channel, build
  list in section 9) and `channels/PORTFOLIO.md` (distinctness across
  channels, build-list additions). RULES.md per channel is the
  writer-facing half.
- **Distinctness is the design constraint:** channels must not look like
  one template (YouTube's inauthentic-content test). Per-channel voice
  register, rules, look, pacing, footage and schedule; never make a
  change that converges them.
- **Channel names are secret-name safe** (`[a-z][a-z0-9_]`): a channel's
  YouTube token is `YT_REFRESH_TOKEN_<NAME>`, handed to its matrix job
  as plain `YT_REFRESH_TOKEN`.
- The voice file and Google client secrets never enter the public
  portfolio repo (root `.gitignore` blocks `autochannel/voices/*`). The
  channel runs from its own private repo.

## Testing without credentials

Set `voice.file: alba` (built-in voice), `visuals.broll: none`,
`publish.upload: false`, drop a hand-written episode yaml in `channels/<name>/queue/`,
and `python -m ac <name> make`. That exercises everything but Claude, Pexels
and YouTube.
