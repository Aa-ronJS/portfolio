// Inbound routing against real Postgres and a faked Twilio/Resend, exercising the cases that actually bite:
// two painters, the same customer, a duplicate webhook, and a reply that is not "yes".
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';
import { createHmac } from 'node:crypto';

const db = new PGlite();
// form bodies encode a space as '+', so decodeURIComponent alone leaves the text unreadable
const form = (b) => decodeURIComponent(String(b || '').replace(/\+/g, ' '));
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, {
  TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 'twtok', TWILIO_MESSAGING_SERVICE_SID: 'MGtest',
  RESEND_API_KEY: 're_test', RESEND_FROM: 'Quote and Chase <help@chasem.app>',
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', SITE_URL: 'https://chasem.app',
});
const out = [];
globalThis.__relayFetch = async (url, opt) => {
  out.push({ url: String(url), body: String(opt && opt.body || '') });
  return { ok: true, status: 200, json: async () => ({ sid: 'SM' + out.length, id: 'em' + out.length }), text: async () => '{}' };
};

const { migrate, q } = await import('../api/_db.js');
const store = await import('../api/_store.js');
const mod = await import('../api/sms-in.js');
await migrate();

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

// two painters, so "which painter" is a real question and not a default
await store.ensurePainter({ cus: 'cus_dave', name: "Dave's Painting" }, { phone: '0412 000 111', reply_to: 'dave@example.com', state: 'SA' });
await store.ensurePainter({ cus: 'cus_sam', name: "Sam the Painter" }, { phone: '0412 000 222', reply_to: 'sam@example.com', state: 'VIC' });
await q(`insert into job_index (painter_id, job_id, client_name, client_phone, quote_no, total_cents, status, sent_at)
  values ('cus_dave','jD','Jane Client','+61411222333','Q-1001',269500,'quoted', now() - interval '2 days'),
         ('cus_sam','jS','Margaret','+61411999888','Q-2001',150000,'quoted', now())`);

function post(params) {
  const raw = new URLSearchParams(params).toString();
  const req = Readable.from([Buffer.from(raw)]);
  req.method = 'POST'; req.url = '/api/sms-in';
  const sig = createHmac('sha1', 'twtok').update('https://chasem.app/api/sms-in' + Object.keys(params).sort().map(k => k + params[k]).join('')).digest('base64');
  req.headers = { host: 'chasem.app', 'x-forwarded-proto': 'https', 'x-twilio-signature': sig };
  process.env.TWILIO_INBOUND_URL = 'https://chasem.app/api/sms-in';
  const res = { statusCode: 0, body: '', setHeader() {}, end(b) { this.body = b || ''; } };
  return mod.default(req, res).then(() => res);
}

// 1. YES from Jane reaches DAVE, not Sam
out.length = 0;
let r = await post({ From: '+61411222333', Body: 'Yes', MessageSid: 'SMin1' });
ok(/that's accepted/i.test(r.body) && /\/y\//.test(r.body), "Jane's YES is accepted and answered with a booking link");
const toDave = out.find(o => /Messages\.json/.test(o.url) && /61412000111/.test(form(o.body)));
ok(!!toDave, 'Dave is told, on his own number');
ok(!out.some(o => /61412000222/.test(form(o.body))), 'Sam is not told about a customer who is not his');
ok(/Jane Client accepted Q-1001/.test(form((toDave || {}).body)), 'and told who and which quote: ' + form((toDave || {}).body).split('Body=')[1].slice(0, 80));
ok((await q("select status from job_index where job_id='jD'")).rows[0].status === 'accepted', 'the job is marked accepted on the server, so he does not have to remember to');

// 2. the same webhook delivered twice must not accept twice
out.length = 0;
r = await post({ From: '+61411222333', Body: 'Yes', MessageSid: 'SMin1' });
ok(out.length === 0 && r.body === '<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 'a retried webhook is ignored rather than accepted again');

// 3. a reply that is not yes goes to the painter as-is
out.length = 0;
r = await post({ From: '+61411999888', Body: 'can you do the ceilings too?', MessageSid: 'SMin2' });
ok(/passed that on to Sam the Painter/.test(r.body), 'a question is passed on, and the customer is told who has it');
const toSam = out.find(o => /61412000222/.test(form(o.body)));
ok(toSam && /Margaret \(Q-2001\) replied: can you do the ceilings too\?/.test(form(toSam.body)), 'Sam gets the words, with the customer and the quote');
ok(out.some(o => /api\.resend\.com/.test(o.url)), 'and a copy by email, because a tradesman misses texts');

// 4. a stranger is still answered, and nobody is guessed at
out.length = 0;
r = await post({ From: '+61400000000', Body: 'yes', MessageSid: 'SMin3' });
ok(/cannot take replies/.test(r.body), 'a number we have never sent to gets the honest answer');
ok((await q("select action from inbound where id='SMin3'")).rows[0].action === 'unmatched', 'and is recorded as unmatched rather than guessed');

// 5. before the app has synced a job, the outbound record alone is enough to find the painter
await store.recordOutbound({ id: 'SMoutX', painter: 'cus_sam', job: 'jNew', channel: 'sms', to: '0499 111 222', ref: 'quote+3' });
const found = await store.findByPhone('+61499111222');
ok(found && found.painter_id === 'cus_sam' && found.job_id === 'jNew' && found.via === 'outbound',
   'a reply lands correctly from the send record alone, before any sync: ' + JSON.stringify({ p: found && found.painter_id, via: found && found.via }));

// 6. STOP is left to Twilio and never forwarded
out.length = 0;
r = await post({ From: '+61411222333', Body: 'STOP', MessageSid: 'SMin4' });
ok(out.length === 0 && !/passed that on/.test(r.body), 'STOP is not forwarded to anyone');

// 7. a number typed as 0411... by the painter matches the +61411... Twilio sends
ok(store.e164('0411 222 333') === '+61411222333' && store.e164('+61411222333') === '+61411222333' && store.e164('(08) 8123 4567') === '+61881234567',
   'local and international spellings of the same number resolve to one key');

await db.close();
console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
