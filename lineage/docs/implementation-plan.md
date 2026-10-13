# Lineage: Implementation Plan for the Sandbox Gaps

Oct 13, 2026

This plan closes the gaps found in the audit of the 3D sandbox, in an order where each phase builds on the last. Phases 1 to 5 fix how individuals behave, Phase 6 replaces the hand-written action rules with a general materials engine, and Phases 7 and 8 add the wider game.

- Every phase ends with scenario tests that must pass before the next starts. Nothing is marked done on the strength of code alone.
- The browser build stays the testbed for Phases 0 to 6, because it runs on a phone and changes ship in minutes. The engine move to Godot comes after the behaviour model is proven.
- Effort is given in focused build sessions with Claude, roughly two to four hours each.

**Status (Oct 13, 2026):** Phases 0 to 4 are done, plus a composable verb + target + instrument action system. Phase 5 is next.

## Phase 0: Verification baseline

**Goal:** prove behaviour with tests and prove the 3D build runs on a phone, before changing anything else.

- **Scenario test harness:** a headless runner that loads a fixed-seed world, sets up a situation ("well-fed male, berry bush nearby") and checks the outcome. Every gap in the audit becomes a failing test now and a passing test later.
- **On-device check:** a debug overlay showing frame rate, draw calls, entity counts and the focused hominin's drives and resistance values.
- **Performance budget:** 30 frames per second on a phone with 40 hominins in view. If missed: distant hominins switch to simple low-detail models and stop casting shadows.
- **Replay seeds:** every run shows its seed, so a strange event can be replayed and debugged.

**Done when:** the audit's failing behaviours exist as automated tests, and the frame rate on the phone is confirmed.

**Effort:** 1 to 2 sessions.

## Phase 1: Willingness for every order

**Goal:** a hominin only does what is asked if it wants to, or if the player keeps pushing. A full hominin won't gather.

- **Motivation score for any order:** every order is scored against what the individual's drives want right now. The score combines:
  - The drive behind the action (gathering is driven by hunger, so a full hominin scores near zero).
  - Personality (curiosity, attention, impulse control).
  - Bond with the individual asking.
  - Resistance to that behaviour.
- **Compliance roll:** a low score means refusal ("Not hungry, won't pick") or a half-hearted start that is abandoned. Repeating the order raises the chance slightly, at the cost of frustration.
- **Frustration:** builds with repeated pushing. High frustration lowers bonds and can trigger lashing out or walking off.
- **Waiting is a strategy:** the card shows which drive would make this order acceptable ("Will gather when hungry").
- **Applies to all verbs.**

**Done when:**

- A well-fed hominin refuses to gather at least 80% of the time.
- The same hominin gathers readily once hungry.
- Pushing a refused order repeatedly sometimes succeeds and always raises frustration.

**Effort:** 2 sessions.

## Phase 2: Social interruptions

**Goal:** the band constantly pulls the focused hominin off task. The player manages the whole group, not just one body.

- **Social events aimed at the focused hominin:** each arrives with its own urgency:
  - A grooming invitation from a friend.
  - A juvenile wanting to play.
  - A mating approach.
  - A dominance challenge from a higher-ranked male.
  - A begging request for food in hand.
  - A fight breaking out nearby that drags allies in.
- **Response is decided by drives and relationships:** the hominin may drop the task to respond. The player can override, at a cost to bonds or rank (ignoring a challenge lowers rank, refusing a friend lowers the bond).
- **Others' actions disrupt:**
  - Sleeping hominins block a path.
  - A fight scatters the group.
  - A mating pair leaves the band's protection and becomes predator bait.
- **Alerts with a "go" button** for anything worth stopping: a fight, a theft, a juvenile wandering towards water.

**Done when:**

- During one minute of walking orders, the focused hominin is pulled away at least once by another individual.
- Ignoring a challenge measurably drops rank.
- A fight nearby draws in bonded allies.

**Effort:** 2 sessions.

## Phase 3: Ownership, theft and dominance

**Goal:** stored food is something individuals claim, guard, steal and fight over, including the big male who kills a trained storer.

