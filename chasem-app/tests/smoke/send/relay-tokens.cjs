// Unit test for RELAY_TOKENS (hosted sending) in chasem-landing/api/msg.js. Run: node relay-tokens.cjs
// Plain node, no deps. Requires the ESM handler (node >= 22.12 require(esm)), stubs global fetch and the env.
'use strict';
const { Readable } = require('node:stream');
for (const k of ['ALLOWED_ORIGINS', 'MSG_PER_IP_LIMIT', 'ALLOW_CLIENT_CREDS', 'RELAY_TOKEN', 'RELAY_TOKENS', 'TWILIO_API_KEY', 'TWILIO_FROM', 'TWILIO_API_SECRET']) delete process.env[k];
Object.assign(process.env, { TWILIO_ACCOUNT_SID: 'ACserver', TWILIO_AUTH_TOKEN: 'servertok', TWILIO_MESSAGING_SERVICE_SID: 'MGserver', RESEND_API_KEY: 're_server', RESEND_FROM: 'Chasem <hello@chasem.app>' });
delete globalThis.__relayFetch;
const handler = require(require('path').join(__dirname, '../../../..', 'chasem-landing') + '/api/msg.js').default;

let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const calls = [];
globalThis.fetch = async (url, opts) => {
  const body = opts && opts.body; let json = {};
  const rec = { url, opts, form: null, json: null };
  if (/api\.twilio\.com/.test(url)) { rec.form = Object.fromEntries(new URLSearchParams(String(body))); json = /Status=canceled/.test(body) ? { sid: 'SM1', status: 'canceled' } : { sid: 'SM' + (calls.length + 1), status: /ScheduleType=fixed/.test(body) ? 'scheduled' : 'queued' }; }
  else if (/api\.resend\.com\/emails\/.*\/cancel/.test(url)) json = { id: 'em1', object: 'email' };
  else if (/api\.resend\.com\/emails/.test(url)) { rec.json = body ? JSON.parse(body) : null; json = { id: 'em' + (calls.length + 1) }; }
  calls.push(rec);
  return { ok: true, status: 200, json: async () => json };
};
let ipn = 10;
function req(obj) { const r = Readable.from([Buffer.from(JSON.stringify(obj))]); r.method = 'POST'; r.headers = { origin: 'https://chasem.app', 'x-forwarded-for': '10.0.0.' + (ipn++) }; r.socket = { remoteAddress: '9.9.9.9' }; return r; }
function res() { return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; } }; }
async function run(body) { const r = res(); await handler(req(body), r); return { status: r.statusCode, json: JSON.parse(r.body || 'null') }; }
const last = () => calls[calls.length - 1];
const day = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const soon = () => new Date(Date.now() + 3 * 86400000).toISOString();
const ENDED = 'Hosted sending has ended for this account';
const FROM_ADDR = 'hello@chasem.app';

