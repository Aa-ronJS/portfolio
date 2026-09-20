# Lesson scripts

Seven lessons, spoken word for word or close to it. Screen recording
throughout; no talking head needed except the first thirty seconds of
lesson one if you want a face on it. Total about fifty minutes.
Anything in [brackets] is a direction, not a line.

Rules for recording: say what you are doing before you click. Show
every permission prompt at least once. Never say "AI does it"; say
"Claude reads" or "it works out". When Claude Code's screens change,
re-record only the lesson that shows them.

---

## Lesson 1: What you're about to own (4 min)

[Open on the finished folder in Explorer or Finder.]

This is the whole thing. One folder, on your laptop. In about an hour
it will turn photos of a room into a priced quote with your name on it,
write the invoice when the job is done, and tell you on a Monday who
owes you money.

You'll build it yourself from the templates I've given you. Not
because I'm lazy, but because a tool you built is a tool you can
change. Nobody charges you per job for this. Nobody can switch it off.

[Open the sample quote PDF.]

Here's a quote it made from a sample job: three rooms in Ringwood.
Every number on it came from a price list you'll edit in lesson three.
Every assumption it made is written down on the second page. You check
those, then you send it. It never sends anything itself.

[Open the terminal window with Claude Code running, type nothing.]

The thing doing the work is Claude Code, a program from Anthropic that
runs on your computer and talks in plain English. You need a Claude
subscription for it, which you pay to them, not to me. This window is
the only slightly unusual thing you'll see. You type a sentence, it
does the work, it asks before it does anything risky.

What this is not: it doesn't book jobs, take payments, or give clients
a login. Keep whatever you use for those. This does the typing.

Next lesson: install it. Ten minutes, double-clicks only.

---

## Lesson 2: Install (7 min)

[Download folder with the two zips visible.]

Two downloads from your receipt. First one sets up Claude Code, second
one puts in the quoting templates. Do them in that order.

[Right-click the setup zip, Extract All.]

Unzip it first. Don't run anything from inside the zip.

[Double-click "1 - Setup Claude Code".]

Windows will show a blue box saying it protected your PC. That happens
for any small program that isn't from the Microsoft Store. More info,
Run anyway.

[Let the setup run. Pause on the "Press Enter to begin" screen.]

Read this. It tells you exactly what it's about to do: download Claude
Code from Anthropic's own address, make a folder in your Documents, put
an icon on your Desktop. It never asks for administrator rights. If it
ever does, something's wrong, stop.

[Press Enter. Let it run at 2x. Stop on the Git question.]

It'll ask about Git for Windows. Say yes. It's a free tool Claude uses
to do things properly; you'll never touch it.

[Setup finishes. Say yes to "open Claude Code now".]

First time, your browser opens to log in to your Claude account. Log
in, come back to this window.

[Show the Claude Code first-run screens: theme, trust the folder.]

Pick either theme. When it asks if you trust this folder, yes, you made
it a minute ago.

[Now the pack: unzip, double-click the installer.]

Second zip. Same again: extract, double-click the installer. It copies
the templates into your My Business folder and backs up the one file
it replaces. Done.

[Open the My Business folder. Point at each thing.]

Business: your prices and details, three files. Quotes: incoming is
where photos go, sent is where quotes come out. Invoices, chase: what
they sound like. jobs.csv: every job in one spreadsheet. START HERE:
the written version of this course. HELP: what to do when something
goes wrong.

[Open .claude/settings.json briefly.]

One more, and this matters. This file is a set of locks. It stops
Claude deleting things, running installers, or reading your passwords,
and makes it ask before running any command. You don't edit it. I'm
showing you so you know it's there.

Next: your prices.

---

## Lesson 3: Your prices (8 min)

[Open business/price-list.md in Notepad.]

This file is the whole difference between a sample quote and your
quote. Claude will only ever price from what's in here. If a job needs
something that isn't in here, it writes TO CONFIRM on the line instead
of guessing.

[Scroll the interior table.]

Rate per square metre for walls, ceilings. Per lineal metre for
skirting. Per door, per window. Prep by the hour. Change every number
to yours. If you never do something, delete the line. If you charge
for something that isn't here, add a line the same shape.

[Change three numbers on camera. Save.]

Don't agonise. You can change these any time and re-run a quote.

[Scroll to job rules.]

Minimum job. Travel. Premium paint surcharge. GST on or off.

[Scroll to measuring rules.]

