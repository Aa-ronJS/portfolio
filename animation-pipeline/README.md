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

### Directing with your voice

Speak the stage directions into the recording itself and the pipeline
casts, stages, and animates whoever you name:

    "in the chip shop, dave walks in from the left and says"
    "large chips please my good man"
    "the seagull hops in from the right and says"
    "give me one chip"
    "close up on dave, he says"
    "absolutely not"
    "the seagull leaves"

```bash
python3 pipeline/puppet.py direct take1.m4a myshow/ep03.yaml
```

Every direction line is transcribed (needs `pip install faster-whisper`)
and matched against your cast — the folders in `characters/` plus any
`"aliases"` list in a `char.json`. Name matching is fuzzy and phonetic,
so whisper hearing "dayv" still casts dave; if it repeatedly mishears a
name, add what it hears as an alias. The grammar:

| you say | what happens |
|---|---|
| *dave says / asks / shouts / whispers…* | the **next** line you speak is dave's: his mouth puppets to it and it becomes the caption |
| *dave walks in / enters / hops in / runs in [from the left/right]* | dave joins the stage, animated in; he stays in every shot until he leaves |
| *dave leaves / exits / storms off* | a short shot of dave leaving |
| *in the pub / at the beach* | background fuzzy-matched against `backgrounds/*.png` |
| *close up [on dave]* | the next dialogue shot is framed head-and-shoulders |
| *new scene / cut / meanwhile* | clears the stage |
| *beat / pause* | a short silent shot of the current stage |

