/* Chasem: settings for this copy of the app. Safe to leave empty.
   maps_key: a Google Maps key (Places API (New), Maps Static API, Solar API) restricted to this app's web address.
   With it, addresses fill in as you type, jobs show a satellite photo and the house size is worked out for outside quotes.
   A painter can also put their own key in Set-up, which wins over this one.
   signup_url: the relay's /api/signup. Root-relative, because the app and the relay are the same Vercel project on the same
   domain -- so this keeps working on a preview deployment, and there is no domain written into the app at all. Without it the
   app still opens on an email, but sending is not switched on and every message is written for the painter to send himself. */
window.QC_APP = { maps_key: '', signup_url: '/api/signup' };