- **Claims and memory:** whoever stores food remembers where and how much. Returning to find it gone counts as a theft, even without seeing it.
- **Witnessing:** anyone who sees a theft remembers who did it. The storer gains anger toward the thief, and witnesses lose trust in them.
- **Guarding:** a storer with a known cache may stay near it, threaten anyone approaching, or move it.
- **Dominance seizure:** high-rank, high-aggression individuals target visible or guarded food when hungry. The escalation ladder is display, then shove, then fight. The fight can turn lethal, depending on size, strength, injuries and allies nearby.
- **Retaliation and alliances:** bonded allies may join a fight. A killing changes the band: fear, lower trust, a possible split, or the killer driven out.
- **Player options:** guard, hide the cache, bury or cover it, get allies close, share food to buy peace, or fight. Fighting is risky by design.
- **Learning from loss:** witnesses to the storing and the killing both lose resistance. Storing spreads anyway, and so might hiding.

**Done when:**

- A storer who finds a cache emptied shows anger toward known thieves.
- In repeated runs, a dominant male sometimes seizes a guarded cache and the fight is sometimes lethal.
- Witnesses of a stored-food killing show lower resistance to storing and to hiding.

**Effort:** 3 sessions.

## Phase 4: Slower, earned recognition

**Goal:** a behaviour is named only once it has really taken hold, so teaching feels hard-won.

- **Three stages:** each shows in the Culture panel with progress.
  - **Attempt:** done once.
  - **Emerging:** repeated by one individual.
  - **Recognised:** independently repeated by several individuals and paying off.
- **Stricter thresholds:**
  - Tuned so a first teaching run takes about 10 to 20 forced repetitions.
  - Counts spread across at least two in-game days.
  - At least one individual must do it unprompted before recognition.
- **Resistance curve:** flatter at first, steeper once a few have learned it. Early teaching is slow and later spread is fast.
- **Visible progress:** the hominin card shows the focused individual's resistance to the behaviour being taught.

**Done when:** in scenario tests, recognition never happens before the second in-game day or before one unprompted performance.

**Effort:** 1 session.

## Phase 5: Herding, cooperation and coordination tiers

**Goal:** the player starts able to steer one individual. Coordination is earned through joint success, and it widens what can be controlled.

- **Herding:** the focused hominin can gather others by displaying, calling, leading with food, or chasing stragglers. Whether each one comes depends on bond, rank, fear and hunger. Herded individuals nearby copy the focused hominin's action on the same target.
- **Joint actions become patterns:** two or more individuals acting on the same target within a few seconds is logged as a joint pattern, such as "mobbing a hyena together" or "driving an antelope into water".
- **Antelope can only be caught jointly:**
  - A lone chase always fails.
  - Escape needs open directions; blocking them with hominins or water slows and corners the animal.
  - A kill needs several hits in a short window.
- **Coordination tiers per band:** tiers rise with successful joint patterns, fall without practice, and are lost if skilled individuals die.

| Tier | Earned by | Unlocks |
| --- | --- | --- |
| 0. Solo | Start | Control one individual; others help briefly when led |
| 1. Following | Repeated herding and food sharing | Herded group follows and mirrors simple actions |
| 2. Joint action | Several successful mobbings or joint gathers | Select a small group; give one order to all |
| 3. Roles | First cooperative antelope kill | Assign driver and ambusher roles; bigger prey |
| 4. Delegation | Long practice, attention span gains | Standing orders that persist without focus |

- **Sharing decides whether it lasts:** meat shared after a hunt raises trust and coordination. Hoarding lowers both and can break the group.

**Done when:**

- A solo antelope chase never succeeds.
- A herded group of four can corner and kill one.
- The first kill raises the band to Tier 3, and group selection appears in the interface.

**Effort:** 4 sessions.

## Phase 6: General materials and process engine

**Goal:** replace the per-verb outcome rules with a data-driven engine, so combinations nobody wrote still produce physically sensible results.

- **Materials as data:** every material from the World Variables Reference becomes a row of property values: hardness, toughness, brittleness, mass, sharpness, flammability, toxicity, perishability, and so on. Adding a material is editing data, not code.
- **Contact model:** strike, cut, probe and throw all resolve through one calculation: impact energy against the target's hardness and toughness. That decides crack, chip, flake, dent, break or nothing. Sharpness against toughness decides cut depth.
- **Process rules:** general conditions that change properties, written as data. Examples: "edible plus heat for a time gives cooked"; "perishable plus dry heat with no moisture gives dried"; "fuel plus ignition plus air gives fire".
- **Assemblies:** binding two objects with fibre, sinew or resin makes a composite whose properties derive from its parts, such as a stone tip on a stick. The pattern system recognises assemblies that keep working.
- **Conditions as world state:** temperature, moisture, wind and contact are tracked per tile and per item, so the same rule works in rain, sun or fire.
- **Migration:** every existing hand-written effect must reappear from the general rules. Each is a regression test, written before the old code is deleted.

