# Emails, ready to paste

Every capture on the landing page posts to one form endpoint with a
`list` field. Set up one autoresponder per list value, plus the buyer
sequence in your checkout provider. Replace [LINK] with the live page
and [SUPPORT] with your support address. Plain text beats designed
email with this audience.

---

## list = sample-quote  (the "not ready" form)

**Subject:** The sample quote, and the price list behind it

Hi,

Here's the quote you asked for, made from the sample job in the pack:
[attach sample-quote.pdf]

And here's the price list it was priced from, the file you'd change to
your own rates: [attach price-list.md, or paste the interior table]

Everything on that quote came out of a folder on a laptop. Photos and
notes in, PDF out. If you want your own: [LINK]

Cheers,
[Name]

---

## list = send-to-laptop  (after the phone demo)

**Subject:** Your link for the laptop

Hi,

You just quoted a wall from your phone. Building your own version
happens on a laptop, so here's the link to open there: [LINK]

Setup is a double-click, the first quote is a sample job that's already
in the folder, and it's $249 once. No subscription.

If you'd rather we ran it for you on your phone, there's a founding
list on the same page.

Cheers,
[Name]

---

## list = hosted-founding

**Subject:** You're on the founding list

Hi,

You're on the list for the hosted version of Chasem: same tool,
run by us, nothing to install, on your phone. Founding members keep
the founding price, and can leave with their tool at any time.

I'll email you the day it opens. Until then, one question that decides
what gets built first: how many quotes do you send in a normal week?
Just reply with a number.

Cheers,
[Name]

---

## Buyer sequence (checkout provider)

### Day 0, immediately after purchase

**Subject:** Your quoting tool: start here (10 minutes tonight)

Hi,

Thanks for buying Chasem. Two downloads, then one command.

1. Set up Claude Code: [download link for your computer]. Unzip,
   double-click the file starting with "1". It explains itself.
2. Install Chasem: [download link]. Unzip, double-click the
   installer, then open "START HERE - Chasem.txt" in the
   My Business folder it creates.
3. Type: /quote Example - 12 Wattle St Ringwood

That's a sample job that's already in there. Your first real quote is
the same steps with your own photos.

If anything at all stops you, reply to this email with what the screen
says. A person reads these.

Cheers,
[Name]

### Day 2

**Subject:** Did the first quote come out?

Hi,

Quick one. Has the sample quote come out of your laptop yet?

If yes: put your real prices into business/price-list.md tonight. That
file is the whole difference between a sample and your quote.

If no: reply with what happened, even if it's "I haven't opened it".
Most snags are five minutes, and there's a HELP.txt in the folder with
the common ones.

Cheers,
[Name]

### Day 7

**Subject:** Your first real job

Hi,

By now you've either quoted a real job or you've hit something. Either
way I want to know, because it decides what I fix next.

If you've quoted a job: what did you have to change on the quote before
it went out? That's the most useful sentence you can send me.

If you're stuck: the 14-day guarantee is real. Reply, and we either fix
it or refund you. Or, if you've decided you'd rather we ran it for you,
your $249 becomes credit on the hosted version.

Cheers,
[Name]

### Day 12

**Subject:** Two days left on the guarantee

Hi,

Your 14-day window ends in two days. If the tool has produced a quote
from your own photos, ignore this. If it hasn't, reply now and tell me
where it stopped. Refund, fix, or credit to the hosted version, your
call.

Cheers,
[Name]

---

## Support reply templates

**"It says command not found" / "claude isn't recognised"**
Close the window, run "1 - Setup Claude Code" again, then use the
Desktop icon rather than typing anything. The installer adds Claude to
the path; a window opened before it ran won't see it.

**"It's asking me to log in again"**
That's Anthropic's login, not ours. Type /login and press Enter, and
your browser opens. If you don't have a Claude subscription yet, that's
the page to get one; the pack needs it.

**"The quote total looks wrong"**
Open working.md next to the quote. Every number traces back to a line
in business/price-list.md or a measurement from your notes. Change the
rate or the note and run /quote again. If a line says TO CONFIRM, the
price list has no rate for it; add one.

**"No PDF"**
The PDF step uses the Edge or Chrome already on the computer. If the
message says none was found, open quote.html in your browser, press
Ctrl+P (Cmd+P on Mac) and choose Save as PDF.

**"I want a refund"**
Done. Refunded to the card you paid with; allow a few days to appear.
If you tell me where it stopped, the next person won't hit it.
