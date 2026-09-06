/* Niche Check, server half.
 *
 * The browser can ask Wikipedia, Apple and Open Library directly, because they
 * answer cross-origin requests. Google's autocomplete endpoint and Reddit do
 * not, so this function fetches those on the page's behalf and returns them
 * untouched. Every judgement about the data is made in the page, where it can
 * be read; this file only carries the post.
 *
 * GET /api/niche?q=quilting
 *   -> { q, took, suggest: { base: [...], for: [...], ... }, reddit: [...] | null,
 *        errors: { google: 0, reddit: 'why' } }
 *
 * No dependencies. Runs on Vercel's Node runtime with the global fetch.
 */

'use strict';

const UA = 'NicheCheck/1.0 (+https://aaronsteele.vercel.app/niche/)';
const TIMEOUT_MS = 4500;
const MAX_LEN = 60;

/* One query per modifier. The key is what the page uses to label the group;
 * the template is what Google is asked. "{q}" is the keyword. */
const MODIFIERS = [
  ['base',         '{q}'],
  ['for',          '{q} for'],
  ['how',          'how to {q}'],
  ['learn',        'learn {q}'],
  ['best',         'best {q}'],
  ['near',         '{q} near me'],
  ['vs',           '{q} vs'],
  ['tips',         '{q} tips'],
  ['beginners',    '{q} beginners'],
  ['course',       '{q} course'],
  ['class',        '{q} class'],
  ['online',       '{q} online'],
  ['community',    '{q} community'],
  ['membership',   '{q} membership'],
  ['subscription', '{q} subscription'],
  ['is',           'is {q}'],
  ['why',          'why {q}'],
  ['can',          'can you {q}'],
  ['cost',         '{q} cost']
];

function clean(raw) {
  if (typeof raw !== 'string') return null;
  const q = raw.replace(/\s+/g, ' ').trim().toLowerCase();
  if (q.length < 2 || q.length > MAX_LEN) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} &'’:.+#/-]*$/u.test(q)) return null;
  return q;
}

async function getJSON(url, init) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, Object.assign({ signal: ctl.signal }, init || {}));
    const text = await res.text();
    if (!res.ok) throw new Error('HTTP ' + res.status);
    try { return JSON.parse(text); }
    catch (e) { throw new Error('not JSON'); }
  } finally {
    clearTimeout(timer);
  }
}

async function suggest(query) {
  const url = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=' + encodeURIComponent(query);
  const body = await getJSON(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (!Array.isArray(body) || !Array.isArray(body[1])) throw new Error('unexpected shape');
  return body[1].filter(s => typeof s === 'string').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/* Reddit blocks most datacentre ranges. This is an attempt, not a promise: if
 * it comes back as anything but the JSON listing, the page says Reddit did not
 * answer and shows a search link instead. */
async function reddit(q) {
  const url = 'https://www.reddit.com/subreddits/search.json?q=' + encodeURIComponent(q) + '&limit=12&include_over_18=off';
  const body = await getJSON(url, { headers: { 'User-Agent': 'web:niche-check:v1.0 (portfolio tool)', 'Accept': 'application/json' } });
  const kids = body && body.data && Array.isArray(body.data.children) ? body.data.children : null;
  if (!kids) throw new Error('unexpected shape');
  return kids.map(k => k.data || {}).filter(d => d.display_name && typeof d.subscribers === 'number').map(d => ({
    name: d.display_name_prefixed || ('r/' + d.display_name),
    url: 'https://www.reddit.com' + (d.url || ('/r/' + d.display_name + '/')),
    subscribers: d.subscribers,
    title: d.title || '',
    description: (d.public_description || '').slice(0, 220),
    over18: !!d.over18
  }));
}

async function scan(q) {
  const t0 = Date.now();
  const errors = {};
  const jobs = MODIFIERS.map(([key, tpl]) => suggest(tpl.replace('{q}', q)).then(
    list => [key, list],
    err  => { errors['google:' + key] = err.message; return [key, null]; }
  ));
  const redditJob = reddit(q).then(list => list, err => { errors.reddit = err.message; return null; });

  const [pairs, subs] = await Promise.all([Promise.all(jobs), redditJob]);
  const suggestOut = {};
  let googleFailures = 0;
  pairs.forEach(([key, list]) => { suggestOut[key] = list; if (list === null) googleFailures++; });
  errors.google = googleFailures;

  return { q, took: Date.now() - t0, queried: MODIFIERS.map(([k, t]) => [k, t.replace('{q}', q)]), suggest: suggestOut, reddit: subs, errors };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end(JSON.stringify({ error: 'GET only' }));
  }
  const q = clean((req.query && req.query.q) || '');
  if (!q) {
    res.statusCode = 400;
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ error: 'Send ?q= with 2 to ' + MAX_LEN + ' characters: letters, numbers, spaces and a little punctuation.' }));
  }
  try {
    const out = await scan(q);
    /* The edge keeps a scan for a day, so the second person to ask about the
     * same niche gets it instantly and Google is asked once, not twice. A
     * Reddit refusal does not spoil the cache; Reddit is best effort. */
    res.setHeader('Cache-Control', out.errors.google ? 'no-store' : 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.statusCode = 200;
    res.end(JSON.stringify(out));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'The scan could not complete: ' + (err && err.message) }));
  }
};

module.exports.clean = clean;
module.exports.scan = scan;
module.exports.MODIFIERS = MODIFIERS;
