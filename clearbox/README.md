# Clear Box

Marketing site and lead magnets for an AI-era security testing service.
Three standalone, static HTML pages. No build step, no dependencies.
Fonts load from Google Fonts, so a page needs an internet connection to
look right; everything else runs offline.

## The pages

| File | What it is |
|------|------------|
| `index.html` | The core offer page: the threat explained for a non-technical owner, what gets tested, what they get, how it works. |
| `self-check.html` | A 10-question interactive self-assessment. Scores exposure in the browser and ends on a booking call. Nothing the visitor enters leaves their device. |
| `sample-report.html` | A redacted, clearly-marked fictional sample of a findings report, to show the deliverable. Not a real client. |

## Run it on your PC

Any of these works. Pick one.

**Just open it.** Double-click `index.html` (or either other file). It opens
in your browser and works as-is.

**Serve it locally** (closer to how it behaves hosted, and avoids any
file-path quirks):

```bash
# Python (already on most machines)
cd clearbox
python -m http.server 8000
# then open http://localhost:8000/
```

```bash
# or Node, if you have it
cd clearbox
npx serve
```

## Before you share these publicly

- **Contact details are placeholders.** Each page shows
  `your-email@example.com` with a visible note. Replace it with your real
  contact in all three files.
- **The self-check and sample report do not capture emails.** They are
  value pieces that end on a booking call. To gate them HubSpot-style and
  collect emails, host them on your own site behind a form, or embed a
  form in them.
- **The sample report is fictional.** The client, the evidence, and the
  findings are illustrative. Replace them with real redacted captures once
  you have run an engagement; the structure is the reusable part.
