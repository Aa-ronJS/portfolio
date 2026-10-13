# Lineage: Design Decisions

A record of every design decision made so far, in the order they were reached, with the reasoning. When a later decision replaced an earlier one, the earlier one is marked **superseded**.

## Vision

- **What it is:** a hominin evolution simulator played as a real-time strategy game. You guide the earliest hominins from tree-dwelling apes onward, but the game has no assumed destination. Modern humans are one possible outcome, not the goal.
- **Simulator first:** outcomes come from systems (bodies, drives, culture, ecology, physics), never from a scripted tech tree or authored story.
- **Creatively open:** a band can try anything physically plausible. Taming bears, eating poison, living in the cold: all possible. The balance comes from cost and from a world that pushes back (neighbours starve your bears, learn not to eat your poison, push you into the cold), not from locks.
- **Time-traveller fantasy:** the player knows how to make fire, bronze or radios; the game never says no, but physics, materials, skill, population and attention make it brutally hard to get a band of apes to sustain it.

## Perspective and control

- **Superseded:** a zoomed-out strategic map with bands as tokens.
- **Superseded:** a fixed "player band".
- **Current:** the game is played zoomed in, at ground level, with real individuals.
- **No "my" hominin:** the player focuses on one individual at a time, and it can be any hominin in any group or species. There is no owned band.
- **One at a time:** you can only consistently steer the focused individual. Anyone else you ask to help does it until they get bored and wander off.
- **The band pulls at you:** others groom, play, beg, court, challenge, fight, sleep and wander, and they interrupt the focused hominin. Managing the group is the game.

## Willingness and teaching

- **Drives first:** every individual runs on drives (hunger, thirst, fatigue, fear, social need, boredom, mating, dominance, curiosity, cold). Orders are just one more input and often lose.
- **Won't, not can't:** a well-fed hominin won't gather. You wait until it's hungry, stop it eating what it picks, make it store food instead, and defend the store from others. Pushing sometimes works and always builds frustration.
- **Resistance:** every individual has a resistance value per behaviour, at three levels: specific (store berries), object class (store edibles) and action chain (pick up and put down). Each forced repetition lowers it. Genes set the starting point.
- **Watching teaches:** anyone who sees a behaviour loses a little resistance to it, more if they're young, bonded to the performer, or the performer is high-status. When a trained individual is killed, the effort isn't lost, because the watchers are already easier to teach.
- **Earned recognition:** a behaviour is only named after it's been repeated across at least two days and someone has done it without being told. Stages are attempt, emerging and recognised.

## Actions: no scripted options

- **Verb + target + instrument:** every action is composed freely. Verbs are atomic (grab, bite, squeeze, hit, scrape, poke, dig, rub, shake, pull, throw, put, eat, drink, sniff, climb, wear, plus social verbs). Instruments are body parts (hands, teeth, feet, whole body) or anything held. Targets are anything tapped.
- **Physics decides:** "grab a fish" is grab + water + hands. "Squeeze a rock with teeth" is allowed and hurts. Outcomes come from properties: force against shell hardness, sharpness against toughness, heat from friction over time.
- **The game recognises patterns, it doesn't contain behaviours:** it logs what individuals actually do, compares it with what their drives predicted, and promotes recurring deviations that pay off into recognised behaviours. "Storing berries instead of eating them" exists only because someone did it enough times.
- **Generalisation:** learning one thing makes related things easier. An expert berry storer has a lower resistance to "pick up and put down" in general, so trying it with stones and sticks comes more easily.

- **No dead ends (14 Oct 2026):** every combination has an effect. "Nothing happens" is not an outcome. When the specific rules come up empty, a fallback layer decides what happens instead from the things' properties: soft things squash, light things get knocked aside, plants drop leaves, termites swarm, animals react. Sniffing is the one action whose effect is knowledge rather than a change in the world.
- **Water and ground are materials:** water in a hand lasts seconds, in a leaf longer, in a gourd bowl longest. It soaks into dirt, sinks into sand and pools on rock. Hitting the ground digs a hole; stones put in one place form a pile, a ring, or the lining of a hole; a stone-lined or mud-sealed hole holds water and fills when it rains.
- **A habit includes the setup:** a band that has learnt to store berries also goes and picks them to store when it isn't hungry, not only when berries happen to be in hand.

