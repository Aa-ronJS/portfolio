#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { searchUsed } = require('../lib/ebay');
const { verdict, market } = require('../lib/score');

const USAGE = `flip check "<what it is>" <asking price>   one listing: buy or skip
flip scan <candidates.json>                a batch of listings, best first
flip pricebook [watchlist.json]            what each watched item resells for

candidates.json is a list of { "title", "price", "url", "search" }.
"search" is optional: the eBay search to price it against, if the title is messy.`;

async function check(search, price) {
  const { items } = await searchUsed(search);
  return verdict(price, items.map((i) => i.price));
}

async function main(argv) {
  const [cmd, a, b] = argv;
  if (cmd === 'check' && a && b !== undefined && isFinite(Number(b))) {
    const v = await check(a, Number(b));
    console.log(v.verdict + '  ' + a + ' at $' + Number(b));
    console.log(v.reason);
    if (v.market.comps) console.log('eBay asking prices (used, AU): $' + v.market.low + ' / $' + v.market.median + ' / $' + v.market.high + ' across ' + v.market.comps + ' listings');
    return;
  }
  if (cmd === 'scan' && a) {
    const list = JSON.parse(fs.readFileSync(a, 'utf8'));
    const out = [];
    for (const c of list) {
      try {
        out.push(Object.assign({}, c, await check(c.search || c.title, Number(c.price))));
      } catch (e) {
        out.push(Object.assign({}, c, { verdict: 'UNKNOWN', reason: e.message }));
      }
    }
    const rank = { BUY: 0, UNKNOWN: 1, SKIP: 2 };
    out.sort((x, y) => rank[x.verdict] - rank[y.verdict] || (y.profit || 0) - (x.profit || 0));
    for (const o of out) {
      console.log(o.verdict.padEnd(8) + ('$' + o.price).padEnd(7) + o.title);
      console.log('        ' + o.reason + (o.url ? '\n        ' + o.url : ''));
    }
    return;
  }
  if (cmd === 'pricebook') {
    const file = a || path.join(__dirname, '..', 'watchlist.json');
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log('item'.padEnd(42) + 'low'.padStart(7) + 'median'.padStart(8) + 'high'.padStart(7) + 'listed'.padStart(8) + '   pay up to');
    for (const q of list) {
      try {
        const { total, items } = await searchUsed(q);
        const m = market(items.map((i) => i.price));
        const v = verdict(0, items.map((i) => i.price));
        console.log(q.padEnd(42) + (m.comps ? ('$' + m.low).padStart(7) + ('$' + m.median).padStart(8) + ('$' + m.high).padStart(7) : ''.padStart(22)) +
          String(total).padStart(8) + '   ' + (v.maxBuy !== undefined ? '$' + v.maxBuy : 'too few listings'));
      } catch (e) {
        console.log(q.padEnd(42) + '  ' + e.message);
      }
    }
    return;
  }
  console.log(USAGE);
  process.exitCode = cmd ? 1 : 0;
}

main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exitCode = 1; });
