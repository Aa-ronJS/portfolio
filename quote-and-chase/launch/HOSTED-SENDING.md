# Hosted sending: the relay tokens (from the build report)

# Relay (worker A): hosted sending via RELAY_TOKENS

File changed: /home/user/portfolio/quote-and-chase-landing/api/msg.js (122 -> 167 lines, +51/-6). Nothing else in the repo was touched. Not deployed, not committed.
Test added: scratchpad/smoke/send/relay-tokens.cjs (plain node, requires the ESM handler, stubs global fetch and env). Output in scratchpad/smoke/send/relay-tokens.out.

## What changed
1. New env RELAY_TOKENS, a JSON map `{ "<token>": { name, reply_to, until, disabled } }`, parsed per request and cached on the raw string (a redeploy or env edit is picked up, a malformed value degrades to "no map" so the legacy token keeps working).
2. Gate, in order: (a) token matches a map entry -> if `disabled` is true or `until` has passed, 403 `Hosted sending has ended for this account` (body also carries `hosted: true, until, name` so the app can show it); (b) otherwise the legacy check as before: when RELAY_TOKEN is set the token must equal it, 401 `Relay token missing or wrong`. One deliberate tightening: when RELAY_TOKENS is set but RELAY_TOKEN is not, unmapped tokens get 401 instead of an open relay. With neither set, the relay is open exactly as today.
3. `until`: "YYYY-MM-DD" is good through the end of that day (23:59:59 +10:00, so Brisbane end of day and one hour into the next day for Sydney/Melbourne summer); a full ISO instant is taken literally; an unparseable value is treated as no expiry (ping shows it as given). Missing `until` = no expiry.
4. A mapped token always uses the server's env Twilio/Resend credentials; `creds` in the request body are ignored even when ALLOW_CLIENT_CREDS=1.
5. Email for a mapped token: From = `"<name> via Quote & Chase" <addr>` where addr is the address inside RESEND_FROM (works with `Name <addr>` or a bare address). The name is flattened (CR/LF/tab/quotes/backslashes -> space, 80 chars) so it cannot inject headers. Reply-To = the request's `reply_to` if the app sent one (the app sends details.email), else the entry's `reply_to`, else none. This applies to send, schedule and the `test` action alike. An entry with no name leaves From as RESEND_FROM.
6. SMS: unchanged for mapped tokens (nothing appended; the app signs texts).
7. Idempotency, scheduling and cancel: same code path. The in-memory key is prefixed with the last 8 chars of the token for mapped tokens so two painters with the same job id + ref + version cannot reuse each other's message id; the legacy key space is untouched.
8. `ping`: for a mapped token adds `hosted: true, until (or null), name` and reports `client_creds: false`; `token_required` is now true whenever RELAY_TOKEN or a non-empty RELAY_TOKENS is set. Legacy ping is byte-for-byte the same shape as before.

## Exact error strings
- 403 `Hosted sending has ended for this account` (disabled or expired mapped token, every action including ping)
- 401 `Relay token missing or wrong` (unchanged wording; now also for an unmapped token when only RELAY_TOKENS is set)
- Everything else unchanged (`Origin not allowed`, `Slow down`, `Bad JSON`, `Unknown action`, provider messages).

## Council six additions (api/stripe-webhook.js, api/setup-link.js, api/sms-in.js)

