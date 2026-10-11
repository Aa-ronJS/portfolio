# Council review: Dad Strength

A critical research pass and a five-seat review of what this channel
should make, how it should be titled and thumbnailed, and whether the
example script is good enough. The seats are the ones now built into
the pipeline (`channel/prompts.py`, `SEATS`): every future subject,
title, thumbnail text and script goes through them automatically.
This document is the council sitting once, by hand, on the first
episode and the first slate.

Scores are 1–5. A 4 is good, a 5 is rare, a 3 would not run as is.

---

## Part 1 — What the research actually supports

Most "YouTube best practice" writing is vendor blogs with no
methodology. What survives scrutiny:

**Packaging (title + thumbnail)**

- YouTube's own guidance: be accurate (misleading titles raise
  drop-off and hurt discovery), put the important words first because
  viewers may see only part of the title, limit caps and emoji, and
  make the thumbnail and title "work together to tell the story". It
  names two kinds of title: *searchable* (says what you get) and
  *intriguing* (sparks curiosity in non-searchers). It recommends
  judging a package by CTR on Home and Suggested in the first 24
  hours. (support.google.com/youtube/answer/12340300)
- vidIQ's 2026 look at 500 breakout long-form videos across 30 niches:
  69% used a face (80% of the biggest overperformers), 89% used a face
  or high contrast, and the median overlay was five words. Vendor data,
  but the largest sample in the results. (vidiq.com/blog/post/youtube-thumbnail-design-tips)
- Title length: an 18,000-channel dataset found 30–50 characters the
  most consistent; a rival claim that 70–100 characters wins traces to
  no findable study. Mobile truncates around 35–40 characters, which is
  the practical constraint. (air.io; ytzolo.com — directional only)
- Legibility: the phone feed shows thumbnails at roughly 168×94 pixels.
  Any text that cannot be read at that size is decoration.

**Retention**

- YouTube's Intro metric is the share still watching at 30 seconds; its
  own help text says a mismatch between the promise and the opening is
  the usual cause of a bad number, and that strong material placed late
  should be moved earlier. (support.google.com/youtube/answer/1715160)
- The leaked MrBeast production memo (unverified, widely reported)
  reduces to three numbers — CTR, average view duration, average view
  percentage — front-loading the best material into the first minute,
  and a re-engagement beat every few minutes. Treat as heuristic, not
  evidence. (alexanderjarvis.com memo write-up)

**The niche, measured**

Recent uploads from the channels nearest this brief (pulled
2026-10-11; recent, not all-time):

| channel | subs | what their recent winners look like |
|---|---|---|
| Hybrid Calisthenics | 4.47M | "I ran a 5k every day for 3 months. Here's what I noticed" 271K; "Why is Japanese Walking Going Viral?" 191K; "I did 492 pushups a day for YEARS (here's why I stopped)" 174K; "How to Get 'Fit' If You Don't Like Working Out" 107K; "Discipline is Easier Than You Think" 106K; "Why You Keep Starting Over" 29K |
| Fit Father Project | 807K | "I Used To Train Arm Day, Leg Day… (Now I Do THIS)" 32K; "Insulin Resistance in Men: The 5-Step Fix" 16K; most recent uploads 2–9K despite the sub count |
| Busy Dad Training | 68K | a daily-practice vlog ("80 Minutes, DONE.") — community, not explainers |

Three things to take from that. The calm, specific, kind register
(Hybrid) is outperforming the SHOUTY-CAPS, "OBLITERATE visceral fat"
register (Fit Father) by an order of magnitude per upload, even
adjusting for channel size. The strongest single format is first-person
experiment with a number and a duration — which **this channel cannot
use honestly**, because nobody tried anything; that format is off the
table and the brief now says so. And the second-strongest is the
viewer's own failure, explained kindly ("Why you keep starting over",
"How to get fit if you don't like working out") — which the channel
can do, with research behind it.

**Policy — the finding that changes the rules**

YouTube's Partner Program policies (updated July 2025): AI content
"made with generic or unoriginal templates" with no original
perspective is not monetisable; automated tools are fine "if the final
video shows the creator's creative vision"; and channels presenting
**AI personas as human experts on health, legal, financial or
political topics will not be allowed to monetize**. (support.google.com/youtube/answer/1311392)

