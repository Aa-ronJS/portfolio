# Lineage: Stage 1 Design Questionnaire

Answer in the right-hand column. Parts run from the biggest decisions down to system detail. "Don't know yet" is a valid answer. Stage 1 means the first shippable version: roughly 7 Mya to the first permanent settlement threshold. An interactive offline version is in `tools/stage1-questionnaire.html`.

## Part 1: Vision and identity

These answers set every trade-off later in the build.

| # | Question | Your answer |
| --- | --- | --- |
| 1.1 | In one sentence, what is this game? | |
| 1.2 | What should a player feel after a great run? (awe, ownership, tension, curiosity, loss) | |
| 1.3 | Simulator first or game first? When realism and fun conflict, which wins, and is there a line realism never crosses? | |
| 1.4 | How scientifically grounded should it be? (strict, plausible, loosely inspired) | |
| 1.5 | Is the real human story referenced in-game (real species names, fossil overlay) or kept hidden? | |
| 1.6 | Working title: keep "Lineage" or explore others? | |
| 1.7 | Three existing games it should be compared to, and what you take from each | |
| 1.8 | What is this game explicitly NOT? (list anything you want ruled out) | |
| 1.9 | Tone: serious documentary, grounded drama, light-hearted, or mixed? | |
| 1.10 | Is violence between hominins shown graphically, abstracted, or avoided? | |
| 1.11 | What is the single most important system to get right in Stage 1? | |

## Part 2: Player, audience and feel

Who plays decides complexity, pacing and how much the game explains itself.

| # | Question | Your answer |
| --- | --- | --- |
| 2.1 | Who is the core player? (RTS veterans, sim and colony fans, science enthusiasts, casual) | |
| 2.2 | How complex can it be on day one before it loses them? (Dwarf Fortress deep vs Age of Empires readable) | |
| 2.3 | How much should the game explain its systems? (full numbers, hints only, discover by playing) | |
| 2.4 | Target length of one full Stage 1 run, in real hours | |
| 2.5 | Target length of a typical sitting, in minutes | |
| 2.6 | Single-player only for Stage 1, or any multiplayer? | |
| 2.7 | Should a run be pausable at any moment, or does real-time pressure matter? | |
| 2.8 | Tutorial approach: guided first run, separate tutorial, or none? | |
| 2.9 | How punishing should failure be? (extinction wipes the run, rewind allowed, save anywhere) | |
| 2.10 | Platforms for Stage 1 (PC only, Mac, Linux, Steam Deck, console later) | |
| 2.11 | Input: mouse and keyboard only, or controller support needed? | |

## Part 3: Stage 1 scope boundaries

This part decides what ships first and what waits.

| # | Question | Your answer |
| --- | --- | --- |
| 3.1 | Where does Stage 1 end? (first permanent settlement, a fixed date, a population size, player choice) | |
| 3.2 | What happens when a player reaches the end of Stage 1? (extrapolated present-day report, continue in sandbox, wait for Stage 2) | |
| 3.3 | Is Goal mode in Stage 1, or sandbox only at first? | |
| 3.4 | Is species switching in Stage 1? | |
| 3.5 | Is taming and domestication in Stage 1, or later? | |
| 3.6 | Are buildings in Stage 1? If yes, which kinds at most? (windbreaks, hearths, shelters, caches) | |
| 3.7 | Is fire in Stage 1? | |
| 3.8 | Maximum number of hominin species alive at once in Stage 1 | |
| 3.9 | Must-have features for a first public release (list) | |
| 3.10 | Nice-to-have features that can slip (list) | |
| 3.11 | Features you are happy to cut entirely from Stage 1 (list) | |
| 3.12 | Is a playable prototype for yourself the first goal, or a public demo? | |

## Part 4: Time, pacing and session structure

Time is the hardest design problem: real-time play has to coexist with millions of years.

| # | Question | Your answer |
| --- | --- | --- |
| 4.1 | How much in-game time passes per real minute of live play? (a day, a season, a year) | |
| 4.2 | Do individuals visibly age, give birth and die during live play? | |
| 4.3 | How long is one live-play stretch before a skip is typical? (one season, one generation, player decides) | |
| 4.4 | Who triggers deep-time skips: player only, climate events, or both? | |
| 4.5 | Can the player skip at any time, or only at safe moments? | |
| 4.6 | Are there day and night cycles with gameplay effects? | |
| 4.7 | Are there seasons (wet and dry) with gameplay effects? | |
| 4.8 | Should the pace speed up as culture develops (shorter skips later)? | |
| 4.9 | How many skips do you expect in a full Stage 1 run? (rough number) | |
| 4.10 | What should a player do in the first 10 minutes of a new run? | |
| 4.11 | What keeps the middle of a run from feeling repetitive? | |

