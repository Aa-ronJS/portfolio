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
#     twenty, invoiceninja, rocketchat, espocrm; email invites for ghost,
#     vaultwarden, docmost (need SMTP)
#   - In-app invite: formbricks (no API for members on the free tier)
#   - Single-admin by design: uptime-kuma

PROVISION_OK=()
PROVISION_FAILED=()
PROVISION_MANUAL=()
HTTP_CODE=000   # set by http(); initialised so failed subshell calls never trip set -u

envval() { grep "^$1=" "$ENVFILE" | head -1 | cut -d= -f2-; }

note_ok()     { PROVISION_OK+=("$1"); printf '  \033[1;32m✔\033[0m %s\n' "$2"; }
note_fail()   { PROVISION_FAILED+=("$1"); printf '  \033[1;31m✖\033[0m %s\n' "$2"; }
note_manual() { PROVISION_MANUAL+=("$1: $2"); }

app_running() { [ "$(running_count "$1")" -gt 0 ]; }

# http <method> <url> <curl extra args...>  -> body on stdout, HTTP code in $HTTP_CODE
# STACK_INSECURE=1 enables local/dev mode: accept self-signed certs and skip
# any HTTP proxy (for LAN installs or before Let's Encrypt has real certs).
http() {
  local method="$1" url="$2"; shift 2
  local out extra=()
  [ "${STACK_INSECURE:-0}" = 1 ] && extra=(-k --noproxy '*')
  out="$(curl -sS -X "$method" -w $'\n%{http_code}' --max-time 30 "${extra[@]}" "$url" "$@" 2>/dev/null)" || { HTTP_CODE=000; return 1; }
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
  # rails runner prints deprecation/INFO noise to stderr and can still exit 0,
  # so success is judged by a sentinel line, not the exit code.
  local code out
  case "$action" in
    add)
      # one atomic script: create the account on first run, then the user,
      # then link them (administrator if first user, else agent)
      code="a = Account.first || Account.create!(name: 'Founder Stack');
role = AccountUser.count.zero? ? :administrator : :agent;
u = User.find_by(email: '$email') || User.new(name: '$user', email: '$email');
u.password = '$pass'; u.password_confirmation = '$pass'; u.skip_confirmation!; u.save!;
AccountUser.find_or_create_by!(account: a, user: u) { |au| au.role = role };
puts 'PROVISION_OK'"
      ;;
    passwd) code="u = User.find_by!(email: '$email'); u.update!(password: '$pass', password_confirmation: '$pass'); puts 'PROVISION_OK'" ;;
    rm) code="u = User.find_by(email: '$email'); u&.destroy!; puts 'PROVISION_OK'" ;;
  esac
  out="$(docker exec fs-chatwoot-rails-1 bundle exec rails runner "$code" 2>/dev/null)"
  if printf '%s' "$out" | grep -q PROVISION_OK; then
    note_ok chatwoot "chatwoot — $action ok"
  else
    note_fail chatwoot "rails runner failed (still migrating? retry in a minute)"
  fi
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

# ---------- Listmonk (admin session; its API rejects password basic-auth) ----------
listmonk_session() { # <jar> — logs in as admin, cookie lands in jar
  local jar="$1" base="https://newsletter.$(base_domain)" nonce
  http GET "$base/admin/login" -c "$jar" >/dev/null || return 1
  nonce="$(awk '$6=="nonce"{print $7}' "$jar")"
  [ -n "$nonce" ] || return 1
  http POST "$base/admin/login" -b "$jar" -c "$jar" \
    -d "username=$(envval ADMIN_USER)" -d "password=$(envval ADMIN_PASSWORD)" \
    -d "nonce=$nonce" -d "next=/admin" >/dev/null
  # login success is a 302 redirect; http() treats non-2xx as failure, so
  # verify the session directly instead
  http GET "$base/api/profile" -b "$jar" >/dev/null
}
provision_listmonk() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running listmonk || { note_manual listmonk "not running"; return; }
  local base="https://newsletter.$(base_domain)" jar
  jar="$(mktemp)"
  listmonk_session "$jar" || { rm -f "$jar"; note_fail listmonk "admin login failed"; return; }
  case "$action" in
    add)
      # note: the stock role (id 1) is Super Admin — fine for a small team
      http POST "$base/api/users" -b "$jar" -H "Content-Type: application/json" \
        -d "{\"username\":\"$(json_escape "$user")\",\"email\":\"$(json_escape "$email")\",\"name\":\"$(json_escape "$user")\",\"password\":\"$(json_escape "$pass")\",\"password2\":\"$(json_escape "$pass")\",\"type\":\"user\",\"user_role_id\":1,\"list_role_id\":null,\"status\":\"enabled\",\"password_login\":true}" >/dev/null \
        && note_ok listmonk "listmonk — account created" \
        || { note_fail listmonk "API create failed (HTTP $HTTP_CODE)"; note_manual listmonk "Admin → Users → New"; }
      ;;
    rm)
      local uid
      uid="$(http GET "$base/api/users" -b "$jar" | tr '{' '\n' | grep "\"email\":\"$email\"" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1)"
      if [ -n "$uid" ]; then
        http DELETE "$base/api/users/$uid" -b "$jar" >/dev/null \
          && note_ok listmonk "listmonk — user removed" \
          || note_fail listmonk "delete failed (HTTP $HTTP_CODE)"
      else
        note_manual listmonk "no such user"
      fi
      ;;
    passwd) note_manual listmonk "Admin → Users (rotate not scripted)" ;;
  esac
  rm -f "$jar"
}