(async () => {
  let r;
  // ---------- 1. legacy single RELAY_TOKEN, no RELAY_TOKENS: unchanged
  console.log('-- legacy RELAY_TOKEN');
  process.env.RELAY_TOKEN = 'legacy-secret';
  r = await run({ action: 'ping', token: 'wrong' }); ok(r.status === 401 && r.json.error === 'Relay token missing or wrong', 'wrong token -> 401 same wording');
  r = await run({ action: 'ping' }); ok(r.status === 401, 'missing token -> 401');
  r = await run({ action: 'ping', token: 'legacy-secret' });
  ok(r.status === 200 && r.json.ok && r.json.email === true && r.json.sms === true && r.json.token_required === true, 'ping with the legacy token -> ok/sms/email/token_required as before');
  ok(!('hosted' in r.json) && !('until' in r.json) && !('name' in r.json), 'legacy ping carries no hosted/until/name keys');
  r = await run({ action: 'send', channel: 'email', token: 'legacy-secret', to: 'c@x.com', subject: 'Quote Q1', body: 'hi', reply_to: 'painter@own.com' });
  ok(r.status === 200 && r.json.ok && r.json.id, 'legacy email send -> ok');
  ok(last().json.from === 'Chasem <hello@chasem.app>', 'legacy From is RESEND_FROM verbatim (' + last().json.from + ')');
  ok(last().json.reply_to === 'painter@own.com', 'legacy Reply-To is the request reply_to');
  r = await run({ action: 'send', channel: 'email', token: 'legacy-secret', to: 'c@x.com', subject: 's', body: 'b' });
  ok(!('reply_to' in last().json), 'legacy email without reply_to sets no Reply-To');
  r = await run({ action: 'send', channel: 'sms', token: 'legacy-secret', to: '0412 345 678', body: 'Text from Dave' });
  ok(r.status === 200 && last().form.To === '+61412345678' && last().form.Body === 'Text from Dave' && last().form.MessagingServiceSid === 'MGserver', 'legacy SMS send unchanged');
  r = await run({ action: 'schedule', channel: 'sms', token: 'legacy-secret', to: '0412345678', body: 'chase', send_at: soon(), key: 'job1|chase|v1' });
  const id1 = r.json.id; ok(r.status === 200 && r.json.send_at, 'legacy schedule -> id ' + id1);
  r = await run({ action: 'schedule', channel: 'sms', token: 'legacy-secret', to: '0412345678', body: 'chase', send_at: soon(), key: 'job1|chase|v1' });
  ok(r.json.id === id1 && r.json.reused === true, 'legacy idempotency: same key -> same id, reused: true');
  r = await run({ action: 'cancel', channel: 'sms', token: 'legacy-secret', id: id1 }); ok(r.status === 200 && r.json.cancelled === true, 'legacy cancel');
  delete process.env.RELAY_TOKEN;
  r = await run({ action: 'ping' }); ok(r.status === 200 && r.json.token_required === false, 'no RELAY_TOKEN and no RELAY_TOKENS -> open relay as before (token_required false)');
  process.env.ALLOW_CLIENT_CREDS = '1'; delete process.env.RESEND_API_KEY;
  r = await run({ action: 'send', channel: 'email', to: 'c@x.com', subject: 's', body: 'b', creds: { resend_key: 're_phone', resend_from: 'Dave <dave@own.com>' } });
  ok(r.status === 200 && last().opts.headers.Authorization === 'Bearer re_phone' && last().json.from === 'Chasem <hello@chasem.app>', 'legacy ALLOW_CLIENT_CREDS: phone key fills the gap, env From still wins (as today)');
  process.env.RESEND_API_KEY = 're_server'; delete process.env.ALLOW_CLIENT_CREDS;

  // ---------- 2. mapped token: From / Reply-To
  console.log('-- mapped token');
  process.env.RELAY_TOKEN = 'legacy-secret';
  const MAP = {
    'qc_dave': { name: "Dave's Painting", reply_to: 'dave@example.com', until: day(90), disabled: false },
    'qc_sam': { name: 'Sam Paints', reply_to: 'sam@example.com', until: day(90) },
    'qc_off': { name: 'Old Mate', reply_to: 'old@example.com', until: day(90), disabled: true },
    'qc_past': { name: 'Past Painter', reply_to: 'past@example.com', until: day(-1) },
    'qc_today': { name: 'Today Painter', reply_to: 't@example.com', until: day(0) },
    'qc_iso_past': { name: 'ISO Past', reply_to: 'i@example.com', until: new Date(Date.now() - 60000).toISOString() },
    'qc_noend': { name: 'Open Ended' },
    'qc_evil': { name: 'Bad\r\nBcc: x@y.com "quoted" \\slash', reply_to: 'e@example.com' },
  };
  process.env.RELAY_TOKENS = JSON.stringify(MAP);
  r = await run({ action: 'send', channel: 'email', token: 'qc_dave', to: 'client@x.com', subject: 'Quote Q7 from Dave\'s Painting', body: 'Hi there', reply_to: 'dave-current@example.com' });
  ok(r.status === 200 && r.json.ok, 'mapped email send -> ok');
  ok(last().json.from === `"Dave's Painting" <${FROM_ADDR}>`, 'From = "<name>" <verified sender> (' + last().json.from + ')');
  ok(last().json.reply_to === 'dave-current@example.com', 'Reply-To = request reply_to when the app sends one');
  ok(last().opts.headers.Authorization === 'Bearer re_server', 'server Resend key used');
  r = await run({ action: 'send', channel: 'email', token: 'qc_dave', to: 'client@x.com', subject: 's', body: 'b' });
  ok(last().json.reply_to === 'dave@example.com', 'Reply-To falls back to the entry reply_to when the request has none');
  r = await run({ action: 'test', channel: 'email', token: 'qc_sam', to: 'sam@example.com' });
  ok(r.status === 200 && last().json.from === `"Sam Paints" <${FROM_ADDR}>` && last().json.reply_to === 'sam@example.com', 'test action email also carries the hosted From/Reply-To');
  r = await run({ action: 'schedule', channel: 'email', token: 'qc_dave', to: 'c@x.com', subject: 's', body: 'b', send_at: soon(), key: 'j9|f1|v1' });
  ok(r.status === 200 && last().json.scheduled_at && last().json.from.indexOf("Dave's Painting\"") === 1, 'scheduled email carries the hosted From');
  r = await run({ action: 'send', channel: 'email', token: 'qc_noend', to: 'c@x.com', subject: 's', body: 'b' });
  ok(r.status === 200 && last().json.from === `"Open Ended" <${FROM_ADDR}>` && !('reply_to' in last().json), 'entry without until/reply_to: sends, no Reply-To, no expiry');
  r = await run({ action: 'send', channel: 'email', token: 'qc_evil', to: 'c@x.com', subject: 's', body: 'b' });
  ok(!/[\r\n"\\]/.test(last().json.from.replace(/^"|" </g, '')) && last().json.from.indexOf('Bcc: x@y.com') > 0 && last().json.from.indexOf('\n') < 0, 'display name is flattened: no CR/LF, quotes or backslashes (' + JSON.stringify(last().json.from) + ')');
  process.env.RESEND_FROM = 'bare@chasem.app';
  r = await run({ action: 'send', channel: 'email', token: 'qc_dave', to: 'c@x.com', subject: 's', body: 'b' });
  ok(last().json.from === `"Dave's Painting" <bare@chasem.app>`, 'bare RESEND_FROM address gets the display name too');
  process.env.RESEND_FROM = 'Chasem <hello@chasem.app>';
  // SMS: nothing appended, server Twilio used, phone creds ignored even when ALLOW_CLIENT_CREDS=1
  process.env.ALLOW_CLIENT_CREDS = '1';
  r = await run({ action: 'send', channel: 'sms', token: 'qc_dave', to: '0400 000 001', body: 'Quote sent. Dave', creds: { twilio_sid: 'ACphone', twilio_token: 'phonetok', twilio_service: 'MGphone', resend_key: 're_phone' } });
  ok(r.status === 200 && last().form.Body === 'Quote sent. Dave' && last().form.MessagingServiceSid === 'MGserver' && /ACserver/.test(last().url), 'mapped SMS: body untouched, server Twilio account and service used');
  r = await run({ action: 'send', channel: 'email', token: 'qc_dave', to: 'c@x.com', subject: 's', body: 'b', creds: { resend_key: 're_phone', resend_from: 'Dave <dave@own.com>' } });
  ok(last().opts.headers.Authorization === 'Bearer re_server' && /hello@chasem\.app/.test(last().json.from), 'mapped token ignores creds in the body even with ALLOW_CLIENT_CREDS=1');
  delete process.env.ALLOW_CLIENT_CREDS;
  // idempotency, schedule, cancel as today, kept apart per token
  r = await run({ action: 'schedule', channel: 'sms', token: 'qc_dave', to: '0400000001', body: 'chase 1', send_at: soon(), key: 'job1|chase|v1' });
  const idD = r.json.id; ok(r.status === 200 && idD && r.json.send_at, 'mapped schedule -> id ' + idD);
  r = await run({ action: 'schedule', channel: 'sms', token: 'qc_dave', to: '0400000001', body: 'chase 1', send_at: soon(), key: 'job1|chase|v1' });
  ok(r.json.id === idD && r.json.reused === true, 'mapped idempotency: same key -> same id, reused: true');
  r = await run({ action: 'schedule', channel: 'sms', token: 'qc_sam', to: '0400000002', body: 'chase 1', send_at: soon(), key: 'job1|chase|v1' });
  ok(r.status === 200 && r.json.id !== idD && !r.json.reused, 'same key from another painter is a new message, not a reuse (' + r.json.id + ')');
  r = await run({ action: 'schedule', channel: 'sms', token: 'legacy-secret', to: '0400000003', body: 'chase 1', send_at: soon(), key: 'job1|chase|v1' });
  ok(r.json.id === id1 && r.json.reused === true, 'legacy key space untouched by mapped tokens (still reuses ' + id1 + ')');
  r = await run({ action: 'cancel', channel: 'sms', token: 'qc_dave', id: idD }); ok(r.status === 200 && r.json.cancelled === true && last().form.Status === 'canceled', 'mapped cancel -> Twilio Status=canceled');
  r = await run({ action: 'cancel', channel: 'email', token: 'qc_dave', id: 'em5' }); ok(r.status === 200 && r.json.cancelled === true && /\/emails\/em5\/cancel$/.test(last().url), 'mapped email cancel');
  r = await run({ action: 'send', channel: 'sms', token: 'qc_dave', to: '0400000001', body: 'x'.repeat(1601) }); ok(r.status === 400 && /too long/.test(r.json.error), 'mapped token keeps the length check');

  // ---------- 3. disabled / expired
  console.log('-- disabled and expired');
  const before = calls.length;
  r = await run({ action: 'send', channel: 'email', token: 'qc_off', to: 'c@x.com', subject: 's', body: 'b' });
  ok(r.status === 403 && r.json.ok === false && r.json.error === ENDED, 'disabled token -> 403 "' + r.json.error + '"');
  ok(r.json.hosted === true && r.json.name === 'Old Mate' && r.json.until === MAP.qc_off.until, '403 body also carries hosted/name/until for the app');
  r = await run({ action: 'send', channel: 'sms', token: 'qc_past', to: '0400000001', body: 'b' });
  ok(r.status === 403 && r.json.error === ENDED, 'expired (until yesterday) -> 403 same wording');
  r = await run({ action: 'schedule', channel: 'sms', token: 'qc_past', to: '0400000001', body: 'b', send_at: soon(), key: 'k' });
  ok(r.status === 403, 'expired: schedule refused too');
  r = await run({ action: 'cancel', channel: 'sms', token: 'qc_past', id: 'SM1' });
  ok(r.status === 403, 'expired: cancel refused too');
  r = await run({ action: 'send', channel: 'sms', token: 'qc_iso_past', to: '0400000001', body: 'b' });
  ok(r.status === 403 && r.json.error === ENDED, 'until as a past ISO instant -> 403');
  r = await run({ action: 'ping', token: 'qc_off' });
  ok(r.status === 403 && r.json.error === ENDED && r.json.hosted === true, 'ping on a disabled token -> 403 with hosted: true');
  ok(calls.length === before, 'no provider call was made for any refused request');
  r = await run({ action: 'send', channel: 'sms', token: 'qc_today', to: '0400000001', body: 'b' });
  ok(r.status === 200, 'until = today (UTC date) is still inside the window');

  // ---------- 4. ping
  console.log('-- ping');
  r = await run({ action: 'ping', token: 'qc_dave' });
  ok(r.status === 200 && r.json.ok === true && r.json.hosted === true && r.json.until === MAP.qc_dave.until && r.json.name === "Dave's Painting", 'ping mapped -> { ok, hosted: true, until, name } ' + JSON.stringify(r.json));
  ok(r.json.sms === true && r.json.sms_schedule === true && r.json.email === true && r.json.client_creds === false && r.json.token_required === true, 'ping mapped keeps the capability flags');
  r = await run({ action: 'ping', token: 'qc_noend' });
  ok(r.json.hosted === true && r.json.until === null && r.json.name === 'Open Ended', 'ping mapped without until -> until: null');
  r = await run({ action: 'ping', token: 'legacy-secret' });
  ok(r.status === 200 && !('hosted' in r.json), 'ping with the legacy token while RELAY_TOKENS is set -> no hosted key');

  // ---------- 5. gate edge cases
  console.log('-- gate');
  r = await run({ action: 'ping', token: 'qc_nobody' }); ok(r.status === 401, 'unmapped, non-legacy token -> 401');
  r = await run({ action: 'ping', token: 'constructor' }); ok(r.status === 401, 'prototype key as token -> 401 (own-property lookup)');
  r = await run({ action: 'ping', token: { toString() { return 'qc_dave'; } } }); ok(r.status === 401, 'non-string token -> 401');
  delete process.env.RELAY_TOKEN;
  r = await run({ action: 'ping' }); ok(r.status === 401, 'RELAY_TOKENS set but no RELAY_TOKEN: missing token -> 401 (not an open relay)');
  r = await run({ action: 'ping', token: 'qc_dave' }); ok(r.status === 200 && r.json.hosted === true && r.json.token_required === true, 'RELAY_TOKENS alone: mapped token works, token_required true');
  process.env.RELAY_TOKEN = 'legacy-secret';
  process.env.RELAY_TOKENS = '{not json';
  r = await run({ action: 'ping', token: 'qc_dave' }); ok(r.status === 401, 'malformed RELAY_TOKENS: mapped token no longer recognised -> 401');
  r = await run({ action: 'ping', token: 'legacy-secret' }); ok(r.status === 200 && !('hosted' in r.json), 'malformed RELAY_TOKENS: legacy token still works');
  process.env.RELAY_TOKENS = JSON.stringify(MAP);
  r = await run({ action: 'ping', token: 'qc_dave' }); ok(r.json.hosted === true, 'map is re-read when the env value changes');

  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ', ' + fails + ' FAILED' : ''));
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
