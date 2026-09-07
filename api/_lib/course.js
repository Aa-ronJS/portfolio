'use strict';
/* The course, as data. The watch page renders this. Video URLs are empty until
   each one is recorded; the page says so honestly rather than embedding
   nothing. Paste the unlisted YouTube or Loom embed URL into `embed` and
   redeploy; buyers' links do not change. */

const title = 'Draw It Badly';

const lessons = [
  {
    n: '01', minutes: 8,
    title: 'The drawing.',
    embed: '',
    summary: 'One character, drawn badly on purpose, straight into the kit template on your phone. The two red dots rule, the five parts that are required and the ones that unlock behaviour for good, exporting the sheet, and handing it to Claude: ingest, check, turn. You look at the check sheet before you use the character, every time.',
    doNow: 'Open the template on your phone and draw one character into the boxes. Send Claude the exported sheet with prompt card two. Look at check.png. If a part has a hole, redraw that part only.',
  },
  {
    n: '02', minutes: 7,
    title: 'The voice.',
    embed: '',
    summary: 'The whole episode as one voice memo: you say the stage directions out loud, then the line, with a beat of silence between. Claude splits the take, casts whoever you named, stages the shots, sets the captions from what you said, and draft-renders it while you make a cup of tea. Under thirty seconds of finished video from under two minutes of talking.',
    doNow: 'Record a four-line episode with your new character and one background. Send it with prompt card three. Watch the draft with the sound on before you change anything.',
  },
  {
    n: '03', minutes: 7,
    title: 'The fixes, and the cadence.',
    embed: '',
    summary: 'Every correction is a sentence to Claude: smaller, higher, from the right, close up on him. What the episode file is and why you never need to open it. Stock clips, props and the one sound rule. Then the production cadence that turns this into an account rather than a hobby: batch by activity, characters are capital, keep a bank of premises.',
    doNow: 'Give Claude three corrections in one message, get the final render, and post it. Then write five premises in your bank before you close the app.',
  },
];

const checklists = [
  {
    n: 'Checklist 01',
    title: 'The sheet',
    intro: 'Read this once before you draw and once after. A kit that ingests clean walks, talks, blinks and points immediately. A kit that does not costs you a re-draw of one box, never the whole character.',
    sections: [
      { h: 'Before the first line', items: [
        'Open the template at 100 percent on the phone or tablet. Do not resize or crop it; the four corner squares are how the sheet is straightened.',
        'Decide the character faces RIGHT. If it ends up facing left, that is fine, tell Claude to run turn.',
        'One pen, one set of colours, for every box. It has to read as one drawing once assembled.',
        'Put the two red dots down first, then draw the part around them. Dot one is the joint. Dot two is where the straight limb ends.',
      ]},
      { h: 'The five that are required', items: [
        'Torso: neck to hips, no head, no arms, no legs.',
        'Head: neutral face, mouth closed.',
        'Straight arm, relaxed, open hand.',
        'Straight leg, standing, shoe on, toes pointing the walk direction. Draw the knee at the third dot.',
        'Bent leg, knee mid-step.',
      ]},
      { h: 'Worth the extra minute', items: [
        'Head with mouth open. Your drawn mouth beats the stock flap.',
        'Bent arm, elbow at ninety degrees. Holding, flexing, hands near the face.',
        'Pointing arm. The stock point clip uses it.',
        'A second head with an expression. A pose now costs a head, not a body.',
        'Right-side arm and leg boxes only where the limb curves toward the body. Leave the rest empty and the left drawing stands in.',
      ]},
      { h: 'Rules that stop tears and gaps', items: [
        'Draw every part slightly past its joint so rotation never opens a gap.',
        'Close every outline. A shirt whose outline does not meet comes out see-through.',
        'Nothing is ever mirrored. A mirrored limb bends backwards.',
        'Export the drawn sheet as an image, or photograph the printed one flat with all four corners in frame, in even light.',
      ]},
    ],
  },
  {
    n: 'Checklist 02',
    title: 'Before you post',
    intro: 'Run this on every draft render, with the sound on, before you ask for the final. The pipeline will happily render something that is wrong; it exists to catch what a glance at a thumbnail cannot.',
    sections: [
      { h: 'The check sheet', items: [
        'Every part over magenta: no holes, no see-through garments.',
        'Three walk phases with the ground line: feet point the way the character walks, no backwards knee.',
        'The pupils verdict says found. If not, the eyes are not declared; tell Claude.',
      ]},
      { h: 'The draft, with sound', items: [
        'Every line you spoke is on screen as a caption, verbatim. A merged or split line means the pause was too short; say so and Claude re-cuts it.',
        'The mouth flaps on the words, not on the breaths. If it flaps on breaths, ask for the talk threshold to go up.',
        'Whoever you named walked in from the side you said, and stayed until they left.',
        'Nothing floats. Feet on the ground line, held objects touching the hand that holds them.',
      ]},
      { h: 'The look', items: [
        'Twelve frames a second, the boil jitter, the two-frame mouth. If it looks smooth, something was smoothed; ask for it back.',
        'Captions one line, lowercase, in the bottom third, readable on a phone at arm\'s length.',
        'Under thirty seconds. If it is not, cut a shot, not the pauses.',
      ]},
      { h: 'What stays human', items: [
        'Your voice, recorded. Never synthesised, never cleaned up into someone else.',
        'Your joke. Claude staged it; Claude did not write it.',
        'Post it as it is. The mistranscribed caption is part of the joke more often than you expect.',
      ]},
    ],
  },
];