## Part 5: World, map and climate

The world is the main source of pressure, so its shape drives everything else.

| # | Question | Your answer |
| --- | --- | --- |
| 5.1 | Real Earth geography (Africa, then beyond) or a fictional, procedurally generated world? | |
| 5.2 | If real Earth: how much of it is playable in Stage 1? (East Africa only, all of Africa, the Old World) | |
| 5.3 | If procedural: does every seed give a different continent layout? | |
| 5.4 | Map scale: how long to walk a band across the playable area, in real minutes? | |
| 5.5 | One continuous seamless map, or regions loaded separately? | |
| 5.6 | Climate: follow real paleoclimate closely, loosely, or fully random per seed? | |
| 5.7 | Which biomes must exist in Stage 1? (forest, woodland, savanna, lakeshore, coast, desert, mountain, cold) | |
| 5.8 | Does terrain change visibly over time? (lakes shrink, forests retreat, rivers move, volcanoes) | |
| 5.9 | Can the player's actions change the landscape? (fire clearing, overhunting, trails, camps) | |
| 5.10 | Fog of war: explored areas stay visible, or fade if not watched? | |
| 5.11 | Are there one-off disasters? (volcanic eruptions, megadroughts, floods) | |

## Part 6: Units, bands and control

This defines what the player actually clicks on.

| # | Question | Your answer |
| --- | --- | --- |
| 6.1 | Is every on-screen unit one individual, always? | |
| 6.2 | Typical band size, and the maximum number of units on screen at once | |
| 6.3 | How many bands can a player run at once before it becomes unmanageable? | |
| 6.4 | Direct control of individuals (click a unit, give an order) or orders to groups only? | |
| 6.5 | Do units have autonomy? Can they ignore orders when hungry, scared or loyal to a leader? | |
| 6.6 | Do individuals have names, personalities and memories, or are they anonymous? | |
| 6.7 | Are there leaders or special individuals? How do they emerge? | |
| 6.8 | Can the player follow a single individual through life (a hero or protagonist view)? | |
| 6.9 | Roles: assigned by the player, emergent from skills, or both? | |
| 6.10 | Do children need care, and does that tie up adults? | |
| 6.11 | How do births work? (periodic, driven by food surplus, pair bonds, player has no say) | |
| 6.12 | Can the player split and merge bands freely? Any cost? | |

## Part 7: Exposure system (genes, skill, culture)

The core loop: every action trains skill, spreads culture and, over generations, shifts genes.

| # | Question | Your answer |
| --- | --- | --- |
| 7.1 | How many gene axes in Stage 1? (a short core list, or a large open set) List any you consider essential | |
| 7.2 | How visible are gene values to the player? (exact numbers, bands like low and high, only through appearance) | |
| 7.3 | How fast should skill grow from practice? (noticeable within one session, or slow) | |
| 7.4 | Does skill decay when unused? How fast? | |
| 7.5 | How does culture pass on? (children only, anyone watching, deliberate teaching) | |
| 7.6 | Can culture be lost entirely if the last practitioner dies? | |
| 7.7 | How visible is selection to the player? (live stats, only in skip summaries, hidden) | |
| 7.8 | Should mutations be shown as they appear in individual births? | |
| 7.9 | How strong should trade-offs be? Should a specialist build be clearly fragile? | |
| 7.10 | Should the player be able to influence mate choice or breeding directly? | |
| 7.11 | How should outcomes be graded? (success, partial, harm, death, or more steps) | |
| 7.12 | Can sexual selection create traits for display only (ornaments, colouring)? | |
| 7.13 | How should disease work? (individual illness, epidemics, immunity evolving) | |

## Part 8: Interaction engine (verbs and properties)

This decides how open "try anything" really is.

| # | Question | Your answer |
| --- | --- | --- |
| 8.1 | How does the player issue unusual actions? (context menu of verbs, drag item onto target, free combination) | |
| 8.2 | List the verbs you consider essential for Stage 1 | |
| 8.3 | List the object properties you consider essential (toxicity, hardness, flammability, temperament) | |
| 8.4 | Can units combine two objects? (stone on stone, stick and stone) How deep can combinations go in Stage 1? | |
| 8.5 | How are discoveries announced? (named and celebrated, quiet log entry, unnamed until it spreads) | |
| 8.6 | Can the player name discoveries, behaviours and their species? | |
| 8.7 | Where is the line on plausibility? Give an example of something a player should never be able to do | |
| 8.8 | Should failed attempts teach anything? (skill gain from failure, avoidance learned) | |
| 8.9 | Do objects degrade or get used up? (tools break, carcasses rot, fire burns out) | |
| 8.10 | Can units carry items? How many, and does carrying slow them? | |

