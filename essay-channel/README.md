# essay-channel

A YouTube channel that runs itself, and holds itself to a standard.
Give it a brief in `channel.yaml` and, on a schedule, it picks a topic
(learning from how earlier videos were watched), researches it on the
web and goes back for what the outline is missing, writes a narration
script through draft, critique and revision, voices it and checks the
voice said the names right, chooses footage for every sentence by
looking at the candidates, cuts it with motion, dissolves, callouts
and headings over a ducked music bed, watches the result and scores
it, and uploads to YouTube into the next release slot — unless the
review says a person should look first. Every step is logged into the
repo, every claim traces to a source in the description, and nothing
is ever uploaded twice.

```
brief ─► topic ─► research ─► outline ─► script ─► voice ─► footage ─► music ─► cut ─► review ─► YouTube
         Claude   Claude +    gaps go    draft,    Eleven   Pexels /   music/   ffmpeg  Claude    scheduled,
         + stats  web search  back out   critique, Labs /   Pixabay,   Jamendo          watches   captions,
                                         revise,   OpenAI   picked by                   it        chapters
                                         package   + whisper eye
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
   | `ANTHROPIC_API_KEY` | topics, research, outline, script, footage choice, review | console.anthropic.com |
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
   `YT_REFRESH_TOKEN`. The sign-in asks for upload, read, caption and
   analytics access (the caption track and `learn` need the last two). Custom thumbnails need a phone-verified channel
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
| topic | `topic.json` | the next title from `topics.queue`, else a slate of eight candidates (told how earlier videos were watched, via `learn`) judged by the council: five seats score every candidate, the chair picks and says why; the also-rans are kept |
| research | `research.md`, `research.json` | one web-searching turn: facts with source URLs, misconceptions, what could not be confirmed, the sources list |
| outline | `outline.json` | the through-line, the hook, the payoff, each section's job and facts — and the gaps, which go straight back to the researcher and are folded into the notes |
| script | `draft.json`, `critique.json`, `script.json` | a draft, then the council judges it (retention, packaging, audience, evidence, brand/policy) and a revision must answer the chair's edits, for `quality.passes` rounds; any sentence the evidence seat calls unsupported is cut; then eight titles in prescribed shapes and four thumbnail texts go to the council, which picks the pair. Every sentence carries a literal footage query, an alternative, and an optional on-screen callout |
| voice | `voice/vo.wav`, `timeline.json` | narration per section (ElevenLabs, with character timestamps and the neighbouring text for continuity) or per sentence (OpenAI), at −16 LUFS, with the start of every sentence; with faster-whisper installed the audio is read back and a mangled name is respelled phonetically and re-recorded |
| broll | `broll/plan.json` | shots from sentences (a shot holds while sentences share a visual, splits at `shot_max`, joins under `shot_min`); for each shot up to five candidate clips, then photographs, then a card; Claude looks at the candidates' frames and picks the one that shows what is said; clips cached in `cache/`, none reused while fresh ones remain |
| music | `music/music.json` | a local track matching the mood, else Jamendo; credit kept for the description |
| assemble | `final.mp4`, `captions.ass`, `captions.srt`, `thumbnail.jpg` | ffmpeg: every shot scaled to fill with a slow push or Ken Burns, hard cuts inside a section and a dissolve between, fade up under the title and down under the end card, lower-third headings, accent callouts, captions burned or kept as a track, a light grade, music ducked under the voice; a thumbnail from a frame Claude chose, with the thumbnail text and an accent bar |
| quality | `quality.json` | Claude sees one frame per shot with the sentence heard over it, rates every match and the whole, and says publish or hold; with the script's critique scores, anything under `quality.min_score` holds the episode for a person |
| publish | `publish.json`, `ledger.json` | resumable upload as private with `publishAt` = next free slot; title, chapters, sources and credits in the description; the caption track and thumbnail set; a marker tag on the video so a lost ledger cannot cause a re-upload |

`channel.py learn` pulls views and average-percentage-watched for every
published video into the ledger (YouTube Analytics); `run` does it
before picking a topic, so the channel leans toward what holds people.

The committed record is the text: topic, research, script, plan, the
publish record and the ledger. Media stays out of git (the Action keeps
each `final.mp4` as a build artifact for a fortnight).

## The council

Five fixed seats judge every subject, script, title and thumbnail text,
in one structured call per decision: the retention editor, the
packaging strategist, the viewer the brief describes, the scientist,
and the brand-and-policy guard; a chair decides and names the one
change that would raise the result most. The seats' wording is in
`channel/prompts.py` (`SEATS`) and was set by the research and the
first sitting in `examples/single-dads/council-review.md`, which also
records the standing rules it produced (no first-person experience
ever, numbers on thumbnails must be the finding not a promise, text
must read at feed size, the calm register). Scores and reasons are
kept in each episode's `topic.json`, `critique.json` and `script.json`.

## Keeping a hand on it

- The review holds anything under `quality.min_score` (script critique,
  footage match, or the reviewer's overall) or that the reviewer says to
  hold. `channel.py status` shows why; watch `final.mp4`, then
  `channel.py approve <slug>` (or `redo <slug> script` / `broll` to
  remake the weak part). The scheduled run keeps making the next episode
  meanwhile; a held one never blocks the queue.
- `review: true` in `channel.yaml` holds every episode regardless.
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
- **Cost per episode** (rough, 8 minutes): about ten Claude calls at
  Opus pricing — two research turns, outline, draft, two critiques and
  revisions, packaging, a vision pick per section, the review — call it
  five to fifteen dollars depending on how long the research runs;
  ElevenLabs about 9k characters (the free tier covers one episode a
  month, the Starter tier about three); Pexels, Pixabay and Jamendo are
  free; YouTube's API quota allows six uploads a day. `quality.passes:
  1` and `vision_pick: false` roughly halve the Claude spend.
