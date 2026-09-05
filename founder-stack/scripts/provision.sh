#!/usr/bin/env bash
# Cross-app user provisioning — the "one identity everywhere" engine.
# Sourced by stackctl (user add|passwd|rm). Each provisioner creates/updates/
# removes the same email+password account in one app, via its API or its
# container's CLI. Every provisioner is best-effort: on failure it prints a
# manual fallback instead of aborting the whole run.
#
# Coverage model (also in docs/SSO.md):
#   - Real OIDC SSO (Authentik): vikunja, mattermost, documenso, vaultwarden,
#     listmonk*, nextcloud*                       (*after one-time setup)
#   - Scripted same-credentials accounts (this file): authentik, nextcloud,
#     mattermost, chatwoot, vikunja, listmonk, umami, activepieces, calcom,
#     ghost, vaultwarden (email invite)
#   - In-app invite (no usable API on the free tier): twenty, docmost,
#     formbricks, invoiceninja
#   - Single-admin by design: uptime-kuma

PROVISION_OK=()
PROVISION_FAILED=()
PROVISION_MANUAL=()

envval() { grep "^$1=" "$ENVFILE" | head -1 | cut -d= -f2-; }

note_ok()     { PROVISION_OK+=("$1"); printf '  \033[1;32m✔\033[0m %s\n' "$2"; }
note_fail()   { PROVISION_FAILED+=("$1"); printf '  \033[1;31m✖\033[0m %s\n' "$2"; }
note_manual() { PROVISION_MANUAL+=("$1: $2"); }

app_running() { [ "$(running_count "$1")" -gt 0 ]; }

# http <method> <url> <curl extra args...>  -> body on stdout, HTTP code in $HTTP_CODE
http() {
  local method="$1" url="$2"; shift 2
  local out
  out="$(curl -sS -X "$method" -w $'\n%{http_code}' --max-time 30 "$url" "$@" 2>/dev/null)" || { HTTP_CODE=000; return 1; }
  HTTP_CODE="${out##*$'\n'}"
  printf '%s' "${out%$'\n'*}"
  [ "${HTTP_CODE:0:1}" = 2 ]
}

json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

# ---------- Authentik (the identity server itself) ----------
provision_authentik() { # <add|passwd|rm> <email> <password>
  local action="$1" email="$2" pass="$3"
  app_running authentik || { note_manual authentik "not running"; return; }
  local base="https://auth.$(base_domain)/api/v3"
  local tok; tok="$(envval AUTHENTIK_BOOTSTRAP_TOKEN)"
  [ -n "$tok" ] || { note_fail authentik "AUTHENTIK_BOOTSTRAP_TOKEN missing from .env"; return; }
  local auth=(-H "Authorization: Bearer $tok" -H "Content-Type: application/json")
  local user="${email%%@*}"

  # find existing user id by email
  local pk
  pk="$(http GET "$base/core/users/?email=$email" "${auth[@]}" | sed -n 's/.*"pk":\([0-9]*\).*/\1/p' | head -1)"

  case "$action" in
    add)
      if [ -z "$pk" ]; then
        http POST "$base/core/users/" "${auth[@]}" \
          -d "{\"username\":\"$(json_escape "$user")\",\"email\":\"$(json_escape "$email")\",\"name\":\"$(json_escape "$user")\",\"is_active\":true}" >/dev/null \
          || { note_fail authentik "create failed (HTTP $HTTP_CODE)"; return; }
        pk="$(http GET "$base/core/users/?email=$email" "${auth[@]}" | sed -n 's/.*"pk":\([0-9]*\).*/\1/p' | head -1)"
      fi
      [ -n "$pk" ] || { note_fail authentik "user not found after create"; return; }
      http POST "$base/core/users/$pk/set_password/" "${auth[@]}" \
        -d "{\"password\":\"$(json_escape "$pass")\"}" >/dev/null \
        || { note_fail authentik "set password failed (HTTP $HTTP_CODE)"; return; }
      note_ok authentik "authentik — SSO account (covers every OIDC app)"
      ;;
    passwd)
      [ -n "$pk" ] || { note_fail authentik "no such user"; return; }
      http POST "$base/core/users/$pk/set_password/" "${auth[@]}" \
        -d "{\"password\":\"$(json_escape "$pass")\"}" >/dev/null \
        && note_ok authentik "authentik — password rotated" \
        || note_fail authentik "set password failed (HTTP $HTTP_CODE)"
      ;;
    rm)
      [ -n "$pk" ] || { note_manual authentik "no such user"; return; }
      http DELETE "$base/core/users/$pk/" "${auth[@]}" >/dev/null \
        && note_ok authentik "authentik — user removed (kills SSO everywhere)" \
        || note_fail authentik "delete failed (HTTP $HTTP_CODE)"
      ;;
  esac
}