# ---------- Umami (REST API as admin) ----------
provision_umami() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running umami || { note_manual umami "not running"; return; }
  local base="https://analytics.$(base_domain)/api"
  local admin_pass tok
  admin_pass="$(envval ADMIN_PASSWORD)"
  tok="$(http POST "$base/auth/login" -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"$(json_escape "$admin_pass")\"}" \
    | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  if [ -z "$tok" ]; then
    # fresh install ships admin/umami — log in with it and immediately
    # rotate the admin password to ADMIN_PASSWORD from .env
    tok="$(http POST "$base/auth/login" -H "Content-Type: application/json" \
      -d '{"username":"admin","password":"umami"}' \
      | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
    if [ -n "$tok" ]; then
      http POST "$base/me/password" -H "Authorization: Bearer $tok" -H "Content-Type: application/json" \
        -d "{\"currentPassword\":\"umami\",\"newPassword\":\"$(json_escape "$admin_pass")\"}" >/dev/null \
        && note_ok umami "umami — default admin password rotated to ADMIN_PASSWORD"
    fi
  fi
  [ -n "$tok" ] || { note_fail umami "admin login failed (not ADMIN_PASSWORD, not the default)"; return; }
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
  # zero-touch first run: if Ghost has no owner yet, create one from .env
  if http GET "$base/authentication/setup/" | grep -q '"status":false'; then
    http POST "$base/authentication/setup/" -H "Content-Type: application/json" \
      -d "{\"setup\":[{\"name\":\"$(json_escape "$(envval ADMIN_USER)")\",\"email\":\"$(json_escape "$(envval ADMIN_EMAIL)")\",\"password\":\"$(json_escape "$(envval ADMIN_PASSWORD)")\",\"blogTitle\":\"Blog\"}]}" >/dev/null \
      && note_ok ghost "ghost — bootstrapped owner account as ADMIN_EMAIL"
  fi
  if [ -z "$(envval SMTP_HOST)" ]; then
    # without SMTP, Ghost 500s on admin login (it emails a sign-in notice)
    # and on staff invites — nothing more we can script
    rm -f "$jar"
    note_manual ghost "no SMTP configured — invite '$email' from Ghost admin → Staff once SMTP is set"
    return
  fi
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
  if [ -z "$(envval SMTP_HOST)" ]; then
    # invites are emailed; without SMTP the API 500s instead of creating the user
    note_manual vaultwarden "no SMTP configured — signups are open at https://vault.$(base_domain), have them register"
    return
  fi
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

