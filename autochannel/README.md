# autochannel

A YouTube channel that runs itself, in your own cloned voice, for a few
dollars a month. The plan it runs (niche, format, tactics, how it's
judged) is `channel/STRATEGY.md`. On each publishing day a free GitHub runner:

1. tops up a queue of scripts written to **your rules** (`channel/RULES.md`)
2. reads the next one aloud **in your voice**, on CPU, with no paid service
3. cuts free stock footage to it and burns in word-by-word captions
4. uploads it to YouTube and files it under `posted/`

## What it costs

| piece | how | cost |
|---|---|---|
| your voice | Kyutai Pocket TTS, runs on the runner's CPU (~1 s of compute per 1 s of speech) | $0 |
| compute | GitHub Actions, private repo: 2,000 free min/month; a video takes ~4 | $0 |
| scripts | Claude Opus 5.5, one call writes a week of scripts | ~US$0.70/month (Haiku 5.5: ~2 cents) |
| footage | Pexels API, free key | $0 |
| upload | YouTube Data API | $0 |

No ElevenLabs. The only bill is the scripts, and you can swap to Haiku
in `channel/config.yaml` to make that a rounding error.

## Setting it up (about an hour, once)

1. **Make a private GitHub repo** for the channel and copy everything in
   this folder into it. Copy `workflow/daily.yml` to
   `.github/workflows/daily.yml`. (Private, because your voice file goes
   in it. Public repos would give you unlimited minutes but publish your voice.)
2. **Your voice:** follow `voice/README.md`. Commit `voice/voice.safetensors`.
3. **YouTube upload access:**
   - console.cloud.google.com → new project → enable *YouTube Data API v3*.
   - *OAuth consent screen*: External, add yourself as a test user, then
     press **Publish app** ("In production"). Skip this and your login
     silently dies after 7 days. You'll see an "unverified app" warning
     when you sign in; that's expected for an app only you use.
   - *Credentials* → OAuth client ID → Desktop app → download the JSON.
   - On your computer: `python -m ac youtube-auth client_secret.json`,
     sign in **as the channel**, and copy the three values it prints.
4. **Secrets:** repo → Settings → Secrets and variables → Actions → add
   `ANTHROPIC_API_KEY` (console.anthropic.com), `PEXELS_API_KEY`
   (pexels.com/api, free), `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`.
5. **Rules:** rewrite `channel/RULES.md` and set `channel_name` in
   `channel/config.yaml`.
6. **First run:** set `publish.privacy: private`, then Actions → *daily
   video* → Run workflow. Watch the result on YouTube Studio. When you're
   happy, set it back to `public`. From then on it posts daily on its own.

## Steering it (from your phone, in the GitHub app)

- `channel/RULES.md`: what the channel is, its voice, what's off limits.
  The writer reads it word for word every time.
- `channel/IDEAS.md`: jot a topic under *Up next*; it's used before anything the writer invents.
- `queue/`: the scripts waiting to go out. Edit or delete any of them.
- `writer.review: true` in config: nothing posts until you set
  `approved: true` on it. That's thirty seconds of reading a day, and it's
  the strongest protection the channel has (see below).

## Things that will bite if ignored

**Monetisation.** Since July 2025 YouTube demonetises "inauthentic",
mass-produced channels, and in January 2026 it removed a batch of
faceless AI channels from the Partner Program in one sweep, judging
whole channels rather than single videos. What it looks for is "no
meaningful human creative input". Your real voice, your rules, your
ideas list and a daily approval are exactly that input, so use them. A
channel that runs 100% unattended can still post, but it is the kind
YouTube is trying to stop paying.

**Disclosure.** YouTube lists "cloning one's own voice to create voice
overs" as a minor edit that needs no AI label
(support.google.com/youtube/answer/14328491), so `publish.synthetic_media`
is off. Turn it on for any video with realistic AI-generated people or
events.

**Uploads stuck on private.** Google has, at times, forced uploads from
unaudited API projects to private. Its docs currently say they aren't
restricted, but the uploader reads every video back and warns in the run
log if it happens. If it does, fill in the free audit form
(support.google.com/youtube/contact/yt_api_form); until it's approved, flip
each video to public in the YouTube Studio app.

**Accuracy.** The writer is told to leave out anything it isn't sure of,
but it can still be wrong. A wrong "fact" in your own voice is worse
than one in a robot voice. Another reason to use `review: true` for the first month.

## Commands

```bash
python -m ac status            # queue and recent posts
python -m ac write 7           # write 7 scripts now
python -m ac make              # render the next one into build/ (no upload)
python -m ac post              # render and upload the next one
python -m ac daily             # what the robot runs
```

A failed video stays in `queue/` with the error written into it; after
three failures it's marked `failed:` and skipped, so one bad script can't
stall the channel. GitHub emails you when a daily run fails.
