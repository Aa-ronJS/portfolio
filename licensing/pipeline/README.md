# Idea pipeline

A way to push many ideas through cheap checks and spend patent money only
on the ones that have earned it.

- **`ideas.json`** holds every idea and its stage.
- **`pipeline.py`** works out what each is worth and rebuilds
  **[`BOARD.md`](BOARD.md)**, the list of what to do next.
- **`/screen-ideas`** in a Claude session runs the next batch through the
  checks and updates both.

## The stages and what each costs

| Stage | What happens | Cost | Who |
|-------|--------------|------|-----|
| raw | An idea is written down | A$0 | Either of us |
| screened | Kill checks: on sale already? patented? at least 5 companies to pitch? | A$0 | Claude, by web search |
| sized | Scored out of 14. Odds and deal sizes estimated | A$0 | Claude |
| probed | 10 companies are asked about the problem only, with no mention of the solution | A$0 | You send; Claude drafts |
| proven | Bench test works and 7 of 10 strangers get it | About A$100 | You |
| filed | Provisional patent | A$100 | You |
| pitching | 30 companies, with four follow-ups | A$0 | You send; Claude drafts |
| interest | A company wants an evaluation or a licence | A$0 | You |
| deal | Signed | Lawyer's fee | You |

## The money rules

1. **No money before "proven".** Everything up to the bench test is free.
2. **A$100 to file, and only if the idea is worth at least A$5,000**
   in expected value and has passed the bench test.
3. **No more patent money until a company commits.** The full
   application costs about A$4,700 in official fees per idea, plus an
   attorney. Pay it only when a company has signed an evaluation option
   or agreed to cover it. If nobody has by month 10, let the provisional
   lapse.

The most an idea can cost before a company commits is about A$200.

## The problem probe

This is how to test company interest before filing, without giving the
idea away. The email describes the problem and the result, and nothing
about how it's done:

> We're looking at ways for [owners] to know when [the invisible thing]
> has happened. Is that something your product team is working on or
> would want to see?

Two or more replies showing interest moves the idea to "probed". None
out of ten is a reason to shelve it before spending anything.

## How "worth" is calculated

    worth = odds x (80% of the modest deal + 20% of the strong deal) x 2.5 years

- **Odds** start from the base rate (roughly 2 to 6% for an independent
  inventor) and move up for a deadline, a reachable licensee and a
  working prototype.
- **2.5 years** is three years of royalties, cut because about a third
  of licences end early.
- Every input is an estimate. The number is for ranking ideas against
  each other, not for forecasting income.

Change the bar, the years or the blend at the top of `pipeline.py`.

## Where new ideas come from

Two patterns have produced every idea that survived so far:

- **Wear-out:** something stops working invisibly, a cheap signal shows
  it, and the company selling the replacement profits. It's open only
  where the product or the problem is new.
- **Forced change:** a law or a technology shift makes a whole industry
  change its product, and the replacement has a new flaw.

Add any idea to `ideas.json` as `"stage": "raw"` with a one-line name.

## Adding or moving an idea

Edit `ideas.json`, then run:

    python3 licensing/pipeline/pipeline.py

A sized idea needs `scores` (seven numbers, 0 to 2), `odds`, `modest` and
`strong` (A$ a year), and `file` (its write-up in `licensing/`).

## What three batches have taught us

- **About 9 in 10 ideas die at the free checks.** Of 43 ideas so far,
  5 are live. That is the system working: none of the dead ones cost
  anything.
- **One patent blocks a whole family.** Under Armour's US 9,578,908
  covers clothing where a layer fades with wear and washing. Any
  clothing idea that works by fading is dead until about 2035. The
  reproof tab and the fit mark survive because they work by wetting and
  by stretch.
- **The wear-out pattern is nearly mined out.** It has been patented in
  most established product types. It stays open only where the product
  or the problem is new.
- **The best new lead came from counted complaints**, not from a
  pattern: 3,500 logged cases about battery packaging after a 2024 law.
  Future batches should start from complaint counts after a rule change.
- **Check for a failure that announces itself.** Foggy goggles need no
  indicator. An idea only works if the owner can't already tell.
