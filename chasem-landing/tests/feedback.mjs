// What a tester found, on its way to a person: stored once, emailed once, and never doubled up by a retry.
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';

const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, {
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', ALLOWED_ORIGINS: 'https://chasem.app',
  RESEND_API_KEY: 're_test', RESEND_FROM: 'Chasem <help@chasem.app>', FEEDBACK_TO: 'aaron@example.com',
});
const mails = [];
globalThis.__relayFetch = async (url, opt = {}) => {
  if (String(url).includes('resend.com')) { mails.push(JSON.parse(opt.body)); return { ok: true, status: 200, json: async () => ({ id: 'em1' }) }; }
  return { ok: true, status: 200, json: async () => ({}) };
};

const { migrate, q } = await import('../api/_db.js');
const { signToken } = await import('../api/_setup.js');
const feedback = (await import('../api/feedback.js')).default;

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
await migrate();

const TOKEN = signToken({ v: 1, cus: 'cus_dave', name: "Dave's Painting" }, process.env.RELAY_SIGNING_SECRET);
function res() { return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } }; }
async function post(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = 'POST'; req.url = '/api/feedback'; req.headers = { origin: 'https://chasem.app', 'content-type': 'application/json' };
  const r = res(); await feedback(req, r); return { status: r.statusCode, ...(r.body ? JSON.parse(r.body) : {}) };
}

const items = [
  { id: 'f1', step: 'Measure a room with a sheet of paper', verdict: 'broken', note: 'The wall came back 300mm short on a dark photo.', screen: '#/job/x/room/y', app: 'qc-app-v43', ua: 'iPhone' },
  { id: 'f2', step: 'Set yourself up', verdict: 'works', note: '', screen: '#/settings', app: 'qc-app-v43', ua: 'iPhone' },
];

const a = await post({ token: TOKEN, who: 'Aaron', reply_to: 'aaron@example.com', items });
ok(a.ok && a.stored === 2, 'both notes are written down (' + a.stored + ')');
ok(a.mailed === true && mails.length === 1, 'and one email goes out, not one per note');
ok(/1 thing broken/.test(mails[0].subject), 'the subject says what matters: ' + mails[0].subject);
ok(/BROKEN/.test(mails[0].text) && /300mm/.test(mails[0].text), 'the body carries the finding itself');
ok(/#\/job\/x\/room\/y/.test(mails[0].text), 'and the screen it was found on, so it can be reproduced');
ok(mails[0].to[0] === 'aaron@example.com' && mails[0].reply_to === 'aaron@example.com', 'it goes to the person, and replying reaches the tester');

// a retry
const again = await post({ token: TOKEN, items });
ok(again.ok && again.stored === 0, 'sending the same notes again stores nothing new (' + again.stored + ')');
const n = (await q('select count(*)::int n from feedback')).rows[0].n;
ok(n === 2, 'so the list stays two long however many times a flaky signal retries (' + n + ')');

// a tester who never signed up
const anon = await post({ items: [{ id: 'f3', step: '', verdict: 'note', note: 'The word "ballpark" reads odd to me.', screen: '#/', app: 'qc-app-v43' }] });
ok(anon.ok && anon.stored === 1, 'a note from a phone with no account is still taken');
const row = (await q("select painter_id, verdict from feedback where id='f3'")).rows[0];
ok(row.painter_id === '' && row.verdict === 'note', 'and recorded as having no painter rather than being refused');

// nothing to say
const empty = await post({ token: TOKEN, items: [] });
ok(empty.status === 400 && !empty.ok, 'an empty send is refused rather than emailing a blank page');
const junk = await post({ token: TOKEN, items: [{ id: '', note: 'no id' }] });
ok(junk.status === 400, 'and so is a note with no id, because that is what stops it doubling up');

// a long note is cut, not dropped
const long = await post({ token: TOKEN, items: [{ id: 'f4', step: 'x', verdict: 'broken', note: 'z'.repeat(9000) }] });
const kept = (await q("select length(note) n from feedback where id='f4'")).rows[0];
ok(long.ok && kept.n === 4000, 'a very long note is trimmed rather than refused (' + kept.n + ' characters kept)');

// the email failing does not lose the note
globalThis.__relayFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
const down = await post({ token: TOKEN, items: [{ id: 'f5', step: 'y', verdict: 'broken', note: 'Resend is down.' }] });
ok(down.ok && down.stored === 1 && down.mailed === false, 'an email that will not send still leaves the note in the database');

console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
