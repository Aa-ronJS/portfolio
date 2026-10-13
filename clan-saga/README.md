# Clan Saga

**It is playable now.** Double-click `Play Clan Saga.cmd` in this folder. It
starts the game and opens it in Edge. Keep the black window open while you
play; close it to stop.

Needs: Node (installed) and Claude Code signed in on this PC (it is). No API
key: the game asks Claude through your own Claude Code login.

## How it plays

- Seven chapters, forest apes to the wheel: The Forest, The Open Land, Fire,
  The Long Cold, The Village, Copper, The Wheel.
- Each season, choose what the clan does (keys 1 to 4, Enter to go on). The
  season's news tells you what is coming: herds, a failed crop, a leopard,
  fever.
- Anyone can try an idea. Type it (or press "Speak it") in plain words.
  Claude, as the world, judges it against what your clan really has: the
  materials in the Places list, what they already know, and what their
  bodies can do. It works, half works or fails, with a reason.
- Each chapter has one great challenge (a twig tool, a sharp stone, fire,
  clothes, a pot, copper, the wheel). Find it, then let it spread until half
  the clan know it. If everyone who knows it dies, it is lost.
- When the challenge is met the ages pass, and Claude tells that chapter as
  an oral history. Read the whole thing any time under "The saga".

Help levels: Teacher (plain hints), Elder (hints as sayings), Nature (none).

## What is where

- `public/sim.js`: the rules (seasons, food, danger, births, knowledge).
  `node tests/balance.js` plays 8,000 games headlessly to check balance.
- `public/art.js`: the scenes, drawn in code, with your actual clan in them.
- `public/game.js`, `style.css`, `index.html`: the screens.
- `server.js`: serves the game, saves to `saves/<clan>/` (state, `saga.md`,
  `world-facts.md`, `knowledge.json`), and calls Claude.
- `DESIGN.md`: the design pre-flight and tokens.
- Test without Claude: `set CLAN_SAGA_MOCK=1` then `node server.js`.

## What changed from the plan below

Ancestors is not installed on this PC, so this is its own game rather than a
mod, which also means it needs nothing else to run. The Invention engine
works from the first chapter, not only from Homo sapiens: apes can try
things too, judged as apes. The plan below is kept for the bigger version.

---

# The original plan

## Clan Saga, from the first ape to the first wheel

A brief for building on the Windows PC with Claude Code. Nothing here runs
in this repo; it's the plan to hand over. Open it there and say "read
`clan-saga/README.md` and start milestone 0".

## The pitch

One clan, one unbroken story, from apes in the Miocene forest to Homo
sapiens inventing the wheel. Every generation is remembered. And once your
people are modern humans, **you** are the inventor: you bring what you
know from today, how fire is made, why an arch stands, what clay does in
a kiln, and the world decides whether it works with what you have.

Spore did the "whole of evolution" idea as five shallow minigames. This is
better because:

- **it's one continuous world and one continuous story**, the clan's saga
  carries every death, discovery and legend forward, across every era;
- **progress is real knowledge, not a tech tree**, you don't unlock
  "Fire" by spending points; you describe how to make fire, with the
  materials you have, and it works or it doesn't, for real reasons;
- **history can be beaten, physics can't**, you can invent the wheel long
  before 3500 BCE if you can say how, with what, and pay the cost in time
  and failures. You can't invent the radio, because nobody can smelt
  copper with stone and wishes.

## Three parts

| Part | What it is | Where it lives |
|---|---|---|
| **The Saga** | Records what happens to the clan and has Claude turn it into an oral history: names, legends, who first did what | Every era, the spine of the whole thing |
| **The Long Road** | The eras from ape to Homo sapiens to the Neolithic | Ancestors for the first era; a second game for the later ones (see "Where it runs") |
| **The Invention engine** | You describe an invention; Claude judges it against your materials, tools, skills and real physics, and the game gives you the result | Once your clan is Homo sapiens |

## 1. The Saga

A script watches the game and writes events to a log: births, deaths
(and what killed them), first river crossing, new territory, a new
evolutionary step, a predator driven off, an invention made.

At natural breaks (sleeping, end of a session, a death, a generation
passing) Claude turns the new events into saga:

- **Names.** Clan members get names from what they did, Two-Scars, the
  one who swam, Ash-Hand. Names stay for life and are spoken of after
  death.
- **Legends.** The older an event, the more it reads like legend. Three
  generations on, the sabre-tooth that Grandmother Two-Scars drove off has
  become a story told at night, slightly bigger each time.
- **Credit.** Every invention names its inventor, forever.
- **It carries over.** The Saga is a set of plain files (below) that move
  with you from Ancestors into the later eras. Your sapiens village
  remembers the forest it came from.