# ---------- Nextcloud (occ CLI) ----------
provision_nextcloud() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running nextcloud || { note_manual nextcloud "not running"; return; }
  case "$action" in
    add)
      docker exec -e OC_PASS="$pass" -u www-data fs-nextcloud-app-1 \
        php occ user:add --password-from-env --display-name "$user" "$user" >/dev/null 2>&1 \
        && docker exec -u www-data fs-nextcloud-app-1 php occ user:setting "$user" settings email "$email" >/dev/null 2>&1 \
        && note_ok nextcloud "nextcloud — account created" \
        || note_fail nextcloud "occ user:add failed (already exists?)"
      ;;
    passwd)
      docker exec -e OC_PASS="$pass" -u www-data fs-nextcloud-app-1 \
        php occ user:resetpassword --password-from-env "$user" >/dev/null 2>&1 \
        && note_ok nextcloud "nextcloud — password rotated" \
        || note_fail nextcloud "occ resetpassword failed"
      ;;
    rm)
      docker exec -u www-data fs-nextcloud-app-1 php occ user:delete "$user" >/dev/null 2>&1 \
        && note_ok nextcloud "nextcloud — user removed" \
        || note_fail nextcloud "occ user:delete failed"
      ;;
  esac
}

# ---------- Mattermost (mmctl --local) ----------
provision_mattermost() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running mattermost || { note_manual mattermost "not running"; return; }
  case "$action" in
    add)
      docker exec fs-mattermost-app-1 mmctl --local user create \
        --email "$email" --username "$user" --password "$pass" --email-verified >/dev/null 2>&1 \
        && note_ok mattermost "mattermost — account created" \
        || note_fail mattermost "mmctl user create failed (already exists?)"
      ;;
    passwd)
      docker exec fs-mattermost-app-1 mmctl --local user change-password "$email" \
        --password "$pass" >/dev/null 2>&1 \
        && note_ok mattermost "mattermost — password rotated" \
        || note_fail mattermost "mmctl change-password failed"
      ;;
    rm)
      docker exec fs-mattermost-app-1 mmctl --local user delete "$email" --confirm >/dev/null 2>&1 \
        && note_ok mattermost "mattermost — user removed" \
        || note_fail mattermost "mmctl user delete failed"
      ;;
  esac
}

# ---------- Chatwoot (rails runner) ----------
provision_chatwoot() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running chatwoot || { note_manual chatwoot "not running"; return; }
  local code
  case "$action" in
    add) code="u=User.new(name:'$user',email:'$email',password:'$pass',password_confirmation:'$pass'); u.skip_confirmation!; u.save!; AccountUser.create!(account:Account.first,user:u,role: :agent)" ;;
    passwd) code="u=User.find_by!(email:'$email'); u.update!(password:'$pass',password_confirmation:'$pass')" ;;
    rm) code="User.find_by!(email:'$email').destroy!" ;;
  esac
  docker exec fs-chatwoot-rails-1 bundle exec rails runner "$code" >/dev/null 2>&1 \
    && note_ok chatwoot "chatwoot — $action ok" \
    || note_fail chatwoot "rails runner failed (no account yet? finish onboarding first)"
}

# ---------- Vikunja (bundled CLI; also covered by real SSO) ----------
provision_vikunja() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running vikunja || { note_manual vikunja "not running"; return; }
  case "$action" in
    add)
      docker exec fs-vikunja-app-1 /app/vikunja/vikunja user create \
        -u "$user" -e "$email" -p "$pass" >/dev/null 2>&1 \
        && note_ok vikunja "vikunja — local account created (SSO button also works)" \
        || note_fail vikunja "CLI create failed (already exists?)"
      ;;
    passwd|rm) note_manual vikunja "use the Authentik SSO login; local $action not scripted" ;;
  esac
}

