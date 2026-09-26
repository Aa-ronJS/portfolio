// Find my quotes: he logs in once to Outlook, Gmail or Xero, we look through what he sent, keep only what
// looks like a quote or an unpaid invoice, and throw the permission away. His phone collects the list once.
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';

const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
Object.assign(process.env, {
  RELAY_SIGNING_SECRET: 'sign_me_0123456789', ALLOWED_ORIGINS: 'https://chasem.app', SITE_URL: 'https://chasem.app',
});

const b64u = (s) => Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
const calls = [];
globalThis.__relayFetch = async (url, opt = {}) => {
  const u = String(url); calls.push(u);
  const j = (o, status = 200) => ({ ok: status < 400, status, json: async () => o });
  // Microsoft
  if (u.includes('login.microsoftonline.com') && u.includes('/token')) return j({ access_token: 'ms_at' });
  if (u.startsWith('https://graph.microsoft.com/v1.0/me?')) return j({ mail: 'dave@steelesparky.com.au' });
  if (u.includes('/mailFolders/sentitems/messages')) {
    if (u.includes('page2')) return j({ value: [
      { subject: 'Quote Q-2231 switchboard', sentDateTime: ago(20), toRecipients: [{ emailAddress: { name: 'Jane Mitchell', address: 'jane@example.com' } }], body: { content: 'Hi Jane, quote for the switchboard upgrade. Total inc GST $2,266.00. Cheers Dave' } },
    ] });
    return j({ value: [
      { subject: 'Re: Quote Q-2231 switchboard', sentDateTime: ago(10), toRecipients: [{ emailAddress: { name: 'Jane Mitchell', address: 'jane@example.com' } }], body: { content: 'Hi Jane, just checking the quote for the switchboard came through. Total inc GST $2,266.00.' } },
      { subject: 'Quote request', sentDateTime: ago(12), toRecipients: [{ emailAddress: { name: 'Sparky Supplies', address: 'sales@supplies.com.au' } }], body: { content: 'Hi, can you quote me for 20 downlights please?' } },
      { subject: 'Quote for Bay Cafe', sentDateTime: ago(5), toRecipients: [{ emailAddress: { name: 'Sione Tui', address: 'sione@bay.cafe' } }], body: { content: 'Hi Sione, price is $3,885.20 all up for the new circuits.\nCall me on 0412 345 678' } },
      { subject: 'note to self', sentDateTime: ago(3), toRecipients: [{ emailAddress: { name: 'Dave', address: 'dave@steelesparky.com.au' } }], body: { content: 'quote for Mick $500' } },
    ], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages?page2' });
  }
  // Google
  if (u.startsWith('https://oauth2.googleapis.com/token')) return j({ access_token: 'g_at' });
  if (u.endsWith('/users/me/profile')) return j({ emailAddress: 'kate@cleanco.com.au' });
  if (u.includes('/users/me/messages?')) return j({ messages: [{ id: 'm1' }, { id: 'm2' }] });
  if (u.includes('/users/me/messages/m1')) return j({ payload: { headers: [{ name: 'To', value: 'Priya Nair <priya@example.com>' }, { name: 'Date', value: 'Thu, 03 Sep 2026 16:12:00 +1000' }, { name: 'Subject', value: 'Your cleaning quote' }], mimeType: 'multipart/alternative', parts: [{ mimeType: 'text/plain', body: { data: b64u('Hi Priya, the quote for the end of lease clean is $640 inc GST.') } }] } });
  if (u.includes('/users/me/messages/m2')) return j({ payload: { headers: [{ name: 'To', value: 'tom@example.com' }, { name: 'Date', value: 'Mon, 07 Sep 2026 09:00:00 +1000' }, { name: 'Subject', value: 'Invoice INV-0098' }], mimeType: 'text/html', body: { data: b64u('<p>Hi Tom,</p><p>Invoice INV-0098 for <b>$540.00</b> is now due.</p>') } } });
  // Xero
  if (u.startsWith('https://identity.xero.com/connect/token')) return j({ access_token: 'x_at' });
  if (u === 'https://api.xero.com/connections') return j([{ tenantId: 't1', tenantName: 'Steele Electrical Pty Ltd' }]);
  if (u.includes('/Quotes?Status=SENT')) return j({ Quotes: [{ QuoteNumber: 'QU-0042', Contact: { ContactID: 'c1', Name: 'Acme Strata' }, DateString: '2026-09-01T00:00:00', Total: 12000, Status: 'SENT', Title: 'Common area lighting' }] });
  if (u.includes('/Quotes?Status=ACCEPTED')) return j({ Quotes: [{ QuoteNumber: 'QU-0040', Contact: { ContactID: 'c2', Name: 'Kate Caller' }, DateString: '2026-08-20T00:00:00', Total: 1200, Status: 'ACCEPTED' }] });
  if (u.includes('/Invoices?')) return j({ Invoices: [{ InvoiceNumber: 'INV-1999', Contact: { ContactID: 'c3', Name: 'Dennis Ward' }, DateString: '2026-08-19T00:00:00', DueDateString: '2026-09-02T00:00:00', Total: 8825.19, AmountPaid: 0, AmountDue: 8825.19, Reference: 'Rewire' }] });
  if (u.includes('/Contacts?IDs=')) return j({ Contacts: [
    { ContactID: 'c1', Name: 'Acme Strata', FirstName: 'Priya', LastName: 'Nair', EmailAddress: 'priya@acme.com.au', Phones: [{ PhoneType: 'DEFAULT', PhoneAreaCode: '08', PhoneNumber: '8123 4567' }, { PhoneType: 'MOBILE', PhoneNumber: '0412 000 111' }] },
    { ContactID: 'c2', Name: 'Kate Caller', Phones: [{ PhoneType: 'MOBILE', PhoneNumber: '+61412999888' }] },
    { ContactID: 'c3', Name: 'Dennis Ward', EmailAddress: 'dennis@example.com', Phones: [] },
  ] });
  return j({}, 404);
};

const { q } = await import('../api/_db.js');
const { signToken } = await import('../api/_setup.js');
const find = (await import('../api/find.js')).default;

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const TOKEN = signToken({ v: 1, cus: 'cus_dave', name: 'Steele Electrical', plan: 'paid' }, process.env.RELAY_SIGNING_SECRET);
const OTHER = signToken({ v: 1, cus: 'cus_sam', name: 'Sam', plan: 'paid' }, process.env.RELAY_SIGNING_SECRET);
function res() { return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } }; }
async function post(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]); req.method = 'POST'; req.url = '/api/find'; req.headers = { origin: 'https://chasem.app', 'content-type': 'application/json' };
  const r = res(); await find(req, r); return { status: r.statusCode, ...(r.body ? JSON.parse(r.body) : {}) };
}
async function back(params) {
  const req = Readable.from([]); req.method = 'GET'; req.url = '/api/find?action=callback&' + new URLSearchParams(params).toString(); req.headers = {};
  const r = res(); await find(req, r); return { status: r.statusCode, to: r.headers.location || '' };
}
const stateOf = (url) => new URL(url).searchParams.get('state');

