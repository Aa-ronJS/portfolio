# Fulfilling an "already built" order

One command per order. No call, no meeting.

1. The buyer's build form arrives from your form provider (Formspree,
   Tally, Kit). Export that submission as JSON, or copy the fields into
   a file shaped like `intake.example.json`. Field names match the
   form on the landing page (`chasem-landing/public/build-form.html`).
2. If they attached a logo, save it next to the JSON.
3. Build:

   ```bash
   python3 prebuild/build.py intake.json --logo logo.png
   ```

   Output: `dist/chasem-<their-trading-name>.zip`, the normal
   customer zip with `business/details.md`, `price-list.md` and
   `quote-wording.md` filled in, the logo in `business/`, and a
   `BUILT FOR YOU.txt` telling them which set-up steps to skip.

4. Open the three business files once and read them as the buyer would.
   The script is faithful to the form; it cannot fix a typo in a BSB.
5. Email the zip with the setup kit link. Delete the intake JSON and
   logo; the privacy page promises that.

A blank rate on the form means "I never do this work" and the line is
left out of their price list. Extra price lines they typed appear under
"Other things we charge for". Everything they did not answer falls back
to the pack defaults, so a half-filled form still builds.

You can also run this through Claude Code: "Build the pack for the
intake in Downloads/dave.json" works, because the script is plain
Python with no dependencies beyond `zip`.
