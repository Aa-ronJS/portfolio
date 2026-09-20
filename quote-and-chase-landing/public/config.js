// ===== LAUNCH CONFIG: the only things to edit before running ads =====
window.QC = {
  CHECKOUT_URL: "",                 // "Own it": Gumroad / Lemon Squeezy / Stripe Payment Link for the course + templates
  HOSTED_URL: "",                   // "We run it": founding-list form (Tally/Formspree) or a pre-order payment link
  HOSTED_DATE: "later this year",   // when the hosted version opens, e.g. "November 2026"
  FORM_ACTION: "",                  // ONE Formspree (or similar) endpoint. Every email capture posts here with a "list" field:
                                    //   sample-quote | send-to-laptop | hosted-founding
  MAKER_NOTE: "",                   // one or two sentences in your voice about why you made this; empty hides the block
  MAKER_NAME: "",                   // e.g. "Aaron, Melbourne"
  MAKER_PHOTO: "",                  // e.g. "maker.jpg" placed in public/; optional
  META_PIXEL_ID: "",                // e.g. "1234567890"; leave empty to disable
  SUPPORT_EMAIL: "hello@example.com",
  BUSINESS_NAME: "Quote & Chase",
  ABN: "00 000 000 000",
  LESSONS_DATE: "within 14 days of purchase"  // when the video lessons will be delivered to founding buyers
};
