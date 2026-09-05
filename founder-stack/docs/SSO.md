# Single sign-on: one account for the stack

The `authentik` app is the stack's identity provider at
`https://auth.<BASE_DOMAIN>`. Its blueprint
(`apps/authentik/blueprints/founder-stack.yaml`) auto-registers an OIDC
client for every SSO-capable app on first boot, using the client secrets
generated into `.env` — no clicking through provider setup screens.

## Turning it on

```bash
./stackctl up authentik      # optional; `sso on` starts it anyway
./stackctl sso on
```

`sso on` flips `SSO_ENABLED=true` in `.env`, starts Authentik, and restarts
the affected apps so they pick up the OIDC config. Log in to Authentik as
**`akadmin`** with `ADMIN_PASSWORD` from `.env`, then create accounts for
your team at `https://auth.<BASE_DOMAIN>` — those accounts now work across
the SSO-enabled apps. `./stackctl sso off` reverses it (local logins keep
working throughout; SSO is additive).

## Coverage — the honest table

Self-hosted open-source apps vary here: some gate SSO behind paid
"enterprise" editions. This stack wires everything that's wireable:

| App | SSO | How |
|---|---|---|
| Vikunja (tasks) | ✅ automatic | "authentik" button on login page |
| Mattermost (chat) | ✅ automatic | via its GitLab-compatible OAuth — the button is labeled "GitLab" (cosmetic quirk of the free edition; it goes to your Authentik) |
| Documenso (sign) | ✅ automatic | "OIDC" button on login page |
| Vaultwarden (vault) | ✅ automatic | "Log in with SSO" (upstream marks this experimental; master password still encrypts the vault) |
| Listmonk (newsletter) | 🔧 one-time paste | Admin → Settings → Security → OIDC: URL `https://auth.<BASE_DOMAIN>/application/o/listmonk/`, client ID `listmonk`, secret = `LISTMONK_OIDC_CLIENT_SECRET` from `.env` |
| Nextcloud (files) | 🔧 one-time commands | see below |
| Cal.com, Twenty, Activepieces, Formbricks, Docmost, Chatwoot | ❌ enterprise-gated upstream | each keeps its own login (password manager: that's what Vaultwarden is for) |
| Umami, Uptime Kuma, Ghost, Invoice Ninja | ❌ no OIDC upstream | own login |

## Nextcloud one-time setup

```bash
docker exec -u www-data fs-nextcloud-app-1 php occ app:install user_oidc
docker exec -u www-data fs-nextcloud-app-1 php occ user_oidc:provider authentik \
  --clientid=nextcloud \
  --clientsecret="$(grep '^NEXTCLOUD_OIDC_CLIENT_SECRET=' .env | cut -d= -f2-)" \
  --discoveryuri="https://auth.$(grep '^BASE_DOMAIN=' .env | cut -d= -f2-)/application/o/nextcloud/.well-known/openid-configuration"
```

## If your .env predates SSO

`install.sh` never overwrites an existing `.env`, so a `.env` created before
the SSO update lacks the new keys. Either delete `.env` and re-run
`sudo ./install.sh` (fine if you haven't deployed data yet), or copy the
`# --- Single sign-on ---` block from `.env.example` into your `.env` and
fill the `__GEN_*__` placeholders (`openssl rand -hex 16` works for all of
them; `openssl rand -hex 32` for `AUTHENTIK_SECRET_KEY`).

## The hub

`https://home.<BASE_DOMAIN>` (also served at the bare domain) is the
central hub — every app as a tile, grouped by job, with a live
running/stopped dot per app (read from the Docker socket) and server
CPU/RAM/disk at the top. It's the "start here" page for you and anyone on
your team: `./stackctl up homepage`.

The hub itself is unauthenticated (it exposes only app names, links, and
up/down status — no data). If you want it private too, put Authentik's
forward-auth proxy in front of it — a good "advanced chapter" for the
product; happy path leaves it open.