For a synthetic-voice channel about health this is the line to stay
well behind. Consequences, now encoded in `channel.yaml` and the
brand/policy seat: the narrator is never a person, a doctor or a coach;
never "I tried", "my kids"; speaks as "the research", "the study", "a
dad who"; the description discloses the synthetic voice; every video
makes its own argument rather than swapping the noun in a template.

**The audience, measured (thinly)**

Peer-reviewed data on single fathers is sparse. A Japanese survey of
868 single fathers found psychological distress at 8.5% versus 5.0% for
partnered fathers; a Swedish qualitative study describes the transition
to single parenthood as a lonely phase and exclusion from health
support as tied to worse outcomes; US pandemic data shows single parents
(not fathers alone) with higher anxiety, depression and loneliness. The
US Census counts 2.5 million father-only households (CPS 2023). Blog
sources add loneliness, burnout and custody stress, uncited. The gap
matters: the channel's subjects should lean on the general evidence
(sleep, minimal-dose training, activity) applied to this life, and be
careful claiming anything *about* single dads specifically.

---

## Part 2 — The council on subjects

Twenty candidates were drawn from the brief; the ten below survived.
Seats: R retention, P packaging, A audience, E evidence, B brand/policy.

| # | subject | R | P | A | E | B | avg | the chair's note |
|---|---|---|---|---|---|---|---|---|
| 1 | **One week of short sleep cuts a man's testosterone 10–15%** (Leproult & Van Cauter, JAMA 2011; Covassin 2022 for the calorie side) | 5 | 5 | 4 | 4 | 4 | 4.4 | A single striking, sourced number; packaging writes itself; the viewer's most-ignored lever. Must stay off "low T" supplement territory. |
| 2 | **Why you keep starting over every Monday** (habit formation: Lally 2010 ~66 days to automaticity, huge range; "fresh start effect", Dai & Milkman 2014) | 5 | 5 | 5 | 3 | 5 | 4.6 | The viewer's own failure, explained kindly — the format that wins in this niche. Evidence is softer (behavioural, self-report); say so. |
| 3 | **The Workout Hidden in a Single Dad's Day** (the example: VILPA, minimal-dose lifting, sleep) | 4 | 4 | 5 | 5 | 4 | 4.4 | The channel's thesis episode. Strong evidence, honest caveats. Hook has a preamble to cut (Part 4). |
| 4 | **How little lifting keeps the muscle you have** (age-related muscle loss; Iversen 2021; minimal-dose reviews) | 4 | 4 | 4 | 5 | 5 | 4.4 | Deeply sourced; the "you lose muscle first" claim needs its own study rather than folklore. |
| 5 | **The step count that actually matters** (Paluch 2022, Lancet Public Health: benefit plateaus around 6–8k for under-60s) | 4 | 5 | 4 | 5 | 5 | 4.6 | Corrects a myth everyone has heard; a number on the thumbnail that is true. Risk: well-trodden by big channels — the dad framing (walking to school counts) must carry it. |
| 6 | **The loneliness nobody puts in a fitness video** (single-father distress data; Holt-Lunstad 2015 on social connection and mortality) | 4 | 3 | 5 | 4 | 4 | 4.0 | The audience seat's top pick; packaging is hard without a number and the evidence seat wants care not to pathologise. Make it, make it later, make it gently. |
| 7 | **Alcohol after bedtime: the habit that eats a dad's sleep** (Ebrahim 2013 meta-analysis on alcohol and sleep architecture) | 4 | 4 | 4 | 4 | 3 | 3.8 | True and useful; brand seat flags the moralising risk — keep it mechanical, not moral. |
| 8 | **Training when every week is a different week** (custody rhythms) | 3 | 4 | 5 | 2 | 5 | 3.8 | The most *this channel* subject on the list and the hardest to source — there is no study of custody-week training. Build it from the minimal-dose evidence and be honest that the structure is advice, not findings. |
| 9 | **Why your back hurts at 38 and what the guidelines say to do** (exercise as first-line care in low back pain guidelines) | 4 | 4 | 4 | 4 | 3 | 3.8 | Useful; brand seat: closest to medical territory, needs the doctor line early and often. |
| 10 | **A forty-dollar gym in the hallway** (one kettlebell; what the evidence supports) | 3 | 4 | 4 | 3 | 4 | 3.6 | Practical, evergreen, less of a question at its centre. |

