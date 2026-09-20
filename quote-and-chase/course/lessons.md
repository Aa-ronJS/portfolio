# Quote and Chase for painters: lesson plan and demo script

Total runtime target: 45 to 55 minutes across seven short videos, plus
the two-minute demo that doubles as the ad.

## 0. The two-minute demo (ad creative and landing page video)

Screen recording, phone footage intercut. No talking head.

1. Phone: walk into a lounge, take four photos. Say the notes out loud
   into a voice memo: "Lounge, five by four, walls and ceiling, one
   patch where the TV bracket was, skirtings and one door."
2. Laptop: drop the photos and the notes into a folder named after the
   address. Double-click Claude Code. Type `/quote 12 Wattle St`.
3. Let it run unedited for about 40 seconds at 2x speed. Show it
   reading each photo, the quantity table, the price lines.
4. Open the PDF. Scroll it. Open working.md and show the assumptions.
5. End card: "Quote from a photo in two minutes. Your prices. Your
   laptop. No per-job fees." QR code and URL.

## 1. What you are about to build (4 min)

- The evening problem: quoting after dinner, chasing on weekends.
- What this pack does and does not do. Say plainly it is not a
  scheduling app and does not take payments.
- Show the finished folder, the three commands, one quote PDF.

## 2. Install the pack (5 min)

- Double-click the installer. Show the backup message.
- Open the folder. Walk the structure: business, quotes, invoices,
  chase, jobs.csv. "You will only ever touch business and
  quotes/incoming."

## 3. Your prices (8 min)

- Open price-list.md. Change three rates on camera, explain units.
- Explain the measuring rules and why they matter: "Claude guesses a
  2.4 metre ceiling unless you tell it otherwise."
- Fill details.md including the voice section. Show how the voice
  changes a reminder draft later.

## 4. Your first quote (10 min)

- Run `/quote Example - 12 Wattle St Ringwood`. Narrate what Claude is
  doing each step, especially the permission prompts.
- Read working.md together. Change one assumption in notes.txt (the
  hallway is 2.7 m high) and re-run. Show the total move.
- Open the PDF. Show what to check before sending.
- Say out loud: you send it, from your own email.

## 5. Measure it properly, then a real job (10 min)

- The measure sheet: print, check the 100 mm bar, tape it up, one
  photo per wall. The measuring page: four wall corners, two per
  opening, save. LiDAR scan as the iPhone Pro shortcut.
- Then the real job below, with the source column showing measured
  versus estimated.


- Real photos from a real room (get permission). Show a dark photo and
  how Claude flags it as an assumption.
- Show a TO CONFIRM line appear for something not on the price list,
  then add the rate to the price list and re-run.

## 6. Invoice and chase (8 min)

- `/mark Q-1001 accepted`, `/invoice Q-1001 deposit`. Show the PDF and
  the ledger row.
- Fake-forward the due date in jobs.csv. Run `/chase`. Read the three
  reminder tones. Copy one into a text message on the phone.

## 7. Make it yours (6 min)

- Ask in plain English for one extension and build it live. Suggested:
  "Show me every quote this year, won and lost, and my win rate."
- Explain the pattern: describe the outcome, let Claude ask questions,
  check the result.
- Where things live, how to back up the folder, how to update Claude
  Code, what to do when something breaks (paste the error, ask).

## Notes for recording

- Record on Windows for the main track. Painters are mostly on Windows
  laptops. Do a five-minute Mac install variant.
- Show every permission prompt at least once. Buyers need to see that
  Claude asks.
- Keep the example business generic. Use the pack's placeholder name.
- Re-record lesson 2 and any install footage when the setup kit or
  Claude Code changes its first-run screens.
