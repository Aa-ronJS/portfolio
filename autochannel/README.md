# autochannel

One engine that runs any number of YouTube channels in your own cloned
voice, for a few dollars a month. Right now that's seven: your named
channel and six anonymous ones. Every day a free GitHub runner:

1. for any channel whose queue is low, runs the **writers' room**: three
   pitches, a commissioning editor, a draft, then an adversarial council
   of 7-8 reviewers (`council/`) that must all pass it, with rewrites in
   between, to **that channel's rules** (`channels/<name>/RULES.md`)
2. for each channel posting today: reads the next approved script aloud
   **in your voice** (the register that channel uses), on CPU, free
3. cuts free footage to it and burns in word-by-word captions
4. uploads it to that channel and files it under `channels/<name>/posted/`

The plans: `channels/aaron/STRATEGY.md` (the named channel, and the craft
every channel follows) and `channels/PORTFOLIO.md` (the seven together).

## Layout

```
channels/defaults.yaml     settings every channel starts from
channels/<name>/           one folder per channel:
   channel.yaml              only what differs from defaults
   RULES.md                  what it is, its voice, what's off limits (the writer reads it)
   IDEAS.md                  topics to use first
   queue/  posted/           scripts waiting, scripts done
channels/_template/        copied by `python -m ac new <name>`
voices/                    your voice files, one per register (private repo only)
ac/                        the engine
```

## What it costs

| piece | how | cost |
|---|---|---|
| your voice | Kyutai Pocket TTS on the runner's CPU | $0 |
| compute | GitHub Actions, private repo: 2,000 free min/month; ~60 videos use ~900 | $0 |
| scripts | Claude Opus 5.5 writers' room: pitch, draft, 7-8 adversarial reviewers, rewrites; ~$2-2.50 per script that passes | capped at US$50/month across channels |
| footage | Pexels and public-domain archives | $0 |
| upload | YouTube Data API | $0 |

No ElevenLabs. The scripts are the only bill, and they're capped: if the
money runs out, channels post less, never worse (`channels/PORTFOLIO.md`).

## Setting it up (once)

1. **Private GitHub repo:** copy everything in this folder into it, and
   `workflow/daily.yml` to `.github/workflows/daily.yml`. Private,
   because your voice files go in it.
2. **Your voice:** record one take per register and export each
   (`voices/README.md`). Commit `voices/*.safetensors`.
3. **YouTube channels:** your named channel, plus a **Brand Account**
   for each anonymous one (YouTube → Settings → Add or manage channels).
   Viewers can't see who owns a Brand Account.
4. **One Google Cloud app for all of them:**
   - console.cloud.google.com → new project → enable *YouTube Data API v3*.
   - *OAuth consent screen*: External, add yourself as a test user, then
     press **Publish app** ("In production"). Skip this and every login
     silently dies after 7 days. The "unverified app" warning at sign-in
     is expected for an app only you use.
   - *Credentials* → OAuth client ID → Desktop app → download the JSON.
5. **Sign each channel in** on your computer:
   `python -m ac <name> youtube-auth client_secret.json`. When Google
   asks which account, pick that channel. It prints which channel it
   signed into, so a mix-up is obvious.
6. **Secrets:** repo → Settings → Secrets and variables → Actions:
   `ANTHROPIC_API_KEY`, `PEXELS_API_KEY`, `YT_CLIENT_ID`,
   `YT_CLIENT_SECRET`, and one `YT_REFRESH_TOKEN_<NAME>` per channel
   (e.g. `YT_REFRESH_TOKEN_SLOW_ORBIT`).
7. **First run:** set `publish.privacy: private` in `channels/defaults.yaml`,
   run the workflow by hand, check each video in YouTube Studio, then set it
   back to `public`.

## Steering it (from your phone, in the GitHub app)

- `channels/<name>/RULES.md`: change what a channel is or how it sounds.
- `channels/<name>/IDEAS.md`: jot a topic under *Up next*.
- `channels/<name>/queue/`: scripts waiting. Set `approved: true` to let
  one post; delete it to bin it. `python -m ac pending` lists every
  waiting script across channels in one read.
- New channel: `python -m ac new <name>`, then fill in its three files.

## Things that will bite if ignored

**Monetisation.** Since July 2025 YouTube demonetises "inauthentic",
mass-produced channels, and in January 2026 it removed a batch of
faceless AI channels from the Partner Program in one sweep, judging
whole channels rather than single videos. What it looks for is "no
meaningful human creative input". Your real voice, your rules, your
ideas list and your approvals are exactly that input, so use them. A
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
than one in a robot voice. That's why every channel has `review: true`.

## Commands

```bash
python -m ac list                    # every channel: ready, waiting, posting days
python -m ac pending                 # every script waiting for approval
python -m ac new <name>              # start a channel from the template
python -m ac <name> status           # one channel's queue and recent posts
python -m ac <name> write 4          # write 4 scripts now
python -m ac <name> make             # render its next video into build/ (no upload)
python -m ac <name> post             # render and upload it
python -m ac <name> daily            # top up, and post if today is a posting day
python -m ac voice-export take.wav aaron-calm   # make a voice file
```

A failed video stays queued with the error written into it; after three
failures it's marked `failed:` and skipped, so one bad script can't stall
a channel, and one failing channel never stops the others. GitHub emails
you when a run fails.
