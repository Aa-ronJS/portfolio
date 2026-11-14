'use strict';
// eBay's official Browse API (developer.ebay.com). No scraping: the website
// blocks automated browsers, and its terms forbid it.
//
// Keys: EBAY_CLIENT_ID and EBAY_CLIENT_SECRET from a free eBay developer
// account ("Production" keyset). If they are unset the token request goes out
// without credentials, for environments where a proxy adds them.

const API = 'https://api.ebay.com';
let cached = null; // { token, expires }

async function getToken(fetchImpl = fetch, env = process.env) {
  if (cached && cached.expires > Date.now() + 60000) return cached.token;
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (env.EBAY_CLIENT_ID && env.EBAY_CLIENT_SECRET) {
    headers.Authorization = 'Basic ' +
      Buffer.from(env.EBAY_CLIENT_ID + ':' + env.EBAY_CLIENT_SECRET).toString('base64');
  }
  const res = await fetchImpl(API + '/identity/v1/oauth2/token', {
    method: 'POST',
    headers,
    body: 'grant_type=client_credentials&scope=' +
      encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
  });
  if (!res.ok) {
    throw new Error('eBay sign-in failed (HTTP ' + res.status + '). Check EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are the Production keys.');
  }
  const body = await res.json();
  cached = { token: body.access_token, expires: Date.now() + body.expires_in * 1000 };
  return cached.token;
}

// Used, fixed-price, located in Australia, on ebay.com.au.
async function searchUsed(query, { fetchImpl = fetch, env = process.env, limit = 100 } = {}) {
  const token = await getToken(fetchImpl, env);
  const url = API + '/buy/browse/v1/item_summary/search?q=' + encodeURIComponent(query) +
    '&limit=' + limit +
    '&filter=' + encodeURIComponent('conditions:{USED},buyingOptions:{FIXED_PRICE},itemLocationCountry:AU');
  const res = await fetchImpl(url, {
    headers: { Authorization: 'Bearer ' + token, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_AU' },
  });
  if (!res.ok) throw new Error('eBay search failed for "' + query + '" (HTTP ' + res.status + ')');
  const body = await res.json();
  const items = (body.itemSummaries || [])
    .filter((i) => i.price && i.price.currency === 'AUD' && Number(i.price.value) > 0)
    .map((i) => ({ title: i.title, price: Number(i.price.value), url: i.itemWebUrl }));
  return { total: body.total || items.length, items };
}

function _reset() { cached = null; }

module.exports = { getToken, searchUsed, _reset };
