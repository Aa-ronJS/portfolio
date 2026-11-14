# flipfinder

Checks a local second-hand listing against eBay Australia prices and says
BUY or SKIP, with the most you should pay.

    node bin/flip.js check "makita 18v impact driver skin" 40
    node bin/flip.js scan candidates.json
    node bin/flip.js pricebook

`npm test` runs offline. No dependencies.

## Status

Built and unit-tested against the documented shape of eBay's API. **Not yet
run against live eBay**: that needs keys (below). Expect to tune `lib/score.js`
after the first real run.

## Keys

A free eBay developer account at developer.ebay.com gives a Production
"App ID (Client ID)" and "Cert ID (Client Secret)". Set them as
`EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET`. Never commit them.

## The buying rule (`lib/score.js`)

eBay's open API gives asking prices of unsold items, not sold prices (sold
data is the Marketplace Insights API, which eBay grants by application). So
the resale estimate is pessimistic: lower quartile of used AU asking prices,
less 10%. A listing is a BUY when it costs no more than a third of that and
clears $30 after $12 postage. Under 5 comparable listings is UNKNOWN.

## Where local listings come from

Not from scraping. Tried and ruled out, do not retry:

- **Gumtree and the eBay website** serve a bot challenge / 403 to automated
  requests, and getting round it is off limits.
- **Facebook Marketplace** has no API. Automating a personal login breaks
  Meta's terms and gets the account banned. Do not take a Facebook sign-in.

Instead: saved-search email alerts (Gumtree sends them; Aaron's Gumtree
account is on his Outlook) are read from the inbox and written to
`candidates.json`, and anything seen on Marketplace is checked by hand with
`flip check`.

`watchlist.json` is the starting list of niches for `pricebook`.
