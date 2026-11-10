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

**Start from a problem with evidence, not from a solution.** The first
three batches started from a solution I liked (a wear indicator) and
looked for products to put it on. 32 of 37 died. The five survivors and
the best later leads all began somewhere else: a change that had already
happened, and a problem people could be shown to have.

Every new entry now has to answer four questions before anyone thinks
about a solution:

| Question | Good answer | Bad answer |
|----------|-------------|------------|
| What changed? | A law, a ban or a technology switch, with a date | Nothing; the product has always been like this |
| What new weakness did the change create? | The replacement fails in a way the old one didn't | A general annoyance |
| Where is the evidence? | Counted complaints, recalls, a maker's manual admitting it, a maker's newer model fixing it, or a viral workaround | "People probably hate this" |
| Who profits from a fix? | A named kind of company that sells more because of it | "Consumers" |

Three places to find them, best first:

1. **Forced substitutions.** List what a rule or shift made everyone
   replace, then ask how the replacement is worse. PFAS-free coatings
   wear out faster: the reproof tab. Non-stick giving way to steel and
   ceramic: the pan disc. Eco dishwashers that don't heat-dry: the mug
   rail and the door-popper lead. Heat pump dryers: the lint lead.
2. **What makers admit.** A manual that says "this is normal", or a new
   model whose headline feature fixes an old flaw, proves the problem
   and proves the fix works. The gap is every older unit still in use.
3. **Counted complaints.** Logged cases, recall counts, poll numbers.
   A single forum post doesn't count.

## The play lane

Problem-first sourcing finds useful products, and useful products are
often dull. A second lane, in `licensing/play/`, starts from delight:
a physical effect that surprises people, turned into a toy, game or
gift. It has its own first question (would someone show this to a
friend?), needs no patent, and is pitched on a prototype and a video.
Play ideas sit on the board without a money figure until one has been
built and tried on real people.

## Rules learned the hard way

1. **Read the patent claims before scoring, not after.** A search
   summary is not a patent check. The paddle marks lost a point when
   the claims were finally read.
2. **One live patent can close a whole family.** Under Armour's
   US 9,578,908 closes any clothing idea that works by a layer fading
   with wear and washing, until about 2035. Check new clothing ideas
   against it first.
3. **If the failure announces itself, there is no product.** Foggy
   goggles need no fog indicator.
4. **If the maker can add it for free, there is no licence.** The dog
   ramp gauge.
5. **A crowded mechanism is a warning, not a pattern to copy.** Wear
   indicators exist for razors, shoes, bras, sponges, cloths, cutting
   boards and golf clubs.
6. **The retrofit is often the opening.** Makers patent the built-in
   fix for new models. The add-on for the millions of old ones is left.
8. **Useful is not the same as wanted.** Three rounds of fixes for small
   annoyances were called boring, fairly. Ask of every idea whether
   anyone would be excited to own it or show it.
7. **When a batch comes back empty, change where the ideas come from**
   before running another.

## Adding or moving an idea

Edit `ideas.json`, then run:

    python3 licensing/pipeline/pipeline.py

A sized idea needs `scores` (seven numbers, 0 to 2), `odds`, `modest` and
`strong` (A$ a year), and `file` (its write-up in `licensing/`).

## What three batches have taught us

- **About 9 in 10 ideas die at the free checks.** Of 37 ideas checked so far,
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