## Teaching it (14 Oct 2026)

- **Tutorial, not manual:** the game opens on a title screen. Lesson one teaches storing berries, the example in this document, from grab to recognised habit. Lesson two builds a water store. The student is kept alive and in a middle band of hunger during the lessons, so they are about teaching, not survival.
- **Show the learning:** a Teaching bar shows how natural the last thing you asked feels to the focused hominin, with a line at 50% where they may start doing it unprompted, and how many of the band find it natural. Popups show results, refusals, watchers learning, and hominins acting on a habit by themselves.

## Food, storage and the world pushing back

- **Food is the first resource:** berries, figs, nuts, roots, termites, fish, small animals, carcasses. Big game needs cooperation.
- **Storage is never safe:** food rots (faster when wet), gets eaten by pests, smelled by scavengers, stolen by bandmates and rivals, and seized by dominant individuals. Each failure is pressure that grows new behaviours: covering, burying, guarding, drying.
- **Ownership:** storers remember caches and notice when food goes missing. Thieves who are seen get remembered. Dominant hungry males take food by display, shove, then fight, and occasionally kill.
- **Rivals and predators adapt:** predators change tactics in response to how they're treated, prey get warier when hunted, and rival groups exploit your dependencies.

## Cooperation (next to build)

- **Herding unlocks coordination:** you start able to steer one individual. Getting several to act together (forcing cooperation by herding them) unlocks rudimentary coordination.
- **Big game:** antelope can only be caught by a group. The first cooperative kill unlocks cooperative hunting and bigger prey.
- **Tiers:** solo, following, joint action, roles, delegation. Earned through practice, lost through disuse or death.

## Evolution

- **Genes, skill, culture:** three layers. Skill is learned in a lifetime, culture spreads by watching and teaching, and genes shift over generations through who survives and breeds.
- **No buying traits:** you can't pick a mutation. You create the pressure (what the band repeatedly does and faces) and selection does the rest. Superseded: a Megabonk-style trait draft. Current: Elder Scrolls-style use-based improvement, with no slots and no caps, only costs.
- **Trade-offs and upkeep:** every gene shift costs energy and pulls against something else (long legs vs climbing, big jaw vs energy).
- **Bodies show their genes:** one rigged base model per body plan, with proportions, hair, skin, jaw, brow and braincase driven by gene values, and culture adding gear.

## Goals and scope

- **Sandbox mode** and **Lineage (goal) mode**.
- **Goal mode wins:** survive to the present day, and be the only surviving branch of hominins, as Homo sapiens was. How that happens is wide open: outcompeting, absorbing through interbreeding, outlasting, displacing, conflict.
- **Survive to today:** the run doesn't stop at modern humans. A lineage's biology shapes its society, so the present day can be unrecognisable: water-based, nocturnal, bear-symbiotic, never discovering fire.
- **Reaching the modern age:** the same engine (actions, properties, pattern recognition) has to scale to technology. That needs a materials-and-physics base, knowledge capacity limits (population, connectivity, storage of knowledge), and level-of-detail simulation.
- **Species switching:** at any time you can shift focus to another hominin species.
- **Stage 1** is roughly 7 Mya to the first permanent settlement threshold.

## Technical

- **Prototype:** browser, single HTML file, three.js r128, phone first (touch only, no keyboard).
- **Shipped game:** Godot 4 recommended, after the behaviour model is proven in the browser.
- **Testing:** headless scenario tests on fixed seeds for every behaviour change.
- **Art direction:** stylised low-poly 3D, warm ochre and obsidian palette.
