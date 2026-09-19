---
name: quote
description: Turn the photos and notes for a job in quotes/incoming into a numbered PDF quote, log it in jobs.csv and report the total and assumptions to the owner.
argument-hint: [job folder name]
---

Produce a quote for one job. The owner may pass the job folder name as
`$ARGUMENTS`. If it is empty, list the folders in `quotes/incoming/`
that do not yet have a quote number in `jobs.csv` and ask which one.

Follow these steps in order and tell the owner what you are doing at
each one, briefly.

1. **Read the business files** `business/details.md`,
   `business/price-list.md` and `business/quote-wording.md`.

2. **Read the job folder.** Open `notes.txt` (or any text file) and
   look at every photo in the folder. For each photo, note what room or
   surface it shows, its rough size and its condition (good, fair,
   poor). Measurements in the notes always beat your photo estimate.

3. **Work out the quantities** using the measuring rules in the price
   list. Show your working in a short table: room, surface, quantity,
   unit, how you got it.

4. **Price the lines** from the price list only. Apply the job rules
   (minimum charge, prep for fair or poor condition, premium paint,
   travel, GST). Anything not on the price list becomes a line marked
   "TO CONFIRM" with your best estimate.

5. **Pick the quote number.** Read `jobs.csv`. The next number is one
   higher than the highest existing `Q-` number, starting at Q-1001.

6. **Write the quote.** Create the folder
   `quotes/sent/Q-<number> - <client surname> - <street>/` and inside it:
   - `quote.html` built from `templates/quote.html`. Replace every
     `{{placeholder}}`. If `business/logo.png` (or `.jpg`) exists keep the
     logo line and point it at the right file name; otherwise delete it. One table row per line item. Include the
     inclusions, exclusions, terms and how-to-accept blocks from
     `business/quote-wording.md` word for word.
   - `working.md` with your quantity table, every assumption you made,
     and up to three questions the owner should ask the client before
     sending.

7. **Make the PDF.** Run the PDF helper:
   - Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/make-pdf.ps1 "<folder>/quote.html"`
   - Mac: `bash tools/make-pdf.sh "<folder>/quote.html"`
   If it reports that no browser was found, tell the owner to open
   `quote.html` and use Print, then Save as PDF. Do not try to install
   anything.

8. **Log it.** Append one row to `jobs.csv` with status `quoted`,
   today's date, the client details from the notes, a one-line job
   summary and the total including GST. Do not change other rows.

9. **Report back** in this shape and nothing longer:
   - Quote number, client, total inc GST
   - The three assumptions most likely to change the price
   - Any TO CONFIRM lines
   - Where the PDF is
   Then say: "Check the assumptions, then send the PDF from your own
   email or phone. Tell me `/mark Q-<number> accepted` when they say
   yes."

Never send the quote yourself. Never invent rates. If the photos are
not enough to quote at all, say so and list what you need.
