// Unit test for api/setup-link.js edge cases and api/sms-in.js, plus the signature helpers. The sign-up chain itself is selfserve.cjs. Run: node webhook.cjs
'use strict';
const { Readable } = require('node:stream'); const { createHmac } = require('node:crypto');
for (const k of ['ALLOWED_ORIGINS', 'TWILIO_API_KEY', 'TWILIO_FROM', 'TWILIO_API_SECRET', 'TWILIO_INBOUND_URL']) delete process.env[k];
Object.assign(process.env, { TWILIO_ACCOUNT_SID: 'ACserver', TWILIO_AUTH_TOKEN: 'twtok', TWILIO_MESSAGING_SERVICE_SID: 'MGserver', RESEND_API_KEY: 're_server', RESEND_FROM: 'Chasem <hello@chasem.app>', STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_SECRET_KEY: 'rk_test_x', APP_URL: 'https://chasem.app/app/', BOOKING_URL: 'https://cal.example/aaron/hour', OWNER_MOBILE: '0400 111 222', OWNER_EMAIL: 'aaron@example.com', INBOUND_FORWARD_TO: '0400 111 222' });
const wh = require(require('path').join(__dirname, '../../../..', 'chasem-landing') + '/api/stripe-webhook.js'), sl = require(require('path').join(__dirname, '../../../..', 'chasem-landing') + '/api/setup-link.js'), si = require(require('path').join(__dirname, '../../../..', 'chasem-landing') + '/api/sms-in.js'), U = require(require('path').join(__dirname, '../../../..', 'chasem-landing') + '/api/_setup.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const calls = []; let stripeSession = null;
globalThis.fetch = async (url, opts) => { const rec = { url, opts, form: null, json: null }; if (/api\.twilio\.com/.test(url)) rec.form = Object.fromEntries(new URLSearchParams(String(opts.body))); if (/api\.resend\.com/.test(url)) rec.json = JSON.parse(opts.body); calls.push(rec); if (/api\.stripe\.com\/v1\/checkout\/sessions\//.test(url)) return { ok: !!stripeSession, status: stripeSession ? 200 : 404, json: async () => stripeSession || { error: { message: 'No such checkout.session' } } }; return { ok: true, status: 200, json: async () => ({ id: 'x' + calls.length }) }; };
function req(method, body, headers, url) { const r = Readable.from(body == null ? [] : [Buffer.from(body)]); r.method = method; r.url = url || '/api/x'; r.headers = Object.assign({ host: 'qc.vercel.app', 'x-forwarded-proto': 'https', 'x-forwarded-for': '10.0.0.1' }, headers || {}); r.socket = { remoteAddress: '9.9.9.9' }; return r; }
function res() { return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; } }; }
const session = { id: 'cs_test_a1B2c3D4e5F6g7H8', object: 'checkout.session', mode: 'payment', payment_status: 'paid', status: 'complete', customer_details: { email: 'dave@example.com', name: 'Dave Smith', phone: '+61412000000', address: { line1: '12 Smith St', city: 'Ballarat', state: 'Victoria', postal_code: '3350', country: 'AU' } }, custom_fields: [{ key: 'trading_name', type: 'text', text: { value: "Dave's Painting" } }, { key: 'abn', type: 'text', text: { value: '11-222-333-444' } }, { key: 'licence', type: 'text', text: { value: '' } }] };
function sig(raw, secret, t) { t = t || Math.floor(Date.now() / 1000); return 't=' + t + ',v1=' + createHmac('sha256', secret).update(t + '.').update(raw).digest('hex'); }
const decode = (link) => JSON.parse(Buffer.from(link.split('#/setup?d=j:')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));

(async () => {
  // ---- details from a session
  const d = U.detailsFromSession(session);
  ok(d.trading_name === "Dave's Painting" && d.owner_name === 'Dave Smith' && d.abn === '11 222 333 444'.replace(/ /g, '') || d.abn === '11222333444', 'details: trading name, owner, ABN digits: ' + JSON.stringify(d));
  ok(d.state === 'VIC' && d.postcode === '3350' && d.phone === '0412000000' && d.email === 'dave@example.com' && !('licence' in d) && /12 Smith St Ballarat VIC 3350/.test(d.address), 'state normalised, phone in 04 form, empty licence left out');
  const link = U.setupLink(process.env.APP_URL, U.linkOnePayload(d)); const P = decode(link);
  ok(link.indexOf('https://chasem.app/app/#/setup?d=j:') === 0 && P.v === 1 && P.settings.details.trading_name === "Dave's Painting" && P.jobs.length === 0 && /Your details and your state's deposit rule/.test(P.note) && !P.settings.sending, 'the set-up link decodes to a v1 payload with details and no sending on it');
  // ---- webhook: only the guards, since selfserve.cjs covers the sign-up itself
  const raw = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: session } });
  let r = res(); await wh.default(req('POST', raw, { 'stripe-signature': sig(raw, 'whsec_wrong') }), r); ok(r.statusCode === 400 && /Bad signature/.test(r.body), 'wrong secret: 400');
  r = res(); await wh.default(req('POST', raw, { 'stripe-signature': sig(raw, 'whsec_test', Math.floor(Date.now() / 1000) - 3600) }), r); ok(r.statusCode === 400, 'stale timestamp: 400');
  r = res(); await wh.default(req('POST', raw, {}), r); ok(r.statusCode === 400, 'no signature: 400');
  const other = JSON.stringify({ id: 'evt_2', type: 'payment_intent.succeeded', data: { object: {} } }); r = res(); await wh.default(req('POST', other, { 'stripe-signature': sig(other, 'whsec_test') }), r); ok(r.statusCode === 200 && /ignored/.test(r.body) && calls.length === 0, 'other event types are ignored, nothing sent');
  const unpaid = JSON.stringify({ id: 'evt_3', type: 'checkout.session.completed', data: { object: Object.assign({}, session, { payment_status: 'unpaid' }) } }); r = res(); await wh.default(req('POST', unpaid, { 'stripe-signature': sig(unpaid, 'whsec_test') }), r); ok(r.statusCode === 200 && /not paid yet/.test(r.body) && calls.length === 0, 'a bank debit still clearing is ignored until it succeeds');

  // ---- setup-link
  const run = async (url, headers) => { const rr = res(); await sl.default(req('GET', null, Object.assign({ origin: 'https://chasem.app' }, headers || {}), url), rr); return { status: rr.statusCode, json: JSON.parse(rr.body || 'null'), h: rr.headers }; };
  let s = await run('/api/setup-link?session=bogus'); ok(s.status === 400, 'bad session id: 400');
  stripeSession = null; s = await run('/api/setup-link?session=cs_test_a1B2c3D4e5F6g7H8'); ok(s.status === 404 && /No such/.test(s.json.error), 'unknown session: 404 with Stripe\'s message');
  stripeSession = Object.assign({}, session, { payment_status: 'unpaid' }); s = await run('/api/setup-link?session=cs_test_a1B2c3D4e5F6g7H8'); ok(s.status === 200 && s.json.paid === false && !s.json.link, 'unpaid: paid false, no link');
  stripeSession = session; s = await run('/api/setup-link?session=cs_test_a1B2c3D4e5F6g7H8'); ok(s.status === 200 && s.json.paid && /#\/setup\?d=j:/.test(s.json.link) && s.json.name === "Dave's Painting" && s.h['Access-Control-Allow-Origin'] === 'https://chasem.app', 'paid: the same link the email carried, CORS for the Pages site');
  const auth = calls.filter(c => /api\.stripe\.com/.test(c.url)).pop(); ok(auth.opts.headers.Authorization === 'Bearer rk_test_x' && /sessions\/cs_test_a1B2c3D4e5F6g7H8$/.test(auth.url), 'Stripe asked with the secret key');
  s = await run('/api/setup-link?session=cs_test_a1B2c3D4e5F6g7H8', { origin: 'https://evil.example' }); ok(s.status === 403, 'other origin: 403');
  // ---- sms-in
  const form = (o) => new URLSearchParams(o).toString();
  const tsig = (url, params) => createHmac('sha1', 'twtok').update(url + Object.keys(params).sort().map(k => k + params[k]).join('')).digest('base64');
  const inbound = { From: '+61433000111', To: '+61480000000', Body: 'yes go ahead', MessageSid: 'SMin1' };
  let rr = res(); await si.default(req('POST', form(inbound), { 'content-type': 'application/x-www-form-urlencoded' }, '/api/sms-in'), rr); ok(rr.statusCode === 403 && /<Response><\/Response>/.test(rr.body), 'unsigned inbound: 403, empty TwiML');
  const n0 = calls.length; rr = res(); await si.default(req('POST', form(inbound), { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': tsig('https://qc.vercel.app/api/sms-in', inbound) }, '/api/sms-in'), rr);
  ok(rr.statusCode === 200 && rr.headers['Content-Type'] === 'text/xml' && rr.body.indexOf('<Message>' + si.REPLY + '</Message>') > 0, 'signed inbound: auto-reply TwiML');
  const fwd = calls[calls.length - 1]; ok(calls.length === n0 + 1 && fwd.form && fwd.form.To === '+61400111222' && fwd.form.Body === 'Reply from +61433000111: yes go ahead', 'the reply is copied to Aaron: ' + (fwd.form && fwd.form.Body));
  const stop = { From: '+61433000111', To: '+61480000000', Body: 'STOP', MessageSid: 'SMin2' }; const n1 = calls.length; rr = res(); await si.default(req('POST', form(stop), { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': tsig('https://qc.vercel.app/api/sms-in', stop) }, '/api/sms-in'), rr); ok(rr.statusCode === 200 && !/<Message>/.test(rr.body) && calls.length === n1, 'STOP: no auto-reply, no forward');
  process.env.TWILIO_INBOUND_URL = 'https://chasem.app/api/sms-in'; rr = res(); await si.default(req('POST', form(inbound), { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': tsig('https://chasem.app/api/sms-in', inbound) }, '/api/sms-in'), rr); ok(rr.statusCode === 200 && /<Message>/.test(rr.body), 'TWILIO_INBOUND_URL overrides the URL the signature covers');
  const scr = si.REPLY; ok(scr.length <= 160, 'auto-reply fits one SMS segment (' + scr.length + ')');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