/* The starter: the prompt cards. Word for word what you say to Claude Code on
   your phone, in order. The pipeline itself is public in the same repository;
   these are the sentences that drive it without ever opening a terminal. */
const starter = [
  {
    name: 'Card 1. The first session, once',
    body: `Clone https://github.com/Aa-ronJS/portfolio and work in animation-pipeline.
Run ./setup.sh --whisper. Then render demo/episode.yaml as a draft and send
me the mp4 so I can see that everything works. Read animation-pipeline/CLAUDE.md
first and follow it.`,
  },
  {
    name: 'Card 2. A new character, every time you draw one',
    body: `Attached is a kit sheet I drew on my phone from tools/kit_template.pdf.
Ingest it as myshow/characters/gary with --paper-cut 0.06 because it is
screen-drawn. Run check and send me check.png. If he is facing left, run turn
first. Tell me which optional boxes I left empty and what each one would unlock.`,
  },
  {
    name: 'Card 3. An episode, from one voice memo',
    body: `Attached is one voice take with the stage directions spoken in it.
Run puppet direct on it into myshow/ep01.yaml. Use the pub background if I did
not name one. Draft render it and send me the mp4 and the episode yaml. Do not
change any of my words in the captions.`,
  },
  {
    name: 'Card 4. Corrections, as many as you like in one message',
    body: `Shot 2: make gary half the size and put the caption higher.
Shot 3: the seagull should hop in from the right, not the left.
Shot 4: close up on gary.
The mouth is flapping on my breaths; raise the talk threshold a little.
Draft render again and send it.`,
  },
  {
    name: 'Card 5. The final',
    body: `Final render at 1080 by 1920 and send me the file. Then commit
myshow with everything except the mp4.`,
  },
  {
    name: 'The direction grammar, spoken into the recording',
    body: `"in the chip shop, dave walks in from the left and says"
"large chips please my good man"
"the seagull hops in from the right and says"
"give me one chip"
"close up on dave, he says"
"absolutely not"
"the seagull leaves"

dave says / asks / shouts     the NEXT line is dave's
dave walks in from the left   dave joins the stage and stays
dave leaves                   a short shot of dave leaving
in the pub                    background matched by name
close up on dave              next dialogue shot is head and shoulders
new scene / cut / meanwhile   clears the stage
beat / pause                  a short silent shot

Half a second of silence between lines. End a direction with the speech verb.`,
  },
];

module.exports = { title, lessons, checklists, starter };
