'use strict';
/* Each lesson, written out in full, so a buyer who arrives before the videos
   are recorded still has the entire course. Keyed by lesson number. Paragraphs
   are separated by blank lines; the watch page renders them as such. */

module.exports = {
  '01': `This sheet took me about ten minutes with a finger, and what came out of it walks in on his own legs, talks, blinks and points, and nobody drew a frame of any of it. Today you draw one of these. Draw it badly and do not slow down to make it nicer. Nicer is the enemy here. A good drawing sets an expectation the next one has to meet, and then you are an animator. A crude drawing sets no expectation, so it can carry a hundred episodes.

Open the kit template from the repository's tools folder in any drawing app on your phone or tablet. Do not crop it or resize it. The four black corner squares are how the sheet gets straightened after you export it. The boxes are labelled. Five are required: torso, head, straight arm, straight leg, bent leg. The rest are optional and each one unlocks something for good.

The one trick in this entire course: put the two red dots down first, then draw the part around them. Dot one is the joint, where the part attaches. Dot two is where the straight version of that limb ends. The straight leg has a third dot at the knee; draw the knee there and the leg bends at a real joint in walks, kneels and sits. Get the dots right and everything else is forgiving.

Torso: neck to hips, no head, no limbs, with the hips wrapping past the hip dot so the legs tuck up behind it. Head: neutral face, mouth closed. If you draw one more box today, make it the open-mouth head, because your drawn mouth beats the stock flap. Straight arm: hanging, open hand, drawn slightly past the shoulder dot so rotation never opens a gap. Straight leg: shoe on, toes pointing right, knee at the third dot. Bent leg: knee mid-step. One pen, one set of colours, for all of it, so it reads as one drawing once assembled.

Nothing is ever mirrored. A limb drawn bending the wrong way bends the wrong way forever, which is why the template has optional right-side boxes for any limb that curves toward the body. Leave them empty and the left drawing stands in. Close every outline before you export; a shirt whose outline does not meet comes out see-through.

Export the sheet as an image. Open Claude Code in your phone's browser, attach the image, paste prompt card two, and change the name. Claude straightens the sheet off the corner squares, erases every printed mark, splits the boxes into parts, writes the skeleton and the face anchors, and assembles the resting figure. If it reports the character faces left, it runs turn, which fixes that in one shot.

Then it sends you the check sheet, and you look at it before you use the character, every time. Every part sits over magenta, so a hole or a see-through garment shows instantly. Three walk phases sit on a ground line, so a backwards knee shows instantly. There is a pupils verdict. "It probably ingested fine" is usually wrong somewhere, and when it is, you redraw one box, not the character, and resend.`,

  '02': `The whole episode is one recording. Not a line per file, not a script you type. You say the stage directions out loud, pause, say the line, pause. The pauses are the cuts. There is no timeline to edit because you edit it by talking.

The grammar is seven verbs. "Dave says", and the next line you speak is Dave's: his mouth puppets to it and it becomes the caption. "Dave walks in from the left", and Dave joins the stage and stays in every shot until "Dave leaves". "In the pub" picks a background by name. "Close up on Dave" frames the next line head and shoulders. "New scene" clears the stage. "Beat" is a short silent shot. Directions compose, so "in the chip shop, Dave walks in from the left and says" is one line.

Two rules. Leave about half a second of silence between lines; that is what the split listens for. And end every direction with the speech verb, because that is what hands the next line to the right mouth even when a name gets misheard. If the pipeline keeps mishearing a name, the name it hears becomes an alias for that character and the problem goes away.

Record a real four-line episode with the character from lesson one and a background, on the phone's own voice memo app, in one take, deadpan. Do not do a second take. The first take is usually the right one, because the deadpan is the joke, and a second take starts performing.

Attach the memo in Claude Code and paste prompt card three. Claude splits the take on the silences, transcribes each line, matches the names you said against your cast, stages whoever walked in and keeps them there until they left, sets each shot's length from what you said, and renders a half-size draft. Watch it with the sound on, all the way through, before you say anything.

The mouth is moving on the words, not on a transcript. It is driven by how loud you are, syllable by syllable, which is why it lands on the beats of your voice. Every caption is exactly what you said, in your words, lowercase, one line. If a caption holds two lines, the pause between them was too short and they were glued; tell Claude in a sentence and it re-cuts the take. If the mouth flaps on your breaths, ask for the talk threshold to go up a little.

Before lesson three, notice what you would fix. Do not fix it yet. That is the whole of lesson three.`,

  '03': `Every correction is a sentence. "Shot two: make Gary half the size and put the caption higher." "Shot three: the seagull should hop in from the right." "Close up on Gary in shot four." Put three in one message, paste it as prompt card four, and send. Claude edits the episode and renders another draft while you make a cup of tea.

The episode is a plain text file that Claude wrote from your voice: every shot, who is in it, where they stand, what they say. You never have to open it. Ask to see it once anyway, so you know there is nothing hidden. It is readable, it is ordinary, and it is yours.

Any rigged character can wave, nod, point, sit, kneel, run, jump, skip, climb, cartwheel and more, by saying so in the recording or in a correction. A prop is a drawing that rides a hand; a held object touches the hand that holds it on any character, and a dropped one falls, tumbles and stays where it lands. Two characters can fight by intent alone: say one wants to punch the other and the other automatically guards, dodges and staggers. None of this needs a drawing from you beyond the object itself.

The one rule about sound. Your voice is recorded, never synthesised. The pipeline will not add a synthetic voice and will not write a joke; that is written into its manual as a rule, not a missing feature. The audience these formats win is voting for exactly the human parts, and the crude drawing is how they can tell those parts are human.

When the draft is right, paste prompt card five. The final render is 1080 by 1920 at twelve frames a second with the hand-held wobble and the two-frame mouth, which is the look, on purpose. Save it to the phone and post it like any other upload. Post the first one before you fix it. The first committed demo was staged from a robot voice as a worst-case test, went up with chewed captions, and the chewed captions were the joke.

Then the cadence, which is what makes this an account rather than a hobby. Batch by activity, not by episode: write five in one sitting, draw every new character the five need in one sitting, record all five in one sitting. Characters are capital: after three episodes most new ones need no new drawing, and an episode is a voice memo and a cup of tea. Keep a bank of premises as they occur to you, so you never sit down to a blank page.

When your first episode renders, reply to the email your link came in with the file or the link. I watch every one, and I answer with the one thing I would change.`,
};
