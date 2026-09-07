# The ad

One product, one channel, one line. Meta (Facebook and Instagram) because
that is where the method's economics were worked out; everything here
transfers to another channel if that changes.

## Settings, exactly

| Setting | Value | Why |
|---|---|---|
| Objective | Sales, with the Purchase event | The only number that matters is sales, so optimise for it, not clicks |
| Conversion location | Website | |
| Budget | $5 a day, daily budget, no end date set yet | The $5/7 rule: $35 over a week is the price of one course |
| Location | Worldwide | The whole edge. USA-only inventory costs several times more per impression |
| Age | 25 to 65 | Below 25 rarely runs a business or a team |
| Detailed targeting | None. Advantage+ audience on | Let the algorithm find buyers; the one-line ad does the qualifying |
| Placements | Advantage+ placements | |
| Language | English | The course is in English; leave everything else open |

Set the Meta Pixel on the sales page and the course page before the ad goes
live, with a Purchase event fired from `/api/watch` on the first visit after
payment. See `SETUP.md`. Without it the ad optimises for the wrong thing.

## Creative

One image: a screenshot of the terminal with a brief on the left and the
agent's response on the right, taken from the actual course recording. No
stock photo, no face, no text overlay. It should look like what the buyer
will see when they open the course, because it is.

## Primary text, two variants to test against each other

**A.**
> Most people paste a prompt into an AI coding agent and hope. Here is the
> 22-minute version of how I brief one so it builds the right thing. $35.

**B.**
> An AI coding agent saying "done" is a claim, not a fact. 22 minutes on how
> to brief one and how to check it. $35.

Headline, both: **Brief the Machine**
Description, both: Three videos, two checklists, nothing held back.
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
| 0 to 1 sales, clicks below 1% | The hook is wrong | Rewrite the headline and both primary texts. Run another $35 |
| Two consecutive misses | The topic is wrong for cold traffic | Try the second course idea in `../PLAN.md`, or park it |

Cost per purchase above $17.50 means the ads are losing money on the course
alone and you are relying on the reply loop to make it back. That can be a
fine decision, but make it knowingly.

## What not to do

- No retargeting, no lookalikes, no email list, no lead magnet, at launch.
  Each one is a place to spend hours before the first sale has proved the
  idea. Add them later, from profit.
- No urgency, no fake scarcity, no countdown. The course is $35 forever.
- No income claims in the ad, ever. Meta will reject them and they are not
  true of a buyer yet anyway.