- From name on hosted email is now `"<Trading Name>" <RESEND_FROM address>`; "via Quote & Chase" is gone.
- `POST /api/stripe-webhook`: verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`, and on `checkout.session.completed`
  (paid) builds link one from customer_details (name, email, phone, billing address), emails it to the painter
  (Reply-To/BCC `OWNER_EMAIL`), texts `OWNER_MOBILE`. Needs `APP_URL`, optional `BOOKING_URL`.
- `GET /api/setup-link?session=cs_...`: the booked page asks for the same link with `STRIPE_SECRET_KEY`; CORS for the Pages site.
- `POST /api/sms-in`: Twilio inbound. Signed with `TWILIO_AUTH_TOKEN` (override the URL with `TWILIO_INBOUND_URL`). Answers
  "This number sends messages for a painting business and cannot take replies. Please text or call the mobile in the message
  you received." and copies the reply to `INBOUND_FORWARD_TO` when set. STOP words get no answer (Twilio handles opt-out).
- Test: `node scratchpad/smoke/send/webhook.cjs` (all pass, stubbed Stripe/Twilio/Resend).

## Env vars the owner must set on Vercel (project quote-and-chase-landing, Production)
Already required for hosted sending (the server's own accounts, used for every mapped token):
- TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
- TWILIO_AUTH_TOKEN = (auth token)  or  TWILIO_API_KEY = SKxxxx + TWILIO_AUTH_TOKEN = (that key's secret)
- TWILIO_MESSAGING_SERVICE_SID = MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  (needed for scheduled SMS)
- RESEND_API_KEY = re_xxxxxxxxx
- RESEND_FROM = Quote & Chase <hello@yourverifieddomain.com.au>  (must be on a domain verified in Resend; the display name is replaced per painter, the address is kept)
- RELAY_TOKEN = (long random string; keep the existing one so the owner's own app keeps working)
- ALLOWED_ORIGINS = https://aa-ronjs.github.io,https://aaronsteele.vercel.app  (add the app's host if it moves)
New:
- RELAY_TOKENS = {"qc_7f3a9c2e1b8d4f60":{"name":"Dave's Painting","reply_to":"dave@example.com","until":"2026-12-20","disabled":false}}
  One line of JSON. One entry per painter; the token is what goes in the set-up link's settings.sending.token (with server: https://<landing-host>/api/msg, server_has_creds: true, hosted: true, hosted_until and hosted_name matching the entry). To end hosting early set "disabled": true; to extend, move "until". Vercel needs a redeploy (or the function's next cold start) after an env change.
Leave ALLOW_CLIENT_CREDS unset (mapped tokens ignore body creds anyway).

## Privacy page paragraph that will need to change (not edited)
/home/user/portfolio/quote-and-chase-landing/public/privacy.html, the "where things go" table row starting `You send or schedule through the relay (SMS or email you have set up)` (line 63): it says the relay is "a small function you deploy on Vercel" and "If you use a relay run by someone else, your credentials and every message pass through their server." With hosted sending the painter's messages go through Aaron's relay and Aaron's Twilio/Resend accounts (which keep message logs), email goes out from Aaron's verified address in the painter's display name with Reply-To the painter's email, and no credentials travel from the phone. Secondary lines touched by the same fact: line 45 ("We do not run a server that holds it"), line 52 and line 74 (keys stay on the phone / relay run by someone else), line 71 (cross-border list is already right).

## Test output (node scratchpad/smoke/send/relay-tokens.cjs)
54/54 passed. Sections: legacy RELAY_TOKEN (14: wrong/missing token 401, ping shape without hosted keys, From verbatim, Reply-To from request only, SMS unchanged, schedule/idempotency/cancel, open relay when nothing set, ALLOW_CLIENT_CREDS gap-fill), mapped token (19: From display name, Reply-To precedence and fallback, test action, scheduled email, no-until entry, header-injection name flattened, bare RESEND_FROM, SMS untouched on server account, body creds ignored, idempotency kept apart per token and from legacy, cancel sms/email, length check), disabled/expired (9: 403 wording for send/schedule/cancel/ping, ISO past, no provider call made, until today allowed), ping (4), gate (8: unmapped 401, prototype key, non-string token, RELAY_TOKENS-only closes the relay, malformed JSON degrades, env re-read).
Regression: the older adversarial smoke scratchpad/smoke/send/relay.mjs produces identical PASS/FAIL lines against HEAD and against the modified file (it crashes at its line 85 on both, a stale test expectation from an earlier fix, not this change).
