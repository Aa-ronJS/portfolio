# Recording scripts

Three videos, one afternoon. Slides in the left half of the screen, a live
terminal in the right. No webcam. Laptop microphone in a quiet room is fine;
the buyer is paying for what you know, not the audio. Record each in one take
and cut only the mistakes. Aim for the minutes shown; if you run long, cut
explanation, never the live demonstration.

The demo project for all three videos is one small real tool: a script that
reads a CSV of company domains and, for each, reports what email provider
they use from their DNS records. It is small enough to build in a video and
real enough to be wrong in interesting ways. Have the CSV ready with ten real
domains, one of which has no MX record and one of which is a typo.

---

## Video 01. A specification, not a wish. (8 minutes)

**Cold open, slide: "build me a dashboard".** (0:00 to 0:45)

> This is the most common prompt I see people give a coding agent. And the
> agent will build it. It will be fast, it will look good, and it will be the
> wrong dashboard, because nobody told it what the right one was. That is
> not the agent's fault. If I handed that sentence to a contractor I would
> get the same result and a bill.
>
> I have been a business analyst since 2015. The job is to stand between
> people who know what they need and people who build it, and write the
> thing in the middle so the builders cannot build the wrong thing. An AI
> agent is a delivery team. Fast, tireless, literal. It turns out to be the
> same skill, and it fits on one page.

**Slide: the four sections.** (0:45 to 2:00)

> Must do. Must never do. Edge cases. What finished looks like. That is the
> whole template, and it is checklist one in your download. I will fill it in
> live for a real tool, and then I will run it, and you will see how much
> less it argues with you.

Name the four, one sentence each on why it exists:

- Must do: the thing a person could test without having built it.
- Must never do: the guesses it is not allowed to make and the actions it
  must ask before taking. This is the section everyone leaves out.
- Edge cases: empty, duplicate, stale, hostile, and the one that went wrong
  before.
- Finished: the exact command that proves it, and an external check it cannot
  fake.

**Live: write the brief.** (2:00 to 5:30)

Open a blank markdown file beside the terminal. Type the brief for the DNS
tool out loud. Keep it to about twenty lines. Points to make while typing:

- Give it a real example row from the CSV. "Real example" is the highest
  value word in the template.
- In "must never do", write: if a domain has no MX record, say so, do not
  guess. If a domain does not resolve, say so, do not skip it silently.
- In "finished", write: running it on the ten-row CSV prints ten lines, and
  the line for `[domain you know]` says Google, which I can check against
  their public MX record myself.

**Live: run it.** (5:30 to 7:15)

Paste the brief into a fresh agent session with one line above it: "Build
this. Ask me before adding any dependency." Let it run. Narrate what it
does differently from a one-line prompt: it asks about the typo row, or it
handles the no-MX case explicitly, because the brief named it. If it does
something you did not ask for, point at the gap in your brief that let it,
and fix the brief on screen, not the code.

**Close.** (7:15 to 8:00)

> Before video two, do this. Open a project you actually want built. Fill in
> checklist one for it. Ten minutes, done badly, beats an hour of thinking
> about it. You will find at least one section you cannot fill in, and that
> section is where your agent has been inventing things.

---

## Video 02. Done is a claim, not a fact. (8 minutes)

**Cold open, slide: two screenshots.** (0:00 to 1:30)

Show two real artefacts from your own projects, redacted as needed:

1. Documentation describing a test pipeline. Then the repository, with no
   pipeline in it.
2. The performance report page that always scored perfect, because it was
   reading numbers the system never handed it.

> Both of these were reported to me as finished. Both looked finished. In
> both cases the agent wrote the description of the thing and then, in the
> most literal sense, moved on. Nobody lied. The agent is not capable of
> lying. It is capable of describing a plan in the past tense.
>
> So here is the rule I run every build under: an agent saying done is a
> claim, not a fact. And a claim needs a check that the agent cannot pass by
> being confident.

**Slide: three kinds of proof, and which one counts.** (1:30 to 3:00)

- Its own tests. Necessary, weakest. Ask of every test: could this fail?
- Its own report. Ask of every number: where did this come from?
- Something outside its control. The original spreadsheet. The live API. A
  second provider. This is the one that counts, and it is what checklist two
  is built around.

**Live: add the external check to the DNS tool.** (3:00 to 6:30)

The tool from video one reports each domain's email provider by reading MX
records through one resolver. Add a check that asks a different resolver
(Cloudflare's if the first was Google's, or the other way round) and flags
any domain where the two disagree. Brief the agent to add it, run it, and
show the output on the ten-row CSV.

Then break something on purpose: edit the CSV so a domain is misspelled in
a way that still resolves to a parked page. Show that the tool now reports
it, because the check is comparing against the world and not against itself.
Say plainly: this is the same shape of check that sits in both my public
tools, and it has caught things my own tests never could.

**Live: run checklist two on it.** (6:30 to 7:30)

Go down the first three sections of checklist two on screen, fast. Open one
of the agent's tests and ask "can this fail". Find the one number in its
summary output and ask where it came from. Take twenty seconds per item.
The point is that it is a habit, not a project.

**Close.** (7:30 to 8:00)

> Before video three: add one external check to your own tool. Something the
> agent cannot fake. Run it. If it agrees with the world, good. If it does
> not, you just saved yourself from finding out in front of a customer.

---

## Video 03. Set it against itself. (6 minutes)

**Cold open, slide: "three defects in an hour".** (0:00 to 1:15)

> When Rain Check went live, a tool of mine that tells a trades business
> whether Thursday's concrete pour will survive the weather, I did not read
> the code again. I opened a second agent session that knew nothing about
> the first, gave it the tool and the brief, and told it to break it. Within
> an hour it had found three real defects, including one where the tool
> cheerfully answered a question it should have refused.
>
> The build run wants to be finished. The break run wants to be right. You
> want both, and you cannot get both from one session, because it cannot
> un-know what it just built.

**Slide: the prompt.** (1:15 to 2:30)

Show the second-run prompt from checklist two, section four, on screen.
Read it out. Then the three things to hand it: the brief, the code, and
nothing else. No summary of what you think works. Say why: the moment you
tell it what works, it believes you.

**Live: run it against the DNS tool.** (2:30 to 5:00)

Fresh session. Paste the prompt, the brief, and the code. Let it go. Narrate
what it tries: the empty CSV, a domain with unicode, a row with a trailing
space, a thousand rows. Show at least one real finding and fix it on
screen. Then say what to do with the list of findings: they are next
month's edge cases, and they go straight into section three of the brief.

**Where to next, one sentence.** (5:00 to 5:20)

> The next thing after this is giving the agent real tools, so instead of
> guessing about your CRM it reads your CRM. Both of my public tools do
> that. If enough of you finish this and ask, I will record that one too.

**Close, and the ask.** (5:20 to 6:00)

> That is the course. A brief it cannot misread, a check it cannot fake, and
> a second run that tries to break it. Ten years of writing briefs for
> delivery teams, in twenty-two minutes.
>
> One thing. When you have run your first brief, reply to the email your
> link came in and tell me what it built and what the second run found. I
> read every one, and I answer. Go build something.

---

## After recording

1. Upload each video unlisted (YouTube or Loom). Copy the embed URL into
   `api/_lib/course.js`, field `embed`, and redeploy. Buyers' links do not
   change.
2. Send one email to everyone who bought before the videos landed: "Your
   videos are up, same link." That is the only broadcast the system sends.
3. Watch all three back once at 1.5x. Cut anything where you are explaining
   instead of showing.