Now the part that decides how good the photo quotes are. When your
notes don't say, Claude assumes 2.4 metre ceilings, takes off standard
door and window areas, and works out prep from how the walls look in
the photo. Good, fair, poor. Read these rules once. If your houses are
mostly 2.7 metre ceilings, change it here and every quote follows.

The honest bit: photos alone give estimates. Photos plus a room size in
your notes give quotes. Get in the habit of saying the size out loud
when you take the photos.

[Open business/details.md. Fill in name, ABN, phone, bank details.]

Your details. They go on every quote and invoice. Bank details go on
invoices exactly as they do today.

[Scroll to the voice section.]

This one's fun. Describe how you talk to customers. Two sentences. When
it drafts your payment reminders, they'll sound like you, not like a
bank. Sign-off too.

[Open quote-wording.md, skim.]

Inclusions, exclusions, terms, guarantee. Standard wording. Change
anything you wouldn't say. The exclusions list is where you put the
things clients try it on with.

Next: your first quote.

---

## Lesson 4: The first quote (10 min)

[Open quotes/incoming/Example - 12 Wattle St Ringwood/notes.txt.]

There's a sample job in here so your first quote works before you've
taken a single photo. Three rooms, sizes, condition, what the client
wants. This is what your notes will look like. Photos go in the same
folder; this one has none, so it works from the notes.

[Double-click the Desktop icon. Type: /quote Example - 12 Wattle St Ringwood]

Slash, quote, folder name, Enter. Now watch, and I'll narrate.

[Let it run. Pause at each stage.]

It reads your three business files. It reads the notes. It works out
each room: perimeter times height, minus doors and windows, using the
rules from lesson three. It prices every line from your list. Here's
one it can't price: hallway doors, one side only. My price list only
has both sides. So it estimates and marks it TO CONFIRM. It doesn't
hide it.

[Permission prompt for the PDF step.]

It's asking to run the PDF helper. This is what asking looks like. Read
it, Enter.

[It finishes. Read the summary out loud.]

Quote number, client, total. The three assumptions most likely to move
the price. The TO CONFIRM line. Where the PDF is. And: check it, then
send it yourself.

[Open quotes/sent, open the PDF.]

Your name, their details, the job, every line, GST separate, what the
quote is based on, inclusions, exclusions, how to accept, deposit
details.

[Open working.md.]

This is the file you read before any real quote goes out. The
measuring table: how it got each number. Every assumption. Questions
to ask the client. Two minutes reading this saves you a bad quote.

[Change the hallway height in notes.txt to 2.7 m. Save. Re-run /quote.]

Change one thing, run it again. The total moves. That's the whole
loop: notes and prices in, quote out, adjust, run again.

[Open jobs.csv in Excel.]

And it's in the ledger. Quote number, client, total, status "quoted".
Every job you ever quote lives in this one spreadsheet.

Next: a real job with your own photos.

---

## Lesson 5: Measure it properly, then a real job (10 min)

[Hold up your phone.]

This is the difference between an estimate and a quote, and there's
nothing to print or buy. One photo of the whole wall, corner to
corner. The camera's own geometry works out the wall's shape from its
four corners. Then one known size sets the scale, and the easiest one
is the ceiling height, which you measure once per room with your tape.

[Phone footage: step back, take one photo of the whole wall, lights on.]

Step back until every corner of the wall is in the shot. Lights on,
main camera, not the wide-angle. One photo. Same for each wall you're
quoting.

[Laptop: open the measure folder, double-click measure.html. Choose
the photo.]

Choose the photo. Tap the four corners of the wall: top-left,
top-right, bottom-right, bottom-left. Use the magnifier, get the
corner exactly.

[Tap them. The scale box appears.]

Now it asks for one size. Type the ceiling height, two point four. Or
tap the top and bottom of a door, because internal doors are two point
oh four. Or the two edges of a power point, a hundred and sixteen
millimetres. Any one of those.

[The measurement appears.]

There's the wall. Four point eight by two point four. Now the door:
two corners. The window: two corners. It takes the openings off the
paint area for you. And notice: because you gave it the ceiling
height, it checks the door against the standard and tells you if
something's off.

[Save the wall. Type the room name. Do a second wall quickly.]

Save the wall, next photo, same again. Two adjacent walls and it works
out the ceiling. When you're done, save the measurements file and put
it in the job folder next to the photos.

[Show the confidence line.]

