'use strict';
// Builds a prospect CSV from Google Places (Text Search, Places API New) for a
// trade and a list of suburbs. Uses the official API, not scraping.
//
//   GOOGLE_MAPS_API_KEY=... node scripts/prospects.js "plumber" "Lonsdale SA" "Wingfield SA" > prospects.csv
//
// Output columns: name, business, type, suburb, address, phone, website, rating, reviews, notes, email
// (email is left blank; Places does not return it. Fill it from the website or leave it and call.)
const KEY = process.env.GOOGLE_MAPS_API_KEY;
const [trade, ...suburbs] = process.argv.slice(2);
if (!KEY || !trade || !suburbs.length) { console.error('usage: GOOGLE_MAPS_API_KEY=... node scripts/prospects.js "trade" "Suburb SA" ["Suburb SA" ...]'); process.exit(1); }

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function search(query, pageToken) {
  const body = { textQuery: query, regionCode: 'AU', pageSize: 20 };
  if (pageToken) body.pageToken = pageToken;
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryTypeDisplayName,nextPageToken' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

(async () => {
  console.log(['name', 'business', 'type', 'suburb', 'address', 'phone', 'website', 'rating', 'reviews', 'notes', 'email'].map(csvCell).join(','));
  const seen = new Set();
  for (const suburb of suburbs) {
    let token = null, pages = 0;
    do {
      const data = await search(`${trade} in ${suburb}`, token);
      for (const p of data.places || []) {
        const name = p.displayName && p.displayName.text;
        if (!name || seen.has(name + suburb)) continue;
        seen.add(name + suburb);
        console.log(['', name, (p.primaryTypeDisplayName && p.primaryTypeDisplayName.text) || trade, suburb, p.formattedAddress || '', p.nationalPhoneNumber || '',
          p.websiteUri || '', p.rating || '', p.userRatingCount || '', '', ''].map(csvCell).join(','));
      }
      token = data.nextPageToken || null; pages++;
    } while (token && pages < 3);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
