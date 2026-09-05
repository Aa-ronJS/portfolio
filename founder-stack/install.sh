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
  read -rp "Your apex domain (e.g. example.com): " DOMAIN
  [ -n "$DOMAIN" ] || fail "domain is required"
  read -rp "Email for Let's Encrypt + admin accounts: " EMAIL
  [ -n "$EMAIL" ] || fail "email is required"

  log "Generating .env with fresh secrets..."
  while IFS= read -r line; do
    case "$line" in
      BASE_DOMAIN=*)   line="BASE_DOMAIN=$DOMAIN" ;;
      ACME_EMAIL=*)    line="ACME_EMAIL=$EMAIL" ;;
      ADMIN_EMAIL=*)   line="ADMIN_EMAIL=$EMAIL" ;;
      SMTP_FROM=*)     line="SMTP_FROM=noreply@$DOMAIN" ;;
      *=__GEN_*__)
        key="${line%%=*}"; placeholder="${line#*=}"
        line="$key=$(gen "$placeholder")" ;;
    esac
    printf '%s\n' "$line"
  done < .env.example > .env
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
cat <<EOF

  Founder Stack is bootstrapped.

  Make sure DNS has a wildcard record pointing here:
      *.$BASE_DOMAIN  A  <this server's IP>

  Next:
      ./stackctl list          # see the catalog
      ./stackctl up --all      # or pick apps: ./stackctl up calcom umami
      ./stackctl status

EOF