// ---- nothing switched on: the app is told so, and offers the ways that need nothing
let w = await post({ token: TOKEN, action: 'which' });
ok(w.ok && w.providers.length === 0, 'with no keys set, none of the three is offered');
Object.assign(process.env, { MS_CLIENT_ID: 'ms', MS_CLIENT_SECRET: 'mss', GOOGLE_CLIENT_ID: 'g', GOOGLE_CLIENT_SECRET: 'gs', XERO_CLIENT_ID: 'x', XERO_CLIENT_SECRET: 'xs' });
w = await post({ token: TOKEN, action: 'which' });
ok(w.providers.join(',') === 'microsoft,google,xero', 'with their keys set, all three are offered: ' + w.providers.join(', '));
{ const req = Readable.from([]); req.method = 'GET'; req.url = '/api/find?action=which'; req.headers = {}; const r = res(); await find(req, r); const j = JSON.parse(r.body);
  ok(r.statusCode === 200 && j.providers.join(',') === 'Outlook,Gmail,Xero' && !/client|secret|ms|mss/i.test(JSON.stringify(j.providers)), 'the website can ask, with no token, which logins are on, and gets their names only: ' + j.providers.join(', ')); }

// ---- the login pages are the providers' own, and ask only to read
const ms = await post({ token: TOKEN, action: 'start', provider: 'microsoft' });
ok(/^https:\/\/login\.microsoftonline\.com\//.test(ms.url) && /scope=User\.Read%20Mail\.Read/.test(ms.url), 'Outlook: Microsoft’s own login, asking only to read mail');
ok(new URL(ms.url).searchParams.get('redirect_uri') === 'https://chasem.app/find/back', 'and it comes back to one plain address');
const gg = await post({ token: TOKEN, action: 'start', provider: 'google' });
ok(/^https:\/\/accounts\.google\.com\//.test(gg.url) && /gmail\.readonly/.test(gg.url) && /access_type=online/.test(gg.url), 'Gmail: Google’s own login, read only, and no lasting access asked for');
const xr = await post({ token: TOKEN, action: 'start', provider: 'xero' });
ok(/^https:\/\/login\.xero\.com\//.test(xr.url) && /accounting\.transactions\.read/.test(xr.url) && !/offline_access/.test(xr.url), 'Xero: Xero’s own login, read only, no lasting access');
const bad = await post({ token: TOKEN, action: 'start', provider: 'myspace' });
ok(!bad.ok, 'an unknown provider is refused');

// ---- Outlook: his sent mail, read once
let r = await back({ code: 'c', state: stateOf(ms.url) });
ok(r.status === 302 && /^https:\/\/chasem\.app\/app\/#\/add\/found\?k=/.test(r.to), 'Outlook: he lands back in the app with what was found');
const kMs = new URL(r.to.replace('#/', '')).searchParams.get('k');
let got = await post({ token: TOKEN, action: 'collect', id: kMs });
ok(got.ok && got.name === 'Outlook' && got.account === 'dave@steelesparky.com.au', 'the phone collects it, and knows which account it came from');
ok(got.scanned === 5, 'every sent email on both pages was looked at (' + got.scanned + ')');
const names = got.items.map((i) => i.name).sort().join(', ');
ok(names === 'Jane Mitchell, Sione Tui', 'two quotes found: the supplier request and the note to himself are not quotes (' + names + ')');
const jane = got.items.find((i) => i.name === 'Jane Mitchell');
ok(jane && jane.amount === 2266 && jane.email === 'jane@example.com' && jane.number === 'Q-2231', 'Jane: the amount, her address and the quote number');
ok(jane && jane.date === ago(10).slice(0, 10), 'the quote and its follow-up are one, dated by the latest email');
const sione = got.items.find((i) => i.name === 'Sione Tui');
ok(sione && sione.amount === 3885.2, 'Sione: "all up" is the amount');
let again = await post({ token: TOKEN, action: 'collect', id: kMs });
ok(!again.ok && again.status === 404, 'collected once, then gone');
ok((await q('select count(*)::int n from found')).rows[0].n === 0, 'nothing from the look is left in the database');

// ---- Gmail, plain text and HTML-only messages
r = await back({ code: 'c', state: stateOf(gg.url) });
got = await post({ token: TOKEN, action: 'collect', id: new URL(r.to.replace('#/', '')).searchParams.get('k') });
const priya = got.items.find((i) => i.name === 'Priya Nair'), tom = got.items.find((i) => i.email === 'tom@example.com');
ok(priya && priya.amount === 640 && priya.date === '2026-09-03', 'Gmail: a plain-text quote with its date');
ok(tom && tom.kind === 'invoice' && tom.amount === 540 && tom.number === 'INV-0098', 'and an HTML-only email is read too: an invoice, with its number');

// ---- Xero: quotes waiting, quotes won, invoices owing, with the phones off the contacts
r = await back({ code: 'c', state: stateOf(xr.url) });
got = await post({ token: TOKEN, action: 'collect', id: new URL(r.to.replace('#/', '')).searchParams.get('k') });
ok(got.name === 'Xero' && got.account === 'Steele Electrical Pty Ltd', 'Xero: from his organisation');
const acme = got.items.find((i) => i.number === 'QU-0042'), won = got.items.find((i) => i.number === 'QU-0040'), dennis = got.items.find((i) => i.number === 'INV-1999');
ok(acme && acme.name === 'Priya Nair' && acme.business === 'Acme Strata' && acme.phone === '0412 000 111', 'a sent quote: the person, the business, and the mobile rather than the landline');
ok(won && won.accepted === true && won.phone === '0412 999 888', 'an accepted quote is marked won, its number tidied');
ok(dennis && dennis.kind === 'invoice' && dennis.due === '2026-09-02' && dennis.amount === 8825.19, 'an unpaid invoice with its due date');

// ---- the edges
r = await back({ error: 'access_denied', state: stateOf(ms.url) });
ok(/#\/add\/find\?why=no/.test(r.to), 'saying no on the login page brings him back to try again, not to an error');
const stale = signToken({ v: 1, kind: 'find', cus: 'cus_dave', provider: 'microsoft', exp: Date.now() - 1000 }, process.env.RELAY_SIGNING_SECRET);
r = await back({ code: 'c', state: stale });
ok(/why=expired/.test(r.to), 'a login left open too long is refused');
r = await back({ code: 'c', state: 'not-ours' });
ok(/why=expired/.test(r.to), 'a forged return is refused');
r = await back({ code: 'c', state: stateOf(ms.url) });
const theirs = await post({ token: OTHER, action: 'collect', id: new URL(r.to.replace('#/', '')).searchParams.get('k') });
ok(!theirs.ok, 'another tradie cannot collect what was found in Dave’s email');

console.log(fails ? '\nFAILURES: ' + fails : '\nALL PASSED');
process.exit(fails ? 1 : 0);
