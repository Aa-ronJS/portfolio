// ===== LAUNCH CONFIG: the only things to edit before running ads =====
// Empty strings are safe: a button with no link behind it goes quiet or asks for an email (never an alert,
// never a "Coming soon" shopfront). Lines marked TODO must be filled in by the owner before launch; the page
// never invents a value. Nothing here books a call or needs a human: the product is self-service end to end.
window.QC = {
  APP_URL: "app/",                  // where the phone app lives. Relative "app/" is the copy in this project, so on chasem.app it is
                                    // https://chasem.app/app/ -- the canonical address. A painter's jobs live in his phone's storage
                                    // for the address he opened, so pick one address and never move it.

  // ---- one product, one price, messages included. The tradie starts inside the app with his email; the card comes later, from inside.
  PLAN_PRICE: 99,                   // AUD a month. Must match the Stripe Payment Link and the relay. Shown on the card, the FAQ and the terms.
  INCLUDED_MESSAGES: 150,           // messages a month in the plan. Must match INCLUDED_MESSAGES on the relay.
  FREE_MESSAGES: 12,                // what an email alone gets him: three whole jobs, quoted and chased to the end, because a
                                    // job costs four messages. Must match FREE_MESSAGES on the relay.
  TOPUP_MESSAGES: 100,              // messages in a top-up pack. Must match TOPUP_MESSAGES on the relay.
  TOPUP_PRICE: 35,                  // AUD for a pack. Must match TOPUP_PRICE on the relay. Packs are bought adversely (only heavy
                                    // senders buy one), so this has to sit near the real cost of sending them, not at a token price.
  SUBSCRIBE_URL: "https://buy.stripe.com/cNibIVaMz3HYb7vfrHffy00",                // the Stripe Payment Link (subscription mode) at PLAN_PRICE. The app links to it from inside;
                                    //   collect name, email, phone and billing address and nothing else -- he types no business name, ABN or
                                    //   licence at checkout. Success URL: https://chasem.app/welcome?session={CHECKOUT_SESSION_ID}
  TOPUP_URL: "https://buy.stripe.com/cNi14hdYLceugrPgvLffy02",                    // optional fallback only. The app buys packs with one tap on the card Stripe already holds (api/topup.js),
                                    //   so nobody is sent to a checkout page. Set this only if you also want a link for someone with no card on file:
                                    //   a one-off Payment Link at TOPUP_PRICE with metadata qc=topup.
  SETUP_LINK_API: "/api/setup-link", // same origin as this page on chasem.app, so the welcome page can show the "Set up my app"
                                    // button the second they pay. Empty = the page tells them to use the emailed link instead.

  // ---- the relay (Vercel project: chasem-landing). Nothing on this page needs it, but the subscription does.
  //   Env there: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RELAY_SIGNING_SECRET (a long random string),
  //   RELAY_URL (<site>/api/msg), APP_URL, SUPPORT_EMAIL, TWILIO_*, RESEND_*, optional OWNER_MOBILE / OWNER_EMAIL / INBOUND_FORWARD_TO.
  //   Stripe webhook -> <site>/api/stripe-webhook for checkout.session.completed and checkout.session.async_payment_succeeded.
  //   Twilio Messaging Service "a message comes in" -> <site>/api/sms-in. Stripe customer portal turned on in Stripe settings.

  GST_REGISTERED: true,             // Factrie Pty Ltd has been GST-registered since 22 Jul 2024, so every price here is shown
                                    // GST-inclusive and the Stripe prices are tax_behavior=inclusive to match: $99 is what he pays.
  HELP_SAME_DAY: true,              // true: "a message that did not send: the same business day". false: "within one business day".
  BUSINESS_ADDRESS: "30 Orca Court, Seaford Meadows SA 5169",  // the postal address the guarantee is given from
  BUSINESS_PHONE: "",               // optional. There is no phone support; leave it empty unless you want it in the terms.

  // ---- the laptop pack, sold on laptop.html to the Claude Code crowd, not on the painter page
  CHECKOUT_URL: "",                 // laptop pack checkout: Gumroad / Lemon Squeezy / Stripe Payment Link. Empty = the page asks for an email instead
  PACK_PRICE: 249,                  // AUD
  LESSONS_DATE: "within 14 days of purchase",  // when the video lessons are delivered; the pack guarantee runs 30 days from delivery

  // ---- plumbing
  FORM_ACTION: "",                  // ONE Formspree (or similar) endpoint. Every email capture posts here with a "list" field:
                                    //   sample-quote | send-to-laptop | chasing-on | laptop-pack.  Empty = the forms are hidden
  MAKER_NOTE: "",                   // two or three sentences in your voice: who you are and why you made it. Empty hides the block (TODO owner: the page is anonymous without it)
  MAKER_NAME: "",                   // e.g. "Aaron, Melbourne"
  MAKER_PHOTO: "",                  // e.g. "maker.jpg" placed in public/; optional
  META_PIXEL_ID: "",                // e.g. "1234567890"; leave empty to disable
  SUPPORT_EMAIL: "help@chasem.app", // Published on the privacy and terms pages, so it has to reach a person.
  // The domain's MX records point at ImprovMX; the alias itself is set in ImprovMX. Tester feedback does NOT depend on it --
  // that goes into the database and is read back with /api/admin {action:"feedback"}.
                                    // anyone can reach us, so it is answered on business days.
  BUSINESS_NAME: "Factrie Pty Ltd", // the legal name that appears on privacy and terms
  ABN: "13 679 295 044"             // Factrie Pty Ltd, ACN 679 295 044. Empty = the ABN line is left out (never a placeholder).
};
