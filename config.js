// ===== LAUNCH CONFIG: the only things to edit before running ads =====
// Empty strings are safe: a button with no link behind it goes quiet or asks for an email (never an alert,
// never a "Coming soon" shopfront). Lines marked TODO must be filled in by the owner before launch; the page
// never invents a value. Nothing here books a call or needs a human: the product is self-service end to end.
window.QC = {
  APP_URL: "app/",                  // where the free phone app lives. Relative "app/" serves the copy in this project;
                                    // or the canonical https://aa-ronjs.github.io/portfolio/app/ (data is per address, pick one and keep it)

  // ---- one product, one price, messages included. The painter starts inside the app with his email; the card comes later, from inside.
  PLAN_PRICE: 49,                   // AUD a month. Must match the Stripe Payment Link and the relay. Shown on the card, the FAQ and the terms.
  INCLUDED_MESSAGES: 100,           // messages a month in the plan. Must match INCLUDED_MESSAGES on the relay.
  FREE_MESSAGES: 5,                 // what an email alone gets him, so he can send a quote and chase it twice. Must match FREE_MESSAGES on the relay.
  TOPUP_MESSAGES: 100,              // messages in a top-up pack. Must match TOPUP_MESSAGES on the relay.
  TOPUP_PRICE: 20,                  // AUD for a pack. Must match the top-up Stripe Payment Link.
  SUBSCRIBE_URL: "",                // TODO owner: the Stripe Payment Link (subscription mode) at PLAN_PRICE. The app links to it from inside;
                                    //   collect name, email, phone and billing address, plus custom TEXT fields keyed trading_name, abn, licence.
                                    //   Success URL: <this site>/welcome?session={CHECKOUT_SESSION_ID}
  TOPUP_URL: "",                    // TODO owner: a second Payment Link, one-off, at TOPUP_PRICE, with metadata qc=topup. The app appends
                                    //   ?client_reference_id=<his Stripe customer> so the webhook knows whose account to credit.
  SETUP_LINK_API: "",               // TODO owner: "https://your-site.vercel.app/api/setup-link". Lets the welcome page show the
                                    // "Set up my app" button the second they pay. Empty = the page tells them to use the emailed link.

  // ---- the relay (Vercel project: quote-and-chase-landing). Nothing on this page needs it, but the subscription does.
  //   Env there: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RELAY_SIGNING_SECRET (a long random string),
  //   RELAY_URL (<site>/api/msg), APP_URL, SUPPORT_EMAIL, TWILIO_*, RESEND_*, optional OWNER_MOBILE / OWNER_EMAIL / INBOUND_FORWARD_TO.
  //   Stripe webhook -> <site>/api/stripe-webhook for checkout.session.completed and checkout.session.async_payment_succeeded.
  //   Twilio Messaging Service "a message comes in" -> <site>/api/sms-in. Stripe customer portal turned on in Stripe settings.

  GST_REGISTERED: false,            // true adds "inc GST" and "tax invoice" wording. Only set true when you are registered.
  HELP_SAME_DAY: true,              // true: "a message that did not send: the same business day". false: "within one business day".
  BUSINESS_ADDRESS: "",             // TODO owner: a postal address (a PO box is fine) for the terms; the guarantee needs the giver's address.
  BUSINESS_PHONE: "",               // optional. There is no phone support; leave it empty unless you want it in the terms.

  // ---- the laptop pack, sold on laptop.html to the Claude Code crowd, not on the painter page
  CHECKOUT_URL: "",                 // laptop pack checkout: Gumroad / Lemon Squeezy / Stripe Payment Link. Empty = the page asks for an email instead
  PACK_PRICE: 249,                  // AUD
  LESSONS_DATE: "within 14 days of purchase",  // when the video lessons are delivered; the pack guarantee runs 30 days from delivery

  // ---- plumbing
  FORM_ACTION: "",                  // ONE Formspree (or similar) endpoint. Every email capture posts here with a "list" field:
                                    //   sample-quote | send-to-laptop | chasing-on | laptop-pack.  Empty = the forms are hidden
  MAKER_NOTE: "",                   // two or three sentences in your voice: who you are, why you made it, why it is free. Empty hides the block (TODO owner: the page is anonymous without it)
  MAKER_NAME: "",                   // e.g. "Aaron, Melbourne"
  MAKER_PHOTO: "",                  // e.g. "maker.jpg" placed in public/; optional
  META_PIXEL_ID: "",                // e.g. "1234567890"; leave empty to disable
  SUPPORT_EMAIL: "",                // TODO owner: a real inbox you read on business days. It is the only way anyone can reach you.
  BUSINESS_NAME: "Quote & Chase",   // TODO owner: the legal or trading name that appears on privacy and terms
  ABN: ""                           // TODO owner: your real ABN. Empty = the ABN line is left out (never a placeholder). Needed before any money is taken.
};