## Part 9: Survival, resources and economy

This sets the moment-to-moment pressure on the player.

| # | Question | Your answer |
| --- | --- | --- |
| 9.1 | Which needs does each individual track? (hunger, thirst, temperature, fatigue, safety, social) | |
| 9.2 | Are resources held by the band (shared pool) or carried by individuals? | |
| 9.3 | List the resource types for Stage 1 | |
| 9.4 | Can food be stored? Does it spoil? | |
| 9.5 | What sets the population cap? (food, territory, shelter, a fixed number) | |
| 9.6 | Is there trade or exchange between bands? Between species? | |
| 9.7 | Is there any concept of ownership or territory the game enforces? | |
| 9.8 | How harsh is starvation? (slow weakening, sudden deaths, band breaks up) | |
| 9.9 | Should the economy show numbers (income and spend per day) or be felt through unit condition? | |
| 9.10 | Do resources regenerate? At what rate relative to a generation? | |

## Part 10: Combat and conflict

This decides how much the game plays like a classic RTS in a fight.

| # | Question | Your answer |
| --- | --- | --- |
| 10.1 | How central is combat? (frequent, occasional, rare and decisive) | |
| 10.2 | Micro-managed fights (control each unit) or stance-based (set behaviour and watch)? | |
| 10.3 | What decides a fight? (individual stats, numbers, morale, terrain, surprise) | |
| 10.4 | Is morale and fleeing a major system? | |
| 10.5 | Do injuries persist? (limping, scars, permanent disability) | |
| 10.6 | Is there ranged combat in Stage 1? (thrown stones, sticks) | |
| 10.7 | Can bands take captives or adopt individuals from other groups? | |
| 10.8 | Hominin vs hominin conflict: how common early on, and should it escalate over time? | |
| 10.9 | Can the player ambush, raid camps or steal food from rivals? | |
| 10.10 | Should combat drive evolution directly? (fighting raises throwing and cooperation pressure) | |

## Part 11: Animals, ecology and domestication

The living world is both the threat and the opportunity.

| # | Question | Your answer |
| --- | --- | --- |
| 11.1 | Real extinct animals of the period (sabre-toothed cats, giant hyenas, deinotheres) or invented creatures? | |
| 11.2 | How many animal species in Stage 1? (rough number) | |
| 11.3 | Do animals evolve with the same gene system as hominins, or a simpler one? | |
| 11.4 | Do animal populations crash and recover with hunting and climate? | |
| 11.5 | How hard is taming? (anything possible with enough time, or limited by temperament) | |
| 11.6 | Can tamed animals fight, carry, guard, or provide food? | |
| 11.7 | Can rivals steal, kill or turn your animals? | |
| 11.8 | How detailed are plants? (food sources only, or growing, spreading, burnable vegetation) | |
| 11.9 | Should predators learn and adapt within a session, or only across skips? | |
| 11.10 | Can animals be driven extinct by the player? Is that a consequence you want? | |

## Part 12: Rival species and AI

Rival AI is the biggest build cost and the main source of challenge.

| # | Question | Your answer |
| --- | --- | --- |
| 12.1 | Do rival species start at the beginning, or only appear by branching from your lineage and others? | |
| 12.2 | Should rival AI play to win (be the last branch too) or just survive? | |
| 12.3 | How smart should the AI be at exploiting your dependencies? (adjustable by difficulty?) | |
| 12.4 | Should the AI cheat (see through fog, get bonuses) at higher difficulties, or never? | |
| 12.5 | Can you communicate or negotiate with other species? (peace, trade, tolerance) | |
| 12.6 | Should AI species have distinct personalities? (aggressive, cautious, opportunistic) | |
| 12.7 | How often should the player meet rivals in Stage 1? | |
| 12.8 | Should the AI learn from the player across runs, or only within a run? | |
| 12.9 | Can a rival species become an ally? | |

## Part 13: Speciation, interbreeding and species switching

These rules decide what counts as "your lineage" and how branches form.

| # | Question | Your answer |
| --- | --- | --- |
| 13.1 | What triggers a new species? (isolation time, genetic distance, player confirmation) | |
| 13.2 | Is the player told when their own population is about to split? Can they prevent it? | |
| 13.3 | Can different species interbreed? Where is the cutoff? | |
| 13.4 | Do hybrids carry traits from both sides, and can they be fertile? | |
| 13.5 | When your lineage splits, does the player keep both branches, choose one, or hand one to the AI? | |
| 13.6 | Switching: any time, after a cooldown, at a cost, or only at skips? | |
| 13.7 | Can the player switch to any species, or only hominins? (could you play the hyenas?) | |
| 13.8 | Who names new species: the game, the player, or both? | |
| 13.9 | Should the run keep a family tree of named individuals, or only species-level history? | |

