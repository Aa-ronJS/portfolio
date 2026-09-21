// ===== LAUNCH CONFIG: the only things to edit before running ads =====
// Empty strings are safe: a button with no link behind it goes quiet or asks for
// an email (never an alert, never "Coming soon" shopfronts). Lines marked TODO
// must be filled in by the owner before launch; the page never invents a value.
window.QC = {
  APP_URL: "app/",                  // where the free phone app lives. Relative "app/" serves the copy in this project;
                                    // or the canonical https://aa-ronjs.github.io/portfolio/app/ (data is per address, pick one and keep it)

  // ---- the paid offer: "Set up with you", a one-off call. Price and founding terms live here so the page,
  //      the FAQ and the guarantee never disagree with the receipt.
  OFFER_NAME: "The Driveway Quote Hour",  // the name on the card, the button, the receipt and the terms. Founding wording lives in its own tag, so nothing needs renaming at painter 21.
  SETUP_URL: "",                    // Stripe Payment Link for the hour, with booked.html as its success page. Empty + FORM_ACTION = email list; empty + nothing = button hidden
  SETUP_PRICE: 495,                 // AUD, the price charged, the same for founding painters and everyone after (founding painters get more, not less)
  SETUP_PRICE_AFTER: "",            // leave empty. Only set a number if you will actually charge it after the founding places for a real period; the page then prints "Then $X".
  FOUNDING_PLACES: 20,              // how many get the founding terms (the 90-day money-in promise in writing and the price rebuild). 0 hides every founding line.
  FOUNDING_ENDS: "",                // optional end date for the founding terms, e.g. "30 November 2026". Set once, never extend.
  FOUNDING_LEFT: "",                // optional live count you update by hand from Stripe receipts, e.g. 14. Empty = no count shown. Never type a number you have not counted.
  FOUNDING_COUNTED: "",             // the date you last counted, e.g. "3 October 2026". Shown next to the count.
  SETUP_SLOTS_WEEK: "",             // optional, e.g. 4: "I do these myself, 4 a week". Shown only once SETUP_URL is set. Empty = not shown.
  HOSTED_DAYS: 90,                  // days of sending through your relay included with the hour, before the free switch-over or $HOSTED_PRICE a month. Match RELAY_TOKENS "until" dates to it.
  PHONE_HOURS: "",                  // e.g. "weekdays 4 to 7pm, or text and I ring back". Shown with BUSINESS_PHONE on the card once bookings are open.
  SETUP_LOG: [],                    // the public Set-Up Log, one object per paid set-up, newest last. Only real ones, only with the painter's OK on the name:
                                    //   { date: "6 Oct", state: "VIC", who: "Dave, Ballarat", quote_on_call: true, sending_live: true, second_session: false, refund: false, note: "" }
  LAST_CALL: "",                    // optional, e.g. "Thursday 17 December": the last Set-Up Hour before the Christmas break. Needs BREAK_FROM and BREAK_TO too.
  BREAK_FROM: "",                   // e.g. "19 December"
  BREAK_TO: "",                     // e.g. "11 January"
  HELP_SAME_DAY: true,              // true: "a message that did not send: the same business day". false: "within one business day". Say only what you will do.
  BONUSES_READY: false,             // true only when the state pages, first-quote card, message library, unpaid invoice playbook and bookkeeper page exist and go out the day someone pays
  BOOKING_URL: "",                  // where a paid painter picks a time (Cal.com, Calendly, Google appointment page). Used on booked.html
  GST_REGISTERED: false,            // true adds "inc GST" and "tax invoice" wording. Only set true when you are registered.
  BUSINESS_ADDRESS: "",             // TODO owner: a postal address (a PO box is fine) for the terms. The service guarantee needs the giver's address and phone published.
  BUSINESS_PHONE: "",               // TODO owner: a phone number for the terms (a VoIP number is fine).

  // ---- the laptop pack, sold on laptop.html to the Claude Code crowd, not on the painter page
  CHECKOUT_URL: "",                 // laptop pack checkout: Gumroad / Lemon Squeezy / Stripe Payment Link. Empty = the page asks for an email instead
  PACK_PRICE: 249,                  // AUD
  LESSONS_DATE: "within 14 days of purchase",  // when the video lessons are delivered to pack buyers; the pack guarantee runs 30 days from delivery

  // ---- the hosted version: a waiting list only, no money taken
  HOSTED_URL: "",                   // waiting list form or pre-order link. Empty = uses FORM_ACTION, else a mailto, else hidden
  HOSTED_DATE: "",                  // when the hosted version opens, e.g. "November 2026". Empty = "no date"
  HOSTED_PRICE: 39,                 // AUD a month, the price list members keep

  // ---- plumbing
  FORM_ACTION: "",                  // ONE Formspree (or similar) endpoint. Every email capture posts here with a "list" field:
                                    //   sample-quote | send-to-laptop | hosted-founding | setup-call | laptop-pack.  Empty = the forms are hidden
  MAKER_NOTE: "",                   // two or three sentences in your voice: who you are, why you made it, why it is free. Empty hides the block (TODO owner: the page is anonymous without it)
  MAKER_NAME: "",                   // e.g. "Aaron, Melbourne"
  MAKER_PHOTO: "",                  // e.g. "maker.jpg" placed in public/; optional
  META_PIXEL_ID: "",                // e.g. "1234567890"; leave empty to disable
  SUPPORT_EMAIL: "",                // TODO owner: a real inbox you read on business days, e.g. "help@yourdomain.com.au". Empty = no mailto links on the site
  BUSINESS_NAME: "Quote & Chase",   // TODO owner: the legal or trading name that appears on privacy and terms
  ABN: ""                           // TODO owner: your real ABN. Empty = the ABN line is left out (never a placeholder). Needed before any money is taken.
};
