# Outgrown

Landing page for the weekly "step-change" list: small private companies whose new
federal contract is 4x+ their biggest in the previous 12 months.

- `public/index.html` is the whole site (no build step).
- Contact details: fill `CONTACT = { email, phone, abn }` near the bottom of the
  file. Blank fields stay hidden.
- Each week: update the `ROWS` array, the "Week of …" label and the hero numbers.
  Only the first three rows carry company names; the rest are redacted on purpose.
- Deploy: `cd outgrown && npx vercel deploy --prod` (new Vercel project).