# ---------- Listmonk (admin API, basic auth) ----------
provision_listmonk() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running listmonk || { note_manual listmonk "not running"; return; }
  local base="https://newsletter.$(base_domain)/api"
  local admin_auth=(-u "$(envval ADMIN_USER):$(envval ADMIN_PASSWORD)" -H "Content-Type: application/json")
  case "$action" in
    add)
      http POST "$base/users" "${admin_auth[@]}" \
        -d "{\"username\":\"$(json_escape "$user")\",\"email\":\"$(json_escape "$email")\",\"name\":\"$(json_escape "$user")\",\"password\":\"$(json_escape "$pass")\",\"password2\":\"$(json_escape "$pass")\",\"type\":\"user\",\"user_role_id\":1,\"status\":\"enabled\",\"password_login\":true}" >/dev/null \
        && note_ok listmonk "listmonk — account created" \
        || { note_fail listmonk "API create failed (HTTP $HTTP_CODE)"; note_manual listmonk "Admin → Users → New"; }
      ;;
    passwd|rm) note_manual listmonk "Admin → Users ($action not scripted)" ;;
  esac
}

# ---------- Umami (REST API as admin) ----------
provision_umami() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running umami || { note_manual umami "not running"; return; }
  local base="https://analytics.$(base_domain)/api"
  local tok
  tok="$(http POST "$base/auth/login" -H "Content-Type: application/json" \
    -d "{\"username\":\"$(json_escape "$(envval ADMIN_USER)")\",\"password\":\"$(json_escape "$(envval ADMIN_PASSWORD)")\"}" \
    | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  [ -n "$tok" ] || { note_fail umami "admin login failed — did you change admin/umami to ADMIN_USER/ADMIN_PASSWORD?"; return; }
  case "$action" in
    add)
      http POST "$base/users" -H "Authorization: Bearer $tok" -H "Content-Type: application/json" \
        -d "{\"username\":\"$(json_escape "$user")\",\"password\":\"$(json_escape "$pass")\",\"role\":\"user\"}" >/dev/null \
        && note_ok umami "umami — account created (username: $user)" \
        || note_fail umami "API create failed (HTTP $HTTP_CODE)"
      ;;
    passwd|rm) note_manual umami "Settings → Users ($action not scripted)" ;;
  esac
}

# ---------- Activepieces (sign-up API; AP_SIGN_UP_ENABLED=true) ----------
provision_activepieces() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running activepieces || { note_manual activepieces "not running"; return; }
  case "$action" in
    add)
      http POST "https://automate.$(base_domain)/api/v1/authentication/sign-up" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$(json_escape "$email")\",\"password\":\"$(json_escape "$pass")\",\"firstName\":\"$(json_escape "$user")\",\"lastName\":\"-\",\"trackEvents\":false,\"newsLetter\":false}" >/dev/null \
        && note_ok activepieces "activepieces — account created" \
        || { note_fail activepieces "sign-up API failed (HTTP $HTTP_CODE)"; note_manual activepieces "invite from the admin UI"; }
      ;;
    passwd|rm) note_manual activepieces "manage in the admin UI ($action not scripted)" ;;
  esac
}

# ---------- Cal.com (signup API) ----------
provision_calcom() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running calcom || { note_manual calcom "not running"; return; }
  case "$action" in
    add)
      http POST "https://cal.$(base_domain)/api/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$(json_escape "$email")\",\"password\":\"$(json_escape "$pass")\",\"username\":\"$(json_escape "$user")\",\"language\":\"en\"}" >/dev/null \
        && note_ok calcom "cal.com — account created" \
        || { note_fail calcom "signup API failed (HTTP $HTTP_CODE)"; note_manual calcom "sign up at https://cal.$(base_domain)/signup"; }
      ;;
    passwd|rm) note_manual calcom "Settings → Security ($action not scripted)" ;;
  esac
}

