'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { market, verdict } = require('../lib/score');
const ebay = require('../lib/ebay');

test('market ignores accessories and bundles far from the median', () => {
  const m = market([5, 90, 100, 100, 110, 120, 900]);
  assert.strictEqual(m.comps, 5);
  assert.strictEqual(m.median, 100);
});

test('a cheap listing against a healthy market is a BUY', () => {
  const v = verdict(25, [100, 110, 120, 130, 140, 150]);
  assert.strictEqual(v.verdict, 'BUY');
  assert.ok(v.profit >= 30);
});

test('a listing above a third of resale is a SKIP and says what to pay', () => {
  const v = verdict(60, [100, 110, 120, 130, 140, 150]);
  assert.strictEqual(v.verdict, 'SKIP');
  assert.ok(v.maxBuy < 60 && v.maxBuy > 0);
});

test('cheap items fail on the $30 floor even at 3x', () => {
  const v = verdict(10, [30, 32, 34, 36, 38, 40]);
  assert.strictEqual(v.verdict, 'SKIP');
  assert.strictEqual(v.maxBuy, 0);
});

test('too few comparables is UNKNOWN, never a guess', () => {
  assert.strictEqual(verdict(10, [200, 220]).verdict, 'UNKNOWN');
  assert.strictEqual(verdict(10, []).verdict, 'UNKNOWN');
});

test('searchUsed signs in once, asks ebay.com.au for used AU items, and drops non-AUD', async () => {
  ebay._reset();
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    if (url.includes('/oauth2/token')) {
      return { ok: true, json: async () => ({ access_token: 'T', expires_in: 7200 }) };
    }
    return { ok: true, json: async () => ({ total: 3, itemSummaries: [
      { title: 'a', price: { value: '100.00', currency: 'AUD' }, itemWebUrl: 'u' },
      { title: 'b', price: { value: '50.00', currency: 'USD' } },
      { title: 'c' },
    ] }) };
  };
  const env = { EBAY_CLIENT_ID: 'id', EBAY_CLIENT_SECRET: 'secret' };
  const r = await ebay.searchUsed('lego', { fetchImpl, env });
  await ebay.searchUsed('lego 2', { fetchImpl, env });
  assert.deepStrictEqual(r.items, [{ title: 'a', price: 100, url: 'u' }]);
  assert.strictEqual(calls.filter((c) => c.url.includes('/oauth2/token')).length, 1);
  assert.ok(calls[0].opts.headers.Authorization.startsWith('Basic '));
  assert.strictEqual(calls[1].opts.headers['X-EBAY-C-MARKETPLACE-ID'], 'EBAY_AU');
  assert.ok(decodeURIComponent(calls[1].url).includes('conditions:{USED}'));
});

test('a rejected sign-in explains itself', async () => {
  ebay._reset();
  await assert.rejects(
    ebay.searchUsed('x', { fetchImpl: async () => ({ ok: false, status: 401 }), env: {} }),
    /Production keys/);
});
