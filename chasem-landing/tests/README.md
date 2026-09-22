# Relay tests

Four scripts, run with `npm test` from `chasem-landing`. No framework: each
prints a PASS or FAIL line per case and exits non-zero if any failed.

- `schema.mjs`   — the migrations and the constraints that hold the booking lock, the
                   sync revision guard and account deletion, run against real Postgres.
- `inbound.mjs`  — a reply coming back from Twilio: two painters with the same customer,
                   a duplicate webhook, STOP, a number we have never sent to.
- `booking.mjs`  — sync and the booking page, including two customers grabbing one day.
- `photos.mjs`   — the photo path against a faked Supabase Storage, and the thing that
                   must never work: one painter reaching another painter's folder.

Postgres here is [pglite](https://pglite.dev): Postgres itself, compiled to WASM, so the
real schema runs with real constraints and nothing needs a database to be up. Twilio,
Resend and Supabase are faked through `globalThis.__relayFetch`, which the relay uses in
place of `fetch` when it is set; `globalThis.__relayDb` does the same for the pool.
Nothing here talks to the network or to the live database.
