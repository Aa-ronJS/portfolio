# animation-pipeline

Productionise crude hand-drawn animated shorts. You write the jokes, draw the
characters badly on purpose, and record the voice lines. The pipeline does
everything mechanical: cleaning up photos of your drawings, syncing mouth
flaps to your voice, moving characters around, setting captions, and
rendering a 9:16 mp4 ready to upload.

The style constraint is the whole strategy: visuals so simple that one
drawing per character is a finished asset, so all your time goes into the
two things that actually make these accounts work — **the writing and the
human voice acting**. Neither is generated here, by design.

## Quick start

```bash
pip install pillow numpy pyyaml scipy   # plus ffmpeg on your PATH
cd animation-pipeline
python3 demo/make_demo_assets.py    # placeholder art + placeholder mumbles
python3 pipeline/render.py demo/episode.yaml
open demo/episode.mp4
```

The demo art and audio are programmatic stand-ins so the pipeline runs on a
fresh clone. Every real episode replaces them with your drawings and your
recorded voice.

## Puppet mode: one raw recording drives the whole episode

The fastest loop. Record the entire episode's voice acting as a single
take on your phone — every line in order, a beat of silence (~half a
second) between lines. Then:

```bash
python3 pipeline/puppet.py scaffold take1.m4a myshow/ep02.yaml \
    --char gary --bg backgrounds/pub.png
python3 pipeline/render.py myshow/ep02.yaml --draft
```

`scaffold` splits the take on silence, makes one shot per spoken line
(shot length and mouth flap come from your voice automatically), and
writes an episode file you then edit — recast shots, move people around,
fix captions. If `faster-whisper` is installed (`pip install
faster-whisper`, optional), each line is transcribed into its caption;
otherwise captions are placeholders.

Or keep writing the yaml yourself and just point it at the recording —
`take:` at the top, `line: N` per shot instead of `audio:`:

```yaml
take: vo/take1.m4a
shots:
  - bg: backgrounds/pub.png
    line: 1                 # the first thing said in the recording
    caption: gary has been to the moon apparently
    actors: [{char: gary, at: [0.5, 0.74], scale: 0.4, talk: true}]
```

The split is cached next to the take and re-cut automatically when the
recording changes. If lines get merged or split wrongly, inspect with
`python3 pipeline/puppet.py split take1.m4a /tmp/lines` and tune
`split: {min_pause: 0.35}` in the episode file (raise it if your pauses
are long, lower it if it glues two lines together).

`demo/episode-take.yaml` is the same demo driven this way from
`demo/vo/take.wav`.

### Mouth styles

`talk_style` — in `defaults:` or per actor:

| style | look |
|---|---|
| `syllable` | mouth pops open on each syllable of your voice (default) |
| `envelope` | open whenever you're loud; long vowels hold open |
| `alternate` | strict 0101 flap every frame while you're speaking |

## The workflow, per episode

1. **Write it first.** 3–6 shots, one caption each, under 30 seconds total.
   The caption and the voice line can differ — that gap is often the joke.
2. **Draw the seeds.** Marker on white paper, flat colours, thick outlines.
   One full-body drawing per character. For anyone who speaks, draw the same
   character twice on identically framed sheets: mouth closed (`body`) and
   mouth open (`talk`). Optionally eyes shut (`blink`). Backgrounds are one
   drawing too — or a flat colour rectangle, nobody cares.
3. **Shoot and ingest.** Photograph each sheet in even light, then:

   ```bash
   python3 pipeline/ingest.py photo.jpg myshow/characters/gary/body.png --no-crop
   python3 pipeline/ingest.py photo2.jpg myshow/characters/gary/talk.png --no-crop
   python3 pipeline/ingest.py bg.jpg myshow/backgrounds/pub.png
   ```

   `--no-crop` keeps body/talk pixel-aligned. Drawing digitally instead?
   Export transparent PNGs straight into the folder and skip this step.
4. **Record the voice lines.** Phone voice memo app, one file per shot,
   deadpan, first take is usually the right take. Drop them in `vo/`.
5. **Script the episode.** Copy `demo/episode.yaml`, point each shot at a
   background, actors, caption, and voice file. Shot length comes from the
   audio automatically.
6. **Iterate at draft speed, then render.**

   ```bash
   python3 pipeline/render.py myshow/ep01.yaml --draft      # fast check
   python3 pipeline/render.py myshow/ep01.yaml --shot 2     # one shot
   python3 pipeline/render.py myshow/ep01.yaml --still 4.2 f.png
   python3 pipeline/render.py myshow/ep01.yaml              # final 1080x1920
   ```