**Stage 1 scope:** stone, wood, bone, plant fibre, hide, fire, food processing and simple binding. No ceramics or metals yet.

**Done when:**

- All current effects reproduce through the engine.
- At least five combinations that were never explicitly written produce sensible results in tests (for example, a bone striking a nut, or resin plus stone plus stick).

**Effort:** 6 to 8 sessions. This is the largest phase and the foundation for reaching later eras.

## Phase 7: Species, switching and deep-time skips

**Goal:** several hominin species share the world, the player can focus on any of them, and evolution plays out across skips.

- **Species tracking:** each band belongs to a lineage with a gene pool. Isolation and genetic distance split lineages into new species automatically.
- **More species:** three to four lineages at start, each with different body plans, all running the same brain and culture systems.
- **Living hominins roster:** a roster from the mockups for jumping focus between species.
- **Two levels of detail:**
  - Bands near the camera run the full simulation.
  - Off-screen bands run a lightweight population model (food, births, deaths, gene drift, culture spread).
  - Bands are switched between levels smoothly as the camera moves.
- **Deep-time skips:** a player-triggered or climate-triggered skip runs the population model over thousands of years:
  - Selection on pressures the band actually faced.
  - Mutation.
  - Speciation and extinction.
  - The return summary screen from the mockups.
- **Climate track:** wet and dry cycles become a long-term trend with pulses, driving the skips.

**Done when:**

- A 50,000-year skip changes body proportions in the direction of the pressures applied.
- Isolated bands split into a new species over long skips.
- Switching focus between species keeps the world consistent.

**Effort:** 6 sessions.

## Phase 8: Goal mode and mobile 3D polish

**Goal:** a complete, playable Stage 1 loop that looks good and runs well on a phone.

- **Goal mode:** survive the Stage 1 window and be the last surviving hominin branch, with Sandbox kept separate. Ending screens cover victory, partial victory and extinction, with the run's history and lineage tree.
- **Saving:** autosave and manual save in the browser, plus export and import of save files.
- **Visual pass:**
  - Better hominin shapes and walk animation.
  - Ambient occlusion and bloom where the phone can handle it.
  - Dust and fire particles.
  - Weather that changes the light.
- **Readability:** thought icons over heads, a clear marker for whoever is being taught, and a visual cue for anyone resisting an order.
- **Phone performance:**
  - Distant hominins switch to simple models.
  - Shadows only near the camera.
  - An adaptive quality setting that steps down when the frame rate drops.
- **Audio:** ambient world sound, hominin calls, and fire and rain.

**Done when:**

- A full Goal-mode run can be won or lost on a phone at 30 frames per second or better.
- The interface works one-handed without a keyboard.

**Effort:** 5 sessions.

## Sequencing and risks

Total: about 30 to 33 sessions.

| Phase | Sessions | Depends on | Testable result |
| --- | --- | --- | --- |
| 0. Verification baseline | 1 to 2 | Nothing | Frame rate on the phone, debug overlay |
| 1. Willingness | 2 | 0 | Full hominins refusing to gather |
| 2. Social interruptions | 2 | 1 | Being pulled off task by the band |
| 3. Ownership and theft | 3 | 1, 2 | The full berry-storer story, including the killing |
| 4. Earned recognition | 1 | 3 | Slow teaching, visible progress |
| 5. Cooperation tiers | 4 | 2, 4 | Herding, first group antelope kill, group orders |
| 6. Materials engine | 6 to 8 | 4 | Unwritten combinations that still work |
| 7. Species and deep time | 6 | 5, 6 | Skips, speciation, switching species |
| 8. Goal mode and polish | 5 | 7 | A complete winnable run on a phone |

**Risks**

- **Frustration overshoot:** Phases 1 to 3 deliberately make control harder. If the early game stops being fun, the levers are compliance odds, interruption frequency and threshold tuning. The Phase 0 harness makes those changes measurable.
- **Phone performance:** the browser has a hard ceiling. If the phone can't hold 30 frames per second with a full band, simplified distant models move forward from Phase 8.
- **Materials engine scope:** general physics can sprawl. Phase 6 is capped at Stage 1 materials, and anything beyond needs a regression test before it goes in.
- **Single-file limit:** past Phase 6 the code outgrows one HTML file. That is the natural point to move to Godot, with the browser build kept as the design testbed.