Shown as a panel in game, a journal you read between sessions, and, the
easiest showcase there is, read aloud over footage, or turned into a
short with the animation pipeline in this repo.

## 2. The Long Road, the eras

Rough real timeline, used as the backbone. The player moves through it by
evolving and by surviving, as in Ancestors.

| Era | Roughly when | What changes for the player |
|---|---|---|
| Forest apes (Ancestors as shipped) | 10-2 million years ago | Survival, senses, stone and stick tools, clan growth, evolutionary leaps |
| Homo erectus | ~1.9 million-100,000 years ago | Walking long distances, hand axes, migration out of Africa, **fire, first used, then kept** |
| Archaic humans | ~600,000-40,000 years ago | Spears, hafting (stone tied to a shaft), shelters, cooking, burial |
| **Homo sapiens** | ~300,000 years ago on | **The Invention engine switches on.** Language, art, needles and clothes, bows, ropes, boats |
| Neolithic | ~12,000-5,000 years ago | Farming, herding, pottery, kilns, villages, copper, and the wheel (~3500 BCE in reality) |

Before Homo sapiens, the player does things the Ancestors way: by
trying. After it, they can also do things the modern way: by knowing.

## 3. The Invention engine

### How it plays

1. The player says or types an idea, in plain words. *"I'll make a bow
   drill: bend a green stick, tie sinew across it, wrap it round a dry
   straight spindle, spin it into a notch in a flat piece of soft dead
   wood, and catch the dust in dry grass."*
2. The game sends Claude what the clan actually has: inventory, known
   materials nearby, tools, skills, weather, season, who's doing it.
3. Claude judges it as **the world**, not as a teacher: does every part
   exist here? Is the method physically real? What's missing or wrong?
