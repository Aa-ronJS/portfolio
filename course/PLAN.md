# The tiny course: the plan

Applies `METHOD.md` to the animation pipeline in this repository. Every
claim on the sales page is one the repository can stand behind: the sheet
and the render shown are committed files, the source is public, and the
manual states what the pipeline will and will not do.

## 1. The idea

**Pain point with money behind it.** People who write funny things and want
an animated account on Reels, TikTok or Shorts without learning animation,
paying an animator, or showing their face. They already pay for the tools
and the phone; what they lack is the loop.

**Instant gratification.** By the end of the third video they have posted
an episode. The first character takes ten minutes to draw; the first
episode is one voice memo. The prompt cards and checklists are delivered
the second they pay.

**The hook.** Draw one character badly. Say the episode out loud. Post it
tonight. The sales page shows a real drawn sheet next to the real render it
produced, so there is nothing to believe.

**Why this over the earlier ideas.** Two earlier candidates were a course
on briefing AI coding agents and a course on the portfolio's own motion
effects. Both are true and teachable, and both ask the buyer to want a
skill. This one asks the buyer to want a result they can see in nine
seconds, in the medium the ad runs in. That is the difference between a
course that converts cold traffic and one that does not.

Alternatives set aside, in the order they would come next:

- *Make It Move.* The five animations on the portfolio, no library. A
  second product for buyers who ask about the sales page itself.
- *Brief the Machine.* The AI-agent briefing course, for buyers who want
  to extend the pipeline and find out that "build me a feature" does not
  work.

## 2. Title, price, length

| | |
|---|---|
| Title | **Draw It Badly** |
| Subtitle | Draw one character badly. Say the episode out loud. Post it tonight |
| Price | $35 AUD, one payment, no upsell |
| Length | Three screen recordings totalling about 22 minutes, five prompt cards plus the direction grammar, two one-page checklists |
| Format | The phone mirrored to the screen, no laptop terminal ever shown, no webcam, laptop microphone |
| Guarantee | Watch all of it; if you have not posted an episode by the end of the weekend, ask for the money back |

## 3. Curriculum

Recorded in one afternoon, in this order, each video one take with cuts only
for mistakes. Full scripts with timings in `content/SCRIPTS.md`.

**Video 1. The drawing (8 minutes).** The kit template on the phone, the
two red dots rule, the five required parts and the optional ones, a
character drawn live and badly, sent with card two, and the check sheet
read before the character is trusted.

**Video 2. The voice (7 minutes).** One voice memo per episode with the
stage directions spoken into it, the seven-verb grammar, a real four-line
episode recorded in one take, sent with card three, and the draft watched
with the sound on.

**Video 3. The fixes, and the cadence (7 minutes).** Three corrections in
one sentence each, the episode file shown once so nothing is hidden, props
and stock moves named, the sound rule, the final render posted on screen,
and the production cadence.

**The prompt cards.** Five messages to Claude Code, word for word, plus the
direction grammar. Delivered instantly on the course page.

**Checklist 1, the sheet.** Dots first, draw past the joint, close every
outline, never mirror, the five required boxes and what each optional box
unlocks.

**Checklist 2, before you post.** The check sheet, the draft with sound,
the look, and what stays human.

## 4. The ad

An actual episode, funny on its own, made with the pipeline in your voice,
worldwide, $5 a day for 7 days. Two lines to test in `ads/ADS.md`.

## 5. The sales page

`public/course/index.html`, served at `/course`. Same fonts, palette and
components as the portfolio. Follows the sales-letter structure: hook, the
proof, what you get, what you need, who it is for, the price and guarantee,
the questions, and the button after every argument.

No testimonials, no follower counts, no income figures. The proof is
Sugar's committed sheet beside Sugar's committed render, with an honest
caption that the demo's voice is a placeholder. The page says plainly that
the pipeline is public under MIT and what the $35 buys instead, and that a
Claude subscription is the one real cost beyond it.

## 6. The ascension

There is no upsell inside the course. The last thirty seconds ask for one
reply: the first rendered episode. Some replies are from people who want
the pipeline extended for their show, a character rigged that will not
behave, or the whole account set up. Those are the engagements, and they
are answered in the reply, with no call unless asked for.

## 7. The test, and what would make us stop

| Day | Do |
|---|---|
| 0 | Page live with checkout. Ad live, worldwide, $5 a day. |
| 1 to 7 | Do not touch the ad. Record the three videos. |
| 7 | Count sales. Three or more on $35 spend: the idea works, double the budget. Zero to one: use a different episode as the ad, run another $35. |
| 14 | If the second test also misses, the topic is wrong for cold traffic. Try *Make It Move* or park it. |

## 8. What exists, and what is still Aaron's

Built and tested locally (`api/`): Stripe Checkout, the webhook that sends
the access link, the signed permanent link, and the course page that renders
the lessons, the prompt cards and both checklists. `SETUP.md` is the hour of
configuration. `content/SCRIPTS.md` is the afternoon of recording.
`ads/ADS.md` is the ad. `OPERATIONS.md` is the five minutes a day after
that. The pipeline itself is `../animation-pipeline/`.

Still Aaron's, because they are promises:

1. Record the three videos within seven days of the first sale. The course
   page tells buyers that, in those words. The cards and checklists are
   delivered instantly, so a buyer has something on day one regardless.
2. Honour the guarantee as written: watch all of it, no episode posted by
   the end of the weekend, ask, money back.
3. Read and answer the replies. The system has exactly one manual step and
   it is the one that makes the money.
4. The ad is an episode, so one episode has to exist in your voice before
   the ad can. The committed demos have placeholder voices.
