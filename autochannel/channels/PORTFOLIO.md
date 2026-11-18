# Portfolio framework: seven channels, one machine

One named channel (`aaron/`, plan in `aaron/STRATEGY.md`) plus six
anonymous ones in genres Aaron chose, all run by the same engine. The
craft and decision rules in the named channel's framework apply
everywhere; this file covers what's different with seven. Updated
18 Nov 2026.

## The principle

**Quality comes from the system, not from Aaron's hours.** Each channel
gets its own rules, researched or carefully written scripts, and review.
That doesn't thin out with more channels. What has to scale is
**distinctness**: seven channels from one engine must never look like
one template with the nouns swapped, which is exactly YouTube's
"inauthentic content" test.

## The seven

| Channel | Genre | Length | Register (voice file) | Posts (UTC) |
|---|---|---|---|---|
| **Aaron Steele** (named) | Why the ordinary world works like this | 8–12 min | dry (`aaron-dry`) | Tue, Fri |
| **The Second Knock** | Original horror stories in the r/nosleep style | ~20 min, 3–4 stories | low, close (`aaron-low`) | Wed, Sat |
| **Red String Files** | Game, film and TV theories | 15–18 min | brisk detective (`aaron-brisk`) | Wed, Sun |
| **Ledger of the Odd** | Strange and creepy real history | 10–15 min | measured (`aaron-measured`) | Mon, Thu |
| **Treeline Reports** | Cryptids: the case for and against | 15–18 min | hushed campfire (`aaron-hushed`) | Tue, Sat |
| **Lamplight Lectures** | Calm history and science to fall asleep to | ~2 hours | slowest, softest (`aaron-sleep`) | Sun |
| **Blind Spot Lab** | Psychology: biases and experiments | 11–15 min | curious teacher (`aaron-warm`) | Mon, Fri |

Thirteen uploads a week, never more than two a day. Comparable channels
prove the demand: Mr. Nightmare (~7.1M) and Lazy Masquerade (~1.9M) for
horror; The Game Theorists (~19.6M) and Film Theory (~13.5M); Weird
History (~5M) and Fascinating Horror (~1.4M); Bedtime Stories (~1.1M)
for cryptids; the "boring history for sleep" networks (one video at 2.3M
views); Psych2Go (~13M) and Sprouts (~2M) for psychology. Counts are from
third-party trackers, approximate.

## The three genres with traps, and how each is built around them

**Horror: we write the stories, we never take them.** Reddit authors
own their posts; Reddit's licence covers Reddit, not narrators. Reading
someone's story without permission is copyright infringement, it's the
exact "readings of other materials you did not originally create" that
YouTube's reused-content rule bans, and r/nosleep went dark in 2020 over
narrators doing it. So The Second Knock writes **original fiction in that
style**. No fiction label is needed, but titles never claim "true".
Real usernames, real crimes and real people are banned. Violence stays
implied, which also keeps full ads.
*Later, optionally:* narrate real authors' stories with written
permission (and a revenue share), the way established narrators do.
That's a manual relationship, not something to automate.

**Theories: gameplay yes, film footage sparingly.** Most game publishers
allow gameplay videos and many allow monetising them. Nintendo's
guidelines name the YouTube Partner Program; Microsoft has allowed it
since 2015. That's why so many channels run on gameplay. So games lead,
using footage from the channel's own library (recorded or
publisher-supplied, never ripped from other channels), per each
publisher's rules (`red_string/FOOTAGE.md`). Films and TV are different:
no blanket licence, and YouTube's automatic matching usually hands a
clip's ad money to the studio. So those videos are mostly evidence-board
(quotes, timelines, diagrams) with a few short clips where the moment is
the evidence. AI images of copyrighted characters stay banned; they're
what the fake-trailer channels were removed for.

**Sleep: the honest one in a sloppy genre.** "Boring history for sleep"
networks still monetise, but they are the textbook mass-produced
template, and historians have documented their invented facts. Lamplight
Lectures differs on purpose: one a week (not daily), sourced facts in the
description, distinct chapters per video, no loops or re-uploads, no
captions, quieter audio (-20 LUFS) and slow pans. A 2-hour video watched
for 20 minutes is fast watch time toward the Partner Program.

The other three are safer but have rules too:
- **Creepy history:** events over 50 years old, victims named with respect, no gore.
- **Cryptids:** case for *and* against, never claiming a cryptid is real,
  never faking photographic "evidence" (that would also need an AI label).
