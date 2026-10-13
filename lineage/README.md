# Lineage

A 3D hominin evolution sandbox prototype. You focus on any hominin and try to get it to do things it doesn't instinctively want to do. Every action is a free combination of **verb + target + instrument** ("bite the nut with teeth", "rub the stick with a stick"), resolved by physical properties rather than a scripted list. Repeated behaviours lower resistance, spread to watchers, and become recognised culture.

**Every combination does something.** There is no "nothing happens": if the specific rules for an action come up empty, a fallback layer works out what happens instead from what the things are made of (a nut skitters away, leaves crumble into tinder, a hand on rock is bruised, a hyena lunges). The `every` test tries every verb with every body part and a wide range of held things against every kind of target, about 52,000 attempts per world, and fails if any of them leaves the world unchanged.

**The ground and water can be worked.** Water scooped by hand spills within seconds (longer in a leaf, longer still in a gourd bowl), soaks into dirt, sinks into sand and pools on rock. Hitting the ground with a stone digs a hole. Stones put together in one place form something: a pile (food on it stays off the wet ground), a ring (a fire inside won't spread), or, put into a hole, a stone-lined basin that holds water and fills when it rains. Mud seals a hole too.

**The tutorial** opens from the title screen. Lesson one teaches a habit, storing berries instead of eating them, from first grab to the band doing it on its own. Lesson two builds a water store: scoop, watch it seep away, dig, line with stones, fill.

## Run it

No build step. Pick one:

- **Double-click `Play Lineage.cmd`.** It opens the game in Edge.
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
| Walk | Tap ground, then **Walk here** | Same |
| Act on the ground or water | Tap it, choose **Do** and **With**, then the big button | Same |
| Act on something | Tap it, choose **Do** and **With**, then **Try** | Same |
| Repeat last attempt | **Again** on the hominin panel | Same |
| Repeat the last two (grab, then put) | **Repeat both** | Same |
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
| every | Every verb, body part and held thing against every kind of target changes the world, and none says "nothing happens" |
| water | Scooped water spills, seeps into dirt, a stone digs a hole, an unlined hole leaks, four stones make a basin that holds, leaves carry water longer, stones form a pile then a ring |
| tutorial | Lesson one played through: the student passes 50% natural, is released, and the band recognises the habit |

Some results are probabilistic. `theft` can fail on a seed because lethal food fights are deliberately rare (it failed on all three seeds before the October 2026 changes too), and `recog` can fail if the trained hominin dies first.

The harness reads `index.html` with either line ending, so `npm test` also runs on a Windows checkout.

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

Done: willingness, social interruptions, ownership and theft, earned recognition, composable actions (Phases 0 to 4 of the plan, plus the verb + target + instrument system). Since 14 Oct 2026: every action has an effect; workable ground and water (holes, piles, rings, basins, mud, carried water); a title screen; the two-lesson tutorial; a Teaching bar on the hominin panel; popups over heads; an edge pointer for off-screen targets; and **Repeat both**.

Next: Phase 5 (herding, cooperation and coordination tiers), then Phase 6 (data-driven materials engine to replace the per-verb outcome rules in `attempt()`).