4. The game shows the result in the world: it works; it half works ("smoke,
   but no ember, the hearth board is damp"); or it fails, with a reason
   the player can learn from. Time passes, materials get used, and someone
   may get hurt.
5. A success becomes **known**: a new item, recipe or ability for the
   clan, credited in the Saga, and taught to the next generation (or lost,
   if everyone who knew it dies before teaching it).

### How much help, chosen per game

The player picks how the world guides them:

| Mode | Help given |
|---|---|
| **Teacher** | Clear hints when stuck, escalating: what's wrong → what to try → the method |
| **Elder** | Hints come as clan memory and legend ("The old ones said fire sleeps in dead wood, never living") |
| **Nature** | No hints. Only results. For people who know their stuff |

In every mode, "show me" is always there for a player who's truly stuck , 
a dead end must have a way out.

### The rules of judging

These go in the judge's instructions, and they're what make it fair:

- **Materials are real.** It has to exist in this place and era, and the
  clan has to have it or be able to get it. No copper without copper ore,
  no kiln without clay and enough heat.
- **Prerequisites are physical, not historical.** A wheel needs a way to
  cut a round, even slab or join planks, an axle, and a reason to roll
  things. Stone tools can do it, slowly, badly, with cracks. That's
  allowed.
- **Everything costs something.** Time, materials, effort, failed attempts.
  A first try usually half works. Quality improves with practice.
- **Partial credit is a result.** A nearly-right idea gets a nearly-right
  outcome and a clue, not a flat no.
- **No magic words.** Naming a thing ("I invent the wheel") does nothing.
  Saying how does.
- **Consistency.** Once something is decided about this world (this clay
  cracks in the kiln unless tempered with sand), it stays true. Kept in
  `world-facts.md`.

### What the judge returns

Structured, so the game can act on it, not just prose:

```json
{
  "outcome": "partial",
  "what_happens": "The spindle smokes and the board blackens, but no ember forms. The board is still damp from last night's rain.",
  "missing": ["dry hearth board"],
  "consumes": {"sinew": 1, "dry grass": 2},
  "time_hours": 2,
  "injury": null,
  "hint": {"teacher": "Wood that's been rained on won't hold an ember. Dead wood from under the overhang will be drier.",
           "elder": "Fire sleeps in old wood that the rain has forgotten."},
  "learned": null,
  "world_fact": "Wood left out in this season's rain stays damp for days."
}
```

`learned` names the new knowledge on a success (`"fire by bow drill"`),
which the game turns into a recipe or ability.

### The showcase chain

The demo every video wants: fire → cooking → clay pots → a kiln →
copper → a copper axe → wheels. Fire is the first milestone; the wheel is
the last.

## Where it runs, the honest part

**Ancestors can host the first era and the Saga, but not the later
eras.** It's Unreal Engine 4 with no official mod kit. Data changes
(`_P.pak` files) and scripting (UE4SS) work, but new human bodies,
animations, fire, building and new items need Unreal's editor at the
game's exact engine version and the game's assets rebuilt around them.
That's a total-conversion job.

So the plan has two hosts:

| Stage | Host | Why |
|---|---|---|
| Apes era + the Saga | **Ancestors** (UE4SS + `_P.pak` files) | It's the best ape game there is, and the Saga only needs to read events and show text |
| Later eras + Invention engine | **To decide at milestone 4**, options below | Needs fire, crafting, building and new items |

Options for the later host:

- **Vintage Story**, the strongest candidate. A survival game with a
  proper C# mod API, and it already has much of the material world:
  knapping flint, clay forming, pit kilns, firepits, metals, farming. The
  Invention engine plugs into what's there instead of inventing it all.
- **Your own game in Unreal Engine 5**, full control of the eras, the
  clan and the look. The biggest job by far; worth it only after the
  Saga and the Invention engine have proven fun.
- **Minecraft**, fastest to prototype; the look fights the tone.

The Saga files carry the clan from one host to the next.

**Prove the fun cheaply first.** The Invention engine can be built and
played as text before any game is involved (milestone 3). If describing
how to make fire and being judged by the world isn't fun as text, no
amount of art will save it. If it is, the host choice gets easy.

## Saga files

Plain files the player can read and edit. One folder per clan.

- `clan.md`, who the clan is now: members, names, ages, skills, who
  knows what.
- `events.jsonl`, the raw log, one event per line, written by the game.
- `saga.md`, the oral history Claude writes, era by era.
- `knowledge.json`, what the clan knows how to make, who knows it, who
  taught whom. Knowledge only survives if someone alive knows it.
- `world-facts.md`, what has been decided about how this world behaves.

## Claude API notes (`@anthropic-ai/sdk` or the C# SDK, whichever the host uses)

Ask Claude Code on the PC to load its `claude-api` skill first, it has
the exact current API shapes. The points that matter here:

- **Model:** `claude-opus-5-5`. Thinking can't be switched off; use effort
  to trade speed for care, `"low"` for Saga writing, `"medium"` (or
  higher) for invention judging, where getting the physics right matters.
- **Structured output for the judge.** Use structured outputs
  (`output_config.format` with a JSON schema) so every verdict has the
  shape above and the game never has to parse prose.
- **Refusals:** check `stop_reason === "refusal"` and turn on the server
  fallback (`fallbacks: "default"` with its beta header). If a call still
  fails, the attempt simply "takes longer" and is retried, never lose the
  player's materials or idea to an API error.
- **Append-only history.** Never edit earlier messages; write the saga
  and facts to files and start fresh conversations from them.
- **Caching:** the judging rules, `world-facts.md` and the clan summary go
  first and stay stable, with prompt caching on; the attempt goes last.
- **Never block the game.** Calls run in the background. The world keeps
  going while it thinks, "they work at it through the afternoon".
- **Key** in a git-ignored `.env`. Never committed.
- **Cost guard:** call on events, not timers; log tokens per call; a
  per-session cap after which the Saga waits for the next break.

## Milestones

| # | What | Done when |
|---|---|---|
| 0 | Recon Ancestors: install UE4SS, run the object dump, open the game in FModel | A list of the classes and events the Saga can read: births, deaths, clan members, evolution steps |
| 1 | Saga logger | Play an evening; `events.jsonl` holds what happened, accurately |
| 2 | Saga writer | Claude names your clan and writes the evening's saga; it reads well aloud. Shown in game or as a journal |
| 3 | Invention engine as text | A small text game: a clan, a place, an inventory. You make fire, then a clay pot, by describing them. It's fun, fair and teaches you something |
| 4 | Choose the later host | Try Vintage Story's mod API for a day against the needs above; decide, and write the reason down |
| 5 | Fire in the host | Bow drill (or flint and pyrite, or fire plough) described, judged, and an ember in the game world |
| 6 | Carry the clan over | An Ancestors clan's Saga files load into the later host; its legends are still told |
| 7 | The showcase chain | Fire → cooking → pots → kiln → copper → wheel, each one described and judged |
| 8 | The eras between | Erectus and archaic stages, walked through rather than skipped |

## Ground rules

- Single-player only. Back up saves before testing.
- Game assets are never redistributed; mods ship code and original work.
- The judge never hands out an invention for naming it.
- Every failed call or crash leaves the clan, materials and saga intact.

## Decisions for you

1. **Default help mode**, Teacher, Elder or Nature?
2. **Strictness**, realistic (the first wheel cracks), or forgiving?
3. **Voice**, typed ideas only, or spoken too? Spoken suits "explaining
   how to make fire" very well.
4. **Budget**, a rough per-evening limit for the cost guard.