## Part 14: Deep-time skips

Skips are where evolution happens at scale, so they need to feel earned, not like a loading screen.

| # | Question | Your answer |
| --- | --- | --- |
| 14.1 | Can the player set the length of a skip, or is it fixed or event-based? | |
| 14.2 | During a skip, does the player set any standing orders? (stay put, follow water, avoid rivals) | |
| 14.3 | Should the player watch the skip happen (time-lapse) or jump straight to the summary? | |
| 14.4 | What must the return summary show? (body changes, deaths, discoveries, rivals, map changes) | |
| 14.5 | Can a skip end early if something major happens? (extinction risk, rival contact) | |
| 14.6 | After a skip, where does the camera land? (same band, the strongest band, player chooses) | |
| 14.7 | Can a lineage go extinct during a skip, with no chance to react? | |

## Part 15: Goal mode, sandbox and scoring

This decides what winning means and what pulls players back for another run.

| # | Question | Your answer |
| --- | --- | --- |
| 15.1 | In Goal mode, is "last branch" checked only at the very end, or can it be won early? | |
| 15.2 | Is a partial win (survived but rivals remain) a real outcome or a loss? | |
| 15.3 | What does the player see on winning? (generated history, family tree, present-day report) | |
| 15.4 | Should there be a score? What should it reward most? | |
| 15.5 | Achievements: wanted? Examples of ones you'd love to see | |
| 15.6 | Meta-progression between runs: unlocks, archive only, or nothing? | |
| 15.7 | Should runs be shareable? (seed codes, lineage cards, replays) | |
| 15.8 | Any challenge modes you already have in mind? (start as a robust specialist, endless ice age) | |
| 15.9 | Difficulty settings: which levers matter most to you? | |

## Part 16: Art, audio and presentation

Art style decides cost, team and how the procedural bodies can work.

| # | Question | Your answer |
| --- | --- | --- |
| 16.1 | 2D, 2.5D, or full 3D? | |
| 16.2 | Art style: stylised low-poly, painterly, realistic, pixel art, other? Reference images or games | |
| 16.3 | Camera: top-down, angled RTS, free rotation, close follow? | |
| 16.4 | How close should the camera zoom? (faces readable, or always a distance) | |
| 16.5 | Should bodies morph visibly with genes (proportions, hair, skin) as shown in the concept sheets? | |
| 16.6 | Do hominins vocalise? Should a proto-language emerge audibly over time? | |
| 16.7 | Music: ambient, adaptive to events, minimal, or none? | |
| 16.8 | Narration or in-game chronicle text? Written by the game or by AI? | |
| 16.9 | UI style: keep the "Ochre and Obsidian" mockup direction, or change? | |
| 16.10 | Will you commission art, use asset packs, AI-assisted tools, or build it yourself? | |

## Part 17: Technical and production

This shapes how the build is organised and who does what.

| # | Question | Your answer |
| --- | --- | --- |
| 17.1 | Engine: confirm Godot 4, or another preference? | |
| 17.2 | Your own coding experience and preferred language (GDScript, C#, Rust, C++) | |
| 17.3 | Who builds it? (you plus Claude Code, a hired team, agents at scale, mix) | |
| 17.4 | Hours per week you can commit | |
| 17.5 | Minimum PC spec you want to support | |
| 17.6 | Must runs be deterministic (same seed gives the same history)? | |
| 17.7 | Save system: save anywhere, autosave only, ironman option? | |
| 17.8 | Modding support: important from the start, later, or never? | |
| 17.9 | Should any part use live AI models (narration, species naming, the present-day report)? Online required or offline only? | |
| 17.10 | Version control and project management tools you already use | |

## Part 18: Business and release

These answers decide how much polish Stage 1 needs and when.

| # | Question | Your answer |
| --- | --- | --- |
| 18.1 | Is this a commercial product, a passion project, or both? | |
| 18.2 | Target release model: Steam Early Access, full release, free demo first? | |
| 18.3 | Target price point | |
| 18.4 | Budget available for art, audio, hiring or tools | |
| 18.5 | Target date for a first playable build and for a public release | |
| 18.6 | Will you build in public (devlogs, Discord, wishlists) from early on? | |
| 18.7 | Funding: self-funded, publisher, crowdfunding, grants? | |
| 18.8 | Does this tie into your short-form video pipeline for marketing? | |
| 18.9 | What would make Stage 1 a success for you? (sales, wishlists, reviews, personal satisfaction) | |
