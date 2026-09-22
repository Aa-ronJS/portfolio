---
name: chase
description: List every overdue invoice and every quote waiting on an answer, and draft the reminder texts and emails in the owner's voice. Drafts only, nothing is sent.
---

Build today's chase list. Nothing in this skill sends anything.

1. Read `business/details.md` (for the owner's voice and sign-off) and
   the "Reminder tone" section of `business/quote-wording.md`.

2. Read `jobs.csv`. Today's date is the system date.

3. **Overdue invoices**: rows with status `invoiced` whose `due_date`
   is before today. For each, work out days overdue and which reminder
   applies (first, second or final) from the tone rules. If
   `last_chased` is within the last 5 days, list it but mark "chased
   recently, skip".

4. **Quotes waiting**: rows with status `quoted` sent 7 or more days
   ago. These get a friendly follow-up nudge, not a payment reminder.

5. Write `chase/<today> chase list.md` containing:
   - A summary table: who, what, amount, days overdue or days waiting,
     which reminder.
   - For each person: a text message (under 300 characters) and an
     email (subject plus a short body), in the owner's voice, stating
     the amount, the invoice or quote number and the due date, with the
     payment details on payment reminders. Vary the wording so they do
     not all read the same.
   - The total amount outstanding, on its own line.

6. Ask the owner: "Shall I record these as chased today?" Only if they
   say yes, set `last_chased` to today for those rows in `jobs.csv`.

7. Report in three lines: how many overdue and the total owed, how many
   quotes waiting, and where the drafts are. Remind them to copy the
   drafts into their own phone or email.

If nothing is overdue and no quotes are waiting, say so in one line and
do not create a file.
