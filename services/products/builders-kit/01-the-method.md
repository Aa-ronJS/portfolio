# 2. The method

Everything in the later documents implements the four rules in this
one. They come from eleven years of business analysis before AI
existed as a tool, and they are the difference between AI leverage
and AI mess.

## 2.1 The spec is the work

An AI can produce enormous amounts of plausible output from a vague
instruction, which is precisely the danger: plausible is not
specified. The discipline that fixes it predates AI by decades: write
down what you are building before you build it, in enough detail that
a stranger could check the result against the words.

In practice (document 4 gives you the templates): every project gets
a spec file stating what the thing is for, who uses it, what it must
do, what it must never do, and what "done" looks like as checkable
statements. When output surprises you, the first question is always
"what did the spec say?", and the honest answer is usually "nothing",
which is a spec bug, not an AI bug. Fix it in the spec and rebuild;
never patch by conversation and move on, because conversation
evaporates and the spec is what survives.

This habit alone separates people who ship coherent systems with AI
from people with forty impressive fragments.

## 2.2 AI is a crew, not an oracle

The productive mental model is a skilled, tireless, overconfident
contractor: enormously capable, zero institutional memory, and
inclined to fill any gap in your instructions with a confident guess.
You would never tell such a contractor "build me something good" and
leave the site. You give written plans, you check the work, and you
never confuse fluency with correctness.

Three working consequences:

- **Instructions live in files, not in chat.** Anything you would
  need to say twice goes into the scaffolding files (document 4),
  which the tool reads every session. Chat is for the day's work;
  files are for the standing orders.
- **Small increments, inspected.** One component, one feature, one
  fix at a time, each looked at before the next. Batch instructions
  produce batch errors, and errors compound quietly.
- **Disagreement is a signal.** When the AI pushes back on your
  instruction, it is sometimes wrong and sometimes right; either way
  the disagreement marks a spot where your spec and reality differ.
  Investigate rather than override by reflex.

## 2.3 Verify adversarially, every time

The single most valuable prompt pattern in this kit costs one
sentence: after any meaningful piece of work, instruct the AI to
attack it. "Review what you just built as a hostile critic: what is
broken, what did I not ask for that any reasonable person would
expect, what will fail on a phone, what would embarrass me." Then,
separately, verify with your own eyes and hands, because the second
rule of the crew model is that the crew marks its own homework
optimistically.

Verification is specific, not vibes: open the actual page at desktop
and phone widths; click the things; submit the form and receive the
email; check the browser's error console; run the automated checks
document 6 sets up. Document 9 turns this into the standing
ship-check. The habit sounds slow and is the opposite: catching a
wrong assumption at component two costs minutes; discovering it at
component twenty costs the weekend.

## 2.4 Look at the result, not the code

You are allowed to read the code, and with this kit you increasingly
will. But the acceptance test is never "the code looks right"; it is
the rendered page, the received email, the number that reconciles.
AI-generated code reads convincingly by construction, which makes
code-reading a weak check precisely when you need a strong one.
Judge output where users live. This is also, not coincidentally, how
you supervise any specialist whose craft you have not mastered, and
it is why a non-coder with discipline can genuinely direct a build:
the checkable surface is the product, and the product does not care
who wrote it.

## 2.5 The loop, assembled

Every working session in the rest of the kit is this loop:

1. Read the spec; update it if today's work changes it.
2. Instruct: one increment, in outcome terms, pointing at the spec.
3. Let it build; answer its questions rather than letting it guess.
4. Adversarial review prompt, then your own eyes on the result.
5. Commit the increment (document 3 makes this a two-word habit), so
   the ground gained is permanent.
6. Log any decision made along the way (document 4's decision log),
   then next increment.

Print that; it is the kit.
