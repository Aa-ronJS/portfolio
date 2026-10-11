# Example episode: health and fitness for single dads

What one episode from this channel looks like, for the brief now in
`channel.yaml` ("Dad Strength").

- `script.json` — the script in the exact form the pipeline's script
  stage writes: a packaged title with the alternates the packaging pass
  considered, thumbnail text, summary, mood, tags, and seven sections of
  sentences, each sentence carrying its footage query, an alternative
  query, and an on-screen callout where a number or name is the point.
  The sources at the end are the ones every claim traces to.
- `script.md` — the same script laid out to read: narration with the
  shot and callout for each sentence.
- `council-review.md` — the research pass and the five-seat review of
  subjects (a ranked slate of ten), titles (ten candidates for this
  episode), the script (seat by seat, with the chair's edits, which are
  applied in the files here) and thumbnails (four variants, judged at
  feed size).
- `benchmarks/` — the top thumbnails of the competing channels beside
  the channel's own, with the traits counted; the rules the compositor
  follows came from these.
- `thumbnails/` — three subjects × three layouts from the real
  compositor (`channel/thumb.py`): `hero` (the subject lifted and
  head-cropped over the blurred original), `prop` (plus an object and an
  arrow), `wash` (the fallback); and a sheet at full, feed and medium
  size.
- `thumbnail.jpg` — the chosen one (A-hero). Photos via Pexels under
  the Pexels licence, IDs 4260395, 7499410, 6624446 (fathers), 9944852
  (timer) and 19730401 (stopwatch); each photographer is credited on
  the photo's Pexels page, and a live run writes the credit into the
  video description automatically.

How it was made: this example was written in a Claude Code session,
not by a scheduled run, because the session had no API keys. The
research was done the way the research stage does it (web search for
primary sources: the US Census CPS 2023 count, the WHO guideline, the
2022 Nature Medicine VILPA study, the 2021 "No Time to Lift" review,
the 2022 JACC sleep-restriction trial), and the script was written to
the channel's rubric by the same model the pipeline calls. A live run
adds the parts that need the services: a critique-and-revise round
with scores written by the critic, footage chosen by looking at
candidate frames, the voiced cut, and the final review.
