# Recording scripts

Three videos, one afternoon. Two things on screen throughout: the phone,
mirrored to the desktop (QuickTime, scrcpy, whatever you have), and nothing
else. The whole point of the course is that it happens on the phone, so the
buyer must never see a laptop terminal. No webcam. Laptop microphone is
fine; the buyer is paying for what you know, not the audio. One take each,
cut only the mistakes. If you run long, cut explanation, never the part
where you draw, record or send.

Before recording: a fresh show folder, a fresh Claude Code session on the
phone with the repository already cloned and `setup.sh --whisper` already
run (card one), and one background drawn. Have Sugar's sheet and his render
to hand for the cold open. The character you draw live is new, and it is
drawn badly, on purpose, in real time. Do not rehearse it into looking good.

---

## Video 01. The drawing. (8 minutes)

**Cold open, the phone: Sugar's sheet, then Sugar's render.** (0:00 to 0:50)

> This sheet took me about ten minutes with a finger. This is what came out
> of it: he walks in on his own legs, talks, blinks, and points, and nobody
> drew a frame of any of it. Today you draw one of these, and by the end of
> the third video you have posted an episode. I am going to draw one now,
> badly, and I am not going to slow down to make it nicer, because nicer is
> the enemy here. A crude drawing sets no expectation. It can carry a
> hundred episodes.

**The template.** (0:50 to 2:00)

Open `tools/kit_template.pdf` in the drawing app. Point at, in order:

- The four black corner squares. Do not crop them off; they are how the
  sheet gets straightened after you export it.
- The boxes with labels. Five are required, the rest are optional. Say the
  five: torso, head, straight arm, straight leg, bent leg.
- The red dots. Two per box; three on the straight leg, the knee.

> The one trick in this entire course: put the two red dots down first,
> then draw the part around them. Dot one is the joint, where the part
> attaches. Dot two is where the straight version of that limb ends. Get
> that right and everything else is forgiving.

**Live: draw the character.** (2:00 to 5:15)

Draw all five required boxes, talking as you go, one pen, one set of
colours. Points to land while drawing, one per box:

- Torso: neck to hips, no head, no limbs. Draw the hips wrapping past the
  hip dot; the legs tuck up behind it.
- Head: neutral, mouth closed. If you draw one more box today, make it the
  open-mouth head; your drawn mouth beats the stock flap.
- Straight arm: hanging, open hand. Draw it slightly past the shoulder dot
  so rotation never opens a gap.
- Straight leg: shoe on, toes pointing right, knee at the third dot. Say:
  nothing is ever mirrored, so a limb drawn bending the wrong way bends
  the wrong way forever.
- Bent leg: knee mid-step.

Then close every outline. Say why: a shirt whose outline does not meet
comes out see-through. Then export as an image.

**Live: send it to Claude.** (5:15 to 7:20)

Switch to Claude Code in the phone's browser. Attach the image, paste card
two, change the name. While it runs, say what it is doing: straightening
off the corner squares, erasing every printed mark, splitting the boxes
into parts, writing the skeleton and the face anchors, assembling the
resting figure. Then open `check.png` when it comes back.

> Every part over magenta, so a hole shows instantly. Three walk phases on
> a ground line, so a backwards knee shows instantly. A pupils verdict.
> Look at this before you use the character, every time. "It probably
> ingested fine" is usually wrong somewhere, and when it is, you redraw one
> box, not the character.

If Claude reports the character faces left, show it running `turn`. If a
part has a hole, redraw that one box on screen and resend. Do not edit
this out; it is the most useful thirty seconds in the video.

**Close.** (7:20 to 8:00)

> Before video two: your character, all five boxes, sent with card two,
> and you have looked at the check sheet. If you feel like it, one
> background: a room, a street, a flat colour rectangle. Nobody cares.

---

## Video 02. The voice. (7 minutes)

**Cold open, the phone's voice memo app.** (0:00 to 0:40)

> The whole episode is one recording. Not a line per file, not a script
> you type. You say the stage directions out loud, pause, say the line,
> pause. The pauses are the cuts. There is no timeline to edit because you
> edit it by talking.

**The grammar.** (0:40 to 2:00)

Show the direction card on screen and read the example take aloud, in
character, with the pauses:

> "In the chip shop, Dave walks in from the left and says." Pause. "Large
> chips please my good man." Pause. "The seagull hops in from the right
> and says." Pause. "Give me one chip." Pause. "Close up on Dave, he
> says." Pause. "Absolutely not." Pause. "The seagull leaves."

Then the seven verbs, fast: says, walks in from, leaves, in the, close up
on, new scene, beat. Two rules: half a second of silence between lines,
and end every direction with the speech verb, because that is what hands
the next line to the right mouth even if the name got misheard.

**Live: record a real four-line episode.** (2:00 to 3:30)

Record it in one take, deadpan, on the phone. Do not do a second take. Say
so: first take is usually the right take, because the deadpan is the joke
and a second take starts performing.

**Live: send it to Claude.** (3:30 to 5:45)

Attach the memo, paste card three. While it runs, say what it is doing:
splitting on the silences, transcribing each line, matching the names you
said against your cast, staging whoever walked in and keeping them there
until they left, setting each shot's length from what you said, and
rendering a half-size draft. Open the draft and watch it with the sound
on, all the way through, before saying anything.

> The mouth is moving on the words, not on a transcript. It is driven by
> how loud you are, syllable by syllable, which is why it lands. And every
> caption is exactly what you said. If one is wrong, it means the pause
> was too short and two lines got glued, and you tell Claude that in a
> sentence.

**Close.** (5:45 to 7:00)

> Before video three: record your own four lines with your character and
> your background, send it with card three, and watch the draft with the
> sound on. Do not fix anything yet. Notice what you would fix. That is
> the whole of video three.

---

## Video 03. The fixes, and the cadence. (7 minutes)

**Cold open, the draft from video two, paused on its worst shot.** (0:00 to 0:40)

> Here is the thing I would fix. He is too big, the caption is on his
> face, and the seagull came in from the wrong side. Three corrections.
> Watch how long this takes.

**Live: corrections in one message.** (0:40 to 2:30)

Paste card four, edited to the real three fixes. Send. While it renders,
show the episode file Claude sent back and scroll it once:

> This is the episode. Every shot, who is in it, where they stand, what
> they say. Claude wrote it from your voice and edits it from your
> sentences. You never have to open it. I am showing it to you so you know
> there is nothing hidden: it is a readable text file and it is yours.

Open the new draft. Confirm the three fixes. If one did not land, say so
to Claude in another sentence; do not edit that out either.

**Props, moves, and the sound rule.** (2:30 to 3:45)

Name, do not demonstrate: any rigged character can wave, nod, point, sit,
kneel, run, jump, and a dozen more, by saying so in the recording or in a
correction. A prop is a drawing that rides a hand. Then the one rule
about sound:

> Your voice is recorded, never synthesised. The pipeline will not add a
> synthetic voice, and it will not write a joke. That is not a missing
> feature; it is in the manual as a rule. The audience these formats win
> is voting for exactly the human parts. The crude drawing is how they can
> tell.

**Live: final render and post.** (3:45 to 5:00)

Paste card five. When the file comes back, save it to the phone and post
it, on screen, to whichever account you use. Do not talk over the
posting; let them see it is a normal upload.

**The cadence.** (5:00 to 6:15)

Slide, three lines:

- Batch by activity, not by episode. Write five in one sitting. Draw
  every new character the five need in one sitting. Record all five in
  one sitting.
- Characters are capital. After three episodes most new ones need no
  new drawing. A new episode is a voice memo and a cup of tea.
- Keep a bank of premises. Never sit down to a blank page.

**Close, and the ask.** (6:15 to 7:00)

> That is the course. One drawing, one voice memo, five sentences to
> Claude, and it is on your account. Post the first one before you fix
> it; the first committed demo went up with chewed captions from a robot
> voice test, and the chewed captions were the joke.
>
> One thing. When your first episode renders, reply to the email your link
> came in with the file or the link. I watch every one, and I answer with
> the one thing I would change. Go draw something badly.

---

## After recording

1. Upload each video unlisted (YouTube or Loom). Copy the embed URL into
   `api/_lib/course.js`, field `embed`, and redeploy. Buyers' links do not
   change.
2. Send one email to everyone who bought before the videos landed: "Your
   videos are up, same link." That is the only broadcast the system sends.
3. Watch all three back once at 1.5x. Cut anything where you are explaining
   instead of drawing, recording or sending.
