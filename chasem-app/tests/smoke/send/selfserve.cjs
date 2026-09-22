// The hands-off chain: subscribe -> signed token minted and emailed -> relay accepts it -> app renews it -> cancelled stops it -> portal link.
'use strict';
const { Readable } = require('node:stream'); const { createHmac } = require('node:crypto');
for (const k of ['ALLOWED_ORIGINS','TWILIO_API_KEY','TWILIO_FROM','TWILIO_API_SECRET','TWILIO_INBOUND_URL','RELAY_TOKEN','RELAY_TOKENS','RELAY_REVOKED','ALLOW_CLIENT_CREDS']) delete process.env[k];
Object.assign(process.env, { TWILIO_ACCOUNT_SID:'ACserver', TWILIO_AUTH_TOKEN:'twtok', TWILIO_MESSAGING_SERVICE_SID:'MGserver', RESEND_API_KEY:'re_server', RESEND_FROM:'Chasem <hello@quoteandchase.com.au>', STRIPE_WEBHOOK_SECRET:'whsec_test', STRIPE_SECRET_KEY:'rk_test_x', RELAY_SIGNING_SECRET:'sign_me_please_0123456789', RELAY_URL:'https://qc.vercel.app/api/msg', APP_URL:'https://chasem.app/app/', SUPPORT_EMAIL:'help@quoteandchase.com.au', OWNER_MOBILE:'0400 111 222', SITE_URL:'https://chasem.app/' });
const U = require(require('path').join(__dirname, '../../../..', 'chasem-landing') + '/api/_setup.js');
const wh = require(require('path').join(__dirname, '../../../..', 'chasem-landing') + '/api/stripe-webhook.js');
const renew = require(require('path').join(__dirname, '../../../..', 'chasem-landing') + '/api/renew.js').default;
const portal = require(require('path').join(__dirname, '../../../..', 'chasem-landing') + '/api/portal.js').default;
const sl = require(require('path').join(__dirname, '../../../..', 'chasem-landing') + '/api/setup-link.js').default;
const msg = require(require('path').join(__dirname, '../../../..', 'chasem-landing') + '/api/msg.js').default;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const calls = []; let SUB = null, SESSION = null, PORTAL_FAIL = false;
const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
globalThis.fetch = async (url, opts) => {
  const rec = { url, opts, form: null, json: null };
  if (/api\.twilio\.com/.test(url)) rec.form = Object.fromEntries(new URLSearchParams(String(opts.body)));
  if (/api\.resend\.com/.test(url)) rec.json = JSON.parse(opts.body);
  calls.push(rec);
  if (/api\.stripe\.com\/v1\/subscriptions\//.test(url)) return { ok: !!SUB, status: SUB ? 200 : 404, json: async () => SUB || { error: { message: 'No such subscription' } } };
  if (/api\.stripe\.com\/v1\/checkout\/sessions\//.test(url)) return { ok: !!SESSION, status: SESSION ? 200 : 404, json: async () => SESSION || { error: { message: 'No such session' } } };
  if (/api\.stripe\.com\/v1\/billing_portal\/sessions/.test(url)) { rec.form = Object.fromEntries(new URLSearchParams(String(opts.body))); return PORTAL_FAIL ? { ok: false, status: 400, json: async () => ({ error: { message: 'No configuration provided' } }) } : { ok: true, status: 200, json: async () => ({ url: 'https://billing.stripe.com/p/session/test_123' }) }; }
  return { ok: true, status: 200, json: async () => ({ id: 'x' + calls.length }) };
};
let ipn = 10;
function req(method, body, headers, url) { const r = Readable.from(body == null ? [] : [Buffer.from(body)]); r.method = method; r.url = url || '/api/x'; r.headers = Object.assign({ host: 'qc.vercel.app', origin: 'https://chasem.app', 'x-forwarded-for': '10.0.0.' + (ipn++) }, headers || {}); r.socket = { remoteAddress: '9.9.9.9' }; return r; }
function res() { return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; } }; }
const sig = (raw) => { const t = Math.floor(Date.now() / 1000); return 't=' + t + ',v1=' + createHmac('sha256', 'whsec_test').update(t + '.').update(raw).digest('hex'); };
const decode = (link) => JSON.parse(Buffer.from(link.split('#/setup?d=j:')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
const session = { id: 'cs_test_sub1234567890', object: 'checkout.session', mode: 'subscription', payment_status: 'paid', status: 'complete', customer: 'cus_1', subscription: 'sub_1',
  customer_details: { email: 'dave@example.com', name: 'Dave Smith', phone: '+61412000000', address: { line1: '12 Smith St', city: 'Ballarat', state: 'Victoria', postal_code: '3350', country: 'AU' } },
  custom_fields: [{ key: 'trading_name', type: 'text', text: { value: "Dave's Painting" } }, { key: 'abn', type: 'text', text: { value: '11 222 333 444' } }] };
const call = async (h, body, url, headers) => { const r = res(); await h(req(body === null ? 'GET' : 'POST', body === null ? null : JSON.stringify(body), headers, url), r); return { status: r.statusCode, json: JSON.parse(r.body || 'null') }; };

(async () => {
  SUB = { id: 'sub_1', status: 'active', customer: 'cus_1', current_period_end: periodEnd, items: { data: [{ current_period_end: periodEnd }] } };
  // ---- 1. sign-up: one webhook, one email, nothing for a human to do
  const raw = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: session } });
  let r = res(); await wh.default(req('POST', raw, { 'stripe-signature': sig(raw) }), r); const out = JSON.parse(r.body);
  ok(r.statusCode === 200 && out.ok && out.emailed && out.hosted && out.until, 'subscribe: link emailed with sending switched on: ' + r.body);
  const em = calls.find(c => c.json && c.json.subject);
  const link = (/https:\/\/chasem\.app\/app\/#\/setup\?d=j:[A-Za-z0-9_-]+/.exec(em.json.text) || [])[0];
  const P = decode(link);
  ok(P.settings.details.trading_name === "Dave's Painting" && P.settings.sending && P.settings.sending.hosted === true && P.settings.sending.server === 'https://qc.vercel.app/api/msg' && P.settings.sending.server_has_creds === true && P.settings.sending.hosted_name === "Dave's Painting" && /^\d{4}-\d{2}-\d{2}$/.test(P.settings.sending.hosted_until), 'the link carries details and a live sending config: ' + JSON.stringify(P.settings.sending).slice(0, 160));
  ok(/You're on\. One tap sets it all up/.test(em.json.text) && !/ring|call you|phone call|book/i.test(em.json.text) && /help@quoteandchase\.com\.au/.test(em.json.text), 'the welcome email promises no call and gives an email for help');
  const painterText = calls.filter(c => c.form && c.form.To === '+61412000000').pop();
  ok(painterText && /you're on\. The set-up link is in your email/.test(painterText.form.Body), 'the painter also gets a text saying where the link is');
  const TOKEN = P.settings.sending.token;
  ok(/^qc1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(TOKEN), 'the token is signed, not an entry in a list: ' + TOKEN.slice(0, 24) + '…');
  // ---- 2. the relay takes the signed token with nothing configured for this painter
  let m = await call(msg, { action: 'ping', token: TOKEN });
  ok(m.status === 200 && m.json.hosted === true && m.json.signed === true && m.json.name === "Dave's Painting" && m.json.renew === '/api/renew', 'relay ping: hosted, signed, knows its own renew path');
  m = await call(msg, { action: 'send', channel: 'email', token: TOKEN, to: 'client@example.com', subject: 's', body: 'b' });
  const sent = calls.filter(c => c.json && c.json.from).pop();
  ok(m.status === 200 && m.json.ok && sent.json.from === '"Dave\'s Painting" <hello@quoteandchase.com.au>' && sent.json.reply_to === 'dave@example.com', 'relay sends in his name with replies to him, on our accounts');
  const bad = TOKEN.slice(0, -2) + (TOKEN.slice(-2) === 'aa' ? 'bb' : 'aa');
  m = await call(msg, { action: 'ping', token: bad }); ok(m.status === 401, 'a token with a tampered signature is refused');
  m = await call(msg, { action: 'ping', token: 'qc1.eyJ2IjoxfQ.notasignature' }); ok(m.status === 401, 'a made-up token is refused');
  // expired token
  const expired = U.signToken({ v: 1, sub: 'sub_1', cus: 'cus_1', name: 'X', reply_to: 'x@x.com', until: '2020-01-01' }, process.env.RELAY_SIGNING_SECRET);
  m = await call(msg, { action: 'send', channel: 'email', token: expired, to: 'c@x.com', subject: 's', body: 'b' });
  ok(m.status === 403 && /Hosted sending has ended/.test(m.json.error), 'a token past its date stops sending by itself');
  // revoked
  process.env.RELAY_REVOKED = 'sub_1'; m = await call(msg, { action: 'ping', token: TOKEN });
  ok(m.status === 403, 'one env var can stop one account at once'); delete process.env.RELAY_REVOKED;
  // ---- 3. the app renews itself
  let rn = await call(renew, { token: TOKEN }, '/api/renew');
  ok(rn.status === 200 && rn.json.active === true && rn.json.status === 'active' && /^qc1\./.test(rn.json.token) && U.readToken(rn.json.token, process.env.RELAY_SIGNING_SECRET).until === U.untilFor(periodEnd) && rn.json.until === U.untilFor(periodEnd), 'renew hands back a token signed to the new date while the subscription is live');
  const laterEnd = periodEnd + 30 * 86400; SUB = Object.assign({}, SUB, { current_period_end: laterEnd, items: { data: [{ current_period_end: laterEnd }] } });
  rn = await call(renew, { token: TOKEN }, '/api/renew'); ok(rn.json.until === U.untilFor(laterEnd) && rn.json.token !== TOKEN && U.readToken(rn.json.token, process.env.RELAY_SIGNING_SECRET).until === U.untilFor(laterEnd), 'next month renew moves the date out again and the new token carries it');
  const fresh = rn.json.token; let mm = await call(msg, { action: 'ping', token: fresh }); ok(mm.status === 200 && mm.json.hosted === true, 'the relay takes the renewed token straight away');
  SUB = { id: 'sub_1', status: 'canceled', customer: 'cus_1', current_period_end: periodEnd };
  rn = await call(renew, { token: TOKEN }, '/api/renew');
  ok(rn.status === 200 && rn.json.active === false && rn.json.status === 'canceled' && !rn.json.token, 'cancelled: no new token, and the old one runs out on its own');
  SUB = null; rn = await call(renew, { token: TOKEN }, '/api/renew');
  ok(rn.status === 200 && rn.json.active === true && rn.json.status === 'unknown', 'Stripe unreachable never stops a paying painter early');
  rn = await call(renew, { token: 'qc1.x.y' }, '/api/renew'); ok(rn.status === 401, 'renew refuses a token that is not ours');
  // ---- 4. cancel and card, self-service
  SUB = { id: 'sub_1', status: 'active', customer: 'cus_1', current_period_end: periodEnd };
  let pt = await call(portal, { token: TOKEN }, '/api/portal');
  const pcall = calls.filter(c => /billing_portal/.test(c.url)).pop();
  ok(pt.status === 200 && pt.json.url === 'https://billing.stripe.com/p/session/test_123' && pcall.form.customer === 'cus_1' && pcall.form.return_url === 'https://chasem.app/', 'portal link for his own subscription, back to our site');
  PORTAL_FAIL = true; pt = await call(portal, { token: TOKEN }, '/api/portal'); ok(pt.status === 502 && /configuration/.test(pt.json.error), 'a portal that is not configured says so instead of hanging'); PORTAL_FAIL = false;
  // ---- 5. the welcome page gets the same thing from the session id
  SESSION = session;
  const g = res(); await sl(req('GET', null, { origin: 'https://chasem.app' }, '/api/setup-link?session=cs_test_sub1234567890'), g); const j = JSON.parse(g.body);
  ok(g.statusCode === 200 && j.paid && j.hosted && decode(j.link).settings.sending.hosted === true && j.name === "Dave's Painting", 'the welcome page button carries the same one-tap set-up');
  // ---- 6. a one-off payment (no subscription) still sets the app up, just without sending
  const one = Object.assign({}, session, { id: 'cs_test_one2345678901', mode: 'payment', subscription: null });
  const raw2 = JSON.stringify({ id: 'evt_2', type: 'checkout.session.completed', data: { object: one } });
  const r2 = res(); await wh.default(req('POST', raw2, { 'stripe-signature': sig(raw2) }), r2); const o2 = JSON.parse(r2.body);
  const em2 = calls.filter(c => c.json && c.json.subject).pop();
  ok(r2.statusCode === 200 && o2.emailed && o2.hosted === false && !decode((/https:\/\/[^\s]+/.exec(em2.json.text) || [])[0]).settings.sending, 'a one-off payment still gets the details link, with no sending on it');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