# ---------- Rocket.Chat (REST API as admin) — ARM alternative to Mattermost ----------
provision_rocketchat() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running rocketchat || return   # silent: it's an alternative, usually not running
  local base="https://chat.$(base_domain)/api/v1" body tok uid
  body="$(http POST "$base/login" -H "Content-Type: application/json" \
    -d "{\"user\":\"$(json_escape "$(envval ADMIN_USER)")\",\"password\":\"$(json_escape "$(envval ADMIN_PASSWORD)")\"}")" \
    || { note_fail rocketchat "admin login failed (HTTP $HTTP_CODE)"; return; }
  tok="$(printf '%s' "$body" | sed -n 's/.*"authToken":"\([^"]*\)".*/\1/p')"
  uid="$(printf '%s' "$body" | sed -n 's/.*"userId":"\([^"]*\)".*/\1/p')"
  local auth=(-H "X-Auth-Token: $tok" -H "X-User-Id: $uid" -H "Content-Type: application/json")
  case "$action" in
    add)
      http POST "$base/users.create" "${auth[@]}" \
        -d "{\"email\":\"$(json_escape "$email")\",\"name\":\"$(json_escape "$user")\",\"username\":\"$(json_escape "$user")\",\"password\":\"$(json_escape "$pass")\",\"verified\":true}" >/dev/null \
        && note_ok rocketchat "rocket.chat — account created" \
        || note_fail rocketchat "users.create failed (HTTP $HTTP_CODE)"
      ;;
    passwd)
      local id; id="$(http GET "$base/users.info?username=$user" "${auth[@]}" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' | head -1)"
      # password changes require the admin to re-prove identity (2FA-by-password headers)
      local sha; sha="$(printf '%s' "$(envval ADMIN_PASSWORD)" | sha256sum | cut -d' ' -f1)"
      [ -n "$id" ] && http POST "$base/users.update" "${auth[@]}" -H "x-2fa-method: password" -H "x-2fa-code: $sha" \
        -d "{\"userId\":\"$id\",\"data\":{\"password\":\"$(json_escape "$pass")\"}}" >/dev/null \
        && note_ok rocketchat "rocket.chat — password rotated" \
        || note_fail rocketchat "users.update failed (HTTP $HTTP_CODE)"
      ;;
    rm)
      http POST "$base/users.delete" "${auth[@]}" -d "{\"username\":\"$(json_escape "$user")\"}" >/dev/null \
        && note_ok rocketchat "rocket.chat — user removed" \
        || note_fail rocketchat "users.delete failed (HTTP $HTTP_CODE)"
      ;;
  esac
}

# ---------- EspoCRM (REST API as admin) — ARM alternative to Twenty ----------
provision_espocrm() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running espocrm || return      # silent: it's an alternative, usually not running
  local base="https://crm.$(base_domain)/api/v1"
  local auth=(-u "$(envval ADMIN_USER):$(envval ADMIN_PASSWORD)" -H "Content-Type: application/json")
  case "$action" in
    add)
      http POST "$base/User" "${auth[@]}" \
        -d "{\"userName\":\"$(json_escape "$user")\",\"emailAddress\":\"$(json_escape "$email")\",\"firstName\":\"$(json_escape "$user")\",\"type\":\"regular\",\"isActive\":true,\"password\":\"$(json_escape "$pass")\",\"passwordConfirm\":\"$(json_escape "$pass")\"}" >/dev/null \
        && note_ok espocrm "espocrm — account created" \
        || note_fail espocrm "API create failed (HTTP $HTTP_CODE)"
      ;;
    passwd|rm) note_manual espocrm "Administration → Users ($action not scripted)" ;;
  esac
}


# ---------- Easy!Appointments (install endpoint + REST API) — ARM alternative to Cal.com ----------
provision_easyappointments() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running easyappointments || return   # silent: it's an alternative, usually not running
  local base="https://cal.$(base_domain)" jar csrf
  # zero-touch first run: an uninstalled instance redirects / to the install wizard
  local k=(); [ "${STACK_INSECURE:-0}" = 1 ] && k=(-k --noproxy '*')
  if curl -s "${k[@]}" -o /dev/null -w '%{redirect_url}' --max-time 20 "$base/" | grep -q 'installation'; then
    jar="$(mktemp)"
    csrf="$(http GET "$base/index.php/installation" -c "$jar" -b "$jar" | grep -oE "csrf_token[\"']?\s*[:=]\s*[\"'][^\"']+" | grep -oE "[^\"']+$" | head -1)"
    http POST "$base/index.php/installation/perform" -b "$jar" -c "$jar" -H "X-Requested-With: XMLHttpRequest" \
      --data-urlencode "csrf_token=$csrf" \
      --data-urlencode "admin[first_name]=$(envval ADMIN_USER)" --data-urlencode "admin[last_name]=-" \
      --data-urlencode "admin[email]=$(envval ADMIN_EMAIL)" --data-urlencode "admin[username]=$(envval ADMIN_USER)" \
      --data-urlencode "admin[password]=$(envval ADMIN_PASSWORD)" \
      --data-urlencode "company[company_name]=Founder Stack" --data-urlencode "company[company_email]=$(envval ADMIN_EMAIL)" \
      --data-urlencode "company[company_link]=$base" | grep -q '"success":true' \
      && note_ok easyappointments "easy!appointments — installed, admin = ADMIN_USER" \
      || { rm -f "$jar"; note_fail easyappointments "install failed (HTTP $HTTP_CODE)"; return; }
    rm -f "$jar"
  fi
  [ "$action" = add ] || { note_manual easyappointments "Users → Providers ($action not scripted)"; return; }
  # new users are "providers" (bookable staff) — created via the REST API as admin
  http POST "$base/index.php/api/v1/providers" -u "$(envval ADMIN_USER):$(envval ADMIN_PASSWORD)" -H "Content-Type: application/json" \
    -d "{\"firstName\":\"$(json_escape "$user")\",\"lastName\":\"-\",\"email\":\"$(json_escape "$email")\",\"services\":[],\"settings\":{\"username\":\"$(json_escape "$user")\",\"password\":\"$(json_escape "$pass")\",\"notifications\":true,\"calendarView\":\"default\"}}" >/dev/null \
    && note_ok easyappointments "easy!appointments — provider account created" \
    || note_fail easyappointments "API create failed (HTTP $HTTP_CODE)"
}

