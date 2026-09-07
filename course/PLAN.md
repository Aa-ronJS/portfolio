# Aaron's tiny course: the plan

Applies `METHOD.md` to material that is already on the portfolio. Every claim
below is one the main page already makes and can stand behind. Nothing here is
invented for the sales page.

## 1. The idea

**Pain point with money behind it.** Small business owners, consultants and
ops people who have started using AI coding agents (Claude Code, Cursor,
Copilot) and are getting confident, fast, wrong output. They are already
paying for the tool and for their own wasted time.

**Instant gratification.** After 22 minutes they have a one-page brief they
can paste in front of their next agent run, and a checklist for catching the
agent when it says "done" and is not.

**The hook.** The portfolio's own line: most people paste a prompt in and
hope. The course is the other way.

Alternatives considered and set aside for now, in the order they would come
next:

- *Find the money your CRM migration lost.* The $3.8 million HubSpot story.
  Strong hook, but the buyer is a charity finance lead, a slow and careful
  audience, not an impulse one.
- *Give your AI agent hands.* Building an MCP server so an agent can read a
  CRM. Excellent second course for people who finish the first.

## 2. Title, price, length

| | |
|---|---|
| Title | **Brief the Machine** |
| Subtitle | How to make an AI coding agent build the right thing, in 22 minutes |
| Price | $35 AUD, one payment, no upsell |
| Length | Three screen recordings totalling about 22 minutes, plus two one-page checklists |
| Format | Slides and a live terminal, no webcam, laptop microphone |
| Guarantee | Watch all of it; if it did not change how you brief an agent, ask for the money back |

## 3. Curriculum

Recorded in one afternoon, in this order, each video one take with cuts only
for mistakes.

**Video 1. A specification, not a wish (8 minutes)**
- Why "build me a dashboard" produces a beautiful wrong thing.
- The four sections of the one-page brief: what it must do, what it must
  never do, the edge cases, and what finished looks like.
- Live: write the brief for a small real tool on screen, then run it.
- Checklist 1 is this brief as a fill-in template.

**Video 2. Done is a claim, not a fact (8 minutes)**
- The two overclaims from the portfolio: documentation for a test pipeline
  that did not exist, and a performance report structurally incapable of
  failing.
- The rule: every build carries a check against something you do not
  control. A different DNS provider, the original data, the company's own
  website.
- Live: add that check to the tool from video 1 and watch it catch something.
- Checklist 2 is the verification checklist.

**Video 3. Set it against itself (6 minutes)**
- One run builds, a separate run that knows nothing about the first tries to
  break it. How to prompt the second run.
- The three defects this found in Rain Check within an hour of going live.
- Where to go next: giving the agent real tools. One sentence, no pitch.
- Close: when you have run your first brief, reply to the receipt email and
  tell me what it built. I read every one.

## 4. The ad

One sentence, one image of the terminal, worldwide, $5 a day for 7 days.

> Most people paste a prompt into an AI coding agent and hope. Here is the
> 22-minute version of how I brief one so it builds the right thing. $35.

Second variant to test against it:

> An AI agent saying "done" is a claim, not a fact. 22 minutes on how to
> brief one and how to check it. $35.

## 5. The sales page

`public/course/index.html`, served at `/course`. Same fonts, palette and
components as the portfolio so it reads as the same person. Follows the
sales-letter structure: hook, what you get, why it is small, who it is for,
the price and guarantee, the questions, and the button after every argument.

No testimonials, no student counts, no income figures. The proof on the page
is the same proof the portfolio uses: two live tools whose code is public,
and specific things that went wrong and were found.

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

## 8. Still to be decided by Aaron before the page goes live

1. The checkout link. The button points at a placeholder and says so in a
   comment. A Stripe Payment Link or Gumroad product fills it.
2. The delivery promise. The page sells the beta and says the recordings
   arrive within seven days of purchase. That is a promise to keep.
3. The guarantee wording above, which is written as the house would write
   it and is Aaron's to accept or change.
