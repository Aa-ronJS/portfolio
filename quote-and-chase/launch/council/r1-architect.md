# R1 — The Flow Architect

Bias declared: activation beats persuasion. Nothing before the first sent quote earns its place.

## 1. The ten decisions

**D1.** The one-ute domestic repaint painter: owner plus nought-to-two others, four to fifteen years out on his own, quoting three to eight jobs a week off a notepad or a phone photo, invoicing from Notes or a Xero he resents. He is not the six-van commercial outfit and not the weekend hobbyist.

**D2.** Meta feed and Reels, Australia, painters and trade-supplier interests plus a lookalike of app openers. Nine seconds, phone-held, vertical: A4 sheet taped to a lounge wall, one photo, the three-page PDF slides out with his name on it. Caption: **"Quoted it before I got back in the ute."** He stops because he sees the artefact he hates making, finished, not a dashboard.

**D3.** On a phone the ad goes straight into the app; the landing page is for desktop clicks only and shrinks to two things: the real sample PDF and a QR into the app. A 660-line brochure with zero customers is persuasion we cannot back and a screen between him and the thing that sells itself.

**D4.** The email is asked at the moment he taps Send on his first quote, never before. That is the first instant it buys him something (the message leaves in his name and the account is his), and today's `viewJoin` (app.js:66) takes it while offering nothing.

**D5.** Fifteen messages, expiring thirty days after first open. Five dies inside one job — a quote plus three nudges is four — so he hits the wall before a single follow-up has proved anything; fifteen is three full quote-and-chase cycles, and the thirty days makes the free thing ask for money instead of drifting.

**D6.** Activation is **one real quote PDF sent to a real client from the app**, and it must happen inside ten minutes of first open, on site, on the first attempt. Second-order check: that quote has follow-ups scheduled against it.

**D7.** The paywall sits at the second nudge on a real job, not at zero. Words, in the toast where `outOfMessagesToast` (app.js:1121) fires: **"Thomson's quote is due its second nudge on Tuesday. You have 2 messages left. $99 a month sends this one and the next 150, or leave it and the app writes it for you to send yourself. Turn the sending on · Not now."**

**D8.** Pay is one Stripe Payment Link opened from inside the app with his email prefilled and nothing else asked — no trading name, no ABN, no licence (`config.js` asks for all three; the app already has them). Success returns to the app hash carrying the token: no welcome.html stop, no "Set up my app", no Load. He types a card and lands back on the job he was chasing.

**D9.** Three things, none human: the scoreboard (`S.ui.scoreboard_start`, `#/scoreboard`) mails itself nothing but shows on home — "Since 3 March: 14 quotes out, 6 accepted, $31,400 in, $4,200 chased in after a nudge"; the balance line on the Follow-ups tab so the month is never a surprise; and the back-up nag already at `#backupline`, because a painter who has saved a copy has committed.

**D10.** Cost per activated painter — first quote sent — must sit at or under $45, checked weekly. It is gated once a month by activated-to-paid at or above 12%; below that, more ad spend just buys people who never quote.

## 2. The flow, screen by screen

Honest count against the code as it stands today: landing CTA (1), email field (2), Start quoting (3), the **"Set up your app?" / Load** confirm at app.js:1702 (4), Quick quote (5), preset chip (6), "Done, build the quote" (7), client name / mobile / email fields on `viewQuote` (8,9,10), Send (11), share sheet pick (12), Send in Messages (13). **13 taps, 4 typed fields, 5–7 minutes** — and none of it has priced a room he actually cares about.

What I ship:

1. **Screen 1 — Price a room.** Opens cold from the ad, no door, no home list. Heading: "Price a room. Nothing to sign up for." A row of preset chips (Lounge, Bedroom, Hall, Kitchen, Bathroom) above three prefilled boxes and one button, **"Take one photo instead"**. Asked: nothing. *Tap 2: a chip.*
2. **Screen 2 — The price.** "Lounge, 4.2 × 3.6: **$1,480** at middle-of-the-road Australian rates." One field: "Charge this room at $\_\_\_ instead" (the `price_override` bind already exists). One button, "Make it a quote". *Tap 3.*
3. **Screen 3 — Who is it for.** Four fields and nothing else: Their name, Their mobile, **Your name (it goes on the quote)**, **Your email (so the app is yours and this can send in your name)**. Copy under the email: "We keep your email. Your jobs, prices and clients stay on this phone." *Tap 4, four fields typed.*
4. **Screen 4 — Send.** "Send quote QT-1001 to Sarah — $1,480." Button: **Send it**. PDF builds, share sheet, Messages, Send. *Taps 5, 6, 7.*
5. **Screen 5 — After.** "That is your first quote out. It gets nudged on Tuesday, then the 28th, unless Sarah says yes first. **Make these prices yours (5 min)** · Not now." First time the set-up list is allowed on screen.

**7 taps, 4 typed fields, under 3 minutes typed; 10 taps and about 5 minutes if he measures from the photo.** The email arrives at tap 4, after he has already seen his price.

## 3. What I would delete from what exists today

- `viewJoin` as a gate (route guard at app.js:225). It asks for an email and a business name before showing a single number.
- The **"Set up your app?" → Load** screen (`viewSetupLink`, app.js:1690–1702) when the app minted the code itself seconds earlier in the same session. Confirming a thing you just did is pure tax.
- The bank-details step from `setupSteps` (app.js:266) before the first quote. No BSB appears on a quote; it belongs the first time he raises an invoice.
- The whole four-step set-up card on `viewHome` until a quote has gone out. "Ten minutes, on your own, whenever suits" is a ten-minute wall on an empty screen.
- Three primary buttons on an empty home (app.js:276: New job, Phone enquiry, Quick quote). One: New quote.
- Two thirds of `viewRoom`'s Surfaces card on a first run — wardrobe pairs, panelled doors, window frames, feature wall, wallpaper m², excluded m², cornice, stairwell. Behind "More detail".
- welcome.html as a stop, all three steps of it. Its content is a receipt email.
- The `.try` ballpark demo on the landing page: it uploads a photo to a model, prices it at sample rates, and calls itself rough — three contradictions of the product on the same scroll.

## 4. Where I will fight

1. **"Take the email up front so we own the lead."** No. He gave nothing and got nothing, and the relay already hands the set-up link back inline (app.js:91), so the inbox round-trip is theatre. An email captured before value is a bounced address with a nurture sequence attached.
2. **"Five messages is fine" / "make it free forever."** Both wrong from opposite ends. Five is spent inside one job, before a single nudge has proved the one thing we are selling; free-forever never asks. Fifteen messages, thirty days, then the ask lands on a live job with a real name on it.
3. **"He must set his prices and bank details before the first quote or the quote is wrong."** The starter rates are honest middle-of-the-road AU rates, and `price_override` lets him drag the room to his number in one field. Making a man configure a pricing engine before he has seen it price anything is how you get a painter who never quotes once.
