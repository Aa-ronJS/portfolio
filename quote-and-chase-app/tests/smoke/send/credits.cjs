// The credits model: an email buys you five sends, the relay counts them, the subscription tops you to 100 a month, packs add more.
'use strict';
const { Readable } = require('node:stream'); const { createHmac } = require('node:crypto');
for (const k of ['ALLOWED_ORIGINS','RELAY_TOKEN','RELAY_TOKENS','RELAY_REVOKED','ALLOW_CLIENT_CREDS','TWILIO_FROM','TWILIO_API_KEY','TWILIO_API_SECRET']) delete process.env[k];
Object.assign(process.env, { TWILIO_ACCOUNT_SID:'ACserver', TWILIO_AUTH_TOKEN:'twtok', TWILIO_MESSAGING_SERVICE_SID:'MGserver', RESEND_API_KEY:'re_server', RESEND_FROM:'Quote & Chase <hello@qc.com.au>', STRIPE_WEBHOOK_SECRET:'whsec_test', STRIPE_SECRET_KEY:'rk_test_x', RELAY_SIGNING_SECRET:'sign_me_0123456789', RELAY_URL:'https://qc.vercel.app/api/msg', APP_URL:'https://chasem.app/app/', SUPPORT_EMAIL:'help@qc.com.au', FREE_MESSAGES:'12', INCLUDED_MESSAGES:'150', TOPUP_MESSAGES:'100', TOPUP_PRICE:'35', AUTO_TOPUP_CAP:'3', INCLUDED_MESSAGES_TWO:'250', SUBSCRIBE_URL:'https://buy.stripe.com/test_sub' });
const U = require(require('path').join(__dirname, '../../../..', 'quote-and-chase-landing') + '/api/_setup.js');
const signup = require(require('path').join(__dirname, '../../../..', 'quote-and-chase-landing') + '/api/signup.js').default;
const msg = require(require('path').join(__dirname, '../../../..', 'quote-and-chase-landing') + '/api/msg.js').default;
const renew = require(require('path').join(__dirname, '../../../..', 'quote-and-chase-landing') + '/api/renew.js').default;
const wh = require(require('path').join(__dirname, '../../../..', 'quote-and-chase-landing') + '/api/stripe-webhook.js').default;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
// a tiny fake Stripe: customers with metadata, subscriptions, and a note of every write
const DB = { customers: {}, subs: {} }; let nextCus = 1; const sent = []; const payIntents = []; let PI_STATUS = 'succeeded';
const form = (b) => Object.fromEntries(new URLSearchParams(String(b)));
globalThis.fetch = async (url, opts) => {
  const m = opts && opts.method === 'POST', body = opts && opts.body;
  if (/api\.twilio\.com/.test(url)) { sent.push({ kind: 'sms', form: form(body) }); return { ok: true, status: 200, json: async () => ({ sid: 'SM' + sent.length, status: /ScheduleType=fixed/.test(String(body)) ? 'scheduled' : 'queued' }) }; }
  if (/api\.resend\.com\/emails\/.*\/cancel/.test(url)) return { ok: true, status: 200, json: async () => ({ id: 'em1' }) };
  if (/api\.resend\.com/.test(url)) { sent.push({ kind: 'email', json: JSON.parse(body) }); return { ok: true, status: 200, json: async () => ({ id: 'em' + sent.length }) }; }
  const cm = /api\.stripe\.com\/v1\/customers\/([^?]+)$/.exec(url);
  if (cm) { const id = decodeURIComponent(cm[1]); const c = DB.customers[id]; if (!c) return { ok: false, status: 404, json: async () => ({ error: { message: 'No such customer' } }) };
    if (m) { const f = form(body); Object.keys(f).forEach(k => { const mm = /^metadata\[(.+)\]$/.exec(k); if (mm) { if (f[k] === '') delete c.metadata[mm[1]]; else c.metadata[mm[1]] = f[k]; } else c[k] = f[k]; }); }
    return { ok: true, status: 200, json: async () => c }; }
  if (/api\.stripe\.com\/v1\/customers\?/.test(url)) { const em = new URL(url).searchParams.get('email'); const hit = Object.values(DB.customers).filter(c => c.email === em); return { ok: true, status: 200, json: async () => ({ data: hit }) }; }
  if (/api\.stripe\.com\/v1\/customers$/.test(url) && m) { const f = form(body); const id = 'cus_' + (nextCus++); const c = { id, object: 'customer', email: f.email || '', name: f.name || '', metadata: {} }; Object.keys(f).forEach(k => { const mm = /^metadata\[(.+)\]$/.exec(k); if (mm) c.metadata[mm[1]] = f[k]; }); DB.customers[id] = c; return { ok: true, status: 200, json: async () => c }; }
  if (/api\.stripe\.com\/v1\/payment_intents$/.test(url) && m) { const f = form(body); payIntents.push(f); return { ok: true, status: 200, json: async () => ({ id: 'pi_' + payIntents.length, status: PI_STATUS }) }; }
  const sm = /api\.stripe\.com\/v1\/subscriptions\/([^?]+)$/.exec(url);
  if (sm) { const s = DB.subs[decodeURIComponent(sm[1])]; return s ? { ok: true, status: 200, json: async () => s } : { ok: false, status: 404, json: async () => ({ error: { message: 'No such subscription' } }) }; }
  return { ok: true, status: 200, json: async () => ({}) };
};
let ipn = 10;
function req(method, body, headers, url) { const r = Readable.from(body == null ? [] : [Buffer.from(body)]); r.method = method; r.url = url || '/api/x'; r.headers = Object.assign({ host: 'qc.vercel.app', origin: 'https://chasem.app', 'x-forwarded-for': '10.0.0.' + (ipn++) }, headers || {}); r.socket = { remoteAddress: '9.9.9.9' }; return r; }
function res() { return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; } }; }
const call = async (h, body, url) => { const r = res(); await h(req('POST', JSON.stringify(body), null, url), r); return { status: r.statusCode, json: JSON.parse(r.body || 'null') }; };
const sig = (raw) => { const t = Math.floor(Date.now() / 1000); return 't=' + t + ',v1=' + createHmac('sha256', 'whsec_test').update(t + '.').update(raw).digest('hex'); };
const decode = (link) => JSON.parse(Buffer.from(link.split('#/setup?d=j:')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
const tokenOf = (link) => decode(link).settings.sending.token;
const send1 = (tok, ch) => call(msg, { action: 'send', channel: ch || 'sms', token: tok, to: ch === 'email' ? 'c@x.com' : '0411222333', subject: 's', body: 'b' });

(async () => {
  // ---- 1. an email is the whole sign-up
  let r = await call(signup, { email: 'Dave@Example.com ', name: 'Dave Smith', trading_name: "Dave's Painting" }, '/api/signup');
  ok(r.status === 200 && r.json.ok && r.json.free === 12 && r.json.emailed, 'signing up with an email returns a set-up link and emails it: ' + JSON.stringify({ free: r.json.free, emailed: r.json.emailed }));
  const link1 = r.json.link, P = decode(link1), TOK = tokenOf(link1), pay = U.readToken(TOK, process.env.RELAY_SIGNING_SECRET);
  ok(P.settings.details.email === 'dave@example.com' && P.settings.sending.hosted === true && pay.plan === 'free' && pay.inc === 12 && pay.cus === 'cus_1', 'the link carries his details, sending on, and a free token for three jobs: ' + JSON.stringify({ plan: pay.plan, inc: pay.inc }));
  const wel = sent.find(s => s.kind === 'email'); ok(/Your app is ready/.test(wel.json.subject) && /12 messages to start/.test(wel.json.text) && !/free forever|\$0/.test(wel.json.text), 'the welcome email says what a message is and never says free forever');
  r = await call(signup, { email: 'dave@example.com' }, '/api/signup');
  ok(r.status === 200 && Object.keys(DB.customers).length === 1, 'signing up twice with the same address does not make a second account');
  r = await call(signup, { email: 'notanemail' }, '/api/signup'); ok(r.status === 400, 'a bad address is refused');

  // ---- 2. the twelve are counted, and the thirteenth is refused
  for (let i = 1; i <= 12; i++) { const s = await send1(TOK); ok(s.status === 200 && s.json.ok && s.json.left === 12 - i, 'send ' + i + ' of 12 leaves ' + (12 - i) + ': ' + JSON.stringify({ left: s.json.left })); }
  const thirteenth = await send1(TOK);
  ok(thirteenth.status === 402 && thirteenth.json.out_of_messages && /out of messages/i.test(thirteenth.json.error) && sent.filter(s => s.kind === 'sms').length === 12, 'the thirteenth is refused with 402 and nothing goes to Twilio');
  ok(DB.customers.cus_1.metadata.qc_used === '12' && DB.customers.cus_1.metadata.qc_period === 'once', 'the count lives on the Stripe customer, not in a database');

  // ---- 3. a scheduled reminder holds a message and gives it back when it is cancelled
  DB.customers.cus_1.metadata.qc_used = '0';
  const day = new Date(Date.now() + 3 * 86400000).toISOString();
  const sch = await call(msg, { action: 'schedule', channel: 'sms', token: TOK, to: '0411222333', body: 'b', send_at: day, key: 'j1' });
  ok(sch.status === 200 && sch.json.left === 11, 'booking a reminder holds one message');
  const can = await call(msg, { action: 'cancel', channel: 'sms', token: TOK, id: sch.json.id });
  ok(can.status === 200 && can.json.left === 12, 'cancelling it before it goes hands the message back');
  // ---- 4. ping reports the balance so the app can show it
  const ping = await call(msg, { action: 'ping', token: TOK });
  ok(ping.json.plan === 'free' && ping.json.included === 12 && ping.json.left === 12 && ping.json.period === 'once', 'ping tells the app where it stands: ' + JSON.stringify({ plan: ping.json.plan, left: ping.json.left }));

  // ---- 5. subscribing lifts him to 100 a month
  DB.subs.sub_9 = { id: 'sub_9', status: 'active', customer: 'cus_2', current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, items: { data: [{}] } };
  DB.customers.cus_2 = { id: 'cus_2', object: 'customer', email: 'dave@example.com', metadata: {} };
  const session = { id: 'cs_1', object: 'checkout.session', mode: 'subscription', payment_status: 'paid', status: 'complete', customer: 'cus_2', subscription: 'sub_9', client_reference_id: 'cus_1',
    customer_details: { email: 'dave@example.com', name: 'Dave Smith', phone: '+61412000000', address: { state: 'Victoria', postal_code: '3350' } }, custom_fields: [{ key: 'trading_name', type: 'text', text: { value: "Dave's Painting" } }] };
  const raw = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: session } });
  let rr = res(); await wh(req('POST', raw, { 'stripe-signature': sig(raw) }), rr); const out = JSON.parse(rr.body);
  ok(rr.statusCode === 200 && out.hosted, 'subscribing mints a new link with sending on');
  const wel2 = sent.filter(s => s.kind === 'email').pop(); const PAID = tokenOf((/https:\/\/[^\s]+/.exec(wel2.json.text) || [])[0]); const pp = U.readToken(PAID, process.env.RELAY_SIGNING_SECRET);
  ok(pp.plan === 'paid' && pp.inc === 150 && pp.cus === 'cus_2', 'the paid token carries 150 a month: ' + JSON.stringify({ plan: pp.plan, inc: pp.inc }));
  ok(DB.customers.cus_1.metadata.qc_upgraded_to === 'cus_2', 'the free record is marked as upgraded so the list stays clean');
  const p1 = await call(msg, { action: 'ping', token: PAID }); ok(p1.json.included === 150 && p1.json.left === 150 && /^\d{4}-\d{2}$/.test(p1.json.period), 'the paid account starts the month with 150: ' + JSON.stringify({ left: p1.json.left, period: p1.json.period }));

  // ---- 6. a top-up pack adds messages to the same account
  const top = { id: 'cs_2', object: 'checkout.session', mode: 'payment', payment_status: 'paid', status: 'complete', customer: 'cus_2', client_reference_id: 'cus_2', metadata: { qc: 'topup' }, customer_details: { email: 'dave@example.com' } };
  const raw2 = JSON.stringify({ id: 'evt_2', type: 'checkout.session.completed', data: { object: top } });
  rr = res(); await wh(req('POST', raw2, { 'stripe-signature': sig(raw2) }), rr); const o2 = JSON.parse(rr.body);
  ok(rr.statusCode === 200 && o2.topped_up === 100, 'a top-up pack credits 100 messages: ' + rr.body);
  const p2 = await call(msg, { action: 'ping', token: PAID }); ok(p2.json.included === 250 && p2.json.left === 250, 'the app sees 250 after the top-up');
  // ---- 7. the month rolls over and the count starts again
  // last month: 73 used and a top-up already spent, with nothing parked for the month ahead
  DB.customers.cus_2.metadata = { qc_used: '73', qc_period: '2020-01', qc_extra: '100' };
  const p3 = await call(msg, { action: 'ping', token: PAID });
  ok(p3.json.used === 0 && p3.json.left === 150, 'a new month resets what has been used and last month\'s top-up does not roll over');
  DB.customers.cus_2.metadata = { qc_extra_next: '100' };
  const p4 = await call(msg, { action: 'ping', token: PAID });
  ok(p4.json.included === 250 && p4.json.left === 250, 'a pack bought before the first send of a month is waiting when the month starts');
  // ---- 8. renew reports the balance too, and a cancelled subscription stops
  DB.customers.cus_2.metadata = {};
  const rn = await call(renew, { token: PAID }, '/api/renew');
  ok(rn.json.active && rn.json.plan === 'paid' && rn.json.included === 150 && rn.json.left === 150 && U.readToken(rn.json.token, process.env.RELAY_SIGNING_SECRET).inc === 150, 'renew hands back a paid token and the balance');
  const rf = await call(renew, { token: TOK }, '/api/renew');
  ok(rf.json.active && rf.json.plan === 'free' && rf.json.status === 'free' && rf.json.included === 12, 'a free account renews as free, with its twelve');
  DB.subs.sub_9.status = 'canceled';
  const rc = await call(renew, { token: PAID }, '/api/renew'); ok(rc.json.active === false && !rc.json.token, 'cancelling stops it, as before');
  // ---- 9. one tap buys a pack on the card already on file
  const topup = require(require('path').join(__dirname, '../../../..', 'quote-and-chase-landing') + '/api/topup.js').default;
  DB.subs.sub_9.status = 'active'; DB.subs.sub_9.default_payment_method = 'pm_1'; DB.customers.cus_2.metadata = {};
  let tu = await call(topup, { token: PAID }, '/api/topup');
  const pi = payIntents[payIntents.length - 1];
  ok(tu.status === 200 && tu.json.ok && tu.json.messages === 100 && tu.json.charged === 35 && tu.json.included === 250, 'one tap charges $35 and adds 100 messages: ' + JSON.stringify({ charged: tu.json.charged, included: tu.json.included }));
  ok(pi && pi.amount === '3500' && pi.currency === 'aud' && pi.customer === 'cus_2' && pi.payment_method === 'pm_1' && pi.off_session === 'true' && pi.confirm === 'true', 'the charge is off-session against his own card, no browser: ' + JSON.stringify({ amount: pi && pi.amount, off: pi && pi.off_session }));
  // a card that needs him in front of it says so instead of failing quietly
  PI_STATUS = 'requires_action';
  tu = await call(topup, { token: PAID }, '/api/topup');
  ok(tu.status === 402 && tu.json.needs_card === true, 'a card needing authorisation comes back as needs_card, not a mystery');
  PI_STATUS = 'succeeded';
  DB.subs.sub_9.default_payment_method = ''; DB.customers.cus_2.invoice_settings = {};
  tu = await call(topup, { token: PAID }, '/api/topup');
  ok(tu.status === 402 && tu.json.needs_card === true && tu.json.price === 35, 'no card on file: it asks for one rather than pretending');
  DB.subs.sub_9.default_payment_method = 'pm_1';
  // ---- 10. the switch: run out and it keeps going, up to the cap
  DB.customers.cus_2.metadata = { qc_period: new Date().toISOString().slice(0, 7), qc_used: '150' };
  let ranOut = await send1(PAID);
  ok(ranOut.status === 402 && ranOut.json.out_of_messages, 'with the switch off, running out stops the sending');
  await call(topup, { token: PAID, auto: true }, '/api/topup');
  ok(DB.customers.cus_2.metadata.qc_auto === '1', 'turning the switch on is not a purchase');
  const before = payIntents.length;
  ranOut = await send1(PAID);
  ok(ranOut.status === 200 && ranOut.json.ok && payIntents.length === before + 1, 'with the switch on it buys a pack and the message goes, in one call');
  ok(DB.customers.cus_2.metadata.qc_auto_count === '1' && +DB.customers.cus_2.metadata.qc_extra === 100, 'the pack is counted so it can never run away');
  DB.customers.cus_2.metadata.qc_auto_count = '3'; DB.customers.cus_2.metadata.qc_used = '250'; DB.customers.cus_2.metadata.qc_extra = '100';
  const before2 = payIntents.length;
  ranOut = await send1(PAID);
  ok(ranOut.status === 402 && payIntents.length === before2, 'at the cap it stops buying and asks him instead');
  await call(topup, { token: PAID, auto: false }, '/api/topup');
  ok(!DB.customers.cus_2.metadata.qc_auto, 'and he can turn it off again');
  // ---- 11. the second phone
  const seat = require(require('path').join(__dirname, '../../../..', 'quote-and-chase-landing') + '/api/seat.js').default;
  let sr = await call(seat, { token: PAID }, '/api/seat');
  ok(sr.status === 402 && sr.json.needs_upgrade === true && sr.json.seats === 1, 'a one-phone plan is told it is a one-phone plan, not given a second token');
  // buy the two-phone plan
  DB.subs.sub_10 = { id: 'sub_10', status: 'active', customer: 'cus_3', current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, items: { data: [{}] } };
  DB.customers.cus_3 = { id: 'cus_3', object: 'customer', email: 'kelly@example.com', metadata: {} };
  const two = Object.assign({}, session, { id: 'cs_3', customer: 'cus_3', subscription: 'sub_10', client_reference_id: '', metadata: { qc_plan: 'two' },
    customer_details: { email: 'kelly@example.com', name: 'Kelly Tester', phone: '+61411999888', address: { state: 'SA', postal_code: '5000' } } });
  const raw3 = JSON.stringify({ id: 'evt_3', type: 'checkout.session.completed', data: { object: two } });
  let rr3 = res(); await wh(req('POST', raw3, { 'stripe-signature': sig(raw3) }), rr3); const o3 = JSON.parse(rr3.body);
  ok(rr3.statusCode === 200 && o3.seats === 2 && o3.included === 250, 'the two-phone plan mints a bigger allowance: ' + JSON.stringify({ seats: o3.seats, included: o3.included }));
  const wel3 = sent.filter(s2 => s2.kind === 'email').pop(); const TWO = tokenOf((/https:\/\/[^\s]+/.exec(wel3.json.text) || [])[0]);
  const tp = U.readToken(TWO, process.env.RELAY_SIGNING_SECRET);
  ok(tp.seats === 2 && tp.seat === 1 && tp.inc === 250, 'phone one holds seat 1 of 2');
  sr = await call(seat, { token: TWO }, '/api/seat');
  ok(sr.status === 200 && sr.json.seat === 2 && /#\/setup\?d=j:/.test(sr.json.link), 'the first phone can set the second one up, with no forms and no second sign-up');
  const SEAT2 = tokenOf(sr.json.link), sp = U.readToken(SEAT2, process.env.RELAY_SIGNING_SECRET);
  ok(sp.seat === 2 && sp.seats === 2 && sp.cus === 'cus_3' && sp.sub === 'sub_10' && sp.name === tp.name, 'the second token is the same account and the same business name');
  ok(decode(sr.json.link).settings.details.trading_name === tp.name && !decode(sr.json.link).jobs.length, 'the second phone gets the business, not the first phone\'s jobs');
  ok(DB.customers.cus_3.metadata.qc_seat2, 'the account records that a second phone was set up');
  // both phones draw on the one pool
  DB.customers.cus_3.metadata = {};
  let a1 = await send1(TWO), a2 = await send1(SEAT2);
  ok(a1.json.left === 249 && a2.json.left === 248, 'both phones spend from the same 250: ' + JSON.stringify([a1.json.left, a2.json.left]));
  const ping2 = await call(msg, { action: 'ping', token: SEAT2 });
  ok(ping2.json.seats === 2 && ping2.json.seat === 2 && ping2.json.included === 250, 'the second phone knows which seat it is');
  sr = await call(seat, { token: SEAT2 }, '/api/seat');
  ok(sr.status === 403, 'the second phone cannot mint a third');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
