# essay-channel

A YouTube channel that runs itself. Give it a brief in `channel.yaml`
and, on a schedule, it picks a topic, researches it on the web, writes
a narration script, voices it, cuts stock footage to the narration with
captions and chapter headings, lays music under it, uploads to YouTube
and books it into the next release slot. Every step is logged into the
repo, every claim in a script traces to a source in the description,
and nothing is ever uploaded twice.

```
brief ─► topic ─► research ─► script ─► voice ─► b-roll ─► music ─► cut ─► YouTube
         Claude   Claude +    Claude    Eleven   Pexels /  music/   ffmpeg  scheduled
                  web search            Labs /   Pixabay   Jamendo          private
                                        OpenAI                             upload
```

## Try it with nothing set up

```bash
cd essay-channel
pip install -r requirements.txt        # plus ffmpeg on your PATH
python3 channel.py --fake run          # every service faked, a real mp4 out
python3 -m unittest -v                 # the offline tests
```

The fake run makes `episodes/why-shipping-containers-.../final.mp4`
from a canned script, beep-tone narration and test-pattern footage, so
you can see the cut, captions, headings and thumbnail before spending
a cent.

## Set it up for real

1. **The brief.** Edit `channel.yaml`: the channel name, `niche` (what
   it is about, who watches, what it never does), `target_minutes`,
   `format` (landscape or portrait), release `slots`, the description
   template. Everything the machine decides, it decides from this file.

2. **Keys.** Put these in your shell for local runs, or in the
   repository's Actions secrets for the scheduled runs:

   | key | for | where to get it |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | topics, research, script | console.anthropic.com |
   | `ELEVENLABS_API_KEY` | narration (default provider) | elevenlabs.io → profile → API keys |
   | `OPENAI_API_KEY` | narration if `voice.provider: openai` | platform.openai.com |
   | `PEXELS_API_KEY` | stock footage (free) | pexels.com/api |
   | `PIXABAY_API_KEY` | footage if `broll.provider: pixabay` (free) | pixabay.com/api/docs |
   | `JAMENDO_CLIENT_ID` | CC music if `music.jamendo: true` (free) | devportal.jamendo.com |

3. **YouTube.** In Google Cloud: create a project, enable *YouTube Data
   API v3*, configure the OAuth consent screen (External; add the
   channel's Google account as a test user, or publish the app), then
   create an OAuth client of type **Desktop app**. Then, once, on your
   own machine:

   ```bash
   python3 channel.py auth --client-id ... --client-secret ...
   ```

   It opens the consent page, catches the redirect, and prints the
   three values to add as secrets: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`,
   `YT_REFRESH_TOKEN`. Custom thumbnails need a phone-verified channel
   (YouTube Studio → Settings → Channel → Feature eligibility);
   without it the upload still works and YouTube picks a frame.

4. **Music.** Drop tracks into `music/` (see `music/README.md`) or set
   `music.jamendo: true`. With neither, videos go out narration-only.

5. **Schedule.** `.github/workflows/essay-channel.yml` runs Mon/Wed/Fri
   and makes one episode per run; with the secrets missing it only runs
   the tests, so the repo stays green until you are ready. Change the
   cron and `publish.slots` together: one episode per slot.

Then:

```bash
python3 channel.py run --dry-run       # make an episode, show what would be uploaded
python3 channel.py run                 # make and publish the next episode
python3 channel.py status              # where every episode is up to
```

## How an episode is made

Each stage writes one file into `episodes/<slug>/` and is skipped next
time if the file exists, so a run that dies resumes where it stopped and
`channel.py redo <slug> script` throws away a stage and everything after.

| stage | writes | what happens |
|---|---|---|
| topic | `topic.json` | the next title from `topics.queue`, else Claude proposes one that is not in the ledger or `topics.avoid` |
| research | `research.md`, `research.json` | one web-searching turn: facts with source URLs, misconceptions, what could not be confirmed, the sources list |
| script | `script.json` | sections with a heading, spoken narration (split into sentences), 3–5 literal footage queries; title, summary, mood, tags, the sources used. Validated against a schema |
| voice | `voice/vo.wav`, `timeline.json` | narration per section (ElevenLabs returns character timestamps) or per sentence (OpenAI), concatenated at −16 LUFS, with the start of every sentence |
| broll | `broll/plan.json` | footage per section from its queries, cut every `clip_seconds`, cached in `cache/`, never the same clip twice while fresh ones remain; a dry query becomes a plain heading card |
| music | `music/music.json` | a local track matching the mood, else Jamendo; credit kept for the description |
| assemble | `final.mp4`, `captions.ass`, `thumbnail.jpg` | ffmpeg: clips scaled and cropped to frame, captions and section headings burned in (libass), music ducked under the voice (sidechain), x264 1080p; a thumbnail from the first scene with the thumbnail text |
| publish | `publish.json`, `ledger.json` | resumable upload as private with `publishAt` = next free slot; title, chapters, sources and credits in the description; a marker tag on the video so a lost ledger cannot cause a re-upload |

The committed record is the text: topic, research, script, plan, the
publish record and the ledger. Media stays out of git (the Action keeps
each `final.mp4` as a build artifact for a fortnight).

## Keeping a hand on it

- `review: true` in `channel.yaml` stops every episode after the cut.
  Watch `final.mp4`, then `channel.py approve <slug>`; the next run
  uploads it. The scheduled run keeps making the next episode meanwhile.
- `topics.queue` lets you set the titles; `topics.avoid` rules
  subjects out; `topics.generate: false` stops it inventing any.
- `channel.py run --topic "..."` makes one specific episode.
- `publish.enabled: false` makes videos without uploading anything.

## Honest notes

- **Accuracy.** The script prompt forbids claims that are not in the
  research notes, and the notes come from live web search with the
  sources listed in every description. That is a strong guard, not a
  guarantee: read the first few scripts before trusting the channel
  unattended, and keep `review: true` while you calibrate the brief.
- **YouTube's rules.** Synthetic narration over stock footage is
  allowed, but YouTube asks creators to disclose realistic synthetic
  content, and its July 2025 monetisation policy on "inauthentic
  content" targets mass-produced, repetitive channels. A channel that
  says something specific per episode, with real sources, is the kind
  this is built to be; a hundred near-identical uploads a week is not.
- **Cost per episode** (rough, 8 minutes): Claude research + script a
  few dollars at Opus pricing; ElevenLabs about 9k characters (the free
  tier covers one episode a month, the Starter tier about three);
  Pexels, Pixabay and Jamendo are free; YouTube's API quota allows
  six uploads a day.
