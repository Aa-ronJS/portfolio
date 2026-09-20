// ===== LAUNCH CONFIG: the only things to edit before running ads =====
// Empty strings are safe: the page shows "Coming soon" (never an alert) for
// anything that is not wired up yet. Lines marked TODO must be filled in by
// the owner before launch; the page never invents a value for them.
window.QC = {
  APP_URL: "app/",                  // where the free phone app lives. Relative "app/" serves the copy in this project;
                                    // or the canonical https://aa-ronjs.github.io/portfolio/app/ (data is per address, pick one and keep it)
  CHECKOUT_URL: "",                 // laptop pack, $249 once: Gumroad / Lemon Squeezy / Stripe Payment Link. Empty = "Coming soon"
  HOSTED_URL: "",                   // "We run it for you" waiting list: Tally/Formspree form or pre-order link. Empty = uses FORM_ACTION, else "Coming soon"
  HOSTED_DATE: "",                  // when the hosted version opens, e.g. "November 2026". Empty = "no date yet"
  FORM_ACTION: "",                  // ONE Formspree (or similar) endpoint. Every email capture posts here with a "list" field:
                                    //   sample-quote | send-to-laptop | hosted-founding.  Empty = the forms are hidden
  MAKER_NOTE: "",                   // one or two sentences in your voice about why you made this; empty hides the block
  MAKER_NAME: "",                   // e.g. "Aaron, Melbourne"
  MAKER_PHOTO: "",                  // e.g. "maker.jpg" placed in public/; optional
  META_PIXEL_ID: "",                // e.g. "1234567890"; leave empty to disable
  SUPPORT_EMAIL: "",                // TODO owner: a real inbox you read, e.g. "help@yourdomain.com.au". Empty = no mailto links on the site
  BUSINESS_NAME: "Quote & Chase",   // TODO owner: the legal or trading name that appears on privacy and terms
  ABN: "",                          // TODO owner: your real ABN. Empty = the ABN line is left out (never a placeholder)
  LESSONS_DATE: "within 14 days of purchase"  // when the video lessons will be delivered to founding pack buyers
};
