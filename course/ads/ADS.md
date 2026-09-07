# The ad

One product, one channel, one line. Meta (Facebook and Instagram) because
that is where the method's economics were worked out, and because the
buyer is already there watching animated shorts. Everything here
transfers to TikTok if that changes.

## Settings, exactly

| Setting | Value | Why |
|---|---|---|
| Objective | Sales, with the Purchase event | The only number that matters is sales, so optimise for it, not views |
| Conversion location | Website | |
| Budget | $5 a day, daily budget, no end date set yet | The $5/7 rule: $35 over a week is the price of one course |
| Location | Worldwide | The whole edge. USA-only inventory costs several times more per impression |
| Age | 18 to 55 | The buyer writes jokes and posts shorts |
| Detailed targeting | None. Advantage+ audience on | Let the algorithm find buyers; the ad itself does the qualifying |
| Placements | Advantage+ placements, Reels first | The ad is a vertical short; it belongs where shorts are |
| Language | English | The course and the direction grammar are in English |

Set the Meta Pixel on the sales page and the course page before the ad goes
live, with a Purchase event fired from `/api/watch` on the first visit after
payment. See `SETUP.md`. Without it the ad optimises for the wrong thing.

## Creative

The ad is an episode. Not a promo about the course: an actual thirty-second
short made with the pipeline, in your voice, that is funny on its own, with
the last two seconds being the sheet it was drawn from and the one line of
text. The audience is scrolling shorts; the ad has to be one, or it is
skipped before the pitch. Export at 1080 by 1920.

Second creative to test against it: a nine-second screen recording of the
phone loop itself. Finger drawing into the template, the voice memo
waveform, the render appearing. No face, no voice-over, no music.

## Primary text, two variants to test against each other

**A.**
> I drew this with my finger in ten minutes and said the episode into my
> phone. Claude did the rest. The 22-minute version of how. $35.

**B.**
> Animated shorts from your phone: one bad drawing, one voice memo, no
> animator, no terminal, no synthetic voice. 22 minutes. $35.

Headline, both: **Draw It Badly**
Description, both: Three videos, five prompt cards, two checklists.
Button: Learn more. Link: the course page.

Run both variants in one ad set for the first week. After seven days keep
the one with the lower cost per purchase and switch the other off. Do not
add a third until the winner has sold ten copies.

## What to read after seven days

| Result on $35 spend | Meaning | Do |
|---|---|---|
| 3 or more sales | The idea works and the ads pay for themselves | Double the budget to $10 a day. Do not touch the creative |
| 2 sales | Close. Probably the page, not the idea | Rewrite the first screen of the sales page, run another $35 |
| 0 to 1 sales, but clicks above 1% | People want to know, the page loses them | Same as above |
| 0 to 1 sales, clicks below 1% | The hook is wrong | Use a different episode as the ad. The joke is the hook |
| Two consecutive misses | The topic is wrong for cold traffic | Try the second course idea in `../PLAN.md`, or park it |

Cost per purchase above $17.50 means the ads are losing money on the course
alone and you are relying on the reply loop to make it back. That can be a
fine decision, but make it knowingly.

## What not to do

- No retargeting, no lookalikes, no email list, no lead magnet, at launch.
  Each one is a place to spend hours before the first sale has proved the
  idea. Add them later, from profit.
- No urgency, no fake scarcity, no countdown. The course is $35 forever.
- No income or follower claims in the ad, ever. Meta will reject them and
  they are not true of a buyer yet anyway.
- Never put a synthetic voice on the ad. The audience can tell, and it
  contradicts the product.
