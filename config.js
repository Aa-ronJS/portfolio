// ===== LAUNCH CONFIG: the only things to edit before running ads =====
// Empty strings are safe: a button with no link behind it goes quiet or asks for
// an email (never an alert, never "Coming soon" shopfronts). Lines marked TODO
// must be filled in by the owner before launch; the page never invents a value.
window.QC = {
  APP_URL: "app/",                  // where the free phone app lives. Relative "app/" serves the copy in this project;
                                    // or the canonical https://aa-ronjs.github.io/portfolio/app/ (data is per address, pick one and keep it)

  // ---- the paid offer: "Set up with you", a one-off call. Price and founding terms live here so the page,
  //      the FAQ and the guarantee never disagree with the receipt.
  SETUP_URL: "",                    // Stripe Payment Link (or paid Calendly/Cal.com) for the set-up call. Empty + FORM_ACTION = email list; empty + nothing = button hidden
  SETUP_PRICE: 249,                 // AUD, the price charged today
  SETUP_PRICE_AFTER: 349,           // AUD, the price after the founding places are gone. Only honest if you actually raise it.
  FOUNDING_PLACES: 20,              // how many at the founding price. 0 hides the founding line.
  FOUNDING_LEFT: "",                // optional live count you update by hand, e.g. 14. Empty = no count shown. Never type a number you have not counted.
  SETUP_SLOTS_WEEK: "",             // optional, e.g. 5: "I do these myself, 5 a week". Empty = not shown.
  BOOKING_URL: "",                  // where a paid painter picks a time (Calendly, Cal.com, Google appointment page). Used on booked.html
  GST_REGISTERED: false,            // true adds "inc GST" and "tax invoice" wording. Only set true when you are registered.

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