## Project layout

Keep one folder per show, next to `demo/`:

```
myshow/
  ep01.yaml
  characters/
    gary/
      body.png        required — resting pose
      talk.png        optional — same drawing, mouth open
      blink.png       optional — same drawing, eyes shut
      char.json       optional — {"anchor": [0.5, 1.0]} (default: feet)
  backgrounds/*.png
  vo/*.wav|m4a|mp3    anything ffmpeg reads
```

## Episode file reference

```yaml
title: my episode
size: [1080, 1920]   # 9:16
fps: 12              # low on purpose; part of the look
boil: 0.0015         # hand-held jitter amount (fraction of height)
boil_every: 2        # frames between jitter changes

defaults:
  font: ../fonts/satoshi-var.ttf
  caption_size: 0.042      # fraction of height
  caption_color: [26, 26, 26]
  caption_y: 0.84          # caption block centre
  audio_tail: 0.35         # silence after each line

shots:
  - bg: backgrounds/pub.png
    audio: vo/line1.wav        # shot length = audio + tail...
    line: 2                    # ...or spoken line N of the episode 'take:'...
    duration: 3.0              # ...or set it explicitly (required if neither)
    caption: one line, lowercase, that is the joke or sets it up
    caption_y: 0.84            # per-shot override
    zoom: [1.0, 1.06]          # optional slow push-in
    actors:
      - char: gary             # folder name under characters/
        at: [0.34, 0.74]       # anchor position, fractions of the canvas
        scale: 0.34            # character height / canvas height
        flip: true             # mirror
        talk: true             # mouth flap driven by THIS shot's audio
        talk_threshold: 0.28   # raise if the mouth flaps on breaths
        moves:
          - {type: slide, from: [-0.2, 0.74], to: [0.34, 0.74], t: [0, 1.4]}
          - {type: waddle, amp: 3, period: 0.5}
      - image: props/pint.png  # any PNG can be an actor
        at: [0.6, 0.7]
        scale: 0.1
```

### Move verbs

| verb | what it does | knobs |
|---|---|---|
| `slide` | eased move between two positions | `from`, `to`, `t: [start, end]` seconds |
| `bob` | gentle vertical bounce | `amp` (fraction of height), `period` |
| `waddle` | rocking rotation — combine with slide for a walk | `amp` (degrees), `period` |
| `hop` | bigger bounce | `amp`, `period` |
| `shake` | nervous horizontal tremble | `amp` |
| `pop` | scale up from nothing at shot start | `t` |
| `lean` | ease into a tilt | `deg`, `t` |

Everything wobbles slightly anyway (`boil`), and characters blink on their
own if a `blink.png` exists. Mouth flaps come from the loudness envelope of
the shot's audio — no keyframing, ever.

## Ingest tips

- Even, shadow-free light matters more than camera quality.
- If paper texture survives in the cutout, raise `--paper-cut`; if pale
  colours disappear, lower it.
- The tool snaps dark lines to pure black and flattens colour so a phone
  photo reads like a digital drawing.
- Anything fully enclosed by ink stays opaque even when it's pale (faces,
  white shirts, plain paper inside an outline). If a drawing has a gap
  that should stay see-through — a hand on a hip forming a loop — pass
  `--no-fill-holes`.

## Production cadence (how this becomes an account, not a hobby)

- **Batch by activity, not by episode.** Write five episodes in one
  sitting. Draw every new character/background the format needs in one
  sitting. Record all the voice lines in one sitting — the mic setup and
  the finding-the-voice cost is paid once.
- **Characters are capital.** After three episodes you'll have a recurring
  cast and most "new" episodes need zero new drawings — just a yaml file
  and voice lines. That's a sub-hour episode, most of it writing.
- **Keep a `bank.md`** of premises as they occur to you; never sit down to
  a blank page.
- The `--draft` render is your table read: watch it with the audio before
  committing to taste changes.

## What stays human

The voice is recorded, never synthesised, and the jokes are yours. The
audience these formats win is voting for exactly that; the crude visuals
are the proof of it. This pipeline only removes the parts nobody was going
to admire anyway.

---
Caption font is Satoshi (already shipped with this repo, converted to TTF
for the renderer; Fontshare Free Font License). Swap in any TTF via
`defaults.font`.
