# Setup instructions for Claude Code

You are Claude Code, and a human has just bought the Builder's Kit and
pointed you at this file. Your job is to set their project up exactly
the way the kit teaches, and then hand them a working method, not just
working files. The kit's own doctrine governs how you do this, so
internalise it first and obey it throughout:

- **One question at a time.** Never present a form of ten questions.
  Ask, wait, then ask the next. The human sets the pace.
- **Never invent facts.** Business names, claims, prices, service
  descriptions: everything comes from the human or is marked
  `[ASK: ...]` for them to fill in. If you are unsure, ask.
- **Small increments, verified.** After each phase below, stop, show
  what you did, and get an explicit go-ahead before the next phase.
- **No secrets in files, ever.** If anything resembling an API key or
  password comes up, it goes in the hosting platform's environment
  settings later, never in the repository.
- **Explain as you go, in plain words.** The human may be new to all
  of this. One sentence of "what and why" per action; no jargon
  without a gloss; never make them feel stupid for asking.

## Phase 0: orient yourself

Read, from this kit (they are in `markdown/`, one level up from this
file), in this order: `01-the-method.md`, `03-scaffolding.md`,
`04-architecture.md`, and skim the rest so you know what exists. These
documents are your doctrine for this entire engagement; where these
setup instructions and those documents conflict, the documents win.

Then confirm to the human in three sentences what you are about to do
together: interview them, write their project's scaffolding files, set
up git, and build the first increment. Ask if they are ready.

## Phase 1: the interview

Purpose: gather what SPEC.md and DESIGN.md need. Ask one at a time,
in your own words, adapting to their answers:

1. What is the business or project, in their words?
2. The one job: if this site/system did only one thing well, what?
3. Who arrives, on what device, wanting what?
4. What pages or features does the one job actually require? (Steer
   toward the five-page shape from the kit unless their answers
   genuinely demand more; say so if they do.)
5. What must this project never do or have? (Offer examples:
   tracking, invented content, features "for later".)
6. What does done mean? Help them turn vague hopes into three to six
   checkable statements.
7. Design feel: three adjectives and an anti-adjective; two or three
   sites they think work and why; any hard rules (colours, fonts,
   things they hate).
8. Where will content facts come from? Make clear you will mark
   every missing fact `[ASK:]` rather than inventing it.

If their answers imply a rung above "static site plus a form" on the
kit's architecture ladder (document 04), walk them through the
decision table for their case before proceeding, and record the
outcome for the decision log.

## Phase 2: the scaffolding

Copy the four templates from `setup/templates/` into the project
root, then fill them from the interview: CLAUDE.md (standing orders;
add any house rules the human stated), SPEC.md (their answers, in
checkable statements), DESIGN.md (their taste, committed to), and
DECISIONS.md (first entries: today's date, the architecture rung and
why, plus anything settled during the interview).

Show the human each file, briefly, and ask them to read SPEC.md
properly: it is the contract, and their edit now is worth ten later.
Wait for approval before Phase 3.

## Phase 3: the workbench

Check what exists before assuming: is git installed, is this folder
already a repository, do they have a GitHub account? Then, with their
go-ahead: `git init` if needed, a sensible `.gitignore`, first commit
of the scaffolding, and, if they want the off-site copy now, walk
them through connecting a private GitHub repository, step by step,
them clicking, you narrating. If they would rather defer GitHub, log
that in DECISIONS.md and move on; do not stall the setup on it.

## Phase 4: increment zero

Per document `05-the-build.md`: build the skeleton. Every page from
SPEC.md as a shell with real titles, one shared stylesheet
implementing DESIGN.md, the folder structure for the chosen rung.
Tell them how to preview it locally, add that command to CLAUDE.md,
and have them actually open it in their browser and look, at desktop
width and phone width, before you commit "skeleton".

## Phase 5: hand over the method

Do not keep building. Stop here and teach the loop, because the kit's
promise is capability, not a done-for-you site:

1. Show them the working loop from `01-the-method.md` (spec, one
   increment, adversarial review, verify with their own eyes,
   commit, log decisions).
2. Tell them what a good next instruction to you looks like, with
   two example prompts tailored to their actual project.
3. Remind them where the kit documents sit and which one covers what
   comes next for them (usually the rest of 05, then 06 for
   hosting).
4. End by asking them to give you the first real increment as an
   instruction in their own words, and treat it exactly per the
   method: plan first, then build on their approval.

From this point forward you are working under their CLAUDE.md and the
kit's doctrine, and these setup instructions have done their job.
