/* Chasem: card payments through the painter's own Stripe account, straight from the phone.
 * Uses a restricted key (Products, Prices, Payment Links: write; Checkout Sessions: read) that never leaves this device.
 * Stripe's API answers browser requests (CORS), so no server sits in the middle. */
(function () {
  'use strict';
  var API = 'https://api.stripe.com/v1/';
  function form(obj, prefix, out) { out = out || []; Object.keys(obj).forEach(function (k) { var v = obj[k], key = prefix ? prefix + '[' + k + ']' : k; if (v == null) return; if (typeof v === 'object') form(v, key, out); else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(v)); }); return out.join('&'); }
  function call(key, method, path, body) {
    var f = window.__qcFetch || window.fetch;
    key = String(key || '').trim();
    return Promise.resolve().then(function () { return f(API + path, { method: method, headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' }, body: method === 'GET' ? undefined : form(body || {}) })
    ; }).then(function (r) { return r.json().then(function (j) { if (!r.ok || j.error) throw new Error(j.error && j.error.message || ('Stripe error ' + r.status)); return j; }); });
  }
  function keyLooksRight(key) { return /^rk_(live|test)_[A-Za-z0-9]{10,}$/.test(String(key || '').trim()); }
  // Creates a one-off Price and a Payment Link for an invoice. amount in dollars.
  function createPaymentLink(key, opts) {
    var cents = Math.round(opts.amount * 100); if (!(cents >= 50)) return Promise.reject(new Error('Amount must be at least $0.50 for a card payment'));
    return call(key, 'POST', 'prices', { currency: opts.currency || 'aud', unit_amount: cents, product_data: { name: opts.name } })
      .then(function (price) { return call(key, 'POST', 'payment_links', { 'line_items[0][price]': price.id, 'line_items[0][quantity]': 1, metadata: { invoice: opts.invoiceNo, job: opts.jobId || '' }, 'payment_intent_data[description]': opts.name, after_completion: { type: 'hosted_confirmation', hosted_confirmation: { custom_message: opts.thanks || 'Thanks, payment received. ' + opts.name } } }); })
      .then(function (link) { return { id: link.id, url: link.url }; });
  }
  // Has anyone paid through this link? Looks at Checkout Sessions created from it.
  function checkPaid(key, linkId) {
    return call(key, 'GET', 'checkout/sessions?payment_link=' + encodeURIComponent(linkId) + '&limit=20').then(function (r) {
      var paid = (r.data || []).filter(function (s) { return s.payment_status === 'paid'; });
      if (!paid.length) return { paid: false };
      var s = paid[0]; return { paid: true, amount: (s.amount_total || 0) / 100, when: new Date((s.created || 0) * 1000).toISOString().slice(0, 10), email: s.customer_details && s.customer_details.email };
    });
  }
  function deactivate(key, linkId) { return call(key, 'POST', 'payment_links/' + linkId, { active: false }); }
  window.QCStripe = { createPaymentLink: createPaymentLink, checkPaid: checkPaid, deactivate: deactivate, keyLooksRight: keyLooksRight, form: form };
})();