# ---------- Ghost (admin session -> staff invite email) ----------
provision_ghost() {
  local action="$1" email="$2"
  app_running ghost || { note_manual ghost "not running"; return; }
  [ "$action" = add ] || { note_manual ghost "manage staff in Ghost admin"; return; }
  local base="https://blog.$(base_domain)/ghost/api/admin" jar
  jar="$(mktemp)"
  http POST "$base/session/" -c "$jar" -H "Content-Type: application/json" -H "Origin: https://blog.$(base_domain)" \
    -d "{\"username\":\"$(json_escape "$(envval ADMIN_EMAIL)")\",\"password\":\"$(json_escape "$(envval ADMIN_PASSWORD)")\"}" >/dev/null \
    || { rm -f "$jar"; note_fail ghost "admin login failed (owner account must use ADMIN_EMAIL/ADMIN_PASSWORD)"; return; }
  local role_id
  role_id="$(http GET "$base/roles/" -b "$jar" -H "Origin: https://blog.$(base_domain)" \
    | tr '{' '\n' | grep '"name":"Editor"' | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)"
  if [ -n "$role_id" ] && http POST "$base/invites/" -b "$jar" -H "Content-Type: application/json" -H "Origin: https://blog.$(base_domain)" \
      -d "{\"invites\":[{\"email\":\"$(json_escape "$email")\",\"role_id\":\"$role_id\"}]}" >/dev/null; then
    note_ok ghost "ghost — editor invite emailed (needs SMTP configured)"
  else
    note_fail ghost "invite failed (HTTP $HTTP_CODE)"; note_manual ghost "invite from Ghost admin → Staff"
  fi
  rm -f "$jar"
}

# ---------- Vaultwarden (admin invite email) ----------
provision_vaultwarden() {
  local action="$1" email="$2"
  app_running vaultwarden || { note_manual vaultwarden "not running"; return; }
  [ "$action" = add ] || { note_manual vaultwarden "users manage their own master password"; return; }
  local base="https://vault.$(base_domain)" jar
  jar="$(mktemp)"
  http POST "$base/admin" -c "$jar" --data-urlencode "token=$(envval VAULTWARDEN_ADMIN_TOKEN)" >/dev/null \
    || { rm -f "$jar"; note_fail vaultwarden "admin login failed"; return; }
  http POST "$base/admin/invite" -b "$jar" -H "Content-Type: application/json" \
    -d "{\"email\":\"$(json_escape "$email")\"}" >/dev/null \
    && note_ok vaultwarden "vaultwarden — invite sent (they choose their own master password)" \
    || note_fail vaultwarden "invite failed (HTTP $HTTP_CODE)"
  rm -f "$jar"
}

# ---------- Orchestrator ----------
run_provisioners() { # <add|passwd|rm> <email> <password>
  local action="$1" email="$2" pass="$3"
  PROVISION_OK=(); PROVISION_FAILED=(); PROVISION_MANUAL=()

  provision_authentik  "$action" "$email" "$pass"
  provision_nextcloud  "$action" "$email" "$pass"
  provision_mattermost "$action" "$email" "$pass"
  provision_chatwoot   "$action" "$email" "$pass"
  provision_vikunja    "$action" "$email" "$pass"
  provision_listmonk   "$action" "$email" "$pass"
  provision_umami      "$action" "$email" "$pass"
  provision_activepieces "$action" "$email" "$pass"
  provision_calcom     "$action" "$email" "$pass"
  provision_ghost      "$action" "$email" "$pass"
  provision_vaultwarden "$action" "$email" "$pass"

  echo
  if [ "$action" = add ]; then
    printf '\033[1mReal SSO via Authentik\033[0m (this account, "authentik"/OIDC button): tasks, chat, sign, vault'
    [ "$(envval SSO_ENABLED)" = true ] || printf '  [run: stackctl sso on]'
    echo
    echo "In-app invite needed (no scripting possible on free tier): twenty (crm), docmost (docs), formbricks (forms), invoiceninja (invoices)"
    echo "Single-admin by design: uptime-kuma (status)"
  fi
  if [ ${#PROVISION_MANUAL[@]} -gt 0 ]; then
    echo "Skipped/manual:"
    printf '  - %s\n' "${PROVISION_MANUAL[@]}"
  fi
}
