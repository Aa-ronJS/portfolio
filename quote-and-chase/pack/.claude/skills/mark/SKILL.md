---
name: mark
description: Update a job's status in jobs.csv - accepted, declined, paid, or add a note.
argument-hint: Q-1001 accepted|declined|paid [note]
---

Update one row in `jobs.csv`. `$ARGUMENTS` is a quote number, a status
word, and optionally a note.

- `accepted` - set status to `accepted`. Suggest running `/invoice
  <quote> deposit` if the business takes deposits.
- `declined` - set status to `declined`. Keep the row; it is useful for
  seeing win rates later.
- `paid`     - set status to `paid` and `paid_date` to today. If a
  final invoice has not been issued yet, ask whether this was the
  deposit or the whole amount before changing anything.
- Anything else - treat the rest as a note and append it to the
  `notes` column.

Show the row before and after the change, change only that row, and
confirm in one line. If the quote number is not found, list the five
most recent quotes and ask which one they meant.
