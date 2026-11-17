# Gnome Abroad

You pay to have a garden gnome "run away" from someone you know. For the
next four weeks, that person gets real postcards in the mail from the
gnome. Each one shows a crude drawing of the gnome somewhere new, and
the story gets more unhinged each week. The buyer gives us the
recipient's name and one detail about them or an inside joke, and the
gnome brings it up.

The idea is Potato Parcel, but nobody packs anything. Potato Parcel sold
$10–15 novelty mail and reported $10k–25k a month.

## Fully automated flow

1. A Stripe Checkout page collects the recipient's name, their address,
   one personal detail and the buyer's email.
2. A webhook calls Claude to write the four-card story arc and a crude
   SVG drawing for each card. That's the same method as
   `sample-season.html`, drawn by the model, with no image API.
3. Claude checks the buyer's personal detail, and refuses anything
   hostile, sexual, or about a real third party.
4. Each card is rendered to a print PDF with Playwright and sent to a
   print-and-mail API (Stannp, about US$0.80 a card including US postage;
   get an Australian quote before launch). The cards go out a week apart
   using the API's scheduled send date, so we don't need a scheduler of
   our own.
5. Every card has a QR code that says "bring Gerald home". The recipient
   can scan it to stop the series and get a final "I'm home" card. That
   makes it impossible to use the service to harass someone.

## Money

| | per season |
|---|---|
| Price | A$29 |
| 4 cards printed and posted (estimate, unquoted) | ≈A$12 |
| Stripe fees + Claude API | ≈A$2 |
| **Margin** | **≈A$15** |

$50 a week takes about **4 seasons a week**. Christmas is the obvious
launch: the buyer pays now and the gnome "leaves" on Boxing Day.

## What Aaron does
Create the Stripe and Stannp accounts and click deploy. Nothing after
that.
