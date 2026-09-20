# Roadmap — from the 2026-08-30 production-system review

Core principle: **Claude interprets. The renderer executes. The script
remains authoritative.** Every output event must trace back to either
something the creator supplied, or a clearly identified directorial
inference. Never rewrite the screenplay while staging it.

## P0 — correctness (DONE)

- Screenplay parser -> immutable beats with IDs (`pipeline/screenplay.py`).
- Preflight validator: unclaimed dialogue = render-blocking error;
  invented captions = error outside chaos mode; captions filled verbatim
  from beats; staged-vs-approximated action accounting.
- Missing characters are errors unless the cast map explicitly resolves
  them (folder / `silhouette` placeholder / `omit`).
- Semantic sprite scaling: `world_height` in char.json + visible-bounds
  normalization + `human_height` scene constant; drawing resolution and
  canvas padding can no longer distort scale. Legacy `scale:` remains.
- Modes: `strict` / `director` (default) / `chaos`.

## P1 — timing and direction

- Camera as a first-class object: close-ups by framing the scene
  (`Tim.face` targets via a `face` anchor in char.json), not by
  re-scaling sprites per shot; reusable primitives (punch_in,
  shaky_zoom, pan_to, follow, freeze_frame...).
- Word-timestamp triggers: `start: dialogueWord("ex-husband")` for
  camera moves within a shot (the split-audio trick does this today).
- Human-readable shot plan export (purpose / framing / beats / timing).
- Correction commands ("make steven half that size", "start the zoom on
  'husband'") edit structured data, not code.
- Persistent per-scene staging (declare positions once, shots reference
  the scene state instead of repeating coordinates).

## P2 — sound

- Foley pass over beats: explicit + implied cues (footsteps, gunshot,
  body fall, gasp) as timeline events; semantic lookup
  (`resolveSfx("gunshot")`) against a cached local library with
  provenance/licence metadata for anything sourced externally.
- Music: suggestion pass, explicit-only strict mode, ducking under
  dialogue. Silence is an authored event ("A beat." already stages as a
  silent hold — keep that guarantee).
- Forced alignment: map script words onto the creator's recording so
  captions get canonical wording with recorded timing (whisper is then
  only an aligner, never an author).

## P3 — asset intelligence

- Registration pass on ingest: auto-crop bounds, align variant frames by
  landmarks, world-height guide ("tim and carly are normal adults, the
  dog is small").
- Expression x mouth as a grid (emotion + open/closed) instead of flat
  pose names.
- Series-level asset library (characters, voices, props, backgrounds
  reusable across shows).

## P4 — richer direction

- Named technique library (dramatic_reveal, uncomfortable_zoom,
  smash_to_black...) built from primitives, reused not regenerated.
- Composition checks from metadata (occlusion, ground plane, caption
  vs focal point).
- Viewpoint rules as data (the Steven dog/suit rule is hand-staged
  today; it should compile from "IF viewpoint == TIM_SPOT ...").

## Standing rules

- Do not overanimate. Static holds, slides, bobs, mouth swaps, hard
  cuts. Comic timing over fluid motion.
- Audio is the timing authority once real recordings exist.
- Verbatim means verbatim: no paraphrase, no softened profanity, no
  invented captions, parentheticals are performance notes not text.