Rejected, with the reason: *The 10,000 steps myth* (folded into 5);
*Cooking for kids without eating like one* (no strong evidence spine;
becomes a tips list); *What stress does to a body* (diffuse, no number);
*The three health checks that matter* (medical; the AI-persona rule
makes this the wrong channel for it); *Screens, sleep and the midnight
scroll* (the blue-light evidence is mixed enough that the honest video
is "we don't really know", which is a hard eight minutes).

**Order of production the chair recommends:** 3 (the thesis), 2, 1, 5,
4, 6, 7, 8, 9, 10. The thesis episode first so the channel's stance is
on record; then the two with the strongest packaging; the loneliness
episode once there is an audience to receive it.

---

## Part 3 — The council on titles for the example

Ten candidates for the example script. Each title was judged *with* a
thumbnail text, because they are seen together.

| # | title | chars | R | P | A | E | B | avg |
|---|---|---|---|---|---|---|---|---|
| 1 | The Single Dad Workout Science Says Still Counts | 48 | 3 | 3 | 4 | 4 | 3 | 3.4 |
| 2 | No Gym, No Hour: What Actually Works for Single Dads | 52 | 4 | 4 | 5 | 4 | 4 | 4.2 |
| 3 | Three Minutes a Day: The Fitness Plan for Dads With No Time | 59 | 4 | 3 | 4 | 3 | 4 | 3.6 |
| 4 | Why "I Don't Have Time" Isn't the Problem (for Dads) | 52 | 4 | 4 | 3 | 4 | 3 | 3.6 |
| 5 | You Don't Need an Hour. The Research Says 3 Minutes. | 51 | 4 | 4 | 4 | 3 | 4 | 3.8 |
| 6 | **The Workout Hidden in a Single Dad's Day** | 41 | 5 | 5 | 5 | 5 | 5 | **5.0** |
| 7 | Four Sets, Three Minutes, One Bedtime: Fitness for Single Dads | 62 | 3 | 2 | 4 | 5 | 4 | 3.6 |
| 8 | How Single Dads Get Fit Without the Gym (The Research) | 54 | 4 | 3 | 4 | 4 | 4 | 3.8 |
| 9 | What 25,000 People Who Never Exercise Taught Scientists | 55 | 4 | 4 | 3 | 5 | 4 | 4.0 |
| 10 | Fit Without Finding Time: A Single Dad's Week | 45 | 4 | 4 | 4 | 4 | 4 | 4.0 |

Seat notes on the ones that matter:

- **#1 (the current title).** Packaging: "science says" is the tired
  half of a clickbait phrase and the title answers its own question
  ("still counts"). Brand: borderline. Retention: no image, no noun.
- **#6.** Every seat's top. Packaging: a concrete noun ("workout"), a
  tension ("hidden"), the audience named, 41 characters so nothing is
  cut on a phone, and it raises a question the video answers rather
  than answering it. Retention: the first sentence can pay it off
  immediately. Evidence: claims nothing. Brand: calm, specific, kind —
  the register that wins in this niche.
- **#9.** The evidence seat loved it; the audience seat didn't see
  himself in it. A good second video's title, not this one's.
- **#3, #5.** They put the number in the title, which leaves the
  thumbnail nothing to add.

**Thumbnail text, judged against #6:** the text must say what the title
does not. "3 MINUTES A DAY" (the number; title has none) and "NO GYM.
NO HOUR." (the constraint; title has none) both qualify. "THE KIDS ARE
THE GYM" repeats the title's idea. "40% LOWER RISK" was rejected by the
evidence seat (an observational association presented as a promise)
and the brand seat (reads as a health claim in four words).

**The chair's package:** title #6, *The Workout Hidden in a Single
Dad's Day*; thumbnail text **3 MINUTES A DAY**; the frame of a dad
doing push-ups with his daughter on his back (a face, an action that is
literally the hidden workout, strong contrast on the dark floor).
Alternate for a later A/B test: "NO GYM. NO HOUR." on the same frame.

---

## Part 4 — The council on the script

Scores on the first draft (`script.json` before the edits below):
retention 4, packaging 3, audience 4, evidence 4, brand/policy 4 —
average 3.8, which is "good, would not run as is". Verbatim findings:

**Retention.**
- The hook is right (a number first, then "watch him laugh"), but the
  sixth sentence is a preamble: *"This video is about the research that
  says the hour was never the point."* Meta-narration at 25 seconds is
  exactly where the Intro metric dies. Cut it; let the next sentence do
  the turn.