# ---------- Docmost (REST API) ----------
provision_docmost() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running docmost || { note_manual docmost "not running"; return; }
  [ "$action" = add ] || { note_manual docmost "Settings → Members ($action not scripted)"; return; }
  local base="https://docs.$(base_domain)/api" jar
  jar="$(mktemp)"
  # zero-touch first run: create the workspace + owner from .env
  if ! http POST "$base/auth/login" -c "$jar" -H "Content-Type: application/json" \
      -d "{\"email\":\"$(json_escape "$(envval ADMIN_EMAIL)")\",\"password\":\"$(json_escape "$(envval ADMIN_PASSWORD)")\"}" >/dev/null; then
    http POST "$base/auth/setup" -c "$jar" -H "Content-Type: application/json" \
      -d "{\"workspaceName\":\"Founder Stack\",\"name\":\"$(json_escape "$(envval ADMIN_USER)")\",\"email\":\"$(json_escape "$(envval ADMIN_EMAIL)")\",\"password\":\"$(json_escape "$(envval ADMIN_PASSWORD)")\"}" >/dev/null \
      && note_ok docmost "docmost — bootstrapped workspace + owner as ADMIN_EMAIL" \
      || { rm -f "$jar"; note_fail docmost "setup/login failed (HTTP $HTTP_CODE)"; return; }
    http POST "$base/auth/login" -c "$jar" -H "Content-Type: application/json" \
      -d "{\"email\":\"$(json_escape "$(envval ADMIN_EMAIL)")\",\"password\":\"$(json_escape "$(envval ADMIN_PASSWORD)")\"}" >/dev/null
  fi
  if [ -z "$(envval SMTP_HOST)" ]; then
    rm -f "$jar"; note_manual docmost "no SMTP configured — invite '$email' from Settings → Members once SMTP is set"; return
  fi
  http POST "$base/workspace/invites/create" -b "$jar" -H "Content-Type: application/json" \
    -d "{\"emails\":[\"$(json_escape "$email")\"],\"role\":\"member\"}" >/dev/null \
    && note_ok docmost "docmost — invite emailed" \
    || note_fail docmost "invite failed (HTTP $HTTP_CODE)"
  rm -f "$jar"
}

# ---------- Invoice Ninja (REST API as the pre-seeded admin) ----------
provision_invoiceninja() {
  local action="$1" email="$2" pass="$3" user="${2%%@*}"
  app_running invoiceninja || { note_manual invoiceninja "not running"; return; }
  [ "$action" = add ] || { note_manual invoiceninja "Settings → User Management ($action not scripted)"; return; }
  local base="https://invoices.$(base_domain)/api/v1" tok
  tok="$(http POST "$base/login" -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" \
    -d "{\"email\":\"$(json_escape "$(envval ADMIN_EMAIL)")\",\"password\":\"$(json_escape "$(envval ADMIN_PASSWORD)")\"}" \
    | sed -n 's/.*"token": *"\([^"]*\)".*/\1/p' | head -1)"
  [ -n "$tok" ] || { note_fail invoiceninja "admin login failed (HTTP $HTTP_CODE)"; return; }
  http POST "$base/users?include=company_user" -H "Content-Type: application/json" -H "X-Api-Token: $tok" -H "X-Requested-With: XMLHttpRequest" \
    -d "{\"first_name\":\"$(json_escape "$user")\",\"last_name\":\"-\",\"email\":\"$(json_escape "$email")\",\"password\":\"$(json_escape "$pass")\",\"company_user\":{\"is_admin\":false,\"permissions\":\"view_client,edit_client,create_client,view_invoice,edit_invoice,create_invoice\"}}" >/dev/null \
    && note_ok invoiceninja "invoice ninja — account created" \
    || note_fail invoiceninja "API create failed (HTTP $HTTP_CODE)"
}

