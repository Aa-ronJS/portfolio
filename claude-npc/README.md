# Claude NPC — a companion you can talk to that lives its own life

A brief for building on the Windows PC with Claude Code. Nothing here runs
in this repo; it's the plan to hand over. Open it there and say "read
`claude-npc/README.md` and start milestone 0".

## The goal

One character in your world, driven by Claude, who:

- **talks** — you type (later: speak) to it in game chat and it answers in
  character, remembers what you said yesterday, and has opinions;
- **does its own thing** — when you're not talking to it, it isn't standing
  still waiting. It has needs (food, safety, a bed at night), a long-running
  project of its own (a house by the river, a wheat farm, mapping the
  caves), and a daily routine;
- **acts on what you say** — "come with me", "can you get me some iron",
  "stay away from my chests" — and is allowed to say no.

## Which game: Minecraft first, Morrowind second

| | Minecraft (Java) | Morrowind |
|---|---|---|
| Talk to it | Easy — game chat | Done already by LLMorrowind (typed chat inside the dialogue menu) |
| Does its own thing | **Fully.** The NPC is a real player (a bot account via Mineflayer): it can walk anywhere, mine, craft, build, fight, eat, sleep | **Partly.** NPCs can only do what the engine's AI packages allow: wander, travel to a point, follow, escort, fight, use an object. No building, no crafting |
| Prior art | [Mindcraft](https://github.com/mindcraft-bots/mindcraft) — LLM bots on Mineflayer, already supports Anthropic | [LLMorrowind](https://www.nexusmods.com/morrowind/mods/58341) / [Immersive Morrowind LLM AI](https://github.com/drzdo/immersive_morrowind_llm_ai) — MWSE only, not OpenMW |
| Language | JavaScript / TypeScript (Node) | Lua (MWSE) plus whatever bridge the mod uses |

**Build Minecraft first.** "Does its own thing" is the hard half of the
brief, and only Minecraft gives an NPC a body that can do real things.
Morrowind is the better place for *conversation* (4,600 NPCs with lore
behind them), and is laid out as a second track at the bottom.

**Minecraft Java Edition is required.** Mineflayer doesn't work with Bedrock
(the Microsoft Store / Game Pass "Minecraft for Windows" on its own).
Java comes with the Game Pass PC bundle — check the launcher.

## Start from Mindcraft or from scratch?

Start by **running Mindcraft as-is** (milestone 0) to see a Claude bot in
your world in an afternoon. Then decide:

- **Fork it** if it feels close. You get pathfinding, crafting, building
  and combat skills for free.
- **Write a slim one** on Mineflayer + `mineflayer-pathfinder` if Mindcraft
  feels like a task-runner rather than a character. The thing this brief
  cares about — memory, routine, personality, its own goals — is the layer
  on top, and that's ours either way.

Mindcraft can let the model write and run JavaScript on your PC. **Turn
that off** to begin with, and never connect the bot to a public server
with it on.

## How it works: three speeds

A model call takes seconds. A creeper takes one. So the NPC runs at three
speeds and Claude only drives the slow two.

| Layer | Who | When | Examples |
|---|---|---|---|
| **Reflexes** | Plain code, no model | Every tick | Eat when hungry, fight back when hit, run from creepers, don't walk into lava, get out of water |
| **Routine** | Claude | When the current task finishes, something notable happens, or every few minutes at most | "Bread's low, I'll harvest the wheat"; "it's getting dark, back to the house"; "the wall's half done, get more cobble" |
| **Talk** | Claude | When you (or anyone) chats near it | Answers, agrees, refuses, asks questions, changes its plans because of what you said |

Routine and talk are **one character with one memory**, so it can say
"Can't, I'm halfway through the roof — after that?" Use one conversation
loop per session, not two.

## The brain's tools

Claude acts only through tools. Each tool is a whole skill done in code, not
a single key press, and returns what happened ("got 7 iron ore, pickaxe
nearly broken").

| Tool | Does |
|---|---|
| `say(text)` | Chat in game |
| `look_around()` | Returns the observation summary below |
| `go_to(place_or_xyz)` | Pathfind to a remembered place or coordinates |
| `follow(player)` / `stop()` | Follow you until told otherwise |
| `gather(item, count)` | Mine or chop until it has that many |
| `craft(item, count)` | Uses a crafting table if one is nearby |
| `build(plan_name)` | Builds a saved plan (start with tiny ones: a shelter, a wall, a farm plot) |
| `farm()` | Harvest and replant the remembered field |
| `store(items)` / `take(items)` | Its own chest only, unless you say otherwise |
| `attack(target)` | Fight a named mob (never a player unless you set it up as a game) |
| `sleep()` | Use its bed at night |
| `remember(fact)` | Write to long-term memory |
| `set_goal(text)` | Replace its current long-term project |

Start with five (`say`, `look_around`, `go_to`, `follow`, `gather`) and add
the rest one milestone at a time.

### What it "sees": the observation summary

Short, plain text, built by code, sent with each routine/talk call. Example:

```
Time: day 14, evening (sunset in ~1 min). Weather: rain.
You: health 16/20, food 9/20. Holding: stone pickaxe (worn).
Inventory: 23 cobblestone, 4 bread, 2 iron ore, 11 oak logs.
Where: 40 blocks east of home, by the river.
Nearby: Aaron (player, 6 blocks, holding a diamond sword), 2 cows, 1 zombie (18 blocks, coming closer).
Current goal: build the house by the river (walls 60% done).
Current task: gathering cobblestone (23/64).
Last 3 things that happened: Aaron said "hey Bram, got any bread?"; you finished the north wall; a skeleton shot you.
```

Only what it could plausibly see or know. That keeps it fair and makes it
feel like a character rather than an all-seeing script.

## Memory — how it remembers you

A folder of plain files next to the bot, so you can read and edit them.

- `character.md` — who it is: name, voice, likes, dislikes, what it wants,
  what it won't do. **This is where the personality lives.** Write it
  yourself; Claude can help.
- `diary.md` — at the end of each in-game day (or when the conversation
  gets long) Claude writes a few lines: what happened, what it thinks of
  you, what it's planning. The latest entries are loaded at start-up.
- `places.json` — home, bed, chest, farm, "the cave where Aaron nearly died".
- `goals.json` — the long-term project and its progress.

When a session gets long, don't trim old messages out of the conversation.
Have Claude write the diary entry, then start a fresh conversation that
begins with `character.md` + recent diary + places + goals. (See the API
notes for why.)

## Claude API notes (TypeScript, `@anthropic-ai/sdk`)

Before writing the code, ask Claude Code on the PC to load its `claude-api`
skill — it has the current, exact API shapes. The points that matter here:

- **Model:** `claude-opus-5-5`. Thinking can't be switched off on this model;
  control cost and speed with effort: `output_config: { effort: "low" }`
  for chat replies, `"medium"` for routine decisions and diary writing.
- **Tool choice:** use `tool_choice: { type: "auto" }` only. Forcing a
  specific tool (`any` / `tool`) returns an error on this model. Steer with
  the system prompt instead ("always reply with `say`") and set
  `strict: true` on each tool so arguments always match the schema.
- **Refusals:** check `stop_reason === "refusal"` before reading the
  reply, and turn on the server-side fallback (`fallbacks: "default"` with
  its beta header) so a declined call quietly retries rather than freezing
  the NPC. If it still fails, the NPC says something in character ("…lost
  my train of thought") and carries on with its routine.
- **Keep history append-only.** Never edit or delete earlier messages in
  a running conversation — newer models reject that. Summarise into the
  diary and start fresh instead (above).
- **Caching:** put `character.md` and the tool list first and keep them
  byte-for-byte stable, with prompt caching on, so every call reuses them
  cheaply. Put the changing observation summary last.
- **Never block the game on the model.** Calls run in the background;
  reflexes keep working while it thinks. If a call fails or times out, the
  NPC keeps doing its current task.
- **Key:** in a `.env` file that is git-ignored. Never commit it.

### Cost guard

Make calls when something happens (chat, task done, danger, nightfall),
not on a timer. Add a per-hour cap in config; when it's reached, the NPC
keeps working on reflexes and routine plans already made, and replies "busy,
talk later". Log tokens per call so you can see what an evening of play
costs before deciding whether to tune it.

## Milestones

Each one ends with something you can see in game.

| # | What | Done when |
|---|---|---|
| 0 | Run stock Mindcraft with Claude in a single-player world opened to LAN | A bot joins, you chat, it answers and follows you |
| 1 | Character + talk | It answers in its own voice from `character.md`, using `say` and `look_around` only |
| 2 | Body | `go_to`, `follow`, `gather`, `craft`; "get me 10 logs" works, and so does "no, I'm busy" |
| 3 | Reflexes | It eats, fights back and flees without asking Claude; survives a night alone |
| 4 | Memory | Close the game, reopen tomorrow: it remembers your name, its home, and what you argued about |
| 5 | Its own life | Left alone for an in-game day, it works on its own project, sleeps at night, and tells you about its day when you come back |
| 6 | Voice (optional) | Push-to-talk speech in, a voice out (local speech-to-text, a text-to-speech service) |
| 7 | Second NPC (optional) | Two characters with different personalities who talk to each other, trade, and fall out |

## The Morrowind track (after Minecraft)

- **Base:** LLMorrowind / Immersive Morrowind LLM AI (MWSE, original
  engine — not OpenMW). Read its code first; it already solves talking,
  lore and the NPC database. Check its licence before forking.
- **Add "its own thing" for one companion:** a small MWSE Lua mod that, on
  a timer and on events (cell change, nightfall, combat end), asks the
  brain what to do next and turns the answer into what the engine can do:
  travel to a named place, wander an area, follow you, escort, fight,
  equip, give an item, start a scripted bit of dialogue.
- **Limits to accept:** no building or crafting, and long trips across the
  map are clumsy (NPCs don't path well between cells). Plan around a home
  town and a few routes.
- **Same brain design:** character card, observation summary, diary,
  append-only conversation. If the Minecraft brain is written cleanly, most
  of it carries over; only the tools change.

## Ground rules

- Single-player or a private LAN world only. No public servers.
- Back up the world folder before each session of testing.
- Model-written code execution stays off unless you choose otherwise.
- API key never committed.

## Decisions for you

1. **Who is it?** Name, personality, and its own long-term want. This
   matters more than any of the code.
2. **Minecraft version** — Mindcraft supports specific Java versions; pick
   one and pin it.
3. **Voice** — now or later (milestone 6)?
4. **Budget** — a rough per-evening limit for the cost guard.
