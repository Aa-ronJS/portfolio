# R1 — The Painter's Advocate

## The ten decisions
- **D1.** Wazza: solo domestic repainter, 15-25 years on the tools, sometimes one other bloke, 2-6 quotes a week on a notepad, four figures or more sitting unpaid. Not the growing operator — he is the objection, not the market.
- **D2.** Facebook feed, vertical, shot on a phone, one take: a hand sticking an A4 sheet on a wall, then the three-page PDF. Words over it: "Fourteen grand out and you hate ringing about it." The sheet stops the scroll because he has never seen that; the money line is why he taps.
- **D3.** Keep the page, but land the ad on the sample quote and the price, not the top — he will not read "You didn't start a painting business to type quotes at 9pm." Two things have to go tonight: "The set-up call switches that on with you" and "Optional set-up call" in the meta description (there is no call, ever), and the hard-coded `$49` / `100 messages` in the HTML that JavaScript rewrites to 99/150 — one slow load and he has been quoted two prices.
- **D4.** After the first PDF exists, at the moment he taps Send. Today it is the first thing on the first screen, before he has seen it do anything.
- **D5.** Not five messages. "A message" is a unit he cannot count, and five runs dry in the middle of chasing one job. Free = **your first three jobs, quoted and chased to the end** (twelve messages), counted in jobs on screen.
- **D6.** A real quote PDF sent to a real client from a real driveway, inside 48 hours of sign-up. Not "set-up complete", not a practice room. Second activation, around day 20: one invoice marked paid.
- **D7.** Day three of the first quote gone quiet, on the Follow-ups tab, with the client's name and the written nudge on screen: *"Tuesday 9am this goes to Sharon: [the message]. Tap Send yourself — free, always. Or $99 a month and it goes without you. 150 a month is about thirty jobs. Two taps to cancel."*
- **D8.** He pays inside the app on the phone in his hand and types a card number, nothing else. Stripe must stop collecting `trading_name`, `abn`, `licence` — he has already typed those. Today it is website → Payment Link → welcome page → "Set up my app" → "Set up your app?" → **Load**: five screens and a possible change of device to buy something he already had open.
- **D9.** One plain count on Home, not behind a card: "Since you started: 7 quotes out, 3 accepted, $4,180 in, 14 nudges sent for you." Plus a weekly one-tap "Has this one paid?" list, because the page is right that chasing a man who has paid "is the one way this makes you look silly", and that is the churn.
- **D10.** Cost per painter who sends a real quote to a real client inside 48 hours. Under $30. Everything downstream is guessed; this one is visible in week one.

## Where each of the three falls out
**Wazza — step 4.** He typed his email on the door that says "Start quoting" and got a screen headed **"Set up your app?"** with a box wanting a code that starts `j:…` or `z:…` and a button that says **Load**. He says: *"Load what? I haven't got anything yet."* Phone down, never opened again.

**Dan — step 5, "Let it chase for you".** He taps it, lands in Set-up, and Automatic texting and emailing says **"Optional. Needs a computer and about an hour."** He is standing in a hallway holding a phone. He says: *"A computer and an hour. I've already got one of these I don't use."*

**Kelly — step 8.** She paid on the laptop doing the books, and the welcome page says **"Open this on the phone you quote from and tap Load."** His phone is in his pocket at a job in Salisbury. She says: *"So I've paid for it and I can't turn it on till he gets home."*

## The three sentences that would keep them
1. Instead of the email door: **"Do a room first. We won't ask for anything until you go to send it."**
2. Instead of "Needs a computer and about an hour": **"Nothing to set up. The texts go out under your name from this phone tonight. $99 a month, two taps to stop, and if you stop it still writes every message free."**
3. Instead of the welcome page: **"Paid. We've texted the link to his mobile — he taps it once at smoko and it's on. Nothing else to do."**

And the one that must be said in week one, not week three: **"The text comes from our number, signed with your name and your mobile, and anyone who replies to it gets sent straight back to you."**

## Where I will fight
**1. Targeting will pick Dan.** He looks like the better customer: younger, growing, already pays for software. He is the worse one — he has a trade app he half uses, so he is comparing from day one, and he is the 6% walking out every month. Wazza has never paid for software in his life and will stay for years if it works once. Instead: the ad, the page and the first screen are built for the man with the notepad, and Dan is answered in the objections block where he already is.

**2. Flow will want the email up front**, because the Stripe customer *is* the database and there is no other record. Then you own a list of email addresses belonging to people who never made a quote. Instead: he measures, prices and sees his own PDF with nothing typed, and the customer record is minted at the first Send, when he has a reason to give it. If that is genuinely hard to build, say so — and move the door to after the PDF, not before the app.

**3. Money will want automatic top-ups on by default**, and will call five messages generous. Top-ups on by default is exactly the "something I'll forget to cancel" that loses Dan, and it is what makes Wazza ring his bank instead of me. Instead: opt-in, with "at most three packs, $35 each — $105 is the worst month you can have" on the same screen as the switch. And five messages is not a trial, it is a tease that dies mid-job: three whole jobs, or the free tier is lying about what the product is.
