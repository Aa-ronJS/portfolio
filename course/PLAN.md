# Aaron's tiny course: the plan

Applies `METHOD.md` to material that is already on the portfolio. Every claim
below is one the main page already makes and can stand behind. Nothing here is
invented for the sales page.

## 1. The idea

**Pain point with money behind it.** Freelance web designers, small studios
and founders who build their own sites. Their pages work and look flat, the
animation libraries they reach for weigh 80 kilobytes and still look like
everyone else's, and they bill clients for the result.

**Instant gratification.** After 22 minutes their own page has a parallax
plate, sections that arrive, a real number that counts up, and a card that
tilts, with two files pasted in. The starter file and both checklists are
there the second they pay; the recordings follow.

**The hook.** Every animation on this page, no library, one afternoon. The
sales page is the demonstration, because it runs all five effects.

**Why this over the first idea.** The earlier plan was a course on briefing
AI coding agents. Stronger claim, weaker impulse buy: the buyer has to
believe a method before paying. Here the buyer scrolls the page and the
proof is the page. Nothing to believe.

Alternatives set aside, in the order they would come next:

- *Brief the Machine.* The AI-agent briefing course. Kept as the second
  product, for buyers of this one who ask what else there is.
- *The pre-flight.* The eight questions answered in writing before any
  markup, from `PREFLIGHT.md`. A design course, and the natural third.

## 2. Title, price, length

| | |
|---|---|
| Title | **Make It Move** |
| Subtitle | Every animation on this page. No library. One afternoon |
| Price | $35 AUD, one payment, no upsell |
| Length | Three screen recordings totalling about 22 minutes, one two-file starter, two one-page checklists |
| Format | Browser and editor side by side, no webcam, laptop microphone |
| Guarantee | Watch all of it; if your page does not move by the end of the afternoon, ask for the money back |

## 3. Curriculum

Recorded in one afternoon, in this order, each video one take with cuts only
for mistakes. Full scripts with timings in `content/SCRIPTS.md`.

**Video 1. The plate (8 minutes).** The full-bleed parallax photograph:
`animation-timeline: view()`, the veil, the wrappers that make it a still
photograph where unsupported or unwanted. Live on a demo page.

**Video 2. Arrival (8 minutes).** Scroll reveals with a custom-property
stagger, the drawn hairline, the count-up to a real number held in the
markup, one IntersectionObserver. The defect that taught the hero-on-load
rule.

**Video 3. Depth, and switching it off (6 minutes).** The six-degree tilt,
the marquee, and the global reduced-motion rule that resolves every effect
to its finished state. The three defects found on the render, and the ask.

**Checklist 1, before anything moves.** The design rules: one move, one
accent, one radius, 640 milliseconds, six degrees, real numbers, one grade
of photography.

**Checklist 2, look at the render.** Four widths, reduced motion on, touch,
JavaScript off, the performance panel.

## 4. The ad

One sentence, one image of the terminal, worldwide, $5 a day for 7 days.

> Most people paste a prompt into an AI coding agent and hope. Here is the
> 22-minute version of how I brief one so it builds the right thing. $35.

Second variant to test against it:

> An AI agent saying "done" is a claim, not a fact. 22 minutes on how to
> brief one and how to check it. $35.

## 5. The sales page

`public/course/index.html`, served at `/course`. Same fonts, palette and
components as the portfolio, and it runs all five effects, because a page
selling motion has to move. Follows the sales-letter structure: hook, what
you get, why it is small, who it is for, the price and guarantee, the
questions, and the button after every argument.

No testimonials, no student counts, no income figures. It says plainly that
the source is public under MIT and what the $35 buys instead. The proof is
the page itself and the four defects written up in `PREFLIGHT.md`.

## 6. The ascension

There is no upsell inside the course. The last thirty seconds ask for one
reply. When someone replies with what they built, that is a conversation, and
if they need the thing built properly, the reply is where a consulting
engagement starts. No call unless they ask for one.

## 7. The test, and what would make us stop

| Day | Do |
|---|---|
| 0 | Page live with a checkout link. Ad live, worldwide, $5 a day. |
| 1 to 7 | Do not touch the ad. Record the three videos. |
| 7 | Count sales. Three or more on $35 spend: the idea works, double the budget. Zero to one: the hook is wrong, rewrite the title and first screen, run another $35. |
| 14 | If the second test also misses, the topic is wrong for cold traffic. Try *Give your AI agent hands* or park it. |

## 8. What exists, and what is still Aaron's

Built and tested locally (`api/`): Stripe Checkout, the webhook that sends
the access link, the signed permanent link, and the course page that renders
the lessons and both checklists. `SETUP.md` is the hour of configuration.
`content/SCRIPTS.md` is the afternoon of recording. `ads/ADS.md` is the ad.
`OPERATIONS.md` is the five minutes a day after that.

Still Aaron's, because they are promises:

1. Record the three videos within seven days of the first sale. The course
   page tells buyers that, in those words. The starter file and checklists
   are delivered instantly, so a buyer has something on day one regardless.
2. Honour the guarantee as written: watch all of it, ask, money back.
3. Read and answer the replies. The system has exactly one manual step and
   it is the one that makes the money.