- Section 2's WHO sentence is 45 words. Spoken, that is 18 seconds
  without a breath. Split it.
- The sleep section is the strongest material and sits at minute four
  to five. Acceptable — it is the third of three findings and the
  structure promises three — but the opening should name all three so
  the viewer knows the best is coming.

**Packaging.** See Part 3; the title changes.

**Audience.**
- *"On custody weeks when the kids are with their mum"* — assumes a
  mum and assumes custody. Widowed dads and dads whose ex is a father
  are in this audience. "On the weeks the kids are away" covers all of
  them and loses nothing.
- *"a progressive overload program with a built-in timer"* — the best
  line in the script. Keep.
- No shaming sentence found. The "feels bad about not starting" line
  describes; it does not judge.

**Evidence.** Two sentences the notes do not support, verbatim:
- *"Muscle is the other half, and it is the half men lose first as
  they age."* — no source in the notes for "first". Replace with the
  supportable claim: muscle is lost with age unless it is used.
- *"A child is a load that grows about a kilogram every few months"* —
  invented rate. Keep the joke, lose the number.
- The VILPA figure (roughly forty percent) matches the source's 38–40%.
  "Near straight line" matches "near-linear". The Covassin numbers
  (308 kcal, 0.5 kg, ~11% visceral) are exact. The WHO numbers are
  exact. Iversen's "four sets, six to fifteen reps, weekly total over
  frequency" comes via secondary coverage; acceptable for a narrative
  review, flagged for a primary check on the next pass.

**Brand/policy.** No first person anywhere. "Talk to a doctor" is in
the close. The synthetic-voice disclosure is in the description. The
close ("the kids are the training") is the channel's register. One
wince: the current title's "science says".

**The chair's three edits, in order:**
1. Cut the preamble sentence; replace with a one-line promise of the
   three findings so the opening sets up the whole video.
2. Remove the two unsupported claims as above.
3. Split the WHO sentence; change "with their mum" to "away".

After the edits (applied in `script.json` v2): retention 5, packaging
5 (with the new title), audience 5, evidence 5, brand/policy 5 on the
chair's re-read. **Verdict: publish.**

---

## Part 5 — The council on the thumbnails

Four variants were rendered through the real thumbnail code and viewed
at full size and at the feed size (168×94):

| variant | text | frame | verdict |
|---|---|---|---|
| A | 3 MINUTES A DAY | dad push-ups, daughter on back | **chosen** — face, action, contrast, a number the title lacks |
| B | NO GYM. NO HOUR. | dad and small son doing push-ups, bright room | strong alternate; the bright room washes out at feed size |
| C | THE KIDS ARE THE GYM | as A | repeats the title's idea; the two should complete each other |
| D | 40% LOWER RISK | dad and toddler on a bike | rejected by the evidence and brand seats: an observational finding as a four-word promise |

**The packaging seat's one finding that changed the product:** at
168×94 the text on every variant was marginal. The thumbnail code now
sets text at about a quarter of the frame height per line, capped at
two lines, with a heavier stroke — the re-rendered A is the one in
`thumbnail.jpg`. Rule of thumb now in the code's comment: if it cannot
be read at 168×94, it is decoration.

---

## Part 6 — Standing rules the council set (now in the pipeline)

1. **Every subject is chosen from a slate**, not proposed alone: eight
   candidates, every seat scores each, the chair picks and says why.
   The also-rans are kept in `topic.json` so the next slate is told
   what was passed over.
2. **Every script is judged by the five seats**, not one critic; the
   evidence seat's `unsupported` list is enforced by code — a sentence
   on it that survives the revision is cut.
3. **Titles come eight at a time** in prescribed shapes (searchable,
   best-number, the viewer's failure, "without", the constraint, a
   question, two free), with four thumbnail texts; the council picks
   the pair, not the title alone.
4. **Thumbnail text must read at feed size**; two lines; four words.
5. **No first-person experience, ever.** The narrator is a voice, not
   a person; "the research", "a dad who". The description says the
   voice is synthetic.
6. **Numbers on thumbnails must be the finding, not a promise.**
   "3 MINUTES A DAY" is what the study measured; "40% LOWER RISK" is a
   claim about the viewer.
7. **Register: calm, specific, kind.** The niche's data says it beats
   capitals and urgency, and the brand seat says it is the only
   register a synthetic voice can carry without sounding like an ad.