Directions compose: "dave walks in from the left and says" is one line.
Characters already on stage just stand there while others talk. A line
that parses as nothing (or a garbled direction) still plays: a solo
character speaks it, otherwise it goes to whoever was directed last, or
runs as voice-over. End direction lines with the speech verb ("…and
says") — that's also the safety net when a name gets mis-transcribed.

The output is a normal episode yaml with the machine's staging choices
written out — reposition, recast, and fix captions there rather than
re-recording. `demo/ep-directed.yaml` was generated this way from
`demo/vo/directed_take.m4a` (a synthetic robot-voice take, which is why
its captions are chewed — human recordings transcribe far better).

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

## Rigging: real walks and stock blinks, still one drawing

One drawing per character stays the whole asset. Drop a `rig.json` next
to `body.png` and the pipeline puts a simple skeleton over the drawing:
each pixel is cut to its nearest bone (overlapping at the joints so
nothing tears) and the parts swing from reusable keyframed clips. Nobody
draws walk frames, and nothing gets smooth — a clip holds three or four
poses per cycle at 12fps, which is the look.

Make a rig by clicking on the drawing: open `tools/rig_editor.html` in
a browser, drop the character's `body.png` in, click where the joints
are (skip what the character doesn't have — a bird with no arms still
walks), click the eyes and mouth, download `rig.json` into the
character's folder. Then sanity-check the cut and the walk:

```bash
python3 pipeline/rig.py sheet   characters/gary check.png
python3 pipeline/rig.py preview characters/gary walk.gif --clip walk
```

Once the rig exists:

- **any `slide` walks.** The stock walk cycle plays across the slide's
  window automatically. An actor that also has a `waddle` keeps the
  author's old-style walk instead; `no_walk: true` opts out entirely.
- **clips are stock and reusable** — `pipeline/clips/*.json` ships
  `walk`, `idle`, `wave`, `nod`, `shake`, and they play on any rigged
  character whose bones use the canonical names (`torso`, `head`,
  `arm_l`, `leg_r`, … one-piece, or `arm_l_upper`/`arm_l_lower` for
  elbows and knees — a clip keyed on `arm_l_upper` lands on a one-piece
  `arm_l` automatically). Channels for bones a character doesn't have
  are ignored. A `clips/` folder in the show or the character overrides
  the stock library by name.

  ```yaml
  actors:
    - char: gary
      clip: wave                    # simple
    - char: gary                    # layered, windowed, tuned:
      clips:
        - {name: idle}
        - {name: nod, t: [0.4, 1.6], amp: 0.8, period: 0.5}
  ```
- **talk and blink still prefer your drawn sheets**, swapped onto the
  head part alone, and fall back to the stock face below.

### Stock blinks and mouth flaps (no rig required)

Stop drawing `blink.png`. Declare where the face is — the rig editor
writes this for you, or add it to `char.json` by hand:

```json
"face": {"eyes": [{"at": [0.40, 0.27], "r": 0.02},
                  {"at": [0.49, 0.27], "r": 0.02}],
         "mouth": {"at": [0.44, 0.38], "w": 0.08},
         "bone": "head"}
```

Coordinates are fractions of the drawing (`r`/`w` fractions of its
height); `bone` only matters on rigged characters, where the blink rides
the head through nods and walks. A closed eye is stamped over each open
one in the drawing's own colours — the lid fill is sampled from around
the eye, the lid line from its ink — so any character blinks the moment
its eyes are declared, in any pose sheet, with nothing drawn. A talking
character with no `talk.png` gets a stock open-mouth flap the same way.
Drawn sheets always win when they exist.

### The character kit: what to draw

Cutting one drawing works, but the cut can only be as clean as the
drawing — arms that touch the body share pixels with it, and the
paper enclosed between limb and torso gets filled opaque on ingest, so
it travels when the limb moves. A character that's going to *act*
deserves a **kit**: each part its own small drawing in a `parts/`
folder. Nothing is cut, nothing tears, and an expression change only
needs a new head, not a new body.

**The fast path is the printed template.** Print
`tools/kit_template.pdf` (A4, 100% scale — or regenerate it with
`python3 pipeline/kit.py template sheet.pdf`), draw one character into
the boxes with marker — the red joint dots and pale blue proportion
ghosts are already placed, boxes marked optional may stay empty —
photograph it flat with all four corner squares in frame, then:

```bash
python3 pipeline/kit.py ingest photo.jpg myshow/characters/gary
python3 pipeline/rig.py preview myshow/characters/gary walk.gif
```

The photo is straightened off the corner squares, cleaned, and split
into a complete character folder: `parts/*.png`, `rig.json` (skeleton,
pivots, face anchors), `char.json`, and an assembled `body.png`. The
character walks, talks, blinks and points immediately. That is the
whole workflow; everything below is what the template is doing for
you, and how to build a kit freehand without it.

**The one trick: put the two red dots down first, then draw the part
around them.** Dot 1 is the joint (where the part attaches), dot 2 is
the reach (where the *straight* version of that limb ends). Use a red
pen; keep the dots the same distance apart for every version of the
same limb — that's what keeps proportions steady when the walk swaps a
straight leg for a bent one. The dots may float off the drawing (a
bent arm doesn't reach its second dot — correct), and they're erased
automatically on load.

**The list.** Limbs are drawn hanging straight down as worn, knees
and toes pointing the walk direction. **Nothing is ever mirrored** —
a mirrored limb bends its joints backward — so the template carries
optional RIGHT-side boxes for every arm and leg shape
(`arm_r_<shape>.png`, `leg_r_<shape>.png`); leave any of them empty
and the LEFT drawing stands in for that side verbatim.

Required — this is a walking, talking, blinking character (5 drawings):

| file | what to draw | dots |
|---|---|---|
| `torso.png` | neck to hips — NO head, arms or legs | neck, hips |
| `head.png` | the head, neutral face, mouth closed | neck joint, crown |
| `arm_straight.png` | relaxed arm, open hand | shoulder, reach |
| `leg_straight.png` | standing leg, shoe on | hip, reach |
| `leg_bent.png` | knee bent mid-step | hip, reach |

Worth adding — each one unlocks stock behaviour for good:

| file | what to draw | unlocks |
|---|---|---|
| `head_talk.png` | mouth open | your drawn mouth beats the stock flap |
| `arm_bent.png` | elbow at 90°, relaxed fist | holding, flexing, hands near face |
| `arm_point.png` | straight arm, finger out | the stock `point` clip |
| `arm_pocket.png` | upper arm vanishing into the pocket | `shapes: {arm_l: pocket}` |
| `head_blink.png` | eyes shut | beats the stock blink |
| `head_<pose>.png` (+ `_talk`) | angry, sad, smug… | `pose: angry` now costs a head, not a body |

Optional, any time: `arm_flex`, `arm_hip` (hand on hip), `leg_sit` —
any `arm_<name>.png` / `leg_<name>.png` becomes selectable with
`shapes:` per actor or a clip's `shape` channel.

Rules that make it work:

- Draw every part **slightly past its joint** — the shoulder end of an
  arm tucks under the torso, so rotation never opens a gap.
- Same pen, same colours across the whole kit; it has to read as one
  drawing once assembled.
- `body.png` (the assembled figure) is still required — it's the flat
  fallback, the sheet the skeleton is clicked onto in the rig editor,
  and the proportions reference.
- Right-side drawings matter most where the limb curves toward the
  body — a bent or pocket arm; a hanging straight arm barely differs,
  so its right box is the safest to skip. (Pocket arms are also aimed
  into the torso automatically, whichever art they use.)
- Drawing digitally? Skip the dots and declare pivots in rig.json:
  `"parts": {"arm_bent": {"a": [x, y], "b": [x, y]}}` (normalised to
  that part's image).
- Kits use one-piece limbs (`arm_l`, not `arm_l_upper`).
- Ingest each part photo like anything else:
  `python3 pipeline/ingest.py photo.jpg characters/gary/parts/arm_bent.png`

`demo/characters/doug/` is the reference kit — nine placeholder
drawings, regenerated by `demo/make_demo_assets.py`.

`demo/episode-rig.yaml` → `demo/episode-rig.mp4` is the screen test:
Tim (a cut single drawing) walks in on his own legs, blinks with no
`blink.png`, waves a wave nobody drew, nods along to his own voice
line, and leaves at double walk speed. Then Doug (a drawn kit) walks
in with actual knees, talks with his hands in his pockets, and points
at the sign.

## The workflow, per episode

1. **Write it first.** 3–6 shots, one caption each, under 30 seconds total.
   The caption and the voice line can differ — that gap is often the joke.
2. **Draw the seeds.** Marker on white paper, flat colours, thick outlines.
   One full-body drawing per character. For anyone who speaks, draw the same
   character twice on identically framed sheets: mouth closed (`body`) and
   mouth open (`talk`). Optionally eyes shut (`blink`) — or draw neither
   and declare the face instead (rigging section): stock blinks and mouth
   flaps get stamped on in the drawing's own colours. Backgrounds are one
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
      angry.png       optional extra poses (any name), plus
      angry_talk.png  their own mouth-open/eyes-shut variants;
                      an actor selects one with `pose: angry` and
                      talk/blink fall back to the plain versions
      rig.json        optional — skeleton over the drawing (make it
                      with tools/rig_editor.html); enables clips,
                      real walks, and face anchors
      parts/*.png     optional — the drawn kit (see "The character
                      kit"): torso, head(+variants), arm_<shape>,
                      leg_<shape>, two red dots each; replaces the
                      auto-cut entirely
      clips/*.json    optional — character-specific clips, override
                      the stock library by name
      char.json       optional — {"anchor": [0.5, 1.0]} (default: feet)
                      {"aliases": [...]} for the voice director, and
                      "face" eyes/mouth for stock blinks and flaps
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
        pose: angry            # use angry.png / angry_talk.png variants
        talk: true             # mouth flap driven by THIS shot's audio
        talk_threshold: 0.28   # raise if the mouth flaps on breaths
        clip: wave             # stock/override clip (rigged characters);
                               # or clips: [{name, t, amp, period}, ...]
        shapes: {arm_l: pocket}  # pin a kit part shape for the shot
        no_walk: true          # suppress the automatic walk on a slide
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
| `waddle` | rocking rotation — the walk for unrigged characters | `amp` (degrees), `period` |
| `hop` | bigger bounce | `amp`, `period` |
| `shake` | nervous horizontal tremble | `amp` |
| `pop` | scale up from nothing at shot start | `t` |
| `lean` | ease into a tilt | `deg`, `t` |

Everything wobbles slightly anyway (`boil`), and characters blink on their
own if a `blink.png` exists — or if their eyes are declared (see the
rigging section: stock blinks need no drawing at all). Mouth flaps come
from the loudness envelope of the shot's audio — no keyframing, ever.

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