- **Psychology:** biases and experiments only, honest about studies that
  failed to replicate, never diagnosis or treatment advice.

## Keeping seven channels distinct

| Layer | How it varies |
|---|---|
| **Voice** | One voice, seven registers: the clone copies the *delivery* of the recording it's made from, so one take per register (see `voices/README.md`) gives seven narrators. Speed, pauses and loudness differ too |
| **Writing** | Own RULES.md per channel: genre, structure, banned phrases. Horror and sleep don't follow the explainer recipe at all |
| **Length and pace** | 10 minutes to 2 hours; cuts from every 5 s (theories, psychology) to every 75 s (sleep) |
| **Look** | Own caption colours and darkness now; own font, card and thumbnail style (build list). Sleep has no captions |
| **Footage** | Different sources per genre (see each channel.yaml) |
| **Schedule** | Different days |

### About Aaron's voice on all seven
Aaron's choice. Registers make the narrators feel different, but anyone
who knows his voice well could connect them. YouTube always knows: all
seven are paid through one AdSense account. One account can pay many
channels; a *second* AdSense account in his name is what gets closed.
Anonymous means anonymous to viewers. The anonymous channels'
descriptions don't say "the creator's own voice", so the channels
aren't linked in writing.

## Accounts

- Each anonymous channel is a **Brand Account** under one Google login
  (viewers can't see the owner).
- One Google Cloud app serves all seven; each channel signs in once and
  gets its own `YT_REFRESH_TOKEN_<CHANNEL>` secret. Each day's job sees
  only its own channel's.

## Aaron's time

- Named channel: 5 minutes a day.
- Six anonymous channels: one weekly batch, ~15–20 minutes, approving
  scripts (title, opening and outline, not every word). By the time a
  script reaches Aaron it has already survived the council, so the
  approval is a taste check, not a proofread. Each channel
  keeps two weeks of scripts ahead; Lamplight keeps four.

## The quality bar: the writers' room

Nothing reaches a channel's queue without passing an adversarial council
(`council/`, `ac/council.py`):

1. **Pitch:** three different angles per idea. A commissioning editor
   picks one or bins all three. Weak ideas die for cents.
2. **Draft** from the commissioned pitch and the editor's notes.
3. **Council:** 7–8 reviewers per channel, each a different adversary.
   Everyone gets: editor-in-chief (is it exceptional?), cold viewer
   (where would I click away?), retention editor, read-aloud editor (TTS
   pitfalls), AI-slop detector (veto) and policy reviewer (veto). Each
   genre adds its specialists:

   | Channel | Specialist seats |
   |---|---|
   | Aaron Steele | fact-checker (veto, web search), originality (veto, web search) |
   | The Second Knock | horror editor, originality (veto, searches for borrowed plots) |
   | Red String Files | theory logic (searches the canon), originality |
   | Ledger of the Odd, Treeline Reports | fact-checker, originality |
   | Lamplight Lectures | sleep-content editor, fact-checker (no retention seat: no hooks in sleep) |
   | Blind Spot Lab | psychology science reviewer (studies and replication), originality |

4. **Rewrite and re-review,** up to 3 rounds. A script passes only when
   **every** seat scores 8+ with nothing blocking. A veto seat's
   "reject" bins it on the spot.
5. **Learn:** binned scripts go to `rejected/` with every review, and
   their blocking issues feed the channel's `LESSONS.md`, which the
   writer reads next time.

Every seat is a plain markdown file Aaron can sharpen. Every queued script
records each seat's score and its own cost.

## Money and compute (US$50/month for everything)

The council is where the money goes: roughly **$2–2.50 per script that
passes** (pitches, draft, 7–8 reviews per round, rewrites, web
searches), and more for 2-hour sleep scripts.

| Item | Estimate |
|---|---|
| Writing budget, capped per channel: Aaron $10, Lamplight $8, the other five $6.40 each | $50 hard cap |
| Voice, rendering, footage, upload | $0 |
| Compute | ~1,500–1,900 of the 2,000 free private-repo minutes |

**What the cap means:** at full volume (13 videos a week) the council
would cost about $130 a month. With $50 it can pass roughly 20–25
scripts a month, so **channels post less rather than worse**. A channel
whose writing budget runs out simply has nothing new in its queue.
Two levers raise volume without lowering the bar:
- **Batch API** (build list): the council doesn't need instant answers,
  and batched requests cost half. Roughly doubles volume for the same money.
- **Raise the caps** in each `channel.yaml` (`writer.monthly_budget_usd`).

If compute minutes run out, GitHub's per-minute overage costs a few
dollars, or the jobs can run on a spare home computer for free.

**What these genres pay:** entertainment-type genres (horror, theories,
cryptids) sit nearer YouTube's all-niche median of about $2–4 per 1,000
views than education's ~$10. History, psychology and sleep can land in
education. Verified per-genre data doesn't exist. The vendor-blog
horror figures ($4–14) are unaudited, so plan on $2–4 until Studio shows
real numbers.

## Portfolio decision rules

The per-video and per-channel rules in `aaron/STRATEGY.md` section 8
apply to each channel. On top of those:

- **Judge each channel against its own median**, never against the
  others in the first 3 months.
- **Mid-February review: rank all seven** on share of video watched and
  watch-time growth.
  - **Top 2:** move to 3 a week (Lamplight: 2 a week).
  - **Middle:** unchanged.
  - **Bottom 2:** one month of format or register change, then retire or
    replace if still bottom.
- **Copy what works**, one or two channels at a time, never all at once.
- **One strike anywhere pauses everything** until the cause is known.
  Same machine, so possibly the same cause.

## Shorts

About 2 per long video (none for Lamplight). Horror and cryptids
make the strongest Shorts: one story beat or one sighting, ending on
the cliffhanger. They're trailers, judged on whether long-form views follow.

## Build list additions (on top of `aaron/STRATEGY.md` section 9)

1. **Card renderer:** text cards, quote cards, timelines, diagrams and
   maps from b-roll cues like `text card: ...`, `timeline: ...`,
   `map: ...`. Red String Files and Blind Spot Lab depend on it; today
   those cues would be sent to stock search.
1a. **Footage library matching:** `gameplay:` and `clip:` cues pick
   clips from `channels/<name>/footage/` by name (Red String Files).
1b. **Batch API for the writers' room:** half price, so about twice the
   scripts for the same budget.
2. **Stills mode:** slow pans over archive scans and paintings (Ledger
   of the Odd, Lamplight Lectures).
3. **Footage sources** beyond Pexels: Pixabay, Library of Congress,
   Chronicling America, Prelinger, Wikimedia Commons, NPS/US Fish &
   Wildlife, each clip logged with its licence.
4. **Sleep mode:** long-job resume (a crashed 2-hour render picks up
   where it stopped), no captions (done), chapters from the script.
5. **Per-channel look and thumbnail templates.**
6. **Weekly approval on the phone** across all channels.
7. **Portfolio weekly report** and a **strike switch** that pauses everything.

## Before launch, by hand

- Check each channel name as a YouTube handle (web searches found none
  in use, but small channels index badly).
- Record the seven voice takes.
- Create the six Brand Accounts and sign each in.

## Sources
- YouTube monetisation policies (inauthentic and reused content): https://support.google.com/youtube/answer/1311392
- YouTube advertiser-friendly guidelines: https://support.google.com/youtube/answer/6162278
- YouTube altered/synthetic content disclosure: https://support.google.com/youtube/answer/14328491
- YouTube Partner Program thresholds: https://support.google.com/youtube/answer/72851
- YouTube medical misinformation policy: https://support.google.com/youtube/answer/10008196
- r/nosleep blackout over narrators (Tubefilter, 2020): https://www.tubefilter.com/2020/02/26/horror-subreddit-r-nosleep-goes-dark-to-protest-youtubers-stealing-their-stories/
- Reddit user agreement (archived): https://webarchive.library.unt.edu/web/20191121210518/https://www.reddit.com/help/useragreement
- AI slop crackdown and channel bans, Jan 2026 (Tubefilter): https://tubefilter.com/2026/01/29/youtube-ai-slop-channel-crackdown-bans/
- Neal Mohan's 2026 letter (Variety): https://au.variety.com/2026/digital/news/youtube-channels-using-ai-tools-reduce-slop-neal-mohan-letter-32190/
- AI "boring history for sleep" videos (404 Media): https://www.404media.co/ai-generated-boring-history-videos-are-flooding-youtube-and-drowning-out-real-history/
- AI cryptid vlogs criticised (Sharon Hill): https://sharonahill.substack.com/p/ai-cryptid-vlogs
- AIR Media-Tech, verified RPM by niche (2026): https://air.io/en/air-data-findings/which-youtube-niche-makes-the-most-money-in-2026-ranked-by-real-rpm-and-cpm
- Google, one AdSense account for several channels: https://support.google.com/youtube/answer/9914702
- Prelinger Archives: https://help.archive.org/help/prelinger-archive/
