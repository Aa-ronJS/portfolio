#!/usr/bin/env bash
# Founder Stack bootstrap: run once on a fresh server.
#   sudo ./install.sh
# Installs Docker if missing, creates .env with generated secrets,
# and starts the HTTPS reverse proxy. After this, use ./stackctl.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log()  { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "run as root: sudo ./install.sh"
command -v openssl >/dev/null || fail "openssl is required"

# --- Docker ---------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker (get.docker.com)..."
  curl -fsSL https://get.docker.com | sh
else
  log "Docker already installed."
fi
docker compose version >/dev/null 2>&1 || fail "docker compose v2 plugin missing; install docker-compose-plugin"

# --- .env -----------------------------------------------------------------
gen() {
  case "$1" in
    __GEN_PASSWORD__)    openssl rand -base64 24 | tr -d '/+=' | cut -c1-24 ;;
    __GEN_HEX_16__)      openssl rand -hex 8 ;;
    __GEN_HEX_32__)      openssl rand -hex 16 ;;
    __GEN_HEX_64__)      openssl rand -hex 32 ;;
    __GEN_B64_32__)      openssl rand -base64 32 ;;
    __GEN_LARAVEL_KEY__) printf 'base64:%s' "$(openssl rand -base64 32)" ;;
    *) return 1 ;;
  esac
}

if [ -f .env ]; then
  log ".env already exists — keeping it (delete it to regenerate)."
else
  read -rp "Your domain (e.g. example.com, or a free one like yourbiz.duckdns.org): " DOMAIN
  [ -n "$DOMAIN" ] || fail "domain is required"
  read -rp "Email for Let's Encrypt + admin accounts: " EMAIL
  [ -n "$EMAIL" ] || fail "email is required"
  read -rp "Business name (shown across every app) [Founder Stack]: " BRAND_IN
  BRAND_IN="${BRAND_IN:-Founder Stack}"

  echo
  echo "Outbound email (invoices, invites, newsletters) needs an SMTP relay."
  echo "Free tiers that work: Resend (3,000/mo), Brevo (300/day). Enter to skip for now."
  read -rp "SMTP host [skip]: " SMTP_HOST_IN
  SMTP_PORT_IN=587; SMTP_USER_IN=""; SMTP_PASS_IN=""
  if [ -n "$SMTP_HOST_IN" ]; then
    read -rp "SMTP port [587]: " p; SMTP_PORT_IN="${p:-587}"
    read -rp "SMTP username: " SMTP_USER_IN
    read -rsp "SMTP password/API key: " SMTP_PASS_IN; echo
  fi

  log "Generating .env with fresh secrets..."
  while IFS= read -r line; do
    case "$line" in
      BASE_DOMAIN=*)   line="BASE_DOMAIN=$DOMAIN" ;;
      STACK_ROOT=*)    line="STACK_ROOT=$ROOT" ;;
      BRAND_NAME=*)    line="BRAND_NAME=$BRAND_IN" ;;
      ACME_EMAIL=*)    line="ACME_EMAIL=$EMAIL" ;;
      ADMIN_EMAIL=*)   line="ADMIN_EMAIL=$EMAIL" ;;
      SMTP_FROM=*)     line="SMTP_FROM=noreply@$DOMAIN" ;;
      SMTP_HOST=*)     line="SMTP_HOST=$SMTP_HOST_IN" ;;
      SMTP_PORT=*)     line="SMTP_PORT=$SMTP_PORT_IN" ;;
      SMTP_USER=*)     line="SMTP_USER=$SMTP_USER_IN" ;;
      SMTP_PASSWORD=*) line="SMTP_PASSWORD=$SMTP_PASS_IN" ;;
      DUCKDNS_SUBDOMAIN=*) case "$DOMAIN" in *.duckdns.org) line="DUCKDNS_SUBDOMAIN=${DOMAIN%.duckdns.org}" ;; esac ;;
      *=__GEN_*__)
        key="${line%%=*}"; placeholder="${line#*=}"
        line="$key=$(gen "$placeholder")" ;;
    esac
    printf '%s\n' "$line"
  done < .env.example > .env
  # the short-links admin UI is protected with the same admin login (single-quoted: dotenv must not expand the $ signs)
  AP="$(grep '^ADMIN_PASSWORD=' .env | cut -d= -f2-)"
  sed -i "s|^ADMIN_HTPASSWD=.*|ADMIN_HTPASSWD='admin:$(openssl passwd -apr1 "$AP")'|" .env
  chmod 600 .env
  log "Wrote .env (mode 600). Your admin password is in it: grep ADMIN_PASSWORD .env"
fi

# --- Proxy network + Traefik ---------------------------------------------
docker network inspect proxy >/dev/null 2>&1 || {
  log "Creating shared 'proxy' network..."
  docker network create proxy >/dev/null
}

log "Starting Traefik (HTTPS reverse proxy)..."
docker compose --env-file "$ROOT/.env" -f "$ROOT/traefik/docker-compose.yml" -p fs-traefik up -d

BASE_DOMAIN="$(grep '^BASE_DOMAIN=' .env | cut -d= -f2-)"
case "$(uname -m)" in
  aarch64|arm64)
    cat <<EOF

  arm64 server detected (Oracle Always Free, Raspberry Pi, ...).
  Three upstreams only publish amd64 images, so 'stackctl up --all' will use
  their ARM-capable equivalents automatically:
      calcom -> easyappointments     twenty -> espocrm     mattermost -> rocketchat
EOF
    ;;
esac
cat <<EOF

  Founder Stack is bootstrapped.

  Make sure DNS has a wildcard record pointing here:
      *.$BASE_DOMAIN  A  <this server's IP>

  Next:
      ./stackctl up homepage console   # the hub + its control panel
      ./stackctl up --all              # everything (or pick apps)

  Then open https://console.$BASE_DOMAIN (login: admin / ADMIN_PASSWORD from .env)
  and run the rest from the browser — or keep using ./stackctl.

EOF
if [ -t 0 ]; then
  read -rp "Deploy everything now (all apps, first-run setup, SSO, brand)? [Y/n] " yn
  case "${yn:-Y}" in [Yy]*) exec "$ROOT/stackctl" deploy ;; esac
fi