# ---------- Twenty CRM (GraphQL on /metadata; verified against v2.38) ----------
twenty_gql() { # <json body> [bearer token]
  http POST "https://crm.$(base_domain)/metadata" -H "Content-Type: application/json" \
    -H "Origin: https://crm.$(base_domain)" ${2:+-H "Authorization: Bearer $2"} -d "$1"
}
twenty_tok() { sed -n 's/.*"token":"\([^"]*\)".*/\1/p' | head -1; }
twenty_access_token() { # <email> <password> -> workspace access token on stdout (empty on failure)
  local o="https://crm.$(base_domain)" lt
  lt="$(twenty_gql "{\"query\":\"mutation{getLoginTokenFromCredentials(email:\\\"$1\\\",password:\\\"$2\\\",origin:\\\"$o\\\"){loginToken{token}}}\"}" | twenty_tok)"
  [ -n "$lt" ] || return 0
  twenty_gql "{\"query\":\"mutation{getAuthTokensFromLoginToken(loginToken:\\\"$lt\\\",origin:\\\"$o\\\"){tokens{accessOrWorkspaceAgnosticToken{token}}}}\"}" | twenty_tok
}
provision_twenty() {
  local action="$1" email="$2" pass="$3"
  app_running twenty || { note_manual twenty "not running"; return; }
  [ "$action" = add ] || { note_manual twenty "Settings → Members ($action not scripted)"; return; }
  local o="https://crm.$(base_domain)" aemail apass access agn lt hash body
  aemail="$(json_escape "$(envval ADMIN_EMAIL)")"; apass="$(json_escape "$(envval ADMIN_PASSWORD)")"
  access="$(twenty_access_token "$aemail" "$apass")"
  if [ -z "$access" ]; then
    # zero-touch first run: sign up the admin, create + activate the workspace
    agn="$(twenty_gql "{\"query\":\"mutation{signUp(email:\\\"$aemail\\\",password:\\\"$apass\\\"){tokens{accessOrWorkspaceAgnosticToken{token}}}}\"}" | twenty_tok)"
    lt="$(twenty_gql '{"query":"mutation{signUpInNewWorkspace(input:{displayName:\"Founder Stack\"}){loginToken{token} workspace{id}}}"}' "$agn" | twenty_tok)"
    access="$(twenty_gql "{\"query\":\"mutation{getAuthTokensFromLoginToken(loginToken:\\\"$lt\\\",origin:\\\"$o\\\"){tokens{accessOrWorkspaceAgnosticToken{token}}}}\"}" | twenty_tok)"
    [ -n "$access" ] || { note_fail twenty "workspace bootstrap failed (HTTP $HTTP_CODE)"; return; }
    twenty_gql '{"query":"mutation{activateWorkspace(data:{displayName:\"Founder Stack\"}){id}}"}' "$access" >/dev/null
    note_ok twenty "twenty — bootstrapped workspace + admin as ADMIN_EMAIL"
  fi
  hash="$(twenty_gql '{"query":"{currentWorkspace{inviteHash}}"}' "$access" | sed -n 's/.*"inviteHash":"\([^"]*\)".*/\1/p' | head -1)"
  [ -n "$hash" ] || { note_fail twenty "could not read workspace invite hash"; return; }
  body="$(twenty_gql "{\"query\":\"mutation{signUpInWorkspace(email:\\\"$(json_escape "$email")\\\",password:\\\"$(json_escape "$pass")\\\",workspaceInviteHash:\\\"$hash\\\"){loginToken{token}}}\"}")"
  if printf '%s' "$body" | grep -q '"loginToken":{"token"'; then note_ok twenty "twenty — account created and joined workspace"
  else note_fail twenty "sign-up failed: $(printf '%s' "$body" | sed -n 's/.*"message":"\([^"]*\)".*/\1/p' | head -1)"; fi
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
  provision_rocketchat "$action" "$email" "$pass"
  provision_espocrm    "$action" "$email" "$pass"
  provision_easyappointments "$action" "$email" "$pass"
  provision_docmost    "$action" "$email" "$pass"
  provision_invoiceninja "$action" "$email" "$pass"
  provision_twenty     "$action" "$email" "$pass"

  echo
  if [ "$action" = add ]; then
    printf '\033[1mReal SSO via Authentik\033[0m (this account, "authentik"/OIDC button): tasks, chat, sign, vault'
    [ "$(envval SSO_ENABLED)" = true ] || printf '  [run: stackctl sso on]'
    echo
    echo "In-app invite: formbricks (forms) — Organization → Members"
    echo "Single-admin by design: uptime-kuma (status)"
  fi
  if [ ${#PROVISION_MANUAL[@]} -gt 0 ]; then
    echo "Skipped/manual:"
    printf '  - %s\n' "${PROVISION_MANUAL[@]}"
  fi
}
