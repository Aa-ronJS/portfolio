// Reading a photo or a scanned PDF of a quote: the picture goes to the model once, the answer comes back, the
// tradie's own details are never taken for the customer's, and every read is counted against a limit.
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';

const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, { RELAY_SIGNING_SECRET: 'sign_me_0123456789', ALLOWED_ORIGINS: 'https://chasem.app', READ_PER_HOUR: '3' });
delete process.env.ANTHROPIC_API_KEY;

const { signToken } = await import('../api/_setup.js');
const read = (await import('../api/read.js')).default;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const TOKEN = signToken({ v: 1, cus: 'cus_dave', name: 'Steele Electrical', plan: 'paid' }, process.env.RELAY_SIGNING_SECRET);
function res() { return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } }; }
async function post(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]); req.method = 'POST'; req.url = '/api/read'; req.headers = { origin: 'https://chasem.app', 'content-type': 'application/json' };
  const r = res(); await read(req, r); return { status: r.statusCode, ...(r.body ? JSON.parse(r.body) : {}) };
}
const JPEG = Buffer.from('fake jpeg bytes').toString('base64'), PDF = Buffer.from('%PDF-1.4 scanned').toString('base64');
const own = { trading_name: 'Steele Electrical', owner_name: 'Dave Steele', phone: '0412 345 678', email: 'dave@steele.com.au', abn: '12 345 678 901' };

// ---- off until the key is set: the app is told so, in words it can show
let r = await post({ token: TOKEN, media_type: 'image/jpeg', data: JPEG, own });
ok(r.ok === false && r.off === true && /Type it in/.test(r.error), 'with no key it says reading is off, and to type it in');

// ---- a stand-in model that records what it was sent
const sent = []; let answer = null, stop = 'end_turn';
globalThis.__readClient = { beta: { messages: { parse: async (params) => { sent.push(params); return { stop_reason: stop, parsed_output: answer, content: [] }; } } } };
answer = { is_quote_or_invoice: true, kind: 'quote', customer_name: 'Jane Mitchell', customer_business: '', customer_phone: '0412 111 222', customer_email: 'Jane.M@Example.com',
  total_inc_gst: 2450, amount_still_owing: 0, number: 'QU-0042', date: '2026-09-03', due_date: '', what_for: 'Switchboard upgrade' };
r = await post({ token: TOKEN, media_type: 'image/jpeg', data: 'data:image/jpeg;base64,' + JPEG, own });
ok(r.ok && r.item.name === 'Jane Mitchell' && r.item.amount === 2450 && r.item.number === 'QU-0042' && r.item.email === 'jane.m@example.com' && r.item.kind === 'quote', 'a photo of a quote comes back as Jane Mitchell, $2,450, QU-0042');
const p0 = sent[0];
ok(p0.model === 'claude-opus-5' && p0.messages[0].content[0].type === 'image' && p0.messages[0].content[0].source.data === JPEG, 'the photo goes to the model as an image, without its data: prefix');
ok(/Steele Electrical/.test(p0.messages[0].content[1].text) && /0412 345 678/.test(p0.messages[0].content[1].text) && /never be returned as the customer/.test(p0.system), 'his own details go with it, marked as never the customer');
ok(p0.fallbacks === 'default' && p0.betas.includes('server-side-fallback-2026-07-01') && p0.output_config && p0.output_config.format, 'structured answer, with the server-side fallback on');

answer = Object.assign({}, answer, { kind: 'invoice', customer_name: 'Bay Cafe', total_inc_gst: 5000, amount_still_owing: 3885.2, number: 'INV-1006', date: '2026-09-01', due_date: '2026-09-15', customer_email: '' });
r = await post({ token: TOKEN, media_type: 'application/pdf', data: PDF, own });
ok(r.ok && r.item.kind === 'invoice' && r.item.amount === 3885.2 && r.item.due === '2026-09-15', 'a scanned invoice with a deposit paid is chased for what is still owing, with its due date');
ok(sent[1].messages[0].content[0].type === 'document' && sent[1].messages[0].content[0].source.media_type === 'application/pdf', 'a PDF goes as a document');

// ---- the limit: three an hour in this test
r = await post({ token: TOKEN, media_type: 'image/jpeg', data: JPEG, own });
ok(r.ok, 'the third read of the hour is fine');
r = await post({ token: TOKEN, media_type: 'image/jpeg', data: JPEG, own });
ok(r.status === 429 && /Type this one in/.test(r.error) && sent.length === 3, 'the fourth is refused before the model is asked, in plain words');
const other = signToken({ v: 1, cus: 'cus_sam', name: 'Sam', plan: 'paid' }, process.env.RELAY_SIGNING_SECRET);

// ---- what goes wrong, goes wrong gently
answer = Object.assign({}, answer, { is_quote_or_invoice: false });
r = await post({ token: other, media_type: 'image/png', data: JPEG, own: {} });
ok(r.ok === false && r.not_a_quote && /does not look like a quote/.test(r.error), 'a photo of something else says so');
stop = 'refusal'; r = await post({ token: other, media_type: 'image/png', data: JPEG });
ok(r.ok === false && /could not be read/.test(r.error), 'a declined read says it could not be read');
stop = 'end_turn'; answer = null; r = await post({ token: other, media_type: 'image/png', data: JPEG });
ok(r.ok === false && /could not be read/.test(r.error), 'no answer at all says it could not be read');
r = await post({ token: other, media_type: 'text/html', data: JPEG });
ok(r.status === 400 && r.ok === false, 'something that is not a photo or a PDF is turned away');
r = await post({ token: other, media_type: 'image/jpeg', data: Buffer.alloc(3.2 * 1024 * 1024).toString('base64') });
ok(r.status === 413 && /too big/.test(r.error), 'a file too big to read says so');
r = await post({ token: 'nope', media_type: 'image/jpeg', data: JPEG });
ok(r.status === 401, 'no token, no read');
globalThis.__readClient.beta.messages.parse = async () => { throw new Error('socket hang up'); };
r = await post({ token: signToken({ v: 1, cus: 'cus_kim', plan: 'paid' }, process.env.RELAY_SIGNING_SECRET), media_type: 'image/jpeg', data: JPEG });
ok(r.status === 500 && /Try again, or type it in/.test(r.error), 'a failure on the way says try again, or type it in');

console.log(fails ? '\nFAILURES: ' + fails : '\nALL PASSED'); process.exit(fails ? 1 : 0);
