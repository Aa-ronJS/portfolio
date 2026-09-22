// Exercises api/msg.js against mocked Twilio and Resend. Run: node tools/msg-relay-test.mjs
import handler from '../api/msg.js';
import { Readable } from 'node:stream';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const calls = [];
globalThis.__relayFetch = async (url, opts) => {
  calls.push({ url, opts });
  const body = opts && opts.body; let j = {};
  if (/api\.twilio\.com/.test(url)) { if (/Status=canceled/.test(body)) j = { sid: 'SM1', status: 'canceled' }; else j = { sid: 'SM' + calls.length, status: /ScheduleType=fixed/.test(body) ? 'scheduled' : 'queued' }; }
  else if (/api\.resend\.com\/emails\/.*\/cancel/.test(url)) j = { id: 'em1', object: 'email' };
  else if (/api\.resend\.com\/emails/.test(url)) j = { id: 'em' + calls.length };
  return { ok: true, status: 200, json: async () => j };
};
function req(body, origin = 'https://chasem.app', method = 'POST') { const r = Readable.from([Buffer.from(JSON.stringify(body))]); r.method = method; r.headers = { origin, 'x-forwarded-for': '1.1.1.1' }; r.socket = { remoteAddress: '1.1.1.1' }; return r; }
function res() { const o = { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; } }; return o; }
async function run(body, origin) { const r = res(); await handler(req(body, origin), r); return { status: r.statusCode, json: r.body ? JSON.parse(r.body) : null, headers: r.headers }; }
const creds = { twilio_sid: 'ACxxx', twilio_token: 'tok', twilio_service: 'MGxxx', resend_key: 're_xxx', resend_from: 'Sam <sam@example.com>' };
// 1. without ALLOW_CLIENT_CREDS, client creds are ignored
delete process.env.ALLOW_CLIENT_CREDS; let r = await run({ action: 'send', channel: 'sms', to: '0411222333', body: 'hi', creds });
ok(r.status === 400 && /Twilio/.test(r.json.error) && calls.length === 0, 'client creds ignored unless ALLOW_CLIENT_CREDS=1 (no Twilio call made): ' + r.json.error);
process.env.ALLOW_CLIENT_CREDS = '1';
// 2. CORS
r = await run({ action: 'ping', creds }, 'https://evil.example'); ok(r.status === 403, 'unknown origin refused');
r = await run({ action: 'ping', creds }); ok(r.status === 200 && r.json.sms && r.json.email && r.headers['Access-Control-Allow-Origin'] === 'https://chasem.app', 'ping reports channels ready, CORS header set');
// 3. SMS send: E.164 conversion and messaging service
calls.length = 0; r = await run({ action: 'send', channel: 'sms', to: '0411 222 333', body: 'Hi Jane', creds });
ok(r.status === 200 && r.json.id && /To=%2B61411222333/.test(calls[0].opts.body) && /MessagingServiceSid=MGxxx/.test(calls[0].opts.body) && /Basic /.test(calls[0].opts.headers.Authorization), 'SMS sent via Twilio with +61 number and messaging service');
// 4. SMS schedule: fixed schedule with SendAt; too-soon falls back to immediate; too-far rejected
calls.length = 0; const in3d = new Date(Date.now() + 3 * 86400000).toISOString(); r = await run({ action: 'schedule', channel: 'sms', to: '0411222333', body: 'nudge', send_at: in3d, creds });
ok(r.status === 200 && r.json.send_at && /ScheduleType=fixed/.test(calls[0].opts.body) && /SendAt=/.test(calls[0].opts.body), 'SMS scheduled with Twilio fixed schedule');
calls.length = 0; r = await run({ action: 'schedule', channel: 'sms', to: '0411222333', body: 'now', send_at: new Date(Date.now() + 60000).toISOString(), creds }); ok(r.status === 200 && !/ScheduleType/.test(calls[0].opts.body), 'schedule inside 15 minutes sends immediately');
r = await run({ action: 'schedule', channel: 'sms', to: '0411222333', body: 'far', send_at: new Date(Date.now() + 40 * 86400000).toISOString(), creds }); ok(r.status === 400 && /35 days/.test(r.json.error), 'schedule beyond 35 days rejected');
// 5. cancel
calls.length = 0; r = await run({ action: 'cancel', channel: 'sms', id: 'SM1', creds }); ok(r.status === 200 && r.json.cancelled && /Messages\/SM1\.json/.test(calls[0].url) && /Status=canceled/.test(calls[0].opts.body), 'SMS cancel posts Status=canceled');
// 6. email with attachment and scheduled email
calls.length = 0; r = await run({ action: 'send', channel: 'email', to: 'jane@example.com', subject: 'Quote Q-1', body: 'Hi', attachments: [{ filename: 'Q-1.pdf', content: 'JVBERi0=' }], creds });
let sent = JSON.parse(calls[0].opts.body); ok(r.status === 200 && sent.from === creds.resend_from && sent.to[0] === 'jane@example.com' && sent.attachments[0].filename === 'Q-1.pdf' && /Bearer re_xxx/.test(calls[0].opts.headers.Authorization), 'email sent via Resend with PDF attachment');
calls.length = 0; r = await run({ action: 'schedule', channel: 'email', to: 'jane@example.com', subject: 'Follow up', body: 'Hi', send_at: in3d, creds }); sent = JSON.parse(calls[0].opts.body); ok(r.status === 200 && sent.scheduled_at === new Date(in3d).toISOString(), 'email scheduled with scheduled_at');
calls.length = 0; r = await run({ action: 'cancel', channel: 'email', id: 'em1', creds }); ok(r.status === 200 && /emails\/em1\/cancel/.test(calls[0].url), 'email cancel hits /emails/{id}/cancel');
// 7. env creds win, no body creds needed
process.env.TWILIO_ACCOUNT_SID = 'ACenv'; process.env.TWILIO_AUTH_TOKEN = 't'; process.env.TWILIO_MESSAGING_SERVICE_SID = 'MGenv'; calls.length = 0;
r = await run({ action: 'send', channel: 'sms', to: '+61400000000', body: 'x' }); ok(r.status === 200 && /ACenv/.test(calls[0].url), 'environment credentials used when set');
// 8. validation
r = await run({ action: 'send', channel: 'sms', to: '', body: '', creds }); ok(r.status === 400, 'missing fields rejected');
r = await run({ action: 'nope', creds }); ok(r.status === 400 && /Unknown action/.test(r.json.error), 'unknown action rejected');
console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
