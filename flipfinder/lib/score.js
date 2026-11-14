'use strict';
// Turns a pile of eBay asking prices into one cautious resale estimate, then
// applies the buying rule.
//
// The API gives ASKING prices of items that have not sold yet, which run high.
// So the estimate is deliberately pessimistic: take the lower quartile of the
// asking prices (what the cheaper sellers want) and knock a further 10% off.

const RULES = {
  minComps: 5,        // fewer than this and there is no market to read
  haircut: 0.9,       // asking price -> likely sale price
  postage: 12,        // what posting it costs you if you offer free postage
  multiple: 3,        // resale must be at least 3x the buy price...
  minProfit: 30,      // ...and clear at least $30
};

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Keyword searches drag in accessories at $5 and bundles at $900. Drop anything
// under a third or over three times the median before reading the market.
function market(prices) {
  const all = prices.filter((p) => p > 0).sort((a, b) => a - b);
  if (!all.length) return { comps: 0 };
  const mid = quantile(all, 0.5);
  const kept = all.filter((p) => p >= mid / 3 && p <= mid * 3);
  return {
    comps: kept.length,
    low: Math.round(quantile(kept, 0.25)),
    median: Math.round(quantile(kept, 0.5)),
    high: Math.round(quantile(kept, 0.75)),
  };
}

function verdict(buyPrice, prices, rules = RULES) {
  const m = market(prices);
  if (m.comps < rules.minComps) {
    return { verdict: 'UNKNOWN', reason: 'Only ' + m.comps + ' comparable eBay listings. Check by hand.', market: m };
  }
  const resale = Math.round(m.low * rules.haircut);
  const profit = Math.round(resale - rules.postage - buyPrice);
  const maxBuy = Math.max(0, Math.floor(Math.min(resale / rules.multiple, resale - rules.postage - rules.minProfit)));
  const ok = buyPrice <= maxBuy;
  return {
    verdict: ok ? 'BUY' : 'SKIP',
    resale,
    profit,
    maxBuy,
    reason: ok
      ? 'Should resell for about $' + resale + ', clearing about $' + profit + ' after postage.'
      : 'Should resell for about $' + resale + '. Only worth it at $' + maxBuy + ' or less.',
    market: m,
  };
}

module.exports = { RULES, market, verdict };