It tells you what it thinks its accuracy is. With all four corners in
the shot and the ceiling height, that's about one to two percent,
which is better than most people with a tape on a ladder. If a corner
is hidden, press "can't see all corners" and use a door as the
reference instead; that's a few percent.

[Got an iPhone Pro? Fifteen seconds on LiDAR.]

If you've got an iPhone Pro, there's a faster way: any room-scanning
app that exports a RoomPlan file. A one-minute walk around the room
gives every wall, door and window to the centimetre. Drop the file in
the job folder and the quote converts it.

[Now run /quote on the real job.]

Same command. Watch the source column: "measured, photo, two percent"
on the walls you measured, "estimated from photo" on anything you
didn't. The quote says which is which, and so does the working file.
That honesty is your protection when a client queries a number.

[Pause on a TO CONFIRM line, e.g. a garage door.]

And here's a rate my list doesn't have. TO CONFIRM. Open
price-list.md, add the line, save, run /quote again. That's how the
price list grows.

[Open the PDF and working.md. Read the assumptions.]

Read these before you send. Then attach the PDF to a text or an email
from your own phone. It has never sent anything and it never will.

Next: getting paid.

---

## Lesson 6: Invoice and chase (7 min)

[Terminal. Type: /mark Q-1001 accepted]

Client said yes. Tell the ledger. Slash mark, quote number, accepted.

[Type: /invoice Q-1001 deposit]

Deposit invoice. It reads the quote, takes your deposit percentage from
your details file, works out the due date from your terms, writes the
PDF with your bank details on it, logs it. Send it yourself, same as
the quote. When the job's done: /invoice Q-1001 final. Balance, less
deposit, plus anything you agreed in writing along the way; it asks
you about variations.

[Type: /mark Q-1001 paid]

Money arrives, mark it paid. Thirty seconds of bookkeeping per job.

[Now the good part. Open jobs.csv and change a due date to last week,
to demonstrate. Type: /chase]

Every Monday. It reads the ledger, finds every invoice past due and
every quote that's been sitting more than a week, and writes you a
chase list.

[Open the chase file.]

Summary table: who, how much, how late. Then for each one, a text and
an email, in your voice from lesson three. First reminder is friendly,
assumes they forgot. Second is clear. Third names the next step. You
copy, you paste, you send. It asks if you want it to record that you
chased them today, so it doesn't nag the same person twice in a week.

[Show the total outstanding line.]

That number at the bottom is money you're owed. Most people don't know
it. Now you'll know it every Monday.

Next: the lesson that's the actual point.

---

## Lesson 7: Ask for the next thing (6 min)

[Terminal, empty prompt.]

Everything you've used so far, I wrote. This lesson is how you get the
next thing without me.

[Type, in plain English: "Show me every quote this year, won and lost,
and my win rate. Put it in a file I can open in Excel."]

No slash. Just a sentence, like you'd say to an office manager. Watch.

[Let it explain what it'll do, ask a question if it does, build it.]

It tells you what it's about to do. It might ask a question; answer
it. Then it builds it, in this folder, and shows you.

[Open the result.]

The pattern is: describe the outcome, let it ask, check the result.
Three things people build in their first month: a page of before and
after photos to send clients; the week's jobs in driving order; the
chase list emailed to themselves every Monday morning automatically.
Ask for any of them exactly like that.

[Open HELP.txt.]

When something breaks: copy the message on the screen, paste it in,
ask what it means. That fixes most things. The rest are in this file.
And the address on your receipt reaches a person.

[Show the setup folder's Update file.]

Claude Code updates itself. Your files here never change unless you
change them. If I update the templates, you re-run the installer; your
prices and jobs aren't touched.

[Close on the folder.]

Back this folder up like you'd back up your invoices, because that's
what it is now. It's yours.

---

## The two-minute demo (ad and landing page)

Shot list only; no script.

1. Phone, on site: four photos of a lounge. Voice: "Lounge, five by
   four, walls and ceiling, one patch, skirtings, one door."
2. Laptop: drag photos and notes into a folder named for the address.
3. Two seconds: the phone taking the photo of a wall, then the
   measuring page with four taps and the metres appearing.
4. Desktop icon. Type /quote and the folder name. Run at 2x, about 40
   seconds: the measuring table with "measured" in the source column,
   the price lines, the TO CONFIRM line.
5. Open the PDF. Scroll. Open working.md, show the assumptions.
6. Two seconds: price-list.md, cursor changes a rate, save. Caption:
   "your rates, your file".
7. End card: "Own it. $249 once." URL.
