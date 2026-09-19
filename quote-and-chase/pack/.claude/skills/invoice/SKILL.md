---
name: invoice
description: Turn an accepted quote into a numbered PDF invoice (deposit, final or full), log it in jobs.csv with the due date.
argument-hint: Q-1001 [deposit|final|full]
---

Create an invoice for the quote number in `$ARGUMENTS`. The second word
says which invoice:
- `deposit` - the deposit percentage from `business/details.md`
- `final`   - the balance after the deposit, plus any agreed variations
- `full`    - the whole amount in one invoice (default if not given)

Steps:

1. Read `business/details.md` and find the job's row in `jobs.csv`. If
   the status is not `accepted` (or `invoiced` for a final invoice),
   stop and ask the owner to confirm the job really was accepted.

2. Open the quote folder in `quotes/sent/` and read `quote.html` for
   the line items and totals. Ask the owner whether there were any
   variations (extra work agreed in writing) and their amounts.

3. Pick the invoice number: one higher than the highest existing
   `INV-` number in `jobs.csv`, starting at INV-2001.

4. Work out the amounts. Show subtotal, GST and total. For a `final`
   invoice show the quote total, less deposit paid, plus variations.
   Due date = invoice date plus the payment terms in
   `business/details.md`.

5. Write `invoices/INV-<number> - <client surname>/invoice.html` from
   `templates/invoice.html`, replacing every `{{placeholder}}`, with
   the payment details from `business/details.md` on it.

6. Make the PDF with `tools/make-pdf.ps1` (Windows) or
   `tools/make-pdf.sh` (Mac), same as for quotes.

7. Update the job's row in `jobs.csv`: status `invoiced`, invoice
   number, invoice date, invoice total, due date. Leave every other
   row untouched.

8. Report: invoice number, amount, due date, where the PDF is. Remind
   the owner to send it themselves and to run `/mark <quote> paid`
   when the money arrives.

Never send the invoice. Check that the numbers add up before you
finish.
