/* Smoke check for the Niche Check relay. Runs the real function against the
 * real endpoints and fails loudly if the shape or the coverage is off.
 *   node check-niche.js [keyword ...]
 */
'use strict';
const handler = require('./api/niche.js');

function call(q) {
  return new Promise(resolve => {
    const headers = {}; let body = '';
    const res = {
      statusCode: 200,
      setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
      end: (s) => { body += s || ''; resolve({ status: res.statusCode, headers, body }); }
    };
    handler({ method: 'GET', query: { q } }, res);
  });
}

(async () => {
  const words = process.argv.slice(2).length ? process.argv.slice(2) : ['quilting', 'dog training'];
  let failed = 0;
  const bad = await call('<script>');
  if (bad.status !== 400) { console.error('FAIL: junk input was not rejected'); failed++; } else console.log('ok    junk input rejected with 400');
  for (const q of words) {
    const r = await call(q);
    let j; try { j = JSON.parse(r.body); } catch (e) { console.error('FAIL: ' + q + ' did not return JSON'); failed++; continue; }
    const groups = Object.keys(j.suggest || {});
    const answered = groups.filter(k => Array.isArray(j.suggest[k]));
    const total = answered.reduce((s, k) => s + j.suggest[k].length, 0);
    const line = `${q}: ${r.status}, ${answered.length}/${groups.length} groups, ${total} completions, reddit ${j.reddit ? j.reddit.length + ' subs' : 'no (' + (j.errors && j.errors.reddit) + ')'}, ${j.took}ms, cache: ${r.headers['cache-control']}`;
    if (r.status !== 200 || groups.length !== handler.MODIFIERS.length || answered.length < groups.length - 2 || total < 20) { console.error('FAIL  ' + line); failed++; }
    else console.log('ok    ' + line);
  }
  process.exit(failed ? 1 : 0);
})();
