# Lineage

A 3D hominin evolution sandbox prototype. You focus on any hominin and try to get it to do things it doesn't instinctively want to do. Every action is a free combination of **verb + target + instrument** ("bite the nut with teeth", "rub the stick with a stick"), resolved by physical properties rather than a scripted list. Repeated behaviours lower resistance, spread to watchers, and become recognised culture.

## Run it

No build step. Pick one:

- **Double-click `index.html`.** three.js is bundled in `lib/`, so it works offline.
- **Local server** (recommended, avoids browser file restrictions):
  ```bash
  npm start            # serves on http://localhost:8080
  # or
  python -m http.server 8080
  ```

Add `?seed=1234` to the address to replay a specific world. The seed is shown in the ⚙ debug overlay and the help panel.

## Controls

| Action | Touch | Mouse / keyboard |
|---|---|---|
| Focus a hominin | Tap it | Click it |
| Walk | Tap ground | Click ground |
| Act on something | Tap it, choose **Do** and **With**, then **Try** | Same |
| Repeat last attempt | **Again** on the hominin panel | Same |
| Pan | One-finger drag | Left-drag |
| Rotate | Two-finger twist, ⟲ ⟳ buttons | Right-drag, Q / E |
| Zoom | Pinch, + − buttons | Scroll |
| Debug overlay | ⚙ | ⚙ |

## Tests

Headless scenario tests run the real simulation (with real three.js geometry) on fixed seeds.

```bash
npm install          # installs three@0.128.0 for the test harness only
npm test             # every test on seeds 222, 777, 4444
node tests/scenarios.js engine 222   # one test, one seed
```

| Test | Checks |
|---|---|
| refuse | Well-fed hominins refuse to gather; hungry ones comply; pushing builds frustration |
| interrupt | Bandmates pull the focused hominin off task; ignoring challenges costs rank; allies join fights |
| theft | Storers notice thefts; dominant males take food; fights are occasionally lethal |
| recog | Behaviours are only recognised after 2+ days and an unprompted performance |
| engine | Verb + instrument + target outcomes (fish by hand, cracking nuts, flaking stone, fire by friction) |
| explore | Hominins invent their own combinations |
| soak | 12 game days without errors |

Some results are probabilistic. `theft` can fail on a seed because lethal food fights are deliberately rare, and `recog` can fail if the trained hominin dies first.

## Layout

```
index.html                   the game (simulation + 3D + UI in one file)
lib/three.min.js             three.js r128 (MIT)
tests/scenarios.js           headless scenario tests
tests/run-all.js             runs all tests across seeds
prototypes/visual-target.html  3D art-direction scene with gene-driven character sliders
prototypes/sandbox-2d.html     earlier 2D version of the simulation
tools/stage1-questionnaire.html  offline design questionnaire (fillable)
mockups/index.html           all 11 screen and character mockups (open this)
docs/design-decisions.md     every design decision so far, with reasoning
docs/implementation-plan.md  phased build plan and status
docs/world-variables.md      every atomic variable the world is built from
docs/stage1-questionnaire.md questionnaire as Markdown
```

## Design documents

All in `docs/`. Online originals:

- Implementation plan: https://claude.ai/code/artifact/e70c35f6-63db-4890-962b-35eadf6dfa62
- World variables reference: https://claude.ai/code/artifact/00ed1579-ccb1-4ebb-ba70-3bbb67085827
- Stage 1 questionnaire: https://claude.ai/code/artifact/422d1810-99d1-4200-b41a-27b45b5376d1
- Mockup canvas: https://claude.ai/artifact/GM15SsnPbGHh9mWBsiDjKT
- Live sandbox: https://claude.ai/artifact/KcnvoCTMJMJtJpKpFRWLCv

## Status

Done: willingness, social interruptions, ownership and theft, earned recognition, composable actions (Phases 0 to 4 of the plan, plus the verb + target + instrument system).

Next: Phase 5 (herding, cooperation and coordination tiers), then Phase 6 (data-driven materials engine to replace the per-verb outcome rules in `attempt()`).
