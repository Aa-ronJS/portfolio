#!/usr/bin/env bash
# Put the whole product on chasem.app: deploy this project to production, attach the
# domain, and set the environment it needs. Idempotent -- safe to run again.
#
#   VERCEL_TOKEN=xxxxx bash tools/finish-domain.sh
#
# The token comes from https://vercel.com/account/tokens (scope: your personal account).
# Without one, `vercel login` first and drop the --token flags.
set -euo pipefail

cd "$(dirname "$0")/.."
V="npx --yes vercel@latest"
TOK=${VERCEL_TOKEN:+--token $VERCEL_TOKEN}
DOMAIN=chasem.app

echo "==> who"
$V whoami $TOK

echo "==> link the project (creates it the first time)"
$V link --yes $TOK

echo "==> deploy to production"
$V deploy --prod --yes $TOK

echo "==> attach $DOMAIN and www"
$V domains add "$DOMAIN" $TOK || echo "   (already attached)"
$V domains add "www.$DOMAIN" $TOK || echo "   (already attached)"
$V alias set "$($V ls --yes $TOK 2>/dev/null | grep -m1 -oE 'https://[a-z0-9-]+\.vercel\.app')" "$DOMAIN" $TOK || true

cat <<'NOTE'

==> secrets still to set, once each, in the Vercel dashboard or with
    `vercel env add NAME production`:

      STRIPE_SECRET_KEY        the live key
      STRIPE_WEBHOOK_SECRET    printed by tools/stripe-setup.mjs
      RELAY_SIGNING_SECRET     a long random string, never changed after launch
      TWILIO_ACCOUNT_SID       and TWILIO_AUTH_TOKEN
      TWILIO_MESSAGING_SERVICE_SID   (scheduled SMS needs a Messaging Service, not a number)
      RESEND_API_KEY           and RESEND_FROM on a domain verified in Resend
      SUPPORT_EMAIL            the inbox a painter can actually reach

    Everything else already defaults to chasem.app in the code, so there is
    nothing else to paste.

==> then check it, in this order:
      curl -sI https://chasem.app/ | head -1
      curl -sI https://chasem.app/app/ | head -1
      curl -s -X POST https://chasem.app/api/msg \
        -H 'Content-Type: application/json' -H 'Origin: https://chasem.app' \
        -d '{"action":"ping"}'
NOTE
